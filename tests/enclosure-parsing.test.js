// Test enclosure parsing functionality (v2.5.47)

// Use the actual parseEnclosure from extract.js
const { parseEnclosure } = require('../worker/lib/extract.js');

// Simple test framework
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

// Wrapper: uses parseEnclosure (same logic as worker) and returns { enc, encV }
function extractEnclosure(text) {
    const result = { enc: null, encV: false };
    if (!text || typeof text !== 'string') return result;
    const foundEnclosures = parseEnclosure(text);
    if (foundEnclosures.size === 1) {
        result.enc = [...foundEnclosures][0];
    } else if (foundEnclosures.size > 1) {
        // Multiple enclosures remaining after spec-table precedence → Varied / Multiple
        result.enc = "Varied / Multiple";
        result.encV = true;
    }
    return result;
}

console.log('🧪 Enclosure Parsing Tests - v2.5.47\n');
console.log('Testing enclosure extraction...\n');

let passed = 0;
let failed = 0;

// Test cases
const tests = [
    {
        input: "NEMA 4X ENCLOSURE STAINLESS STEEL",
        expected: { enc: "4XSS", encV: false },
        name: "4X with stainless steel keyword"
    },
    {
        input: "CONTROL PANEL 4XSS RATED",
        expected: { enc: "4XSS", encV: false },
        name: "Explicit 4XSS enclosure"
    },
    {
        input: "FIBERGLASS NEMA 4XFG ENCLOSURE",
        expected: { enc: "4XFG", encV: false },
        name: "4XFG fiberglass enclosure"
    },
    {
        input: "NEMA 4X FIBERGLASS ENCLOSURE",
        expected: { enc: "4XFG", encV: false },
        name: "4X fiberglass (should map to 4XFG, not 4XSS)"
    },
    {
        input: "FIBERGLASS ENCLOSURE MATERIAL NEMA 4X",
        expected: { enc: "4XFG", encV: false },
        name: "Fiberglass with 4X rating (CP-8106 case)"
    },
    {
        input: "POLYCARBONATE ENCLOSURE IP65",
        expected: { enc: "POLY", encV: false },
        name: "Polycarbonate enclosure"
    },
    {
        input: "POLY ENCLOSURE NON-METALLIC",
        expected: { enc: "POLY", encV: false },
        name: "POLY (short form)"
    },
    {
        input: "STANDARD INDOOR ENCLOSURE",
        expected: { enc: null, encV: false },
        name: "No recognized enclosure type"
    },
    {
        input: "4x stainless steel panel",
        expected: { enc: "4XSS", encV: false },
        name: "Lowercase 4x with stainless (case insensitive)"
    },
    {
        input: "4X ENCLOSURE",
        expected: { enc: "4XSS", encV: false },
        name: "Bare 4X without material (defaults to 4XSS)"
    },
    {
        input: "4X SS ENCLOSURE",
        expected: { enc: "4XSS", encV: false },
        name: "4X with SS abbreviation"
    },
    {
        input: "4X STAINLESS AND 4XFG MIXED ENCLOSURES",
        expected: { enc: "4XFG", encV: false },
        name: "Explicit 4XFG with derived 4XSS (STAINLESS) — explicit 4XFG token wins"
    },
    {
        input: "PUMP MOTOR 5 HP 480V 3PH",
        expected: { enc: null, encV: false },
        name: "Panel spec without enclosure info"
    },
    {
        input: "4XSS ENCLOSURE WITH POLY BACKUP",
        expected: { enc: "Varied / Multiple", encV: true },
        name: "Mixed 4XSS and POLY (marked Varied / Multiple)"
    },
    {
        input: "FIBER GLASS ENCLOSURE 4X RATED",
        expected: { enc: "4XFG", encV: false },
        name: "Fiber glass (two words) with 4X"
    },
    // --- v2.5.36 spec-table precedence tests (CP-6915-like) ---
    {
        // CP-6915 scenario: FG mention is template/noise; spec table (NAMEPLATE) says SS.
        input: "NEMA 4X FIBERGLASS ENCLOSURE (TEMPLATE) ... NAMEPLATE SCHEDULE: NEMA 4X STAINLESS STEEL ENCLOSURE 480V 3PH FLA 28A",
        expected: { enc: "4XSS", encV: false },
        name: "CP-6915: spec table (NAMEPLATE) says stainless — SS wins over template FG"
    },
    {
        // Spec table says FG (ENCLOSURE MATERIAL near fiberglass); SS mention elsewhere is noise.
        input: "STAINLESS STEEL SUPPORT STRUCTURE ... ENCLOSURE MATERIAL: FIBERGLASS NEMA 4X RATING",
        expected: { enc: "4XFG", encV: false },
        name: "Spec table (ENCLOSURE MATERIAL) says fiberglass — FG wins over noise SS"
    },
    {
        // Both materials near a spec-table keyword — remains Varied / Multiple.
        input: "PANEL TYPE: NEMA 4X STAINLESS OR FIBERGLASS PER SCHEDULE",
        expected: { enc: "Varied / Multiple", encV: true },
        name: "Spec table mentions both materials — remains Varied / Multiple"
    },
    {
        // FG appears before NAMEPLATE; SS appears after NAMEPLATE (forward window finds SS).
        input: "NEMA 4X FIBERGLASS OPTION AVAILABLE. NAMEPLATE: 480V STAINLESS STEEL 4X ENCLOSURE",
        expected: { enc: "4XSS", encV: false },
        name: "NAMEPLATE spec-table context forward-window finds SS — resolves to 4XSS"
    },
    // --- v2.5.47 explicit token preference tests ---
    {
        // FRP (strong FG signal) + explicit 4XSS code, no explicit 4XFG → prefer explicit 4XSS
        input: "NEMA 4X FRP PANEL WITH 4XSS ENCLOSURE RATING",
        expected: { enc: "4XSS", encV: false },
        name: "v2.5.47: FRP material + explicit 4XSS token (no 4XFG) → 4XSS wins"
    },
    {
        // Explicit 4XSS only (no 4XFG, FIBERGLASS material noise elsewhere) → prefer 4XSS
        input: "4XSS RATED NEMA 4X ENCLOSURE FIBERGLASS CABLE TRAY",
        expected: { enc: "4XSS", encV: false },
        name: "v2.5.47: Explicit 4XSS + incidental FIBERGLASS noise → 4XSS (explicit token wins)"
    },
    {
        // Explicit 4XFG only (no 4XSS, STAINLESS material elsewhere) → prefer 4XFG
        input: "4XFG NEMA 4X ENCLOSURE STAINLESS STEEL SUPPORT STRUCTURE",
        expected: { enc: "4XFG", encV: false },
        name: "v2.5.47: Explicit 4XFG + incidental STAINLESS noise → 4XFG (explicit token wins)"
    },
    {
        // Both explicit compound tokens → truly mixed, Varied / Multiple
        input: "PANEL A: 4XSS ENCLOSURE. PANEL B: 4XFG ENCLOSURE.",
        expected: { enc: "Varied / Multiple", encV: true },
        name: "v2.5.47: Both explicit 4XSS and 4XFG tokens → Varied / Multiple"
    }
];

tests.forEach((test, i) => {
    const result = extractEnclosure(test.input);
    if (assertEquals(result, test.expected, `Test ${i + 1}: ${test.name}`)) {
        passed++;
    } else {
        failed++;
    }
});

console.log('\n============================================================');
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
console.log('============================================================\n');

if (failed === 0) {
    console.log('✨ All tests passed!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed.\n');
    process.exit(1);
}
