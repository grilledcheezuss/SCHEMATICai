// Run: node tests/system-type-adjacent.test.js
// v2.5.107 adjacent-token rules and v2.5.108 bounded equipment-title evidence.
const assert = require('assert');
const parser = require('../info-table-parser.js');
const { cp8025, cp8374 } = require('./fixtures/system-type-adjacent.js');

const derive = desc => {
    const record = { id: 'x', desc };
    parser.deriveRecord(record);
    return record;
};
const sys = desc => {
    const r = derive(desc);
    return [r._sys, r._sysV];
};
const expect = (desc, wanted, message) => assert.deepStrictEqual(sys(desc), wanted, message || desc.slice(0, 120));

// Neutral bases: every system word, title phrase and count removed, so a single
// inserted row/count is the only System Type evidence.
const neutralA = cp8025
    .replace(/duplex/gi, 'XPLX')
    .replace('BR Panel Type XPLX T3', 'BR Panel Type T3')
    .replace('No. Motors 2 OR', 'No. Motors OR');
const neutralB = cp8374
    .replace(/simplex/gi, 'XPLX')
    .replace('SWITCH XPLX Panel Type 5', 'SWITCH Panel Type 5')
    .replace('No. Motors 1 TX1', 'No. Motors TX1');
const forwardB = value => neutralB.replace('SWITCH Panel Type 5', `SWITCH Panel Type ${value} 5`);
const reverseB = value => neutralB.replace('SWITCH Panel Type 5', `SWITCH ${value} Panel Type 5`);
const forwardA = value => neutralA.replace('BR Panel Type T3', `BR Panel Type ${value} T3`);
const reverseA = value => neutralA.replace('BR Panel Type T3', `BR ${value} Panel Type T3`);

// --- Real fixtures --------------------------------------------------------------------------
const a = derive(cp8025);
assert.deepStrictEqual([a._sys, a._sysV, a._sysEvidence.source, a._sysEvidence.direction], ['Duplex', false, 'row', 'forward-adjacent'], 'CP-8025 Duplex green');
assert.deepStrictEqual(parser.extractInfoRows(cp8025).motorCounts, ['2'], 'CP-8025 "No. Motors 2 OR Elapsed" is a plain 2');
const b = derive(cp8374);
assert.deepStrictEqual([b._sys, b._sysV, b._sysEvidence.source, b._sysEvidence.direction], ['Simplex', false, 'row', 'reverse-adjacent'], 'CP-8374 Simplex green');
assert.deepStrictEqual(parser.extractInfoRows(cp8374).panelTypes, ['SIMPLEX'], 'CP-8374 reverse value, not BOM item 5');
assert.deepStrictEqual(parser.extractInfoRows(cp8374).motorCounts, ['1'], 'CP-8374 "No. Motors 1 TX1 13" is a plain 1');

// Non-System Type derivations are unchanged from v2.5.106 for both fixtures (captured from
// the previous parser). HP and voltage are Worker fields and are not derived here.
assert.deepStrictEqual([a._pumpMfg, a._encEvidence.status, [...a._encEvidence.materials], a._encEvidence.varied], ['GORMAN RUPP', 'row', ['Fiberglass'], false]);
assert.deepStrictEqual([b._pumpMfg, b._encEvidence.status, [...b._encEvidence.materials], b._encEvidence.varied, b._encEvidence.fgSignal], [null, 'unreadable', [], false, true]);

// Neutral bases carry no System Type evidence at all.
expect(neutralA, [null, false], 'neutral A');
expect(neutralB, [null, false], 'neutral B');

// --- Rule 1: forward / reverse adjacent token -----------------------------------------------
const values = [
    ['Simplex', 'Simplex'], ['DUPLEX', 'Duplex'], ['Triplex', 'Triplex'], ['QUADRAPLEX', 'Quadraplex'],
    ['Quadruplex', 'Quadraplex'], ['Quadplex', 'Quadraplex'], ['2 PUMPS', 'Duplex'], ['(2) PUMP', 'Duplex'],
    ['3 PUMPS', 'Triplex'], ['ONE PUMP', 'Simplex']
];
for (const [value, canonical] of values) {
    for (const build of [forwardA, reverseA, forwardB, reverseB]) expect(build(value), [canonical, false], `${value} adjacent row`);
    for (const label of ['Panel Type', 'System Type', 'Type of Panel']) {
        expect(`CR1 5 ABB ${label} ${value} T3 SWITCH 28 2 WAGO`, [canonical, false], `${label} forward ${value}`);
        expect(`28 2 WAGO DISCONNECT SWITCH ${value} ${label} 5 FS-2 ETM`, [canonical, false], `${label} reverse ${value}`);
        for (const separator of [': ', ' = ', ' | ', ' - ']) expect(`ABB ${label}${separator}${value} T3 OL`, [canonical, false], `${label}${separator}${value}`);
    }
}

// Negatives: hardware-only mentions, adjacent negations, references and conflicts.
for (const desc of [
    neutralA.replace('NEMA 4X', 'DUPLEX RECEPTACLE NEMA 4X'),
    neutralB.replace('ALARM LIGHT FS-1', 'DUPLEX RECEPTACLE FS-1'),
    forwardA('DUPLEX RECEPTACLE'), forwardA('Duplex Alternator'), forwardA('Duplex Alternating Relay'), forwardB('Simplex outlet'),
    reverseB('NOT SIMPLEX'), reverseB('NON SIMPLEX'), reverseA('NOT DUPLEX'), reverseA('NON-DUPLEX'),
    forwardA('NOT DUPLEX'), forwardA('Duplex for other panel'),
    neutralA.replace('BR Panel Type T3', 'BR Simplex Panel Type Duplex T3'),
    neutralB.replace('SWITCH Panel Type 5', 'SWITCH Triplex Panel Type Simplex 5'),
    neutralA.replace('-MAIN SERVICE', 'TAG: SEE DUPLEX PANEL CP-1234 -MAIN SERVICE'),
    `{\\rtf1\\ansi{\\fonttbl{\\f0\\fnil SIMPLEX;}}\\pard ${neutralB.replace(/[{}\\]/g, '')}}`,
    neutralB.replace('ABB OT63F3', 'ABB QUAD-OT63F3').replace('ABB X4150PSF1', 'ABB QUAD4150')
]) expect(desc, [null, false]);
const conflict = derive(neutralA.replace('BR Panel Type T3', 'BR Simplex Panel Type Duplex T3'));
assert.strictEqual(conflict._sysEvidence.source, 'conflict', 'disagreeing forward/reverse values are a conflict');
expect(neutralA.replace('BR Panel Type T3', 'BR Duplex Panel Type Duplex T3'), ['Duplex', false], 'agreeing forward/reverse values');
expect(forwardA('Duplex').replace('Cycle Counters', 'Panel Type Triplex Cycle Counters'), [null, false], 'two conflicting rows abstain');

// "No SIMPLEX PUMP Capacitors" (a neighboring row value) never suppresses a row.
expect(reverseB('Simplex').replace('No XPLX PUMP Capacitors', 'No SIMPLEX PUMP Capacitors'), ['Simplex', false]);

// --- Rule 2: leading-count association ------------------------------------------------------
const countOf = desc => parser.extractInfoRows(desc).motorCounts;
assert.deepStrictEqual(countOf('Phase/HZ 3/60 NP-4 No. Motors 2 OR Elapsed Time Meter X 17'), ['2']);
assert.deepStrictEqual(countOf('Flasher No. Motors 1 TX1 13 1 SQUARE D'), ['1']);
assert.deepStrictEqual(countOf('SQUARE D 3 No. Motors TX1 13 1 SQUARE D'), ['3'], 'reverse "<n> No. Motors"');
assert.deepStrictEqual(countOf('Flasher 3 No. Motors TX1 13').map(parser.parseMotorCount), [null], 'a count right after another label belongs to it');
assert.deepStrictEqual(countOf('CR2+2 No. Motors TX1 13').map(parser.parseMotorCount), [null], 'reverse combination is not a count');
for (const [n, type] of [[1, 'Simplex'], [2, 'Duplex'], [3, 'Triplex']]) {
    expect(neutralA.replace('No. Motors OR', `No. Motors ${n} OR`), [type, true], `count-only ${n} is orange`);
    expect(neutralB.replace('No. Motors TX1', `No. Motors ${n} TX1`), [type, true], `count-only ${n} is orange`);
}
expect(neutralA.replace('No. Motors OR', 'No. Motors 4 OR'), [null, false], '4-count alone is not Quadraplex');
expect(neutralB.replace('No. Motors TX1', 'No. Motors 4 TX1'), [null, false], '4-count alone is not Quadraplex');
for (const value of ['2+2', '2 + 1', '2/3', '2-3', '1.5', '2 & 1', '2+EX', '2 OR 3', '2 AND AUX', '2 FAN', '2 X 2']) {
    assert.strictEqual(countOf(`Flasher No. Motors ${value} TX1 13`).some(v => parser.parseMotorCount(v) !== null), false, `${value} never a plain count`);
    expect(neutralA.replace('No. Motors OR', `No. Motors ${value} OR`), [null, false], `${value} count-only abstains`);
    expect(forwardA('Duplex').replace('No. Motors OR', `No. Motors ${value} OR`), ['Duplex', true], `${value} keeps an explicit row orange`);
}
// Blank / non-count cells are unavailable, never a disagreement.
expect(forwardA('Duplex'), ['Duplex', false], 'blank count keeps explicit row green');
expect(reverseB('Simplex').replace('No. Motors TX1', 'No. Motors CAPACITORS TX1'), ['Simplex', false]);

// --- Rule 3: confidence ---------------------------------------------------------------------
expect(forwardA('Duplex').replace('No. Motors OR', 'No. Motors 2 OR'), ['Duplex', false], 'row + agreeing count');
expect(forwardA('Duplex').replace('No. Motors OR', 'No. Motors 3 OR'), ['Duplex', true], 'row + contradicting plain count');
expect(cp8025.replace('No. Motors 2 OR', 'No. Motors 3 OR'), ['Duplex', true]);
expect(cp8025.replace('No. Motors 2 OR', 'No. Motors 2+2 OR'), ['Duplex', true]);
const titleA = neutralA.replace('240/3Ø XPLX PUMP CONTROL PANEL', '240/3Ø DUPLEX PUMP CONTROL PANEL');
expect(titleA, ['Duplex', true], 'title only is orange');
expect(titleA.replace('No. Motors OR', 'No. Motors 2 OR'), ['Duplex', false], 'bounded title + agreeing plain count');
expect(titleA.replace('No. Motors OR', 'No. Motors 3 OR'), ['Duplex', true], 'title vs count disagreement stays orange');
expect(neutralA.replace('No. Motors OR', 'No. Motors 2 OR').replace('Mobile Estates', 'DUPLEX ALTERNATOR'), ['Duplex', true], 'hardware does not corroborate a count');

// --- Rule 4: title phrases -----------------------------------------------------------------
const tagB = neutralB.replace('TAG: Truck Dock LS XPLX Pump Control Panel', 'TAG: Truck Dock LS Simplex Pump Control Panel');
expect(tagB, ['Simplex', true], 'TAG + bounded type phrase is title evidence');
expect(tagB.replace('No. Motors TX1', 'No. Motors 1 TX1'), ['Simplex', false], 'TAG title + agreeing plain count');
const blockB = neutralB.replace(/XPLX PUMP XPLX PUMP XPLX PUMP XPLX PUMP XPLX PUMP/, 'SIMPLEX PUMP SIMPLEX PUMP SIMPLEX PUMP SIMPLEX PUMP SIMPLEX PUMP');
expect(blockB, ['Simplex', true], 'repeated title block is orange');
assert.strictEqual(derive(blockB)._sysEvidence.reasons.includes('repeated-title-block'), true);
expect(blockB.replace('No. Motors TX1', 'No. Motors 1 TX1'), ['Simplex', true], 'repeated title block stays orange even with a count');
expect(blockB.replace('SIMPLEX PUMP DRAWING', 'DUPLEX PUMP DUPLEX PUMP DRAWING'), [null, false], 'two block types abstain');
expect(neutralB.replace('NEMA 4X', 'DUPLEX RECEPTACLE CONTROL PANEL NEMA 4X'), [null, false], 'hardware title rejected');

// --- Rule 5: bounded equipment-title evidence ------------------------------------------------
for (const [phrase, type] of [
    ['DUPLEX PUMP', 'Duplex'], ['SIMPLEX BLOWER', 'Simplex'], ['TRIPLEX GRINDER', 'Triplex'],
    ['QUAD AERATOR', 'Quadraplex'], ['TRIPLEX ALTERNATING', 'Triplex'],
    ['QUAD VFD', 'Quadraplex'], ['SIMPLEX LIFT STATION', 'Simplex'], ['DUPLEX PUMP STATION', 'Duplex'],
    ['TRIPLEX STATION', 'Triplex'], ['QUAD SEWAGE', 'Quadraplex'], ['SIMPLEX EFFLUENT', 'Simplex'],
    ['DUPLEX SUBMERSIBLE', 'Duplex'], ['TRIPLEX BOOSTER', 'Triplex'], ['QUAD WET WELL', 'Quadraplex'],
    ['SIMPLEX WELL', 'Simplex'], ['DUPLEX SYSTEM', 'Duplex']
]) {
    const r = derive(`PANEL DESCRIPTION | ${phrase}`);
    assert.deepStrictEqual([r._sys, r._sysV, r._sysEvidence.source, r._sysEvidence.direction, r._sysEvidence.reasons],
        [type, true, 'title', 'equipment-title', ['validated-equipment-phrase']], phrase);
}
expect('TITLE | DUPLEX PUMP | CONTROL PANEL', ['Duplex', true], 'bounded title equipment phrase');
expect('PANEL DESCRIPTION | SIMPLEX BLOWER', ['Simplex', true], 'panel-description equipment phrase');
expect('TRIPLEX ALTERNATOR CONTROL PANEL', ['Triplex', true], 'alternator with explicit panel context');
expect('PANEL DESCRIPTION | DUPLEX ALTERNATOR', [null, false], 'alternator requires control-panel context after the component');
expect('QUAD VFD BLOWER PANEL', ['Quadraplex', true], 'VFD equipment with explicit panel context');
expect('DUPLEX PUMP', [null, false], 'equipment phrase without panel/title context abstains');
expect('DUPLEX SYSTEM PANEL', ['Duplex', true], 'system noun needs adjacent panel context');
for (const desc of [
    'TRIPLEX ALTERNATOR RELAY | CONTROL PANEL',
    'DUPLEX GFCI PUMP | CONTROL PANEL',
    'DUPLEX PUMP FOR OTHER PANEL | CONTROL PANEL',
    'OTHER PANEL | DUPLEX PUMP | PANEL DESCRIPTION',
    'DUPLEX PUMP | NOTES | PANEL DESCRIPTION',
    'DUPLEX RECEPTACLE | CONTROL PANEL',
    'DUPLEX OUTLET | CONTROL PANEL',
    'DUPLEX PUMP-123 | PANEL DESCRIPTION',
    'QUAD BLOWER #3 PANEL',
    'TRIPLEX ALTERNATOR RELAY',
    'QUAD-RELAY VFD PANEL'
]) expect(desc, [null, false], `equipment/reference exclusion: ${desc}`);
expect('SIMPLEX BLOWER CONTROL PANEL | DUPLEX PUMP PANEL', [null, false], 'two equipment configurations abstain');
expect('Panel Type Simplex Voltage 480 | DUPLEX PUMP PANEL', ['Simplex', false], 'clear row outranks narrative equipment mention');
for (const suffix of ['RECEPTACLE', 'OUTLET', 'GFI', 'GFCI', 'CONVENIENCE', 'PLUG', 'WIRE', 'CABLE', 'CONDUCTOR', 'CORD']) {
    expect(`Panel Type Duplex ${suffix}`, [null, false], `${suffix} after type is device evidence`);
    expect(`${suffix} Duplex Panel Type Voltage 480`, [null, false], `${suffix} before reverse type is device evidence`);
}

// --- Metamorphic: neighboring-column noise and layout swaps ---------------------------------
const noise = ['CR1', '28', '2', 'WAGO', '285-137', 'GROUND', 'TERMINAL', 'SWITCH', 'RELAY', 'ABB', 'OT63F3', 'DISCONNECT',
    'FUSE', '5', 'X', 'STARTER', 'LIGHT', 'BREAKER', 'HARDWARE', 'TB1', 'OL', 'FLA', 'M1', 'NP-4', '0000011', 'SQUARE', 'D'];
let seed = 107;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const junk = () => Array.from({ length: 1 + Math.floor(random() * 6) }, () => noise[Math.floor(random() * noise.length)]).join(' ');
for (let i = 0; i < 200; i++) {
    const [value, canonical] = values[i % values.length];
    // Before the reverse value's adjacent token, after the forward value's leading token.
    expect(neutralB.replace('SWITCH Panel Type 5', `SWITCH ${junk()} ${value} Panel Type 5`), [canonical, false], 'reverse noise');
    expect(neutralA.replace('BR Panel Type T3', `BR Panel Type ${value} ${junk()} T3`), [canonical, false], 'forward noise');
    expect(cp8374.replace('SWITCH Simplex Panel Type', `SWITCH ${junk()} Simplex Panel Type`), ['Simplex', false]);
    expect(cp8025.replace('Panel Type Duplex T3', `Panel Type Duplex ${junk()} T3`), ['Duplex', false]);
}
for (const [value] of values) {
    for (const [forward, reverse] of [[forwardA, reverseA], [forwardB, reverseB]]) {
        for (const count of ['', '1', '2', '3', '2+2']) {
            const withCount = desc => count ? desc.replace('No. Motors OR', `No. Motors ${count} OR`).replace('No. Motors TX1', `No. Motors ${count} TX1`) : desc;
            assert.deepStrictEqual(sys(withCount(forward(value))), sys(withCount(reverse(value))), `layout swap ${value} count ${count}`);
        }
    }
}
assert.deepStrictEqual(sys(cp8025.replace('BR Panel Type Duplex T3', 'BR Duplex Panel Type T3')), sys(cp8025), 'CP-8025 reverse layout');
assert.deepStrictEqual(sys(cp8374.replace('SWITCH Simplex Panel Type 5', 'SWITCH Panel Type Simplex 5')), sys(cp8374), 'CP-8374 forward layout');

// --- Performance: ~8k synthetic flattened records derive in bounded time ---------------------
const corpus = Array.from({ length: 8000 }, (_, i) => {
    const [value] = values[i % values.length];
    const base = i % 4 === 0 ? cp8025 : i % 4 === 1 ? cp8374 : i % 4 === 2 ? reverseB(value) : forwardA(value);
    return { id: `P-${i}`, desc: `${base} ${junk()}` };
});
const started = Date.now();
parser.deriveRecordsSync(corpus);
const elapsed = Date.now() - started;
assert(corpus.every(r => r._derivedRev === parser.DERIVED_REV), 'all derived');
assert(elapsed < 15000, `8k flattened records derived in ${elapsed}ms`);
const pathological = `Panel Type ${'DUPLEX '.repeat(5000)}${'No. Motors '.repeat(2000)}${' '.repeat(20000)}`;
const t0 = Date.now();
derive(pathological);
assert(Date.now() - t0 < 2000, 'no catastrophic backtracking on repeated tokens');

console.log(`System Type adjacent-token tests passed; 8k flattened records ${elapsed}ms`);
