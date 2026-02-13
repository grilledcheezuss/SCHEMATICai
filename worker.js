// ==========================================
// 🧠 SCHEMATICai WORKER v2.6.0 (Golden Database Architecture)
// ==========================================

const KEY_READ_WRITE = "patVooLrBRWad4TAs.90ec7ef74526de7d40d9718240e4c98bfd8fcc786ada7ac6cfbb632796e8d24e"; 
const KEY_READ_ONLY = "patNuv7rNHCIHeq5t.157bc0a55e1463fa54dbe4f8538ffd944fd8e11a333cd1cafccc788e094c0bfb"; 

const BASE_MAIN_ID = 'appgc1pbuOgmODRpj'; 
const TABLE_MAIN = 'Control%20Panel%20Items'; 

const BASE_USERS_ID = 'app88zF2k4FgjU8hK'; 
const TABLE_LEGACY = 'Legacy%20Panels';
const TABLE_FEEDBACK = 'Feedback';
const TABLE_USERS = 'Users';

// --- IN-MEMORY EDGE CACHE ---
let CACHE_USERS = null;
let CACHE_HEALED = {};
let CACHE_NB_MODEL = null;
let CACHE_TIME = 0;
let CACHE_AUTH_PROMISE = null;
let IS_BUILDING_ML = false;
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour

const VOTE_THRESHOLD = 3;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

// --- EXACT DICTIONARIES ---
const EXACT_MFGS = {
    'GORMAN RUPP': ['GORMAN', 'GR', 'GRSP'],
    'BARNES': ['BARNES', 'SITHE', 'CRANE'],
    'HYDROMATIC': ['HYDROMATIC'],
    'FLYGT': ['FLYGT'],
    'MYERS': ['MYERS'],
    'GOULDS': ['GOULDS'],
    'ZOELLER': ['ZOELLER'],
    'LIBERTY': ['LIBERTY'],
    'WILO': ['WILO'],
    'PENTAIR': ['PENTAIR'],
    'ABS': ['ABS'],
    'GODWIN': ['GODWIN', 'GODWIN SP'],
    'FRANKLIN': ['FRANKLIN'],
    'EBARA': ['EBARA'],
    'HIDROSTAL': ['HIDROSTAL']
};

const VOLT_PRIORITY = [
    { id: '575', match: /\b(?:575|600)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:575|600)\b/i },
    { id: '480', match: /\b(?:480|460|440)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:480|460|440)\b/i },
    { id: '415', match: /\b(?:415|380)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:415|380)\b/i },
    { id: '277', match: /\b(?:277)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:277)\b/i },
    { id: '240', match: /\b(?:240|230|220)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:240|230|220)\b/i },
    { id: '208', match: /\b(?:208)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:208)\b/i },
    { id: '120', match: /\b(?:120|115|110)\s*(?:V\b|VAC|VOLT|PH)|(?:VOLTAGE|VOLTS|VOLT)\s*[:\-]?\s*[\d\.\/]*\b(?:120|115|110)\b/i }
];

const STOP_WORDS = new Set(['PANEL','CONTROL','PUMP','MOTOR','VOLT','VAC','PHASE','HP','ALARM','RELAY','SWITCH','FLOAT','NEMA','ENCLOSURE']);

// Validation functions for data quality
function isValidHP(hp) {
    const val = parseFloat(hp);
    return !isNaN(val) && val >= 0.1 && val <= 500;
}

function isValidVoltage(volt) {
    const validVoltages = ['120', '208', '240', '277', '415', '480', '575'];
    return validVoltages.includes(String(volt));
}

function isValidPhase(phase) {
    return ['1', '3'].includes(String(phase));
}

class NaiveBayes {
    constructor() {
        this.vocab = new Set();
        this.classCounts = { mfg: {}, enc: {} };
        this.wordCounts = { mfg: {}, enc: {} };
        this.classWordTotals = { mfg: {}, enc: {} };
        this.totalDocs = { mfg: 0, enc: 0 };
        this.priorLog = { mfg: {}, enc: {} };
        this.fallbackLog = { mfg: {}, enc: {} };
        this.wordLog = { mfg: {}, enc: {} };
    }
    tokenize(text) { 
        return (String(text||'').toUpperCase().match(/[A-Z0-9\-]+/g) || [])
            .filter(w => w.length > 2 && !STOP_WORDS.has(w)); 
    }
    train(text, labels) {
        const tokens = Array.from(new Set(this.tokenize(text))); 
        if (!tokens.length) return;
        tokens.forEach(t => this.vocab.add(t));
        
        for (const [category, rawLabel] of Object.entries(labels)) {
            if (!rawLabel || rawLabel === '-' || rawLabel === 'null') continue;
            const label = String(rawLabel).trim();
            if (!label) continue;
            
            this.totalDocs[category]++;
            this.classCounts[category][label] = (this.classCounts[category][label] || 0) + 1;
            if (!this.wordCounts[category][label]) this.wordCounts[category][label] = {};
            if (!this.classWordTotals[category][label]) this.classWordTotals[category][label] = 0;
            
            tokens.forEach(t => {
                this.wordCounts[category][label][t] = (this.wordCounts[category][label][t] || 0) + 1;
                this.classWordTotals[category][label]++;
            });
        }
    }
    finalize() {
        const V = this.vocab.size;
        for (const cat of ['mfg', 'enc']) {
            for (const label in this.classCounts[cat]) {
                this.priorLog[cat][label] = Math.log(this.classCounts[cat][label] / this.totalDocs[cat]);
                const denom = (this.classWordTotals[cat][label] || 0) + V;
                this.fallbackLog[cat][label] = Math.log(1 / denom);
                this.wordLog[cat][label] = {};
                for (const word in this.wordCounts[cat][label]) {
                    this.wordLog[cat][label][word] = Math.log((this.wordCounts[cat][label][word] + 1) / denom);
                }
            }
        }
    }
    predict(text, category) {
        if (!this.totalDocs[category]) return null;
        const tokens = Array.from(new Set(this.tokenize(text)));
        const knownTokens = tokens.filter(t => this.vocab.has(t));
        
        if (knownTokens.length < 2) return null; 

        let scores = [];
        for (const label in this.classCounts[category]) {
            let score = this.priorLog[category][label];
            const fallback = this.fallbackLog[category][label];
            const wLogs = this.wordLog[category][label];
            for (let i = 0; i < knownTokens.length; i++) {
                const wLog = wLogs[knownTokens[i]];
                score += (wLog !== undefined) ? wLog : fallback;
            }
            scores.push({ label, score });
        }
        
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 1) {
            const margin = scores[0].score - scores[1].score;
            if (margin < 2.0) return null; 
        }
        return scores.length ? scores[0].label : null;
    }
}

function normalizeLegacyMfg(raw) {
    if (!raw) return null;
    let u = String(raw).toUpperCase();
    if (u.includes('VFD') || u.includes('AERATOR') || u.includes('BLOWER') || u.includes('TESTSITE') || u.includes('VALVE') || u.includes('DRIP') || u === 'SP') return null;

    for (const [canon, aliases] of Object.entries(EXACT_MFGS)) {
        if (u.includes(canon)) return canon;
        for (const alias of aliases) {
            if (new RegExp(`\\b${alias}\\b`).test(u)) return canon;
        }
    }
    return null; 
}

async function fetchAirtablePages(table, maxPages, fields = []) {
    let records = []; let offset = null; let pages = 0;
    let fieldQuery = fields.length > 0 ? '&' + fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&') : '';
    do {
        let url = `https://api.airtable.com/v0/${BASE_USERS_ID}/${table}?pageSize=100${fieldQuery}`;
        if (offset) url += `&offset=${encodeURIComponent(offset)}`;
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${KEY_READ_WRITE}` } });
        if (!resp.ok) { if (resp.status === 429) { await new Promise(r => setTimeout(r, 500)); continue; } break; }
        const data = await resp.json();
        if (data.records) records.push(...data.records);
        offset = data.offset; pages++;
    } while (offset && pages < maxPages);
    return records;
}

// 1. FAST CORE CACHE: Only fetches Auth and Feedback (Takes < 0.5s)
async function ensureAuthAndFeedback() {
    if (CACHE_USERS && (Date.now() - CACHE_TIME < CACHE_DURATION)) return;
    if (CACHE_AUTH_PROMISE) return CACHE_AUTH_PROMISE;
    
    CACHE_AUTH_PROMISE = (async () => {
        console.log("Fetching Auth & Feedback...");
        const [usersData, fbData] = await Promise.all([
            fetch(`https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_USERS}`, { headers: { 'Authorization': `Bearer ${KEY_READ_WRITE}` } }).then(r=>r.json()),
            fetchAirtablePages(TABLE_FEEDBACK, 5, ['Panel ID', 'Corrections']) // Cap at 500 to keep it fast
        ]);

        CACHE_USERS = usersData.records || [];
        
        CACHE_HEALED = {};
        const tallies = {};
        fbData.forEach(r => {
            const rawJson = r.fields['Corrections'];
            const id = r.fields['Panel ID'];
            if (rawJson && id) {
                try {
                    const c = JSON.parse(rawJson);
                    if (c && typeof c === 'object') {
                        Object.entries(c).forEach(([param, value]) => {
                            if (param === 'reject_keywords' && Array.isArray(value)) {
                                value.forEach(kw => { tallies[`${id}|reject_keyword|${kw}`] = (tallies[`${id}|reject_keyword|${kw}`] || 0) + 1; });
                            } else {
                                tallies[`${id}|${param}|${value}`] = (tallies[`${id}|${param}|${value}`] || 0) + 1;
                            }
                        });
                    }
                } catch(e) {}
            }
        });

        for (const [key, count] of Object.entries(tallies)) {
            if (count >= VOTE_THRESHOLD) {
                const parts = key.split('|');
                const id = parts[0]; const param = parts[1]; const value = parts.slice(2).join('|');
                if (!CACHE_HEALED[id]) CACHE_HEALED[id] = {};
                if (param === 'reject_keyword') {
                    if (!CACHE_HEALED[id].reject_keywords) CACHE_HEALED[id].reject_keywords = [];
                    CACHE_HEALED[id].reject_keywords.push(value);
                } else {
                    CACHE_HEALED[id][param] = value;
                }
            }
        }
        CACHE_TIME = Date.now();
    })();
    await CACHE_AUTH_PROMISE;
    CACHE_AUTH_PROMISE = null;
}

// 2. BACKGROUND ML CACHE: Runs completely decoupled from User Requests
async function buildMLBackground() {
    if (CACHE_NB_MODEL || IS_BUILDING_ML) return;
    IS_BUILDING_ML = true;
    try {
        console.log("Building ML in background...");
        const legacyData = await fetchAirtablePages(TABLE_LEGACY, 15, ['Manufacturer', 'Description']);
        const nb = new NaiveBayes();
        legacyData.forEach(r => {
            let mfgRaw = r.fields['Manufacturer'];
            let enc = null;
            let mfg = Array.isArray(mfgRaw) ? mfgRaw[0] : mfgRaw;

            if (typeof mfg === 'string') {
                const mfgUpper = mfg.toUpperCase();
                if (mfgUpper.includes('4X') || mfgUpper.includes('NEMA') || mfgUpper.includes('ENCLOSURE') || mfgUpper.includes('POLY')) {
                    enc = mfgUpper.replace('ENCLOSURE', '').trim();
                    mfg = null; 
                }
            }
            mfg = normalizeLegacyMfg(mfg);
            let rawDesc = r.fields['Description'];
            let desc = typeof rawDesc === 'string' ? rawDesc : Array.isArray(rawDesc) ? rawDesc.join(' ') : "";
            nb.train(desc, { mfg: mfg, enc: enc });
        });
        nb.finalize();
        CACHE_NB_MODEL = nb;
        console.log("ML Build Complete!");
    } catch(e) { console.error("ML Build Error:", e); }
    IS_BUILDING_ML = false;
}

function extractSpecsStrict(t) {
    const s = { mfg: null, hp: null, volt: null, phase: null, enc: null };
    if (!t || typeof t !== 'string') return s;
    
    for (const [mfgKey, aliases] of Object.entries(EXACT_MFGS)) {
        for (const alias of aliases) {
            const r = new RegExp(`(?<!(FOR|FITS|REPLACES|COMPATIBLE|LIKE|WITH)\\s+)\\b${alias}\\b`, 'i');
            if (r.test(t)) { s.mfg = mfgKey; break; }
        }
        if (s.mfg) break;
    }

    if (/(?:ENCLOSURE|MATL|MATERIAL|TYPE).{0,30}(?:4XSS|STAINLESS|304|316)/i.test(t)) s.enc = '4XSS';
    else if (/(?:ENCLOSURE|MATL|MATERIAL|TYPE).{0,30}(?:POLY|POLYCARBONATE)/i.test(t)) s.enc = 'POLY';
    else if (/(?:ENCLOSURE|MATL|MATERIAL|TYPE).{0,30}(?:FIBERGLASS|FRP|NON-METALLIC|4XFG)/i.test(t)) s.enc = '4XFG';
    
    if (!s.enc) {
        if (/\b(POLY|POLYCARBONATE)\b/i.test(t)) s.enc = 'POLY';
        else if (/\b(FIBERGLASS|FRP|NON-METALLIC|4XFG)\b/i.test(t) || t.includes('NEMA 4X')) s.enc = '4XFG';
        else {
            const ssMatch = t.match(/\b(4XSS|STAINLESS|304|316|NEMA 4X SS|SS)\b/i);
            if (ssMatch) {
                const idx = ssMatch.index;
                const context = t.substring(Math.max(0, idx - 50), idx + 50);
                if (!/SCREW|LATCH|HARDWARE|NAMEPLATE|HINGE|MOUNT|FEET|SWITCH|SELECTOR|POS/i.test(context)) s.enc = '4XSS';
            }
        }
    }

    let maxHP = 0; let m;
    const hpPatterns = [
        /\b(\d+)\s+(\d+\/\d+)\s*(?:HP|H\.P\.|HORSEPOWER|KW)\b/gi, 
        /(?:^|[^0-9a-z\/\.-])((?:\d*\.)?\d+(?:[\/-]\d+)?(?:\/\d+)?)\s*(?:HP|H\.P\.|HORSEPOWER|KW)\b/gi, 
        /\b(?:HP|H\.P\.|HORSEPOWER)\s*[:\-]?\s*((?:\d*\.)?\d+(?:[\/-]\d+)?(?:\/\d+)?)\b/gi 
    ];

    for (const regex of hpPatterns) {
        for (const match of t.matchAll(regex)) {
            let raw = match[1]; let val = 0;
            if (match.length > 2 && match[2]) {
                const [num, den] = match[2].split('/');
                val = parseFloat(raw) + (parseFloat(num) / parseFloat(den));
            } else if (raw.includes('-')) {
                const parts = raw.split('-'); 
                if (parts[1] && parts[1].includes('/')) {
                    const frac = parts[1].split('/'); val = parseFloat(parts[0]) + (parseFloat(frac[0]) / parseFloat(frac[1])); 
                } else { val = parseFloat(parts[1] || parts[0]); }
            } else if (raw.includes('/')) {
                const parts = raw.split('/'); val = parseFloat(parts[0]) / parseFloat(parts[1]);
            } else { val = parseFloat(raw); }
            
            if (match[0].toUpperCase().includes('KW')) val *= 1.341;
            if (!isNaN(val) && val >= 0.1 && val <= 500 && val > maxHP) maxHP = val;
        }
    }
    if (maxHP > 0) s.hp = (Math.round(maxHP * 10) / 10).toString();

    for (const v of VOLT_PRIORITY) { if (v.match.test(t)) { s.volt = v.id; break; } }
    if (/\b(3 PHASE|3PH|3Ø|3\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*3)\b/i.test(t)) s.phase = "3"; 
    else if (/\b(1 PHASE|1PH|1Ø|1\/60|PHASE(?:\/HZ)?\s*[:\-]?\s*1)\b/i.test(t)) s.phase = "1"; 

    return s;
}

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Cox-User, X-Cox-Pass'
        };

        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        try {
            const url = new URL(request.url);
            const target = (url.searchParams.get('target') || '').toUpperCase();
            
            if (target === 'PDF') {
                const pdfUrl = url.searchParams.get('url');
                if (!pdfUrl) return new Response("Missing URL", { status: 400, headers: corsHeaders });
                const pdfResponse = await fetch(pdfUrl);
                const newHeaders = new Headers(pdfResponse.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Content-Type', 'application/pdf');
                return new Response(pdfResponse.body, { status: pdfResponse.status, headers: newHeaders });
            }

            if (target === 'GET_PDF_URLS') {
                const limitParam = parseInt(url.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE));
                const limit = Math.min(isNaN(limitParam) ? DEFAULT_PAGE_SIZE : limitParam, MAX_PAGE_SIZE);
                const offset = url.searchParams.get('offset');
                
                // Build Airtable URL using URLSearchParams for better maintainability
                const airtableParams = new URLSearchParams({
                    pageSize: limit.toString()
                });
                airtableParams.append('fields[]', 'Control Panel Name');
                airtableParams.append('fields[]', 'Control Panel PDF');
                
                if (offset) {
                    airtableParams.append('offset', offset);
                }
                
                const airtableUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?${airtableParams}`;
                
                const response = await fetch(airtableUrl, {
                    headers: { 'Authorization': `Bearer ${KEY_READ_ONLY}` }
                });
                
                if (!response.ok) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: `Airtable API error: ${response.status}` 
                    }), {
                        status: response.status,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                
                const data = await response.json();
                
                const pdfs = data.records
                    .filter(record => {
                        const pdf = record.fields['Control Panel PDF'];
                        return pdf && Array.isArray(pdf) && pdf.length > 0;
                    })
                    .map(record => ({
                        id: record.id,
                        name: record.fields['Control Panel Name'],
                        url: record.fields['Control Panel PDF'][0].url
                    }));
                
                return new Response(JSON.stringify({
                    success: true,
                    count: pdfs.length,
                    offset: data.offset || null,
                    pdfs: pdfs
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (target === 'ANALYZE_PDF') {
                const pdfUrl = url.searchParams.get('url');
                
                if (!pdfUrl) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: 'Missing required parameter: url' 
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                
                // SSRF Protection: Validate URL is from Airtable
                const decodedUrl = decodeURIComponent(pdfUrl);
                try {
                    const urlObj = new URL(decodedUrl);
                    const allowedDomains = ['dl.airtable.com', 'airtable.com'];
                    
                    if (!allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain))) {
                        return new Response(JSON.stringify({ 
                            success: false, 
                            error: 'Invalid URL: Only Airtable URLs are allowed' 
                        }), {
                            status: 400,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        });
                    }
                } catch (e) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: 'Invalid URL format' 
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                
                // Fetch PDF
                const pdfResponse = await fetch(decodedUrl);
                
                if (!pdfResponse.ok) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: `Failed to fetch PDF: ${pdfResponse.status}` 
                    }), {
                        status: pdfResponse.status,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                
                const pdfBytes = await pdfResponse.arrayBuffer();
                
                // Placeholder implementation - full PDF parsing would require additional libraries
                // For now, return basic metadata and structure for future implementation
                return new Response(JSON.stringify({
                    success: true,
                    url: decodedUrl,
                    size: pdfBytes.byteLength,
                    message: 'PDF analysis placeholder - full text extraction requires PDF parsing library',
                    note: 'Consider client-side processing with PDF.js for detailed text extraction'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Immediately ready to authenticate!
            await ensureAuthAndFeedback();

            // Fire and forget ML training in the background
            if (!CACHE_NB_MODEL && !IS_BUILDING_ML && ctx && ctx.waitUntil) {
                ctx.waitUntil(buildMLBackground());
            }

            const u = request.headers.get('X-Cox-User');
            const p = request.headers.get('X-Cox-Pass');
            if (!CACHE_USERS || !CACHE_USERS.some(r => r.fields['Username']?.toLowerCase() === u?.toLowerCase() && r.fields['Passcode'] === p)) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
            }

            if (target === 'MAIN') {
                const offset = url.searchParams.get('offset');
                const pageSize = url.searchParams.get('pageSize') || '100';
                
                // Option to force Main DB read (for testing/fallback)
                const forceMainDB = url.searchParams.get('force_main') === 'true';
                
                if (forceMainDB) {
                    // FALLBACK: Original logic (reads from Main DB, processes on-the-fly)
                    const direction = url.searchParams.get('sort[0][direction]') || 'desc';
                    let mainUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?pageSize=${pageSize}` +
                                  `&fields%5B%5D=Control%20Panel%20Name` +
                                  `&fields%5B%5D=Items` +
                                  `&fields%5B%5D=Control%20Panel%20PDF` +
                                  `&sort%5B0%5D%5Bfield%5D=Control%20Panel%20Name` +
                                  `&sort%5B0%5D%5Bdirection%5D=${direction}`;
                    
                    if (offset) mainUrl += `&offset=${encodeURIComponent(offset)}`;
                    
                    const mainResp = await fetch(mainUrl, { headers: { 'Authorization': `Bearer ${KEY_READ_ONLY}` } });
                    if (!mainResp.ok) throw new Error(`Airtable Main Data HTTP ${mainResp.status}`);
                    const mainJson = await mainResp.json();
                    
                    const activeRecords = (mainJson.records || []).map(r => {
                        const rawId = String(r.fields['Control Panel Name'] || "");
                        const cleanId = rawId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').replace(/[!?]/g,'').trim();
                        
                        const rawItems = r.fields['Items'];
                        const fullDesc = (typeof rawItems === 'string' ? rawItems : Array.isArray(rawItems) ? rawItems.join(' ') : "").toUpperCase();
                        
                        const textToParse = fullDesc + " " + cleanId;
                        const explicit = extractSpecsStrict(textToParse);

                        let finalMfg = explicit.mfg;
                        let finalEnc = explicit.enc;
                        if (CACHE_NB_MODEL) {
                            const bayesText = textToParse.slice(0, 1500); 
                            if (!finalMfg) finalMfg = CACHE_NB_MODEL.predict(bayesText, 'mfg');
                            if (!finalEnc) finalEnc = CACHE_NB_MODEL.predict(bayesText, 'enc');
                        }

                        let finalHp = explicit.hp;
                        let finalVolt = explicit.volt;
                        let finalPhase = explicit.phase;
                        let finalCategory = null;

                        const overrides = CACHE_HEALED[cleanId];
                        if (overrides) {
                            if (overrides.mfg) finalMfg = overrides.mfg;
                            if (overrides.hp) finalHp = overrides.hp;
                            if (overrides.volt) finalVolt = overrides.volt;
                            if (overrides.phase) finalPhase = overrides.phase;
                            if (overrides.enc) finalEnc = overrides.enc;
                            if (overrides.category) finalCategory = overrides.category;
                        }

                        return {
                            id: cleanId, displayId: "CP-" + cleanId, desc: fullDesc, pdfUrl: r.fields['Control Panel PDF']?.[0]?.url || "",
                            mfg: finalMfg, hp: finalHp, volt: finalVolt, phase: finalPhase, enc: finalEnc, category: finalCategory,
                            reject_keywords: overrides ? (overrides.reject_keywords || []) : []
                        };
                    });
                    
                    return new Response(JSON.stringify({ records: activeRecords, offset: mainJson.offset }), { 
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    });
                }
                
                // PRIMARY PATH: Read from Golden DB (fast, pre-processed)
                let goldenUrl = `https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_LEGACY}?pageSize=${pageSize}` +
                                `&sort%5B0%5D%5Bfield%5D=Panel%20ID` +
                                `&sort%5B0%5D%5Bdirection%5D=desc`;
                
                if (offset) goldenUrl += `&offset=${encodeURIComponent(offset)}`;
                
                const goldenResp = await fetch(goldenUrl, { headers: { 'Authorization': `Bearer ${KEY_READ_WRITE}` } });
                
                if (goldenResp.status === 429) {
                    return new Response(JSON.stringify({ 
                        error: "Rate Limited", 
                        message: "Too many requests. Please wait and retry.",
                        retry_after: 1
                    }), { 
                        status: 429, 
                        headers: { 
                            ...corsHeaders, 
                            'Content-Type': 'application/json',
                            'Retry-After': '1'
                        } 
                    });
                }
                
                if (!goldenResp.ok) {
                    // If Golden DB read fails, fall back to Main DB
                    console.error(`Golden DB read failed: ${goldenResp.status}, falling back to Main DB`);
                    return new Response(JSON.stringify({ 
                        error: "Golden DB unavailable", 
                        message: "Please rebuild using ?target=BUILD_GOLDEN",
                        status: goldenResp.status
                    }), { 
                        status: 503, 
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    });
                }
                
                const goldenJson = await goldenResp.json();
                
                // Data is already processed! Just apply healer overrides and format
                const activeRecords = (goldenJson.records || []).map(r => {
                    const cleanId = r.fields['Panel ID'] || '';
                    const overrides = CACHE_HEALED[cleanId];
                    
                    // Use healer overrides if available, otherwise use Golden DB values
                    return {
                        id: cleanId,
                        displayId: "CP-" + cleanId,
                        desc: r.fields['Description'] || '',
                        pdfUrl: r.fields['PDF URL'] || '',
                        mfg: overrides?.mfg || r.fields['Manufacturer'],
                        hp: overrides?.hp || r.fields['HP'],
                        volt: overrides?.volt || r.fields['Voltage'],
                        phase: overrides?.phase || r.fields['Phase'],
                        enc: overrides?.enc || r.fields['Enclosure'],
                        category: overrides?.category || null,
                        confidence: r.fields['Confidence'] ?? 0,
                        source: overrides ? 'healer' : (r.fields['Source'] || 'unknown'),
                        reject_keywords: overrides?.reject_keywords || []
                    };
                });
                
                return new Response(JSON.stringify({ 
                    records: activeRecords, 
                    offset: goldenJson.offset,
                    source: 'golden_db' 
                }), { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }

            if (target === 'BUILD_GOLDEN') {
                // Security: Only allow authorized users
                const u = request.headers.get('X-Cox-User');
                const p = request.headers.get('X-Cox-Pass');
                if (!CACHE_USERS || !CACHE_USERS.some(r => r.fields['Username']?.toLowerCase() === u?.toLowerCase() && r.fields['Passcode'] === p)) {
                    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
                }
                
                console.log('🏗️ Building Golden DB...');
                
                // Fetch ALL records from Main DB (paginated)
                let allRecords = [];
                let offset = null;
                let pages = 0;
                const MAX_PAGES = 100; // Safety limit (~10,000 records max)
                let fetchRetries = 0;
                const MAX_FETCH_RETRIES = 5;
                
                do {
                    let mainUrl = `https://api.airtable.com/v0/${BASE_MAIN_ID}/${TABLE_MAIN}?pageSize=100` +
                                  `&fields%5B%5D=Control%20Panel%20Name` +
                                  `&fields%5B%5D=Items` +
                                  `&fields%5B%5D=Control%20Panel%20PDF`;
                    
                    if (offset) mainUrl += `&offset=${encodeURIComponent(offset)}`;
                    
                    const resp = await fetch(mainUrl, { headers: { 'Authorization': `Bearer ${KEY_READ_ONLY}` } });
                    
                    if (resp.status === 429) {
                        fetchRetries++;
                        if (fetchRetries >= MAX_FETCH_RETRIES) {
                            console.error('Max fetch retries reached due to rate limiting');
                            break;
                        }
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                    
                    fetchRetries = 0; // Reset retry counter on success
                    
                    if (!resp.ok) break;
                    
                    const data = await resp.json();
                    allRecords.push(...(data.records || []));
                    offset = data.offset;
                    pages++;
                    
                    console.log(`📦 Fetched page ${pages}, total records: ${allRecords.length}`);
                    
                    // Rate limit: wait 200ms between requests (5 req/sec)
                    if (offset) await new Promise(r => setTimeout(r, 200));
                    
                } while (offset && pages < MAX_PAGES);
                
                console.log(`✅ Fetched ${allRecords.length} total records from Main DB`);
                
                // Process each record
                const processedRecords = [];
                
                for (const r of allRecords) {
                    const rawId = String(r.fields['Control Panel Name'] || "");
                    const cleanId = rawId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').replace(/[!?]/g,'').trim();
                    
                    const rawItems = r.fields['Items'];
                    const fullDesc = (typeof rawItems === 'string' ? rawItems : Array.isArray(rawItems) ? rawItems.join(' ') : "");
                    const pdfUrl = r.fields['Control Panel PDF']?.[0]?.url || "";
                    
                    // Extract specs using existing regex logic
                    const textToParse = fullDesc.toUpperCase() + " " + cleanId;
                    const extracted = extractSpecsStrict(textToParse);
                    
                    // Calculate confidence score
                    let confidence = 0;
                    let source = 'none';
                    let fieldCount = 0;
                    
                    if (extracted.mfg) fieldCount++;
                    if (extracted.hp && isValidHP(extracted.hp)) fieldCount++;
                    if (extracted.volt && isValidVoltage(extracted.volt)) fieldCount++;
                    if (extracted.phase && isValidPhase(extracted.phase)) fieldCount++;
                    if (extracted.enc) fieldCount++;
                    
                    if (fieldCount > 0) {
                        // Regex extraction base confidence: 60 points
                        // Bonus: +8 points per field extracted (up to 100)
                        confidence = Math.min(60 + (fieldCount * 8), 95);
                        source = 'regex';
                    }
                    
                    // Check if healer has overrides for this panel
                    const overrides = CACHE_HEALED[cleanId];
                    if (overrides && Object.keys(overrides).length > 0) {
                        // Healer overrides get 95-100 confidence
                        if (overrides.mfg) extracted.mfg = overrides.mfg;
                        if (overrides.hp) extracted.hp = overrides.hp;
                        if (overrides.volt) extracted.volt = overrides.volt;
                        if (overrides.phase) extracted.phase = overrides.phase;
                        if (overrides.enc) extracted.enc = overrides.enc;
                        confidence = 95;
                        source = 'healer';
                    }
                    
                    processedRecords.push({
                        fields: {
                            'Panel ID': cleanId,
                            'Description': fullDesc.substring(0, 100000), // Airtable long text limit
                            'HP': extracted.hp || null,
                            'Voltage': extracted.volt || null,
                            'Phase': extracted.phase || null,
                            'Manufacturer': extracted.mfg || null,
                            'Enclosure': extracted.enc || null,
                            'PDF URL': pdfUrl,
                            'Confidence': confidence,
                            'Source': source,
                            'Last Updated': new Date().toISOString()
                        }
                    });
                }
                
                console.log(`🔧 Processed ${processedRecords.length} records`);
                
                // Clear existing Legacy Panels table first (optional - comment out to append instead)
                // Note: Airtable doesn't have a "delete all" API, so we'd need to fetch IDs first
                // For now, we'll just overwrite/update existing records
                
                // Write to Legacy Panels (Golden DB) in batches of 10 (Airtable limit)
                let written = 0;
                let updated = 0;
                let failed = 0;
                
                for (let i = 0; i < processedRecords.length; i += 10) {
                    const batch = processedRecords.slice(i, i + 10);
                    
                    // Note: Current implementation creates new records on each run
                    // For production, implement upsert logic to update existing records
                    
                    try {
                        const writeResp = await fetch(`https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_LEGACY}`, {
                            method: 'POST',
                            headers: { 
                                'Authorization': `Bearer ${KEY_READ_WRITE}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ 
                                records: batch,
                                typecast: true // Auto-convert types
                            })
                        });
                        
                        if (writeResp.status === 429) {
                            await new Promise(r => setTimeout(r, 1000));
                            // Don't increment i in this iteration - retry the same batch
                            i -= 10;
                            continue;
                        }
                        
                        if (writeResp.ok) {
                            const result = await writeResp.json();
                            written += result.records?.length || 0;
                        } else {
                            console.error(`Write failed: ${writeResp.status}`);
                            failed += batch.length;
                        }
                    } catch (e) {
                        console.error('Write error:', e);
                        failed += batch.length;
                    }
                    
                    // Rate limit: 5 req/sec
                    await new Promise(r => setTimeout(r, 200));
                    
                    // Log progress every 100 records
                    if ((i + 10) % 100 === 0) {
                        console.log(`💾 Progress: ${i + 10}/${processedRecords.length} (${written} written, ${failed} failed)`);
                    }
                }
                
                console.log('✅ Golden DB build complete!');
                
                return new Response(JSON.stringify({ 
                    success: true,
                    total_fetched: allRecords.length,
                    total_processed: processedRecords.length,
                    written: written,
                    failed: failed,
                    timestamp: new Date().toISOString()
                }), { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }

            if (target === 'FEEDBACK') {
                const fbUrl = `https://api.airtable.com/v0/${BASE_USERS_ID}/${TABLE_FEEDBACK}`;
                const body = await request.json();
                const resp = await fetch(fbUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${KEY_READ_WRITE}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                CACHE_TIME = 0; CACHE_USERS = null;
                return new Response(JSON.stringify(await resp.json()), { headers: corsHeaders });
            }

            return new Response("Invalid Target", { status: 400, headers: corsHeaders });

        } catch (error) {
            return new Response(JSON.stringify({ error: "Worker Exception", message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
    }
};