/**
 * SCHEMATICA ai Worker Integration Tests
 * 
 * These tests validate Worker API functionality including:
 * - PDF_BY_ID target with CP prefix and file extensions
 * - Auth requirements for MAIN target
 * - Error handling (404, 401)
 * 
 * Note: These are integration tests that require a running Worker instance
 * and valid test credentials.
 */

// Configuration
const WORKER_URL = "https://cox-proxy.thomas-85a.workers.dev";
const TEST_CREDENTIALS = {
    user: process.env.TEST_USER || "testuser",
    pass: process.env.TEST_PASS || "testpass"
};

// Test utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function expectStatus(response, expectedStatus, message) {
    assert(response.status === expectedStatus, 
        `${message} - Expected status ${expectedStatus}, got ${response.status}`);
}

// Test Suite: PDF_BY_ID Target
async function testPdfByIdWithCpPrefix() {
    console.log("Testing PDF_BY_ID with CP- prefix...");
    
    // Test with CP- prefix - should work
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID&id=CP-1234`);
    
    // Should either return 200 (found) or 404 (not found), but not 400 (bad request)
    assert(response.status === 200 || response.status === 404,
        `CP- prefix should be handled. Got status: ${response.status}`);
    
    console.log("✓ PDF_BY_ID handles CP- prefix correctly");
}

async function testPdfByIdWithDwgExtension() {
    console.log("Testing PDF_BY_ID with .dwg extension...");
    
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID&id=1234.dwg`);
    
    assert(response.status === 200 || response.status === 404,
        `.dwg extension should be handled. Got status: ${response.status}`);
    
    console.log("✓ PDF_BY_ID handles .dwg extension correctly");
}

async function testPdfByIdWithPdfExtension() {
    console.log("Testing PDF_BY_ID with .pdf extension...");
    
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID&id=1234.pdf`);
    
    assert(response.status === 200 || response.status === 404,
        `.pdf extension should be handled. Got status: ${response.status}`);
    
    console.log("✓ PDF_BY_ID handles .pdf extension correctly");
}

async function testPdfByIdCombinedFormats() {
    console.log("Testing PDF_BY_ID with combined formats...");
    
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID&id=CP-1234.dwg`);
    
    assert(response.status === 200 || response.status === 404,
        `Combined format should be handled. Got status: ${response.status}`);
    
    console.log("✓ PDF_BY_ID handles combined CP-prefix + extension correctly");
}

async function testPdfByIdMissing() {
    console.log("Testing PDF_BY_ID with non-existent panel...");
    
    // Use an ID that definitely doesn't exist
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID&id=NONEXISTENT-999999999`);
    
    await expectStatus(response, 404, "Non-existent panel should return 404");
    
    const data = await response.text();
    assert(data.includes("not found"), "Should include 'not found' message");
    
    console.log("✓ PDF_BY_ID returns 404 for missing panels");
}

async function testPdfByIdMissingId() {
    console.log("Testing PDF_BY_ID without ID parameter...");
    
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID`);
    
    await expectStatus(response, 400, "Missing ID should return 400");
    
    console.log("✓ PDF_BY_ID returns 400 when ID parameter is missing");
}

// Test Suite: MAIN Target Authentication
async function testMainUnauthorized() {
    console.log("Testing MAIN target without credentials...");
    
    const response = await fetch(`${WORKER_URL}?target=MAIN`);
    
    await expectStatus(response, 401, "MAIN without auth should return 401");
    
    const data = await response.json();
    assert(data.error === "Unauthorized", "Should return Unauthorized error");
    
    console.log("✓ MAIN target requires authentication (401 without credentials)");
}

async function testMainInvalidCredentials() {
    console.log("Testing MAIN target with invalid credentials...");
    
    const response = await fetch(`${WORKER_URL}?target=MAIN`, {
        headers: {
            'X-Cox-User': 'invaliduser',
            'X-Cox-Pass': 'invalidpass'
        }
    });
    
    await expectStatus(response, 401, "MAIN with invalid auth should return 401");
    
    console.log("✓ MAIN target rejects invalid credentials");
}

async function testMainPageSizeValidation() {
    console.log("Testing MAIN target pageSize validation...");
    
    // Note: This test will return 401 if credentials are invalid,
    // but we're checking that pageSize doesn't cause a different error
    
    // Test with oversized pageSize
    const response1 = await fetch(`${WORKER_URL}?target=MAIN&pageSize=999`, {
        headers: {
            'X-Cox-User': TEST_CREDENTIALS.user,
            'X-Cox-Pass': TEST_CREDENTIALS.pass
        }
    });
    
    // Should either be 401 (auth failed) or 200 (auth succeeded)
    // Should NOT be 400 (bad request from pageSize)
    assert(response1.status === 401 || response1.status === 200,
        `pageSize validation should work. Got status: ${response1.status}`);
    
    // Test with negative pageSize
    const response2 = await fetch(`${WORKER_URL}?target=MAIN&pageSize=-10`, {
        headers: {
            'X-Cox-User': TEST_CREDENTIALS.user,
            'X-Cox-Pass': TEST_CREDENTIALS.pass
        }
    });
    
    assert(response2.status === 401 || response2.status === 200,
        `Negative pageSize should be clamped. Got status: ${response2.status}`);
    
    console.log("✓ MAIN target validates and clamps pageSize");
}

// Test Suite: PDF Target SSRF Protection
async function testPdfHostAllowlist() {
    console.log("Testing PDF target host allowlist...");
    
    // Test with disallowed host
    const response = await fetch(`${WORKER_URL}?target=PDF&url=https://evil.com/malicious.pdf`);
    
    await expectStatus(response, 403, "Disallowed host should return 403");
    
    const text = await response.text();
    assert(text.includes("not allowed"), "Should indicate host not allowed");
    
    console.log("✓ PDF target rejects disallowed hosts (SSRF protection)");
}

async function testPdfMissingUrl() {
    console.log("Testing PDF target without URL parameter...");
    
    const response = await fetch(`${WORKER_URL}?target=PDF`);
    
    await expectStatus(response, 400, "Missing URL should return 400");
    
    console.log("✓ PDF target returns 400 when URL parameter is missing");
}

// Test Suite: CORS Headers
async function testCorsHeaders() {
    console.log("Testing CORS headers...");
    
    const response = await fetch(`${WORKER_URL}?target=PDF_BY_ID&id=1234`);
    
    assert(response.headers.get('Access-Control-Allow-Origin') === '*',
        "Should have CORS header Access-Control-Allow-Origin: *");
    
    console.log("✓ CORS headers are present");
}

async function testOptionsRequest() {
    console.log("Testing OPTIONS (preflight) request...");
    
    const response = await fetch(`${WORKER_URL}`, {
        method: 'OPTIONS'
    });
    
    await expectStatus(response, 200, "OPTIONS should return 200");
    
    const allowMethods = response.headers.get('Access-Control-Allow-Methods');
    assert(allowMethods && allowMethods.includes('GET') && allowMethods.includes('POST'),
        "Should allow GET and POST methods");
    
    console.log("✓ OPTIONS request handled correctly");
}

// Main test runner
async function runTests() {
    console.log("=".repeat(60));
    console.log("SCHEMATICA ai Worker Integration Tests");
    console.log("=".repeat(60));
    console.log();
    
    const tests = [
        // PDF_BY_ID tests
        testPdfByIdWithCpPrefix,
        testPdfByIdWithDwgExtension,
        testPdfByIdWithPdfExtension,
        testPdfByIdCombinedFormats,
        testPdfByIdMissing,
        testPdfByIdMissingId,
        
        // MAIN auth tests
        testMainUnauthorized,
        testMainInvalidCredentials,
        testMainPageSizeValidation,
        
        // PDF SSRF tests
        testPdfHostAllowlist,
        testPdfMissingUrl,
        
        // CORS tests
        testCorsHeaders,
        testOptionsRequest
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            await test();
            passed++;
        } catch (error) {
            console.error(`✗ ${test.name} failed:`, error.message);
            failed++;
        }
        console.log();
    }
    
    console.log("=".repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
    console.log("=".repeat(60));
    
    return failed === 0;
}

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests };
}

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}
