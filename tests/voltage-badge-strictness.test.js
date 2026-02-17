/**
 * Test for v2.5.16 Voltage Badge Strictness
 * 
 * Tests that voltage badges show:
 * - GREEN for strict field matches (volt field exact match)
 * - ORANGE for varied/fuzzy description matches
 */

console.log('🧪 Testing v2.5.16 Voltage Badge Strictness\n');

// Simulate SearchEngine voltage filtering logic from v2.5.16
function simulateVoltageFilter(record, searchVolt) {
    let voltV = record.voltV || false; // Start with worker variance flag
    let matched = false;
    let weight = 0;
    
    // Check for strict field match (green badge)
    if(record.volt && record.volt.includes(searchVolt)) {
        // Strict field match - override worker variance flag for green badge
        voltV = false;
        weight = 500;
        matched = true;
    } else if(record.desc && record.desc.includes(searchVolt)) {
        // Fuzzy description match - mark as varied for orange badge
        voltV = true;
        weight = 100;
        matched = true;
    }
    
    return { matched, voltV, weight };
}

// Test cases
const testRecords = [
    {
        name: "Strict field match (480V in volt field)",
        record: { 
            volt: "480", 
            voltV: false, // Worker says not varied
            desc: "CONTROL PANEL 480V 3PH" 
        },
        searchVolt: "480",
        expectedVoltV: false, // Should stay FALSE (green badge)
        expectedMatch: true,
        expectedWeight: 500
    },
    {
        name: "Worker varied flag, but strict field match",
        record: { 
            volt: "480", 
            voltV: true, // Worker says varied (e.g., found 120/480 in description)
            desc: "PANEL 120/480V CONTROL" 
        },
        searchVolt: "480",
        expectedVoltV: false, // Should be overridden to FALSE (green badge for strict field match)
        expectedMatch: true,
        expectedWeight: 500
    },
    {
        name: "Fuzzy description-only match",
        record: { 
            volt: null, // No volt field
            voltV: false,
            desc: "CONTROL PANEL 480 VOLT 3 PHASE" 
        },
        searchVolt: "480",
        expectedVoltV: true, // Should be TRUE (orange badge for fuzzy match)
        expectedMatch: true,
        expectedWeight: 100
    },
    {
        name: "No match at all",
        record: { 
            volt: "240", 
            voltV: false,
            desc: "CONTROL PANEL 240V 1PH" 
        },
        searchVolt: "480",
        expectedVoltV: false, // Unchanged (but record wouldn't be in results)
        expectedMatch: false,
        expectedWeight: 0
    },
    {
        name: "Worker says varied, no volt field, description match",
        record: { 
            volt: null, 
            voltV: true, // Worker found multiple voltages
            desc: "PANEL 240/480V DUAL VOLTAGE" 
        },
        searchVolt: "480",
        expectedVoltV: true, // Should stay TRUE (orange badge - fuzzy match)
        expectedMatch: true,
        expectedWeight: 100
    }
];

console.log('Running voltage badge strictness tests...\n');

let passed = 0;
let failed = 0;

testRecords.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    const result = simulateVoltageFilter(test.record, test.searchVolt);
    
    let testPassed = true;
    
    if (result.matched !== test.expectedMatch) {
        console.log(`  ✗ FAIL: Expected matched=${test.expectedMatch}, got ${result.matched}`);
        testPassed = false;
    }
    
    if (result.matched && result.voltV !== test.expectedVoltV) {
        console.log(`  ✗ FAIL: Expected voltV=${test.expectedVoltV}, got ${result.voltV}`);
        console.log(`    (voltV flag determines badge color: false=GREEN, true=ORANGE)`);
        testPassed = false;
    }
    
    if (result.matched && result.weight !== test.expectedWeight) {
        console.log(`  ✗ FAIL: Expected weight=${test.expectedWeight}, got ${result.weight}`);
        testPassed = false;
    }
    
    if (testPassed) {
        console.log(`  ✓ PASS: matched=${result.matched}, voltV=${result.voltV}, weight=${result.weight}`);
        const badgeColor = result.matched ? (result.voltV ? 'ORANGE' : 'GREEN') : 'N/A';
        console.log(`    Badge color: ${badgeColor}`);
        passed++;
    } else {
        failed++;
    }
    console.log();
});

console.log('='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${testRecords.length} tests\n`);

if (failed === 0) {
    console.log('✨ All voltage badge strictness tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
} else {
    console.log('❌ Some tests failed!');
    console.log('='.repeat(60));
    process.exit(1);
}
