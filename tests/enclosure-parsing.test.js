// Test enclosure parsing functionality (v2.5.14)

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

// Simplified extractSpecsStrict function (enclosure portion only for testing)
function extractEnclosure(text) {
    const result = { enc: null, encV: false };
    if (!text || typeof text !== 'string') return result;
    
    const foundEnclosures = new Set();
    // Match common NEMA enclosure ratings: 4X (stainless steel), 4XFG (fiberglass), POLY (polycarbonate)
    // 4X variants: 4X, 4XSS (stainless steel explicit), 4XFG (fiberglass)
    // Priority: Check for fiberglass first, then stainless, to avoid misclassification
    if (/\b4XFG\b/i.test(text)) foundEnclosures.add("4XFG");
    if (/\b(FIBERGLASS|FIBER\s*GLASS)\b/i.test(text) && /\b4X\b/i.test(text)) foundEnclosures.add("4XFG");
    if (/\b(STAINLESS|SS)\b/i.test(text) && /\b4X\b/i.test(text)) foundEnclosures.add("4XSS");
    if (/\b4XSS\b/i.test(text)) foundEnclosures.add("4XSS");
    // Default: bare "4X" without material keywords defaults to stainless steel (4XSS)
    if (/\b4X\b/i.test(text) && !/\b(FIBERGLASS|FIBER\s*GLASS|4XFG)\b/i.test(text) && !foundEnclosures.has("4XSS")) {
        foundEnclosures.add("4XSS");
    }
    if (/\bPOLY(?:CARBONATE)?\b/i.test(text)) foundEnclosures.add("POLY");
    
    if (foundEnclosures.size === 1) {
        result.enc = [...foundEnclosures][0];
    } else if (foundEnclosures.size > 1) {
        // Multiple enclosure types found - mark as varied
        result.enc = [...foundEnclosures][0];
        result.encV = true;
    }
    
    return result;
}

console.log('🧪 Enclosure Parsing Tests - v2.5.14\n');
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
        expected: { enc: "4XFG", encV: true },
        name: "Multiple enclosure types (marked varied)"
    },
    {
        input: "PUMP MOTOR 5 HP 480V 3PH",
        expected: { enc: null, encV: false },
        name: "Panel spec without enclosure info"
    },
    {
        input: "4XSS ENCLOSURE WITH POLY BACKUP",
        expected: { enc: "4XSS", encV: true },
        name: "Mixed 4XSS and POLY (marked varied)"
    },
    {
        input: "FIBER GLASS ENCLOSURE 4X RATED",
        expected: { enc: "4XFG", encV: false },
        name: "Fiber glass (two words) with 4X"
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
