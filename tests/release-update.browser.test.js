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
                    replace: url => state.navigations.push(url),
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
                    if (options.offline) throw new Error('offline');
                    if (options.assetFailure && new URL(url).pathname.endsWith('.js')) throw new Error('asset unavailable');
                    if (options.timeout) return new Promise((_, reject) =>
                        init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
                    return { ok: options.ok !== false, text: async () => documentHtml };
                };
                const Release = new Function('location', 'sessionStorage', 'fetch',
                    `${source}; return ReleaseUpdate;`)(location, sessionStorage, fetch);
                Release.TIMEOUT_MS = 20;
                return { Release, state, storage, location, run: () => Release.check(current) };
            }
            let h = harness(version);
            check((await h.run()).status === 'current' && h.state.navigations.length === 0, 'same release does not reload');
            await h.run();
            check(h.state.fetches === 1, 'single flight / one discovery per startup');
            check(h.state.request.cache === 'no-store' && h.state.request.credentials === 'omit'
                && h.state.request.redirect === 'error', 'entry revalidation bypasses old HTTP cache without auth headers');
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
            h = harness('v2.5.100', html, { assetFailure: true });
            check((await h.run()).status === 'unavailable' && !h.state.navigations.length && !h.storage.size,
                'failed new asset download retains working entry and permits later retry');
            h = harness('v2.5.100');
            h.storage.set(h.Release.ATTEMPT_KEY, JSON.stringify({ version, at: Date.now() - h.Release.RETRY_AFTER_MS - 1 }));
            check((await h.run()).navigating, 'future login can retry failed asset navigation after cooldown');

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
            check(/if\(AuthService\.init\(\)\) \{\s*ReleaseUpdate\.check\(APP_VERSION\)\.then\(update => \{\s*if \(!update\.navigating\) DataLoader\.preload\(\);/.test(app),
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
        const navigated = browser.waitForEvent('Page.loadEventFired');
        await browser.evaluate(() => { ReleaseUpdate.check('v2.5.100'); return true; });
        await navigated;
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
        console.log(`✅ ${results.length} release/login browser checks plus asset/header consistency passed`);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
