const fs = require('fs');
const path = require('path');

console.log('🧪 Testing v2.5.89 Keyword Blocklist Mode\n');

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

runTest('1) Inclusive mode remains unchanged', () => {
    const record = { id: 'CP-1', desc: 'MOTOR STARTER' };
    const raw = ['MOTOR'];
    const expanded = [['MOTOR']];
    const include = SearchEngine.shouldIncludeRecordForKeywordMode(record, raw, expanded, false);
    assert(include === true, 'Expected inclusive mode to include matching record');
});

runTest('2) Blocklist mode excludes record matching one entered term', () => {
    const record = { id: 'CP-2', desc: 'PUMP CONTROL PANEL' };
    const raw = ['PUMP'];
    const expanded = [['PUMP']];
    const include = SearchEngine.shouldIncludeRecordForKeywordMode(record, raw, expanded, true);
    assert(include === false, 'Expected blocklist mode to exclude a blocked match');
});

runTest('3) Blocklist mode keeps record with no blocked-term match', () => {
    const record = { id: 'CP-3', desc: 'FAN STARTER' };
    const raw = ['PUMP'];
    const expanded = [['PUMP']];
    const include = SearchEngine.shouldIncludeRecordForKeywordMode(record, raw, expanded, true);
    assert(include === true, 'Expected non-matching record to remain eligible in blocklist mode');
});

runTest('4) Multiple comma-separated blocked terms exclude on any match', () => {
    const record = { id: 'CP-4', desc: 'PHASE MONITOR PANEL' };
    const raw = ['PUMP', 'MONITOR'];
    const expanded = [['PUMP'], ['MONITOR']];
    const include = SearchEngine.shouldIncludeRecordForKeywordMode(record, raw, expanded, true);
    assert(include === false, 'Expected match of any blocked term to exclude record');
});

runTest('5) Empty/whitespace terms do not accidentally exclude everything', () => {
    const record = { id: 'CP-5', desc: 'ANYTHING' };
    const raw = [];
    const expanded = [];
    const include = SearchEngine.shouldIncludeRecordForKeywordMode(record, raw, expanded, true);
    assert(include === true, 'Expected empty blocked terms to behave as no keyword filter');
});

runTest('6) Blocklist state resets via resetSearch lifecycle', () => {
    const keywordInput = {
        value: 'PUMP',
        placeholder: '',
        classList: {
            _active: false,
            toggle(_className, enabled) { this._active = !!enabled; }
        }
    };
    const toggleBtn = { setAttribute(key, value) { this[key] = value; } };
    global.DOM_CACHE = {
        get(id) {
            if (id === 'keywordInput') return keywordInput;
            if (id === 'keyword-blocklist-toggle') return toggleBtn;
            return null;
        }
    };
    global.window = { innerWidth: 1024 };
    global.document = {
        querySelectorAll() { return [{ value: 'x' }, { value: 'y' }]; }
    };

    UI.setKeywordBlocklistMode(true);
    assert(UI.isKeywordBlocklistMode() === true, 'Expected blocklist mode true before reset');
    UI.resetSearch();
    assert(UI.isKeywordBlocklistMode() === false, 'Expected blocklist mode false after reset');
    assert(keywordInput.value === '', 'Expected keyword input cleared by resetSearch');
    assert(keywordInput.placeholder === 'Allowed Terms - Use Comma To Separate', 'Expected allowed placeholder after reset');
    assert(toggleBtn['aria-pressed'] === 'false', 'Expected toggle aria-pressed false after reset');
    assert(toggleBtn['aria-label'] === 'Blocklist mode off. Toggle blocklist mode', 'Expected stateful aria-label after reset');
});

runTest('7) Pagination/counts operate on post-blocklist filtered set', () => {
    const records = Array.from({ length: 40 }, (_, i) => ({
        id: `CP-${i + 1}`,
        desc: i % 4 === 0 ? 'BLOCKED ITEM' : 'NORMAL ITEM',
        pdfStatus: 'ok'
    }));
    const raw = ['BLOCKED'];
    const expanded = [['BLOCKED']];
    const filtered = records.filter(r =>
        SearchEngine.shouldIncludeRecordForKeywordMode(r, raw, expanded, true)
    );
    assert(filtered.length === 30, `Expected 30 post-blocklist records, got ${filtered.length}`);

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
    global.UI = UI;
    let renderedPageSize = 0;
    let renderedTotal = 0;
    UI.render = (pageResults, _criteria, totalCount) => {
        renderedPageSize = pageResults.length;
        renderedTotal = totalCount;
    };

    SearchEngine.pageSize = 25;
    SearchEngine.currentResults = filtered;
    SearchEngine.currentPage = 1;
    SearchEngine.lastCriteria = { kw: raw, blocklistMode: true };
    SearchEngine.renderCurrentPage();

    assert(renderedPageSize === 25, `Expected first page size 25, got ${renderedPageSize}`);
    assert(renderedTotal === 30, `Expected total count 30, got ${renderedTotal}`);
    assert(pageInfoEl.textContent === 'Page 1 of 2', `Expected pagination to show Page 1 of 2, got ${pageInfoEl.textContent}`);
    assert(nextBtn.disabled === false, 'Expected next button enabled on first page with 2 pages');
});

runTest('8) Blocklist mode suppresses inclusive keyword badges for visible results', () => {
    const record = { id: 'CP-100', desc: 'FAN', mfg: 'COX', pdfStatus: 'ok' };
    const badgesBlocklist = UI._generateBadges(record, { kw: ['FAN'], blocklistMode: true, mfg: 'Any', volt: 'Any', phase: 'Any', hp: 'Any', enc: 'Any' });
    const badgesInclusive = UI._generateBadges(record, { kw: ['FAN'], blocklistMode: false, mfg: 'Any', volt: 'Any', phase: 'Any', hp: 'Any', enc: 'Any' });
    assert(!badgesBlocklist.some(b => b.includes('match-keyword')), 'Expected no keyword badge in blocklist mode');
    assert(badgesInclusive.some(b => b.includes('match-keyword')), 'Expected keyword badge in inclusive mode');
});

console.log('\n═══════════════════════════════════════');
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) process.exit(1);
console.log('✨ All keyword blocklist tests passed!');
