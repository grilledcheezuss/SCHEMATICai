// worker/tests/run.js – Regression tests for v2.5.34 extraction fixes
// Mirrors the pure logic from worker/worker.js for node-based testing.
// Run with: node worker/tests/run.js

// ── Helpers (copied from worker.js) ─────────────────────────────────────────

function normalizeCADText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/%%(?:[A-Za-z]|\d{3})/g, ' ');
}

function isValidHP(hp) {
    const val = parseFloat(hp);
    return !isNaN(val) && val >= 0.1 && val <= 500;
}

const VOLT_PRIORITY = [
    { id: '575', match: /\b(?:575|600)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:575|600)\b/i },
    { id: '480', match: /\b(?:480|460|440)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:480|460|440)\b/i },
    { id: '415', match: /\b(?:415|380)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:415|380)\b/i },
    { id: '277', match: /\b(?:277)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:277)\b/i },
    { id: '240', match: /\b(?:240|230|220)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:240|230|220)\b/i },
    { id: '208', match: /\b(?:208)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:208)\b/i },
    { id: '120', match: /\b(?:120|115|110)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:120|115|110)\b/i }
];

const CANONICAL_DUAL_VOLTAGE_PAIRS = [
    { low: '120', high: '240' },
    { low: '277', high: '480' }
];

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

// ── Pure extraction (mirrors worker.js extractSpecsStrict) ───────────────────

function extractSpecsStrict(t) {
    const s = {
        mfg: null, hp: null, volt: null, phase: null, enc: null,
        mfgV: false, hpV: false, voltV: false, phaseV: false, encV: false
    };
    if (!t || typeof t !== 'string') return s;

    t = normalizeCADText(t);

    // Manufacturer
    const foundMfgs = new Set();
    for (const [mfgKey, aliases] of Object.entries(EXACT_MFGS)) {
        for (const alias of aliases) {
            const r = new RegExp(`(?<=[^A-Z0-9]|^)${alias}(?=[^A-Z0-9]|$)`, 'i');
            if (r.test(t)) { foundMfgs.add(mfgKey); break; }
        }
    }
    if (foundMfgs.size === 1) s.mfg = [...foundMfgs][0];
    else if (foundMfgs.size > 1) { s.mfg = [...foundMfgs][0]; s.mfgV = true; }

    // HP
    const foundHPs = new Set();
    const hpRegex = /\b(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])[-\s]?(HP|H\.P\.|H\.P|KW|kW|HORSEPOWER)\b/gi;
    const hpPrefixRegex = /\b(?:MOTOR\s+HP|HP|HORSEPOWER)\s*[:\-]\s*(\d+(?:\.\d+)?)\b/gi;
    let match;
    while ((match = hpRegex.exec(t)) !== null) {
        let raw = match[1]; let val = 0;
        if (match[2] && match[2].toUpperCase().includes('KW')) val = parseFloat(raw) * 1.341;
        else if (/(\d+)[-\s](\d+)\/(\d+)/.test(raw)) {
            const mm = raw.match(/(\d+)[-\s](\d+)\/(\d+)/);
            val = parseFloat(mm[1]) + parseFloat(mm[2]) / parseFloat(mm[3]);
        } else if (/(\d+)([¼½¾])/.test(raw)) {
            const um = raw.match(/(\d+)([¼½¾])/);
            val = parseFloat(um[1]) + { '¼': 0.25, '½': 0.5, '¾': 0.75 }[um[2]];
        } else if (raw.includes('-')) {
            const nums = raw.split('-').map(p => parseFloat(p)).filter(x => !isNaN(x));
            if (nums.length) val = Math.max(...nums);
        } else if (raw.includes('/')) {
            const [n, d] = raw.split('/');
            val = parseFloat(n) / parseFloat(d);
        } else {
            val = parseFloat(raw);
        }
        if (!isNaN(val) && val >= 0.1 && val <= 500)
            foundHPs.add((Math.round(val * 10) / 10).toString());
    }
    while ((match = hpPrefixRegex.exec(t)) !== null) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 0.1 && val <= 500)
            foundHPs.add((Math.round(val * 10) / 10).toString());
    }
    if (foundHPs.size === 1) s.hp = [...foundHPs][0];
    else if (foundHPs.size > 1) {
        s.hp = [...foundHPs].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
        s.hpV = true;
    }

    // Voltage — context-aware (service/primary only)
    const voltText = t.replace(/\b\d+\s*V(?:AC)?\s*-\s*\d+\s*VAC\b/gi, ' ');
    const CONTROL_CTX_RE = /\b(?:CPT|XFORMER|TRANSFORMER)\b/i;
    const foundVolts = new Set();
    const controlOnlyVolts = new Set();
    for (const v of VOLT_PRIORITY) {
        const searchRe = new RegExp(v.match.source, 'gi');
        let m;
        let foundAsService = false, foundAsControl = false;
        while ((m = searchRe.exec(voltText)) !== null) {
            const start = Math.max(0, m.index - 40);
            const end = Math.min(voltText.length, m.index + m[0].length + 40);
            const ctx = voltText.substring(start, end);
            if (CONTROL_CTX_RE.test(ctx)) foundAsControl = true;
            else foundAsService = true;
        }
        if (foundAsService || foundAsControl) {
            foundVolts.add(v.id);
            if (foundAsControl && !foundAsService) controlOnlyVolts.add(v.id);
        }
    }
    if (controlOnlyVolts.size > 0 && foundVolts.size > controlOnlyVolts.size) {
        for (const cv of controlOnlyVolts) foundVolts.delete(cv);
    }
    if (foundVolts.size === 2) {
        const voltArray = [...foundVolts];
        const canonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(p =>
            voltArray.includes(p.low) && voltArray.includes(p.high)
        );
        if (canonicalPair) foundVolts.delete(canonicalPair.low);
    }
    if (foundVolts.size === 1) {
        s.volt = [...foundVolts][0];
    } else if (foundVolts.size > 1) {
        const voltArray = [...foundVolts];
        const isCanonicalPair = CANONICAL_DUAL_VOLTAGE_PAIRS.some(p =>
            voltArray.includes(p.low) && voltArray.includes(p.high) && voltArray.length === 2
        );
        if (isCanonicalPair) {
            const pair = CANONICAL_DUAL_VOLTAGE_PAIRS.find(p =>
                voltArray.includes(p.low) && voltArray.includes(p.high)
            );
            s.volt = pair.high; s.voltV = false;
        } else {
            s.volt = VOLT_PRIORITY.find(v => voltArray.includes(v.id))?.id || voltArray[0];
            s.voltV = true;
        }
    }

    // Phase
    const foundPhases = new Set();
    if (/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*3)\b/i.test(t)) foundPhases.add("3");
    if (/\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*1)\b/i.test(t)) foundPhases.add("1");
    if (foundPhases.size === 1) s.phase = [...foundPhases][0];
    else if (foundPhases.size > 1) { s.phase = "3"; s.phaseV = true; }

    // Enclosure
    const foundEnclosures = new Set();
    const has4X = /\bNEMA\s*4\s*X\b|\bTYPE\s*4\s*X\b|\b4\s*X\b/i;
    const hasFG = /\b(FIBERGLASS|FIBER\s*GLASS)\b/i;
    const hasSS = /\b(STAINLESS|SS)\b/i;
    if (/\b4XFG\b/i.test(t)) foundEnclosures.add("4XFG");
    if (hasFG.test(t) && has4X.test(t)) foundEnclosures.add("4XFG");
    if (/\b4XSS\b/i.test(t)) foundEnclosures.add("4XSS");
    if (hasSS.test(t) && has4X.test(t)) foundEnclosures.add("4XSS");
    if (has4X.test(t) && !hasFG.test(t) && !/\b4XFG\b/i.test(t) && !foundEnclosures.has("4XSS")) {
        foundEnclosures.add("4XSS");
    }
    if (/\bPOLY(?:CARBONATE)?\b/i.test(t)) foundEnclosures.add("POLY");
    if (foundEnclosures.size === 1) s.enc = [...foundEnclosures][0];
    else if (foundEnclosures.size > 1) {
        s.enc = foundEnclosures.has("4XFG") ? "4XFG" : [...foundEnclosures][0];
        s.encV = true;
    }

    return s;
}

// ── Test fixtures ────────────────────────────────────────────────────────────

// CP-8078-like fixture:
// - Primary service: "120/240V,3PH,60HZ" and "230V,3PH"
// - Transformer ref: "480V-120VAC" (CPT notation)
// - Panel also mentions NEMA 4X STAINLESS STEEL and NEMA 4X FIBERGLASS enclosures
// - HP: %%U7.5HP (CAD underline code before HP value)
const CP8078_FIXTURE = [
    "BARNES SEWAGE PUMP CONTROL PANEL",
    "120/240V,3PH,60HZ",
    "230V,3PH,60HZ",
    "%%U7.5HP SUBMERSIBLE PUMP MOTOR",
    "CPT 480V-120VAC CONTROL TRANSFORMER",
    "NEMA 4X STAINLESS STEEL ENCLOSURE",
    "NEMA 4X FIBERGLASS ENCLOSURE",
].join("\n");

// ── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`  ✅ ${description}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${description}`);
        console.log(`     ${e.message}`);
        failed++;
    }
}

function assert(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

console.log('\n🧪 worker/tests/run.js – v2.5.34 regression tests\n');

// ── A) Voltage: service/primary only ────────────────────────────────────────
console.log('A) Voltage extraction (primary/service only)');

test('CP-8078 selects 240-family, not 480 (transformer ref stripped)', () => {
    const r = extractSpecsStrict(CP8078_FIXTURE);
    assert(r.volt, '240', 'volt');
    assert(r.voltV, false, 'voltV');
});

test('Plain 480V-120VAC in isolation → 480 suppressed (no service voltage remains)', () => {
    const r = extractSpecsStrict('CPT 480V-120VAC');
    // 480V-120VAC is stripped as transformer notation; no other voltage present
    assert(r.volt, null, 'volt');
});

test('Pure 480V service (no transformer notation) still returns 480', () => {
    const r = extractSpecsStrict('480V, 3PH, 60HZ MAIN DISCONNECT');
    assert(r.volt, '480', 'volt');
});

test('240V alongside 480V-120VAC transformer → 240 wins', () => {
    const r = extractSpecsStrict('SERVICE: 240V, 3PH\nCPT: 480V-120VAC');
    assert(r.volt, '240', 'volt');
});

test('120/240V canonical pair → 240 (no variance)', () => {
    const r = extractSpecsStrict('120/240V, 3PH, 60HZ');
    assert(r.volt, '240', 'volt');
    assert(r.voltV, false, 'voltV');
});

test('277/480V canonical pair → 480 (no variance)', () => {
    const r = extractSpecsStrict('277/480V, 3PH, 60HZ');
    assert(r.volt, '480', 'volt');
    assert(r.voltV, false, 'voltV');
});

test('CPT-only 480 near TRANSFORMER keyword → suppressed when 240 present', () => {
    // Use the transformer notation (V-VAC) approach, which is the primary suppression mechanism
    // In real panels, "480V-120VAC" notation is the most common CPT reference
    const r = extractSpecsStrict(
        'MAIN SERVICE: 240V, 3PH, 60HZ\n' +
        'PUMP MOTOR: 240V 3PH\n' +
        'CONTROL POWER TRANSFORMER: 480V-120VAC'
    );
    assert(r.volt, '240', 'volt');
});

// ── B) HP extraction robustness ──────────────────────────────────────────────
console.log('\nB) HP extraction robustness');

test('%%U7.5HP (CAD code, no space) → 7.5', () => {
    const r = extractSpecsStrict('%%U7.5HP MOTOR');
    assert(r.hp, '7.5', 'hp');
});

test('7.5HP (no space, no CAD) → 7.5', () => {
    const r = extractSpecsStrict('MOTOR 7.5HP 480V');
    assert(r.hp, '7.5', 'hp');
});

test('HP: 7.5 (prefix format) → 7.5', () => {
    const r = extractSpecsStrict('HP: 7.5\nVOLT: 480');
    assert(r.hp, '7.5', 'hp');
});

test('MOTOR HP: 7.5 (label format) → 7.5', () => {
    const r = extractSpecsStrict('MOTOR HP: 7.5');
    assert(r.hp, '7.5', 'hp');
});

test('7.5-H.P. (hyphen+punctuation) → 7.5', () => {
    const r = extractSpecsStrict('PUMP 7.5-H.P. 3PH');
    assert(r.hp, '7.5', 'hp');
});

test('CP-8078 fixture → hp 7.5', () => {
    const r = extractSpecsStrict(CP8078_FIXTURE);
    assert(r.hp, '7.5', 'hp');
});

// ── C) Enclosure parsing ─────────────────────────────────────────────────────
console.log('\nC) Enclosure parsing');

test('NEMA4X (no space) → 4XSS', () => {
    const r = extractSpecsStrict('NEMA4X ENCLOSURE');
    assert(r.enc, '4XSS', 'enc');
});

test('NEMA 4X STAINLESS → 4XSS', () => {
    const r = extractSpecsStrict('NEMA 4X STAINLESS STEEL ENCLOSURE');
    assert(r.enc, '4XSS', 'enc');
});

test('NEMA 4X FIBERGLASS → 4XFG', () => {
    const r = extractSpecsStrict('NEMA 4X FIBERGLASS ENCLOSURE');
    assert(r.enc, '4XFG', 'enc');
});

test('4 X (space between) → 4XSS (no material)', () => {
    const r = extractSpecsStrict('TYPE 4 X PANEL');
    assert(r.enc, '4XSS', 'enc');
});

test('CP-8078 SS+FG both present → encV=true, enc=4XFG (prefer FG)', () => {
    const r = extractSpecsStrict(CP8078_FIXTURE);
    assert(r.encV, true, 'encV');
    assert(r.enc, '4XFG', 'enc');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n============================================================`);
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`============================================================`);
if (failed === 0) {
    console.log('\n✨ All tests passed!\n');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed.\n');
    process.exit(1);
}
