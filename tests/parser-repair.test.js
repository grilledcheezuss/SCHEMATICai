// Run: node tests/parser-repair.test.js
const assert = require('assert');
const parser = require('../info-table-parser.js');
const fixtures = require('./fixtures/parser-repair.js');

function record(desc, enc = null) {
    const r = { desc, enc, encV: false };
    parser.deriveRecord(r);
    return r;
}
const material = desc => parser.deriveMaterialFromDesc(desc);
const sys = desc => {
    const result = parser.deriveFromDesc(desc);
    return [result.sys, result.sysV];
};

async function main() {
    const association = require('./fixtures/enclosure-association.js');
    for (const wanted of parser.ENCLOSURE_MATERIALS) {
        for (const cell of association.cells(wanted)) {
            const desc = association.description(cell);
            const r = record(desc, 'Varied / Multiple');
            assert.deepStrictEqual([...r._encEvidence.materials], [wanted], cell);
            assert.strictEqual(r._encEvidence.status, 'row', cell);
            assert.strictEqual(parser.matchEnclosureMaterial(r, wanted).matches, true, cell);
            for (const other of parser.ENCLOSURE_MATERIALS.filter(m => m !== wanted)) {
                assert.strictEqual(parser.matchEnclosureMaterial(r, other).matches, false, cell);
            }
            assert.deepStrictEqual(sys(desc), ['Duplex', false], 'System Type unchanged');
            assert.strictEqual(r._pumpMfg, 'SULZER', 'manufacturer unchanged');
        }
        for (const noise of ['N/A', 'Hardware', 'Stainless Steel screws', '28 2 OTHER 285-137 GROUND TERMINAL']) {
            const desc = `Phase Monitor ${wanted} Enclosure Material ${noise} Panel Heater / Thermostat W`;
            assert.notStrictEqual(material(desc).status, 'row', desc);
        }
        assert.strictEqual(material(`Phase Monitor ${wanted} Enclosure Material Steel Panel Heater / Thermostat W`).status, 'other');
        assert.strictEqual(material(`Enclosure Material CR1 5 ${wanted} HARDWARE Inner Swing Panel Yes`).status, 'unreadable');
    }
    for (const desc of [
        'Enclosure Material CR1 5 Stainless Steel or Painted Steel Inner Swing Panel Yes',
        'Phase Monitor CR1 5 Stainless Steel or Painted Steel Enclosure Material Enclosure Size'
    ]) {
        assert.deepStrictEqual([...material(desc).materials], ['Stainless Steel', 'Painted Steel'], desc);
        assert.strictEqual(material(desc).status, 'conflict', desc);
        assert.strictEqual(material(desc).varied, true, desc);
    }
    for (const desc of [
        'Enclosure Material CR1 5 AUTOMATIC MODE 12 Stainless Steel screws Inner Swing Panel Yes',
        'Enclosure Material CR1 5 AUTOMATIC MODE 12 Stainless Steel or Painted Steel Inner Swing Panel Yes',
        'Enclosure Material CR1 5 AUTOMATIC MODE 12 Painted Steel brackets Inner Swing Panel Yes'
    ]) assert.strictEqual(material(desc).status, 'unreadable', 'truncated cells cannot hide qualifiers');
    assert.deepStrictEqual([...material('Enclosure Material CR1 5 Painted Steel\n          Inner Swing Panel Yes').materials], ['Painted Steel'], 'real newline boundary within window');
    for (const [name, fixture] of Object.entries(fixtures)) {
        const wanted = name === 'cp8370' ? 'Fiberglass' : 'Stainless Steel';
        const opposite = wanted === 'Fiberglass' ? 'Stainless Steel' : 'Fiberglass';
        console.log(name, 'extracted:', parser.extractInfoRows(fixture.material).encMaterials);
        for (const enc of [null, 'Varied / Multiple', opposite === 'Fiberglass' ? '4XFG' : '4XSS']) {
            const r = record(`${fixture.material}\n${opposite} narrative`, enc);
            assert.deepStrictEqual([...r._encEvidence.materials], [wanted]);
            assert.strictEqual(parser.matchEnclosureMaterial(r, wanted).matches, true);
            assert.strictEqual(parser.matchEnclosureMaterial(r, opposite).matches, false);
            assert.strictEqual(parser.matchEnclosureMaterial(r, 'Painted Steel').matches, false);
            assert.strictEqual(r.enc, enc);
        }
        const narrative = record(fixture.narrative);
        assert.notStrictEqual(narrative._encEvidence.status, 'row');
        assert.strictEqual(parser.matchEnclosureMaterial(narrative, wanted).varied, true);
        const withoutCell = fixture.material.replace(wanted, '');
        const removed = record(`${fixture.narrative}\n${withoutCell}`);
        assert.strictEqual(removed._encEvidence.status, 'unreadable');
        assert.strictEqual(parser.matchEnclosureMaterial(removed, wanted).varied, true, 'removing cell cannot make narrative verified');
    }
    assert.deepStrictEqual(sys(`${fixtures.cp8370.panel}\n${fixtures.cp8370.motors}`), ['Duplex', true]);
    assert.deepStrictEqual(sys(`${fixtures.cp8328.panel}\n${fixtures.cp8328.motors}`), ['Duplex', false]);

    for (const value of ['2+2', '2+1', '4+2', '2 + Ex', '2 + fan', '2 AND AUX', '2 AUX', '2 FAN', '2.5', '2/1', '2-3', '-2', '12', '2 X 2']) {
        assert.strictEqual(parser.parseMotorCount(value), null, value);
        assert.deepStrictEqual(sys(`Panel Type Duplex No. Motors ${value}`), ['Duplex', true], value);
    }
    assert.deepStrictEqual(sys('Duplex Panel Type Cycle Counters No. Motors 2 Flasher'), ['Duplex', false]);
    assert.deepStrictEqual(sys('Panel Type Duplex No. Motors 2 A Flasher'), ['Duplex', true]);
    assert.deepStrictEqual(sys('Panel Type Duplex No. Motors 2 H A Flasher'), ['Duplex', false]);
    assert.deepStrictEqual(sys('TAG Duplex Panel Type Voltage 480'), [null, false]);
    assert.deepStrictEqual(sys('Duplex pump station Panel Type Voltage 480'), [null, false]);
    assert.deepStrictEqual(sys('Panel-Type Duplex No. Motors 2'), ['Duplex', false]);
    assert.deepStrictEqual(sys('Panel Type Duplex or Triplex No. Motors 2'), ['Duplex', true]);
    assert.deepStrictEqual(sys('Panel Type Duplex or Triplex No. Motors 1'), [null, false]);
    assert.deepStrictEqual(sys('No. Motors -2'), [null, false]);
    assert.strictEqual(parser.deriveFromDesc('Pump Manufacturer Sulzer Panel Heater / Thermostat W Yes').pumpMfg, 'SULZER');

    for (const value of ['FIBER-GLASS', 'PAINTED-STEEL', '304 S.S.', 'PAINTED\nSTEEL']) {
        assert.strictEqual(material(`Enclosure Material ${value} Inner Swing Panel Yes`).status, 'row', value);
    }
    for (const value of ['Polycarbonate', 'Steel', 'Carbon Steel', 'Aluminum']) {
        assert.strictEqual(material(`Enclosure Material ${value}`).status, 'other', value);
        assert.strictEqual(parser.matchEnclosureMaterial(record(`Enclosure Material ${value}`, '4XFG'), 'Fiberglass').matches, false);
    }
    for (const desc of [
        'Enclosure Material Panel Heater / Thermostat W Fiberglass',
        'Enclosure Material W = M2 23 AUTOMATIC',
        'Enclosure Material 28 2 WAGO 285-137 GROUND TERMINAL',
        'Enclosure Material Hardware Stainless Steel',
        'Enclosure Material Stainless Steel HARDWARE',
        'Enclosure Material Fiberglass BRACKETS',
        'Notes Fiberglass Enclosure Material Panel Heater / Thermostat W',
        'Enclosure NEMA Rating Stainless Enclosure Material Enclosure Size',
        'Enclosure NEMA Rating 4X Fiberglass Enclosure Material Panel Heater / Thermostat W',
        'Enclosure NEMA Rating 4X Fiberglass HARDWARE Enclosure Material Panel Heater / Thermostat W',
        'Enclosure NEMA Rating 4X STAINLESS HARDWARE Fiberglass Enclosure Material Panel Heater / Thermostat W',
        `Enclosure NEMA Rating 4X Fiberglass ${' '.repeat(200)}Enclosure Material Panel Heater / Thermostat W`
    ]) {
        assert.strictEqual(material(desc).status, 'unreadable', desc);
        assert.strictEqual(parser.matchEnclosureMaterial(record(desc, '4XFG'), 'Fiberglass').matches, true, 'unresolved preserves legacy');
    }
    for (const desc of [
        'Fiberglass | Enclosure Material | Panel Heater / Thermostat W',
        'Fiberglass\nEnclosure Material\nPanel Heater / Thermostat W',
        'Enclosure NEMA Rating 4X CR1 5 4 Fiberglass Enclosure Material Panel Heater / Thermostat W'
    ]) assert.deepStrictEqual([...material(desc).materials], ['Fiberglass'], desc);
    assert.strictEqual(material('Polycarbonate Enclosure Material Panel Heater / Thermostat W').status, 'other');
    assert.strictEqual(material('Fiberglass Enclosure Material Stainless Steel Panel Heater / Thermostat W').status, 'conflict');
    assert.strictEqual(material('Enclosure NEMA Rating 4X CR1 5 Fiberglass 28 2 WAGO 285-137 GROUND TERMINAL Enclosure Material Panel Heater / Thermostat W').varied, true);
    for (const suffix of ['28 2 OTHER 285-137 GROUND TERMINAL', '28 2 WAGO 285-137 GROUND TERMINAL Stainless Steel', '28 2 WAGO 285-137 BOLT']) {
        assert.strictEqual(material(`Enclosure NEMA Rating 4X Fiberglass ${suffix} Enclosure Material Panel Heater / Thermostat W`).status, 'unreadable', suffix);
    }
    assert.strictEqual(material('Enclosure NEMA Rating 4X Fiberglass Stainless Steel Enclosure Material Panel Heater / Thermostat W').status, 'unreadable', 'no arbitrary nearest winner');
    assert.strictEqual(material('Enclosure NEMA Rating 4X BILL OF MATERIALS Fiberglass Enclosure Material Panel Heater / Thermostat W').status, 'unreadable');
    assert.strictEqual(material('Enclosure NEMA Rating 4X CR1 5 Fiberglass Enclosure Material Panel Heater / Thermostat W | Enclosure Material Painted Steel').status, 'conflict');
    for (const preceding of ['4X Fiberglass', '4X Stainless Steel', '4X CR1 Fiberglass']) {
        const desc = `Enclosure NEMA Rating ${preceding} Enclosure Material Stainless Steel Panel Heater / Thermostat W`;
        assert.deepStrictEqual([...material(desc).materials], ['Stainless Steel'], 'clear forward row cannot borrow rating text');
        assert.strictEqual(material(desc).varied, false, 'clear forward row stays clean');
    }
    assert.deepStrictEqual([...material('Phase Monitor Fiberglass Enclosure Material Stainless Steel Panel Heater / Thermostat W').materials], ['Stainless Steel']);
    assert.strictEqual(material('Enclosure Material Fiberglass or Stainless Steel').varied, true);
    assert.strictEqual(material('Enclosure Material Fiberglass Enclosure Material Stainless Steel').status, 'conflict');
    assert.strictEqual(material('Enclosure Material Fiberglass Enclosure Material W = M2').varied, true);
    assert.strictEqual(material('Enclosure Material Stainless Steel Notes Fiberglass Enclosure Material Panel Heater / Thermostat W').varied, true);

    const records = Array.from({ length: 8000 }, (_, i) => ({
        id: String(i), desc: Object.values(i % 2 ? fixtures.cp8370 : fixtures.cp8328).join('\n'), enc: 'Varied / Multiple'
    }));
    Object.defineProperty(records[0], '_derivedRev', { value: 3, configurable: true });
    const raw = JSON.stringify(records);
    let yields = 0;
    const timing = await parser.deriveRecords(records, { yieldFn: async () => { yields++; }, log: false });
    assert.strictEqual(timing.derived, 8000);
    assert.strictEqual(yields, 31);
    assert.strictEqual(JSON.stringify(records), raw);
    assert.strictEqual(parser.deriveRecordsSync(records), 0);
    assert(records.every(r => r._derivedRev === parser.DERIVED_REV));
    console.log(`8k interleaved records: ${timing.ms}ms; ${yields} yields; raw JSON unchanged`);
    console.log('Parser repair regressions passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
