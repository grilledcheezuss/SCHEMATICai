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
expect('No. Motors 2 Configuration Duplex Voltage 480', ['Duplex', false]);
// v2.5.107: the unsupported CONFIGURATION label is still dropped; the plain leading
// count "No. Motors 2" (rule 2) now supplies count-only (orange) evidence on its own.
for (const [desc, wanted] of [
    ['No. Motors 2 Configuration Duplex\nreceptacle Voltage 480', ['Duplex', true]],
    [`No. Motors 2 Configuration Duplex\n${' '.repeat(120)}receptacle Voltage 480`, ['Duplex', true]],
    ['Notes Pump Manufacturer Sulzer Configuration Duplex Voltage 480', [null, false]]
]) {
    assert.strictEqual(parser.extractInfoRows(desc).labels.some(label => label.label === 'CONFIGURATION'), false, desc);
    expect(desc, wanted);
}
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
// v2.5.107 rule 2: "2 A" is a plain leading count followed by a wiring token.
expect('Panel Type Duplex No. Motors 2 A Flasher', ['Duplex', false]);
for (const combination of ['2+1+1', '2 + 1 + 1', '2+2', '4+2']) {
    const record = { desc: `Panel Type ${combination} No. Motors 2` };
    parser.deriveRecord(record);
    assert.deepStrictEqual([record._sys, record._sysV, record._sysEvidence.source, record._sysEvidence.reasons],
        [null, false, 'conflict', ['mixed-panel-type-combination']], combination);
}
expect('Panel Type Duplex No. Motors 2+2', ['Duplex', true], 'motor combinations remain separate from panel-type combinations');

for (const title of [
    'Duplex Panel', 'Duplex Pump Control Panel', 'Duplex Blower Control Panel', 'Two Pump Control Panel',
    'Control Panel: Duplex', 'Control Panel for two pumps', '(2) Pump Control Panel',
    'Duplex Grinder Control Panel', 'Duplex Alternating Control Panel', 'Duplex\nControl Panel', 'Duplex | Control Panel',
    'Control Panel\nDuplex', 'Control Panel | (2) Pump'
]) {
    expect(title, ['Duplex', true]);
    expect(`${title}\nPanel Type Simplex`, ['Simplex', false]);
    for (const prefix of ['TAG ', 'Notes ', 'BOM ', 'Bill of Materials ', 'Not ', 'Not\n', 'Other | ', 'Non-', 'Other ', 'See ', 'Ref. ', 'Other Panel\n', 'Replacement for ']) {
        // v2.5.107 rule 4: TAG no longer blocks a bounded <type> PUMP|BLOWER|GRINDER CONTROL PANEL title.
        const tagged = prefix === 'TAG ' && /(?:PUMP|BLOWER|GRINDER) CONTROL PANEL$/i.test(title);
        expect(`${prefix}${title}`, tagged ? ['Duplex', true] : [null, false]);
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
    `No. Motors 2\n${' '.repeat(120)}+2`,
    `No. Motors 2\n${' '.repeat(120)}or 3`,
    `No. Motors 2\n${' '.repeat(120)}fan`,
    'Panel Type Duplex\nor Triplex',
    'Panel Type Duplex\nreceptacle',
    'No. Motors 2\n+2',
    'No. Motors 2\nfan'
]) expect(desc, [null, false]);
// v2.5.107 rule 1: the token immediately before/after the label is the value; earlier
// cells, distance and trailing checkbox/wiring columns no longer veto it.
for (const desc of [
    'Phase Monitor Yes Duplex Panel Type Voltage 480',
    'Voltage 480 Duplex Panel Type Cycle Counters',
    'No. Motors 2 Duplex Panel Type Cycle Counters',
    `Panel Type Duplex\nX\n${' '.repeat(120)}or Triplex`,
    `unrelated ${' '.repeat(120)}Duplex Panel Type Voltage 480`
]) expect(desc, ['Duplex', false]);
// Rule 2: "X" is a checkbox column token, so the leading 2 is a plain (count-only) count.
expect(`No. Motors 2\nX\n${' '.repeat(120)}+2`, ['Duplex', true]);

for (const desc of [
    'Duplex Control Panel | System Type | Voltage 480',
    'Panel Type CR1 5 Duplex Voltage 480',
    'Panel Type 28 2 WAGO 285-137 GROUND TERMINAL Duplex Voltage 480',
    'Phase Monitor Duplex 28 2 WAGO 285-137 GROUND TERMINAL Panel Type Voltage 480'
]) expect(desc, ['Duplex', true]);
// v2.5.107 rule 1/3: an adjacent forward or reverse token is explicit row evidence (green).
for (const desc of [
    'Duplex Panel Type Voltage 480',
    'Phase Monitor CR1 5 Duplex Panel Type Voltage 480',
    'Panel Type Duplex CR1 5 Voltage 480',
    'Panel Type Duplex 28 2 WAGO 285-137 GROUND TERMINAL Voltage 480'
]) expect(desc, ['Duplex', false]);
for (const [phrase, canonical] of [['DUPLEX GRINDER', 'Duplex'], ['DUPLEX ALTERNATING', 'Duplex'], ['SIMPLEX GRINDER PUMP PANEL', 'Simplex'], ['(2) PUMP', 'Duplex']]) {
    // Reverse adjacency accepts only a bare type word or N PUMP(S) form (rule 1).
    expect(`${phrase} Panel Type Voltage 480`, [canonical, phrase !== '(2) PUMP']);
    expect(`Panel Type ${phrase} Voltage 480`, [canonical, false]);
}
for (const qualifier of ['NOT', 'NO', 'NON', 'WITHOUT', 'OTHER', 'ANOTHER', 'SEE', 'REF', 'REFERENCE', 'FOR', 'EXISTING']) {
    expect(`Panel Type CR1 ${qualifier} DUPLEX Voltage 480`, [null, false]);
    expect(`Phase Monitor CR1 ${qualifier} DUPLEX Panel Type Voltage 480`, [null, false]);
    // Rule 1: trailing tokens after a forward leading value are ignored.
    expect(`Panel Type DUPLEX CR1 ${qualifier} Voltage 480`, ['Duplex', false]);
    expect(`Phase Monitor DUPLEX CR1 ${qualifier} Panel Type Voltage 480`, [null, false]);
}
for (const wire of ['H', 'A', 'N', 'OL', 'W/OR']) {
    expect(`Panel Type CR1 ${wire} Duplex Voltage 480`, ['Duplex', true]);
    expect(`Phase Monitor CR1 ${wire} Duplex Panel Type Voltage 480`, ['Duplex', false]);
}
// v2.5.107 rule 1: disagreeing forward and reverse adjacent values are a conflict.
expect('Triplex Panel Type Duplex Voltage 480', [null, false]);
expect('Phase Monitor Duplex 28 2 WAGO 285-137 GROUND TERMINAL Triplex Panel Type Voltage 480', ['Triplex', false]);
for (const gap of ['28 2 OTHER 285-137 GROUND TERMINAL', '28 2 WAGO 285-137 BOLT']) {
    expect(`Phase Monitor Duplex ${gap} Panel Type Voltage 480`, [null, false]);
}

// Missing/unreadable motor-count cells and unrelated cell noise are not count conflicts.
for (const value of ['', 'CAPACITORS', 'CATALOG NUMBER', 'YES', 'VFD1', 'HSP3/RUN']) {
    expect(`Panel Type Duplex\nNo. Motors ${value}\nVoltage 480`, ['Duplex', false]);
}
for (const value of ['3', '2+2', '2 + Ex', '4+2', '2/1', '2.5', '-2']) {
    expect(`Panel Type Duplex\nNo. Motors ${value}\nVoltage 480`, ['Duplex', true]);
}
for (const type of parser.SYSTEM_TYPES) expect(`${type} | Panel Type | Voltage 480`, [type, false]);
expect('Panel Type Duplex\nNo. Motors 2\nNo. Motors 3', ['Duplex', true]);
expect('Panel Type Duplex\nPanel Type\nNo. Motors 2', ['Duplex', false]);
expect('Panel Type Duplex\nPanel Type Triplex\nNo. Motors 2', [null, false]);

// A panel title remains uncertain alone; only a bounded matching plain count corroborates it.
expect('DUPLEX PUMP CONTROL PANEL', ['Duplex', true]);
expect('DUPLEX PUMP CONTROL PANEL\nNo. Motors 2', ['Duplex', false]);
expect('DUPLEX PUMP CONTROL PANEL\nNo. Motors 3', ['Duplex', true]);
expect('DUPLEX PUMP CONTROL PANEL\nNotes\nNo. Motors 2', ['Duplex', true]);
expect('BOM DUPLEX PUMP CONTROL PANEL\nNo. Motors 2', [null, false]);

// RTF parsing reads visible body text, not font tables or other destinations.
const rtf = body => `{\\rtf1\\ansi{\\fonttbl{\\f0\\fnil SIMPLEX;}}\\colortbl;\\pard ${body}}`;
for (const type of parser.SYSTEM_TYPES) {
    expect(rtf(`Panel Type ${type}\\par`), [type, false]);
}
expect(rtf('Panel Type Duplex\\par No. Motors 2\\par'), ['Duplex', false]);
expect(rtf('DUPLEX PUMP\\par CONTROL PANEL\\par No. Motors 2\\par'), ['Duplex', false]);
expect('{\\rtf1\\ansi\\pard Panel Type Dupl\\u101?x\\par Escaped \\{braces\\} and \\\\ slash}', ['Duplex', false]);
expect('{\\rtf1\\ansi{\\fonttbl{\\f0\\fnil SIMPLEX;}}}', [null, false]);
expect('{\\rtf1\\ansi{\\fonttbl{\\f0\\fnil DUPLEX;}}\\pard Panel Type Duplex receptacle\\par}', [null, false]);
expect('{\\rtf1\\ansi\\pard Panel Type Triplex\\par {\\*\\unknown DUPLEX PUMP CONTROL PANEL}}', ['Triplex', false]);

// DXF group-code 1 payloads are visible text; numeric coordinate groups are ignored.
const dxfEntity = (value, coordinate, layer = 'PANEL') => `0\nTEXT\n8\n${layer}\n10\n${coordinate}\n20\n480\n1\n${value}\n`;
const dxf = values => `0\nSECTION\n2\nENTITIES\n${values.map((item, i) => typeof item === 'string'
    ? dxfEntity(item, i + 1)
    : dxfEntity(item.value, i + 1, item.layer)).join('')}0\nENDSEC\n0\nEOF\n`;
for (const type of parser.SYSTEM_TYPES) {
    expect(dxf([`Panel Type ${type}`, 'Voltage 480']), [type, false]);
}
expect(dxf(['Panel Type', 'Duplex', 'No. Motors', '2']), ['Duplex', false]);
expect(dxf(['DUPLEX PUMP', 'CONTROL PANEL', 'No. Motors', '2']), ['Duplex', false]);
expect(dxf([{ value: 'Panel Type', layer: 'INFO' }, { value: 'Duplex', layer: 'NOTES' }]), [null, false]);
expect(dxf([{ value: 'Panel Type Duplex', layer: 'BOM' }]), [null, false]);
expect('0\nSECTION\n2\nENTITIES\n0\nPOINT\n10\n2\n20\n1\n1\nPanel Type Duplex\n0\nEOF\n', [null, false]);
expect('0\nSECTION\n2\nENTITIES\n0\nMTEXT\n10\n2\n20\n1\n1\nPanel Type Duplex\n0\nEOF\n', [null, false]);
expect('0\nSECTION\n2\nENTITIES\n0\nTEXT\n10\nPanel Type Duplex\n20\n1\n0\nEOF\n', [null, false]);
expect('0\nSECTION\n2\nENTITIES\n0\nTEXT\n10\n2\n20\n1\n1\nPanel Type Duplex\n0\n', [null, false]);

// Structural System Type parsing never alters raw descriptions or neighboring derived fields.
for (const desc of [rtf('Panel Type Duplex\\par Pump Manufacturer Sulzer\\par'), dxf(['Panel Type Duplex'])]) {
    const record = { id: 'structured', desc, enc: 'Varied / Multiple', encV: true, untouched: { raw: true } };
    const serialized = JSON.stringify(record);
    parser.deriveRecord(record);
    assert.strictEqual(JSON.stringify(record), serialized);
    assert.strictEqual(record._sys, 'Duplex');
    assert.strictEqual(record._pumpMfg, desc.includes('Pump Manufacturer Sulzer') ? 'SULZER' : null);
    assert.deepStrictEqual(record._encEvidence, parser.deriveMaterialFromDesc(desc));
    assert.strictEqual(record._derivedRev, parser.DERIVED_REV);
}

// Existing derived revisions must be replaced without changing snapshot serialization.
assert.strictEqual(parser.DERIVED_REV, 10);
for (const desc of ['No. Motors 4', 'Duplex Control Panel', 'Panel Type Duplex']) {
    for (const previousRevision of [5, 6, 7, 8, 9]) {
        const record = { id: desc, desc, sys: 'legacy' };
        for (const [key, value] of [['_derivedRev', previousRevision], ['_sys', 'Quadraplex'], ['_sysV', false]]) {
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
assert.strictEqual(evidence('Duplex Panel Type Voltage 480').direction, 'reverse-adjacent');
assert.strictEqual(evidence('Panel Type Duplex CR1 5 Voltage 480').direction, 'forward-adjacent');
assert(evidence('Panel Type CR1 5 Duplex Voltage 480').reasons.includes('wiring-gap'));
assert(evidence('Panel Type 28 2 WAGO 285-137 GROUND TERMINAL Duplex Voltage 480').reasons.includes('terminal-gap'));
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
