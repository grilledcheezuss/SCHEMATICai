CLOUDFLARE WORKER SCRIPT (v2.5.95)

Release note: v2.5.95 changes Worker MAIN extraction/response fields and feedback healing as well as the frontend. Redeploy the Worker and publish the shared info-table-helper.js with the frontend; this is not a frontend-only release.

The purpose of this script is to allow pristine program functionality while providing the maximum level of security to the sensitive data handling. We aim to use the worker to fully process and output results to the user. We will reference our main airtable base which is listed in the code to pull raw data in through a filter comprised of our robust regex search logic first then onto our Naive Bayes AI filter. This AI model will be trained from a separate database instantly and apply said training to clean up the results pulled from the main DB. They will then pass through our final filter, the healer which is pulling from another independent airtable DB populated with manual user feedback. The healer will be the final check for results before passing to the user, any results that have been manually verified enough times to meet the confidence threshold will be overridden in the last step of processing before the final set of results are delivered to the user.

RECENT UPDATES (v2.5.95):

- Actual control/tab order on every viewport: System Type | Enclosure Type; Voltage | Phase; Manufacturer | Horsepower; full-width Keywords with existing Allowed/Blocked toggle; full-width Panel Type immediately above SHOW/HIDE, Search and reset
- System Type uses bounded Panel Type label/value evidence, with No. Motors cross-checks from the same bounded table block. Any does not alter existing search semantics. Quadplex/Quadruplex normalize to Quadraplex
- A complete plain integer No. Motors value 1..4 can infer System Type only when Panel Type is absent; inference is orange. Never sum combinations or read their first number: 2+2, 2 + 1, 4+2 and 1+1 are not single systems. Decimals, ranges, alternatives, negatives and incomplete values do not infer a type
- Explicit Panel Type survives a disagreeing or invalid motor count with orange uncertainty; missing count alone does not disqualify an explicit type. Conflicting explicit types have no single searchable type and retain uncertainty
- Numeric/operator continuations across blank lines cannot turn a combination into a plain count. Recognized wrapped alternative System Type/manufacturer values remain ambiguous rather than verifying/counting the first line
- Manufacturer ranking is separate from manufacturer search/healing: count bounded Pump Manufacturer rows once per unique panel/canonical supported manufacturer across the complete loaded dataset, then show Any plus up to eight entries by descending count (alphabetical ties). Known aliases map to existing canonical options; unknown/ambiguous/unparseable rows are excluded
- No usable ranking evidence means existing safe alphabetical options remain, with ranking unavailable. Partial syncs are not ranked. An out-of-top-eight live manufacturer selection remains as a temporary selected option. Feedback retains the full supported manufacturer list
- Legacy snapshots remain valid (schema unchanged): missing System Type fields are derived deterministically from description text without a cache wipe. Authoritative new fields and valid healer overrides take precedence. Ranking recomputes from loaded descriptions, never accumulates counts across restores/refreshes
- System Type corrections use the existing three-vote threshold and per-parameter lockout; a single valid threshold winner is verified, while conflicting threshold winners remain ambiguous (no single type, orange uncertainty). Invalid/combinations cannot heal a single system
- System Type and all existing live filters/Allowed and Blocked sets/mode survive cache apply, resume sync and background refresh. No automatic search or viewer state change is added. Reset clears terms and restores System Type/other filters to Any and Panel Type to Standard
- Airtable Items can be flattened text: bounded labels/rows and neighboring spec labels are evidence, not actual page isolation. No new Airtable requests, bulk PDF fetching, OCR or System Type ML guessing/training is added. Real Airtable extraction coverage and actual top-eight names/counts are not established by synthetic fixtures

DEPLOYMENT / MIGRATION (operator steps; not performed in this session):

- Publish index.html, app.js, style.css and info-table-helper.js together. Redeploy the Worker from this repository with its shared helper bundled (see worker/API_DOCUMENTATION.md)
- Worker MAIN uses a new payload revision in edge cache keys; old edge shapes cannot shadow additive sys/sysV fields. Existing authentication, fresh/stale cache lifetimes and coalescing are unchanged
- Do not Force Reset or purge valid v2.5.94 client snapshots for this release. Legacy records backfill on demand; the next normal complete refresh receives new Worker fields/healer corrections. Older clients ignore additive fields, and newer clients derive missing fields from older responses

MANUAL ACCEPTANCE CHECKS (v2.5.95):

- Desktop/tablet/mobile: confirm visual and keyboard order, readable unshortened enclosure options, no clipping, and reachable SHOW/HIDE/Search/reset controls
- Filter each System Type; confirm counts/pages and green explicit vs orange inferred/conflicting-count badges. Any must leave prior keyword/category/manufacturer/enclosure behavior unchanged
- During INITIALIZING/resume/background refresh, edit System Type, all other filters and both keyword sets/mode immediately before apply. Confirm live values persist, including a manufacturer outside the refreshed top eight
- With results and a zoomed PDF open, refresh: results, counts, page, badges and PDF zoom/position must stay unchanged until an explicit search
- Report a System Type correction and confirm per-parameter lockout; manufacturer feedback must still offer every supported option
- Compare bounded-row eligibility against representative real Airtable Items before claiming ranking coverage. No real data-derived ranking names or counts are asserted here

VALIDATION SCOPE (v2.5.95):

- Local Chromium manual checks at 375, 768 and 1280 px confirmed DOM order, paired/full-width geometry, associated search labels, no control overflow, and reset clearing both keyword sets plus System Type. Desktop/tablet collapse retained a visible action row
- Local screenshot-derived fixture search rendered clean explicit Duplex green and motor-only inferred Duplex orange, with correct count/pagination; fixture ranking merged Barnes/Crane without changing record manufacturer fields, and option rebuild preserved live criteria
- New frontend integration suite: 11 tests passed (node tests/frontend-v2.5.95.test.js)
- Worker validation: 59 existing assertions plus 102 bounded-parser cases passed, with Worker parity, MAIN response/healer/correction/cache-revision/default-import mocks and existing credential-routing mocks passing
- Synthetic parser, Worker mocks and frontend state tests cover extraction/parity, uncertainty, combinations, ranking and cache/live-criteria behavior. These are not live Airtable coverage or deployment tests
- Existing offline frontend regression run: 22 of 23 scripts passed, covering cache/refresh, keywords, feedback, sorting, voltage/HP/enclosure, page classification, mobile scrolling and PDF rendering/state/preload/print/zoom/scroll behavior
- Existing enclosure-parsing test 18 also fails on the unchanged baseline; this unrelated pre-existing expectation is not changed by this release
- Final read-only code review found no remaining significant issues after resolving wrapped-value ambiguity; secret scans passed. Earlier CodeQL runs reported zero alerts, but the final automated validation request was blocked by the service time limit, so a final automated pass is not claimed
- Real authenticated extraction/ranking coverage, production refresh, physical touch-device/PDF workflows and Worker deployment remain operator acceptance checks

PREVIOUS UPDATES (v2.5.94):

- Reset (↺) explicitly clears the keyword input and both Allowed/Blocked term lists, restores inactive blocklist mode and Allowed Terms guidance, and hides the contradiction warning
- Numeric filter selections survive option rebuilds during initial/resume sync, cache restore, snapshot apply/swap, and hourly stale-cache refresh; live keyword edits, both lists, mode, and Panel Type remain unchanged
- Background refresh leaves current results, count, pagination, badges, and PDF viewer state untouched; keyword state remains transient with no new localStorage persistence
- Reset restores filters to Any and Panel Type to Standard while preserving existing SHOW/HIDE behavior; Logout and Force Reset remain session boundaries
- Current release version surfaces aligned to v2.5.94; Worker/API behavior unchanged

MANUAL ACCEPTANCE CHECKS:

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