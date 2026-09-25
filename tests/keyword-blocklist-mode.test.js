const fs = require('fs');
const path = require('path');

console.log('🧪 Testing v2.5.90 Allowed/Blocked Keyword Sets\n');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class`);

    let braceCount = 0;
    let inClass = false;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        if (char === '{') {
            braceCount++;
            inClass = true;
        } else if (char === '}') {
            braceCount--;
            if (inClass && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    const classCode = content.substring(startIdx, endIdx);
    return new Function('return ' + classCode)();
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const KeywordMatcher = extractClass('KeywordMatcher', appJsContent);
global.KeywordMatcher = KeywordMatcher;
global.PDF_STATUS = { MISSING: 'missing' };
const SearchEngine = extractClass('SearchEngine', appJsContent);
const UI = extractClass('UI', appJsContent);
global.SearchEngine = SearchEngine;
global.UI = UI;

global.AI_TRAINING_DATA = {
    ALIASES: {},
    MANUFACTURERS: [],
    DATA: { HP: [], VOLT: [], PHASE: [] }
};

global.PdfController = {
    stopPreloading() {},
    preloadSearchResults() {}
};

global.FeedbackService = {
    resetLockout() {}
};

global.PRELOAD_START_DELAY_MS = 0;
global.window = { innerWidth: 1024, LOCAL_DB: [] };
global.document = {
    querySelectorAll() { return []; },
    body: { classList: { toggle() {}, remove() {} } }
};

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`❌ ${name}`);
        console.log(`   ${err.message}`);
        failed++;
    }
}

runTest('1) Allowed and blocked sets are stored independently across mode toggles', () => {
    const keywordInput = {
        value: '',
        placeholder: '',
        classList: { toggle() {} }
    };
    const blocklistToggle = { setAttribute() {}, title: '' };
    const warningEl = { textContent: '', style: { display: 'none' } };

    global.DOM_CACHE = {
        get(id) {
            if (id === 'keywordInput') return keywordInput;
            if (id === 'keyword-blocklist-toggle') return blocklistToggle;
            if (id === 'keyword-contradiction-warning') return warningEl;
            return null;
        }
    };

    UI.keywordAllowedTermsInput = '';
    UI.keywordBlockedTermsInput = '';
    UI.setKeywordBlocklistMode(false);
    keywordInput.value = 'MOTOR, FAN';
    UI.handleKeywordInputChange();

    UI.setKeywordBlocklistMode(true);
    assert(keywordInput.value === '', 'Blocked editor should start empty when no blocked terms are saved');

    keywordInput.value = 'PUMP';
    UI.handleKeywordInputChange();

    UI.setKeywordBlocklistMode(false);
    assert(keywordInput.value === 'MOTOR, FAN', 'Allowed terms should be restored when switching back');

    UI.setKeywordBlocklistMode(true);
    assert(keywordInput.value === 'PUMP', 'Blocked terms should be restored when switching back');
});

runTest('2) Contradictions are detected case-insensitively', () => {
    const allowed = SearchEngine.parseAllowedKeywordTerms('motor');
    const blocked = SearchEngine.parseBlockedKeywordTerms('MOTOR');
    const validation = SearchEngine.collectKeywordTermSetValidation(allowed, blocked);

    assert(validation.hasContradiction === true, 'Expected contradiction for MOTOR/motor overlap');
    assert(validation.duplicates.length === 1 && validation.duplicates[0] === 'MOTOR', 'Expected duplicate term to normalize to MOTOR');
});

runTest('3) Multiple duplicate terms are reported together', () => {
    const keywordInput = { value: '', placeholder: '', classList: { toggle() {} } };
    const blocklistToggle = { setAttribute() {}, title: '' };
    const warningEl = { textContent: '', style: { display: 'none' } };

    global.DOM_CACHE = {
        get(id) {
            if (id === 'keywordInput') return keywordInput;
            if (id === 'keyword-blocklist-toggle') return blocklistToggle;
            if (id === 'keyword-contradiction-warning') return warningEl;
            return null;
        }
    };

    UI.keywordAllowedTermsInput = 'motor, pump, fan';
    UI.keywordBlockedTermsInput = 'PUMP, MOTOR';
    UI.refreshKeywordContradictionWarning();

    assert(warningEl.textContent === 'MOTOR, PUMP appear in Allowed and Blocked Terms', `Unexpected warning: ${warningEl.textContent}`);
    assert(warningEl.style.display === 'inline', 'Expected warning to be visible when duplicates exist');
});

runTest('4) Search is blocked while contradiction exists', () => {
    const keywordInput = { value: '', placeholder: '', classList: { toggle() {} } };
    const blocklistToggle = { setAttribute() {}, title: '' };
    const warningEl = { textContent: '', style: { display: 'none' } };
    const catInput = { value: 'Any' };

    global.DOM_CACHE = {
        get(id) {
            if (id === 'keywordInput') return keywordInput;
            if (id === 'keyword-blocklist-toggle') return blocklistToggle;
            if (id === 'keyword-contradiction-warning') return warningEl;
            if (id === 'catInput') return catInput;
            return { value: 'Any', style: {}, disabled: false, textContent: '' };
        }
    };

    SearchEngine.currentResults = [{ id: 'EXISTING' }];
    SearchEngine.lastCriteria = { kw: ['EXISTING'] };
    UI.keywordAllowedTermsInput = 'MOTOR';
    UI.keywordBlockedTermsInput = 'motor';

    SearchEngine.perform();

    assert(SearchEngine.currentResults.length === 1 && SearchEngine.currentResults[0].id === 'EXISTING', 'Search results should not mutate on contradiction');
    assert(SearchEngine.lastCriteria.kw[0] === 'EXISTING', 'Criteria should not mutate on contradiction');
    assert(warningEl.textContent.includes('MOTOR appears in Allowed and Blocked Terms'), 'Expected contradiction warning after blocked search attempt');
});

runTest('5) Clearing conflicting term removes warning and allows search', () => {
    const keywordInput = { value: '', placeholder: '', classList: { toggle() {} } };
    const blocklistToggle = { setAttribute() {}, title: '' };
    const warningEl = { textContent: '', style: { display: 'none' } };
    const pageInfoEl = { textContent: '' };
    const prevBtn = { disabled: false };
    const nextBtn = { disabled: false };
    const paginationFooter = { style: {} };

    global.DOM_CACHE = {
        get(id) {
            if (id === 'keywordInput') return keywordInput;
            if (id === 'keyword-blocklist-toggle') return blocklistToggle;
            if (id === 'keyword-contradiction-warning') return warningEl;
            if (id === 'catInput') return { value: 'Any' };
            if (id === 'mfgInput') return { value: 'Any' };
            if (id === 'hpInput') return { value: 'Any' };
            if (id === 'voltInput') return { value: 'Any' };
            if (id === 'phaseInput') return { value: 'Any' };
            if (id === 'encInput') return { value: 'Any' };
            if (id === 'pagination-footer') return paginationFooter;
            if (id === 'page-info') return pageInfoEl;
            if (id === 'page-prev') return prevBtn;
            if (id === 'page-next') return nextBtn;
            if (id === 'results-area') return { innerHTML: '' };
            return null;
        }
    };

    UI.render = () => {};
    UI.isSmallMobile = () => false;
    UI.handleSearchCompletion = () => {};

    UI.keywordAllowedTermsInput = 'MOTOR';
    UI.keywordBlockedTermsInput = 'motor';
    UI.refreshKeywordContradictionWarning();
    assert(warningEl.style.display === 'inline', 'Warning should show with conflict');

    UI.keywordBlockedTermsInput = 'PUMP';
    UI.refreshKeywordContradictionWarning();
    assert(warningEl.textContent === '' && warningEl.style.display === 'none', 'Warning should clear after conflict is removed');

    window.LOCAL_DB = [{ id: 'CP-1', desc: 'MOTOR STARTER', mfg: 'COX', pdfStatus: 'ok' }];
    SearchEngine.perform();
    assert(SearchEngine.currentResults.length === 1, 'Search should run successfully once contradiction is removed');
});

runTest('6) Allowed-term matching branch remains unchanged without blocked terms', () => {
    const record = { id: 'CP-2', desc: 'MOTOR CONTROL PANEL' };
    const allowedRaw = ['MOTOR'];
    const allowedExpanded = [['MOTOR']];

    assert(SearchEngine.shouldIncludeRecordForKeywordSets(record, allowedRaw, allowedExpanded, [], []) === true, 'Allowed match should include record');
    assert(SearchEngine.shouldIncludeRecordForKeywordSets({ id: 'CP-3', desc: 'PUMP PANEL' }, allowedRaw, allowedExpanded, [], []) === false, 'Allowed mismatch should exclude record');
});

runTest('7) Blocked exclusion runs after allowed inclusion and preserves pagination/count semantics', () => {
    const records = Array.from({ length: 40 }, (_, i) => ({
        id: `CP-${i + 1}`,
        desc: i % 4 === 0 ? 'MOTOR BLOCKED' : 'MOTOR NORMAL',
        pdfStatus: 'ok'
    }));

    const allowedRaw = ['MOTOR'];
    const allowedExpanded = [['MOTOR']];
    const blockedRaw = ['BLOCKED'];
    const blockedExpanded = [['BLOCKED']];

    const filtered = records.filter(r =>
        SearchEngine.shouldIncludeRecordForKeywordSets(r, allowedRaw, allowedExpanded, blockedRaw, blockedExpanded)
    );

    assert(filtered.length === 30, `Expected 30 post-blocked records, got ${filtered.length}`);

    const pageInfoEl = { textContent: '' };
    const prevBtn = { disabled: false };
    const nextBtn = { disabled: false };

    global.DOM_CACHE = {
        get(id) {
            if (id === 'page-info') return pageInfoEl;
            if (id === 'page-prev') return prevBtn;
            if (id === 'page-next') return nextBtn;
            return null;
        }
    };

    let renderedPageSize = 0;
    let renderedTotal = 0;
    UI.render = (pageResults, _criteria, totalCount) => {
        renderedPageSize = pageResults.length;
        renderedTotal = totalCount;
    };

    SearchEngine.pageSize = 25;
    SearchEngine.currentResults = filtered;
    SearchEngine.currentPage = 1;
    SearchEngine.lastCriteria = { kw: allowedRaw, blockedKw: blockedRaw };
    SearchEngine.renderCurrentPage();

    assert(renderedPageSize === 25, `Expected first page size 25, got ${renderedPageSize}`);
    assert(renderedTotal === 30, `Expected total count 30, got ${renderedTotal}`);
    assert(pageInfoEl.textContent === 'Page 1 of 2', `Expected pagination to show Page 1 of 2, got ${pageInfoEl.textContent}`);
    assert(nextBtn.disabled === false, 'Expected next button enabled on first page with 2 pages');
});

runTest('8) Blank and duplicate entries in same set are ignored as noise', () => {
    const parsedAllowed = SearchEngine.parseAllowedKeywordTerms(' MOTOR, motor, , MOTOR ,, fan ');
    const parsedBlocked = SearchEngine.parseBlockedKeywordTerms(' PUMP, PUMP, ');

    assert(parsedAllowed.length === 2 && parsedAllowed[0] === 'MOTOR' && parsedAllowed[1] === 'FAN', `Unexpected allowed parse result: ${parsedAllowed.join('|')}`);
    assert(parsedBlocked.length === 1 && parsedBlocked[0] === 'PUMP', `Unexpected blocked parse result: ${parsedBlocked.join('|')}`);
});

console.log('\n═══════════════════════════════════════');
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) process.exit(1);
console.log('✨ All allowed/blocked keyword-set tests passed!');
