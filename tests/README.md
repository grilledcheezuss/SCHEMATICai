# SCHEMATICA ai Tests

## Overview

This directory contains tests for the SCHEMATICA ai application.

## Test Files

### worker.integration.test.js

Integration tests for the Cloudflare Worker API.

**Coverage:**
- PDF_BY_ID target with various ID formats (CP- prefix, .dwg/.pdf extensions)
- MAIN target authentication (401 unauthorized)
- PDF target SSRF protection (host allowlist)
- CORS headers validation
- Error handling (400, 401, 403, 404)

**Running the tests:**

```bash
# Using Node.js
node tests/worker.integration.test.js

# Using environment variables for credentials (optional)
TEST_USER=myuser TEST_PASS=mypass node tests/worker.integration.test.js
```

**Note:** These tests run against the live Worker instance at `https://cox-proxy.thomas-85a.workers.dev`.

## Future Tests

Additional test coverage planned for v2.5.4+:

- [ ] Snapshot tests for PDF redaction export (portrait/landscape)
- [ ] Snapshot tests for rotated overlay rendering
- [ ] Unit tests for auto-detection algorithm
- [ ] Unit tests for HP fuzzy matching
- [ ] Unit tests for Naive Bayes classifier
- [ ] E2E tests for PDF redaction workflow

## Test Infrastructure

Currently using minimal test infrastructure with:
- Native fetch API for HTTP requests
- Simple assertion functions
- Console-based test runner

Future consideration: Migrate to a formal test framework (Jest, Vitest, or Mocha).
