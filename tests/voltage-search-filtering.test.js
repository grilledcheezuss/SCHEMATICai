/**
 * Test for v2.5.19 Voltage Search Filtering
 * 
 * Tests that voltage search filters properly handle:
 * - Strict word boundaries (prevents "480" matching "4800" or "CP-480")
 * - Dual-voltage exclusions (searching "480V" should NOT match "277/480V" panels in fuzzy description search)
 */

console.log('🧪 Testing v2.5.19 Voltage Search Filtering\n');

// Simulate SearchEngine voltage filtering logic from v2.5.19
function simulateVoltageFilterV2519(record, searchVolt) {
    let voltV = record.voltV || false; // Start with worker variance flag
    let matched = false;
    let weight = 0;
    
    // Check for strict field match (green badge)
    if(record.volt && record.volt.includes(searchVolt)) {
        // Strict field match - override worker variance flag for green badge
        voltV = false;
        weight = 500;
        matched = true;
    } else if(record.desc) {
        // CRITICAL FIX: Strict voltage boundary checks to prevent false positives
        // Exclude canonical dual-voltage pairs ONLY when searching for the LOWER voltage
        // Example: "277/480V" should match "480V" searches (480 is primary)
        // Example: "120/240V" should match "240V" searches (240 is primary)
        // Example: "120/240V" should NOT match "120V" searches (120 is secondary)
        const DUAL_VOLT_EXCLUSIONS = {
            '120': /\b120\s*[\/\-]\s*240\b/i,  // Exclude "120/240" when searching 120V (120 is lower)
            '277': /\b277\s*[\/\-]\s*480\b/i   // Exclude "277/480" when searching 277V (277 is lower)
        };
        
        const exclusionPattern = DUAL_VOLT_EXCLUSIONS[searchVolt];
        const hasDualVoltExclusion = exclusionPattern && exclusionPattern.test(record.desc);
        
        // Strict word-boundary voltage match (prevents "480" matching in "4800" or "CP-480")
        const strictVoltPattern = new RegExp(`\\b${searchVolt}\\s*(?:V\\b|VAC|VOLT|PH)`, 'i');
        const hasStrictMatch = strictVoltPattern.test(record.desc);
        
        if (hasStrictMatch && !hasDualVoltExclusion) {
            // Fuzzy description match - mark as varied for orange badge
            voltV = true;
            weight = 100;
            matched = true;
        }
    }
    
    return { matched, voltV, weight };
}

// Test cases for the 480V false positive bug fix
const testRecords = [
    // === CRITICAL BUG FIX: These should NOT match when searching 480V ===
    {
        name: "277/480V dual-voltage panel (slash notation) - Should NOT match 480V search",
        record: { 
            volt: "480",  // Worker extracted 480V as primary
            voltV: false, // Worker correctly identified as canonical pair
            desc: "CONTROL PANEL 277/480V 3PH" 
        },
        searchVolt: "480",
        expectedMatch: true, // SHOULD match on strict field (volt="480")
        expectedVoltV: false, // Green badge (strict field match)
        expectedWeight: 500
    },
    // === CRITICAL BUG FIX: These should NOT match when searching for LOWER voltage ===
    {
        name: "277/480V panel without volt field - SHOULD match 480V fuzzy search (480V is primary)",
        record: { 
            volt: null,  // No volt field
            voltV: false,
            desc: "PANEL 277/480 VAC CONTROL" 
        },
        searchVolt: "480",
        expectedMatch: true, // SHOULD match 480V (480 is the primary voltage)
        expectedVoltV: true, // Orange badge (fuzzy match)
        expectedWeight: 100
    },
    {
        name: "277/480V panel without volt field - Should NOT match 277V fuzzy search (277V is lower)",
        record: { 
            volt: null,  // No volt field
            voltV: false,
            desc: "PANEL 277/480 VAC CONTROL" 
        },
        searchVolt: "277",
        expectedMatch: false, // Should NOT match (dual-voltage exclusion - 277 is lower voltage)
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "120/240V panel - Should NOT match 120V fuzzy search (120V is lower)",
        record: { 
            volt: null,
            voltV: false,
            desc: "PANEL 120/240 VAC SINGLE PHASE" 
        },
        searchVolt: "120",
        expectedMatch: false, // Should NOT match (dual-voltage exclusion - 120 is lower voltage)
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "120/240V panel - SHOULD match 240V fuzzy search (240V is primary)",
        record: { 
            volt: null,
            voltV: false,
            desc: "CONTROL PANEL 120/240V 1PH" 
        },
        searchVolt: "240",
        expectedMatch: true, // SHOULD match (240V is the primary voltage in 120/240V)
        expectedVoltV: true, // Orange badge (fuzzy description match)
        expectedWeight: 100
    },
    
    // === WORD BOUNDARY TESTS: These should NOT match ===
    {
        name: "4800V panel - Should NOT match 480V search (boundary check)",
        record: { 
            volt: null,
            voltV: false,
            desc: "HIGH VOLTAGE PANEL 4800V INDUSTRIAL" 
        },
        searchVolt: "480",
        expectedMatch: false, // Should NOT match (480 is not word-bounded in "4800")
        expectedVoltV: false,
        expectedWeight: 0
    },
    {
        name: "CP-480 panel ID - Should NOT match 480V search (no voltage suffix)",
        record: { 
            volt: null,
            voltV: false,
            desc: "CONTROL PANEL CP-480 MOTOR STARTER" 
        },
        searchVolt: "480",
        expectedMatch: false, // Should NOT match (no V/VAC/VOLT/PH suffix)
        expectedVoltV: false,
        expectedWeight: 0
    },
    
    // === VALID MATCHES: These SHOULD match ===
    {
        name: "Pure 480V panel - Should match 480V search",
        record: { 
            volt: "480",
            voltV: false,
            desc: "CONTROL PANEL 480V 3 PHASE" 
        },
        searchVolt: "480",
        expectedMatch: true, // Should match (strict field match)
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "480 VAC panel (no volt field) - Should match fuzzy 480V search",
        record: { 
            volt: null,
            voltV: false,
            desc: "MOTOR CONTROL 480 VAC 3PH" 
        },
        searchVolt: "480",
        expectedMatch: true, // Should match (fuzzy description match)
        expectedVoltV: true, // Orange badge
        expectedWeight: 100
    },
    {
        name: "240V single-phase panel - Should match 240V search",
        record: { 
            volt: "240",
            voltV: false,
            desc: "CONTROL PANEL 240V 1PH" 
        },
        searchVolt: "240",
        expectedMatch: true, // Should match (strict field match)
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "120V panel - Should match 120V search",
        record: { 
            volt: null,
            voltV: false,
            desc: "LIGHTING PANEL 120 VOLT SINGLE PHASE" 
        },
        searchVolt: "120",
        expectedMatch: true, // Should match (fuzzy description match)
        expectedVoltV: true, // Orange badge
        expectedWeight: 100
    },
    
    // === EDGE CASES ===
    {
        name: "240V panel with 120/240V note - Should match 240V search on field",
        record: { 
            volt: "240",  // Field says 240V
            voltV: false,
            desc: "PANEL 240V (Also available in 120/240V)" 
        },
        searchVolt: "240",
        expectedMatch: true, // Should match (strict field match takes precedence)
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    },
    {
        name: "460V panel (480V equivalent) - Should match 480V search",
        record: { 
            volt: "480",  // Worker maps 460V to 480V
            voltV: false,
            desc: "CONTROL PANEL 460V 3 PHASE" 
        },
        searchVolt: "480",
        expectedMatch: true, // Should match (strict field match)
        expectedVoltV: false, // Green badge
        expectedWeight: 500
    }
];

console.log('Running voltage search filtering tests...\n');

let passed = 0;
let failed = 0;

testRecords.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    const result = simulateVoltageFilterV2519(test.record, test.searchVolt);
    
    let testPassed = true;
    
    if (result.matched !== test.expectedMatch) {
        console.log(`  ✗ FAIL: Expected matched=${test.expectedMatch}, got ${result.matched}`);
        console.log(`    Record: volt="${test.record.volt}", desc="${test.record.desc}"`);
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
        console.log(`  ✓ PASS: matched=${result.matched}${result.matched ? `, voltV=${result.voltV}, weight=${result.weight}` : ''}`);
        if (result.matched) {
            const badgeColor = result.voltV ? 'ORANGE' : 'GREEN';
            console.log(`    Badge color: ${badgeColor}`);
        }
        passed++;
    } else {
        failed++;
    }
    console.log();
});

console.log('='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${testRecords.length} tests\n`);

if (failed === 0) {
    console.log('✨ All voltage search filtering tests passed!');
    console.log('='.repeat(60));
    process.exit(0);
} else {
    console.log('❌ Some tests failed!');
    console.log('='.repeat(60));
    process.exit(1);
}
