// Run: node tests/system-type-caption.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parser = require('../info-table-parser.js');
const { cases, cp1245Excerpt, cp1409Excerpt } = require('./fixtures/system-type-caption.js');
const baseline = process.env.SYSTEM_TYPE_BASELINE ? require(process.env.SYSTEM_TYPE_BASELINE) : null;
const derive = (desc, using = parser) => {
    const record = { id: 'fixture', desc };
    using.deriveRecord(record);
    return record;
};
const classification = r => [r._sys, r._sysV];
const changes = [];
let checks = 0;
const compare = (id, before, after, r) => {
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({
        fixture: id, before, after, reasons: r._sysEvidence.reasons
    });
};
const expect = (desc, wanted) => {
    const r = derive(desc);
    assert.deepStrictEqual(classification(r), wanted, desc);
    checks++;
    if (baseline) compare(`synthetic-check-${checks}`, classification(derive(desc, baseline)), wanted, r);
};
for (const fixture of cases) {
    const r = derive(fixture.desc);
    assert.deepStrictEqual(classification(r), fixture.after, fixture.id);
    if (baseline) assert.deepStrictEqual(classification(derive(fixture.desc, baseline)), fixture.before, `${fixture.id} frozen baseline`);
    compare(fixture.id, fixture.before, fixture.after, r);
}
assert.strictEqual(derive(cp1245Excerpt)._sysEvidence.direction, 'caption-title');
assert(derive(cp1245Excerpt)._sysEvidence.reasons.includes('validated-caption-title'));
assert.strictEqual(derive(cp1409Excerpt)._sysEvidence.source, 'none');
assert(derive(cp1409Excerpt)._sysEvidence.reasons.includes('unsupported-primary-pump-title'));
expect(cp1245Excerpt.replace('%%USIMPLEX PUMP', 'UNTYPED PUMP'), [null, false]);
expect(cp1245Excerpt.replace(' | Simplex | ', ' | Triplex | '), ['Simplex', true]);

for (const [type, count] of [['Simplex', 1], ['Duplex', 2], ['Triplex', 3], ['Quadraplex', 4]]) {
    for (const equipment of ['PUMP', 'BLOWER', 'GRINDER']) {
        for (const caption of ['POWER DIAGRAM', 'CONTROL DIAGRAM']) {
            for (const reverse of [false, true]) {
                const cells = [`${type} ${equipment}`, caption, 'CONTROL PANEL'];
                if (reverse) cells.reverse();
                const title = `PANEL DESCRIPTION | 24 | ${cells.join(' | ')}`;
                expect(title, [type, true]);
                expect(title.replace(/ \| /g, '\n'), [type, true]);
                expect(title.replace(/ \| /g, '\r\n'), [type, true]);
                expect(title.toLowerCase().replace(type.toLowerCase(), `%%u${type.toLowerCase()}`), [type, true]);
                expect(title.replace('24', '99'), [type, true]);
                expect(`BILL OF MATERIALS | C3SS110B-20 | CONTROL DIAGRAM | ${title}`, [type, true]);
                expect(`${title} | No. Motors ${count} | Voltage 480`, [type, false]);
                expect(`${title} | Panel Type Duplex | Voltage 480`, ['Duplex', false]);
            }
        }
    }
    for (const gap of ['ARBITRARY', 'VOLTAGE 480', '24', 'CP-1234', 'NOTES', 'BILL OF MATERIALS', 'POWER DIAGRAM | CONTROL DIAGRAM']) {
        expect(`%%U${type} PUMP | ${gap} | %%UCONTROL PANEL`, [null, false]);
    }
    for (const prefix of ['NOT ', 'OTHER ', 'FOR OTHER PANEL ', 'SEE ', 'REFERENCE ', 'NON-']) {
        expect(`${prefix}${type} PUMP | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
        expect(`PANEL DESCRIPTION | ${prefix}${type} PUMP | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    }
    for (const suffix of ['-123', ' CP-1234', ' RECEPTACLE', ' OUTLET', ' ALTERNATOR']) {
        expect(`${type} PUMP${suffix} | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    }
    for (const equipment of ['PUMPS', 'BLOWERS', 'GRINDERS']) {
        expect(`${type} ${equipment} CONTROL PANEL`, [type, true]);
        expect(`${type} ${equipment} CONTROL PANEL | Voltage 480`, [type, true]);
    }
    expect(`${type} ALTERNATOR | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    expect(`NOTES | PANEL DESCRIPTION | ${type} PUMP | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    expect(`NOTES | HARmless | PANEL DESCRIPTION | ${type} PUMP | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    expect(`BILL OF MATERIALS | ${type} PUMP | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    expect(`${type} PUMP | ${' '.repeat(121)}POWER DIAGRAM | CONTROL PANEL`, [null, false]);
    expect(`${type} PUMP | | POWER DIAGRAM | CONTROL PANEL`, [null, false]);
}
expect('SIMPLEX PUMP | POWER DIAGRAM | CONTROL PANEL | TRIPLEX GRINDER | CONTROL DIAGRAM | CONTROL PANEL', [null, false]);
expect('SIMPLEX PUMP | POWER DIAGRAM | CONTROL PANEL | TRIPLEX', ['Simplex', true]);
expect('PUMP 1 | CONTROL PANEL | Painted Steel | Simplex', [null, false]);
expect('{\\rtf1\\ansi{\\fonttbl{\\f0\\fnil SIMPLEX;}}\\pard PUMP | POWER DIAGRAM | CONTROL PANEL}', [null, false]);
for (const equipment of ['STATION', 'WELL', 'SYSTEM']) {
    expect(`PANEL DESCRIPTION | DUPLEX ${equipment}`, ['Duplex', true]);
    expect(`DUPLEX ${equipment}`, [null, false]);
}
for (const count of ['FIVE', 'SIX', '5', '6']) {
    expect(`CONTROL PANEL | ${count} PUMP | PANEL DESCRIPTION | No. Motors 3`, [null, false]);
    expect(`${count} PUMP | POWER DIAGRAM | CONTROL PANEL | TRIPLEX ALTERNATOR | DUPLEX ALTERNATOR`, [null, false]);
    expect(`${count} PUMP CONTROL PANEL | No. Motors 2`, [null, false]);
    expect(`${count} PUMP CONTROL PANEL | Panel Type Duplex | Voltage 480`, ['Duplex', false]);
    for (const reverse of [false, true]) {
        const cells = [`${count} PUMP`, 'POWER DIAGRAM', 'CONTROL PANEL'];
        if (reverse) cells.reverse();
        expect(`TRIPLEX ALTERNATOR | ${cells.join(' | ')} | No. Motors 2`, [null, false]);
        for (const motors of [1, 2, 3, 4]) {
            expect(`${cells.join(' | ')} | TRIPLEX ALTERNATOR | No. Motors ${motors}`, [null, false]);
        }
    }
}
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(app.includes('const APP_VERSION = "v2.5.109";'));
assert(app.includes('"v2.5.108":'), 'historical release preserved');
assert(html.includes('name="app-version" content="v2.5.109"'));
assert(html.includes('SCHEMATICA ai (v2.5.109)'));
const assets = [...html.matchAll(/(?:src|href)="([^"]+\?v=([^"]+))"/g)];
assert(assets.length >= 6);
assert(assets.every(match => match[2] === '2.5.109'), 'all first-party versioned URLs aligned');
for (const file of ['README.txt', 'worker/API_DOCUMENTATION.md']) {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert(content.includes('v2.5.109') && content.includes('v2.5.97') && content.includes('DERIVED_REV 10'));
}

const audited = cases.slice(0, 4).map(f => ({ id: f.id, desc: f.desc, pdfUrl: 'https://example.test/private' }));
parser.deriveRecordsSync(audited);
const serialized = JSON.stringify(audited);
const report = parser.SystemTypeAudit.report({ records: audited });
assert.deepStrictEqual(report.states, { green: 2, orange: 1, absent: 1, conflicting: 0 });
assert.strictEqual(report.orangeCauses['title-caption-separated'], 1);
assert.strictEqual(report.absentReasons['unsupported-primary-pump-title'], 1);
assert.deepStrictEqual(report.badge, { renderer: 'parser-rule', checked: 3, mismatches: 0, errors: 0 });
assert(!JSON.stringify(report).includes('private'));
assert.strictEqual(JSON.stringify(audited), serialized);
if (baseline) {
    for (const f of cases.slice(0, 4)) {
        const old = derive(f.desc, baseline);
        const fresh = derive(f.desc);
        assert.deepStrictEqual([fresh._pumpMfg, fresh._encEvidence], [old._pumpMfg, old._encEvidence], `${f.id} non-System Type derivation unchanged`);
    }
}

(async () => {
    const records = Array.from({ length: 8000 }, (_, i) => ({ id: `synthetic-${i}`, desc: cases[i % cases.length].desc }));
    for (const r of records.slice(0, 4000)) Object.defineProperty(r, '_derivedRev', { value: 9, configurable: true });
    const raw = JSON.stringify(records);
    let yields = 0;
    const originalTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (callback, delay) => { yields++; return originalTimeout(callback, delay); };
    const start = Date.now();
    try { await parser.deriveRecords(records, { log: false }); } finally { globalThis.setTimeout = originalTimeout; }
    assert(yields >= 31, '250-record yielding retained');
    assert(records.every(r => r._derivedRev === 10));
    assert(records.every(r => parser.deriveRecord(r) === false), 'rederive once, not per search');
    assert.strictEqual(JSON.stringify(records), raw, 'raw snapshot JSON unchanged');
    assert(Date.now() - start < 15000, 'bounded 8k derivation');
    console.log(JSON.stringify({ fixtures: cases.length, additionalChecks: checks, changedClassifications: changes,
        preserved: cases.length + (baseline ? checks : 0) - changes.length, elapsed8kMs: Date.now() - start }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
