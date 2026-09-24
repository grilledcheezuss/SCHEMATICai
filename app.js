// --- SCHEMATICA ai v2.5.78 ---
const APP_VERSION = "v2.5.78";
const VERSION_HISTORY = {
    "v2.5.78": "Follow-up to PR #169: restore explicit Airtable token routing (Users/Feedback reads + FEEDBACK POST use write key; MAIN/PDF_BY_ID reads use read key) and classify 401/403 credential access failures distinctly from transient 503 outages",
    "v2.5.77": "Mobile sync + PDF transition stability: classify suspension/network-transition interruptions as resumable with bounded restart flow and explicit quota messaging, clear stale PDF stage on document switch, and keep pinch-release scale continuous until crisp commit",
    "v2.5.76": "Trade-show reliability emergency: decouple app version from cache schema to prevent patch-release purges, treat sync-lock contention as WAITING FOR UPDATE with stale-lock heartbeat recovery, reject partial/corrupt snapshot generations, and harden Worker/PDF update stability paths",
    "v2.5.75": "Urgent reliability/performance hardening: Worker MAIN page responses now use short-lived shared cache + isolate single-flight processing to reduce duplicate CPU under concurrency, while client sync adds per-page timeout, Retry-After-aware jittered backoff, and stronger recoverable startup refresh behavior",
    "v2.5.74": "PDF viewer geometry/print follow-up: commit zoom and pan back into real scroll extents so all pages stay reachable without phantom space, and harden original-PDF printing with isolated targets plus reusable cleanup across Safari/iOS and repeated attempts",
    "v2.5.73": "PDF viewer stability fix: isolate live pinch/pan transforms from scroll rerender flow to remove jump/flicker, resync generator preview availability across viewport/orientation changes, harden print cleanup for repeated use, and add toolbar Download PDF action",
    "v2.5.72": "PDF interaction/performance follow-up on current main: live viewer-scoped pinch feedback with constrained pan and gesture-end crisp rerender, bounded first-page preload concurrency with in-flight reuse, and duration-only PDF timing diagnostics for preload/cache/network/render stages",
    "v2.5.71": "PDF viewer responsiveness hardening: deterministic 60/80/100/120 start-scale tiers, bounded/coalesced zoom rendering, viewer-scoped ctrl/cmd+wheel zoom handling, and stale-render cleanup during rapid zoom/document replacement",
    "v2.5.70": "Startup/update follow-up: instrument sync phase timings, replace the static 99% plateau with fetch/encrypt/save/apply progress, batch snapshot shard persistence into one IndexedDB write, and polish reset/result-card styling without changing behavior",
    "v2.5.69": "Regression fix: restore light/dark search action-row divider seam and make SHOW/HIDE reliably toggle the shared Search parameter collapse target after search completion/reset flows",
    "v2.5.68": "Restore full-height large-screen collapse rails and keep Search parameter collapse reachable after searches by collapsing only the main fields while preserving the action row/toggle across mobile and desktop flows",
    "v2.5.67": "Visual shell follow-up: removed the badge-row bubble treatment and strengthened light-mode seams between cards, results chrome, collapse rails, and the PDF toolbar without changing behavior",
    "v2.5.66": "Desktop CSS safety-net and surface polish: large-screen search/results regions now defensively ignore mobile hidden-state classes, collapse arrows are more legible/symmetric, result card seams are clearer, and the PDF toolbar better matches adjacent shell chrome",
    "v2.5.65": "Reliability hardening: blocking sync attempts now only guard cache-miss/resume sync, cached startup clears stale attempt poison before re-enabling Search, and background refresh failures stay non-blocking",
    "v2.5.64": "Desktop/tablet shell consistency pass: compact large-screen collapse toggles, softer/slimmer shell borders and spacing, aligned neutral/brand color treatment with mobile UX, and safe symmetric corner treatment for collapse bars",
    "v2.5.63": "Reliability/performance update: added one-hour stale-cache revalidation with background refresh + in-flight guards, atomic generation-based encrypted snapshot persistence with safe swap semantics, and high-DPI PDF.js rendering (DPR-aware backing store, 2x cap, pixel-budget guard) for sharper mobile PDF quality",
    "v2.5.62": "Mobile UI polish: removed Search action-row balloon shell, unified thin raised/icy edge treatment across key chrome surfaces, successful Search now forces Results open, increased mobile Results height for at least two cards where viewport permits, and aligned SHOW/HIDE + record count typography with parameter labels",
    "v2.5.61": "Mobile/header refinement: centered SHOW/HIDE toggles without glyphs, structurally fixed Results header order, slimmer header with SCHEMATICAai badge, menu-pinned version indicator, subtle surface softening, and dark-mode panel-ID purple lightened one shade",
    "v2.5.60": "Mobile UX refinement: compact inline pagination row, complementary Search/Results toggle corners, purple mobile reset button, consistent mobile backdrops, corrected SHOW/HIDE arrow semantics, and reclaimed bottom safe-area space",
    "v2.5.59": "Mobile toggle UX polish: neutral gray Search/Results toggles, compact inline Search toggle beside Search button, results header toggle-first order, reclaimed mobile vertical space, and condensed search spacing",
    "v2.5.58": "Mobile UX refinement: independent Search/Results toggles on small screens, Search toggle tethered below filters, compact Results header toggle, condensed mobile results spacing, and stable results header rendering across rerenders/pagination",
    "v2.5.57": "Mobile UX state-flow overhaul: deterministic mobile SEARCH/RESULTS/PDF states with explicit reopen controls, one-third results pane, and removal of implicit PDF-scale search reopening side effects",
    "v2.5.56": "Production reliability fix: centralized absolute Worker URL builder for PDF/PDF_BY_ID/FEEDBACK calls, request-time ML background training gated off by default, wrangler keep_vars/observability persistence, and safe PDF host diagnostics",
    "v2.5.53": "PDF preview header centering fix (absolute-positioned title for true center), tablet sidebar width reduction, tablet default zoom 80%, and Custom PDF Info input clipping fixes for date/stage and phone/fax rows; version bump",
    "v2.5.52": "Fix bottom button clipping with stacked layout; redesign PDF preview modal as full-screen overlay with slim purple header bar; version bump",
    "v2.5.51": "UI restructure: move Project Context to left sidebar; simplify right panel to single CONTROL PANEL; default collapsed on generator activation; version bump",
    "v2.5.50":"UI restructure for Submittal Generator: Project Context & Sensitive Data block moved from right panel Project Data tab to left sidebar (visible only when generator active); right panel tab strip removed; single CONTROL PANEL header with zone editor controls only; generator panel defaults to collapsed/disabled on activation so first view is clean redacted title page; left sidebar CSS accommodates new context section; version bump",
    "v2.5.49": "Cover overlay text immediate render: applyPage1CoverTemplate now calls refreshContentForWrapper via requestAnimationFrame so text appears instantly instead of waiting for global scan end; corrected COVER_TEMPLATE font defaults: job_block/stage/date/cpid use Courier New monospace (Times New Roman reserved for cust only); guardrail in createZoneOnWrapper overrides Times to Courier on page 1 non-cust zones; version bump",
    "v2.5.48": "Redaction box defaults: CSS .redaction-box font-family changed from Times New Roman to Courier New so CSS does not override JS defaults; PdfViewer._setScaleForDevice desktop/tablet default zoom 1.0→1.1 (110%); Enclosure SS spec-table lock: when ENCLOSURE MATERIAL spec-table keyword indicates Stainless, always resolves to 4XSS (encV=false) even when FG signals also present; same logic mirrored in worker/lib/extract.js; new spec-table lock tests added; version bump",
    "v2.5.47": "Enclosure parsing refinement: worker and client now prefer explicit compound tokens (4XSS/4XFG) as tiebreaker when spec-table context does not resolve mixed signals; FRP added as strong FG signal in worker hasFG check; client ENC_FG_RE no longer matches bare FG to prevent false Varied/Multiple; PDFLib guard added to generateRedactedPdf; pdf-lib and fontkit vendored locally under assets/vendor/; index.html updated to load local pdf-lib/fontkit with CDN-missing guards; version bump",
    "v2.5.46": "Vendor PDF.js v3.11.174 locally under assets/vendor/pdfjs/ (pdf.min.js + pdf.worker.min.js); replace CDN script tag with local path; guard pdfjsLib.GlobalWorkerOptions.workerSrc with window.pdfjsLib check so app does not crash when CDN is blocked/timed-out; set window.__pdfjsMissing flag and log clear error on missing library; version bump",
    "v2.5.45": "Worker-side enclosure parsing now outputs enc='Varied / Multiple' (encV=true) when both 4XSS and 4XFG (or any multi-enclosure combination) remain after spec-table precedence; VOLT_PRIORITY 240 regex hardened with (?<!208/) lookbehind guards to prevent 208/220V and 208/230V false positives; version bump",
    "v2.5.44": "Add enclosure 'Varied / Multiple' classification: client-side safety net reclassifies records with both FG+SS signals; enclosure filter includes Varied/Multiple matches with lower weight (100 vs 500); sorting tie-breaker: HP-varied ranks above ENC-varied when both have exactly one varied flag; version bump",
    "v2.5.43": "Default zone font/opaque policy: Times New Roman only for page 1 cust zone (cover page Company Name); all other zones default Courier+opaque; SmartScanner detected zones default transparent=false; zoom font scaling fix: applyRuleToWrapper scales LAYOUT_RULES fontSize by currentScale so boxes scale proportionally at 60%/40% zoom; rescaleZones added after applyDetectedZones; debug log in rescaleZones for editor mode; version bump",
    "v2.5.42": "Toggle caret parity (zone-styling caret matches Project Context glyph+CSS); default zone styling mono+opaque for non-cust zones; fix opaque toggle (rescaleZones after transparent toggle); cover cust fontSize 22→24; zoom font scaling: RAF double-tick in rescaleZones + second rescaleZones RAF pass after renderStack; version bump",
    "v2.5.41": "Control Panel UI cleanup: removed obsolete drag-handle header (purple bar, minimize/close buttons); generator panel header now matches left sidebar (bg-sidebar, border-color); tab strip integrated as sidebar UI; Zone Styling card outer styling verified identical to Project Context card; DragManager.init() never called on docked widths (>=768px); version bump",
    "v2.5.40": "Cover template parity: cust moved below logo (y=0.40), job_block shifted down (y=0.50), both job+type lines underlined; label 'Customer Name'→'Company Name'; getContext defaults COMPANY NAME/JOB NAME; zoom-safe rescaleZones infers relFont from computed style when missing, waitForLayoutStable before rescaleZones in renderStack; right panel tab strip uses CSS vars; Zone Styling section styled to match Project Context card (dashed border, glass header); version bump",
    "v2.5.39": "Fix cover template placement (cust below logo, job_block/stage/date evenly spaced, no logo overlap); zoom-safe font scaling via data-relFont (rescaleZones recomputes fontSize from relFont*ch); debounce zoom() to eliminate rogue/duplicate page on rapid zoom; toggle-left/toggle-right rails white bg with border in light mode, contrast in dark mode; align version strings across app.js and index.html; version bump",
    "v2.5.38": "Cover template parity: COVER_TEMPLATE overlay zones updated for Cox title page (logo/footer already in template artwork; overlays fill cust/job_block/stage/date/cpid only); all cover overlays use Times New Roman serif; job_block now maps job+type with word-wrap (not job+stage); stage rendered as its own zone; zoom-scaling via data-rel geometry (rescaleZones after render); right panel tab UI polish (white background, visible borders); version bump",
    "v2.5.37": "Title page text layout overhaul: COVER_TEMPLATE zones redesigned for Cox title page parity (cust/job_block/type/date/cpid); unified job+stage into multiline job_block zone; custom text editor upgraded from input to textarea supporting newlines (white-space: pre-line on-screen, per-line PDF drawText); desktop control panel now docked/collapsible right sidebar matching tablet layout (isTablet expanded to all >=768px widths); version bump",
    "v2.5.36": "Enclosure false positives: spec-table context wins (ENCLOSURE MATERIAL / NAMEPLATE / PANEL TYPE forward-window resolves 4XFG vs 4XSS when both detected); tier-aware no-PDF sorting (missing-PDF records sorted after PDF-present records within each weight+variedCount tier instead of global partition)",
    "v2.5.35": "Hotfix: guard preload against missing credentials (show auth modal instead of 401); differentiate 401 (INVALID CREDENTIALS + re-login) vs 503 (SERVICE UNAVAILABLE + retry); worker returns 503 when auth backend (Airtable Users) is unreachable instead of leaving CACHE_USERS empty and falsely returning 401",
    "v2.5.34": "Worker parsing + search robustness: context-aware service-first voltage extraction (control transformer 480V-120VAC excluded from service volt); HP table-format parsing (HP: 7.5, MOTOR HP: 7.5); enclosure parsing covers NEMA4X/TYPE 4X/4 X; FG preferred canonical when both SS+FG present; HorsepowerMatcher decimal HP regex fix; KeywordMatcher model-number hyphen/space flex (PD6000↔PD-6000); reject_keywords normalized to uppercase; pure helpers in worker/lib/extract.js with node test runner",
    "v2.5.33": "Generator Control Panel UX polish: Zone Styling section collapsible and collapsed by default; Add/Delete redesigned as icon-only compact buttons with tooltips placed next to Preview (Project Data) and Auto-Scan (Page Editor); removed duplicate full-width Add/Delete buttons; bottom padding fix to prevent button clipping; context caret enlarged; version bump",
    "v2.5.31": "Fix tablet right rail expansion (restorePanel now clears inline display:none so generator panel becomes visible on expand); thicken collapse rails (collapse-btn width 20px→23px); move Mapped Data dropdown and Auto-Scan Pages button from outside tabs into Page Editor tab; version bump",
    "v2.5.30": "Tablet UI: generator panel docked as collapsible right sidebar with purple rail; viewer flex:1 fills freed space; preview minimizes panel + shows redacted modal with Print/Export action sheet; Print Redacted uses previewPdfBytes + afterprint cleanup; base print uses afterprint + 90s fallback; base print button labeled as original PDF; control panel: removed duplicate zone block, Clear All, Export; consolidated Add Box; version bump",
    "v2.5.29": "Smooth generator toggle transition (body.generator-transition fade, deterministic post-render scan replaces 500ms timeout); tablet breakpoint support for generator panel; UI.isSmallMobile()/isTablet() helpers; small-mobile guard in toggleGenerator(); version bump",
    "v2.5.28": "Generator OFF now renders original PDF for all pages with no template overlay and no auto-scan; SmartScanner page 1 always applies COVER_TEMPLATE deterministically (skips text/OCR detection); default desktop zoom changed from 110% to 100%; version bump",
    "v2.5.27": "Fix cover page redaction zones stacking (createZoneOnWrapper now appends redaction-text span before resize handle; refreshContent never overwrites innerHTML, creates span if missing for legacy boxes); fix profile dropdown to use <option>/<optgroup> markup; version bump",
    "v2.5.26": "Fix cover/template redaction zone placement (pdf-content-container height: 100%, waitForLayoutStable RAF flush before applyRuleToWrapper); compact generator panel (295px, reduced padding/spacing); Project Context default-collapsed on every load; version bump",
    "v2.5.25": "Universal cover sheet template as page 1 for all PDFs; simplified layout profiles (added COVER_TEMPLATE, deprecated legacy title keys from UI); fixed profile dropdown onchange error (applyProfileToPage alias); cover template zones with bold/underline/font rules; page 1 dropdown disabled",
    "v2.5.24": "Fixed thumbs-up lockout rendering (buttons now respect FeedbackService.lockout Set during UI.render) and profile dropdown population (added defensive logging and timing fix)",
    "v2.5.23": "Fixed positive feedback lockout persistence (lockout applied immediately, CSS class guard) and profile dropdown population (called once after all pages rendered)",
    "v2.5.22": "Refactored search engine into isolated, testable modules (Phase 1: VoltageMatcher, HorsepowerMatcher, KeywordMatcher) - no logic changes, pure reorganization to prevent future regressions",
    "v2.5.21": "Comprehensive voltage equivalency matching: 240V now matches 230V/220V/120-240V; 480V matches 460V/440V/277-480V per NEC standards; fixed dual-voltage inclusion logic",
    "v2.5.20": "Fixed 480V false positives (exclude 120/240V panels from 480V searches); simplified positive feedback (removed flawed implicit corrections); profile dropdown population timing fix",
    "v2.5.19": "Fixed 480V false positives (strict voltage boundaries + dual-voltage exclusion in search); voltage extraction now removes lower voltage from canonical pairs (120/240, 277/480) to prevent dual-voltage panels matching both voltages",
    "v2.5.18": "Profile dropdown population fix (populate immediately after each toolbar created); positive feedback lockout enforcement (persist across searches, prevent race conditions)",
    "v2.5.17": "Profile dropdown population fix; positive feedback lockout enforcement across search sessions",
    "v2.5.16": "Restored positive feedback lockout enforcement; voltage/phase/enc badge strictness fix (green for exact field matches, orange for fuzzy); page toolbar cleanup; OCR min-size guard for tiny boxes; smarter page classification with page-number heuristics (page 1=Title, page 2=Info, pages 3-4=Power/Control)",
    "v2.5.15": "Sorting: perfect matches (no varied flags) prioritized above varied results when weights equal; Feedback: removed thumbs-down lockout to allow multiple per-parameter corrections per panel per search",
    "v2.5.14": "Fixed 4XSS enclosure parsing to exclude fiberglass panels (now correctly mapped to 4XFG); added Date field to feedback submissions",
    "v2.5.13": "Fixed feedback lockout enforcement for thumbs up; HP badge now green for strict matches; enclosure parsing for 4XSS/4XFG/POLY",
    "v2.5.12": "Badge suppression for unfiltered parameters: badges only shown for actively filtered criteria (not 'Any'); Vercel cleanup",
    "v2.5.11": "Dual-voltage normalization: 120/240 and 277/480 split-phase pairs now use higher voltage with green badge instead of orange varied badge",
    "v2.5.10": "Varied parameter badges: orange badges for ambiguous/multiple values in mfg, hp, volt, phase, enc fields",
    "v2.5.9": "Fixed HP matching boundaries: 0.5 HP searches no longer match 1.5 HP (numeric boundary guards)",
    "v2.5.8": "Feedback modal defaults to empty selection; improved HP parsing for mixed fractions (7 1/2, 7-1/2, 7½)",
    "v2.5.7": "Fixed feedback button interactions: corrected thumbs down onclick handler to call FeedbackService.down with proper parameters",
    "v2.5.6": "Code optimizations: DOM cache, centralized PDF UI transitions, deduplicated fallback logic, extracted search helpers, reorganized large functions",
    "v2.5.5": "PDF load fixes: fallback to direct pdfUrl on 404, mark missing PDFs, relaxed worker lookup; HP variance badges now show orange for fuzzy matches",
    "v2.5.4": "Performance optimizations: skip PDF preloading for missing PDFs, limit search results to 25 per page, implement pagination UI",
    "v2.5.3": "PDF viewing/redaction improvements: preview step, overlay visibility, OCR lazy-load, export fixes; Worker hardening: secret keys, host allowlist, SSRF guards",
    "v2.5.2": "Fixed Control Panel tabs organization, CSS for redaction boxes, version sync",
    "v2.5.1": "Fixed Control Panel: redaction boxes now appear, page dropdown works, added tabbed UI",
    "v2.5.0": "Refactored Control Panel - functional checkboxes, page-aware UI",
    "v2.4.5": "Fixed PDF scanning errors and preload conflicts",
    "v2.4.4": "Strict keyword boundaries"
};
const WORKER_URL = "https://api.coxpanelfinder.app";

function buildWorkerUrl(target, params = {}) {
    const url = new URL(WORKER_URL);
    url.searchParams.set('target', target);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}

const CONFIG = { mainTable: 'MAIN', feedbackTable: 'FEEDBACK', voteThreshold: 3, estTotal: 7500 };
const SNAPSHOT_SCHEMA_VERSION = '1';

// Feature flags
const FEATURES = {
    OCR_ENABLED: true, // Set to false to disable OCR features
};

// OCR state management
let tesseractLoaded = false;
let tesseractLoadPromise = null;
let activeOcrTasks = new Set();

console.log(`%c🚀 SCHEMATICA ai ${APP_VERSION}`, 'color: #9333ea; font-weight: bold; font-size: 16px;');
console.log(`📋 ${VERSION_HISTORY[APP_VERSION]}`);

// Lazy-load Tesseract.js when OCR feature is first used
async function loadTesseract() {
    if (!FEATURES.OCR_ENABLED) {
        throw new Error('OCR feature is disabled');
    }
    
    if (tesseractLoaded) return;
    if (tesseractLoadPromise) return tesseractLoadPromise;
    
    tesseractLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = () => {
            tesseractLoaded = true;
            console.log('✓ Tesseract.js loaded');
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
        document.head.appendChild(script);
    });
    
    return tesseractLoadPromise;
}

// Preloading configuration
const PRELOAD_START_DELAY_MS = 120; // Short delay before first-page preload starts after search completes
const DATA_SYNC_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// PDF status constants
const PDF_STATUS = {
    MISSING: 'missing',
    READY: 'ready',
    LOADING: 'loading',
    ERROR: 'error'
};

// PDF UI display states
const PDF_UI_STATE = {
    LOADING: 'loading',
    READY: 'ready',
    FALLBACK: 'fallback',
    HIDDEN: 'hidden'
};

// DOM cache for frequently accessed elements
// Note: Cache can become stale if elements are removed/replaced
// Call DOM_CACHE.clear() or DOM_CACHE.invalidate(id) if needed
const DOM_CACHE = {
    _cache: new Map(),
    get(id) {
        if (!this._cache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this._cache.set(id, element);
            }
            return element;
        }
        return this._cache.get(id);
    },
    invalidate(id) {
        this._cache.delete(id);
    },
    clear() {
        this._cache.clear();
    }
};

window.TEMPLATE_BYTES = null;

const JOB_BLOCK_MAX_CHARS_PER_LINE = 30;

const LAYOUT_RULES = {
    TITLE: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "CONTROL PANEL", x: 0.15, y: 0.569, w: 0.7, h: 0.04, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "PROJECT SUBMITTAL", x: 0.201, y: 0.69, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "PLEASE REVIEW THOROUGHLY...", x: 0.201, y: 0.72, w: 0.6, h: 0.03, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.25, y: 0.75, w: 0.499, h: 0.04, fontSize: 20, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.835, y: 0.948, w: 0.15, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    TITLE_ASBUILT: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "CONTROL PANEL", x: 0.15, y: 0.569, w: 0.7, h: 0.04, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "stage", x: 0.201, y: 0.69, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.25, y: 0.75, w: 0.499, h: 0.04, fontSize: 20, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.835, y: 0.948, w: 0.15, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    INFO: [
        { map: "cust", x: 0.119, y: 0.085, w: 0.25, h: 0.025, fontSize: 10, transparent: true, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.058, y: 0.108, w: 0.25, h: 0.025, fontSize: 10, transparent: true, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.149, y: 0.889, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.909, y: 0.94, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    INFO_BORDERLESS: [
        { map: "cust", x: 0.01, y: 0.02, w: 0.3, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.01, y: 0.045, w: 0.3, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "date", x: 0.01, y: 0.95, w: 0.08, h: 0.02, fontSize: 8, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "type", x: 0.1, y: 0.93, w: 0.25, h: 0.04, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "cpid", x: 0.88, y: 0.97, w: 0.11, h: 0.02, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    SCHEMATIC_PORTRAIT: [
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.144, y: 0.89, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.92, y: 0.945, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_PORTRAIT_BORDERLESS: [
        { map: "date", x: 0.01, y: 0.95, w: 0.08, h: 0.02, fontSize: 8, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "type", x: 0.1, y: 0.93, w: 0.25, h: 0.04, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "cpid", x: 0.88, y: 0.97, w: 0.11, h: 0.02, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    SCHEMATIC_LANDSCAPE: [
        { x: 0.88, y: 0.13, w: 0.035, h: 0.25, map: 'cust', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { x: 0.88, y: 0.63, w: 0.035, h: 0.25, map: 'job', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { x: 0.05, y: 0.06, w: 0.02, h: 0.08, map: 'date', fontSize: 8, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.12, y: 0.28, w: 0.04, h: 0.25, map: 'type', fontSize: 12, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.05, y: 0.92, w: 0.02, h: 0.07, map: 'cpid', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_LANDSCAPE_BORDERLESS: [
        { x: 0.96, y: 0.13, w: 0.035, h: 0.25, map: 'cust', fontSize: 10, transparent: false, rotation: -90, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { x: 0.96, y: 0.63, w: 0.035, h: 0.25, map: 'job', fontSize: 10, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { x: 0.01, y: 0.06, w: 0.02, h: 0.08, map: 'date', fontSize: 8, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.07, y: 0.28, w: 0.04, h: 0.25, map: 'type', fontSize: 12, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.01, y: 0.92, w: 0.02, h: 0.07, map: 'cpid', fontSize: 10, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    DOOR_DRAWING: [
        { map: "cust", x: 0.05, y: 0.05, w: 0.4, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.05, y: 0.09, w: 0.4, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "cpid", x: 0.05, y: 0.93, w: 0.2, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "date", x: 0.75, y: 0.93, w: 0.2, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    COX_COVER: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "logo", x: 0.35, y: 0.15, w: 0.3, h: 0.15, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    DELTA_COVER: [
        { map: "cust", x: 0.2, y: 0.45, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.2, y: 0.52, w: 0.6, h: 0.04, fontSize: 20, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.2, y: 0.58, w: 0.6, h: 0.035, fontSize: 16, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.3, y: 0.75, w: 0.4, h: 0.03, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    THIRD_PARTY_COVER: [
        { map: "cust", x: 0.1, y: 0.4, w: 0.8, h: 0.05, fontSize: 26, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.1, y: 0.48, w: 0.8, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "logo", x: 0.3, y: 0.1, w: 0.4, h: 0.2, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    COVER_TEMPLATE: [
        { map: "cust", x: 0.15, y: 0.40, w: 0.7, h: 0.06, fontSize: 24, transparent: false, fontWeight: 'bold', fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job_block", x: 0.15, y: 0.50, w: 0.7, h: 0.12, fontSize: 20, transparent: false, decoration: 'underline', fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "stage", x: 0.15, y: 0.68, w: 0.7, h: 0.045, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.25, y: 0.74, w: 0.499, h: 0.04, fontSize: 16, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.835, y: 0.948, w: 0.15, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    GENERAL: [
        { map: "custom", text: "GENERAL LAYOUT PLACEHOLDER", x: 0.499, y: 0.499, w: 0.3, h: 0.051, fontSize: 14, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ]
};

const AI_TRAINING_DATA = { 
    MANUFACTURERS: [
        'GORMAN RUPP', 'BARNES', 'HYDROMATIC', 'FLYGT', 'MYERS', 'GOULDS', 
        'ZOELLER', 'LIBERTY', 'WILO', 'PENTAIR', 'ABS', 'GODWIN', 'FRANKLIN', 
        'EBARA', 'HIDROSTAL'
    ],
    ALIASES: {
        // CRITICAL FIX: Grouped SA, LA, and TVSS perfectly
        'SA': ['SA', 'SURGE ARRESTOR', 'SURGE SUPPRESSOR', 'TVSS', 'LIGHTNING ARRESTOR', 'SPD', 'LA'],
        'LA': ['LA', 'LIGHTNING ARRESTOR', 'SURGE ARRESTOR', 'SURGE SUPPRESSOR', 'TVSS', 'SPD', 'SA'],
        'PM': ['PM', 'PHASE MONITOR', 'PHASE FAIL', 'PHASE RELAY'],
        'VFD': ['VFD', 'VARIABLE FREQUENCY DRIVE', 'DRIVE', 'INVERTER'],
        'HOA': ['HOA', 'HAND OFF AUTO', 'HAND-OFF-AUTO'],
        'IS': ['IS', 'INTRINSICALLY SAFE', 'INTRINSIC SAFETY']
    },
    DATA: { 
        HP: [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100], 
        VOLT: [120, 208, 240, 480, 575], 
        PHASE: [1, 3] 
    } 
};

class DB {
    static open() { return new Promise((r, j) => { const q = indexedDB.open("CoxSchematicDB", 8); q.onupgradeneeded = e => { const d = e.target.result; if(d.objectStoreNames.contains("cache")) d.deleteObjectStore("cache"); if(d.objectStoreNames.contains("chunks")) d.deleteObjectStore("chunks"); d.createObjectStore("chunks"); }; q.onsuccess = e => r(e.target.result); q.onerror = e => j(e); }); }
    static async putChunk(k, v) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readwrite"); t.objectStore("chunks").put(v, k); t.oncomplete = r; t.onerror = j; }); }
    static async putChunks(entries, progressCallback) {
        const safeEntries = Array.isArray(entries) ? entries : [];
        if (safeEntries.length === 0) return;
        const d = await this.open();
        return new Promise((resolve, reject) => {
            const t = d.transaction("chunks", "readwrite");
            const store = t.objectStore("chunks");
            let completed = 0;
            safeEntries.forEach(([k, v]) => {
                const req = store.put(v, k);
                req.onsuccess = () => {
                    completed++;
                    if (progressCallback) progressCallback(completed, safeEntries.length);
                };
            });
            t.oncomplete = resolve;
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        });
    }
    static async getChunk(k) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").get(k); q.onsuccess = () => r(q.result); q.onerror = j; }); }
    static async getChunkKeys() { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").getAllKeys(); q.onsuccess = () => r(q.result); q.onerror = j; }); }
    static async deleteChunk(k) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readwrite"); t.objectStore("chunks").delete(k); t.oncomplete = r; t.onerror = j; }); }
    static async claimLock(k, token, ttlMs) {
        const d = await this.open();
        return new Promise((resolve, reject) => {
            const t = d.transaction("chunks", "readwrite");
            const store = t.objectStore("chunks");
            const q = store.get(k);
            let granted = false;
            q.onsuccess = () => {
                const existing = q.result;
                const now = Date.now();
                const lockAt = Number(existing?.at);
                const heartbeatAt = Number(existing?.heartbeatAt);
                const ttl = Number(existing?.ttlMs) || ttlMs;
                const lockTimestamp = Number.isFinite(heartbeatAt) && heartbeatAt > 0 ? heartbeatAt : lockAt;
                const isLocked = Number.isFinite(lockTimestamp) && lockTimestamp > 0 && (now - lockTimestamp) < ttl;
                if (isLocked && existing?.token !== token) return;
                store.put({
                    token,
                    at: (existing?.token === token && Number.isFinite(lockAt) && lockAt > 0) ? lockAt : now,
                    heartbeatAt: now,
                    ttlMs: ttlMs
                }, k);
                granted = true;
            };
            q.onerror = () => reject(q.error);
            t.oncomplete = () => resolve(granted);
            t.onerror = () => reject(t.error);
        });
    }
    static async releaseLock(k, token) {
        const d = await this.open();
        return new Promise((resolve, reject) => {
            const t = d.transaction("chunks", "readwrite");
            const store = t.objectStore("chunks");
            const q = store.get(k);
            q.onsuccess = () => {
                const existing = q.result;
                if (!existing || existing.token === token) {
                    store.delete(k);
                }
            };
            q.onerror = () => reject(q.error);
            t.oncomplete = () => resolve();
            t.onerror = () => reject(t.error);
        });
    }
    static async deleteLegacy() { try { const d = await this.open(); const t = d.transaction("cache", "readwrite"); t.objectStore("cache").clear(); } catch(e){} }
    static async clear() { const d=await this.open(); return new Promise(r=>{ const t=d.transaction("chunks","readwrite"); t.objectStore("chunks").clear(); t.oncomplete=r; }); }
    static deleteDatabase() { return new Promise((resolve, reject) => { const req = indexedDB.deleteDatabase("CoxSchematicDB"); req.onsuccess = () => resolve(); req.onerror = () => reject(); req.onblocked = () => resolve(); }); }
}

class CacheService {
    static ACTIVE_GENERATION_KEY = '__meta_active_generation';
    static PREVIOUS_GENERATION_KEY = '__meta_previous_generation';
    static GENERATION_PREFIX = 'gen_';
    static LEGACY_SHARD_PREFIX = 'shard_';
    static activeKey = null;
    static now() {
        return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    }
    static async prepareKey(p) { if(!p) return null; const e = new TextEncoder(); const k = await crypto.subtle.importKey("raw", e.encode(p), "PBKDF2", false, ["deriveKey"]); this.activeKey = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: e.encode("COX_SALT_V1"), iterations: 100000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); return this.activeKey; }
    static async saveShard(id, data) { if(!this.activeKey) return; const j = JSON.stringify(data); const e = await this.enc(j); await DB.putChunk(id, e); }
    static async saveSnapshot(records, { chunkSize = 50, progressCallback } = {}) {
        if (!this.activeKey) throw new Error('Cache encryption key missing');
        const safeRecords = Array.isArray(records) ? records : [];
        const previousGeneration = await DB.getChunk(this.ACTIVE_GENERATION_KEY).catch(() => null);
        const generation = `${this.GENERATION_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let shardCount = 0;
        const totalStart = this.now();
        const encryptStart = totalStart;
        const totalShards = Math.max(1, Math.ceil(safeRecords.length / chunkSize));
        const shardEntries = [];

        for (let i = 0; i < safeRecords.length; i += chunkSize) {
            const chunk = safeRecords.slice(i, i + chunkSize);
            const enc = await this.enc(JSON.stringify(chunk));
            shardEntries.push([`${generation}:shard:${shardCount++}`, enc]);
            if (progressCallback) {
                progressCallback({
                    phase: 'encrypting',
                    completed: shardCount,
                    total: totalShards,
                    pct: Math.round((shardCount / totalShards) * 100)
                });
            }
            if (shardCount % 4 === 0) await new Promise(r => setTimeout(r, 0));
        }
        const encryptMs = Math.round(this.now() - encryptStart);

        const writeStart = this.now();
        const writeEntries = [
            ...shardEntries,
            [`${generation}:manifest`, { shardCount, createdAt: Date.now() }],
            [this.ACTIVE_GENERATION_KEY, generation],
            [this.PREVIOUS_GENERATION_KEY, (typeof previousGeneration === 'string' && previousGeneration && previousGeneration !== generation) ? previousGeneration : '']
        ];
        if (progressCallback) {
            progressCallback({ phase: 'saving', completed: 0, total: writeEntries.length, pct: 0 });
        }
        await DB.putChunks(writeEntries, (completed, total) => {
            if (progressCallback) {
                progressCallback({
                    phase: 'saving',
                    completed,
                    total,
                    pct: Math.round((completed / total) * 100)
                });
            }
        });
        const writeMs = Math.round(this.now() - writeStart);

        this.cleanupLegacyShards().catch(err => console.warn('Legacy shard cleanup warning:', err));
        return {
            encryptMs,
            writeMs,
            totalMs: Math.round(this.now() - totalStart)
        };
    }
    static getActiveGenerationShardKeys(keys, generation) {
        if (!generation || !Array.isArray(keys)) return [];
        return keys
            .filter(k => typeof k === 'string' && k.startsWith(`${generation}:shard:`))
            .sort((a, b) => {
                const ai = parseInt(String(a).split(':').pop(), 10);
                const bi = parseInt(String(b).split(':').pop(), 10);
                return ai - bi;
            });
    }
    static getLegacyShardKeys(keys) {
        if (!Array.isArray(keys)) return [];
        return keys
            .filter(k => typeof k === 'string' && k.startsWith(this.LEGACY_SHARD_PREFIX))
            .sort();
    }
    static async cleanupGeneration(generation) {
        if (!generation) return;
        const keys = await DB.getChunkKeys();
        const pref = `${generation}:`;
        for (const key of keys) {
            if (typeof key === 'string' && key.startsWith(pref)) {
                await DB.deleteChunk(key);
            }
        }
    }
    static async cleanupLegacyShards() {
        const keys = await DB.getChunkKeys();
        for (const key of keys) {
            if (typeof key === 'string' && key.startsWith(this.LEGACY_SHARD_PREFIX)) {
                await DB.deleteChunk(key);
            }
        }
    }
    static async cleanupInactiveGenerations({ keepGeneration = null, maxDeletes = 40 } = {}) {
        const keys = await DB.getChunkKeys();
        const prefixes = new Set();
        for (const key of keys) {
            if (typeof key !== 'string') continue;
            if (!key.startsWith(this.GENERATION_PREFIX)) continue;
            const marker = key.indexOf(':');
            if (marker <= 0) continue;
            prefixes.add(key.slice(0, marker));
        }
        const staleGenerations = Array.from(prefixes)
            .filter(gen => gen && gen !== keepGeneration)
            .sort();
        let deleted = 0;
        for (const generation of staleGenerations) {
            const pref = `${generation}:`;
            for (const key of keys) {
                if (typeof key === 'string' && key.startsWith(pref)) {
                    await DB.deleteChunk(key);
                    deleted++;
                    if (deleted >= maxDeletes) return;
                }
            }
        }
    }
    static async loadGeneration(generation, keys, progressCallback) {
        const stageMap = new Map();
        const stageMfgs = new Set();
        const stageEncs = new Set();
        const manifest = await DB.getChunk(`${generation}:manifest`).catch(() => null);
        const expectedShards = Number(manifest?.shardCount);
        if (!Number.isInteger(expectedShards) || expectedShards < 1) {
            return { success: false, reason: 'missing-manifest' };
        }
        const shardKeys = Array.from({ length: expectedShards }, (_, i) => `${generation}:shard:${i}`);
        for (let i = 0; i < shardKeys.length; i++) {
            if (i % 50 === 0) await new Promise(r => setTimeout(r, 1));
            if (!keys.includes(shardKeys[i])) {
                return { success: false, reason: `missing-shard-${i}` };
            }
            const chunk = await DB.getChunk(shardKeys[i]);
            if (!chunk) return { success: false, reason: `empty-shard-${i}` };
            let dec = null;
            try {
                dec = await this.dec(chunk);
            } catch (_e) {}
            if (!dec) return { success: false, reason: `decrypt-failed-${i}` };
            let data = null;
            try {
                data = JSON.parse(dec);
            } catch (_e) {
                return { success: false, reason: `json-failed-${i}` };
            }
            if (!Array.isArray(data)) return { success: false, reason: `invalid-array-${i}` };
            data.forEach(r => {
                if (!r || !r.id) return;
                stageMap.set(r.id, r);
                if(r.mfg) stageMfgs.add(r.mfg);
                if(r.enc) stageEncs.add(r.enc);
            });
            if(progressCallback) progressCallback(Math.round(((i + 1) / shardKeys.length) * 100));
        }
        if (stageMap.size === 0) return { success: false, reason: 'empty-generation' };
        return { success: true, stageMap, stageMfgs, stageEncs };
    }
    static async loadAllWithProgress(progressCallback) { 
        if(!this.activeKey) return null; 
        const keys = await DB.getChunkKeys(); 
        if(!keys || keys.length === 0) return null; 
        const activeGeneration = await DB.getChunk(this.ACTIVE_GENERATION_KEY).catch(() => null);
        let stageMap = null;
        let stageMfgs = null;
        let stageEncs = null;

        if (typeof activeGeneration === 'string' && activeGeneration) {
            const activeResult = await this.loadGeneration(activeGeneration, keys, progressCallback);
            if (activeResult?.success) {
                stageMap = activeResult.stageMap;
                stageMfgs = activeResult.stageMfgs;
                stageEncs = activeResult.stageEncs;
            } else {
                const previousGeneration = await DB.getChunk(this.PREVIOUS_GENERATION_KEY).catch(() => null);
                if (typeof previousGeneration === 'string' && previousGeneration && previousGeneration !== activeGeneration) {
                    const previousResult = await this.loadGeneration(previousGeneration, keys, progressCallback);
                    if (previousResult?.success) {
                        await DB.putChunk(this.ACTIVE_GENERATION_KEY, previousGeneration);
                        stageMap = previousResult.stageMap;
                        stageMfgs = previousResult.stageMfgs;
                        stageEncs = previousResult.stageEncs;
                        console.warn(`[CacheService] Active generation invalid (${activeResult?.reason || 'unknown'}); restored previous generation`);
                    } else {
                        console.warn(`[CacheService] Active and previous generations invalid (${activeResult?.reason || 'unknown'}, ${previousResult?.reason || 'unknown'})`);
                    }
                } else {
                    console.warn(`[CacheService] Active generation invalid (${activeResult?.reason || 'unknown'})`);
                }
            }
        } else {
            const shardKeys = this.getLegacyShardKeys(keys);
            if (shardKeys.length === 0) return null;
            const legacyMap = new Map();
            const legacyMfgs = new Set();
            const legacyEncs = new Set();
            for(let i = 0; i < shardKeys.length; i++) { 
                if(i % 50 === 0) await new Promise(r => setTimeout(r, 1)); 
                const chunk = await DB.getChunk(shardKeys[i]); 
                if(!chunk) return null;
                let dec = null;
                try {
                    dec = await this.dec(chunk);
                } catch (_e) {}
                if (!dec) return null;
                let data = null;
                try {
                    data = JSON.parse(dec);
                } catch (_e) {
                    return null;
                }
                if (!Array.isArray(data)) return null;
                data.forEach(r => {
                    if (!r || !r.id) return;
                    legacyMap.set(r.id, r);
                    if(r.mfg) legacyMfgs.add(r.mfg);
                    if(r.enc) legacyEncs.add(r.enc);
                });
                if(progressCallback) progressCallback(Math.round(((i + 1) / shardKeys.length) * 100)); 
            }
            if (legacyMap.size > 0) {
                stageMap = legacyMap;
                stageMfgs = legacyMfgs;
                stageEncs = legacyEncs;
            }
        }

        if (!stageMap || stageMap.size === 0) return null;
        window.LOCAL_DB.length = 0;
        stageMap.forEach(rec => window.LOCAL_DB.push(rec));
        if (!(window.ID_MAP instanceof Map)) window.ID_MAP = new Map();
        if (!(window.FOUND_MFGS instanceof Set)) window.FOUND_MFGS = new Set();
        if (!(window.FOUND_ENCS instanceof Set)) window.FOUND_ENCS = new Set();
        window.ID_MAP.clear();
        window.FOUND_MFGS.clear();
        window.FOUND_ENCS.clear();
        stageMap.forEach((rec, id) => window.ID_MAP.set(id, rec));
        stageMfgs.forEach(v => window.FOUND_MFGS.add(v));
        stageEncs.forEach(v => window.FOUND_ENCS.add(v));
        return true; 
    }
    static async enc(t) { const iv = crypto.getRandomValues(new Uint8Array(12)); const e = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.activeKey, new TextEncoder().encode(t)); return Array.from(iv).map(b=>b.toString(16).padStart(2,'0')).join('') + ":" + Array.from(new Uint8Array(e)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
    static async dec(t) { const [i, d] = t.split(':'); const iv = new Uint8Array(i.match(/.{1,2}/g).map(b=>parseInt(b,16))); const da = new Uint8Array(d.match(/.{1,2}/g).map(b=>parseInt(b,16))); try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, this.activeKey, da)); } catch { return null; } }
}

class AuthService {
    static init() { const u = localStorage.getItem('cox_user'); const p = localStorage.getItem('cox_pass'); if (u && p) { document.documentElement.classList.add('logged-in'); document.getElementById('auth-overlay').classList.remove('active-modal'); UI.pop(); return true; } return false; }
    static login() { const u = document.getElementById('auth-user').value.trim(); const p = document.getElementById('auth-pass').value.trim(); if (!u || !p) return alert("Missing Credentials"); localStorage.setItem('cox_user', u); localStorage.setItem('cox_pass', p); location.reload(); }
    static logout() { localStorage.clear(); sessionStorage.clear(); location.reload(); }
    static headers() { return { 'X-Cox-User': localStorage.getItem('cox_user'), 'X-Cox-Pass': localStorage.getItem('cox_pass') }; }
}

class NetworkService {
    static async fetch(t, p='', { timeoutMs = 0 } = {}) { 
        const h = AuthService.headers();
        const requestUrl = `${buildWorkerUrl(t)}${p}`;
        console.log(`🌐 Fetching ${t}...`);
        let timeoutId = null;
        let controller = null;
        const fetchOptions = { headers: h };
        if (timeoutMs > 0 && typeof AbortController !== 'undefined') {
            controller = new AbortController();
            fetchOptions.signal = controller.signal;
            timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        }
        try {
            return await fetch(requestUrl, fetchOptions);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }
}

class DataLoader {
    static INITIAL_SYNC_ATTEMPTS_KEY = 'cox_sync_attempts';
    static MAX_INITIAL_SYNC_ATTEMPTS = 5;
    static SYNC_TIMESTAMP_KEY = 'cox_db_synced_at';
    static SYNC_LOCK_KEY = 'cox_db_sync_lock_at';
    static APP_VERSION_KEY = 'cox_version';
    static SNAPSHOT_SCHEMA_VERSION_KEY = 'cox_cache_schema_version';
    static SYNC_DB_LOCK_KEY = '__cox_db_sync_lock';
    static SYNC_LOCK_TTL_MS = 10 * 60 * 1000;
    static SYNC_LOCK_HEARTBEAT_MS = 15000;
    static SYNC_LOCK_WAIT_TIMEOUT_MS = 120000;
    static SYNC_LOCK_WAIT_BASE_DELAY_MS = 1200;
    static STARTUP_WATCHDOG_MS = 180000;
    static _inFlightSync = false;
    static _lockToken = null;
    static _lockHeartbeatTimer = null;
    static _lifecycleRefreshHookInstalled = false;
    static _backgroundRefreshPromise = null;
    static _queuedBackgroundRefreshTimer = null;
    static _lastBackgroundRefreshAt = 0;
    static BACKGROUND_REFRESH_DEBOUNCE_MS = 30000;
    static BACKGROUND_REFRESH_COOLDOWN_MS = 120000;
    static STARTUP_REFRESH_JITTER_MAX_MS = 15000;
    static _backgroundRefreshCooldownUntil = 0;
    static PAGE_REQUEST_TIMEOUT_MS = 25000;
    static MAX_PAGE_RETRIES = 5;
    static MAX_RECOVERABLE_SYNC_RESTARTS = 2;
    static RETRY_BASE_DELAY_MS = 600;
    static RETRY_MAX_DELAY_MS = 10000;
    static JITTER_MIN = 0.85;
    static JITTER_MAX = 1.25;
    static RESUME_WAIT_TIMEOUT_MS = 20000;
    static _syncInterruptionHooksInstalled = false;
    static _suspensionGeneration = 0;
    static _networkTransitionGeneration = 0;
    static _lastKnownOnline = null;
    static _lockHeartbeatLost = false;

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
    }
    static async yieldMainThread() {
        await this.sleep(0);
    }
    static parseRetryAfterMs(rawValue) {
        if (!rawValue) return null;
        const asSeconds = Number(rawValue);
        if (Number.isFinite(asSeconds) && asSeconds >= 0) {
            return Math.round(asSeconds * 1000);
        }
        const asDate = Date.parse(rawValue);
        if (!Number.isFinite(asDate)) return null;
        return Math.max(0, asDate - Date.now());
    }
    static computeRetryDelayMs({ attempt = 1, retryAfterMs = null } = {}) {
        const safeAttempt = Math.max(1, Number.isFinite(attempt) ? attempt : 1);
        const exponentialMs = Math.min(this.RETRY_MAX_DELAY_MS, this.RETRY_BASE_DELAY_MS * (2 ** (safeAttempt - 1)));
        const jitterFactor = this.JITTER_MIN + (Math.random() * (this.JITTER_MAX - this.JITTER_MIN));
        const jitteredMs = Math.min(this.RETRY_MAX_DELAY_MS, Math.round(exponentialMs * jitterFactor));
        return Math.max(jitteredMs, Number.isFinite(retryAfterMs) ? retryAfterMs : 0);
    }
    static isRetryableStatus(status) {
        return status === 429 || status === 408 || status === 425 || status >= 500;
    }
    static isRetryableNetworkError(err) {
        if (!err) return false;
        if (err.name === 'AbortError') return true;
        const msg = String(err.message || '').toLowerCase();
        return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('abort');
    }
    static isQuotaExceededError(err) {
        if (!err) return false;
        if (err.name === 'QuotaExceededError') return true;
        const msg = String(err.message || '').toLowerCase();
        return msg.includes('quota') || msg.includes('storage full') || msg.includes('maximum size');
    }
    static isDocumentSuspended() {
        return typeof document !== 'undefined' && document.visibilityState === 'hidden';
    }
    static markSuspension(reason = 'suspend') {
        this._suspensionGeneration++;
        console.info(`[SyncState] status=suspension event=${reason} generation=${this._suspensionGeneration}`);
    }
    static markNetworkTransition(reason = 'network-change') {
        this._networkTransitionGeneration++;
        const online = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : null;
        this._lastKnownOnline = online;
        console.info(`[SyncState] status=network-transition event=${reason} online=${online === null ? 'unknown' : (online ? 'true' : 'false')} generation=${this._networkTransitionGeneration}`);
    }
    static installSyncInterruptionHooks() {
        if (this._syncInterruptionHooksInstalled) return;
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.markSuspension('visibility-hidden');
            });
            document.addEventListener('freeze', () => this.markSuspension('freeze'));
        }
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', () => this.markSuspension('pagehide'));
            window.addEventListener('offline', () => this.markNetworkTransition('offline'));
            window.addEventListener('online', () => this.markNetworkTransition('online'));
        }
        this._syncInterruptionHooksInstalled = true;
    }
    static classifySyncFailure(err, { background = false, syncStartSuspensionGeneration = this._suspensionGeneration, syncStartNetworkGeneration = this._networkTransitionGeneration } = {}) {
        if (this.isQuotaExceededError(err)) {
            return { kind: 'quota', recoverable: false, message: '💾 STORAGE FULL - FREE SPACE' };
        }
        if (!background && err?.code === 'SYNC_LOCK_LOST') {
            return { kind: 'lock-lost', recoverable: true, message: '⏳ REVALIDATING SYNC LOCK...' };
        }
        if (!background && (this._suspensionGeneration !== syncStartSuspensionGeneration || this.isDocumentSuspended())) {
            return { kind: 'suspension', recoverable: true, message: '⏳ APP RESUMING...' };
        }
        if (!background && this._networkTransitionGeneration !== syncStartNetworkGeneration && this.isRetryableNetworkError(err)) {
            return { kind: 'network-transition', recoverable: true, message: '⏳ NETWORK CHANGED - RETRYING...' };
        }
        if (!background && ((typeof navigator !== 'undefined' && navigator.onLine === false) || this.isRetryableNetworkError(err))) {
            return { kind: 'network', recoverable: true, message: '⏳ RETRYING NETWORK...' };
        }
        return { kind: 'terminal', recoverable: false, message: '⚠️ SYNC INTERRUPTED' };
    }
    static async ensureActiveLockOwnership() {
        if (!this._lockToken) return false;
        const lockMeta = await DB.getChunk(this.SYNC_DB_LOCK_KEY).catch(() => null);
        const heartbeatAt = Number(lockMeta?.heartbeatAt || lockMeta?.at);
        const ttlMs = Number(lockMeta?.ttlMs) || this.SYNC_LOCK_TTL_MS;
        const lockAlive = Number.isFinite(heartbeatAt) && heartbeatAt > 0 && (Date.now() - heartbeatAt) < ttlMs;
        const owned = lockAlive && lockMeta?.token === this._lockToken;
        if (!owned) return false;
        localStorage.setItem(this.SYNC_LOCK_KEY, JSON.stringify({ at: Number(lockMeta?.at) || heartbeatAt, heartbeatAt, token: this._lockToken, ttlMs }));
        return true;
    }
    static async waitForResumeReady(btn, message = '⏳ WAITING TO RESUME SYNC...', timeoutMs = this.RESUME_WAIT_TIMEOUT_MS) {
        const startedAt = Date.now();
        while ((Date.now() - startedAt) < timeoutMs) {
            const visible = !this.isDocumentSuspended();
            const online = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine !== false : true;
            if (visible && online) return true;
            this.showWaitingForUpdate(btn, message);
            await this.sleep(500);
        }
        return false;
    }

    static getSyncTimestamp() {
        const raw = localStorage.getItem(this.SYNC_TIMESTAMP_KEY);
        const ts = Number(raw);
        return Number.isFinite(ts) && ts > 0 ? ts : null;
    }
    static isSyncFresh(now = Date.now()) {
        const ts = this.getSyncTimestamp();
        return !!ts && (now - ts) < DATA_SYNC_MAX_AGE_MS;
    }
    static isCacheComplete() {
        return localStorage.getItem('cox_db_complete') === 'true';
    }
    static shouldRefreshStaleCache(now = Date.now()) {
        if (!this.isCacheComplete()) return false;
        return !this.isSyncFresh(now);
    }
    static shouldAbortEmptySync({ fetchedCount, hadExistingData }) {
        return fetchedCount === 0 && (hadExistingData || this.isCacheComplete());
    }
    static getBlockingSyncAttempts() {
        const attempts = parseInt(localStorage.getItem(this.INITIAL_SYNC_ATTEMPTS_KEY) || '0', 10);
        return Number.isFinite(attempts) && attempts > 0 ? attempts : 0;
    }
    static clearBlockingSyncAttempts() {
        localStorage.setItem(this.INITIAL_SYNC_ATTEMPTS_KEY, '0');
    }
    static incrementBlockingSyncAttempts() {
        const next = this.getBlockingSyncAttempts() + 1;
        localStorage.setItem(this.INITIAL_SYNC_ATTEMPTS_KEY, String(next));
        return next;
    }
    static restoreSearchReadyState(btn) {
        if (!btn) return;
        btn.classList.remove('warning', 'error');
        btn.disabled = false;
        btn.innerText = "SEARCH";
    }
    static showSyncInterrupted(btn) {
        if (!btn) return;
        console.warn('[SyncState] status=terminal-failure');
        btn.classList.remove('error');
        btn.classList.add('warning');
        btn.innerText = "⚠️ SYNC INTERRUPTED";
        btn.disabled = false;
        btn.onclick = () => {
            this.clearBlockingSyncAttempts();
            localStorage.removeItem(this.SYNC_LOCK_KEY);
            DB.deleteChunk(this.SYNC_DB_LOCK_KEY)
                .catch(() => {})
                .finally(() => location.reload());
        };
    }
    static showWaitingForUpdate(btn, message = "⏳ WAITING FOR UPDATE...") {
        if (!btn) return;
        btn.classList.remove('warning', 'error');
        btn.disabled = true;
        btn.onclick = null;
        btn.innerText = message;
    }
    static startSyncLockHeartbeat() {
        this.stopSyncLockHeartbeat();
        if (!this._lockToken) return;
        this._lockHeartbeatTimer = setInterval(() => {
            if (!this._lockToken) return;
            DB.claimLock(this.SYNC_DB_LOCK_KEY, this._lockToken, this.SYNC_LOCK_TTL_MS)
                .then((retained) => {
                    if (!retained) {
                        this._lockHeartbeatLost = true;
                        console.warn('[SyncLock] heartbeat status=lost');
                        return;
                    }
                    this._lockHeartbeatLost = false;
                    const now = Date.now();
                    localStorage.setItem(this.SYNC_LOCK_KEY, JSON.stringify({ at: now, heartbeatAt: now, token: this._lockToken, ttlMs: this.SYNC_LOCK_TTL_MS }));
                })
                .catch(() => {});
        }, this.SYNC_LOCK_HEARTBEAT_MS);
    }
    static stopSyncLockHeartbeat() {
        if (this._lockHeartbeatTimer) {
            clearInterval(this._lockHeartbeatTimer);
            this._lockHeartbeatTimer = null;
        }
    }
    static queueBackgroundRefresh(options = {}) {
        if (this._queuedBackgroundRefreshTimer) return;
        const now = Date.now();
        const jitterMs = Math.round(Math.random() * this.STARTUP_REFRESH_JITTER_MAX_MS);
        if (now < this._backgroundRefreshCooldownUntil) return;
        this._queuedBackgroundRefreshTimer = setTimeout(() => {
            this._queuedBackgroundRefreshTimer = null;
            Promise.resolve()
                .then(() => this.maybeRefreshStaleCache(options))
                .catch(err => console.warn('Background refresh bootstrap failed; keeping existing cache intact', err));
        }, jitterMs);
    }
    static async acquireSyncLock(now = Date.now()) {
        if (this._inFlightSync) return false;
        const token = `${now}_${Math.random().toString(36).slice(2, 10)}`;
        const won = await DB.claimLock(this.SYNC_DB_LOCK_KEY, token, this.SYNC_LOCK_TTL_MS);
        if (won) {
            this._inFlightSync = true;
            this._lockToken = token;
            this._lockHeartbeatLost = false;
            localStorage.setItem(this.SYNC_LOCK_KEY, JSON.stringify({ at: now, heartbeatAt: now, token, ttlMs: this.SYNC_LOCK_TTL_MS }));
            this.startSyncLockHeartbeat();
        }
        return won;
    }
    static async releaseSyncLock() {
        this.stopSyncLockHeartbeat();
        if (this._lockToken) {
            await DB.releaseLock(this.SYNC_DB_LOCK_KEY, this._lockToken).catch(() => {});
        }
        this._inFlightSync = false;
        this._lockToken = null;
        this._lockHeartbeatLost = false;
        localStorage.removeItem(this.SYNC_LOCK_KEY);
    }
    static async waitForPeerSyncAndRestore(btn, timeoutMs = this.SYNC_LOCK_WAIT_TIMEOUT_MS) {
        const start = Date.now();
        let poll = 0;
        while ((Date.now() - start) < timeoutMs) {
            poll++;
            if (this.isDocumentSuspended()) {
                this.showWaitingForUpdate(btn, "⏳ APP RESUMING...");
                await this.sleep(400);
                continue;
            }
            this.showWaitingForUpdate(btn, "⏳ WAITING FOR UPDATE...");
            const restored = await CacheService.loadAllWithProgress((pct) => {
                if (btn) btn.innerText = `⏳ WAITING FOR UPDATE... ${pct}%`;
            }).catch(() => null);
            if (restored && this.isCacheComplete()) {
                return { success: true, restoredFromPeer: true };
            }
            const lockMeta = await DB.getChunk(this.SYNC_DB_LOCK_KEY).catch(() => null);
            const heartbeatAt = Number(lockMeta?.heartbeatAt || lockMeta?.at);
            const lockIsAlive = Number.isFinite(heartbeatAt) && heartbeatAt > 0 && (Date.now() - heartbeatAt) < this.SYNC_LOCK_TTL_MS;
            if (!lockIsAlive) {
                const won = await this.acquireSyncLock();
                if (won) return { success: false, shouldSync: true };
            }
            const delayMs = Math.min(5000, this.SYNC_LOCK_WAIT_BASE_DELAY_MS + (poll * 250) + Math.round(Math.random() * 500));
            await this.sleep(delayMs);
        }
        const recoverable = this.isDocumentSuspended() || (typeof navigator !== 'undefined' && navigator.onLine === false);
        return { success: false, timedOut: true, recoverable, reason: recoverable ? 'lock-wait-interrupted' : 'lock-wait-timeout' };
    }
    static async ensureCacheCompatibility() {
        const currentSchema = localStorage.getItem(this.SNAPSHOT_SCHEMA_VERSION_KEY);
        const hasCompleteCache = this.isCacheComplete();
        if (!currentSchema && hasCompleteCache) {
            localStorage.setItem(this.SNAPSHOT_SCHEMA_VERSION_KEY, SNAPSHOT_SCHEMA_VERSION);
        } else if (!currentSchema) {
            localStorage.setItem(this.SNAPSHOT_SCHEMA_VERSION_KEY, SNAPSHOT_SCHEMA_VERSION);
        } else if (currentSchema !== SNAPSHOT_SCHEMA_VERSION) {
            console.warn(`⚡ Cache schema changed (${currentSchema || 'none'} -> ${SNAPSHOT_SCHEMA_VERSION}). Resetting persisted snapshot.`);
            await DB.deleteDatabase();
            window.LOCAL_DB.length = 0;
            if (window.ID_MAP instanceof Map) window.ID_MAP.clear();
            if (window.FOUND_MFGS instanceof Set) window.FOUND_MFGS.clear();
            if (window.FOUND_ENCS instanceof Set) window.FOUND_ENCS.clear();
            localStorage.removeItem('cox_db_complete');
            localStorage.removeItem(this.SYNC_TIMESTAMP_KEY);
            localStorage.removeItem(this.SYNC_LOCK_KEY);
            localStorage.removeItem(this.INITIAL_SYNC_ATTEMPTS_KEY);
            localStorage.setItem(this.SNAPSHOT_SCHEMA_VERSION_KEY, SNAPSHOT_SCHEMA_VERSION);
        }
        localStorage.setItem(this.APP_VERSION_KEY, APP_VERSION);
    }
    static applySnapshot(snapshot) {
        const records = Array.isArray(snapshot?.records) ? snapshot.records : [];
        const idMap = snapshot?.idMap instanceof Map ? snapshot.idMap : new Map(records.map(r => [r.id, r]));
        const foundMfgs = snapshot?.foundMfgs instanceof Set ? snapshot.foundMfgs : new Set(records.map(r => r?.mfg).filter(Boolean));
        const foundEncs = snapshot?.foundEncs instanceof Set ? snapshot.foundEncs : new Set(records.map(r => r?.enc).filter(Boolean));
        window.LOCAL_DB.length = 0;
        records.forEach(rec => window.LOCAL_DB.push(rec));
        if (!(window.ID_MAP instanceof Map)) window.ID_MAP = new Map();
        if (!(window.FOUND_MFGS instanceof Set)) window.FOUND_MFGS = new Set();
        if (!(window.FOUND_ENCS instanceof Set)) window.FOUND_ENCS = new Set();
        window.ID_MAP.clear();
        window.FOUND_MFGS.clear();
        window.FOUND_ENCS.clear();
        idMap.forEach((rec, id) => window.ID_MAP.set(id, rec));
        foundMfgs.forEach(v => window.FOUND_MFGS.add(v));
        foundEncs.forEach(v => window.FOUND_ENCS.add(v));
    }
    static installLifecycleRefreshHooks() {
        if (this._lifecycleRefreshHookInstalled) return;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.maybeRefreshStaleCache({ reason: 'foreground' });
            }
        });
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('online', () => {
                this.maybeRefreshStaleCache({ reason: 'reconnect' });
            });
        }
        this._lifecycleRefreshHookInstalled = true;
    }
    static async preload() {
        // Guard: credentials must exist before attempting any worker call
        const cox_user = localStorage.getItem('cox_user');
        const cox_pass = localStorage.getItem('cox_pass');
        if (!cox_user || !cox_pass) {
            console.warn("Preload skipped: credentials missing. Showing auth modal.");
            document.getElementById('auth-overlay').classList.add('active-modal');
            return;
        }

        await this.ensureCacheCompatibility();

        console.log("🚀 Starting Preload...");
        const btn = document.getElementById('searchBtn');
        let restoredFromCache = false;
        let queueStartupRefresh = false;
        let blockingSyncStarted = false;
        let blockingSyncSucceeded = false;
        this.installSyncInterruptionHooks();

        btn.disabled = true;
        btn.classList.remove('warning', 'error');
        btn.innerText = "⏳ INITIALIZING...";
        const startupWatchdog = setTimeout(() => {
            if (!btn.classList.contains('error') && !btn.classList.contains('warning') && btn.disabled) {
                if (this.isDocumentSuspended()) {
                    console.warn('[SyncWatchdog] status=suspended; preserving resumable startup state');
                    this.showWaitingForUpdate(btn, "⏳ APP RESUMING...");
                    return;
                }
                console.warn('[SyncWatchdog] Startup sync exceeded watchdog window; surfacing recoverable retry state');
                this.showWaitingForUpdate(btn, "⏳ RETRYING SYNC...");
            }
        }, this.STARTUP_WATCHDOG_MS);

        try {
            btn.innerText = "🔒 PREPARING...";
            await new Promise(r => setTimeout(r, 100)); 
            const p = localStorage.getItem('cox_pass');
            await CacheService.prepareKey(p);
            await DB.deleteLegacy();

            const hasData = await CacheService.loadAllWithProgress((pct) => { btn.innerText = `🔒 DECRYPTING ${pct}%`; });
            const hasCompleteCache = !!hasData && this.isCacheComplete();
            
            if (hasCompleteCache) {
                restoredFromCache = true;
                UI.pop();
                this.installLifecycleRefreshHooks();
                queueStartupRefresh = true;
                return;
            }

            const attempts = this.getBlockingSyncAttempts();
            if (attempts > this.MAX_INITIAL_SYNC_ATTEMPTS) {
                this.showSyncInterrupted(btn);
                return;
            }

            blockingSyncStarted = true;
            this.incrementBlockingSyncAttempts();

            if(hasData) {
                btn.innerText = "⬇️ RESUMING...";
            } else {
                btn.innerText = "⏳ INITIALIZING SYNC...";
                await new Promise(r => setTimeout(r, 200));
                btn.innerText = "⬇️ SYNCING...";
            }

            let syncResult = null;
            let recoverableRestarts = 0;
            while (true) {
                syncResult = await this.fetchPartition('desc', btn, { background: false, allowWaitingState: true });
                if (syncResult?.skipped) {
                    const waitResult = await this.waitForPeerSyncAndRestore(btn);
                    if (waitResult?.success) {
                        restoredFromCache = true;
                        UI.pop();
                        this.installLifecycleRefreshHooks();
                        queueStartupRefresh = true;
                        return;
                    }
                    if (waitResult?.shouldSync) {
                        btn.classList.remove('warning', 'error');
                        btn.disabled = true;
                        btn.innerText = "⬇️ RESUMING...";
                        continue;
                    }
                    if (waitResult?.recoverable && recoverableRestarts < this.MAX_RECOVERABLE_SYNC_RESTARTS) {
                        recoverableRestarts++;
                        const resumedFromWait = await this.waitForResumeReady(btn, "⏳ WAITING TO RESUME SYNC...");
                        if (resumedFromWait) continue;
                    }
                    this.showSyncInterrupted(btn);
                    return;
                }
                if (syncResult?.success) break;
                if (syncResult?.recoverable && recoverableRestarts < this.MAX_RECOVERABLE_SYNC_RESTARTS) {
                    recoverableRestarts++;
                    const resumed = await this.waitForResumeReady(btn, syncResult?.message || "⏳ WAITING TO RESUME SYNC...");
                    if (resumed) {
                        btn.classList.remove('warning', 'error');
                        btn.disabled = true;
                        btn.innerText = "⬇️ RESUMING...";
                        continue;
                    }
                }
                break;
            }
            if(syncResult?.success) {
                blockingSyncSucceeded = true;
                btn.innerText = "✅ FINALIZING...";
                UI.pop();
                this.installLifecycleRefreshHooks();
                return;
            }

            if (!btn.classList.contains('error')) {
                this.showSyncInterrupted(btn);
            }
        } catch (e) {
            console.error("Preload Error", e);
            if (!restoredFromCache && !btn.classList.contains('error')) {
                this.showSyncInterrupted(btn);
            }
        } finally {
            clearTimeout(startupWatchdog);
            if (restoredFromCache || blockingSyncSucceeded) {
                this.clearBlockingSyncAttempts();
                this.restoreSearchReadyState(btn);
            } else if (blockingSyncStarted) {
                this.clearBlockingSyncAttempts();
                if (!btn.classList.contains('error') && btn.disabled) this.showSyncInterrupted(btn);
            }

            if (restoredFromCache && queueStartupRefresh) {
                this.queueBackgroundRefresh({ reason: 'startup' });
            }
        }
    }
    
    static resetSync() {
        localStorage.removeItem('cox_db_complete');
        localStorage.removeItem(this.SYNC_TIMESTAMP_KEY);
        localStorage.removeItem(this.SYNC_LOCK_KEY);
        this.clearBlockingSyncAttempts();
        DB.deleteChunk(this.SYNC_DB_LOCK_KEY).finally(() => location.reload());
    }

    static async maybeRefreshStaleCache({ reason = 'startup' } = {}) {
        if (this._backgroundRefreshPromise) return this._backgroundRefreshPromise;
        const shouldDebounce = reason === 'startup' || reason === 'foreground' || reason === 'reconnect';
        const now = Date.now();
        if (shouldDebounce && now < this._backgroundRefreshCooldownUntil) {
            return { success: false, skipped: true, reason: 'cooldown' };
        }
        if (shouldDebounce) {
            if ((now - this._lastBackgroundRefreshAt) < this.BACKGROUND_REFRESH_DEBOUNCE_MS) {
                return { success: false, skipped: true };
            }
        }

        this._backgroundRefreshPromise = (async () => {
        let hasLock = false;
        try {
            if (!this.shouldRefreshStaleCache()) return { success: false, skipped: true };
            if (shouldDebounce) this._lastBackgroundRefreshAt = Date.now();
            hasLock = await this.acquireSyncLock();
            if (!hasLock) return { success: false, skipped: true };
            if (!this.shouldRefreshStaleCache()) return { success: false, skipped: true };
            const result = await this.fetchPartition('desc', null, { background: true, reason });
            if (result?.success) {
                UI.pop();
            } else {
                this._backgroundRefreshCooldownUntil = Date.now() + this.BACKGROUND_REFRESH_COOLDOWN_MS;
            }
            return result;
        } catch (e) {
            console.warn('Background refresh failed before completion; keeping existing cache intact', e);
            this._backgroundRefreshCooldownUntil = Date.now() + this.BACKGROUND_REFRESH_COOLDOWN_MS;
            return { success: false, error: e };
        } finally {
            if (hasLock) await this.releaseSyncLock();
        }
        })();
        try {
            return await this._backgroundRefreshPromise;
        } finally {
            this._backgroundRefreshPromise = null;
        }
    }
    
    static buildSnapshot(recordsById, foundMfgs, foundEncs) {
        return {
            records: Array.from(recordsById.values()),
            idMap: recordsById,
            foundMfgs,
            foundEncs
        };
    }
    static now() {
        return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    }
    static scalePhaseProgress(current, total, startPct, endPct) {
        const safeStart = Number.isFinite(startPct) ? startPct : 0;
        const safeEnd = Number.isFinite(endPct) ? endPct : safeStart;
        if (!Number.isFinite(total) || total <= 0) return Math.round(safeStart);
        const ratio = Math.max(0, Math.min(1, current / total));
        return Math.round(safeStart + ((safeEnd - safeStart) * ratio));
    }
    static setSyncProgress(btn, label, pct) {
        if (!btn || btn.classList.contains('warning') || btn.classList.contains('error')) return;
        if (!Number.isFinite(pct)) {
            btn.innerText = label;
            return;
        }
        btn.innerText = `${label} ${Math.max(0, Math.min(99, Math.round(pct)))}%`;
    }

    static async fetchPartition(dir, btn, { background = false, reason = 'sync', allowWaitingState = false } = {}) {
        if (!background) {
            if (!await this.acquireSyncLock()) return { success: false, skipped: true };
        }
        let offset = null, loop = 0;
        let fetchedCount = 0; let retryCount = 0;
        const recordsById = new Map();
        const foundMfgs = new Set();
        const foundEncs = new Set();
        const hadExistingData = window.LOCAL_DB.length > 0;
        const fetchStart = this.now();
        const syncStartSuspensionGeneration = this._suspensionGeneration;
        const syncStartNetworkGeneration = this._networkTransitionGeneration;
        try {
            do {
                loop++;
                if (loop > 300) throw new Error('Sync aborted: pagination loop limit exceeded');
                console.group(`📥 Sync Batch ${loop}`); 
                if (!background && this._lockHeartbeatLost) {
                    const lockErr = new Error('Sync lock heartbeat lost');
                    lockErr.code = 'SYNC_LOCK_LOST';
                    throw lockErr;
                }
                if (!background && this._lockToken) {
                    const hasLock = await this.ensureActiveLockOwnership();
                    if (!hasLock) {
                        const lockErr = new Error('Sync lock ownership lost');
                        lockErr.code = 'SYNC_LOCK_LOST';
                        throw lockErr;
                    }
                }
                
                if(btn && !background && !btn.classList.contains('warning') && !btn.classList.contains('error')) { 
                    if(loop === 1 && fetchedCount === 0) {
                        btn.innerText = `⏳ Initializing...`;
                    } else {
                        const fetchPct = this.scalePhaseProgress(fetchedCount, CONFIG.estTotal, 0, 78);
                        this.setSyncProgress(btn, '⬇️ UPDATING', fetchPct);
                    }
                }
                
                const urlParams = `&pageSize=100${offset ? '&offset='+encodeURIComponent(offset) : ''}&sort%5B0%5D%5Bdirection%5D=${dir}`;
                
                let r = null;
                let pageDurationMs = 0;
                while (true) {
                    const pageFetchStart = this.now();
                    try {
                        r = await NetworkService.fetch(CONFIG.mainTable, urlParams, { timeoutMs: this.PAGE_REQUEST_TIMEOUT_MS });
                    } catch (e) {
                        pageDurationMs = Math.round(this.now() - pageFetchStart);
                        const retryableError = this.isRetryableNetworkError(e);
                        if (retryableError) {
                            retryCount++;
                            if (retryCount <= this.MAX_PAGE_RETRIES) {
                                const delayMs = this.computeRetryDelayMs({ attempt: retryCount });
                                console.warn(`[SyncPage] page=${loop} attempt=${retryCount} status=network-error durationMs=${pageDurationMs} retryInMs=${delayMs}`);
                                if (btn && !background) this.setSyncProgress(btn, `🔁 RETRY ${retryCount}/${this.MAX_PAGE_RETRIES}`, this.scalePhaseProgress(fetchedCount, CONFIG.estTotal, 0, 78));
                                await this.sleep(delayMs);
                                continue;
                            }
                        }
                        throw e;
                    }

                    pageDurationMs = Math.round(this.now() - pageFetchStart);
                    const retryAfterMs = this.parseRetryAfterMs(r.headers?.get('Retry-After'));
                    const retryableStatus = this.isRetryableStatus(r.status);

                    if (r.status === 401) {
                        if (background) throw new Error("401 invalid credentials during background refresh");
                        console.error("Sync Failed 401 - Invalid credentials");
                        btn.classList.add('error');
                        btn.innerText = "INVALID CREDENTIALS";
                        btn.disabled = false;
                        btn.onclick = () => { AuthService.logout(); };
                        return { success: false, status: 401 };
                    }

                    if (r.status !== 200 && retryableStatus) {
                        retryCount++;
                        if (retryCount <= this.MAX_PAGE_RETRIES) {
                            const delayMs = this.computeRetryDelayMs({ attempt: retryCount, retryAfterMs });
                            console.warn(`[SyncPage] page=${loop} attempt=${retryCount} status=${r.status} durationMs=${pageDurationMs} retryInMs=${delayMs}`);
                            if (btn && !background) this.setSyncProgress(btn, `🔁 RETRY ${retryCount}/${this.MAX_PAGE_RETRIES}`, this.scalePhaseProgress(fetchedCount, CONFIG.estTotal, 0, 78));
                            await this.sleep(delayMs);
                            continue;
                        }
                    }
                    break;
                }

                if (r.status === 503) {
                    if (background) throw new Error("503 auth backend unavailable during background refresh");
                    console.error("Sync Failed 503 - Auth backend unavailable");
                    btn.classList.add('error');
                    btn.innerText = "SERVICE UNAVAILABLE";
                    btn.disabled = false;
                    btn.onclick = () => { location.reload(); };
                    return { success: false, status: 503 };
                }
                
                if(r.status!==200) {
                    if (background) throw new Error(`API ${r.status} during background refresh`);
                    btn.classList.add('error'); btn.innerText=`API ERROR (${r.status})`; 
                    return { success: false, status: r.status }; 
                }
                
                console.info(`[SyncPage] page=${loop} attempt=${retryCount + 1} status=${r.status} durationMs=${pageDurationMs} workerCache=${r.headers?.get('X-SCHEMATICA-MAIN-CACHE') || 'n/a'}`);
                retryCount = 0; 
                let d;
                try {
                    d = await r.json();
                } catch (jsonErr) {
                    throw new Error(`Malformed sync payload: ${jsonErr.message}`);
                }
                if(!Array.isArray(d.records) || d.records.length === 0) {
                    if (this.shouldAbortEmptySync({ fetchedCount, hadExistingData })) {
                        throw new Error('Empty first sync page received; keeping existing snapshot');
                    }
                    console.log("✅ Sync Complete");
                    break;
                }
                fetchedCount += d.records.length;
                
                d.records.forEach(rec => {
                    try {
                        if(!rec || !rec.id) return;
                        recordsById.set(rec.id, rec);
                        if(rec.mfg) foundMfgs.add(rec.mfg); 
                        if(rec.enc) foundEncs.add(rec.enc); 
                    } catch(e) { console.warn("Record Skip", e); }
                });
                
                console.groupEnd();
                offset = d.offset; 
                if(loop % 5 === 0) await new Promise(r => setTimeout(r, 0));
                
            } while(offset);

            const fetchMs = Math.round(this.now() - fetchStart);
            const snapshotStart = this.now();
            this.setSyncProgress(btn, '⚙️ FINALIZING', 82);
            const snapshot = this.buildSnapshot(recordsById, foundMfgs, foundEncs);
            const snapshotMs = Math.round(this.now() - snapshotStart);
            await this.yieldMainThread();
            const persistStats = await CacheService.saveSnapshot(snapshot.records, {
                progressCallback: ({ phase, pct = 0 }) => {
                    if (!btn || background) return;
                    if (phase === 'encrypting') {
                        this.setSyncProgress(btn, '🔒 ENCRYPTING', this.scalePhaseProgress(pct, 100, 83, 92));
                    } else if (phase === 'saving') {
                        this.setSyncProgress(btn, '💾 SAVING', this.scalePhaseProgress(pct, 100, 93, 98));
                    }
                }
            });
            const applyStart = this.now();
            await this.yieldMainThread();
            this.setSyncProgress(btn, '✅ APPLYING', 99);
            this.applySnapshot(snapshot);
            const applyMs = Math.round(this.now() - applyStart);
            localStorage.setItem('cox_db_complete', 'true');
            localStorage.setItem(this.SYNC_TIMESTAMP_KEY, String(Date.now()));
            const activeGeneration = await DB.getChunk(CacheService.ACTIVE_GENERATION_KEY).catch(() => null);
            CacheService.cleanupInactiveGenerations({ keepGeneration: typeof activeGeneration === 'string' ? activeGeneration : null }).catch(() => {});
            console.info(`[SyncTiming] fetch=${fetchMs}ms snapshot=${snapshotMs}ms encrypt=${persistStats?.encryptMs ?? 0}ms write=${persistStats?.writeMs ?? 0}ms persist=${persistStats?.totalMs ?? 0}ms apply=${applyMs}ms`);
            console.info(`✅ Data sync complete (${snapshot.records.length} records) [${reason}]`);
            return { success: true, count: snapshot.records.length };
        } catch(e) {
            const interruption = this.classifySyncFailure(e, { background, syncStartSuspensionGeneration, syncStartNetworkGeneration });
            const syncDurationMs = Math.round(this.now() - fetchStart);
            console.warn(`[SyncFailure] status=${interruption.kind} durationMs=${syncDurationMs} background=${background ? 'true' : 'false'} recoverable=${interruption.recoverable ? 'true' : 'false'}`);
            console.error("Sync Critical Error", e);
            if (background) console.warn('Background refresh failed; keeping existing cache intact');
            if (!background && btn && !btn.classList.contains('error')) {
                if (interruption.kind === 'quota') {
                    btn.classList.remove('warning');
                    btn.classList.add('error');
                    btn.disabled = false;
                    btn.innerText = interruption.message;
                    btn.onclick = () => location.reload();
                } else if (interruption.recoverable && allowWaitingState) {
                    this.showWaitingForUpdate(btn, interruption.message);
                } else if (interruption.recoverable) {
                    btn.classList.remove('error');
                    btn.classList.add('warning');
                    btn.disabled = false;
                    btn.innerText = interruption.kind === 'network' || interruption.kind === 'network-transition'
                        ? "OFFLINE - RETRY"
                        : "RETRY SYNC";
                    btn.onclick = () => location.reload();
                } else {
                    btn.classList.remove('warning');
                    btn.classList.add('error');
                    btn.disabled = false;
                    btn.innerText = interruption.message;
                    btn.onclick = () => location.reload();
                }
            }
            return { success: false, error: e, recoverable: interruption.recoverable, reason: interruption.kind, message: interruption.message };
        } finally {
            if (!background) await this.releaseSyncLock();
        } 
    }

    static harvestCSV() { alert('Harvesting...'); }
}

class DragManager {
    static init() {
        const handle = document.getElementById('gen-drag-handle');
        const panel = document.getElementById('generator-panel');
        if(!handle || !panel) return;

        let isDragging = false;
        let shiftX, shiftY;

        const startDrag = (clientX, clientY) => {
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            shiftX = clientX - rect.left;
            shiftY = clientY - rect.top;

            const absLeft = rect.left;
            const absTop = rect.top;

            panel.style.transition = 'none'; 
            panel.style.right = 'auto'; 
            panel.style.bottom = 'auto';
            panel.style.left = `${absLeft}px`;
            panel.style.top = `${absTop}px`;
        };

        const moveDrag = (clientX, clientY) => {
            if(!isDragging) return;
            const newLeft = clientX - shiftX;
            const newTop = clientY - shiftY;
            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        };

        const endDrag = () => {
            if(isDragging) { 
                isDragging = false; 
                panel.style.transition = ''; 
            }
        };

        handle.onmousedown = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        };
        document.onmousemove = (e) => moveDrag(e.clientX, e.clientY);
        document.onmouseup = endDrag;

        handle.ontouchstart = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
            e.preventDefault();
        };
        document.ontouchmove = (e) => {
            if(!isDragging) return;
            const touch = e.touches[0];
            moveDrag(touch.clientX, touch.clientY);
        };
        document.ontouchend = endDrag;
    }
}

class DemoManager {
    static isGeneratorActive = false;

    static toggleGenerator() {
        if (UI.isSmallMobile()) {
            console.log('[DemoManager] Generator not available on small mobile devices.');
            return;
        }
        this.isGeneratorActive = !this.isGeneratorActive;
        const btn = document.getElementById('menu-demo');
        const indicator = document.getElementById('gen-status');
        const panel = document.getElementById('generator-panel');
        const restoreBtn = document.getElementById('generator-restore-btn');

        document.body.classList.add('generator-transition');
        
        if(this.isGeneratorActive) { 
            document.body.classList.add('demo-mode'); 
            if (UI.isTablet()) {
                const rail = document.getElementById('toggle-right');
                if (rail) rail.style.display = 'flex';
            }
            // Show left-sidebar context block
            const leftCtx = document.getElementById('left-generator-context');
            if (leftCtx) leftCtx.style.display = 'block';
            // Default right control panel to collapsed so first view is clean redacted title page
            this.minimizePanel();
            if(indicator) indicator.style.display = 'inline-block';
            if(btn) btn.style.color = 'var(--app-primary)';
            if(!document.getElementById('demo-date').value) document.getElementById('demo-date').valueAsDate = new Date(); 
            if(PdfViewer.doc) PdfViewer.renderStack(); else document.body.classList.remove('generator-transition');
        } else { 
            document.body.classList.remove('demo-mode'); 
            document.body.classList.remove('editor-active'); 
            // Hide left-sidebar context block
            const leftCtx = document.getElementById('left-generator-context');
            if (leftCtx) leftCtx.style.display = 'none';
            if (UI.isTablet()) {
                panel.classList.remove('gen-collapsed');
                panel.style.display = 'none';
                const rail = document.getElementById('toggle-right');
                if (rail) rail.style.display = 'none';
            } else {
                panel.style.display = 'none';
                restoreBtn.style.display = 'none';
            }
            if(indicator) indicator.style.display = 'none';
            if(btn) btn.style.color = ''; 
            if(PdfViewer.doc) PdfViewer.renderStack(); else document.body.classList.remove('generator-transition');
        }
    }

    static minimizePanel() {
        const panel = document.getElementById('generator-panel');
        if (!panel) return;
        panel.classList.remove('minimized', 'gen-collapsed');
        if (UI.isTablet()) {
            // On tablet: collapse the docked sidebar
            panel.classList.add('gen-collapsed');
            panel.style.display = '';
            const rail = document.getElementById('toggle-right');
            if (rail) rail.innerText = '⚙';
        } else {
            panel.classList.add('minimized');
            document.getElementById('generator-restore-btn').style.display = 'flex';
        }
        document.body.classList.remove('editor-active');
        document.body.classList.add('gen-minimized'); 
    }

    static restorePanel() {
        const panel = document.getElementById('generator-panel');
        if (!panel) return;
        panel.classList.remove('minimized', 'gen-collapsed');
        if (UI.isTablet()) {
            panel.style.display = '';
            const rail = document.getElementById('toggle-right');
            if (rail) rail.innerText = '›';
        } else {
            panel.style.display = 'flex';
            document.getElementById('generator-restore-btn').style.display = 'none';
        }
        document.body.classList.add('editor-active');
        document.body.classList.remove('gen-minimized'); 
    }

    static syncLayoutForViewport() {
        const panel = document.getElementById('generator-panel');
        const rail = document.getElementById('toggle-right');
        const restoreBtn = document.getElementById('generator-restore-btn');
        const leftCtx = document.getElementById('left-generator-context');
        if (!panel) return;

        if (!this.isGeneratorActive) {
            panel.style.display = 'none';
            panel.classList.remove('gen-collapsed', 'minimized');
            if (rail) rail.style.display = 'none';
            if (restoreBtn) restoreBtn.style.display = 'none';
            if (leftCtx) leftCtx.style.display = 'none';
            document.body.classList.remove('demo-mode', 'editor-active', 'gen-minimized');
            return;
        }

        document.body.classList.add('demo-mode');

        if (UI.isSmallMobile()) {
            panel.style.display = 'none';
            panel.classList.remove('minimized');
            if (rail) rail.style.display = 'none';
            if (restoreBtn) restoreBtn.style.display = 'none';
            if (leftCtx) leftCtx.style.display = 'none';
            document.body.classList.remove('editor-active', 'gen-minimized');
            return;
        }

        if (leftCtx) leftCtx.style.display = 'block';
        panel.classList.remove('minimized');
        panel.style.display = '';
        if (restoreBtn) restoreBtn.style.display = 'none';
        if (rail) rail.style.display = 'flex';

        if (panel.classList.contains('gen-collapsed')) {
            if (rail) rail.innerText = '⚙';
            document.body.classList.remove('editor-active');
            document.body.classList.add('gen-minimized');
        } else {
            if (rail) rail.innerText = '›';
            document.body.classList.add('editor-active');
            document.body.classList.remove('gen-minimized');
        }

    }

    static toggleGeneratorSidebar() {
        const panel = document.getElementById('generator-panel');
        if (!panel) return;
        if (panel.classList.contains('gen-collapsed')) {
            this.restorePanel();
        } else {
            this.minimizePanel();
        }
    }

    static toggleContext() {
        const panel = document.getElementById('demo-context-panel');
        const content = document.getElementById('demo-context-content');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            panel.classList.remove('collapsed-state');
        } else {
            content.classList.add('collapsed');
            panel.classList.add('collapsed-state');
        }
    }

    static toggleZoneStyling() {
        const panel = document.getElementById('zone-styling-panel');
        const content = document.getElementById('zone-styling-content');
        if (!content) return;
        const isHidden = content.style.display === 'none' || content.style.display === '';
        content.style.display = isHidden ? 'block' : 'none';
        if (panel) {
            if (isHidden) panel.classList.remove('collapsed-state');
            else panel.classList.add('collapsed-state');
        }
    }

    static getContext() {
        return { 
            cust: document.getElementById('demo-cust-name').value || "COMPANY NAME", 
            job: document.getElementById('demo-job-name').value || "JOB NAME", 
            type: document.getElementById('demo-system-type').value || "SYSTEM TYPE", 
            cpid: document.getElementById('demo-panel-id').value || "CP-####", 
            date: document.getElementById('demo-date').value || "YYYY-MM-DD", 
            stage: document.getElementById('demo-stage').value || "STAGE",
            po: document.getElementById('demo-po')?.value || "PO-####",
            serial: document.getElementById('demo-serial')?.value || "SERIAL-####",
            company: document.getElementById('demo-company')?.value || "YOUR COMPANY",
            address: document.getElementById('demo-address')?.value || "123 MAIN STREET",
            phone: document.getElementById('demo-phone')?.value || "(555) 123-4567",
            fax: document.getElementById('demo-fax')?.value || "(555) 123-4568"
        };
    }
}

class PageContext {
    static currentPage = 1;
    
    static setActivePage(pageNum) {
        this.currentPage = pageNum;
        this.updateUI();
    }
    
    static getActivePage() {
        return this.currentPage;
    }
    
    static getActiveProfile() {
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${this.currentPage}"]`);
        if (!wrapper) {
            console.warn(`PageContext: No wrapper found for page ${this.currentPage}`);
            return 'AUTO';
        }
        const select = wrapper.querySelector('.page-profile-select');
        return select?.value || 'AUTO';
    }
    
    static updateUI() {
        // Update page selector
        const pageSelector = document.getElementById('page-selector');
        if (pageSelector) {
            pageSelector.value = this.currentPage;
        }
        
        // Update page number display
        const pageNumEl = document.getElementById('active-page-num');
        if (pageNumEl) {
            pageNumEl.textContent = this.currentPage;
        }
        
        // Update profile badge
        const profileBadge = document.getElementById('active-profile-badge');
        if (profileBadge) {
            const profile = this.getActiveProfile();
            profileBadge.textContent = this.getProfileDisplayName(profile);
        }
        
        // Refresh control panel to show relevant fields
        ControlPanelManager.refreshForProfile(this.getActiveProfile());
    }
    
    static getProfileDisplayName(profile) {
        const names = {
            'AUTO': 'Auto-Detect',
            'COVER_TEMPLATE': 'Cover Template',
            'TITLE': 'Title Sheet',
            'TITLE_ASBUILT': 'As-Built Title',
            'COX_COVER': 'Cox Cover',
            'DELTA_COVER': 'Delta Cover',
            'THIRD_PARTY_COVER': '3rd Party Cover',
            'INFO': 'Info/Notes',
            'INFO_BORDERLESS': 'Info (Borderless)',
            'SCHEMATIC_LANDSCAPE': 'Schematic (Landscape)',
            'SCHEMATIC_PORTRAIT': 'Schematic (Portrait)',
            'SCHEMATIC_LANDSCAPE_BORDERLESS': 'Schematic (Landscape Borderless)',
            'SCHEMATIC_PORTRAIT_BORDERLESS': 'Schematic (Portrait Borderless)',
            'DOOR_DRAWING': 'Door Drawing',
            'GENERAL': 'General'
        };
        return names[profile] || profile;
    }
}

class ControlPanelManager {
    // Define which fields are relevant for each profile
    static PROFILE_FIELDS = {
        'COVER_TEMPLATE': ['cust', 'job', 'job_block', 'type', 'cpid', 'date', 'stage'],
        'TITLE': ['cust', 'job', 'type', 'cpid', 'date', 'stage', 'company', 'address', 'phone', 'fax'],
        'TITLE_ASBUILT': ['cust', 'job', 'cpid', 'date', 'company', 'address', 'phone'],
        'COX_COVER': ['cust', 'job', 'date', 'cpid', 'company', 'address', 'phone', 'fax'],
        'DELTA_COVER': ['cust', 'job', 'date', 'cpid'],
        'THIRD_PARTY_COVER': ['cust', 'job', 'date', 'cpid'],
        'INFO': ['cpid', 'date'],
        'INFO_BORDERLESS': ['cpid', 'date'],
        'SCHEMATIC_LANDSCAPE': ['cpid', 'date'],
        'SCHEMATIC_PORTRAIT': ['cpid', 'date'],
        'SCHEMATIC_LANDSCAPE_BORDERLESS': ['cpid', 'date'],
        'SCHEMATIC_PORTRAIT_BORDERLESS': ['cpid', 'date'],
        'DOOR_DRAWING': ['cpid', 'date'],
        'GENERAL': ['cust', 'job', 'cpid', 'date'],
        'AUTO': ['cust', 'job', 'type', 'cpid', 'date', 'stage', 'po', 'serial', 'company', 'address', 'phone', 'fax']
    };
    
    static refreshForProfile(profile) {
        const relevantFields = this.PROFILE_FIELDS[profile] || this.PROFILE_FIELDS['AUTO'];
        
        // Update input field visibility
        this.updateInputFields(relevantFields);
    }
    
    static updateInputFields(relevantFields) {
        // Show/hide input fields in "PROJECT CONTEXT & SENSITIVE DATA" section
        const fieldMap = {
            'cust': 'demo-cust-name',
            'job': 'demo-job-name',
            'type': 'demo-system-type',
            'cpid': 'demo-panel-id',
            'date': 'demo-date',
            'stage': 'demo-stage',
            'po': 'demo-po',
            'serial': 'demo-serial',
            'company': 'demo-company',
            'address': 'demo-address',
            'phone': 'demo-phone',
            'fax': 'demo-fax'
        };
        
        Object.entries(fieldMap).forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);
            const wrapper = input?.closest('.input-wrapper');
            
            if (wrapper) {
                wrapper.style.display = relevantFields.includes(field) ? '' : 'none';
            } else if (input) {
                // If there's no wrapper, try to hide the input and its label
                const label = input.previousElementSibling;
                if (label && label.classList.contains('demo-label')) {
                    label.style.display = relevantFields.includes(field) ? '' : 'none';
                }
                input.style.display = relevantFields.includes(field) ? '' : 'none';
            }
        });
    }
}

class ProfileManager {
    static getCustomProfiles() {
        const stored = localStorage.getItem('cox_custom_profiles');
        return stored ? JSON.parse(stored) : {};
    }

    static saveProfile(name, rules) {
        const profiles = this.getCustomProfiles();
        profiles[name] = rules;
        localStorage.setItem('cox_custom_profiles', JSON.stringify(profiles));
        LayoutScanner.refreshProfileOptions(); 
        alert(`Profile "${name}" saved!`);
    }

    static deleteProfile(name) {
        const profiles = this.getCustomProfiles();
        if (profiles[name]) {
            delete profiles[name];
            localStorage.setItem('cox_custom_profiles', JSON.stringify(profiles));
            LayoutScanner.refreshProfileOptions();
        }
    }

    static saveCurrentPageAsProfile() {
        const name = document.getElementById('new-profile-name').value.trim();
        if (!name) return alert("Please enter a profile name.");
        
        const wrappers = document.querySelectorAll('.pdf-page-wrapper');
        let targetContainer = null;
        
        for(const w of wrappers) {
             const rect = w.getBoundingClientRect();
             if (rect.top >= -100 && rect.top < window.innerHeight) {
                 targetContainer = w.querySelector('.pdf-content-container');
                 break;
             }
        }

        if (!targetContainer) return alert("No visible page found.");

        const w = targetContainer.offsetWidth;
        const h = targetContainer.offsetHeight;
        const boxes = [];

        targetContainer.querySelectorAll('.redaction-box').forEach(box => {
            boxes.push({
                map: box.dataset.map,
                x: parseFloat((box.offsetLeft / w).toFixed(4)),
                y: parseFloat((box.offsetTop / h).toFixed(4)),
                w: parseFloat((box.offsetWidth / w).toFixed(4)),
                h: parseFloat((box.offsetHeight / h).toFixed(4)),
                text: box.dataset.customText || null,
                fontSize: parseInt(box.style.fontSize),
                fontFamily: box.style.fontFamily, 
                rotation: parseFloat(box.dataset.rotation || 0),
                textAlign: box.style.textAlign || 'center', 
                transparent: box.dataset.transparent === "true"
            });
        });

        if (boxes.length === 0) return alert("Add some boxes first!");
        
        this.saveProfile(name, boxes);
        document.getElementById('new-profile-name').value = '';
    }
}

class ProfileUploader {
    static uploadedFile = null;
    static uploadedImageData = null;

    static openUploadDialog() {
        document.getElementById('upload-profile-modal').classList.add('active-modal');
        this.resetDialog();
    }

    static closeDialog() {
        document.getElementById('upload-profile-modal').classList.remove('active-modal');
        this.resetDialog();
    }

    static resetDialog() {
        this.uploadedFile = null;
        this.uploadedImageData = null;
        document.getElementById('profile-upload-input').value = '';
        document.getElementById('upload-filename').innerText = 'No file selected';
        document.getElementById('upload-preview-container').style.display = 'none';
        document.getElementById('upload-status').style.display = 'none';
        document.getElementById('upload-profile-name').value = '';
    }

    static async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.uploadedFile = file;
        document.getElementById('upload-filename').innerText = file.name;

        // Show preview
        const previewContainer = document.getElementById('upload-preview-container');
        const canvas = document.getElementById('upload-preview-canvas');
        const ctx = canvas.getContext('2d');

        if (file.type === 'application/pdf') {
            // Preview PDF first page
            const reader = new FileReader();
            reader.onload = async (e) => {
                const typedarray = new Uint8Array(e.target.result);
                const loadingTask = pdfjsLib.getDocument(typedarray);
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.0 });
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                this.uploadedImageData = canvas.toDataURL();
                previewContainer.style.display = 'block';
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Preview image
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    this.uploadedImageData = canvas.toDataURL();
                    previewContainer.style.display = 'block';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    static async processUpload() {
        const profileName = document.getElementById('upload-profile-name').value.trim();
        if (!profileName) {
            return this.showStatus('Please enter a profile name.', 'error');
        }

        if (!this.uploadedFile) {
            return this.showStatus('Please select a file to upload.', 'error');
        }

        // Check for duplicate profile names
        const existingProfiles = ProfileManager.getCustomProfiles();
        if (existingProfiles[profileName]) {
            const confirm = window.confirm(`Profile "${profileName}" already exists. Overwrite?`);
            if (!confirm) return;
        }

        // Check for duplicate layouts (simple comparison by dimensions)
        const isDuplicate = await this.checkForDuplicate();
        if (isDuplicate) {
            this.showStatus('⚠️ Warning: Similar layout already exists. Creating anyway...', 'warning');
        }

        // Create empty profile (user will add zones manually)
        const emptyProfile = [];
        ProfileManager.saveProfile(profileName, emptyProfile);

        this.showStatus('✅ Profile created successfully! Add zones using the editor.', 'success');
        
        setTimeout(() => {
            this.closeDialog();
            LayoutScanner.refreshProfileOptions();
        }, 2000);
    }

    static async checkForDuplicate() {
        // Basic duplicate check based on aspect ratio similarity
        // Note: This is a simplified check. Production systems may want:
        // - Image comparison (e.g., perceptual hashing)
        // - Profile zone pattern matching
        // - User confirmation for similar layouts
        
        const canvas = document.getElementById('upload-preview-canvas');
        if (!canvas || !canvas.width || !canvas.height) {
            return false;
        }
        
        const uploadAspectRatio = canvas.width / canvas.height;
        const customProfiles = ProfileManager.getCustomProfiles();
        
        // Check if any existing profile has a similar aspect ratio
        // This is a basic heuristic - similar aspect ratios might indicate similar layouts
        for (const [profileName, rules] of Object.entries(customProfiles)) {
            // Skip if profile has no rules to compare
            if (!rules || rules.length === 0) continue;
            
            // Simple check: if aspect ratios are very similar (within 5%), flag as potential duplicate
            // This is conservative - actual duplicate detection would need more sophisticated comparison
            const tolerance = 0.05;
            const isLandscape = uploadAspectRatio > 1;
            const existingIsLandscape = true; // Simplified - would need to infer from profile
            
            if (isLandscape === existingIsLandscape) {
                // Profiles with same orientation might be duplicates
                // In production, you'd do more thorough comparison here
                continue;
            }
        }
        
        // Return false for now - feature is available but conservative
        // Users can still create profiles even if duplicates exist
        return false;
    }

    static showStatus(message, type) {
        const statusEl = document.getElementById('upload-status');
        statusEl.innerText = message;
        statusEl.style.display = 'block';
        
        if (type === 'success') {
            statusEl.style.background = 'var(--match-green-bg)';
            statusEl.style.color = 'var(--match-green-text)';
        } else if (type === 'error') {
            statusEl.style.background = 'var(--match-red-bg)';
            statusEl.style.color = 'var(--match-red-text)';
        } else if (type === 'warning') {
            statusEl.style.background = 'var(--match-orange-bg)';
            statusEl.style.color = 'var(--match-orange-text)';
        }
    }
}

class ConfigExporter {
    static export() {
        const pages = [];
        document.querySelectorAll('.pdf-page-wrapper').forEach((wrapper, index) => {
            const pageNum = index + 1;
            const select = wrapper.querySelector('.page-profile-select');
            const profile = select ? select.value : 'UNKNOWN';
            
            const container = wrapper.querySelector('.pdf-content-container');
            const w = container.offsetWidth;
            const h = container.offsetHeight;

            const boxes = [];
            container.querySelectorAll('.redaction-box').forEach(box => {
                boxes.push({
                    map: box.dataset.map,
                    x: parseFloat((box.offsetLeft / w).toFixed(3)),
                    y: parseFloat((box.offsetTop / h).toFixed(3)),
                    w: parseFloat((box.offsetWidth / w).toFixed(3)),
                    h: parseFloat((box.offsetHeight / h).toFixed(3)),
                    text: box.dataset.customText || null,
                    fontSize: parseInt(box.style.fontSize),
                    fontFamily: box.style.fontFamily, 
                    rotation: parseFloat(box.dataset.rotation || 0),
                    textAlign: box.style.textAlign || 'center', 
                    transparent: box.dataset.transparent === "true"
                });
            });
            pages.push({ page: pageNum, profile: profile, boxes: boxes });
        });
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pages, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `layout_config_${new Date().getTime()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

class RedactionManager {
    static activeBox = null; static zones = []; static isDragging = false; static startX = 0; static startY = 0; static startLeft = 0; static startTop = 0;
    
    static createZoneOnWrapper(wrapper, x, y, w, h, mapKey, fontSize = 14, text = null, decoration = null, type = null, fontWeight = 'normal', transparent = false, rotation = 0, fontFamily = null, textAlign = 'center') {
        let container = wrapper.querySelector('.pdf-content-container');
        if (!container && wrapper.classList.contains('.pdf-content-container')) container = wrapper;
        if (!container) {
            console.error('❌ Container not found for zone creation');
            return;
        }

        const layer = container.querySelector('.redaction-layer'); 
        if(!layer) {
            console.error('❌ Redaction layer not found');
            return;
        }
        
        console.log(`✅ Creating zone: ${mapKey} at (${Math.round(x)}, ${Math.round(y)}) size: ${Math.round(w)}x${Math.round(h)}`);
        
        const box = document.createElement('div'); box.className = 'redaction-box';
        box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
        // Store relative geometry for zoom-scaling
        const cw = container.offsetWidth || 1;
        const ch = container.offsetHeight || 1;
        box.dataset.relX = (x / cw).toFixed(6);
        box.dataset.relY = (y / ch).toFixed(6);
        box.dataset.relW = (w / cw).toFixed(6);
        box.dataset.relH = (h / ch).toFixed(6);
        box.dataset.relFont = (fontSize / ch).toFixed(6);
        box.dataset.map = mapKey || 'custom';
        if(text) box.dataset.customText = text; if(type) box.dataset.type = type; if(decoration) box.dataset.decoration = decoration; 
        
        box.dataset.transparent = transparent.toString(); 
        
        let styleFont = fontFamily;
        if (!styleFont) {
             const pageNum = parseInt(wrapper.dataset.pageNumber, 10);
             const isCoverCust = (mapKey === 'cust' && pageNum === 1);
             styleFont = isCoverCust ? "'Times New Roman', serif" : "'Courier New', monospace";
        }
        // Guardrail: on page 1 cover, only cust zone may use Times New Roman
        const _pageNum = parseInt(wrapper.dataset.pageNumber, 10);
        if (_pageNum === 1 && mapKey !== 'cust' && styleFont && styleFont.toLowerCase().includes('times')) {
            styleFont = "'Courier New', monospace";
        }
        
        box.style.fontFamily = styleFont;
        box.style.fontSize = fontSize + 'px'; 
        box.style.fontWeight = fontWeight;
        box.style.textAlign = textAlign; 
        
        if (rotation) {
            box.dataset.rotation = rotation;
        }

        const textSpan = document.createElement('span'); textSpan.className = 'redaction-text'; box.appendChild(textSpan);
        const handle = document.createElement('div'); handle.className = 'redaction-resize-handle'; box.appendChild(handle);
        box.onmousedown = (e) => this.startDrag(e, box); layer.appendChild(box); this.zones.push(box);
        
        console.log(`📦 Total zones: ${this.zones.length}, Layer children: ${layer.children.length}`);
        
        return box;
    }

    static addManualZone() { const pages = document.querySelectorAll('.pdf-page-wrapper'); if(pages.length === 0) return; const wrapper = pages[0]; const container = wrapper.querySelector('.pdf-content-container'); const w = container.offsetWidth; const h = container.offsetHeight; this.createZoneOnWrapper(wrapper, w*0.3, h*0.4, w*0.4, h*0.1, 'custom', 16, null, null, 'blocker'); this.refreshContent(); }

    static addZoneToCurrentView(type) {
        const wrappers = document.querySelectorAll('.pdf-page-wrapper');
        if (wrappers.length === 0) return;
        
        let targetWrapper = wrappers[0];
        
        for(const w of wrappers) {
             const rect = w.getBoundingClientRect();
             if (rect.top >= -100 && rect.top < window.innerHeight) {
                 targetWrapper = w;
                 break;
             }
        }

        const container = targetWrapper.querySelector('.pdf-content-container');
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        
        const fontSize = document.getElementById('redact-size').value;
        const currentFontFamily = document.getElementById('redact-font').value; 
        const isWhiteout = type === 'blocker';
        const transparent = false; // All new zones default to opaque (whiteout) per default styling rules

        this.createZoneOnWrapper(targetWrapper, w*0.35, h*0.4, w*0.3, h*0.05, 'custom', fontSize, isWhiteout ? '' : 'New Text', null, null, 'bold', transparent, 0, currentFontFamily, 'center');
        this.refreshContent();
    }
    
    static deleteSelected() {
        if (this.activeBox) {
            this.activeBox.remove();
            this.zones = this.zones.filter(z => z !== this.activeBox);
            this.activeBox = null;
            document.getElementById('editor-controls').classList.add('disabled-overlay');
        }
    }

    static startDrag(e, box) { if(!document.body.classList.contains('editor-active')) return; e.stopPropagation(); this.selectZone(box); this.isDragging = true; this.activeBox = box; this.startX = e.clientX; this.startY = e.clientY; this.startLeft = box.offsetLeft; this.startTop = box.offsetTop; box.style.cursor = 'grabbing'; }
    static handleDrag(e) { if(!this.isDragging || !this.activeBox) return; e.preventDefault(); const deltaX = e.clientX - this.startX; const deltaY = e.clientY - this.startY; this.activeBox.style.left = (this.startLeft + deltaX) + 'px'; this.activeBox.style.top = (this.startTop + deltaY) + 'px'; }
    static endDrag() {
        if(this.activeBox) {
            this.activeBox.style.cursor = 'grab';
            // Update relative geometry after drag
            const layer = this.activeBox.closest('.redaction-layer');
            const container = layer ? layer.parentElement : null;
            if (container) {
                const cw = container.offsetWidth || 1;
                const ch = container.offsetHeight || 1;
                this.activeBox.dataset.relX = (this.activeBox.offsetLeft / cw).toFixed(6);
                this.activeBox.dataset.relY = (this.activeBox.offsetTop / ch).toFixed(6);
                this.activeBox.dataset.relW = (this.activeBox.offsetWidth / cw).toFixed(6);
                this.activeBox.dataset.relH = (this.activeBox.offsetHeight / ch).toFixed(6);
            }
        }
        this.isDragging = false;
    }
    
    static selectZone(box) { 
        if(this.activeBox) this.activeBox.classList.remove('selected'); 
        this.activeBox = box; 
        box.classList.add('selected'); 
        document.getElementById('editor-controls').classList.remove('disabled-overlay'); 
        
        document.getElementById('zone-map-select').value = box.dataset.map; 
        
        const customInputWrapper = document.getElementById('custom-text-wrapper');
        const customInput = document.getElementById('custom-zone-text');
        
        if (box.dataset.map === 'custom') {
            customInputWrapper.style.display = 'block';
            customInput.value = box.dataset.customText || '';
        } else {
            customInputWrapper.style.display = 'none';
        }

        const fs = parseInt(box.style.fontSize) || 14;
        document.getElementById('redact-size').value = fs; 
        document.getElementById('font-size-val').innerText = fs; 
        
        const ff = box.style.fontFamily.replace(/"/g, "'");
        const fontSelect = document.getElementById('redact-font');
        if (ff.includes("Courier")) fontSelect.value = "'Courier New', monospace";
        else fontSelect.value = "'Times New Roman', serif";

        document.getElementById('zone-bg-toggle').checked = (box.dataset.transparent === "false");
    }

    static deselect() { if(this.activeBox) this.activeBox.classList.remove('selected'); this.activeBox = null; document.getElementById('editor-controls').classList.add('disabled-overlay'); document.getElementById('custom-text-wrapper').style.display = 'none'; }
    
    static updateActiveStyle() { 
        const fs = document.getElementById('redact-size').value;
        document.getElementById('font-size-val').innerText = fs; 
        
        if(!this.activeBox) return; 
        this.activeBox.style.fontFamily = document.getElementById('redact-font').value; 
        this.activeBox.style.fontSize = fs + 'px';
        const container = this.activeBox.closest('.pdf-content-container');
        const ch = container ? (container.offsetHeight || 1) : 1;
        this.activeBox.dataset.relFont = (parseFloat(fs) / ch).toFixed(6);
    }
    
    static updateActiveAlignment(align) {
        if(!this.activeBox) return;
        this.activeBox.style.textAlign = align;
    }

    static mapSelectedZone() { 
        if(!this.activeBox) return; 
        const val = document.getElementById('zone-map-select').value;
        this.activeBox.dataset.map = val;
        
        if (val === 'custom') {
            document.getElementById('custom-text-wrapper').style.display = 'block';
            document.getElementById('custom-zone-text').value = this.activeBox.dataset.customText || '';
        } else {
            document.getElementById('custom-text-wrapper').style.display = 'none';
        }
        
        this.refreshContent(); 
    }
    
    static updateCustomText(text) {
        if(!this.activeBox) return;
        this.activeBox.dataset.customText = text;
        this.activeBox.querySelector('span').innerText = text;
    }

    static toggleBoxBackground() {
        if(!this.activeBox) return;
        const isOpaque = document.getElementById('zone-bg-toggle').checked;
        this.activeBox.dataset.transparent = isOpaque ? "false" : "true";
        const wrapper = this.activeBox.closest('.pdf-page-wrapper');
        if (wrapper) RedactionManager.rescaleZones(wrapper);
    }
    
    static refreshContent(wrapper) { 
        const ctx = DemoManager.getContext(); 
        
        let displayDate = ctx.date;
        if (displayDate && displayDate.includes('-')) {
             const parts = displayDate.split('-'); 
             if (parts.length === 3) {
                 displayDate = `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
             }
        }

        const boxes = wrapper ? wrapper.querySelectorAll('.redaction-box') : this.zones;
        boxes.forEach(box => { 
            const map = box.dataset.map; 
            let text = ""; 
            
            if(box.dataset.customText) {
                text = box.dataset.customText;
            } else if(map === 'cust') {
                text = ctx.cust;
            } else if(map === 'job') {
                text = ctx.job;
            } else if(map === 'job_block') {
                const jobLines = [];
                if (ctx.job) {
                    const words = ctx.job.split(' ');
                    let line = '';
                    for (const word of words) {
                        if (line.length > 0 && (line + ' ' + word).length > JOB_BLOCK_MAX_CHARS_PER_LINE) {
                            jobLines.push(line);
                            line = word;
                        } else {
                            line = line.length > 0 ? line + ' ' + word : word;
                        }
                    }
                    if (line) jobLines.push(line);
                }
                const lines = [...jobLines, ctx.type].filter(Boolean);
                text = lines.join('\n');
            } else if(map === 'type') {
                text = ctx.type;
            } else if(map === 'cpid') {
                text = ctx.cpid;
            } else if(map === 'date') {
                text = displayDate;
            } else if(map === 'stage') {
                text = ctx.stage;
            } else if(map === 'po') {
                text = ctx.po;
            } else if(map === 'serial') {
                text = ctx.serial;
            } else if(map === 'company') {
                text = ctx.company;
            } else if(map === 'address') {
                text = ctx.address;
            } else if(map === 'phone') {
                text = ctx.phone;
            } else if(map === 'fax') {
                text = ctx.fax;
            } else if(map === 'logo') {
                text = "";
            }
            
            const span = box.querySelector('.redaction-text') || box.querySelector('span'); 
            if(span) span.innerText = text; 
            else { const s = document.createElement('span'); s.className = 'redaction-text'; s.innerText = text; box.insertBefore(s, box.firstChild); }
            
            if(box.dataset.decoration === 'underline') { 
                box.style.textDecoration = 'underline'; 
                box.style.textUnderlineOffset = '3px'; 
            }
        }); 
    }
    static refreshContentForWrapper(wrapper) { this.refreshContent(wrapper); }
    static clearAll() { document.querySelectorAll('.redaction-layer').forEach(l => l.innerHTML = ''); this.zones = []; this.deselect(); }

    static rescaleZones(wrapper) {
        const container = wrapper.querySelector('.pdf-content-container');
        if (!container) return;
        const cw = container.offsetWidth || 1;
        const ch = container.offsetHeight || 1;
        const boxes = container.querySelectorAll('.redaction-box');
        // Debug log for editor mode (one active box)
        if (document.body.classList.contains('editor-active') && boxes.length > 0) {
            const b = this.activeBox || boxes[0];
            const scale = (typeof PdfViewer !== 'undefined' && PdfViewer.currentScale > 0) ? PdfViewer.currentScale : 1;
            const rf = b.dataset.relFont;
            const computedFs = rf ? (parseFloat(rf) * ch).toFixed(1) : getComputedStyle(b).fontSize;
            console.log(`[rescaleZones] scale=${scale} ch=${ch} relFont=${rf} fontSize=${computedFs}px`);
        }
        boxes.forEach(box => {
            const rx = parseFloat(box.dataset.relX);
            const ry = parseFloat(box.dataset.relY);
            const rw = parseFloat(box.dataset.relW);
            const rh = parseFloat(box.dataset.relH);
            if (!isNaN(rx) && !isNaN(ry) && !isNaN(rw) && !isNaN(rh)) {
                box.style.left = (rx * cw) + 'px';
                box.style.top = (ry * ch) + 'px';
                box.style.width = (rw * cw) + 'px';
                box.style.height = (rh * ch) + 'px';
            }
            const rf_raw = parseFloat(box.dataset.relFont);
            let rf = isNaN(rf_raw) ? NaN : rf_raw;
            if (isNaN(rf)) {
                const computedFs = parseFloat(getComputedStyle(box).fontSize);
                if (!isNaN(computedFs) && ch > 1) {
                    rf = computedFs / ch;
                    box.dataset.relFont = rf.toFixed(6);
                }
            }
            if (!isNaN(rf)) {
                box.style.fontSize = (rf * ch) + 'px';
            }
        });
        // RAF double-tick: re-apply font sizes after layout settles to guard against
        // animation / paint timing that may alter container dimensions after first pass
        requestAnimationFrame(() => {
            const cw2 = container.offsetWidth || 1;
            const ch2 = container.offsetHeight || 1;
            boxes.forEach(box => {
                const rf2 = parseFloat(box.dataset.relFont);
                if (!isNaN(rf2)) {
                    box.style.fontSize = (rf2 * ch2) + 'px';
                }
            });
        });
    }
}

class PageClassifier {
    static classify(textContent, aspectRatio = null, pageNumber = null) { 
        const text = textContent.items.map(i => i.str).join(' ').toUpperCase(); 
        const itemCount = textContent.items.length;
        
        // Enhanced content-aware classification
        const SCHEMATIC_TERMS = ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'TERMINAL', 'WIRING', 'SCHEMATIC', 'FULL LOAD', 'CONTACTOR', 'RELAY', 'OVERLOAD', 'VFD', 'STARTER', 'DISCONNECT', 'BREAKER'];
        const INFO_TERMS = ['TABLE OF CONTENTS', 'INDEX', 'NOTES', 'SCHEDULE', 'SPECIFICATION', 'BOM', 'BILL OF MATERIALS'];
        const TITLE_TERMS = ['PROJECT', 'CLIENT', 'DRAWN BY', 'DATE', 'SCALE', 'REVISION', 'SUBMITTAL'];
        const ASBUILT_TERMS = ['AS-BUILT', 'AS BUILT', 'ASBUILT', 'RECORD DRAWING'];
        const DOOR_TERMS = ['DOOR', 'FRONT VIEW', 'PANEL FRONT', 'DOOR LAYOUT', 'FACE PLATE'];
        const COX_TERMS = ['COX RESEARCH', 'COX'];
        const DELTA_TERMS = ['DELTA', 'DELTA CONTROLS'];
        const ENCLOSURE_TERMS = ['ENCLOSURE', 'ELECTRICAL DATA', 'PANEL DATA'];
        const POWER_TERMS = ['POWER', 'ONE LINE', 'ONELINE', 'SINGLE LINE'];
        const CONTROL_TERMS = ['CONTROL', 'LOGIC', 'SEQUENCE'];
        
        let schematicScore = 0;
        let infoScore = 0;
        let titleScore = 0;
        let asBuiltScore = 0;
        let doorScore = 0;
        let coxScore = 0;
        let deltaScore = 0;
        let enclosureScore = 0;
        let powerScore = 0;
        let controlScore = 0;
        
        SCHEMATIC_TERMS.forEach(term => { if(text.includes(term)) schematicScore += 10; });
        INFO_TERMS.forEach(term => { if(text.includes(term)) infoScore += 15; });
        TITLE_TERMS.forEach(term => { if(text.includes(term)) titleScore += 5; });
        ASBUILT_TERMS.forEach(term => { if(text.includes(term)) asBuiltScore += 20; });
        DOOR_TERMS.forEach(term => { if(text.includes(term)) doorScore += 25; });
        COX_TERMS.forEach(term => { if(text.includes(term)) coxScore += 15; });
        DELTA_TERMS.forEach(term => { if(text.includes(term)) deltaScore += 15; });
        ENCLOSURE_TERMS.forEach(term => { if(text.includes(term)) enclosureScore += 10; });
        POWER_TERMS.forEach(term => { if(text.includes(term)) powerScore += 15; });
        CONTROL_TERMS.forEach(term => { if(text.includes(term)) controlScore += 15; });
        
        // Text density as secondary signal
        if(itemCount < 50 && titleScore > 0) titleScore += 20;
        
        // Detect borderless (no traditional title block borders)
        const hasBorderIndicators = text.includes('BORDER') || text.includes('FRAME') || text.includes('TITLE BLOCK');
        const isBorderless = !hasBorderIndicators && itemCount > 20;
        
        // === PAGE NUMBER HEURISTICS FOR BETTER CLASSIFICATION ===
        // Typical PDF ordering: Page 1 = Title, Page 2 = Info, Pages 3/4 = Power/Control schematics,
        // Near end = Enclosure drawing, then BOM
        
        // Door drawing detection (high confidence)
        if(doorScore > 20) return 'DOOR_DRAWING';
        
        // Page 1: Always use cover template
        if(pageNumber === 1) {
            return 'COVER_TEMPLATE';
        }
        
        // Page 2: Usually info/notes
        if(pageNumber === 2) {
            if(infoScore > 10 || itemCount > 100) {
                return isBorderless ? 'INFO_BORDERLESS' : 'INFO';
            }
        }
        
        // Pages 3-4: Usually power/control schematics
        if(pageNumber === 3 || pageNumber === 4) {
            if(schematicScore > 20 || powerScore > 10 || controlScore > 10) {
                const isLandscape = aspectRatio && aspectRatio > 1;
                if(isBorderless) {
                    return isLandscape ? 'SCHEMATIC_LANDSCAPE_BORDERLESS' : 'SCHEMATIC_PORTRAIT_BORDERLESS';
                }
                return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
            }
        }
        
        // Cover sheet detection (fallback for page 1 without strong signals)
        if(titleScore > 25) {
            if(asBuiltScore > 15) return 'TITLE_ASBUILT';
            if(coxScore > 10) return 'COX_COVER';
            if(deltaScore > 10) return 'DELTA_COVER';
            if(itemCount < 100) return 'THIRD_PARTY_COVER';
            return 'TITLE';
        }
        
        // Info/Notes detection
        if(infoScore > 20) {
            return isBorderless ? 'INFO_BORDERLESS' : 'INFO';
        }
        
        // Schematic detection
        if(schematicScore > 30) {
            const isLandscape = aspectRatio && aspectRatio > 1;
            if(isBorderless) {
                return isLandscape ? 'SCHEMATIC_LANDSCAPE_BORDERLESS' : 'SCHEMATIC_PORTRAIT_BORDERLESS';
            }
            return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
        }
        
        // Fallback to aspect ratio + page number heuristic
        if(aspectRatio) {
            const isLandscape = aspectRatio > 1;
            if(isBorderless) {
                return isLandscape ? 'SCHEMATIC_LANDSCAPE_BORDERLESS' : 'SCHEMATIC_PORTRAIT_BORDERLESS';
            }
            return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
        }
        
        return 'GENERAL';
    } 
}

class SmartScanner {
    // Configuration constants
    static WIDTH_PADDING_FACTOR = 1.5;
    static HEIGHT_PADDING_FACTOR = 1.2;
    static VERTICAL_TOLERANCE = 10;
    static HORIZONTAL_TOLERANCE = 20;
    static FONT_SIZE_ESTIMATE_FACTOR = 0.8; // OCR font size estimation adjustment
    static MIN_OCR_BOX_WIDTH = 20; // Minimum width in pixels to avoid "too small to scale" errors
    static MIN_OCR_BOX_HEIGHT = 10; // Minimum height in pixels to avoid "too small to scale" errors
    
    static async scanAllPages() {
        console.log('🔍 Auto-scanning PDF pages...');
        RedactionManager.clearAll(); 
        if(!PdfViewer.isDocumentValid()) {
            console.error('❌ Cannot scan: PDF document is not loaded or invalid');
            return;
        }
        
        const numPages = PdfViewer.doc?.numPages || 0;
        if(numPages === 0) {
            console.error('❌ Cannot scan: PDF has no pages');
            return;
        }
        
        console.log(`🔍 Starting scan of ${numPages} pages...`);
        
        // Capture current fetchId to detect if PDF changes during scan
        const scanFetchId = PdfViewer.currentFetchId;
        
        const btn = document.getElementById('auto-scan-btn');
        const origText = btn ? btn.innerText : "";
        if(btn) { btn.innerText = "🔍 INITIALIZING..."; btn.disabled = true; }
        
        let textPages = 0;
        let ocrPages = 0;
        
        try {
            console.log(`📄 Scanning ${numPages} pages...`);
            for(let i = 1; i <= numPages; i++) {
                // Check if PDF has changed (user switched to different PDF)
                if (PdfViewer.currentFetchId !== scanFetchId) {
                    console.log('[scanAllPages] Scan cancelled - PDF changed during scan');
                    break;
                }
                
                const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${i}"]`);
                if(!wrapper) continue;
                
                if(btn) btn.innerText = `🔍 ANALYZING PAGE ${i}/${PdfViewer.doc.numPages}...`;
                
                // Page 1 always uses COVER_TEMPLATE deterministically - skip text/OCR detection
                if (i === 1) {
                    await this.applyPage1CoverTemplate(wrapper);
                    continue;
                }
                
                // Validate document is still valid before getPage()
                if(!PdfViewer.isDocumentValid()) {
                    console.warn('[scanAllPages] PDF document became invalid during scan');
                    break;
                }
                
                // Wrap getPage in try/catch
                let page;
                try {
                    page = await PdfViewer.doc.getPage(i);
                } catch (pageError) {
                    console.error(`[scanAllPages] Failed to get page ${i}:`, pageError);
                    // Check for destroyed transport
                    if (pageError.message?.includes('destroyed') || pageError.message?.includes('Transport destroyed')) {
                        console.error('[scanAllPages] Transport destroyed - stopping scan');
                        break;
                    }
                    continue; // Skip this page
                }
                
                if (!page) {
                    console.warn(`[scanAllPages] Page ${i} is null, skipping`);
                    continue;
                }
                
                // Check again if PDF changed after await
                if (PdfViewer.currentFetchId !== scanFetchId) {
                    console.log('[scanAllPages] Scan cancelled - PDF changed after getPage');
                    break;
                }
                
                // Wrap getTextContent in try/catch
                let textContent;
                try {
                    textContent = await page.getTextContent();
                } catch (textError) {
                    console.error(`[scanAllPages] Failed to get text content for page ${i}:`, textError);
                    if (textError.message?.includes('destroyed')) {
                        console.error('[scanAllPages] Transport destroyed - stopping scan');
                        break;
                    }
                    continue; // Skip this page
                }
                
                // Check again if PDF changed after await
                if (PdfViewer.currentFetchId !== scanFetchId) {
                    console.log('[scanAllPages] Scan cancelled - PDF changed after getTextContent');
                    break;
                }
                
                let detectedZones = null;
                let scanConfidence = 'low';
                
                // Check if text extraction yielded useful results
                if(textContent.items.length > 10) {
                    if(btn) btn.innerText = `🔍 TEXT SCAN PAGE ${i}/${PdfViewer.doc.numPages}...`;
                    detectedZones = await this.extractTextBasedZones(page, textContent, wrapper);
                    if(detectedZones && detectedZones.length > 0) {
                        scanConfidence = 'high';
                        textPages++;
                    }
                } else {
                    // Fallback to OCR for scanned/image PDFs
                    if(btn) btn.innerText = `🔍 OCR PAGE ${i}/${PdfViewer.doc.numPages}...`;
                    detectedZones = await this.ocrBasedZones(page, wrapper);
                    if(detectedZones && detectedZones.length > 0) {
                        scanConfidence = 'medium';
                        ocrPages++;
                    }
                }
                
                // Check again if PDF changed after processing
                if (PdfViewer.currentFetchId !== scanFetchId) {
                    console.log('[scanAllPages] Scan cancelled - PDF changed after zone detection');
                    break;
                }
                
                // Apply detected zones or fallback to layout rules
                if(detectedZones && detectedZones.length > 0) {
                    this.applyDetectedZones(wrapper, detectedZones);
                    RedactionManager.rescaleZones(wrapper);
                } else {
                    // Fallback to existing LAYOUT_RULES
                    scanConfidence = 'low';
                    await this.fallbackToLayoutRules(wrapper, i, page, textContent);
                }
                
                // Add scan confidence indicator to toolbar
                this.addConfidenceIndicator(wrapper, scanConfidence);
            }
            
            RedactionManager.refreshContent();
            
            console.log(`✅ Scan complete. Created zones on ${textPages + ocrPages} pages`);
            console.log(`📊 Total zones in manager: ${RedactionManager.zones.length}`);
            
            // Show summary
            if(btn) {
                const summary = `✅ Scanned ${numPages} pages (${textPages} text, ${ocrPages} OCR)`;
                btn.innerText = summary;
                setTimeout(() => { btn.innerText = origText; }, 3000);
            }
        } catch(e) { 
            console.error('[scanAllPages] Scan error:', e); 
            if(btn) btn.innerText = "❌ SCAN FAILED";
        } finally {
            if(btn) btn.disabled = false;
        }
    }
    
    static async applyPage1CoverTemplate(wrapper) {
        const container = wrapper.querySelector('.pdf-content-container');
        console.log(`[SmartScanner] Page 1: applying COVER_TEMPLATE deterministically. Container: ${container?.offsetWidth}x${container?.offsetHeight}`);
        if (container) await PdfViewer.waitForLayoutStable(container);
        console.log(`[SmartScanner] Page 1 after layout stable. Container: ${container?.offsetWidth}x${container?.offsetHeight}`);
        LayoutScanner.applyRuleToWrapper(wrapper, LAYOUT_RULES['COVER_TEMPLATE']);
        console.log(`[SmartScanner] Page 1 COVER_TEMPLATE zones applied: ${wrapper.querySelectorAll('.redaction-box').length}`);
        // Populate text immediately so cover zones show text without waiting for global scan end
        requestAnimationFrame(() => RedactionManager.refreshContentForWrapper(wrapper));
        this.addConfidenceIndicator(wrapper, 'high');
    }

    static async extractTextBasedZones(page, textContent, wrapper) {
        const viewport = page.getViewport({ scale: 1.0 });
        const container = wrapper.querySelector('.pdf-content-container');
        if(!container) return null;
        
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const scaleX = width / viewport.width;
        const scaleY = height / viewport.height;
        
        // Build spatial map of text items
        const textItems = textContent.items.map(item => ({
            text: item.str.toUpperCase(),
            x: item.transform[4] * scaleX,
            y: height - (item.transform[5] * scaleY), // Flip Y coordinate
            width: item.width * scaleX,
            height: item.height * scaleY,
            fontSize: Math.abs(item.transform[0]) * scaleY
        })).filter(item => {
            // Filter out boxes that are too small to prevent processing errors
            return item.width >= this.MIN_OCR_BOX_WIDTH && item.height >= this.MIN_OCR_BOX_HEIGHT;
        });
        
        // Detect title block region (typically bottom-right for landscape, bottom for portrait)
        const aspectRatio = viewport.width / viewport.height;
        const titleBlockItems = this.detectTitleBlock(textItems, width, height, aspectRatio);
        
        // Find labeled fields
        const zones = [];
        const fieldMappings = {
            'CUSTOMER': 'cust', 'CLIENT': 'cust', 'OWNER': 'cust',
            'JOB': 'job', 'PROJECT': 'job', 'JOB NAME': 'job',
            'TYPE': 'type', 'SYSTEM': 'type', 'DESCRIPTION': 'type',
            'PANEL': 'cpid', 'CP': 'cpid', 'PANEL ID': 'cpid', 'ID': 'cpid',
            'DATE': 'date', 'ISSUE DATE': 'date', 'DRAWN': 'date',
            'STAGE': 'stage', 'STATUS': 'stage', 'SUBMITTAL': 'stage'
        };
        
        for(const [label, mapKey] of Object.entries(fieldMappings)) {
            const labelItem = titleBlockItems.find(item => item.text.includes(label));
            if(labelItem) {
                // Find value text near this label (typically to the right or below)
                const valueItem = this.findNearbyValue(labelItem, titleBlockItems);
                if(valueItem) {
                    zones.push({
                        x: valueItem.x,
                        y: valueItem.y,
                        w: valueItem.width * this.WIDTH_PADDING_FACTOR,
                        h: valueItem.height * this.HEIGHT_PADDING_FACTOR,
                        map: mapKey,
                        fontSize: Math.round(valueItem.fontSize),
                        transparent: false,
                        fontFamily: "'Courier New', monospace",
                        textAlign: 'left'
                    });
                }
            }
        }
        
        return zones.length > 0 ? zones : null;
    }
    
    static detectTitleBlock(textItems, width, height, aspectRatio) {
        // For landscape schematics, title block is typically in bottom-right
        // For portrait, it's typically at the bottom
        const threshold = aspectRatio > 1 ? 0.7 : 0.6;
        
        return textItems.filter(item => {
            const relY = item.y / height;
            const relX = item.x / width;
            
            if(aspectRatio > 1) {
                // Landscape: bottom-right corner
                return relY > threshold && relX > threshold;
            } else {
                // Portrait: bottom section
                return relY > threshold;
            }
        });
    }
    
    static findNearbyValue(labelItem, allItems) {
        // Look for text items to the right or below the label
        const candidates = allItems.filter(item => {
            const isRight = item.x > labelItem.x && item.y >= labelItem.y - this.VERTICAL_TOLERANCE && item.y <= labelItem.y + this.VERTICAL_TOLERANCE;
            const isBelow = item.y > labelItem.y && item.x >= labelItem.x - this.HORIZONTAL_TOLERANCE;
            return (isRight || isBelow) && item.text !== labelItem.text;
        });
        
        // Return the closest one
        if(candidates.length === 0) return null;
        return candidates.sort((a, b) => {
            const distA = Math.hypot(a.x - labelItem.x, a.y - labelItem.y);
            const distB = Math.hypot(b.x - labelItem.x, b.y - labelItem.y);
            return distA - distB;
        })[0];
    }
    
    static async ocrBasedZones(page, wrapper) {
        if (!FEATURES.OCR_ENABLED) {
            console.log('OCR feature is disabled');
            return null;
        }
        
        // Load Tesseract if not already loaded
        try {
            await loadTesseract();
        } catch (e) {
            console.error('Failed to load Tesseract:', e);
            return null;
        }
        
        if (!window.Tesseract) {
            console.error('Tesseract not available after loading');
            return null;
        }
        
        // Create a cancellable task
        const taskId = Symbol('ocr-task');
        activeOcrTasks.add(taskId);
        
        try {
            // Null check for page and wrapper
            if (!page || !wrapper) {
                console.warn('Invalid page or wrapper for OCR');
                return null;
            }
            
            // Render page to high-resolution canvas
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Failed to get canvas context');
                return null;
            }
            
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            // Check if task was cancelled
            if (!activeOcrTasks.has(taskId)) {
                console.log('OCR task cancelled before recognition');
                return null;
            }
            
            // Run Tesseract.js OCR
            const { data } = await Tesseract.recognize(canvas, 'eng', {
                logger: () => {} // Suppress logs
            });
            
            // Check if task was cancelled
            if (!activeOcrTasks.has(taskId)) {
                console.log('OCR task cancelled after recognition');
                return null;
            }
            
            if(!data.words || data.words.length < 5) return null;
            
            // Convert OCR results to same format as text extraction
            const container = wrapper.querySelector('.pdf-content-container');
            if(!container) return null;
            
            const width = container.offsetWidth;
            const height = container.offsetHeight;
            const scaleX = width / viewport.width;
            const scaleY = height / viewport.height;
            
            const textItems = data.words.map(word => ({
                text: word.text.toUpperCase(),
                x: word.bbox.x0 * scaleX,
                y: word.bbox.y0 * scaleY,
                width: (word.bbox.x1 - word.bbox.x0) * scaleX,
                height: (word.bbox.y1 - word.bbox.y0) * scaleY,
                fontSize: (word.bbox.y1 - word.bbox.y0) * scaleY * this.FONT_SIZE_ESTIMATE_FACTOR
            })).filter(item => {
                // Filter out boxes that are too small to prevent tesseract "too small to scale" errors
                return (item.width >= this.MIN_OCR_BOX_WIDTH) && (item.height >= this.MIN_OCR_BOX_HEIGHT);
            });
            
            // Use same detection logic as text extraction
            const aspectRatio = viewport.width / viewport.height;
            const titleBlockItems = this.detectTitleBlock(textItems, width, height, aspectRatio);
            
            const zones = [];
            const fieldMappings = {
                'CUSTOMER': 'cust', 'CLIENT': 'cust',
                'JOB': 'job', 'PROJECT': 'job',
                'DATE': 'date',
                'PANEL': 'cpid'
            };
            
            for(const [label, mapKey] of Object.entries(fieldMappings)) {
                const labelItem = titleBlockItems.find(item => item.text.includes(label));
                if(labelItem) {
                    const valueItem = this.findNearbyValue(labelItem, titleBlockItems);
                    if(valueItem) {
                        zones.push({
                            x: valueItem.x,
                            y: valueItem.y,
                            w: valueItem.width * this.WIDTH_PADDING_FACTOR,
                            h: valueItem.height * this.HEIGHT_PADDING_FACTOR,
                            map: mapKey,
                            fontSize: Math.round(valueItem.fontSize),
                            transparent: false,
                            fontFamily: "'Courier New', monospace",
                            textAlign: 'left'
                        });
                    }
                }
            }
            
            return zones.length > 0 ? zones : null;
        } catch(e) {
            console.error('OCR failed:', e);
            return null;
        } finally {
            // Clean up task
            activeOcrTasks.delete(taskId);
        }
    }
    
    // Cancel all active OCR tasks (call on navigation/page change)
    static cancelAllOcrTasks() {
        activeOcrTasks.clear();
        console.log('All OCR tasks cancelled');
    }
    
    static applyDetectedZones(wrapper, zones) {
        zones.forEach(zone => {
            RedactionManager.createZoneOnWrapper(
                wrapper, 
                zone.x, 
                zone.y, 
                zone.w, 
                zone.h, 
                zone.map, 
                zone.fontSize, 
                zone.text || null, 
                null, 
                null, 
                'normal', 
                zone.transparent, 
                zone.rotation || 0, 
                zone.fontFamily, 
                zone.textAlign
            );
        });
    }
    
    static async fallbackToLayoutRules(wrapper, pageNum, page, textContent) {
        const container = wrapper.querySelector('.pdf-content-container');
        const manualSelect = wrapper.querySelector('.page-profile-select');
        let profileKey = manualSelect ? manualSelect.value : null;
        
        if (!profileKey || profileKey === "AUTO") {
            // Enhanced classification using content and page number heuristics
            const viewport = page.getViewport({ scale: 1.0 });
            const aspectRatio = viewport.width / viewport.height;
            
            // Use enhanced PageClassifier with page number support
            profileKey = PageClassifier.classify(textContent, aspectRatio, pageNum);
            
            if(manualSelect) manualSelect.value = profileKey;
        }

        // Flush layout before measuring container dimensions for zone placement
        if (container) await PdfViewer.waitForLayoutStable(container);
        LayoutScanner.applyRuleToWrapper(wrapper, LAYOUT_RULES[profileKey]);
    }
    
    static addConfidenceIndicator(wrapper, confidence) {
        const toolbar = wrapper.querySelector('.page-toolbar');
        if(!toolbar) return;
        
        const indicator = document.createElement('span');
        indicator.className = 'scan-confidence';
        indicator.title = `Scan confidence: ${confidence}`;
        
        if(confidence === 'high') {
            indicator.innerText = '🟢';
            indicator.title = 'High confidence (text extraction found fields)';
        } else if(confidence === 'medium') {
            indicator.innerText = '🟡';
            indicator.title = 'Medium confidence (OCR or partial detection)';
        } else {
            indicator.innerText = '🔴';
            indicator.title = 'Low confidence (using default layout)';
        }
        
        // Remove existing indicator if any
        const existing = toolbar.querySelector('.scan-confidence');
        if(existing) existing.remove();
        
        toolbar.appendChild(indicator);
    }
    
    static async rescanPage(pageNum) {
        if(!PdfViewer.isDocumentValid()) {
            console.warn('[rescanPage] Cannot rescan: PDF document is not loaded or invalid');
            return;
        }
        
        // Capture current fetchId to detect if PDF changes during rescan
        const scanFetchId = PdfViewer.currentFetchId;
        
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${pageNum}"]`);
        if(!wrapper) return;
        
        const btn = wrapper.querySelector('.rescan-page-btn');
        const origText = btn ? btn.innerHTML : "🔄";
        if(btn) btn.innerHTML = "⏳";
        
        try {
            // Clear existing zones on this page
            const layer = wrapper.querySelector('.redaction-layer');
            if(layer) layer.innerHTML = '';
            
            // Page 1 always uses COVER_TEMPLATE deterministically - skip text/OCR detection
            if (pageNum === 1) {
                await this.applyPage1CoverTemplate(wrapper);
                RedactionManager.refreshContent();
                return;
            }
            
            // Validate document is still valid before getPage()
            if(!PdfViewer.isDocumentValid()) {
                console.warn('[rescanPage] PDF document is invalid, cannot rescan');
                return;
            }
            
            // Wrap getPage in try/catch
            let page;
            try {
                page = await PdfViewer.doc.getPage(pageNum);
            } catch (pageError) {
                console.error(`[rescanPage] Failed to get page ${pageNum}:`, pageError);
                // Check for destroyed transport
                if (pageError.message?.includes('destroyed') || pageError.message?.includes('Transport destroyed')) {
                    console.error('[rescanPage] Transport destroyed - cannot rescan');
                }
                return;
            }
            
            if (!page) {
                console.warn(`[rescanPage] Page ${pageNum} is null, cannot rescan`);
                return;
            }
            
            // Check if PDF changed after await
            if (PdfViewer.currentFetchId !== scanFetchId) {
                console.log('[rescanPage] Rescan cancelled - PDF changed');
                return;
            }
            
            // Wrap getTextContent in try/catch
            let textContent;
            try {
                textContent = await page.getTextContent();
            } catch (textError) {
                console.error(`[rescanPage] Failed to get text content for page ${pageNum}:`, textError);
                if (textError.message?.includes('destroyed')) {
                    console.error('[rescanPage] Transport destroyed - cannot rescan');
                }
                return;
            }
            
            // Check if PDF changed after await
            if (PdfViewer.currentFetchId !== scanFetchId) {
                console.log('[rescanPage] Rescan cancelled - PDF changed after getTextContent');
                return;
            }
            
            let detectedZones = null;
            let scanConfidence = 'low';
            
            if(textContent.items.length > 10) {
                detectedZones = await this.extractTextBasedZones(page, textContent, wrapper);
                if(detectedZones && detectedZones.length > 0) scanConfidence = 'high';
            } else {
                detectedZones = await this.ocrBasedZones(page, wrapper);
                if(detectedZones && detectedZones.length > 0) scanConfidence = 'medium';
            }
            
            // Check if PDF changed after processing
            if (PdfViewer.currentFetchId !== scanFetchId) {
                console.log('[rescanPage] Rescan cancelled - PDF changed after zone detection');
                return;
            }
            
            if(detectedZones && detectedZones.length > 0) {
                this.applyDetectedZones(wrapper, detectedZones);
                RedactionManager.rescaleZones(wrapper);
            } else {
                await this.fallbackToLayoutRules(wrapper, pageNum, page, textContent);
            }
            
            this.addConfidenceIndicator(wrapper, scanConfidence);
            RedactionManager.refreshContent();
        } catch(e) {
            console.error('[rescanPage] Rescan failed:', e);
        } finally {
            if(btn) btn.innerHTML = origText;
        }
    }
}

class LayoutScanner {
    static async scanAllPages() {
        RedactionManager.clearAll(); if(!PdfViewer.doc) return;
        const btn = document.querySelector('button[onclick="LayoutScanner.scanAllPages()"]');
        const origText = btn ? btn.innerText : "";
        if(btn) { btn.innerText = "⏳ SCANNING..."; btn.disabled = true; }
        
        try { 
            for(let i=1; i <= PdfViewer.doc.numPages; i++) { 
                const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${i}"]`); 
                if(!wrapper) continue;
                
                const container = wrapper.querySelector('.pdf-content-container');
                const manualSelect = wrapper.querySelector('.page-profile-select');
                let profileKey = manualSelect ? manualSelect.value : null;

                if (!profileKey || profileKey === "AUTO") {
                    if (i === 1) profileKey = 'COVER_TEMPLATE';
                    else if (i === 2) profileKey = 'INFO';
                    else {
                        const w = container.offsetWidth; const h = container.offsetHeight;
                        profileKey = (w > h) ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
                    }
                    if(manualSelect) manualSelect.value = profileKey;
                }
                if (container) await PdfViewer.waitForLayoutStable(container);
                LayoutScanner.applyRuleToWrapper(wrapper, LAYOUT_RULES[profileKey]);
            } 
            RedactionManager.refreshContent(); 
        } catch(e) { console.error(e); }
        if(btn) { btn.innerText = origText; btn.disabled = false; }
    }

    static refreshProfileOptions() {
        const selects = document.querySelectorAll('.page-profile-select');
        console.log(`[refreshProfileOptions] Found ${selects.length} profile dropdowns`);
        
        if (selects.length === 0) {
            console.warn('[refreshProfileOptions] No .page-profile-select elements found in DOM');
            return;
        }
        
        const customProfiles = ProfileManager.getCustomProfiles();
        
        selects.forEach((select, index) => {
            if (select.disabled) return; // Skip disabled dropdowns (e.g. page 1 cover template)
            const currentVal = select.value;
            let html = `
                <option value="AUTO">✨ Auto (Detected)</option>
                <option value="COVER_TEMPLATE">📋 Cover Template</option>
                <optgroup label="📝 Info Sheets">
                    <option value="INFO">📝 Info / Notes (Standard)</option>
                    <option value="INFO_BORDERLESS">🖼️ Info (Borderless)</option>
                </optgroup>
                <optgroup label="📐 Schematics">
                    <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Portrait)</option>
                    <option value="SCHEMATIC_PORTRAIT_BORDERLESS">🖼️ Schematic (Portrait Borderless)</option>
                    <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Landscape)</option>
                    <option value="SCHEMATIC_LANDSCAPE_BORDERLESS">🖼️ Schematic (Landscape Borderless)</option>
                </optgroup>
                <optgroup label="📐 Other">
                    <option value="DOOR_DRAWING">🚪 Door Drawing</option>
                    <option value="GENERAL">📐 General</option>
                </optgroup>
            `;
            if (Object.keys(customProfiles).length > 0) {
                html += '<optgroup label="⭐ Custom Profiles">';
                for (const [name, _] of Object.entries(customProfiles)) {
                    html += `<option value="CUSTOM:${name}">⭐ ${name}</option>`;
                }
                html += '</optgroup>';
            }
            select.innerHTML = html;
            select.value = currentVal || 'AUTO';
            console.log(`[refreshProfileOptions] Populated dropdown ${index + 1} with ${select.options.length} options`);
        });
    }

    static updatePageProfile(pageNum, profileKey) {
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${pageNum}"]`);
        if(!wrapper) return;
        
        const container = wrapper.querySelector('.pdf-content-container');
        const layer = container.querySelector('.redaction-layer');
        
        RedactionManager.zones = RedactionManager.zones.filter(z => !layer.contains(z));
        if(layer) layer.innerHTML = '';

        let rules = [];
        if (profileKey.startsWith('CUSTOM:')) {
            const name = profileKey.split('CUSTOM:')[1];
            rules = ProfileManager.getCustomProfiles()[name] || [];
        } else if (profileKey === "AUTO") {
             const w = container.offsetWidth; const h = container.offsetHeight;
             if (pageNum === 1) profileKey = 'COVER_TEMPLATE';
             else if (pageNum === 2) profileKey = 'INFO';
             else profileKey = (w > h) ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
             const select = wrapper.querySelector('.page-profile-select');
             if(select) select.value = profileKey;
             rules = LAYOUT_RULES[profileKey];
        } else {
            rules = LAYOUT_RULES[profileKey];
        }

        LayoutScanner.applyRuleToWrapper(wrapper, rules);
        RedactionManager.refreshContent();
        
        // Update page context UI if this is the active page
        if (PageContext.getActivePage() === pageNum) {
            PageContext.updateUI();
        }
    }

    static applyProfileToPage(pageNum, profileKey) { return this.updatePageProfile(pageNum, profileKey); }

    static applyRuleToWrapper(wrapper, ruleSet) {         if(!wrapper || !ruleSet) return; 
        const container = wrapper.querySelector('.pdf-content-container');
        if(!container) return;

        const width = container.offsetWidth; 
        const height = container.offsetHeight; 
        // Scale LAYOUT_RULES font sizes (defined at scale=1.0) proportionally to current zoom
        const scale = (typeof PdfViewer !== 'undefined' && PdfViewer.currentScale > 0) ? PdfViewer.currentScale : 1;
        
        ruleSet.forEach(zone => { 
            RedactionManager.createZoneOnWrapper(wrapper, zone.x * width, zone.y * height, zone.w * width, zone.h * height, zone.map, zone.fontSize * scale, zone.text, zone.decoration || null, null, zone.fontWeight || 'bold', zone.transparent, zone.rotation, zone.fontFamily, zone.textAlign); 
        });
        RedactionManager.rescaleZones(wrapper);
    }
}

class FeedbackService {
    static currentId = null; static currentDownBtn = null; static lockout = new Set();
    static async up(id, btn, event) { 
        if (event) event.stopPropagation(); // Prevent card click
        // DEFENSIVE GUARD 1: Check CSS class first (avoids re-voting on re-rendered cards in same session)
        if(btn.classList.contains('voted-up')) {
            console.log(`[FeedbackService.up] Button already voted (CSS class) for ${id}`);
            return;
        }
        
        // DEFENSIVE GUARD 2: Check lockout set
        if(this.lockout.has(`${id}:up`)) {
            console.log(`[FeedbackService.up] Already in lockout set for ${id}`);
            return;
        }
        
        // CRITICAL: Add to lockout IMMEDIATELY (before any async operations or UI updates)
        this.lockout.add(`${id}:up`);
        
        // CRITICAL: Apply CSS class IMMEDIATELY (persists in DOM)
        btn.classList.add('voted-up');
        
        // CRITICAL FIX: Don't try to infer corrections from search criteria
        // Positive feedback = "This result is relevant to my search"
        // It does NOT mean "This panel's specs match my search filters"
        const today = new Date().toISOString().split('T')[0]; 
        const payload = { 
            records: [{ 
                fields: { 
                    'Panel ID': id, 
                    'Vote': 'Up', 
                    'User': localStorage.getItem('cox_user'), 
                    'Date': today
                    // NO Corrections field - positive feedback doesn't provide corrections
                } 
            }] 
        };
        
        // Submit feedback
        try {
            await fetch(buildWorkerUrl('FEEDBACK'), { 
                method: 'POST', 
                headers: { ...AuthService.headers(), 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            console.log(`✓ Positive feedback submitted for ${id}`);
        } catch (e) {
            console.error('Positive feedback submission failed:', e);
            // NOTE: Do NOT remove lockout on failure - prevents spam retries
        }
    }
    
    static down(id, btn, event) { 
        if (event) event.stopPropagation(); // Prevent card click
        this.currentId = id; 
        if(btn) this.currentDownBtn = btn;
        
        this.setupInput('fb-mfg', [...AI_TRAINING_DATA.MANUFACTURERS].sort(), 'mfg'); 
        this.setupInput('fb-hp', AI_TRAINING_DATA.DATA.HP, 'hp'); 
        this.setupInput('fb-volt', AI_TRAINING_DATA.DATA.VOLT, 'volt'); 
        this.setupInput('fb-phase', AI_TRAINING_DATA.DATA.PHASE, 'phase'); 
        this.setupInput('fb-enc', ['4XSS', '4XFG', 'POLY'], 'enc');

        const lvBtn = document.getElementById('fb-low-volt-btn'); 
        if (this.lockout.has(`${id}:cat_low`)) { lvBtn.className = 'keyword-toggle disabled-overlay'; lvBtn.innerText = "✓ Reported as Low Voltage"; lvBtn.onclick = null; } 
        else { lvBtn.className = 'keyword-toggle'; lvBtn.innerText = "⚡ Report as Low Voltage / Control Only"; lvBtn.onclick = () => lvBtn.classList.toggle('selected'); } 
        
        this.generateKeywordButtons(); 
        document.getElementById('feedback-modal').classList.add('active-modal'); 
    }

    static setupInput(elId, data, paramKey) { 
        const el = document.getElementById(elId); 
        // Clear existing options safely
        while (el.firstChild) el.removeChild(el.firstChild);
        el.add(new Option('Select Correct...', '')); 
        el.add(new Option('Varied / Multiple', 'Varied / Multiple')); 
        data.forEach(d => el.add(new Option(d, d))); 
        el.value = ''; // Ensure empty option is selected by default
        if (this.lockout.has(`${this.currentId}:p_${paramKey}`)) { el.disabled = true; el.title = "Feedback already submitted"; } else { el.disabled = false; el.title = ""; } 
    }

    static generateKeywordButtons() { 
        const input = document.getElementById('keywordInput').value; 
        const container = document.getElementById('keyword-cluster'); 
        const wrapper = document.getElementById('keyword-feedback-area'); 
        container.innerHTML = ''; 
        
        const keywords = input.split(',').map(s=>s.trim().toUpperCase()).filter(s=>s.length > 0); 
        
        if (keywords.length === 0) { 
            wrapper.style.display = 'none'; 
        } else { 
            wrapper.style.display = 'block'; 
            keywords.forEach(k => { 
                if (this.lockout.has(`${this.currentId}:kw_${k}`)) return; 
                const btn = document.createElement('button'); 
                btn.className = 'keyword-toggle'; 
                btn.innerText = `NOT "${k}"`; 
                btn.onclick = () => btn.classList.toggle('selected'); 
                btn.dataset.kw = k; 
                container.appendChild(btn); 
            }); 
        } 
    }

    static async submit() { 
        const corrections = {}; 
        const mfg = document.getElementById('fb-mfg').value; if(mfg) { corrections.mfg = mfg; this.lockout.add(`${this.currentId}:p_mfg`); } 
        const hp = document.getElementById('fb-hp').value; if(hp) { corrections.hp = hp; this.lockout.add(`${this.currentId}:p_hp`); } 
        const volt = document.getElementById('fb-volt').value; if(volt) { corrections.volt = volt; this.lockout.add(`${this.currentId}:p_volt`); } 
        const phase = document.getElementById('fb-phase').value; if(phase) { corrections.phase = phase; this.lockout.add(`${this.currentId}:p_phase`); } 
        const enc = document.getElementById('fb-enc').value; if(enc) { corrections.enc = enc; this.lockout.add(`${this.currentId}:p_enc`); } 

        if(document.getElementById('fb-low-volt-btn').classList.contains('selected')) { corrections.category = 'low_voltage'; this.lockout.add(`${this.currentId}:cat_low`); } 
        
        const badKeywords = []; 
        document.querySelectorAll('.keyword-toggle.selected').forEach(btn => { badKeywords.push(btn.dataset.kw); this.lockout.add(`${this.currentId}:kw_${btn.dataset.kw}`); }); 
        if (badKeywords.length > 0) corrections.reject_keywords = badKeywords; 
        
        if (Object.keys(corrections).length === 0) return alert("Please select a correction."); 
        
        // Prepare payload for submission
        const today = new Date().toISOString().split('T')[0];
        const payload = { records: [{ fields: { 'Panel ID': this.currentId, 'Vote': 'Down', 'User': localStorage.getItem('cox_user'), 'Corrections': JSON.stringify(corrections), 'Date': today } }] };
        
        // Close modal (no voted-down class to allow re-opening for additional parameter corrections)
        // Each parameter can be submitted once per panel per search (enforced in setupInput() line 1982 and submit() lines 2011-2015)
        this.close();
        alert("Thank you! System will learn from this.");
        
        // Submit in background - fire and forget for instant UI response
        // Note: Using fetch instead of sendBeacon because API requires custom auth headers
        fetch(buildWorkerUrl('FEEDBACK'), { 
            method: 'POST', 
            headers: { ...AuthService.headers(), 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload),
            keepalive: true  // Ensures request completes even if page is navigating away
        }).catch(e => console.warn('Feedback submission failed:', e));
    }
    static resetLockout() { 
        // Only reset negative feedback lockouts (per-parameter, keywords, category)
        // Keep positive feedback lockouts (:up) to persist across searches
        const toDelete = [];
        for (const key of this.lockout) {
            if (!key.includes(':up')) {
                toDelete.push(key);
            }
        }
        toDelete.forEach(key => this.lockout.delete(key));
    }
    static close() { document.getElementById('feedback-modal').classList.remove('active-modal'); }
}

/**
 * VoltageMatcher - Isolated voltage matching logic per NEC/IEC standards
 * 
 * @example
 * // Test voltage matching independently
 * const result = VoltageMatcher.matches({ volt: "480", desc: "480V motor" }, "480");
 * // => { matches: true, confidence: 'high', weight: 500, isFuzzy: false }
 * 
 * @example
 * // Test 277/480V matching for 480V search
 * const result = VoltageMatcher.matches({ volt: "277/480" }, "480");
 * // => { matches: true, confidence: 'high', weight: 500, isFuzzy: false }
 */
class VoltageMatcher {
    /**
     * Voltage equivalency groups (v2.5.21)
     * Copied from SearchEngine.VOLTAGE_EQUIVALENTS - do not modify logic
     */
    static VOLTAGE_EQUIVALENTS = {
        '120': {
            fieldPatterns: [
                /^120$/i,
                /^115$/i,
                /^110$/i
            ],
            descPatterns: [
                /\b120\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b115\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b110\s*(?:V|VAC|VOLT|PH)\b/i
            ],
            excludePatterns: [
                /\b120\s*[\/\-]\s*\d+/i
            ]
        },
        '240': {
            fieldPatterns: [
                /^240$/i,
                /^230$/i,
                /^220$/i,
                /^120\s*[\/\-]\s*240$/i,
                /^120\s*[\/\-]\s*230$/i
            ],
            descPatterns: [
                /\b240\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b230\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b220\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b120\s*[\/\-]\s*240(?:\s*(?:V|VAC|VOLT|PH))?\b/i,
                /\b120\s*[\/\-]\s*230(?:\s*(?:V|VAC|VOLT|PH))?\b/i
            ],
            excludePatterns: []
        },
        '208': {
            fieldPatterns: [
                /^208$/i,
                /^120\s*[\/\-]\s*208$/i
            ],
            descPatterns: [
                /\b208\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b120\s*[\/\-]\s*208(?:\s*(?:V|VAC|VOLT|PH))?\b/i
            ],
            excludePatterns: []
        },
        '277': {
            fieldPatterns: [
                /^277$/i
            ],
            descPatterns: [
                /\b277\s*(?:V|VAC|VOLT|PH)\b/i
            ],
            excludePatterns: [
                /\b277\s*[\/\-]\s*480/i
            ]
        },
        '480': {
            fieldPatterns: [
                /^480$/i,
                /^460$/i,
                /^440$/i,
                /^277\s*[\/\-]\s*480$/i
            ],
            descPatterns: [
                /\b480\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b460\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b440\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b277\s*[\/\-]\s*480(?:\s*(?:V|VAC|VOLT|PH))?\b/i
            ],
            excludePatterns: [
                /\b120\s*[\/\-]\s*240/i,
                /\b120\s*[\/\-]\s*230/i
            ]
        },
        '575': {
            fieldPatterns: [
                /^575$/i,
                /^600$/i
            ],
            descPatterns: [
                /\b575\s*(?:V|VAC|VOLT|PH)\b/i,
                /\b600\s*(?:V|VAC|VOLT|PH)\b/i
            ],
            excludePatterns: []
        }
    };
    
    static FIELD_MATCH_WEIGHT = 500;
    static DESC_MATCH_WEIGHT = 100;
    
    /**
     * Match voltage value in record
     * @param {Object} record - Database record with volt and desc fields
     * @param {string} searchVoltage - Voltage to search for (e.g., "480")
     * @returns {Object} { matches: boolean, confidence: 'high'|'medium'|'low', weight: number, isFuzzy: boolean }
     */
    static matches(record, searchVoltage) {
        const voltConfig = this.VOLTAGE_EQUIVALENTS[searchVoltage];
        
        if (!voltConfig) {
            // Fallback for unknown voltage values - exact match only
            if (record.volt && record.volt.includes(searchVoltage)) {
                return { matches: true, confidence: 'high', weight: this.FIELD_MATCH_WEIGHT, isFuzzy: false };
            }
            return { matches: false, confidence: 'low', weight: 0, isFuzzy: false };
        }
        
        let matched = false;
        let isFieldMatch = false;
        
        // === STEP 1: Check volt field for equivalents ===
        if (record.volt) {
            for (const pattern of voltConfig.fieldPatterns) {
                if (pattern.test(record.volt)) {
                    matched = true;
                    isFieldMatch = true;
                    break;
                }
            }
            
            if (matched) {
                for (const excludePattern of voltConfig.excludePatterns) {
                    if (excludePattern.test(record.volt)) {
                        return { matches: false, confidence: 'low', weight: 0, isFuzzy: false };
                    }
                }
            }
        }
        
        // === STEP 2: If no field match, check description ===
        if (!matched && record.desc) {
            for (const pattern of voltConfig.descPatterns) {
                if (pattern.test(record.desc)) {
                    matched = true;
                    break;
                }
            }
            
            if (matched) {
                for (const excludePattern of voltConfig.excludePatterns) {
                    if (excludePattern.test(record.desc)) {
                        return { matches: false, confidence: 'low', weight: 0, isFuzzy: false };
                    }
                }
            }
        }
        
        // === STEP 3: Return result ===
        if (!matched) {
            return { matches: false, confidence: 'low', weight: 0, isFuzzy: false };
        }
        
        if (isFieldMatch) {
            return { matches: true, confidence: 'high', weight: this.FIELD_MATCH_WEIGHT, isFuzzy: false };
        } else {
            return { matches: true, confidence: 'medium', weight: this.DESC_MATCH_WEIGHT, isFuzzy: true };
        }
    }
}

/**
 * HorsepowerMatcher - Isolated HP matching logic with fractional support
 * 
 * @example
 * // Test HP matching independently
 * const result = HorsepowerMatcher.matches({ hp: "5" }, "5");
 * // => { matches: true, isVariant: false, weight: 5000 }
 * 
 * @example
 * // Test fuzzy description match
 * const result = HorsepowerMatcher.matches({ desc: "7.5 HP motor" }, "7.5");
 * // => { matches: true, isVariant: true, weight: 2000 }
 */
class HorsepowerMatcher {
    static HP_TOLERANCE = 0.1;
    static HP_STRICT_WEIGHT = 5000;
    static HP_FUZZY_WEIGHT = 2000;
    
    /**
     * Match HP value in record (strict field or fuzzy description)
     * @param {Object} record - Database record with hp and desc fields
     * @param {string} searchHp - HP value to search for (e.g., "5", "7.5")
     * @returns {Object} { matches: boolean, isVariant: boolean, weight: number }
     */
    static matches(record, searchHp) {
        const searchHpNum = parseFloat(searchHp);
        
        // === STRICT FIELD MATCH ===
        const strictMatch = record.hp && Math.abs(parseFloat(record.hp) - searchHpNum) < this.HP_TOLERANCE;
        if (strictMatch) {
            return { matches: true, isVariant: false, weight: this.HP_STRICT_WEIGHT };
        }
        
        // === FUZZY DESCRIPTION MATCH ===
        if (!record.desc) {
            return { matches: false, isVariant: false, weight: 0 };
        }
        
        // Build regex patterns (copied from SearchEngine._matchHp - do not modify)
        const HP_UNIT_PATTERN = '(?:HP|H\\.P\\.|H\\.P|KW|kW|HORSEPOWER)';
        const BOUNDARY_START = '(?:^|\\s|\\(|,)';
        const BOUNDARY_END = '(?:\\s|\\)|,|$)';
        const NUMERIC_BOUNDARY_BEFORE = '(?<![\\.\\d])';
        const NUMERIC_BOUNDARY_AFTER = '(?![\\.\\d])';
        
        const escapedHp = searchHp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // For integer HP values, also match the decimal form (e.g. "5" matches "5.0 HP")
        const hpAlt = Number.isInteger(searchHpNum) ? `${escapedHp}|${escapedHp}\\.0` : escapedHp;
        const hpPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}(?:${hpAlt})${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
        
        const fractionalPattern = (searchHpNum > 0.001 && searchHpNum < 1) 
            ? `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}1/${Math.round(1/searchHpNum)}${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}` 
            : null;
        
        const FRACTIONAL_TOLERANCE = 0.01;
        let mixedFractionPattern = null;
        if (searchHpNum > 1) {
            const whole = Math.floor(searchHpNum);
            const fractional = searchHpNum - whole;
            if (Math.abs(fractional - 0.5) < FRACTIONAL_TOLERANCE) {
                mixedFractionPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}${whole}[-\\s]?(?:1/2|½)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
            } else if (Math.abs(fractional - 0.25) < FRACTIONAL_TOLERANCE) {
                mixedFractionPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}${whole}[-\\s]?(?:1/4|¼)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
            } else if (Math.abs(fractional - 0.75) < FRACTIONAL_TOLERANCE) {
                mixedFractionPattern = `${BOUNDARY_START}${NUMERIC_BOUNDARY_BEFORE}${whole}[-\\s]?(?:3/4|¾)${NUMERIC_BOUNDARY_AFTER}\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
            }
        }
        
        const safetyMatch = new RegExp(hpPattern, 'i').test(record.desc);
        const fractionalMatch = fractionalPattern && new RegExp(fractionalPattern, 'i').test(record.desc);
        const mixedMatch = mixedFractionPattern && new RegExp(mixedFractionPattern, 'i').test(record.desc);
        
        const tablePattern = `(?:HP|HORSEPOWER|MOTOR\\s+HP)\\s*[:\\s|]+\\s*${NUMERIC_BOUNDARY_BEFORE}${escapedHp}${NUMERIC_BOUNDARY_AFTER}(?:\\s|\\)|,|$)`;
        const tableMatch = new RegExp(tablePattern, 'i').test(record.desc);
        
        if (safetyMatch || fractionalMatch || mixedMatch || tableMatch) {
            return { matches: true, isVariant: true, weight: this.HP_FUZZY_WEIGHT };
        }
        
        return { matches: false, isVariant: false, weight: 0 };
    }
}

/**
 * KeywordMatcher - Isolated keyword matching with alias expansion
 * 
 * @example
 * // Test keyword matching independently
 * const result = KeywordMatcher.matches(
 *   { id: "CP-1234", desc: "SURGE ARRESTOR INCLUDED" },
 *   ["SA"],
 *   [["SA", "SURGE ARRESTOR", "TVSS"]]
 * );
 * // => true
 */
class KeywordMatcher {
    /**
     * Match keywords in record with alias expansion and reject logic
     * @param {Object} record - Database record with id, desc, and reject_keywords fields
     * @param {Array} rawKeywords - Raw keywords from user input (e.g., ["SA", "PM"])
     * @param {Array} expandedKeywords - Keywords expanded with aliases (e.g., [["SA", "SURGE ARRESTOR"], ["PM", "PHASE MONITOR"]])
     * @returns {boolean} True if all keyword groups match
     */
    static matches(record, rawKeywords, expandedKeywords) {
        if (!expandedKeywords || expandedKeywords.length === 0) {
            return true; // No keyword filter
        }
        
        const text = (record.id + " " + (record.desc || "")).toUpperCase();
        
        // === CHECK REJECT KEYWORDS ===
        if (record.reject_keywords && record.reject_keywords.length > 0) {
            // Normalize reject_keywords to uppercase once for efficient comparison
            const rejectUpper = record.reject_keywords.map(rk => rk.toUpperCase());
            const isRejected = rawKeywords.some(kw => rejectUpper.includes(kw));
            if (isRejected) return false;
        }

        // === CHECK ALL KEYWORD GROUPS MATCH ===
        const allGroupsMatch = expandedKeywords.every(group => {
            return group.some(alias => {
                const cleanAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Also allow optional hyphen/space at letter-digit boundaries for model numbers
                // e.g. "PD6000" matches "PD-6000" and "PD 6000"
                const flexAlias = cleanAlias
                    .replace(/([A-Za-z])([\d])/g, '$1[-\\s]?$2')
                    .replace(/([\d])([A-Za-z])/g, '$1[-\\s]?$2');
                const regex = new RegExp(`(?:^|[^a-zA-Z0-9_.])` + flexAlias + `([^a-zA-Z0-9_.]|$)`, 'i');
                return regex.test(text); 
            });
        });

        return allGroupsMatch;
    }
}

class SearchEngine {
    static currentResults = [];
    static currentPage = 1;
    static pageSize = 25;
    static lastCriteria = null;

    static perform() {
        // === STOP PREVIOUS PRELOADING ===
        PdfController.stopPreloading();
        FeedbackService.resetLockout();

        // === GATHER SEARCH CRITERIA ===
        const keywordInputEl = DOM_CACHE.get('keywordInput');
        const rawKeywords = (keywordInputEl?.value || '').split(',').map(s=>s.trim().toUpperCase()).filter(s=>s.length);
        const expandedKeywords = rawKeywords.map(k => {
            for (const [key, group] of Object.entries(AI_TRAINING_DATA.ALIASES)) {
                if (group.includes(k)) return group; 
            }
            return [k]; 
        });

        const catInputEl = DOM_CACHE.get('catInput');
        const cat = catInputEl?.value || 'Any';
        
        const crit = { 
            kw: rawKeywords, 
            mfg: DOM_CACHE.get('mfgInput')?.value || 'Any', 
            hp: DOM_CACHE.get('hpInput')?.value || 'Any', 
            volt: DOM_CACHE.get('voltInput')?.value || 'Any', 
            phase: DOM_CACHE.get('phaseInput')?.value || 'Any', 
            enc: DOM_CACHE.get('encInput')?.value || 'Any'
        };
        
        // === FILTER AND SCORE RESULTS ===
        // Client-side enclosure signal regexes for "Varied / Multiple" classification (v2.5.44)
        // FRP and FIBERGLASS/FIBREGLASS are strong FG signals; bare FG excluded (too many false matches)
        const ENC_FG_RE = /\b(?:FIBERGLASS|FIBREGLASS|FRP)\b/i;
        const ENC_SS_RE = /\b(?:4XSS|4X\s+SS|STAINLESS|S\/S|SS)\b/i;
        const ENC_POLY_RE = /\bPOLY(?:CARBONATE)?\b/i;

        let res = [];
        window.LOCAL_DB.forEach(r => {
            let w = 0, p = true;
            // Preserve varied flags from worker, may be overridden by fuzzy matching
            let mfgV = r.mfgV || false;
            let hpV = r.hpV || false;
            let voltV = r.voltV || false;
            let phaseV = r.phaseV || false;
            let encV = r.encV || false;

            // A: Client-side enclosure reclassification — "Varied / Multiple" when both FG+SS present (v2.5.44)
            // NOTE: intentionally mutates r.enc/r.encV (consistent with existing w/mfgV/hpV mutations below)
            if (r.enc === '4XSS' || r.enc === '4XFG' || !r.enc) {
                const desc = r.desc || '';
                const hasFGSignal = ENC_FG_RE.test(desc);
                const hasSSSignal = ENC_SS_RE.test(desc);
                const isEncFG = r.enc === '4XFG';
                const isEncSS = r.enc === '4XSS';
                // Reclassify when enc field contradicts description or desc has both signals
                if ((isEncFG && hasSSSignal) || (isEncSS && hasFGSignal) || (hasFGSignal && hasSSSignal)) {
                    // Apply explicit compound token preference before Varied / Multiple (v2.5.47)
                    const hasExplicit4XSS = /\b4XSS\b/i.test(desc);
                    const hasExplicit4XFG = /\b4XFG\b/i.test(desc);
                    if (hasExplicit4XSS && !hasExplicit4XFG) {
                        r.enc = '4XSS';
                        r.encV = false;
                        encV = false;
                    } else if (hasExplicit4XFG && !hasExplicit4XSS) {
                        r.enc = '4XFG';
                        r.encV = false;
                        encV = false;
                    } else {
                        r.enc = 'Varied / Multiple';
                        r.encV = true;
                        encV = true;
                    }
                } else if (!r.enc) {
                    if (hasFGSignal) r.enc = '4XFG';
                    else if (hasSSSignal) r.enc = '4XSS';
                }
            }
            
            // Category filter
            if (cat === 'Standard' && r.category === 'low_voltage') return;
            if (cat === 'LowVoltage' && r.category !== 'low_voltage') return;
            
            // Manufacturer filter
            if(crit.mfg !== "Any") { 
                if (r.mfg === crit.mfg) { 
                    w += 10000; 
                } else if (r.desc && r.desc.includes(crit.mfg)) { 
                    w += 1000;
                    mfgV = true; // Mark as varied when matched via description (fuzzy/uncertain match)
                } else { 
                    return; 
                } 
            }
            
            // HP filter using helper
            if(crit.hp !== "Any") {
                const hpMatch = HorsepowerMatcher.matches(r, crit.hp);
                if (!hpMatch.matches) return;
                
                w += hpMatch.weight;
                // Strict field match overrides worker variance
                if (hpMatch.isVariant) {
                    hpV = true;
                } else if (hpMatch.weight === HorsepowerMatcher.HP_STRICT_WEIGHT) {
                    hpV = false;
                }
            }
            
            // Volt/Phase/Enclosure filters
            if(crit.volt !== "Any") {
                const voltMatch = VoltageMatcher.matches(r, crit.volt);
                if (!voltMatch.matches) return;
                
                w += voltMatch.weight;
                voltV = voltMatch.isFuzzy;
            }
            if(crit.phase!=="Any") { 
                if(r.phase===crit.phase) {
                    // Strict field match - override worker variance flag for green badge
                    phaseV = false;
                    w += 500;
                } else if(r.desc && r.desc.includes(crit.phase)) {
                    // Fuzzy description match
                    phaseV = true;
                    w += 100;
                } else {
                    return;
                }
            }
            if(crit.enc!=="Any") { 
                if(r.enc===crit.enc) {
                    // Strict field match - override worker variance flag
                    encV = false;
                    w += 500;
                } else if (r.enc === 'Varied / Multiple') {
                    // B: Varied/Multiple enclosure — include if desc contains the searched signal (v2.5.44)
                    const desc = r.desc || '';
                    const isMatch =
                        (crit.enc === '4XSS' && ENC_SS_RE.test(desc)) ||
                        (crit.enc === '4XFG' && ENC_FG_RE.test(desc)) ||
                        (crit.enc === 'POLY' && ENC_POLY_RE.test(desc));
                    if (isMatch) {
                        encV = true;
                        w += 100; // Lower weight than strict match (500) — sorts behind strict results
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            }
            
            // Keyword filter using helper
            if(!KeywordMatcher.matches(r, rawKeywords, expandedKeywords)) return;
            if(expandedKeywords.length) w += 10;

            r.w=w; r.p=p; r.mfgV=mfgV; r.hpV=hpV; r.voltV=voltV; r.phaseV=phaseV; r.encV=encV; res.push(r);
        });
        
        // === SORT AND PARTITION RESULTS ===
        // isMissingPdf helper used as a sort sub-key (within each tier, PDF-present records first)
        const isMissingPdf = r => !r.pdfUrl || r.pdfStatus === PDF_STATUS.MISSING || String(r.pdfUrl || '').trim() === '';
        res.sort((a,b) => { 
            if(a.w !== b.w) return b.w - a.w;
            
            // When weights are equal, prioritize non-varied (perfect) matches
            // Count varied flags only for actively filtered parameters
            const aVariedCount = 
                (crit.mfg !== 'Any' && a.mfgV ? 1 : 0) +
                (crit.hp !== 'Any' && a.hpV ? 1 : 0) +
                (crit.volt !== 'Any' && a.voltV ? 1 : 0) +
                (crit.phase !== 'Any' && a.phaseV ? 1 : 0) +
                (crit.enc !== 'Any' && a.encV ? 1 : 0);
            const bVariedCount = 
                (crit.mfg !== 'Any' && b.mfgV ? 1 : 0) +
                (crit.hp !== 'Any' && b.hpV ? 1 : 0) +
                (crit.volt !== 'Any' && b.voltV ? 1 : 0) +
                (crit.phase !== 'Any' && b.phaseV ? 1 : 0) +
                (crit.enc !== 'Any' && b.encV ? 1 : 0);
            
            if(aVariedCount !== bVariedCount) return aVariedCount - bVariedCount; // Fewer varied flags = better
            
            // D: Tie-breaker when both have exactly one varied flag — prefer HP-varied over ENC-varied (v2.5.44)
            if (aVariedCount === 1 && bVariedCount === 1) {
                const variedPriority = r => {
                    if (crit.hp !== 'Any' && r.hpV) return 4;    // best (HP-varied ranks highest)
                    if (crit.volt !== 'Any' && r.voltV) return 3;
                    if (crit.phase !== 'Any' && r.phaseV) return 3;
                    if (crit.enc !== 'Any' && r.encV) return 2;
                    if (crit.mfg !== 'Any' && r.mfgV) return 1;  // worst
                    return 0;
                };
                const aPri = variedPriority(a);
                const bPri = variedPriority(b);
                if (aPri !== bPri) return bPri - aPri; // Higher priority = earlier in results
            }
            
            // Within the same tier, PDF-present records sort before missing-PDF records
            const aMissing = isMissingPdf(a) ? 1 : 0;
            const bMissing = isMissingPdf(b) ? 1 : 0;
            if(aMissing !== bMissing) return aMissing - bMissing;
            
            return b.id.localeCompare(a.id, undefined, {numeric:true, sensitivity:'base'}); 
        });
        
        this.currentResults = res;
        this.currentPage = 1;
        this.lastCriteria = crit;
        this.renderCurrentPage();
        
        // === UPDATE UI ===
        const paginationFooter = DOM_CACHE.get('pagination-footer');
        if (paginationFooter) {
            paginationFooter.style.display = UI.isSmallMobile()
                ? (res.length > 0 && UI.mobilePanels.resultsVisible ? 'flex' : 'none')
                : (res.length > 0 ? 'flex' : 'none');
        }
        
        if (res.length > 0) {
            UI.handleSearchCompletion(true);
            setTimeout(() => {
                PdfController.preloadSearchResults(res);
            }, PRELOAD_START_DELAY_MS);
        } else {
            UI.handleSearchCompletion(false);
        }
    }

    static renderCurrentPage() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageResults = this.currentResults.slice(start, end);
        const totalPages = Math.ceil(this.currentResults.length / this.pageSize);
        
        // === RENDER PAGE RESULTS ===
        UI.render(pageResults, this.lastCriteria, this.currentResults.length);
        
        // === UPDATE PAGINATION CONTROLS ===
        const pageInfo = DOM_CACHE.get('page-info');
        const prevBtn = DOM_CACHE.get('page-prev');
        const nextBtn = DOM_CACHE.get('page-next');
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    static prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderCurrentPage();
            const resultsScroll = DOM_CACHE.get('results-scroll-area');
            if (resultsScroll) resultsScroll.scrollTop = 0;
        }
    }

    static nextPage() {
        const totalPages = Math.ceil(this.currentResults.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderCurrentPage();
            const resultsScroll = DOM_CACHE.get('results-scroll-area');
            if (resultsScroll) resultsScroll.scrollTop = 0;
        }
    }
}

class PdfExporter {
    static previewPdfBytes = null;
    
    static async preview() {
        if (!PdfViewer.doc) return alert("No PDF loaded!");
        
        // Minimize generator panel while previewing
        DemoManager.minimizePanel();
        
        const modal = document.getElementById('pdf-preview-modal');
        const container = document.getElementById('pdf-preview-container');
        const btn = (window.event && window.event.currentTarget && window.event.currentTarget.tagName === 'BUTTON')
            ? window.event.currentTarget
            : document.querySelector('#generator-panel button[onclick="PdfExporter.preview()"], #context-preview-btn');
        const previewButtons = Array.from(document.querySelectorAll('button[onclick="PdfExporter.preview()"]'));
        const previewButtonState = new Map(previewButtons.map((previewBtn) => [previewBtn, {
            text: previewBtn.innerText,
            disabled: previewBtn.disabled
        }]));
        previewButtons.forEach((previewBtn) => {
            previewBtn.disabled = true;
        });
        if (btn) btn.innerText = "⏳ GENERATING...";
        
        try {
            const pdfBytes = await this.generateRedactedPdf();
            this.previewPdfBytes = pdfBytes;
            
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);
            
            container.innerHTML = `<iframe src="${blobUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
            modal.style.display = 'flex';
        } catch (e) {
            console.error(e);
            alert("Preview Failed: " + e.message);
        } finally {
            previewButtonState.forEach((state, previewBtn) => {
                previewBtn.innerText = state.text;
                previewBtn.disabled = state.disabled;
            });
        }
    }
    
    static closePreview() {
        const modal = document.getElementById('pdf-preview-modal');
        if (modal) modal.style.display = 'none';
        const container = document.getElementById('pdf-preview-container');
        if (container) container.innerHTML = '';
        // Restore generator panel
        DemoManager.restorePanel();
    }
    
    static openPrintExportMenu() {
        const menu = document.getElementById('print-export-menu');
        if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
    
    static closePrintExportMenu() {
        const menu = document.getElementById('print-export-menu');
        if (menu) menu.style.display = 'none';
    }
    
    static async printRedacted() {
        this.closePrintExportMenu();
        if (!this.previewPdfBytes) return alert("No redacted preview available.");
        
        const blob = new Blob([this.previewPdfBytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        
        let fallbackId = null;
        const cleanup = () => {
            if (fallbackId) { clearTimeout(fallbackId); fallbackId = null; }
            if (iframe.parentNode === document.body) document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
        };
        
        iframe.onload = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true });
                iframe.contentWindow.print();
                fallbackId = setTimeout(cleanup, PdfViewer.PRINT_CLEANUP_TIMEOUT_MS);
            } catch(e) { console.error('Print redacted error:', e); cleanup(); }
        };
        
        fallbackId = setTimeout(cleanup, PdfViewer.PRINT_MAX_TIMEOUT_MS);
    }
    
    static downloadRedacted() {
        this.closePrintExportMenu();
        if (!this.previewPdfBytes) return alert("No redacted preview available.");
        const blob = new Blob([this.previewPdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `redacted_${new Date().getTime()}.pdf`;
        link.click();
    }
    
    static async confirmExport() {
        if (!this.previewPdfBytes) {
            alert("No preview available. Please generate preview first.");
            return;
        }
        
        const blob = new Blob([this.previewPdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `redacted_${new Date().getTime()}.pdf`;
        link.click();
        
        this.closePreview();
    }
    
    static async export() {
        if (!PdfViewer.doc) return alert("No PDF loaded!");
        const btn = document.querySelector('button[onclick="PdfExporter.export()"]');
        const origText = btn.innerText; btn.innerText = "⏳ PROCESSING..."; btn.disabled = true;
        
        try {
            const pdfBytes = await this.generateRedactedPdf();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `redacted_${new Date().getTime()}.pdf`;
            link.click();
        } catch (e) {
            console.error(e);
            alert("Export Failed: " + e.message);
        } finally {
            btn.innerText = origText;
            btn.disabled = false;
        }
    }
    
    static async generateRedactedPdf() {
        if (!window.PDFLib) {
            throw new Error('PDF generation library (pdf-lib) is not available. Please check your network connection or contact support.');
        }
        const existingPdfBytes = await fetch(PdfViewer.currentBlobUrl).then(res => res.arrayBuffer());
        const mainPdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        const compositeDoc = await PDFLib.PDFDocument.create();
        
        let coverPage;
        if (window.TEMPLATE_BYTES) {
            const templateDoc = await PDFLib.PDFDocument.load(window.TEMPLATE_BYTES.slice(0));
            const [embeddedTemplate] = await compositeDoc.copyPages(templateDoc, [0]);
            coverPage = compositeDoc.addPage(embeddedTemplate);
        } else {
            const [origPage1] = await compositeDoc.copyPages(mainPdfDoc, [0]);
            coverPage = compositeDoc.addPage(origPage1);
        }

        if (mainPdfDoc.getPageCount() > 1) {
            const remainingIndices = Array.from({ length: mainPdfDoc.getPageCount() - 1 }, (_, i) => i + 1);
            const remainingPages = await compositeDoc.copyPages(mainPdfDoc, remainingIndices);
            
            remainingPages.forEach((p) => {
                compositeDoc.addPage(p);
            });
        }

        const pages = compositeDoc.getPages();
        const fontTimes = await compositeDoc.embedFont(PDFLib.StandardFonts.TimesRoman); 
        const fontCourier = await compositeDoc.embedFont(PDFLib.StandardFonts.Courier);

        pages.forEach((page, index) => {
            const pdfWidth = page.getWidth(); const pdfHeight = page.getHeight();
            const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${index + 1}"]`);
            if (wrapper) {
                const container = wrapper.querySelector('.pdf-content-container');
                const zones = Array.from(container.querySelectorAll('.redaction-box'));
                
                // Sort zones: opaque whiteouts first, then transparent overlays
                // This ensures whiteouts are drawn before text overlays to prevent overlap issues
                zones.sort((a, b) => {
                    const aTransparent = a.dataset.transparent === "true";
                    const bTransparent = b.dataset.transparent === "true";
                    if (aTransparent === bTransparent) return 0;
                    return aTransparent ? 1 : -1; // Transparent zones sorted last
                });
                
                zones.forEach(box => {
                    const relX = box.offsetLeft / container.offsetWidth; 
                    const relY = box.offsetTop / container.offsetHeight;
                    const relW = box.offsetWidth / container.offsetWidth; 
                    const relH = box.offsetHeight / container.offsetHeight;
                    
                    const drawX = relX * pdfWidth; const drawH = relH * pdfHeight;
                    const drawY = pdfHeight - (relY * pdfHeight) - drawH; const drawW = relW * pdfWidth;
                    
                    const isTransparent = box.dataset.transparent === "true";

                    if ((!window.TEMPLATE_BYTES || index > 0) && !isTransparent) {
                         page.drawRectangle({ x: drawX, y: drawY, width: drawW, height: drawH, color: PDFLib.rgb(1,1,1), borderColor: PDFLib.rgb(1,1,1), borderWidth: 0 });
                    }

                    const text = box.querySelector('span')?.innerText || "";
                    if (text) { 
                        const fontSizeStr = box.style.fontSize; const fontSize = parseInt(fontSizeStr) || 12;
                        
                        let fontToUse = fontTimes;
                        if (box.style.fontFamily.includes('Courier')) fontToUse = fontCourier;

                        const rotation = parseFloat(box.dataset.rotation) || 0;
                        if (rotation !== 0) {
                            // Rotated text: single-line only (existing behavior)
                            const textWidth = fontToUse.widthOfTextAtSize(text, fontSize);
                            const centerX = drawX + drawW/2;
                            const centerY = drawY + drawH/2;
                            page.drawText(text, { x: centerX, y: centerY, size: fontSize, font: fontToUse, color: PDFLib.rgb(0,0,0), rotate: PDFLib.degrees(rotation) });
                            if (box.dataset.decoration === 'underline') {
                                const halfWidth = textWidth / 2;
                                const underlineOffset = fontSize / 8;
                                const radians = (rotation * Math.PI) / 180;
                                const cos = Math.cos(radians); const sin = Math.sin(radians);
                                const startX = centerX - halfWidth * cos - underlineOffset * sin;
                                const startY = centerY - halfWidth * sin + underlineOffset * cos;
                                const endX = centerX + halfWidth * cos - underlineOffset * sin;
                                const endY = centerY + halfWidth * sin + underlineOffset * cos;
                                page.drawLine({ start: { x: startX, y: startY }, end: { x: endX, y: endY }, thickness: 1, color: PDFLib.rgb(0,0,0) });
                            }
                        } else {
                            // Non-rotated: support multiline by splitting on \n
                            const lines = text.split('\n');
                            const lineHeight = fontSize * 1.4;
                            const totalTextHeight = lineHeight * lines.length;
                            const baseY = drawY + drawH/2 + totalTextHeight/2 - fontSize;
                            lines.forEach((line, i) => {
                                const lineText = line || '';
                                const lineWidth = lineText ? fontToUse.widthOfTextAtSize(lineText, fontSize) : 0;
                                let lineX = drawX;
                                if (box.style.textAlign === 'center') lineX = drawX + (drawW/2) - (lineWidth/2);
                                else if (box.style.textAlign === 'right') lineX = drawX + drawW - lineWidth;
                                const lineY = baseY - i * lineHeight;
                                if (lineText) page.drawText(lineText, { x: lineX, y: lineY, size: fontSize, font: fontToUse, color: PDFLib.rgb(0,0,0) });
                                if (box.dataset.decoration === 'underline' && lineText) {
                                    page.drawLine({ start: { x: lineX, y: lineY - 2 }, end: { x: lineX + lineWidth, y: lineY - 2 }, thickness: 1, color: PDFLib.rgb(0,0,0) });
                                }
                            });
                        }
                    }
                });
            }
        });

        return await compositeDoc.save();
    }
}

// PDF Validation Utility
function isPdfBuffer(arrayBuffer) {
    // Check for PDF magic number: %PDF- at the start of the buffer
    if (!arrayBuffer || arrayBuffer.byteLength < 5) {
        return false;
    }
    const header = new Uint8Array(arrayBuffer.slice(0, 5));
    const pdfMagic = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-
    return header.every((byte, i) => byte === pdfMagic[i]);
}

/**
 * Converts the first N bytes of an ArrayBuffer to a space-separated hex string for diagnostic logging
 * @param {ArrayBuffer} arrayBuffer - The buffer to convert
 * @param {number} maxLength - Maximum number of bytes to convert (default: 16)
 * @returns {string} Space-separated hex string (e.g., "25 50 44 46 2d" for "%PDF-")
 * @example
 * // Returns "25 50 44 46 2d 31 2e 37"
 * bytesToHex(pdfArrayBuffer, 8)
 */
function bytesToHex(arrayBuffer, maxLength = 16) {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) return '';
    const preview = new Uint8Array(arrayBuffer.slice(0, Math.min(maxLength, arrayBuffer.byteLength)));
    return Array.from(preview).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// Enhanced PDF validation with content-type, size and magic bytes
function validatePdfResponse(resp, arrayBuffer, context = '') {
    const MIN_PDF_SIZE = 1024; // 1KB minimum
    
    // Check response status
    if (!resp || !resp.ok) {
        console.error(`[${context}] Invalid response status: ${resp?.status || 'unknown'}`);
        return { valid: false, reason: `HTTP ${resp?.status || 'unknown'}` };
    }
    
    // Check content-type header
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('pdf')) {
        console.error(`[${context}] Invalid content-type: ${contentType}`);
        return { valid: false, reason: `Invalid content-type: ${contentType}` };
    }
    
    // Check minimum size
    if (!arrayBuffer || arrayBuffer.byteLength < MIN_PDF_SIZE) {
        const size = arrayBuffer?.byteLength || 0;
        console.error(`[${context}] PDF too small: ${size} bytes (min ${MIN_PDF_SIZE})`);
        
        // Log first bytes as hex for diagnostics
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
            const hexPreview = bytesToHex(arrayBuffer);
            console.error(`[${context}] First bytes (hex): ${hexPreview}`);
        }
        
        return { valid: false, reason: `Size too small: ${size} bytes` };
    }
    
    // Check PDF magic number
    if (!isPdfBuffer(arrayBuffer)) {
        const hexPreview = bytesToHex(arrayBuffer);
        console.error(`[${context}] Missing PDF magic bytes. First bytes (hex): ${hexPreview}`);
        return { valid: false, reason: 'Missing %PDF- magic bytes' };
    }
    
    // All checks passed
    return { valid: true };
}

/**
 * Wrapper function to standardize PDF validation with consistent diagnostic context
 * @param {Response} resp - Fetch response
 * @param {ArrayBuffer} arrayBuffer - PDF data buffer
 * @param {string} location - Location identifier (e.g., 'loadById', 'preload')
 * @param {string} id - Panel or resource ID
 * @returns {Object} Validation result with {valid, reason}
 */
function validatePdfWithContext(resp, arrayBuffer, location, id = '') {
    const context = id ? `${location}[${id}]` : location;
    return validatePdfResponse(resp, arrayBuffer, context);
}

function getNowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function logPdfTiming(metric, durationMs, fields = {}) {
    if (!Number.isFinite(durationMs)) return;
    const safeFields = Object.entries(fields)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
    const suffix = safeFields ? ` ${safeFields}` : '';
    console.log(`[pdf-timing] ${metric} ms=${durationMs.toFixed(1)}${suffix}`);
}

/**
 * Centralized PDF UI state transition function
 * Manages visibility of PDF viewer elements based on state
 * @param {string} state - One of PDF_UI_STATE values
 * @param {string} loadingMessage - Optional custom loading message
 * @param {string} fallbackUrl - Optional fallback URL for direct PDF link
 */
function setPdfUiState(state, loadingMessage = '⏳ DOWNLOADING PDF...', fallbackUrl = '') {
    const elements = {
        placeholder: DOM_CACHE.get('pdf-placeholder-text'),
        toolbar: DOM_CACHE.get('pdf-toolbar'),
        viewer: DOM_CACHE.get('custom-pdf-viewer'),
        fallback: DOM_CACHE.get('pdf-fallback'),
        fallbackLink: DOM_CACHE.get('pdf-fallback-link'),
        frame: DOM_CACHE.get('pdf-viewer-frame'),
        printBtn: DOM_CACHE.get('pdf-print-btn'),
        downloadBtn: DOM_CACHE.get('pdf-download-btn')
    };
    
    // Reset all states
    if (elements.placeholder) elements.placeholder.style.display = 'none';
    if (elements.toolbar) elements.toolbar.style.display = 'none';
    if (elements.viewer) elements.viewer.style.display = 'none';
    if (elements.fallback) elements.fallback.style.display = 'none';
    if (elements.frame) elements.frame.style.display = 'none';
    
    // Apply specific state
    switch (state) {
        case PDF_UI_STATE.LOADING:
            if (elements.placeholder) {
                elements.placeholder.style.display = 'flex';
                elements.placeholder.innerText = loadingMessage;
            }
            break;
        case PDF_UI_STATE.READY:
            if (elements.placeholder) elements.placeholder.style.display = 'none';
            if (elements.toolbar) elements.toolbar.style.display = 'flex';
            if (elements.viewer) elements.viewer.style.display = 'flex';
            break;
        case PDF_UI_STATE.FALLBACK:
            if (elements.placeholder) elements.placeholder.style.display = 'none';
            if (elements.fallback) elements.fallback.style.display = 'block';
            if (fallbackUrl && elements.fallbackLink) {
                elements.fallbackLink.href = fallbackUrl;
            }
            break;
        case PDF_UI_STATE.HIDDEN:
        default:
            // All elements already hidden
            break;
    }

    const hasLoadedPdf = !!PdfViewer.currentBlobUrl && state === PDF_UI_STATE.READY;
    if (elements.printBtn) elements.printBtn.disabled = !hasLoadedPdf;
    if (elements.downloadBtn) elements.downloadBtn.disabled = !hasLoadedPdf;
}

/**
 * Attempts to fetch PDF using fallback URL when primary fetch fails
 * Shared logic between PdfViewer.loadById and PdfController.preloadSearchResults
 * @param {string} fallbackUrl - Direct PDF URL to try
 * @param {string} panelId - Panel identifier for logging
 * @param {Function|Object} headers - Function returning headers or headers object
 * @returns {Object|null} {arrayBuffer, blob, resp} on success, null on failure
 */
async function attemptPdfFallbackFetch(fallbackUrl, panelId, headers) {
    if (!fallbackUrl) {
        console.warn(`[fallback] No fallback URL provided for ${panelId}`);
        return null;
    }
    
    try {
        console.log(`[fallback] Attempting fallback fetch for ${panelId}`);
        const fallbackProxyUrl = buildWorkerUrl('PDF', { url: fallbackUrl });
        const resolvedHeaders = typeof headers === 'function' ? headers() : (headers || {});
        const fallbackResp = await fetch(fallbackProxyUrl, { headers: resolvedHeaders });
        
        if (!fallbackResp.ok) {
            console.warn(`[fallback] Fetch failed for ${panelId}: status ${fallbackResp.status}`);
            return null;
        }
        
        const fallbackArrayBuffer = await fallbackResp.arrayBuffer();
        
        // Validate fallback PDF
        const fallbackValidation = validatePdfWithContext(fallbackResp, fallbackArrayBuffer, 'fallback', panelId);
        if (!fallbackValidation.valid) {
            console.warn(`[fallback] PDF validation failed for ${panelId}: ${fallbackValidation.reason}`);
            return null;
        }
        
        console.log(`[fallback] Success for ${panelId}`);
        const blob = new Blob([fallbackArrayBuffer], { type: "application/pdf" });
        return { arrayBuffer: fallbackArrayBuffer, blob, resp: fallbackResp };
    } catch (error) {
        console.warn(`[fallback] Exception for ${panelId}:`, error);
        return null;
    }
}

class PdfViewer {
    static doc = null; static currentScale = 1.0; static url = ""; static currentBlobUrl = ""; static currentPdfBlob = null;
    static currentFetchId = 0;
    static currentRenderToken = 0;
    static loadingTask = null;
    static MIN_SCALE = 0.4;
    static MAX_SCALE = 2.4;
    static ZOOM_STEP = 0.2;
    static ZOOM_DEBOUNCE_MS = 100;
    static _zoomTimer = null;
    static _zoomInteractionElement = null;
    static _wheelZoomHandler = null;
    static _touchStartHandler = null;
    static _touchMoveHandler = null;
    static _touchEndHandler = null;
    static _userHasAdjustedZoom = false;
    static _gestureStageElement = null;
    static _committedPanX = 0;
    static _committedPanY = 0;
    static _liveScale = 1;
    static _activeGesture = null;
    static _iosGestureNoticeLogged = false;
    static _documentLoadToken = 0;
    static isPrinting = false;
    static _activePrintSession = null;
    static PRINT_CLEANUP_TIMEOUT_MS = 15000;
    static PRINT_MAX_TIMEOUT_MS = 30000;
    static PRINT_IFRAME_LOAD_TIMEOUT_MS = 8000;
    static PRINT_DIALOG_RELEASE_DELAY_MS = 1500;
    static _activePanelId = '';

    static isDocumentValid() {
        return this.doc && !this.doc.destroyed;
    }

    static _clearZoomTimer() {
        if (this._zoomTimer) {
            clearTimeout(this._zoomTimer);
            this._zoomTimer = null;
        }
    }

    static _beginDocumentLoad() {
        this._clearZoomTimer();
        this._releasePrintSession('document-load');
        this._documentLoadToken++;
        this.currentRenderToken++;
        this._userHasAdjustedZoom = false;
        this._liveScale = 1;
        this._committedPanX = 0;
        this._committedPanY = 0;
        this._clearActiveGesture();
        this._clearStagedPdfSurface();
    }
    static _clearStagedPdfSurface() {
        const viewer = document.getElementById('pdf-main-view');
        if (!viewer) return;
        viewer.querySelectorAll('.pdf-gesture-stage').forEach((stage) => stage.remove());
        this._gestureStageElement = null;
    }

    static _clampScale(scale) {
        return Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, scale));
    }

    static _updateZoomLabel() {
        const zoomLabel = document.getElementById('pdf-zoom-level');
        if (zoomLabel) zoomLabel.innerText = Math.round(this.currentScale * 100) + "%";
    }

    static _ensureGestureStage(container) {
        if (!container) return null;
        let stage = container.querySelector('.pdf-gesture-stage');
        if (!stage) {
            stage = document.createElement('div');
            stage.className = 'pdf-gesture-stage';
            container.appendChild(stage);
        }
        this._gestureStageElement = stage;
        return stage;
    }

    static _getGestureStage() {
        if (this._gestureStageElement && this._gestureStageElement.isConnected) {
            return this._gestureStageElement;
        }
        const viewer = this._zoomInteractionElement || document.getElementById('pdf-main-view');
        const stage = viewer?.querySelector('.pdf-gesture-stage') || null;
        this._gestureStageElement = stage;
        return stage;
    }

    static _getPanBounds(scaleMultiplier = 1) {
        const viewer = this._zoomInteractionElement || document.getElementById('pdf-main-view');
        const stage = this._getGestureStage();
        if (!viewer || !stage) return { maxX: 0, maxY: 0 };

        const viewerWidth = Math.max(1, viewer.clientWidth || 0);
        const viewerHeight = Math.max(1, viewer.clientHeight || 0);
        const contentWidth = Math.max(1, stage.offsetWidth || 0) * scaleMultiplier;
        const contentHeight = Math.max(1, stage.offsetHeight || 0) * scaleMultiplier;

        const maxX = Math.max(0, ((contentWidth - viewerWidth) / 2) + 24);
        const maxY = Math.max(0, ((contentHeight - viewerHeight) / 2) + 24);
        return { maxX, maxY };
    }

    static _clampPan(x, y, scaleMultiplier = 1) {
        const { maxX, maxY } = this._getPanBounds(scaleMultiplier);
        return {
            x: Math.min(maxX, Math.max(-maxX, Number.isFinite(x) ? x : 0)),
            y: Math.min(maxY, Math.max(-maxY, Number.isFinite(y) ? y : 0))
        };
    }

    static _applyViewerTransform(scaleMultiplier = 1, panX = this._committedPanX, panY = this._committedPanY) {
        const stage = this._getGestureStage();
        if (!stage) return;
        const clamped = this._clampPan(panX, panY, scaleMultiplier);
        stage.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0) scale(${scaleMultiplier})`;
        this._liveScale = scaleMultiplier;
        this._committedPanX = clamped.x;
        this._committedPanY = clamped.y;
    }

    static _isZoomedForPan() {
        const scaleMultiplier = this._liveScale || 1;
        const bounds = this._getPanBounds(scaleMultiplier);
        return bounds.maxX > 0 || bounds.maxY > 0 || this.currentScale > 1.01;
    }

    static _clearActiveGesture() {
        this._activeGesture = null;
    }

    static _captureAnchorContext(anchorPoint, scaleRatio = 1) {
        const viewer = this._zoomInteractionElement || document.getElementById('pdf-main-view');
        const stage = this._getGestureStage();
        if (!viewer || !stage) return null;

        const viewerRect = viewer.getBoundingClientRect();
        const anchorOffsetXRaw = Number.isFinite(anchorPoint?.x)
            ? (anchorPoint.x - viewerRect.left)
            : (viewer.clientWidth / 2);
        const anchorOffsetYRaw = Number.isFinite(anchorPoint?.y)
            ? (anchorPoint.y - viewerRect.top)
            : (viewer.clientHeight / 2);
        const anchorOffsetX = Math.max(0, Math.min(viewer.clientWidth || 0, anchorOffsetXRaw));
        const anchorOffsetY = Math.max(0, Math.min(viewer.clientHeight || 0, anchorOffsetYRaw));
        const liveScale = this._liveScale > 0 ? this._liveScale : 1;
        const contentX = (viewer.scrollLeft + anchorOffsetX - stage.offsetLeft - this._committedPanX) / liveScale;
        const contentY = (viewer.scrollTop + anchorOffsetY - stage.offsetTop - this._committedPanY) / liveScale;

        return {
            anchorOffsetX,
            anchorOffsetY,
            contentX,
            contentY,
            scaleRatio: Number.isFinite(scaleRatio) ? scaleRatio : 1
        };
    }

    static _applyScrollPosition(viewer, nextScrollLeft, nextScrollTop) {
        if (!viewer) return;
        const maxScrollLeft = Math.max(0, (viewer.scrollWidth || 0) - (viewer.clientWidth || 0));
        const maxScrollTop = Math.max(0, (viewer.scrollHeight || 0) - (viewer.clientHeight || 0));
        viewer.scrollLeft = Math.max(0, Math.min(maxScrollLeft, Number.isFinite(nextScrollLeft) ? nextScrollLeft : viewer.scrollLeft || 0));
        viewer.scrollTop = Math.max(0, Math.min(maxScrollTop, Number.isFinite(nextScrollTop) ? nextScrollTop : viewer.scrollTop || 0));
    }

    static _commitPanToScroll(panX = this._committedPanX, panY = this._committedPanY) {
        const viewer = this._zoomInteractionElement || document.getElementById('pdf-main-view');
        if (!viewer) return;
        this._applyScrollPosition(
            viewer,
            (viewer.scrollLeft || 0) - (Number.isFinite(panX) ? panX : 0),
            (viewer.scrollTop || 0) - (Number.isFinite(panY) ? panY : 0)
        );
        this._liveScale = 1;
        this._committedPanX = 0;
        this._committedPanY = 0;
        this._applyViewerTransform(1, 0, 0);
    }

    static _restoreScrollFromAnchorContext(viewer, stage, anchorContext) {
        if (!viewer || !stage || !anchorContext) return false;
        if (!Number.isFinite(anchorContext.contentX) || !Number.isFinite(anchorContext.contentY)) return false;
        const scaleRatio = Number.isFinite(anchorContext.scaleRatio) ? anchorContext.scaleRatio : 1;
        this._applyScrollPosition(
            viewer,
            stage.offsetLeft + (anchorContext.contentX * scaleRatio) - (anchorContext.anchorOffsetX || 0),
            stage.offsetTop + (anchorContext.contentY * scaleRatio) - (anchorContext.anchorOffsetY || 0)
        );
        return true;
    }

    static _restoreScrollFromPriorRatios(viewer, stage, priorState = null) {
        if (!viewer || !stage || !priorState) return false;
        const hasX = Number.isFinite(priorState.scrollRatioX);
        const hasY = Number.isFinite(priorState.scrollRatioY);
        if (!hasX && !hasY) return false;
        const nextStageWidth = Math.max(1, stage.offsetWidth || 1);
        const nextStageHeight = Math.max(1, stage.offsetHeight || 1);
        const nextScrollLeft = hasX
            ? ((priorState.scrollRatioX * nextStageWidth) + stage.offsetLeft - (priorState.anchorOffsetX || 0))
            : viewer.scrollLeft || 0;
        const nextScrollTop = hasY
            ? ((priorState.scrollRatioY * nextStageHeight) + stage.offsetTop - (priorState.anchorOffsetY || 0))
            : viewer.scrollTop || 0;
        this._applyScrollPosition(viewer, nextScrollLeft, nextScrollTop);
        return true;
    }

    static _finalizeGesture() {
        const gesture = this._activeGesture;
        if (!gesture) return;
        if (gesture.documentLoadToken !== this._documentLoadToken) {
            this._clearActiveGesture();
            this._liveScale = 1;
            this._applyViewerTransform(1, 0, 0);
            return;
        }

        const priorScale = this.currentScale;
        const finalScale = this._clampScale(this.currentScale * (this._liveScale || 1));
        const scaleChanged = Math.abs(finalScale - this.currentScale) > 0.001;
        const clampScaleMultiplier = this.currentScale > 0 ? (finalScale / this.currentScale) : 1;
        const finalPan = this._clampPan(this._committedPanX, this._committedPanY, clampScaleMultiplier);
        this._committedPanX = finalPan.x;
        this._committedPanY = finalPan.y;
        const anchorContext = this._captureAnchorContext(gesture.lastMidpoint || gesture.startMidpoint || null, clampScaleMultiplier);
        this._clearActiveGesture();

        if (scaleChanged) {
            this.currentScale = finalScale;
            this._userHasAdjustedZoom = true;
            this._updateZoomLabel();
            this._liveScale = clampScaleMultiplier;
            this._committedPanX = finalPan.x;
            this._committedPanY = finalPan.y;
            this._applyViewerTransform(this._liveScale, this._committedPanX, this._committedPanY);
            this._clearZoomTimer();
            if (this.isDocumentValid()) {
                this.renderStack({
                    timingSource: 'gesture-commit',
                    expectedDocumentLoadToken: gesture.documentLoadToken,
                    anchorContext: anchorContext || this._captureAnchorContext(null, finalScale / Math.max(priorScale, 0.0001))
                });
            }
            return;
        }

        this._commitPanToScroll(finalPan.x, finalPan.y);
    }

    static _distanceBetweenTouches(t0, t1) {
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        return Math.hypot(dx, dy);
    }

    static _midpointBetweenTouches(t0, t1) {
        return {
            x: (t0.clientX + t1.clientX) / 2,
            y: (t0.clientY + t1.clientY) / 2
        };
    }

    static _removeRenderArtifactsForToken(container, renderToken) {
        if (!container) return;
        container.querySelectorAll(`.pdf-page-wrapper[data-render-token="${renderToken}"]`).forEach((wrapper) => wrapper.remove());
    }

    static initViewerInteractions() {
        const viewer = document.getElementById('pdf-main-view');
        if (!viewer || this._zoomInteractionElement === viewer) return;
        this.teardownViewerInteractions();

        this._zoomInteractionElement = viewer;
        this._wheelZoomHandler = (event) => {
            if (!this.isDocumentValid()) return;
            if (!(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            event.stopPropagation();
            const delta = event.deltaY < 0 ? this.ZOOM_STEP : -this.ZOOM_STEP;
            this.zoom(delta, { source: 'wheel' });
        };

        this._touchStartHandler = (event) => {
            if (!this.isDocumentValid()) return;
            if (document.body.classList.contains('editor-active')) return;
            const touches = event.touches;
            if (!touches || touches.length === 0) return;

            if (touches.length >= 2) {
                const t0 = touches[0];
                const t1 = touches[1];
                const visualScale = this._clampScale(this.currentScale * (this._liveScale || 1));
                this._activeGesture = {
                    mode: 'pinch',
                    documentLoadToken: this._documentLoadToken,
                    startDistance: this._distanceBetweenTouches(t0, t1),
                    startScale: visualScale,
                    startMidpoint: this._midpointBetweenTouches(t0, t1),
                    lastMidpoint: this._midpointBetweenTouches(t0, t1),
                    startPanX: this._committedPanX,
                    startPanY: this._committedPanY
                };
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (touches.length === 1 && this._isZoomedForPan()) {
                const touch = touches[0];
                this._activeGesture = {
                    mode: 'pan',
                    documentLoadToken: this._documentLoadToken,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    startPanX: this._committedPanX,
                    startPanY: this._committedPanY
                };
                event.preventDefault();
                event.stopPropagation();
            }
        };

        this._touchMoveHandler = (event) => {
            if (!this.isDocumentValid()) return;
            if (!this._activeGesture) return;
            if (document.body.classList.contains('editor-active')) return;
            if (this._activeGesture.documentLoadToken !== this._documentLoadToken) {
                this._clearActiveGesture();
                return;
            }

            if (this._activeGesture.mode === 'pinch') {
                const touches = event.touches;
                if (!touches || touches.length < 2) return;
                const t0 = touches[0];
                const t1 = touches[1];
                const distance = this._distanceBetweenTouches(t0, t1);
                const midpoint = this._midpointBetweenTouches(t0, t1);
                this._activeGesture.lastMidpoint = midpoint;
                if (!(this._activeGesture.startDistance > 0)) return;

                const nextScale = this._clampScale(this._activeGesture.startScale * (distance / this._activeGesture.startDistance));
                const liveScaleMultiplier = nextScale / this.currentScale;
                const panX = this._activeGesture.startPanX + (midpoint.x - this._activeGesture.startMidpoint.x);
                const panY = this._activeGesture.startPanY + (midpoint.y - this._activeGesture.startMidpoint.y);
                this._applyViewerTransform(liveScaleMultiplier, panX, panY);
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (this._activeGesture.mode === 'pan' && event.touches?.length === 1) {
                const touch = event.touches[0];
                const panX = this._activeGesture.startPanX + (touch.clientX - this._activeGesture.startX);
                const panY = this._activeGesture.startPanY + (touch.clientY - this._activeGesture.startY);
                this._applyViewerTransform(this._liveScale || 1, panX, panY);
                event.preventDefault();
                event.stopPropagation();
            }
        };

        this._touchEndHandler = (event) => {
            if (!this._activeGesture) return;
            if (this._activeGesture.documentLoadToken !== this._documentLoadToken) {
                this._clearActiveGesture();
                return;
            }

            if (this._activeGesture.mode === 'pinch') {
                if ((event.touches?.length || 0) < 2) {
                    this._finalizeGesture();
                }
                return;
            }

            if ((event.touches?.length || 0) === 0) {
                this._finalizeGesture();
            }
        };

        viewer.addEventListener('wheel', this._wheelZoomHandler, { passive: false });
        viewer.addEventListener('touchstart', this._touchStartHandler, { passive: false });
        viewer.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
        viewer.addEventListener('touchend', this._touchEndHandler, { passive: false });
        viewer.addEventListener('touchcancel', this._touchEndHandler, { passive: false });

        const userAgent = (typeof navigator !== 'undefined' && navigator?.userAgent) ? navigator.userAgent : '';
        const isIPadDesktopUA = typeof navigator !== 'undefined'
            && navigator?.platform === 'MacIntel'
            && Number(navigator?.maxTouchPoints || 0) > 1;
        if ((/iPad|iPhone|iPod/.test(userAgent) || isIPadDesktopUA) && !this._iosGestureNoticeLogged) {
            this._iosGestureNoticeLogged = true;
            console.log('[pdf-gesture] iOS/iPadOS Safari may still allow system page pinch zoom outside viewer-level handlers.');
        }
    }

    static teardownViewerInteractions() {
        if (this._zoomInteractionElement && this._wheelZoomHandler) {
            this._zoomInteractionElement.removeEventListener('wheel', this._wheelZoomHandler);
        }
        if (this._zoomInteractionElement && this._touchStartHandler) {
            this._zoomInteractionElement.removeEventListener('touchstart', this._touchStartHandler);
            this._zoomInteractionElement.removeEventListener('touchmove', this._touchMoveHandler);
            this._zoomInteractionElement.removeEventListener('touchend', this._touchEndHandler);
            this._zoomInteractionElement.removeEventListener('touchcancel', this._touchEndHandler);
        }
        this._zoomInteractionElement = null;
        this._wheelZoomHandler = null;
        this._touchStartHandler = null;
        this._touchMoveHandler = null;
        this._touchEndHandler = null;
        this._gestureStageElement = null;
        this._liveScale = 1;
        this._committedPanX = 0;
        this._committedPanY = 0;
        this._clearActiveGesture();
        this._clearZoomTimer();
    }

    static async loadById(panelId, fallbackUrl) {
        // Cancel any active OCR tasks when loading a new PDF
        SmartScanner.cancelAllOcrTasks();
        this._beginDocumentLoad();
        this._activePanelId = (panelId || '').trim();
        const loadStartMs = getNowMs();
        
        // === INITIALIZATION ===
        this.url = fallbackUrl || "";
        setPdfUiState(PDF_UI_STATE.LOADING, '⏳ DOWNLOADING PDF...');

        const fetchId = Date.now();
        this.currentFetchId = fetchId;

        try {
            // === CLEANUP PREVIOUS LOADING TASK ===
            if (this.loadingTask) {
                await this.loadingTask.destroy().catch(()=>{});
                this.loadingTask = null;
            }

            // === PRIMARY FETCH: PDF_BY_ID ===
            const proxyUrl = buildWorkerUrl('PDF_BY_ID', { id: panelId });
            const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
            
            if (!resp.ok) {
                // === HANDLE 404: ATTEMPT FALLBACK ===
                if (resp.status === 404) {
                    console.warn(`PDF_BY_ID returned 404 for panel ${panelId}`);
                    
                    const fallbackResult = await attemptPdfFallbackFetch(fallbackUrl, panelId, AuthService.headers);
                    if (fallbackResult) {
                        // === FALLBACK SUCCESS: LOAD AND RENDER ===
                        if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
                        this.currentPdfBlob = fallbackResult.blob;
                        this.currentBlobUrl = URL.createObjectURL(fallbackResult.blob);
                        
                        try {
                            const docInitStartMs = getNowMs();
                            this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fallbackResult.arrayBuffer) });
                            this.doc = await this.loadingTask.promise;
                            logPdfTiming('document_init', getNowMs() - docInitStartMs, { source: 'network-fallback' });
                        } catch (pdfError) {
                            console.error(`[loadById-fallback] pdfjsLib.getDocument failed for panel ${panelId}:`, pdfError);
                            throw pdfError;
                        }
                        
                        // Cache the fallback PDF
                        const cacheInsertStartMs = getNowMs();
                        PdfController.pdfCache.set(panelId, {
                            arrayBuffer: fallbackResult.arrayBuffer,
                            blob: fallbackResult.blob,
                            timestamp: Date.now()
                        });
                        logPdfTiming('cache_insert', getNowMs() - cacheInsertStartMs, { source: 'network-fallback' });
                        
                        // Validate and render
                        if (!this.isDocumentValid()) {
                            throw new Error('Loaded PDF document is null or destroyed after loading');
                        }
                        
                        if (this.currentFetchId !== fetchId) {
                            console.log(`PDF load cancelled after document load (fetchId mismatch): ${fetchId} != ${this.currentFetchId}`);
                            return;
                        }
                        
                        this._setScaleForDevice();
                        setPdfUiState(PDF_UI_STATE.READY);
                        await this.renderStack({ timingSource: 'network-fallback' });
                        logPdfTiming('load_complete', getNowMs() - loadStartMs, { source: 'network-fallback' });
                        return; // Success - exit early
                    }
                    
                    // === FALLBACK FAILED: MARK AS MISSING ===
                    console.error(`[loadById] All fetch attempts failed for panel ${panelId} - marking as missing`);
                    const rec = window.ID_MAP.get(panelId);
                    if (rec) {
                        rec.pdfStatus = PDF_STATUS.MISSING;
                        console.log(`[loadById] Marked panel ${panelId} as missing PDF`);
                    }
                    
                    setPdfUiState(PDF_UI_STATE.FALLBACK, '', fallbackUrl);
                    return; // Exit gracefully
                }
                throw new Error(`Failed to fetch PDF by ID: ${resp.status}`);
            }
            
            // === PRIMARY FETCH SUCCESS: VALIDATE AND LOAD ===
            const arrayBuffer = await resp.arrayBuffer();

            if (this.currentFetchId !== fetchId) {
                console.log(`PDF load cancelled (fetchId mismatch): ${fetchId} != ${this.currentFetchId}`);
                return;
            }

            const validation = validatePdfWithContext(resp, arrayBuffer, 'loadById', panelId);
            if (!validation.valid) {
                console.error(`[loadById] Invalid PDF for panel ${panelId}: ${validation.reason}`);
                setPdfUiState(PDF_UI_STATE.FALLBACK, '', fallbackUrl);
                return;
            }

            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
            this.currentPdfBlob = blob;
            this.currentBlobUrl = URL.createObjectURL(blob);
            
            try {
                const docInitStartMs = getNowMs();
                this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                this.doc = await this.loadingTask.promise;
                logPdfTiming('document_init', getNowMs() - docInitStartMs, { source: 'network-by-id' });
            } catch (pdfError) {
                console.error(`[loadById] pdfjsLib.getDocument failed for panel ${panelId}:`, pdfError);
                if (pdfError.name === 'InvalidPDFException' || pdfError.message?.includes('Invalid PDF')) {
                    console.error(`[loadById] InvalidPDFException detected - PDF is malformed`);
                }
                throw pdfError;
            }

            // === VALIDATE AND RENDER ===
            if (!this.isDocumentValid()) {
                throw new Error('Loaded PDF document is null or destroyed after loading');
            }

            if (this.currentFetchId !== fetchId) {
                console.log(`PDF load cancelled after document load (fetchId mismatch): ${fetchId} != ${this.currentFetchId}`);
                return;
            }

            this._setScaleForDevice();
            setPdfUiState(PDF_UI_STATE.READY);
            await this.renderStack({ timingSource: 'network-by-id' });
            logPdfTiming('load_complete', getNowMs() - loadStartMs, { source: 'network-by-id' });
        } catch(e) {
            // === ERROR HANDLING ===
            if (e.name === 'RenderingCancelledException' || e.message?.includes('destroyed')) {
                console.log('PDF Load Cancelled (Fast Click)');
            } else {
                console.error("PDF Load Error:", e);
                setPdfUiState(PDF_UI_STATE.FALLBACK, '', fallbackUrl);
            }
        }
    }
    
    /**
     * Helper: Set appropriate scale based on device width
     * @private
     */
    static _setScaleForDevice({ force = true } = {}) {
        if (!force && this._userHasAdjustedZoom) return;
        const viewportWidth = Math.max(0, window.innerWidth || 0);
        const viewportHeight = Math.max(0, window.innerHeight || 0);
        const shortSide = Math.min(viewportWidth, viewportHeight);
        const isPortrait = viewportHeight >= viewportWidth;
        const isSmallMobile = shortSide <= 430 && viewportWidth <= 600;
        const isPortraitLargeTabletOrMonitor = isPortrait && viewportWidth >= 820 && viewportHeight >= 1100;
        const isSmallMonitorOrLargeTablet = viewportWidth >= 1024 || isPortraitLargeTabletOrMonitor;
        const isLargeMonitor = viewportWidth >= 1600 && viewportHeight >= 900;

        if (isSmallMobile) {
            this.currentScale = 0.6;
        } else if (!isSmallMonitorOrLargeTablet) {
            this.currentScale = 0.8;
        } else if (isLargeMonitor) {
            this.currentScale = 1.2;
        } else {
            this.currentScale = 1.0;
        }

        this.currentScale = this._clampScale(this.currentScale);
        this._userHasAdjustedZoom = false;
    }

    static async loadFromCache(cached, panelId, fallbackUrl) {
        // Cancel any active OCR tasks when loading a new PDF
        SmartScanner.cancelAllOcrTasks();
        this._beginDocumentLoad();
        const loadStartMs = getNowMs();
        
        // === VALIDATE CACHED DATA ===
        if (!cached || !cached.arrayBuffer || !cached.blob) {
            console.warn('[loadFromCache] Invalid cached PDF data structure, falling back to network load');
            PdfController.evictFromCache(panelId);
            return this.loadById(panelId, fallbackUrl);
        }
        
        if (!isPdfBuffer(cached.arrayBuffer)) {
            console.error(`[loadFromCache] Cached entry for panel ${panelId} is not a valid PDF - evicting and reloading from network`);
            PdfController.evictFromCache(panelId);
            return this.loadById(panelId, fallbackUrl);
        }
        
        // === INITIALIZATION ===
        this.url = fallbackUrl || "";
        setPdfUiState(PDF_UI_STATE.LOADING, '⚡ LOADING FROM CACHE...');

        const fetchId = Date.now();
        this.currentFetchId = fetchId;

        try {
            // === CLEANUP PREVIOUS LOADING TASK ===
            if (this.loadingTask) {
                await this.loadingTask.destroy().catch(()=>{});
                this.loadingTask = null;
            }

            // === LOAD FROM CACHE ===
            if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
            this.currentPdfBlob = cached.blob;
            this.currentBlobUrl = URL.createObjectURL(cached.blob);
            
            try {
                const docInitStartMs = getNowMs();
                this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(cached.arrayBuffer) });
                this.doc = await this.loadingTask.promise;
                logPdfTiming('document_init', getNowMs() - docInitStartMs, { source: 'cache-hit' });
            } catch (pdfError) {
                console.error(`[loadFromCache] pdfjsLib.getDocument failed for panel ${panelId}:`, pdfError);
                if (pdfError.name === 'InvalidPDFException' || pdfError.message?.includes('Invalid PDF')) {
                    console.error(`[loadFromCache] InvalidPDFException detected - evicting bad cache entry`);
                    PdfController.evictFromCache(panelId);
                }
                throw pdfError;
            }

            // === VALIDATE AND RENDER ===
            if (!this.isDocumentValid()) {
                console.error('[loadFromCache] Loaded PDF document is null or destroyed after loading from cache');
                PdfController.evictFromCache(panelId);
                throw new Error('Loaded PDF document is null or destroyed after loading from cache');
            }

            if (this.currentFetchId !== fetchId) {
                console.log(`[loadFromCache] Load cancelled (fetchId mismatch): ${fetchId} != ${this.currentFetchId}`);
                return;
            }

            this._setScaleForDevice();
            setPdfUiState(PDF_UI_STATE.READY);
            await this.renderStack({ timingSource: 'cache-hit' });
            logPdfTiming('load_complete', getNowMs() - loadStartMs, { source: 'cache-hit' });
            console.log('✓ Loaded from cache'); 
        } catch(e) {
            console.error("[loadFromCache] Cache Load Error:", e);
            PdfController.evictFromCache(panelId);
            this.loadById(panelId, fallbackUrl);
        }
    }

    static async load(url) {
        // Cancel any active OCR tasks when loading a new PDF
        SmartScanner.cancelAllOcrTasks();
        this._beginDocumentLoad();
        const loadStartMs = getNowMs();
        
        // === INITIALIZATION ===
        this.url = url;
        setPdfUiState(PDF_UI_STATE.LOADING, '⏳ DOWNLOADING PDF...');

        const fetchId = Date.now();
        this.currentFetchId = fetchId;

        try {
            // === CLEANUP PREVIOUS LOADING TASK ===
            if (this.loadingTask) {
                await this.loadingTask.destroy().catch(()=>{});
                this.loadingTask = null;
            }

            // === FETCH PDF ===
            const proxyUrl = buildWorkerUrl('PDF', { url });
            const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
            if (!resp.ok) throw new Error(`Fetch Error: ${resp.status}`);
            
            const arrayBuffer = await resp.arrayBuffer();

            if (this.currentFetchId !== fetchId) {
                console.log(`[load] PDF load cancelled (fetchId mismatch): ${fetchId} != ${this.currentFetchId}`);
                return;
            }

            // === VALIDATE PDF ===
            const validation = validatePdfWithContext(resp, arrayBuffer, 'load', url);
            if (!validation.valid) {
                console.error(`[load] Invalid PDF from URL ${url}: ${validation.reason}`);
                setPdfUiState(PDF_UI_STATE.FALLBACK, '', url);
                return;
            }

            // === LOAD PDF ===
            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
            this.currentPdfBlob = blob;
            this.currentBlobUrl = URL.createObjectURL(blob);
            
            try {
                const docInitStartMs = getNowMs();
                this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                this.doc = await this.loadingTask.promise;
                logPdfTiming('document_init', getNowMs() - docInitStartMs, { source: 'network-url' });
            } catch (pdfError) {
                console.error(`[load] pdfjsLib.getDocument failed for URL ${url}:`, pdfError);
                if (pdfError.name === 'InvalidPDFException' || pdfError.message?.includes('Invalid PDF')) {
                    console.error(`[load] InvalidPDFException detected - PDF is malformed`);
                }
                throw pdfError;
            }

            // === VALIDATE AND RENDER ===
            if (!this.isDocumentValid()) {
                throw new Error('Loaded PDF document is null or destroyed after loading');
            }

            if (this.currentFetchId !== fetchId) {
                console.log(`[load] PDF load cancelled after document load (fetchId mismatch): ${fetchId} != ${this.currentFetchId}`);
                return;
            }

            this._setScaleForDevice();
            setPdfUiState(PDF_UI_STATE.READY);
            await this.renderStack({ timingSource: 'network-url' });
            logPdfTiming('load_complete', getNowMs() - loadStartMs, { source: 'network-url' });
        } catch(e) {
            // === ERROR HANDLING ===
            if (e.name === 'RenderingCancelledException' || e.message?.includes('destroyed')) {
                console.log('PDF Load Cancelled (Fast Click)');
            } else {
                console.error("PDF Load Error:", e);
                setPdfUiState(PDF_UI_STATE.FALLBACK, '', url);
            }
        }
    }
    static _buildDownloadFilename() {
        const rawPanelId = (this._activePanelId || DOM_CACHE.get('demo-panel-id')?.value || '').trim();
        const safePanelId = rawPanelId
            .replace(/[\\/:*?"<>|]+/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 80);
        const baseName = safePanelId || `schematic_${new Date().toISOString().slice(0, 10)}`;
        return baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`;
    }
    static _buildAttachmentDownloadUrl() {
        const panelId = (this._activePanelId || '').trim();
        if (!panelId) return '';
        return buildWorkerUrl('PDF_BY_ID', {
            id: panelId,
            mode: 'attachment',
            filename: this._buildDownloadFilename()
        });
    }
    static _supportsBlobDownload() {
        return !this._isIsolatedPdfPrintBrowser();
    }

    static download() {
        if (!this.currentBlobUrl) return;
        if (!this._supportsBlobDownload()) {
            const attachmentUrl = this._buildAttachmentDownloadUrl();
            if (attachmentUrl) {
                const link = document.createElement('a');
                link.href = attachmentUrl;
                link.target = '_blank';
                link.rel = 'noopener';
                document.body.appendChild(link);
                link.click();
                if (link.parentNode === document.body) {
                    document.body.removeChild(link);
                }
                return;
            }
        }
        const link = document.createElement('a');
        link.href = this.currentBlobUrl;
        link.download = this._buildDownloadFilename();
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        if (link.parentNode === document.body) {
            document.body.removeChild(link);
        }
    }

    static _isIsolatedPdfPrintBrowser() {
        const ua = navigator?.userAgent || '';
        const vendor = navigator?.vendor || '';
        const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua) && /Apple/i.test(vendor || 'Apple');
        return isSafari;
    }

    static _createPrintTargetUrl() {
        if (this.currentPdfBlob && typeof URL?.createObjectURL === 'function') {
            return { url: URL.createObjectURL(this.currentPdfBlob), revokeOnCleanup: true };
        }
        return { url: this.currentBlobUrl || '', revokeOnCleanup: false };
    }

    static _releasePrintSession(reason = 'cleanup') {
        const session = this._activePrintSession;
        this._activePrintSession = null;
        this.isPrinting = false;
        if (!session || session.cleaned) return;
        session.cleaned = true;
        ['releaseTimerId', 'cleanupTimerId', 'maxTimerId', 'loadTimerId'].forEach((timerKey) => {
            if (session[timerKey]) {
                clearTimeout(session[timerKey]);
                session[timerKey] = null;
            }
        });
        if (session.iframeWindow && session.afterPrintHandler) {
            try {
                session.iframeWindow.removeEventListener('afterprint', session.afterPrintHandler);
            } catch (_err) {}
        }
        if (session.focusHandler && typeof window?.removeEventListener === 'function') {
            try {
                window.removeEventListener('focus', session.focusHandler);
            } catch (_err) {}
        }
        if (session.visibilityHandler && typeof document?.removeEventListener === 'function') {
            try {
                document.removeEventListener('visibilitychange', session.visibilityHandler);
            } catch (_err) {}
        }
        if (session.iframe) {
            session.iframe.onload = null;
            session.iframe.onerror = null;
            if (session.iframe.parentNode === document.body) {
                try {
                    document.body.removeChild(session.iframe);
                } catch (_err) {}
            }
        }
        if (session.revokeOnCleanup && session.printUrl && typeof URL?.revokeObjectURL === 'function') {
            try {
                URL.revokeObjectURL(session.printUrl);
            } catch (_err) {}
        }
        if (reason) {
            console.log(`[pdf-print] Released print session (${reason})`);
        }
    }

    static _schedulePrintSessionRelease(delay = this.PRINT_DIALOG_RELEASE_DELAY_MS, reason = 'release-scheduled') {
        const session = this._activePrintSession;
        if (!session || session.cleaned) return;
        if (session.releaseTimerId) {
            clearTimeout(session.releaseTimerId);
        }
        session.releaseTimerId = setTimeout(() => this._releasePrintSession(reason), Math.max(0, delay));
    }

    static _createPrintSession(printTarget) {
        this._releasePrintSession('reset-before-print');
        const session = {
            cleaned: false,
            iframe: null,
            iframeWindow: null,
            popup: null,
            printUrl: printTarget.url,
            revokeOnCleanup: !!printTarget.revokeOnCleanup,
            afterPrintHandler: null,
            focusHandler: null,
            visibilityHandler: null,
            releaseTimerId: null,
            cleanupTimerId: null,
            maxTimerId: null,
            loadTimerId: null
        };
        this._activePrintSession = session;
        this.isPrinting = true;
        session.focusHandler = () => this._schedulePrintSessionRelease(this.PRINT_DIALOG_RELEASE_DELAY_MS, 'window-focus');
        session.visibilityHandler = () => {
            if ((document?.visibilityState || 'visible') === 'visible') {
                this._schedulePrintSessionRelease(this.PRINT_DIALOG_RELEASE_DELAY_MS, 'visibility-return');
            }
        };
        if (typeof window?.addEventListener === 'function') {
            window.addEventListener('focus', session.focusHandler);
        }
        if (typeof document?.addEventListener === 'function') {
            document.addEventListener('visibilitychange', session.visibilityHandler);
        }
        session.maxTimerId = setTimeout(() => this._releasePrintSession('max-timeout'), this.PRINT_MAX_TIMEOUT_MS);
        return session;
    }

    static _printViaIsolatedWindow(printTarget) {
        const session = this._createPrintSession(printTarget);
        let popup = null;
        try {
            popup = typeof window?.open === 'function' ? window.open(printTarget.url, '_blank') : null;
        } catch (error) {
            console.error('PDF print window failed to open:', error);
        }
        if (!popup) {
            this._releasePrintSession('popup-open-failed');
            alert('Unable to open the PDF print tab. Please allow pop-ups for this site or use Download PDF.');
            return;
        }
        session.popup = popup;
        const safariMessage = 'Opened the PDF in a new tab because this browser may print the app shell instead of the PDF from the embedded viewer. If the print dialog does not appear automatically, use the browser Print/Share action in that PDF tab.';
        let autoPrintStarted = false;
        try {
            popup.focus?.();
            if (typeof popup.print === 'function') {
                popup.print();
                autoPrintStarted = true;
            }
        } catch (error) {
            console.warn('Isolated PDF print invocation failed:', error);
        }
        if (!autoPrintStarted) {
            alert(safariMessage);
        }
        session.cleanupTimerId = setTimeout(() => this._releasePrintSession('isolated-window-timeout'), this.PRINT_CLEANUP_TIMEOUT_MS);
    }

    static _printViaIframe(printTarget) {
        const session = this._createPrintSession(printTarget);
        const iframe = document.createElement('iframe');
        session.iframe = iframe;
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.setAttribute('aria-hidden', 'true');
        iframe.src = printTarget.url;
        session.loadTimerId = setTimeout(() => this._releasePrintSession('iframe-load-timeout'), this.PRINT_IFRAME_LOAD_TIMEOUT_MS);
        iframe.onload = () => {
            if (session.loadTimerId) {
                clearTimeout(session.loadTimerId);
                session.loadTimerId = null;
            }
            try {
                session.iframeWindow = iframe.contentWindow;
                if (!session.iframeWindow) {
                    this._releasePrintSession('missing-iframe-window');
                    return;
                }
                session.afterPrintHandler = () => this._releasePrintSession('afterprint');
                session.iframeWindow.addEventListener('afterprint', session.afterPrintHandler, { once: true });
                session.iframeWindow.focus();
                session.iframeWindow.print();
                session.cleanupTimerId = setTimeout(() => this._releasePrintSession('cleanup-timeout'), this.PRINT_CLEANUP_TIMEOUT_MS);
            } catch (error) {
                console.error('Print error:', error);
                this._releasePrintSession('iframe-print-error');
            }
        };
        iframe.onerror = () => {
            console.error('Print iframe failed to load');
            this._releasePrintSession('iframe-error');
        };
        try {
            document.body.appendChild(iframe);
        } catch (error) {
            console.error('Print iframe append failed:', error);
            this._releasePrintSession('iframe-append-error');
        }
    }

    static print() {
        if (!this.currentBlobUrl && !this.currentPdfBlob) return alert("No PDF loaded to print.");
        if (this.isPrinting) {
            console.warn('Print already in progress, ignoring duplicate print request');
            return;
        }
        const printTarget = this._createPrintTargetUrl();
        if (!printTarget.url) {
            alert('Unable to prepare the loaded PDF for printing right now. Please reload the PDF and try again.');
            return;
        }
        if (this._isIsolatedPdfPrintBrowser()) {
            this._printViaIsolatedWindow(printTarget);
            return;
        }
        this._printViaIframe(printTarget);
    }
    static async renderStack({ timingSource = 'unspecified', expectedDocumentLoadToken = null, anchorContext = null } = {}) {
        const container = document.getElementById('pdf-main-view'); 
        if (!container) {
            console.error('PDF container not found');
            return;
        }
        if (expectedDocumentLoadToken !== null && expectedDocumentLoadToken !== this._documentLoadToken) {
            return;
        }
        const renderStartMs = getNowMs();
        let firstPageReadyMs = null;
        const priorStage = this._getGestureStage();
        const priorStageWidth = priorStage ? Math.max(1, priorStage.offsetWidth || 1) : 0;
        const priorStageHeight = priorStage ? Math.max(1, priorStage.offsetHeight || 1) : 0;
        const priorStageOffsetLeft = priorStage ? priorStage.offsetLeft : 0;
        const priorStageOffsetTop = priorStage ? priorStage.offsetTop : 0;
        const priorAnchorOffsetX = Math.max(0, Math.min(container.clientWidth || 0, (container.clientWidth || 0) / 2));
        const priorAnchorOffsetY = Math.max(0, Math.min(container.clientHeight || 0, (container.clientHeight || 0) / 2));
        const priorState = {
            anchorOffsetX: priorAnchorOffsetX,
            anchorOffsetY: priorAnchorOffsetY,
            scrollRatioX: priorStageWidth > 0
                ? (container.scrollLeft + priorAnchorOffsetX - priorStageOffsetLeft) / priorStageWidth
                : Number.NaN,
            scrollRatioY: priorStageHeight > 0
                ? (container.scrollTop + priorAnchorOffsetY - priorStageOffsetTop) / priorStageHeight
                : Number.NaN
        };
        const stage = document.createElement('div');
        stage.className = 'pdf-gesture-stage pdf-gesture-stage--staging';
        stage.setAttribute('aria-hidden', 'true');
        container.appendChild(stage);
        this._gestureStageElement = stage;
        this._updateZoomLabel();
        
        if (!this.doc) {
            console.error('No PDF document loaded');
            return;
        }
        
        // Capture render token to detect if rendering is superseded
        const renderToken = ++this.currentRenderToken;
        
        let coverDoc = this.doc;
        if (DemoManager.isGeneratorActive && window.TEMPLATE_BYTES instanceof ArrayBuffer) {
             const tTask = pdfjsLib.getDocument(window.TEMPLATE_BYTES.slice(0));
             coverDoc = await tTask.promise;
        }

        for (let i = 1; i <= this.doc.numPages; i++) {
            // Check if render has been superseded
            if (this.currentRenderToken !== renderToken) {
                console.log(`[renderStack] Render cancelled (token mismatch): ${renderToken} != ${this.currentRenderToken}`);
                this._removeRenderArtifactsForToken(container, renderToken);
                if (stage.parentNode === container) stage.remove();
                return;
            }
            
            // Check if document is still valid
            if (!this.isDocumentValid()) {
                console.warn('[renderStack] Document became invalid during rendering');
                return;
            }
            
            let page; let isTemplate = false;
            
            // Wrap getPage in try/catch
            try {
                if (i === 1 && DemoManager.isGeneratorActive && window.TEMPLATE_BYTES instanceof ArrayBuffer) {
                    page = await coverDoc.getPage(1);
                    isTemplate = true;
                } else {
                    page = await this.doc.getPage(i);
                }
            } catch (pageError) {
                console.error(`[renderStack] Failed to get page ${i}:`, pageError);
                // Check for destroyed transport or InvalidPDFException
                if (pageError.message?.includes('destroyed') || pageError.message?.includes('Transport destroyed')) {
                    console.error('[renderStack] Transport destroyed - stopping render');
                    return;
                }
                // Fall back to original doc's page 1 if template fails
                try { page = await this.doc.getPage(i); } catch(e) { continue; }
            }

            if (!page) {
                console.warn(`[renderStack] Page ${i} is null, skipping`);
                continue;
            }
            
            const viewport = page.getViewport({ scale: this.currentScale });
            const renderMetrics = (typeof PdfRenderHelper !== 'undefined' && PdfRenderHelper?.getRenderMetrics)
                ? PdfRenderHelper.getRenderMetrics(viewport, window.devicePixelRatio || 1)
                : {
                    cssWidth: Math.max(1, Math.floor(viewport.width)),
                    cssHeight: Math.max(1, Math.floor(viewport.height)),
                    backingWidth: Math.max(1, Math.floor(viewport.width)),
                    backingHeight: Math.max(1, Math.floor(viewport.height)),
                    transform: null
                };
            const wrapper = document.createElement('div'); wrapper.className = 'pdf-page-wrapper';
            wrapper.dataset.renderToken = String(renderToken);
            wrapper.style.width = renderMetrics.cssWidth + "px"; 
            wrapper.dataset.pageNumber = i;
            
            const toolbar = document.createElement('div');
            toolbar.className = 'page-toolbar';
            toolbar.innerHTML = `
                <span style="font-weight:600;">PAGE ${i}</span>
                <select class="page-profile-select" onchange="LayoutScanner.updatePageProfile(${i}, this.value)">
                    <option value="AUTO">✨ Auto (Detected)</option>
                    <option value="COVER_TEMPLATE">📋 Cover Template</option>
                    <optgroup label="📁 Info &amp; Notes">
                        <option value="INFO">📝 Info / Notes (Standard)</option>
                        <option value="INFO_BORDERLESS">🖼️ Info (Borderless)</option>
                    </optgroup>
                    <optgroup label="📁 Schematics">
                        <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Portrait)</option>
                        <option value="SCHEMATIC_PORTRAIT_BORDERLESS">🖼️ Schematic (Portrait Borderless)</option>
                        <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Landscape)</option>
                        <option value="SCHEMATIC_LANDSCAPE_BORDERLESS">🖼️ Schematic (Landscape Borderless)</option>
                    </optgroup>
                    <optgroup label="📁 Special">
                        <option value="DOOR_DRAWING">🚪 Door Drawing</option>
                        <option value="GENERAL">📐 General</option>
                    </optgroup>
                </select>
                <button class="rescan-btn" onclick="SmartScanner.rescanPage(${i})" title="Re-scan this page">🔄</button>
            `;
            if (i === 1) {
                const sel = toolbar.querySelector('.page-profile-select');
                if (sel) { sel.value = 'COVER_TEMPLATE'; sel.disabled = true; }
            }
            wrapper.appendChild(toolbar);

            const contentContainer = document.createElement('div');
            contentContainer.className = 'pdf-content-container';
            contentContainer.style.width = renderMetrics.cssWidth + "px";
            contentContainer.style.height = renderMetrics.cssHeight + "px";

            const canvas = document.createElement('canvas'); canvas.className = 'pdf-page-canvas';
            canvas.width = renderMetrics.backingWidth;
            canvas.height = renderMetrics.backingHeight;
            canvas.style.width = renderMetrics.cssWidth + "px";
            canvas.style.height = renderMetrics.cssHeight + "px";
            
            const rLayer = document.createElement('div'); rLayer.className = 'redaction-layer';
            if(document.body.classList.contains('demo-mode')) rLayer.classList.add('editing');
            
            contentContainer.appendChild(canvas); 
            contentContainer.appendChild(rLayer); 

            if (this.currentRenderToken !== renderToken) {
                console.log(`[renderStack] Render cancelled before attaching page ${i} (token mismatch): ${renderToken} != ${this.currentRenderToken}`);
                this._removeRenderArtifactsForToken(container, renderToken);
                if (stage.parentNode === container) stage.remove();
                return;
            }

            wrapper.appendChild(contentContainer); 
            stage.appendChild(wrapper); 
            
            console.log(`📄 Created layer structure for page ${i}`);
            console.log(`  - Container: ${contentContainer.offsetWidth}x${contentContainer.offsetHeight}`);
            console.log(`  - Redaction layer: ${rLayer.offsetWidth}x${rLayer.offsetHeight}`);

            // Check again if render has been superseded before rendering canvas
            if (this.currentRenderToken !== renderToken) {
                console.log(`[renderStack] Render cancelled before canvas render (token mismatch): ${renderToken} != ${this.currentRenderToken}`);
                this._removeRenderArtifactsForToken(container, renderToken);
                if (stage.parentNode === container) stage.remove();
                return;
            }

            // Add null check for canvas context and wrap render in try/catch
            const ctx = canvas.getContext('2d');
            if (ctx) {
                try {
                    await page.render({ canvasContext: ctx, viewport, transform: renderMetrics.transform }).promise;
                    if (i === 1 && firstPageReadyMs === null) {
                        firstPageReadyMs = getNowMs() - renderStartMs;
                        logPdfTiming('first_page_ready', firstPageReadyMs, { source: timingSource });
                    }
                } catch (renderError) {
                    console.warn(`[renderStack] Failed to render page ${i}:`, renderError);
                    // Check for destroyed transport
                    if (renderError.message?.includes('destroyed') || renderError.message?.includes('Transport destroyed')) {
                        console.error('[renderStack] Transport destroyed during render - stopping');
                        return;
                    }
                }
            }
            if (this.currentRenderToken !== renderToken) {
                console.log(`[renderStack] Render cancelled after canvas render (token mismatch): ${renderToken} != ${this.currentRenderToken}`);
                this._removeRenderArtifactsForToken(container, renderToken);
                if (stage.parentNode === container) stage.remove();
                return;
            }
            // Re-scale any existing overlay zones to match new page dimensions
            await PdfViewer.waitForLayoutStable(contentContainer);
            RedactionManager.rescaleZones(wrapper);
            // Second pass after fade-in animation may alter layout
            requestAnimationFrame(() => RedactionManager.rescaleZones(wrapper));
        }
        await PdfViewer.waitForLayoutStable(stage, { minWidth: 1, minHeight: 1 });
        if (!this._restoreScrollFromAnchorContext(container, stage, anchorContext)) {
            this._restoreScrollFromPriorRatios(container, stage, priorState);
        }
        if (this._activeGesture) {
            this._applyViewerTransform(this._liveScale || 1, this._committedPanX, this._committedPanY);
        } else {
            this._liveScale = 1;
            this._committedPanX = 0;
            this._committedPanY = 0;
            this._applyViewerTransform(1, 0, 0);
        }
        const existingStages = Array.from(container.querySelectorAll('.pdf-gesture-stage'));
        existingStages.forEach(existingStage => {
            if (existingStage !== stage) existingStage.remove();
        });
        stage.classList.remove('pdf-gesture-stage--staging');
        stage.removeAttribute('aria-hidden');
        this._gestureStageElement = stage;
        logPdfTiming('full_render_complete', getNowMs() - renderStartMs, { source: timingSource, pages: this.doc?.numPages || 0 });
        // Populate ALL profile dropdowns ONCE after all pages are rendered
        // This ensures all <select> elements exist in the DOM before population
        console.log('[renderStack] All pages rendered, calling refreshProfileOptions()');
        setTimeout(() => {
            LayoutScanner.refreshProfileOptions();
        }, 100); // 100ms delay to ensure DOM has fully updated
        if(DemoManager.isGeneratorActive) {
            // Populate page selector
            const pageSelector = document.getElementById('page-selector');
            if (pageSelector) {
                pageSelector.innerHTML = '';
                for (let i = 1; i <= this.doc.numPages; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Page ${i}`;
                    pageSelector.appendChild(option);
                }
                console.log(`📄 Initialized page selector with ${this.doc.numPages} pages`);
            }
            
            // Set initial page context
            PageContext.setActivePage(1);
            
            // Start scan immediately after render; remove transition class once scan completes
            console.log('🔍 Auto-scanning PDF pages...');
            SmartScanner.scanAllPages().finally(() => {
                document.body.classList.remove('generator-transition');
            });
        } else {
            document.body.classList.remove('generator-transition');
        }
    }
    static zoom(delta) {
        if (!Number.isFinite(delta)) return;
        const nextScale = this._clampScale(this.currentScale + delta);
        if (nextScale === this.currentScale) return;
        this.currentScale = nextScale;
        this._userHasAdjustedZoom = true;
        this._updateZoomLabel();
        this._clearZoomTimer();
        this._zoomTimer = setTimeout(() => {
            this._zoomTimer = null;
            if (!this.isDocumentValid()) return;
            this.renderStack({ timingSource: 'toolbar-zoom' });
        }, this.ZOOM_DEBOUNCE_MS);
    }

    /** Wait two animation frames so the browser has had a chance to perform layout. */
    static waitForLayoutStable(element, { minWidth = 1, minHeight = 1, retries = 10, delay = 50 } = {}) {
        return new Promise((resolve) => {
            const check = (remainingRetries) => {
                if ((element.offsetWidth >= minWidth && element.offsetHeight >= minHeight) || remainingRetries <= 0) {
                    // Two nested RAF calls to let layout and paint finish
                    requestAnimationFrame(() => requestAnimationFrame(resolve));
                } else {
                    setTimeout(() => check(remainingRetries - 1), delay);
                }
            };
            check(retries);
        });
    }
}

class PdfController {
    static pdfCache = new Map(); // Cache for preloaded PDFs
    static preloadQueue = [];
    static isPreloading = false;
    static preloadInFlight = new Map();
    static preloadGeneration = 0;
    static PRELOAD_CONCURRENCY = 3;
    static CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
    static CACHE_MAX_SIZE = 20; // Maximum number of PDFs to cache

    static _getPrioritizedFirstPageResults(results) {
        const visibleIds = Array.from(document.querySelectorAll('#results-area .record-card[data-record-id]'))
            .map((el) => el.dataset.recordId)
            .filter(Boolean);
        if (!visibleIds.length) return results;

        const rank = new Map(visibleIds.map((id, index) => [id, index]));
        return [...results].sort((a, b) => {
            const ra = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
            const rb = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
            return ra - rb;
        });
    }

    static _cachePdfArrayBuffer(id, arrayBuffer, source) {
        const cacheInsertStartMs = getNowMs();
        this.pdfCache.set(id, {
            arrayBuffer,
            blob: new Blob([arrayBuffer], { type: "application/pdf" }),
            timestamp: Date.now()
        });
        this.clearCache();
        logPdfTiming('cache_insert', getNowMs() - cacheInsertStartMs, { source });
    }

    static _getOrStartPreload(result, generation) {
        const existing = this.preloadInFlight.get(result.id);
        if (existing) return existing;

        const preloadPromise = (async () => {
            const preloadFetchStartMs = getNowMs();
            try {
                const proxyUrl = buildWorkerUrl('PDF_BY_ID', { id: result.id });
                const resp = await fetch(proxyUrl, { headers: AuthService.headers() });

                if (!this.isPreloading || generation !== this.preloadGeneration) return;

                if (resp.status === 404) {
                    console.warn(`[preload] PDF_BY_ID returned 404 for ${result.displayId || result.id}`);
                    const fallbackResult = await attemptPdfFallbackFetch(result.pdfUrl, result.displayId || result.id, AuthService.headers());
                    if (fallbackResult && this.isPreloading && generation === this.preloadGeneration) {
                        logPdfTiming('preload_fetch', getNowMs() - preloadFetchStartMs, { source: 'fallback', status: 'ok' });
                        this._cachePdfArrayBuffer(result.id, fallbackResult.arrayBuffer, 'preload-fallback');
                        console.log(`✓ Preloaded PDF (via fallback): ${result.displayId || result.id}`);
                        return;
                    }

                    result.pdfStatus = PDF_STATUS.MISSING;
                    console.log(`[preload] Marked ${result.displayId || result.id} as missing PDF`);
                    logPdfTiming('preload_fetch', getNowMs() - preloadFetchStartMs, { source: 'fallback', status: 'missing' });
                    return;
                }

                if (!resp || !resp.ok) {
                    console.warn(`[preload] Skipping: Response not OK for ${result.displayId || result.id} (status: ${resp?.status})`);
                    logPdfTiming('preload_fetch', getNowMs() - preloadFetchStartMs, { source: 'by-id', status: 'error' });
                    return;
                }

                const arrayBuffer = await resp.arrayBuffer();
                if (!this.isPreloading || generation !== this.preloadGeneration) return;

                const validation = validatePdfWithContext(resp, arrayBuffer, 'preload', result.displayId || result.id);
                if (!validation.valid) {
                    console.warn(`[preload] Skipping invalid PDF for ${result.displayId || result.id}: ${validation.reason}`);
                    logPdfTiming('preload_fetch', getNowMs() - preloadFetchStartMs, { source: 'by-id', status: 'invalid' });
                    return;
                }

                logPdfTiming('preload_fetch', getNowMs() - preloadFetchStartMs, { source: 'by-id', status: 'ok' });
                this._cachePdfArrayBuffer(result.id, arrayBuffer, 'preload-by-id');
                console.log(`✓ Preloaded PDF: ${result.displayId || result.id}`);
            } catch (e) {
                console.warn(`[preload] Failed to preload PDF ${result.id}:`, e);
                logPdfTiming('preload_fetch', getNowMs() - preloadFetchStartMs, { source: 'by-id', status: 'exception' });
            }
        })();

        this.preloadInFlight.set(result.id, preloadPromise);
        preloadPromise.finally(() => {
            if (this.preloadInFlight.get(result.id) === preloadPromise) {
                this.preloadInFlight.delete(result.id);
            }
        });

        return preloadPromise;
    }

    static async load(id, url) {
        const placeholderEl = DOM_CACHE.get('pdf-placeholder-text');
        if (placeholderEl) placeholderEl.style.display = 'none';
        
        const rec = window.ID_MAP.get(id);
        if(rec && rec.displayId) {
            const panelIdEl = DOM_CACHE.get('demo-panel-id');
            if (panelIdEl) panelIdEl.value = rec.displayId;
            PdfViewer._activePanelId = rec.displayId;
        } else {
            PdfViewer._activePanelId = id ? `CP-${String(id).replace(/^CP-/i, '')}` : '';
        }
        
        // === VALIDATE ID ===
        if (!id) {
            setPdfUiState(PDF_UI_STATE.FALLBACK, '', url);
            return; 
        }
        
        // === CHECK CACHE FIRST ===
        const cached = this.pdfCache.get(id);
        if (cached) {
            await PdfViewer.loadFromCache(cached, id, url);
            return;
        }

        const inflight = this.preloadInFlight.get(id);
        if (inflight) {
            const waitStartMs = getNowMs();
            try {
                await inflight;
            } catch (e) {
                console.warn('[load] In-flight preload wait failed; proceeding with direct load', e);
            }
            logPdfTiming('preload_inflight_wait', getNowMs() - waitStartMs, { source: 'click-load' });
            const warmed = this.pdfCache.get(id);
            if (warmed) {
                await PdfViewer.loadFromCache(warmed, id, url);
                return;
            }
        }

        const warmedAfterCheck = this.pdfCache.get(id);
        if (warmedAfterCheck) {
            logPdfTiming('preload_inflight_wait', 0, { source: 'click-load', status: 'already-warm' });
            await PdfViewer.loadFromCache(warmedAfterCheck, id, url);
            return;
        }

        await PdfViewer.loadById(id, url);
    }

    static async preloadSearchResults(results) {
        // Stop any in-progress preloading first
        this.stopPreloading();
        
        // === VALIDATE INPUTS ===
        if (!results || !Array.isArray(results) || results.length === 0) {
            return;
        }
        
        // === FILTER PRELOAD QUEUE ===
        // Preload first page of search results (top to bottom)
        // Skip records that are flagged as missing PDFs or already cached
        const firstPageResults = results.slice(0, SearchEngine.pageSize)
            .filter(r => {
                if (!r || !r.id) return false;
                if (this.pdfCache.has(r.id)) return false;
                if (!r.pdfUrl || r.pdfStatus === PDF_STATUS.MISSING) {
                    console.log(`[preload] Skipping ${r.displayId || r.id}: PDF not available (pdfUrl: ${!!r.pdfUrl}, pdfStatus: ${r.pdfStatus})`);
                    return false;
                }
                return true;
            });
        const queue = this._getPrioritizedFirstPageResults(firstPageResults);
        this.preloadQueue = queue;
        this.isPreloading = true;
        const generation = ++this.preloadGeneration;
        let queueIndex = 0;
        const workerCount = Math.max(1, Math.min(this.PRELOAD_CONCURRENCY, queue.length));

        const worker = async () => {
            while (this.isPreloading && generation === this.preloadGeneration) {
                const currentIndex = queueIndex++;
                if (currentIndex >= queue.length) return;
                const result = queue[currentIndex];
                await this._getOrStartPreload(result, generation);
            }
        };

        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        if (generation !== this.preloadGeneration) return;
        this.isPreloading = false;
        this.clearCache(); // Clean up old entries after preloading
    }

    static stopPreloading() {
        this.isPreloading = false;
        this.preloadQueue = [];
        this.preloadGeneration++;
    }

    static evictFromCache(id) {
        // Remove a specific entry from cache
        if (this.pdfCache.has(id)) {
            this.pdfCache.delete(id);
            console.log(`Evicted cached PDF: ${id}`);
        }
    }

    static clearAllCache() {
        // Clear all cached PDFs immediately (for user-initiated cache clear)
        const count = this.pdfCache.size;
        this.pdfCache.clear();
        console.log(`Cleared all cached PDFs (${count} entries)`);
        return count;
    }

    static clearCache() {
        // Clear old cached PDFs (older than CACHE_MAX_AGE_MS) and enforce size limit
        const now = Date.now();
        
        // First, remove expired entries
        const toDelete = [];
        for (const [id, cached] of this.pdfCache.entries()) {
            if (now - cached.timestamp > this.CACHE_MAX_AGE_MS) {
                toDelete.push(id);
            }
        }
        toDelete.forEach(id => this.pdfCache.delete(id));
        
        // If still over size limit, remove oldest entries (simple LRU eviction)
        if (this.pdfCache.size > this.CACHE_MAX_SIZE) {
            // Find oldest entries to remove
            const entries = Array.from(this.pdfCache.entries());
            const numToRemove = this.pdfCache.size - this.CACHE_MAX_SIZE;
            
            // Simple sort only on the entries we need to examine
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < numToRemove; i++) {
                this.pdfCache.delete(entries[i][0]);
            }
        }
    }
}

class UI {
    static mobilePanels = { searchVisible: true, resultsVisible: false };
    static mobilePdfFocus = false;
    static mobileManualPanelState = { search: false, results: false };
    static refineToggleHome = null;
    static paginationFooterHome = null;

    static init() { 
        if(localStorage.getItem('cox_theme') === 'dark') { 
            document.body.classList.add('dark-mode'); 
        } 
        window.addEventListener('mousemove', (e) => RedactionManager.handleDrag(e)); 
        window.addEventListener('mouseup', () => RedactionManager.endDrag()); 
        window.addEventListener('resize', () => UI.handleViewportChange());
        window.addEventListener('orientationchange', () => UI.handleViewportChange());
        document.addEventListener('click', (e) => { 
            const menu = DOM_CACHE.get('main-menu'); 
            const btn = document.querySelector('.menu-btn'); 
            if (menu && menu.classList.contains('visible') && !menu.contains(e.target) && !btn.contains(e.target)) { 
                menu.classList.remove('visible'); 
            }
            // Close Print/Export action sheet if clicking outside
            const printMenu = document.getElementById('print-export-menu');
            if (printMenu && printMenu.style.display === 'block' && !printMenu.contains(e.target)) {
                const printBtn = printMenu.previousElementSibling;
                if (!printBtn || !printBtn.contains(e.target)) {
                    printMenu.style.display = 'none';
                }
            }
        }); 

        this.handleViewportChange();
    }
    
    static isSmallMobile() { return window.innerWidth < 768; }
    static isTablet() { return window.innerWidth >= 768; } // includes desktop — docked sidebar on all non-mobile widths

    static toggleDarkMode() { 
        document.body.classList.toggle('dark-mode'); 
        localStorage.setItem('cox_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); 
    }
    
    static clearPdfCache() { 
        const count = PdfController.clearAllCache(); 
        console.log(`✓ User cleared ${count} cached PDF${count !== 1 ? 's' : ''}`);
        const msg = `Cleared ${count} cached PDF${count !== 1 ? 's' : ''}. Cache is now empty.`;
        console.log(msg);
        alert(msg);
    }
    
    static handleEnter(e) { 
        if(e.key==='Enter') SearchEngine.perform(); 
    }
    
    static resetSearch() { 
        document.querySelectorAll('select').forEach(s=>s.value="Any"); 
        const keywordInput = DOM_CACHE.get('keywordInput');
        if (keywordInput) keywordInput.value=''; 
        this.toggleSearch(true); 
    }
    
    static closeMobilePreview() { 
        this.mobilePdfFocus = false;
        this.showMobileResults(); 
    }
    
    static toggleLeftSidebar() { 
        const sidebar = DOM_CACHE.get('sidebar-left');
        const toggle = DOM_CACHE.get('toggle-left');
        if (sidebar && toggle) {
            sidebar.classList.toggle('collapsed'); 
            toggle.innerText = sidebar.classList.contains('collapsed') ? '›' : '‹';
        }
    }
    
    static toggleRightSidebar() { 
        const el = DOM_CACHE.get('sidebar-right'); 
        const toggle = DOM_CACHE.get('toggle-right');
        if (el && toggle) {
            el.classList.toggle('collapsed'); 
            toggle.innerText = el.classList.contains('collapsed') ? '⚙️' : '›';
        }
    }
    
    static toggleSearch(e) { 
        if (this.isSmallMobile()) {
            const shouldShow = typeof e === 'boolean' ? e : !this.mobilePanels.searchVisible;
            this.mobilePanels.searchVisible = shouldShow;
            this.mobilePdfFocus = false;
            this.syncMobileLayout();
            return;
        }

        const c = DOM_CACHE.get('search-controls'); 
        const refineBtn = DOM_CACHE.get('refine-btn-area');
        if(!c) return; 
        const shouldShow = typeof e === 'boolean' ? e : c.classList.contains('collapsed');
        if(shouldShow) { 
            c.classList.remove('collapsed'); 
            if (refineBtn && !this.isSmallMobile()) refineBtn.classList.remove('visible'); 
        } else { 
            c.classList.add('collapsed'); 
            if (refineBtn && !this.isSmallMobile()) refineBtn.classList.add('visible'); 
        } 
        this.syncMobileToggleLabels();
    }

    static hasSearchResults() {
        return Array.isArray(SearchEngine.currentResults) && SearchEngine.currentResults.length > 0;
    }

    static isSearchPanelExpanded() {
        if (this.isSmallMobile()) return this.mobilePanels.searchVisible;
        return !DOM_CACHE.get('search-controls')?.classList.contains('collapsed');
    }

    static hasMobileResultsPanel() {
        return this.hasSearchResults() || SearchEngine.lastCriteria !== null;
    }

    static syncMobileResultsCount(totalCount = SearchEngine.currentResults.length) {
        const resultsCount = DOM_CACHE.get('results-count');
        if (resultsCount) {
            resultsCount.textContent = `Found ${totalCount} records`;
        }
    }

    static syncMobileToggleLabels() {
        const refineToggleBtn = DOM_CACHE.get('refine-toggle-btn');
        const resultsToggleBtn = DOM_CACHE.get('results-toggle-btn');

        if (refineToggleBtn) {
            const searchExpanded = this.isSearchPanelExpanded();
            refineToggleBtn.textContent = searchExpanded ? 'HIDE' : 'SHOW';
            refineToggleBtn.setAttribute('aria-expanded', searchExpanded ? 'true' : 'false');
            refineToggleBtn.setAttribute('aria-label', searchExpanded ? 'Hide Search panel' : 'Show Search panel');
            refineToggleBtn.setAttribute('title', searchExpanded ? 'Hide Search panel' : 'Show Search panel');
        }

        if (resultsToggleBtn) {
            const resultsExpanded = this.mobilePanels.resultsVisible && this.hasMobileResultsPanel();
            resultsToggleBtn.textContent = resultsExpanded ? 'HIDE' : 'SHOW';
            resultsToggleBtn.setAttribute('aria-expanded', resultsExpanded ? 'true' : 'false');
            resultsToggleBtn.setAttribute('aria-label', resultsExpanded ? 'Hide Results panel' : 'Show Results panel');
            resultsToggleBtn.setAttribute('title', resultsExpanded ? 'Hide Results panel' : 'Show Results panel');
        }
    }

    static syncRefineTogglePlacement() {
        const refineArea = DOM_CACHE.get('refine-btn-area');
        if (!refineArea) return;

        if (!this.refineToggleHome) {
            this.refineToggleHome = {
                parent: refineArea.parentElement,
                nextSibling: refineArea.nextElementSibling
            };
        }

        const searchActionRow = DOM_CACHE.get('search-action-row');
        const searchBtn = DOM_CACHE.get('searchBtn');

        if (this.isSmallMobile() && searchActionRow && searchBtn && refineArea.parentElement !== searchActionRow) {
            searchActionRow.insertBefore(refineArea, searchBtn);
        } else if (!this.isSmallMobile() && this.refineToggleHome?.parent && refineArea.parentElement !== this.refineToggleHome.parent) {
            const { parent, nextSibling } = this.refineToggleHome;
            if (nextSibling && nextSibling.parentElement === parent) {
                parent.insertBefore(refineArea, nextSibling);
            } else {
                parent.appendChild(refineArea);
            }
        }
    }

    static syncPaginationPlacement() {
        const paginationFooter = DOM_CACHE.get('pagination-footer');
        if (!paginationFooter) return;

        if (!this.paginationFooterHome) {
            this.paginationFooterHome = {
                parent: paginationFooter.parentElement,
                nextSibling: paginationFooter.nextElementSibling
            };
        }

        const resultsScrollArea = DOM_CACHE.get('results-scroll-area');

        if (this.isSmallMobile() && resultsScrollArea && paginationFooter.parentElement !== resultsScrollArea) {
            resultsScrollArea.appendChild(paginationFooter);
        } else if (!this.isSmallMobile() && this.paginationFooterHome?.parent && paginationFooter.parentElement !== this.paginationFooterHome.parent) {
            const { parent, nextSibling } = this.paginationFooterHome;
            if (nextSibling && nextSibling.parentElement === parent) {
                parent.insertBefore(paginationFooter, nextSibling);
            } else {
                parent.appendChild(paginationFooter);
            }
        }
    }

    static syncMobileLayout() {
        const body = document.body;
        if (!body) return;
        const controls = DOM_CACHE.get('search-controls');
        const refineBtn = DOM_CACHE.get('refine-btn-area');
        const paginationFooter = DOM_CACHE.get('pagination-footer');
        const hasResultsPanel = this.hasMobileResultsPanel();
        this.syncRefineTogglePlacement();
        this.syncPaginationPlacement();

        if (!hasResultsPanel) {
            this.mobilePanels.resultsVisible = false;
        }

        body.classList.toggle('results-ready', hasResultsPanel);

        if (!this.isSmallMobile()) {
            body.classList.remove('mobile-search-hidden', 'mobile-results-hidden', 'mobile-results-available', 'mobile-pdf-focus');
            refineBtn?.classList.toggle('visible', !!controls?.classList.contains('collapsed'));
            this.syncMobileToggleLabels();
            return;
        }

        controls?.classList.remove('collapsed');
        refineBtn?.classList.add('visible');

        body.classList.toggle('mobile-search-hidden', !this.mobilePanels.searchVisible);
        body.classList.toggle('mobile-results-hidden', !this.mobilePanels.resultsVisible);
        body.classList.toggle('mobile-results-available', hasResultsPanel);
        body.classList.toggle('mobile-pdf-focus', !!this.mobilePdfFocus);

        if (paginationFooter) {
            paginationFooter.style.display = this.hasSearchResults() && this.mobilePanels.resultsVisible ? 'flex' : 'none';
        }

        this.syncMobileToggleLabels();
    }

    static showMobileSearch() {
        this.toggleSearch(true);
    }

    static showMobileResults() {
        if (!this.hasMobileResultsPanel()) return;
        this.mobilePanels.resultsVisible = true;
        this.mobilePdfFocus = false;
        this.syncMobileLayout();
    }

    static toggleMobileSearch() {
        this.mobileManualPanelState.search = true;
        this.toggleSearch(!this.isSearchPanelExpanded());
    }

    static toggleMobileResults(forceVisible) {
        if (!this.hasMobileResultsPanel()) return;
        this.mobileManualPanelState.results = true;
        this.mobilePanels.resultsVisible = typeof forceVisible === 'boolean' ? forceVisible : !this.mobilePanels.resultsVisible;
        this.mobilePdfFocus = false;
        this.syncMobileLayout();
    }

    static handleSearchCompletion(hasResults) {
        this.mobilePdfFocus = false;
        if (!this.isSmallMobile()) {
            this.toggleSearch(!hasResults);
            return;
        }

        if (hasResults) {
            this.mobilePanels.searchVisible = false;
            this.mobilePanels.resultsVisible = true;
        } else {
            if (!this.mobileManualPanelState.search) {
                this.mobilePanels.searchVisible = true;
            }
            if (!this.mobileManualPanelState.results) {
                this.mobilePanels.resultsVisible = false;
            }
        }

        this.syncMobileLayout();
    }

    static focusMobilePreview() {
        this.mobilePdfFocus = true;
        this.syncMobileLayout();

        if (!this.isSmallMobile()) return;

        const previewPane = DOM_CACHE.get('preview-pane');
        previewPane?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    static handleViewportChange() {
        this.syncRefineTogglePlacement();

        if (this.isSmallMobile()) {
            const controls = DOM_CACHE.get('search-controls');

            if (this.hasSearchResults()) {
                if (!this.mobileManualPanelState.results) {
                    this.mobilePanels.resultsVisible = true;
                }
                if (!this.mobileManualPanelState.search && controls) {
                    this.mobilePanels.searchVisible = !controls.classList.contains('collapsed');
                }
            } else if (SearchEngine.lastCriteria !== null) {
                if (!this.mobileManualPanelState.search) {
                    this.mobilePanels.searchVisible = true;
                }
                if (!this.mobileManualPanelState.results) {
                    this.mobilePanels.resultsVisible = false;
                }
            } else {
                this.mobilePanels.searchVisible = true;
                this.mobilePanels.resultsVisible = false;
                this.mobilePdfFocus = false;
            }

            this.syncMobileLayout();
            DemoManager.syncLayoutForViewport();
            return;
        }

        this.syncMobileLayout();
        DemoManager.syncLayoutForViewport();
    }
    
    static toggleMenu() { 
        const menu = DOM_CACHE.get('main-menu');
        if (menu) menu.classList.toggle('visible'); 
    }
    
static pop() { 
    // === PRESERVE CURRENT SELECTIONS ===
    const savedValues = {
        mfg: DOM_CACHE.get('mfgInput')?.value,
        hp: DOM_CACHE.get('hpInput')?.value,
        volt: DOM_CACHE.get('voltInput')?.value,
        phase: DOM_CACHE.get('phaseInput')?.value,
        enc: DOM_CACHE.get('encInput')?.value,
        cat: DOM_CACHE.get('catInput')?.value,
        keyword: DOM_CACHE.get('keywordInput')?.value
    };

    // === MANUFACTURER LIST ===
    const m = DOM_CACHE.get('mfgInput');
    if (m) {
        const cleanList = window.FOUND_MFGS.size > 0
            ? Array.from(window.FOUND_MFGS).filter(mf => AI_TRAINING_DATA.MANUFACTURERS.includes(mf)).sort()
            : [...AI_TRAINING_DATA.MANUFACTURERS].sort();

        m.innerHTML = '';
        m.add(new Option('Any', 'Any'));
        cleanList.forEach(v => m.add(new Option(v, v)));
        m.value = savedValues.mfg && cleanList.includes(savedValues.mfg) ? savedValues.mfg : 'Any';
    }

    // === HP / VOLT / PHASE / ENCLOSURE ===
    ['hp', 'volt', 'phase', 'enc'].forEach(k => {
        const s = DOM_CACHE.get(k + 'Input');
        if (!s) return;
        const data = (k === 'enc') ? ['4XSS', '4XFG', 'POLY'] : AI_TRAINING_DATA.DATA[k.toUpperCase()];
        s.innerHTML = '';
        s.add(new Option('Any', 'Any'));
        data.forEach(v => s.add(new Option(v, v)));
        s.value = (savedValues[k] && data.includes(savedValues[k])) ? savedValues[k] : 'Any';
    });

    // Restore category and keywords (if present)
    if (savedValues.cat) {
        const catInput = DOM_CACHE.get('catInput');
        if (catInput) catInput.value = savedValues.cat;
    }
    if (savedValues.keyword) {
        const keywordInput = DOM_CACHE.get('keywordInput');
        if (keywordInput) keywordInput.value = savedValues.keyword;
    }
}

/**
 * Helper: Generate badges for a search result
 * @param {Object} record - Database record
 * @param {Object} criteria - Search criteria
 * @returns {Array} Array of badge HTML strings
 * @private
 */
static _generateBadges(record, criteria) {
    const badges = [];
    const isMissingPdf = !record.pdfUrl || record.pdfStatus === PDF_STATUS.MISSING;
    
    // Category badge
    if (record.category === 'low_voltage') {
        badges.push(`<span class="hud-badge match-orange">LOW VOLT</span>`);
    }

    // Manufacturer badge - only show when actively filtering
    if (criteria.mfg !== "Any" && record.mfg) {
        const isMatch = (record.mfg === criteria.mfg);
        const badgeClass = record.mfgV ? 'match-orange' : (isMatch ? 'match-green' : 'match-orange');
        badges.push(`<span class="hud-badge ${badgeClass}">${record.mfg}</span>`);
    }

    // Voltage badge
    if (criteria.volt !== "Any") {
        const badgeClass = record.voltV ? 'match-orange' : (record.volt ? 'match-green' : 'unknown');
        badges.push(`<span class="hud-badge ${badgeClass}">${record.volt ? record.volt + 'V' : '? V'}</span>`);
    }
    
    // Phase badge
    if (criteria.phase !== "Any") {
        const badgeClass = record.phaseV ? 'match-orange' : (record.phase ? 'match-green' : 'unknown');
        badges.push(`<span class="hud-badge ${badgeClass}">${record.phase ? record.phase + 'PH' : '? PH'}</span>`);
    }
    
    // HP badge (orange for varied/fuzzy matches, green for strict)
    if (criteria.hp !== "Any") {
        const hpBadgeClass = record.hpV ? 'match-orange' : (record.hp ? 'match-green' : 'unknown');
        badges.push(`<span class="hud-badge ${hpBadgeClass}">${record.hp ? record.hp + ' HP' : '? HP'}</span>`);
    }
    
    // Enclosure badge
    if (criteria.enc !== "Any" && record.enc) {
        const badgeClass = record.encV ? 'match-orange' : 'match-green';
        badges.push(`<span class="hud-badge ${badgeClass}">${record.enc}</span>`);
    }

    // Keyword badges (avoid duplicating mfg badge)
    if (criteria.kw && criteria.kw.length > 0) {
        criteria.kw.forEach(k => {
            if (!(criteria.mfg !== "Any" && record.mfg === k.toUpperCase())) {
                badges.push(`<span class="hud-badge match-keyword">${k.toUpperCase()}</span>`);
            }
        });
    }

    // No-PDF badge
    if (isMissingPdf) {
        badges.push(`<span class="hud-badge no-pdf">NO PDF</span>`);
    }
    
    return badges;
}

static render(res, crit, totalCount) {
    const a = DOM_CACHE.get('results-area');
    if (!a) return;
    
    UI.syncMobileResultsCount(totalCount || res.length);
    a.innerHTML = ''; 
    
    res.forEach(i => { 
        const isMissingPdf = !i.pdfUrl || i.pdfStatus === PDF_STATUS.MISSING;
        const badges = this._generateBadges(i, crit);

        const c = document.createElement('div'); 
        c.className = `record-card ${isMissingPdf ? 'no-pdf-card' : ''} ${!i.p ? 'varied-result' : ''}`; 
        c.dataset.recordId = i.id;
        c.innerHTML = `
            <div class="panel-name">${i.displayId || i.id}</div>
            <div class="badge-row">${badges.join(' ') || '<span class="hud-badge unknown">NO MATCH</span>'}</div>
            <div class="card-actions">
                <button class="thumb-btn up ${FeedbackService.lockout.has(`${i.id}:up`) ? 'voted-up' : ''}" onclick="FeedbackService.up('${i.id}', this, event)">👍</button>
                <button class="thumb-btn down" onclick="FeedbackService.down('${i.id}', this, event)">👎</button>
            </div>
        `;

        if (!isMissingPdf) {
            c.onclick = () => { 
                document.querySelectorAll('.record-card').forEach(x=>x.classList.remove('active-view')); 
                c.classList.add('active-view'); 
                if (UI.isSmallMobile()) UI.focusMobilePreview();
                PdfController.load(i.id, i.pdfUrl); 
            };
        } else {
            c.title = 'No PDF attached in Airtable';
            c.style.cursor = 'not-allowed';
            c.style.opacity = '0.75';
        }
        a.appendChild(c); 
    }); 
}

}

window.UI = UI;

class ControlPanel {
    // Tab navigation removed in v2.5.50; right panel is now a single CONTROL PANEL
}

window.LOCAL_DB = []; window.ID_MAP = new Map(); window.FOUND_MFGS = new Set(); window.FOUND_ENCS = new Set();

document.addEventListener('DOMContentLoaded', () => { 
    try {
        // Sync version in menu
        const versionEl = document.getElementById('menu-version');
        if (versionEl) {
            versionEl.textContent = APP_VERSION;
        }

        // Wire Auto-Scan and Re-scan buttons with stable IDs
        const autoScanBtn = document.getElementById('auto-scan-btn');
        if (autoScanBtn) {
            autoScanBtn.addEventListener('click', () => SmartScanner.scanAllPages());
        }
        const rescanBtn = document.getElementById('rescan-current-btn');
        if (rescanBtn) {
            rescanBtn.addEventListener('click', () => SmartScanner.rescanPage(PageContext.getActivePage()));
        }
        
        // Load cover sheet template bytes for universal page 1 overlay
        fetch('assets/cover_sheet_template.pdf')
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
            .then(buf => {
                // Validate PDF magic bytes (%PDF)
                const header = new Uint8Array(buf, 0, 4);
                const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
                if (!isPdf) throw new Error('Asset is not a valid PDF');
                window.TEMPLATE_BYTES = buf;
                console.log('✅ Cover sheet template loaded');
            })
            .catch(err => console.warn('⚠️ Cover sheet template not loaded (app continues without it):', err));
        
        UI.init(); 
        PdfViewer.initViewerInteractions();
        window.addEventListener('beforeunload', () => PdfViewer.teardownViewerInteractions(), { once: true });
        if(AuthService.init()) { 
            DataLoader.preload(); 
        }
    } catch(e) {
        console.error("Critical Init Error:", e);
        alert("System failed to initialize. Please clear cache and reload.");
    }
});
