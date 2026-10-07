const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const InfoTableHelper = require('../info-table-helper.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function extractClass(name) {
    const start = source.indexOf(`class ${name} {`);
    assert.notEqual(start, -1);
    let depth = 0;
    for (let i = source.indexOf('{', start); i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}') {
            depth--;
            if (!depth) return source.slice(start, i + 1);
        }
    }
    throw new Error(`Unclosed class ${name}`);
}

function makeSelect(value = 'Any') {
    return {
        value, options: [], disabled: false, title: '',
        set innerHTML(_value) { this.options = []; this.value = ''; },
        get firstChild() { return this.options[0]; },
        removeChild(option) { this.options.splice(this.options.indexOf(option), 1); },
        add(option) { this.options.push(option); if (this.options.length === 1) this.value = option.value; }
    };
}

const supported = ['GORMAN RUPP', 'BARNES', 'HYDROMATIC', 'FLYGT', 'MYERS', 'GOULDS',
    'ZOELLER', 'LIBERTY', 'WILO', 'PENTAIR', 'ABS', 'GODWIN', 'FRANKLIN', 'EBARA', 'HIDROSTAL'];
const screenshotInfoTable = 'Panel Type Duplex Voltage 480 Phase/HZ 3/60 No. Motors 2 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible';
function harness({ realPanels = false } = {}) {
    const inputs = {};
    ['sys', 'enc', 'volt', 'phase', 'mfg', 'hp', 'cat'].forEach(k => {
        inputs[k + 'Input'] = makeSelect(k === 'cat' ? 'Standard' : 'Any');
    });
    ['sys', 'enc', 'volt', 'phase', 'mfg', 'hp'].forEach(k => { inputs['fb-' + k] = makeSelect(''); });
    const classList = () => {
        const classes = new Set();
        return {
            toggle(name, force) {
                const active = force === undefined ? !classes.has(name) : force;
                if (active) classes.add(name); else classes.delete(name);
                return active;
            },
            add(...names) { names.forEach(name => classes.add(name)); },
            remove(...names) { names.forEach(name => classes.delete(name)); },
            contains(name) { return classes.has(name); }
        };
    };
    inputs['search-controls'] = { classList: classList() };
    inputs['refine-btn-area'] = { classList: classList() };
    for (const id of ['refine-toggle-btn', 'results-toggle-btn']) {
        inputs[id] = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    }
    inputs.keywordInput = { value: '', classList: classList() };
    inputs['keyword-blocklist-toggle'] = { setAttribute() {} };
    inputs['keyword-contradiction-warning'] = { style: {}, textContent: '' };
    ['page-info', 'page-prev', 'page-next', 'results-count', 'pagination-footer'].forEach(id => {
        inputs[id] = { style: {}, disabled: false, textContent: '' };
    });
    inputs['fb-low-volt-btn'] = { classList: classList() };
    inputs['feedback-modal'] = { classList: classList() };
    inputs['keyword-cluster'] = { innerHTML: '', appendChild() {} };
    inputs['keyword-feedback-area'] = { style: {} };
    const cards = [];
    inputs['results-area'] = { innerHTML: '', appendChild(card) { cards.push(card); } };
    const storage = new Map();
    const requests = [];
    const alerts = [];
    const context = {
        console, InfoTableHelper, cards, PDF_STATUS: { MISSING: 'missing' }, PRELOAD_START_DELAY_MS: 0,
        window: { innerWidth: 1024, LOCAL_DB: [], ID_MAP: new Map(), FOUND_MFGS: new Set(), FOUND_ENCS: new Set() },
        DOM_CACHE: { get: id => inputs[id] || null },
        document: {
            body: { classList: classList() },
            getElementById: id => inputs[id] || null,
            querySelectorAll: () => [],
            createElement: () => ({ style: {}, dataset: {} })
        },
        AI_TRAINING_DATA: { MANUFACTURERS: supported, ALIASES: {}, DATA: { HP: [1, 2], VOLT: [240, 480], PHASE: [1, 3] } },
        localStorage: {
            getItem: key => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, String(value))
        },
        Option: function(text, value) { this.text = text; this.value = value; },
        PdfController: { stopPreloading() {}, preloadSearchResults() {} },
        setTimeout() {}, clearTimeout() {},
        AuthService: { headers: () => ({}) },
        buildWorkerUrl: () => 'mock-feedback',
        alert: message => alerts.push(message),
        fetch: async (url, options) => { requests.push(JSON.parse(options.body)); return {}; }
    };
    vm.createContext(context);
    for (const name of ['DataLoader', 'KeywordMatcher', 'SearchEngine', 'UI', 'FeedbackService']) {
        vm.runInContext(`${extractClass(name)}; globalThis.${name} = ${name};`, context);
    }
    if (realPanels) {
        context.UI.syncRefineTogglePlacement = () => {};
        context.UI.syncPaginationPlacement = () => {};
    } else {
        context.UI.handleSearchCompletion = () => {};
        context.UI.toggleSearch = () => {};
    }
    return { context, inputs, storage, requests, alerts, cards };
}

let passed = 0;
async function test(name, callback) {
    await callback();
    passed++;
    console.log(`✅ ${name}`);
}
const ids = records => Array.from(records, r => r.id);
const values = input => input.options.map(option => option.value);
const row = (id, manufacturer) => ({ id, desc: `PUMP MANUFACTURER: ${manufacturer}\nMOTOR HP: 2` });

async function main() {
    await test('System filter resolves old snapshots and keeps authoritative uncertainty', () => {
        const { context: c, inputs } = harness();
        c.window.LOCAL_DB.push(
            { id: 'strict', sys: 'Duplex', sysV: false, pdfUrl: 'file' },
            { id: 'legacy', desc: screenshotInfoTable, pdfUrl: 'file' },
            { id: 'inferred', desc: 'No. Motors 2', pdfUrl: 'file' },
            { id: 'uncertain', sys: 'Duplex', sysV: true, pdfUrl: 'file' },
            { id: 'missing-variance', sys: 'Duplex', pdfUrl: 'file' },
            { id: 'authoritative-null', sys: null, desc: 'SYSTEM TYPE: Duplex' },
            { id: 'other', sys: 'Simplex', sysV: false },
            { id: 'prose', desc: 'This duplex installation has a pump.' }
        );
        inputs.sysInput.value = 'Duplex';
        c.SearchEngine.pageSize = 2;
        c.SearchEngine.perform();
        assert.equal(c.SearchEngine.currentResults.length, 5);
        assert.equal(c.SearchEngine.lastCriteria.sys, 'Duplex');
        assert.deepEqual(ids(c.SearchEngine.currentResults).slice(0, 2), ['strict', 'legacy']);
        assert.equal(c.window.LOCAL_DB.find(r => r.id === 'missing-variance').sysV, true);
        assert.equal(c.window.LOCAL_DB.find(r => r.id === 'inferred').sysV, true);
        assert.equal(inputs['results-count'].textContent, 'Found 5 records');
        assert.equal(inputs['page-info'].textContent, 'Page 1 of 3');
        assert.match(c.cards[0].innerHTML, /match-green">Duplex/);
        c.SearchEngine.nextPage();
        assert.equal(inputs['page-info'].textContent, 'Page 2 of 3');
        assert.match(c.cards[c.cards.length - 1].innerHTML, /match-orange">Duplex/);
        c.SearchEngine.nextPage();
        assert.equal(inputs['page-next'].disabled, true);
        assert.equal(inputs['results-count'].textContent, 'Found 5 records');
    });

    await test('Any neither invokes system parser nor changes legacy search and badges', () => {
        const { context: c } = harness();
        c.InfoTableHelper = { resolveSystemType() { throw new Error('Any must not parse'); } };
        c.window.LOCAL_DB.push({ id: 'a', sys: 'Simplex', sysV: true }, { id: 'b', desc: 'arbitrary' });
        c.SearchEngine.perform();
        assert.deepEqual(ids(c.SearchEngine.currentResults), ['b', 'a']);
        assert.ok(c.cards.every(card => !/Simplex|Duplex/.test(card.innerHTML)));
        assert.equal(c.window.LOCAL_DB[1].sys, undefined);
    });

    await test('System filter composes with existing keyword and category rules', () => {
        const { context: c, inputs } = harness();
        c.UI.keywordAllowedTermsInput = 'PUMP';
        c.window.LOCAL_DB.push(
            { id: 'keep', sys: 'Triplex', sysV: false, desc: 'PUMP' },
            { id: 'keyword-excluded', sys: 'Triplex', sysV: false, desc: 'FAN' },
            { id: 'category-excluded', sys: 'Triplex', sysV: false, desc: 'PUMP', category: 'low_voltage' }
        );
        inputs.sysInput.value = 'Triplex';
        c.SearchEngine.perform();
        assert.deepEqual(ids(c.SearchEngine.currentResults), ['keep']);
    });

    await test('Complete snapshots rank fewer than eight, ties and duplicate IDs with real row evidence', () => {
        const { context: c, inputs, storage } = harness();
        storage.set('cox_db_complete', 'true');
        c.DataLoader.applySnapshot({ records: [
            row('1', 'FLYGT'), row('1', 'FLYGT'), row('2', 'BARNES'),
            row('3', 'BARNES'), row('4', 'MYERS'), { id: '5', mfg: 'WILO', desc: 'WILO prose' }
        ] });
        c.UI.pop();
        assert.deepEqual(values(inputs.mfgInput), ['Any', 'BARNES', 'FLYGT', 'MYERS']);
        assert.deepEqual(inputs.mfgInput.options.map(o => o.text), ['Any', 'BARNES (2)', 'FLYGT (1)', 'MYERS (1)']);
    });

    await test('Screenshot-derived Panel Type/No. Motors legacy cache backfills system and ranks bounded pump row', () => {
        const { context: c, inputs, storage } = harness();
        storage.set('cox_db_complete', 'true');
        c.DataLoader.applySnapshot({ records: [
            { id: 'legacy-screenshot', desc: screenshotInfoTable },
            { id: 'legacy-inferred', desc: 'No. Motors 2\nPump Manufacturer Barnes\nType of Pump Submersible' }
        ] });
        assert.equal(c.window.LOCAL_DB[0].sys, undefined);
        c.UI.pop();
        assert.deepEqual(values(inputs.mfgInput), ['Any', 'BARNES']);
        assert.equal(inputs.mfgInput.options[1].text, 'BARNES (2)');
        inputs.sysInput.value = 'Duplex';
        c.SearchEngine.perform();
        assert.deepEqual(ids(c.SearchEngine.currentResults), ['legacy-screenshot', 'legacy-inferred']);
        assert.equal(c.window.LOCAL_DB[0].sys, 'Duplex');
        assert.equal(c.window.LOCAL_DB[0].sysV, false);
        assert.equal(c.window.LOCAL_DB[1].sys, 'Duplex');
        assert.equal(c.window.LOCAL_DB[1].sysV, true);
        assert.match(c.cards[0].innerHTML, /match-green">Duplex/);
        assert.match(c.cards[1].innerHTML, /match-orange">Duplex/);
    });

    await test('Top eight use full dataset, preserve outside live selection temporarily, and refresh snapshots', () => {
        const { context: c, inputs, storage } = harness();
        storage.set('cox_db_complete', 'true');
        c.DataLoader.applySnapshot({ records: supported.map((mfg, i) => row(String(i), mfg)) });
        c.SearchEngine.currentResults = [row('filtered', 'WILO')];
        inputs.mfgInput.value = 'WILO';
        inputs.sysInput.value = 'Quadraplex';
        c.UI.keywordAllowedTermsInput = 'allowed';
        inputs.keywordInput.value = 'allowed';
        c.UI.setKeywordBlocklistMode(true);
        inputs.keywordInput.value = 'latest blocked';
        const previousResults = c.SearchEngine.currentResults;
        c.SearchEngine.currentPage = 3;
        c.UI.pop();
        assert.equal(inputs.mfgInput.options.length, 10); // Any + top eight + selected
        assert.equal(inputs.mfgInput.options.at(-1).text, 'WILO (selected)');
        assert.equal(inputs.mfgInput.value, 'WILO');
        assert.equal(inputs.sysInput.value, 'Quadraplex');
        assert.equal(inputs.keywordInput.value, 'latest blocked');
        assert.equal(c.UI.getAllowedKeywordTermsInput(), 'allowed');
        assert.equal(c.UI.getBlockedKeywordTermsInput(), 'latest blocked');
        assert.equal(c.SearchEngine.currentResults, previousResults);
        assert.equal(c.SearchEngine.currentPage, 3);
        inputs.mfgInput.value = 'Any';
        c.UI.pop();
        assert.equal(inputs.mfgInput.options.length, 9);
        c.DataLoader.applySnapshot({ records: [row('new', 'WILO'), row('new2', 'WILO')] });
        c.UI.pop();
        assert.deepEqual(values(inputs.mfgInput), ['Any', 'WILO']);
        assert.equal(inputs.mfgInput.options[1].text, 'WILO (2)');
    });

    await test('Incomplete startup uses old safe options; complete cache can rank during staged refresh', () => {
        const { context: c, inputs, storage } = harness();
        c.window.FOUND_MFGS.add('MYERS');
        c.window.LOCAL_DB.push(row('partial', 'MYERS'));
        c.UI.pop();
        assert.deepEqual(inputs.mfgInput.options.map(o => o.text), ['Any', 'MYERS']);
        storage.set('cox_db_complete', 'true');
        c.DataLoader._inFlightSync = true;
        c.UI.pop();
        assert.deepEqual(inputs.mfgInput.options.map(o => o.text), ['Any', 'MYERS (1)']);
        c.DataLoader.applySnapshot({ records: [{ id: 'no-row', mfg: 'MYERS', desc: 'MYERS pump' }] });
        c.UI.pop();
        assert.deepEqual(inputs.mfgInput.options.map(o => o.text), ['Any', 'MYERS']);
    });

    await test('Reset clears system selection and both keyword editors', () => {
        const { context: c, inputs } = harness();
        inputs.sysInput.value = 'Duplex';
        c.UI.keywordAllowedTermsInput = 'allowed';
        c.UI.keywordBlockedTermsInput = 'blocked';
        c.UI.setKeywordBlocklistMode(true);
        c.UI.resetSearch();
        assert.equal(inputs.sysInput.value, 'Any');
        assert.equal(c.UI.getAllowedKeywordTermsInput(), '');
        assert.equal(c.UI.getBlockedKeywordTermsInput(), '');
        assert.equal(c.UI.isKeywordBlocklistMode(), false);
    });

    await test('Search hide/show and mobile results collapse preserve live System Type at all layout widths', () => {
        for (const width of [375, 768, 1280]) {
            const { context: c, inputs } = harness({ realPanels: true });
            c.window.innerWidth = width;
            inputs.sysInput.value = 'Duplex';
            c.UI.syncMobileLayout();
            c.UI.toggleMobileSearch();
            assert.equal(c.UI.isSearchPanelExpanded(), false);
            assert.equal(inputs['refine-toggle-btn'].textContent, 'SHOW');
            assert.equal(inputs['refine-toggle-btn'].attributes['aria-expanded'], 'false');
            assert.equal(width < 768
                ? c.document.body.classList.contains('mobile-search-hidden')
                : inputs['search-controls'].classList.contains('collapsed'), true);
            c.UI.pop();
            assert.equal(inputs.sysInput.value, 'Duplex');
            c.UI.toggleMobileSearch();
            assert.equal(c.UI.isSearchPanelExpanded(), true);
            assert.equal(inputs['refine-toggle-btn'].textContent, 'HIDE');
            assert.equal(inputs['refine-toggle-btn'].attributes['aria-expanded'], 'true');
            assert.equal(inputs.sysInput.value, 'Duplex');
            c.SearchEngine.currentResults = [{ id: 'result' }];
            c.SearchEngine.lastCriteria = { sys: 'Duplex' };
            c.UI.handleSearchCompletion(true);
            assert.equal(c.UI.isSearchPanelExpanded(), false);
            if (width < 768) {
                assert.equal(inputs['results-toggle-btn'].textContent, 'HIDE');
                assert.equal(inputs['pagination-footer'].style.display, 'flex');
                c.UI.toggleMobileResults();
                assert.equal(inputs['results-toggle-btn'].textContent, 'SHOW');
                assert.equal(c.document.body.classList.contains('mobile-results-hidden'), true);
                assert.equal(inputs['pagination-footer'].style.display, 'none');
                c.UI.toggleMobileResults();
                assert.equal(inputs['results-toggle-btn'].attributes['aria-expanded'], 'true');
                assert.equal(inputs['pagination-footer'].style.display, 'flex');
            }
            c.UI.resetSearch();
            assert.equal(c.UI.isSearchPanelExpanded(), true);
            assert.equal(inputs.sysInput.value, 'Any');
        }
    });

    await test('System correction is normalized, strict, parameter locked and reset independently of up-votes', async () => {
        const { context: c, inputs, requests, alerts } = harness();
        c.FeedbackService.down('record', null);
        assert.deepEqual(values(inputs['fb-mfg']).slice(2), [...supported].sort());
        assert.deepEqual(values(inputs['fb-sys']), ['', ...InfoTableHelper.SYSTEM_TYPES]);
        inputs['fb-sys'].value = 'Duplex starter';
        inputs['fb-hp'].value = '2';
        await c.FeedbackService.submit();
        assert.equal(requests.length, 0);
        assert.ok(alerts.at(-1).includes('valid System Type'));
        assert.equal(c.FeedbackService.lockout.size, 0);
        inputs['fb-sys'].value = ' quadruplex ';
        inputs['fb-hp'].value = '';
        await c.FeedbackService.submit();
        assert.deepEqual(JSON.parse(requests[0].records[0].fields.Corrections), { sys: 'Quadraplex' });
        assert.ok(c.FeedbackService.lockout.has('record:p_sys'));
        c.FeedbackService.down('record', null);
        assert.equal(inputs['fb-sys'].disabled, true);
        inputs['fb-sys'].value = 'Simplex';
        await c.FeedbackService.submit();
        assert.equal(requests.length, 1);
        c.FeedbackService.lockout.add('record:up');
        c.FeedbackService.resetLockout();
        assert.equal(c.FeedbackService.lockout.has('record:p_sys'), false);
        assert.equal(c.FeedbackService.lockout.has('record:up'), true);
        c.FeedbackService.down('record', null);
        assert.equal(inputs['fb-sys'].disabled, false);
        inputs['fb-sys'].value = 'Varied / Multiple';
        await c.FeedbackService.submit();
        assert.equal(requests.length, 1);
        assert.equal(c.FeedbackService.lockout.has('record:p_sys'), false);
    });

    await test('DOM keyboard order, labels, responsive grid and release surfaces are current', () => {
        const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
        const section = html.slice(html.indexOf('id="search-main-fields"'), html.indexOf('id="results-scroll-area"'));
        const orderedIds = ['sysInput', 'encInput', 'voltInput', 'phaseInput', 'mfgInput', 'hpInput',
            'keywordInput', 'keyword-blocklist-toggle', 'catInput', 'searchBtn'];
        let previous = -1;
        orderedIds.forEach(id => {
            const position = section.indexOf(`id="${id}"`);
            assert.ok(position > previous, `${id} follows prior control in DOM`);
            previous = position;
        });
        orderedIds.filter(id => id.endsWith('Input')).forEach(id => assert.ok(section.includes(`for="${id}"`)));
        assert.ok(section.includes('class="input-group full-width"'));
        assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
        assert.match(css, /#search-controls \.cox-input \{ min-width: 0; \}/);
        assert.match(html, /info-table-helper\.js\?v=2\.5\.95/);
        assert.ok(html.indexOf('info-table-helper.js') < html.indexOf('src="app.js'));
        assert.match(html, /app\.js\?v=2\.5\.95/);
        assert.match(html, /style\.css\?v=2\.5\.95/);
        assert.match(html, /<title>.*v2\.5\.95/);
        assert.match(source, /const APP_VERSION = "v2\.5\.95"/);
        assert.match(source, /voteThreshold: 3/);
        assert.ok(html.includes('id="demo-system-type"'));
    });
    console.log(`\n${passed} frontend v2.5.95 tests passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
