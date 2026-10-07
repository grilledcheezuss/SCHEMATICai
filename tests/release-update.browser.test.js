// Production release discovery with real DOMParser; injected network/navigation keep tests local.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { HeadlessBrowser } = require('./helpers/headless-browser');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'release-update.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const version = app.match(/const APP_VERSION = "(v[^"]+)"/)[1];

(async () => {
    const browser = await HeadlessBrowser.launch();
    if (!browser) {
        console.warn('SKIP release browser tests: Chrome/Node WebSocket unavailable');
        if (process.env.REQUIRE_BROWSER === '1') process.exitCode = 1;
        return;
    }
    try {
        await browser.open(1280, 800);
        const results = await browser.evaluate(async (source, html, version, app) => {
            const checks = [];
            const check = (ok, label) => checks.push({ ok: !!ok, label });
            function harness(current, documentHtml = html, options = {}) {
                const storage = options.storage || new Map();
                const state = { fetches: 0, navigations: [], reloads: 0 };
                const location = {
                    href: `${window.location.origin}/index.html?keep=1#test`,
                    replace: url => { state.navigations.push(url); state.events = [...(state.events || []), 'navigate']; },
                    reload: () => state.reloads++
                };
                const sessionStorage = {
                    getItem: key => storage.get(key) || null,
                    setItem: (key, value) => storage.set(key, value),
                    removeItem: key => storage.delete(key)
                };
                const fetch = async (url, init) => {
                    state.fetches++;
                    state.request = { url, cache: init.cache, credentials: init.credentials, redirect: init.redirect };
                    state.requests = [...(state.requests || []), state.request];
                    if (options.offline) throw new Error('offline');
                    const requested = new URL(url);
                    const isAsset = /\.(js|css)$/.test(requested.pathname);
                    if (options.assetFailure && requested.pathname.endsWith('.js')) throw new Error('asset unavailable');
                    if (options.entryOffline && !isAsset) throw new Error('entry unavailable');
                    if (options.timeout) return new Promise((_, reject) =>
                        init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
                    if (!isAsset) {
                        // Hosts may canonicalize /index.html to /; fetch exposes the final URL after following.
                        const final = options.entryRedirect ? new URL(options.entryRedirect, requested).href : url;
                        if (init.redirect !== 'follow' && final !== url) throw new TypeError('Failed to fetch');
                        return { ok: options.ok !== false, url: final, redirected: final !== url,
                            headers: new Headers({ 'Content-Type': 'text/html' }), text: async () => documentHtml };
                    }
                    const css = requested.pathname.endsWith('.css');
                    const asset = (options.assetResponse && options.assetResponse(requested)) || {};
                    const type = 'type' in asset ? asset.type : (css ? 'text/css; charset=utf-8' : 'application/javascript');
                    return { ok: asset.ok !== false, url: asset.url ? new URL(asset.url, requested).href : url,
                        headers: new Headers(type ? { 'Content-Type': type } : {}),
                        text: async () => 'body' in asset ? asset.body
                            : (css ? 'body{}' : `const APP_VERSION = "v${requested.searchParams.get('v')}";`) };
                };
                const Release = new Function('location', 'sessionStorage', 'fetch',
                    `${source}; return ReleaseUpdate;`)(location, sessionStorage, fetch);
                Release.TIMEOUT_MS = 20;
                // The test page's own meta is the repo version; by default model HTML matching the executing app.js.
                const realDocumentVersion = Release.documentVersion.bind(Release);
                Release.documentVersion = () => 'documentVersion' in options
                    ? (options.documentVersion === 'real' ? realDocumentVersion() : options.documentVersion) : current;
                return { Release, state, storage, location, run: () => Release.check(current) };
            }
            let h = harness(version);
            check((await h.run()).status === 'current' && h.state.navigations.length === 0, 'same release does not reload');
            await h.run();
            check(h.state.fetches === 1, 'single flight / one discovery per startup');
            check(h.state.request.cache === 'no-store' && h.state.request.credentials === 'omit'
                && h.state.request.redirect === 'follow', 'entry revalidation bypasses old HTTP cache without auth headers');
            check(h.state.request.url === `${window.location.origin}/index.html`, 'entry revalidation targets the loaded document path without query/hash');

            // Same-origin canonical redirect /index.html -> / is a valid entry, not a fatal failure.
            const warnings = [];
            const originalWarn = console.warn;
            console.warn = (...args) => warnings.push(args.join(' '));
            try {
                h = harness(version, html, { entryRedirect: '/' });
                check((await h.run()).status === 'current' && !h.state.navigations.length, 'same-origin /index.html -> / redirect revalidates current release');
                h = harness('v2.5.100', html, { entryRedirect: '/' });
                const redirected = await h.run();
                check(redirected.navigating && h.state.navigations.length === 1, 'same-origin redirected entry still discovers newer release');
                check(h.state.requests.slice(1).every(r => new URL(r.url).origin === window.location.origin
                    && r.redirect === 'follow' && r.credentials === 'omit'), 'assets resolved against same-origin final entry URL');
                check(!warnings.some(w => w.includes('Entry revalidation unavailable')), 'redirected entry does not log the unavailable warning');
            } finally {
                console.warn = originalWarn;
            }
            h = harness('v2.5.100', html, { entryRedirect: 'https://example.invalid/' });
            check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size,
                'off-site entry redirect is rejected and keeps the installed app');
            h = harness('v2.5.100');
            check((await h.run()).navigating && h.state.navigations.length === 1, 'old executing JS discovers deployed release');
            const destination = new URL(h.state.navigations[0]);
            check(destination.searchParams.get('cox_release') === version
                && destination.searchParams.get('keep') === '1' && destination.hash === '#test', 'navigation revalidates entry and preserves URL context');
            let reentry = harness('v2.5.100', html, { storage: h.storage });
            check((await reentry.run()).status === 'pending' && reentry.state.navigations.length === 0, 'stale entry/assets cannot produce reload loop');
            reentry = harness(version, html, { storage: h.storage });
            check((await reentry.run()).status === 'current' && h.storage.size === 0, 'updated assets clear navigation guard');
            h = harness('v99.0.0');
            check((await h.run()).status === 'current' && !h.state.navigations.length, 'older deployment never downgrades executing frontend');
            for (const [label, content] of [
                ['missing metadata', html.replace(/<meta name="app-version"[^>]*>/, '')],
                ['malformed metadata', html.replace(`content="${version}"`, 'content="latest"')],
                ['stale app asset', html.replace(`app.js?v=${version.slice(1)}`, 'app.js?v=2.5.100')],
                ['stale stylesheet', html.replace(`style.css?v=${version.slice(1)}`, 'style.css?v=2.5.100')],
                ['foreign asset', html.replace('src="app.js?', 'src="https://example.invalid/app.js?')],
                ['invalid HTML', '<html>maintenance</html>']
            ]) {
                h = harness('v2.5.100', content);
                check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size, label);
            }
            for (const options of [{ offline: true }, { ok: false }, { timeout: true }]) {
                h = harness('v2.5.100', html, options);
                check((await h.run()).status === 'unavailable' && !h.storage.size, 'network/HTTP/timeout failure leaves retry unpoisoned');
            }
            for (const [label, response] of [
                ['asset served as HTML MIME', url => url.pathname.endsWith('/app.js') && { type: 'text/html', body: '<!doctype html><html></html>' }],
                ['stylesheet served as JS MIME', url => url.pathname.endsWith('.css') && { type: 'application/javascript' }],
                ['HTML fallback without Content-Type', url => url.pathname.endsWith('/release-update.js') && { type: '', body: '<!DOCTYPE html><title>app</title>' }],
                ['missing asset (404)', url => url.pathname.endsWith('/pdf-ui-state.js') && { ok: false }],
                ['empty asset body', url => url.pathname.endsWith('/info-table-parser.js') && { body: '  ' }],
                ['asset redirected to entry', url => url.pathname.endsWith('/app.js') && { url: '/', type: 'text/html', body: html }],
                ['asset redirected to other path', url => url.pathname.endsWith('/app.js') && { url: '/old/app.js' }],
                ['stale app.js served for new cachebuster', url => url.pathname.endsWith('/app.js') && { body: 'const APP_VERSION = "v2.5.100";' }],
                ['asset redirected off-site', url => url.pathname.endsWith('/app.js') && { url: 'https://example.invalid/app.js' }]
            ]) {
                h = harness('v2.5.100', html, { assetResponse: response });
                check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size,
                    `${label} blocks navigation`);
            }
            h = harness('v2.5.100', html, { assetResponse: url => url.pathname.endsWith('/app.js') && { type: 'text/javascript; charset=utf-8' } });
            check((await h.run()).navigating, 'text/javascript MIME variant is accepted');
            h = harness('v2.5.100', html, { assetFailure: true });
            check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size,
                'failed new asset download retains working entry and permits later retry');
            h = harness('v2.5.100');
            h.storage.set(h.Release.ATTEMPT_KEY, JSON.stringify({ version, at: Date.now() - h.Release.RETRY_AFTER_MS - 1 }));
            check((await h.run()).navigating, 'future login can retry failed asset navigation after cooldown');

            // v2.5.103 mixed-release handshake: HTML and executing app.js from different releases.
            check(harness(version, html, { documentVersion: 'real' }).Release.documentVersion() === version, 'document version read from entry meta');
            h = harness(version, html, { documentVersion: 'v2.5.100' });
            let mixed = await h.run();
            check(mixed.navigating && h.state.navigations.length === 1
                && new URL(h.state.navigations[0]).searchParams.get('cox_release') === version, 'stale HTML around current app.js reloads entry once');
            reentry = harness(version, html, { storage: h.storage, documentVersion: 'v2.5.100' });
            check((await reentry.run()).status === 'pending' && !reentry.state.navigations.length, 'still-mixed HTML after the guarded reload continues without looping');
            reentry = harness(version, html, { storage: h.storage });
            check((await reentry.run()).status === 'current' && !h.storage.size, 'matching HTML after the guarded reload clears the guard');
            h = harness('v2.5.100', html, { documentVersion: version, entryOffline: true });
            mixed = await h.run();
            check(mixed.navigating && new URL(h.state.navigations[0]).searchParams.get('cox_release') === version,
                'newer HTML around old app.js reloads once even when entry revalidation fails');
            check(h.state.requests.slice(1).every(r => r.cache === 'reload') && h.state.requests.length === 1 + h.Release.ASSETS.length,
                'mixed reload is cache-bypassing: every asset is re-downloaded first');
            reentry = harness('v2.5.100', html, { storage: h.storage, documentVersion: version, entryOffline: true });
            check((await reentry.run()).status === 'pending' && !reentry.state.navigations.length, 'still-stale app.js after the guarded reload keeps the loaded app');
            h = harness('v2.5.100', html, { documentVersion: version, assetResponse: url => url.pathname.endsWith('/app.js') && { body: 'const APP_VERSION = "v2.5.100";' } });
            check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size,
                'mixed release whose app.js is still stale on the CDN does not navigate or poison the guard');
            h = harness('v2.5.100', html, { documentVersion: version, entryOffline: true,
                assetResponse: url => url.pathname.endsWith('/release-update.js') && { type: 'text/html', body: '<!doctype html><html></html>' } });
            check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size,
                'deploy-window HTML fallback for an asset leaves the installed app usable');
            h = harness('v99.0.0', html, { documentVersion: version });
            check((await h.run()).status === 'current' && !h.state.navigations.length, 'mixed release never downgrades executing app.js');
            const meta = document.querySelector('meta[name="app-version"]');
            meta.content = 'latest';
            h = harness(version, html, { documentVersion: 'real' });
            check(h.Release.documentVersion() === null && (await h.run()).status === 'current' && !h.state.navigations.length,
                'malformed document meta is not treated as mixed');
            meta.content = version;

            // Sync lock is released before leaving; a failing or hung release hook cannot block navigation.
            h = harness('v2.5.100');
            h.Release.beforeNavigate = async () => {
                h.state.events = [...(h.state.events || []), 'release-lock'];
                check(h.storage.size === 1, 'navigation guard stored before releasing the lock');
            };
            await h.run();
            check(JSON.stringify(h.state.events) === '["release-lock","navigate"]', 'sync lock released before release navigation');
            h = harness('v2.5.100');
            h.Release.beforeNavigate = () => { throw new Error('release failed'); };
            check((await h.run()).navigating && h.state.navigations.length === 1, 'throwing lock release does not block navigation');
            h = harness('v2.5.100');
            h.Release.NAVIGATION_RELEASE_TIMEOUT_MS = 10;
            h.Release.beforeNavigate = () => new Promise(() => {});
            check((await h.run()).navigating && h.state.navigations.length === 1, 'hung lock release is bounded before navigation');
            h = harness(version);
            h.Release.beforeNavigate = () => { h.state.events = ['release-lock']; };
            await h.run();
            check(!h.state.events, 'no lock release without a release navigation');

            // Exercise the actual manual login implementation without navigating the test page.
            const authSource = app.slice(app.indexOf('class AuthService {'), app.indexOf('class NetworkService {'));
            for (const current of [version, 'v2.5.100']) {
                h = harness(current);
                const local = new Map([['theme', 'dark'], ['profiles', 'keep']]);
                const storage = { setItem: (k, v) => local.set(k, v), getItem: k => local.get(k) };
                const document = { getElementById: id => ({ value: id === 'auth-user' ? ' user ' : ' password ' }) };
                const Auth = new Function('localStorage', 'document', 'location', 'ReleaseUpdate', 'APP_VERSION',
                    `${authSource}; return AuthService;`)(storage, document, h.location, h.Release, current);
                await Auth.login();
                check(local.get('cox_user') === 'user' && local.get('cox_pass') === 'password'
                    && local.get('theme') === 'dark' && local.get('profiles') === 'keep', 'login preserves preferences and credential behavior');
                check(current === version ? h.state.reloads === 1 : h.state.navigations.length === 1 && h.state.reloads === 0,
                    'manual login chooses ordinary reload or newer release navigation, not both');
            }
            check(/if\(AuthService\.init\(\)\) \{\s*AuthService\.releaseCheck\(\)\.then\(update => \{\s*if \(!update\.navigating\) DataLoader\.preload\(\);/.test(app),
                'auto-login checks deployed assets before data preload');
            return checks;
        }, source, html, version, app);
        results.forEach(({ ok, label }) => assert(ok, label));
        assert(html.includes(`content="${version}"`), 'entry metadata matches APP_VERSION');
        for (const asset of ['style.css', 'release-update.js', 'app.js', 'info-table-parser.js', 'pdf-render-helper.js', 'pdf-ui-state.js']) {
            assert(html.includes(`${asset}?v=${version.slice(1)}`), `${asset}: cachebuster aligned`);
        }
        const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
        assert.equal(headers, '/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/*.js\n  Cache-Control: no-cache\n/*.css\n  Cache-Control: no-cache\n');
        const realRedirect = await browser.evaluate(async (source, version) => {
            // Real Chrome fetch against a host that redirects /index.html -> / (no mocked network).
            const state = { navigations: [] };
            const location = { href: `${window.location.origin}/__redirect/index.html?keep=1`, replace: url => state.navigations.push(url) };
            const storage = new Map();
            const sessionStorage = { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
            const warnings = [];
            const originalWarn = console.warn;
            console.warn = (...args) => warnings.push(args.join(' '));
            try {
                const make = () => new Function('location', 'sessionStorage', 'fetch', `${source}; return ReleaseUpdate;`)(location, sessionStorage, window.fetch.bind(window));
                const current = await make().check(version);
                const older = await make().check('v2.5.100');
                return { current: current.status, older: older.status, navigations: state.navigations, warnings };
            } finally {
                console.warn = originalWarn;
            }
        }, source, version);
        assert.equal(realRedirect.current, 'current', 'real same-origin index redirect revalidates current release');
        assert.equal(realRedirect.older, 'updating', 'real redirected entry warms assets and navigates to newer release');
        assert(new URL(realRedirect.navigations[0]).searchParams.get('cox_release') === version, 'redirected navigation targets deployed release');
        assert.deepEqual(realRedirect.warnings, [], 'no Entry revalidation unavailable warning for redirected entry');
        // A sync lock owned by this tab is released by the real ReleaseUpdate -> DataLoader hook before navigating.
        const owned = await browser.evaluate(async () => {
            sessionStorage.removeItem('test_lock_after_release');
            const won = await DataLoader.acquireSyncLock();
            const lock = await DB.getChunk(DataLoader.SYNC_DB_LOCK_KEY);
            const release = ReleaseUpdate.beforeNavigate;
            ReleaseUpdate.beforeNavigate = async () => {
                await release();
                sessionStorage.setItem('test_lock_after_release', JSON.stringify((await DB.getChunk(DataLoader.SYNC_DB_LOCK_KEY)) ?? null));
            };
            return { won, owner: lock?.owner === DataLoader.TAB_ID, version: lock?.appVersion, heartbeat: lock?.heartbeatAt > 0 };
        });
        assert(owned.won && owned.owner && owned.version === version && owned.heartbeat, 'real IndexedDB lock carries owner, app version and heartbeat');
        const navigated = browser.waitForEvent('Page.loadEventFired');
        await browser.evaluate(() => { ReleaseUpdate.check('v2.5.100'); return true; });
        await navigated;
        const lockAfter = await browser.evaluate(async () => ({
            atNavigation: sessionStorage.getItem('test_lock_after_release'),
            now: (await DB.getChunk(DataLoader.SYNC_DB_LOCK_KEY)) ?? null
        }));
        assert.equal(lockAfter.atNavigation, 'null', 'sync lock already released when release navigation starts');
        assert.equal(lockAfter.now, null, 'new page does not inherit a sync lock from the navigated page');
        const installed = await browser.evaluate(() => ({
            release: new URL(location.href).searchParams.get('cox_release'),
            version: document.getElementById('menu-version').textContent,
            assets: [...document.querySelectorAll('script[src]')].map(el => el.src)
        }));
        assert.equal(installed.release, version, 'actual release check navigates to updated entry');
        assert.equal(installed.version, version, 'updated app executes after navigation');
        assert(installed.assets.some(url => url.endsWith(`app.js?v=${version.slice(1)}`)), 'updated JS loaded');
        await browser.send('Page.addScriptToEvaluateOnNewDocument', { source:
            "document.addEventListener('DOMContentLoaded', () => { DataLoader.preload = () => { window.__preloads = (window.__preloads || 0) + 1; }; });"
        });
        await browser.evaluate(() => {
            localStorage.setItem('cox_user', 'test-user');
            localStorage.setItem('cox_pass', 'test-password');
        });
        await browser.open(1280, 800);
        const automatic = await browser.evaluate(async () => {
            const update = await ReleaseUpdate._check;
            await new Promise(resolve => setTimeout(resolve, 0));
            return { status: update.status, preloads: window.__preloads, loggedIn: document.documentElement.classList.contains('logged-in') };
        });
        assert(automatic.loggedIn && automatic.status === 'current' && automatic.preloads === 1,
            'actual saved-credential startup checks release then preloads once');
        // Deploy window: release-update.js missing/refused (host HTML fallback) must not block startup.
        await browser.send('Page.addScriptToEvaluateOnNewDocument', { source:
            "window.alert = message => { window.__alerts = [...(window.__alerts || []), String(message)]; };"
        });
        const blocked = ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*coxpanelfinder.app*', '*workers.dev*', '*airtable*'];
        await browser.send('Network.setBlockedURLs', { urls: [...blocked, '*release-update.js*'] });
        try {
            await browser.open(1280, 800);
            const missing = await browser.evaluate(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return { checker: typeof ReleaseUpdate, preloads: window.__preloads, alerts: window.__alerts || [],
                    loggedIn: document.documentElement.classList.contains('logged-in') };
            });
            assert(missing.checker === 'undefined' && missing.loggedIn && missing.preloads === 1 && missing.alerts.length === 0,
                'missing release-update.js still preloads the installed app once without a fatal init alert');
            assert(!browser.pageErrors.some(error => /ReleaseUpdate/.test(error)), 'missing release checker raises no page error');
        } finally {
            await browser.send('Network.setBlockedURLs', { urls: blocked });
        }
        console.log(`✅ ${results.length} release/login browser checks plus asset/header consistency passed`);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
