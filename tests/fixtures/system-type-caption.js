const { cp8025, cp8374 } = require('./system-type-adjacent.js');

// Prior values are captured by running these records through the v2.5.108 parser.
const cp1245 = 'BILL OF MATERIALS | C | C3SS110B-20 | CONTROL DIAGRAM | PANEL DESCRIPTION | 24 | %%USIMPLEX PUMP | POWER DIAGRAM | %%UCONTROL PANEL | RA-A-VP100RDG | No. Motors | Phase/HZ | Panel Type | Painted Steel | Simplex | DESCRIPTION | CP-1245r1';
const cp1409 = '%%UCONTROL PANEL | %%UFIVE PUMP | PANEL DESCRIPTION | POWER DIAGRAM | NO. MOTORS | PHASE/HZ | VOLTAGE | TRIPLEX ALTERNATOR | OL 3,4,5 | LIQUID LEVEL CONTROLLER | DUPLEX ALTERNATOR | FIVE PUMP | Drawing Title | CONTROL PANEL | CP-1409';

const cases = [
    { id: 'CP-1245r1', desc: cp1245, before: [null, false], after: ['Simplex', true] },
    { id: 'CP-1409', desc: cp1409, before: [null, false], after: [null, false] },
    { id: 'CP-8025', desc: cp8025, before: ['Duplex', false], after: ['Duplex', false] },
    { id: 'CP-8374', desc: cp8374, before: ['Simplex', false], after: ['Simplex', false] },
    { id: 'cross-cell Duplex title', desc: 'TITLE | DUPLEX PUMP | CONTROL PANEL', before: ['Duplex', true], after: ['Duplex', true] },
    { id: 'cross-cell Triplex title', desc: 'TRIPLEX ALTERNATOR | CONTROL PANEL', before: ['Triplex', true], after: ['Triplex', true] },
    { id: 'nearby title context', desc: 'PANEL DESCRIPTION | DUPLEX PUMP | VOLTAGE 480 | CONTROL PANEL', before: ['Duplex', true], after: ['Duplex', true] }
];

module.exports = { cases, cp1245, cp1409 };
