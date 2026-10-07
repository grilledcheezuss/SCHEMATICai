// Entry HTML is the release manifest; no separate version file can drift from the deployed assets.
class ReleaseUpdate {
    static _check = null;
    static ATTEMPT_KEY = 'cox_release_navigation';
    static RETRY_AFTER_MS = 10 * 60 * 1000;
    static TIMEOUT_MS = 5000;
    static ASSETS = ['style.css', 'release-update.js', 'pdf-render-helper.js',
        'pdf-ui-state.js', 'info-table-parser.js', 'app.js'];

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

    static check(currentVersion) {
        if (!this._check) this._check = this.checkOnce(currentVersion);
        return this._check;
    }

    static async checkOnce(currentVersion) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
        try {
            const entryUrl = new URL('index.html', location.href);
            const response = await fetch(entryUrl.href, {
                cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal
            });
            if (!response.ok) throw new Error('Entry revalidation failed');
            const version = this.deployedVersion(await response.text(), entryUrl);
            const comparison = this.compare(version, currentVersion);
            if (comparison === null) return { status: 'unavailable', navigating: false };
            if (comparison <= 0) {
                sessionStorage.removeItem(this.ATTEMPT_KEY);
                return { status: 'current', navigating: false };
            }
            let attempt = null;
            try { attempt = JSON.parse(sessionStorage.getItem(this.ATTEMPT_KEY)); } catch (_) {}
            if (attempt?.version === version && Date.now() - attempt.at < this.RETRY_AFTER_MS) {
                return { status: 'pending', navigating: false };
            }
            // Warm only the newer release's assets before leaving the working page.
            await Promise.all(this.ASSETS.map(async asset => {
                const url = new URL(`${asset}?v=${version.slice(1)}`, entryUrl);
                const response = await fetch(url.href, {
                    cache: 'reload', credentials: 'omit', redirect: 'error', signal: controller.signal
                });
                const type = response.headers?.get('Content-Type') || '';
                if (!response.ok || (type && !(asset.endsWith('.css')
                    ? /text\/css/i.test(type) : /javascript|ecmascript/i.test(type)))) {
                    throw new Error('Release asset unavailable');
                }
                if (!(await response.text()).trim()) throw new Error('Empty release asset');
            }));
            // Store the guard before navigation. If storage is unavailable, stay usable rather than loop.
            sessionStorage.setItem(this.ATTEMPT_KEY, JSON.stringify({ version, at: Date.now() }));
            const destination = new URL(location.href);
            destination.searchParams.set('cox_release', version);
            location.replace(destination.href);
            return { status: 'updating', navigating: true };
        } catch (_) {
            console.warn('[ReleaseUpdate] Entry revalidation unavailable; continuing with installed app and cached data.');
            return { status: 'unavailable', navigating: false };
        } finally {
            controller.abort();
            clearTimeout(timeout);
        }
    }
}
