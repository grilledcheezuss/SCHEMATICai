const assert = require('assert');
const parser = require('../info-table-parser.js');
const { cases, cp1245, cp1409 } = require('./fixtures/system-type-caption.js');
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

for (const fixture of cases) {
    assert.deepStrictEqual(result(fixture.desc), fixture.after, fixture.id);
    if (fixture.before[0] !== null) {
        assert.deepStrictEqual(fixture.after, fixture.before, `${fixture.id} must preserve its v2.5.108 classification`);
    }
}

const recovered = derive(cp1245);
assert.deepStrictEqual([recovered._sys, recovered._sysV, recovered._sysEvidence.direction],
    ['Simplex', true, 'caption-title']);
assert(recovered._sysEvidence.reasons.includes('validated-caption-title'));
const unrelatedGap = derive(cp1245.replace(' | POWER DIAGRAM | ', ' | UNRELATED CELL | '));
assert.deepStrictEqual([unrelatedGap._sys, unrelatedGap._sysV], [null, false]);
assert(!unrelatedGap._sysEvidence.reasons.includes('validated-caption-title'));
assert.deepStrictEqual(result(cp1245.replace(' | PANEL DESCRIPTION | 24 | ', ' | NOTES | PANEL DESCRIPTION | 24 | ')), [null, false]);
assert.deepStrictEqual(result('PANEL DESCRIPTION | 24 | DUP PUMP | POWER DIAGRAM | CONTROL PANEL'), [null, false]);
assert.deepStrictEqual(result('PANEL DESCRIPTION | 24 | SIMPLEX | POWER DIAGRAM | CONTROL PANEL'), [null, false]);
const rtf = '{\\rtf1\\ansi{\\fonttbl{\\f0\\fnil DUPLEX;}}\\pard PANEL DESCRIPTION\\par 24\\par SIMPLEX PUMP\\par POWER DIAGRAM\\par CONTROL PANEL\\par}';
assert.deepStrictEqual(result(rtf), ['Simplex', true]);

const unsupported = derive(cp1409);
assert.deepStrictEqual([unsupported._sys, unsupported._sysV], [null, false]);
assert(unsupported._sysEvidence.reasons.includes('unsupported-primary-pump-title'));
assert.deepStrictEqual(parser.SYSTEM_TYPES.filter(type => result(cp1409)[0] === type), []);

for (const [type, count] of [['Simplex', 1], ['Duplex', 2], ['Triplex', 3], ['Quadraplex', 4]]) {
    const title = `PANEL DESCRIPTION | 24 | ${type.toUpperCase()} PUMP | POWER DIAGRAM | CONTROL PANEL`;
    assert.deepStrictEqual(result(title), [type, true], `${type} caption-separated title stays orange`);
    assert.deepStrictEqual(result(`${title} | No. Motors ${count}`), [type, false], `${type} caption title uses existing count corroboration`);
}

console.log('System Type caption recovery and baseline preservation tests passed');
