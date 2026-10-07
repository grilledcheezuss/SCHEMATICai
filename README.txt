CLOUDFLARE WORKER SCRIPT (frontend release v2.5.100; Worker remains v2.5.97)

Release note: v2.5.100 is browser-only UI housekeeping (Submittal Generator availability, light-mode result-card borders, first-search result count). Worker files remain byte-identical to v2.5.97; MAIN behavior, authentication, cache/network calls, wrangler, parser/DERIVED_REV 5, and PDF/OCR paths are unchanged. No backend redeployment is needed. Do not reset the browser cache.

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