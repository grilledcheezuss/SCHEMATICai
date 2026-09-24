const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function loadWorker(fetchImpl) {
    const workerPath = path.join(__dirname, '..', 'worker', 'worker.js');
    let source = fs.readFileSync(workerPath, 'utf8');
    source = source.replace(/export\s+default\s*\{/, 'const __worker_default = {');
    source += '\nmodule.exports = __worker_default;\n';

    const sandbox = {
        module: { exports: {} },
        exports: {},
        console,
        URL,
        URLSearchParams,
        Request,
        Response,
        Headers,
        setTimeout,
        clearTimeout,
        AbortController,
        fetch: fetchImpl,
        caches: {
            default: {
                match: async () => null,
                put: async () => {}
            }
        }
    };

    vm.runInNewContext(source, sandbox, { filename: 'worker.js' });
    return sandbox.module.exports;
}

function makeMainRequest() {
    return new Request('https://worker.example/?target=MAIN&pageSize=1', {
        headers: {
            'X-Cox-User': 'valid-user',
            'X-Cox-Pass': 'valid-pass'
        }
    });
}

function makeEnv(overrides = {}) {
    return {
        AIRTABLE_READ_KEY: 'read-token',
        AIRTABLE_WRITE_KEY: 'write-token',
        ...overrides
    };
}

function createFetchHarness(options = {}) {
    const {
        usersStatus = 200,
        feedbackReadStatus = 200,
        mainStatus = 200,
        pdfLookupStatus = 200
    } = options;
    const calls = [];
    const fetchStub = async (input, init = {}) => {
        const method = (init.method || 'GET').toUpperCase();
        const url = typeof input === 'string' ? input : input.url;
        const headers = new Headers(init.headers || (typeof input === 'object' && input.headers) || {});
        const body = init.body;
        calls.push({ url, method, headers, body });

        if (url.startsWith('https://api.airtable.com/v0/app88zF2k4FgjU8hK/Users')) {
            if (usersStatus !== 200) return jsonResponse({ error: 'users failure' }, usersStatus);
            return jsonResponse({
                records: [{ fields: { Username: 'valid-user', Passcode: 'valid-pass' } }]
            });
        }

        if (url.startsWith('https://api.airtable.com/v0/app88zF2k4FgjU8hK/Feedback')) {
            if (method === 'POST') return jsonResponse({ id: 'rec_feedback' }, 200);
            if (feedbackReadStatus !== 200) return jsonResponse({ error: 'feedback failure' }, feedbackReadStatus);
            return jsonResponse({ records: [] });
        }

        if (url.startsWith('https://api.airtable.com/v0/appgc1pbuOgmODRpj/Control%20Panel%20Items')) {
            const parsed = new URL(url);
            if (parsed.searchParams.has('filterByFormula')) {
                if (pdfLookupStatus !== 200) return jsonResponse({ error: 'pdf lookup failure' }, pdfLookupStatus);
                return jsonResponse({
                    records: [{
                        fields: {
                            'Control Panel Name': 'CP-1234',
                            'Control Panel PDF': [{ url: 'https://dl.airtable.com/.attachments/abc123/test.pdf' }]
                        }
                    }]
                });
            }
            if (mainStatus !== 200) return jsonResponse({ error: 'main failure' }, mainStatus);
            return jsonResponse({
                records: [{
                    fields: {
                        'Control Panel Name': 'CP-1000',
                        'Items': 'Sample control panel item',
                        'Control Panel PDF': [{ url: 'https://dl.airtable.com/.attachments/abc123/test.pdf' }]
                    }
                }]
            });
        }

        if (url.startsWith('https://dl.airtable.com/')) {
            return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Length': '4'
                }
            });
        }

        throw new Error(`Unhandled fetch URL in test harness: ${url}`);
    };

    return { fetchStub, calls };
}

(async () => {
    console.log('🧪 Testing Airtable token/header routing regression coverage');

    {
        const { fetchStub, calls } = createFetchHarness();
        const worker = loadWorker(fetchStub);
        const env = makeEnv();
        const response = await worker.fetch(makeMainRequest(), env, { waitUntil: () => {} });
        assert(response.status === 200, 'MAIN request should succeed');

        const usersGet = calls.find((c) => c.url.includes('/app88zF2k4FgjU8hK/Users') && c.method === 'GET');
        const feedbackGet = calls.find((c) => c.url.includes('/app88zF2k4FgjU8hK/Feedback') && c.method === 'GET');
        const mainGet = calls.find((c) => c.url.includes('/appgc1pbuOgmODRpj/Control%20Panel%20Items') && c.method === 'GET' && !new URL(c.url).searchParams.has('filterByFormula'));

        assert(usersGet, 'Users-table GET should be issued');
        assert(feedbackGet, 'Feedback/healer GET should be issued');
        assert(mainGet, 'MAIN table GET should be issued');

        assert(usersGet.headers.get('Authorization') === ('Bearer ' + env.AIRTABLE_WRITE_KEY), 'Users-table GET should use AIRTABLE_WRITE_KEY');
        assert(feedbackGet.headers.get('Authorization') === ('Bearer ' + env.AIRTABLE_WRITE_KEY), 'Feedback/healer GET should use AIRTABLE_WRITE_KEY');
        assert(mainGet.headers.get('Authorization') === ('Bearer ' + env.AIRTABLE_READ_KEY), 'MAIN GET should use AIRTABLE_READ_KEY');
    }

    {
        const { fetchStub, calls } = createFetchHarness();
        const worker = loadWorker(fetchStub);
        const env = makeEnv();
        const response = await worker.fetch(new Request('https://worker.example/?target=PDF_BY_ID&id=CP-1234'), env, { waitUntil: () => {} });
        assert(response.status === 200, 'PDF_BY_ID request should succeed');

        const pdfLookup = calls.find((c) => c.url.includes('/appgc1pbuOgmODRpj/Control%20Panel%20Items') && new URL(c.url).searchParams.has('filterByFormula'));
        assert(pdfLookup, 'PDF_BY_ID should query MAIN Airtable base');
        assert(pdfLookup.headers.get('Authorization') === ('Bearer ' + env.AIRTABLE_READ_KEY), 'PDF_BY_ID lookup should use AIRTABLE_READ_KEY');
    }

    {
        const { fetchStub, calls } = createFetchHarness();
        const worker = loadWorker(fetchStub);
        const env = makeEnv();
        const response = await worker.fetch(new Request('https://worker.example/?target=FEEDBACK', {
            method: 'POST',
            headers: {
                'X-Cox-User': 'valid-user',
                'X-Cox-Pass': 'valid-pass',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: { 'Panel ID': '1234', Corrections: '{}' } })
        }), env, { waitUntil: () => {} });
        assert(response.status === 200, 'FEEDBACK POST should succeed');

        const feedbackPost = calls.find((c) => c.url.includes('/app88zF2k4FgjU8hK/Feedback') && c.method === 'POST');
        assert(feedbackPost, 'FEEDBACK POST call should be issued');
        assert(feedbackPost.headers.get('Authorization') === ('Bearer ' + env.AIRTABLE_WRITE_KEY), 'FEEDBACK POST should use AIRTABLE_WRITE_KEY');
        assert(String(feedbackPost.headers.get('Content-Type')).toLowerCase() === 'application/json', 'FEEDBACK POST should include Content-Type: application/json');
    }

    {
        const { fetchStub } = createFetchHarness();
        const worker = loadWorker(fetchStub);
        const response = await worker.fetch(makeMainRequest(), makeEnv({ AIRTABLE_WRITE_KEY: '' }), { waitUntil: () => {} });
        const payload = await response.json();
        assert(response.status === 500, 'Missing AIRTABLE_WRITE_KEY should fail clearly');
        assert(payload.error === 'AirtableCredentialConfigurationError', 'Missing AIRTABLE_WRITE_KEY should return credential configuration error type');
        assert(payload.scope === 'WorkerConfig', 'Missing AIRTABLE_WRITE_KEY should identify worker configuration scope');
        assert(String(payload.message || '').includes('missing AIRTABLE_WRITE_KEY'), 'Missing AIRTABLE_WRITE_KEY error should be explicit');
    }

    {
        const { fetchStub } = createFetchHarness();
        const worker = loadWorker(fetchStub);
        const response = await worker.fetch(new Request('https://worker.example/?target=PDF_BY_ID&id=CP-1234'), makeEnv({ AIRTABLE_READ_KEY: '' }), { waitUntil: () => {} });
        const payload = await response.json();
        assert(response.status === 500, 'Missing AIRTABLE_READ_KEY should fail clearly');
        assert(payload.error === 'AirtableCredentialConfigurationError', 'Missing AIRTABLE_READ_KEY should return credential configuration error type');
        assert(payload.scope === 'WorkerConfig', 'Missing AIRTABLE_READ_KEY should identify worker configuration scope');
        assert(String(payload.message || '').includes('missing AIRTABLE_READ_KEY'), 'Missing AIRTABLE_READ_KEY error should be explicit');
    }

    {
        const { fetchStub } = createFetchHarness({ usersStatus: 403 });
        const worker = loadWorker(fetchStub);
        const response = await worker.fetch(makeMainRequest(), makeEnv(), { waitUntil: () => {} });
        const payload = await response.json();
        assert(response.status === 500, 'Users 403 should not be treated as a transient 503 outage');
        assert(payload.error === 'AirtableCredentialConfigurationError', 'Users 403 should map to credential configuration error type');
        assert(payload.scope === 'Users', 'Users 403 should identify Users scope');
        assert(payload.status === 403, 'Users 403 should preserve upstream status');
    }

    {
        const { fetchStub } = createFetchHarness({ mainStatus: 403 });
        const worker = loadWorker(fetchStub);
        const response = await worker.fetch(makeMainRequest(), makeEnv(), { waitUntil: () => {} });
        const payload = await response.json();
        assert(response.status === 500, 'MAIN 403 should not be treated as a transient 503 outage');
        assert(payload.error === 'AirtableCredentialConfigurationError', 'MAIN 403 should map to credential configuration error type');
        assert(payload.scope === 'Main', 'MAIN 403 should identify Main scope');
        assert(payload.status === 403, 'MAIN 403 should preserve upstream status');
    }

    {
        const { fetchStub } = createFetchHarness({ pdfLookupStatus: 403 });
        const worker = loadWorker(fetchStub);
        const response = await worker.fetch(new Request('https://worker.example/?target=PDF_BY_ID&id=CP-1234'), makeEnv(), { waitUntil: () => {} });
        const payload = await response.json();
        assert(response.status === 500, 'PDF_BY_ID lookup 403 should not be treated as transient');
        assert(payload.error === 'AirtableCredentialConfigurationError', 'PDF_BY_ID 403 should map to credential configuration error type');
        assert(payload.scope === 'Main', 'PDF_BY_ID 403 should identify Main scope');
        assert(payload.status === 403, 'PDF_BY_ID 403 should preserve upstream status');
    }

    console.log('✅ Airtable token/header routing regression tests passed');
})();
