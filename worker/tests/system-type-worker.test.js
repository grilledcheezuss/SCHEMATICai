const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const helper = require('../../info-table-helper.js');
const { cases } = require('./info-table-helper.test.js');

function loadWorker(fetchImpl, cache = { match: async () => null, put: async () => {} }) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
        .replace("import InfoTableHelper from '../info-table-helper.js';", '')
        .replace(/export\s+default\s*\{/, 'const __worker_default = {') +
        '\nmodule.exports = { worker: __worker_default, extractSpecsStrict, buildMainCacheKey, NaiveBayes };';
    const sandbox = {
        InfoTableHelper: helper, module: { exports: {} }, console,
        URL, URLSearchParams, Request, Response, Headers, setTimeout, clearTimeout,
        AbortController, fetch: fetchImpl, caches: { default: cache }
    };
    vm.runInNewContext(source, sandbox, { filename: 'worker.js' });
    return sandbox.module.exports;
}

const env = { AIRTABLE_READ_KEY: 'test-read', AIRTABLE_WRITE_KEY: 'test-write' };
const headers = { 'X-Cox-User': 'tester', 'X-Cox-Pass': 'pass', 'Content-Type': 'application/json' };
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const votes = (id, sys, count = 3) => Array.from({ length: count }, () => ({
    fields: { 'Panel ID': id, Corrections: JSON.stringify({ sys }) }
}));

function harness(records, feedback = [], cache) {
    const posts = [];
    let mainCalls = 0;
    const fetch = async (url, init = {}) => {
        if (url.includes('/Users')) return response({ records: [{ fields: { Username: 'tester', Passcode: 'pass' } }] });
        if (url.includes('/Feedback')) {
            if (init.method === 'POST') {
                posts.push(JSON.parse(init.body));
                return response({ id: 'feedback-id' });
            }
            return response({ records: feedback });
        }
        if (url.includes('/Control%20Panel%20Items')) {
            mainCalls++;
            return response({ records, offset: 'next' });
        }
        throw new Error(`Unexpected upstream ${url}`);
    };
    const loaded = loadWorker(fetch, cache);
    const main = async () => {
        const res = await loaded.worker.fetch(new Request('https://worker.example/?target=MAIN&pageSize=100&sort[0][direction]=asc&offset=current', { headers }), env, { waitUntil: () => {} });
        assert.strictEqual(res.status, 200);
        return { res, data: await res.json() };
    };
    const submit = async body => loaded.worker.fetch(new Request('https://worker.example/?target=FEEDBACK', {
        method: 'POST', headers, body: JSON.stringify(body)
    }), env, { waitUntil: () => {} });
    return { loaded, posts, main, submit, getMainCalls: () => mainCalls };
}

async function run() {
    const noFetch = () => { throw new Error('parity must not fetch'); };
    const loaded = loadWorker(noFetch);
    for (const [desc, sys, sysV] of cases) {
        const specs = loaded.extractSpecsStrict(desc);
        assert.deepStrictEqual({ sys: specs.sys, sysV: specs.sysV }, { sys, sysV }, `Worker parity ${desc}`);
    }
    const models = new loaded.NaiveBayes();
    assert(!Object.prototype.hasOwnProperty.call(models.classCounts, 'sys'), 'System Type is never an ML category');
    const key = new URL(loaded.buildMainCacheKey('https://worker.example/?target=MAIN&user=ignored', {
        pageSize: 42, direction: 'asc', offset: 'next page', feedbackVersion: 7
    }));
    assert.deepStrictEqual(Object.fromEntries(key.searchParams), {
        target: 'MAIN', pageSize: '42', sortDirection: 'asc', offset: 'next page',
        feedbackVersion: '7', payloadRevision: '2.5.95'
    });

    const input = [
        ['clean', 'Panel Type Duplex Voltage 480 Phase/HZ 3/60 No. Motors 2 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible'],
        ['prefixed', 'SOLD TO TAG DUPLEX PUMP Panel Type Simplex Voltage 480 Phase/HZ 3/60 No. Motors 1 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible'],
        ['inferred', 'No. Motors: 3'],
        ['healed', 'Panel Type: Simplex\nNo. Motors: 2'],
        ['contested', 'Panel Type: Simplex'],
        ['invalid-votes', 'Panel Type: Duplex'],
        ['below-threshold', 'Panel Type: Duplex'],
        ['alias-votes', 'No. Motors: 1'],
        ['System Type: Duplex', 'Number of Motors:'],
        ['absent', 'Barnes 480V NEMA 4X']
    ].map(([id, desc]) => ({ fields: { 'Control Panel Name': id, Items: desc } }));
    const feedback = [
        ...votes('healed', 'Triplex'),
        ...votes('contested', 'Duplex'), ...votes('contested', 'Triplex'),
        ...votes('contested', 'Simplex'),
        ...votes('invalid-votes', 'Duplex extra'), ...votes('invalid-votes', null),
        ...votes('invalid-votes', 'Varied / Multiple'),
        ...votes('invalid-votes', 'constructor'), ...votes('below-threshold', 'Triplex', 2),
        ...votes('alias-votes', 'Quadruplex', 2), ...votes('alias-votes', 'QUADRAPLEX', 1),
        { fields: { 'Panel ID': 'clean', Corrections: JSON.stringify({ sysV: true }) } }
    ];
    const h = harness(input, feedback);
    const { data } = await h.main();
    const actual = data.records.map(({ id, sys, sysV }) => [id, sys, sysV]);
    assert.deepStrictEqual(actual, [
        ['clean', 'Duplex', false], ['prefixed', 'Simplex', false], ['inferred', 'Triplex', true], ['healed', 'Triplex', false],
        ['contested', null, true], ['invalid-votes', 'Duplex', false],
        ['below-threshold', 'Duplex', false], ['alias-votes', 'Quadraplex', false],
        ['System Type: Duplex', null, true], ['absent', null, false]
    ]);
    assert.strictEqual(data.offset, 'next');
    for (const sys of ['Duplex extra', 'Simplex + Duplex', 'Varied / Multiple', 2, null, {}, 'constructor', '__proto__']) {
        const res = await h.submit({ fields: { 'Panel ID': 'clean', Corrections: JSON.stringify({ sys }) } });
        assert.strictEqual(res.status, 400, `reject submitted ${JSON.stringify(sys)}`);
    }
    assert.strictEqual(h.posts.length, 0, 'Invalid corrections never reach Airtable');
    const canonical = await h.submit({ fields: { 'Panel ID': 'clean', Corrections: JSON.stringify({ sys: ' quadruplex ', sysV: true, hp: '2' }) } });
    assert.strictEqual(canonical.status, 200);
    assert.deepStrictEqual(JSON.parse(h.posts[0].fields.Corrections), { sys: 'Quadraplex', hp: '2' });
    const bulk = await h.submit({ records: [{ fields: { 'Panel ID': 'clean', Corrections: JSON.stringify({ sys: 'dUpLeX' }) } }] });
    assert.strictEqual(bulk.status, 200);
    assert.strictEqual(JSON.parse(h.posts[1].records[0].fields.Corrections).sys, 'Duplex');
    const ordinary = await h.submit({ fields: { 'Panel ID': 'clean', Corrections: JSON.stringify({ hp: '7.5' }) } });
    assert.strictEqual(ordinary.status, 200, 'Existing correction behavior preserved');

    const cacheKeys = [];
    const cache = {
        match: async request => {
            const url = new URL(request.url);
            cacheKeys.push(url);
            if (!url.searchParams.has('payloadRevision')) return response({ records: [{ id: 'old' }] });
            return null;
        },
        put: async () => {}
    };
    const cacheHarness = harness(input.slice(0, 1), [], cache);
    const cached = await cacheHarness.main();
    assert.strictEqual(cacheKeys[0].searchParams.get('payloadRevision'), '2.5.95');
    assert.strictEqual(cached.res.headers.get('X-SCHEMATICA-MAIN-CACHE'), 'MISS');
    assert.strictEqual(cached.data.records[0].sys, 'Duplex');
    assert.strictEqual(cacheHarness.getMainCalls(), 1, 'Old payload is not reused');
    assert.strictEqual(cacheKeys[0].searchParams.get('pageSize'), '100');
    assert.strictEqual(cacheKeys[0].searchParams.get('sortDirection'), 'asc');
    assert.strictEqual(cacheKeys[0].searchParams.get('offset'), 'current');

    // Node's ESM/CJS interop supplies the same default used by Wrangler's bundler.
    const imported = await import('../../info-table-helper.js');
    assert.strictEqual(imported.default, helper);
    console.log(`Worker System Type: ${cases.length} parity cases, MAIN, healer, corrections, cache revision, default import passed`);
}

module.exports = { run };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
