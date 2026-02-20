// extractSpecsStrict Regression Tests - v2.5.34
// Validates HP, voltage, and enclosure extraction for known-failing cases.
// Run with: node worker/tests/extractSpecsStrict.test.js

// ── Inline copies of worker helpers (kept in sync with worker/worker.js) ──

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

function normalizeCADText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/%%(?:[A-Za-z]|\d{3})/g, '');
}

function isValidHP(hp) {
    const val = parseFloat(hp);
    return !isNaN(val) && val >= 0.1 && val <= 500;
}

function extractSpecsStrict(t) {
    const s = {
        mfg: null, hp: null, volt: null, phase: null, enc: null,
        mfgV: false, hpV: false, voltV: false, phaseV: false, encV: false
    };
    if (!t || typeof t !== 'string') return s;

    t = normalizeCADText(t);

    // HP detection
    const foundHPs = new Set();
    function addHP(val) {
        if (!isNaN(val) && val >= 0.1 && val <= 500) {
            foundHPs.add((Math.round(val * 10) / 10).toString());
        }
    }
    const hpRegex = /\b(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])\s*(HP|H\.P\.|H\.P|KW|kW|HORSEPOWER)\b/gi;
    let match;
    while ((match = hpRegex.exec(t)) !== null) {
        let raw = match[1]; let val = 0;
        if (match[2] && match[2].toUpperCase().includes('KW')) val = parseFloat(raw) * 1.341;
        else if (/(\d+)[-\s](\d+)\/(\d+)/.test(raw)) {
            const m = raw.match(/(\d+)[-\s](\d+)\/(\d+)/);
            val = parseFloat(m[1]) + parseFloat(m[2]) / parseFloat(m[3]);
        } else if (/(\d+)([¼½¾])/.test(raw)) {
            const m = raw.match(/(\d+)([¼½¾])/);
            const fractionMap = { '¼': 0.25, '½': 0.5, '¾': 0.75 };
            val = parseFloat(m[1]) + fractionMap[m[2]];
        } else if (raw.includes('-')) {
            const nums = raw.split('-').filter(Boolean).map(parseFloat).filter(x => !isNaN(x));
            if (nums.length) val = Math.max(...nums);
        } else if (raw.includes('/')) {
            const [num, den] = raw.split('/');
            val = parseFloat(num) / parseFloat(den);
        } else {
            val = parseFloat(raw);
        }
        addHP(val);
    }
    // Secondary: "HP: value" / "MOTOR HP: value"
    const hpLabelRegex = /\b(?:MOTOR\s+)?HP\s*[:\-=]\s*(\d+(?:\.\d+)?)\b/gi;
    while ((match = hpLabelRegex.exec(t)) !== null) {
        addHP(parseFloat(match[1]));
    }
    if (foundHPs.size === 1) {
        s.hp = [...foundHPs][0];
    } else if (foundHPs.size > 1) {
        s.hp = [...foundHPs].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
        s.hpV = true;
    }

    // Voltage detection (transformer patterns masked)
    const maskedForVolt = t.replace(/\b\d+V\s*-\s*\d+VAC\b/gi, 'XFMR_SPEC');
    const foundVolts = new Set();
    for (const v of VOLT_PRIORITY) {
        if (v.match.test(maskedForVolt)) foundVolts.add(v.id);
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
            s.volt = pair.high;
            s.voltV = false;
        } else {
            s.volt = voltArray[0];
            s.voltV = true;
        }
    }

    // Enclosure detection
    const foundEnclosures = new Set();
    const has4X = /(?:\b(?:NEMA|TYPE)\s*4\s*X\b|\b4\s*X\b)/i.test(t);
    if (/\bNEMA\s*4XFG\b|\b4XFG\b/i.test(t)) foundEnclosures.add("4XFG");
    if (/\b(FIBERGLASS|FIBER\s*GLASS)\b/i.test(t) && has4X) foundEnclosures.add("4XFG");
    if (/\b(STAINLESS|SS)\b/i.test(t) && has4X) foundEnclosures.add("4XSS");
    if (/\bNEMA\s*4XSS\b|\b4XSS\b/i.test(t)) foundEnclosures.add("4XSS");
    if (has4X && !/\b(FIBERGLASS|FIBER\s*GLASS|4XFG)\b/i.test(t) && !foundEnclosures.has("4XSS")) {
        foundEnclosures.add("4XSS");
    }
    if (/\bPOLY(?:CARBONATE)?\b/i.test(t)) foundEnclosures.add("POLY");
    if (foundEnclosures.size === 1) {
        s.enc = [...foundEnclosures][0];
    } else if (foundEnclosures.size > 1) {
        s.enc = [...foundEnclosures][0];
        s.encV = true;
    }

    return s;
}

// ── Test runner ──

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
    const ok = actual === expected;
    if (ok) {
        console.log(`  ✅ ${label}: ${JSON.stringify(actual)}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        failed++;
    }
}

// ── Tests: HP extraction (B) ──

console.log('\n=== HP extraction ===');

{
    const s = extractSpecsStrict('%%U7.5HP');
    assert('CAD code 7.5HP (no space)', s.hp, '7.5');
}
{
    const s = extractSpecsStrict('7.5HP');
    assert('7.5HP (no space, no CAD code)', s.hp, '7.5');
}
{
    const s = extractSpecsStrict('7.5 HP');
    assert('7.5 HP (with space)', s.hp, '7.5');
}
{
    const s = extractSpecsStrict('HP: 7.5');
    assert('HP: 7.5 (label-first table format)', s.hp, '7.5');
}
{
    const s = extractSpecsStrict('MOTOR HP: 7.5');
    assert('MOTOR HP: 7.5 (table format)', s.hp, '7.5');
}
{
    const s = extractSpecsStrict('HP-7.5');
    assert('HP-7.5 (dash separator)', s.hp, '7.5');
}
{
    const s = extractSpecsStrict('No horsepower here');
    assert('No HP returns null', s.hp, null);
}

// ── Tests: Voltage extraction (A) – CP-8078 scenario ──

console.log('\n=== Voltage extraction (transformer de-prioritization) ===');

{
    // CP-8078 key text: 230V single phase (panel primary), with 480V-120VAC transformer
    const text = '%%U230V,3%%C SOME SPECS %%U480V-120VAC TRANSFORMER %%U7.5HP NEMA 4X STAINLESS STEEL';
    const s = extractSpecsStrict(text);
    assert('CP-8078 volt should be 240 (not 480)', s.volt, '240');
}
{
    // Plain 480V-120VAC transformer: no other voltage → should be masked, volt=null
    const s = extractSpecsStrict('Control transformer 480V-120VAC');
    assert('Isolated transformer spec masked → volt null', s.volt, null);
}
{
    // 480V panel (not a transformer)
    const s = extractSpecsStrict('480VAC 3 PHASE SERVICE');
    assert('Genuine 480V panel → volt 480', s.volt, '480');
}
{
    // 120/240V canonical pair
    const s = extractSpecsStrict('120/240 VAC split-phase service');
    assert('120/240 canonical pair → volt 240', s.volt, '240');
}

// ── Tests: Enclosure extraction (C) ──

console.log('\n=== Enclosure extraction (NEMA4X variant) ===');

{
    const s = extractSpecsStrict('NEMA4X STAINLESS STEEL ENCLOSURE');
    assert('NEMA4X (no space) stainless → 4XSS', s.enc, '4XSS');
}
{
    const s = extractSpecsStrict('NEMA 4X STAINLESS STEEL ENCLOSURE');
    assert('NEMA 4X (with space) stainless → 4XSS', s.enc, '4XSS');
}
{
    const s = extractSpecsStrict('NEMA4X FIBERGLASS ENCLOSURE');
    assert('NEMA4X fiberglass → 4XFG', s.enc, '4XFG');
}
{
    const s = extractSpecsStrict('TYPE 4X ENCLOSURE');
    assert('TYPE 4X → 4XSS (default)', s.enc, '4XSS');
}
{
    // Both stainless and fiberglass in one record → varied
    const text = 'NEMA 4X STAINLESS STEEL ENCLOSURE ... NEMA 4X FIBERGLASS ENCLOSURE';
    const s = extractSpecsStrict(text);
    assert('Mixed enc → encV true', s.encV, true);
}
{
    const s = extractSpecsStrict('4X POLY ENCLOSURE');
    // has4X=true, POLY matches, 4X without fiberglass/stainless → 4XSS also added
    assert('4X + POLY → varied encV', s.encV, true);
}

// ── Results ──

console.log(`\n============================================================`);
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`============================================================`);
if (failed === 0) {
    console.log('\n✨ All tests passed!');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed.');
    process.exit(1);
}
