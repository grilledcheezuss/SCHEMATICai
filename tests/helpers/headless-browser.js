// Minimal headless Chrome harness for real DOM/CSS regression tests (no npm dependencies).
// Serves the repository root over a local HTTP server, launches Chrome/Chromium with
// --remote-debugging-port, and drives one page through the DevTools protocol using the
// Node 22+ global WebSocket. Requests outside the local server (fonts, Worker, Airtable)
// are blocked so these tests never touch the network or backend.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.pdf': 'application/pdf',
    '.json': 'application/json'
};

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ].filter(Boolean);
    return candidates.find(p => { try { return fs.statSync(p).isFile(); } catch (_) { return false; } }) || null;
}

function startServer() {
    const server = http.createServer((req, res) => {
        let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        // Test-only host quirk: /__redirect/index.html canonicalizes to /__redirect/ like static hosts do.
        if (urlPath === '/__redirect/index.html') { res.writeHead(308, { Location: '/__redirect/' }); res.end(); return; }
        if (urlPath.startsWith('/__redirect/')) urlPath = urlPath.slice('/__redirect'.length);
        const filePath = path.resolve(REPO_ROOT, '.' + (urlPath === '/' ? '/index.html' : urlPath));
        if (!filePath.startsWith(REPO_ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
            res.end(data);
        });
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function waitForDevtoolsUrl(proc) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const timer = setTimeout(() => reject(new Error('Chrome did not expose a DevTools endpoint')), 20000);
        proc.stderr.on('data', chunk => {
            buffer += chunk.toString();
            const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) { clearTimeout(timer); resolve(match[1]); }
        });
        proc.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited early (${code})`)); });
    });
}

class HeadlessBrowser {
    static async launch() {
        const chromePath = findChrome();
        if (!chromePath || typeof WebSocket === 'undefined') return null;
        const server = await startServer();
        const userDataDir = fs.mkdtempSync(path.join(REPO_ROOT, '.schematica-ui-'));
        let proc = null;
        let ws = null;
        let browser = null;
        try {
            proc = spawn(chromePath, [
                '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
                '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                `--user-data-dir=${userDataDir}`, '--remote-debugging-port=0', 'about:blank'
            ], { stdio: ['ignore', 'ignore', 'pipe'] });
            const wsUrl = await waitForDevtoolsUrl(proc);
            ws = new WebSocket(wsUrl);
            await new Promise((resolve, reject) => {
                ws.onopen = resolve;
                ws.onerror = () => reject(new Error('Failed to connect to DevTools WebSocket'));
            });
            browser = new HeadlessBrowser(proc, ws, server, userDataDir);
            await browser._attach();
            return browser;
        } catch (err) {
            if (browser) {
                await browser.close();
            } else {
                try { ws?.close(); } catch (_) { /* ignore */ }
                if (proc && proc.exitCode === null && proc.signalCode === null) {
                    const exited = new Promise(resolve => proc.once('exit', resolve));
                    proc.kill('SIGKILL');
                    await exited;
                }
                await new Promise(resolve => server.close(resolve));
                fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
            throw err;
        }
    }

    async _attach() {
        const browser = this;
        const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' }, null);
        const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true }, null);
        browser.sessionId = sessionId;
        await browser.send('Page.enable');
        await browser.send('Runtime.enable');
        await browser.send('Network.enable');
        await browser.send('Network.setBlockedURLs', {
            urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*coxpanelfinder.app*', '*workers.dev*', '*airtable*']
        });
        browser.listeners.push(msg => {
            if (msg.method !== 'Fetch.requestPaused') return;
            const { requestId, request } = msg.params;
            const local = request.url.startsWith(`${browser.baseUrl}/`)
                || /^(blob:|data:|about:)/.test(request.url);
            browser.send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest',
                local ? { requestId } : { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        });
        await browser.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    }

    constructor(proc, ws, server, userDataDir) {
        this.proc = proc;
        this.ws = ws;
        this.server = server;
        this.userDataDir = userDataDir;
        this.sessionId = null;
        this.nextId = 1;
        this.pending = new Map();
        this.listeners = [];
        this.pageErrors = [];
        ws.onmessage = event => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
                return;
            }
            if (msg.method === 'Runtime.exceptionThrown') {
                const details = msg.params.exceptionDetails || {};
                this.pageErrors.push(details.exception?.description || details.text);
            }
            this.listeners.slice().forEach(fn => fn(msg));
        };
        const rejectPending = reason => {
            this.pending.forEach(({ reject }) => reject(new Error(reason)));
            this.pending.clear();
        };
        ws.onclose = () => rejectPending('DevTools connection closed');
        proc.on('exit', code => rejectPending(`Chrome exited (${code})`));
    }

    get baseUrl() {
        return `http://127.0.0.1:${this.server.address().port}`;
    }

    send(method, params = {}, sessionId = this.sessionId) {
        const id = this.nextId++;
        const payload = { id, method, params };
        if (sessionId) payload.sessionId = sessionId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`DevTools request timed out: ${method}`));
            }, 30000);
            const settle = fn => value => { clearTimeout(timer); fn(value); };
            this.pending.set(id, { resolve: settle(resolve), reject: settle(reject) });
            try {
                this.ws.send(JSON.stringify(payload));
            } catch (err) {
                this.pending.delete(id);
                clearTimeout(timer);
                reject(err);
            }
        });
    }

    waitForEvent(method, timeoutMs = 20000) {
        return new Promise((resolve, reject) => {
            const listener = msg => { if (msg.method === method) { cleanup(); resolve(msg.params); } };
            const cleanup = () => { clearTimeout(timer); this.listeners = this.listeners.filter(fn => fn !== listener); };
            const timer = setTimeout(() => { cleanup(); reject(new Error(`Timed out waiting for ${method}`)); }, timeoutMs);
            this.listeners.push(listener);
        });
    }

    // Emulates a CSS-pixel viewport. Changing it on a loaded page fires a real resize event.
    async setViewport(width, height) {
        await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    }

    // Loads index.html fresh at the given viewport, so no resize happens after page init.
    async open(width, height) {
        await this.setViewport(width, height);
        const loaded = this.waitForEvent('Page.loadEventFired');
        await this.send('Page.navigate', { url: `${this.baseUrl}/index.html` });
        await loaded;
        this.pageErrors = [];
    }

    async evaluate(fn, ...args) {
        const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
        const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        }
        return result.result.value;
    }

    async screenshot(filePath) {
        const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    }

    async close() {
        const exited = this.proc.exitCode !== null || this.proc.signalCode !== null
            ? Promise.resolve()
            : new Promise(resolve => {
                const timer = setTimeout(() => this.proc.kill('SIGKILL'), 2000);
                this.proc.once('exit', () => { clearTimeout(timer); resolve(); });
            });
        try { await this.send('Browser.close', {}, null); } catch (_) { /* closing disconnects CDP */ }
        await exited;
        try { this.ws.close(); } catch (_) { /* ignore */ }
        await new Promise(resolve => this.server.close(resolve));
        fs.rmSync(this.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

module.exports = { HeadlessBrowser, findChrome };
