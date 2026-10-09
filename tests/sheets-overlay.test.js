const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const parser = require('../info-table-parser.js');

const root = path.join(__dirname, '..');
const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const columns = ['panel_id', 'pump_manufacturer', 'horsepower', 'voltage', 'phase', 'nema_rating', 'system_type', 'enclosure_material'];
function payload(rows, revision = 1, hash = `hash-${revision}`) {
    return { ok: true, schema: 1, revision, hash, updatedAt: '2026-10-08T00:00:00Z',
        rowCount: rows.length, columns, rows, duplicates: [] };
}
function cacheStore() {
    const data = new Map();
    return {
        match: async key => data.get(key.url)?.clone() || null,
        put: async (key, response) => { data.set(key.url, response.clone()); }
    };
}
function loadWorker(fetchImpl, cache = cacheStore()) {
    let source = fs.readFileSync(path.join(root, 'worker/worker.js'), 'utf8')
        .replace(/export\s+default\s*\{/, 'const worker = {');
    source += '\nmodule.exports = { worker, compileSheetSnapshot, normalizeSheetPanelId, normalizeSheetSpec, applySheetSpecs, getSheetSnapshot };';
    let now = Date.now();
    class Clock extends Date { static now() { return now; } }
    const sandbox = { module: { exports: {} }, console, URL, URLSearchParams, Request, Response,
        Headers, Blob, Date: Clock, setTimeout, clearTimeout, AbortController,
        fetch: fetchImpl, caches: { default: cache } };
    vm.runInNewContext(source, sandbox, { filename: 'worker.js' });
    return { ...sandbox.module.exports, advance: ms => { now += ms; },
        heal: value => { sandbox.healed = value; vm.runInNewContext('CACHE_HEALED = healed; CACHE_HEALED_TIME = Date.now();', sandbox); } };
}
function extractClass(name) {
    const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const start = source.indexOf(`class ${name} {`);
    let depth = 0;
    for (let i = source.indexOf('{', start); i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}' && --depth === 0) return new Function(`return ${source.slice(start, i + 1)}`)();
    }
    throw new Error(`Missing class ${name}`);
}

async function run() {
    const helpers = loadWorker(() => { throw new Error('No network expected'); });
    for (const id of ['CP-1234R1', 'CP-1234r1', '1234r1.pdf', ' CP-1234r1.dwg!? ']) {
        assert.strictEqual(helpers.normalizeSheetPanelId(id), '1234R1');
    }
    assert.strictEqual(helpers.normalizeSheetPanelId('1234'), '1234');
    assert.strictEqual(helpers.normalizeSheetPanelId('1234R1R2'), null);

    const full = payload([['CP-1234r1', 'Sulzer Pumps', '7.5 HP', '460 VAC', '3 phase', 'NEMA 4X', 'Duplex', 'Fiberglass']]);
    const snapshot = helpers.compileSheetSnapshot(full);
    const baseline = { id: '1234R1', desc: 'PANEL TYPE: SIMPLEX\nENCLOSURE MATERIAL: STAINLESS STEEL\n5 HP 240V',
        mfg: 'BARNES', hp: '5', volt: '240', phase: '1', enc: '4XSS',
        hpV: true, mfgV: true, voltV: true, phaseV: true, encV: true,
        category: 'low_voltage', reject_keywords: ['noise'], pdfUrl: 'https://dl.airtable.com/test.pdf' };
    const record = helpers.applySheetSpecs({ ...baseline }, snapshot);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(record.sheetSpecs)), {
        mfg: 'SULZER', hp: '7.5', volt: '480', phase: '3', enc: '4X', sys: 'Duplex', encMaterial: 'Fiberglass'
    });
    for (const field of ['mfg', 'hp', 'volt', 'phase', 'enc']) assert.strictEqual(record[field + 'V'], false);
    assert.strictEqual(record.desc, baseline.desc);
    assert.strictEqual(record.pdfUrl, baseline.pdfUrl);
    assert.strictEqual(record.category, baseline.category);
    assert.strictEqual(record.reject_keywords, baseline.reject_keywords);
    assert.strictEqual(helpers.compileSheetSnapshot(full, snapshot), snapshot, 'unchanged revision/hash reuses index');

    const partial = helpers.compileSheetSnapshot(payload([['1234r1', '', 'Partial', '208', 'Multiple', 'N/A', 'Varies', 'Unknown']]));
    const partialRecord = helpers.applySheetSpecs({ ...baseline }, partial);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(partialRecord.sheetSpecs)), { volt: '208' });
    assert.strictEqual(partialRecord.hp, '5', 'missing specs retain parsed/healed fields');
    const missing = { ...baseline, id: '9999' };
    assert.strictEqual(helpers.applySheetSpecs(missing, snapshot), missing);
    assert.strictEqual(missing.sheetSpecs, undefined);
    assert.strictEqual(helpers.applySheetSpecs({ ...baseline, id: '1234' }, snapshot).sheetSpecs, undefined,
        'revision IDs never collapse into base IDs');

    for (const value of ['', '-', 'N/A', 'NA', 'Varies', 'Varied / Multiple', 'Multiple', 'Partial', 'TBD', 'Not Applicable', null, {}, '5 or 7.5']) {
        assert.strictEqual(helpers.normalizeSheetSpec('hp', value), null);
    }
    assert.strictEqual(helpers.normalizeSheetSpec('hp', '1/2 HP'), '0.5');
    assert.strictEqual(helpers.normalizeSheetSpec('hp', '1/0'), null);
    assert.strictEqual(helpers.normalizeSheetSpec('volt', '480/240'), null);
    for (const [value, expected] of [
        ['1/60', '1'], ['3/60', '3'], [' 1 / 60 ', '1'], [' 3 / 60 ', '3'],
        ['1', '1'], [3, '3'], ['1 PH', '1'], ['3 phase', '3'], ['1Ø', '1'],
        ['Single', '1'], ['Three', '3'],
        ['', null], ['N/A', null], ['Multiple', null], ['2/60', null],
        ['1/60/3', null], ['1/60 or 3/60', null], ['1/600', null], [null, null]
    ]) {
        assert.strictEqual(helpers.normalizeSheetSpec('phase', value), expected);
        const phaseSnapshot = helpers.compileSheetSnapshot(payload([['1234R1', '', '', '', value, '', '', '']]));
        const phaseRecord = helpers.applySheetSpecs({ ...baseline, phase: '3' }, phaseSnapshot);
        assert.strictEqual(phaseRecord.phase, expected || '3', 'valid sheet phase overrides; unusable phase falls back');
        assert.strictEqual(phaseRecord.phaseV, expected ? false : true);
    }
    assert.strictEqual(helpers.normalizeSheetSpec('mfg', '<img src=x>'), null);
    for (const value of ['Barnes & Sulzer', 'Barnes&SULZER', 'Barnes AND Sulzer', 'Barnes/Sulzer']) {
        assert.strictEqual(helpers.normalizeSheetSpec('mfg', value), null, 'manufacturer choices fall back');
    }
    const ratingOnly = helpers.compileSheetSnapshot(payload([['1234', '', '', '', '', 'NEMA 4X', '', '']]));
    const materialFallback = helpers.applySheetSpecs({
        id: '1234', enc: '4XSS', encV: false, desc: 'NEMA 4X STAINLESS STEEL ENCLOSURE'
    }, ratingOnly);
    parser.deriveRecord(materialFallback);
    assert.strictEqual(materialFallback.enc, '4X', 'sheet rating is canonical');
    assert.strictEqual(parser.matchEnclosureMaterial(materialFallback, 'Stainless Steel').matches, true,
        'rating-only overlay retains independent legacy material fallback');
    const restoredFallback = JSON.parse(JSON.stringify(materialFallback));
    parser.deriveRecord(restoredFallback);
    assert.strictEqual(parser.matchEnclosureMaterial(restoredFallback, 'Stainless Steel').matches, true,
        'independent material fallback survives snapshot restoration');
    const duplicates = helpers.compileSheetSnapshot(payload([
        ['CP-1234r1', 'Barnes', '', '', '', '', '', ''],
        ['1234R1', 'Sulzer', '', '', '', '', '', ''],
        ['9999', 'Flygt', '', '', '', '', '', '']
    ]));
    assert.strictEqual(duplicates.index.has('1234R1'), false);
    assert.strictEqual(duplicates.index.get('9999').mfg, 'FLYGT');
    const reportedDuplicates = helpers.compileSheetSnapshot({
        ...payload([full.rows[0], ['9999', 'Flygt', '', '', '', '', '', '']]),
        duplicates: [{ panelId: 'CP-1234R1', count: 2 }]
    });
    assert.strictEqual(reportedDuplicates.index.has('1234R1'), false, 'endpoint duplicate metadata is conservative');
    for (const invalid of [{ ...full, ok: false }, { ...full, rowCount: 2 }, { ...full, columns: ['hp'] },
        { ...full, rows: [[]] }, { ...full, revision: null }, { ...full, hash: '' }]) {
        assert.throws(() => helpers.compileSheetSnapshot(invalid));
    }

    parser.deriveRecord(record);
    assert.strictEqual(record._sys, 'Duplex');
    assert.strictEqual(record._sysV, false);
    assert.strictEqual(record._sysEvidence.source, 'sheet');
    assert.strictEqual(record._pumpMfg, 'SULZER');
    assert.deepStrictEqual(parser.resolveEnclosureMaterial(record), { materials: ['Fiberglass'], varied: false, source: 'sheet' });
    assert.strictEqual(parser.matchEnclosureMaterial(record, 'Stainless Steel').matches, false);
    const restored = JSON.parse(JSON.stringify(record));
    parser.deriveRecord(restored);
    assert.strictEqual(restored._sys, 'Duplex', 'sheet authority survives snapshot JSON restore');
    parser.deriveRecord(partialRecord);
    assert.strictEqual(partialRecord._sys, 'Simplex', 'missing sheet system uses existing parser');
    const VoltageMatcher = extractClass('VoltageMatcher');
    const HorsepowerMatcher = extractClass('HorsepowerMatcher');
    assert.strictEqual(VoltageMatcher.matches(record, '240').matches, false);
    assert.strictEqual(VoltageMatcher.matches(record, '480').matches, true);
    assert.strictEqual(HorsepowerMatcher.matches(record, '5').matches, false);
    assert.strictEqual(HorsepowerMatcher.matches(record, '7.5').matches, true);
    assert.strictEqual(HorsepowerMatcher.matches(baseline, '5').matches, true);

    let current = payload(full.rows.map(row => row.map((value, index) => index === 4 ? '1/60' : value)));
    let failed = false;
    let sheetCalls = 0;
    let mainCalls = 0;
    const cache = cacheStore();
    const fetchImpl = async url => {
        if (url === endpoint) {
            sheetCalls++;
            if (failed) throw new Error('Temporary outage');
            return json(current);
        }
        if (url.includes('/Users')) return json({ records: [{ fields: { Username: 'user', Passcode: 'pass' } }] });
        if (url.includes('/Feedback')) return json({ records: [] });
        if (url.includes('/Control%20Panel%20Items')) {
            mainCalls++;
            return json({ records: [{ fields: { 'Control Panel Name': 'CP-1234R1', Items: baseline.desc + '\n3 PHASE' } }] });
        }
        throw new Error('Unexpected fetch');
    };
    const loaded = loadWorker(fetchImpl, cache);
    const env = { SHEETS_ENDPOINT: endpoint, AIRTABLE_READ_KEY: 'test-read', AIRTABLE_WRITE_KEY: 'test-write' };
    const main = async (worker = loaded.worker) => {
        const response = await worker.fetch(new Request('https://worker.example/?target=MAIN', {
            headers: { 'X-Cox-User': 'user', 'X-Cox-Pass': 'pass' }
        }), env);
        assert.strictEqual(response.status, 200);
        return response.json();
    };
    loaded.heal({ '1234R1': { hp: '20', mfg: 'FLYGT', phase: '3', category: 'low_voltage', reject_keywords: ['noise'] } });
    const concurrent = await Promise.all([main(), main(), main()]);
    assert.strictEqual(sheetCalls, 1, 'concurrent requests share one sheet fetch');
    assert.strictEqual(mainCalls, 1, 'concurrent MAIN pages coalesce');
    assert.strictEqual(concurrent[0].records[0].hp, '7.5', 'sheet overrides healer canonical specs');
    assert.strictEqual(concurrent[0].records[0].phase, '1', 'first MAIN response uses sheet 1/60 over parsed/healed 3');
    assert.strictEqual(concurrent[0].records[0].sheetSpecs.phase, '1');
    assert.strictEqual(concurrent[0].records[0].phaseV, false);
    assert.strictEqual(concurrent[0].records[0].category, 'low_voltage');
    await main();
    assert.strictEqual(sheetCalls, 1, 'cache hit does not refetch sheet');
    loaded.advance(5 * 60 * 1000 + 1);
    await main();
    assert.strictEqual(sheetCalls, 2);
    assert.strictEqual(mainCalls, 1, 'unchanged revision keeps MAIN page cache');
    current = payload([['1234R1', '', '', '208', '', '', '', '']], 2);
    loaded.advance(5 * 60 * 1000 + 1);
    loaded.heal({ '1234R1': { hp: '20', phase: '3', category: 'low_voltage' } });
    const changed = await main();
    assert.strictEqual(changed.sheets.revision, 2);
    assert.strictEqual(changed.records[0].volt, '208');
    assert.strictEqual(changed.records[0].hp, '20', 'partial sheet retains healer fallback');
    assert.strictEqual(changed.records[0].phase, '3', 'missing sheet phase retains healer fallback');
    assert.strictEqual(mainCalls, 2, 'new revision bypasses old MAIN pages');
    current = { ...current, rows: [['1234R1', '', '', '575', '', '', '', '']], hash: 'changed-hash' };
    loaded.advance(5 * 60 * 1000 + 1);
    assert.strictEqual((await main()).records[0].volt, '575', 'hash changes invalidate even at same revision');
    failed = true;
    loaded.advance(5 * 60 * 1000 + 1);
    assert.strictEqual((await main()).records[0].volt, '575', 'outage uses last good');
    const attempts = sheetCalls;
    await main();
    assert.strictEqual(sheetCalls, attempts, 'outage retries are throttled');
    const cold = loadWorker(fetchImpl, cache);
    cold.advance(6 * 60 * 1000);
    assert.strictEqual((await main(cold.worker)).records[0].volt, '575', 'cold isolate recovers persisted last good');
    failed = false;
    current = { ...full, ok: false };
    loaded.advance(5 * 60 * 1000 + 1);
    assert.strictEqual((await main()).records[0].volt, '575', 'invalid payload cannot replace last good');
    failed = true;
    const empty = loadWorker(fetchImpl);
    assert.strictEqual((await main(empty.worker)).sheets, null, 'initial failure leaves MAIN functional');
    assert.strictEqual((await main(empty.worker)).records[0].phase, '3', 'unavailable sheet retains parsed phase');
    const disabled = await empty.getSheetSnapshot({}, 'https://worker.example/');
    assert.strictEqual(disabled, null);
    const unsafe = loadWorker(async () => { throw new Error('Must not fetch unsafe URL'); });
    assert.strictEqual(await unsafe.getSheetSnapshot({ SHEETS_ENDPOINT: 'http://localhost/private' }, 'https://worker.example/'), null);
    const redirect = loadWorker(async url => url === endpoint
        ? new Response(null, { status: 302, headers: { Location: 'https://script.googleusercontent.com/macros/echo?test=1' } })
        : json(full));
    assert.strictEqual((await redirect.getSheetSnapshot(env, 'https://worker.example/')).revision, 1);
    console.log('Sheets overlay, cache, MAIN, snapshot restore, and frontend matcher regressions passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
