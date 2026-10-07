// Browser-only info-table parsing (v2.5.95).
// Derives System Type and Pump Manufacturer evidence from the `desc` field the
// Worker already returns. This file is intentionally NOT imported by the Worker:
// the v2.5.95 attempt in PR #188 parsed per record inside the Worker MAIN loop and
// exceeded the Cloudflare CPU limit. Everything here runs once per record in the
// browser when a snapshot is applied, never per search.
(function (globalScope) {
    const DERIVED_REV = 1;
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

    // Maximum characters read after a label. Values are short table cells.
    const VALUE_WINDOW = 40;
    // One alternation, scanned once per description. Every info-table label acts as a
    // value boundary so a value can never run into a neighboring row.
    const LABEL_SOURCE = '\\b(?:PANEL\\s+TYPE|NUMBER\\s+OF\\s+MOTORS|NO\\.?\\s*(?:OF\\s+)?MOTORS|PUMP\\s+MANUFACTURER|' +
        'TYPE\\s+OF\\s+PUMP|PUMP\\s+MODEL|PHASE(?:\\s*\\/\\s*HZ)?|VOLTAGE|VOLTS|HORSEPOWER|HP|FLA|FULL\\s+LOAD\\s+AMPS|' +
        'ENCLOSURE|MODEL|RPM|TAGS?|NOTES?|PANEL\\s+NAME)\\b';
    const QUICK_CHECK_RE = /PANEL\s+TYPE|MOTORS|PUMP\s+MANUFACTURER/;
    const LEADING_SEPARATORS_RE = /^[\s:|=\-\u2013]+/;
    const SYSTEM_VALUE_RE = /^(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)(?![A-Z0-9\/+&])/;
    const SYSTEM_WORD_GLOBAL_RE = /\b(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX)\b/g;
    const PLAIN_COUNT_RE = /^([1-4])(?:\s+(.*))?$/;
    const COUNT_TAIL_REJECT_RE = /^(?:[+\-\/&.,\u00D7]|[X\u00D7]\s*\d|\d|(?:AND|OR|TO|PLUS)\s*\d)/;

    function classifyLabel(label) {
        if (label.startsWith('PANEL') && label.endsWith('TYPE')) return 'panelTypes';
        if (label.endsWith('MOTORS')) return 'motorCounts';
        if (label.startsWith('PUMP') && label.endsWith('MANUFACTURER')) return 'pumpMfgs';
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

    // Single pass over the description: locate every label, then read a short bounded
    // window after the three labels we care about.
    function extractInfoRows(desc) {
        const rows = { panelTypes: [], motorCounts: [], pumpMfgs: [] };
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
        const rows = extractInfoRows(desc);
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

    function defineDerived(record, key, value) {
        Object.defineProperty(record, key, { value, writable: true, configurable: true, enumerable: false });
    }

    // Derived fields are non-enumerable so they never reach the encrypted snapshot
    // (JSON.stringify skips them) and old cached snapshots simply re-derive on restore.
    function deriveRecord(record) {
        if (!record || typeof record !== 'object') return false;
        if (record._derivedRev === DERIVED_REV) return false;
        const derived = deriveFromDesc(record.desc);
        defineDerived(record, '_sys', derived.sys);
        defineDerived(record, '_sysV', derived.sysV);
        defineDerived(record, '_pumpMfg', derived.pumpMfg);
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

    // Counts each unique record id once from its bounded Pump Manufacturer row.
    function rankManufacturers(records, { limit = 8, allowed = null } = {}) {
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
        const options = Object.keys(counts)
            .sort((a, b) => (counts[b] - counts[a]) || a.localeCompare(b))
            .slice(0, limit);
        return { options, counts, eligibleRecords };
    }

    const InfoTableParser = Object.freeze({
        DERIVED_REV,
        SYSTEM_TYPES,
        MFG_ALIASES,
        VALUE_WINDOW,
        normalizeSystemType,
        parseMotorCount,
        normalizeManufacturer,
        extractInfoRows,
        deriveFromDesc,
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
