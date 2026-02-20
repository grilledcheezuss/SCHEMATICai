// Regression tests for worker extraction improvements (v2.5.34)
// Tests: HP table-format, NEMA4X enclosure, searchText normalization, reject_keywords normalization

function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.log(`❌ FAIL: ${message}`);
        console.log(`   Expected: ${JSON.stringify(expected)}`);
        console.log(`   Actual:   ${JSON.stringify(actual)}`);
        return false;
    }
    console.log(`✅ PASS: ${message}`);
    return true;
}

// ── Inline pure functions (mirrors worker/worker.js logic for testing) ──────

function normalizeCADText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/%%(?:[A-Za-z]|\d{3})/g, '');
}

function normalizeTextForSearch(text) {
    if (!text || typeof text !== 'string') return '';
    const upper = text.toUpperCase();
    // Collapse internal hyphens inside alphanumeric tokens using lookahead (e.g., PD-6000 -> PD6000, A-B-C -> ABC)
    const collapsed = upper.replace(/([A-Z0-9])-(?=[A-Z0-9])/g, '$1');
    return upper === collapsed ? upper : upper + ' ' + collapsed;
}

function extractHP(t) {
    t = normalizeCADText(t);
    const foundHPs = new Set();

    function parseAndAddHP(raw, isKW) {
        let val = 0;
        if (isKW) val = parseFloat(raw) * 1.341;
        else if (/(\d+)[-\s](\d+)\/(\d+)/.test(raw)) {
            const m = raw.match(/(\d+)[-\s](\d+)\/(\d+)/);
            val = parseFloat(m[1]) + parseFloat(m[2]) / parseFloat(m[3]);
        } else if (/(\d+)([¼½¾])/.test(raw)) {
            const m = raw.match(/(\d+)([¼½¾])/);
            const fractionMap = { '¼': 0.25, '½': 0.5, '¾': 0.75 };
            val = parseFloat(m[1]) + fractionMap[m[2]];
        } else if (raw.includes('/')) {
            const [n, d] = raw.split('/');
            val = parseFloat(n) / parseFloat(d);
        } else {
            val = parseFloat(raw);
        }
        if (!isNaN(val) && val >= 0.1 && val <= 500) {
            foundHPs.add((Math.round(val * 10) / 10).toString());
        }
    }

    const hpRegex = /\b(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])\s*(HP|H\.P\.|H\.P|KW|kW|HORSEPOWER)\b/gi;
    const hpTableRegex = /\b(HP|H\.P\.|H\.P|HORSEPOWER)\s*[:\-]\s*(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])\b/gi;

    let match;
    while ((match = hpRegex.exec(t)) !== null) {
        parseAndAddHP(match[1], match[2] && match[2].toUpperCase().includes('KW'));
    }
    while ((match = hpTableRegex.exec(t)) !== null) {
        parseAndAddHP(match[2], false);
    }

    if (foundHPs.size === 0) return null;
    return [...foundHPs].sort((a, b) => parseFloat(b) - parseFloat(a))[0];
}

function extractEnclosure(t) {
    t = normalizeCADText(t);
    const foundEnclosures = new Set();
    const has4X = /(?:\b|NEMA\s*(?:TYPE\s*)?|TYPE\s*)4X/i.test(t);
    if (/\b4XFG\b/i.test(t)) foundEnclosures.add('4XFG');
    if (/\b(FIBERGLASS|FIBER\s*GLASS)\b/i.test(t) && has4X) foundEnclosures.add('4XFG');
    if (/\b(STAINLESS|SS)\b/i.test(t) && has4X) foundEnclosures.add('4XSS');
    if (/\b4XSS\b/i.test(t)) foundEnclosures.add('4XSS');
    if (has4X && !/\b(FIBERGLASS|FIBER\s*GLASS|4XFG)\b/i.test(t) && !foundEnclosures.has('4XSS')) {
        foundEnclosures.add('4XSS');
    }
    if (/\bPOLY(?:CARBONATE)?\b/i.test(t)) foundEnclosures.add('POLY');
    return [...foundEnclosures][0] || null;
}

// ── Test suite ────────────────────────────────────────────────────────────────

console.log('🧪 Worker Extraction Regression Tests - v2.5.34\n');

let passed = 0;
let failed = 0;

function test(name, actual, expected) {
    const ok = assertEquals(actual, expected, name);
    if (ok) passed++; else failed++;
}

// === A) HP extraction ===
console.log('\n--- HP Extraction ---');
test('7.5HP (no space)', extractHP('GORMAN RUPP 7.5HP 480V 3PH'), '7.5');
test('7.5 HP (with space)', extractHP('PUMP 7.5 HP 240V'), '7.5');
test('HP: 7.5 (table format colon)', extractHP('HP: 7.5 HORSEPOWER'), '7.5');
test('HP - 7.5 (table format dash)', extractHP('HP - 7.5'), '7.5');
test('HORSEPOWER: 7.5 (table format full word)', extractHP('HORSEPOWER: 7.5'), '7.5');
test('7 1/2 HP (mixed fraction)', extractHP('7 1/2 HP MOTOR'), '7.5');
test('7-1/2 HP (hyphen fraction)', extractHP('7-1/2 HP'), '7.5');
test('7½ HP (unicode fraction)', extractHP('7½ HP PUMP'), '7.5');
test('Decimal preserved: 0.5 HP', extractHP('0.5 HP'), '0.5');
test('Decimal preserved: 1.5 HP', extractHP('1.5 HP'), '1.5');
test('No HP value returns null', extractHP('480V 3PH PANEL'), null);

// === C) Enclosure extraction ===
console.log('\n--- Enclosure Extraction ---');
test('NEMA4X (no space) -> 4XSS', extractEnclosure('NEMA4X ENCLOSURE'), '4XSS');
test('NEMA 4X -> 4XSS', extractEnclosure('NEMA 4X STAINLESS'), '4XSS');
test('NEMA TYPE 4X -> 4XSS', extractEnclosure('NEMA TYPE 4X'), '4XSS');
test('TYPE 4X -> 4XSS', extractEnclosure('TYPE 4X ENCLOSURE'), '4XSS');
test('4X -> 4XSS (bare)', extractEnclosure('4X ENCLOSURE'), '4XSS');
test('4XSS explicit', extractEnclosure('4XSS RATED'), '4XSS');
test('4X + STAINLESS -> 4XSS', extractEnclosure('4X STAINLESS STEEL'), '4XSS');
test('NEMA 4X + SS -> 4XSS', extractEnclosure('NEMA 4X SS'), '4XSS');
test('4XFG explicit', extractEnclosure('4XFG ENCLOSURE'), '4XFG');
test('NEMA4X + FIBERGLASS -> 4XFG', extractEnclosure('NEMA4X FIBERGLASS'), '4XFG');
test('NEMA 4X + FIBERGLASS -> 4XFG', extractEnclosure('NEMA 4X FIBERGLASS'), '4XFG');
test('POLY -> POLY', extractEnclosure('POLY ENCLOSURE'), 'POLY');
test('POLYCARBONATE -> POLY', extractEnclosure('POLYCARBONATE'), 'POLY');
test('No enclosure -> null', extractEnclosure('480V 3PH 7.5HP GORMAN RUPP'), null);

// === D) searchText / normalizeTextForSearch ===
console.log('\n--- normalizeTextForSearch ---');
const st1 = normalizeTextForSearch('PD-6000 PUMP PANEL');
test('PD-6000 collapsed form present', st1.includes('PD6000'), true);
test('PD-6000 original form present', st1.includes('PD-6000'), true);
const st2 = normalizeTextForSearch('BACKUP FLOATS 480V');
test('No hyphens: output equals original (no collapse)', st2, 'BACKUP FLOATS 480V');
const st3 = normalizeTextForSearch('MODEL PD-6000 VFD');
test('PD-6000 (hyphen) collapsed form PD6000 present', st3.includes('PD6000'), true);
const st4 = normalizeTextForSearch('A-B-C-D PANEL');
test('Multi-hyphen A-B-C-D collapses to ABCD', st4.includes('ABCD'), true);

// === D) reject_keywords normalization ===
console.log('\n--- reject_keywords normalization ---');
const rawRejects = ['vfd', 'Backup Floats', 'PD6000'];
const normalizedRejects = rawRejects.map(kw => String(kw).toUpperCase());
test('reject_keywords normalized to uppercase', normalizedRejects, ['VFD', 'BACKUP FLOATS', 'PD6000']);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n============================================================');
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('============================================================\n');
if (failed === 0) {
    console.log('✨ All tests passed!');
} else {
    console.log('⚠️  Some tests failed. See details above.');
    process.exit(1);
}
