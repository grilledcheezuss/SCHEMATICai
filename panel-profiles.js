// Per-panel page maps for the Submittal Generator.
// Lookup is by Panel ID. Zones keep the measured fontFamily and fontSize.
// Geometry stays text-tight; a 2px inset is applied only when a resize handle
// would otherwise cover the glyphs on a box large enough to spare it.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof root !== 'undefined') root.PanelProfiles = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const SCHEMA = 'schematicai-panel-profiles/1';
    const OVERRIDE_KEY = 'cox_panel_profile_overrides';
    const HANDLE_PX = 12;
    const CONTENT_MAPS = new Set(['custom', 'cust', 'job', 'job_block', 'type', 'cpid', 'date', 'stage', 'po', 'serial', 'company', 'address', 'phone', 'fax', 'logo']);
    const memory = Object.create(null);
    let panels = Object.create(null);
    let ids = new Set();
    let unmapped = new Set();
    let index = null;
    let complete = false;
    let indexLoaded = false;
    let shardsLoaded = false;
    let indexPromise = null;
    let shardsPromise = null;
    const loadedShards = new Set();
    const shardPromises = new Map();

    function canonical(value) {
        let text = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
        text = text.replace(/\.(PDF|DWG)$/i, '');
        if (/^CP\d/.test(text)) text = 'CP-' + text.slice(2);
        else if (/^\d/.test(text)) text = 'CP-' + text;
        return text;
    }

    function versionToken() {
        return typeof APP_VERSION === 'string' ? APP_VERSION : '';
    }

    function readStore() {
        let raw = null;
        if (typeof localStorage !== 'undefined') {
            try { raw = localStorage.getItem(OVERRIDE_KEY); } catch (error) { raw = null; }
        }
        if (raw == null) raw = memory[OVERRIDE_KEY] || null;
        if (!raw) return Object.create(null);
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : Object.create(null);
        } catch (error) {
            return Object.create(null);
        }
    }

    function writeStore(value) {
        const text = JSON.stringify(value);
        memory[OVERRIDE_KEY] = text;
        if (typeof localStorage !== 'undefined') {
            try { localStorage.setItem(OVERRIDE_KEY, text); } catch (error) { /* private mode */ }
        }
    }

    function overridesFor(id) {
        const stored = readStore()[canonical(id)];
        return stored && typeof stored === 'object' ? stored : null;
    }

    // Project Info is the cover block that carries the job name and the system type together.
    function alignMap(zone) {
        if (zone && zone.field === 'project_info') return 'job_block';
        const map = zone && zone.map;
        return CONTENT_MAPS.has(map) ? map : 'custom';
    }

    // Text-tight box from the map. Inset the handle corner only when both sides
    // are more than three handle-widths, so a 12px grip does not cover the glyphs.
    // Smaller boxes stay exact; the handle is drawn just outside them.
    function overlayBox(zone, metrics) {
        const box = { x: zone.x, y: zone.y, w: zone.w, h: zone.h };
        if (!metrics || !(metrics.width > 0) || !(metrics.height > 0)) return box;
        const wPx = box.w * metrics.width;
        const hPx = box.h * metrics.height;
        if (!(wPx > HANDLE_PX * 3 && hPx > HANDLE_PX * 3)) return box;
        const nextW = box.w - (2 / metrics.width);
        const nextH = box.h - (2 / metrics.height);
        if (!(nextW > 0) || !(nextH > 0)) return box;
        return { x: box.x, y: box.y, w: nextW, h: nextH };
    }

    function clampBox(box) {
        if (!box || ![box.x, box.y, box.w, box.h].every(Number.isFinite)) return null;
        const x = Math.min(Math.max(0, box.x), 0.999);
        const y = Math.min(Math.max(0, box.y), 0.999);
        let w = box.w;
        let h = box.h;
        if (x + w > 1) w = 1 - x;
        if (y + h > 1) h = 1 - y;
        if (!(w > 0) || !(h > 0)) return null;
        return { x, y, w, h };
    }

    function presentZone(zone, metrics, adjusted) {
        const map = adjusted && CONTENT_MAPS.has(zone.map) ? zone.map : alignMap(zone);
        const geom = clampBox(adjusted ? zone : overlayBox(zone, metrics));
        if (!geom) return null;
        const fontFamily = typeof zone.fontFamily === 'string' && zone.fontFamily
            ? zone.fontFamily
            : "'Courier New', monospace";
        const fontSize = Number.isFinite(zone.fontSize) && zone.fontSize > 0 ? zone.fontSize : 14;
        const content = map !== 'custom' && map !== 'logo';
        return {
            x: geom.x, y: geom.y, w: geom.w, h: geom.h, map,
            text: content ? null : (typeof zone.text === 'string' ? zone.text : ''),
            fontSize, fontFamily,
            textAlign: zone.textAlign || 'left',
            transparent: zone.transparent === true,
            fontWeight: zone.fontWeight || 'normal',
            rotation: Number.isFinite(zone.rotation) ? zone.rotation : 0
        };
    }

    function pageRecord(record, pageNumber) {
        const page = Number(pageNumber);
        return (record && record.pages || []).find(entry => Number(entry.page) === page) || null;
    }

    function adoptIndex(next) {
        if (!next || next.schema && next.schema !== SCHEMA) return;
        index = next;
        complete = next.complete === true;
        for (const id of next.ids || []) ids.add(canonical(id));
        for (const id of next.unmapped || []) unmapped.add(canonical(id));
    }

    function install(catalog, extras) {
        const source = catalog && catalog.panels && !catalog.pages ? catalog.panels : catalog;
        if (source && typeof source === 'object') {
            for (const [id, record] of Object.entries(source)) {
                const key = canonical(id);
                if (!key || !record || typeof record !== 'object') continue;
                panels[key] = record;
                ids.add(key);
            }
        }
        if (extras && Array.isArray(extras.unmapped)) extras.unmapped.forEach(id => unmapped.add(canonical(id)));
        if (catalog && Array.isArray(catalog.unmapped)) catalog.unmapped.forEach(id => unmapped.add(canonical(id)));
        if (catalog && catalog.complete === true) complete = true;
        shardsLoaded = true;
        indexLoaded = true;
    }

    function reset() {
        panels = Object.create(null);
        ids = new Set();
        unmapped = new Set();
        index = null;
        complete = false;
        indexLoaded = false;
        shardsLoaded = false;
        indexPromise = null;
        shardsPromise = null;
        loadedShards.clear();
        shardPromises.clear();
        delete memory[OVERRIDE_KEY];
        if (typeof localStorage !== 'undefined') {
            try { localStorage.removeItem(OVERRIDE_KEY); } catch (error) { /* ignore */ }
        }
    }

    async function gunzip(bytes) {
        if (typeof DecompressionStream !== 'function') throw new Error('gzip decode unavailable');
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    function loadIndex() {
        if (indexLoaded) return Promise.resolve(index);
        if (!indexPromise) indexPromise = (async () => {
            try {
                if (typeof fetch !== 'function') return index;
                const response = await fetch('PDFmapping/panel-index.json?v=' + encodeURIComponent(versionToken()), { credentials: 'same-origin' });
                if (response.ok) adoptIndex(await response.json());
            } catch (error) {
                console.warn('Panel profile index unavailable', error);
            } finally {
                indexLoaded = true;
            }
            return index;
        })();
        return indexPromise;
    }

    function ingest(decoded) {
        if (!decoded || typeof decoded !== 'object') return;
        for (const [id, record] of Object.entries(decoded)) {
            const key = canonical(id);
            if (!key || !record || typeof record !== 'object') continue;
            panels[key] = record;
            ids.add(key);
        }
    }

    // Shards are one gzip per thousand Panel IDs: CP-8378 lives in cp-8000.json.gz.
    function shardFor(id) {
        const key = canonical(id);
        const match = /^CP-(\d+)/.exec(key);
        if (!match) return null;
        const bucket = Math.floor(Number(match[1]) / 1000) * 1000;
        return 'PDFmapping/panels/cp-' + bucket + '.json.gz';
    }

    function fetchShard(file) {
        if (!file || loadedShards.has(file)) return Promise.resolve();
        if (shardPromises.has(file)) return shardPromises.get(file);
        const pending = (async () => {
            const listed = index && Array.isArray(index.shards) ? index.shards : null;
            if (listed && !listed.includes(file)) return;
            if (typeof fetch !== 'function') return;
            try {
                const response = await fetch(file + '?v=' + encodeURIComponent(versionToken()), { credentials: 'same-origin' });
                if (!response.ok) return;
                const bytes = new Uint8Array(await response.arrayBuffer());
                ingest(JSON.parse(new TextDecoder().decode(await gunzip(bytes))));
                loadedShards.add(file);
            } catch (error) {
                console.warn('Panel profile shard unavailable', file, error);
            }
        })();
        shardPromises.set(file, pending);
        return pending.finally(() => { shardPromises.delete(file); });
    }

    function loadShards() {
        if (shardsLoaded) return Promise.resolve(panels);
        if (!shardsPromise) shardsPromise = (async () => {
            await loadIndex();
            const files = index && Array.isArray(index.shards) ? index.shards : [];
            for (const file of files) await fetchShard(file);
            shardsLoaded = true;
            return panels;
        })();
        return shardsPromise;
    }

    function peek(id) {
        const key = canonical(id);
        return key && panels[key] ? panels[key] : null;
    }

    function hasId(id) {
        const key = canonical(id);
        return !!(key && (ids.has(key) || panels[key]));
    }

    async function lookupAsync(id) {
        await loadIndex();
        const key = canonical(id);
        if (!key) return null;
        if (panels[key]) return panels[key];
        if (!ids.has(key)) return null;
        await fetchShard(shardFor(key));
        return panels[key] || null;
    }

    function lookup(id) {
        return peek(id);
    }

    function zonesFor(id, pageNumber, metrics) {
        const key = canonical(id);
        const saved = overridesFor(key);
        const pageKey = String(Number(pageNumber));
        if (saved && Array.isArray(saved[pageKey])) {
            return saved[pageKey].map(zone => presentZone(zone, null, true)).filter(Boolean);
        }
        const record = panels[key];
        const entry = pageRecord(record, pageNumber);
        if (!entry || !Array.isArray(entry.zones)) return [];
        return entry.zones.map(zone => presentZone(zone, metrics, false)).filter(Boolean);
    }

    function selectPage(id, pageNumber) {
        const key = canonical(id);
        const record = panels[key];
        const entry = pageRecord(record, pageNumber);
        return {
            panelId: key,
            page: Number(pageNumber),
            class: entry ? entry.class || null : null,
            profileKey: entry ? entry.profile_key || null : null,
            zones: zonesFor(key, pageNumber, null)
        };
    }

    function firstContentPage(record) {
        const entry = (record && record.pages || []).find(page => Array.isArray(page.zones) && page.zones.length);
        return entry ? Number(entry.page) : 1;
    }

    function isMapped(id) {
        const key = canonical(id);
        if (!panels[key]) return ids.has(key) && !unmapped.has(key);
        return (panels[key].pages || []).some(page => Array.isArray(page.zones) && page.zones.length > 0);
    }

    function hiddenWhenSubmittal(id) {
        const key = canonical(id);
        if (!key) return false;
        if (unmapped.has(key)) return true;
        if (panels[key] && !isMapped(key)) return true;
        if (complete && indexLoaded && !ids.has(key) && !panels[key]) return true;
        return false;
    }

    function labelFor(id, pageNumber) {
        const key = canonical(id);
        if (!key) return '';
        const entry = pageRecord(panels[key], pageNumber);
        if (!entry) return key;
        const kind = entry.class ? entry.class.charAt(0) + entry.class.slice(1).toLowerCase() : ('Page ' + pageNumber);
        return key + ' · ' + kind;
    }

    function fieldsFor(id, pageNumber) {
        const maps = new Set(zonesFor(id, pageNumber, null).map(zone => zone.map));
        const fields = [];
        if (maps.has('job_block')) fields.push('job', 'type');
        for (const field of ['cust', 'job', 'type', 'cpid', 'date', 'stage', 'po', 'serial', 'company', 'address', 'phone', 'fax']) {
            if (maps.has(field)) fields.push(field);
        }
        return [...new Set(fields)];
    }

    function saveOverride(id, pageNumber, zones) {
        const key = canonical(id);
        if (!key) throw new Error('Missing panel ID');
        const page = Number(pageNumber);
        if (!Number.isInteger(page) || page < 1) throw new Error('Missing page');
        const stored = readStore();
        const panel = Object.assign(Object.create(null), stored[key] || {});
        panel[String(page)] = (zones || []).map(zone => presentZone(zone, null, true)).filter(Boolean);
        stored[key] = panel;
        writeStore(stored);
        return panel[String(page)];
    }

    function saveActivePage() {
        const id = canonical(typeof PdfViewer !== 'undefined' ? PdfViewer._activePanelId : '');
        if (!id || !hasId(id)) {
            const status = document.getElementById('panel-profile-status');
            if (status) status.textContent = 'This panel has no document profile to overwrite.';
            return null;
        }
        if (typeof Generator !== 'undefined') Generator.capture();
        const page = typeof PageContext !== 'undefined' ? PageContext.currentPage : 1;
        const entry = Generator.state.pages[page];
        if (!entry || !Array.isArray(entry.zones)) return null;
        const saved = saveOverride(id, page, entry.zones);
        const status = document.getElementById('panel-profile-status');
        if (status) status.textContent = 'Saved adjustments for ' + id + ' page ' + page + '.';
        return saved;
    }

    return {
        SCHEMA, HANDLE_PX, canonical, alignMap, overlayBox, presentZone, install, reset,
        loadIndex, loadShards, shardFor, peek, hasId, lookup, lookupAsync, zonesFor, selectPage,
        firstContentPage, isMapped, hiddenWhenSubmittal, labelFor, fieldsFor, saveOverride, saveActivePage
    };
});
