// worker/tests/run.js
// Lightweight Node test runner for worker/lib/extract.js
// Run with: node worker/tests/run.js

const { extractSpecsStrict, normalizeCADText, parseHP, parseEnclosure, parseVoltageContextAware } = require('../lib/extract.js');
const fs = require('fs');
const path = require('path');
const {
    CP8078_TEXT,
    PANEL_480V_TEXT,
    PANEL_480V_WITH_XFMR_TEXT,
    PANEL_240V_TEXT,
    PANEL_FRACTIONAL_HP_TEXT,
    PANEL_NEMA4X_NOSPACE_TEXT
} = require('./fixtures.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log('  ✅', message);
        passed++;
    } else {
        console.error('  ❌', message);
        failed++;
    }
}

function assertEqual(actual, expected, label) {
    const ok = actual === expected;
    if (ok) {
        console.log(`  ✅ ${label}: ${JSON.stringify(actual)}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        failed++;
    }
}

function assertDeepEqual(actual, expected, label) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        console.log(`  ✅ ${label}: ${JSON.stringify(actual)}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        failed++;
    }
}

function functionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    if (start < 0) throw new Error(`Missing function ${name}`);
    const brace = source.indexOf('{', start);
    let depth = 0;
    for (let i = brace; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error(`Unterminated function ${name}`);
}

// ─── normalizeCADText ────────────────────────────────────────────────────────
console.log('\n=== normalizeCADText ===');
assertEqual(normalizeCADText('%%U7.5HP'), '7.5HP', 'strips %%U prefix');
assertEqual(normalizeCADText('%%O text %%Cdiameter'), ' text diameter', 'strips %%O and %%C');
assertEqual(normalizeCADText('%%1757.5HP'), '7.5HP', 'strips %%nnn (3-digit) code');
assertEqual(normalizeCADText(''), '', 'empty string');
assertEqual(normalizeCADText(null), '', 'null input');

// ─── parseHP ────────────────────────────────────────────────────────────────
console.log('\n=== parseHP ===');
{
    const r = [...parseHP('7.5HP')];
    assertEqual(r[0], '7.5', 'no-space 7.5HP');
}
{
    const r = [...parseHP('7.5 HP MOTOR')];
    assertEqual(r[0], '7.5', 'space-separated 7.5 HP');
}
{
    const r = [...parseHP('%%U7.5HP after normalize')];
    // Before normalizeCADText, %%U is still present – parseHP itself doesn't strip CAD codes
    // extractSpecsStrict normalizes first; parseHP operates on already-normalized text
    const normalized = normalizeCADText('%%U7.5HP after normalize');
    const r2 = [...parseHP(normalized)];
    assertEqual(r2[0], '7.5', 'CAD-normalized 7.5HP');
}
{
    const r = [...parseHP('7-1/2 HP MOTOR')];
    assertEqual(r[0], '7.5', 'mixed fraction 7-1/2 HP');
}
{
    const r = [...parseHP('7½ HP')];
    assertEqual(r[0], '7.5', 'unicode fraction 7½ HP');
}
{
    const r = [...parseHP('HP: 7.5')];
    assertEqual(r[0], '7.5', 'table format HP: 7.5');
}
{
    const r = [...parseHP('MOTOR HP: 7.5')];
    assertEqual(r[0], '7.5', 'table format MOTOR HP: 7.5');
}
{
    const r = [...parseHP('no hp here')];
    assert(r.length === 0, 'no HP returns empty set');
}

// ─── parseEnclosure ──────────────────────────────────────────────────────────
console.log('\n=== parseEnclosure ===');
{
    const r = parseEnclosure('NEMA 4X STAINLESS STEEL ENCLOSURE');
    assert(r.has('4XSS'), 'NEMA 4X STAINLESS → 4XSS');
    assert(!r.has('4XFG'), 'NEMA 4X STAINLESS → not 4XFG');
}
{
    const r = parseEnclosure('NEMA 4X FIBERGLASS ENCLOSURE');
    assert(r.has('4XFG'), 'NEMA 4X FIBERGLASS → 4XFG');
    assert(!r.has('4XSS'), 'NEMA 4X FIBERGLASS → not 4XSS');
}
{
    const r = parseEnclosure('NEMA4X STAINLESS ENCLOSURE');
    assert(r.has('4XSS'), 'NEMA4X (no space) → 4XSS');
}
{
    const r = parseEnclosure('TYPE 4X FIBERGLASS');
    assert(r.has('4XFG'), 'TYPE 4X FIBERGLASS → 4XFG');
}
{
    const r = parseEnclosure('4X ENCLOSURE');
    assert(r.has('4XSS'), 'bare 4X defaults to 4XSS');
}
{
    const r = parseEnclosure('NEMA 4X STAINLESS STEEL ENCLOSURE\nNEMA 4X FIBERGLASS ENCLOSURE');
    assert(r.has('4XSS'), 'conflict: has 4XSS');
    assert(r.has('4XFG'), 'conflict: has 4XFG');
    assert(r.size === 2, 'conflict: size=2');
}
{
    // SS spec-table lock: ENCLOSURE MATERIAL → STAINLESS should always win, even with FG signal
    const r = parseEnclosure('NEMA 4X FIBERGLASS ENCLOSURE MATERIAL: STAINLESS STEEL');
    assert(r.has('4XSS'), 'SS spec-table lock: ENCLOSURE MATERIAL → STAINLESS wins over FG signal');
    assert(!r.has('4XFG'), 'SS spec-table lock: 4XFG removed when spec-table says STAINLESS');
    assert(r.size === 1, 'SS spec-table lock: only 4XSS remains');
}
{
    // SS spec-table lock: stainless in spec-table wins even when both SS and FG appear in spec-table window
    const r = parseEnclosure('ENCLOSURE MATERIAL: STAINLESS STEEL / FIBERGLASS NEMA 4X');
    assert(r.has('4XSS'), 'SS spec-table lock: SS wins when both materials in spec-table window');
    assert(!r.has('4XFG'), 'SS spec-table lock: FG removed when spec-table includes stainless');
}

// ─── extractSpecsStrict: CP-8078 ────────────────────────────────────────────
console.log('\n=== extractSpecsStrict: CP-8078 fixture ===');
{
    const s = extractSpecsStrict(CP8078_TEXT);
    assertEqual(s.hp, '7.5', 'CP-8078: hp === "7.5"');
    assertEqual(s.volt, '240', 'CP-8078: volt === "240" (service-only, not 480)');
    assertEqual(s.voltV, false, 'CP-8078: voltV === false (single service voltage)');
    assert(s.encV === true, 'CP-8078: encV === true (SS + FG conflict)');
    assertEqual(s.enc, 'Varied / Multiple', 'CP-8078: enc === "Varied / Multiple" (both SS+FG present, no spec-table winner)');
}

// ─── extractSpecsStrict: 480V panel ─────────────────────────────────────────
console.log('\n=== extractSpecsStrict: 480V panel ===');
{
    const s = extractSpecsStrict(PANEL_480V_TEXT);
    assertEqual(s.volt, '480', '480V panel: volt === "480"');
    assertEqual(s.voltV, false, '480V panel: voltV === false');
    assertEqual(s.hp, '25', '480V panel: hp === "25"');
    assertEqual(s.enc, '4XSS', '480V panel: enc === "4XSS"');
}

// ─── extractSpecsStrict: 480V panel with control transformer ─────────────────
console.log('\n=== extractSpecsStrict: 480V panel with control transformer ===');
{
    const s = extractSpecsStrict(PANEL_480V_WITH_XFMR_TEXT);
    assertEqual(s.volt, '480', '480V+xfmr: volt === "480" (service wins)');
    assertEqual(s.voltV, false, '480V+xfmr: voltV === false');
}

// ─── extractSpecsStrict: 240V panel ─────────────────────────────────────────
console.log('\n=== extractSpecsStrict: 240V panel ===');
{
    const s = extractSpecsStrict(PANEL_240V_TEXT);
    assertEqual(s.volt, '240', '240V panel: volt === "240"');
    assertEqual(s.voltV, false, '240V panel: voltV === false');
    assertEqual(s.hp, '2', '240V panel: hp === "2"');
    assertEqual(s.enc, '4XFG', '240V panel: enc === "4XFG"');
}

// ─── extractSpecsStrict: fractional HP via CAD ──────────────────────────────
console.log('\n=== extractSpecsStrict: fractional HP via CAD code ===');
{
    const s = extractSpecsStrict(PANEL_FRACTIONAL_HP_TEXT);
    assertEqual(s.hp, '7.5', 'fractional HP %%U7-1/2HP → "7.5"');
    assertEqual(s.volt, '480', 'fractional HP panel volt === "480"');
}

// ─── extractSpecsStrict: NEMA4X no-space ────────────────────────────────────
console.log('\n=== extractSpecsStrict: NEMA4X no-space enclosure ===');
{
    const s = extractSpecsStrict(PANEL_NEMA4X_NOSPACE_TEXT);
    assertEqual(s.enc, '4XSS', 'NEMA4X no-space → 4XSS');
    assertEqual(s.encV, false, 'NEMA4X no-space → encV false');
}

// ─── Sulzer manufacturer extraction ───────────────────────────────────────────
console.log('\n=== Sulzer manufacturer extraction ===');
{
    const cases = [
        ['SULZER', 'SULZER'],
        ['Sulzer Pumps', 'SULZER'],
        ['PUMP MANUFACTURER: Sulzer', 'SULZER'],
        ['(Sulzer),', 'SULZER']
    ];
    for (const [text, expected] of cases) {
        const result = extractSpecsStrict(text);
        assertDeepEqual([result.mfg, result.mfgV], [expected, false], `${text} → clean Sulzer`);
    }
    for (const text of ['NOTSULZER', 'SULZERISH']) {
        assertEqual(extractSpecsStrict(text).mfg, null, `${text} is not Sulzer`);
    }
    const mixed = extractSpecsStrict('SULZER PUMPS / BARNES');
    assert(mixed.mfg === 'BARNES' && mixed.mfgV === true, 'Sulzer + Barnes retains varied semantics');
    assertEqual(extractSpecsStrict('ABS PUMP').mfg, 'ABS', 'ABS remains independent');
    assertEqual(extractSpecsStrict('GORMAN RUPP PUMP').mfg, 'GORMAN RUPP', 'Gorman Rupp unchanged');
    assertEqual(extractSpecsStrict('BARNES PUMP').mfg, 'BARNES', 'Barnes unchanged');
}

// Execute the actual extraction functions embedded in the deployed Worker source as well as
// the pure helper, so dictionary and behavior parity are covered without invoking MAIN/network.
{
    const workerSource = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8');
    const dictStart = workerSource.indexOf('const EXACT_MFGS = ');
    const dictOpen = workerSource.indexOf('{', dictStart);
    const dictClose = workerSource.indexOf('\n};', dictOpen) + 2;
    const workerMfgs = new Function(`return (${workerSource.slice(dictOpen, dictClose)});`)();
    const helper = require('../lib/extract.js');
    assertDeepEqual(workerMfgs, helper.EXACT_MFGS, 'deployed Worker and pure helper dictionaries match');
    const workerExtract = new Function(
        'EXACT_MFGS', 'normalizeCADText', '_parseHP', '_parseVoltageContextAware', '_parseEnclosure',
        'CANONICAL_DUAL_VOLTAGE_PAIRS', 'VOLT_PRIORITY',
        `return (${functionSource(workerSource, 'extractSpecsStrict')});`
    )(
        workerMfgs, normalizeCADText, parseHP, parseVoltageContextAware, parseEnclosure,
        helper.CANONICAL_DUAL_VOLTAGE_PAIRS, helper.VOLT_PRIORITY
    );
    const workerNormalize = new Function('EXACT_MFGS', `return (${functionSource(workerSource, 'normalizeLegacyMfg')});`)(workerMfgs);
    for (const text of ['SULZER', 'Sulzer Pumps', 'PUMP MANUFACTURER: Sulzer', '(Sulzer),', 'NOTSULZER', 'SULZERISH', 'SULZER / BARNES']) {
        const expected = extractSpecsStrict(text);
        const actual = workerExtract(text);
        assertDeepEqual([actual.mfg, actual.mfgV], [expected.mfg, expected.mfgV], `deployed parity: ${text}`);
    }
    assertEqual(workerNormalize('Sulzer Pumps'), 'SULZER', 'deployed legacy normalization accepts Sulzer Pumps');
    assertEqual(workerNormalize('(Sulzer),'), 'SULZER', 'deployed legacy normalization accepts punctuation-bounded Sulzer');
    assertEqual(workerNormalize('NOTSULZER'), null, 'deployed legacy normalization rejects embedded Sulzer');
    assertEqual(workerNormalize('SULZERISH'), null, 'deployed legacy normalization rejects Sulzer suffix');
    assertEqual(workerNormalize('BARNES'), 'BARNES', 'deployed legacy normalization preserves Barnes');
    assertEqual(workerNormalize('ABS'), 'ABS', 'deployed legacy normalization preserves ABS independently');
}

// ─── 100-record Worker extraction comparison ──────────────────────────────────
{
    const helper = require('../lib/extract.js');
    const baselineMfgs = { ...helper.EXACT_MFGS };
    delete baselineMfgs.SULZER;
    const helperSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'extract.js'), 'utf8');
    const baselineExtract = new Function(
        'EXACT_MFGS', 'normalizeCADText', 'parseHP', 'parseVoltageContextAware', 'parseEnclosure',
        'VOLT_PRIORITY', 'CANONICAL_DUAL_VOLTAGE_PAIRS',
        `return (${functionSource(helperSource, 'extractSpecsStrict')});`
    )(
        baselineMfgs, normalizeCADText, parseHP, parseVoltageContextAware, parseEnclosure,
        helper.VOLT_PRIORITY, helper.CANONICAL_DUAL_VOLTAGE_PAIRS
    );
    const mfgs = ['SULZER PUMPS', 'BARNES', 'GORMAN RUPP', 'ABS'];
    const records = Array.from({ length: 100 }, (_, i) =>
        `PUMP MANUFACTURER: ${mfgs[i % mfgs.length]} PANEL TYPE DUPLEX NO. MOTORS 2 HP 10 480V 3PH NEMA 4X`);
    const baselineResults = records.map(baselineExtract);
    const currentResults = records.map(extractSpecsStrict);
    let otherSpecsUnchanged = true;
    for (let i = 0; i < records.length; i++) {
        const { mfg: _beforeMfg, mfgV: _beforeMfgV, ...beforeOtherSpecs } = baselineResults[i];
        const { mfg: _afterMfg, mfgV: _afterMfgV, ...afterOtherSpecs } = currentResults[i];
        if (JSON.stringify(afterOtherSpecs) !== JSON.stringify(beforeOtherSpecs)) otherSpecsUnchanged = false;
    }
    assert(otherSpecsUnchanged, '100-record baseline/new comparison leaves every non-manufacturer spec unchanged');
    assertDeepEqual([baselineResults.filter(r => r.mfg === 'SULZER').length, currentResults.filter(r => r.mfg === 'SULZER').length],
        [0, 25], 'baseline/current Sulzer recognition count');
    const measure = extract => {
        const start = process.hrtime.bigint();
        for (let i = 0; i < 20; i++) records.forEach(text => extract(text));
        return Number(process.hrtime.bigint() - start) / 1e6;
    };
    const baselineMs = measure(baselineExtract);
    const currentMs = measure(extractSpecsStrict);
    console.log(`  ℹ️  Worker helper synthetic benchmark (100 records × 20): baseline=${baselineMs.toFixed(1)}ms, Sulzer=${currentMs.toFixed(1)}ms`);
}

// ─── Voltage: 208V boundary regression tests ────────────────────────────────
console.log('\n=== parseVoltageContextAware: 208V boundary guards ===');
{
    // Pure 208V panel — must NOT trigger a 240 classification
    const { serviceVolts } = parseVoltageContextAware('208V 3PH 60HZ PUMP PANEL');
    assert(!serviceVolts.has('240'), '208V only: 240 NOT in serviceVolts');
    assert(serviceVolts.has('208'), '208V only: 208 in serviceVolts');
}
{
    // 120/208V wye system — only 208 detected (120 has no V-suffix in slash notation)
    const { serviceVolts } = parseVoltageContextAware('120/208V 3PH PUMP CONTROLLER');
    assert(!serviceVolts.has('240'), '120/208V: 240 NOT in serviceVolts');
    assert(serviceVolts.has('208'), '120/208V: 208 in serviceVolts');
}
{
    // 208/220V (international range) — 220 must NOT trigger 240 classification via lookbehind guard
    // Note: 208 itself cannot be detected from slash notation without a V-suffix or VOLTAGE keyword
    const { serviceVolts } = parseVoltageContextAware('208/220V 3PH PUMP PANEL');
    assert(!serviceVolts.has('240'), '208/220V: 240 NOT in serviceVolts (208/ lookbehind blocks 220)');
    assert(!serviceVolts.has('208'), '208/220V slash notation: 208 not detected (no V-suffix in slash position)');
}
{
    // 208V + explicit 120/240V — 240 IS present (expected, not a false positive)
    const { serviceVolts } = parseVoltageContextAware('208V SERVICE WITH 120/240V BACKUP');
    assert(serviceVolts.has('208'), '208V + 120/240V: 208 in serviceVolts');
    assert(serviceVolts.has('240'), '208V + 120/240V: 240 in serviceVolts (explicitly present)');
}
{
    // extractSpecsStrict: pure 208V panel must give volt=208, voltV=false
    const s = extractSpecsStrict('208V 3PH 60HZ PUMP CONTROL PANEL');
    assertEqual(s.volt, '208', 'pure 208V panel: volt === "208"');
    assertEqual(s.voltV, false, 'pure 208V panel: voltV === false');
}
{
    // extractSpecsStrict: 208/220V slash notation — 240 NOT a false positive (volt=null, not 240)
    const s = extractSpecsStrict('208/220V 3PH PUMP PANEL NEMA 4X FIBERGLASS');
    assert(s.volt !== '240', '208/220V panel: volt is NOT "240" (no false positive)');
    assertEqual(s.voltV, false, '208/220V panel: voltV === false');
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('='.repeat(60));

if (failed > 0) {
    process.exit(1);
}
