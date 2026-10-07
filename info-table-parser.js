// Browser-only info-table parsing (v2.5.95, extended in v2.5.96 and v2.5.97).
// Derives System Type, Pump Manufacturer, and Enclosure Material evidence
// from the `desc` field the Worker already returns. This file is intentionally NOT imported by the Worker:
// the v2.5.95 attempt in PR #188 parsed per record inside the Worker MAIN loop and
// exceeded the Cloudflare CPU limit. Everything here runs once per record in the
// browser when a snapshot is applied, never per search.
(function (globalScope) {
    // v2.5.104: refresh System Type evidence in existing snapshots.
    const DERIVED_REV = 6;
    const SYSTEM_TYPES = Object.freeze(['Simplex', 'Duplex', 'Triplex', 'Quadraplex']);
    const SYSTEM_WORDS = Object.freeze({
        SIMPLEX: 'Simplex',
        DUPLEX: 'Duplex',
        TRIPLEX: 'Triplex',
        QUADRAPLEX: 'Quadraplex',
        QUADRUPLEX: 'Quadraplex',
        QUADPLEX: 'Quadraplex',
        QUAD: 'Quadraplex',
        DUP: 'Duplex'
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
    const LABEL_SOURCE = '\\b(?:' + FEATURE_SOURCE + '|PANEL[\\s-]+(?:TYPE|CONFIGURATION)|SYSTEM[\\s-]+TYPE|TYPE\\s+OF\\s+PANEL|CONFIGURATION|NUMBER\\s+OF\\s+(?:MOTORS|PUMPS)|NO\\.?\\s*(?:OF\\s+)?(?:MOTORS|PUMPS)|QTY\\.?\\s+PUMPS|PUMP\\s+MANUFACTURER|' +
        'TYPE\\s+OF\\s+PUMP|PUMP\\s+MODEL|PHASE(?:\\s*\\/\\s*HZ)?|VOLTAGE|VOLTS|HORSEPOWER|HP|FLA|FULL\\s+LOAD\\s+AMPS|' +
        'ENCL(?:OSURE|\\.)?\\s*MATERIAL|ENCLOSURE\\s+(?:NEMA\\s+)?RATING|ENCLOSURE\\s+(?:SIZE|TYPE|DIMENSIONS?)|NEMA\\s+RATING|' +
        'INNER\\s+(?:SWING\\s+)?PANEL|INNER\\s+DOOR|CONTROL\\s+SENSOR|CONTROL\\s+VOLTAGE|' +
        'ENCLOSURE|MODEL|RPM|TAGS?|NOTES?|BOM|BILL\\s+OF\\s+MATERIALS|PANEL\\s+NAME)\\b';
    const QUICK_CHECK_RE = /\bPANEL\b|SYSTEM[\s-]+TYPE|TYPE\s+OF\s+PANEL|CONFIGURATION|MOTORS|PUMPS|PUMP\s+MANUFACTURER|MATERIAL/;
    const LEADING_SEPARATORS_RE = /^[\s:|=\-\u2013]+/;
    const SYSTEM_TOKEN_SOURCE = '(?:SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX|QUAD|DUP|(?:SINGLE|ONE|TWO|THREE|FOUR|[1-4])[\\s-]+PUMPS?|\\([1-4]\\)[\\s-]*PUMPS?)';
    const SYSTEM_CELL_RE = new RegExp(`^(${SYSTEM_TOKEN_SOURCE})(?:\\s+(?:GRINDER|ALTERNATING))?(?:\\s+PUMPS?)?(?:\\s+(?:CONTROL\\s+)?PANEL)?$`);
    const SYSTEM_ALTERNATIVE_RE = /\s*(?:AND\s*\/\s*OR|OR|AND|\/|&)\s*/;
    const SYSTEM_HARDWARE_RE = /\b(?:RECEPTACLES?|OUTLETS?|ALTERNATORS?|ALTERNATING\s+RELAY|RELAYS?|SOCKETS?|PARTS?|COMPONENTS?|SWITCH(?:ES)?|LIGHTS?|FUSES?|BREAKERS?|CONTACTORS?|INDICATORS?|HARDWARE|TERMINALS?|SCREWS?|BRACKETS?|BOLTS?|BOM|BILL\s+OF\s+MATERIALS)\b/;
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
        if (/^(?:PANEL (?:TYPE|CONFIGURATION)|SYSTEM TYPE|TYPE OF PANEL|CONFIGURATION)$/.test(label.replace(/\s+/g, ' '))) return 'panelTypes';
        if (label.endsWith('MOTORS') || /^(?:NUMBER|NO\.?|QTY\.?)\b.*PUMPS$/.test(label)) return 'motorCounts';
        if (label.startsWith('PUMP') && label.endsWith('MANUFACTURER')) return 'pumpMfgs';
        if (label.startsWith('ENCL') && label.endsWith('MATERIAL')) return 'encMaterials';
        return null;
    }

    function readValue(text, start, nextStart, kind, window = VALUE_WINDOW) {
        let raw = text.slice(start, Math.min(nextStart, start + window));
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
        const candidates = systemCandidates(value);
        return candidates.length === 1 ? candidates[0] : null;
    }

    function systemCandidates(value) {
        if (typeof value !== 'string') return [];
        const parts = value.trim().toUpperCase().split(SYSTEM_ALTERNATIVE_RE);
        if (parts.length > 4) return [];
        const found = new Set();
        for (const part of parts) {
            const match = SYSTEM_CELL_RE.exec(part);
            if (!match) return [];
            const token = match[1];
            if (token === 'DUP' && part !== 'DUP') return [];
            const count = /^(SINGLE|ONE|TWO|THREE|FOUR|\([1-4]\)|[1-4])[\s-]*PUMPS?$/.exec(token);
            found.add(count ? SYSTEM_TYPES[({ SINGLE: 1, ONE: 1, TWO: 2, THREE: 3, FOUR: 4 }[count[1]] || Number(count[1].replace(/[()]/g, ''))) - 1] : SYSTEM_WORDS[token]);
        }
        return SYSTEM_TYPES.filter(sys => found.has(sys));
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
        if (previous && (previous.kind || /^(?:TAGS?|NOTES?|BOM|BILL OF MATERIALS|PANEL NAME)$/.test(previous.label))) return null;
        let value = text.slice(Math.max(previous ? previous.end : 0, label.start - REVERSE_WINDOW), label.start);
        if (kind === 'encMaterials') value = joinMaterialLines(value);
        value = value.replace(/[\s:|=\-\u2013]+$/, '');
        const delimiter = Math.max(value.lastIndexOf('\n'), value.lastIndexOf('\r'), value.lastIndexOf('|'));
        if (delimiter >= 0) value = value.slice(delimiter + 1);
        value = value.replace(/^[\s.:|=]+/, '').trim();
        if (kind === 'panelTypes') {
            const beginning = previous ? previous.end : 0;
            if (label.start - beginning > REVERSE_WINDOW && delimiter < 0) return null;
            if (previous && !FEATURE_RE.test(previous.label)) return null;
            return associatedSystemCell(value, true);
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

    function associatedSystemCell(value, reverse = false) {
        if (/\b(?:NOT|NO|NON|WITHOUT|OTHER|ANOTHER|SEE|REF(?:ERENCE)?|FOR|REPLACE|REPLACEMENT|EXISTING)\b/.test(value)) return null;
        if (systemCandidates(value).length) return { value, varied: reverse, direction: reverse ? 'reverse' : 'forward' };
        // Exact WAGO cells are the only accepted hardware gaps, in either direction.
        const gap = /\s+\d{1,3}\s+\d{1,3}\s+WAGO\s+\d{3}-\d{3}\s+(?:(?:GROUND\s+)?TERMINAL(?:\s+OPERATOR)?|END\s+BLOCK)$/.exec(value);
        if (gap && systemCandidates(value.slice(0, gap.index)).length) {
            return { value: value.slice(0, gap.index), varied: true, direction: reverse ? 'reverse-terminal-gap' : 'forward-terminal-gap' };
        }
        const token = new RegExp(SYSTEM_TOKEN_SOURCE, 'g');
        let match;
        while ((match = token.exec(value))) {
            const prefix = value.slice(0, match.index).trim();
            const cell = value.slice(match.index);
            if (systemCandidates(cell).length) {
                const terminal = TERMINAL_CELL_RE.test(prefix);
                if (terminal || (!SYSTEM_HARDWARE_RE.test(value) && isWiringNoise(prefix))) {
                    return { value: cell, varied: true, direction: `${reverse ? 'reverse' : 'forward'}-${terminal ? 'terminal' : 'wiring'}-gap` };
                }
            }
        }
        const leading = new RegExp(`^(${SYSTEM_TOKEN_SOURCE})\\s+(.+)$`).exec(value);
        if (leading && !SYSTEM_HARDWARE_RE.test(value) && isWiringNoise(leading[2])) {
            return { value: leading[1], varied: true, direction: reverse ? 'reverse-wiring-gap' : 'forward-wiring-gap' };
        }
        return null;
    }

    function completeCell(text, label, next, window = VALUE_WINDOW) {
        const end = next ? next.start : text.length;
        const raw = text.slice(label.end, Math.min(end, label.end + window));
        const trimmed = raw.replace(/^[\s:|=]+/, '');
        const cut = trimmed.search(/[\n\r|]/);
        return end <= label.end + window || cut >= 0;
    }

    function invalidContinuation(text, label, next) {
        const boundary = next ? next.start : text.length;
        const end = Math.min(boundary, label.end + REVERSE_WINDOW);
        const raw = text.slice(label.end, end)
            .replace(/^[\s:|=]+/, '');
        const delimiter = raw.search(/[\n\r|]/);
        if (delimiter < 0) return false;
        const tail = raw.slice(delimiter + 1).trim();
        if (end < boundary) return true;
        return /^(?:OR\b|AND\b|[+\/&]|TO\b|FAN\b|AUX\b)/.test(tail)
            || (label.kind === 'panelTypes' && SYSTEM_HARDWARE_RE.test(tail.split(/[\n\r|]/)[0]));
    }

    // One linear label scan; all forward/reverse work is bounded per info cell.
    function extractInfoRows(desc) {
        const rows = { panelTypes: [], motorCounts: [], pumpMfgs: [], encMaterials: [] };
        Object.defineProperty(rows, 'associations', { value: [] });
        if (typeof desc !== 'string' || !desc) return rows;
        const text = desc.toUpperCase();
        if (!QUICK_CHECK_RE.test(text)) return rows;
        const regex = new RegExp(LABEL_SOURCE, 'g');
        let labels = [];
        let match;
        while ((match = regex.exec(text))) {
            labels.push({ label: match[0], kind: classifyLabel(match[0]), start: match.index, end: regex.lastIndex });
        }
        const tableAnchor = label => label && (label.kind || FEATURE_RE.test(label.label)
            || /^(?:VOLTAGE|VOLTS|PHASE(?:\/HZ)?|HORSEPOWER|HP|FLA|FULL LOAD AMPS|RPM|ENCLOSURE(?: .+)?)$/.test(label.label));
        let configurationBlock = null;
        // A bare configuration label is useful only within a nearby info-table cluster.
        labels = labels.filter((label, i, scanned) => {
            if (/^(?:TAGS?|NOTES?|BOM|BILL OF MATERIALS|PANEL NAME)$/.test(label.label)) configurationBlock = label;
            else if (configurationBlock && tableAnchor(label)
                && (tableAnchor(scanned[i - 1]) || tableAnchor(scanned[i + 1]))
                && /[\n\r|]/.test(text.slice(Math.max(configurationBlock.end, label.start - REVERSE_WINDOW), label.start))) configurationBlock = null;
            if (label.label !== 'CONFIGURATION') return true;
            const supported = [scanned[i - 1], scanned[i + 1]].some(neighbor => neighbor
                && Math.abs(neighbor.start - label.start) <= REVERSE_WINDOW
                && /^(?:VOLTAGE|VOLTS|PHASE|NO\.?|NUMBER|QTY|PUMP MANUFACTURER|ENCLOSURE)/.test(neighbor.label));
            const next = scanned[i + 1];
            return !configurationBlock && supported && completeCell(text, label, next)
                && !invalidContinuation(text, label, next)
                && !!associatedSystemCell(readValue(text, label.end, next ? next.start : text.length, label.kind));
        });
        Object.defineProperty(rows, 'labels', { value: labels });
        let contextBlock = null;
        labels.forEach((label, i) => {
            if (/^(?:TAGS?|NOTES?|BOM|BILL OF MATERIALS|PANEL NAME)$/.test(label.label)) contextBlock = label;
            else if (contextBlock && tableAnchor(label)
                && (tableAnchor(labels[i - 1]) || tableAnchor(labels[i + 1]))
                && /[\n\r|]/.test(text.slice(Math.max(contextBlock.end, label.start - REVERSE_WINDOW), label.start))) contextBlock = null;
            label.systemBlocked = !!contextBlock;
            if (!label.kind) return;
            const next = labels[i + 1];
            let value = readValue(text, label.end, next ? next.start : text.length, label.kind);
            let association = { value, varied: false, direction: 'forward' };
            if (label.kind === 'panelTypes') {
                const complete = completeCell(text, label, next);
                association = complete ? associatedSystemCell(value) : null;
                if (!association && !complete && completeCell(text, label, next, REVERSE_WINDOW)) {
                    const wide = readValue(text, label.end, next ? next.start : text.length, label.kind, REVERSE_WINDOW);
                    const gap = associatedSystemCell(wide);
                    if (gap && gap.varied) association = gap;
                }
                if (!association && complete && (!value || isWiringNoise(value))) {
                    association = reverseValue(text, label, labels[i - 1], next, label.kind);
                }
                if (contextBlock || invalidContinuation(text, label, next)) association = null;
                association = association || { value: '', varied: true, direction: 'unreadable' };
            }
            if (label.kind === 'motorCounts' && !completeCell(text, label, next)) association.value = '';
            if (label.kind === 'motorCounts' && invalidContinuation(text, label, next)) association.value = '';
            if (label.kind === 'motorCounts' && contextBlock) association.value = '';
            if (label.kind === 'motorCounts') {
                const previous = labels[i - 1];
                const prefix = text.slice(Math.max(0, label.start - REVERSE_WINDOW), label.start);
                if (!previous && prefix.trim() && !/[\n\r|]\s*$/.test(prefix)) association.value = '';
            }
            if (label.kind === 'encMaterials' && value && !identifiedMaterials(value).length
                && !UNSUPPORTED_MATERIAL_RE.test(value) && next && MATERIAL_BOUNDARY_RE.test(next.label)
                // A window cutoff is not a cell boundary: it may hide hardware or alternatives.
                && (next.start <= label.end + VALUE_WINDOW
                    || /[\n\r|]/.test(joinMaterialLines(text.slice(label.end, label.end + VALUE_WINDOW)).replace(LEADING_SEPARATORS_RE, '')))) {
                const forward = interleavedMaterial(value, false);
                if (forward) association = { ...forward, varied: true, direction: 'forward-wiring-gap' };
                else if (isWiringNoise(value)) {
                    const reverse = reverseValue(text, label, labels[i - 1], next, label.kind);
                    if (reverse) association = { ...reverse, varied: true };
                }
            }
            if (!value && label.kind === 'encMaterials') {
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
                && association.value && /^[1-4]\s+H\s+A$/.test(value)) {
                association.value = value[0];
            }
            rows[label.kind].push(association.value);
            rows.associations.push({ kind: label.kind, label: label.label, ...association });
        });
        return rows;
    }

    function deriveFromDesc(desc) {
        return deriveFromRows(extractInfoRows(desc), desc);
    }

    function titleCandidates(desc, labels) {
        if (typeof desc !== 'string' || !desc) return [];
        const text = desc.toUpperCase();
        const token = SYSTEM_TOKEN_SOURCE.replace('|DUP|', '|');
        const gap = '[\\s|]{1,8}';
        const matcher = new RegExp(`(?:\\b|(?=\\([1-4]\\)))(?:(${token})${gap}(?:(?:PUMP|PUMPS|BLOWER|MOTOR|GRINDER|ALTERNATING|SEWAGE|LIFT|STATION|WATER|WASTEWATER|CONTROL)${gap}){0,5}PANEL|(?:PUMP${gap})?CONTROL${gap}PANEL(?:[ \\t]*[:=-][ \\t]*|${gap}(?:FOR${gap})?)(${token}))\\b`, 'g');
        const candidates = new Set();
        let index = 0;
        let match;
        while ((match = matcher.exec(text))) {
            if (match[0].length > REVERSE_WINDOW || (match.index && /[A-Z0-9]/.test(text[match.index - 1]))) continue;
            const end = matcher.lastIndex;
            // Rejected bounded phrases must not consume an overlapping valid title.
            matcher.lastIndex = match.index + 1;
            if (/[-_A-Z0-9(/\\#+&=]/.test(text.charAt(end))) continue;
            while (index < labels.length && labels[index].start < match.index) index++;
            const previous = labels[index - 1];
            if (labels[index] && labels[index].start < end) continue;
            if (previous && (previous.systemBlocked || (previous.kind === 'panelTypes'
                && !/[\n\r|]/.test(text.slice(Math.max(previous.end, match.index - REVERSE_WINDOW), match.index)))
                || /^(?:TAGS?|NOTES?|BOM|BILL OF MATERIALS|PANEL NAME)$/.test(previous.label))) continue;
            const preceding = text.slice(Math.max(0, match.index - REVERSE_WINDOW), match.index);
            const before = preceding.split(/[\n\r|.;]/).pop();
            const after = text.slice(end, Math.min(labels[index] ? labels[index].start : text.length, end + REVERSE_WINDOW))
                .replace(/^[\s|]+/, '').split(/[\n\r|.;]/)[0];
            if (/\b(?:NOT|NO|NON|WITHOUT|OTHER|ANOTHER|EXISTING|SEE|REF(?:ERENCE)?|REPLACE|REPLACEMENT|FOR|TO|OR|AND)\b/.test(before)
                || /\b(?:NOT|NO|NON|WITHOUT|OTHER|ANOTHER|SEE|REF(?:ERENCE)?|DWG|DRAWING|FOR)\.?[\s|:=-]*$/.test(preceding)
                || /\b(?:OTHER|ANOTHER|EXISTING)\s+(?:CONTROL\s+)?PANEL[\s|:=-]*$/.test(preceding)
                || SYSTEM_HARDWARE_RE.test(before) || SYSTEM_HARDWARE_RE.test(after)
                || /^(?:[-_/#\\+&]|\d|[:=(]\s*\d)/.test(after)
                || /\b(?:NOT|WITHOUT|OTHER|ANOTHER)\b/.test(after)
                || /^\s*(?:OR|AND|\/|&|FOR|ON|IN|OF|WITH|PART|MOUNTED|ATTACHED)\b/.test(after)) continue;
            const sys = normalizeSystemType(match[1] || match[2]);
            if (sys) {
                candidates.add(sys);
                matcher.lastIndex = end;
            }
        }
        return SYSTEM_TYPES.filter(sys => candidates.has(sys));
    }

    function deriveFromRows(rows, desc) {
        const explicit = new Set();
        const ambiguous = [];
        rows.panelTypes.forEach(value => {
            const candidates = systemCandidates(value);
            if (candidates.length === 1) explicit.add(candidates[0]);
            else if (candidates.length > 1) ambiguous.push(candidates);
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
        let source = 'none';
        let direction = null;
        let candidates = SYSTEM_TYPES.filter(sys => explicit.has(sys));
        const reasons = [];
        const allows = candidate => ambiguous.every(set => set.includes(candidate));
        if (explicit.size === 1) {
            sys = [...explicit][0];
            source = 'row';
            const associations = rows.associations.filter(a => a.kind === 'panelTypes');
            direction = associations.find(a => normalizeSystemType(a.value) === sys).direction;
            const agrees = counts.size === 1 && SYSTEM_TYPES[[...counts][0] - 1] === sys;
            const hasCountEvidence = counts.size > 0 || hasNonPlainCount;
            // Panel Type wins; disagreement or a combination count marks it uncertain.
            sysV = ambiguous.length > 0 || associations.some(a => a.varied)
                || (hasCountEvidence && !(agrees && !hasNonPlainCount));
            reasons.push('complete-explicit-cell');
            if (ambiguous.length) reasons.push('ambiguous-additional-row');
            if (associations.some(a => a.varied)) reasons.push('uncertain-row-association');
            if (associations.some(a => a.direction.includes('wiring-gap'))) reasons.push('wiring-gap');
            if (associations.some(a => a.direction.includes('terminal-gap'))) reasons.push('terminal-gap');
            if (associations.some(a => a.direction === 'reverse')) reasons.push('reverse-cell');
            if (hasCountEvidence && !(agrees && !hasNonPlainCount)) reasons.push('unresolved-or-conflicting-count');
        } else if (explicit.size > 1) {
            source = 'conflict';
            reasons.push('conflicting-explicit-rows');
        } else {
            const titles = titleCandidates(desc, rows.labels || []);
            candidates = ambiguous.length ? SYSTEM_TYPES.filter(allows) : titles;
            if (titles.length === 1 && allows(titles[0])) {
                sys = titles[0];
                source = 'title';
                direction = 'narrative';
                sysV = true;
                reasons.push('validated-panel-phrase');
            } else if (titles.length > 1) {
                source = 'conflict';
                candidates = titles;
                reasons.push('conflicting-panel-phrases');
            } else if (!titles.length && !hasNonPlainCount && counts.size === 1) {
                const count = [...counts][0];
                const inferred = SYSTEM_TYPES[count - 1];
                // Specific No./Number/QTY labels supply table association, even alone.
                // Counts 1-3 are orange; four needs an explicit row or panel phrase.
                if ((count < 4 || ambiguous.length) && allows(inferred)) {
                    sys = inferred;
                    source = 'count';
                    direction = 'forward';
                    sysV = true;
                    candidates = ambiguous.length ? candidates : [inferred];
                    reasons.push('complete-specific-count-cell');
                }
            }
        }
        if (!sys && source === 'none') reasons.push('insufficient-associated-evidence');
        const sysEvidence = Object.freeze({
            source, candidates: Object.freeze(candidates), direction,
            confidence: sys ? (sysV ? 'uncertain' : 'verified') : 'none',
            reasons: Object.freeze(reasons)
        });

        const mfgs = new Set();
        let unknownMfg = false;
        rows.pumpMfgs.forEach(value => {
            const mfg = normalizeManufacturer(value);
            if (mfg) mfgs.add(mfg);
            else unknownMfg = true;
        });
        const pumpMfg = mfgs.size === 1 && !unknownMfg ? [...mfgs][0] : null;
        const derived = { sys, sysV, pumpMfg };
        Object.defineProperty(derived, 'sysEvidence', { value: sysEvidence });
        return derived;
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
        const derived = deriveFromRows(rows, record.desc);
        defineDerived(record, '_sys', derived.sys);
        defineDerived(record, '_sysV', derived.sysV);
        defineDerived(record, '_sysEvidence', derived.sysEvidence);
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

    // v2.5.105: opt-in, read-only System Type diagnostic for the browser console.
    // Never runs automatically. Re-derives evidence with the same pure functions used at
    // snapshot apply and returns bounded, sanitized summaries. No network, persistence or
    // record mutation; pdfUrl, credentials and full descriptions are never read into output.
    const AUDIT_TEXT_MAX = 60;
    const AUDIT_ID_MAX = 40;
    const AUDIT_SAMPLES = Object.freeze({ fallback: 5, max: 20 });
    const AUDIT_PATTERNS = Object.freeze({ fallback: 30, max: 50 });
    const AUDIT_KEYWORDS_PER_RECORD = 12;
    const AUDIT_PATTERNS_PER_RECORD = 4;
    const AUDIT_MENTIONS_PER_INSPECT = 6;
    const AUDIT_TYPE_WORD_SOURCE = '\\b(SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX|QUAD)\\b';
    const AUDIT_KEYWORD_SOURCE = '\\b(?:SIMPLEX|DUPLEX|TRIPLEX|QUADRAPLEX|QUADRUPLEX|QUADPLEX|QUAD|' +
        'PANEL[\\s-]+(?:TYPE|CONFIGURATION)|SYSTEM[\\s-]+TYPE|TYPE\\s+OF\\s+PANEL|CONFIGURATION|' +
        '(?:NO\\.?|NUMBER|QTY\\.?)\\s*(?:OF\\s+)?(?:MOTORS|PUMPS)|(?:SINGLE|ONE|TWO|THREE|FOUR|[1-4])[\\s-]+PUMPS?)\\b';
    const AUDIT_STATES = Object.freeze(['green', 'orange', 'absent', 'conflicting']);
    const AUDIT_SOURCES = Object.freeze(['explicitRow', 'titlePhrase', 'countInference', 'conflict', 'unknown']);
    const AUDIT_FAILING = Object.freeze(['orange', 'absent', 'conflicting']);

    function auditClean(value, max = AUDIT_TEXT_MAX) {
        if (value === null || value === undefined) return '';
        const text = String(value).slice(0, max * 4).toUpperCase()
            .replace(/(?:HTTPS?:\/\/|WWW\.)\S*/g, '<URL>')
            .replace(/[^\s@]+@[^\s@]+/g, '<EMAIL>')
            .replace(/\d{3,}/g, '#')
            .replace(/[\r\n|]+/g, ' | ')
            .replace(/[^A-Z0-9#.,:;/()&+=<>| -]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return text.length > max ? `${text.slice(0, max - 1)}…` : text;
    }

    function auditId(record, index) {
        if (!record || record.id === undefined || record.id === null || record.id === '') return `(no id #${index})`;
        return String(record.id).slice(0, AUDIT_ID_MAX).replace(/[^A-Za-z0-9._-]/g, '') || `(unprintable id #${index})`;
    }

    // Uniqueness uses the raw id; auditId() is display-only and may collapse distinct ids.
    function auditKey(record, index) {
        return record.id === undefined || record.id === null || record.id === '' ? `#${index}` : `id:${String(record.id)}`;
    }

    function auditLimit(value, limits) {
        const n = Number(value);
        if (!Number.isFinite(n)) return limits.fallback;
        return Math.max(0, Math.min(limits.max, Math.floor(n)));
    }

    function auditCompareIds(a, b) {
        return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
    }

    function auditTally(map, key, n = 1) {
        map[key] = (map[key] || 0) + n;
    }

    function auditSortedCounts(map) {
        return Object.fromEntries(Object.entries(map).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
    }

    function auditKeyword(match) {
        const label = match.toUpperCase().replace(/[\s-]+/g, ' ').replace(/\./g, '').trim();
        if (/^(?:SINGLE|ONE|TWO|THREE|FOUR|[1-4]) PUMPS?$/.test(label)) return 'N PUMP(S)';
        return label;
    }

    function auditMentions(text) {
        const mentions = {};
        if (!text) return mentions;
        const matcher = new RegExp(AUDIT_TYPE_WORD_SOURCE, 'g');
        let match;
        while ((match = matcher.exec(text))) auditTally(mentions, SYSTEM_WORDS[match[1]]);
        return mentions;
    }

    function auditContext(text, start, end, before = 2, after = 4) {
        const head = text.slice(Math.max(0, start - 40), start).replace(/[\r\n|]+/g, ' | ').trim().split(/\s+/).filter(Boolean).slice(-before);
        const tail = text.slice(end, end + 48).replace(/[\r\n|]+/g, ' | ').trim().split(/\s+/).filter(Boolean).slice(0, after);
        return auditClean([...head, text.slice(start, end), ...tail].join(' '));
    }

    // Pure per-record analysis; never writes to the record.
    function auditAnalyze(record) {
        const desc = record && typeof record.desc === 'string' ? record.desc : '';
        const text = desc.toUpperCase();
        const rows = extractInfoRows(desc);
        const derived = deriveFromRows(rows, desc);
        const evidence = derived.sysEvidence;
        const titles = titleCandidates(desc, rows.labels || []);
        const panelRows = rows.associations.filter(a => a.kind === 'panelTypes');
        const ambiguous = rows.panelTypes.map(systemCandidates).filter(set => set.length > 1);
        const explicit = new Set(rows.panelTypes.map(systemCandidates).filter(set => set.length === 1).map(set => set[0]));
        const counts = rows.motorCounts.map(parseMotorCount);
        const mentions = auditMentions(text);
        let state;
        let source;
        if (derived.sys) {
            state = derived.sysV ? 'orange' : 'green';
            source = { row: 'explicitRow', title: 'titlePhrase', count: 'countInference' }[evidence.source] || 'unknown';
        } else if (evidence.source === 'conflict' || ambiguous.length) {
            state = 'conflicting';
            source = 'conflict';
        } else {
            state = 'absent';
            source = 'unknown';
        }
        let cause = null;
        if (state === 'orange') {
            const reasons = evidence.reasons;
            if (evidence.source === 'title') cause = 'title-narrative-only';
            else if (evidence.source === 'count') cause = 'count-inference';
            else if (reasons.includes('ambiguous-additional-row')) cause = 'row-plus-ambiguous-row';
            else if (reasons.includes('unresolved-or-conflicting-count')) cause = 'row-count-disagreement';
            else if (reasons.includes('wiring-gap') || reasons.includes('terminal-gap')) cause = 'row-gap-association';
            else if (reasons.includes('reverse-cell')) cause = 'row-reverse-cell';
            else if (reasons.includes('uncertain-row-association')) cause = 'row-uncertain-association';
            else cause = 'row-other';
        } else if (state === 'conflicting') {
            cause = evidence.source === 'conflict' ? evidence.reasons[0] : 'ambiguous-panel-type-row';
        } else if (state === 'absent') {
            if (!desc.trim()) cause = 'no-description';
            else if (panelRows.length) {
                cause = panelRows.every(a => a.direction === 'unreadable' || !a.value) ? 'panel-type-label-unreadable' : 'panel-type-value-unrecognized';
            } else if (counts.length) {
                if (rows.motorCounts.some(v => !v)) cause = 'count-cell-incomplete';
                else if (counts.some(c => c === null)) cause = 'count-not-plain';
                else if (new Set(counts).size > 1) cause = 'count-disagreement';
                else if (counts[0] === 4) cause = 'four-count-without-row-or-title';
                else cause = 'count-unused';
            } else if (Object.keys(mentions).length) cause = 'type-word-without-accepted-evidence';
            else if (new RegExp(AUDIT_KEYWORD_SOURCE).test(text)) cause = 'pump-count-or-label-without-value';
            else cause = 'no-system-type-evidence';
        }
        let countDetail = null;
        if (state === 'orange' && evidence.source === 'row' && evidence.reasons.includes('unresolved-or-conflicting-count')) {
            if (rows.motorCounts.some(v => !v)) countDetail = 'blank-count-cell';
            else if (counts.some(c => c === null)) countDetail = 'combination-or-non-plain-count';
            else if (new Set(counts).size > 1) countDetail = 'multiple-count-values';
            else countDetail = 'count-implies-different-type';
        }
        return { desc, text, rows, derived, evidence, titles, panelRows, ambiguous, explicit, counts, mentions, state, source, cause, countDetail };
    }

    function auditTypeVerdicts(analysis) {
        const { derived, evidence, titles, ambiguous, explicit, counts, mentions } = analysis;
        const verdicts = {};
        SYSTEM_TYPES.forEach((type, index) => {
            const facts = {
                explicitRow: explicit.has(type),
                ambiguousRow: ambiguous.some(set => set.includes(type)),
                titlePhrase: titles.includes(type),
                countImplies: counts.includes(index + 1),
                mentions: mentions[type] || 0
            };
            const anyEvidence = facts.explicitRow || facts.ambiguousRow || facts.titlePhrase || facts.countImplies;
            let verdict;
            if (derived.sys === type) verdict = derived.sysV ? 'matched-orange' : 'matched-green';
            else if (derived.sys) verdict = anyEvidence || facts.mentions ? `lost-to-${derived.sys}` : 'not-mentioned';
            else if (analysis.state === 'conflicting' && evidence.candidates.includes(type)) verdict = 'blocked-by-conflict';
            else if (anyEvidence) verdict = 'evidence-rejected';
            else if (facts.mentions) verdict = 'mentioned-without-accepted-evidence';
            else verdict = 'not-mentioned';
            verdicts[type] = { verdict, ...facts };
        });
        return verdicts;
    }

    function auditRecords(options) {
        if (options && options.records && typeof options.records.length === 'number') return { scope: 'records', list: options.records };
        if (options && options.scope === 'results') {
            const engine = typeof SearchEngine !== 'undefined' ? SearchEngine : (globalScope && globalScope.SearchEngine);
            return { scope: 'results', list: engine && Array.isArray(engine.currentResults) ? engine.currentResults : [] };
        }
        return { scope: 'LOCAL_DB', list: globalScope && Array.isArray(globalScope.LOCAL_DB) ? globalScope.LOCAL_DB : [] };
    }

    function auditBadgeRenderer(options) {
        if (options && typeof options.badgeRenderer === 'function') return { name: 'custom', render: options.badgeRenderer };
        if (options && options.badgeRenderer === false) return null;
        const ui = globalScope && globalScope.UI;
        if (ui && typeof ui._generateBadges === 'function') return { name: 'UI._generateBadges', render: (r, c) => ui._generateBadges(r, c) };
        return null;
    }

    // The badge the results list would draw for the stored _sys/_sysV of this record.
    function auditRenderedBadge(renderer, record) {
        const sys = record && record._sys;
        if (!SYSTEM_TYPES.includes(sys)) return null;
        if (!renderer) return record._sysV === true ? 'orange' : 'green';
        const criteria = { kw: [], blockedKw: [], mfg: 'Any', hp: 'Any', volt: 'Any', phase: 'Any', enc: 'Any', sys, blocklistMode: false };
        let badges;
        try { badges = renderer.render(record, criteria); } catch (_) { return 'error'; }
        const label = `>${sys.toUpperCase()}</span>`;
        const badge = Array.isArray(badges) ? badges.find(b => typeof b === 'string' && b.includes(label)) : null;
        if (!badge) return 'missing';
        if (/\bmatch-orange\b/.test(badge)) return 'orange';
        return /\bmatch-green\b/.test(badge) ? 'green' : 'other';
    }

    function auditInfo() {
        return {
            appVersion: typeof APP_VERSION !== 'undefined' ? String(APP_VERSION) : null,
            derivedRev: DERIVED_REV
        };
    }

    function auditReport(options) {
        options = options || {};
        const sampleLimit = auditLimit(options.samples, AUDIT_SAMPLES);
        const patternLimit = auditLimit(options.patterns, AUDIT_PATTERNS);
        const snippets = options.snippets === true;
        const { scope, list } = auditRecords(options);
        const renderer = auditBadgeRenderer(options);
        const seen = new Set();
        const samples = {};
        const sample = (key, id) => (samples[key] || (samples[key] = [])).push(id);
        const states = Object.fromEntries(AUDIT_STATES.map(s => [s, 0]));
        const sources = Object.fromEntries(AUDIT_SOURCES.map(s => [s, 0]));
        const types = Object.fromEntries(SYSTEM_TYPES.map(type => [type, {
            total: 0, green: 0, orange: 0,
            bySource: { explicitRow: 0, titlePhrase: 0, countInference: 0 },
            orangeCauses: {}, rendered: { green: 0, orange: 0, missing: 0, other: 0 },
            conflictCandidate: 0, mentionedButUnclassified: 0, lostToOtherType: 0
        }]));
        const orangeCauses = {};
        const countDetails = {};
        const countValues = {};
        const absentReasons = {};
        const conflictReasons = {};
        const reasons = {};
        const keywordHits = Object.fromEntries(AUDIT_FAILING.map(s => [s, {}]));
        const patterns = new Map();
        const overlaps = { mentionsMultipleTypes: 0, conflictMultipleCandidates: 0, classifiedButMentionsOtherType: 0, unclassifiedWithTypeMention: 0 };
        const stale = { notDerived: 0, storedMismatch: 0 };
        const badge = { renderer: renderer ? renderer.name : 'parser-rule', checked: 0, mismatches: 0, errors: 0 };
        let duplicates = 0;
        let unique = 0;
        const total = list && typeof list.length === 'number' ? list.length : 0;
        for (let i = 0; i < total; i++) {
            const record = list[i];
            if (!record || typeof record !== 'object') continue;
            const key = auditKey(record, i);
            if (seen.has(key)) { duplicates++; continue; }
            seen.add(key);
            const id = auditId(record, i);
            unique++;
            const a = auditAnalyze(record);
            states[a.state]++;
            sources[a.source]++;
            sample(`state:${a.state}`, id);
            sample(`source:${a.source}`, id);
            a.evidence.reasons.forEach(reason => auditTally(reasons, reason));
            const mentioned = Object.keys(a.mentions);
            if (mentioned.length > 1) { overlaps.mentionsMultipleTypes++; sample('overlap:mentionsMultipleTypes', id); }
            if (a.state === 'conflicting' && a.evidence.candidates.length > 1) overlaps.conflictMultipleCandidates++;
            if (a.derived.sys && mentioned.some(t => t !== a.derived.sys)) overlaps.classifiedButMentionsOtherType++;
            if (!a.derived.sys && mentioned.length) overlaps.unclassifiedWithTypeMention++;

            if (record._derivedRev !== DERIVED_REV) stale.notDerived++;
            else if ((record._sys || null) !== a.derived.sys || (record._sysV === true) !== a.derived.sysV) {
                stale.storedMismatch++;
                sample('stale:storedMismatch', id);
            }

            if (a.derived.sys) {
                const t = types[a.derived.sys];
                t.total++;
                t[a.state]++;
                t.bySource[a.source]++;
                sample(`${a.derived.sys}:${a.state}`, id);
                mentioned.filter(m => m !== a.derived.sys).forEach(m => types[m].lostToOtherType++);
            } else {
                mentioned.forEach(m => { types[m].mentionedButUnclassified++; sample(`${m}:mentionedButUnclassified`, id); });
            }
            if (a.state === 'conflicting') a.evidence.candidates.forEach(c => types[c].conflictCandidate++);
            if (a.state === 'orange') {
                auditTally(orangeCauses, a.cause);
                auditTally(types[a.derived.sys].orangeCauses, a.cause);
                sample(`orange:${a.cause}`, id);
                if (a.countDetail) {
                    auditTally(countDetails, a.countDetail);
                    if (snippets) auditTally(countValues, `${a.derived.sys} row | count ${a.rows.motorCounts.map(v => auditClean(v, 16) || '(blank)').slice(0, 3).join(' / ')}`);
                }
            } else if (a.state === 'absent') {
                auditTally(absentReasons, a.cause);
                sample(`absent:${a.cause}`, id);
            } else if (a.state === 'conflicting') {
                auditTally(conflictReasons, a.cause);
                sample(`conflicting:${a.cause}`, id);
            }

            const rendered = auditRenderedBadge(renderer, record);
            if (rendered) {
                badge.checked++;
                if (rendered === 'error') badge.errors++;
                else {
                    types[record._sys].rendered[rendered in types[record._sys].rendered ? rendered : 'other']++;
                    const expected = record._sysV === true ? 'orange' : 'green';
                    if (rendered !== expected) { badge.mismatches++; sample('badge:mismatch', id); }
                }
            }

            if (AUDIT_FAILING.includes(a.state) && a.text) {
                const matcher = new RegExp(AUDIT_KEYWORD_SOURCE, 'g');
                const keywords = new Set();
                const recordPatterns = new Set();
                let match;
                let lastPattern = -Infinity;
                for (let k = 0; k < AUDIT_KEYWORDS_PER_RECORD && (match = matcher.exec(a.text)); k++) {
                    keywords.add(auditKeyword(match[0]));
                    // Neighboring keywords share one context window instead of repeating it.
                    if (snippets && recordPatterns.size < AUDIT_PATTERNS_PER_RECORD && match.index >= lastPattern + 32) {
                        lastPattern = match.index;
                        recordPatterns.add(auditContext(a.text, match.index, matcher.lastIndex).replace(/\b[1-4]\b/g, 'N'));
                    }
                }
                keywords.forEach(k => auditTally(keywordHits[a.state], k));
                recordPatterns.forEach(pattern => {
                    const key = `${a.state}\u0000${pattern}`;
                    const entry = patterns.get(key) || { state: a.state, pattern, records: 0, ids: [] };
                    entry.records++;
                    entry.ids.push(id);
                    patterns.set(key, entry);
                });
            }
        }
        const sampleIds = {};
        Object.keys(samples).sort().forEach(key => {
            sampleIds[key] = samples[key].sort(auditCompareIds).slice(0, sampleLimit);
        });
        Object.values(types).forEach(t => { t.orangeCauses = auditSortedCounts(t.orangeCauses); });
        const topPatterns = snippets ? [...patterns.values()]
            .sort((a, b) => (b.records - a.records) || (a.state < b.state ? -1 : a.state > b.state ? 1 : 0) || (a.pattern < b.pattern ? -1 : a.pattern > b.pattern ? 1 : 0))
            .slice(0, patternLimit)
            .map(p => ({ state: p.state, pattern: p.pattern, records: p.records, sampleIds: p.ids.sort(auditCompareIds).slice(0, sampleLimit) })) : null;
        return {
            tool: 'SystemTypeAudit',
            ...auditInfo(),
            scope,
            records: { scanned: total, unique, duplicates },
            states,
            sources,
            types,
            orangeCauses: auditSortedCounts(orangeCauses),
            rowCountDisagreements: auditSortedCounts(countDetails),
            rowCountValues: snippets ? auditSortedCounts(countValues) : null,
            absentReasons: auditSortedCounts(absentReasons),
            conflictReasons: auditSortedCounts(conflictReasons),
            evidenceReasons: auditSortedCounts(reasons),
            overlaps,
            stale,
            badge,
            keywordHits: Object.fromEntries(AUDIT_FAILING.map(s => [s, auditSortedCounts(keywordHits[s])])),
            snippets,
            patterns: topPatterns,
            sampleIds
        };
    }

    function auditFind(list, id) {
        const wanted = String(id === undefined || id === null ? '' : id).trim().toUpperCase();
        if (!wanted) return null;
        for (let i = 0; i < list.length; i++) {
            const record = list[i];
            if (!record || typeof record !== 'object') continue;
            if (String(record.id === undefined || record.id === null ? '' : record.id).toUpperCase() === wanted
                || (record.displayId && String(record.displayId).toUpperCase() === wanted)) return { record, index: i };
        }
        return null;
    }

    function auditInspect(id, options) {
        options = options || {};
        const { scope, list } = auditRecords(options);
        const found = auditFind(list, id);
        if (!found) return { tool: 'SystemTypeAudit', ...auditInfo(), scope, found: false, id: auditClean(id, AUDIT_ID_MAX) };
        const { record, index } = found;
        const a = auditAnalyze(record);
        const mentions = [];
        const matcher = new RegExp(AUDIT_TYPE_WORD_SOURCE, 'g');
        let match;
        while (mentions.length < AUDIT_MENTIONS_PER_INSPECT && (match = matcher.exec(a.text))) {
            mentions.push({ word: match[1], context: auditContext(a.text, match.index, matcher.lastIndex, 4, 5) });
        }
        const labels = (a.rows.labels || []).slice(0, 20).map(l => auditClean(l.label, 32));
        return {
            tool: 'SystemTypeAudit',
            ...auditInfo(),
            scope,
            found: true,
            id: auditId(record, index),
            displayId: record.displayId ? auditClean(record.displayId, AUDIT_ID_MAX) : null,
            state: a.state,
            source: a.source,
            cause: a.cause,
            countDetail: a.countDetail,
            derived: {
                sys: a.derived.sys,
                sysV: a.derived.sysV,
                confidence: a.evidence.confidence,
                parserSource: a.evidence.source,
                direction: a.evidence.direction,
                candidates: [...a.evidence.candidates],
                reasons: [...a.evidence.reasons]
            },
            stored: {
                derivedRev: record._derivedRev === undefined ? null : record._derivedRev,
                sys: record._sys === undefined ? null : record._sys,
                sysV: record._sysV === true,
                matchesFresh: record._derivedRev === DERIVED_REV
                    && (record._sys || null) === a.derived.sys && (record._sysV === true) === a.derived.sysV
            },
            badge: auditRenderedBadge(auditBadgeRenderer(options), record),
            evidence: {
                descriptionLength: a.desc.length,
                panelTypeRows: a.panelRows.slice(0, 8).map(row => ({
                    label: auditClean(row.label, 32), value: auditClean(row.value), direction: row.direction,
                    varied: !!row.varied, candidates: systemCandidates(row.value)
                })),
                motorCountRows: a.rows.motorCounts.slice(0, 8).map(value => ({ value: auditClean(value, 24), plainCount: parseMotorCount(value) })),
                titleCandidates: [...a.titles],
                labelsSeen: labels,
                typeMentions: mentions
            },
            types: auditTypeVerdicts(a)
        };
    }

    function auditLine(label, counts) {
        const entries = Object.entries(counts || {});
        return `${label}: ${entries.length ? entries.map(([k, v]) => `${k}=${v}`).join(', ') : '(none)'}`;
    }

    // Plain-text summary suitable for pasting into a PR discussion.
    function auditFormat(report) {
        const r = report && report.tool === 'SystemTypeAudit' ? report : auditReport(report || {});
        const lines = [
            `SystemTypeAudit ${r.appVersion || '(no app version)'} DERIVED_REV=${r.derivedRev} scope=${r.scope} scanned=${r.records.scanned} unique=${r.records.unique} duplicates=${r.records.duplicates}`,
            auditLine('States', r.states),
            auditLine('Sources', r.sources),
            'Type | total | green | orange | row/title/count | rendered g/o/missing | conflictCandidate | mentionedButUnclassified | lostToOtherType'
        ];
        SYSTEM_TYPES.forEach(type => {
            const t = r.types[type];
            lines.push(`${type} | ${t.total} | ${t.green} | ${t.orange} | ${t.bySource.explicitRow}/${t.bySource.titlePhrase}/${t.bySource.countInference} | ${t.rendered.green}/${t.rendered.orange}/${t.rendered.missing} | ${t.conflictCandidate} | ${t.mentionedButUnclassified} | ${t.lostToOtherType}`);
        });
        SYSTEM_TYPES.forEach(type => lines.push(auditLine(`Orange causes ${type}`, r.types[type].orangeCauses)));
        lines.push(auditLine('Row/count disagreements', r.rowCountDisagreements));
        if (r.rowCountValues) lines.push(auditLine('Row/count values', r.rowCountValues));
        lines.push(auditLine('Absent reasons', r.absentReasons));
        lines.push(auditLine('Conflict reasons', r.conflictReasons));
        lines.push(auditLine('Evidence reasons', r.evidenceReasons));
        lines.push(auditLine('Overlaps', r.overlaps));
        lines.push(auditLine('Stale', r.stale));
        lines.push(`Badge: renderer=${r.badge.renderer} checked=${r.badge.checked} mismatches=${r.badge.mismatches} errors=${r.badge.errors}`);
        AUDIT_FAILING.forEach(state => lines.push(auditLine(`Keywords in ${state}`, r.keywordHits[state])));
        if (r.patterns) {
            lines.push('Top patterns (state | records | pattern | sample ids):');
            r.patterns.forEach(p => lines.push(`${p.state} | ${p.records} | ${p.pattern} | ${p.sampleIds.join(' ')}`));
        } else {
            lines.push('Top patterns: hidden (run SystemTypeAudit.text({ snippets: true }) to include short sanitized snippets)');
        }
        Object.entries(r.sampleIds).forEach(([key, ids]) => lines.push(`Sample ${key}: ${ids.join(' ')}`));
        return lines.join('\n');
    }

    const SystemTypeAudit = Object.freeze({
        report: auditReport,
        inspect: auditInspect,
        format: auditFormat,
        text: options => auditFormat(auditReport(options || {}))
    });

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
        rankManufacturers,
        SystemTypeAudit
    });

    if (globalScope) {
        globalScope.InfoTableParser = InfoTableParser;
        globalScope.SystemTypeAudit = SystemTypeAudit;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = InfoTableParser;
    }
})(typeof window !== 'undefined' ? window : globalThis);
