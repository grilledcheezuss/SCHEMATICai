const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function extractConst(name, content) {
    const rx = new RegExp(`const\\s+${name}\\s*=\\s*([^;]+);`);
    const m = content.match(rx);
    if (!m) throw new Error(`Could not find const ${name}`);
    return new Function(`return (${m[1]});`)();
}

function extractClass(className, content) {
    const startIdx = content.indexOf(`class ${className} {`);
    if (startIdx === -1) throw new Error(`Could not find ${className} class`);

    let braceCount = 0;
    let inClass = false;
    let endIdx = startIdx;

    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        if (char === '{') {
            braceCount++;
            inClass = true;
        } else if (char === '}') {
            braceCount--;
            if (inClass && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }

    return content.substring(startIdx, endIdx);
}

const PDF_RENDER_MAX_OUTPUT_SCALE = extractConst('PDF_RENDER_MAX_OUTPUT_SCALE', appJsContent);
const PDF_RENDER_MAX_CANVAS_PIXELS = extractConst('PDF_RENDER_MAX_CANVAS_PIXELS', appJsContent);
const helperClassCode = extractClass('PdfRenderHelper', appJsContent);
const PdfRenderHelper = new Function(
    'PDF_RENDER_MAX_OUTPUT_SCALE',
    'PDF_RENDER_MAX_CANVAS_PIXELS',
    `${helperClassCode}; return PdfRenderHelper;`
)(PDF_RENDER_MAX_OUTPUT_SCALE, PDF_RENDER_MAX_CANVAS_PIXELS);

console.log('🧪 Testing PdfRenderHelper high-DPI metrics');

{
    const m = PdfRenderHelper.getRenderMetrics({ width: 1000, height: 500 }, 1);
    assert(m.outputScale === 1, 'DPR 1 should render at outputScale 1');
    assert(m.backingWidth === 1000 && m.backingHeight === 500, 'DPR 1 backing size should match CSS size');
    assert(m.transform === null, 'DPR 1 should not require transform');
}

{
    const m = PdfRenderHelper.getRenderMetrics({ width: 800, height: 400 }, 3);
    assert(m.outputScale <= 2 && m.outputScale >= 1, 'DPR 3 should be capped to <=2 and >=1');
    assert(m.backingWidth === 1600 && m.backingHeight === 800, 'DPR 3 should cap at 2x backing dimensions');
    assert(Array.isArray(m.transform) && m.transform[0] === m.outputScale, 'Scaled rendering should provide transform');
}

{
    const m = PdfRenderHelper.getRenderMetrics({ width: 5000, height: 4000 }, 3);
    assert(m.backingWidth * m.backingHeight <= PDF_RENDER_MAX_CANVAS_PIXELS, 'Oversized pages should respect pixel budget');
    assert(m.outputScale >= 1, 'Output scale should never drop below 1');
}

console.log('✅ PdfRenderHelper tests passed');
