// HP Parsing Tests - v2.5.8
// Tests for mixed fraction HP parsing improvements

// Import the extractSpecsStrict function from worker.js
// Since we can't directly import from worker.js, we'll copy the relevant function here for testing

// Helper: Normalize CAD control codes (copied from worker.js for testing)
function normalizeCADText(text) {
    return text.replace(/%%[uU]([0-9A-Fa-f]{4})/g, (match, code) => {
        const charCode = parseInt(code, 16);
        return String.fromCharCode(charCode);
    });
}

// Test version of extractSpecsStrict (HP parsing only)
function extractHPStrict(t) {
    if (!t || typeof t !== 'string') return null;
    
    // Normalize CAD control codes before parsing
    t = normalizeCADText(t);
    
    let maxHP = 0;
    // Enhanced regex to match mixed fractions: "7 1/2 HP", "7-1/2 HP", "7½ HP"
    // Also handle Unicode fraction characters
    const hpRegex = /\b(\d+(?:\.\d+)?(?:[-\s]\d+\/\d+)?|\d+\/\d+|\d+[¼½¾])\s*(HP|H\.P\.|H\.P|KW|kW|HORSEPOWER)\b/gi;
    let match;
    while ((match = hpRegex.exec(t)) !== null) {
        let raw = match[1]; let val = 0;
        if (match[2] && match[2].toUpperCase().includes('KW')) val = parseFloat(raw) * 1.341;
        else if (/(\d+)[-\s](\d+)\/(\d+)/.test(raw)) {
            // Mixed fraction format: "7 1/2" or "7-1/2"
            const mixedMatch = raw.match(/(\d+)[-\s](\d+)\/(\d+)/);
            const whole = parseFloat(mixedMatch[1]);
            const num = parseFloat(mixedMatch[2]);
            const den = parseFloat(mixedMatch[3]);
            val = whole + (num / den);
        } else if (/(\d+)([¼½¾])/.test(raw)) {
            // Unicode fraction format: "7½"
            const unicodeMatch = raw.match(/(\d+)([¼½¾])/);
            const whole = parseFloat(unicodeMatch[1]);
            const fractionMap = { '¼': 0.25, '½': 0.5, '¾': 0.75 };
            val = whole + fractionMap[unicodeMatch[2]];
        } else if (raw.includes('-')) {
            const parts = raw.split('-').filter(Boolean);
            const nums = parts.map(p => parseFloat(p)).filter(x => !isNaN(x));
            if (nums.length) val = Math.max(...nums);
        } else if (raw.includes('/')) {
            const [num, den] = raw.split('/');
            val = parseFloat(num) / parseFloat(den);
        } else {
            val = parseFloat(raw);
        }
        if (!isNaN(val) && val >= 0.1 && val <= 500 && val > maxHP) maxHP = val;
    }
    return maxHP > 0 ? (Math.round(maxHP * 10) / 10).toString() : null;
}

// Test cases
const testCases = [
    // Mixed fractions with space
    { input: "Panel 7 1/2 HP", expected: "7.5", description: "Space-separated mixed fraction" },
    { input: "Motor: 7 1/2 HP 480V", expected: "7.5", description: "Mixed fraction in context" },
    { input: "10 1/2 HP MOTOR", expected: "10.5", description: "Larger mixed fraction" },
    
    // Mixed fractions with hyphen
    { input: "7-1/2 HP", expected: "7.5", description: "Hyphen-separated mixed fraction" },
    { input: "7-1/2HP", expected: "7.5", description: "Hyphen-separated no space" },
    { input: "15-1/4 HP", expected: "15.3", description: "Hyphen with 1/4 fraction" }, // 15.25 rounds to 15.3
    
    // Unicode fractions
    { input: "7½ HP", expected: "7.5", description: "Unicode ½ character" },
    { input: "7¼ HP", expected: "7.3", description: "Unicode ¼ character" }, // 7.25 rounds to 7.3
    { input: "7¾ HP", expected: "7.8", description: "Unicode ¾ character" }, // 7.75 rounds to 7.8
    
    // Standard formats (should still work)
    { input: "5 HP", expected: "5", description: "Standard whole number" },
    { input: "7.5 HP", expected: "7.5", description: "Standard decimal" },
    { input: "1/2 HP", expected: "0.5", description: "Simple fraction" },
    { input: "3/4 HP", expected: "0.8", description: "3/4 fraction" }, // 0.75 rounds to 0.8
    
    // Edge cases
    { input: "No HP here", expected: null, description: "No HP value" },
    { input: "HP 7.5", expected: null, description: "HP before number (not supported)" },
    { input: "7.5HP 10HP", expected: "10", description: "Multiple HP values, takes max" },
    
    // Real-world examples from problem description
    { input: "SPECIFICATIONS\n7 1/2 HP\nVOLT: 480\nPHASE: 3", expected: "7.5", description: "Table format with mixed fraction" },
    { input: "Motor 7-1/2 HP 3PH 480V", expected: "7.5", description: "Inline spec with hyphen fraction" },
];

// Simple test runner
let passed = 0;
let failed = 0;

console.log('\n🧪 HP Parsing Tests - v2.5.8\n');
console.log('Testing mixed fraction parsing improvements...\n');

testCases.forEach((test, index) => {
    const result = extractHPStrict(test.input);
    const success = result === test.expected;
    
    if (success) {
        passed++;
        console.log(`✅ Test ${index + 1}: ${test.description}`);
    } else {
        failed++;
        console.log(`❌ Test ${index + 1}: ${test.description}`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Expected: ${test.expected}, Got: ${result}`);
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
    console.log('✨ All tests passed!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed.\n');
    process.exit(1);
}
