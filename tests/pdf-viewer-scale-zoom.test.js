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
    const documentState = {
        getElementById: (id) => (id === 'pdf-zoom-level' ? zoomLabel : null),
        querySelectorAll: () => []
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

    PdfViewer.teardownViewerInteractions();
    console.log('✅ PdfViewer scale/zoom tests passed');
})();
