// v2.5.96 frontend-only tests: material-based Enclosure search, cumulative 90% manufacturer
// coverage, and feedback dropdown order/encoding. Exercises the real InfoTableParser and the
// SearchEngine / UI / FeedbackService / DataLoader classes extracted from app.js.
// Run: node tests/enclosure-material-mfg-coverage.test.js
const fs = require('fs');
const path = require('path');
const InfoTableParser = require('../info-table-parser.js');

const root = path.join(__dirname, '..');
const appJsContent = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

console.log('🧪 Testing v2.5.96 enclosure material / manufacturer coverage / feedback order\n');

let passed = 0;
let failed = 0;
const pending = [];
function runTest(name, fn) {
    pending.push(async () => {
        try {
            await fn();
            passed++;
            console.log(`✅ ${name}`);
        } catch (e) {
            failed++;
            console.log(`❌ ${name}\n   ${e.message}`);
        }
    });
}
function assert(condition, message) {
    if (!condition) throw new Error(message);
}
function assertEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${message}: expected ${e}, got ${a}`);
}
function extractClassSource(className) {
    const startIdx = appJsContent.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class`);
    let depth = 0;
    for (let i = startIdx; i < appJsContent.length; i++) {
        if (appJsContent[i] === '{') depth++;
        else if (appJsContent[i] === '}' && --depth === 0) return appJsContent.substring(startIdx, i + 1);
    }
    throw new Error(`Unterminated ${className} class`);
}

const FG = 'Fiberglass';
const SS = 'Stainless Steel';
const PS = 'Painted Steel';
const evidence = desc => {
    const e = InfoTableParser.deriveMaterialFromDesc(desc);
    return { status: e.status, materials: [...e.materials], varied: e.varied };
};
function rec(id, desc, extra = {}) {
    const r = { id, desc, pdfUrl: 'x', ...extra };
    InfoTableParser.deriveRecord(r);
    return r;
}
const resolve = r => {
    const x = InfoTableParser.resolveEnclosureMaterial(r);
    return { materials: [...x.materials], varied: x.varied, source: x.source };
};
const matches = (r, m) => InfoTableParser.matchEnclosureMaterial(r, m).matches;

// ---------------------------------------------------------------- Material row parsing
runTest('Material-only descriptions parse without System Type / Pump Manufacturer rows', () => {
    assertEqual(evidence('Enclosure Material: Fiberglass'), { status: 'row', materials: [FG], varied: false }, 'fiberglass');
    assertEqual(evidence('ENCLOSURE MATERIAL (304) STAINLESS STEEL'), { status: 'row', materials: [SS], varied: false }, 'screenshot (304) stainless');
    assertEqual(evidence('enclosure material - painted steel'), { status: 'row', materials: [PS], varied: false }, 'painted steel');
    const derived = InfoTableParser.deriveFromDesc('Enclosure Material Fiberglass');
    assertEqual(derived, { sys: null, sysV: false, pumpMfg: null }, 'no system/mfg invented');
});

runTest('Label/value variants: case, spacing, abbreviations, newline, pipe, flattened', () => {
    const fgValues = ['Fiberglass', 'FIBER GLASS', 'Fibreglass', 'fibre glass', 'FRP', 'Fiberglass Reinforced Polyester'];
    fgValues.forEach(v => assertEqual(InfoTableParser.normalizeEnclosureMaterial(v), FG, v));
    const ssValues = ['(304) Stainless Steel', '316 Stainless', 'Stainless', '304 SS', '316L SS', '304SS', 'SS', 'S/S', '(316)', '304'];
    ssValues.forEach(v => assertEqual(InfoTableParser.normalizeEnclosureMaterial(v), SS, v));
    ['Painted Steel', 'PAINTED CARBON STEEL', 'Painted Mild Steel', 'Steel, Painted'].forEach(v =>
        assertEqual(InfoTableParser.normalizeEnclosureMaterial(v), PS, v));
    ['Steel', 'Carbon Steel', 'Mild Steel', 'Polycarbonate', 'Aluminum', ''].forEach(v =>
        assertEqual(InfoTableParser.normalizeEnclosureMaterial(v), null, `${v || '(empty)'} is none of the three`));
    assertEqual(evidence('ENCL. MATERIAL: FRP'), { status: 'row', materials: [FG], varied: false }, 'ENCL. abbreviation');
    assertEqual(evidence('Encl Material Fiberglass'), { status: 'row', materials: [FG], varied: false }, 'ENCL abbreviation');
    assertEqual(evidence('enclosure   material   :   fiberglass'), { status: 'row', materials: [FG], varied: false }, 'spacing');
    assertEqual(evidence('ENCLOSURE MATERIAL\n(304) STAINLESS STEEL\nINNER SWING PANEL\nYES'), { status: 'row', materials: [SS], varied: false }, 'multiline');
    assertEqual(evidence('Enclosure NEMA Rating | 4X | Enclosure Material | Fiberglass | Enclosure Size | 24x20'), { status: 'row', materials: [FG], varied: false }, 'pipe');
    const flat = 'ENCLOSURE NEMA RATING 4X ENCLOSURE MATERIAL (304) STAINLESS STEEL ENCLOSURE SIZE 36X30X12 INNER SWING PANEL YES CONTROL SENSOR FLOATS';
    assertEqual(InfoTableParser.extractInfoRows(flat).encMaterials, ['(304) STAINLESS STEEL'], 'flattened value stops at ENCLOSURE SIZE');
});

runTest('No adjacent-row bleed: empty material cells never borrow neighboring values', () => {
    assertEqual(evidence('Enclosure Material Enclosure Size Stainless 24x20'), { status: 'unreadable', materials: [], varied: false }, 'empty before Enclosure Size');
    assertEqual(evidence('Enclosure Material | | Inner Swing Panel | Stainless'), { status: 'unreadable', materials: [], varied: false }, 'empty pipe cell');
    assertEqual(evidence('Enclosure Material\nControl Sensor Stainless float'), { status: 'unreadable', materials: [], varied: false }, 'empty before Control Sensor');
    assertEqual(evidence('Enclosure NEMA Rating Stainless Enclosure Material N/A'), { status: 'unreadable', materials: [], varied: false }, 'rating row never read');
    assertEqual(evidence('Enclosure Material' + ' '.repeat(60) + 'Fiberglass'), { status: 'unreadable', materials: [], varied: false }, 'bounded window');
    assertEqual(InfoTableParser.extractInfoRows('PANEL TYPE DUPLEX ENCLOSURE MATERIAL FIBERGLASS NO. MOTORS 2').panelTypes, ['DUPLEX'], 'panel type stops at material label');
});

runTest('NEMA rating never establishes a material', () => {
    assertEqual(evidence('Enclosure NEMA Rating 4X'), { status: 'none', materials: [], varied: false }, 'rating only');
    assertEqual(evidence('NEMA 4X enclosure'), { status: 'none', materials: [], varied: false }, 'free text rating');
    // Backend bare-4X default (4XSS) without a row or a stainless signal stays uncertain, not a clean stainless.
    assertEqual(resolve(rec('r1', 'Enclosure NEMA Rating 4X', { enc: '4XSS' })), { materials: [SS], varied: true, source: 'legacy' }, 'bare 4X fallback uncertain');
});

// ---------------------------------------------------------------- Exclusion safeguard
runTest('Material row controls the branch and excludes both other materials', () => {
    const fgRow = rec('a', 'Enclosure Material Fiberglass NOTES: 316 STAINLESS STEEL HARDWARE, STAINLESS PUMP', { enc: 'Varied / Multiple', encV: true });
    assertEqual(resolve(fgRow), { materials: [FG], varied: false, source: 'row' }, 'fiberglass row');
    assert(matches(fgRow, FG) && !matches(fgRow, SS) && !matches(fgRow, PS), 'fiberglass only');

    const psRow = rec('b', 'Enclosure Material: Painted Steel 4XSS', { enc: '4XSS' });
    assertEqual(resolve(psRow), { materials: [PS], varied: false, source: 'row' }, 'painted row beats legacy 4XSS');
    assert(matches(psRow, PS) && !matches(psRow, SS) && !matches(psRow, FG), 'painted only');

    const ssRow = rec('c', 'Enclosure Material (304) Stainless Steel. Option: FIBERGLASS 4XFG', { enc: '4XFG' });
    assertEqual(resolve(ssRow), { materials: [SS], varied: false, source: 'row' }, 'stainless row beats narrative FG');
    assert(matches(ssRow, SS) && !matches(ssRow, FG) && !matches(ssRow, PS), 'stainless only');
    assertEqual([fgRow.enc, fgRow.encV, psRow.enc, ssRow.enc], ['Varied / Multiple', true, '4XSS', '4XFG'], 'raw enc untouched');
});

runTest('Conflicting rows/values keep uncertainty with no clean winner', () => {
    const twoRows = rec('d', 'Enclosure Material Fiberglass Enclosure Material Stainless Steel', { enc: '4XSS' });
    assertEqual(resolve(twoRows), { materials: [FG, SS], varied: true, source: 'row' }, 'two rows');
    assert(InfoTableParser.matchEnclosureMaterial(twoRows, FG).varied && InfoTableParser.matchEnclosureMaterial(twoRows, SS).varied, 'both uncertain');
    assert(!matches(twoRows, PS), 'unnamed material excluded');
    assertEqual(evidence('Enclosure Material: Fiberglass or 304 SS'), { status: 'conflict', materials: [FG, SS], varied: true }, 'alternatives in one cell');
    assertEqual(evidence('Enclosure Material Fiberglass Enclosure Material Fiberglass'), { status: 'row', materials: [FG], varied: false }, 'agreeing rows stay clean');
    assertEqual(evidence('Enclosure Material Fiberglass Enclosure Material TBD'), { status: 'row', materials: [FG], varied: true }, 'extra blank row -> uncertain');
});

runTest('Bare steel / other materials are never stainless; POLY never relabeled', () => {
    const steel = rec('e', 'Enclosure Material Steel. NEMA 4X', { enc: '4XSS' });
    assertEqual(resolve(steel), { materials: [], varied: false, source: 'row' }, 'bare steel row excludes all three');
    const poly = rec('f', 'POLYCARBONATE ENCLOSURE', { enc: 'POLY' });
    assertEqual(resolve(poly).materials, [], 'POLY not converted');
    assert(![FG, SS, PS].some(m => matches(poly, m)), 'POLY reachable only via Any');
    assertEqual(poly.enc, 'POLY', 'POLY raw value kept');
});

runTest('Documented legacy fallback when the row is missing or unreadable', () => {
    assertEqual(resolve(rec('g1', 'FIBERGLASS 4XFG ENCLOSURE', { enc: '4XFG' })), { materials: [FG], varied: false, source: 'legacy' }, '4XFG + supporting signal clean');
    assertEqual(resolve(rec('g2', 'NEMA 4X', { enc: '4XFG' })), { materials: [FG], varied: true, source: 'legacy' }, '4XFG without signal uncertain');
    assertEqual(resolve(rec('g3', 'FIBERGLASS WITH STAINLESS HARDWARE', { enc: '4XFG' })), { materials: [FG], varied: true, source: 'legacy' }, 'opposite signal -> uncertain, not opposite match');
    assertEqual(resolve(rec('g4', 'STAINLESS 4XSS', { enc: '4XSS', encV: true })), { materials: [SS], varied: true, source: 'legacy' }, 'backend encV preserved');
    assertEqual(resolve(rec('g5', 'Enclosure Material TBD | STAINLESS 4XSS', { enc: '4XSS' })), { materials: [SS], varied: false, source: 'legacy' }, 'unreadable row falls back');
    assertEqual(resolve(rec('g6', 'FIBERGLASS AND STAINLESS', { enc: 'Varied / Multiple', encV: true })), { materials: [FG, SS], varied: true, source: 'legacy' }, 'varied legacy -> strong-signal candidates');
    assertEqual(resolve(rec('g7', 'SS HARDWARE S/S LATCH', { enc: null })), { materials: [], varied: false, source: 'none' }, 'bare SS is not a strong signal');
    assertEqual(resolve(rec('g8', 'NOTHING', { enc: 'PAINTED STEEL' })), { materials: [PS], varied: false, source: 'legacy' }, 'painted feedback code');
    assertEqual(InfoTableParser.materialFromEncCode('4XSS'), SS, 'legacy SS code');
    assertEqual(InfoTableParser.materialFromEncCode('POLY'), null, 'POLY code');
});

// ---------------------------------------------------------------- Search integration
global.window = global.window || {};
global.PDF_STATUS = { MISSING: 'missing' };
global.KeywordMatcher = new Function(`return ${extractClassSource('KeywordMatcher')}`)();
global.AI_TRAINING_DATA = {
    ALIASES: {},
    MANUFACTURERS: ['GORMAN RUPP', 'BARNES', 'HYDROMATIC', 'FLYGT', 'MYERS', 'GOULDS', 'ZOELLER', 'LIBERTY', 'WILO', 'PENTAIR', 'ABS', 'GODWIN', 'FRANKLIN', 'EBARA', 'HIDROSTAL'],
    DATA: { HP: [5, 10], VOLT: [208, 480], PHASE: [1, 3] }
};
global.PdfController = { stopPreloading() {}, preloadSearchResults() {} };
global.FeedbackService = { resetLockout() {}, lockout: new Set() };
global.PRELOAD_START_DELAY_MS = 0;
global.Option = function (text, value) { this.text = String(text); this.value = String(value); };
const SearchEngine = new Function(`return ${extractClassSource('SearchEngine')}`)();
const UI = new Function(`return ${extractClassSource('UI')}`)();
global.SearchEngine = SearchEngine;
global.UI = UI;

function select(value) {
    return {
        value, options: [],
        set innerHTML(_html) { this.options = []; this.value = ''; },
        add(option) { this.options.push(option); if (this.options.length === 1) this.value = option.value; }
    };
}
function setupInputs(values = {}) {
    const inputs = {};
    ['sys', 'mfg', 'hp', 'volt', 'phase', 'enc'].forEach(k => { inputs[k + 'Input'] = select(values[k] || 'Any'); });
    inputs.catInput = select(values.cat || 'Any');
    Object.assign(inputs, {
        keywordInput: { value: values.keyword || '', placeholder: '', classList: { toggle() {} } },
        'keyword-blocklist-toggle': { setAttribute() {} },
        'keyword-contradiction-warning': { textContent: '', style: {} },
        'pagination-footer': { style: {} },
        'page-info': { textContent: '' },
        'page-prev': { disabled: false },
        'page-next': { disabled: false }
    });
    global.DOM_CACHE = { get: id => inputs[id] || null };
    return inputs;
}
function searchWith(records, values) {
    setupInputs(values);
    UI.keywordBlocklistMode = false;
    UI.keywordAllowedTermsInput = values.keyword || '';
    UI.keywordBlockedTermsInput = values.blocked || '';
    window.LOCAL_DB = records;
    let rendered = null;
    UI.render = (page, crit, total) => { rendered = { page, crit, total }; };
    UI.isSmallMobile = () => false;
    UI.handleSearchCompletion = () => {};
    UI.syncMobileResultsCount = () => {};
    SearchEngine.perform();
    return rendered;
}
function materialRecords() {
    return [
        rec('1', 'Enclosure Material Fiberglass. 316 STAINLESS HARDWARE', { enc: '4XSS', mfg: 'BARNES' }),
        rec('2', 'FIBERGLASS 4XFG', { enc: '4XFG', mfg: 'BARNES' }),
        rec('3', 'NEMA 4X', { enc: '4XFG', mfg: 'BARNES' }),
        rec('4', 'Enclosure Material Painted Steel', { enc: '4XSS', mfg: 'BARNES' }),
        rec('5', 'Enclosure Material (304) Stainless Steel FIBERGLASS', { enc: '4XFG', mfg: 'FLYGT' }),
        rec('6', 'Enclosure Material Fiberglass Enclosure Material Stainless Steel', { enc: '4XSS', mfg: 'FLYGT' }),
        rec('7', 'POLYCARBONATE', { enc: 'POLY', mfg: 'FLYGT' }),
        rec('8', 'Enclosure Material Fiberglass', { enc: null, mfg: 'FLYGT', category: 'low_voltage' })
    ];
}

runTest('Material search filters, sorts clean before uncertain, and badges show material labels', () => {
    const records = materialRecords();
    const snapshot = records.map(r => [r.enc, r.encV]);
    const fg = searchWith(records, { enc: FG, cat: 'Standard' });
    assertEqual(fg.page.map(r => r.id), ['2', '1', '6', '3'], 'fiberglass: clean (row/legacy-supported) then uncertain');
    assertEqual(fg.total, 4, 'count');
    assertEqual(UI._generateBadges(records[0], fg.crit).filter(b => /Fiberglass|4X/.test(b)), ['<span class="hud-badge match-green">Fiberglass</span>'], 'green material badge');
    assert(UI._generateBadges(records[5], fg.crit).join(' ').includes('match-orange">Fiberglass'), 'conflict badge orange');
    assert(!UI._generateBadges(records[0], fg.crit).join(' ').includes('4XSS'), 'no legacy code badge');
    assertEqual(searchWith(records, { enc: SS, cat: 'Standard' }).page.map(r => r.id), ['5', '6'], 'stainless excludes FG/painted rows');
    assertEqual(searchWith(records, { enc: PS, cat: 'Standard' }).page.map(r => r.id), ['4'], 'painted steel only');
    const any = searchWith(records, { enc: 'Any', cat: 'Any' });
    assertEqual(any.total, 8, 'Any returns everything including POLY');
    assert(!UI._generateBadges(records[0], any.crit).join(' ').includes('Fiberglass'), 'no badge when unfiltered');
    assertEqual(records.map(r => [r.enc, r.encV]), snapshot, 'no mutation of raw enc/encV');
    assert(records.every(r => !Object.keys(r).includes('_encEvidence')) && !JSON.stringify(records).includes('_encEvidence'), 'derived evidence non-enumerable/non-persisted');
});

runTest('Material filter combines with mfg, category, keywords and pagination', () => {
    const records = materialRecords();
    assertEqual(searchWith(records, { enc: FG, mfg: 'FLYGT', cat: 'Any' }).page.map(r => r.id), ['8', '6'], 'mfg + material + category Any');
    assertEqual(searchWith(records, { enc: FG, cat: 'Any', keyword: 'HARDWARE' }).page.map(r => r.id), ['1'], 'keyword still dominates');
    assertEqual(searchWith(records, { enc: SS, cat: 'Any', keyword: 'STAINLESS' }).page.map(r => r.id), ['5', '6'], 'stainless keyword cannot re-admit a fiberglass row');
    const many = Array.from({ length: 30 }, (_, i) => rec(`m${i}`, 'Enclosure Material Painted Steel', { enc: '4XSS' }));
    const paged = searchWith(many, { enc: PS, cat: 'Any' });
    assertEqual([paged.page.length, paged.total, DOM_CACHE.get('page-info').textContent], [25, 30, 'Page 1 of 2'], 'pagination');
});

runTest('pop() offers Any + three materials, keeps live material value; reset returns Any', () => {
    const inputs = setupInputs({ enc: SS, cat: 'LowVoltage' });
    window.FOUND_MFGS = new Set();
    window.MFG_RANKING = null;
    UI.keywordAllowedTermsInput = '';
    UI.keywordBlockedTermsInput = '';
    UI.pop();
    assertEqual(inputs.encInput.options.map(o => o.value), ['Any', FG, SS, PS], 'enclosure options (no POLY)');
    assertEqual(inputs.encInput.value, SS, 'material survives');
    inputs.encInput.value = '4XFG';
    UI.pop();
    assertEqual(inputs.encInput.value, 'Any', 'stale legacy code falls back to Any');
    const originalToggle = UI.toggleSearch;
    UI.toggleSearch = () => {};
    inputs.encInput.value = PS;
    try { UI.resetSearch(); } finally { UI.toggleSearch = originalToggle; }
    assertEqual([inputs.encInput.value, inputs.catInput.value], ['Any', 'Standard'], 'reset');
});

// ---------------------------------------------------------------- Manufacturer coverage
function rankCounts(entries, opts) {
    const records = [];
    entries.forEach(([mfg, n]) => { for (let i = 0; i < n; i++) records.push({ id: `${mfg}-${i}`, desc: `Pump Manufacturer ${mfg}` }); });
    InfoTableParser.deriveRecordsSync(records);
    return InfoTableParser.rankManufacturers(records, opts);
}

runTest('Coverage: exact 90%, crossing, single, ties, more than eight', () => {
    const exact = rankCounts([['Barnes', 60], ['Flygt', 20], ['Myers', 10], ['Goulds', 5], ['Ebara', 5]]);
    assertEqual([exact.options, exact.coveredRecords, exact.eligibleRecords], [['BARNES', 'FLYGT', 'MYERS'], 90, 100], '60/20/10/5/5 -> exactly 90%');
    assertEqual(rankCounts([['Barnes', 70], ['Flygt', 25], ['Myers', 5]]).options, ['BARNES', 'FLYGT'], '70/25/5 -> 95%');
    assertEqual(rankCounts([['Myers', 3]]).options, ['MYERS'], 'single manufacturer');
    assertEqual(rankCounts([['Barnes', 9], ['Flygt', 1]]).options, ['BARNES'], '9/10 is exactly 90% (integer-safe)');
    assertEqual(rankCounts([['Wilo', 5], ['Abs', 5], ['Ebara', 5], ['Myers', 5]]).options, ['ABS', 'EBARA', 'MYERS', 'WILO'], 'ties alphabetical');
    assertEqual(rankCounts([['Barnes', 50], ['Wilo', 25], ['Abs', 25]]).options, ['BARNES', 'ABS', 'WILO'], 'crossing tie is alphabetical, minimal prefix');
    assertEqual(rankCounts([['Barnes', 80], ['Wilo', 10], ['Abs', 10]]).options, ['BARNES', 'ABS'], 'tie not extended past threshold');
    const ten = ['Barnes', 'Flygt', 'Myers', 'Goulds', 'Ebara', 'Zoeller', 'Wilo', 'Abs', 'Liberty', 'Pentair'].map(m => [m, 10]);
    assertEqual(rankCounts(ten).options.length, 9, 'uniform ten needs nine (no eight cap)');
});

runTest('Coverage: aliases, dedup, allowed eligibility, unknowns and zero evidence', () => {
    const records = [
        { id: '1', desc: 'Pump Manufacturer Crane' }, { id: '2', desc: 'Pump Manufacturer Barnes' },
        { id: '2', desc: 'Pump Manufacturer Barnes' }, { id: '3', desc: 'Pump Manufacturer Grundfos' },
        { id: '4', desc: 'Pump Manufacturer Flygt' }, { id: '5', desc: 'no table BARNES' }
    ];
    InfoTableParser.deriveRecordsSync(records);
    const all = InfoTableParser.rankManufacturers(records);
    assertEqual([all.counts, all.eligibleRecords], [{ BARNES: 2, FLYGT: 1 }, 3], 'aliases + dedup, unknown excluded from denominator');
    assertEqual(all.options, ['BARNES', 'FLYGT'], '2/3 < 90% -> includes FLYGT');
    const allowed = InfoTableParser.rankManufacturers(records, { allowed: ['BARNES'] });
    assertEqual([allowed.options, allowed.eligibleRecords], [['BARNES'], 2], 'denominator after allowed filter');
    const none = InfoTableParser.rankManufacturers([{ id: 'x', desc: 'nothing' }]);
    assertEqual([none.options, none.eligibleRecords, none.coveredRecords], [[], 0, 0], 'zero denominator -> no claim');
});

runTest('pop(): coverage list with Any first; excluded selection survives; zero evidence falls back', () => {
    const inputs = setupInputs({ mfg: 'HIDROSTAL' });
    window.FOUND_MFGS = new Set(['FLYGT', 'BARNES']);
    window.MFG_RANKING = rankCounts([['Barnes', 60], ['Flygt', 20], ['Myers', 10], ['Goulds', 5], ['Hidrostal', 5]]);
    UI.pop();
    assertEqual(inputs.mfgInput.options.map(o => o.value), ['Any', 'BARNES', 'FLYGT', 'MYERS', 'HIDROSTAL'], 'coverage + retained selection');
    assertEqual(inputs.mfgInput.value, 'HIDROSTAL', 'selection retained');
    window.MFG_RANKING = rankCounts([]);
    inputs.mfgInput.value = 'Any';
    UI.pop();
    assertEqual(inputs.mfgInput.options.map(o => o.value), ['Any', 'BARNES', 'FLYGT'], 'existing safe fallback list');
    window.MFG_RANKING = null;
});

runTest('DataLoader ranks once per applied dataset with allowed list; DERIVED_REV bump re-derives', () => {
    const windowState = { LOCAL_DB: [], ID_MAP: new Map(), FOUND_MFGS: new Set(), FOUND_ENCS: new Set() };
    const DataLoader = new Function('window', 'localStorage', 'InfoTableParser', `${extractClassSource('DataLoader')}; return DataLoader;`)(
        windowState, { getItem: () => null, setItem() {}, removeItem() {} }, InfoTableParser);
    const old = { id: 'o', desc: 'Enclosure Material Fiberglass Pump Manufacturer Myers', enc: '4XSS' };
    Object.defineProperty(old, '_derivedRev', { value: 1, writable: true, configurable: true, enumerable: false });
    DataLoader.applySnapshot({ records: [old] });
    assertEqual(InfoTableParser.DERIVED_REV, 2, 'revision bumped');
    assertEqual([old._derivedRev, old._encEvidence.status, old.enc], [2, 'row', '4XSS'], 'v2.5.95-derived record recomputed, raw enc kept');
    assertEqual(windowState.MFG_RANKING.options, ['MYERS'], 'ranking on apply');
    assert(/const SNAPSHOT_SCHEMA_VERSION = '1';/.test(appJsContent), 'snapshot schema unchanged');
});

// ---------------------------------------------------------------- Feedback
function buildFeedback() {
    const elements = {};
    const el = (value = '') => ({
        value, disabled: false, title: '', options: [], firstChild: null, className: '', innerText: '', dataset: {},
        classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
        add(option) { this.options.push(option); }, removeChild() {}
    });
    ['fb-mfg', 'fb-hp', 'fb-volt', 'fb-phase', 'fb-enc', 'fb-sys', 'fb-low-volt-btn', 'feedback-modal'].forEach(id => { elements[id] = el(); });
    const selectedButtons = [];
    const queries = [];
    let posted = null;
    const Feedback = new Function('document', 'AI_TRAINING_DATA', 'UI', 'localStorage', 'fetch', 'alert', 'buildWorkerUrl', 'AuthService', 'SearchEngine',
        `${extractClassSource('FeedbackService')}; return FeedbackService;`)(
        { getElementById: id => elements[id], querySelectorAll: sel => { queries.push(sel); return sel.startsWith('#keyword-cluster') ? selectedButtons : []; } },
        global.AI_TRAINING_DATA, UI, { getItem: () => 'user' },
        (url, opts) => { posted = JSON.parse(opts.body); return Promise.resolve(); },
        () => {}, () => 'url', { headers: () => ({}) }, { lastCriteria: { kw: [] } }
    );
    Feedback.generateKeywordButtons = () => {};
    return { Feedback, elements, selectedButtons, queries, getPosted: () => posted };
}

runTest('Feedback enclosure shows material labels with compatible encodings; blank default', () => {
    const { Feedback, elements } = buildFeedback();
    Feedback.down('CP-1');
    const opts = elements['fb-enc'].options.map(o => [o.text, o.value]);
    assertEqual(opts, [['Select Correct...', ''], ['Varied / Multiple', 'Varied / Multiple'], [FG, '4XFG'], [SS, '4XSS'], [PS, 'PAINTED STEEL']], 'labels/encodings');
    ['fb-sys', 'fb-enc', 'fb-volt', 'fb-phase', 'fb-mfg', 'fb-hp'].forEach(id => assertEqual(elements[id].value, '', `${id} defaults blank`));
    assertEqual(Object.values(InfoTableParser.MATERIAL_FEEDBACK_CODES).map(InfoTableParser.materialFromEncCode), [FG, SS, PS], 'codes round-trip to materials');
});

runTest('Feedback payload, per-parameter lockouts, and keyword iteration excludes category button', async () => {
    const { Feedback, elements, selectedButtons, queries, getPosted } = buildFeedback();
    Feedback.down('CP-2');
    elements['fb-enc'].value = 'PAINTED STEEL';
    elements['fb-sys'].value = 'Duplex';
    elements['fb-mfg'].value = 'BARNES';
    selectedButtons.push({ dataset: { kw: 'FLOAT' } }, { dataset: {} });
    await Feedback.submit();
    const fields = getPosted().records[0].fields;
    assertEqual(JSON.parse(fields.Corrections), { mfg: 'BARNES', enc: 'PAINTED STEEL', sys: 'Duplex', reject_keywords: ['FLOAT'] }, 'payload');
    assertEqual([fields['Panel ID'], fields.Vote, fields.User, typeof fields.Date], ['CP-2', 'Down', 'user', 'string'], 'payload envelope');
    assert(queries.every(q => q.startsWith('#keyword-cluster')), 'keyword query scoped to keyword cluster');
    ['p_enc', 'p_sys', 'p_mfg'].forEach(k => assert(Feedback.lockout.has(`CP-2:${k}`), `${k} locked`));
    Feedback.down('CP-2');
    assert(elements['fb-enc'].disabled && elements['fb-sys'].disabled && elements['fb-mfg'].disabled && !elements['fb-hp'].disabled, 'locked selects disabled, others open');
});

runTest('index.html: feedback grid mirrors the search grid with accessible labels', () => {
    const order = ['fb-sys', 'fb-enc', 'fb-volt', 'fb-phase', 'fb-mfg', 'fb-hp'];
    const positions = order.map(id => indexHtml.indexOf(`<select id="${id}"`));
    positions.forEach((p, i) => assert(p > 0, `${order[i]} missing`));
    positions.slice(1).forEach((p, i) => assert(p > positions[i], `${order[i + 1]} must follow ${order[i]}`));
    order.forEach(id => assert(new RegExp(`<label class="feedback-label" for="${id}">Correct [A-Za-z ]+</label><select id="${id}"`).test(indexHtml), `${id} labelled`));
    const lowVolt = indexHtml.indexOf('id="fb-low-volt-btn"');
    const kwArea = indexHtml.indexOf('id="keyword-feedback-area"');
    const submit = indexHtml.indexOf('FeedbackService.submit()');
    assert(positions[5] < lowVolt && lowVolt < kwArea && kwArea < submit, 'category, keywords, submit follow the grid');
});

runTest('Worker stays free of browser material parsing', () => {
    const workerSource = fs.readFileSync(path.join(root, 'worker', 'worker.js'), 'utf8');
    const extractSource = fs.readFileSync(path.join(root, 'worker', 'lib', 'extract.js'), 'utf8');
    assert(!/info-table|InfoTable|_encEvidence|matchEnclosureMaterial/.test(workerSource + extractSource), 'Worker must not import/call browser parsing');
});

// ---------------------------------------------------------------- Performance
runTest('Performance: ~8,000 records with material rows stay bounded/linear; no backtracking hazards', async () => {
    const filler = 'NOTES: STAINLESS HARDWARE, 4X, HOA SWITCHES, RUN LIGHTS, SEAL FAIL, HIGH LEVEL ALARM. '.repeat(8);
    const mats = ['FIBERGLASS', '(304) STAINLESS STEEL', 'PAINTED STEEL', 'STEEL', ''];
    const make = (n, offset = 0) => Array.from({ length: n }, (_, i) => ({
        id: `P${i + offset}`, enc: '4XSS',
        desc: `${filler}\nPANEL TYPE: DUPLEX\nNO. MOTORS: 2\nPUMP MANUFACTURER: BARNES\nENCLOSURE NEMA RATING: 4X\nENCLOSURE MATERIAL: ${mats[i % 5]}\nENCLOSURE SIZE: 36X30\n${filler}`
    }));
    InfoTableParser.deriveRecordsSync(make(500, 1e6));
    const time = n => {
        const records = make(n);
        const start = process.hrtime.bigint();
        InfoTableParser.deriveRecordsSync(records);
        InfoTableParser.rankManufacturers(records);
        records.forEach(r => InfoTableParser.matchEnclosureMaterial(r, FG));
        return Number(process.hrtime.bigint() - start) / 1e6;
    };
    const ms8k = time(8000);
    const ms16k = time(16000);
    console.log(`   8,000 records: ${ms8k.toFixed(1)}ms, 16,000 records: ${ms16k.toFixed(1)}ms`);
    assert(ms8k < 1500, `8,000 records took ${ms8k.toFixed(1)}ms`);
    assert(ms16k < ms8k * 3.5 + 50, `superlinear growth: ${ms8k.toFixed(1)}ms -> ${ms16k.toFixed(1)}ms`);
    let yields = 0;
    const originalInfo = console.info;
    console.info = () => {};
    try {
        await InfoTableParser.deriveRecords(make(1000), { chunkSize: 250, yieldFn: async () => { yields++; } });
    } finally {
        console.info = originalInfo;
    }
    assertEqual(yields, 3, 'chunked derivation still yields');
    const worst = { id: 'w', desc: 'ENCLOSURE MATERIAL ' + ' '.repeat(100000) + 'FIBER' + ' '.repeat(100000) + 'GLAS ' + 'ENCLOSURE MATERIAL STEEL '.repeat(5000) + 'FIBER '.repeat(20000) };
    const start = process.hrtime.bigint();
    InfoTableParser.deriveRecord(worst);
    const worstMs = Number(process.hrtime.bigint() - start) / 1e6;
    assert(worstMs < 250, `pathological input took ${worstMs.toFixed(1)}ms`);
});

(async () => {
    for (const test of pending) await test();
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.log('⚠️  Some tests failed.');
        process.exit(1);
    }
    console.log('✨ All v2.5.96 enclosure material / manufacturer coverage / feedback tests passed!');
})();
