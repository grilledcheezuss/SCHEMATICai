// Worker MAIN CPU regressions (v2.5.112). Runs locally without credentials:
//   node tests/worker-cpu-budget.test.js
// CPU is measured with process.cpuUsage(); Cloudflare freezes Date.now() during execution, so the
// deployed Worker reports deterministic work counters instead (X-SCHEMATICA-MAIN-PARSED-*).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const pure = require('../worker/lib/extract.js');
const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
const env = { SHEETS_ENDPOINT: endpoint, AIRTABLE_READ_KEY: 'test-read', AIRTABLE_WRITE_KEY: 'test-write' };
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const cpuMs = fn => {
    const start = process.cpuUsage();
    const result = fn();
    const used = process.cpuUsage(start);
    return [(used.user + used.system) / 1000, result];
};

function cacheStore() {
    const data = new Map();
    return {
        data,
        match: async key => data.get(key.url)?.clone() || null,
        put: async (key, response) => { data.set(key.url, response.clone()); }
    };
}

function loadWorker(fetchImpl, cache = cacheStore()) {
    let source = fs.readFileSync(path.join(root, 'worker/worker.js'), 'utf8')
        .replace(/export\s+default\s*\{/, 'const worker = {');
    source += '\nmodule.exports = { worker, compileSheetSnapshot, extractSpecsStrict, VOLT_PRIORITY };';
    let now = Date.now();
    class Clock extends Date { static now() { return now; } }
    const sandbox = { module: { exports: {} }, console: { log() {}, warn() {}, error() {}, info() {} }, URL, URLSearchParams,
        Request, Response, Headers, Blob, Date: Clock, setTimeout, clearTimeout, AbortController,
        fetch: fetchImpl, caches: { default: cache }, counts: { normalizeSheetSpec: 0, compileSheetSnapshot: 0, extractSpecsStrict: 0 } };
    vm.runInNewContext(source, sandbox, { filename: 'worker.js' });
    vm.runInNewContext(`
        for (const name of Object.keys(counts)) {
            const original = globalThis[name];
            globalThis[name] = (...args) => { counts[name]++; return original(...args); };
        }
    `, sandbox);
    return { ...sandbox.module.exports, counts: sandbox.counts, advance: ms => { now += ms; },
        heal: value => { sandbox.healed = value; vm.runInNewContext('CACHE_HEALED = healed; CACHE_HEALED_TIME = Date.now();', sandbox); },
        expireHealer: () => vm.runInNewContext('CACHE_HEALED_TIME = 0;', sandbox) };
}

const columns = ['id', 'sys', 'panelType', 'volt', 'phase', 'mfg', 'hp', 'encMaterial', 'nema'];
function sheetPayload(rows, revision = 1) {
    return { ok: true, schema: 1, revision, hash: `hash-${revision}`, updatedAt: '2026-10-09T00:00:00Z',
        rowCount: rows.length, columns, rows, duplicates: [] };
}
const sheetRow = i => [String(1000 + i), 'Duplex', 'Standard', '480', '3/60', 'Barnes', '7.5', 'Fiberglass', '4X'];
function items(i, lines = 40) {
    const out = [`CP-${1000 + i} BARNES DUPLEX PUMP CONTROL PANEL`, `${[120, 208, 240, 480][i % 4]}V,${i % 2 ? 3 : 1}PH,60HZ`,
        `%%U${[2, 5, 7.5, 10][i % 4]}HP MOTOR`, 'CONTROL TRANSFORMER 480V-120VAC', 'NEMA 4X STAINLESS STEEL ENCLOSURE'];
    for (let k = 0; k < lines; k++) out.push(`ITEM ${k + 1}  QTY ${k % 4 + 1}  PART# ABC-${i * 7 + k}  CIRCUIT BREAKER ${k % 3 + 1}P ${15 + k}A`);
    return out.join('\n');
}

async function main() {
    // 1. Superlinear backtracking: these inputs took 0.2-5.5 s (cubic HP table / quadratic voltage
    // and phase separators) before v2.5.112 and must now be linear.
    const pathological = [];
    for (const head of ['HP', 'MOTOR HP', 'HORSEPOWER', 'VOLT', 'VOLTAGE', 'PHASE', 'PHASE/HZ', '480V', 'NEMA', 'TYPE']) {
        for (const filler of [' ', '\t', ' :', ': ', ' |', '-']) pathological.push(`${head}${filler.repeat(5000)}X`);
    }
    pathological.push('VOLT ' + '1'.repeat(20000) + 'X', 'GR'.repeat(20000), ' 4'.repeat(10000) + 'X');
    const workerHelpers = loadWorker(() => { throw new Error('No network expected'); });
    for (const text of pathological) {
        for (const [name, extract] of [['worker', workerHelpers.extractSpecsStrict], ['lib', pure.extractSpecsStrict]]) {
            const [ms] = cpuMs(() => extract(text));
            assert.ok(ms < 250, `${name} extraction of ${JSON.stringify(text.slice(0, 12))}... (${text.length} chars) took ${ms.toFixed(1)}ms`);
        }
    }

    // 2. The linear regex rewrites accept the same strings with the same match spans as the
    // pre-v2.5.112 sources (checked on short random strings where the old forms are fast).
    const oldTable = /\b(?:MOTOR\s+)?(?:HP|HORSEPOWER)\s*[:\s|]+\s*(\d+(?:\.\d+)?)\b/gi;
    const newTable = /\b(?:MOTOR\s+)?(?:HP|HORSEPOWER)[:\s|]+(\d+(?:\.\d+)?)\b/gi;
    const oldVolts = pure.VOLT_PRIORITY.map(v => new RegExp(v.match.source.split('\\s*(?:[:\\-]\\s*)?').join('\\s*[:\\-]?\\s*'), 'gi'));
    const newVolts = pure.VOLT_PRIORITY.map(v => new RegExp(v.match.source, 'gi'));
    assert.ok(oldVolts.every(r => r.source.includes('\\s*[:\\-]?\\s*')), 'reference voltage sources reconstructed');
    const oldPhase = [/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*3)\b/i, /\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*1)\b/i];
    const newPhase = [/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*(?:[:\-]\s*)?3)\b/i, /\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*(?:[:\-]\s*)?1)\b/i];
    const spans = (regex, text) => [...text.matchAll(regex)].map(m => [m.index, m[0], m[1]]);
    const oldMfgs = text => {
        const found = [];
        for (const [key, aliases] of Object.entries(pure.EXACT_MFGS)) {
            if (aliases.some(alias => new RegExp(`(?<=[^A-Z0-9]|^)${alias}(?=[^A-Z0-9]|$)`, 'i').test(text))) found.push(key);
        }
        return found;
    };
    const tokens = ['VOLT', 'VOLTS', 'VOLTAGE', 'PHASE', 'PHASE/HZ', 'HP', 'MOTOR', 'HORSEPOWER', ':', '-', '|', '/', '.', ' ', '  ', '\t', '\n',
        '480', '460', '240', '230', '220', '208', '120', '277', '575', '415', '1', '3', '7.5', 'V', 'VAC', 'PH', 'X',
        'barnes', 'Sulzer Pumps', 'GR', 'grsp', 'GODWIN SP', 'ABS', 'crane', 'ß', '_', 'é'];
    let seed = 2112;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 20000; i++) {
        let text = '';
        for (let k = 1 + Math.floor(random() * 16); k > 0; k--) text += tokens[Math.floor(random() * tokens.length)];
        assert.deepStrictEqual(spans(newTable, text), spans(oldTable, text), `HP table parity: ${JSON.stringify(text)}`);
        newVolts.forEach((regex, v) => assert.deepStrictEqual(spans(regex, text), spans(oldVolts[v], text), `voltage parity: ${JSON.stringify(text)}`));
        newPhase.forEach((regex, p) => assert.strictEqual(regex.test(text), oldPhase[p].test(text), `phase parity: ${JSON.stringify(text)}`));
        const expectedMfgs = oldMfgs(text);
        for (const extract of [workerHelpers.extractSpecsStrict, pure.extractSpecsStrict]) {
            const result = extract(text, ['mfg']);
            assert.deepStrictEqual([result.mfg, result.mfgV], [expectedMfgs[0] || null, expectedMfgs.length > 1], `mfg parity: ${JSON.stringify(text)}`);
        }
        assert.deepStrictEqual(JSON.parse(JSON.stringify(workerHelpers.extractSpecsStrict(text))), pure.extractSpecsStrict(text),
            `deployed/helper parity: ${JSON.stringify(text)}`);
    }

    // 3. Lazy canonical snapshot: validation and the ID index cover every row, but row specs are
    // normalized only when looked up, once.
    const bigRows = Array.from({ length: 20000 }, (_, i) => sheetRow(i));
    const lazy = loadWorker(() => { throw new Error('No network expected'); });
    const [compileMs, snapshot] = cpuMs(() => lazy.compileSheetSnapshot(sheetPayload(bigRows)));
    assert.strictEqual(lazy.counts.normalizeSheetSpec, 0, 'compiling 20k rows normalizes no specs eagerly');
    assert.strictEqual(snapshot.index.size, 20000);
    assert.strictEqual(snapshot.index.get('1005').hp, '7.5');
    assert.strictEqual(snapshot.metadata.get('1005').panelType, 'Standard');
    assert.strictEqual(snapshot.uncertainty.has('1005'), false);
    const perRow = lazy.counts.normalizeSheetSpec;
    assert.ok(perRow > 0 && perRow <= columns.length, 'one row normalized on demand');
    snapshot.index.get('1005');
    snapshot.metadata.get('1005');
    assert.strictEqual(lazy.counts.normalizeSheetSpec, perRow, 'row normalization is memoized');
    assert.throws(() => lazy.compileSheetSnapshot(sheetPayload([['CP-1', 'Duplex'].concat(Array(7).fill(''))].concat([[
        '1', 'Simplex', '', '', '', '', '', '', '']]))), /no unambiguous/, 'duplicate-only sheets are still rejected eagerly');
    console.log(`Lazy 20k-row snapshot compile: ${compileMs.toFixed(1)}ms`);

    // 4. MAIN caching keyed by canonical sheet identity and deterministic feedback content.
    let sheetText = JSON.stringify(sheetPayload(Array.from({ length: 7000 }, (_, i) => sheetRow(i))));
    let sheetCalls = 0;
    let mainCalls = 0;
    const page = { records: Array.from({ length: 100 }, (_, i) => ({ fields: { 'Control Panel Name': `CP-${1000 + i}`, Items: items(i) } }))
        .concat([{ fields: { 'Control Panel Name': 'CP-99999', Items: 'HP' + ' '.repeat(6000) + 'X SULZER 480V 3PH NEMA 4X' } }]),
        offset: 'itrA/rec1' };
    const fetchImpl = async url => {
        if (url === endpoint) { sheetCalls++; return new Response(sheetText); }
        if (url.includes('/Users')) return json({ records: [{ fields: { Username: 'user', Passcode: 'pass' } }] });
        if (url.includes('/Feedback')) return json({ records: [] });
        if (url.includes('/Control%20Panel%20Items')) { mainCalls++; return json(page); }
        throw new Error('Unexpected fetch');
    };
    const cache = cacheStore();
    const request = (worker, ctx) => worker.worker.fetch(new Request('https://worker.example/?target=MAIN&pageSize=100', {
        headers: { 'X-Cox-User': 'user', 'X-Cox-Pass': 'pass' }
    }), env, ctx);
    const first = loadWorker(fetchImpl, cache);
    const [, missPromise] = cpuMs(() => request(first));
    const miss = await missPromise;
    assert.strictEqual(miss.status, 200);
    assert.strictEqual(miss.headers.get('X-SCHEMATICA-MAIN-CACHE'), 'MISS');
    assert.strictEqual(miss.headers.get('X-SCHEMATICA-MAIN-SHEET-RECORDS'), '100');
    assert.strictEqual(miss.headers.get('X-SCHEMATICA-MAIN-PARSED-RECORDS'), '1', 'only the record missing from Sheets is parsed');
    assert.ok(Number(miss.headers.get('X-SCHEMATICA-MAIN-PARSED-CHARS')) > 6000);
    const missBody = await miss.json();
    assert.strictEqual(missBody.records[0].hp, '7.5', 'canonical sheet spec applied');
    assert.strictEqual(missBody.records[100].mfg, 'SULZER', 'missing-row fallback extraction preserved');
    assert.strictEqual(missBody.records[100].sheetSpecs, undefined);
    assert.strictEqual(missBody.sheets.revision, 1);
    const persisted = [...cache.data.entries()].find(([key]) => key.includes('__schematica_sheets_v1'))[1];
    assert.strictEqual(await persisted.clone().text(), sheetText, 'raw canonical body persisted verbatim (no re-serialization)');
    assert.ok(persisted.headers.get('X-SCHEMATICA-SHEETS-META'), 'sheet identity persisted in a header');

    // Cold isolate within the sheet freshness window: MAIN hit without parsing/compiling the sheet.
    const cold = loadWorker(fetchImpl, cache);
    const coldHit = await request(cold);
    assert.strictEqual(coldHit.headers.get('X-SCHEMATICA-MAIN-CACHE'), 'HIT');
    assert.strictEqual(cold.counts.compileSheetSnapshot, 0, 'cold-isolate MAIN hit never compiles the sheet');
    assert.strictEqual(sheetCalls, 1, 'cold isolate reuses the persisted sheet');
    assert.deepStrictEqual(await coldHit.json(), missBody);

    // Unchanged sheet refresh: string comparison only, no parse/compile; page cache keeps hitting.
    first.advance(5 * 60 * 1000 + 1);
    const compilesBefore = first.counts.compileSheetSnapshot;
    const refreshed = await request(first);
    assert.strictEqual(sheetCalls, 2);
    assert.strictEqual(first.counts.compileSheetSnapshot, compilesBefore, 'unchanged sheet body is not recompiled');
    assert.strictEqual(refreshed.headers.get('X-SCHEMATICA-MAIN-CACHE'), 'HIT');
    assert.strictEqual(mainCalls, 1);

    // Healer refreshes with identical overrides no longer invalidate MAIN pages (previously a
    // per-isolate counter incremented on every 10-minute refresh and diverged across isolates).
    first.expireHealer();
    assert.strictEqual((await request(first)).headers.get('X-SCHEMATICA-MAIN-CACHE'), 'HIT', 'identical feedback keeps MAIN cache');
    first.heal({ 1005: { category: 'low_voltage' } });
    const healedMiss = await request(first);
    assert.strictEqual(healedMiss.headers.get('X-SCHEMATICA-MAIN-CACHE'), 'MISS', 'changed feedback content invalidates MAIN cache');
    assert.strictEqual((await healedMiss.json()).records[5].category, 'low_voltage');
    const otherIsolate = loadWorker(fetchImpl, cache);
    otherIsolate.heal({ 1005: { category: 'low_voltage' } });
    assert.strictEqual((await request(otherIsolate)).headers.get('X-SCHEMATICA-MAIN-CACHE'), 'HIT',
        'isolates with the same feedback content share MAIN pages');

    // Changed sheet body: new identity, recompiled, MAIN recomputed with the new canonical value.
    sheetText = JSON.stringify(sheetPayload(Array.from({ length: 7000 }, (_, i) => [...sheetRow(i).slice(0, 6), '10', 'Fiberglass', '4X']), 2));
    first.advance(5 * 60 * 1000 + 1);
    const changed = await request(first);
    assert.strictEqual(changed.headers.get('X-SCHEMATICA-MAIN-CACHE'), 'MISS');
    const changedBody = await changed.json();
    assert.strictEqual(changedBody.sheets.revision, 2);
    assert.strictEqual(changedBody.records[0].hp, '10');

    // Corrupt persisted body with a plausible identity header: MAIN must not cache non-overlay
    // records under the canonical sheet key.
    const corruptCache = cacheStore();
    const sheetKey = [...cache.data.keys()].find(key => key.includes('__schematica_sheets_v1'));
    const goodEntry = cache.data.get(sheetKey);
    corruptCache.data.set(sheetKey, new Response('{"not":"a snapshot"}', { headers: goodEntry.headers }));
    const corrupt = loadWorker(fetchImpl, corruptCache);
    const corruptBody = await (await request(corrupt)).json();
    assert.strictEqual(corruptBody.sheets, null, 'unusable persisted snapshot leaves MAIN functional without overlay');
    assert.ok([...corruptCache.data.keys()].every(key => !key.includes('target=MAIN') || key.includes('sheetVersion=&')),
        'non-overlay page never stored under a sheet identity');

    // Informational end-to-end CPU for a cold isolate miss (7k-row sheet, 101 records).
    const measured = loadWorker(fetchImpl, cacheStore());
    const start = process.cpuUsage();
    await (await request(measured)).text();
    const used = process.cpuUsage(start);
    console.log(`Cold-isolate MAIN miss with 7k-row sheet and pathological record: ${((used.user + used.system) / 1000).toFixed(1)}ms CPU`);
    console.log('Worker CPU budget, linear regex parity, lazy snapshot and Sheets-first caching regressions passed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
