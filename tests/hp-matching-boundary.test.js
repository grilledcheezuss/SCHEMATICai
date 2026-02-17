// HP Matching Boundary Tests - v2.5.9
// Tests to ensure HP search doesn't match as substring (e.g., 0.5 shouldn't match 1.5)

/**
 * Mock SearchEngine._matchHp for testing
 * This will be replaced with the actual implementation during testing
 */

// Test data - simulating database records with different HP formats
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
    { id: 107, desc: "1/2 HP motor", hp: null }, // 0.5 as fraction
    
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
    { id: 401, desc: "Motor 7 1/2 HP", hp: null }, // Should match 7.5
    { id: 402, desc: "Motor 7-1/2 HP", hp: null }, // Should match 7.5
    { id: 403, desc: "Motor 7½ HP", hp: null }, // Should match 7.5
    { id: 404, desc: "Motor 17 1/2 HP", hp: null }, // Should NOT match 7.5
    { id: 405, desc: "7.5 HP motor", hp: "7.5" }, // Should match 7.5
    
    // Edge cases with punctuation
    { id: 501, desc: "(0.5 HP)", hp: null }, // Should match 0.5
    { id: 502, desc: "Motor, 0.5 HP, 480V", hp: null }, // Should match 0.5
    { id: 503, desc: "(1.5 HP)", hp: null }, // Should NOT match 0.5
];

// Test cases - each defines a search HP and expected matches/non-matches
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
        shouldNotMatch: [404] // 17.5 should not match
    },
    {
        searchHp: "10.5",
        description: "Search for 10.5 HP",
        shouldMatch: [5, 302], // Both records with 10.5 should match
        shouldNotMatch: [1, 2, 101, 201]
    }
];

// Simple test runner function
function runTests(matchHpFunction) {
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
            
            const result = matchHpFunction(record, testCase.searchHp);
            
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
            
            const result = matchHpFunction(record, testCase.searchHp);
            
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
        return 0;
    } else {
        console.log(`\n⚠️  ${totalFailed} test(s) failed.\n`);
        return 1;
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testRecords, testCases, runTests };
}

// If running directly in Node.js with app.js loaded
if (typeof window !== 'undefined' && window.SearchEngine) {
    const exitCode = runTests(window.SearchEngine._matchHp.bind(window.SearchEngine));
    if (typeof process !== 'undefined') {
        process.exit(exitCode);
    }
}
