// Run: node tests/system-type-audit.test.js
// v2.5.105 diagnostic-only SystemTypeAudit: deterministic, bounded, sanitized, read-only.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const parserPath = require.resolve('../info-table-parser.js');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Loading the module must not read LOCAL_DB or run a report.
let localDbReads = 0;
Object.defineProperty(globalThis, 'LOCAL_DB', { configurable: true, get() { localDbReads++; return []; } });
const parser = require(parserPath);
assert.strictEqual(localDbReads, 0, 'loading info-table-parser.js never touches LOCAL_DB');
delete globalThis.LOCAL_DB;
const { SystemTypeAudit } = parser;
assert.strictEqual(globalThis.SystemTypeAudit, SystemTypeAudit, 'console entrypoint is exposed as SystemTypeAudit');
assert(Object.isFrozen(SystemTypeAudit), 'audit API is frozen');
assert(!/SystemTypeAudit\s*\.\s*(?:report|text|inspect|format)\s*\(/.test(appJs), 'app.js never calls the audit (no automatic startup/search execution)');

const SECRET_URL = 'https://files.example.test/secret-token-abc.pdf';
const fixtures = () => [
    { id: 'CP-101', desc: 'Panel Type Simplex\nVoltage 480', pdfUrl: SECRET_URL },
    { id: 'CP-102', desc: 'SIMPLEX GRINDER PUMP CONTROL PANEL\nVoltage 480' },
    { id: 'CP-103', desc: 'No. Motors 1\nVoltage 480' },
    { id: 'CP-201', desc: 'Panel Type Duplex\nNo. Motors 2\nVoltage 480', pdfUrl: SECRET_URL },
    { id: 'CP-202', desc: 'Panel Type Duplex\nNo. Motors 2+2\nVoltage 480' },
    { id: 'CP-301', desc: 'System Type Triplex\nVoltage 480' },
    { id: 'CP-302', desc: 'No. Motors 3\nVoltage 480' },
    { id: 'CP-401', desc: 'Panel Type Quadraplex\nVoltage 480' },
    { id: 'CP-402', desc: 'Quad Control Panel No. Motors 4' },
    { id: 'CP-501', desc: 'Panel Type Simplex Panel Type Triplex\nVoltage 480' },
    { id: 'CP-502', desc: 'Panel Type Duplex or Triplex No. Motors 1' },
    { id: 'CP-601', desc: 'No. Motors 4' },
    { id: 'CP-602', desc: 'Quadraplex lift station see http://intranet.example.test/x?token=abc owner@example.test 1234567 notes' },
    { id: 'CP-603', desc: '' },
    { id: 'CP-604', desc: 'Low voltage control panel only' },
    { id: 'CP-201', desc: 'Panel Type Duplex\nNo. Motors 2\nVoltage 480' }
];
const derived = list => { parser.deriveRecordsSync(list); return list; };
const snapshot = list => list.map(r => ({
    own: JSON.stringify(Object.getOwnPropertyNames(r).sort().map(k => [k, Object.getOwnPropertyDescriptor(r, k)])),
    sys: r._sys, sysV: r._sysV, ev: r._sysEvidence, rev: r._derivedRev
}));

// Network/persistence tripwires: the audit must never touch them.
const forbidden = name => { throw new Error(`audit touched ${name}`); };
globalThis.fetch = () => forbidden('fetch');
globalThis.XMLHttpRequest = function () { forbidden('XMLHttpRequest'); };
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => forbidden('localStorage') });
Object.defineProperty(globalThis, 'indexedDB', { configurable: true, get: () => forbidden('indexedDB') });

// --- Summary counts, buckets and determinism (parser-rule badge) --------------------------
const records = derived(fixtures());
const before = snapshot(records);
const report = SystemTypeAudit.report({ records });
assert.deepStrictEqual(snapshot(records), before, 'report never mutates records or derived fields');
assert.deepStrictEqual(report.records, { scanned: 16, unique: 15, duplicates: 1 }, 'unique record counting');
assert.deepStrictEqual(report.states, { green: 4, orange: 5, absent: 4, conflicting: 2 }, 'state counts');
assert.deepStrictEqual(report.sources, { explicitRow: 5, titlePhrase: 2, countInference: 2, conflict: 2, unknown: 4 }, 'evidence source buckets');
const typeCounts = Object.fromEntries(Object.entries(report.types).map(([k, t]) => [k, [t.total, t.green, t.orange]]));
assert.deepStrictEqual(typeCounts, {
    Simplex: [3, 1, 2], Duplex: [2, 1, 1], Triplex: [2, 1, 1], Quadraplex: [2, 1, 1]
}, 'per-type green/orange counts');
assert.deepStrictEqual(report.types.Simplex.bySource, { explicitRow: 1, titlePhrase: 1, countInference: 1 });
assert.deepStrictEqual(report.types.Simplex.orangeCauses, { 'count-inference': 1, 'title-narrative-only': 1 });
assert.deepStrictEqual(report.types.Duplex.orangeCauses, { 'row-count-disagreement': 1 });
assert.deepStrictEqual(report.types.Quadraplex.orangeCauses, { 'title-narrative-only': 1 });
assert.deepStrictEqual(report.orangeCauses, { 'title-narrative-only': 2, 'count-inference': 2, 'row-count-disagreement': 1 });
assert.deepStrictEqual(report.rowCountDisagreements, { 'combination-or-non-plain-count': 1 });
assert.deepStrictEqual(report.conflictReasons, { 'ambiguous-panel-type-row': 1, 'conflicting-explicit-rows': 1 }, 'conflict vs ambiguous buckets');
assert.deepStrictEqual(report.absentReasons, {
    'four-count-without-row-or-title': 1, 'no-description': 1,
    'no-system-type-evidence': 1, 'type-word-without-accepted-evidence': 1
}, 'unknown/absent reasons');
assert.strictEqual(report.types.Quadraplex.mentionedButUnclassified, 1, 'unclassified type mention counted');
assert.strictEqual(report.types.Triplex.conflictCandidate, 2, 'conflict candidates per type');
assert.strictEqual(report.overlaps.mentionsMultipleTypes, 2, 'overlap: records mentioning several types');
assert.deepStrictEqual(report.stale, { notDerived: 0, storedMismatch: 0 });
assert.deepStrictEqual(report.badge, { renderer: 'parser-rule', checked: 9, mismatches: 0, errors: 0 });
assert.deepStrictEqual(report.sampleIds['state:orange'], ['CP-102', 'CP-103', 'CP-202', 'CP-302', 'CP-402']);
assert.deepStrictEqual(report.sampleIds['orange:row-count-disagreement'], ['CP-202']);
assert.deepStrictEqual(report.sampleIds['conflicting:ambiguous-panel-type-row'], ['CP-502']);
assert.strictEqual(report.patterns, null, 'snippets are opt-in');
assert.strictEqual(report.rowCountValues, null, 'count cell values are opt-in');
assert(report.keywordHits.absent.QUADRAPLEX === 1 && report.keywordHits.orange['NO MOTORS'] === 4, 'label-only keyword hits');

const reversed = derived(fixtures().reverse());
assert.strictEqual(JSON.stringify(SystemTypeAudit.report({ records: reversed })), JSON.stringify(report), 'deterministic regardless of record order');
assert.strictEqual(JSON.stringify(SystemTypeAudit.report({ records })), JSON.stringify(report), 'deterministic across runs');
assert.strictEqual(SystemTypeAudit.text({ records }), SystemTypeAudit.format(report), 'text() formats report()');

const plain = JSON.stringify(report) + SystemTypeAudit.format(report);
for (const leaked of ['secret-token', 'files.example', 'pdfUrl', 'intranet', 'owner@', '1234567', 'LIFT STATION', 'Low voltage', 'LOW VOLTAGE CONTROL']) {
    assert(!plain.includes(leaked), `default report does not leak ${leaked}`);
}
assert(/Top patterns: hidden/.test(SystemTypeAudit.format(report)), 'text explains how to opt in to snippets');

// --- Opt-in snippets are bounded and sanitized ------------------------------------------
const withSnippets = SystemTypeAudit.report({ records, snippets: true, patterns: 500, samples: 500 });
assert(withSnippets.patterns.length > 0 && withSnippets.patterns.length <= 50, 'pattern list capped');
assert(withSnippets.patterns.every(p => p.pattern.length <= 60 && p.sampleIds.length <= 20), 'snippets/sample ids bounded');
assert(withSnippets.patterns.some(p => p.state === 'absent' && p.pattern.startsWith('QUADRAPLEX LIFT STATION')), 'failing phrase surfaced');
assert.deepStrictEqual(withSnippets.rowCountValues, { 'Duplex row | count 2+2': 1 });
const snippetText = JSON.stringify(withSnippets) + SystemTypeAudit.format(withSnippets);
for (const leaked of ['secret-token', 'files.example', 'pdfUrl', 'intranet', 'token=', 'owner@', '1234567']) {
    assert(!snippetText.includes(leaked), `snippets never leak ${leaked}`);
}
assert(!withSnippets.patterns.some(p => p.state === 'green'), 'patterns only describe failing/uncertain records');
const oneSample = SystemTypeAudit.report({ records, samples: 1, patterns: 2, snippets: true });
assert(Object.values(oneSample.sampleIds).every(ids => ids.length <= 1) && oneSample.patterns.length === 2, 'limits honored');

// --- Inspect is bounded, explains each type, and is read-only ---------------------------
const inspected = SystemTypeAudit.inspect('cp-202', { records });
assert.deepStrictEqual(snapshot(records), before, 'inspect never mutates records');
assert.strictEqual(inspected.found, true);
assert.strictEqual(inspected.state, 'orange');
assert.strictEqual(inspected.cause, 'row-count-disagreement');
assert.strictEqual(inspected.countDetail, 'combination-or-non-plain-count');
assert.deepStrictEqual([inspected.derived.sys, inspected.derived.sysV, inspected.derived.parserSource], ['Duplex', true, 'row']);
assert(inspected.derived.reasons.includes('unresolved-or-conflicting-count'));
assert.deepStrictEqual(inspected.stored, { derivedRev: parser.DERIVED_REV, sys: 'Duplex', sysV: true, matchesFresh: true });
assert.strictEqual(inspected.badge, 'orange');
assert.deepStrictEqual(inspected.evidence.panelTypeRows.map(r => [r.value, r.direction, r.candidates]), [['DUPLEX', 'forward', ['Duplex']]]);
assert.deepStrictEqual(inspected.evidence.motorCountRows, [{ value: '2+2', plainCount: null }]);
assert.deepStrictEqual(Object.fromEntries(Object.entries(inspected.types).map(([k, v]) => [k, v.verdict])), {
    Simplex: 'not-mentioned', Duplex: 'matched-orange', Triplex: 'not-mentioned', Quadraplex: 'not-mentioned'
});
const conflict = SystemTypeAudit.inspect('CP-501', { records });
assert.strictEqual(conflict.state, 'conflicting');
assert.deepStrictEqual([conflict.types.Simplex.verdict, conflict.types.Triplex.verdict, conflict.types.Duplex.verdict],
    ['blocked-by-conflict', 'blocked-by-conflict', 'not-mentioned']);
const missing = SystemTypeAudit.inspect('CP-602', { records });
assert.strictEqual(missing.types.Quadraplex.verdict, 'mentioned-without-accepted-evidence');
assert.strictEqual(missing.cause, 'type-word-without-accepted-evidence');
assert(missing.evidence.typeMentions.length === 1 && missing.evidence.typeMentions[0].context.startsWith('QUADRAPLEX LIFT STATION'));
const fourCount = SystemTypeAudit.inspect('CP-601', { records });
assert.strictEqual(fourCount.types.Quadraplex.verdict, 'evidence-rejected', 'four-count alone is explained, not promoted');
const strings = [];
(function walk(value) {
    if (typeof value === 'string') strings.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
})([inspected, conflict, missing, fourCount]);
assert(strings.every(s => s.length <= 60), 'inspect strings bounded');
const inspectText = JSON.stringify([inspected, conflict, missing, fourCount, SystemTypeAudit.inspect('CP-101', { records })]);
for (const leaked of ['secret-token', 'files.example', 'pdfUrl', 'intranet', 'owner@', '1234567']) {
    assert(!inspectText.includes(leaked), `inspect never leaks ${leaked}`);
}
assert(!('desc' in inspected) && !('desc' in inspected.evidence), 'inspect never returns the full description');
assert.deepStrictEqual(SystemTypeAudit.inspect('CP-999', { records }).found, false);
assert.strictEqual(SystemTypeAudit.inspect('', { records }).found, false);

// --- Distinct raw ids never collapse; null options are tolerated -------------------------
const lookalikes = derived([
    { id: 'CP 1', desc: 'Panel Type Simplex\nVoltage 480' }, { id: 'CP1', desc: 'Panel Type Simplex\nVoltage 480' },
    { id: 'ÄÖ', desc: '' }, { id: 'ÜÜ', desc: '' }, { id: `${'X'.repeat(40)}A`, desc: '' }, { id: `${'X'.repeat(40)}B`, desc: '' },
    null, { desc: 'no id' }, { desc: 'no id either' }
]);
const lookalikeReport = SystemTypeAudit.report({ records: lookalikes });
assert.deepStrictEqual(lookalikeReport.records, { scanned: 9, unique: 8, duplicates: 0 }, 'display-sanitized ids never merge distinct records');
assert.strictEqual(lookalikeReport.types.Simplex.green, 2);
assert(!JSON.stringify(lookalikeReport.sampleIds).includes('""'), 'unprintable ids get a visible placeholder');
assert.strictEqual(SystemTypeAudit.report(null).tool, 'SystemTypeAudit', 'report(null) uses defaults');
assert.strictEqual(SystemTypeAudit.inspect('CP-101', null).found, false, 'inspect with null options uses defaults');

// --- Frozen records, stale derivations and default LOCAL_DB scope -----------------------
const frozen = derived(fixtures()).map(r => Object.freeze(r));
assert.strictEqual(JSON.stringify(SystemTypeAudit.report({ records: frozen }).states), JSON.stringify(report.states), 'works on frozen records');
const stale = derived(fixtures());
Object.defineProperty(stale[0], '_sys', { value: 'Duplex', writable: true, configurable: true, enumerable: false });
stale.push({ id: 'CP-700', desc: 'Panel Type Triplex\nVoltage 480' });
const staleReport = SystemTypeAudit.report({ records: stale });
assert.deepStrictEqual(staleReport.stale, { notDerived: 1, storedMismatch: 1 }, 'stale/stored mismatches reported');
assert.deepStrictEqual(staleReport.sampleIds['stale:storedMismatch'], ['CP-101']);
globalThis.LOCAL_DB = records;
assert.strictEqual(JSON.stringify(SystemTypeAudit.report()), JSON.stringify({ ...report, scope: 'LOCAL_DB' }), 'defaults to window.LOCAL_DB');
assert.strictEqual(SystemTypeAudit.report({ scope: 'results' }).records.scanned, 0, 'results scope without SearchEngine is empty');
delete globalThis.LOCAL_DB;

// --- Rendered badge propagation through the real UI._generateBadges ----------------------
function extractClass(className) {
    const start = appJs.indexOf(`class ${className} {`);
    let depth = 0;
    for (let i = start; i < appJs.length; i++) {
        if (appJs[i] === '{') depth++;
        else if (appJs[i] === '}' && --depth === 0) return new Function(`return ${appJs.slice(start, i + 1)}`)();
    }
    throw new Error(`class ${className} not found`);
}
globalThis.PDF_STATUS = { MISSING: 'missing' };
globalThis.UI = extractClass('UI');
const uiReport = SystemTypeAudit.report({ records });
assert.deepStrictEqual(uiReport.badge, { renderer: 'UI._generateBadges', checked: 9, mismatches: 0, errors: 0 }, 'UI badges follow parser confidence');
for (const [type, t] of Object.entries(uiReport.types)) {
    assert.deepStrictEqual([t.rendered.green, t.rendered.orange, t.rendered.missing], [t.green, t.orange, 0], `${type}: rendered badge colors match states`);
}
assert.deepStrictEqual(snapshot(records), before, 'badge rendering does not mutate records');
const alwaysOrange = SystemTypeAudit.report({ records, badgeRenderer: (r, c) => [`<span class="hud-badge match-orange">${c.sys.toUpperCase()}</span>`] });
assert.strictEqual(alwaysOrange.badge.mismatches, 4, 'a propagation bug (green evidence drawn orange) is detected');
assert.deepStrictEqual(alwaysOrange.sampleIds['badge:mismatch'], ['CP-101', 'CP-201', 'CP-301', 'CP-401']);
const throwing = SystemTypeAudit.report({ records, badgeRenderer: () => { throw new Error('boom'); } });
assert.deepStrictEqual([throwing.badge.errors, throwing.badge.mismatches], [9, 0], 'renderer errors are contained, not counted as mismatches');
delete globalThis.UI;

// --- Classification is untouched by the audit -------------------------------------------
assert.strictEqual(parser.DERIVED_REV, 6, 'diagnostic PR keeps DERIVED_REV 6 (no re-derivation)');
const searchSrc = appJs.slice(appJs.indexOf('class SearchEngine {'), appJs.indexOf('class SearchEngine {') + 60000);
assert(searchSrc.includes("if (r._sys !== crit.sys) return;"), 'System Type search filter unchanged');
assert(appJs.includes("const badgeClass = record._sysV === true ? 'match-orange' : 'match-green';"), 'badge semantics unchanged');

console.log('SystemTypeAudit diagnostic tests passed');
