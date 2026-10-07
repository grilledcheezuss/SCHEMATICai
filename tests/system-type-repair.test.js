// Run: node tests/system-type-repair.test.js
const assert = require('assert');
const parser = require('../info-table-parser.js');
const derive = desc => parser.deriveFromDesc(desc);
const sys = desc => {
    const { sys, sysV } = derive(desc);
    return [sys, sysV];
};
const expect = (desc, wanted) => assert.deepStrictEqual(sys(desc), wanted, desc);

// Priority and metamorphic additions/removals: decoys never promote confidence.
expect('Triplex Control Panel\nPanel Type Duplex', ['Duplex', false]);
expect('Duplex Control Panel\nPanel Type Simplex Panel Type Triplex No. Motors 1', [null, false]);
expect('Panel Type Duplex or Triplex\nDuplex Control Panel', ['Duplex', true]);
expect('Panel Type Duplex or Triplex\nSimplex Control Panel No. Motors 1', [null, false]);
expect('Panel Type Duplex or Triplex No. Motors 2', ['Duplex', true]);
expect('Panel Type Duplex or Triplex No. Motors 1', [null, false]);
expect('Panel Type Duplex or Triplex Panel Type Simplex or Triplex No. Motors 2', [null, false]);
expect('Panel Type Quad or Triplex No. Motors 4', ['Quadraplex', true]);
expect('No. Motors 4', [null, false]);
expect('Quad Control Panel No. Motors 4', ['Quadraplex', true]);

const aliases = [
    ['Simplex', 'Simplex'], ['SINGLE PUMP', 'Simplex'], ['ONE PUMP', 'Simplex'], ['1-PUMP', 'Simplex'],
    ['Duplex', 'Duplex'], ['DUP', 'Duplex'], ['TWO PUMPS', 'Duplex'], ['2 PUMP', 'Duplex'],
    ['(2) PUMP', 'Duplex'], ['DUPLEX GRINDER', 'Duplex'], ['DUPLEX ALTERNATING', 'Duplex'],
    ['(2)PUMP', 'Duplex'],
    ['SIMPLEX GRINDER PUMP PANEL', 'Simplex'],
    ['Triplex', 'Triplex'], ['THREE PUMP', 'Triplex'], ['3-PUMP', 'Triplex'],
    ['Quad', 'Quadraplex'], ['Quadplex', 'Quadraplex'], ['Quadruplex', 'Quadraplex'],
    ['Quadraplex', 'Quadraplex'], ['FOUR PUMPS', 'Quadraplex'], ['4-PUMP', 'Quadraplex']
];
for (const label of ['Panel Type', 'Panel Configuration', 'System Type', 'Type of Panel']) {
    for (const [alias, canonical] of aliases) {
        for (const separator of [' ', ': ', ' | ', '\n']) {
            const desc = `${label}${separator}${alias}\nVoltage 480`;
            expect(desc, [canonical, false]);
            expect(desc.toLowerCase(), [canonical, false]);
            expect(`${desc}\nTAG Triplex Control Panel\nNotes Duplex outlet`, [canonical, false]);
        }
    }
}
expect('Configuration Duplex Voltage 480', ['Duplex', false]);
expect('Configuration Duplex', [null, false]);
for (const context of ['Notes', 'BOM', 'TAG', 'Bill of Materials']) {
    expect(`${context} System Type Duplex`, [null, false]);
    expect(`${context} Panel Type Duplex Voltage 480 No. Motors 2`, [null, false]);
    expect(`${context} Voltage 480 System Type Duplex`, [null, false]);
    for (const separator of ['\n', ' | ']) {
        expect(`${context} narrative${separator}System Type Duplex Voltage 480 No. Motors 2`, ['Duplex', false]);
        expect(`${context} narrative${separator}Voltage 480 System Type Duplex`, ['Duplex', false]);
        expect(`${context} narrative${separator}No. Motors 2 Voltage 480`, ['Duplex', true]);
    }
}
for (const desc of [
    'Enclosure Material Fiberglass CONFIGURATION INSTALLATION',
    'Pump Manufacturer Sulzer CONFIGURATION INSTALLATION',
    'CONFIGURATION INSTALLATION Enclosure Material Fiberglass',
    'CONFIGURATION INSTALLATION Pump Manufacturer Sulzer'
]) {
    const rows = parser.extractInfoRows(desc);
    assert.strictEqual(rows.labels.some(label => label.label === 'CONFIGURATION'), false, desc);
    assert.strictEqual(rows.panelTypes.length, 0, desc);
}
assert.deepStrictEqual(parser.extractInfoRows('Pump Manufacturer Sulzer CONFIGURATION INSTALLATION').pumpMfgs,
    ['SULZER CONFIGURATION INSTALLATION'], 'unsupported configuration cannot truncate manufacturer cells');
assert.deepStrictEqual(parser.extractInfoRows('Enclosure Material Fiberglass CONFIGURATION INSTALLATION').encMaterials,
    ['FIBERGLASS CONFIGURATION INSTALLATION'], 'unsupported configuration cannot truncate material cells');
for (const desc of [
    'Pump Manufacturer Gorman Configuration Rupp',
    'Enclosure Material Stainless Configuration Steel',
    'Enclosure Material Painted Configuration Steel',
    'Enclosure Material CR1 5 Fiberglass CONFIGURATION X Inner Swing Panel Yes'
]) {
    const rows = parser.extractInfoRows(desc);
    // Same-length unknown token isolates boundary behavior from window offsets.
    const baseline = parser.extractInfoRows(desc.replace(/CONFIGURATION/i, 'CONFIGURATI0N'));
    assert.strictEqual(rows.labels.some(label => label.label === 'CONFIGURATION'), false, desc);
    for (const kind of ['encMaterials', 'pumpMfgs', 'panelTypes', 'motorCounts']) {
        assert.deepStrictEqual(rows[kind], baseline[kind].map(cell => cell.replace('CONFIGURATI0N', 'CONFIGURATION')), desc);
    }
}
for (const label of ['No. Motors', 'Number of Motors', 'No of Pumps', 'Number of Pumps', 'QTY Pumps']) {
    for (let count = 1; count <= 3; count++) expect(`${label} ${count}`, [parser.SYSTEM_TYPES[count - 1], true]);
    for (const count of ['4', '2+2', '2 + 1', '4+2', '2/1', '2.5', '-2', '2 fan', '2 X 2']) expect(`${label} ${count}`, [null, false]);
    for (const prefix of ['Notes ', 'TAG ', 'BOM ', 'Bill of Materials ', 'The device has ']) expect(`${prefix}${label} 2`, [null, false]);
    expect(`${label} 2${' '.repeat(40)} or 3`, [null, false]);
}
expect('Panel Type Duplex No. Motors 2 H A Flasher', ['Duplex', false]);
expect('Panel Type Duplex No. Motors 2 A Flasher', ['Duplex', true]);

for (const title of [
    'Duplex Panel', 'Duplex Pump Control Panel', 'Duplex Blower Control Panel', 'Two Pump Control Panel',
    'Control Panel: Duplex', 'Control Panel for two pumps', '(2) Pump Control Panel',
    'Duplex Grinder Control Panel', 'Duplex Alternating Control Panel', 'Duplex\nControl Panel', 'Duplex | Control Panel',
    'Control Panel\nDuplex', 'Control Panel | (2) Pump'
]) {
    expect(title, ['Duplex', true]);
    expect(`${title}\nPanel Type Simplex`, ['Simplex', false]);
    for (const prefix of ['TAG ', 'Notes ', 'BOM ', 'Bill of Materials ', 'Not ', 'Not\n', 'Other | ', 'Non-', 'Other ', 'See ', 'Ref. ', 'Other Panel\n', 'Replacement for ']) {
        expect(`${prefix}${title}`, [null, false]);
    }
    for (const suffix of [' receptacle', '\nreceptacle', ' | alternating relay', ' outlet', ' alternator', ' alternating relay', ' indicator', ' light', ' component', ' mounted on other panel', '\nmounted on other panel', ' for other panel', ' or Triplex']) {
        expect(`${title}${suffix}`, [null, false]);
    }
}
for (const desc of [
    'DUP Control Panel', 'QUAD-RELAY Control Panel', 'DUPLICATE Control Panel',
    'DUP PUMP CONTROL PANEL',
    'Control Panel: DUPLEX-123', 'Control Panel: DUPLEX-ABC', 'Control Panel: DUPLEX_123',
    'Control Panel: DUPLEX123', 'Control Panel: DUPLEX /', 'Control Panel: DUPLEX + 123',
    'Control Panel: DUPLEX 123', 'Control Panel: DUPLEX #123',
    'Control Panel: DUPLEX(123)', 'Control Panel: DUPLEX:123', 'Control Panel: DUPLEX (123)',
    'Duplex Control Panel-123', 'Duplex Control Panel_123', 'Duplex Control Panel123',
    'Control Panel: (2) PUMP-123', 'Control Panel: (2) PUMP_123', 'Control Panel: (2) PUMP123',
    'Control Panel: (2) PUMP(123)', 'Control Panel: (2) PUMP #123',
    '(2) Pump Control Panel-123', '(2) Pump Control Panel_123',
    'Control Panel: (2)PUMP-123', '(2)PUMP Control Panel-123',
    'Panel Type (2) PUMP-123', '(2) PUMP-123 Panel Type Voltage 480',
    'Simplex part Control Panel', 'Duplex receptacle Control Panel', 'Duplex alternating relay Control Panel',
    'Duplex or Triplex Control Panel', 'Duplex pump station Panel Type Voltage 480',
    'TAG Duplex Panel Type Voltage 480', 'No. Motors 2 fan', 'Panel Type DUPLEX receptacle',
    'Panel Type SIMPLEX part', 'Panel Type QUAD relay', 'Panel Type DUPLICATE',
    'Panel Type DUP PUMP CONTROL PANEL',
    'DUP PUMP CONTROL PANEL Panel Type Voltage 480',
    'Panel Type DUP GRINDER',
    'Panel Type Not Duplex', 'Panel Type Duplex for other panel',
    'Panel Type Duplex Alternating Relay',
    'Panel Type Duplex Alternating\nRelay',
    'Duplex Alternating Relay Panel Type Voltage 480',
    'Phase Monitor Yes Duplex Panel Type Voltage 480',
    'Voltage 480 Duplex Panel Type Cycle Counters',
    'No. Motors 2 Duplex Panel Type Cycle Counters',
    'TAG Duplex Panel Type Cycle Counters',
    'Notes Duplex Panel Type Cycle Counters',
    'BOM Duplex Panel Type Cycle Counters',
    `Panel Type Duplex${' '.repeat(40)}or Triplex`,
    `Panel Type Duplex${' '.repeat(40)}receptacle`,
    `Panel Type Duplex Grinder${' '.repeat(40)}or Triplex`,
    `Panel Type Duplex Alternating${' '.repeat(40)}relay`,
    `Panel Type Duplex\n${' '.repeat(120)}or Triplex`,
    `Panel Type Duplex\n${' '.repeat(120)}receptacle`,
    `Panel Type Duplex\n${' '.repeat(112)}receptacle`,
    `Panel Type Duplex\nX\n${' '.repeat(120)}or Triplex`,
    `No. Motors 2\n${' '.repeat(120)}+2`,
    `No. Motors 2\n${' '.repeat(120)}or 3`,
    `No. Motors 2\n${' '.repeat(120)}fan`,
    `No. Motors 2\nX\n${' '.repeat(120)}+2`,
    'Panel Type Duplex\nor Triplex',
    'Panel Type Duplex\nreceptacle',
    'No. Motors 2\n+2',
    'No. Motors 2\nfan',
    `unrelated ${' '.repeat(120)}Duplex Panel Type Voltage 480`
]) expect(desc, [null, false]);

for (const desc of [
    'Duplex Panel Type Voltage 480',
    'Duplex Control Panel | System Type | Voltage 480',
    'Phase Monitor CR1 5 Duplex Panel Type Voltage 480',
    'Panel Type CR1 5 Duplex Voltage 480',
    'Panel Type Duplex CR1 5 Voltage 480',
    'Panel Type 28 2 WAGO 285-137 GROUND TERMINAL Duplex Voltage 480',
    'Panel Type Duplex 28 2 WAGO 285-137 GROUND TERMINAL Voltage 480',
    'Phase Monitor Duplex 28 2 WAGO 285-137 GROUND TERMINAL Panel Type Voltage 480'
]) expect(desc, ['Duplex', true]);
for (const [phrase, canonical] of [['DUPLEX GRINDER', 'Duplex'], ['DUPLEX ALTERNATING', 'Duplex'], ['SIMPLEX GRINDER PUMP PANEL', 'Simplex'], ['(2) PUMP', 'Duplex']]) {
    expect(`${phrase} Panel Type Voltage 480`, [canonical, true]);
    expect(`Panel Type ${phrase} Voltage 480`, [canonical, false]);
}
for (const qualifier of ['NOT', 'NO', 'NON', 'WITHOUT', 'OTHER', 'ANOTHER', 'SEE', 'REF', 'REFERENCE', 'FOR', 'EXISTING']) {
    expect(`Panel Type CR1 ${qualifier} DUPLEX Voltage 480`, [null, false]);
    expect(`Phase Monitor CR1 ${qualifier} DUPLEX Panel Type Voltage 480`, [null, false]);
    expect(`Panel Type DUPLEX CR1 ${qualifier} Voltage 480`, [null, false]);
    expect(`Phase Monitor DUPLEX CR1 ${qualifier} Panel Type Voltage 480`, [null, false]);
}
for (const wire of ['H', 'A', 'N', 'OL', 'W/OR']) {
    expect(`Panel Type CR1 ${wire} Duplex Voltage 480`, ['Duplex', true]);
    expect(`Phase Monitor CR1 ${wire} Duplex Panel Type Voltage 480`, ['Duplex', true]);
}
expect('Triplex Panel Type Duplex Voltage 480', ['Duplex', false]);
for (const gap of ['28 2 OTHER 285-137 GROUND TERMINAL', '28 2 WAGO 285-137 BOLT', '28 2 WAGO 285-137 GROUND TERMINAL Triplex']) {
    expect(`Phase Monitor Duplex ${gap} Panel Type Voltage 480`, [null, false]);
}

// Revision-five derived fields must be replaced without changing snapshot serialization.
assert.strictEqual(parser.DERIVED_REV, 6);
for (const desc of ['No. Motors 4', 'Duplex Control Panel', 'Panel Type Duplex']) {
    const record = { id: desc, desc, sys: 'legacy' };
    for (const [key, value] of [['_derivedRev', 5], ['_sys', 'Quadraplex'], ['_sysV', false]]) {
        Object.defineProperty(record, key, { value, configurable: true });
    }
    const serialized = JSON.stringify(record);
    assert.strictEqual(parser.deriveRecord(record), true);
    assert.strictEqual(parser.deriveRecord(record), false);
    assert.strictEqual(JSON.stringify(record), serialized);
    assert.deepStrictEqual([record._sys, record._sysV], sys(desc));
    assert.strictEqual(Object.getOwnPropertyDescriptor(record, '_sysEvidence').enumerable, false);
    assert.deepStrictEqual(Object.keys(record._sysEvidence), ['source', 'candidates', 'direction', 'confidence', 'reasons']);
    assert(Object.isFrozen(record._sysEvidence));
    assert(Object.isFrozen(record._sysEvidence.candidates));
    assert(record._sysEvidence.reasons.length || record._sysEvidence.confidence === 'verified');
    assert.deepStrictEqual(Object.keys(derive(desc)), ['sys', 'sysV', 'pumpMfg']);
}
const evidence = desc => {
    const r = { desc };
    parser.deriveRecord(r);
    return r._sysEvidence;
};
assert.strictEqual(evidence('Panel Type Duplex').source, 'row');
assert.strictEqual(evidence('Panel Type Duplex').confidence, 'verified');
assert.strictEqual(evidence('Duplex Control Panel').source, 'title');
assert.strictEqual(evidence('No. Motors 2').source, 'count');
assert.strictEqual(evidence('Duplex Panel Type Voltage 480').direction, 'reverse');
assert(evidence('Panel Type CR1 5 Duplex Voltage 480').reasons.includes('wiring-gap'));
assert(evidence('Phase Monitor CR1 5 Duplex Panel Type Voltage 480').reasons.includes('wiring-gap'));
assert(evidence('Panel Type Duplex 28 2 WAGO 285-137 GROUND TERMINAL Voltage 480').reasons.includes('terminal-gap'));
assert.deepStrictEqual(evidence('Panel Type Duplex Panel Type Triplex').candidates, ['Duplex', 'Triplex']);

// Exercise long no-row/title-heavy inputs, not merely cached record fast paths.
const time = n => {
    const desc = 'Duplex receptacle Control Panel\n'.repeat(n) + 'Triplex Control Panel';
    const start = process.hrtime.bigint();
    expect(desc, ['Triplex', true]);
    return Number(process.hrtime.bigint() - start) / 1e6;
};
time(500);
const small = time(10000);
const large = time(20000);
assert(large < small * 4 + 100, `nonlinear title scan: ${small}ms -> ${large}ms`);
assert(large < 1000, `long title scan took ${large}ms`);
console.log(`System Type repair regressions passed; long-input ${small.toFixed(1)}ms / ${large.toFixed(1)}ms`);
