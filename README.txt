CLOUDFLARE WORKER SCRIPT (release v2.5.114; Worker implementation remains v2.5.113)

Release note: v2.5.114 revises the frontend Submittal Generator with document-digest-bound per-page profiles, validated mapping imports, measured layout assets, and consistent generated preview/output snapshots. Generated PDFs use VISUAL MASKING/title-block replacement, not secure irreversible redaction: covered source content may remain extractable. Original print/download actions remain separate. Deploy frontend assets including generator-state.js and PDFmapping JSON files together; no Worker redeployment or Sheets/auth/parser change is required. DERIVED_REV 12, encrypted snapshot schema 1 and Worker SPEC_TRANSFORM_VERSION v2.5.113 are unchanged. See REDACTION_SCHEMA.md for mapping provenance/input contract and tests/README.md for local verification prerequisites.

Release note: v2.5.113 makes Google Sheets authority observable and more robust end to end (Worker and frontend, deploy both). MAIN keeps `sheets` (revision/hash or null) and adds a secret-free `sheetStatus`: state active/unavailable/pending/unconfigured, a classified reason (endpoint, redirect, http-<status>, timeout, too-large, json, payload, columns, no-ids, cached-*), the indexed row count and per-page matchedRows/withSpecs/withMetadata/withUncertainty; every MAIN response carries the live X-SCHEMATICA-SHEETS-STATUS header. Panel IDs also match `CP 1234`, `CP1234`, en-dash prefixes and `1234-R1`; rows may be objects keyed by column or omit trailing blank cells, `rowCount` may be omitted, numeric hashes and Workspace `/a/macros/<domain>/s/<id>/exec` URLs are accepted, blank panelType is not metadata, and redirect bodies are released. SPEC_TRANSFORM_VERSION v2.5.113 invalidates pre-fix MAIN pages and the frontend release refreshes browser snapshots. Successful syncs store the per-page status (counts and public revision/hash only) and the read-only console helper `SheetAuthorityAudit.report()/text()/inspect(id)` reports recordsWithSheetSpecs/metadata/uncertainty, trusted/uncertain field counts and a verdict (sheet-backed, no-sync-evidence, worker-did-not-report, worker-unconfigured, worker-sheet-unavailable, stale-snapshot, no-matching-rows) without network access. Fallback, full descriptions, lazy sheet compilation/caching, DERIVED_REV 12 and snapshot schema 1 are unchanged. Live sheet contents/endpoint were not available to this change; synthetic tests only.

Previous release note: v2.5.112 is a Worker-only CPU fix for MAIN "Worker exceeded CPU time limit" failures (frontend stays v2.5.111). Measured locally: the HP table pattern backtracked cubically on padded whitespace (one record with `HP` + 5,000 spaces took ~28 s CPU) and voltage/phase separators quadratically; they are now linear with identical matches. Manufacturer detection prefilters aliases (~34 ms -> ~3 ms per 100 x 4.5 KB records). Sheets rows are normalized lazily on lookup (20k-row compile 200 ms -> ~15 ms); the raw Apps Script body is persisted verbatim with an identity header so unchanged refreshes skip parse/serialize and cold-isolate MAIN hits never parse the sheet. MAIN pages are keyed by the applied sheet identity and a deterministic feedback-content fingerprint instead of a per-isolate counter. All fallback semantics are unchanged.

Previous release note: v2.5.111 makes clean Google Sheets specifications exclusive per-field authority before Worker inference and browser matching, badges and ranking. Missing/uncertain fields alone retain legacy fallback; full trusted records skip spec extraction. Phase-frequency, supported dual-voltage, fractional HP and stainless-grade normalization are bounded; sys and panelType remain distinct, nema is a rating, never material. MAIN transformation keys invalidate pre-fix pages even with unchanged sheet revision/hash. Deploy the API Worker separately from frontend, with SHEETS_ENDPOINT as the original Apps Script /exec?token=... full-data URL secret (no mode=meta). No Apps Script deployment changes, cache/profile wipe or description truncation. DERIVED_REV 12, encrypted snapshot schema 1. See worker/API_DOCUMENTATION.md for trust limitations and deployment verification.

Previous release: v2.5.110 introduced the Google Sheets live canonical-spec overlay, five-minute revision/hash freshness and validated last-good edge persistence.

Previous release note: v2.5.109 keeps explicit Panel/System Type rows primary, then compares bounded title phrases with a standalone system line. Agreement is stronger evidence; if they conflict, a plain motor-count line only selects between those candidates and the selected result stays orange. Bounded caption-separated recovery returns CP-1245r1 as Simplex orange; CP-1409 remains absent. Representative v2.5.108 outcomes and existing row/count/conflict protections are preserved. DERIVED_REV 10 refreshes cached records; raw JSON, schema 1 and Worker v2.5.97 remain unchanged. No cache wipe or Worker redeploy, and no live-catalog accuracy is claimed.

SYSTEM TYPE COVERAGE DECISIONS:

- Implemented: after explicit-row precedence, bounded title and standalone `SYSTEM | <type>` line evidence are compared as primary candidates. An agreeing pair is higher-confidence; a count selects only between conflicting candidates and cannot turn that selection green. Caption-separated `<type> PUMP/BLOWER/GRINDER | POWER/CONTROL DIAGRAM | CONTROL PANEL` titles are bounded to a panel-description/drawing-title anchor and remain orange alone.
- Implemented: direct adjective/equipment pairs (pump, blower, grinder, aerator, alternator/alternating, VFD, station, sewage, effluent, submersible, booster, well and system forms) only with nearby panel/title context. This is title evidence and stays orange unless the existing title/count policy independently corroborates it. Competing types abstain.
- Implemented: numeric combinations such as `2+1+1` in a Panel Type cell abstain; they do not become a system type. Adjacent GFI/GFCI, convenience, plug, wire, cable, conductor and cord tokens are hardware/noise, not types.
- Retained: clear explicit rows outrank incidental titles; only the existing bounded title grammar can corroborate counts; motor-count combinations are never summed, and a count alone never infers Quadraplex. RTF metadata filtering and validated DXF TEXT parsing remain unchanged.
- Deferred: indexed-pump-number count inference, PLC/MCP multi-group inference, broader 40-character free-text associations and extra CAD escape normalization. No matched catalog labels or full descriptions are available here to validate their precision or conflicts.

SYSTEM TYPE MEASUREMENT (local, optional):

No `system-type-comparison.csv` or equivalent labels were present in this checkout, so production recall/precision, missed-record counts and preservation of prior classifications are unmeasured. The reported production statistics and targets remain user-supplied, unverified measurements.

Run `node tests/system-type-evaluate.js /path/to/local-labels.csv` (or `.json`) with `app_result`, `ground_truth`, `gt_confidence`, `root_cause`, and either a full-description field (`desc`, `description`, `raw_desc`, `full_description`) or `evidence_snippet`. It reports supplied-result and current-parser per-type TP/FP/FN plus confidence/root-cause groups; it does not print IDs or descriptions. Snippet-only metrics describe only the provided snippets, not full catalog accuracy. Keep sensitive inputs local and compare new matches against source documents before treating labels as verified.

Previous release note: v2.5.108 adds browser-only, orange-only evidence for a directly adjacent system type and equipment phrase when a panel/title marker is within 42 characters. Multiple supported types abstain; hardware, component, reference and notes/BOM contexts are rejected. ALTERNATOR requires a following CONTROL PANEL; the short DUP alias remains excluded from title/equipment evidence. Numeric combinations in a Panel Type cell abstain as an internal Mixed conflict; motor-count behavior is unchanged. DERIVED_REV 9; schema 1, raw descriptions and Worker v2.5.97 unchanged.

Previous release note: v2.5.107 is a browser-only System Type parser fix for flattened CAD `desc` dumps, where info-table label/value columns are interleaved with BOM, wiring and checklist columns without delimiters. Panel Type / System Type / Type of Panel accept the leading token after the label (forward) or, when that is not a system value, the token immediately before it (reverse); trailing/earlier column noise is ignored, disagreeing sides abstain, and only the immediately preceding NOT/NON/NO negates a reverse value. No. Motors / Number of Pumps accept a plain leading 1-4 ("2 OR Elapsed" -> 2, "1 TX1 13" -> 1) or "<n> No. Motors"; 2+2, 2 + 1, 2/3, 2-3, 1.5, 2 & 1 and 2+EX stay non-plain and are never summed. Green = explicit row with no conflicting row or contradicting plain count; a bounded TAG-prefixed <type> PUMP CONTROL PANEL title plus an agreeing plain count is also green; title-only, repeated title blocks and count-only inference stay orange; four motors alone never implies Quadraplex. DERIVED_REV 8 re-derives cached records without changing snapshot schema 1, manufacturer/material parsing, search/badge semantics, auth/cache, release-update or Worker v2.5.97. No cache wipe or Worker redeploy.

Previous release note: v2.5.106 is a browser-only System Type parser repair. It filters RTF metadata and reads only validated DXF TEXT group-code 1 payloads for System Type; raw descriptions and adjacent manufacturer/material parsing remain unchanged. Blank/unreadable counts and unrelated cell noise no longer conflict with a complete explicit type row; contradictory plain counts, recognizable combinations, ambiguous rows, and uncertain row associations remain orange/abstain. Title-only matches remain orange unless a bounded matching plain count independently corroborates the primary panel title. DERIVED_REV 7 re-derives cached records without changing snapshot schema 1, search/badge semantics, auth/cache, release-update or Worker v2.5.97. No cache wipe or Worker redeploy.

SYSTEM TYPE DIAGNOSTIC (v2.5.105 API; parser v2.5.109):

- When to run: after login, once the sync/refresh has finished (Search is enabled). Open the browser DevTools console on the app page. Nothing runs automatically; the report only exists while you call it.
- Commands:
    SystemTypeAudit.text()                      // bounded plain-text summary of all loaded records (window.LOCAL_DB)
    copy(SystemTypeAudit.text())                // Chrome/Edge/Firefox console helper: copies the summary to the clipboard
    SystemTypeAudit.text({ snippets: true })    // adds the top recurring failure patterns as short sanitized snippets
    SystemTypeAudit.text({ scope: 'results' })  // only the current search results
    SystemTypeAudit.report()                    // same data as a structured object (expand it in the console)
    SystemTypeAudit.inspect('CP-8270')          // one record: bounded evidence, derived sys/sysV and why each type matched or failed
  Options: samples (sample IDs per bucket, default 5, max 20), patterns (default 30, max 50), snippets (default false).
- What it means:
    States: green = clear explicit Panel/System Type row (green badge); orange = matched but uncertain (orange badge); absent = no System Type at all (never returned for any of the four values); conflicting = explicit rows or panel phrases disagree, or an ambiguous "X or Y" row was not resolved.
    Sources: explicitRow, titlePhrase (panel title/narrative phrase), countInference (No. Motors/Pumps), conflict, unknown.
    Type table: per type total/green/orange, how many came from row/title/count, the badge actually drawn by UI._generateBadges (rendered g/o/missing), how often the type was a conflict candidate, mentionedButUnclassified (the word appears but the record has no type) and lostToOtherType.
    Orange causes: title-narrative-only, title-equipment-phrase, count-inference, row-count-disagreement (an associated count contradicts the explicit row or is a recognizable combination such as 2+2 / 2+Ex), row-reverse-cell, row-gap-association (wiring/terminal gap), row-uncertain-association, row-plus-ambiguous-row. Blank cells and unrelated non-count text are unavailable evidence, not count disagreements.
    Absent reasons: no-description, panel-type-label-unreadable, panel-type-value-unrecognized, count-cell-incomplete, count-cell-non-count-text, count-not-plain, count-disagreement, four-count-without-row-or-title, type-word-without-accepted-evidence, pump-count-or-label-without-value, no-system-type-evidence (likely legitimately untyped).
    Stale: notDerived/storedMismatch should be 0 after a completed sync; non-zero means the stored _sys/_sysV differ from the current parser. Badge mismatches should be 0; non-zero means the UI badge does not follow parser confidence (propagation bug) rather than the parser being uncertain.
    Keywords in orange/absent/conflicting: which labels and type words appear in failing records (labels only, no free text).
- Safety: read-only and local. No network requests, no storage/persistence, no record mutation, no automatic execution on startup or search. Output never contains pdfUrl, credentials, full descriptions or JSON dumps; snippets are opt-in, at most 60 characters, upper-cased, with URLs/e-mail addresses removed and 3+ digit numbers masked as #. Records are counted once per unique ID; overlaps are reported separately.
- After publication: rerun `SystemTypeAudit.text({ snippets: true })` against the normally loaded local dataset without purging cache. Treat snippets as sanitized hints, not complete descriptions or ground truth; verify classifications against actual source documents before making accuracy claims.
- Card hover: result cards regain a subtle outline thickening on hover through a 1px inset ring (box-shadow), so card size/layout and the top-of-list clearance are unchanged. The approved selected-card purple glow is unchanged and both coexist on a hovered selected card. No-PDF cards keep their neutral disabled styling; reduced motion keeps the ring without the lift/transition.
- Regression commands: node tests/system-type-adjacent.test.js; node tests/system-type-repair.test.js; node tests/system-type-audit.test.js; node tests/parser-repair.test.js; node tests/system-type-mfg-ranking.test.js; node tests/enclosure-material-mfg-coverage.test.js; node tests/data-loader-refresh.test.js; node tests/ui-housekeeping-static.test.js; REQUIRE_BROWSER=1 node tests/ui-housekeeping.browser.test.js; REQUIRE_BROWSER=1 node tests/release-update.browser.test.js; REQUIRE_BROWSER=1 node tests/release-snapshot.browser.test.js; node worker/tests/run.js.

Previous release note: v2.5.104 repairs browser-only System Type evidence and makes the selected result card more visible. Worker v2.5.97, API fields, auth, search scoring, PDF selection and snapshot schema 1 remain unchanged. No Worker redeploy or cache reset is required.

SYSTEM TYPE ADJACENT-TOKEN RULES (v2.5.107):

- Rule 1: Panel Type / System Type / Type of Panel read the first token(s) after the label (separators : = | - skipped) when they form SIMPLEX/DUPLEX/TRIPLEX/QUADRAPLEX/QUADRUPLEX/QUADPLEX or an N PUMP(S) form; otherwise the token(s) immediately before the label. Later/earlier BOM, wiring and checklist tokens are ignored. Disagreeing forward/reverse values abstain (conflict). Only the immediately preceding NOT/NON/NO negates a reverse value; device nouns right after a forward value (DUPLEX RECEPTACLE/OUTLET/ALTERNATOR/ALTERNATING RELAY) or reference words (FOR OTHER PANEL) make the cell unreadable. QUAD/DUP stay complete-cell only.
- Rule 2: No. Motors / Number of Pumps read a plain leading 1-4 unless the next token is + / - . & or a digit; the reverse "<n> No. Motors" is tried when the forward token is not a count. Blank/non-count cells are unavailable evidence, never a disagreement.
- Rule 3: green = explicit row (forward or reverse adjacent) with no conflicting row and no contradicting plain count; orange = row plus contradicting/combination count, title-only, repeated title block, or count-only inference. A bounded <type> PUMP|BLOWER|GRINDER|LIFT STATION CONTROL PANEL title plus an agreeing plain count is green.
- Rule 4: a TAG label no longer blocks a bounded <type> PUMP CONTROL PANEL title; a title-block repetition (exactly one <TYPE> PUMP repeated 2+ times plus repeated CONTROL PANEL) is orange title evidence. TAG/NOTES/BOM context now covers only its bounded 120-character neighborhood. Hardware, part-number and other-panel references remain rejected.
- Fixtures: tests/fixtures/system-type-adjacent.js holds the verbatim CP-8025 (Duplex) and CP-8374 (Simplex) descriptions; node tests/system-type-adjacent.test.js covers positives, negatives, metamorphic noise/layout swaps and 8k-record timing. Synthetic fixtures do not establish live accuracy; rerun SystemTypeAudit.text({ snippets: true }) after publication.

SYSTEM TYPE POLICY (v2.5.106):

- Precedence is bounded explicit row, then validated panel-title/narrative phrase, then trustworthy count inference. Conflicting explicit rows abstain; ambiguous choices cannot be resolved outside their candidate set. Clear rows are never overridden by weaker title/count evidence. A title stays orange unless one nearby plain count agrees and no excluded notes/BOM/TAG context intervenes.
- Complete forward/reverse cells accept canonical Simplex/Duplex/Triplex/Quadraplex, Quadplex/Quadruplex aliases, bounded QUAD/DUP and numeric/word pump phrases. Wiring/terminal gaps require bounded validated association and stay orange. TAG/notes/BOM, hardware terms, type-prefixed part numbers and truncated/incomplete cells cannot create verified-green types.
- Specific configuration/type-of-panel and pump-count label variants are supported; bare CONFIGURATION requires an info-table cluster. Title/narrative evidence requires a panel phrase and remains orange, never a whole-description type-word match.
- Blank or non-count text in a motor-count cell does not downgrade an otherwise complete explicit row. A disagreeing plain count or recognizable numeric combination (including 2+2 and 2+Ex) remains uncertain; combinations are never summed. Plain counts can infer only Simplex/Duplex/Triplex; a four-motor count alone never implies Quadraplex. The narrow H A / FLASHER exception is preserved.
- System-Type-only normalization recognizes RTF visible text while excluding font/color/style/metadata destinations, and validated DXF TEXT group-code 1 payloads while ignoring coordinates and other entities. DXF layer changes are hard boundaries; BOM/notes/tag/hardware layers are rejected. Unknown/malformed layouts abstain. The original description remains unchanged and is still used for manufacturer/material derivation.
- _sysEvidence records source/candidates/direction/confidence/reasons; _sys/_sysV continue to drive the unchanged search/sort/badges. DERIVED_REV 7 re-derives existing snapshots once per record in 250-record yielding batches; all derived fields remain non-enumerable and raw JSON/cache generations remain unchanged.
- Active PDF-enabled cards gain a 2px purple ring, compact glow and theme-aware tint, retained on hover. Scroll-content clearance protects the glow; reduced motion disables card transitions/hover movement. No-PDF cards retain disabled styling and selection JS is unchanged.
- Regression commands: node tests/system-type-repair.test.js; node tests/system-type-audit.test.js; node tests/parser-repair.test.js; node tests/system-type-mfg-ranking.test.js; node tests/enclosure-material-mfg-coverage.test.js; node tests/data-loader-refresh.test.js; node tests/ui-housekeeping-static.test.js; REQUIRE_BROWSER=1 node tests/ui-housekeeping.browser.test.js; REQUIRE_BROWSER=1 node tests/release-update.browser.test.js; REQUIRE_BROWSER=1 node tests/release-snapshot.browser.test.js; node worker/tests/run.js.
- Synthetic RTF/DXF and text fixtures exercise supported encodings and confidence rules, not actual CAD serialization or live accuracy rates. The supplied report snippets did not provide complete raw descriptions, so unseen entity encodings and the reported missing-label patterns remain unverified. Confirm accepted/rejected samples against actual source documents after publication; do not infer accuracy or target coverage from type-word counts.

Previous release note: v2.5.103 makes returning browsers reach the new release and a terminal data state after every deployment, including rapid back-to-back deployments. Frontend-only; Worker files remain byte-identical to v2.5.97. Snapshot schema 1, DERIVED_REV, encrypted generations/atomic commit/fallback recovery, release-freshness marking, profiles/theme/credentials and live search/results/PDF state are unchanged. No backend redeployment and no cache reset are required.

ROOT CAUSE (v2.5.103): "returning browser stuck on WAITING FOR UPDATE; private window works"

- What survives between versions is IndexedDB, and the sync lock lives there (__cox_db_sync_lock). Logout clears localStorage (including cox_db_complete) but not IndexedDB, so the next login runs a blocking sync and competes for that lock. A private window/cleared cache has no lock, which is why it always worked.
- The old lock was honored for ten minutes after its last heartbeat (SYNC_LOCK_TTL_MS, and claimLock trusted the TTL stored in the record). Nothing released it on pagehide/beforeunload or before ReleaseUpdate's location.replace, so a tab that closed, was reloaded or was navigated to a new release mid-sync left a lock every later tab respected; locks carried no app version, so a previous release's lock blocked the new build too.
- Worse, a takeover dead-ended: waitForPeerSyncAndRestore took over an expired lock (setting _inFlightSync) and returned shouldSync, but fetchPartition then called acquireSyncLock again, which returns false while _inFlightSync is set, so the tab reported its own lock as a peer and waited on itself for the full 120 s wait, then showed SYNC INTERRUPTED while its heartbeat kept the lock alive indefinitely (blocking every other tab and the next deployment). Reproduced against the v2.5.102 DataLoader: fetchPartition -> skipped (dead lock), wait -> shouldSync (owner=self), fetchPartition -> skipped again, wait -> lock-wait-timeout with the heartbeat timer still running.
- Waiting states also never restored the Search handler: showWaitingForUpdate cleared btn.onclick (which removes the inline onclick="SearchEngine.perform()"), so even a successful peer restore left a SEARCH button that did nothing. The 180 s startup watchdog only relabeled the disabled button "RETRYING SYNC...".
- Deploy-window mixed releases: if release-update.js is refused (host HTML fallback, text/html MIME) the global ReleaseUpdate is undefined, and the startup call threw inside the init try block ("System failed to initialize" alert, no preload) while manual login rejected silently. app.js?v=2.5.101 serving v2.5.100 code was already rejected by the v2.5.102 warm check, but nothing compared the executing APP_VERSION with the loaded HTML.

CURRENT FRONTEND UPDATE POLICY (v2.5.103):

- Sync locks record token, owner tab id, appVersion, at and heartbeatAt. The owner renews every 5 s and on every fetched page. A lock is taken over when it has no heartbeat for 30 s (or a far-future heartbeat), was written by another frontend release (including pre-v2.5.103 locks without appVersion; stored ttlMs is ignored) or is missing. A lock won while waiting for a peer is reused by fetchPartition. Locks are released on pagehide/beforeunload (best effort; bfcache restores renew or detect takeover) and, via ReleaseUpdate.beforeNavigate (bounded to 1 s), before any release navigation. The release check still runs before preload, so a tab never navigates while starting its own sync.
- Peer waiting is bounded to 60 s; on timeout the tab force-claims the lock and runs its own single-flight sync (an unchanged existing complete snapshot is used whenever cox_db_complete is set). Preload sync rounds are capped at 6. The startup watchdog (180 s, then every 30 s until preload settles) turns any still-disabled waiting label into the enabled SYNC INTERRUPTED retry; a sync that completes later still restores Search. Every recovered Search button is re-wired to SearchEngine.perform().
- Mixed HTML/app.js handshake (release-update.js): the document's meta app-version is compared with the executing APP_VERSION. A newer deployed release navigates as before; stale entry HTML around the deployed app.js, or newer HTML around an older app.js when the entry cannot be revalidated, triggers one guarded reload with ?cox_release= after re-downloading (cache:'reload') and validating every versioned asset (same-origin path, JS/CSS MIME, no HTML fallback, app.js declaring the target version). The existing per-tab ten-minute guard prevents a second attempt: if HTML and JS still disagree the loaded app simply continues. Never downgrades.
- app.js tolerates a missing/failed release checker (AuthService.releaseCheck) and a release navigation that never unloads the page (preload/reload fallback after 10 s).

CLOUDFLARE HOSTING CHECKS (documentation only; this repo has no frontend hosting config):

- The repository cannot determine the static host: wrangler.toml only routes api.coxpanelfinder.app/* to the API Worker and there is no Pages/static-assets config, 404.html or service worker. _headers is the Cloudflare Pages / Workers static-assets header format. The dashboard "Cache: Enabled/Disabled" toggle under build settings is most likely the Build cache (dependency cache for builds), which does not affect served HTTP caching; verify which setting it is.
- Verify _headers is effective: curl -sI https://coxpanelfinder.app/ , /index.html, /app.js?v=2.5.103, /style.css?v=2.5.103 and confirm "cache-control: no-cache" plus the expected content-type (text/html, application/javascript, text/css).
- Missing assets must return 404, not index.html: curl -sI https://coxpanelfinder.app/does-not-exist.js should be 404 with no text/html body of the app. Cloudflare Pages treats a project without a top-level 404.html as a single-page application and serves index.html for unmatched paths (the release-update.js text/html symptom); Workers static assets do so when not_found_handling = "single-page-application". Use "none"/"404-page" (Workers) or publish a top-level 404.html (Pages) if SPA fallback is enabled.
- Query strings in the cache key: in the zone's Caching > Configuration, Caching Level must be Standard (not "Ignore Query String"), and no Cache Rule should drop the query string from the cache key. Check that /app.js?v=2.5.103 and /app.js?v=2.5.102 are cached separately (cf-cache-status / body APP_VERSION).
- Purge on deploy: after each production deployment, purge (or "Purge Everything") at least /, /index.html and the versioned *.js/*.css URLs so the edge cannot keep a previous HTML. Publish every asset from the same commit in one deployment; release-update.js must be deployed with index.html.

MANUAL ACCEPTANCE CHECKS (pending; not performed here):

- Returning browser with old-version state: log in on v2.5.102 (or older), leave a tab mid-sync or close it, deploy v2.5.103, log in again without clearing cache: the app updates on that login (cox_release=v2.5.103 once), shows at most a brief WAITING FOR UPDATE (<= 30 s for a dead lock, <= 60 s for a live peer) and ends at SEARCH with the synced count.
- Two tabs open across a deployment: the old tab's lock is taken over by the new tab; no endless waiting in either tab.
- Rapid deployments (v2.5.103 then v2.5.104 within minutes): the second deployment is picked up on next login; a mixed HTML/JS window produces at most one extra reload and never a loop.
- Deploy window with a missing asset: app keeps working with the installed version; console shows the [ReleaseUpdate] unavailable warning, no alert.

v2.5.102 HISTORY:

Release note: v2.5.102 makes deployed-release revalidation redirect-safe and stabilizes the waiting indicator. Frontend-only; Worker files remain byte-identical to v2.5.97, and search/parser/data sync/cache behavior is unchanged. No backend redeployment or cache reset is required.

FRONTEND UPDATE POLICY (v2.5.102; lock/handshake behavior superseded by v2.5.103 above):

- Root cause of the v2.5.101 "Entry revalidation unavailable" warning and (index) net::ERR_FAILED: the checker fetched index.html with redirect:'error', and hosts that canonicalize /index.html to / turned that ordinary redirect into a fetch failure.
- The checker now revalidates the entry document path the app was actually loaded from (query/hash removed) and follows redirects only while the final URL stays same-origin; an off-site redirect is rejected and the installed app keeps running. Asset URLs and version metadata are resolved against the final entry URL.
- Before navigating, each versioned first-party JS/CSS asset must load from its same-origin path (same-origin redirects allowed, but not to a different path), return OK with a JS/CSS Content-Type when one is sent, have a non-empty body and must not be an HTML fallback page; the warmed app.js must declare the deployed APP_VERSION, so a CDN that ignores ?v= and returns the previous app.js cannot trigger a navigation that re-runs old code. Any failure keeps the working page and data; the per-tab ten-minute guard still prevents reload loops.
- While another tab holds the sync lock, the search button shows a stable "WAITING FOR UPDATE..." label instead of a percentage that restarted on every peer-cache poll; it ends with the restored/synced state or the existing SYNC INTERRUPTED retry state. The search button ellipsizes long status labels rather than clipping them.

v2.5.101 HISTORY:

Release note: v2.5.101 fixes first-card hover clipping, removes three obsolete hamburger commands, and adds deployment-aware login updates. Worker files remain byte-identical to v2.5.97; MAIN behavior, authentication, wrangler, parser/DERIVED_REV 5, and PDF/OCR paths are unchanged. No backend redeployment is needed. No cache reset is required.

FRONTEND UPDATE POLICY (v2.5.101; entry fetch superseded by the redirect-safe v2.5.102 checker above):

- Root cause: the first card started exactly at the overflow-y:auto clipping edge, and translateY(-1px) lifted its top border outside it. A 4px top/side inset inside the scroll content preserves hover, purple borders/active ring, disabled no-PDF styling, pagination and mobile collapse.
- Hamburger menu retains Submittal Generator/status, Switch Theme, Logout and version. Harvest CSV, Clear PDF Cache and Force Reset are removed; generator Export Config/Profile tools and search reset remain. Internal PDF eviction and sync recovery helpers remain available to the app.
- Manual login and saved-credential startup revalidate index.html once with a five-second timeout and cache:no-store, without sending Worker credentials. Entry meta app-version and first-party JS/CSS cachebusters must match APP_VERSION (covered by tests). Before navigating to a newer release, only its six first-party JS/CSS assets are downloaded into the HTTP cache within the same bounded check; missing/failed assets leave the working page in place. A newer release navigates to the same entry with a release query, loading versioned assets. Older/malformed/missing metadata and offline checks retain installed app/data. A per-tab, per-release ten-minute navigation guard prevents immediate reload loops and allows retry on a later login/startup; there is no continuous polling.
- cox_version records the installed frontend, NOT successful dataset refresh. A compatible complete snapshot remains usable immediately. An older/missing cox_data_release_version bypasses the one-hour freshness gate and queues the existing jittered, locked, single-flight refresh with existing retry/backoff/cooldown handling. Only full successful fetch/encrypt/atomic generation commit/apply marks release data fresh. Each generation's manifest has optional releaseVersion metadata, so fallback recovery correctly restores its own release freshness; schema 1 remains unchanged. Failed network/auth/quota/interrupted refresh keeps the previous complete snapshot and a pending update for a later startup/login. No profile/theme/credential purge is introduced; existing Logout behavior is unchanged.
- This re-fetches the dataset through the existing Worker contract, not directly from Airtable. Worker MAIN edge TTL may serve unchanged cached pages after a UI deployment. Frontend release freshness is not a guarantee of immediate live Airtable freshness; Worker TTL/cache keys are deliberately unchanged.

FRONTEND PUBLICATION REQUIREMENTS (not deployed by this PR):

- This checkout contains no frontend hosting workflow/provider configuration or service worker. Vercel was removed previously; wrangler.toml configures only the API Worker. Verify the actual static host in deployment operations, rather than assuming a provider.
- Publish index.html and all referenced versioned frontend assets together. Publish _headers if the static host supports that format (for example Cloudflare Pages/Netlify); otherwise configure equivalent HTTP Cache-Control:no-cache for /, /index.html, first-party *.js and *.css in the actual host/CDN. _headers is a header rules file, not proof that this unspecified host consumes it. Check live response headers, purge/revalidate any previously cached entry HTML once, and verify that the CDN includes asset query strings in its cache key. Do not apply these rules to the API Worker or change its TTL.
- Previously deployed old JS cannot execute this new release check. The one-time entry/CDN revalidation/header publication is necessary to deliver the new checker to those clients; an already-open old tab needs its next entry navigation. Do not promise automatic retroactive checks in old running code.
- Pending manual/hosting acceptance: confirm live no-cache response headers and versioned assets, login from a browser with a pre-v2.5.101 HTTP/data cache, offline fallback and later successful login, physical phone/tablet rotation, generator minimize/restore and PDF use. No merge, deployment or production verification is performed here.
- Automated verification: UI housekeeping browser 951 assertions and static 49 checks; release-update browser 24 checks plus actual entry navigation/saved-credential startup and asset/header consistency; release-snapshot browser 10 encrypted IndexedDB generation/recovery checks; expanded data-loader-refresh tests. Adjacent keyword, enclosure/material, System Type/manufacturer, HP/voltage, PDF, mobile-scroll and Worker-routing tests and run-hp-boundary-tests.js pass except the unchanged legacy enclosure-parsing Test 18. worker/tests/run.js passes 85/85. Live-credential worker.integration.test.js was not run. Secret scan and CodeQL are clean; an independent read-only review found no significant issues after the automated review runner reported a model-availability error.

Historical v2.5.100 notes and acceptance checks follow unchanged:

The purpose of this script is to allow pristine program functionality while providing the maximum level of security to the sensitive data handling. We aim to use the worker to fully process and output results to the user. We will reference our main airtable base which is listed in the code to pull raw data in through a filter comprised of our robust regex search logic first then onto our Naive Bayes AI filter. This AI model will be trained from a separate database instantly and apply said training to clean up the results pulled from the main DB. They will then pass through our final filter, the healer which is pulling from another independent airtable DB populated with manual user feedback. The healer will be the final check for results before passing to the user, any results that have been manually verified enough times to meet the confidence threshold will be overridden in the last step of processing before the final set of results are delivered to the user.

RECENT UPDATES (v2.5.100):

- Submittal Generator cutoff policy: unavailable ONLY on small phones, defined as a short side <= 430 CSS px while the app is in its < 768 px mobile layout (media query '(max-width: 430px), (max-width: 767px) and (max-height: 430px)'). 430 is the short-side cutoff PdfViewer._setScaleForDevice already uses for small-mobile zoom; its extra 'width <= 600' cap is NOT reused, so narrow phone landscape (667x375, 740x360, up to 767x430) stays excluded instead of being enabled by accident. Portrait phones 320-430 px wide are excluded. Larger phones, tablets and narrow windows 431-767 px wide with a short side above 430 (600x960, 700x1000, 744x1133, 767x1024) now get the generator. Widths >= 768 keep the unchanged docked 3-column layout, including landscape phones that are already that wide (844x390, 932x430), as before
- One shared predicate: DemoManager.SMALL_DEVICE_MEDIA_QUERY is evaluated with matchMedia (geometry fallback when unavailable) and the identical media query in style.css hides the menu entry, panel, restore button, rail and context block, so menu, toggle handler and CSS cannot disagree. UI.isSmallMobile() (< 768) and the general search/results/gesture layout are unchanged
- Eligible 431-767 px viewports use the compact floating Control Panel (existing minimized/restore path, width min(295px, 100vw - 24px), height capped to the viewport, scrollable controls) with a new header minimize button; the CUSTOM PDF INFO context block sits below Results and shrinks/scrolls on short viewports while at least 30% of the column stays for the PDF (collapse Results for more room). DemoManager.isPanelMinimized keeps the minimized/expanded preference across docked/compact/excluded modes. Resizing/rotating into small-phone mode hides every generator surface and leaves a read-only redacted preview (no editing, no page toolbars) without touching zones, context fields, profiles or generator state; returning to an eligible size restores the same state with no phantom rail/restore buttons. PDF print/download, Auto-Scan, profiles, redaction and preview/export are unchanged
- Light-mode result cards: the later 'body:not(.dark-mode) .record-card' (and :hover) rules set border-color to --shell-divider-strong, which also overwrote the 4px purple left accent, the active-view purple border and the no-PDF gray accent. They now use --app-primary, so normal and hover cards keep a 1px purple outline and 4px purple accent (widths, radius, shadows, spacing and badges unchanged). Precedence: normal/hover = purple; active-view = purple + 1px inset ring + existing tint; no-PDF (disabled) = neutral divider outline + gray #9ca3af accent, opacity and not-allowed cursor (the global cursor: pointer !important no longer overrides it) with no hover lift. Dark mode is unchanged
- Result count root cause: #results-header is display:none until body.results-ready, and results-ready was only toggled by UI.syncMobileLayout(). On mobile handleSearchCompletion() called it, but the desktop/tablet (>= 768) branch only collapsed/expanded Search, so the first search rendered 'Found N records' into a hidden header until a resize ran handleViewportChange(). Completion now syncs the layout on every viewport, so the full total (not the page length) is visible immediately, including 'Found 0 records'. UI.render() keeps an explicit 0 total (Number.isFinite) instead of a falsy fallback. Pagination, refinement, reset, keyword contradiction (no state mutation), mobile Results collapse and background refresh keep the correct total; no resize/RAF/timeout hacks
- Executed: node tests/ui-housekeeping.browser.test.js (791 assertions, headless Chrome) and tests/ui-housekeeping-static.test.js (35), plus every existing tests/*.test.js (except the live-credential worker.integration.test.js), tests/run-hp-boundary-tests.js and node worker/tests/run.js. All pass except the known baseline tests/enclosure-parsing.test.js Test 18 (Worker spec-table Stainless precedence vs 'Varied / Multiple' expectation), which is untouched because the Worker is out of scope. No manual device/visual checks on physical phones/tablets were run
- Known limit (pre-existing layout, unchanged): on a <= 430 px tall desktop-layout window (e.g. 844x390) a zero-result search keeps the full Search form expanded, so the rendered 'Found 0 records' header sits below the fold until Search is hidden
- Version surfaces: app.js APP_VERSION/VERSION_HISTORY, index.html title, style.css/info-table-parser.js/app.js cache-bust 2.5.100 (style.css is now cache-busted because generator/card CSS changed), README.txt, worker/API_DOCUMENTATION.md. Worker banner stays v2.5.97 (byte-identical). Snapshot schema 1, DERIVED_REV 5, material/System Type/manufacturer/keyword logic, ranking/scoring/pagination and PDF gesture state are unchanged
- New tests: tests/ui-housekeeping.browser.test.js drives the real index.html/app.js/style.css in headless Chrome (local server, network blocked; skips loudly without Chrome unless REQUIRE_BROWSER=1); tests/ui-housekeeping-static.test.js checks the shared query/fallback matrix, lifecycle wiring and version surfaces with plain Node

MANUAL ACCEPTANCE CHECKS (v2.5.100, pending; no merge/deployment performed):

- After frontend publication, confirm menu v2.5.100 and that style.css?v=2.5.100 loads without a cache reset
- Phones (e.g. 375/390/430 portrait, landscape below 768 wide): Submittal Generator absent from the menu. iPad mini portrait/large phones/narrow windows 431-767 px: menu item present, floating Control Panel opens/minimizes/restores, all controls reachable, Auto-Scan, zones, Preview, print/export work. >= 768: docked layout unchanged
- Rotate/resize an active generator between excluded and eligible sizes: panel/rail/restore/context hide and return with typed context and zones intact
- Light mode: result cards show purple outlines at rest and hover, selected card is distinguishable, no-PDF cards stay gray/dimmed with a not-allowed cursor; dark mode unchanged
- On desktop, tablet and mobile, the very first search shows 'Found N records' immediately (also 0, and >25 across pages) without resizing

PREVIOUS UPDATES (v2.5.99):

- Fiberglass, Stainless Steel, and Painted Steel share bounded association rules. Material-only line wrapping is normalized in both directions. Reverse cells can precede adjacent enclosure size/inner-panel/control-sensor labels as well as feature labels. Only recognized short wiring text or a numeric WAGO terminal/end-block cell after an otherwise unresolved material label permits reverse recovery; arbitrary prose, placeholders, hardware, and unsupported material values do not
- Forward wiring prefixes still fit within the original 40-character window; reverse reads remain capped at 120 characters and do not cross recognized labels. Forward wiring gaps, reverse recovery through nonblank wiring noise, and WAGO terminal/end-block gaps are uncertain (orange). Clear forward rows win over preceding text and legacy enc; conflicts stay uncertain and bare steel is never stainless. No whole-description painted-steel keyword fallback was added
- DERIVED_REV 5 is required because material association rules changed: normal snapshot restore/apply re-derives existing descriptions without altering raw records, snapshot schema 1, or persisted caches. Parser/app URLs are cache-busted to 2.5.99. System Type, manufacturer logic, feedback, dropdowns, sorting/count/pagination, live criteria/reset, and Worker behavior are unchanged
- tests/fixtures/enclosure-association.js contains synthetic record-like descriptions built around supplied excerpts, explicitly not complete live Airtable records. Tests exercise all three materials with reverse/split/wiring/BOM cells, unsupported/hardware exclusions, conflicts, System Type/manufacturer, voltage, allowed/blocked keywords, badges, pagination, and unchanged raw JSON. Run node tests/parser-repair.test.js; node tests/enclosure-material-mfg-coverage.test.js; node tests/data-loader-refresh.test.js; node tests/system-type-mfg-ranking.test.js; node tests/keyword-blocklist-mode.test.js; node worker/tests/run.js
- Pending manual acceptance after frontend publication: restore existing caches without reset; compare live CP-8328 and Painted Steel dropdown results against complete descriptions; verify criteria, page/count/sort, badges, feedback, and PDF state survive refresh. Repository tests do not establish deployed runtime accuracy or dataset-wide result counts

PREVIOUS UPDATES (v2.5.98):

- The exact supplied CP-8370/CP-8328 excerpts are separate fixtures in tests/fixtures/parser-repair.js; full Airtable descriptions were not available in this task. Before repair, Enclosure Material extracted 'PANEL HEATER / THERMOSTAT W = M2 23 = A' and 'PANEL HEATER / THERMOSTAT W = ETM 11 EL', respectively. Both became status=other and matched none of the three materials. After repair, candidates are FIBERGLASS and STAINLESS STEEL, respectively, and each excludes the opposite material/Painted Steel even with null, contradictory, or Varied / Multiple backend enc
- Forward values remain bounded to 40 characters. Reverse association reads at most 120 characters before a label, never across a recognized info-row boundary. A complete adjacent material cell is accepted; flattened wiring prefixes need neighboring rating/feature anchors, restricted identifiers, and only the observed AUTOMATIC MODE / ALL PUMPS OFF text. A preceding rating needs additional circuit/operating-mode evidence: '4X Fiberglass' alone is not a material cell. A clear forward value never unions materials from preceding rating/feature columns. Two complete material cells on either side of a label at the description start stay ambiguous. The one allowed gap is a numeric row/quantity + WAGO part number + (GROUND) TERMINAL immediately before the material label, as in CP-8328. That gap is an orange candidate, not verified spatial evidence. Unknown gaps, hardware suffixes, section/BOM prose, and distant materials are not borrowed
- Panel Heater / Thermostat W, Phase Monitor, Cycle Counters, Flasher, Temp Switch, Opti-Float Level Detector (including supplied 'Dectector'), inner panel, and Pole/Box/Seal labels bound adjacent cells. Hyphenated material/type formatting, dotted grade SS, and controlled material-only line wrapping are supported. Multiple readable material rows/alternatives stay orange
- A positively identified unsupported material (Polycarbonate, bare/carbon/mild Steel, Aluminum, etc.) still rejects all three choices; arbitrary wiring/BOM/feature text is unresolved, not proof of an unsupported material. Existing documented legacy fallback applies only to unresolved evidence. Narrative alone never creates a verified material row; null/Varied narrative-only candidates stay orange. Legacy supported enc codes retain the existing confidence policy; the backend provides no healer provenance
- System Type stays explicit-row primary. CP-8370 retains Duplex orange for '2 + Ex'; CP-8328 retains Duplex green for plain '2 H A' immediately before Flasher (the observed single-letter wire-column separator). Other count tails are rejected except plain PUMPS/MOTORS units. No combination sums/prefixes, negative counts, decimals, ranges, slash counts, aux/fan tails, TAG inference, or first-match winner among conflicting types. Pure reverse type cells are supported, not incidental descriptions/tags. Ambiguous explicit choices may only use an agreeing plain count as an orange candidate
- DERIVED_REV 4 re-derives old records during normal cache restore/apply. Raw enc/encV and JSON remain unchanged; evidence is non-enumerable. No snapshot schema bump, cache purge, or per-search parsing. Parser/app script URLs are both cache-busted to 2.5.98. Top-12/reserved-Sulzer ranking, dictionaries, material menu, feedback legacy 4XFG/4XSS/PAINTED STEEL payloads, live criteria/reset, results/pages/PDF refresh state remain unchanged
- Regression commands: node tests/parser-repair.test.js; node tests/enclosure-material-mfg-coverage.test.js; node tests/system-type-mfg-ranking.test.js; node tests/data-loader-refresh.test.js; node tests/keyword-blocklist-mode.test.js; node worker/tests/run.js. Synthetic interleaved 8k records check chunk yields, revision migration, and unchanged serialization; timing is not a production dataset accuracy claim. The user-estimated false-negative percentage is unmeasured
- Executed: new parser regressions (8k interleaved records about 100ms, 31 yields), material/SearchEngine/badge/feedback integration (21 passed), System Type/manufacturer/cache integration (22 passed), data-loader refresh, keyword/blocklist (17 passed), feedback lockout, enclosure varied/multiple (30 passed), sorting priority, matcher validation (16 passed), and worker/tests/run.js (85 passed). Legacy tests/enclosure-parsing.test.js has 22 passed / 1 failed: Test 18 expects Varied / Multiple for dual-material spec text but returns 4XSS; the untouched baseline reproduces the identical failure. Its Worker helper is byte-identical and is not changed in this browser-only PR

MANUAL ACCEPTANCE CHECKS (v2.5.98, pending; no merge/deployment performed):

- After separate frontend publication, restore an existing cache and confirm menu v2.5.98, ordinary sync, and no cache purge. Search the complete live CP-8370/CP-8328 records under each material and Duplex; compare the full descriptions with the excerpt assumptions
- On desktop/tablet/mobile, check filter/keyword selections survive sync/background refresh, reset clears both keyword lists, and current results/count/pages/PDF position are not disturbed. Confirm feedback still sends legacy enc values
- Flattened desc has no page/cell coordinates. Unsupported interleaving is intentionally unresolved; this repair cannot prove layout associations for arbitrary BOM arrangements or quantify dataset-wide accuracy

PREVIOUS UPDATES (v2.5.97):

- Manufacturer menu is Any plus at most 12 canonical choices, ordered by eligible bounded Pump Manufacturer row frequency (each record id counted once; ties alphabetical). Sulzer is guaranteed: if absent from the natural top 12, it reserves a slot among the highest 11 others; it has no fabricated frequency when no row occurrence exists
- With no eligible row evidence, fallback candidates are alphabetized; include Sulzer, then the first 11 other supported names. This fallback makes no frequency claim. A currently selected supported manufacturer outside the base list is kept as one temporary choice, so up to 13 manufacturer choices (plus Any) can appear until the selection changes
- Sulzer / Sulzer Pumps is canonical SULZER across bounded browser row normalization, Worker extraction, search, confidence badges, and feedback. Clean single backend extraction uses mfg=SULZER and mfgV=false; multiple recognized brands retain the existing varied/orange confidence behavior. ABS stays independent
- Browser evidence is re-derived with DERIVED_REV 3 on normal snapshot apply/restore; derived properties remain non-enumerable and are not persisted. Existing cached MAIN records are safe: until the separately deployed Worker and ordinary data/edge-cache refresh return mfg=SULZER, whole-token Sulzer description fallback can find them but shows orange, not a false verified-green badge. Existing backend/healed mfg values are never overwritten from row evidence
- v2.5.96 material-based Fiberglass / Stainless Steel / Painted Steel filtering, exclusions, feedback ordering/encodings, and POLY compatibility remain unchanged. System Type, reset/live-state, and background-refresh behavior are unchanged

MANUAL ACCEPTANCE CHECKS (v2.5.97, not automated):

- Deploy the Worker separately, publish the frontend, and confirm normal sync/edge-cache refresh; verify existing cached records remain available before refreshed Worker mfg fields arrive
- Search Sulzer: clean Worker mfg=SULZER results are green; mixed recognized manufacturers are orange; old cached description-only matches (SULZER, Sulzer Pumps, punctuation) are orange; NOTSULZER and SULZERISH do not match
- Confirm Any plus at most 12 base manufacturer choices, Sulzer remains present below the natural cutoff, ties are alphabetical, and an out-of-list selection survives refresh (the temporary selection can show 13 choices)
- Verify feedback offers all supported manufacturers, including canonical SULZER, and submits mfg=SULZER
- Automated Node tests and a synthetic 100-record Worker-helper comparison do not establish Cloudflare production CPU safety; verify deployed Worker runtime logs after the separate deployment. No Cloudflare deployment was performed for this PR

PREVIOUS UPDATES (v2.5.96):

- Enclosure search is material-based: Any / Fiberglass / Stainless Steel / Painted Steel (half-width cell beside System Type). NEMA rating plays no role, and a material never implies a rating
- Primary evidence is ONLY the bounded ENCLOSURE MATERIAL info-table value, read by the browser-only info-table-parser.js once per record (DERIVED_REV 2 re-derives v2.5.95 in-memory records). Neighboring enclosure rows (Enclosure NEMA Rating, Enclosure Size/Type, Inner Swing Panel, Inner Door, Control Sensor, Control Voltage, ...) are value boundaries, so blank cells never borrow a neighbor's value. Recognized values: FIBERGLASS / FIBER GLASS / FIBREGLASS / FRP; STAINLESS, (304) STAINLESS STEEL, 304/316(L) SS, SS, S/S; PAINTED (CARBON/MILD) STEEL. Bare STEEL, CARBON STEEL, POLYCARBONATE, etc. are none of the three
- Exclusion safeguard: when the material row names one material it controls the branch and excludes the other two, regardless of the backend r.enc or narrative mentions (stainless hardware, pumps, notes). Several materials across rows, or explicit alternatives in one cell (FIBERGLASS OR 304 SS), match each named material as uncertain (orange) and never become a clean winner
- Fallback policy when the row is missing or blank/placeholder (N/A, TBD, ...): legacy 4XFG -> Fiberglass and 4XSS -> Stainless Steel; clean only when the description has a supporting strong signal (4XFG/FIBERGLASS/FRP or 4XSS/STAINLESS), no opposite strong signal, and the backend encV is false — otherwise uncertain. 'PAINTED STEEL' (new feedback code) -> Painted Steel. Empty or 'Varied / Multiple' enc -> strong-signal candidates, always uncertain; bare SS / S/S never counts. POLY and other codes match no material and are never relabeled (still reachable via Any / keywords). No prefix parsing, no painted-steel guessing. The Worker's bare-4X -> 4XSS default therefore shows as an uncertain stainless result, never a clean one
- Search no longer offers POLY as an enclosure option (per the requested material menu); POLY records are not deleted or relabeled
- The backend r.enc / r.encV are no longer rewritten by the browser: the old full-description reclassification in SearchEngine.perform was removed, and material variance lives per search only. One shared matcher (InfoTableParser.matchEnclosureMaterial) drives filtering, uncertain-after-clean sorting, and badges, which show Fiberglass / Stainless Steel / Painted Steel (never 4X codes) only while the filter is active
- Manufacturer menu: Any, then the shortest descending-frequency list of canonical manufacturers whose Pump Manufacturer row counts reach 90% of all eligible record occurrences (each record id counted once; unknown/unsupported values excluded from the denominator), including the manufacturer that crosses 90%; ties alphabetical; no eight-item cap; integer arithmetic. Coverage applies only to usable supported row evidence. With no row evidence the previous list is used (no 90% claim). A selection outside the list is kept through refreshes. Feedback still lists every supported manufacturer
- Report Inaccuracy dropdowns mirror the search grid: System Type | Enclosure, Voltage | Phase, Manufacturer | Horsepower, then the Low Voltage / Control Only action, keyword rejections, Submit/Cancel. Labels are associated with their selects
- Enclosure corrections display Fiberglass / Stainless Steel / Painted Steel (plus Varied / Multiple) and submit enc = 4XFG / 4XSS / PAINTED STEEL. 4XFG/4XSS stay the payload encodings so new votes tally with previously stored corrections in the unchanged healer (which keys votes by exact value); PAINTED STEEL is new and unambiguous. POLY is no longer offered; previously stored POLY corrections still apply
- Fixed: rejected-keyword collection no longer picks up the selected Low Voltage button (it is scoped to the keyword cluster)
- Known limitations: MAIN does not expose correction provenance, so a healed enc value is indistinguishable from a parsed one and a clear material row still wins over it. System Type feedback remains stored-only (not applied by the Worker)

PREVIOUS MANUAL ACCEPTANCE CHECKS (v2.5.96, not automated):

- Search Enclosure = Fiberglass on a panel whose info table reads Enclosure Material: Fiberglass but mentions stainless hardware: green Fiberglass badge; the same panel is absent from Stainless Steel and Painted Steel searches
- Search Painted Steel: only row-verified painted panels (or panels corrected to Painted Steel by feedback) appear
- Confirm the manufacturer menu length looks sensible against real data and an out-of-list selection survives a background refresh
- Open Report Inaccuracy on desktop, tablet, and mobile: Tab order is System Type, Enclosure, Voltage, Phase, Manufacturer, Horsepower

PREVIOUS UPDATES (v2.5.95):

- Retry of the reverted PR #188 attempt: #188 added per-record info-table parsing to the Worker MAIN loop, which exceeded the Cloudflare Worker CPU time limit and stalled sync (reverted in #189). This release moves all new parsing into the browser
- New browser-only info-table-parser.js derives System Type and Pump Manufacturer evidence once per record from the existing `desc` field when a snapshot is applied (initial/resume sync, cache restore, background refresh), in chunks that yield to the main thread, with a [DeriveTiming] console log. Searches never re-parse descriptions
- Parameter grid (desktop/tablet/mobile, DOM order = visual order): System Type | Enclosure, Voltage | Phase, Manufacturer | Horsepower, Keywords + Allowed/Blocked toggle (full width), Panel Type (full width) above SHOW/HIDE, Search, and ↺
- System Type dropdown (Any/Simplex/Duplex/Triplex/Quadraplex) with an independent search branch. Evidence comes only from the bounded PANEL TYPE value (QUADPLEX/QUADRUPLEX → Quadraplex), cross-checked against a plain 1–4 NO. MOTORS value. Agreement is green; disagreement, combination counts (2+2, 2+1, 4+2), or a count-only inference is orange; combination-only or no evidence leaves the type blank. Free text such as TAG lines is never used
- Manufacturer dropdown lists the top eight canonical manufacturers by Pump Manufacturer row frequency (each record counted once, ties alphabetical), computed once per applied dataset; falls back to the previous list when no row evidence exists. Manufacturer matching (r.mfg) is unchanged, and an out-of-top-eight selection is kept through refreshes
- Report Inaccuracy adds a System Type correction using the existing payload/lockout pattern. The Worker healer already stores arbitrary correction params but does not apply `sys` in this release
- Old cached snapshots keep working: fields are re-derived on restore (stored as non-enumerable record fields, never persisted); no SNAPSHOT_SCHEMA_VERSION bump and no cache wipe

PREVIOUS MANUAL ACCEPTANCE CHECKS (v2.5.95):

- Initial sync and cache restore complete without Worker CPU-limit errors; the console shows [DeriveTiming] records=N ms=X once per applied dataset
- Search System Type = Duplex: a record with Panel Type Duplex and No. Motors 2 shows a green DUPLEX badge; mismatched or inferred records show orange and sort after clean matches; ↺ resets System Type to Any
- Select a manufacturer outside the top eight, trigger a background refresh, and confirm the selection and all other filters survive

PREVIOUS UPDATES (v2.5.94):

- Reset (↺) explicitly clears the keyword input and both Allowed/Blocked term lists, restores inactive blocklist mode and Allowed Terms guidance, and hides the contradiction warning
- Numeric filter selections survive option rebuilds during initial/resume sync, cache restore, snapshot apply/swap, and hourly stale-cache refresh; live keyword edits, both lists, mode, and Panel Type remain unchanged
- Background refresh leaves current results, count, pagination, badges, and PDF viewer state untouched; keyword state remains transient with no new localStorage persistence
- Reset restores filters to Any and Panel Type to Standard while preserving existing SHOW/HIDE behavior; Logout and Force Reset remain session boundaries
- Current release version surfaces aligned to v2.5.94; Worker/API behavior unchanged

PREVIOUS MANUAL ACCEPTANCE CHECKS (v2.5.94):

- Desktop/tablet/mobile: enter Allowed terms, switch to Blocked and enter overlapping terms, then press ↺. Verify empty input, inactive toggle (aria-pressed=false), normal input border, Allowed Terms placeholder, and empty/hidden warning. Switch modes repeatedly: both lists stay empty, and an empty-keyword search uses neither old list
- During INITIALIZING, resume sync, or a forced stale-cache refresh, select manufacturer/HP/voltage/phase/enclosure and Panel Type, edit both keyword lists, and leave blocklist mode active. Verify every value survives completion and subsequent mode switches, including edits made just before snapshot apply
- Background refresh with an active search/PDF: verify results, count, pagination, badges, and PDF/zoom/position remain unchanged
- Press ↺ with search controls collapsed: verify controls reopen, filter defaults and Standard Panel Type return, and existing results/count/pagination/badge behavior is unchanged
- Logout and Force Reset: verify the new page has no keyword lists and inactive blocklist mode
- Run node worker/tests/run.js: Worker regression tests pass

PREVIOUS UPDATES (v2.5.93):

- Mobile PDF viewer geometry gives wide zoomed stages a real scrollable left origin while keeping narrow layouts centered

PREVIOUS UPDATES (v2.5.92):

- PDF zoom/pan uses directional scroll-aware bounds and prevents stale viewport restores from overriding gestures

PREVIOUS UPDATES (v2.5.91):

- Mixed Allowed + Blocked keyword searches now use a single explicit dominance branch: eligible records stay visible only when total allowed-term occurrences exceed total blocked-term occurrences; ties and blocked-majority records stay hidden
- Allowed-only and blocked-only keyword searches retain their existing behaviors, contradiction validation remains unchanged, and empty/duplicate comma-separated entries are still normalized away before search
- Result counts and pagination now reflect the dominantly filtered set while maintaining the same responsive search/reset lifecycle on desktop, tablet, and mobile
- Version strings aligned to v2.5.91 across the viewer/client and Worker-facing version surfaces for release bookkeeping only; Worker/API behavior is unchanged

PREVIOUS MANUAL ACCEPTANCE CHECKS (v2.5.91):

- Desktop/tablet/mobile: Allowed Terms only still return the same inclusive matches as before
- Desktop/tablet/mobile: Blocked Terms only still hide any matching record
- Desktop/tablet/mobile: with Allowed=`duplex` and Blocked=`simplex`, `duplex duplex simplex` stays visible, while `duplex simplex` and `duplex simplex simplex` stay hidden
- Desktop/tablet/mobile: contradiction warning beside Keywords still blocks search when the same normalized term appears in both sets, and clears immediately after correction/reset
- Desktop/tablet/mobile: results count and pagination reflect only the records that survive the dominance branch

PREVIOUS UPDATES (v2.5.90):

- Keyword term editing now maintains two independent sets: Allowed Terms and Blocked Terms, with the existing toggle acting as the editor selector while preserving each set when switching modes
- Added explicit contradiction validation between allowed and blocked terms (case-insensitive) with immediate red warning text beside Keywords that names all duplicate terms and blocks search execution until resolved
- Search keyword pipeline now stays explicit and branch-isolated: allowed-term inclusion runs first, then blocked-term exclusion, while feedback/reject_keywords Worker payload behavior remains unchanged
- Empty/whitespace tokens and duplicates inside the same term set are normalized away, and keyword badges no longer present misleading inclusive chips when blocked terms are active in criteria
- Version strings aligned to v2.5.90 across the viewer/client and Worker-facing version surfaces for release bookkeeping only; Worker/API behavior is unchanged

PREVIOUS UPDATES (v2.5.89):

- Added a blocklist-mode toggle flush to the keyword input with an accessible circle-slash icon, `aria-pressed` semantics, purple inactive icon treatment, and red active treatment
- Keyword input guidance now switches exactly between "Allowed Terms - Use Comma To Separate" and "Blocked Terms - Use Comma To Separate", and active blocklist mode applies a red input border for immediate visual clarity
- Search keeps existing inclusive keyword behavior unchanged in normal mode, while blocklist mode reuses the same parsed/matched comma-separated keyword semantics and excludes any record matching any blocked term
- Blocklist mode is treated as transient search criteria (no localStorage persistence), resets with existing search reset/session boundaries, and does not change Worker/backend feedback/healer behavior
- Version strings aligned to v2.5.89 across the viewer/client and Worker-facing version surfaces for release bookkeeping only; Worker/API behavior is unchanged

PREVIOUS UPDATES (v2.5.88):

- Desktop/tablet header branding now keeps RESEARCH fixed to the Cox logo while SCHEMATICA ai continues immediately to its right on the same lower lockup row at matching scale
- The existing lock-icon PDF toolbar pill now reads "Lock Position", stays ahead of the zoom controls, and keeps the same persistence, purple active state, icon treatment, and underlying maintain-position behavior
- Mobile PDF toolbar sizing is tightened so Print/Save PDF, Lock Position, and zoom controls stay on one row without changing Worker/backend behavior
- Version strings aligned to v2.5.88 across the viewer/client and Worker-facing version surfaces for release bookkeeping only; Worker/API behavior is unchanged

PREVIOUS UPDATES (v2.5.87):

- Desktop/tablet header branding now uses a tighter Cox + SCHEMATICA ai lockup with the product name anchored at the lower-right of the logo treatment (single title only, no restored icy title chrome)
- "Maintain position between results" is now a lock-icon pill toggle beside Zoom +, matching Print/Save toolbar styling with purple active-state inversion while keeping localStorage persistence and maintain-position behavior unchanged
- Version strings aligned to v2.5.87 across the viewer/client and Worker-facing version surfaces, and Worker/backend behavior is unchanged

PREVIOUS UPDATES (v2.5.86):

- iOS Save PDF guidance is now nested under the Save PDF button as a tooltip on first tap, while a fast second tap proceeds immediately into the existing preview/share flow
- Tooltip guidance auto-dismisses, closes on outside taps, and resets per committed PDF so stale instructions cannot linger on the wrong document
- Version strings aligned to v2.5.86 across the viewer/client and Worker-facing version surfaces, and Worker/backend behavior is unchanged

PREVIOUS UPDATES (v2.5.85):

- Mobile replacement transitions now keep the PDF toolbar session-mounted after the first successful load so controls stay visible on small screens while actions remain disabled until commit
- iOS Safari Save PDF detection now handles iPhone/iPad Safari user agents more reliably and preserves Share → Save to Files guidance after action handoff
- Desktop header branding is simplified by placing a single SCHEMATICA ai label next to the Cox logo and removing the prior icy title chrome
- Version strings aligned to v2.5.85 across the viewer/client and Worker-facing version surfaces, and Worker/backend behavior is unchanged

PREVIOUS UPDATES (v2.5.84):

- Toolbar visibility is now session-persistent after the first successful PDF load, with Print/Save disabled during replacement/error states instead of unmounting the toolbar
- Added a localStorage-backed "Maintain position between results" toggle that restores an equivalent page/viewport/zoom only for the intended replacement document generation
- Replacement loads keep stale PDFs hidden behind the existing loading header until the new committed render is stable, and iOS Safari now uses a Save PDF label plus Share → Save to Files guidance
- Version strings aligned to v2.5.84 across the viewer/client and Worker-facing version surfaces, and Worker/backend behavior is unchanged

PREVIOUS UPDATES (v2.5.65):

- Hardened `DataLoader.preload()` so valid encrypted cache startup always restores the Search UI before any non-blocking stale-cache refresh work
- Reserved `cox_sync_attempts` for blocking full/resume sync only; cached startup and background refresh no longer mutate that key
- Handled blocking-sync failures now clear stale attempt poison instead of persisting immediate `SYNC INTERRUPTED` across reloads
- Background refresh errors are caught behind the existing lock/timestamp guard so stale-cache revalidation cannot blank the sidebar or strand the app disabled
- Force Reset/recovery continue clearing sync metadata without changing snapshot format, Worker routing, PDF rendering, or cache pagination/parsing

PREVIOUS UPDATES (v2.5.16 and earlier):

PREVIOUS UPDATES (v2.5.15):

Sorting Priority for Perfect Matches, Per-Parameter Feedback Lockout:
- Sorting: perfect (non-varied) matches now prioritized above varied results when weights are equal
- Varied flags only counted for actively filtered parameters (mfg/hp/volt/phase/enc)
- Feedback: removed thumbs-down button lockout to allow multiple per-parameter corrections
- Users can now submit HP correction, then separately submit Enclosure correction on same panel
- Each parameter (mfg/hp/volt/phase/enc/category) and keyword can be submitted once per panel per search
- Lockout resets on new search (existing behavior preserved)
- Version strings aligned to v2.5.15 across all files

PREVIOUS UPDATES (v2.5.14):

4XSS/4XFG Enclosure Fix, Feedback Date Recording:
- Fixed 4XSS enclosure parsing: fiberglass panels now correctly mapped to 4XFG (not 4XSS)
- 4XSS now requires explicit stainless/SS keywords; "NEMA 4X FIBERGLASS" properly detected as 4XFG
- Added Date field to all feedback submissions (thumbs-up and thumbs-down) in YYYY-MM-DD format
- Version strings aligned to v2.5.14 across all files

PREVIOUS UPDATES (v2.5.13):

Feedback Lockout, HP Badge, Enclosure Parsing Fixes:
- Fixed feedback lockout: thumbs up now properly tracked in lockout set to prevent duplicate submissions
- Fixed HP badge color: strict field matches show green badge (not orange) by prioritizing exact matches over worker variance
- Fixed enclosure parsing: 4XSS, 4XFG, POLY now extracted and searchable via worker extractSpecsStrict() function
- Enclosure search (e.g., "4XSS") now returns expected results with proper badge rendering
- Version strings aligned to v2.5.13 across all files

PREVIOUS UPDATES (v2.5.12):

Badge Filter Suppression & Vercel Cleanup:
- Fixed badge rendering to only show parameter badges when actively filtered (criteria not "Any")
- Manufacturer badges no longer appear when mfg filter is set to "Any"
- Keyword badges and NO PDF badge continue to display regardless of filter state
- Removed .vercel/ entry from .gitignore (Vercel platform no longer in use)
- Version strings aligned to v2.5.12 across all files

PREVIOUS UPDATES (v2.5.11):

Dual-Voltage Normalization:
- Fixed voltage parsing for split-phase dual-voltage entries (120/240, 277/480)
- These canonical pairs now normalize to the higher voltage value (240, 480) with green badge
- Prevents false "varied" (orange) badges on standard split-phase panel configurations
- Truly conflicting voltages (e.g., 240/480, 208/240) still marked as varied
- Improves search accuracy: 240V search now returns 120/240 panels with green voltage badges

PREVIOUS UPDATES (v2.5.10):

Varied Parameter Detection:
- Implemented detection of ambiguous/multiple parameter values across all fields (mfg, hp, volt, phase, enc)
- Worker now tracks varied flags (mfgV, hpV, voltV, phaseV, encV) when multiple distinct values found in description
- Orange badges displayed for any parameter with varied/uncertain values (similar to existing HP variance)
- Green badges reserved for strict, clean matches with single definitive value
- Improves transparency when panel data contains multiple or conflicting parameter values
- Helps users identify records that may require manual verification (e.g., CP-7688 with empty/varied table entries)
- Version strings aligned to v2.5.10 across all files

PREVIOUS UPDATES (v2.5.9):

HP Matching Boundary Fix:
- Fixed HP search boundary issue: searching "0.5 HP" no longer matches panels with "1.5 HP" or "10.5 HP"
- Added numeric boundary guards to HP pattern matching using negative lookbehind/lookahead
- Prevents substring matching while preserving mixed fraction support (7 1/2, 7½, etc.)
- Applied boundary guards to all HP patterns: standard, fractional, mixed-fraction, and table formats
- Version strings aligned to v2.5.9 across all files

PREVIOUS UPDATES (v2.5.8):

Feedback Modal Defaults & HP Mixed Fractions:
- Feedback modal dropdowns now default to empty/unselected option ("Select Correct...")
- Added support for HP mixed fractions: "7 1/2 HP", "7-1/2 HP", "7½ HP" now parse as 7.5 HP
- Enhanced HP extraction regex to handle space-separated and hyphen-separated mixed fractions
- Updated SearchEngine HP matching to recognize Unicode fraction characters (¼, ½, ¾)
- Prevents false 0.5 HP results when panels actually show 7 1/2 HP in tables
- Version strings aligned to v2.5.8 across all files

PREVIOUS UPDATES (v2.5.7):

Feedback Interaction Fix:
- Fixed thumbs down button onclick handler in UI.render to call FeedbackService.down with correct parameters (id, btn)
- Previously was passing extra criteria parameter causing feedback modal not to open
- Thumbs up button already working correctly with proper parameters
- Version strings aligned to v2.5.7 across all files

PREVIOUS UPDATES (v2.5.6):

Code Refactoring & Optimization (Client-side):
- Added DOM cache for frequently accessed elements to reduce repeated getElementById calls
- Centralized PDF UI state transitions with helper function for cleaner code
- Deduplicated PDF fallback fetch logic shared between loadById and preloadSearchResults
- Consolidated PDF validation helpers with consistent diagnostic context
- Extracted HP and keyword matching helpers in SearchEngine for better organization
- Isolated badge rendering logic in UI.render into internal helper function
- Reorganized large functions with clear section comments for readability
- Replaced magic strings with constants (PDF_STATUS, PDF_UI_STATE)
- No functional changes - purely code quality improvements

PREVIOUS UPDATES (v2.5.5):

PDF Load Fixes:
- Added robust fallback when PDF_BY_ID returns 404: tries direct pdfUrl via PDF proxy target
- Both interactive load and preload now attempt fallback before showing "PDF Link Not Found"
- Records marked as missing (pdfStatus = "missing") after all attempts fail to prevent repeated 404s
- Preload respects missing markers and skips flagged records

Worker Relaxed Lookup:
- PDF_BY_ID now includes relaxed REGEX_MATCH fallback after exact variations fail
- Handles revision suffixes: CP-4167r1, CP-4167-REV, CP-4167 A, etc.
- Uses filterByFormula with regex pattern anchored on clean ID
- Safe and limited fallback only when exact matches don't work

HP Variance Badge Restoration:
- Search logic now sets hpV flag for non-strict HP matches (regex/table/fractional)
- Badge rendering uses orange for varied HP matches (i.hpV === true)
- Strict field matches remain green as expected
- Fixes issue where all HP badges showed green regardless of match type

Version Alignment:
- All version strings bumped to v2.5.5 across app.js, index.html, worker.js, and documentation
- VERSION_HISTORY updated with concise v2.5.5 entry
- Worker requires manual deployment to Cloudflare

Previous Updates (v2.5.4):

Frontend Performance & UX Optimizations:
- Search results now limited to 25 cards per page (improved from 50) for better performance
- Implemented missing pagination methods (prevPage, nextPage, renderCurrentPage) for proper page navigation
- PDF preloading now skips records flagged as missing PDFs (pdfStatus === "missing" or empty pdfUrl)
- Reduced 404 noise in console by filtering out records without PDFs before attempting preload
- All version strings aligned across app.js, index.html, worker.js, and documentation

Worker Error Handling and Logging:
- Added comprehensive error handling in fetchPdfWithGuards and PDF_BY_ID methods to prevent unhandled rejections
- Detailed debug logs output for all PDF fetch operations, including specific errors and attempted variations
- Contextual error logging for each failure case to improve debugging capabilities

Null-URL and Output Validation:
- Early null checks and validation for pdfUrl before processing
- Additional validation for empty or malformed PDF URLs
- Clear error messages indicating the specific validation failure

Improved Input Guards:
- Enhanced fetchPdfWithGuards with early input validation
- Better feedback on host allowlist mismatches with specific details about allowed hosts
- Comprehensive logging for all PDF operations including success and failure cases

Cloud Worker Processing:
- All PDF fetches are protected with timeout and size limits
- SSRF protection via strict host allowlist validation
- Detailed logging throughout the request lifecycle for better observability