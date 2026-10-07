// v2.5.97 frontend System Type + top-12 manufacturer ranking tests.
// Run: node tests/system-type-mfg-ranking.test.js
const fs = require('fs');
const path = require('path');
const InfoTableParser = require('../info-table-parser.js');

const root = path.join(__dirname, '..');
const appJsContent = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

console.log('🧪 Testing v2.5.97 System Type + Manufacturer ranking (browser-only)\n');

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

const derive = desc => InfoTableParser.deriveFromDesc(desc);
const sysOf = desc => {
    const r = derive(desc);
    return { sys: r.sys, sysV: r.sysV };
};

// ---------------------------------------------------------------- Parser
runTest('Screenshot case: Panel Type Duplex + No. Motors 2 -> Duplex clean', () => {
    const desc = 'Panel Type Duplex Voltage 480 Phase/HZ 3/60 No. Motors 2 HP 15 FLA 28.5 Pump Manufacturer Barnes Type of Pump Submersible';
    assertEqual(derive(desc), { sys: 'Duplex', sysV: false, pumpMfg: 'BARNES' }, 'screenshot row set');
    const multiline = 'PANEL TYPE\nDUPLEX\nVOLTAGE\n480\nPHASE/HZ\n3/60\nNO. MOTORS\n2\nHP\n15\nFLA\n28.5\nPUMP MANUFACTURER\nBARNES';
    assertEqual(derive(multiline), { sys: 'Duplex', sysV: false, pumpMfg: 'BARNES' }, 'one cell per line');
    const piped = 'Panel Type | Duplex | Voltage | 480\nNo. Motors | 2 | HP | 15';
    assertEqual(sysOf(piped), { sys: 'Duplex', sysV: false }, 'pipe-delimited table');
});

runTest('All four types and Quadraplex aliases', () => {
    assertEqual(sysOf('Panel Type: Simplex No. Motors: 1'), { sys: 'Simplex', sysV: false }, 'simplex');
    assertEqual(sysOf('Panel Type: Duplex No. Motors: 2'), { sys: 'Duplex', sysV: false }, 'duplex');
    assertEqual(sysOf('Panel Type: Triplex No. Motors: 3'), { sys: 'Triplex', sysV: false }, 'triplex');
    assertEqual(sysOf('Panel Type: Quadraplex No. Motors: 4'), { sys: 'Quadraplex', sysV: false }, 'quadraplex');
    assertEqual(sysOf('panel type quadplex no. motors 4'), { sys: 'Quadraplex', sysV: false }, 'quadplex alias');
    assertEqual(sysOf('PANEL TYPE QUADRUPLEX NO OF MOTORS 4'), { sys: 'Quadraplex', sysV: false }, 'quadruplex alias');
    assertEqual(sysOf('Panel Type Triplex'), { sys: 'Triplex', sysV: false }, 'explicit type without count stays clean');
    assertEqual(InfoTableParser.normalizeSystemType('Duplex or Triplex'), null, 'ambiguous panel type cell is not evidence');
    const uiTypes = appJsContent.match(/static SYSTEM_TYPES = (\[[^\]]*\]);/);
    assertEqual(uiTypes && JSON.parse(uiTypes[1].replace(/'/g, '"')), InfoTableParser.SYSTEM_TYPES, 'UI.SYSTEM_TYPES mirrors the parser list');
    assertEqual(sysOf('Panel Type Duplex or Triplex No. Motors 2'), { sys: 'Duplex', sysV: true }, 'ambiguous panel type falls back to an uncertain plain count');
    assertEqual(sysOf('Panel Type Duplex/Triplex'), { sys: null, sysV: false }, 'slashed panel type is not evidence');
});

runTest('Mismatch: explicit Panel Type wins with sysV=true', () => {
    assertEqual(sysOf('Panel Type Duplex No. Motors 3'), { sys: 'Duplex', sysV: true }, 'duplex vs 3');
    assertEqual(sysOf('Panel Type Simplex No. Motors 4'), { sys: 'Simplex', sysV: true }, 'simplex vs 4');
    assertEqual(sysOf('Panel Type Simplex Panel Type Duplex No. Motors 2'), { sys: null, sysV: false }, 'conflicting explicit rows have no winner');
});

runTest('Combination counts are never summed, prefix-captured, or used for inference', () => {
    for (const combo of ['2+2', '2 + 1', '4+2', '1+1', '2 +2', '2/1', '2-3', '2.5', '2 TO 3', '5', '12', '0', '2 X 5']) {
        assertEqual(InfoTableParser.parseMotorCount(combo), null, `parseMotorCount(${combo})`);
        assertEqual(sysOf(`No. Motors ${combo} Voltage 480`), { sys: null, sysV: false }, `count-only ${combo}`);
    }
    assertEqual(sysOf('Panel Type Duplex No. Motors 2+2'), { sys: 'Duplex', sysV: true }, 'explicit + 2+2 keeps type, uncertain');
    assertEqual(sysOf('Panel Type Triplex No. Motors 2 + 1 HP 5'), { sys: 'Triplex', sysV: true }, 'explicit + 2 + 1 keeps type, uncertain');
    assertEqual(sysOf('Panel Type Quadraplex No. Motors 4+2'), { sys: 'Quadraplex', sysV: true }, 'explicit + 4+2 keeps type, uncertain');
    assertEqual(sysOf('Panel Type Duplex No. Motors 1+1'), { sys: 'Duplex', sysV: true }, 'explicit + 1+1 keeps type, uncertain');
});

runTest('Plain count only -> inferred with sysV=true; nothing -> no type', () => {
    assertEqual(sysOf('No. Motors 1 HP 5'), { sys: 'Simplex', sysV: true }, 'count 1');
    assertEqual(sysOf('Number of Motors: 2'), { sys: 'Duplex', sysV: true }, 'count 2');
    assertEqual(sysOf('NO. OF MOTORS 3 PUMPS'), { sys: 'Triplex', sysV: true }, 'count 3 with trailing word');
    assertEqual(sysOf('No. Motors 4'), { sys: 'Quadraplex', sysV: true }, 'count 4');
    assertEqual(sysOf('No. Motors 2 No. Motors 3'), { sys: null, sysV: false }, 'disagreeing counts infer nothing');
    assertEqual(sysOf('Duplex pump station with 2 motors'), { sys: null, sysV: false }, 'free text is never evidence');
    assertEqual(sysOf(''), { sys: null, sysV: false }, 'empty');
    assertEqual(sysOf(undefined), { sys: null, sysV: false }, 'missing desc');
});

runTest('TAG decoy does not override Panel Type', () => {
    const desc = 'PANEL TYPE: SIMPLEX\nTAG: SEW-03 Duplex Pump\nNO. MOTORS: 1\nPUMP MANUFACTURER: MYERS';
    assertEqual(derive(desc), { sys: 'Simplex', sysV: false, pumpMfg: 'MYERS' }, 'tag decoy');
    assertEqual(sysOf('TAG: SEW-03 Duplex Pump'), { sys: null, sysV: false }, 'tag alone is not evidence');
});

runTest('Flattened neighbor labels are never consumed as values', () => {
    const flat = 'PANEL TYPE DUPLEX VOLTAGE 480 PHASE/HZ 3/60 NO. MOTORS 2 HP 15 FLA 28.5 PUMP MANUFACTURER GOULDS TYPE OF PUMP SUBMERSIBLE';
    const rows = InfoTableParser.extractInfoRows(flat);
    assertEqual(rows.panelTypes, ['DUPLEX'], 'panel type stops at VOLTAGE');
    assertEqual(rows.motorCounts, ['2'], 'motor count stops at HP');
    assertEqual(rows.pumpMfgs, ['GOULDS'], 'pump manufacturer stops at TYPE OF PUMP');
    assertEqual(sysOf('Panel Type Voltage 480 No. Motors Phase 3'), { sys: null, sysV: false }, 'empty cells do not borrow the next label value');
    assertEqual(sysOf('No. Motors FLA 2'), { sys: null, sysV: false }, 'count cannot be read across FLA');
    assertEqual(derive('Pump Manufacturer Type of Pump Barnes').pumpMfg, null, 'pump mfg cannot be read across Type of Pump');
    const longGap = 'Panel Type' + ' '.repeat(80) + 'Duplex';
    assertEqual(sysOf(longGap), { sys: null, sysV: false }, 'value window is bounded');
});

runTest('Pump Manufacturer normalization uses the canonical aliases', () => {
    const cases = {
        'Gorman-Rupp': 'GORMAN RUPP', 'GORMAN RUPP': 'GORMAN RUPP', 'Gorman': 'GORMAN RUPP', 'GRSP': 'GORMAN RUPP',
        'Crane': 'BARNES', 'Sithe': 'BARNES', 'Barnes': 'BARNES', 'Godwin SP': 'GODWIN', 'Flygt (Xylem)': 'FLYGT',
        'Sulzer': 'SULZER', 'Sulzer Pumps': 'SULZER', '(Sulzer),': 'SULZER', 'NOTSULZER': null, 'SULZERISH': null,
        'Grundfos': null, 'N/A': null, 'By Others': null, '': null
    };
    Object.entries(cases).forEach(([value, expected]) => assertEqual(InfoTableParser.normalizeManufacturer(value), expected, value));
    const extract = require('../worker/lib/extract.js');
    Object.entries(extract.EXACT_MFGS).forEach(([canonical, aliases]) => {
        aliases.forEach(alias => assertEqual(InfoTableParser.normalizeManufacturer(alias), canonical, `worker alias ${alias}`));
    });
    const withCanonical = table => Object.fromEntries(Object.entries(table).map(([k, v]) => [k, [...new Set([k, ...v])].sort()]));
    assertEqual(withCanonical(InfoTableParser.MFG_ALIASES), withCanonical(extract.EXACT_MFGS), 'browser alias table mirrors worker EXACT_MFGS');
    assertEqual(derive('Pump Manufacturer Barnes Pump Manufacturer Flygt').pumpMfg, null, 'conflicting rows are ignored');
    assertEqual(derive('Pump Manufacturer Barnes Pump Manufacturer Crane').pumpMfg, 'BARNES', 'aliases of one manufacturer agree');
    assertEqual(derive('Pump Manufacturer Sulzer Pump Manufacturer Sulzer Pumps').pumpMfg, 'SULZER', 'Sulzer aliases agree across bounded rows');
    assertEqual(derive('Pump Manufacturer Sulzer Pump Manufacturer Unknown').pumpMfg, null, 'unknown row evidence still invalidates canonical evidence');
    assert(!InfoTableParser.matchesManufacturer('NOTSULZER', 'SULZER'), 'embedded prefix is not a search match');
    assert(!InfoTableParser.matchesManufacturer('SULZERISH', 'SULZER'), 'embedded suffix is not a search match');
    assert(InfoTableParser.matchesManufacturer('(Sulzer Pumps),', 'SULZER'), 'description fallback accepts punctuation-bounded Sulzer Pumps');
});

// ---------------------------------------------------------------- Ranking
function makeRecord(id, desc, extra = {}) {
    return { id, desc, ...extra };
}
function rankOf(records) {
    InfoTableParser.deriveRecordsSync(records);
    return InfoTableParser.rankManufacturers(records);
}

runTest('Ranking: counts each unique record once, keeps frequency ordering, and reserves Sulzer', () => {
    const records = [];
    const add = (mfg, n) => { for (let i = 0; i < n; i++) records.push(makeRecord(`${mfg}-${i}`, `Pump Manufacturer ${mfg} Type of Pump Submersible`)); };
    add('Barnes', 5); add('Crane', 4); // 9 BARNES via alias
    add('Flygt', 7); add('Myers', 3); add('Goulds', 3); add('Zoeller', 3); add('Wilo', 2);
    add('Ebara', 2); add('Abs', 1); add('Liberty', 1); add('Grundfos', 6); // Grundfos unknown -> ignored
    records.push(makeRecord('Barnes-0', 'Pump Manufacturer Barnes')); // duplicate id counted once
    records.push(makeRecord('none', 'No info table here'));
    const ranking = rankOf(records);
    assertEqual(ranking.options, [...ranking.ranked, 'SULZER'], 'all fewer-than-12 names plus zero-count Sulzer');
    assertEqual(ranking.ranked, ['BARNES', 'FLYGT', 'GOULDS', 'MYERS', 'ZOELLER', 'EBARA', 'WILO', 'ABS', 'LIBERTY'], 'full ranking kept');
    assertEqual(ranking.counts.BARNES, 9, 'alias counting + id dedupe');
    assert(!('GRUNDFOS' in ranking.counts), 'unknown values ignored');
    assertEqual(ranking.eligibleRecords, 31, 'eligible records');
});

runTest('Ranking: fewer than 12 names and no row evidence', () => {
    const few = rankOf([makeRecord('a', 'Pump Manufacturer Myers'), makeRecord('b', 'Pump Manufacturer Ebara'), makeRecord('c', 'Pump Manufacturer Myers')]);
    assertEqual(few.options, ['MYERS', 'EBARA', 'SULZER'], 'frequency order plus reserved zero-count Sulzer');
    const none = rankOf([makeRecord('x', 'BARNES pump mentioned in prose'), makeRecord('y', '')]);
    assertEqual(none.options, [], 'no row evidence');
    assertEqual(none.eligibleRecords, 0, 'no eligible records');
});

// ---------------------------------------------------------------- Derivation lifecycle
function buildDataLoader(windowState) {
    const storage = new Map();
    const localStorage = { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
    return new Function('window', 'localStorage', 'InfoTableParser', `${extractClassSource('DataLoader')}; return DataLoader;`)(
        windowState, localStorage, InfoTableParser
    );
}

runTest('applySnapshot derives once per record, stores non-enumerable fields, and ranks once', () => {
    const windowState = { LOCAL_DB: [], ID_MAP: new Map(), FOUND_MFGS: new Set(), FOUND_ENCS: new Set() };
    const DataLoader = buildDataLoader(windowState);
    const records = [
        makeRecord('1', 'Panel Type Duplex No. Motors 2 Pump Manufacturer Barnes', { mfg: 'BARNES' }),
        makeRecord('2', 'No. Motors 3 Pump Manufacturer Flygt', { mfg: 'FLYGT' })
    ];
    DataLoader.applySnapshot({ records });
    assertEqual([records[0]._sys, records[0]._sysV, records[0]._pumpMfg], ['Duplex', false, 'BARNES'], 'record 1 derived');
    assertEqual([records[1]._sys, records[1]._sysV], ['Triplex', true], 'record 2 inferred');
    assert(!JSON.stringify(records).includes('_sys') && !Object.keys(records[0]).includes('_pumpMfg'), 'derived fields must not be persisted/enumerated');
    assertEqual(windowState.MFG_RANKING.options, ['BARNES', 'FLYGT', 'SULZER'], 'ranking computed on apply');
    assertEqual(InfoTableParser.deriveRecord(records[0]), false, 'already-derived records are not re-parsed');
});

runTest('Async derivation yields in chunks and logs DeriveTiming', async () => {
    const records = Array.from({ length: 1000 }, (_, i) => makeRecord(String(i), 'Panel Type Simplex No. Motors 1'));
    let yields = 0;
    const logs = [];
    const originalInfo = console.info;
    console.info = msg => logs.push(String(msg));
    try {
        const stats = await InfoTableParser.deriveRecords(records, { chunkSize: 250, yieldFn: async () => { yields++; } });
        assertEqual(stats.derived, 1000, 'all derived');
    } finally {
        console.info = originalInfo;
    }
    assertEqual(yields, 3, 'yields between chunks');
    assert(logs.some(l => /^\[DeriveTiming\] records=1000 derived=1000 ms=\d+$/.test(l)), 'timing log emitted');
});

runTest('Old cached snapshots derive on restore without schema bump or cache wipe', async () => {
    assert(/const SNAPSHOT_SCHEMA_VERSION = '1';/.test(appJsContent), 'SNAPSHOT_SCHEMA_VERSION must stay at 1');
    const windowState = { LOCAL_DB: [], ID_MAP: new Map(), FOUND_MFGS: new Set(), FOUND_ENCS: new Set() };
    const DataLoader = buildDataLoader(windowState);
    DataLoader.yieldMainThread = async () => {};
    const shard = JSON.stringify([
        { id: 'old-1', mfg: 'GOULDS', desc: 'Panel Type Triplex No. Motors 3 Pump Manufacturer Goulds' },
        { id: 'old-2', mfg: 'GOULDS', desc: 'Pump Manufacturer Goulds' }
    ]);
    const chunks = { __meta_active_generation: 'gen_1', 'gen_1:manifest': { shardCount: 1 }, 'gen_1:shard:0': shard };
    let deleted = 0;
    const DB = {
        getChunkKeys: async () => Object.keys(chunks),
        getChunk: async k => chunks[k],
        putChunk: async () => {},
        deleteChunk: async () => { deleted++; },
        deleteDatabase: async () => { deleted++; }
    };
    const CacheService = new Function('DB', 'window', 'DataLoader', `${extractClassSource('CacheService')}; return CacheService;`)(DB, windowState, DataLoader);
    CacheService.activeKey = {};
    CacheService.dec = async t => t;
    const restored = await CacheService.loadAllWithProgress(() => {});
    assert(restored === true, 'restore succeeds');
    assertEqual(windowState.LOCAL_DB.map(r => r._sys), ['Triplex', null], 'restored records derived');
    assertEqual(windowState.MFG_RANKING.options, ['GOULDS', 'SULZER'], 'ranking computed on restore');
    assertEqual(deleted, 0, 'no cache wipe');
});

// ---------------------------------------------------------------- Search / UI
global.window = global.window || {};
global.PDF_STATUS = { MISSING: 'missing' };
global.KeywordMatcher = new Function(`return ${extractClassSource('KeywordMatcher')}`)();
global.AI_TRAINING_DATA = {
    ALIASES: {},
    MANUFACTURERS: ['GORMAN RUPP', 'BARNES', 'SULZER', 'HYDROMATIC', 'FLYGT', 'MYERS', 'GOULDS', 'ZOELLER', 'LIBERTY', 'WILO', 'PENTAIR', 'ABS', 'GODWIN', 'FRANKLIN', 'EBARA', 'HIDROSTAL'],
    DATA: { HP: [5, 10], VOLT: [208, 480], PHASE: [1, 3] }
};
global.PdfController = { stopPreloading() {}, preloadSearchResults() {} };
global.FeedbackService = { resetLockout() {}, lockout: new Set() };
global.PRELOAD_START_DELAY_MS = 0;
const SearchEngine = new Function(`return ${extractClassSource('SearchEngine')}`)();
const UI = new Function(`return ${extractClassSource('UI')}`)();
global.InfoTableParser = InfoTableParser;
global.SearchEngine = SearchEngine;
global.UI = UI;

function select(value) {
    return {
        value, options: [],
        set innerHTML(_html) { this.options = []; this.value = ''; },
        add(option) { this.options.push(option); if (this.options.length === 1) this.value = option.value; }
    };
}
global.Option = function (text, value) { this.text = String(text); this.value = String(value); };

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
    UI.keywordBlockedTermsInput = '';
    window.LOCAL_DB = records;
    let rendered = null;
    UI.render = (page, crit, total) => { rendered = { page, crit, total }; };
    UI.isSmallMobile = () => false;
    UI.handleSearchCompletion = () => {};
    UI.syncMobileResultsCount = () => {};
    SearchEngine.perform();
    return rendered;
}

function systemRecords() {
    const records = [
        makeRecord('10', 'Panel Type Duplex No. Motors 3 PUMP 4XSS', { enc: '4XSS', mfg: 'BARNES', pdfUrl: 'x' }),
        makeRecord('11', 'Panel Type Duplex No. Motors 2', { enc: '4XFG', mfg: 'BARNES', pdfUrl: 'x' }),
        makeRecord('12', 'No. Motors 2', { enc: '4XFG', pdfUrl: 'x' }),
        makeRecord('13', 'Panel Type Simplex TAG: Duplex station', { enc: '4XFG', pdfUrl: 'x' }),
        makeRecord('14', 'No. Motors 2+2 Duplex', { enc: '4XFG', pdfUrl: 'x' }),
        makeRecord('15', 'Panel Type Duplex No. Motors 2', { enc: '4XFG', category: 'low_voltage', pdfUrl: 'x' })
    ];
    InfoTableParser.deriveRecordsSync(records);
    return records;
}

runTest('System Type search compares only derived sys; clean sorts before varied; badges only when filtered', () => {
    const records = systemRecords();
    const res = searchWith(records, { sys: 'Duplex', cat: 'Standard' });
    assertEqual(res.page.map(r => r.id), ['11', '12', '10'], 'duplex matches, clean first, category respected');
    assertEqual(res.total, 3, 'count');
    const badgesClean = UI._generateBadges(records[1], res.crit).join(' ');
    const badgesVaried = UI._generateBadges(records[0], res.crit).join(' ');
    assert(badgesClean.includes('match-green">DUPLEX'), 'clean badge green');
    assert(badgesVaried.includes('match-orange">DUPLEX'), 'varied badge orange');
    const anyRes = searchWith(records, { sys: 'Any', cat: 'Any' });
    assertEqual(anyRes.total, 6, 'Any leaves all records');
    assert(!UI._generateBadges(records[1], anyRes.crit).join(' ').includes('DUPLEX'), 'no system badge when unfiltered');
});

runTest('Sulzer search uses strict backend confidence and safe orange description fallback', () => {
    const records = [
        makeRecord('s1', 'Pump Manufacturer Sulzer Pumps', { mfg: 'SULZER', mfgV: false, pdfUrl: 'x' }),
        makeRecord('s2', 'SULZER / BARNES', { mfg: 'SULZER', mfgV: true, pdfUrl: 'x' }),
        makeRecord('s3', 'Sulzer Pumps', { mfg: null, mfgV: false, pdfUrl: 'x' }),
        makeRecord('s4', 'NOTSULZER SULZERISH', { mfg: null, mfgV: false, pdfUrl: 'x' })
    ];
    const result = searchWith(records, { mfg: 'SULZER', cat: 'Any' });
    assertEqual([result.total, result.page.map(r => r.id)], [3, ['s1', 's2', 's3']], 'strict and whole-token fallback match; embedded tokens do not');
    const strictBadge = UI._generateBadges(records[0], result.crit).join(' ');
    const variedBadge = UI._generateBadges(records[1], result.crit).join(' ');
    const oldCacheBadge = UI._generateBadges(records[2], result.crit).join(' ');
    assert(strictBadge.includes('match-green">SULZER'), 'clean backend Sulzer is green');
    assert(variedBadge.includes('match-orange">SULZER'), 'backend varied Sulzer stays orange');
    assert(oldCacheBadge.includes('match-orange">SULZER'), 'description-only old-cache Sulzer is orange, never green');
    assert(records[0].w > records[2].w, 'strict backend match scores above description fallback');
    assertEqual([records[0].mfg, records[2].mfg], ['SULZER', null], 'search does not overwrite backend manufacturer fields');
});

runTest('System Type branch is isolated from keywords, enclosure, and never re-parses', () => {
    const records = systemRecords();
    const plain = [makeRecord('20', 'Panel Type Duplex No. Motors 2', { enc: '4XFG', pdfUrl: 'x' })]; // not derived
    assertEqual(searchWith(plain, { sys: 'Duplex', cat: 'Any' }).total, 0, 'search reads only the pre-derived value');
    assertEqual(searchWith(records, { sys: 'Duplex', enc: '4XFG', cat: 'Any' }).page.map(r => r.id), ['15', '11', '12'], 'enclosure combines without altering sys');
    assertEqual(searchWith(records, { sys: 'Duplex', keyword: 'TAG', cat: 'Any' }).total, 0, 'keyword text does not create system matches');
    assertEqual(searchWith(records, { sys: 'Simplex', cat: 'Any' }).page.map(r => r.id), ['13'], 'TAG decoy stays Simplex');
    assertEqual(records[0].enc, '4XSS', 'enclosure untouched by sys branch');
    const many = Array.from({ length: 30 }, (_, i) => makeRecord(`m${i}`, 'Panel Type Triplex No. Motors 3', { pdfUrl: 'x' }));
    InfoTableParser.deriveRecordsSync(many);
    const paged = searchWith(many, { sys: 'Triplex', cat: 'Any' });
    assertEqual([paged.page.length, paged.total, DOM_CACHE.get('page-info').textContent], [25, 30, 'Page 1 of 2'], 'pagination');
});

runTest('pop() keeps an out-of-list manufacturer and System Type; top-12 ranking survives refresh', () => {
    const inputs = setupInputs({ sys: 'Triplex', mfg: 'HIDROSTAL', hp: '10', volt: '480', phase: '3', enc: 'Fiberglass', cat: 'LowVoltage', keyword: 'pump' });
    UI.keywordBlocklistMode = false;
    UI.keywordAllowedTermsInput = 'pump';
    UI.keywordBlockedTermsInput = 'float';
    window.FOUND_MFGS = new Set(['BARNES']);
    window.MFG_RANKING = { options: ['BARNES', 'FLYGT', 'GOULDS', 'MYERS', 'ZOELLER', 'EBARA', 'WILO', 'ABS'], counts: {}, eligibleRecords: 40 };
    for (let i = 0; i < 3; i++) UI.pop();
    assertEqual(inputs.mfgInput.options.map(o => o.value), ['Any', 'BARNES', 'FLYGT', 'GOULDS', 'MYERS', 'ZOELLER', 'EBARA', 'WILO', 'ABS', 'SULZER', 'HIDROSTAL'], 'top-12 list plus retained temporary selection');
    assertEqual(inputs.mfgInput.value, 'HIDROSTAL', 'out-of-coverage selection survives');
    assertEqual(inputs.sysInput.options.map(o => o.value), ['Any', 'Simplex', 'Duplex', 'Triplex', 'Quadraplex'], 'system type options');
    assertEqual([inputs.sysInput.value, inputs.hpInput.value, inputs.voltInput.value, inputs.phaseInput.value, inputs.encInput.value, inputs.catInput.value],
        ['Triplex', '10', '480', '3', 'Fiberglass', 'LowVoltage'], 'live criteria survive');
    assertEqual([UI.getAllowedKeywordTermsInput(), UI.getBlockedKeywordTermsInput()], ['pump', 'float'], 'keyword sets survive');
    inputs.mfgInput.value = 'FLYGT';
    UI.pop();
    assertEqual(inputs.mfgInput.options.length, 10, 'in-list selection adds no extra option');
    window.MFG_RANKING = { options: [], counts: {}, eligibleRecords: 0 };
    UI.pop();
    assertEqual(inputs.mfgInput.options.map(o => o.value), ['Any', 'BARNES', 'SULZER', 'FLYGT'], 'capped no-evidence fallback includes Sulzer and keeps selection');
    assertEqual(inputs.mfgInput.value, 'FLYGT', 'selection kept in fallback list');
    window.MFG_RANKING = null;
});

runTest('Reset returns System Type and all filters to defaults', () => {
    const inputs = setupInputs({ sys: 'Quadraplex', mfg: 'BARNES', hp: '10', volt: '480', phase: '3', enc: 'Painted Steel', cat: 'Any', keyword: 'x' });
    const originalToggle = UI.toggleSearch;
    UI.toggleSearch = () => {};
    UI.keywordAllowedTermsInput = 'x';
    UI.keywordBlockedTermsInput = 'y';
    try {
        UI.resetSearch();
    } finally {
        UI.toggleSearch = originalToggle;
    }
    assertEqual(['sys', 'mfg', 'hp', 'volt', 'phase', 'enc'].map(k => inputs[k + 'Input'].value), ['Any', 'Any', 'Any', 'Any', 'Any', 'Any'], 'filters reset');
    assertEqual(inputs.catInput.value, 'Standard', 'panel type reset');
    assertEqual([UI.getAllowedKeywordTermsInput(), UI.getBlockedKeywordTermsInput()], ['', ''], 'keyword sets cleared');
});

runTest('Feedback modal submits a System Type correction with per-parameter lockout', async () => {
    const elements = {};
    const el = (value = '') => ({
        value, disabled: false, title: '', options: [], firstChild: null, className: '', innerText: '', classList: { contains: () => false, add() {}, remove() {} },
        add(option) { this.options.push(option); }, removeChild() {}
    });
    ['fb-mfg', 'fb-hp', 'fb-volt', 'fb-phase', 'fb-enc', 'fb-sys', 'fb-low-volt-btn', 'feedback-modal'].forEach(id => { elements[id] = el(); });
    let posted = null;
    const Feedback = new Function('document', 'AI_TRAINING_DATA', 'UI', 'localStorage', 'fetch', 'alert', 'buildWorkerUrl', 'AuthService', 'SearchEngine',
        `${extractClassSource('FeedbackService')}; return FeedbackService;`)(
        { getElementById: id => elements[id], querySelectorAll: () => [] },
        global.AI_TRAINING_DATA, UI, { getItem: () => 'user' },
        (url, opts) => { posted = JSON.parse(opts.body); return Promise.resolve(); },
        () => {}, () => 'url', { headers: () => ({}) }, { lastCriteria: { kw: [] } }
    );
    Feedback.generateKeywordButtons = () => {};
    Feedback.down('CP-9');
    assertEqual(elements['fb-sys'].options.map(o => o.value), ['', 'Simplex', 'Duplex', 'Triplex', 'Quadraplex'], 'sys options (no Varied / Multiple)');
    assert(elements['fb-mfg'].options.length === 2 + global.AI_TRAINING_DATA.MANUFACTURERS.length, 'feedback manufacturer list stays full');
    elements['fb-sys'].value = 'Triplex';
    await Feedback.submit();
    assertEqual(JSON.parse(posted.records[0].fields.Corrections), { sys: 'Triplex' }, 'payload carries sys');
    assert(Feedback.lockout.has('CP-9:p_sys'), 'lockout recorded');
    Feedback.down('CP-9');
    assert(elements['fb-sys'].disabled === true, 'locked out after submit');
});

runTest('index.html: DOM order matches the visual grid and the parser loads before app.js', () => {
    const order = ['id="sysInput"', 'id="encInput"', 'id="voltInput"', 'id="phaseInput"', 'id="mfgInput"', 'id="hpInput"',
        'id="keywordInput"', 'id="keyword-blocklist-toggle"', 'id="catInput"', 'id="refine-toggle-btn"', 'id="searchBtn"', 'UI.resetSearch()'];
    const positions = order.map(token => indexHtml.indexOf(token));
    positions.forEach((pos, i) => assert(pos > 0, `${order[i]} missing`));
    positions.slice(1).forEach((pos, i) => assert(pos > positions[i], `${order[i + 1]} must follow ${order[i]}`));
    const encLine = indexHtml.split('\n').find(line => line.includes('id="encInput"'));
    assert(!encLine.includes('full-width'), 'enclosure is a half-row cell');
    const version = appJsContent.match(/const APP_VERSION = "v([^"]+)"/)[1];
    const parserScript = indexHtml.indexOf(`src="info-table-parser.js?v=${version}"`);
    assert(parserScript > 0 && parserScript < indexHtml.indexOf(`src="app.js?v=${version}"`), 'cache-busted parser script loads before matching app.js');
    assert(indexHtml.includes('id="fb-sys"'), 'feedback System Type select present');
});

runTest('Worker stays free of info-table parsing', () => {
    const workerSource = fs.readFileSync(path.join(root, 'worker', 'worker.js'), 'utf8');
    const extractSource = fs.readFileSync(path.join(root, 'worker', 'lib', 'extract.js'), 'utf8');
    assert(!/info-table|InfoTable/.test(workerSource + extractSource), 'Worker must not import or call browser parsing');
});

// ---------------------------------------------------------------- Performance
function syntheticRecords(count, offset = 0) {
    const mfgs = ['Barnes', 'Flygt', 'Gorman-Rupp', 'Myers', 'Goulds', 'Ebara', 'Zoeller', 'Wilo', 'Crane', 'Abs'];
    const types = ['Simplex', 'Duplex', 'Triplex', 'Quadplex'];
    const filler = 'CONTROL PANEL NOTES: PROVIDE HOA SWITCHES, RUN LIGHTS, SEAL FAIL, HIGH LEVEL ALARM, INTRINSICALLY SAFE RELAYS. '.repeat(8);
    return Array.from({ length: count }, (_, i) => {
        const n = i + offset;
        const t = n % 4;
        const motors = n % 9 === 0 ? '2+2' : String(t + 1);
        return makeRecord(`P${n}`, `${filler}\nPANEL TYPE: ${types[t]}\nVOLTAGE: 480\nPHASE/HZ: 3/60\nNO. MOTORS: ${motors}\nHP: ${5 + (n % 20)}\nFLA: 7.6\nPUMP MANUFACTURER: ${mfgs[n % mfgs.length]}\nTYPE OF PUMP: SUBMERSIBLE\nTAG: LS-${n} DUPLEX\n${filler}`);
    });
}

runTest('Performance: ~8,000 records derive well under 1s and scale linearly', () => {
    const warm = syntheticRecords(500, 1e6);
    InfoTableParser.deriveRecordsSync(warm);
    const time = n => {
        const records = syntheticRecords(n);
        const start = process.hrtime.bigint();
        InfoTableParser.deriveRecordsSync(records);
        const ranking = InfoTableParser.rankManufacturers(records);
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        assert(ranking.options.length <= InfoTableParser.MFG_MENU_LIMIT && ranking.options.includes('SULZER'), 'ranking produced capped menu with Sulzer');
        return ms;
    };
    const ms8k = time(8000);
    const ms16k = time(16000);
    console.log(`   8,000 records: ${ms8k.toFixed(1)}ms, 16,000 records: ${ms16k.toFixed(1)}ms`);
    assert(ms8k < 1000, `8,000 records took ${ms8k.toFixed(1)}ms`);
    assert(ms16k < ms8k * 3.5 + 50, `superlinear growth: ${ms8k.toFixed(1)}ms -> ${ms16k.toFixed(1)}ms`);
    const pathological = makeRecord('worst', 'PANEL' + ' '.repeat(200000) + 'NO. ' + '1+'.repeat(50000) + 'PUMP MANUFACTURER ' + '-'.repeat(100000));
    const start = process.hrtime.bigint();
    InfoTableParser.deriveRecord(pathological);
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
    console.log('✨ All v2.5.97 System Type / manufacturer ranking tests passed!');
})();
