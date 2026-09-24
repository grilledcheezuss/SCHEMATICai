const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class in app.js`);

    let braceCount = 0;
    let inClass = false;
    let endIdx = startIdx;
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

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log('🧪 Testing PdfViewer responsive scale tiers and zoom coalescing');

    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfViewerClassCode = extractClass('PdfViewer', appJsContent);

    const zoomLabel = { innerText: '' };
    const viewerListeners = new Map();
    const stageEl = {
        offsetWidth: 1200,
        offsetHeight: 2400,
        offsetTop: 20,
        offsetLeft: 60,
        style: {}
    };
    const staleStage = {
        removed: false,
        remove() {
            this.removed = true;
        }
    };
    const viewerEl = {
        clientWidth: 900,
        clientHeight: 700,
        scrollLeft: 200,
        scrollTop: 400,
        scrollWidth: 2200,
        scrollHeight: 3400,
        querySelector: () => stageEl,
        querySelectorAll: (selector) => selector === '.pdf-gesture-stage' ? [staleStage] : [],
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: (name, fn) => {
            viewerListeners.set(name, fn);
        },
        removeEventListener: (name) => {
            viewerListeners.delete(name);
        }
    };
    const documentState = {
        getElementById: (id) => {
            if (id === 'pdf-zoom-level') return zoomLabel;
            if (id === 'pdf-main-view') return viewerEl;
            return null;
        },
        querySelectorAll: () => [],
        body: {
            classList: {
                contains: () => false
            }
        }
    };
    const windowState = {
        innerWidth: 0,
        innerHeight: 0,
        addEventListener: () => {}
    };

    const PdfViewer = new Function(
        'window',
        'document',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState);

    const checkStartScale = (width, height, expected, label) => {
        windowState.innerWidth = width;
        windowState.innerHeight = height;
        PdfViewer._userHasAdjustedZoom = false;
        PdfViewer._setScaleForDevice();
        assert(PdfViewer.currentScale === expected, `${label}: expected ${expected}, got ${PdfViewer.currentScale}`);
    };

    checkStartScale(390, 844, 0.6, 'small mobile');
    checkStartScale(540, 960, 0.8, 'large mobile');
    checkStartScale(834, 1194, 1.0, 'tablet portrait');
    checkStartScale(1180, 820, 1.0, 'tablet landscape / small monitor tier');
    checkStartScale(1366, 768, 1.0, 'small monitor');
    checkStartScale(1920, 1080, 1.2, 'large monitor');

    let renderCount = 0;
    PdfViewer.renderStack = () => { renderCount++; };
    PdfViewer.doc = { destroyed: false };

    PdfViewer.currentScale = 1.0;
    PdfViewer.zoom(0.2);
    PdfViewer.zoom(0.2);
    PdfViewer.zoom(0.2);
    await wait(PdfViewer.ZOOM_DEBOUNCE_MS + 40);
    assert(renderCount === 1, `rapid zoom should coalesce to one render, got ${renderCount}`);
    assert(Math.abs(PdfViewer.currentScale - 1.6) < 1e-9, `rapid zoom should keep latest scale, got ${PdfViewer.currentScale}`);

    PdfViewer.currentScale = PdfViewer.MAX_SCALE;
    PdfViewer.zoom(0.2);
    assert(PdfViewer.currentScale === PdfViewer.MAX_SCALE, 'zoom in should clamp at MAX_SCALE');

    PdfViewer.currentScale = PdfViewer.MIN_SCALE;
    PdfViewer.zoom(-0.2);
    assert(PdfViewer.currentScale === PdfViewer.MIN_SCALE, 'zoom out should clamp at MIN_SCALE');

    PdfViewer.initViewerInteractions();
    assert(viewerListeners.has('wheel'), 'initViewerInteractions should attach wheel listener');
    assert(viewerListeners.has('touchstart'), 'initViewerInteractions should attach touchstart listener');
    assert(viewerListeners.has('touchmove'), 'initViewerInteractions should attach touchmove listener');
    assert(viewerListeners.has('touchend'), 'initViewerInteractions should attach touchend listener');
    assert(viewerListeners.has('touchcancel'), 'initViewerInteractions should attach touchcancel listener');
    PdfViewer.teardownViewerInteractions();
    assert(viewerListeners.size === 0, 'teardownViewerInteractions should remove attached listeners');

    PdfViewer._zoomInteractionElement = viewerEl;
    PdfViewer._gestureStageElement = stageEl;
    PdfViewer._committedPanX = -120;
    PdfViewer._committedPanY = 150;
    PdfViewer._liveScale = 1.25;
    const anchorContext = PdfViewer._captureAnchorContext({ x: 300, y: 250 }, 1.5);
    assert(Math.abs(anchorContext.contentX - 448) < 1e-9, `anchor contentX should account for scroll + pan, got ${anchorContext.contentX}`);
    assert(Math.abs(anchorContext.contentY - 384) < 1e-9, `anchor contentY should account for scroll + pan, got ${anchorContext.contentY}`);

    PdfViewer._commitPanToScroll(-120, 150);
    assert(viewerEl.scrollLeft === 320, `committed pan should become horizontal scroll, got ${viewerEl.scrollLeft}`);
    assert(viewerEl.scrollTop === 250, `committed pan should become vertical scroll, got ${viewerEl.scrollTop}`);
    assert(PdfViewer._committedPanX === 0 && PdfViewer._committedPanY === 0, 'pan commit should reset committed pan offsets');
    assert(stageEl.style.transform === 'translate3d(0px, 0px, 0) scale(1)', `pan commit should reset transform, got ${stageEl.style.transform}`);

    PdfViewer._beginDocumentLoad();
    assert(staleStage.removed === true, 'beginDocumentLoad should clear stale rendered stages immediately');

    let finalizeRenderOptions = null;
    PdfViewer.renderStack = (options) => { finalizeRenderOptions = options; };
    PdfViewer.doc = { destroyed: false };
    PdfViewer.currentScale = 1;
    PdfViewer._liveScale = 1.35;
    PdfViewer._committedPanX = 12;
    PdfViewer._committedPanY = -8;
    PdfViewer._documentLoadToken = 7;
    PdfViewer._activeGesture = {
        mode: 'pinch',
        documentLoadToken: 7,
        startMidpoint: { x: 320, y: 280 },
        lastMidpoint: { x: 330, y: 290 }
    };
    PdfViewer._finalizeGesture();
    assert(Math.abs(PdfViewer.currentScale - 1.35) < 1e-9, `pinch finalize should commit final scale, got ${PdfViewer.currentScale}`);
    assert(PdfViewer._liveScale > 1, `pinch finalize should keep live transform until crisp render commit, got ${PdfViewer._liveScale}`);
    assert(finalizeRenderOptions && finalizeRenderOptions.timingSource === 'gesture-commit', 'pinch finalize should trigger gesture-commit render');

    console.log('✅ PdfViewer scale/zoom tests passed');
})();
