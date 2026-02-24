// worker/lib/extract.js
// Pure helper functions for SCHEMATICA ai spec extraction
// Importable for testing without the full Worker environment

// --- CONSTANTS ---

const EXACT_MFGS = {
    'GORMAN RUPP': ['GORMAN', 'GR', 'GRSP'],
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
};

const VOLT_PRIORITY = [
    { id: '575', match: /\b(?:575|600)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:575|600)\b/i },
    { id: '480', match: /\b(?:480|460|440)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:480|460|440)\b/i },
    { id: '415', match: /\b(?:415|380)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:415|380)\b/i },
    { id: '277', match: /\b(?:277)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:277)\b/i },
    { id: '240', match: /\b(?:240|(?<!208\/)230|(?<!208\/)220)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*(?!208\b)[\d\.\/]*\b(?:240|230|220)\b/i },
    { id: '208', match: /\b(?:208)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:208)\b/i },
    { id: '120', match: /\b(?:120|115|110)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:120|115|110)\b/i }
];

// Canonical dual-voltage pairs (split-phase configurations)
// These should NOT be marked as varied - use the higher voltage as the primary value
const CANONICAL_DUAL_VOLTAGE_PAIRS = [
    { low: '120', high: '240' },   // Common residential/light commercial split-phase
    { low: '277', high: '480' }    // Common commercial/industrial split-phase
];

// --- PURE HELPERS ---

/**
 * Normalize CAD-style control codes from Airtable Items text.
 * CAD software (AutoCAD, etc.) uses control codes like %%U (underline), %%O (overline), etc.
 * These codes prevent regex parsing (e.g., "%%U7.5HP" won't match HP patterns).
 */
function normalizeCADText(text) {
    if (!text || typeof text !== 'string') return '';
    // Strip common CAD control codes:
    // - %%X (single letter): %%U, %%O, %%D (degree), %%P (plus/minus), %%C (diameter), etc.
    // - %%nnn (exactly 3 digits): ASCII character codes like %%175
    return text.replace(/%%(?:[A-Za-z]|\d{3})/g, '');
}

/**
 * Parse HP values from text, returning a Set of canonical HP strings.
 * Handles: decimal (7.5HP), no-space (7.5HP), mixed fractions (7-1/2 HP),
 * Unicode fractions (7½ HP), table format (HP: 7.5, MOTOR HP: 7.5).
 */
function parseHP(t) {
    const foundHPs = new Set();

    // Primary pattern: number before HP unit (with optional space)
    const hpRegex = /\b(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])\s*(HP|H\.P\.|H\.P|KW|kW|HORSEPOWER)\b/gi;
    let match;
    while ((match = hpRegex.exec(t)) !== null) {
        const val = _resolveHPValue(match[1], match[2]);
        if (val !== null) foundHPs.add((Math.round(val * 10) / 10).toString());
    }

    // Secondary pattern: HP unit before number (table/header format: "HP: 7.5", "MOTOR HP: 7.5")
    const tableHpRegex = /\b(?:MOTOR\s+)?(?:HP|HORSEPOWER)\s*[:\s|]+\s*(\d+(?:\.\d+)?)\b/gi;
    while ((match = tableHpRegex.exec(t)) !== null) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 0.1 && val <= 500) {
            foundHPs.add((Math.round(val * 10) / 10).toString());
        }
    }

    return foundHPs;
}

function _resolveHPValue(raw, unit) {
    let val = 0;
    if (unit && unit.toUpperCase().includes('KW')) {
        val = parseFloat(raw) * 1.341;
    } else if (/(\d+)[-\s](\d+)\/(\d+)/.test(raw)) {
        const m = raw.match(/(\d+)[-\s](\d+)\/(\d+)/);
        val = parseFloat(m[1]) + parseFloat(m[2]) / parseFloat(m[3]);
    } else if (/(\d+)([¼½¾])/.test(raw)) {
        const m = raw.match(/(\d+)([¼½¾])/);
        const fractionMap = { '¼': 0.25, '½': 0.5, '¾': 0.75 };
        val = parseFloat(m[1]) + fractionMap[m[2]];
    } else if (raw.includes('-')) {
        const parts = raw.split('-').filter(Boolean);
        const nums = parts.map(p => parseFloat(p)).filter(x => !isNaN(x));
        if (nums.length) val = Math.max(...nums);
    } else if (raw.includes('/')) {
        const [num, den] = raw.split('/');
        val = parseFloat(num) / parseFloat(den);
    } else {
        val = parseFloat(raw);
    }
    return (!isNaN(val) && val >= 0.1 && val <= 500) ? val : null;
}

/**
 * Context-aware voltage extraction (service-first).
 *
 * Identifies inline transformer notation (e.g. "480V-120VAC") as control-only
 * and excludes those voltages from the service candidate set.
 * Also checks for TRANSFORMER/CPT/XFORMER keyword proximity.
 *
 * Returns { serviceVolts: Set, controlVolts: Set } of canonical voltage IDs.
 */
function parseVoltageContextAware(t) {
    // 1. Find inline transformer notation ranges: "480V-120VAC", "240V-120VAC"
    //    Format: <volt>V - <volt>VAC  (primary-secondary transformer spec)
    const controlRanges = [];
    const xfmrInlineRegex = /\b\d{2,4}(?:VAC|V)\s*[-]\s*\d{2,4}VAC\b/gi;
    let m;
    while ((m = xfmrInlineRegex.exec(t)) !== null) {
        controlRanges.push([m.index, m.index + m[0].length]);
    }

    // 2. Keywords that strongly indicate transformer/control context (not service)
    //    Excludes "CONTROL" and "PUMP CONTROLLER" - too common in panel descriptions
    const XFMR_KEYWORDS = /\b(?:TRANSFORMER|XFORMER|XFMR|CPT|SECONDARY|PRIMARY)\b/i;

    const serviceVolts = new Set();
    const controlVolts = new Set();

    for (const v of VOLT_PRIORITY) {
        const r = new RegExp(v.match.source, 'gi');
        while ((m = r.exec(t)) !== null) {
            const pos = m.index;
            const end = pos + m[0].length;

            // Check if within inline transformer notation
            const inControlRange = controlRanges.some(([s, e]) => pos >= s && pos < e);
            if (inControlRange) {
                controlVolts.add(v.id);
                continue;
            }

            // Check tight context window (±40 chars) for transformer keywords only
            const ctxStart = Math.max(0, pos - 40);
            const ctxEnd = Math.min(t.length, end + 40);
            const ctx = t.slice(ctxStart, ctxEnd);

            if (XFMR_KEYWORDS.test(ctx)) {
                controlVolts.add(v.id);
            } else {
                serviceVolts.add(v.id);
            }
        }
    }

    return { serviceVolts, controlVolts };
}

/**
 * Parse enclosure type from text.
 * Detects: NEMA 4X, NEMA4X, TYPE 4X, 4X, 4 X, 4XSS, 4XFG and material hints.
 * When both fiberglass and stainless are present, spec-table context wins:
 *   Keywords like ENCLOSURE MATERIAL, NAMEPLATE, PANEL TYPE near a material
 *   keyword are treated as high-confidence spec-table evidence.
 * Returns a Set of enclosure type strings.
 */
function parseEnclosure(t) {
    const foundEnclosures = new Set();

    // Explicit compound codes take priority; track presence for tie-breaking
    const hasExplicit4XFG = /\b4XFG\b/i.test(t);
    const hasExplicit4XSS = /\b4XSS\b/i.test(t);
    if (hasExplicit4XFG) foundEnclosures.add("4XFG");
    if (hasExplicit4XSS) foundEnclosures.add("4XSS");

    // Detect generic 4X rating (covers NEMA 4X, NEMA4X, TYPE 4X, 4 X, plain 4X)
    // Does NOT match 4XSS/4XFG (they contain more chars after X, already handled above)
    const has4X = /\b(?:NEMA\s*|TYPE\s*)?4\s*X(?!FG|SS)\b/i.test(t);

    // Material keywords (used when bare 4X is present); FRP is a strong FG signal
    const hasFG = /\b(?:FIBERGLASS|FIBER\s*GLASS|FRP)\b/i.test(t);
    const hasSS = /\bSTAINLESS\b/i.test(t);

    if (has4X) {
        if (hasFG) foundEnclosures.add("4XFG");
        if (hasSS) foundEnclosures.add("4XSS");
        // Bare 4X without material defaults to 4XSS
        if (!hasFG && !hasSS && !foundEnclosures.has("4XFG") && !foundEnclosures.has("4XSS")) {
            foundEnclosures.add("4XSS");
        }
    }

    // Polycarbonate (can appear without 4X rating)
    if (/\bPOLY(?:CARBONATE)?\b/i.test(t)) foundEnclosures.add("POLY");

    // Spec-table precedence: when both SS and FG are detected, check which
    // material appears near high-confidence spec-table context keywords.
    // The spec-table context wins over general-text material mentions.
    if (foundEnclosures.has("4XFG") && foundEnclosures.has("4XSS")) {
        const SPEC_TABLE_KW = /\b(?:ENCLOSURE\s+MATERIAL|ENCLOSURE\s+NEMA\s+RATING|NAMEPLATE(?:\s+SCHEDULE)?|PANEL\s+TYPE)\b/i;
        const SPEC_TABLE_WINDOW = 150;
        let ssInSpecTable = false;
        let fgInSpecTable = false;
        const skRegex = new RegExp(SPEC_TABLE_KW, 'gi');
        let m;
        while ((m = skRegex.exec(t)) !== null) {
            // Look FORWARD only from the spec-table keyword: the value follows the label
            const start = m.index + m[0].length;
            const end = Math.min(t.length, start + SPEC_TABLE_WINDOW);
            const ctx = t.slice(start, end);
            if (/\bSTAINLESS\b/i.test(ctx)) ssInSpecTable = true;
            if (/\b(?:FIBERGLASS|FIBER\s*GLASS|FRP)\b/i.test(ctx)) fgInSpecTable = true;
        }
        // Spec-table context wins: remove the material NOT supported by spec table
        if (ssInSpecTable && !fgInSpecTable) {
            foundEnclosures.delete("4XFG");
        } else if (fgInSpecTable && !ssInSpecTable) {
            foundEnclosures.delete("4XSS");
        } else {
            // Spec-table did not resolve: prefer explicit compound token when unambiguous
            if (hasExplicit4XSS && !hasExplicit4XFG) {
                foundEnclosures.delete("4XFG");
            } else if (hasExplicit4XFG && !hasExplicit4XSS) {
                foundEnclosures.delete("4XSS");
            }
            // Both explicit tokens or neither → leave both (encV = true)
        }
    }

    return foundEnclosures;
}

/**
 * Extract specs from a panel description string.
 * Returns canonical { mfg, hp, volt, phase, enc, mfgV, hpV, voltV, phaseV, encV }.
 */
function extractSpecsStrict(t) {
    const s = {
        mfg: null, hp: null, volt: null, phase: null, enc: null,
        mfgV: false, hpV: false, voltV: false, phaseV: false, encV: false
    };
    if (!t || typeof t !== 'string') return s;

    t = normalizeCADText(t);

    // --- Manufacturer ---
    const foundMfgs = new Set();
    for (const [mfgKey, aliases] of Object.entries(EXACT_MFGS)) {
        for (const alias of aliases) {
            const r = new RegExp(`(?<=[^A-Z0-9]|^)${alias}(?=[^A-Z0-9]|$)`, 'i');
            if (r.test(t)) {
                foundMfgs.add(mfgKey);
                break;
            }
        }
    }
    if (foundMfgs.size === 1) {
        s.mfg = [...foundMfgs][0];
    } else if (foundMfgs.size > 1) {
        s.mfg = [...foundMfgs][0];
        s.mfgV = true;
    }

    // --- HP ---
    const foundHPs = parseHP(t);
    if (foundHPs.size === 1) {
        s.hp = [...foundHPs][0];
    } else if (foundHPs.size > 1) {
        s.hp = [...foundHPs].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
        s.hpV = true;
    }

    // --- Voltage (service-first, context-aware) ---
    const { serviceVolts, controlVolts } = parseVoltageContextAware(t);
    // Use service voltages; fall back to control-only if no service found
    const targetVolts = serviceVolts.size > 0 ? serviceVolts : controlVolts;

    if (targetVolts.size > 0) {
        // Apply canonical dual-voltage pair handling (e.g., 120+240 → keep 240 only)
        if (targetVolts.size === 2) {
            const voltArray = [...targetVolts];
            const canonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(pair =>
                voltArray.includes(pair.low) && voltArray.includes(pair.high)
            );
            if (canonicalPair) {
                targetVolts.delete(canonicalPair.low);
            }
        }

        if (targetVolts.size === 1) {
            s.volt = [...targetVolts][0];
        } else {
            const voltArray = [...targetVolts];
            const isCanonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.some(pair =>
                voltArray.includes(pair.low) && voltArray.includes(pair.high) && voltArray.length === 2
            );
            if (isCanonicalPair) {
                const pair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(p =>
                    voltArray.includes(p.low) && voltArray.includes(p.high)
                );
                s.volt = pair.high;
                s.voltV = false;
            } else {
                // Multiple distinct service voltages → varied
                // Pick by VOLT_PRIORITY order (highest priority first)
                s.volt = VOLT_PRIORITY.find(v => voltArray.includes(v.id))?.id || voltArray[0];
                s.voltV = true;
            }
        }
    }

    // --- Phase ---
    const foundPhases = new Set();
    if (/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*3)\b/i.test(t)) foundPhases.add("3");
    if (/\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*1)\b/i.test(t)) foundPhases.add("1");
    if (foundPhases.size === 1) {
        s.phase = [...foundPhases][0];
    } else if (foundPhases.size > 1) {
        s.phase = "3";
        s.phaseV = true;
    }

    // --- Enclosure ---
    const foundEnclosures = parseEnclosure(t);
    if (foundEnclosures.size === 1) {
        s.enc = [...foundEnclosures][0];
    } else if (foundEnclosures.size > 1) {
        // Spec-table precedence already applied in parseEnclosure.
        // If multiple enclosures still remain, output "Varied / Multiple" (no SS canonical tie-break).
        s.enc = "Varied / Multiple";
        s.encV = true;
    }

    return s;
}

// --- EXPORTS (CommonJS for Node test runner; also works as ES module export alias) ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeCADText, parseHP, parseVoltageContextAware, parseEnclosure, extractSpecsStrict, VOLT_PRIORITY, CANONICAL_DUAL_VOLTAGE_PAIRS, EXACT_MFGS };
}
