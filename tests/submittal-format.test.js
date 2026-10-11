// Blank path, baked-vs-live zones, and cover/info address defaults.
// Run: node tests/submittal-format.test.js
const assert = require('node:assert/strict');
const SubmittalFormat = require('../submittal-format');

assert.equal(SubmittalFormat.relativePath('CP-8204'), 'CP8000-8999/CP8200-8299/CP-8204.pdf');
assert.equal(SubmittalFormat.relativePath('cp8204.pdf'), 'CP8000-8999/CP8200-8299/CP-8204.pdf');
assert.equal(SubmittalFormat.relativePath('CP-3000R1'), 'CP3000-3999/CP3000-3099/CP-3000R1.pdf');
assert.equal(SubmittalFormat.STAGE_DEFAULT, 'SUBMITTAL');
assert.equal(SubmittalFormat.COVER_LINES[0], 'Cox Research and Technology, Inc.');
assert.equal(SubmittalFormat.COVER_LINES[2], 'Baton Rouge, LA. 70816');
assert.equal(SubmittalFormat.INFO_LINES[0], 'P.O. Box 77808');
assert.equal(SubmittalFormat.INFO_LINES[2], '70879');

assert.equal(SubmittalFormat.skipWhenBlank({ map: 'logo', field: 'logo' }), true);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'stage', field: 'stage' }), true);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'custom', field: 'contact_block' }), true);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'date', field: 'date' }), false);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'serial', field: 'serial' }), false);
assert.equal(SubmittalFormat.skipWhenBlank({ map: 'job_block', field: 'project_info' }), false);
assert.equal(SubmittalFormat.isLive({ map: 'cust', field: 'customer_job' }), true);

assert.equal(
    SubmittalFormat.overlayText({ map: 'custom', field: 'contact_block' }, {}, 'COVER'),
    SubmittalFormat.COVER_LINES.join('\n')
);
assert.equal(
    SubmittalFormat.overlayText({ map: 'address', field: 'address' }, {}, 'INFO'),
    SubmittalFormat.INFO_LINES.slice(0, 3).join('\n')
);
assert.equal(SubmittalFormat.overlayText({ map: 'serial', field: 'serial' }, { serial: '104690' }, 'COVER'), '');
assert.equal(SubmittalFormat.overlayText({ map: 'logo', field: 'logo' }, {}, 'COVER'), '');
assert.equal(SubmittalFormat.overlayText({ map: 'stage', field: 'stage' }, { stage: '' }, 'COVER'), 'SUBMITTAL');
assert.equal(SubmittalFormat.overlayText({ map: 'cust', field: 'customer_job' }, { job: 'FORT POLK' }, 'INFO'), 'FORT POLK');
assert.equal(SubmittalFormat.overlayText({ map: 'job', field: 'job' }, { job: 'FORT POLK' }, 'COVER'), null);

const styled = SubmittalFormat.coverStyle({
    map: 'job_block', field: 'project_info', fontFamily: "'Courier New', monospace", textAlign: 'left'
}, 'COVER');
assert.match(styled.fontFamily, /Times/);
assert.equal(styled.textAlign, 'center');
assert.equal(styled.decoration, 'underline');
assert.equal(SubmittalFormat.labelFor('cust', 'customer_job'), 'Job');

(async () => {
    const originalFetch = global.fetch;
    try {
        let calls = 0;
        global.fetch = async () => {
            calls += 1;
            return new Response('Blank base not configured', { status: 404 });
        };
        SubmittalFormat.resetCache();
        assert.equal(await SubmittalFormat.fetchPdf('CP-8204', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8204' }), null);
        assert.equal(await SubmittalFormat.fetchPdf('CP-8205', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8205' }), null);
        assert.equal(calls, 1, 'not configured disables the worker probe');
        assert.equal(SubmittalFormat.workerState(), 'off');

        calls = 0;
        global.fetch = async () => {
            calls += 1;
            return new Response('unauthorized', { status: 401 });
        };
        SubmittalFormat.resetCache();
        assert.equal(await SubmittalFormat.fetchPdf('CP-8204', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8204' }), null);
        assert.equal(await SubmittalFormat.fetchPdf('CP-8300', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8300' }), null);
        assert.equal(calls, 1, '401 disables the worker probe');

        calls = 0;
        global.fetch = async (url) => {
            calls += 1;
            if (String(url).includes('CP-8204')) return new Response('Blank PDF not found', { status: 404 });
            return new Response(Buffer.from('%PDF-1.4\n'), { status: 200 });
        };
        SubmittalFormat.resetCache();
        assert.equal(await SubmittalFormat.fetchPdf('CP-8204', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8204' }), null);
        const hit = await SubmittalFormat.fetchPdf('CP-8205', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8205' });
        assert.ok(hit && hit.byteLength > 5, 'a missing blank does not disable other panels');
        assert.equal(calls, 2);
        assert.equal(SubmittalFormat.workerState(), 'on');

        calls = 0;
        global.fetch = async () => {
            calls += 1;
            return new Response(JSON.stringify({ error: 'unknown target' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        };
        SubmittalFormat.resetCache();
        assert.equal(await SubmittalFormat.fetchPdf('CP-8204', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8204' }), null);
        assert.equal(await SubmittalFormat.fetchPdf('CP-8205', { workerUrl: 'https://worker.example/?target=BLANK_PDF&id=CP-8205' }), null);
        assert.equal(calls, 1, 'json from an old worker disables the probe');
        assert.equal(SubmittalFormat.workerState(), 'off');
    } finally {
        global.fetch = originalFetch;
        SubmittalFormat.resetCache();
    }
    console.log('PASS submittal format');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
