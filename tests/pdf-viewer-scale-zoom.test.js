const fs = require('fs');
const path = require('path');
const { PDF_UI_STATE, resolvePdfUiStatePresentation, setElementDisplay } = require('../pdf-ui-state.js');

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

function extractFunction(functionName, content) {
    const startIdx = content.indexOf(`function ${functionName}(`);
    if (startIdx === -1) throw new Error(`Could not find ${functionName} function in app.js`);

    let braceCount = 0;
    let inFunction = false;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length; i++) {
        const ch = content[i];
        if (ch === '{') {
            braceCount++;
            inFunction = true;
        } else if (ch === '}') {
            braceCount--;
            if (inFunction && braceCount === 0) {
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
    const setPdfUiStateCode = extractFunction('setPdfUiState', appJsContent);

    const zoomLabel = { innerText: '' };
    const viewerListeners = new Map();
    const activeStage = {
        offsetWidth: 1200,
        offsetHeight: 2400,
        offsetTop: 20,
        offsetLeft: 60,
        style: {},
        isConnected: true,
        classList: {
            contains: (name) => name === 'pdf-gesture-stage'
        }
    };
    const stagingStage = {
        removed: false,
        isConnected: true,
        classList: {
            contains: (name) => name === 'pdf-gesture-stage' || name === 'pdf-gesture-stage--staging'
        },
        remove() {
            this.removed = true;
            this.isConnected = false;
        }
    };
    const stageList = [activeStage, stagingStage];
    const placeholder = { style: { display: 'flex' }, innerText: '📄 Select a schematic' };
    const toolbar = { style: { display: 'none' } };
    const viewerShell = { style: { display: 'none' } };
    const fallback = { style: { display: 'none' } };
    const fallbackLink = { href: '' };
    const frame = { style: { display: 'none' } };
    const printBtn = { disabled: false };
    const downloadBtn = { disabled: false };
    const viewerEl = {
        style: { visibility: 'visible', pointerEvents: 'auto' },
        clientWidth: 900,
        clientHeight: 700,
        scrollLeft: 200,
        scrollTop: 400,
        scrollWidth: 2200,
        scrollHeight: 3400,
        querySelector: (selector) => {
            if (selector === '.pdf-gesture-stage') return activeStage;
            if (selector === '.pdf-gesture-stage:not(.pdf-gesture-stage--staging)') return activeStage;
            return null;
        },
        querySelectorAll: (selector) => selector === '.pdf-gesture-stage' ? stageList.filter((stage) => stage.isConnected) : [],
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        addEventListener: (name, fn) => {
            viewerListeners.set(name, fn);
        },
        removeEventListener: (name) => {
            viewerListeners.delete(name);
        }
    };
    const bodyClasses = new Set();
    const documentState = {
        getElementById: (id) => {
            if (id === 'pdf-zoom-level') return zoomLabel;
            if (id === 'pdf-main-view') return viewerEl;
            if (id === 'pdf-placeholder-text') return placeholder;
            if (id === 'pdf-toolbar') return toolbar;
            if (id === 'custom-pdf-viewer') return viewerShell;
            if (id === 'pdf-fallback') return fallback;
            if (id === 'pdf-fallback-link') return fallbackLink;
            if (id === 'pdf-viewer-frame') return frame;
            if (id === 'pdf-print-btn') return printBtn;
            if (id === 'pdf-download-btn') return downloadBtn;
            return null;
        },
        querySelectorAll: () => [],
        body: {
            classList: {
                toggle: (className, shouldHave) => {
                    if (shouldHave) {
                        bodyClasses.add(className);
                    } else {
                        bodyClasses.delete(className);
                    }
                },
                contains: (className) => bodyClasses.has(className)
            }
        }
    };
    const windowState = {
        innerWidth: 0,
        innerHeight: 0,
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    const DOM_CACHE = {
        get(id) {
            return documentState.getElementById(id);
        }
    };
    const PdfViewer = new Function(
        'window',
        'document',
        'PDF_UI_STATE',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState, PDF_UI_STATE);
    const setPdfUiState = new Function(
        'DOM_CACHE',
        'document',
        'PdfViewer',
        'PDF_UI_STATE',
        'resolvePdfUiStatePresentation',
        'setElementDisplay',
        `${setPdfUiStateCode}; return setPdfUiState;`
    )(DOM_CACHE, documentState, PdfViewer, PDF_UI_STATE, resolvePdfUiStatePresentation, setElementDisplay);

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
    let lastRenderOptions = null;
    PdfViewer.renderStack = (options) => { renderCount++; lastRenderOptions = options; };
    PdfViewer.doc = { destroyed: false };

    PdfViewer.currentScale = 1.0;
    PdfViewer.zoom(0.2);
    PdfViewer.zoom(0.2);
    PdfViewer.zoom(0.2);
    await wait(PdfViewer.ZOOM_DEBOUNCE_MS + 40);
    assert(renderCount === 1, `rapid zoom should coalesce to one render, got ${renderCount}`);
    assert(Math.abs(PdfViewer.currentScale - 1.6) < 1e-9, `rapid zoom should keep latest scale, got ${PdfViewer.currentScale}`);
    assert(lastRenderOptions && lastRenderOptions.renderMode === 'gesture-anchor', 'toolbar zoom should preserve an anchor-based rerender mode');
    assert(lastRenderOptions && lastRenderOptions.anchorContext && Number.isFinite(lastRenderOptions.anchorContext.contentX), 'toolbar zoom should pass an anchor context into rerender');

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
    PdfViewer._gestureStageElement = activeStage;
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
    assert(activeStage.style.transform === 'translate3d(0px, 0px, 0) scale(1)', `pan commit should reset transform, got ${activeStage.style.transform}`);

    const restored = PdfViewer._restoreScrollFromAnchorContext(
        viewerEl,
        activeStage,
        { anchorOffsetX: 300, anchorOffsetY: 200, contentX: 610, contentY: 420, scaleRatio: 1.25 }
    );
    assert(restored === true, 'anchor restore should succeed for non-centered anchor context');
    assert(Math.abs(viewerEl.scrollLeft - 522.5) < 1e-9, `anchor restore should preserve horizontal release position, got ${viewerEl.scrollLeft}`);
    assert(Math.abs(viewerEl.scrollTop - 345) < 1e-9, `anchor restore should preserve vertical release position, got ${viewerEl.scrollTop}`);

    setPdfUiState(PDF_UI_STATE.REPLACEMENT_LOADING, '⏳ DOWNLOADING PDF...');
    assert(toolbar.style.display === 'none', 'replacement loading should hide toolbar until the new document commits');
    assert(viewerShell.style.display === 'flex', 'loading with an active rendered surface should keep viewer visible');
    assert(viewerEl.style.visibility === 'hidden', 'replacement loading should hide the stale PDF surface immediately');
    assert(placeholder.style.display === 'flex', 'replacement loading should show the shared loading placeholder');
    assert(printBtn.disabled === true && downloadBtn.disabled === true, 'loading state should keep PDF actions disabled during replacement');

    PdfViewer._hasEverCommittedDocument = true;
    toolbar.style.display = 'none';
    setPdfUiState(PDF_UI_STATE.REPLACEMENT_LOADING, '⏳ DOWNLOADING PDF...');
    assert(documentState.body.classList.contains('pdf-toolbar-session-ready') === true, 'session-ready toolbar class should be set after first successful commit');
    assert(toolbar.style.display === '', 'session-ready toolbar should clear inline display hiding during replacement states');

    activeStage.dataset = {};
    PdfViewer.doc = { destroyed: false, numPages: 2 };
    PdfViewer._activePanelId = 'CP-4242';
    PdfViewer._committedPanelId = 'CP-4242';
    PdfViewer._committedUrl = 'https://example.test/current.pdf';
    PdfViewer.currentBlobUrl = 'blob:committed';
    PdfViewer.currentPdfBlob = { tag: 'committed' };
    PdfViewer.url = 'https://example.test/current.pdf';
    PdfViewer._setCurrentDocumentIdentity({ panelId: PdfViewer._activePanelId, url: PdfViewer.url });
    PdfViewer._beginDocumentLoad();
    assert(stagingStage.removed === true, 'beginDocumentLoad should clear only stale staging surfaces');
    assert(activeStage.isConnected === true, 'beginDocumentLoad should preserve the active rendered surface during replacement');
    assert(PdfViewer._gestureStageElement === activeStage, 'beginDocumentLoad should keep the active stage wired for continuity');
    assert(activeStage.dataset.documentLoadToken === '0', `beginDocumentLoad should annotate the preserved active stage with its original load token, got ${activeStage.dataset.documentLoadToken}`);
    assert(activeStage.dataset.documentIdentity === 'panel:CP-4242', `beginDocumentLoad should annotate the preserved active stage identity, got ${activeStage.dataset.documentIdentity}`);
    assert(PdfViewer.currentBlobUrl === 'blob:committed', 'beginDocumentLoad should preserve the committed blob URL until commit or fallback');
    assert(PdfViewer.currentPdfBlob && PdfViewer.currentPdfBlob.tag === 'committed', 'beginDocumentLoad should preserve the committed PDF blob until commit or fallback');
    assert(PdfViewer._committedPanelId === 'CP-4242', 'beginDocumentLoad should preserve the committed panel target until commit or fallback');
    assert(PdfViewer._documentActionsInvalidated === true, 'beginDocumentLoad should invalidate toolbar actions during replacement');

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
    assert(PdfViewer._pendingGestureCommitGeneration > 0, 'pinch finalize should register pending crisp commit generation');

    const pendingGeneration = PdfViewer._pendingGestureCommitGeneration;
    const priorRenderToken = PdfViewer.currentRenderToken;
    PdfViewer._zoomInteractionElement = null;
    PdfViewer.initViewerInteractions();
    const touchStartHandler = PdfViewer._touchStartHandler;
    assert(typeof touchStartHandler === 'function', 'touchstart handler should exist for pending commit supersession test');
    touchStartHandler({
        touches: [{ clientX: 10, clientY: 15 }],
        preventDefault() {},
        stopPropagation() {}
    });
    assert(PdfViewer._pendingGestureCommitGeneration === 0, 'new gesture should supersede pending crisp commit');
    assert(PdfViewer.currentRenderToken >= priorRenderToken, 'new gesture supersession should not roll back render token state');

    PdfViewer._pendingGestureCommitGeneration = pendingGeneration + 1;
    PdfViewer._beginDocumentLoad();
    assert(PdfViewer._pendingGestureCommitGeneration === 0, 'document replacement should clear pending gesture commit generation');

    console.log('✅ PdfViewer scale/zoom tests passed');
})();
