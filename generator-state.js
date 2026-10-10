(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.GeneratorState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const SCHEMA = 'schematicai-generator-mapping/1';
    const COORDINATES = 'displayed-cropbox-normalized';
    const LIMITS = Object.freeze({ MAX_JSON_BYTES: 4 * 1024 * 1024, MAX_ZONES_PER_PAGE: 1000,
        MAX_MAPPING_PAGES: 10000, MAX_PROFILES: 1000, MAX_PROFILE_NAME_CHARS: 256, MAX_TEXT_CHARS: 10000 });
    const clone = value => JSON.parse(JSON.stringify(value));
    function freezeSemantic(value) {
        if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) return value;
        for (const nested of Object.values(value)) freezeSemantic(nested);
        return Object.freeze(value);
    }
    function check(condition, message) { if (!condition) throw new Error(message); }
    function boundedJson(value) {
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        check(typeof text === 'string' && text.length <= LIMITS.MAX_JSON_BYTES, 'JSON exceeds 4 MiB import/export limit');
        check(new TextEncoder().encode(text).length <= LIMITS.MAX_JSON_BYTES, 'JSON exceeds 4 MiB import/export limit');
        return text;
    }
    function parseJson(value) {
        boundedJson(value);
        if (typeof value !== 'string') return value;
        try { return JSON.parse(value); } catch (error) { throw new Error('Invalid JSON document'); }
    }
    // Synchronous content revision keeps profile save/import atomic in browsers.
    function sha256(text) {
        const bytes = new TextEncoder().encode(text), length = Math.ceil((bytes.length + 9) / 64) * 64;
        const padded = new Uint8Array(length); padded.set(bytes); padded[bytes.length] = 128;
        const view = new DataView(padded.buffer); view.setUint32(length - 8, Math.floor(bytes.length / 0x20000000)); view.setUint32(length - 4, bytes.length * 8);
        const primes = [], constants = [], initial = [];
        for (let n = 2; primes.length < 64; n++) {
            if (primes.some(p => p * p <= n && n % p === 0)) continue;
            primes.push(n); constants.push((Math.pow(n, 1 / 3) % 1 * 0x100000000) | 0);
            if (initial.length < 8) initial.push((Math.sqrt(n) % 1 * 0x100000000) | 0);
        }
        const rotate = (x, n) => (x >>> n) | (x << (32 - n)), words = new Int32Array(64), hash = initial.slice();
        for (let offset = 0; offset < length; offset += 64) {
            for (let i = 0; i < 16; i++) words[i] = view.getInt32(offset + i * 4);
            for (let i = 16; i < 64; i++) {
                const a = words[i - 15], b = words[i - 2];
                words[i] = (words[i - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) + words[i - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10))) | 0;
            }
            let [a, b, c, d, e, f, g, h] = hash;
            for (let i = 0; i < 64; i++) {
                const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + constants[i] + words[i]) | 0;
                const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            [a, b, c, d, e, f, g, h].forEach((v, i) => { hash[i] = (hash[i] + v) | 0; });
        }
        return hash.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
    }
    function profileRevision(profiles, assetRevision) {
        const normalized = Object.fromEntries(Object.keys(profiles).sort().map(key => [key, zones(profiles[key], key === 'BUILTIN:COVER_TEMPLATE' ? 1 : 0)]));
        return 'profiles-sha256:' + sha256(JSON.stringify({ assetRevision, profiles: normalized }));
    }
    function zones(input, page = 0) {
        check(Array.isArray(input), 'Zones must be an array');
        check(input.length <= LIMITS.MAX_ZONES_PER_PAGE, 'Zone count exceeds 1000 limit');
        return input.map(z => {
            check(z && typeof z === 'object', 'Invalid zone');
            for (const k of ['x', 'y', 'w', 'h']) check(typeof z[k] === 'number' && Number.isFinite(z[k]), 'Nonfinite zone geometry');
            check(z.x >= 0 && z.y >= 0 && z.w > 0 && z.h > 0 && z.x + z.w <= 1.000001 && z.y + z.h <= 1.000001, 'Zone outside displayed CropBox');
            const fontSize = z.fontSize === undefined ? 14 : z.fontSize;
            const rotation = z.rotation === undefined ? 0 : z.rotation;
            check(Number.isFinite(fontSize) && fontSize > 0 && fontSize <= 1000 && Number.isFinite(rotation), 'Invalid zone styling');
            check(z.transparent === undefined || typeof z.transparent === 'boolean', 'Invalid zone transparency');
            const map = z.map || 'custom';
            check(typeof map === 'string' && ['custom', 'cust', 'job', 'job_block', 'type', 'cpid', 'date', 'stage', 'po', 'serial', 'company', 'address', 'phone', 'fax', 'logo'].includes(map), 'Invalid zone field');
            const fontFamily = z.fontFamily || (page === 1 && map === 'cust' ? "'Times New Roman', serif" : "'Courier New', monospace");
            const textAlign = z.textAlign || 'center';
            check(['left', 'center', 'right'].includes(textAlign), 'Invalid alignment');
            check(typeof fontFamily === 'string' && (z.text == null || typeof z.text === 'string'), 'Invalid zone text/font');
            check(z.text == null || z.text.length <= LIMITS.MAX_TEXT_CHARS, 'Zone text exceeds 10000 character limit');
            check(fontFamily.length <= LIMITS.MAX_PROFILE_NAME_CHARS, 'Font name exceeds 256 character limit');
            check(z.type == null || typeof z.type === 'string', 'Invalid zone type');
            check(z.decoration == null || ['none', 'underline'].includes(z.decoration), 'Invalid zone decoration');
            check(z.fontWeight == null || typeof z.fontWeight === 'string', 'Invalid zone font weight');
            return { x: z.x, y: z.y, w: z.w, h: z.h, map, text: z.text == null ? null : z.text,
                fontSize, fontFamily, textAlign, rotation, transparent: z.transparent === true,
                type: z.type || null, decoration: z.decoration || null, fontWeight: z.fontWeight || 'bold' };
        });
    }
    function equalZones(a, b, page) { return JSON.stringify(zones(a, page)) === JSON.stringify(zones(b, page)); }
    function id(value) {
        check(typeof value === 'string' && value.length > 0, 'Missing profile ID');
        return /^(BUILTIN|CUSTOM|MEASURED):[\s\S]+$/.test(value) ? value : 'BUILTIN:' + value;
    }
    function migrateProfiles(input) {
        input = parseJson(input);
        check(input && typeof input === 'object' && !Array.isArray(input), 'Invalid profiles');
        const raw = input.schema === 'schematicai-profiles/1' ? input.profiles : input;
        check(raw && typeof raw === 'object' && !Array.isArray(raw), 'Invalid profile collection');
        check(Object.keys(raw).length <= LIMITS.MAX_PROFILES, 'Profile count exceeds 1000 limit');
        const result = Object.create(null);
        for (const [name, value] of Object.entries(raw)) {
            check(name.trim().length > 0 && name.length <= LIMITS.MAX_PROFILE_NAME_CHARS && !['__proto__', 'constructor', 'prototype'].includes(name), 'Invalid profile name');
            result[name] = zones(value);
        }
        boundedJson(result);
        return result;
    }
    function geometry(viewport, cropBox, rotation) {
        check(viewport && Number.isFinite(viewport.width) && viewport.width > 0 && Number.isFinite(viewport.height) && viewport.height > 0, 'Invalid viewport');
        check(Array.isArray(viewport.transform) && viewport.transform.length === 6 && viewport.transform.every(Number.isFinite), 'Invalid viewport transform');
        check(Array.isArray(cropBox) && cropBox.length === 4 && cropBox.every(Number.isFinite), 'Invalid CropBox');
        check(cropBox[0] < cropBox[2] && cropBox[1] < cropBox[3], 'Invalid CropBox ordering');
        check(Number.isFinite(rotation) && rotation % 90 === 0, 'Invalid nonquadrant rotation');
        const [a, b, c, d] = viewport.transform;
        const determinant = a * d - b * c;
        check(Number.isFinite(determinant) && determinant !== 0, 'Singular viewport');
        return { width: viewport.width, height: viewport.height, transform: viewport.transform.slice(), cropBox: cropBox.slice(), rotation: ((rotation % 360) + 360) % 360 };
    }
    function toPdfPoint(g, x, y) {
        const [a, b, c, d, e, f] = g.transform;
        const det = a * d - b * c;
        check(Number.isFinite(det) && det !== 0, 'Singular viewport');
        const px = x * g.width - e, py = y * g.height - f;
        return { x: (d * px - c * py) / det, y: (-b * px + a * py) / det };
    }
    function toPdfRect(g, z) {
        const points = [[z.x, z.y], [z.x + z.w, z.y], [z.x, z.y + z.h], [z.x + z.w, z.y + z.h]].map(p => toPdfPoint(g, ...p));
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }
    function lineMatches(a, b, position, endpoints) {
        const available = b.slice();
        let count = 0;
        for (const line of a) {
            const i = available.findIndex(other => Math.abs(line[0] - other[0]) <= position && Math.abs(line[1] - other[1]) <= endpoints && Math.abs(line[2] - other[2]) <= endpoints);
            if (i >= 0) { count++; available.splice(i, 1); }
        }
        return count;
    }
    function rscore(a, b) {
        const n = a.H.length + a.V.length + b.H.length + b.V.length;
        return n ? 2 * (lineMatches(a.H, b.H, .03, .03) + lineMatches(a.V, b.V, .006, .08)) / n : 0;
    }
    function relLines(H, V, bbox) {
        const [x0, y0, x1, y1] = bbox, bw = x1 - x0, bh = y1 - y0;
        if (!(bw > 0) || !(bh > 0)) return null;
        return {
            H: H.map(l => [(l[0] - y0) / bh, (l[1] - x0) / bw, (l[2] - x0) / bw]),
            V: V.map(l => [(l[0] - x0) / bw, (l[1] - y0) / bh, (l[2] - y0) / bh])
        };
    }
    // Title-block band from the page's own lines, not from a catalog bbox.
    // Full-page borders are excluded so a shifted block can still be scored.
    function titleBand(H, V) {
        // Include rules that sit just past the page edge so a small downward print shift
        // still reconstructs the same grid instead of losing the bottom border.
        const wide = H.filter(l => l[2] - l[1] >= 0.35 && l[0] >= 0.62 && l[0] <= 1.02);
        const pool = wide.length >= 2 ? wide : H.filter(l => l[0] >= 0.62 && l[0] <= 1.02);
        if (pool.length < 2) return null;
        const top = Math.min(...pool.map(l => l[0])), bottom = Math.max(...pool.map(l => l[0]));
        const Hs = H.filter(l => l[0] >= top - 0.02 && l[0] <= bottom + 0.02 && l[2] - l[1] >= 0.004);
        const Vs = V.filter(l => l[1] >= top - 0.03 && l[2] <= bottom + 0.03 && l[2] - l[1] >= 0.004);
        if (Hs.length < 2 || !Vs.length) return null;
        const bbox = [
            Math.min(...Hs.map(l => l[1]), ...Vs.map(l => l[0])),
            Math.min(...Hs.map(l => l[0]), ...Vs.map(l => l[1])),
            Math.max(...Hs.map(l => l[2]), ...Vs.map(l => l[0])),
            Math.max(...Hs.map(l => l[0]), ...Vs.map(l => l[2]))
        ];
        if (!(bbox[2] > bbox[0]) || !(bbox[3] > bbox[1])) return null;
        return { bbox, H: Hs, V: Vs };
    }
    function bboxDistance(a, b) { return Math.max(...a.map((v, i) => Math.abs(v - b[i]))); }
    function placeZones(zones, profileBBox, observedBBox) {
        const [px0, py0, px1, py1] = profileBBox, pw = px1 - px0, ph = py1 - py0;
        const [ox0, oy0, ox1, oy1] = observedBBox, ow = ox1 - ox0, oh = oy1 - oy0;
        if (!(pw > 0) || !(ph > 0) || !(ow > 0) || !(oh > 0)) return null;
        return zones.map(z => {
            let x = ox0 + (z.x - px0) / pw * ow, y = oy0 + (z.y - py0) / ph * oh, w = z.w / pw * ow, h = z.h / ph * oh;
            x = Math.min(Math.max(0, x), 0.99); y = Math.min(Math.max(0, y), 0.99);
            w = Math.min(Math.max(0.004, w), 1 - x); h = Math.min(Math.max(0.004, h), 1 - y);
            return { ...z, x, y, w, h };
        });
    }
    function matchCover(evidence, profiles, fingerprints, metadata) {
        const items = (evidence.textItems || []).filter(i => i && typeof i.text === 'string');
        const cps = items.filter(i => /^CP\s*-?\s*\d+/i.test(i.text));
        if (!cps.length) return null;
        const cpid = cps.slice().sort((a, b) => b.y - a.y || b.x - a.x)[0];
        const hits = [];
        for (const [key, entry] of Object.entries(fingerprints)) {
            if (entry.class !== 'COVER' || entry.low_confidence) continue;
            const meta = metadata[key], zones = profiles[key];
            if (!meta || meta.low_confidence || !Array.isArray(zones)) continue;
            const zone = zones.find(z => z.map === 'cpid');
            if (!zone) continue;
            const dy = Math.abs(zone.y - cpid.y);
            const dx = Math.abs((zone.x + zone.w / 2) - (cpid.x + (cpid.w || 0) / 2));
            if (dy <= 0.03 && dx <= 0.08) hits.push({ key, score: 1 - dy / 0.03 - dx / 0.2 });
        }
        hits.sort((a, b) => b.score - a.score);
        if (!hits.length) return null;
        if (hits.length > 1 && hits[0].score - hits[1].score < 0.08) return { status: 'unresolved', reason: 'Ambiguous measured layouts', candidates: hits };
        return { status: 'resolved', profileId: 'MEASURED:' + hits[0].key, confidence: Math.max(0, hits[0].score), placement: 'exact' };
    }
    // Group identical templates, accept the closest placement, and slide zones when the
    // same grid is printed a little high/low or left/right. Identical competing templates stay unresolved.
    function matchMeasured(evidence, profiles, fingerprints, metadata) {
        if (!evidence || !evidence.H || !evidence.V) return { status: 'unresolved', reason: 'No geometric evidence' };
        if (evidence.preferCover) {
            const cover = matchCover(evidence, profiles, fingerprints, metadata);
            return cover || { status: 'unresolved', reason: 'Unknown title-block geometry' };
        }
        const band = evidence.H.length && evidence.V.length ? titleBand(evidence.H, evidence.V) : null;
        if (!band) {
            if (evidence.class === 'COVER' || evidence.page === 1) {
                const cover = matchCover(evidence, profiles, fingerprints, metadata);
                if (cover) return cover;
            }
            return { status: 'unresolved', reason: 'Unknown title-block geometry' };
        }
        const observedRel = relLines(band.H, band.V, band.bbox);
        const groups = new Map();
        for (const [key, entry] of Object.entries(fingerprints)) {
            const meta = metadata[key], fp = entry.fingerprint, bbox = fp?.title_block_bbox;
            if (!profiles[key] || !meta || meta.low_confidence || entry.low_confidence || !bbox || !fp.template_lines_rel) continue;
            if (meta.title_block_edge && evidence.edge && meta.title_block_edge !== evidence.edge) continue;
            if (entry.class && evidence.class && entry.class !== evidence.class) continue;
            const hash = (entry.class || '') + '|' + (meta.title_block_edge || '') + '|' + (entry.template_hash || fp.template_hash || key);
            let group = groups.get(hash);
            if (!group) {
                group = { score: rscore(observedRel, fp.template_lines_rel), keys: [] };
                groups.set(hash, group);
            }
            group.keys.push({ key, bbox, dist: bboxDistance(band.bbox, bbox) });
        }
        const ranked = [...groups.values()].filter(g => g.score >= 0.70).sort((a, b) => b.score - a.score);
        if (!ranked.length) {
            if (evidence.class === 'COVER' || evidence.page === 1) {
                const cover = matchCover(evidence, profiles, fingerprints, metadata);
                if (cover) return cover;
            }
            return { status: 'unresolved', reason: 'Unknown title-block geometry' };
        }
        const leader = ranked[0];
        leader.keys.sort((a, b) => a.dist - b.dist || ((metadata[b.key]?.n_pages || 0) - (metadata[a.key]?.n_pages || 0)));
        const best = leader.keys[0], second = leader.keys[1];
        const runner = ranked[1];
        if (runner && leader.score - runner.score < 0.02) {
            return { status: 'unresolved', reason: 'Ambiguous measured layouts', candidates: leader.keys.concat(runner.keys).map(k => ({ key: k.key, score: leader.score })) };
        }
        if (second && Math.abs(second.dist - best.dist) <= 0.004 && best.dist <= 0.012) {
            return { status: 'unresolved', reason: 'Ambiguous measured layouts', candidates: [best, second] };
        }
        if (best.dist <= 0.012) return { status: 'resolved', profileId: 'MEASURED:' + best.key, confidence: leader.score, placement: 'exact' };
        if (best.dist <= 0.05) {
            const zones = placeZones(profiles[best.key], best.bbox, band.bbox);
            if (!zones) return { status: 'unresolved', reason: 'Unknown title-block geometry' };
            return { status: 'resolved', profileId: 'MEASURED:' + best.key, confidence: leader.score, placement: 'affine', zones };
        }
        return { status: 'unresolved', reason: 'Unknown title-block geometry' };
    }
    // Page 1 keeps the cover-template fallback for legacy builtins, and accepts a measured or named cover.
    function pageOneProfile(profileId) {
        const stable = id(profileId);
        if (/^(MEASURED|CUSTOM):/.test(stable)) return stable;
        if (/^BUILTIN:(COVER_TEMPLATE|COX_COVER|DELTA_COVER|THIRD_PARTY_COVER)$/.test(stable)) return stable;
        return 'BUILTIN:COVER_TEMPLATE';
    }
    class State {
        constructor(onChange = () => {}) {
            this.onChange = onChange; this.generation = 0; this.revision = 0; this.profiles = Object.create(null);
            this.profileRevision = 'unloaded'; this.pages = Object.create(null); this.sourcePageCount = 0; this.digest = null; this.error = null; this.renderCommitted = false;
        }
        touch() { this.revision++; this.onChange(); }
        register(profiles, revision) {
            const next = Object.create(null);
            for (const [key, value] of Object.entries(profiles)) next[id(key)] = zones(value, key === 'BUILTIN:COVER_TEMPLATE' ? 1 : 0);
            for (const page of Object.values(this.pages)) {
                if (page.status !== 'resolved') continue;
                if (!next[page.profileId] || (page.provenance !== 'manual' && !equalZones(this.profiles[page.profileId] || [], next[page.profileId], page.page))) {
                    page.status = 'unresolved'; page.reason = 'Profile changed; review or resolve this page';
                } else page.profileRevision = String(revision);
            }
            this.profiles = next; this.profileRevision = String(revision); this.touch();
        }
        async load(bytes, count, subtle) {
            const generation = ++this.generation;
            this.sourceBytes = new Uint8Array(bytes).slice(); this.sourcePageCount = count; this.pages = Object.create(null); this.digest = null; this.error = null; this.renderCommitted = false; this.touch();
            const owned = this.sourceBytes.slice();
            try {
                check(Number.isInteger(count) && count > 0, 'Invalid source page count');
                check(subtle && typeof subtle.digest === 'function', 'SHA-256 unavailable; generator disabled');
                const digest = await subtle.digest('SHA-256', owned);
                if (generation !== this.generation) return false;
                this.digest = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
                this.touch(); return true;
            } catch (e) {
                if (generation === this.generation) { this.error = e.message; this.touch(); }
                return false;
            }
        }
        token() { return { generation: this.generation, revision: this.revision }; }
        current(token) { return token.generation === this.generation && token.revision === this.revision; }
        setPage(page, profileId, provenance = 'manual', input, g, contentSource) {
            check(Number.isInteger(page) && page > 0 && page <= this.sourcePageCount, 'Invalid page');
            const stable = page === 1 ? pageOneProfile(profileId) : id(profileId);
            check(this.profiles[stable], 'Missing profile: ' + stable);
            check(['manual', 'exact', 'auto'].includes(provenance), 'Invalid provenance');
            const existing = this.pages[page];
            if (existing?.provenance === 'manual' && provenance !== 'manual') return false;
            if (existing?.provenance === 'exact' && provenance === 'auto') return false;
            const source = contentSource || existing?.contentSource || 'source';
            check(['source', 'replacement'].includes(source) && (page === 1 || source === 'source'), 'Invalid page content source');
            this.pages[page] = { page, profileId: stable, profileRevision: this.profileRevision, provenance, coordinateSpace: COORDINATES,
                status: 'resolved', contentSource: source,
                geometry: g || existing?.geometry || null, zones: zones(input === undefined ? this.profiles[stable] : input, page) };
            this.touch(); return true;
        }
        unresolved(page, reason, g) {
            if (this.pages[page]?.status === 'resolved') return;
            this.pages[page] = { page, status: 'unresolved', reason, geometry: g, zones: [], contentSource: 'source' }; this.touch();
        }
        importMapping(input) {
            const data = parseJson(input);
            check(this.digest && !this.error, 'Generator source digest unavailable');
            check(data?.schema === SCHEMA && data.coordinateSpace === COORDINATES, 'Invalid mapping schema/coordinate space');
            check(data.sourceDigest === this.digest && data.sourcePageCount === this.sourcePageCount, 'Mapping source digest/page count mismatch');
            check(data.profileRevision === this.profileRevision, 'Stale mapping profile revision');
            check(Array.isArray(data.pages) && data.pages.length <= LIMITS.MAX_MAPPING_PAGES, 'Mapping page count exceeds 10000 limit');
            check(data.pages.length === this.sourcePageCount, 'Mapping must include every source page');
            const pending = [];
            const seen = new Set();
            for (const p of data.pages) {
                check(Number.isInteger(p.page) && p.page > 0 && p.page <= this.sourcePageCount && !seen.has(p.page), 'Missing/conflicting mapping page');
                seen.add(p.page);
                check(p.coordinateSpace === COORDINATES && p.profileRevision === this.profileRevision, 'Invalid page coordinate space/revision');
                check(['manual', 'exact', 'auto'].includes(p.provenance), 'Missing mapping provenance');
                check(typeof p.profileId === 'string' && /^(BUILTIN|CUSTOM|MEASURED):[\s\S]+$/.test(p.profileId) && this.profiles[p.profileId], 'Missing mapping profile');
                check(p.page !== 1 || pageOneProfile(p.profileId) === p.profileId, 'Page 1 must use COVER_TEMPLATE');
                check(p.contentSource === (this.pages[p.page]?.contentSource || 'source'), 'Mapping content source mismatch');
                pending.push({ ...p, zones: zones(p.zones, p.page) });
            }
            for (const p of pending) this.setPage(p.page, p.profileId, 'exact', p.zones);
            return true;
        }
        exportMapping() {
            check(this.digest && !this.error, 'Generator source digest unavailable');
            const pages = Array.from({ length: this.sourcePageCount }, (_, i) => this.pages[i + 1]);
            check(pages.every(p => p?.status === 'resolved' && p.profileRevision === this.profileRevision && this.profiles[p.profileId]), 'Resolve every page before mapping export');
            check(pages.length <= LIMITS.MAX_MAPPING_PAGES, 'Mapping page count exceeds 10000 limit');
            const result = { schema: SCHEMA, coordinateSpace: COORDINATES, sourceDigest: this.digest, sourcePageCount: this.sourcePageCount,
                profileRevision: this.profileRevision, pages: pages.map(p => ({
                    page: p.page, profileId: p.profileId, profileRevision: this.profileRevision, coordinateSpace: COORDINATES,
                    provenance: p.provenance, contentSource: p.contentSource, zones: clone(p.zones)
                })) };
            boundedJson(result); return result;
        }
        snapshot(context, replacementBytes) {
            check(this.digest && !this.error, this.error || 'Generator source digest unavailable');
            check(this.renderCommitted, 'Wait for committed generator render');
            const pages = Array.from({ length: this.sourcePageCount }, (_, i) => this.pages[i + 1]);
            check(pages.every(p => p?.status === 'resolved' && p.geometry && p.profileRevision === this.profileRevision && this.profiles[p.profileId]), 'Resolve every page before generation');
            for (const page of pages) geometry(page.geometry, page.geometry.cropBox, page.geometry.rotation);
            return freezeSemantic({ ...this.token(), sourceDigest: this.digest, sourcePageCount: this.sourcePageCount, profileRevision: this.profileRevision,
                sourceBytes: this.sourceBytes.slice(), replacementBytes: replacementBytes ? new Uint8Array(replacementBytes).slice() : null,
                pages: clone(pages), context: clone(context) });
        }
    }
    return { State, SCHEMA, COORDINATES, LIMITS, boundedJson, parseJson, profileRevision, sha256, freezeSemantic, zones, equalZones, id, migrateProfiles, geometry, toPdfPoint, toPdfRect, rscore, matchMeasured };
});
