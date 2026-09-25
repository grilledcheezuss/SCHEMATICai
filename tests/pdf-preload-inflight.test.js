const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class in app.js`);
    let braceCount = 0;
    let endIdx = startIdx;
    let inClass = false;
    for (let i = startIdx; i < content.length; i++) {
        const ch = content[i];
        if (ch === '{') {
            braceCount++;
            inClass = true;
        } else if (ch === '}') {
            braceCount--;
            if (inClass && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    return content.substring(startIdx, endIdx);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    console.log('🧪 Testing PdfController first-page preload concurrency + in-flight reuse');
    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfControllerClassCode = extractClass('PdfController', appJsContent);

    let activeFetches = 0;
    let maxActiveFetches = 0;
    const fetchCalls = [];
    const seenFetchById = new Map();
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]).buffer;

    const fetchStub = async (url) => {
        const idMatch = /[?&]id=([^&]+)/.exec(String(url));
        const id = idMatch ? decodeURIComponent(idMatch[1]) : 'unknown';
        fetchCalls.push(id);
        seenFetchById.set(id, (seenFetchById.get(id) || 0) + 1);
        activeFetches++;
        maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
        await wait(20);
        activeFetches--;
        return {
            ok: true,
            status: 200,
            arrayBuffer: async () => validPdfBytes
        };
    };

    const documentState = {
        querySelectorAll: () => []
    };
    const SearchEngine = { pageSize: 25 };
    const PDF_STATUS = { MISSING: 'missing' };
    const AuthService = { headers: () => ({}) };
    const buildWorkerUrl = (_target, params = {}) => `https://worker.example?target=PDF_BY_ID&id=${params.id}`;
    const validatePdfWithContext = () => ({ valid: true });
    const attemptPdfFallbackFetch = async () => null;
    const timingEvents = [];
    const getNowMs = () => Date.now();
    const logPdfTiming = (metric) => timingEvents.push(metric);
    const DOM_CACHE = { get: () => null };
    const windowState = { ID_MAP: new Map() };

    const loadCalls = [];
    const PdfViewer = {
        _showPendingLoadUi: (url) => { loadCalls.push({ type: 'pending-ui', url }); },
        loadFromCache: async (_cached, id) => { loadCalls.push({ type: 'cache', id }); },
        loadById: async (id) => { loadCalls.push({ type: 'network', id }); }
    };

    const PdfController = new Function(
        'document',
        'SearchEngine',
        'PDF_STATUS',
        'AuthService',
        'buildWorkerUrl',
        'validatePdfWithContext',
        'attemptPdfFallbackFetch',
        'logPdfTiming',
        'getNowMs',
        'PdfViewer',
        'DOM_CACHE',
        'window',
        'fetch',
        `${pdfControllerClassCode}; return PdfController;`
    )(
        documentState,
        SearchEngine,
        PDF_STATUS,
        AuthService,
        buildWorkerUrl,
        validatePdfWithContext,
        attemptPdfFallbackFetch,
        logPdfTiming,
        getNowMs,
        PdfViewer,
        DOM_CACHE,
        windowState,
        fetchStub
    );

    const firstPageResults = Array.from({ length: 6 }).map((_, index) => ({
        id: `ID-${index + 1}`,
        displayId: `PANEL-${index + 1}`,
        pdfUrl: `https://example.com/panel-${index + 1}.pdf`,
        pdfStatus: 'ready'
    }));

    const preloadPromise = PdfController.preloadSearchResults(firstPageResults);
    await wait(1);
    await PdfController.load('ID-1', 'https://example.com/panel-1.pdf');
    await preloadPromise;

    assert(loadCalls.some((entry) => entry.type === 'pending-ui' && entry.url === 'https://example.com/panel-1.pdf'), 'clicking in-flight preload should show loading UI immediately');
    assert(loadCalls.some((entry) => entry.type === 'cache' && entry.id === 'ID-1'), 'clicking in-flight preload should reuse cache path');
    assert(!loadCalls.some((entry) => entry.type === 'network' && entry.id === 'ID-1'), 'clicking in-flight preload should avoid duplicate network load');
    assert((seenFetchById.get('ID-1') || 0) === 1, 'preload + click should fetch a PDF_BY_ID once per ID');
    assert(maxActiveFetches > 1, 'bounded preload should run with parallel fetches');
    assert(maxActiveFetches <= PdfController.PRELOAD_CONCURRENCY, 'bounded preload should not exceed configured concurrency');
    assert(fetchCalls.length === firstPageResults.length, 'preload should remain scoped to first-page results');
    assert(timingEvents.includes('preload_inflight_wait'), 'in-flight click path should emit wait timing diagnostic');

    console.log('✅ PdfController preload tests passed');
})();
