const assert = require('assert');
const parser = require('../info-table-parser.js');
const { baseline, cp1245, cp1409 } = require('./fixtures/system-type-hierarchy.js');

assert.strictEqual(parser.DERIVED_REV, 10);

const derive = desc => {
    const record = { id: 'fixture', desc };
    parser.deriveRecord(record);
    return record;
};
const result = desc => {
    const record = derive(desc);
    return [record._sys, record._sysV];
};

for (const fixture of baseline) {
    assert.deepStrictEqual(result(fixture.desc), fixture.expected, fixture.id);
}
assert.deepStrictEqual(result(cp1245), ['Simplex', true], 'CP-1245r1 recovers as Simplex orange');
assert.deepStrictEqual(result(cp1409), [null, false], 'CP-1409 remains abstained');
assert.deepStrictEqual(result(cp1245.replace(' | POWER DIAGRAM | ', ' | UNRELATED CELL | ')), [null, false],
    'caption recovery does not accept arbitrary intervening cells');
assert.deepStrictEqual(result(cp1245.replace(' | PANEL DESCRIPTION | 24 | ', ' | NOTES | PANEL DESCRIPTION | 24 | ')), [null, false],
    'caption recovery requires a primary title anchor outside notes');

const agreement = derive('DUPLEX PUMP CONTROL PANEL | SYSTEM | DUPLEX');
assert.deepStrictEqual([agreement._sys, agreement._sysV, agreement._sysEvidence.direction],
    ['Duplex', false, 'system-line'], 'agreeing title and system line are higher confidence');
assert(agreement._sysEvidence.reasons.includes('title-system-line-agree'));

const selected = derive('DUPLEX PUMP CONTROL PANEL | SYSTEM | SIMPLEX | No. Motors 2');
assert.deepStrictEqual([selected._sys, selected._sysV, selected._sysEvidence.direction],
    ['Duplex', true, 'motor-count-tiebreak'], 'motor count selects only between primary candidates');
assert(selected._sysEvidence.reasons.includes('motor-count-selected-primary-candidate'));

assert.deepStrictEqual(result('SYSTEM | Simplex'), ['Simplex', true], 'system line alone remains orange');
assert.deepStrictEqual(result('DUPLEX PUMP CONTROL PANEL | SYSTEM | SIMPLEX'), [null, false],
    'conflicting primary candidates without a selecting count abstain');
assert.deepStrictEqual(result('DUPLEX PUMP CONTROL PANEL | SYSTEM | SIMPLEX | No. Motors 3'), [null, false],
    'count outside the competing candidates does not select');
assert.deepStrictEqual(result('DUPLEX PUMP CONTROL PANEL | SYSTEM | SIMPLEX | No. Motors 2 | Number of Motors 2+2'), [null, false],
    'non-plain count evidence cannot break a primary-candidate tie');

const explicit = derive('Panel Type Simplex | DUPLEX PUMP CONTROL PANEL | SYSTEM | Duplex | No. Motors 2');
assert.deepStrictEqual([explicit._sys, explicit._sysV, explicit._sysEvidence.source],
    ['Simplex', true, 'row'], 'clear explicit row remains primary over title, system line, and count');

for (const type of ['Simplex', 'Duplex', 'Triplex', 'Quadraplex']) {
    const resultType = parser.normalizeSystemType(type);
    assert.strictEqual(resultType, type);
}

console.log('System Type evidence hierarchy tests passed');
