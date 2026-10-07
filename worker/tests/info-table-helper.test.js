const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const helper = require('../../info-table-helper.js');
const { extractSpecsStrict } = require('../lib/extract.js');

const cases = [
    ['Panel Type Duplex Voltage 480 Phase/HZ 3/60 No. Motors 2 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible', 'Duplex', false],
    ['SOLD TO TAG DUPLEX PUMP Panel Type Simplex Voltage 480 Phase/HZ 3/60 No. Motors 1 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible', 'Simplex', false],
    ['TITLE notes: incidental DUPLEX tags Panel Type Simplex Voltage 480 Phase/HZ 3/60 No. Motors 1 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible', 'Simplex', false],
    ['TAG: DUPLEX PUMP Panel Type Simplex Voltage 480 Phase/HZ 3/60 No. Motors 1 HP 15', 'Simplex', false],
    ['NOTES: incidental duplex reference\nPanel Type Simplex Voltage 480 Phase/HZ 3/60 No. Motors 1 HP 15', 'Simplex', false],
    ['SOLD TO TAG DUPLEX PUMP Panel Type Simplex No. Motors 2 + 1 HP 15', 'Simplex', true],
    ['A note mentions Panel Type Duplex and nothing resembling spec rows', null, false],
    ['NOTES: Panel Type Duplex', null, false],
    ['SOLD TO TAG DUPLEX PUMP Panel Type Simplex Voltage unknown Phase/HZ unknown', null, false],
    ['TAG Duplex Panel Type Simplex', 'Simplex', false],
    ['Panel Type Duplex TAG Pump-3 No. Motors 3', 'Duplex', false],
    ['System Type: Simplex', 'Simplex', false],
    ['SYSTEM TYPE | DUPLEX | NUMBER OF MOTORS | 2', 'Duplex', false],
    ['SYSTEM TYPE\nTRIPLEX\nNUMBER OF MOTORS\n3', 'Triplex', false],
    ['SYSTEM TYPE\n:\nTRIPLEX\nNUMBER OF MOTORS\n:\n3', 'Triplex', false],
    ['SYSTEM TYPE %%UQUADRUPLEX NUMBER OF MOTORS 4 MOTOR HP 7.5', 'Quadraplex', false],
    ['Pump Manufacturer: Barnes System Type: Duplex Number of Motors: 2 Voltage: 480', 'Duplex', false],
    ['CONTROL PANEL INFORMATION SYSTEM TYPE DUPLEX NUMBER OF MOTORS 2', 'Duplex', false],
    ['Panel Type: Duplex', 'Duplex', false],
    ['Panel Type\nTriplex\nNo. Motors\n3', 'Triplex', false],
    ['Panel Type | Quadruplex | No. Motors | 4', 'Quadraplex', false],
    ['Panel Type: Quadplex\nNo. Motors: 4', 'Quadraplex', false],
    ['Panel Type Duplex No. Motors 2 HP 15', 'Duplex', false],
    ...helper.SYSTEM_TYPES.flatMap((sys, index) => [
        [`Panel Type: ${sys}\nNo. Motors: ${index + 1}\nHP: 15`, sys, false],
        [`Panel Type | ${sys} | No. Motors | ${index + 1} | HP | 15`, sys, false],
        [`Panel Type\n${sys}\nNo. Motors\n${index + 1}\nHP\n15`, sys, false],
        [`Panel Type ${sys} No. Motors ${index + 1} HP 15`, sys, false],
        [`Panel Type: ${sys}\nNo. Motors: ${index + 1} + 1`, sys, true]
    ]),
    ['No. Motors 2\n+2\nHP 15', null, true],
    ['No. Motors 2\n\n+ 2 HP 15', null, true],
    ['No. Motors 2\n\n1 HP 15', null, true],
    ['No. Motors | 2 |\n\n+ 2 | HP 15', null, true],
    ['No. Motors 2\n \n \n+\n\n1 HP 15', null, true],
    ['Panel Type Duplex\nNo. Motors 2\n\n+ 2 HP 15', 'Duplex', true],
    ['Panel Type Duplex\nNo. Motors 2\n\n1 HP 15', 'Duplex', true],
    ['No. Motors 2\n\n+ 2 HP 15\nPanel Type Duplex', 'Duplex', true],
    ['No. Motors 2\n1 HP 15', null, true],
    ['No. Motors | 2 | + 2 | HP 15', null, true],
    ['No. Motors 2\nunknown continuation\nHP 15', null, true],
    ['No. Motors 2\nunknown continuation\nPanel Type Duplex', 'Duplex', true],
    ['Panel Type Duplex\nNOTES:\nNo. Motors 3', 'Duplex', false],
    ['Panel Type Duplex\nBOM\nNo. Motors 3', 'Duplex', false],
    ['Panel Type Duplex | TAGS | No. Motors 3', 'Duplex', false],
    ['Panel Type Duplex\nTAG:\nNo. Motors 3', 'Duplex', false],
    ['Panel Type Duplex\nWIRING DIAGRAM\nNo. Motors 3', 'Duplex', false],
    ['Panel Type Duplex NOTES: No. Motors 3', 'Duplex', false],
    ['notes: panel type duplex', null, false],
    ['BOM\n\nPanel Type Duplex', null, false],
    ['Panel Type Duplex\nSkipped Field: unrelated\nNo. Motors 3', 'Duplex', false],
    ['SYSTEM TYPE: DUPLEX\nNUMBER OF MOTORS: 3', 'Duplex', true],
    ['SYSTEM TYPE: SIMPLEX\nSYSTEM TYPE: DUPLEX', null, true],
    ['SYSTEM TYPE: DUPLEX\nSYSTEM TYPE: DUPLEX', 'Duplex', false],
    ['SYSTEM TYPE: DUPLEX\nNUMBER OF MOTORS: 2.0', 'Duplex', true],
    ['NUMBER OF MOTORS: 2\n+\n1\nSYSTEM TYPE: DUPLEX', 'Duplex', true],
    ['NUMBER OF MOTORS | 2 | + | 1 | SYSTEM TYPE | DUPLEX', 'Duplex', true],
    ['SYSTEM TYPE: DUPLEX\n\nNUMBER OF MOTORS: 3', 'Duplex', false],
    ['SYSTEM TYPE: DUPLEX\nUnrelated note\nNUMBER OF MOTORS: 3', 'Duplex', false],
    ['SYSTEM TYPE: DUPLEX\n\nNUMBER OF MOTORS: -1', 'Duplex', false],
    ['NUMBER OF MOTORS: 1', 'Simplex', true],
    ['NUMBER OF MOTORS | 2 | MOTOR HP | 5', 'Duplex', true],
    ['NUMBER OF MOTORS:\n4\nVOLTAGE: 480', 'Quadraplex', true],
    ['NUMBER OF MOTORS: 2 + 1', null, true],
    ['NUMBER OF MOTORS: 2\n+\n1', null, true],
    ['NUMBER OF MOTORS | 2 | + | 1', null, true],
    ['NUMBER OF MOTORS: 2\n1', null, true],
    ['NUMBER OF MOTORS: 2 - 1', null, true],
    ['NUMBER OF MOTORS: 2 / 1', null, true],
    ['NUMBER OF MOTORS: 2.5', null, true],
    ['NUMBER OF MOTORS: -2', null, true],
    ['NUMBER OF MOTORS: 0', null, true],
    ['NUMBER OF MOTORS: 5', null, true],
    ['NUMBER OF MOTORS: 2 to 3', null, true],
    ['NUMBER OF MOTORS: 2 +', null, true],
    ['NUMBER OF MOTORS:\nMOTOR HP: 3', null, true],
    ['SYSTEM TYPE:\nNUMBER OF MOTORS: 2', null, true],
    ['SYSTEM TYPE: duplex pumps', null, true],
    ['SYSTEM TYPE | DUPLEX | TRIPLEX', null, true],
    ['SYSTEM TYPE: DUPLEX\nTRIPLEX', null, true],
    ['Panel Type:\nDuplex\nTriplex\nSimplex\nHP: 15', null, true],
    ['System Type:\nDuplex\nTriplex\nSimplex\nHP: 15', null, true],
    ['Panel Type | Duplex | Triplex | Simplex | HP | 15', null, true],
    ['Panel Type:\nDuplex\nTriplex\nUnrelated text\nHP: 15', null, true],
    ['Please refer to System Type: Duplex for details', null, false],
    ['System Type should be Duplex', null, false],
    ['Notes mention Number of Motors: 3 as an example', null, false],
    ['A DUPLEX panel with 2 motors', null, false],
    ['', null, false]
];

function run() {
    for (const [desc, sys, sysV] of cases) {
        assert.deepStrictEqual(helper.extractSystemType(desc), { sys, sysV }, desc);
        const extracted = extractSpecsStrict(desc);
        assert.deepStrictEqual({ sys: extracted.sys, sysV: extracted.sysV }, { sys, sysV }, `lib parity: ${desc}`);
    }
    for (const value of ['Simplex suffix', 'Duplex + Triplex', 'Varied / Multiple', 'constructor', '__proto__', 2, {}, null]) {
        assert.strictEqual(helper.normalizeSystemType(value), null, `strict normalization: ${value}`);
    }
    assert.strictEqual(helper.normalizeSystemType(' quadruplex '), 'Quadraplex');
    assert.strictEqual(helper.normalizeSystemType(' quadplex '), 'Quadraplex');
    assert.deepStrictEqual(helper.resolveSystemType({ desc: 'System Type: Duplex', sys: null, sysV: false }), { sys: null, sysV: false });
    assert.deepStrictEqual(helper.resolveSystemType({ desc: 'System Type: Duplex', sys: 'nonsense', sysV: false }), { sys: null, sysV: true });
    assert.deepStrictEqual(helper.resolveSystemType({ sys: 'duplex' }), { sys: 'Duplex', sysV: true });
    assert.deepStrictEqual(helper.resolveSystemType({ desc: 'System Type: Duplex' }), { sys: 'Duplex', sysV: false });
    assert.deepStrictEqual(helper.resolveSystemType(Object.assign(Object.create({ sys: 'Simplex' }), { desc: 'System Type: Duplex' })), { sys: 'Duplex', sysV: false });
    const records = [
        { id: '15', desc: 'Panel Type Duplex Voltage 480 Phase/HZ 3/60 No. Motors 2 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible' },
        { id: '16', desc: 'SOLD TO TAG DUPLEX PUMP Panel Type Simplex Voltage 480 Phase/HZ 3/60 No. Motors 1 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible' },
        { id: '17', desc: 'Title and notes precede this table FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible' },
        { id: '19', desc: 'NOTES: unrelated prose FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible' },
        { id: '18', desc: 'NOTES: arbitrary Pump Manufacturer FLYGT prose' },
        { id: '1', desc: 'Pump Manufacturer: SITHE' },
        { id: '1', desc: 'Pump Manufacturer: BARNES' },
        { id: '2', desc: 'Pump Manufacturer | GORMAN-RUPP | Motor HP | 5' },
        { id: '3', desc: 'Pump Manufacturer\nGRSP\nSystem Type\nDuplex' },
        { id: '14', desc: 'Pump Manufacturer BARNES Type of Pump SUBMERSIBLE Panel Type Duplex No. Motors 2' },
        { id: '4', desc: 'FLYGT pump in notes' },
        { id: '5', desc: 'Motor Manufacturer: FLYGT' },
        { id: '6', desc: 'Please check Pump Manufacturer: FLYGT' },
        { id: '7', desc: 'Pump Manufacturer: FLYGT / BARNES' },
        { id: '8', desc: 'Pump Manufacturer: FLYGT\nPump Manufacturer: UNKNOWN' },
        { id: '9', desc: 'Pump Manufacturer: FLYGT\nPump Manufacturer: BARNES' },
        { id: '10', desc: 'Pump Manufacturer: ABSOLUTE' },
        { id: '11', desc: 'Pump Manufacturer: FLYGT' },
        { id: '11', desc: 'Pump Manufacturer: GOULDS' },
        { id: '12', desc: 'Pump Manufacturer | BARNES | UNKNOWN' },
        { id: '13', desc: 'Pump Manufacturer: BARNES\nFLYGT' },
        { id: '20', desc: 'Pump Manufacturer:\nBarnes\nFlygt\nMyers\nHP:15' },
        { id: '21', desc: 'Pump Manufacturer | Barnes | Flygt | Myers | HP | 15' },
        { id: '22', desc: 'Pump Manufacturer:\nBarnes\nFlygt\nUnrelated text\nHP:15' },
        { desc: 'Pump Manufacturer: FLYGT' }
    ];
    assert.deepStrictEqual(helper.rankManufacturers(records), {
        options: ['BARNES', 'GORMAN RUPP'], counts: { BARNES: 6, 'GORMAN RUPP': 2 }, eligibleRecords: 8
    });
    assert.deepStrictEqual(helper.rankManufacturers(records, ['BARNES']), {
        options: ['BARNES'], counts: { BARNES: 6 }, eligibleRecords: 6
    });
    const many = ['BARNES', 'FLYGT', 'GOULDS', 'MYERS', 'LIBERTY', 'WILO', 'EBARA', 'PENTAIR', 'ABS']
        .map((mfg, id) => ({ id, desc: `Pump Manufacturer: ${mfg}` }));
    assert.strictEqual(helper.rankManufacturers(many).options.length, 8);
    assert.deepStrictEqual(helper.rankManufacturers(many).options, ['ABS', 'BARNES', 'EBARA', 'FLYGT', 'GOULDS', 'LIBERTY', 'MYERS', 'PENTAIR']);
    const sandbox = {};
    vm.runInNewContext(fs.readFileSync(require.resolve('../../info-table-helper.js'), 'utf8'), sandbox);
    assert.strictEqual(sandbox.InfoTableHelper.extractSystemType('System Type: Duplex').sys, 'Duplex');
    console.log(`Info-table helper: ${cases.length} extraction cases, parity, strict resolution, ranking, browser export passed`);
}

module.exports = { run, cases };
if (require.main === module) run();
