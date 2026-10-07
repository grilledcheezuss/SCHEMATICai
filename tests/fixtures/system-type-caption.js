// Technical EXCERPTS assembled from supplied text, not full raw catalog records.
const cp1245Excerpt = `16x14x8 | NEMA 4 P.S. ENCLOSURE | DAF/CMS | 20 | 22 | 23 | 21 | 870P-N5 | SEPTEMBER 28, 2012 | AS BUILTS | %%UVIEW OF FRONT DOOR OF PANEL | EDWARD SIGNAL | 19 | %%UDAF/CMS | BILL OF MATERIALS | C | C3SS110B-20 | CONTROL DIAGRAM | PANEL DESCRIPTION | 24 | %%USIMPLEX PUMP | POWER DIAGRAM | %%UCONTROL PANEL | RA-A-VP100RDG | Alarm Light - Remote | Alarm Light - Panel Door Mount | Phase/HZ | HP | No. Motors | Alarm Light - Panel Top Mount | Audible Alarm - Piezzo | Elapsed Time Meters | Audible Alarm - Bell | Alarm Silence Switch | Audible Alarm - Horn | 277/480 | TAG: DAF/CMS | 3/60 | Self-Priming | 1.5 | Voltage | Panel Type | Flasher | SPECIAL NOTES: | Cycle Counters | Enclosure Size | Control Power Transformer VA = 150 | Control Sensor | Capacitors | Catalog Number | Inner Swing Panel | Pump Manufacturer | Starters - IEC | Enclosure Material | UL508A Labeling | Enclosure NEMA Rating | Alarm Test Switch | Alarm Acknowledge Switch | Alternator with Lead Pump Selector Switch | Green Run Lights vs. Red | Economy Version | Type of Pump | Control Voltage | Pole, Box, Seal | Phase Monitor | Seal Fail Lights | 120V | Floats | Painted Steel | Simplex | PROPER SEALS MUST BE INSTALLED EXTERNAL TO THE | Yes | DESCRIPTION | SCE-16P14 | BACKPLATE | %%UNOTE: | PANEL TO PREVENT ENTRY OF GASSES. | OTHER: | FLA | Ground Fault Receptacle | FS-2 | LEAD PUMP ON | FS-3 | P1 RUNLIGHT | FS-1 | ALL PUMPS OFF | %%U480V-120VAC | OL1 | 277/480V, 3%%C | %%U460V, 3%%C | MAIN SERVICE | %%UPUMP 1 | %%U1.5HP | CB1 | CP-1245r1`;
const cp1409Excerpt = `%%UPUMP 6 | %%U3HP | %%UNOTE: | PUMP 1 | PUMP 2 | 24 | %%UVIEW OF SWING PANEL | %%UNAMEPLATE SCHEDULE | PUMP 3 | PUMP 4 | PUMP 5 | TYPE OF PUMP | CAPACITORS | %%UBILL OF MATERIALS | CONTROL VOLTAGE | FLA | HP | ENCLOSURE MATERIAL | %%UOPTIONS: | CONTROL SENSOR | %%UCONTROL PANEL | %%UFIVE PUMP | PANEL DESCRIPTION | POWER DIAGRAM | NO. MOTORS | PHASE/HZ | VOLTAGE | MS 3,4,5 NEMA SIZE 3 | CB 3.4.5 | OL 1,2 (22-32A) | MS 1,2 NEMA SIZE 2 | 4X S.S. ENCLOSURE | BACK PLATE | CB 1,2 | TRANSFORMER | HOA SWITCH | LIGHTNING ARRESTOR | TRIPLEX ALTERNATOR | OL 3,4,5 (60-80A) | LIQUID LEVEL CONTROLLER | DUPLEX ALTERNATOR | P3 ETM | P4 RL | P4 MS | P3 MS | FLOATS SETTINGS | %%uTRANSDUCER & FLOATS SETTINGS | P3 = 1 SEC. | P1 = 4 SEC. | P5 = 3 SEC. | P4 = 2 SEC. | WHEN ALL THREE 50 HP | PUMPS ARE ON | 20 HP PUMPS | ALL PUMPS OFF | %%uFILTER TRANSFER PUMPS | 277/480V | 3/60 | BILL OF MATERIALS | No | 2 (20) 3 (50) 1(3) | ALTERNATOR | ADD PUMP 6 | 9/19/03 | FIVE PUMP | Drawing Title | CONTROL PANEL | CP-1409`;

// Paired synthetic transfer cases are grammar coverage, not new real misses.
const { cp8025, cp8374 } = require('./system-type-adjacent.js');
const cases = [
    { id: 'CP1245-excerpt', desc: cp1245Excerpt, before: [null, false], after: ['Simplex', true] },
    { id: 'CP1409-excerpt', desc: cp1409Excerpt, before: [null, false], after: [null, false] },
    { id: 'CP8025-preserved', desc: cp8025, before: ['Duplex', false], after: ['Duplex', false] },
    { id: 'CP8374-preserved', desc: cp8374, before: ['Simplex', false], after: ['Simplex', false] }
];
for (const [word, type] of [
    ['SIMPLEX', 'Simplex'], ['DUPLEX', 'Duplex'], ['TRIPLEX', 'Triplex'],
    ['QUADRAPLEX', 'Quadraplex'], ['QUADRUPLEX', 'Quadraplex'],
    ['QUADPLEX', 'Quadraplex'], ['QUAD', 'Quadraplex'], ['DUP', 'Duplex'],
    ['ONE PUMP', 'Simplex'], ['TWO PUMPS', 'Duplex'], ['THREE PUMPS', 'Triplex'], ['FOUR PUMPS', 'Quadraplex']
]) {
    const phrase = /PUMP/.test(word) ? word : `${word} PUMP`;
    for (const reverse of [false, true]) {
        const cells = reverse ? ['%%UCONTROL PANEL', 'POWER DIAGRAM', `%%U${phrase}`]
            : [`%%U${phrase}`, 'POWER DIAGRAM', '%%UCONTROL PANEL'];
        cases.push({
            id: `synthetic-${word}-${reverse ? 'reverse' : 'forward'}`,
            desc: `PANEL DESCRIPTION | 24 | ${cells.join(' | ')}`,
            before: [null, false], after: [type, true]
        });
    }
}
module.exports = { cp1245Excerpt, cp1409Excerpt, cases };
