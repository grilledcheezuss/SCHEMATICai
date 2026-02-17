CLOUDFLARE WORKER SCRIPT (v2.5.16)

The purpose of this script is to allow pristine program functionality while providing the maximum level of security to the sensitive data handling. We aim to use the worker to fully process and output results to the user. We will reference our main airtable base which is listed in the code to pull raw data in through a filter comprised of our robust regex search logic first then onto our Naive Bayes AI filter. This AI model will be trained from a separate database instantly and apply said training to clean up the results pulled from the main DB. They will then pass through our final filter, the healer which is pulling from another independent airtable DB populated with manual user feedback. The healer will be the final check for results before passing to the user, any results that have been manually verified enough times to meet the confidence threshold will be overridden in the last step of processing before the final set of results are delivered to the user.

RECENT UPDATES (v2.5.16):

Professional-Grade Update with Feedback Lockout Restoration, Voltage Badge Fix, Page Classifier Enhancements, OCR Guards:
- Positive feedback lockout now enforced: one thumbs-up per panel per search (restored from v2.5.13 implementation)
- Per-parameter negative feedback lockout maintained: one correction per parameter per panel per search
- Per-keyword rejection lockout maintained: one rejection per searched keyword per panel
- Lockout resets on new search (SearchEngine.perform)
- Voltage badge strictness fix: green badges for strict field matches (volt field exact match), orange only for varied/fuzzy description matches
- Phase badge strictness fix: green badges for strict field matches, orange only for varied/fuzzy matches
- Enclosure badge strictness fix: green badges for strict field matches, orange only for varied/fuzzy matches
- Page toolbar cleanup: fixed profile label duplication issue, single clean dropdown per page
- OCR minimum size guard: filters out tiny boxes (width < 20px or height < 10px) to prevent tesseract "too small to scale" errors
- Smarter page classification: enhanced PageClassifier with page-number heuristics (page 1=Title, page 2=Info, pages 3-4=Power/Control schematics)
- Content-based signals preserved: title/info/schematic keywords, but now augmented with typical PDF ordering expectations
- Version strings aligned to v2.5.16 across all files

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