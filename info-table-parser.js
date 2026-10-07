// Browser-only info-table parsing (v2.5.95, extended in v2.5.96).
// Derives System Type, Pump Manufacturer, and (v2.5.96) Enclosure Material evidence
// from the `desc` field the Worker already returns. This file is intentionally NOT imported by the Worker:
// the v2.5.95 attempt in PR #188 parsed per record inside the Worker MAIN loop and
// exceeded the Cloudflare CPU limit. Everything here runs once per record in the
// browser when a snapshot is applied, never per search.
(function (globalScope) {
    // v2.5.96: bumped so records derived in memory by v2.5.95 recompute material evidence.
    const DERIVED_REV = 2;
    const SYSTEM_TYPES = Object.freeze(['Simplex', 'Duplex', 'Triplex', 'Quadraplex']);
    const SYSTEM_WORDS = Object.freeze({
        SIMPLEX: 'Simplex',
        DUPLEX: 'Duplex',
        TRIPLEX: 'Triplex',
        QUADRAPLEX: 'Quadraplex',
        QUADRUPLEX: 'Quadraplex',
        QUADPLEX: 'Quadraplex'
    });
    // Mirrors EXACT_MFGS in worker/lib/extract.js (canonical name -> aliases).
    const MFG_ALIASES = Object.freeze({
        'GORMAN RUPP': ['GORMAN RUPP', 'GORMAN', 'GR', 'GRSP'],
        'BARNES': ['BARNES', 'SITHE', 'CRANE'],
        'HYDROMATIC': ['HYDROMATIC'],
        'FLYGT': ['FLYGT'],
        'MYERS': ['MYERS'],
        'GOULDS': ['GOULDS'],
        'ZOELLER': ['ZOELLER'],
        'LIBERTY': ['LIBERTY'],
        'WILO': ['WILO'],
        'PENTAIR': ['PENTAIR'],
        'ABS': ['ABS'],
        'GODWIN': ['GODWIN', 'GODWIN SP'],
        'FRANKLIN': ['FRANKLIN'],
        'EBARA': ['EBARA'],
        'HIDROSTAL': ['HIDROSTAL']
    });
    // Longest alias first so "GORMAN RUPP" wins over "GORMAN" / "GR".
    const MFG_ALIAS_LIST = Object.freeze(Object.entries(MFG_ALIASES)
        .flatMap(([canonical, aliases]) => aliases.map(alias => [alias, canonical]))
        .sort((a, b) => b[0].length - a[0].length));

    // v2.5.96 material-only enclosure search values. NEMA rating plays no role.
    const ENCLOSURE_MATERIALS = Object.freeze(['Fiberglass', 'Stainless Steel', 'Painted Steel']);
    // Feedback payload encodings. FG/SS keep the legacy enc codes so new votes tally with
    // older stored corrections in the unchanged Worker healer (it keys by exact value).
    // Painted Steel has no legacy code, so it gets an explicit, unambiguous string.
    const MATERIAL_FEEDBACK_CODES = Object.freeze({
        'Fiberglass': '4XFG',
        'Stainless Steel': '4XSS',
        'Painted Steel': 'PAINTED STEEL'
    });
    // Coverage of eligible manufacturer record occurrences used for the search menu.
    const MFG_COVERAGE_PERCENT = 90;

    // Maximum characters read after a label. Values are short table cells.
    const VALUE_WINDOW = 40;
    // One alternation, scanned once per description. Every info-table label acts as a
    // value boundary so a value can never run into a neighboring row.
    // v2.5.96: enclosure-specific labels come BEFORE the generic ENCLOSURE so the
    // material label is matched whole and neighboring enclosure rows (NEMA rating, size,
    // inner swing panel, control sensor, ...) act as value boundaries.
    const LABEL_SOURCE = '\\b(?:PANEL\\s+TYPE|NUMBER\\s+OF\\s+MOTORS|NO\\.?\\s*(?:OF\\s+)?MOTORS|PUMP\\s+MANUFACTURER|' +
        'TYPE\\s+OF\\s+PUMP|PUMP\\s+MODEL|PHASE(?:\\s*\\/\\s*HZ)?|VOLTAGE|VOLTS|HORSEPOWER|HP|FLA|FULL\\s+LOAD\\s+AMPS|' +
        'ENCL(?:OSURE|\\.)?\\s*MATERIAL|ENCLOSURE\\s+(?:NEMA\\s+)?RATING|ENCLOSURE\\s+(?:SIZE|TYPE|DIMENSIONS?)|NEMA\\s+RATING|' +
        'INNER\\s+SWING\\s+PANEL|INNER\\s+DOOR|CONTROL\\s+SENSOR|CONTROL\\s+VOLTAGE|' +
        'ENCLOSURE|MODEL|RPM|TAGS?|NOTES?|PANEL\\s+NAME)\\b';
    const QUICK_CHECK_RE = /PANEL\s+TYPE|MOTORS|PUMP\s+MANUFACTURER|MATERIAL/;
    const LEADING_SEPARATORS_RE = /^[\s:|=\-\u2013]+/;
    const SYSTEM_VALUE_RE = /^(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)(?![A-Z0-9\/+&])/;
    const SYSTEM_WORD_GLOBAL_RE = /\b(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)\b/g;
    const PLAIN_COUNT_RE = /^([1-4])(?:\s+(.*))?$/;
    const COUNT_TAIL_REJECT_RE = /^(?:[+\-\/&.,\u00D7]|[X\u00D7]\s*\d|\d|(?:AND|OR|TO|PLUS)\s*\d)/;
    // Material value patterns, applied only to the bounded Enclosure Material cell.
    // Groups: 1 Fiberglass, 2 Stainless Steel (incl. grade notation), 3 Painted Steel.
    // Bare STEEL / CARBON STEEL match nothing (never stainless).
    const MATERIAL_RE = new RegExp(
        '(\\bFIB(?:ER|RE)\\s*GLASS?\\b|\\bFRP\\b)|' +
        '(\\bSTAINLESS(?:\\s+STEEL)?\\b|\\b(?:304|316)L?\\)?\\s*(?:SST?|S\\/S)\\b|^\\(?(?:304|316)L?\\)?$|^(?:SST?|S\\/S|S\\.S\\.?)(?![A-Z0-9]))|' +
        '(\\bPAINTED\\s+(?:(?:CARBON|MILD)\\s+)?STEEL\\b|\\bSTEEL\\s*[,(\\-]?\\s*PAINTED\\b)');
    // An explicit alternative ("FIBERGLASS OR 304 SS", "FRP / STAINLESS") right after a
    // material makes the cell ambiguous; any other trailing text (flattened neighbors,
    // hardware notes) is ignored.
    const MATERIAL_ALT_RE = /^\s*[,)]?\s*(?:AND\s*\/\s*OR|OR|AND|\/|&)\s*\(?\s*/;
    const MATERIAL_BY_GROUP = Object.freeze([null, 'Fiberglass', 'Stainless Steel', 'Painted Steel']);
    const MAT_PLACEHOLDER_RE = /^(?:N\/?A|TBD|TBA|NONE|UNKNOWN|-+|\?+|BY\s+OTHERS)?$/;
    // Whole-description strong signals, consulted ONLY by the legacy r.enc fallback to
    // mark uncertainty (never to override a material row). Bare SS / S/S are excluded.
    const ENC_SIGNAL_RE = /\b(4XFG|4XSS|FIB(?:ER|RE)\s*GLASS|FRP|STAINLESS)\b/g;

    function classifyLabel(label) {
        if (label.startsWith('PANEL') && label.endsWith('TYPE')) return 'panelTypes';
        if (label.endsWith('MOTORS')) return 'motorCounts';
        if (label.startsWith('PUMP') && label.endsWith('MANUFACTURER')) return 'pumpMfgs';
        if (label.startsWith('ENCL') && label.endsWith('MATERIAL')) return 'encMaterials';
        return null;
    }

    function readValue(text, start, nextStart) {
        let raw = text.slice(start, Math.min(nextStart, start + VALUE_WINDOW));
        raw = raw.replace(LEADING_SEPARATORS_RE, '');
        const cut = raw.search(/[\n\r|]/);
        if (cut >= 0) raw = raw.slice(0, cut);
        return raw.trim();
    }

    function normalizeSystemType(value) {
        if (typeof value !== 'string') return null;
        const upper = value.trim().toUpperCase();
        const match = SYSTEM_VALUE_RE.exec(upper);
        if (!match) return null;
        const sys = SYSTEM_WORDS[match[1]];
        // "DUPLEX OR TRIPLEX" style cells are ambiguous, not evidence.
        SYSTEM_WORD_GLOBAL_RE.lastIndex = 0;
        let other;
        while ((other = SYSTEM_WORD_GLOBAL_RE.exec(upper))) {
            if (SYSTEM_WORDS[other[1]] !== sys) return null;
        }
        return sys;
    }

    // Returns 1-4 for a plain count, otherwise null. Combinations (2+2, 2 + 1, 4+2),
    // decimals, ranges, slashes, and values >4 are never summed or prefix-captured.
    function parseMotorCount(value) {
        if (typeof value !== 'string') return null;
        const match = PLAIN_COUNT_RE.exec(value.trim().toUpperCase());
        if (!match) return null;
        if (match[2] && COUNT_TAIL_REJECT_RE.test(match[2])) return null;
        return Number(match[1]);
    }

    function normalizeManufacturer(value) {
        if (typeof value !== 'string') return null;
        const normalized = value.toUpperCase().replace(/[\-\u2013_.]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!normalized) return null;
        for (const [alias, canonical] of MFG_ALIAS_LIST) {
            if (!normalized.startsWith(alias)) continue;
            const next = normalized.charAt(alias.length);
            if (!next || !/[A-Z0-9]/.test(next)) return canonical;
        }
        return null;
    }

    function materialOfMatch(match) {
        for (let g = 1; g < MATERIAL_BY_GROUP.length; g++) if (match[g]) return MATERIAL_BY_GROUP[g];
        return null;
    }

    // Returns the canonical materials named in one bounded Enclosure Material cell, in
    // ENCLOSURE_MATERIALS order: the first material in the cell plus any explicit
    // alternatives chained to it. More than one entry means the cell itself is ambiguous.
    function materialsInValue(value) {
        if (typeof value !== 'string') return [];
        let rest = value.toUpperCase().trim();
        const found = new Set();
        let match = MATERIAL_RE.exec(rest);
        // At most a handful of alternatives fit in the bounded window; cap defensively.
        for (let guard = 0; match && guard < ENCLOSURE_MATERIALS.length + 2; guard++) {
            found.add(materialOfMatch(match));
            rest = rest.slice(match.index + match[0].length);
            const alt = MATERIAL_ALT_RE.exec(rest);
            if (!alt) break;
            rest = rest.slice(alt[0].length);
            match = MATERIAL_RE.exec(rest);
            if (match && match.index !== 0) match = null;
        }
        return ENCLOSURE_MATERIALS.filter(m => found.has(m));
    }

    function normalizeEnclosureMaterial(value) {
        const found = materialsInValue(value);
        return found.length === 1 ? found[0] : null;
    }

    // Maps legacy enc codes, the Painted Steel feedback code, and material labels to a
    // material. POLY, 'Varied / Multiple', and anything else return null (never relabeled).
    function materialFromEncCode(enc) {
        if (typeof enc !== 'string') return null;
        const upper = enc.trim().toUpperCase();
        if (upper === '4XFG' || upper === 'FIBERGLASS') return 'Fiberglass';
        if (upper === '4XSS' || upper === 'STAINLESS STEEL') return 'Stainless Steel';
        if (upper === 'PAINTED STEEL') return 'Painted Steel';
        return null;
    }

    // Single pass over the description: locate every label, then read a short bounded
    // window after the labels we care about.
    function extractInfoRows(desc) {
        const rows = { panelTypes: [], motorCounts: [], pumpMfgs: [], encMaterials: [] };
        if (typeof desc !== 'string' || !desc) return rows;
        const text = desc.toUpperCase();
        if (!QUICK_CHECK_RE.test(text)) return rows;
        const regex = new RegExp(LABEL_SOURCE, 'g');
        let pending = null;
        let match;
        while ((match = regex.exec(text))) {
            if (pending) {
                rows[pending.kind].push(readValue(text, pending.end, match.index));
                pending = null;
            }
            const kind = classifyLabel(match[0]);
            if (kind) pending = { kind, end: regex.lastIndex };
        }
        if (pending) rows[pending.kind].push(readValue(text, pending.end, text.length));
        return rows;
    }

    function deriveFromDesc(desc) {
        return deriveFromRows(extractInfoRows(desc));
    }

    function deriveFromRows(rows) {
        const explicit = new Set();
        rows.panelTypes.forEach(value => {
            const sys = normalizeSystemType(value);
            if (sys) explicit.add(sys);
        });
        const counts = new Set();
        let hasNonPlainCount = false;
        rows.motorCounts.forEach(value => {
            const count = parseMotorCount(value);
            if (count === null) hasNonPlainCount = true;
            else counts.add(count);
        });

        let sys = null;
        let sysV = false;
        if (explicit.size === 1) {
            sys = [...explicit][0];
            const agrees = counts.size === 1 && SYSTEM_TYPES[[...counts][0] - 1] === sys;
            const hasCountEvidence = counts.size > 0 || hasNonPlainCount;
            // Panel Type wins; disagreement or a combination count marks it uncertain.
            sysV = hasCountEvidence && !(agrees && !hasNonPlainCount);
        } else if (explicit.size === 0 && !hasNonPlainCount && counts.size === 1) {
            sys = SYSTEM_TYPES[[...counts][0] - 1];
            sysV = true;
        }

        const mfgs = new Set();
        let unknownMfg = false;
        rows.pumpMfgs.forEach(value => {
            const mfg = normalizeManufacturer(value);
            if (mfg) mfgs.add(mfg);
            else unknownMfg = true;
        });
        const pumpMfg = mfgs.size === 1 && !unknownMfg ? [...mfgs][0] : null;
        return { sys, sysV, pumpMfg };
    }

    // Enclosure Material evidence (v2.5.96). status:
    //   'row'        one material across all readable rows (varied if extra rows are blank/other)
    //   'conflict'   rows/values name several materials -> all candidates, always varied
    //   'other'      readable value that is none of the three (bare steel, polycarbonate, ...)
    //   'unreadable' row present but blank/placeholder -> legacy fallback
    //   'none'       no material row -> legacy fallback
    function deriveMaterialFromRows(rows, desc) {
        const materials = new Set();
        let other = 0;
        let blank = 0;
        rows.encMaterials.forEach(value => {
            const found = materialsInValue(value);
            if (found.length) found.forEach(m => materials.add(m));
            else if (MAT_PLACEHOLDER_RE.test(value.trim().toUpperCase())) blank++;
            else other++;
        });
        let status;
        if (materials.size > 1) status = 'conflict';
        else if (materials.size === 1) status = 'row';
        else if (other > 0) status = 'other';
        else status = rows.encMaterials.length > 0 ? 'unreadable' : 'none';
        let fgSignal = false;
        let ssSignal = false;
        if (typeof desc === 'string' && desc && (status === 'unreadable' || status === 'none')) {
            const text = desc.toUpperCase();
            ENC_SIGNAL_RE.lastIndex = 0;
            let match;
            while ((match = ENC_SIGNAL_RE.exec(text)) && !(fgSignal && ssSignal)) {
                if (match[1] === '4XSS' || match[1] === 'STAINLESS') ssSignal = true;
                else fgSignal = true;
            }
            ENC_SIGNAL_RE.lastIndex = 0;
        }
        return Object.freeze({
            status,
            materials: Object.freeze(ENCLOSURE_MATERIALS.filter(m => materials.has(m))),
            varied: status === 'conflict' || (status === 'row' && (other > 0 || blank > 0)),
            fgSignal,
            ssSignal
        });
    }

    function deriveMaterialFromDesc(desc) {
        return deriveMaterialFromRows(extractInfoRows(desc), desc);
    }

    // The one material resolver used by search filtering, sorting, and badges.
    // A material row always wins over the backend r.enc and narrative mentions. Only when
    // the row is absent/blank does the legacy r.enc code apply, and then conservatively:
    //   4XFG -> Fiberglass, 4XSS -> Stainless Steel; uncertain unless the description has a
    //   supporting strong signal and no opposite one (and the backend did not flag encV).
    //   'PAINTED STEEL' (feedback code) -> Painted Steel. POLY / other codes -> no material.
    //   Empty or 'Varied / Multiple' -> strong-signal candidates, always uncertain.
    function resolveEnclosureMaterial(record) {
        const none = { materials: [], varied: false, source: 'none' };
        if (!record || typeof record !== 'object') return none;
        const evidence = record._encEvidence;
        if (evidence && (evidence.status === 'row' || evidence.status === 'conflict')) {
            return { materials: evidence.materials, varied: evidence.varied, source: 'row' };
        }
        if (evidence && evidence.status === 'other') return { materials: [], varied: false, source: 'row' };
        const fg = !!(evidence && evidence.fgSignal);
        const ss = !!(evidence && evidence.ssSignal);
        const legacyVaried = record.encV === true;
        const legacy = materialFromEncCode(record.enc);
        if (legacy === 'Fiberglass') return { materials: ['Fiberglass'], varied: legacyVaried || !fg || ss, source: 'legacy' };
        if (legacy === 'Stainless Steel') return { materials: ['Stainless Steel'], varied: legacyVaried || !ss || fg, source: 'legacy' };
        if (legacy === 'Painted Steel') return { materials: ['Painted Steel'], varied: legacyVaried, source: 'legacy' };
        if (!record.enc || record.enc === 'Varied / Multiple') {
            const materials = [];
            if (fg) materials.push('Fiberglass');
            if (ss) materials.push('Stainless Steel');
            if (materials.length) return { materials, varied: true, source: 'legacy' };
        }
        return none;
    }

    // Centralized material matcher. `material` may be a label or a legacy enc code.
    function matchEnclosureMaterial(record, material) {
        const wanted = ENCLOSURE_MATERIALS.includes(material) ? material : materialFromEncCode(material);
        if (!wanted) return { matches: false, varied: false, material: null, source: 'none' };
        const resolved = resolveEnclosureMaterial(record);
        const matches = resolved.materials.includes(wanted);
        return {
            matches,
            varied: matches && (resolved.varied || resolved.materials.length > 1),
            material: matches ? wanted : null,
            source: resolved.source
        };
    }

    function defineDerived(record, key, value) {
        Object.defineProperty(record, key, { value, writable: true, configurable: true, enumerable: false });
    }

    // Derived fields are non-enumerable so they never reach the encrypted snapshot
    // (JSON.stringify skips them) and old cached snapshots simply re-derive on restore.
    function deriveRecord(record) {
        if (!record || typeof record !== 'object') return false;
        if (record._derivedRev === DERIVED_REV) return false;
        const rows = extractInfoRows(record.desc);
        const derived = deriveFromRows(rows);
        defineDerived(record, '_sys', derived.sys);
        defineDerived(record, '_sysV', derived.sysV);
        defineDerived(record, '_pumpMfg', derived.pumpMfg);
        defineDerived(record, '_encEvidence', deriveMaterialFromRows(rows, record.desc));
        defineDerived(record, '_derivedRev', DERIVED_REV);
        return true;
    }

    function deriveRecordsSync(records) {
        let derived = 0;
        if (!records || typeof records.length !== 'number') return derived;
        for (let i = 0; i < records.length; i++) {
            if (deriveRecord(records[i])) derived++;
        }
        return derived;
    }

    function nowMs() {
        return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    }

    async function deriveRecords(records, { chunkSize = 250, yieldFn = null, log = true } = {}) {
        const list = records && typeof records.length === 'number' ? records : [];
        const pause = typeof yieldFn === 'function' ? yieldFn : () => new Promise(resolve => setTimeout(resolve, 0));
        const start = nowMs();
        let derived = 0;
        for (let i = 0; i < list.length; i++) {
            if (deriveRecord(list[i])) derived++;
            if ((i + 1) % chunkSize === 0 && i + 1 < list.length) await pause();
        }
        const ms = Math.round(nowMs() - start);
        if (log && typeof console !== 'undefined') console.info(`[DeriveTiming] records=${list.length} derived=${derived} ms=${ms}`);
        return { records: list.length, derived, ms };
    }

    // Counts each unique record id once from its bounded Pump Manufacturer row, then keeps
    // the shortest descending-frequency prefix whose cumulative count reaches
    // `coveragePercent` of all eligible (canonical, allowed) record occurrences, including
    // the manufacturer that crosses the threshold. Ties sort alphabetically and are not
    // extended past the minimal prefix. Integer comparison avoids rounding errors.
    function rankManufacturers(records, { allowed = null, coveragePercent = MFG_COVERAGE_PERCENT } = {}) {
        const percent = Number.isInteger(coveragePercent) && coveragePercent > 0 && coveragePercent <= 100
            ? coveragePercent : MFG_COVERAGE_PERCENT;
        const allowedSet = Array.isArray(allowed) ? new Set(allowed) : null;
        const counts = {};
        const seen = new Set();
        let eligibleRecords = 0;
        const list = records && typeof records.length === 'number' ? records : [];
        for (let i = 0; i < list.length; i++) {
            const record = list[i];
            if (!record || record.id === undefined || record.id === null) continue;
            const id = String(record.id);
            if (seen.has(id)) continue;
            seen.add(id);
            const mfg = record._pumpMfg;
            if (!mfg || (allowedSet && !allowedSet.has(mfg))) continue;
            counts[mfg] = (counts[mfg] || 0) + 1;
            eligibleRecords++;
        }
        const ranked = Object.keys(counts)
            .sort((a, b) => (counts[b] - counts[a]) || a.localeCompare(b));
        const options = [];
        let coveredRecords = 0;
        if (eligibleRecords > 0) {
            for (let i = 0; i < ranked.length; i++) {
                options.push(ranked[i]);
                coveredRecords += counts[ranked[i]];
                if (coveredRecords * 100 >= eligibleRecords * percent) break;
            }
        }
        return { options, ranked, counts, eligibleRecords, coveredRecords, coveragePercent: percent };
    }

    const InfoTableParser = Object.freeze({
        DERIVED_REV,
        SYSTEM_TYPES,
        MFG_ALIASES,
        ENCLOSURE_MATERIALS,
        MATERIAL_FEEDBACK_CODES,
        MFG_COVERAGE_PERCENT,
        VALUE_WINDOW,
        normalizeSystemType,
        parseMotorCount,
        normalizeManufacturer,
        extractInfoRows,
        deriveFromDesc,
        materialsInValue,
        normalizeEnclosureMaterial,
        materialFromEncCode,
        deriveMaterialFromDesc,
        resolveEnclosureMaterial,
        matchEnclosureMaterial,
        deriveRecord,
        deriveRecordsSync,
        deriveRecords,
        rankManufacturers
    });

    if (globalScope) globalScope.InfoTableParser = InfoTableParser;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = InfoTableParser;
    }
})(typeof window !== 'undefined' ? window : globalThis);
