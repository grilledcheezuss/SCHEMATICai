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
    console.log('🧪 Testing PdfViewer print cleanup + download action');

    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const pdfViewerClassCode = extractClass('PdfViewer', appJsContent);

    let panelIdValue = 'CP/12:34 ?';
    let simulateIframeError = false;
    let anchorsClicked = [];
    const activeNodes = [];

    const body = {
        appendChild(node) {
            node.parentNode = body;
            activeNodes.push(node);
            if (node.tagName === 'IFRAME') {
                setTimeout(() => {
                    if (simulateIframeError && node.onerror) {
                        node.onerror(new Error('load failure'));
                    } else if (node.onload) {
                        node.onload();
                    }
                }, 0);
            }
        },
        removeChild(node) {
            const idx = activeNodes.indexOf(node);
            if (idx >= 0) activeNodes.splice(idx, 1);
            node.parentNode = null;
        }
    };

    const documentState = {
        body,
        createElement(tag) {
            if (tag === 'iframe') {
                const listeners = new Map();
                return {
                    tagName: 'IFRAME',
                    style: {},
                    src: '',
                    parentNode: null,
                    onload: null,
                    onerror: null,
                    contentWindow: {
                        focus() {},
                        print() {},
                        addEventListener(name, fn) {
                            listeners.set(name, fn);
                        },
                        removeEventListener(name) {
                            listeners.delete(name);
                        }
                    }
                };
            }
            if (tag === 'a') {
                return {
                    href: '',
                    download: '',
                    rel: '',
                    click() {
                        anchorsClicked.push({ href: this.href, download: this.download, rel: this.rel });
                    }
                };
            }
            return { style: {} };
        },
        getElementById() {
            return null;
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };

    const DOM_CACHE = {
        get(id) {
            if (id === 'demo-panel-id') return { value: panelIdValue };
            return null;
        }
    };

    const windowState = {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener() {}
    };

    const PdfViewer = new Function(
        'window',
        'document',
        'DOM_CACHE',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState, DOM_CACHE);

    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.PRINT_CLEANUP_TIMEOUT_MS = 5;
    PdfViewer.PRINT_MAX_TIMEOUT_MS = 30;

    PdfViewer.print();
    assert(PdfViewer.isPrinting === true, 'print should set guard immediately');
    await wait(15);
    assert(PdfViewer.isPrinting === false, 'print fallback cleanup should always release guard');
    assert(activeNodes.filter((n) => n.tagName === 'IFRAME').length === 0, 'print cleanup should remove iframe');

    simulateIframeError = true;
    PdfViewer.print();
    await wait(10);
    assert(PdfViewer.isPrinting === false, 'iframe load failure should release print guard');
    assert(activeNodes.filter((n) => n.tagName === 'IFRAME').length === 0, 'iframe error path should cleanup iframe');
    simulateIframeError = false;

    PdfViewer.download();
    assert(anchorsClicked.length === 1, 'download should trigger one anchor click when PDF is loaded');
    assert(anchorsClicked[0].href === 'blob:viewer-pdf', 'download should use current viewer blob URL');
    assert(anchorsClicked[0].download.endsWith('.pdf'), 'download filename should end with .pdf');
    assert(!/[\\/:*?"<>|]/.test(anchorsClicked[0].download), 'download filename should be sanitized');

    anchorsClicked = [];
    PdfViewer.currentBlobUrl = '';
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'download should no-op when no PDF is loaded');

    console.log('✅ PdfViewer print/download tests passed');
})();
