const assert = require('assert');
const parser = require('../info-table-parser.js');
const { baseline, cases } = require('./fixtures/system-type-alternator.js');

const derive = desc => {
    const record = { id: 'fixture', desc };
    const raw = JSON.stringify(record);
    parser.deriveRecord(record);
    assert.strictEqual(JSON.stringify(record), raw, 'derived evidence never changes raw JSON');
    return record;
};
const result = desc => {
    const record = derive(desc);
    return [record._sys, record._sysV];
};

for (const fixture of cases) {
    assert.deepStrictEqual(result(fixture.desc), fixture.expected, fixture.id);
}
let classified = 0;
for (const fixture of baseline) {
    const actual = result(fixture.desc);
    assert.deepStrictEqual(actual, fixture.expected, `baseline preserved: ${fixture.id}`);
    if (actual[0]) classified++;
}
assert.strictEqual(classified, baseline.length, 'alternator recovery must not reduce baseline classified coverage');

for (const type of ['Triplex', 'Quadraplex']) {
    for (const phrase of [`${type} Alternator`, `${type.toLowerCase()} alternator`, `${type.toUpperCase()}\nALTERNATOR`]) {
        assert.deepStrictEqual(result(`Panel Type | unreadable | BOM | ${phrase}`), [type, true]);
        assert.deepStrictEqual(result(`Simplex Pump Control Panel | BOM | ${phrase}`), [type, true]);
        assert.deepStrictEqual(result(`Panel Type Simplex | BOM | ${phrase}`), ['Simplex', false], 'explicit row stays primary');
        assert.deepStrictEqual(result(`Panel Type Duplex | BOM | ${phrase}`), ['Duplex', false], 'Duplex row stays primary');
    }
    for (const phrase of [
        `No ${type} Alternator`, `Optional ${type} Alternator`, `${type} Alternator for other panel`,
        `${type} Alternator | OPTIONAL`, `${type} Alternator | FOR OTHER PANEL`,
        `NOT INSTALLED | ${type} Alternator`, `NOT PROVIDED | ${type} Alternator`,
        `NOTES | ${type} Alternator`, `OPTIONAL PARTS | ${type} Alternator`,
        `REFERENCE PANEL CP-999 | ${type} Alternator`, `0 | ${type} Alternator`,
        `${type}-Alternator`, `${type} Alternators`, `X${type} Alternator`, `${type} AlternatorX`, `%%U${type} Alternator`
    ]) {
        assert.deepStrictEqual(result(`BOM | ${phrase}`), [null, false], phrase);
    }
}
for (const part of ['ARB-120-ADA', 'arb-120-ada', '1 ARB-120-ADA Duplex Alternator']) {
    assert.deepStrictEqual(result(`No. Motors 1 | BOM | ${part}`), [null, false], 'exact installed part excludes inferred Simplex');
    assert.deepStrictEqual(result(`Panel Type Simplex | BOM | ${part}`), ['Simplex', false], 'part never overrides explicit row');
    assert.deepStrictEqual(result(`Duplex Pump Control Panel | BOM | ${part}`), ['Duplex', true], 'part does not promote Duplex');
}
for (const part of ['XARB-120-ADA', 'ARB-120-ADA-X', 'ARB 120 ADA', 'ARB-120', 'OPTIONAL ARB-120-ADA', 'NOTES | ARB-120-ADA', 'NOT INSTALLED | ARB-120-ADA']) {
    assert.deepStrictEqual(result(`No. Motors 1 | BOM | ${part}`), ['Simplex', true], part);
}
assert.deepStrictEqual(result('Triplex Pump Control Panel | BOM | Quadraplex Alternator'), ['Triplex', true],
    'quad-capable hardware must not force a different primary application');
assert.deepStrictEqual(result('Duplex Pump Control Panel | BOM | Triplex Alternator'), ['Duplex', true],
    'existing Duplex title logic is preserved');
assert.deepStrictEqual(result('BOM | Triplex Alternator | Duplex Alternator'), ['Mixed', true]);
assert.deepStrictEqual(result('Duplex Pump Control Panel | BOM | Triplex Alternator | Quadraplex Alternator'), ['Mixed', true],
    'positively competing installed applications are Mixed, not forced into an incidental single-type title');
assert.deepStrictEqual(result('BOM | Triplex Alternator | ARB-120-ADA'), ['Mixed', true]);
assert.deepStrictEqual(result('No. Motors 6 | BOM | Triplex Alternator'), ['Mixed', true]);
assert.deepStrictEqual(result('Panel Type 2+3'), ['Mixed', true], 'positively associated multiple groups are Mixed, not summed');
assert.deepStrictEqual(result('Panel Type 2/3'), [null, false], 'alternative counts remain ambiguous');
assert.deepStrictEqual(result('No. Motors 1 | BOM | Duplex Alternator'), ['Simplex', true], 'only the controlled duplex part excludes Simplex');
assert.deepStrictEqual(result('PANEL DESCRIPTION | SIX PUMP | CONTROL PANEL | BOM | Triplex Alternator'), ['Mixed', true]);
assert.deepStrictEqual(result('PANEL DESCRIPTION | SIX PUMP | SPARE | CONTROL PANEL | BOM | Triplex Alternator'), ['Triplex', true],
    'mixed title detection never bridges arbitrary cells');
assert.deepStrictEqual(result('NOTES | SIX PUMP | CONTROL PANEL | Triplex Alternator'), [null, false]);
assert.deepStrictEqual(result('No. Motors 5'), [null, false], 'unsupported count alone is not Mixed');
assert.deepStrictEqual(result('Panel Type Duplex or Triplex'), [null, false], 'uncertainty alone is not Mixed');
assert.deepStrictEqual(result('BOM | Panel Type Simplex'), [null, false], 'BOM text is not an explicit row');
assert.deepStrictEqual(result('DUPLEX PUMP CONTROL PANEL | SYSTEM | SIMPLEX | No. Motors 2 | BOM | Triplex Alternator'),
    ['Duplex', true], 'motor-count selection remains orange');

const mixed = derive(cases.find(f => f.id === 'CP-1409').desc);
const report = parser.SystemTypeAudit.report({ records: [mixed] });
assert.strictEqual(report.types.Mixed.orange, 1);
assert.strictEqual(report.badge.mismatches, 0);
assert(mixed._sysEvidence.reasons.includes('mixed-installed-alternators'));
console.log(`Alternator fixtures passed; baseline classified coverage ${classified}/${baseline.length} preserved`);
