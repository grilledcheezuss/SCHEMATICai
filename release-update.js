// Entry HTML is the release manifest; no separate version file can drift from the deployed assets.
class ReleaseUpdate {
    static _check = null;
    static ATTEMPT_KEY = 'cox_release_navigation';
    static RETRY_AFTER_MS = 10 * 60 * 1000;
    static TIMEOUT_MS = 5000;
    static NAVIGATION_RELEASE_TIMEOUT_MS = 1000;
    // Set by app.js: releases this tab's data-sync lock so peers never wait on a page that is navigating away.
    static beforeNavigate = null;
    static ASSETS = ['style.css', 'release-update.js', 'pdf-render-helper.js',
        'pdf-ui-state.js', 'info-table-parser.js', 'generator-state.js', 'app.js'];

    static compare(a, b) {
        const parse = value => /^v\d+\.\d+\.\d+$/.test(value || '')
            ? value.slice(1).split('.').map(Number) : null;
        const left = parse(a), right = parse(b);
        if (!left || !right || ![...left, ...right].every(Number.isSafeInteger)) return null;
        for (let i = 0; i < 3; i++) {
            if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
        }
        return 0;
    }

    static deployedVersion(html, entryUrl) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const version = doc.querySelector('meta[name="app-version"]')?.content;
        if (this.compare(version, version) !== 0) return null;
        const urls = [...doc.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
            .map(el => new URL(el.getAttribute('src') || el.getAttribute('href'), entryUrl));
        return this.ASSETS.every(asset => urls.some(url =>
            url.origin === entryUrl.origin &&
            url.pathname === new URL(asset, entryUrl).pathname &&
            url.searchParams.get('v') === version.slice(1))) ? version : null;
    }

    // Follows same-origin redirects; an off-site final URL (or unreadable opaque response) is rejected.
    // Cross-origin redirects without CORS already reject inside fetch and fall back the same way.
    static async fetchSameOrigin(url, init) {
        const response = await fetch(url.href, { ...init, credentials: 'omit', redirect: 'follow' });
        const finalUrl = new URL(response.url || url.href, url);
        if (finalUrl.origin !== url.origin || response.type === 'opaque') {
            throw new Error('Cross-origin release redirect');
        }
        return { response, finalUrl };
    }

    static isVersion(version) {
        return this.compare(version, version) !== null;
    }

    // Version the loaded entry HTML declares; differs from APP_VERSION when HTML and app.js come from different releases.
    static documentVersion() {
        const version = typeof document !== 'undefined'
            ? document.querySelector('meta[name="app-version"]')?.content : null;
        return this.isVersion(version) ? version : null;
    }

    // Newer deployment, or a mixed release: HTML that disagrees with the executing app.js. Never downgrades.
    static target(deployed, documentVersion, currentVersion) {
        if (this.compare(deployed, currentVersion) > 0) return deployed;
        const mixed = documentVersion !== null && documentVersion !== currentVersion;
        if (!mixed) return null;
        // Stale entry HTML around the deployed app.js: reload the entry once.
        if (this.compare(deployed, currentVersion) === 0) return deployed;
        // Entry unverifiable, but the loaded HTML already declares a newer release than the executing app.js.
        if (deployed === null && this.compare(documentVersion, currentVersion) > 0) return documentVersion;
        return null;
    }

    static async releaseBeforeNavigate() {
        if (typeof this.beforeNavigate !== 'function') return;
        let timer = null;
        try {
            await Promise.race([
                Promise.resolve().then(() => this.beforeNavigate()),
                new Promise(resolve => { timer = setTimeout(resolve, this.NAVIGATION_RELEASE_TIMEOUT_MS); })
            ]);
        } catch (_) {
        } finally {
            clearTimeout(timer);
        }
    }

    static check(currentVersion) {
        if (!this._check) this._check = this.checkOnce(currentVersion);
        return this._check;
    }

    static async checkOnce(currentVersion) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
        try {
            let deployed = null;
            let entryUrl = null;
            let entryError = null;
            try {
                // Revalidate the document path actually loaded; hosts may redirect /index.html to /.
                const requested = new URL(location.href);
                requested.search = '';
                requested.hash = '';
                const entry = await this.fetchSameOrigin(requested, { cache: 'no-store', signal: controller.signal });
                if (!entry.response.ok) throw new Error('Entry revalidation failed');
                entryUrl = entry.finalUrl;
                deployed = this.deployedVersion(await entry.response.text(), entryUrl);
            } catch (error) {
                entryError = error;
            }
            const documentVersion = this.documentVersion();
            const version = this.target(deployed, documentVersion, currentVersion);
            if (!version) {
                if (deployed === null) {
                    if (entryError) throw entryError;
                    return { status: 'unavailable', navigating: false };
                }
                sessionStorage.removeItem(this.ATTEMPT_KEY);
                return { status: 'current', navigating: false };
            }
            if (!entryUrl) entryUrl = new URL(location.href);
            let attempt = null;
            try { attempt = JSON.parse(sessionStorage.getItem(this.ATTEMPT_KEY)); } catch (_) {}
            if (attempt?.version === version && Date.now() - attempt.at < this.RETRY_AFTER_MS) {
                return { status: 'pending', navigating: false };
            }
            // Warm only the target release's assets before leaving the working page.
            await Promise.all(this.ASSETS.map(async asset => {
                const url = new URL(`${asset}?v=${version.slice(1)}`, entryUrl);
                const { response, finalUrl } = await this.fetchSameOrigin(url, {
                    cache: 'reload', signal: controller.signal
                });
                const type = response.headers?.get('Content-Type') || '';
                if (!response.ok || finalUrl.pathname !== url.pathname || (type && !(asset.endsWith('.css')
                    ? /text\/css/i.test(type) : /javascript|ecmascript/i.test(type)))) {
                    throw new Error(`Release asset unavailable: ${asset}`);
                }
                const body = (await response.text()).trim();
                if (!body) throw new Error(`Empty release asset: ${asset}`);
                // An HTML fallback page is never a valid script/stylesheet, even without a Content-Type.
                if (/^<(!doctype|html|head|body)\b/i.test(body)) throw new Error(`HTML fallback for release asset: ${asset}`);
                // A CDN that ignores ?v= can return the previous app.js; navigating to it would only re-run old code.
                const declared = asset === 'app.js' && body.match(/\bAPP_VERSION\s*=\s*["'`](v\d+\.\d+\.\d+)["'`]/)?.[1];
                if (asset === 'app.js' && declared !== version) {
                    throw new Error(`Stale release app.js (expected ${version}, got ${declared || 'unknown'})`);
                }
            }));
            // Store the guard before navigation. If storage is unavailable, stay usable rather than loop.
            sessionStorage.setItem(this.ATTEMPT_KEY, JSON.stringify({ version, at: Date.now() }));
            await this.releaseBeforeNavigate();
            const destination = new URL(location.href);
            destination.searchParams.set('cox_release', version);
            location.replace(destination.href);
            return { status: 'updating', navigating: true };
        } catch (error) {
            console.warn('[ReleaseUpdate] Entry revalidation unavailable; continuing with installed app and cached data.', error?.message || error);
            return { status: 'unavailable', navigating: false };
        } finally {
            controller.abort();
            clearTimeout(timeout);
        }
    }
}
