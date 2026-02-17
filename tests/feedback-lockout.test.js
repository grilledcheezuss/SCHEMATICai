/**
 * Test for v2.5.15 Feedback Lockout Changes
 * 
 * Tests that the feedback lockout allows multiple submissions per parameter
 * per panel per search.
 */

// Mock FeedbackService lockout behavior
class MockFeedbackService {
    static lockout = new Set();
    static currentId = null;
    
    static resetLockout() {
        this.lockout.clear();
    }
    
    static canSubmitParameter(panelId, paramKey) {
        return !this.lockout.has(`${panelId}:p_${paramKey}`);
    }
    
    static submitParameter(panelId, paramKey) {
        this.lockout.add(`${panelId}:p_${paramKey}`);
    }
    
    static canSubmitKeyword(panelId, keyword) {
        return !this.lockout.has(`${panelId}:kw_${keyword}`);
    }
    
    static submitKeyword(panelId, keyword) {
        this.lockout.add(`${panelId}:kw_${keyword}`);
    }
    
    static canSubmitUp(panelId) {
        return !this.lockout.has(`${panelId}:up`);
    }
    
    static submitUp(panelId) {
        this.lockout.add(`${panelId}:up`);
    }
}

function testPerParameterLockout() {
    console.log('Testing v2.5.15 Per-Parameter Feedback Lockout...\n');
    
    MockFeedbackService.resetLockout();
    const panelId = 'CP-12345';
    
    // Test 1: Can submit multiple parameters on same panel
    console.log('Test 1: Multiple parameters per panel');
    
    // First submission: HP correction
    if (!MockFeedbackService.canSubmitParameter(panelId, 'hp')) {
        console.log('✗ FAIL: Should be able to submit HP initially');
        return false;
    }
    MockFeedbackService.submitParameter(panelId, 'hp');
    console.log('  ✓ Submitted HP correction for', panelId);
    
    // Second submission: Enclosure correction (should be allowed)
    if (!MockFeedbackService.canSubmitParameter(panelId, 'enc')) {
        console.log('✗ FAIL: Should be able to submit Enclosure after HP');
        return false;
    }
    MockFeedbackService.submitParameter(panelId, 'enc');
    console.log('  ✓ Submitted Enclosure correction for', panelId);
    
    // Third submission: Voltage correction (should be allowed)
    if (!MockFeedbackService.canSubmitParameter(panelId, 'volt')) {
        console.log('✗ FAIL: Should be able to submit Voltage after HP and Enclosure');
        return false;
    }
    MockFeedbackService.submitParameter(panelId, 'volt');
    console.log('  ✓ Submitted Voltage correction for', panelId);
    
    console.log('✅ PASS: Multiple different parameters can be submitted\n');
    
    // Test 2: Cannot submit same parameter twice
    console.log('Test 2: Duplicate parameter blocked');
    
    if (MockFeedbackService.canSubmitParameter(panelId, 'hp')) {
        console.log('✗ FAIL: Should NOT be able to re-submit HP');
        return false;
    }
    console.log('  ✓ HP re-submission blocked');
    
    if (MockFeedbackService.canSubmitParameter(panelId, 'enc')) {
        console.log('✗ FAIL: Should NOT be able to re-submit Enclosure');
        return false;
    }
    console.log('  ✓ Enclosure re-submission blocked');
    
    console.log('✅ PASS: Duplicate parameters properly blocked\n');
    
    // Test 3: Can still submit manufacturer (not yet submitted)
    console.log('Test 3: Unsubmitted parameters still available');
    
    if (!MockFeedbackService.canSubmitParameter(panelId, 'mfg')) {
        console.log('✗ FAIL: Should be able to submit Manufacturer');
        return false;
    }
    console.log('  ✓ Manufacturer submission available');
    
    if (!MockFeedbackService.canSubmitParameter(panelId, 'phase')) {
        console.log('✗ FAIL: Should be able to submit Phase');
        return false;
    }
    console.log('  ✓ Phase submission available');
    
    console.log('✅ PASS: Unsubmitted parameters still available\n');
    
    return true;
}

function testKeywordLockout() {
    console.log('Testing Per-Keyword Feedback Lockout...\n');
    
    MockFeedbackService.resetLockout();
    const panelId = 'CP-12345';
    
    // Test: Can submit multiple keyword rejections
    console.log('Test: Multiple keywords per panel');
    
    if (!MockFeedbackService.canSubmitKeyword(panelId, 'MOTOR')) {
        console.log('✗ FAIL: Should be able to submit MOTOR keyword');
        return false;
    }
    MockFeedbackService.submitKeyword(panelId, 'MOTOR');
    console.log('  ✓ Submitted MOTOR keyword rejection');
    
    if (!MockFeedbackService.canSubmitKeyword(panelId, 'CONTROL')) {
        console.log('✗ FAIL: Should be able to submit CONTROL keyword');
        return false;
    }
    MockFeedbackService.submitKeyword(panelId, 'CONTROL');
    console.log('  ✓ Submitted CONTROL keyword rejection');
    
    // Cannot resubmit same keyword
    if (MockFeedbackService.canSubmitKeyword(panelId, 'MOTOR')) {
        console.log('✗ FAIL: Should NOT be able to re-submit MOTOR keyword');
        return false;
    }
    console.log('  ✓ MOTOR re-submission blocked');
    
    console.log('✅ PASS: Keyword lockout works correctly\n');
    
    return true;
}

function testPositiveFeedbackLockout() {
    console.log('Testing Positive Feedback (Thumbs Up) Lockout...\n');
    
    MockFeedbackService.resetLockout();
    const panelId = 'CP-12345';
    
    // Test: Thumbs up only once per panel per search
    console.log('Test: One thumbs up per panel per search');
    
    if (!MockFeedbackService.canSubmitUp(panelId)) {
        console.log('✗ FAIL: Should be able to submit thumbs up initially');
        return false;
    }
    MockFeedbackService.submitUp(panelId);
    console.log('  ✓ Submitted thumbs up');
    
    if (MockFeedbackService.canSubmitUp(panelId)) {
        console.log('✗ FAIL: Should NOT be able to re-submit thumbs up');
        return false;
    }
    console.log('  ✓ Duplicate thumbs up blocked');
    
    console.log('✅ PASS: Thumbs up lockout works correctly\n');
    
    return true;
}

function testLockoutReset() {
    console.log('Testing Lockout Reset on New Search...\n');
    
    MockFeedbackService.resetLockout();
    const panelId = 'CP-12345';
    
    // Submit various feedback
    MockFeedbackService.submitParameter(panelId, 'hp');
    MockFeedbackService.submitParameter(panelId, 'enc');
    MockFeedbackService.submitKeyword(panelId, 'MOTOR');
    MockFeedbackService.submitUp(panelId);
    
    console.log('  ✓ Submitted HP, Enclosure, MOTOR keyword, and thumbs up');
    
    // Verify lockout is active
    if (MockFeedbackService.canSubmitParameter(panelId, 'hp') ||
        MockFeedbackService.canSubmitParameter(panelId, 'enc') ||
        MockFeedbackService.canSubmitKeyword(panelId, 'MOTOR') ||
        MockFeedbackService.canSubmitUp(panelId)) {
        console.log('✗ FAIL: Lockout should be active');
        return false;
    }
    console.log('  ✓ Lockout active for all submissions');
    
    // Simulate new search (reset lockout)
    MockFeedbackService.resetLockout();
    console.log('  ✓ New search initiated (lockout reset)');
    
    // Verify all can be submitted again
    if (!MockFeedbackService.canSubmitParameter(panelId, 'hp') ||
        !MockFeedbackService.canSubmitParameter(panelId, 'enc') ||
        !MockFeedbackService.canSubmitKeyword(panelId, 'MOTOR') ||
        !MockFeedbackService.canSubmitUp(panelId)) {
        console.log('✗ FAIL: Should be able to submit all feedback after reset');
        return false;
    }
    console.log('  ✓ All feedback can be submitted again');
    
    console.log('✅ PASS: Lockout reset works correctly\n');
    
    return true;
}

// Run all tests
console.log('='.repeat(60));
console.log('v2.5.15 Feedback Lockout Tests');
console.log('='.repeat(60) + '\n');

const test1 = testPerParameterLockout();
const test2 = testKeywordLockout();
const test3 = testPositiveFeedbackLockout();
const test4 = testLockoutReset();

console.log('='.repeat(60));
if (test1 && test2 && test3 && test4) {
    console.log('🎉 All feedback lockout tests passed successfully!');
    console.log('='.repeat(60));
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    console.log('='.repeat(60));
    process.exit(1);
}
