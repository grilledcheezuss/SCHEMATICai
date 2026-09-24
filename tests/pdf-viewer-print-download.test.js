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
    const alerts = [];
    const revokedUrls = [];
    const windowListeners = new Map();
    const documentListeners = new Map();
    const popupPrintCalls = [];
    let objectUrlCounter = 0;
    let popupBlocked = false;
    let popupPrintMissing = false;
    let navigatorState = {
        userAgent: 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        platform: 'Linux x86_64',
        maxTouchPoints: 0
    };

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
        visibilityState: 'visible',
        createElement(tag) {
            if (tag === 'iframe') {
                const listeners = new Map();
                return {
                    tagName: 'IFRAME',
                    style: {},
                    src: '',
                    parentNode: null,
                    setAttribute() {},
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
                    target: '',
                    click() {
                        anchorsClicked.push({ href: this.href, download: this.download, rel: this.rel, target: this.target });
                    }
                };
            }
            return { style: {} };
        },
        addEventListener(name, fn) {
            documentListeners.set(name, fn);
        },
        removeEventListener(name) {
            documentListeners.delete(name);
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
        addEventListener(name, fn) {
            windowListeners.set(name, fn);
        },
        removeEventListener(name) {
            windowListeners.delete(name);
        },
        open(url) {
            if (popupBlocked) return null;
            return {
                url,
                focus() {},
                print: popupPrintMissing ? undefined : () => {
                    popupPrintCalls.push(url);
                }
            };
        }
    };
    const URLState = {
        createObjectURL() {
            objectUrlCounter += 1;
            return `blob:print-${objectUrlCounter}`;
        },
        revokeObjectURL(url) {
            revokedUrls.push(url);
        }
    };

    const PdfViewer = new Function(
        'window',
        'document',
        'DOM_CACHE',
        'navigator',
        'URL',
        'alert',
        'buildWorkerUrl',
        `${pdfViewerClassCode}; return PdfViewer;`
    )(windowState, documentState, DOM_CACHE, navigatorState, URLState, (message) => alerts.push(message), (target, params = {}) => {
        const query = new URLSearchParams({ target, ...params }).toString();
        return `https://worker.example/?${query}`;
    });

    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.currentPdfBlob = { tag: 'pdf-blob' };
    PdfViewer.PRINT_CLEANUP_TIMEOUT_MS = 5;
    PdfViewer.PRINT_MAX_TIMEOUT_MS = 30;
    PdfViewer.PRINT_IFRAME_LOAD_TIMEOUT_MS = 5;
    PdfViewer.PRINT_DIALOG_RELEASE_DELAY_MS = 1;

    PdfViewer.print();
    assert(PdfViewer.isPrinting === true, 'print should set guard immediately');
    await wait(15);
    assert(PdfViewer.isPrinting === false, 'print fallback cleanup should always release guard');
    assert(activeNodes.filter((n) => n.tagName === 'IFRAME').length === 0, 'print cleanup should remove iframe');
    assert(revokedUrls.includes('blob:print-1'), 'iframe print path should revoke temporary object URL');

    simulateIframeError = true;
    PdfViewer.print();
    await wait(10);
    assert(PdfViewer.isPrinting === false, 'iframe load failure should release print guard');
    assert(activeNodes.filter((n) => n.tagName === 'IFRAME').length === 0, 'iframe error path should cleanup iframe');
    assert(revokedUrls.includes('blob:print-2'), 'iframe error path should revoke temporary object URL');
    simulateIframeError = false;

    navigatorState.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    navigatorState.vendor = 'Apple Computer, Inc.';
    navigatorState.platform = 'iPhone';
    navigatorState.maxTouchPoints = 5;
    PdfViewer.print();
    await wait(10);
    assert(popupPrintCalls.length === 1, 'Safari/iOS print path should target an isolated popup window');
    assert(!alerts.some((message) => /Opened the PDF in a new tab/i.test(message)), 'successful isolated print should not show fallback guidance');
    assert(PdfViewer.isPrinting === false, 'isolated print path should also release the print guard');

    popupPrintMissing = true;
    PdfViewer.print();
    await wait(10);
    assert(alerts.some((message) => /Opened the PDF in a new tab/i.test(message)), 'missing isolated print support should explain the PDF-tab fallback');
    assert(PdfViewer.isPrinting === false, 'missing isolated print support should also release the print guard');
    popupPrintMissing = false;

    popupBlocked = true;
    PdfViewer.print();
    await wait(5);
    assert(alerts.some((message) => /Unable to open the PDF print tab/i.test(message)), 'popup-open failure should alert the user');
    assert(PdfViewer.isPrinting === false, 'popup-open failure should release the print guard');
    popupBlocked = false;

    PdfViewer.download();
    assert(anchorsClicked.length === 1, 'download should trigger one anchor click when PDF is loaded');
    assert(anchorsClicked[0].href === 'blob:viewer-pdf', 'download should use current viewer blob URL');
    assert(anchorsClicked[0].download.endsWith('.pdf'), 'download filename should end with .pdf');
    assert(!/[\\/:*?"<>|]/.test(anchorsClicked[0].download), 'download filename should be sanitized');

    anchorsClicked = [];
    navigatorState.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    navigatorState.vendor = 'Apple Computer, Inc.';
    PdfViewer._activePanelId = 'CP-1234';
    PdfViewer.currentBlobUrl = 'blob:viewer-pdf';
    PdfViewer.download();
    assert(anchorsClicked.length === 1, 'Safari download should use attachment URL path');
    assert(/target=PDF_BY_ID/.test(anchorsClicked[0].href), 'Safari attachment URL should target PDF_BY_ID');
    assert(/mode=attachment/.test(anchorsClicked[0].href), 'Safari attachment URL should request attachment mode');
    assert(anchorsClicked[0].target === '_blank', 'Safari attachment download should open isolated target');

    anchorsClicked = [];
    navigatorState.userAgent = 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36';
    navigatorState.vendor = 'Google Inc.';
    PdfViewer.currentBlobUrl = '';
    PdfViewer.download();
    assert(anchorsClicked.length === 0, 'download should no-op when no PDF is loaded');

    console.log('✅ PdfViewer print/download tests passed');
})();
