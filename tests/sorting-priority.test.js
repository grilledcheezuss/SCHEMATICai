/**
 * Test for v2.5.15 Sorting Priority Changes
 * 
 * Tests that perfect (non-varied) matches are prioritized above varied matches
 * when weights are equal.
 */

// Helper function to calculate varied count for a result based on criteria
function calculateVariedCount(result, criteria) {
    return (criteria.mfg !== 'Any' && result.mfgV ? 1 : 0) +
        (criteria.hp !== 'Any' && result.hpV ? 1 : 0) +
        (criteria.volt !== 'Any' && result.voltV ? 1 : 0) +
        (criteria.phase !== 'Any' && result.phaseV ? 1 : 0) +
        (criteria.enc !== 'Any' && result.encV ? 1 : 0);
}

// Mock search criteria
const crit = {
    mfg: 'EATON',
    hp: '3',
    volt: '480',
    phase: '3',
    enc: '4XSS'
};

// Test sorting function
function testSorting() {
    console.log('Testing v2.5.15 Sorting Priority...\n');
    
    // Test data: equal weights but different varied flags
    const results = [
        { id: 'CP-001', w: 16000, mfgV: false, hpV: false, voltV: false, phaseV: false, encV: false }, // Perfect match
        { id: 'CP-002', w: 16000, mfgV: true, hpV: false, voltV: false, phaseV: false, encV: false },  // 1 varied (mfg)
        { id: 'CP-003', w: 16000, mfgV: false, hpV: true, voltV: false, phaseV: false, encV: false },  // 1 varied (hp)
        { id: 'CP-004', w: 16000, mfgV: true, hpV: true, voltV: false, phaseV: false, encV: false },  // 2 varied
        { id: 'CP-005', w: 16000, mfgV: false, hpV: false, voltV: true, phaseV: false, encV: false },  // 1 varied (volt)
    ];
    
    // Apply the sorting algorithm from app.js
    results.sort((a,b) => { 
        if(a.w !== b.w) return b.w - a.w;
        
        // When weights are equal, prioritize non-varied (perfect) matches
        const aVariedCount = calculateVariedCount(a, crit);
        const bVariedCount = calculateVariedCount(b, crit);
        
        if(aVariedCount !== bVariedCount) return aVariedCount - bVariedCount; // Fewer varied flags = better
        
        return b.id.localeCompare(a.id, undefined, {numeric:true, sensitivity:'base'}); 
    });
    
    // Verify results
    console.log('Sorted results:');
    results.forEach((r, i) => {
        const variedCount = calculateVariedCount(r, crit);
        console.log(`  ${i+1}. ${r.id} (weight: ${r.w}, varied flags: ${variedCount})`);
    });
    
    // Assertions
    console.log('\nVerifying expectations:');
    
    // Test 1: Perfect match should be first
    if (results[0].id === 'CP-001') {
        console.log('✓ PASS: Perfect match (CP-001) is first');
    } else {
        console.log('✗ FAIL: Perfect match should be first, got:', results[0].id);
        return false;
    }
    
    // Test 2: 2-varied should be last
    if (results[4].id === 'CP-004') {
        console.log('✓ PASS: Most varied result (CP-004) is last');
    } else {
        console.log('✗ FAIL: Most varied should be last, got:', results[4].id);
        return false;
    }
    
    // Test 3: Results should be grouped by varied count
    const variedCounts = results.map(r => calculateVariedCount(r, crit));
    
    let isSorted = true;
    for (let i = 1; i < variedCounts.length; i++) {
        if (variedCounts[i] < variedCounts[i-1]) {
            isSorted = false;
            break;
        }
    }
    
    if (isSorted) {
        console.log('✓ PASS: Results sorted by varied count (ascending)');
    } else {
        console.log('✗ FAIL: Results not properly sorted by varied count');
        return false;
    }
    
    console.log('\n✅ All tests passed!');
    return true;
}

// Test with 'Any' filters (varied flags should be ignored)
function testSortingWithAnyFilters() {
    console.log('\n\nTesting with "Any" filters...\n');
    
    const critAny = {
        mfg: 'Any',
        hp: '3',
        volt: 'Any',
        phase: 'Any',
        enc: 'Any'
    };
    
    const results = [
        { id: 'CP-001', w: 5000, mfgV: true, hpV: false, voltV: true, phaseV: true, encV: true }, // Only HP active
        { id: 'CP-002', w: 5000, mfgV: false, hpV: true, voltV: false, phaseV: false, encV: false }, // HP varied
    ];
    
    results.sort((a,b) => { 
        if(a.w !== b.w) return b.w - a.w;
        
        const aVariedCount = calculateVariedCount(a, critAny);
        const bVariedCount = calculateVariedCount(b, critAny);
        
        if(aVariedCount !== bVariedCount) return aVariedCount - bVariedCount;
        
        return b.id.localeCompare(a.id, undefined, {numeric:true, sensitivity:'base'}); 
    });
    
    console.log('Results with "Any" filters:');
    results.forEach((r, i) => {
        const variedCount = calculateVariedCount(r, critAny);
        console.log(`  ${i+1}. ${r.id} (HP varied: ${r.hpV}, counted varied flags: ${variedCount})`);
    });
    
    // CP-001 should be first (HP not varied)
    if (results[0].id === 'CP-001') {
        console.log('\n✓ PASS: Non-varied HP result is first');
        console.log('✓ PASS: Varied flags ignored for "Any" filters');
        console.log('\n✅ "Any" filter test passed!');
        return true;
    } else {
        console.log('\n✗ FAIL: Wrong sorting with "Any" filters');
        return false;
    }
}

// Run tests
const test1Passed = testSorting();
const test2Passed = testSortingWithAnyFilters();

if (test1Passed && test2Passed) {
    console.log('\n\n🎉 All v2.5.15 sorting tests passed successfully!');
    process.exit(0);
} else {
    console.log('\n\n❌ Some tests failed');
    process.exit(1);
}
