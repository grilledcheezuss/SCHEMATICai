// Run: node tests/sheet-authority-audit.test.js
// v2.5.113: Worker-attached Sheets authority reaches loaded browser records, drives the phase filter
// for a CP-8210-like phase converter, and SheetAuthorityAudit reports it read-only without network.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const parser = require('../info-table-parser.js');
const { SheetAuthorityAudit } = parser;
const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const columns = ['id', 'sys', 'panelType', 'motors', 'volt', 'phase', 'mfg', 'pumpType', 'hp',
    'encMaterial', 'nema', 'pdfVerified', 'confidence', 'flags'];

function classSource(name) {
    const start = appJs.indexOf(`class ${name} {`);
    let depth = 0;
    for (let i = appJs.indexOf('{', start); i < appJs.length; i++) {
        if (appJs[i] === '{') depth++;
        if (appJs[i] === '}' && --depth === 0) return appJs.slice(start, i + 1);
    }
    throw new Error(`Missing class ${name}`);
}

async function workerMainBody(sheetRows, airtable) {
    let source = fs.readFileSync(path.join(root, 'worker/worker.js'), 'utf8').replace(/export\s+default\s*\{/, 'const worker = {');
    source += '\nmodule.exports = { worker };';
    const store = new Map();
    const sandbox = { module: { exports: {} }, console, URL, URLSearchParams, Request, Response, Headers, Blob, Date,
        setTimeout, clearTimeout, AbortController,
        caches: { default: { match: async key => store.get(key.url)?.clone() || null, put: async (key, r) => { store.set(key.url, r.clone()); } } },
        fetch: async url => {
            if (url === endpoint) return json({ ok: true, schema: 1, revision: 3, hash: 'h3', rowCount: sheetRows.length, columns, rows: sheetRows });
            if (url.includes('/Users')) return json({ records: [{ fields: { Username: 'user', Passcode: 'pass' } }] });
            if (url.includes('/Feedback')) return json({ records: [] });
            if (url.includes('/Control%20Panel%20Items')) return json({ records: airtable.map(([name, items]) => ({ fields: { 'Control Panel Name': name, Items: items } })) });
            throw new Error('Unexpected fetch');
        } };
    vm.runInNewContext(source, sandbox, { filename: 'worker.js' });
    const response = await sandbox.module.exports.worker.fetch(new Request('https://worker.example/?target=MAIN', {
        headers: { 'X-Cox-User': 'user', 'X-Cox-Pass': 'pass' }
    }), { SHEETS_ENDPOINT: endpoint, AIRTABLE_READ_KEY: 'r', AIRTABLE_WRITE_KEY: 'w' });
    assert.strictEqual(response.status, 200);
    return JSON.parse(await response.text());
}

function storage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) };
}

function searchHarness() {
    const inputs = {};
    const select = value => ({ value, options: [], set innerHTML(_h) { this.options = []; this.value = ''; },
        add(o) { this.options.push(o); if (this.options.length === 1) this.value = o.value; } });
    Object.assign(global, {
        window: global.window || {},
        PDF_STATUS: { MISSING: 'missing' },
        AI_TRAINING_DATA: { ALIASES: {}, MANUFACTURERS: ['BARNES', 'SULZER', 'FLYGT'], DATA: { HP: [5, 10], VOLT: [208, 480], PHASE: [1, 3] } },
        PdfController: { stopPreloading() {}, preloadSearchResults() {} },
        FeedbackService: { resetLockout() {}, lockout: new Set() },
        PRELOAD_START_DELAY_MS: 0,
        InfoTableParser: parser,
        Option: function (text, value) { this.text = String(text); this.value = String(value); },
        DOM_CACHE: { get: id => inputs[id] || null }
    });
    global.KeywordMatcher = new Function(`return ${classSource('KeywordMatcher')}`)();
    global.VoltageMatcher = new Function(`return ${classSource('VoltageMatcher')}`)();
    global.HorsepowerMatcher = new Function(`return ${classSource('HorsepowerMatcher')}`)();
    global.SearchEngine = new Function(`return ${classSource('SearchEngine')}`)();
    global.UI = new Function(`return ${classSource('UI')}`)();
    return (records, phase) => {
        ['sys', 'mfg', 'hp', 'volt', 'enc', 'cat'].forEach(k => { inputs[k + 'Input'] = select('Any'); });
        inputs.phaseInput = select(phase);
        Object.assign(inputs, {
            keywordInput: { value: '', placeholder: '', classList: { toggle() {} } },
            'keyword-blocklist-toggle': { setAttribute() {} },
            'keyword-contradiction-warning': { textContent: '', style: {} },
            'pagination-footer': { style: {} }, 'page-info': { textContent: '' },
            'page-prev': { disabled: false }, 'page-next': { disabled: false }
        });
        Object.assign(UI, { keywordBlocklistMode: false, keywordAllowedTermsInput: '', keywordBlockedTermsInput: '',
            isSmallMobile: () => false, handleSearchCompletion() {}, syncMobileResultsCount() {} });
        let rendered = null;
        UI.render = (page, crit, total) => { rendered = { page, total }; };
        window.LOCAL_DB = records;
        SearchEngine.perform();
        return rendered;
    };
}

(async () => {
    assert.strictEqual(globalThis.SheetAuthorityAudit, SheetAuthorityAudit, 'console entrypoint is exposed');
    assert(Object.isFrozen(SheetAuthorityAudit));
    assert(!/SheetAuthorityAudit\s*\.\s*(?:report|text|inspect|format)\s*\(/.test(appJs), 'app.js never runs the audit automatically');

    const converter = 'PHASE CONVERTER PANEL INCOMING PHASE/HZ 1/60 PUMP MOTOR 10 HP 230V 3PH BARNES NEMA 4X';
    const body = await workerMainBody([
        ['CP-998210', 'Simplex', 'Phase Converter', '1', '240', '1/60', 'Barnes', 'Submersible', '10', 'Fiberglass', '4X', true, 1, ''],
        ['CP-998211', 'Simplex', 'Standard', '1', '480', '3/60', 'Barnes', 'Submersible', '10', 'Fiberglass', '4X', true, 1, ''],
        ['CP-998212', '', '', '', '', 'Varies', '', '', '', '', '', '', '', '']
    ], [
        ['CP-998210', converter],
        ['CP-998211', 'PANEL INCOMING 3/60 PUMP MOTOR 10 HP 460V 1PH BARNES'],
        ['CP-998212', 'BARNES 5 HP 240V 3PH NEMA 4X'],
        ['CP-998213', 'FLYGT 20 HP 480V 3PH NEMA 4X']
    ]);
    // Encrypted snapshot restore is a JSON round-trip; derivation is non-enumerable.
    const records = JSON.parse(JSON.stringify(body.records));
    parser.deriveRecordsSync(records);
    const [single, three, uncertain, legacy] = records;
    assert.strictEqual(single.phase, '1');
    assert.strictEqual(single.sheetSpecs.phase, '1');
    assert.strictEqual(three.phase, '3');
    assert.strictEqual(uncertain.phase, '3', 'uncertain sheet phase keeps legacy phase');
    assert.strictEqual(uncertain.sheetUncertainty.phase, 'Varies');
    assert.strictEqual(legacy.phase, '3');

    const search = searchHarness();
    const ids = (phase) => search(records, phase).page.map(r => r.id).sort();
    assert.deepStrictEqual(ids('3'), ['998211', '998212', '998213'], 'trusted 1/60 converter never matches a 3-phase filter despite motor 3PH text');
    assert.deepStrictEqual(ids('1'), ['998210'], 'trusted 1/60 converter matches phase 1; trusted 3/60 excluded despite 1PH text');
    const badges = UI._generateBadges(single, { kw: [], mfg: 'Any', hp: 'Any', volt: 'Any', phase: '1', enc: 'Any', sys: 'Any' }).join(' ');
    assert(badges.includes('1PH') && !badges.includes('3PH') && !badges.includes('match-orange'), 'clean 1PH badge');

    // Read-only audit: no network, no writes, no descriptions/PDF URLs.
    const realFetch = global.fetch;
    global.fetch = () => { throw new Error('audit must not use the network'); };
    const lastSync = { pages: 1, pagesWithSheets: 1, states: { active: 1 }, reasons: {}, rows: 3, records: 4, matchedRows: 3,
        withSpecs: 2, withMetadata: 2, withUncertainty: 1, revision: '3', hash: 'h3', transform: 'v2.5.113', appVersion: 'v2.5.113', syncedAt: 0 };
    const store = storage({ cox_sheet_authority: JSON.stringify(lastSync) });
    let writes = 0;
    store.setItem = () => { writes++; };
    globalThis.localStorage = store;
    globalThis.LOCAL_DB = records;
    const before = JSON.stringify(records);
    const report = SheetAuthorityAudit.report();
    assert.strictEqual(report.scope, 'LOCAL_DB');
    assert.strictEqual(report.recordsWithSheetSpecs, 2, 'recordsWithSheetSpecs is no longer 0 when trusted rows are loaded');
    assert.strictEqual(report.recordsWithSheetMetadata, 2);
    assert.strictEqual(report.recordsWithSheetUncertainty, 1);
    assert.strictEqual(report.recordsWithSheetRowButNoTrustedSpecs, 1);
    assert.strictEqual(report.trustedFields.phase, 2);
    assert.strictEqual(report.uncertainFields.phase, 1);
    assert.deepStrictEqual(report.sampleSheetBackedIds, ['998210', '998211']);
    assert.strictEqual(report.verdict, 'sheet-backed');
    assert.deepStrictEqual(report.lastSync, lastSync);
    const panel = SheetAuthorityAudit.inspect('CP-998210');
    assert.strictEqual(panel.found, true);
    assert.deepStrictEqual(panel.fields.phase, { returned: '1', varied: false, sheet: '1', trusted: '1', uncertainty: null });
    assert.deepStrictEqual(panel.sheetMetadata, { panelType: 'Phase Converter' });
    assert.strictEqual(SheetAuthorityAudit.inspect('998212').fields.phase.uncertainty, 'Varies');
    assert.strictEqual(SheetAuthorityAudit.inspect('CP-1').found, false);
    const text = SheetAuthorityAudit.text();
    assert(text.includes('Verdict: sheet-backed') && text.includes('sheetSpecs=2') && text.includes('transform=v2.5.113'));
    assert(!/PUMP MOTOR|INCOMING|http/i.test(text + JSON.stringify(report) + JSON.stringify(panel)), 'no descriptions or URLs');
    assert.strictEqual(JSON.stringify(records), before, 'audit never mutates records');
    assert.strictEqual(writes, 0, 'audit never writes storage');

    // Verdicts distinguish a stale/legacy snapshot from Worker-side causes.
    const bare = records.map(({ sheetSpecs, sheetMetadata, sheetUncertainty, ...rest }) => rest);
    const verdict = summary => {
        globalThis.localStorage = storage(summary ? { cox_sheet_authority: JSON.stringify(summary) } : {});
        return SheetAuthorityAudit.report({ records: bare }).verdict;
    };
    assert(verdict(null).startsWith('no-sync-evidence'));
    assert(verdict({ states: { 'not-reported': 81 } }).startsWith('worker-did-not-report'));
    assert(verdict({ states: { unconfigured: 81 } }).startsWith('worker-unconfigured'));
    assert.strictEqual(verdict({ states: { unavailable: 81 }, reasons: { timeout: 81 } }), 'worker-sheet-unavailable: timeout');
    assert(verdict({ states: { active: 81 }, withSpecs: 5000 }).startsWith('stale-snapshot'));
    assert(verdict({ states: { active: 81 }, withSpecs: 0 }).startsWith('no-matching-rows'));
    globalThis.localStorage = { getItem() { throw new Error('blocked'); } };
    assert.strictEqual(SheetAuthorityAudit.report({ records: bare }).lastSync, null, 'blocked storage is tolerated');
    delete globalThis.localStorage;
    delete globalThis.LOCAL_DB;
    global.fetch = realFetch;
    console.log('SheetAuthorityAudit and CP-8210-like sheet phase authority regressions passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
