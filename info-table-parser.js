// Browser-only info-table parsing (v2.5.95, extended in v2.5.96 and v2.5.97).
// Derives System Type, Pump Manufacturer, and Enclosure Material evidence
// from the `desc` field the Worker already returns. This file is intentionally NOT imported by the Worker:
// the v2.5.95 attempt in PR #188 parsed per record inside the Worker MAIN loop and
// exceeded the Cloudflare CPU limit. Everything here runs once per record in the
// browser when a snapshot is applied, never per search.
(function (globalScope) {
    // v2.5.99: re-associate split/interleaved material cells in existing snapshots.
    const DERIVED_REV = 5;
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
        'SULZER': ['SULZER PUMPS', 'SULZER'],
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
    const MFG_MATCHERS = Object.freeze(Object.fromEntries(Object.entries(MFG_ALIASES).map(([canonical, aliases]) => [
        canonical,
        new RegExp(`(^|[^A-Z0-9])(?:${aliases.map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^A-Z0-9])`, 'i')
    ])));

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
    const MFG_MENU_LIMIT = 12;
    const MFG_REQUIRED = 'SULZER';

    // Maximum characters read after a label. Values are short table cells.
    const VALUE_WINDOW = 40;
    const REVERSE_WINDOW = 120;
    // One alternation, scanned once per description. Every info-table label acts as a
    // value boundary so a value can never run into a neighboring row.
    // v2.5.96: enclosure-specific labels come BEFORE the generic ENCLOSURE so the
    // material label is matched whole and neighboring enclosure rows (NEMA rating, size,
    // inner swing panel, control sensor, ...) act as value boundaries.
    const FEATURE_SOURCE = 'PANEL\\s+HEATER(?:\\s*\\/\\s*THERMOSTAT)?(?:\\s+W)?|PHASE\\s+MONITOR|' +
        'CYCLE\\s+COUNTERS?|FLASHER|TEMP\\s+SWITCH|GREEN\\s+RUN\\s+LIGHTS|POLE,\\s*BOX,\\s*SEAL|' +
        'OPTI[\\s-]*FLOAT\\s+LEVEL\\s+DEC?TECTOR\\s+PTS\\.?';
    const FEATURE_RE = new RegExp(`^(?:${FEATURE_SOURCE})$`);
    const LABEL_SOURCE = '\\b(?:' + FEATURE_SOURCE + '|PANEL[\\s-]+TYPE|NUMBER\\s+OF\\s+MOTORS|NO\\.?\\s*(?:OF\\s+)?MOTORS|PUMP\\s+MANUFACTURER|' +
        'TYPE\\s+OF\\s+PUMP|PUMP\\s+MODEL|PHASE(?:\\s*\\/\\s*HZ)?|VOLTAGE|VOLTS|HORSEPOWER|HP|FLA|FULL\\s+LOAD\\s+AMPS|' +
        'ENCL(?:OSURE|\\.)?\\s*MATERIAL|ENCLOSURE\\s+(?:NEMA\\s+)?RATING|ENCLOSURE\\s+(?:SIZE|TYPE|DIMENSIONS?)|NEMA\\s+RATING|' +
        'INNER\\s+(?:SWING\\s+)?PANEL|INNER\\s+DOOR|CONTROL\\s+SENSOR|CONTROL\\s+VOLTAGE|' +
        'ENCLOSURE|MODEL|RPM|TAGS?|NOTES?|PANEL\\s+NAME)\\b';
    const QUICK_CHECK_RE = /PANEL[\s-]+TYPE|MOTORS|PUMP\s+MANUFACTURER|MATERIAL/;
    const LEADING_SEPARATORS_RE = /^[\s:|=\-\u2013]+/;
    const SYSTEM_VALUE_RE = /^(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)(?![A-Z0-9\/+&])/;
    const SYSTEM_WORD_GLOBAL_RE = /\b(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)\b/g;
    const PLAIN_COUNT_RE = /^([1-4])(?:\s+(?:PUMPS|MOTORS))?$/;
    // Material value patterns, applied only to the bounded Enclosure Material cell.
    // Groups: 1 Fiberglass, 2 Stainless Steel (incl. grade notation), 3 Painted Steel.
    // Bare STEEL / CARBON STEEL match nothing (never stainless).
    const MATERIAL_RE = new RegExp(
        '(\\bFIB(?:ER|RE)[\\s-]*GLASS?\\b|\\bFRP\\b)|' +
        '(\\bSTAINLESS(?:[\\s-]+STEEL)?\\b|\\b(?:304|316)L?\\)?\\s*(?:SST?\\b|S\\/S\\b|S\\.S\\.?)(?![A-Z0-9])|^\\(?(?:304|316)L?\\)?$|^(?:SST?|S\\/S|S\\.S\\.?)(?![A-Z0-9]))|' +
        '(\\bPAINTED[\\s-]+(?:(?:CARBON|MILD)[\\s-]+)?STEEL\\b|\\bSTEEL\\s*[,(\\-]?\\s*PAINTED\\b)');
    // An explicit alternative ("FIBERGLASS OR 304 SS", "FRP / STAINLESS") right after a
    // material makes the cell ambiguous; any other trailing text (flattened neighbors,
    // hardware notes) is ignored.
    const MATERIAL_ALT_RE = /^\s*[,)]?\s*(?:AND\s*\/\s*OR|OR|AND|\/|&)\s*\(?\s*/;
    const MATERIAL_BY_GROUP = Object.freeze([null, 'Fiberglass', 'Stainless Steel', 'Painted Steel']);
    const UNSUPPORTED_SOURCE = '(?:POLY(?:CARBONATE|ESTER)?|ALUMIN(?:I)?UM|(?:BARE\\s+|CARBON\\s+|MILD\\s+)?STEEL|PVC|PLASTIC|WOOD)';
    const UNSUPPORTED_MATERIAL_RE = new RegExp(`^${UNSUPPORTED_SOURCE}(?=$|[\\s.,;])`);
    const MATERIAL_PREFIX_RE = /^\(?(?:(?:304|316)L?\)?\s*)?$/;
    const WIRING_PREFIX_RE = /^(?:\d+[A-Z]?\s+|[A-Z]{1,3}\s+|[A-Z]{1,3}\d+[A-Z]?(?:-\d+)?\s+|W\/OR\s+|AUTOMATIC\s+MODE\s+|ALL\s+PUMPS\s+OFF\s+)*$/;
    const WIRING_ANCHOR_RE = /\b(?:[A-Z]{1,3}\d+[A-Z]?(?:-\d+)?|AUTOMATIC\s+MODE|ALL\s+PUMPS\s+OFF)\b/;
    const TERMINAL_CELL_RE = /^\d{1,3}\s+\d{1,3}\s+WAGO\s+\d{3}-\d{3}\s+(?:(?:GROUND\s+)?TERMINAL(?:\s+OPERATOR)?|END\s+BLOCK)$/;
    const MATERIAL_BOUNDARY_RE = new RegExp(`^(?:${FEATURE_SOURCE}|ENCLOSURE (?:SIZE|TYPE|DIMENSIONS?)|INNER (?:SWING )?PANEL|INNER DOOR|CONTROL SENSOR)$`);
    // Whole-description strong signals, consulted ONLY by the legacy r.enc fallback to
    // mark uncertainty (never to override a material row). Bare SS / S/S are excluded.
    const ENC_SIGNAL_RE = /\b(4XFG|4XSS|FIB(?:ER|RE)\s*GLASS|FRP|STAINLESS)\b/g;

    function classifyLabel(label) {
        label = label.replace(/-/g, ' ');
        if (label.startsWith('PANEL') && label.endsWith('TYPE')) return 'panelTypes';
        if (label.endsWith('MOTORS')) return 'motorCounts';
        if (label.startsWith('PUMP') && label.endsWith('MANUFACTURER')) return 'pumpMfgs';
        if (label.startsWith('ENCL') && label.endsWith('MATERIAL')) return 'encMaterials';
        return null;
    }

    function readValue(text, start, nextStart, kind) {
        let raw = text.slice(start, Math.min(nextStart, start + VALUE_WINDOW));
        // A minus sign on a motor count is a value, not a label separator.
        raw = raw.replace(kind === 'motorCounts' ? /^[\s:|=]+/ : LEADING_SEPARATORS_RE, '');
        if (kind === 'encMaterials') {
            raw = joinMaterialLines(raw);
        }
        const cut = raw.search(/[\n\r|]/);
        if (cut >= 0) raw = raw.slice(0, cut);
        return raw.trim();
    }

    function joinMaterialLines(value) {
        return value.replace(/\b(PAINTED|STAINLESS|FIBER|FIBRE)[ \t]*\r?\n[ \t]*(?=STEEL\b|GLASS\b)/g, '$1 ');
    }

    function isWiringNoise(value) {
        const wiring = value.replace(/^W\s*=\s*/, '').trim();
        return TERMINAL_CELL_RE.test(value)
            || (WIRING_ANCHOR_RE.test(wiring) && WIRING_PREFIX_RE.test(wiring + ' '));
    }

    function interleavedMaterial(value, featureAnchored) {
        const matcher = new RegExp(MATERIAL_RE.source, 'g');
        const candidates = [];
        let match;
        while ((match = matcher.exec(value))) {
            const prefix = value.slice(0, match.index);
            // Rating text alone is never evidence of a separate material cell.
            if (!featureAnchored && !WIRING_ANCHOR_RE.test(prefix)) continue;
            if (!WIRING_PREFIX_RE.test(prefix)) continue;
            if (/\b(?:HARDWARE|TERMINAL|BOM|FIBERGLASS|STAINLESS|PAINTED|STEEL)\b/.test(prefix)) continue;
            let end = match.index + match[0].length;
            for (let guard = 0; guard < ENCLOSURE_MATERIALS.length; guard++) {
                const alt = MATERIAL_ALT_RE.exec(value.slice(end));
                if (!alt) break;
                const alternative = MATERIAL_RE.exec(value.slice(end + alt[0].length));
                if (!alternative || alternative.index !== 0) break;
                end += alt[0].length + alternative[0].length;
            }
            const tail = value.slice(end).trim();
            const bom = TERMINAL_CELL_RE.test(tail);
            if (!tail || bom) candidates.push({ value: value.slice(match.index, end), varied: bom, direction: bom ? 'reverse-terminal-gap' : 'reverse' });
        }
        return candidates.length === 1 ? candidates[0] : null;
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
        return Number(match[1]);
    }

    function normalizeManufacturer(value) {
        if (typeof value !== 'string') return null;
        const normalized = value.toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '').replace(/[\-\u2013_.]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!normalized) return null;
        for (const [alias, canonical] of MFG_ALIAS_LIST) {
            if (!normalized.startsWith(alias)) continue;
            const next = normalized.charAt(alias.length);
            if (!next || !/[A-Z0-9]/.test(next)) return canonical;
        }
        return null;
    }

    function matchesManufacturer(text, canonical) {
        if (typeof text !== 'string' || !Object.prototype.hasOwnProperty.call(MFG_MATCHERS, canonical)) return false;
        const matcher = MFG_MATCHERS[canonical];
        return matcher.test(text);
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

    function identifiedMaterials(value) {
        const match = MATERIAL_RE.exec(value);
        if (!match || !MATERIAL_PREFIX_RE.test(value.slice(0, match.index).trim())) return [];
        const tail = value.slice(match.index + match[0].length);
        if (/^\s+(?:HARDWARE|TERMINALS?|BOLTS?|SCREWS?|BRACKETS?|PUMPS?)\b/.test(tail)) return [];
        return materialsInValue(value);
    }

    // Reverse cells must end at their label. The only non-adjacent suffix accepted is
    // a bounded WAGO terminal/end-block cell, with neighboring info-table anchors.
    // These are textual association rules, not page/spatial isolation.
    function reverseValue(text, label, previous, next, kind) {
        if (previous && (previous.kind || /^(?:TAGS?|NOTES?|PANEL NAME)$/.test(previous.label))) return null;
        let value = text.slice(Math.max(previous ? previous.end : 0, label.start - REVERSE_WINDOW), label.start);
        if (kind === 'encMaterials') value = joinMaterialLines(value);
        value = value.replace(/[\s:|=\-\u2013]+$/, '');
        const delimiter = Math.max(value.lastIndexOf('\n'), value.lastIndexOf('\r'), value.lastIndexOf('|'));
        if (delimiter >= 0) value = value.slice(delimiter + 1);
        value = value.replace(/^[\s.:|=]+/, '').trim();
        if (kind === 'panelTypes') {
            return /^(?:SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)(?:\s*(?:OR|\/|&)\s*(?:SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX))*$/.test(value)
                && (!previous || FEATURE_RE.test(previous.label)) ? { value, varied: false, direction: 'reverse' } : null;
        }
        if (kind !== 'encMaterials') return null;
        const anchored = previous && (/^ENCLOSURE (?:NEMA )?RATING$/.test(previous.label) || FEATURE_RE.test(previous.label))
            && next && MATERIAL_BOUNDARY_RE.test(next.label);
        const featureAnchored = anchored && FEATURE_RE.test(previous.label);
        if (new RegExp(`^${UNSUPPORTED_SOURCE}$`).test(value) && (!previous || featureAnchored)) {
            return { value, varied: false, direction: 'reverse' };
        }
        if (identifiedMaterials(value).length && materialsInValue(value).length > 0
            && !/\b(?:HARDWARE|TERMINAL|BOM|PUMP|ENCLOSURE)\b/.test(value)) {
            // Without neighboring info rows, only a complete material cell is accepted.
            const match = MATERIAL_RE.exec(value);
            const tail = value.slice(match.index + match[0].length);
            if (!tail.trim() || MATERIAL_ALT_RE.test(tail)) {
                return !previous || featureAnchored ? { value, varied: false, direction: 'reverse' } : null;
            }
        }
        if (!anchored || /\b(?:HARDWARE|BOM|NOTES?|FIBERGLASS|STAINLESS)\b.*\b(?:HARDWARE|BOM)\b/.test(value)) return null;
        return interleavedMaterial(value, featureAnchored);
    }

    // One linear label scan; all forward/reverse work is bounded per info cell.
    function extractInfoRows(desc) {
        const rows = { panelTypes: [], motorCounts: [], pumpMfgs: [], encMaterials: [] };
        Object.defineProperty(rows, 'associations', { value: [] });
        if (typeof desc !== 'string' || !desc) return rows;
        const text = desc.toUpperCase();
        if (!QUICK_CHECK_RE.test(text)) return rows;
        const regex = new RegExp(LABEL_SOURCE, 'g');
        const labels = [];
        let match;
        while ((match = regex.exec(text))) {
            labels.push({ label: match[0], kind: classifyLabel(match[0]), start: match.index, end: regex.lastIndex });
        }
        labels.forEach((label, i) => {
            if (!label.kind) return;
            const next = labels[i + 1];
            let value = readValue(text, label.end, next ? next.start : text.length, label.kind);
            let association = { value, varied: false, direction: 'forward' };
            if (label.kind === 'encMaterials' && value && !identifiedMaterials(value).length
                && !UNSUPPORTED_MATERIAL_RE.test(value) && next && MATERIAL_BOUNDARY_RE.test(next.label)) {
                const forward = interleavedMaterial(value, false);
                if (forward) association = { ...forward, varied: true, direction: 'forward-wiring-gap' };
                else if (isWiringNoise(value)) {
                    const reverse = reverseValue(text, label, labels[i - 1], next, label.kind);
                    if (reverse) association = { ...reverse, varied: true };
                }
            }
            if (!value && (label.kind === 'encMaterials' || label.kind === 'panelTypes')) {
                association = reverseValue(text, label, labels[i - 1], next, label.kind) || association;
            }
            // Only two complete cells at the start can be genuinely two-sided.
            // Never add preceding rating/feature-column text to a clear forward cell.
            if (value && !labels[i - 1] && label.kind === 'encMaterials' && identifiedMaterials(value).length) {
                const reverse = reverseValue(text, label, labels[i - 1], next, label.kind);
                if (reverse) {
                    rows.encMaterials.push(reverse.value);
                    rows.associations.push({ kind: label.kind, ...reverse });
                }
            }
            if (label.kind === 'motorCounts' && next && next.label === 'FLASHER'
                && /^[1-4]\s+H\s+A$/.test(value)) {
                association.value = value[0];
            }
            rows[label.kind].push(association.value);
            rows.associations.push({ kind: label.kind, ...association });
        });
        return rows;
    }

    function deriveFromDesc(desc) {
        return deriveFromRows(extractInfoRows(desc));
    }

    function deriveFromRows(rows) {
        const explicit = new Set();
        const ambiguous = new Set();
        rows.panelTypes.forEach(value => {
            const sys = normalizeSystemType(value);
            if (sys) explicit.add(sys);
            else if (/^(?:SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)\b/.test(value)) {
                for (const match of value.matchAll(new RegExp(SYSTEM_WORD_GLOBAL_RE.source, 'g'))) ambiguous.add(SYSTEM_WORDS[match[1]]);
            }
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
            sysV = ambiguous.size > 0 || (hasCountEvidence && !(agrees && !hasNonPlainCount));
        } else if (explicit.size === 0 && !hasNonPlainCount && counts.size === 1) {
            const inferred = SYSTEM_TYPES[[...counts][0] - 1];
            if (!ambiguous.size || ambiguous.has(inferred)) {
                sys = inferred;
                sysV = true;
            }
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
    //   'other'      positively identified unsupported material (bare steel, polycarbonate, ...)
    //   'unreadable' row present but blank/placeholder/unassociated column noise -> legacy fallback
    //   'none'       no material row -> legacy fallback
    function deriveMaterialFromRows(rows, desc) {
        const materials = new Set();
        let other = 0;
        let blank = 0;
        rows.encMaterials.forEach(value => {
            const found = identifiedMaterials(value);
            if (found.length) found.forEach(m => materials.add(m));
            else if (UNSUPPORTED_MATERIAL_RE.test(value.trim().toUpperCase())) other++;
            else blank++;
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
            varied: status === 'conflict' || (status === 'row' && (other > 0 || blank > 0
                || rows.associations.some(a => a.kind === 'encMaterials' && a.varied))),
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

    // Counts each unique record id once from its bounded Pump Manufacturer row and keeps the
    // twelve most frequent manufacturers. Sulzer reserves a slot if it falls below the natural
    // cutoff; included options are then ordered by actual frequency, with alphabetical ties.
    function rankManufacturers(records, { allowed = null } = {}) {
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
        let options = [];
        if (eligibleRecords > 0) {
            options = ranked.slice(0, MFG_MENU_LIMIT);
            if ((!allowedSet || allowedSet.has(MFG_REQUIRED)) && !options.includes(MFG_REQUIRED)) {
                options = ranked.filter(mfg => mfg !== MFG_REQUIRED).slice(0, MFG_MENU_LIMIT - 1).concat(MFG_REQUIRED);
            }
            options.sort((a, b) => ((counts[b] || 0) - (counts[a] || 0)) || a.localeCompare(b));
        }
        return { options, ranked, counts, eligibleRecords, menuLimit: MFG_MENU_LIMIT, required: MFG_REQUIRED };
    }

    const InfoTableParser = Object.freeze({
        DERIVED_REV,
        SYSTEM_TYPES,
        MFG_ALIASES,
        ENCLOSURE_MATERIALS,
        MATERIAL_FEEDBACK_CODES,
        MFG_MENU_LIMIT,
        MFG_REQUIRED,
        VALUE_WINDOW,
        normalizeSystemType,
        parseMotorCount,
        normalizeManufacturer,
        matchesManufacturer,
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
