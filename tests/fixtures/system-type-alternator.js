const { baseline, cp1245, cp1409 } = require('./system-type-hierarchy.js');

const cases = [
    { id: 'triplex-description', desc: 'BOM | Triplex Alternator', before: [null, false], expected: ['Triplex', true] },
    { id: 'quadraplex-description', desc: 'BOM | qUaDrApLeX \t ALTERNATOR', before: [null, false], expected: ['Quadraplex', true] },
    { id: 'wrapped-description', desc: 'BILL OF MATERIALS | 1 MODEL-4 Triplex\nAlternator', before: [null, false], expected: ['Triplex', true] },
    { id: 'simplex-exclusion', desc: 'Simplex Pump Control Panel | BOM | arb-120-ada', before: ['Simplex', true], expected: [null, false] },
    { id: 'mixed-alternators', desc: 'BOM | Triplex Alternator | Quadraplex Alternator', before: [null, false], expected: ['Mixed', true] },
    { id: 'CP-1409', desc: cp1409, before: [null, false], expected: ['Mixed', true] }
];

module.exports = { baseline: [...baseline, { id: 'CP-1245r1', desc: cp1245, expected: ['Simplex', true] }], cases };
