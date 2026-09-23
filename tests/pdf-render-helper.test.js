const {
    PDF_RENDER_MAX_OUTPUT_SCALE,
    PDF_RENDER_MAX_CANVAS_PIXELS,
    PdfRenderHelper
} = require('../pdf-render-helper.js');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('🧪 Testing PdfRenderHelper high-DPI metrics');

{
    const m = PdfRenderHelper.getRenderMetrics({ width: 1000, height: 500 }, 1);
    assert(m.outputScale === 1, 'DPR 1 should render at outputScale 1');
    assert(m.backingWidth === 1000 && m.backingHeight === 500, 'DPR 1 backing size should match CSS size');
    assert(m.transform === null, 'DPR 1 should not require transform');
}

{
    const m = PdfRenderHelper.getRenderMetrics({ width: 800, height: 400 }, 3);
    assert(m.outputScale <= PDF_RENDER_MAX_OUTPUT_SCALE && m.outputScale >= 1, 'DPR 3 should be capped to <=2 and >=1');
    assert(m.backingWidth === 1600 && m.backingHeight === 800, 'DPR 3 should cap at 2x backing dimensions');
    assert(Array.isArray(m.transform) && m.transform[0] === m.rasterScale, 'Scaled rendering should provide transform');
}

{
    const m = PdfRenderHelper.getRenderMetrics({ width: 5000, height: 4000 }, 3);
    assert(m.backingWidth * m.backingHeight <= PDF_RENDER_MAX_CANVAS_PIXELS, 'Oversized pages should respect pixel budget');
    assert(m.outputScale >= 1, 'Output scale should never drop below 1');
    assert(m.effectiveScale >= 1, 'Effective DPR scale should remain at least 1');
    assert(Array.isArray(m.transform) && m.transform[0] === m.rasterScale, 'Oversized path should expose raster transform scale');
}

console.log('✅ PdfRenderHelper tests passed');
