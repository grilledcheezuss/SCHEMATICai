// Panel-map lookup, font retention, handle sizing, save-overwrite, and page select.
// Run: node tests/panel-profiles.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const PanelProfiles = require('../panel-profiles');

const root = path.join(__dirname, '..');
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/panel-page-sample.json'), 'utf8'));
let assertions = 0;
function test(name, fn) {
    fn();
    assertions++;
    console.log('✓ ' + name);
}

PanelProfiles.reset();
PanelProfiles.install(sample, { unmapped: ['CP-3053', 'cp-3016r1'] });

test('lookup is case-insensitive and returns per-page zones', () => {
    const record = PanelProfiles.lookup('cp-3000');
    assert.ok(record && record.pages.length > 1);
    const cover = PanelProfiles.zonesFor('CP-3000', 1, null);
    const sheet = PanelProfiles.selectPage('cp-3000', 6);
    assert.ok(cover.length > 0);
    assert.equal(sheet.page, 6);
    assert.equal(sheet.class, 'SHEET');
    assert.notDeepEqual(cover.map(z => [z.x, z.y, z.w, z.h]), sheet.zones.map(z => [z.x, z.y, z.w, z.h]));
    assert.equal(PanelProfiles.lookup('CP-9999'), null);
});

test('Project Info becomes job + system type and keeps fontFamily and fontSize', () => {
    const cover = PanelProfiles.zonesFor('CP-3000', 1, null);
    const info = cover.find(zone => zone.map === 'job_block');
    assert.ok(info, 'project_info zone');
    assert.equal(info.text, null);
    assert.ok(info.fontFamily.includes('Arial') || info.fontFamily.includes('Times') || info.fontFamily.includes('Courier'));
    assert.ok(info.fontSize > 0 && info.fontSize < 80);
    const raw = sample['CP-3000'].pages[0].zones.find(zone => zone.field === 'project_info');
    assert.equal(info.fontFamily, raw.fontFamily);
    assert.equal(info.fontSize, raw.fontSize);
    assert.equal(PanelProfiles.alignMap(raw), 'job_block');
    for (const zone of cover) {
        assert.equal(typeof zone.fontFamily, 'string');
        assert.ok(zone.fontFamily.length > 0);
        assert.ok(zone.fontSize > 0);
    }
    const cpid = cover.find(zone => zone.map === 'cpid');
    const company = cover.find(zone => zone.map === 'company');
    assert.ok(cpid && company);
    assert.equal(cpid.fontFamily, sample['CP-3000'].pages[0].zones.find(zone => zone.map === 'cpid').fontFamily);
});

test('page select returns that page only', () => {
    const first = PanelProfiles.selectPage('CP-3000', 1);
    const later = PanelProfiles.selectPage('CP-3000', 9);
    assert.equal(first.page, 1);
    assert.equal(first.class, 'COVER');
    assert.equal(later.page, 9);
    assert.equal(later.class, 'SHEET');
    assert.ok(later.zones.length > 0);
    assert.ok(later.zones.every(zone => zone.fontFamily && zone.fontSize > 0));
    assert.notEqual(later.profileKey, first.profileKey);
});

test('text-tight boxes are placed exactly as measured (no trim, exact zones untouched)', () => {
    const raw = sample['CP-3000'].pages[0].zones;
    const tight = raw.find(zone => zone.h * 792 <= PanelProfiles.HANDLE_PX * 3);
    const roomy = raw.find(zone => zone.w * 612 > PanelProfiles.HANDLE_PX * 3 && zone.h * 792 > PanelProfiles.HANDLE_PX * 3);
    assert.ok(tight && roomy);
    const metrics = { width: 612, height: 792 };
    for (const zone of [tight, roomy]) {
        const box = PanelProfiles.overlayBox(zone, metrics);
        assert.deepEqual([box.x, box.y, box.w, box.h], [zone.x, zone.y, zone.w, zone.h]);
    }
    const exact = PanelProfiles.presentZone({ ...roomy, exact: true }, metrics, false);
    assert.deepEqual([exact.x, exact.y, exact.w, exact.h], [roomy.x, roomy.y, roomy.w, roomy.h]);
    const presented = PanelProfiles.presentZone(roomy, metrics, false);
    assert.deepEqual([presented.x, presented.y, presented.w, presented.h], [roomy.x, roomy.y, roomy.w, roomy.h]);
    assert.equal(presented.fontFamily, roomy.fontFamily);
    assert.equal(presented.fontSize, roomy.fontSize);
});

test('stage zones (PROJECT SUBMITTAL / AS-BUILT heading) present as the stage field', () => {
    const zone = { map: 'stage', field: 'stage', x: 0.33, y: 0.69, w: 0.31, h: 0.03, fontSize: 22, fontFamily: "'Times New Roman', Times, serif" };
    const presented = PanelProfiles.presentZone(zone, { width: 612, height: 792 }, false);
    assert.equal(presented.map, 'stage');
    assert.equal(presented.text, null);
    assert.equal(presented.fontSize, 22);
    assert.equal(PanelProfiles.alignMap(zone), 'stage');
});

test('save overwrites the selected page and leaves the other page', () => {
    const before = PanelProfiles.zonesFor('CP-3000', 1, null);
    const other = PanelProfiles.zonesFor('CP-3000', 9, null);
    const edited = before.map((zone, index) => index === 0 ? { ...zone, w: Math.min(0.9, zone.w + 0.02), h: zone.h } : zone);
    const saved = PanelProfiles.saveOverride('CP-3000', 1, edited);
    assert.equal(saved[0].w, edited[0].w);
    assert.equal(saved[0].fontFamily, before[0].fontFamily);
    assert.equal(saved[0].fontSize, before[0].fontSize);
    const after = PanelProfiles.zonesFor('cp-3000', 1, { width: 612, height: 792 });
    assert.equal(after[0].w, edited[0].w, 'saved geometry is not inset again');
    assert.equal(after[0].fontFamily, before[0].fontFamily);
    assert.deepEqual(PanelProfiles.zonesFor('CP-3000', 9, null), other);
    PanelProfiles.install({ 'CP-3001': { pages: [{ page: 1, class: 'COVER', profile_key: 'COVER_TEST', zones: [
        { map: 'cpid', field: 'cpid', x: 0.1, y: 0.1, w: 0.2, h: 0.02, fontSize: 9, fontFamily: 'Arial, Helvetica, sans-serif' }
    ] }] } });
    assert.equal(PanelProfiles.zonesFor('CP-3001', 1, null)[0].fontFamily, 'Arial, Helvetica, sans-serif');
    assert.equal(PanelProfiles.zonesFor('CP-3000', 1, null)[0].w, edited[0].w);
});

test('known-unmapped panels are the ones hidden when Submittal is on', () => {
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-3053'), true);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('cp-3016r1'), true);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-3000'), false);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-9000'), false);
});

test('shipped catalog is the full set and keeps fonts without stored text', () => {
    const index = JSON.parse(fs.readFileSync(path.join(root, 'PDFmapping/panel-index.json'), 'utf8'));
    assert.equal(index.schema, 'schematicai-panel-profiles/1');
    assert.equal(index.complete, true);
    assert.equal(index.count, 5858);
    assert.equal(index.ids.length, 5858);
    assert.ok(index.ids.includes('CP-3000'));
    assert.ok(index.ids.includes('CP-8378'));
    assert.ok(index.unmapped.includes('CP-3053'));
    assert.ok(index.unmapped.includes('CP-3337'));
    assert.ok(index.unmapped.includes('CP-3777')); // rebuild timeout: unmapped, hidden in Submittal
    assert.equal(PanelProfiles.shardFor('CP-8378'), 'PDFmapping/panels/cp-8000.json.gz');
    assert.equal(PanelProfiles.shardFor('cp-4062'), 'PDFmapping/panels/cp-4000.json.gz');
    const blob = JSON.stringify(index);
    assert.equal(blob.includes('dwg_path'), false);
    assert.equal(/\d{3}[-.)]\d{3}[-.]\d{4}/.test(blob), false);
    let packed = 0;
    for (const file of index.shards) {
        const shard = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, file))).toString());
        packed += Object.keys(shard).length;
        const encoded = JSON.stringify(shard);
        assert.equal(encoded.includes('"text"'), false, file);
        assert.equal(encoded.includes('dwg_path'), false, file);
        const sampleId = Object.keys(shard)[0];
        const zone = shard[sampleId].pages.flatMap(page => page.zones)[0];
        if (zone) {
            assert.equal(typeof zone.fontFamily, 'string');
            assert.ok(zone.fontSize > 0);
        }
    }
    assert.equal(packed, 5858);
    const early = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'PDFmapping/panels/cp-3000.json.gz'))).toString());
    const info = early['CP-3000'].pages[0].zones.find(entry => entry.field === 'project_info');
    assert.ok(info.fontFamily && info.fontSize > 0);
    const late = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'PDFmapping/panels/cp-8000.json.gz'))).toString());
    const lateZone = late['CP-8378'].pages.flatMap(page => page.zones).find(entry => entry.fontFamily && entry.fontSize);
    assert.ok(lateZone);
});

test('hide list keeps listed panels out of Submittal even when mapped', () => {
    const list = JSON.parse(fs.readFileSync(path.join(root, 'PDFmapping/submittal-hide.json'), 'utf8'));
    assert.equal(Array.isArray(list), true);
    assert.equal(list.includes('CP-8204'), false);
    assert.equal(list.includes('CP-3000R1'), true);
    assert.equal(list.includes('CP-3000'), false);
    PanelProfiles.noteHide(list);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-3000R1'), true);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-3001'), true);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-8204'), false);
    assert.equal(PanelProfiles.hiddenWhenSubmittal('CP-3000'), false);
});

console.log('PASS panel profiles: ' + assertions + ' assertions');
