(function (root, factory) {
    const helper = factory();
    if (typeof module === 'object' && module.exports) module.exports = helper;
    else root.InfoTableHelper = helper;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SYSTEM_TYPES = Object.freeze(['Simplex', 'Duplex', 'Triplex', 'Quadraplex']);
    const EXACT_MFGS = {
        'GORMAN RUPP': ['GORMAN RUPP', 'GORMAN', 'GR', 'GRSP'],
        BARNES: ['BARNES', 'SITHE', 'CRANE'],
        HYDROMATIC: ['HYDROMATIC'], FLYGT: ['FLYGT'], MYERS: ['MYERS'],
        GOULDS: ['GOULDS'], ZOELLER: ['ZOELLER'], LIBERTY: ['LIBERTY'],
        WILO: ['WILO'], PENTAIR: ['PENTAIR'], ABS: ['ABS'],
        GODWIN: ['GODWIN', 'GODWIN SP'], FRANKLIN: ['FRANKLIN'],
        EBARA: ['EBARA'], HIDROSTAL: ['HIDROSTAL']
    };
    const SYSTEM_ALIASES = {
        simplex: 'Simplex', duplex: 'Duplex', triplex: 'Triplex',
        quadraplex: 'Quadraplex', quadruplex: 'Quadraplex', quadplex: 'Quadraplex'
    };
    const LABEL_SOURCE = '\\b(?:SYSTEM\\s+TYPE|NUMBER\\s+OF\\s+MOTORS|NO\\.?\\s+(?:OF\\s+)?MOTORS|PUMP\\s+MANUFACTURER|' +
        'TYPE\\s+OF\\s+PUMP|PUMP\\s+MODEL(?:\\s+NUMBER)?|MOTOR\\s+(?:MANUFACTURER|HP|HORSEPOWER|VOLTAGE|PHASE)|' +
        'ENCLOSURE(?:\\s+(?:MATERIAL|TYPE|NEMA\\s+RATING))?|VOLTAGE|PHASE(?:/HZ)?|' +
        'HORSEPOWER|HP|PANEL\\s+(?:TYPE|NAME)|CONTROL\\s+PANEL\\s+NAME|' +
        'SERVICE\\s+VOLTAGE|FULL\\s+LOAD\\s+AMPS|FLA|RPM|FREQUENCY|MODEL\\s+NUMBER|TAGS?)\\b';
    const SECTION_SOURCE = '(?:NOTES?|BOM|BILL\\s+OF\\s+MATERIALS|TAGS?|WIRING(?:\\s+DIAGRAM)?|SCHEMATIC(?:\\s+DIAGRAM)?)';
    const INFO_HEADER_SOURCE = '(?:(?:CONTROL\\s+)?PANEL\\s+)?(?:INFORMATION(?:\\s+TABLE)?|INFO(?:\\s+TABLE)?)';

    function isSystemLabel(label) {
        return label === 'SYSTEM TYPE' || label === 'PANEL TYPE';
    }

    function isCountLabel(label) {
        return /^(?:NUMBER OF MOTORS|NO\.? (?:OF )?MOTORS)$/.test(label);
    }

    function normalizeSystemType(value) {
        if (typeof value !== 'string') return null;
        const key = value.trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(SYSTEM_ALIASES, key) ? SYSTEM_ALIASES[key] : null;
    }

    function cleanText(value) {
        return typeof value === 'string'
            ? value.replace(/%%(?:[A-Za-z]|\d{3})/g, '').replace(/\r\n?/g, '\n')
            : '';
    }

    function hasTableStartEvidence(text, start, end, label) {
        if (!isSystemLabel(label) && label !== 'PUMP MANUFACTURER' && label !== 'FLA') return false;
        const regex = new RegExp(LABEL_SOURCE, 'gi');
        regex.lastIndex = end;
        const candidates = [{ label, end }];
        let match;
        while (candidates.length < 4 && (match = regex.exec(text)) && match.index - start <= 400) {
            candidates[candidates.length - 1].value = text.slice(candidates[candidates.length - 1].end, match.index).replace(/^[\s:|]+/, '').trim();
            candidates.push({ label: match[0].replace(/\s+/g, ' ').toUpperCase(), end: regex.lastIndex });
        }
        if (candidates.length < 3) return false;
        if (candidates.length === 3) {
            candidates[2].value = text.slice(candidates[2].end).replace(/^[\s:|]+/, '').trim();
        }
        const rows = candidates.slice(0, 3);
        const valid = row => {
            const value = row.value || '';
            if (value.length > 120) return false;
            if (isSystemLabel(row.label)) return !!normalizeSystemType(value);
            if (row.label === 'PUMP MANUFACTURER') return !!normalizeManufacturer(value);
            if (row.label === 'TYPE OF PUMP') return /^(?:SUBMERSIBLE|SELF[- ]PRIMING|SEWAGE|WASTEWATER|END[- ]SUCTION|CENTRIFUGAL)$/i.test(value);
            if (row.label === 'PHASE/HZ' || row.label === 'PHASE') return /^[13](?:\/\d{2})?$/.test(value);
            if (isCountLabel(row.label)) return /^[+\-]?\d[\d\s+\-/.]*$/.test(value);
            if (['VOLTAGE', 'SERVICE VOLTAGE', 'HP', 'MOTOR HP', 'FLA', 'FULL LOAD AMPS'].includes(row.label)) return /^\d+(?:\.\d+)?$/.test(value);
            return false;
        };
        return rows.every(valid) && (isSystemLabel(label) || rows.some(row => row.label === 'PUMP MANUFACTURER'));
    }

    function boundedSections(section) {
        const boundaryRegex = new RegExp(`(?:^|[\\n|])\\s*${SECTION_SOURCE}(?:\\s*:|\\s*(?=[\\n|]|$))|\\b${SECTION_SOURCE}\\s*:`, 'i');
        let remaining = section;
        let result = '';
        let boundary;
        while ((boundary = boundaryRegex.exec(remaining))) {
            result += remaining.slice(0, boundary.index) + '\n\n';
            const regex = new RegExp(LABEL_SOURCE, 'gi');
            regex.lastIndex = boundary.index + boundary[0].length;
            let start = null;
            let match;
            while ((match = regex.exec(remaining))) {
                const label = match[0].replace(/\s+/g, ' ').toUpperCase();
                if (hasTableStartEvidence(remaining, match.index, regex.lastIndex, label)) {
                    start = match.index;
                    break;
                }
            }
            if (start === null) return result;
            remaining = remaining.slice(start);
        }
        return result + remaining;
    }

    function guardCountContinuations(text) {
        const labels = [];
        const regex = new RegExp(LABEL_SOURCE, 'gi');
        let match;
        while ((match = regex.exec(text))) {
            labels.push({ label: match[0].replace(/\s+/g, ' ').toUpperCase(), end: regex.lastIndex });
        }
        let labelIndex = -1;
        return text.replace(/\n(?:[ \t]*\n)+(?=[ \t]*[+\-/.±×÷\d])/g, (gap, offset) => {
            while (labelIndex + 1 < labels.length && labels[labelIndex + 1].end <= offset) labelIndex++;
            return labelIndex >= 0 && isCountLabel(labels[labelIndex].label) ? '\n' : gap;
        });
    }

    // Bounds are text/table heuristics, not PDF page or spatial isolation.
    function infoBlocks(desc) {
        const sections = guardCountContinuations(cleanText(desc)).split(new RegExp(`(?=(?:^|[\\n|])\\s*${INFO_HEADER_SOURCE}\\s*[:|\\n])`, 'i'));
        const tableText = sections.map(boundedSections).join('\n\n');
        return tableText.split(/\n[ \t]*\n|\f/).flatMap(text => {
            const labels = [];
            const regex = new RegExp(LABEL_SOURCE, 'gi');
            let match;
            while ((match = regex.exec(text))) {
                const prefix = text.slice(0, match.index);
                const linePrefix = prefix.slice(Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf('|')) + 1);
                const previous = labels[labels.length - 1];
                const isHeader = new RegExp(`^${INFO_HEADER_SOURCE}\\s*[:\\-]?\\s*$`, 'i').test(linePrefix.trim());
                const isRow = !linePrefix.trim() || isHeader ||
                    hasTableStartEvidence(text, match.index, regex.lastIndex, match[0].replace(/\s+/g, ' ').toUpperCase()) ||
                    (previous && match.index - previous.end <= 240 && !/[\n|]/.test(linePrefix));
                const isProse = /^[ \t]+(?:is|are|was|were|should|must|may|can|will|shall)\b/i.test(text.slice(regex.lastIndex));
                if (isRow && !isProse) labels.push({ label: match[0].replace(/\s+/g, ' ').toUpperCase(), start: match.index, end: regex.lastIndex });
            }
            const groups = [[]];
            labels.forEach((row, index) => {
                if (/^TAGS?$/.test(row.label)) groups.push([]);
                const end = index + 1 < labels.length ? labels[index + 1].start : text.length;
                const raw = text.slice(row.end, end);
                const stripped = raw.replace(/^[\s:|]+/, '').trim();
                const parts = stripped.split(/[|\n]/);
                let value = (parts.shift() || '').trim();
                const tail = parts.join(' ').trim();
                const hasWrappedAlternative = parts.some(part =>
                    normalizeSystemType(part.trim()) || normalizeManufacturer(part.trim()));
                // Pipe columns and numeric/operator continuations cannot hide conflicting values.
                const continuation = tail && (isCountLabel(row.label) || stripped.includes('|') || /^[+\-/.±×÷\d]/.test(tail) ||
                    hasWrappedAlternative || normalizeSystemType(tail) || normalizeManufacturer(tail));
                if (continuation) value += ' ' + tail;
                groups[groups.length - 1].push({ ...row, value, bounded: value.length <= 240 });
                // Unlabelled intervening text ends the contiguous information block.
                if ((tail && !continuation) || raw.length > 1200 || /^TAGS?$/.test(row.label)) groups.push([]);
            });
            return groups.filter(group => group.length);
        });
    }

    function extractSystemType(desc) {
        const explicit = [];
        const fallback = [];
        let uncertain = false;
        let fallbackUncertain = false;
        for (const rows of infoBlocks(desc)) {
            const systems = rows.filter(row => isSystemLabel(row.label));
            const counts = rows.filter(row => isCountLabel(row.label));
            const countValues = counts.map(row => row.bounded && /^[1-4]$/.test(row.value) ? Number(row.value) : null);
            const validCounts = new Set(countValues.filter(value => value !== null));
            const badCount = countValues.includes(null) || validCounts.size > 1;
            for (const row of systems) {
                const sys = row.bounded ? normalizeSystemType(row.value) : null;
                if (sys) {
                    explicit.push(sys);
                    const nearbyCounts = counts.filter(count => Math.abs(count.start - row.start) <= 1200);
                    if (nearbyCounts.some(count => !count.bounded || !/^[1-4]$/.test(count.value) || SYSTEM_TYPES[Number(count.value) - 1] !== sys)) uncertain = true;
                } else uncertain = true;
            }
            if (!systems.length && counts.length) {
                if (badCount) fallbackUncertain = true;
                else if (validCounts.size === 1) fallback.push(SYSTEM_TYPES[[...validCounts][0] - 1]);
            }
        }
        const distinct = new Set(explicit);
        // Conflicting explicit rows have no single winner, even when one repeats.
        if (distinct.size > 1) return { sys: null, sysV: true };
        if (distinct.size === 1) return { sys: [...distinct][0], sysV: uncertain };
        if (uncertain || fallbackUncertain) return { sys: null, sysV: true };
        const inferred = new Set(fallback);
        return { sys: inferred.size === 1 ? [...inferred][0] : null, sysV: inferred.size > 0 };
    }

    function resolveSystemType(record) {
        if (!record || typeof record !== 'object') return { sys: null, sysV: false };
        if (!Object.prototype.hasOwnProperty.call(record, 'sys')) return extractSystemType(record.desc);
        if (record.sys === null) return { sys: null, sysV: record.sysV !== false };
        const sys = normalizeSystemType(record.sys);
        return { sys, sysV: !sys || record.sysV !== false };
    }

    function normalizeManufacturer(value) {
        const normalized = value.trim().toUpperCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ');
        return Object.keys(EXACT_MFGS).find(key => EXACT_MFGS[key].includes(normalized)) || null;
    }

    function rankManufacturers(records, supported = Object.keys(EXACT_MFGS)) {
        const allowed = new Set(Array.isArray(supported) ? supported : []);
        const perId = new Map();
        for (const record of Array.isArray(records) ? records : []) {
            if (!record || record.id === undefined || record.id === null || String(record.id).trim() === '') continue;
            const rows = infoBlocks(record.desc).flat().filter(row => row.label === 'PUMP MANUFACTURER');
            if (!rows.length) continue;
            const values = rows.map(row => row.bounded ? normalizeManufacturer(row.value) : null);
            const entry = perId.get(String(record.id)) || { values: new Set(), invalid: false };
            values.forEach(value => value ? entry.values.add(value) : entry.invalid = true);
            perId.set(String(record.id), entry);
        }
        const counts = {};
        let eligibleRecords = 0;
        for (const entry of perId.values()) {
            if (entry.invalid || entry.values.size !== 1) continue;
            const manufacturer = [...entry.values][0];
            if (!allowed.has(manufacturer)) continue;
            counts[manufacturer] = (counts[manufacturer] || 0) + 1;
            eligibleRecords++;
        }
        const options = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)).slice(0, 8);
        return { options, counts, eligibleRecords };
    }

    return { SYSTEM_TYPES, normalizeSystemType, extractSystemType, resolveSystemType, rankManufacturers };
});
