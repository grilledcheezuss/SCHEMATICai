# SCHEMATICA ai Tests

## Overview

This directory contains tests for the SCHEMATICA ai application.

## Test Files

### sheets-overlay.test.js (v2.5.110)

`node tests/sheets-overlay.test.js` runs locally without credentials or dependencies. It exercises the actual Worker with mocked Apps Script/Airtable responses and Cache API: full/partial/missing/revision-specific matches, placeholder validation, normalized duplicate IDs, fetch coalescing, unchanged/revised hashes, MAIN cache invalidation, healer fallback, outage throttling, cold-isolate recovery, initial failure, Google redirects, browser derivation, JSON snapshot restoration and conflicting HP/voltage description matching.

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

### ui-housekeeping.browser.test.js / ui-housekeeping-static.test.js (v2.5.100)

Real-DOM regressions for Submittal Generator availability (small-phone cutoff matrix, resize transitions),
light-mode result-card borders, and first-search result count visibility. The browser test serves the
repository locally, drives headless Chrome/Chromium through the DevTools protocol
(`tests/helpers/headless-browser.js`, Node >= 22, no npm dependencies) and blocks all external network.

```bash
node tests/ui-housekeeping-static.test.js
node tests/ui-housekeeping.browser.test.js            # CHROME_PATH=/path/to/chrome to override
REQUIRE_BROWSER=1 node tests/ui-housekeeping.browser.test.js   # fail instead of skip without Chrome
```

### Deployment and snapshot update regressions (v2.5.101)

The same local Chrome harness exercises production release discovery/asset navigation, manual and
saved-credential login, encrypted IndexedDB generation replacement and previous-generation recovery.
Network/navigation failures are injected locally; no live Worker credentials are needed.

```bash
REQUIRE_BROWSER=1 node tests/release-update.browser.test.js
REQUIRE_BROWSER=1 node tests/release-snapshot.browser.test.js
node tests/data-loader-refresh.test.js
```

v2.5.102 adds release checks for same-origin `/index.html` -> `/` entry redirects, rejected off-site
redirects, asset path/MIME/HTML-fallback/stale-app.js validation (including a real Chrome fetch through a
local `/__redirect/index.html` 308 redirect), and a data-loader check that the waiting-for-update
label stays stable (no restarting percentage) and the search button ellipsizes rather than clips.

UI housekeeping tests also cover first-card hover clipping and cleaned-up menu keyboard order.
Live hosting/cache headers and physical-device acceptance remain separate deployment checks.

### System Type evidence hierarchy and local evaluator (v2.5.109)

`system-type-hierarchy.test.js` covers bounded caption recovery, title/system-line arbitration, orange motor-count tie-breaks, explicit-row precedence, CP-1245r1/CP-1409, and representative v2.5.108 baselines. `system-type-adjacent.test.js` covers bounded type/equipment phrases, panel/title context, hardware/reference and multi-type exclusions, and the CP-8025/CP-8374 fixtures. The local-only evaluator accepts CSV/JSON rows with `app_result`, `ground_truth`, `gt_confidence`, `root_cause`, and either a full description field or `evidence_snippet`; output contains aggregate metrics only.

```bash
node tests/system-type-hierarchy.test.js
node tests/system-type-adjacent.test.js
node tests/system-type-repair.test.js
node tests/system-type-evaluate.test.js
node tests/system-type-evaluate.js /path/to/local-labels.csv
```

Snippet-only results are a snippet benchmark, not complete-record or live-catalog accuracy. No comparison dataset is checked in.

### System Type adjacent-token rules (v2.5.107)

`tests/system-type-adjacent.test.js` uses the verbatim flattened CP-8025 (Duplex) and CP-8374 (Simplex) descriptions in
`tests/fixtures/system-type-adjacent.js` plus mutated variants: forward/reverse adjacent values for all four types and
N PUMP(S), hardware-only/negated/conflicting/other-panel/RTF-fonttable/part-number negatives, combination counts,
metamorphic BOM-noise insertion and forward/reverse layout swaps, and 8k-record derivation timing.

```bash
node tests/system-type-adjacent.test.js
```

### System Type parser and audit regressions (v2.5.106)

The production parser tests cover all four types in forward/reverse cells, count disagreement versus blank/noisy
cells, bounded title/count corroboration, and System-Type-only RTF/DXF text extraction (including metadata,
coordinates, malformed records, and preservation of raw/enclosure/manufacturer fields). Audit tests exercise stale
derivations and confirm that structured records report the same evidence as snapshot derivation. The diagnostic
remains read-only, bounded, sanitized and opt-in; badge agreement uses the real `UI._generateBadges`.

```bash
node tests/system-type-repair.test.js
node tests/system-type-audit.test.js
node tests/parser-repair.test.js
node tests/system-type-mfg-ranking.test.js
node tests/enclosure-material-mfg-coverage.test.js
node tests/data-loader-refresh.test.js
```

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

v2.5.103 adds sync-lock regressions (previous-release, pre-v2.5.103 and dead-heartbeat locks taken over;
live peer waited then restored; peer-wait timeout and failed takeover reach a terminal state; capped preload
rounds; watchdog retry; pagehide/beforeunload release; real IndexedDB lock records in
release-snapshot.browser.test.js), mixed HTML/app.js handshake checks (one guarded reload, no loop, no
downgrade, deploy-window HTML fallback), lock release before real release navigation, and a real Chrome
startup with release-update.js blocked that still preloads without an init alert.
