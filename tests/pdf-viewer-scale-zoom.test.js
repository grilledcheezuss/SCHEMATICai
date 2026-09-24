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
    console.log('🧪 Testing PdfViewer geometry-fit scaling and zoom coalescing');

    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfViewerClassCode = extractClass('PdfViewer', appJsContent);

    const zoomLabel = { innerText: '' };
    const viewerElement = {
        clientWidth: 0,
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelectorAll: () => [],
        contains: () => true
    };
    const previewPaneElement = { clientWidth: 0 };
    const documentState = {
        getElementById: (id) => {
            if (id === 'pdf-zoom-level') return zoomLabel;
            if (id === 'pdf-main-view') return viewerElement;
            if (id === 'preview-pane') return previewPaneElement;
            return null;
        },
        querySelectorAll: () => []
    };
    const windowState = {
        innerWidth: 0,
        innerHeight: 0,
        addEventListener: () => {},
        removeEventListener: () => {},
        getComputedStyle: () => ({ paddingLeft: '20px', paddingRight: '20px' })
    };

    const PdfViewer = new Function(
        'window',
        'document',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState);

    PdfViewer.doc = {
        destroyed: false,
        fingerprint: 'doc-1',
        getPage: async () => ({
            getViewport: ({ scale }) => ({ width: 1000 * scale, height: 1400 * scale })
        })
    };

    const checkStartScale = async (width, height, viewerWidth, expected, label) => {
        windowState.innerWidth = width;
        windowState.innerHeight = height;
        viewerElement.clientWidth = viewerWidth;
        previewPaneElement.clientWidth = viewerWidth;
        PdfViewer._userHasAdjustedZoom = false;
        await PdfViewer._setScaleForDevice();
        assert(Math.abs(PdfViewer.currentScale - expected) < 1e-9, `${label}: expected ${expected}, got ${PdfViewer.currentScale}`);
    };

    await checkStartScale(390, 844, 350, 0.6, 'small mobile floor stays near 60%');
    await checkStartScale(1024, 1366, 900, 0.85, 'tablet portrait geometry can exceed fixed 80%');
    await checkStartScale(1366, 768, 1080, 1.026, 'small monitor follows geometry-fit baseline');
    await checkStartScale(1920, 1080, 1800, 1.2, 'large monitor clamp allows up to 120%');

    PdfViewer.currentScale = 1.17;
    PdfViewer._userHasAdjustedZoom = true;
    windowState.innerWidth = 1280;
    windowState.innerHeight = 800;
    viewerElement.clientWidth = 1120;
    previewPaneElement.clientWidth = 1120;
    await PdfViewer._setScaleForDevice({ force: false });
    assert(PdfViewer.currentScale === 1.17, 'manual zoom must not be reset by auto-fit without force');

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

    PdfViewer.teardownViewerInteractions();
    console.log('✅ PdfViewer geometry-fit/zoom tests passed');
})();
