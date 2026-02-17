// Standalone HP Matching Test - v2.5.9
// Copy of SearchEngine._matchHp with test cases

/**
 * Copy of SearchEngine._matchHp for testing
 */
function matchHp(record, searchHp) {
    const HP_TOLERANCE = 0.1; // 10% tolerance for fuzzy matching
    const HP_STRICT_WEIGHT = 5000;
    const HP_FUZZY_WEIGHT = 2000;
    
    const searchHpNum = parseFloat(searchHp);
    
    // === STRICT FIELD MATCH ===
    const strictMatch = record.hp && Math.abs(parseFloat(record.hp) - searchHpNum) < HP_TOLERANCE;
    if (strictMatch) {
        return { matches: true, isVariant: false, weight: HP_STRICT_WEIGHT };
    }
    
    // === FUZZY DESCRIPTION MATCH ===
    if (!record.desc) {
        return { matches: false, isVariant: false, weight: 0 };
    }
    
    // Enhanced safety regex for various formats
    // Pattern matches: word boundary + HP value + optional decimal + HP unit + word boundary
    // Examples: "5 HP", "5HP", "5H.P", "5 H.P.", "5KW", "5.0HP"
    const HP_UNIT_PATTERN = '(?:HP|H\\.P\\.|H\\.P|KW|kW|HORSEPOWER)';
    const BOUNDARY_START = '(?:^|\\s|\\(|,)';
    const BOUNDARY_END = '(?:\\s|\\)|,|$)';
    // Numeric boundary guards: prevent digits or decimals immediately before/after HP value
    // This prevents "0.5" from matching in "1.5" or "10.5"
    const NUMERIC_BOUNDARY_BEFORE = '(?<![\\.\\d])'; // Negative lookbehind: no digit or decimal before
    const NUMERIC_BOUNDARY_AFTER = '(?![\\.\\d])'; // Negative lookahead: no digit or decimal after
    const hpPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}(?:${searchHp}|${searchHp}\\.0)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
    
    // Fractional pattern for values < 1 HP (e.g., 1/2 HP, 1/4 HP)
    // Guard against division by zero and very small values
    const fractionalPattern = (searchHpNum > 0.001 && searchHpNum < 1) 
        ? `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}1/${Math.round(1/searchHpNum)}${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}` 
        : null;
    
    // Mixed fraction pattern for values with fractional parts (e.g., 7.5 HP should match "7 1/2 HP", "7-1/2 HP", "7½ HP")
    const FRACTIONAL_TOLERANCE = 0.01; // Tolerance for fractional comparison
    let mixedFractionPattern = null;
    if (searchHpNum > 1) {
        const whole = Math.floor(searchHpNum);
        const fractional = searchHpNum - whole;
        // Common fractions: 0.5 = 1/2, 0.25 = 1/4, 0.75 = 3/4, 0.33 = 1/3, 0.67 = 2/3
        // Numeric boundary guard applied to whole number to prevent "7.5" matching "17.5"
        if (Math.abs(fractional - 0.5) < FRACTIONAL_TOLERANCE) {
            mixedFractionPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}${whole}[-\\s]?(?:1/2|½)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
        } else if (Math.abs(fractional - 0.25) < FRACTIONAL_TOLERANCE) {
            mixedFractionPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}${whole}[-\\s]?(?:1/4|¼)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
        } else if (Math.abs(fractional - 0.75) < FRACTIONAL_TOLERANCE) {
            mixedFractionPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}${whole}[-\\s]?(?:3/4|¾)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
        }
    }
    
    const safetyMatch = new RegExp(hpPattern, 'i').test(record.desc);
    const fractionalMatch = fractionalPattern && new RegExp(fractionalPattern, 'i').test(record.desc);
    const mixedMatch = mixedFractionPattern && new RegExp(mixedFractionPattern, 'i').test(record.desc);
    
    // Table/header format: "HP: 5", "HP | 5", "HP 5", "Horsepower 5" or "Motor HP 5"
    // Add numeric boundary guards to prevent substring matching in table format too
    const tablePattern = `(?:HP|HORSEPOWER|MOTOR\\s+HP)\\s*[:\\s|]+\\s*${NUMERIC_BOUNDARY_BEFORE}${searchHp}${NUMERIC_BOUNDARY_AFTER}(?:\\s|\\)|,|$)`;
    const tableMatch = new RegExp(tablePattern, 'i').test(record.desc);
    
    if (safetyMatch || fractionalMatch || mixedMatch || tableMatch) {
        return { matches: true, isVariant: true, weight: HP_FUZZY_WEIGHT };
    }
    
    return { matches: false, isVariant: false, weight: 0 };
}

// Test data
const testRecords = [
    // Records that should NOT match when searching for "0.5"
    { id: 1, desc: "Panel with 1.5 HP motor", hp: "1.5" },
    { id: 2, desc: "HP: 1.5", hp: null },
    { id: 3, desc: "HP | 1.5", hp: null },
    { id: 4, desc: "Motor HP 1.5", hp: null },
    { id: 5, desc: "10.5 HP compressor", hp: "10.5" },
    { id: 6, desc: "Running at 20.5HP", hp: null },
    { id: 7, desc: "HORSEPOWER 1.5", hp: null },
    
    // Records that SHOULD match when searching for "0.5"
    { id: 101, desc: "Panel with 0.5 HP motor", hp: "0.5" },
    { id: 102, desc: "HP: 0.5", hp: null },
    { id: 103, desc: "HP | 0.5", hp: null },
    { id: 104, desc: "Motor HP 0.5", hp: null },
    { id: 105, desc: "Running at 0.5HP", hp: null },
    { id: 106, desc: "HORSEPOWER 0.5", hp: null },
    { id: 107, desc: "1/2 HP motor", hp: null },
    
    // Records that SHOULD match when searching for "1.5"
    { id: 201, desc: "Panel with 1.5 HP motor", hp: "1.5" },
    { id: 202, desc: "HP: 1.5", hp: null },
    { id: 203, desc: "HP | 1.5", hp: null },
    { id: 204, desc: "1.5HP compressor", hp: null },
    
    // Records that should NOT match when searching for "1.5"
    { id: 301, desc: "Panel with 0.5 HP motor", hp: "0.5" },
    { id: 302, desc: "10.5 HP motor", hp: null }, // Changed to null to test fuzzy matching
    { id: 303, desc: "21.5 HP", hp: null },
    
    // Mixed fraction tests for "7.5"
    { id: 401, desc: "Motor 7 1/2 HP", hp: null },
    { id: 402, desc: "Motor 7-1/2 HP", hp: null },
    { id: 403, desc: "Motor 7½ HP", hp: null },
    { id: 404, desc: "Motor 17 1/2 HP", hp: null },
    { id: 405, desc: "7.5 HP motor", hp: "7.5" },
    
    // Edge cases with punctuation
    { id: 501, desc: "(0.5 HP)", hp: null },
    { id: 502, desc: "Motor, 0.5 HP, 480V", hp: null },
    { id: 503, desc: "(1.5 HP)", hp: null },
];

// Test cases
const testCases = [
    {
        searchHp: "0.5",
        description: "Search for 0.5 HP",
        shouldMatch: [101, 102, 103, 104, 105, 106, 107, 501, 502],
        shouldNotMatch: [1, 2, 3, 4, 5, 6, 7, 503]
    },
    {
        searchHp: "1.5",
        description: "Search for 1.5 HP",
        shouldMatch: [1, 2, 3, 4, 7, 201, 202, 203, 204],
        shouldNotMatch: [5, 6, 101, 301, 302, 303]
    },
    {
        searchHp: "7.5",
        description: "Search for 7.5 HP with mixed fraction support",
        shouldMatch: [401, 402, 403, 405],
        shouldNotMatch: [404]
    },
    {
        searchHp: "10.5",
        description: "Search for 10.5 HP",
        shouldMatch: [5, 302], // Both records with 10.5 should match
        shouldNotMatch: [1, 2, 101, 201]
    }
];

// Run tests
console.log('\n🧪 HP Matching Boundary Tests - v2.5.9\n');
console.log('Testing numeric boundary guards to prevent substring matches...\n');

let totalPassed = 0;
let totalFailed = 0;
let failedTests = [];

testCases.forEach((testCase, caseIndex) => {
    console.log(`\n📋 Test Case ${caseIndex + 1}: ${testCase.description}`);
    console.log('─'.repeat(60));
    
    let casePassed = 0;
    let caseFailed = 0;
    
    // Test records that should match
    testCase.shouldMatch.forEach(recordId => {
        const record = testRecords.find(r => r.id === recordId);
        if (!record) {
            console.log(`⚠️  Warning: Record ${recordId} not found`);
            return;
        }
        
        const result = matchHp(record, testCase.searchHp);
        
        if (result.matches) {
            casePassed++;
            totalPassed++;
            console.log(`  ✅ Record ${recordId} matched as expected: "${record.desc}"`);
        } else {
            caseFailed++;
            totalFailed++;
            failedTests.push({
                case: testCase.description,
                recordId,
                desc: record.desc,
                expected: 'match',
                got: 'no match'
            });
            console.log(`  ❌ Record ${recordId} SHOULD match but didn't: "${record.desc}"`);
        }
    });
    
    // Test records that should NOT match
    testCase.shouldNotMatch.forEach(recordId => {
        const record = testRecords.find(r => r.id === recordId);
        if (!record) {
            console.log(`⚠️  Warning: Record ${recordId} not found`);
            return;
        }
        
        const result = matchHp(record, testCase.searchHp);
        
        if (!result.matches) {
            casePassed++;
            totalPassed++;
            console.log(`  ✅ Record ${recordId} correctly didn't match: "${record.desc}"`);
        } else {
            caseFailed++;
            totalFailed++;
            failedTests.push({
                case: testCase.description,
                recordId,
                desc: record.desc,
                expected: 'no match',
                got: 'match'
            });
            console.log(`  ❌ Record ${recordId} should NOT match but did: "${record.desc}"`);
        }
    });
    
    console.log(`\n  Case Results: ${casePassed} passed, ${caseFailed} failed`);
});

console.log('\n' + '═'.repeat(60));
console.log(`📊 Overall Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('═'.repeat(60));

if (totalFailed > 0) {
    console.log('\n❌ Failed Tests Summary:');
    failedTests.forEach((fail, idx) => {
        console.log(`  ${idx + 1}. [${fail.case}] Record ${fail.recordId}: "${fail.desc}"`);
        console.log(`     Expected: ${fail.expected}, Got: ${fail.got}`);
    });
}

if (totalFailed === 0) {
    console.log('\n✨ All tests passed!\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed.\n`);
    process.exit(1);
}
