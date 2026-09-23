(function (globalScope) {
    const PDF_RENDER_MAX_OUTPUT_SCALE = 2;
    const PDF_RENDER_MAX_CANVAS_PIXELS = 12000000;

    class PdfRenderHelper {
        static normalizeOutputScale(devicePixelRatio = 1) {
            const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
            return Math.max(1, Math.min(PDF_RENDER_MAX_OUTPUT_SCALE, dpr));
        }

        static getRenderMetrics(viewport, devicePixelRatio = 1) {
            const cssWidth = Math.max(1, Math.floor(viewport?.width || 1));
            const cssHeight = Math.max(1, Math.floor(viewport?.height || 1));
            const maxPixels = Math.max(1, PDF_RENDER_MAX_CANVAS_PIXELS);
            const outputScale = this.normalizeOutputScale(devicePixelRatio);
            let effectiveScale = Math.max(1, outputScale);
            let rasterScale = effectiveScale;
            let backingWidth = Math.max(1, Math.round(cssWidth * rasterScale));
            let backingHeight = Math.max(1, Math.round(cssHeight * rasterScale));
            const pixelArea = backingWidth * backingHeight;

            if (pixelArea > maxPixels) {
                const areaScale = Math.sqrt(maxPixels / pixelArea);
                effectiveScale = Math.max(1, outputScale * areaScale);
                rasterScale = effectiveScale;
                backingWidth = Math.max(1, Math.round(cssWidth * rasterScale));
                backingHeight = Math.max(1, Math.round(cssHeight * rasterScale));

                if ((backingWidth * backingHeight) > maxPixels) {
                    const hardFitScale = Math.sqrt(maxPixels / (cssWidth * cssHeight));
                    rasterScale = Math.max(0.1, hardFitScale);
                    backingWidth = Math.max(1, Math.round(cssWidth * rasterScale));
                    backingHeight = Math.max(1, Math.round(cssHeight * rasterScale));
                }
            }

            const useTransform = Math.abs(rasterScale - 1) > 0.001;
            return {
                cssWidth,
                cssHeight,
                outputScale,
                effectiveScale,
                rasterScale,
                backingWidth,
                backingHeight,
                transform: useTransform ? [rasterScale, 0, 0, rasterScale, 0, 0] : null
            };
        }
    }

    globalScope.PDF_RENDER_MAX_OUTPUT_SCALE = PDF_RENDER_MAX_OUTPUT_SCALE;
    globalScope.PDF_RENDER_MAX_CANVAS_PIXELS = PDF_RENDER_MAX_CANVAS_PIXELS;
    globalScope.PdfRenderHelper = PdfRenderHelper;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PDF_RENDER_MAX_OUTPUT_SCALE,
            PDF_RENDER_MAX_CANVAS_PIXELS,
            PdfRenderHelper
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
