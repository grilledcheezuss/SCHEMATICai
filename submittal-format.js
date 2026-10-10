// Submittal cover defaults, blank-PDF paths, and which zones stay baked.
// Blank sheets already contain the Cox logo, Cox address, PROJECT SUBMITTAL,
// and the review disclaimer. Live overlays are job, system type, and date.
// Serial is a whiteout with no replacement text.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof root !== 'undefined') root.SubmittalFormat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const STAGE_DEFAULT = 'SUBMITTAL';
    const COVER_COMPANY = 'Cox Research and Technology, Inc.';
    const COVER_LINES = [
        COVER_COMPANY,
        '14697 S. Harrells Ferry Road',
        'Baton Rouge, LA. 70816',
        '(225) 756-3271  Fax (225) 755-1030'
    ];
    const INFO_LINES = [
        'P.O. Box 77808',
        'Baton Rouge, LA',
        '70879',
        'Ph. (225) 756-3271',
        'Fax (225) 755-1030'
    ];
    const PLACEHOLDERS = {
        company: ['YOUR COMPANY', 'COMPANY NAME'],
        address: ['123 MAIN STREET'],
        phone: ['(555) 123-4567'],
        fax: ['(555) 123-4568'],
        stage: ['STAGE', '']
    };
    const LABELS = {
        cust: 'Job', job: 'Job', job_block: 'Job', type: 'System', cpid: 'Panel',
        date: 'Date', stage: 'Stage', po: 'PO', serial: 'Serial', company: 'Company',
        address: 'Address', phone: 'Phone', fax: 'Fax', logo: 'Logo', custom: 'Text'
    };
    const FIELD_LABELS = {
        project_info: 'Job', project_title: 'System', customer_job: 'Job',
        contact_block: 'Address', serial: 'Serial', stage: 'Stage', logo: 'Logo',
        address: 'Address', phone: 'Phone', fax: 'Fax', company: 'Company', date: 'Date'
    };
    // Drawn on a blank: job name, system type, date, and a serial whiteout.
    const LIVE_MAPS = new Set(['job', 'job_block', 'type', 'date', 'cust', 'serial']);
    const LIVE_FIELDS = new Set(['project_info', 'project_title', 'customer_job', 'date', 'serial']);
    const misses = new Set();
    const hits = new Map();
    let workerBlank = 'unknown';

    function canonical(value) {
        let text = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
        text = text.replace(/\.(PDF|DWG)$/i, '');
        if (/^CP\d/.test(text)) text = 'CP-' + text.slice(2);
        else if (/^\d/.test(text)) text = 'CP-' + text;
        return text;
    }

    // /CP DOCS/CP-SUBMITTAL-BLANK/<CPx000-x999>/<CPxx00-xx99>/CP-####.pdf
    function relativePath(id) {
        const key = canonical(id);
        const match = /^CP-(\d+)/.exec(key);
        if (!match) return null;
        const n = Number(match[1]);
        const thou = Math.floor(n / 1000) * 1000;
        const hun = Math.floor(n / 100) * 100;
        return 'CP' + thou + '-' + (thou + 999) + '/CP' + hun + '-' + (hun + 99) + '/' + key + '.pdf';
    }

    function configuredBase() {
        const fromWindow = typeof root !== 'undefined' && root.SUBMITTAL_BLANK_BASE;
        if (typeof fromWindow === 'string' && fromWindow.trim()) return fromWindow.trim();
        if (typeof document !== 'undefined') {
            const meta = document.querySelector('meta[name="submittal-blank-base"]');
            if (meta && meta.content && meta.content.trim()) return meta.content.trim();
        }
        return '';
    }

    function directUrl(id) {
        const base = configuredBase().replace(/\/$/, '');
        const rel = relativePath(id);
        if (!base || !rel) return '';
        return base + '/' + rel;
    }

    function isPdfBytes(buffer) {
        if (!buffer || buffer.byteLength < 5) return false;
        const header = new Uint8Array(buffer.slice(0, 5));
        return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46 && header[4] === 0x2D;
    }

    async function fetchPdf(id, options) {
        const key = canonical(id);
        if (!key) return null;
        if (hits.has(key)) return hits.get(key);
        if (misses.has(key)) return null;
        const opts = options || {};
        const headers = opts.headers || {};
        const direct = directUrl(key);
        const workerUrl = !direct && workerBlank !== 'off' && typeof opts.workerUrl === 'string' ? opts.workerUrl : '';
        const url = direct || workerUrl;
        if (!url || typeof fetch !== 'function') return null;
        try {
            const response = await fetch(url, { headers, credentials: 'same-origin' });
            if (!response.ok) {
                if (!direct && response.status === 404) {
                    const note = await response.clone().text().catch(() => '');
                    if (/not configured/i.test(note)) workerBlank = 'off';
                }
                misses.add(key);
                return null;
            }
            const bytes = await response.arrayBuffer();
            if (!isPdfBytes(bytes)) {
                misses.add(key);
                return null;
            }
            if (!direct) workerBlank = 'on';
            hits.set(key, bytes);
            return bytes;
        } catch (error) {
            misses.add(key);
            return null;
        }
    }

    function labelFor(map, field) {
        if (field && FIELD_LABELS[field]) return FIELD_LABELS[field];
        return LABELS[map] || 'Zone';
    }

    function isLive(zone) {
        if (!zone) return false;
        if (LIVE_MAPS.has(zone.map)) return true;
        if (zone.field && LIVE_FIELDS.has(zone.field)) return true;
        return false;
    }

    // Non-live zones are already printed on the blank (logo, address, stage, disclaimer).
    function skipWhenBlank(zone) {
        return !isLive(zone);
    }

    function userText(value, placeholders) {
        const text = String(value || '').trim();
        if (!text) return '';
        if ((placeholders || []).indexOf(text) !== -1) return '';
        return text;
    }

    function pageKind(pageClass) {
        return String(pageClass || '').toUpperCase() === 'COVER' ? 'COVER' : 'INFO';
    }

    function overlayText(zone, context, pageClass) {
        const map = zone && zone.map;
        const field = zone && zone.field;
        const ctx = context || {};
        const kind = pageKind(pageClass);
        if (map === 'serial' || map === 'logo') return '';
        if (map === 'stage' || field === 'stage') {
            return userText(ctx.stage, PLACEHOLDERS.stage) || STAGE_DEFAULT;
        }
        if (map === 'company' || field === 'company') {
            return userText(ctx.company, PLACEHOLDERS.company) || COVER_COMPANY;
        }
        if (field === 'contact_block') {
            const customAddress = userText(ctx.address, PLACEHOLDERS.address);
            if (customAddress) return [userText(ctx.company, PLACEHOLDERS.company) || COVER_COMPANY, customAddress].join('\n');
            return (kind === 'COVER' ? COVER_LINES : INFO_LINES).join('\n');
        }
        if (map === 'address' || field === 'address') {
            const customAddress = userText(ctx.address, PLACEHOLDERS.address);
            if (customAddress) return customAddress;
            return kind === 'COVER' ? COVER_LINES.slice(1).join('\n') : INFO_LINES.slice(0, 3).join('\n');
        }
        if (map === 'phone' || field === 'phone') {
            return userText(ctx.phone, PLACEHOLDERS.phone) || (kind === 'COVER' ? '(225) 756-3271' : INFO_LINES[3]);
        }
        if (map === 'fax' || field === 'fax') {
            return userText(ctx.fax, PLACEHOLDERS.fax) || (kind === 'COVER' ? 'Fax (225) 755-1030' : INFO_LINES[4]);
        }
        // Info-page job name is stored as customer_job on a cust-shaped zone.
        if (field === 'customer_job') return String(ctx.job || '');
        return null;
    }

    function coverStyle(zone, pageClass) {
        if (pageKind(pageClass) !== 'COVER' || !zone) return zone;
        if (!['job', 'job_block', 'type', 'stage', 'date', 'address', 'company'].includes(zone.map) && zone.field !== 'project_info' && zone.field !== 'contact_block') {
            return zone;
        }
        const next = Object.assign({}, zone);
        next.textAlign = 'center';
        if (!/times|serif/i.test(String(next.fontFamily || ''))) next.fontFamily = "'Times New Roman', Times, serif";
        if (zone.map === 'job' || zone.map === 'job_block' || zone.map === 'type' || zone.field === 'project_info') {
            next.decoration = next.decoration || 'underline';
        }
        return next;
    }

    function resetCache() {
        misses.clear();
        hits.clear();
        workerBlank = 'unknown';
    }

    return {
        STAGE_DEFAULT, COVER_COMPANY, COVER_LINES, INFO_LINES,
        canonical, relativePath, configuredBase, directUrl, isPdfBytes, fetchPdf,
        labelFor, isLive, skipWhenBlank, overlayText, coverStyle, resetCache
    };
});
