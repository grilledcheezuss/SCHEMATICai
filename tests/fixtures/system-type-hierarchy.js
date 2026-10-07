const { cp8025, cp8374 } = require('./system-type-adjacent.js');

const cp1245 = 'BILL OF MATERIALS | C | C3SS110B-20 | CONTROL DIAGRAM | PANEL DESCRIPTION | 24 | %%USIMPLEX PUMP | POWER DIAGRAM | %%UCONTROL PANEL | RA-A-VP100RDG | No. Motors | Phase/HZ | Panel Type | Painted Steel | Simplex | DESCRIPTION | CP-1245r1';
const cp1409 = '%%UCONTROL PANEL | %%UFIVE PUMP | PANEL DESCRIPTION | POWER DIAGRAM | NO. MOTORS | PHASE/HZ | VOLTAGE | TRIPLEX ALTERNATOR | OL 3,4,5 | LIQUID LEVEL CONTROLLER | DUPLEX ALTERNATOR | FIVE PUMP | Drawing Title | CONTROL PANEL | CP-1409';

const baseline = [
    { id: 'CP-8025', desc: cp8025, expected: ['Duplex', false] },
    { id: 'CP-8374', desc: cp8374, expected: ['Simplex', false] },
    { id: 'cross-cell Duplex title', desc: 'TITLE | DUPLEX PUMP | CONTROL PANEL', expected: ['Duplex', true] },
    { id: 'cross-cell Triplex title', desc: 'TRIPLEX ALTERNATOR | CONTROL PANEL', expected: ['Triplex', true] },
    { id: 'nearby title context', desc: 'PANEL DESCRIPTION | DUPLEX PUMP | VOLTAGE 480 | CONTROL PANEL', expected: ['Duplex', true] },
    { id: 'explicit row wins', desc: 'Triplex Control Panel\nPanel Type Duplex', expected: ['Duplex', false] },
    { id: 'count-only stays orange', desc: 'No. Motors 2', expected: ['Duplex', true] }
];

module.exports = { baseline, cp1245, cp1409 };
