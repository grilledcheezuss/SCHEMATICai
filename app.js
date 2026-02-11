// --- SCHEMATICA ai v1.72 ---
const APP_VERSION = "v1.72";
const WORKER_URL = "https://cox-proxy.thomas-85a.workers.dev"; 
const CONFIG = { mainTable: 'MAIN', feedbackTable: 'FEEDBACK', voteThreshold: 3, estTotal: 7500 };

window.TEMPLATE_BYTES = null;
window.BORDER_INFO_BYTES = null;
window.BORDER_STD_BYTES = null;

const LAYOUT_RULES = {
    TITLE: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "CONTROL PANEL", x: 0.15, y: 0.569, w: 0.7, h: 0.04, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "PROJECT SUBMITTAL", x: 0.201, y: 0.69, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "PLEASE REVIEW THOROUGHLY...", x: 0.201, y: 0.72, w: 0.6, h: 0.03, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.25, y: 0.75, w: 0.499, h: 0.04, fontSize: 20, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.835, y: 0.948, w: 0.15, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    INFO: [
        { map: "cust", x: 0.119, y: 0.085, w: 0.25, h: 0.025, fontSize: 10, transparent: true, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.058, y: 0.108, w: 0.25, h: 0.025, fontSize: 10, transparent: true, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.149, y: 0.889, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.909, y: 0.94, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_PORTRAIT: [
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.144, y: 0.89, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.92, y: 0.945, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_LANDSCAPE: [
        { x: 0.88, y: 0.13, w: 0.035, h: 0.25, map: 'cust', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { x: 0.88, y: 0.63, w: 0.035, h: 0.25, map: 'job', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { x: 0.05, y: 0.06, w: 0.02, h: 0.08, map: 'date', fontSize: 8, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.12, y: 0.28, w: 0.04, h: 0.25, map: 'type', fontSize: 12, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.05, y: 0.92, w: 0.02, h: 0.07, map: 'cpid', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    GENERAL: [
        { map: "custom", text: "GENERAL LAYOUT PLACEHOLDER", x: 0.499, y: 0.499, w: 0.3, h: 0.051, fontSize: 14, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ]
};

// v1.72: Cleaned List - Top Pump/Blower Manufacturers Only
const AI_TRAINING_DATA = { 
    MANUFACTURERS: { 
        'GORMAN RUPP':['gorman','gr'], 
        'BARNES':['barnes','sithe','crane'], 
        'HYDROMATIC':['hydromatic'], 
        'FLYGT':['flygt'], 
        'MYERS':['myers'], 
        'GOULDS':['goulds'], 
        'ZOELLER':['zoeller'], 
        'LIBERTY':['liberty'], 
        'WILO':['wilo'], 
        'PENTAIR':['pentair'], 
        'ABS':['abs']
    },
    ENCLOSURES: { 
        '4XSS': ['4XSS', 'STAINLESS', '304', '316', 'NEMA 4X SS', 'SS'], 
        '4XFG': ['4XFG', 'FIBERGLASS', 'FG', 'NON-METALLIC', 'NEMA 4X FG', 'FRP', 'NEMA 4X'], 
        'POLY': ['POLY', 'POLYCARBONATE'] 
    },
    ALIASES: {
        'LA': ['LA', 'LIGHTNING ARRESTOR', 'SURGE ARRESTOR', 'TVSS'],
        'PM': ['PM', 'PHASE MONITOR', 'PHASE FAIL', 'PHASE RELAY'],
        'VFD': ['VFD', 'VARIABLE FREQUENCY DRIVE', 'DRIVE', 'INVERTER'],
        'HOA': ['HOA', 'HAND OFF AUTO', 'HAND-OFF-AUTO'],
        'IS': ['IS', 'INTRINSICALLY SAFE', 'INTRINSIC SAFETY']
    },
    DATA: { 
        HP: [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100], 
        VOLT: [120, 208, 240, 480, 575], 
        PHASE: [1, 3] 
    } 
};

class DB {
    static open() { return new Promise((r, j) => { const q = indexedDB.open("CoxSchematicDB", 8); q.onupgradeneeded = e => { const d = e.target.result; if(d.objectStoreNames.contains("cache")) d.deleteObjectStore("cache"); if(d.objectStoreNames.contains("chunks")) d.deleteObjectStore("chunks"); d.createObjectStore("chunks"); }; q.onsuccess = e => r(e.target.result); q.onerror = e => j(e); }); }
    static async putChunk(k, v) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readwrite"); t.objectStore("chunks").put(v, k); t.oncomplete = r; t.onerror = j; }); }
    static async getChunk(k) { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").get(k); q.onsuccess = () => r(q.result); q.onerror = j; }); }
    static async getChunkKeys() { const d = await this.open(); return new Promise((r, j) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").getAllKeys(); q.onsuccess = () => r(q.result); q.onerror = j; }); }
    static async deleteLegacy() { try { const d = await this.open(); const t = d.transaction("cache", "readwrite"); t.objectStore("cache").clear(); } catch(e){} }
    static async clear() { const d=await this.open(); return new Promise(r=>{ const t=d.transaction("chunks","readwrite"); t.objectStore("chunks").clear(); t.oncomplete=r; }); }
    static deleteDatabase() { return new Promise((resolve, reject) => { const req = indexedDB.deleteDatabase("CoxSchematicDB"); req.onsuccess = () => resolve(); req.onerror = () => reject(); req.onblocked = () => resolve(); }); }
}

class CacheService {
    static activeKey = null;
    static async prepareKey(p) { if(!p) return null; const e = new TextEncoder(); const k = await crypto.subtle.importKey("raw", e.encode(p), "PBKDF2", false, ["deriveKey"]); this.activeKey = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: e.encode("COX_SALT_V1"), iterations: 100000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); return this.activeKey; }
    static async saveShard(id, data) { if(!this.activeKey) return; const j = JSON.stringify(data); const e = await this.enc(j); await DB.putChunk(id, e); }
    static async loadAllWithProgress(progressCallback) { if(!this.activeKey) return null; const keys = await DB.getChunkKeys(); if(!keys || keys.length === 0) return null; for(let i = 0; i < keys.length; i++) { if(i % 5 === 0) await new Promise(r => setTimeout(r, 5)); const chunk = await DB.getChunk(keys[i]); if(chunk) { try { const dec = await this.dec(chunk); if(dec) { const data = JSON.parse(dec); data.forEach(r => { window.LOCAL_DB.push(r); window.ID_MAP.set(r.id, r); if(r.mfg) window.FOUND_MFGS.add(r.mfg); }); } } catch(e) {} } if(progressCallback) progressCallback(Math.round(((i + 1) / keys.length) * 100)); } return true; }
    static async enc(t) { const iv = crypto.getRandomValues(new Uint8Array(12)); const e = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.activeKey, new TextEncoder().encode(t)); return Array.from(iv).map(b=>b.toString(16).padStart(2,'0')).join('') + ":" + Array.from(new Uint8Array(e)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
    static async dec(t) { const [i, d] = t.split(':'); const iv = new Uint8Array(i.match(/.{1,2}/g).map(b=>parseInt(b,16))); const da = new Uint8Array(d.match(/.{1,2}/g).map(b=>parseInt(b,16))); try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, this.activeKey, da)); } catch { return null; } }
}

class AuthService {
    static init() { const u = localStorage.getItem('cox_user'); const p = localStorage.getItem('cox_pass'); if (u && p) { document.documentElement.classList.add('logged-in'); document.getElementById('auth-overlay').classList.remove('active-modal'); UI.pop(); return true; } return false; }
    static login() { const u = document.getElementById('auth-user').value.trim(); const p = document.getElementById('auth-pass').value.trim(); if (!u || !p) return alert("Missing Credentials"); localStorage.setItem('cox_user', u); localStorage.setItem('cox_pass', p); location.reload(); }
    static logout() { localStorage.clear(); sessionStorage.clear(); location.reload(); }
    static headers() { return { 'X-Cox-User': localStorage.getItem('cox_user'), 'X-Cox-Pass': localStorage.getItem('cox_pass') }; }
}

class NetworkService {
    static async fetch(t, p='') { 
        const b = WORKER_URL.startsWith('http') ? WORKER_URL : `https://${WORKER_URL}`;
        const h = AuthService.headers();
        console.log(`🌐 Fetching ${t}...`);
        return fetch(`${b}?target=${encodeURIComponent(t)}${p.replace('?', '&')}`, { headers: h }); 
    }
}

class AIParser {
    static parse(t, id) {
        const healed = TheHealer.healedData[id];
        const s = { mfg: healed?.mfg||null, hp: healed?.hp||null, enc: healed?.enc||null, volt: healed?.volt||null, phase: healed?.phase||null, category: healed?.category||null };
        t = (t||"").toUpperCase();
        for (const [k, v] of Object.entries(AI_TRAINING_DATA.MANUFACTURERS)) { const regex = new RegExp(`(?<!(FOR|FITS|REPLACES|COMPATIBLE|LIKE|WITH)\\s+)\\b(${v.join('|').toUpperCase()})\\b`, 'i'); if (regex.test(t)) s.mfg = k.toUpperCase(); }
        
        if (!s.enc) {
            // 1. Check Polycarbonate (High Priority)
            const polyMatch = AI_TRAINING_DATA.ENCLOSURES['POLY'].some(val => {
                const regex = new RegExp(`\\b${val}\\b`, 'i'); // \b ensures whole word
                return regex.test(t);
            });
            
            if (polyMatch) {
                s.enc = 'POLY';
            } else {
                // 2. Check Fiberglass (Mid Priority)
                const specificFgTerms = ['FIBERGLASS', 'FRP', 'NON-METALLIC', '4XFG']; 
                const fgMatch = specificFgTerms.some(val => {
                    const regex = new RegExp(`\\b${val}\\b`, 'i');
                    return regex.test(t);
                });
                
                if (fgMatch) {
                    s.enc = '4XFG';
                } else {
                    // 3. Check Stainless (Smart Check with Word Boundaries)
                    const ssMatch = AI_TRAINING_DATA.ENCLOSURES['4XSS'].some(val => {
                        const regex = new RegExp(`\\b${val}\\b`, 'i');
                        if (!regex.test(t)) return false;

                        const idx = t.indexOf(val);
                        if (idx > -1) {
                            // Check previous context (e.g. "3 Pos SS")
                            const prevContext = t.substring(Math.max(0, idx - 10), idx);
                            if (/POS|POSITION|SELECTOR/.test(prevContext)) return false;

                            // Check next context
                            const context = t.substring(idx, idx + 50); 
                            if (/SCREW|LATCH|HARDWARE|NAMEPLATE|HINGE|MOUNT|FEET|SWITCH/.test(context)) {
                                return false; 
                            }
                            return true;
                        }
                        return false;
                    });
                    
                    if (ssMatch) {
                        s.enc = '4XSS';
                    } else {
                        // 4. Generic Fallback
                        if (t.includes('NEMA 4X')) {
                            s.enc = '4XFG';
                        }
                    }
                }
            }
        }
        
        if (!s.hp) {
            let maxHP = 0;
            const compoundRegex = /(\d+)\s+(\d+\/\d+)\s*(?:HP|H\.P\.|HORSEPOWER)\b/gi;
            [...t.matchAll(compoundRegex)].forEach(m => {
                const whole = parseFloat(m[1]); const [num, den] = m[2].split('/'); const val = whole + (parseFloat(num) / parseFloat(den)); if (val > maxHP) maxHP = val;
            });
            const standardRegex = /(?:^|[^0-9\/\-])(\d+(?:[\.\-]\d+)?(?:\/\d+)?)\s*(?:HP|H\.P\.|HORSEPOWER|H)\b/gi;
            [...t.matchAll(standardRegex)].forEach(m => {
                let val = 0; const raw = m[1];
                if(raw.includes('-') && raw.includes('/')) { const p = raw.split('-'); const f = p[1].split('/'); val = parseFloat(p[0]) + (parseFloat(f[0]) / parseFloat(f[1])); } 
                else if(raw.includes('/')) { const [n,d] = raw.split('/'); val = parseFloat(n) / parseFloat(d); } 
                else { val = parseFloat(raw); }
                if (val >= 0.1 && val <= 300 && val > maxHP) maxHP = val;
            });
            const kwRegex = /(?:^|[^a-zA-Z0-9.])(\d+(?:\.\d+)?)\s*(?:KW|KILOWATT)\b/gi;
            [...t.matchAll(kwRegex)].forEach(m => { const val = parseFloat(m[1]) * 1.341; if (val > maxHP) maxHP = val; });
            if (maxHP > 0) { if (Math.abs(maxHP - Math.round(maxHP)) < 0.1) maxHP = Math.round(maxHP); s.hp = maxHP.toString(); }
        }

        if (!s.volt) { let m = t.match(/\b(115|120|208|230|240|277|460|480|575)\s*V(?:olt)?(?:age)?\b/i); if(m) s.volt = m[1]; }
        if (!s.phase) { 
            if (t.includes("3 PHASE") || t.includes("3PH") || t.includes("3Ø") || t.includes("3/60") || t.includes("THREE PHASE")) s.phase = "3"; 
            else if (t.includes("1 PHASE") || t.includes("1PH") || t.includes("1Ø") || t.includes("1/60") || t.includes("SINGLE PHASE") || t.includes("SGL PH")) s.phase = "1"; 
        }
        return s;
    }
}

class TheHealer {
    static healedData = {}; 
    static async fetchAndTally() { 
        try { 
            const resp = await NetworkService.fetch(CONFIG.feedbackTable, '?pageSize=100'); 
            if(resp.status === 401) { AuthService.logout(); return; } 
            const data = await resp.json(); 
            if(data.records) { 
                const tallies = {}; 
                data.records.forEach(r => { 
                    const rawJson = r.fields['Corrections']; 
                    const id = r.fields['Panel ID']; 
                    if (rawJson && id) { 
                        try { const corrections = JSON.parse(rawJson); Object.entries(corrections).forEach(([param, value]) => { const key = `${id}|${param}|${value}`; tallies[key] = (tallies[key] || 0) + 1; }); } catch(e) { } 
                    } 
                }); 
                for (const [key, count] of Object.entries(tallies)) { 
                    if (count >= CONFIG.voteThreshold) { 
                        const [id, param, value] = key.split('|'); 
                        if (!this.healedData[id]) this.healedData[id] = {}; 
                        this.healedData[id][param] = value; 
                    } 
                } 
            } 
        } catch(e) { console.error("Healing Failed", e); } 
    }
}

class DataLoader {
    static async preload() {
        const lastVer = localStorage.getItem('cox_version');
        if (lastVer !== APP_VERSION) {
            console.warn(`⚡ v1.72 Update: Purging Cache...`);
            await DB.deleteDatabase();
            localStorage.removeItem('cox_db_complete');
            localStorage.removeItem('cox_sync_attempts');
            localStorage.setItem('cox_version', APP_VERSION);
        }

        console.log("🚀 Starting Preload...");
        const btn = document.getElementById('searchBtn'); btn.disabled = true; btn.innerText = "🔒 PREPARING...";
        
        const loads = [
            fetch('cover_sheet_template.pdf').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.TEMPLATE_BYTES=b; console.log("✅ PDF Template Loaded");}).catch(e=>console.warn("⚠️ PDF Template Missing")),
            fetch('border_info.png').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.BORDER_INFO_BYTES=b; console.log("✅ Info Border Loaded");}).catch(e=>console.warn("⚠️ Info Border Missing")),
            fetch('border_standard.png').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.BORDER_STD_BYTES=b; console.log("✅ Std Border Loaded");}).catch(e=>console.warn("⚠️ Std Border Missing"))
        ];
        await Promise.allSettled(loads);

        await new Promise(r => setTimeout(r, 200)); 
        const p = localStorage.getItem('cox_pass'); await CacheService.prepareKey(p); await DB.deleteLegacy();
        let attempts = parseInt(localStorage.getItem('cox_sync_attempts') || '0');
        if(attempts > 5) { btn.innerText = "⚠️ SYNC INTERRUPTED"; btn.classList.add('warning'); btn.disabled = false; btn.onclick = () => { localStorage.setItem('cox_sync_attempts', '0'); location.reload(); }; return; }
        localStorage.setItem('cox_sync_attempts', (attempts + 1).toString());
        const hasData = await CacheService.loadAllWithProgress((pct) => { btn.innerText = `🔒 DECRYPTING ${pct}%`; });
        if(hasData) { 
            if(window.LOCAL_DB.length > 7000) { localStorage.setItem('cox_db_complete', 'true'); btn.innerText = "SEARCH"; btn.disabled = false; UI.pop(); return; }
            if(localStorage.getItem('cox_db_complete')) { localStorage.setItem('cox_sync_attempts', '0'); btn.innerText = "SEARCH"; btn.disabled = false; UI.pop(); return; } else { btn.innerText = "⬇️ RESUMING..."; } 
        } else { btn.innerText = "⬇️ SYNCING..."; }
        await this.fetchPartition('desc', btn);
        if(!btn.classList.contains('error')) { 
            btn.innerText = "✅ FINALIZING..."; 
            localStorage.setItem('cox_sync_attempts', '0'); 
            UI.pop(); 
            btn.innerText = "SEARCH"; btn.disabled = false;
        }
    }
    static resetSync() { localStorage.removeItem('cox_db_complete'); localStorage.setItem('cox_sync_attempts', '0'); location.reload(); }
    static async fetchPartition(dir, btn) {
        let offset = null, loop = 0; let buffer = []; let shardCount = 0;
        let fetchedCount = 0;
        try {
            do {
                loop++; if(loop > 300 || window.LOCAL_DB.length >= 10000) break;
                console.group(`📥 Sync Batch ${loop}`); await new Promise(r => setTimeout(r, 10)); 
                if(btn && !btn.classList.contains('warning') && !btn.classList.contains('error')) { const pct = Math.min(99, Math.round((fetchedCount/CONFIG.estTotal)*100)); btn.innerText = `⬇️ UPDATING ${pct}%`; }
                const r = await NetworkService.fetch(CONFIG.mainTable, `?pageSize=100&fields[]=Control Panel Name&fields[]=Items&fields[]=Control Panel PDF${offset ? '&offset='+offset : ''}&sort%5B0%5D%5Bfield%5D=Control%20Panel%20Name&sort%5B0%5D%5Bdirection%5D=${dir}`);
                if(r.status===401) { console.error("Sync Failed 401"); btn.classList.add('error'); btn.innerText="AUTH ERROR"; break; }
                if(r.status!==200) { console.error("Sync Failed", r.status); break; }
                const d = await r.json(); if(!d.records || d.records.length === 0) { console.log("✅ Sync Complete"); break; }
                fetchedCount += d.records.length;
                d.records.forEach(r => {
                    try {
                        let rec = {};
                        if(r.mfg !== undefined && r.id !== undefined) {
                            rec = { id: r.id, displayId: r.displayId, desc: r.desc, pdfUrl: r.pdfUrl, mfg: r.mfg, hp: r.hp, volt: r.volt, phase: r.phase, enc: r.enc, category: r.category };
                        } else {
                            const rawId = (r.fields['Control Panel Name']||"");
                            const cleanId = rawId.replace(/^CP-/i, '').replace(/\.dwg$/i, '').replace(/\.pdf$/i, '').replace(/[!?]/g,'').trim();
                            const displayId = "CP-" + cleanId;
                            const desc = (r.fields['Items']||"").toUpperCase();
                            const parsed = AIParser.parse(desc + " " + cleanId);
                            let cleanMfg = parsed.mfg;
                            if(cleanMfg) { let isValid = false; for(const validMfg in AI_TRAINING_DATA.MANUFACTURERS) { if(cleanMfg === validMfg) { isValid=true; break; } } if(!isValid) cleanMfg = null; }
                            rec = { id: cleanId, displayId: displayId, desc: desc, pdfUrl: r.fields['Control Panel PDF']?.[0]?.url, mfg: cleanMfg, hp: parsed.hp, volt: parsed.volt, phase: parsed.phase, enc: parsed.enc, category: parsed.category };
                        }
                        if(window.ID_MAP.has(rec.id)) { } else { window.LOCAL_DB.push(rec); window.ID_MAP.set(rec.id, rec); if(rec.mfg) window.FOUND_MFGS.add(rec.mfg); }
                        buffer.push(rec);
                    } catch(e) { console.warn("Record Skip", e); }
                });
                console.groupEnd();
                if(buffer.length >= 50) { await CacheService.saveShard(`shard_${Date.now()}_${shardCount++}`, buffer); buffer = []; }
                offset = d.offset;
            } while(offset);
            localStorage.setItem('cox_db_complete', 'true'); if(buffer.length > 0) { await CacheService.saveShard(`shard_${Date.now()}_final`, buffer); }
        } catch(e) { console.error("Sync Critical Error", e); } 
    }
    static harvestCSV() { alert('Harvesting...'); }
}

// v1.62: Drag Logic using FIXED positioning (pure viewport math)
class DragManager {
    static init() {
        const handle = document.getElementById('gen-drag-handle');
        const panel = document.getElementById('generator-panel');
        if(!handle || !panel) return;

        let isDragging = false;
        let shiftX, shiftY;

        const startDrag = (clientX, clientY) => {
            isDragging = true;
            
            // Get current visual rect
            const rect = panel.getBoundingClientRect();
            
            // Calculate mouse offset from panel corner
            shiftX = clientX - rect.left;
            shiftY = clientY - rect.top;

            // Lock to fixed position based on current visual location
            // Since it is fixed, we use rect.left/top directly (no scroll addition needed)
            const absLeft = rect.left;
            const absTop = rect.top;

            panel.style.transition = 'none'; 
            panel.style.right = 'auto'; 
            panel.style.bottom = 'auto';
            panel.style.left = `${absLeft}px`;
            panel.style.top = `${absTop}px`;
            
            handle.style.cursor = 'grabbing';
        };

        const moveDrag = (clientX, clientY) => {
            if(!isDragging) return;
            
            // Pure viewport math: Mouse Position - Initial Offset
            const newLeft = clientX - shiftX;
            const newTop = clientY - shiftY;
            
            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        };

        const endDrag = () => {
            if(isDragging) { 
                isDragging = false; 
                panel.style.transition = ''; 
                handle.style.cursor = 'move'; 
            }
        };

        // MOUSE EVENTS
        handle.onmousedown = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        };
        document.onmousemove = (e) => moveDrag(e.clientX, e.clientY);
        document.onmouseup = endDrag;

        // TOUCH EVENTS
        handle.ontouchstart = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
            e.preventDefault();
        };
        document.ontouchmove = (e) => {
            if(!isDragging) return;
            const touch = e.touches[0];
            moveDrag(touch.clientX, touch.clientY);
        };
        document.ontouchend = endDrag;
    }
}

class DemoManager {
    static isGeneratorActive = false;

    static toggleGenerator() {
        this.isGeneratorActive = !this.isGeneratorActive;
        const btn = document.getElementById('menu-demo');
        const indicator = document.getElementById('gen-status');
        const panel = document.getElementById('generator-panel');
        const restoreBtn = document.getElementById('generator-restore-btn');
        
        if(this.isGeneratorActive) { 
            document.body.classList.add('demo-mode'); 
            this.restorePanel(); 
            if(indicator) indicator.style.display = 'inline-block';
            if(btn) btn.style.color = 'var(--app-primary)';
            if(!document.getElementById('demo-date').value) document.getElementById('demo-date').valueAsDate = new Date(); 
            if(PdfViewer.doc) PdfViewer.renderStack();
            DragManager.init();
        } else { 
            document.body.classList.remove('demo-mode'); 
            document.body.classList.remove('editor-active'); 
            panel.style.display = 'none';
            restoreBtn.style.display = 'none';
            if(indicator) indicator.style.display = 'none';
            if(btn) btn.style.color = ''; 
            if(PdfViewer.doc) PdfViewer.renderStack();
        }
    }

    // v1.50: Add 'gen-minimized' class to body
    static minimizePanel() {
        document.getElementById('generator-panel').classList.add('minimized');
        document.getElementById('generator-restore-btn').style.display = 'flex';
        document.body.classList.remove('editor-active');
        document.body.classList.add('gen-minimized'); // Hide editing UI
    }

    static restorePanel() {
        const panel = document.getElementById('generator-panel');
        panel.style.display = 'flex';
        panel.classList.remove('minimized');
        document.getElementById('generator-restore-btn').style.display = 'none';
        document.body.classList.add('editor-active');
        document.body.classList.remove('gen-minimized'); // Show editing UI
    }

    static toggleContext() {
        const panel = document.getElementById('demo-context-panel');
        const content = document.getElementById('demo-context-content');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            panel.classList.remove('collapsed-state');
        } else {
            content.classList.add('collapsed');
            panel.classList.add('collapsed-state');
        }
    }

    static getContext() {
        return { cust: document.getElementById('demo-cust-name').value || "CUSTOMER NAME", job: document.getElementById('demo-job-name').value || "JOB TITLE", type: document.getElementById('demo-system-type').value || "SYSTEM TYPE", cpid: document.getElementById('demo-panel-id').value || "CP-####", date: document.getElementById('demo-date').value || "YYYY-MM-DD", stage: document.getElementById('demo-stage').value || "STAGE" };
    }
}

class ProfileManager {
    static getCustomProfiles() {
        const stored = localStorage.getItem('cox_custom_profiles');
        return stored ? JSON.parse(stored) : {};
    }

    static saveProfile(name, rules) {
        const profiles = this.getCustomProfiles();
        profiles[name] = rules;
        localStorage.setItem('cox_custom_profiles', JSON.stringify(profiles));
        LayoutScanner.refreshProfileOptions(); 
        alert(`Profile "${name}" saved!`);
    }

    static deleteProfile(name) {
        const profiles = this.getCustomProfiles();
        if (profiles[name]) {
            delete profiles[name];
            localStorage.setItem('cox_custom_profiles', JSON.stringify(profiles));
            LayoutScanner.refreshProfileOptions();
        }
    }

    static saveCurrentPageAsProfile() {
        const name = document.getElementById('new-profile-name').value.trim();
        if (!name) return alert("Please enter a profile name.");
        
        const wrappers = document.querySelectorAll('.pdf-page-wrapper');
        let targetContainer = null;
        
        for(const w of wrappers) {
             const rect = w.getBoundingClientRect();
             if (rect.top >= -100 && rect.top < window.innerHeight) {
                 targetContainer = w.querySelector('.pdf-content-container');
                 break;
             }
        }

        if (!targetContainer) return alert("No visible page found.");

        const w = targetContainer.offsetWidth;
        const h = targetContainer.offsetHeight;
        const boxes = [];

        targetContainer.querySelectorAll('.redaction-box').forEach(box => {
            boxes.push({
                map: box.dataset.map,
                x: parseFloat((box.offsetLeft / w).toFixed(4)),
                y: parseFloat((box.offsetTop / h).toFixed(4)),
                w: parseFloat((box.offsetWidth / w).toFixed(4)),
                h: parseFloat((box.offsetHeight / h).toFixed(4)),
                text: box.dataset.customText || null,
                fontSize: parseInt(box.style.fontSize),
                fontFamily: box.style.fontFamily, 
                rotation: parseFloat(box.dataset.rotation || 0),
                textAlign: box.style.textAlign || 'center', 
                transparent: box.dataset.transparent === "true"
            });
        });

        if (boxes.length === 0) return alert("Add some boxes first!");
        
        this.saveProfile(name, boxes);
        document.getElementById('new-profile-name').value = '';
    }
}

class ConfigExporter {
    static export() {
        const pages = [];
        document.querySelectorAll('.pdf-page-wrapper').forEach((wrapper, index) => {
            const pageNum = index + 1;
            const select = wrapper.querySelector('.page-profile-select');
            const profile = select ? select.value : 'UNKNOWN';
            
            const container = wrapper.querySelector('.pdf-content-container');
            const w = container.offsetWidth;
            const h = container.offsetHeight;

            const boxes = [];
            container.querySelectorAll('.redaction-box').forEach(box => {
                boxes.push({
                    map: box.dataset.map,
                    x: parseFloat((box.offsetLeft / w).toFixed(3)),
                    y: parseFloat((box.offsetTop / h).toFixed(3)),
                    w: parseFloat((box.offsetWidth / w).toFixed(3)),
                    h: parseFloat((box.offsetHeight / h).toFixed(3)),
                    text: box.dataset.customText || null,
                    fontSize: parseInt(box.style.fontSize),
                    fontFamily: box.style.fontFamily, 
                    rotation: parseFloat(box.dataset.rotation || 0),
                    textAlign: box.style.textAlign || 'center', 
                    transparent: box.dataset.transparent === "true"
                });
            });
            pages.push({ page: pageNum, profile: profile, boxes: boxes });
        });
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pages, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `layout_config_${new Date().getTime()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

class RedactionManager {
    static activeBox = null; static zones = []; static isDragging = false; static startX = 0; static startY = 0; static startLeft = 0; static startTop = 0;
    
    // v1.49: Added textAlign arg
    static createZoneOnWrapper(wrapper, x, y, w, h, mapKey, fontSize = 14, text = null, decoration = null, type = null, fontWeight = 'normal', transparent = false, rotation = 0, fontFamily = null, textAlign = 'center') {
        let container = wrapper.querySelector('.pdf-content-container');
        if (!container && wrapper.classList.contains('pdf-content-container')) container = wrapper;
        if (!container) return; 

        const layer = container.querySelector('.redaction-layer'); if(!layer) return;
        
        const box = document.createElement('div'); box.className = 'redaction-box';
        box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
        box.dataset.map = mapKey || 'custom';
        if(text) box.dataset.customText = text; if(type) box.dataset.type = type; if(decoration) box.dataset.decoration = decoration; 
        
        box.dataset.transparent = transparent.toString(); 
        
        // v1.47: Smart Default Font Logic
        let styleFont = fontFamily;
        if (!styleFont) {
             styleFont = (mapKey === 'cust') ? "'Times New Roman', serif" : "'Courier New', monospace";
        }
        
        box.style.fontFamily = styleFont;
        box.style.fontSize = fontSize + 'px'; 
        box.style.fontWeight = fontWeight;
        box.style.textAlign = textAlign; // v1.49 Apply Alignment
        
        if (rotation) {
            box.dataset.rotation = rotation;
        }

        const handle = document.createElement('div'); handle.className = 'redaction-resize-handle'; box.appendChild(handle);
        box.onmousedown = (e) => this.startDrag(e, box); layer.appendChild(box); this.zones.push(box); return box;
    }

    static addManualZone() { const pages = document.querySelectorAll('.pdf-page-wrapper'); if(pages.length === 0) return; const wrapper = pages[0]; const container = wrapper.querySelector('.pdf-content-container'); const w = container.offsetWidth; const h = container.offsetHeight; this.createZoneOnWrapper(wrapper, w*0.3, h*0.4, w*0.4, h*0.1, 'custom', 16, null, null, 'blocker'); this.refreshContent(); }

    static addZoneToCurrentView(type) {
        const wrappers = document.querySelectorAll('.pdf-page-wrapper');
        if (wrappers.length === 0) return;
        
        let targetWrapper = wrappers[0];
        
        for(const w of wrappers) {
             const rect = w.getBoundingClientRect();
             if (rect.top >= -100 && rect.top < window.innerHeight) {
                 targetWrapper = w;
                 break;
             }
        }

        const container = targetWrapper.querySelector('.pdf-content-container');
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        
        const fontSize = document.getElementById('redact-size').value;
        const currentFontFamily = document.getElementById('redact-font').value; // Use currently selected font
        const isWhiteout = type === 'blocker';
        const transparent = !isWhiteout;

        // Pass currentFontFamily to create function
        this.createZoneOnWrapper(targetWrapper, w*0.35, h*0.4, w*0.3, h*0.05, 'custom', fontSize, isWhiteout ? '' : 'New Text', null, null, 'bold', transparent, 0, currentFontFamily, 'center');
        this.refreshContent();
    }
    
    static deleteSelected() {
        if (this.activeBox) {
            this.activeBox.remove();
            this.zones = this.zones.filter(z => z !== this.activeBox);
            this.activeBox = null;
            document.getElementById('editor-controls').classList.add('disabled-overlay');
        }
    }

    static startDrag(e, box) { if(!document.body.classList.contains('editor-active')) return; e.stopPropagation(); this.selectZone(box); this.isDragging = true; this.activeBox = box; this.startX = e.clientX; this.startY = e.clientY; this.startLeft = box.offsetLeft; this.startTop = box.offsetTop; box.style.cursor = 'grabbing'; }
    static handleDrag(e) { if(!this.isDragging || !this.activeBox) return; e.preventDefault(); const deltaX = e.clientX - this.startX; const deltaY = e.clientY - this.startY; this.activeBox.style.left = (this.startLeft + deltaX) + 'px'; this.activeBox.style.top = (this.startTop + deltaY) + 'px'; }
    static endDrag() { if(this.activeBox) this.activeBox.style.cursor = 'grab'; this.isDragging = false; }
    
    static selectZone(box) { 
        if(this.activeBox) this.activeBox.classList.remove('selected'); 
        this.activeBox = box; 
        box.classList.add('selected'); 
        document.getElementById('editor-controls').classList.remove('disabled-overlay'); 
        
        document.getElementById('zone-map-select').value = box.dataset.map; 
        
        // v1.49: Show/Hide Custom Text Input
        const customInputWrapper = document.getElementById('custom-text-wrapper');
        const customInput = document.getElementById('custom-zone-text');
        
        if (box.dataset.map === 'custom') {
            customInputWrapper.style.display = 'block';
            customInput.value = box.dataset.customText || '';
        } else {
            customInputWrapper.style.display = 'none';
        }

        const fs = parseInt(box.style.fontSize) || 14;
        document.getElementById('redact-size').value = fs; 
        document.getElementById('font-size-val').innerText = fs; 
        
        const ff = box.style.fontFamily.replace(/"/g, "'");
        const fontSelect = document.getElementById('redact-font');
        if (ff.includes("Courier")) fontSelect.value = "'Courier New', monospace";
        else fontSelect.value = "'Times New Roman', serif";

        document.getElementById('zone-bg-toggle').checked = (box.dataset.transparent === "false");
    }

    static deselect() { if(this.activeBox) this.activeBox.classList.remove('selected'); this.activeBox = null; document.getElementById('editor-controls').classList.add('disabled-overlay'); document.getElementById('custom-text-wrapper').style.display = 'none'; }
    
    static updateActiveStyle() { 
        const fs = document.getElementById('redact-size').value;
        document.getElementById('font-size-val').innerText = fs; 
        
        if(!this.activeBox) return; 
        this.activeBox.style.fontFamily = document.getElementById('redact-font').value; 
        this.activeBox.style.fontSize = fs + 'px'; 
    }
    
    // v1.49: Update Alignment
    static updateActiveAlignment(align) {
        if(!this.activeBox) return;
        this.activeBox.style.textAlign = align;
    }

    // v1.49: Update Custom Text Logic
    static mapSelectedZone() { 
        if(!this.activeBox) return; 
        const val = document.getElementById('zone-map-select').value;
        this.activeBox.dataset.map = val;
        
        // Toggle input visibility
        if (val === 'custom') {
            document.getElementById('custom-text-wrapper').style.display = 'block';
            document.getElementById('custom-zone-text').value = this.activeBox.dataset.customText || '';
        } else {
            document.getElementById('custom-text-wrapper').style.display = 'none';
        }
        
        this.refreshContent(); 
    }
    
    // v1.49: Update Text on Input
    static updateCustomText(text) {
        if(!this.activeBox) return;
        this.activeBox.dataset.customText = text;
        this.activeBox.querySelector('span').innerText = text;
    }

    static toggleBoxBackground() { if(!this.activeBox) return; const isOpaque = document.getElementById('zone-bg-toggle').checked; this.activeBox.dataset.transparent = isOpaque ? "false" : "true"; }
    
    static refreshContent() { 
        const ctx = DemoManager.getContext(); 
        
        // v1.45: Format Date (YYYY-MM-DD -> MM/DD/YY)
        let displayDate = ctx.date;
        if (displayDate && displayDate.includes('-')) {
             const parts = displayDate.split('-'); // 2026-02-11
             if (parts.length === 3) {
                 displayDate = `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
             }
        }

        this.zones.forEach(box => { 
            const map = box.dataset.map; let text = ""; 
            if(box.dataset.customText) text = box.dataset.customText; 
            else if(map === 'cust') text = ctx.cust; 
            else if(map === 'job') text = ctx.job; 
            else if(map === 'type') text = ctx.type; 
            else if(map === 'cpid') text = ctx.cpid; 
            else if(map === 'date') text = displayDate; // Use formatted date
            else if(map === 'stage') text = ctx.stage; 
            else if(map === 'logo') text = ""; 
            
            const span = box.querySelector('span'); if(span) span.innerText = text; else box.innerHTML = `<span>${text}</span><div class="redaction-resize-handle"></div>`;
            if(box.dataset.decoration === 'underline') { box.style.textDecoration = 'underline'; box.style.textUnderlineOffset = '3px'; }
        }); 
    }
    static clearAll() { document.querySelectorAll('.redaction-layer').forEach(l => l.innerHTML = ''); this.zones = []; this.deselect(); }
}

class RedactionEditor { static close() { RedactionManager.deselect(); } }

class PageClassifier { 
    static classify(textContent) { 
        let titleScore = 0; let schematicScore = 0; 
        const text = textContent.items.map(i => i.str).join(' ').toUpperCase(); 
        const SCHEMATIC_SIGNS = ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'FLOAT', 'TERMINAL', 'WIRING', 'SCHEMATIC', 'FULL LOAD']; 
        SCHEMATIC_SIGNS.forEach(w => { if(text.includes(w)) schematicScore += 10; }); 
        return (schematicScore > 50) ? 'STANDARD' : 'TITLE'; 
    } 
}

class LayoutScanner {
    static async scanAllPages() {
        RedactionManager.clearAll(); if(!PdfViewer.doc) return;
        const btn = document.querySelector('button[onclick="LayoutScanner.scanAllPages()"]');
        const origText = btn ? btn.innerText : "";
        if(btn) { btn.innerText = "⏳ SCANNING..."; btn.disabled = true; }
        
        try { 
            for(let i=1; i <= PdfViewer.doc.numPages; i++) { 
                const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${i}"]`); 
                if(!wrapper) continue;
                
                const container = wrapper.querySelector('.pdf-content-container');
                const manualSelect = wrapper.querySelector('.page-profile-select');
                let profileKey = manualSelect ? manualSelect.value : null;

                if (!profileKey || profileKey === "AUTO") {
                    if (i === 1) profileKey = 'TITLE';
                    else if (i === 2) profileKey = 'INFO';
                    else {
                        const w = container.offsetWidth; const h = container.offsetHeight;
                        profileKey = (w > h) ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
                    }
                    if(manualSelect) manualSelect.value = profileKey;
                }
                LayoutScanner.applyRuleToWrapper(wrapper, LAYOUT_RULES[profileKey]);
            } 
            RedactionManager.refreshContent(); 
        } catch(e) { console.error(e); }
        if(btn) { btn.innerText = origText; btn.disabled = false; }
    }

    static refreshProfileOptions() {
        const selects = document.querySelectorAll('.page-profile-select');
        const customProfiles = ProfileManager.getCustomProfiles();
        
        selects.forEach(select => {
            const currentVal = select.value;
            // Clear current options except built-ins
            // Re-build standard options
            let html = `
                <option value="AUTO">✨ Auto (Detected)</option>
                <option value="TITLE">🏷️ Title Sheet</option>
                <option value="INFO">📝 Info / Notes</option>
                <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Std)</option>
                <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Land)</option>
                <option value="GENERAL">📐 General</option>
            `;
            // Add customs
            for (const [name, _] of Object.entries(customProfiles)) {
                html += `<option value="CUSTOM:${name}">⭐ ${name}</option>`;
            }
            select.innerHTML = html;
            select.value = currentVal;
        });
    }

    static updatePageProfile(pageNum, profileKey) {
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${pageNum}"]`);
        if(!wrapper) return;
        
        const container = wrapper.querySelector('.pdf-content-container');
        const layer = container.querySelector('.redaction-layer');
        
        RedactionManager.zones = RedactionManager.zones.filter(z => !layer.contains(z));
        if(layer) layer.innerHTML = '';

        let rules = [];
        if (profileKey.startsWith('CUSTOM:')) {
            const name = profileKey.split('CUSTOM:')[1];
            rules = ProfileManager.getCustomProfiles()[name] || [];
        } else if (profileKey === "AUTO") {
             const w = container.offsetWidth; const h = container.offsetHeight;
             if (pageNum === 1) profileKey = 'TITLE';
             else if (pageNum === 2) profileKey = 'INFO';
             else profileKey = (w > h) ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
             const select = wrapper.querySelector('.page-profile-select');
             if(select) select.value = profileKey;
             rules = LAYOUT_RULES[profileKey];
        } else {
            rules = LAYOUT_RULES[profileKey];
        }

        LayoutScanner.applyRuleToWrapper(wrapper, rules);
        RedactionManager.refreshContent();
    }

    // v1.49: Apply textAlign
    static applyRuleToWrapper(wrapper, ruleSet) { 
        if(!wrapper || !ruleSet) return; 
        const container = wrapper.querySelector('.pdf-content-container');
        if(!container) return;

        const width = container.offsetWidth; 
        const height = container.offsetHeight; 
        
        ruleSet.forEach(zone => { 
            RedactionManager.createZoneOnWrapper(wrapper, zone.x * width, zone.y * height, zone.w * width, zone.h * height, zone.map, zone.fontSize, zone.text, null, null, zone.fontWeight || 'bold', zone.transparent, zone.rotation, zone.fontFamily, zone.textAlign); 
        }); 
    }
}

// v1.52: Update Feedback Service for Enclosure and Keywords
class FeedbackService {
    static currentId = null; static lockout = new Set();
    static async up(id, btn, crit) { if(btn.classList.contains('voted-up')) return; btn.classList.add('voted-up'); const implicit = {}; if(crit && crit.mfg !== 'Any') implicit.mfg = crit.mfg; if(crit && crit.hp !== 'Any') implicit.hp = crit.hp; if(crit && crit.volt !== 'Any') implicit.volt = crit.volt; if(crit && crit.phase !== 'Any') implicit.phase = crit.phase; if(crit && crit.enc !== 'Any') implicit.enc = crit.enc; const payload = { records: [{ fields: { 'Panel ID': id, 'Vote': 'Up', 'User': localStorage.getItem('cox_user'), 'Corrections': JSON.stringify(implicit) } }] }; await fetch(`${WORKER_URL}?target=FEEDBACK`, { method: 'POST', headers: { ...AuthService.headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
    static down(id) { 
        this.currentId = id; 
        this.setupInput('fb-mfg', Object.keys(AI_TRAINING_DATA.MANUFACTURERS).sort(), 'mfg'); 
        this.setupInput('fb-hp', AI_TRAINING_DATA.DATA.HP, 'hp'); 
        this.setupInput('fb-volt', AI_TRAINING_DATA.DATA.VOLT, 'volt'); 
        this.setupInput('fb-phase', AI_TRAINING_DATA.DATA.PHASE, 'phase'); 
        this.setupInput('fb-enc', Object.keys(AI_TRAINING_DATA.ENCLOSURES).sort(), 'enc'); // v1.52

        const lvBtn = document.getElementById('fb-low-volt-btn'); 
        if (this.lockout.has(`${id}:cat_low`)) { lvBtn.className = 'keyword-toggle disabled-overlay'; lvBtn.innerText = "✓ Reported as Low Voltage"; lvBtn.onclick = null; } 
        else { lvBtn.className = 'keyword-toggle'; lvBtn.innerText = "⚡ Report as Low Voltage / Control Only"; lvBtn.onclick = () => lvBtn.classList.toggle('selected'); } 
        
        this.generateKeywordButtons(); 
        document.getElementById('feedback-modal').classList.add('active-modal'); 
    }

    static setupInput(elId, data, paramKey) { 
        const el = document.getElementById(elId); 
        el.innerHTML = '<option value="" disabled selected>Select Correct...</option><option value="Varied">Varied / Multiple</option>'; // v1.52: Added Varied
        data.forEach(d => el.add(new Option(d, d))); 
        if (this.lockout.has(`${this.currentId}:p_${paramKey}`)) { el.disabled = true; el.title = "Feedback already submitted"; } else { el.disabled = false; el.title = ""; } 
    }

    static generateKeywordButtons() { 
        // v1.52: Dynamic Keyword Logic (Match badges)
        const input = document.getElementById('keywordInput').value; 
        const container = document.getElementById('keyword-cluster'); 
        const wrapper = document.getElementById('keyword-feedback-area'); 
        container.innerHTML = ''; 
        
        // Parse current keywords just like SearchEngine does
        const keywords = input.split(',').map(s=>s.trim().toUpperCase()).filter(s=>s.length > 0); 
        
        if (keywords.length === 0) { 
            wrapper.style.display = 'none'; 
        } else { 
            wrapper.style.display = 'block'; 
            keywords.forEach(k => { 
                if (this.lockout.has(`${this.currentId}:kw_${k}`)) return; 
                const btn = document.createElement('button'); 
                btn.className = 'keyword-toggle'; 
                btn.innerText = `NOT "${k}"`; 
                btn.onclick = () => btn.classList.toggle('selected'); 
                btn.dataset.kw = k; 
                container.appendChild(btn); 
            }); 
        } 
    }

    static async submit() { 
        const corrections = {}; 
        const mfg = document.getElementById('fb-mfg').value; if(mfg) { corrections.mfg = mfg; this.lockout.add(`${this.currentId}:p_mfg`); } 
        const hp = document.getElementById('fb-hp').value; if(hp) { corrections.hp = hp; this.lockout.add(`${this.currentId}:p_hp`); } 
        const volt = document.getElementById('fb-volt').value; if(volt) { corrections.volt = volt; this.lockout.add(`${this.currentId}:p_volt`); } 
        const phase = document.getElementById('fb-phase').value; if(phase) { corrections.phase = phase; this.lockout.add(`${this.currentId}:p_phase`); } 
        const enc = document.getElementById('fb-enc').value; if(enc) { corrections.enc = enc; this.lockout.add(`${this.currentId}:p_enc`); } // v1.52

        if(document.getElementById('fb-low-volt-btn').classList.contains('selected')) { corrections.category = 'low_voltage'; this.lockout.add(`${this.currentId}:cat_low`); } 
        
        const badKeywords = []; 
        document.querySelectorAll('.keyword-toggle.selected').forEach(btn => { badKeywords.push(btn.dataset.kw); this.lockout.add(`${this.currentId}:kw_${btn.dataset.kw}`); }); 
        if (badKeywords.length > 0) corrections.reject_keywords = badKeywords; 
        
        if (Object.keys(corrections).length === 0) return alert("Please select a correction."); 
        
        const payload = { records: [{ fields: { 'Panel ID': this.currentId, 'Vote': 'Down', 'User': localStorage.getItem('cox_user'), 'Corrections': JSON.stringify(corrections) } }] }; 
        await fetch(`${WORKER_URL}?target=FEEDBACK`, { method: 'POST', headers: { ...AuthService.headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
        this.close(); 
        alert("Thank you! System will learn from this."); 
    }
    static resetLockout() { this.lockout.clear(); }
    static close() { document.getElementById('feedback-modal').classList.remove('active-modal'); }
}

class SearchEngine {
    static currentResults = [];
    static currentPage = 1;
    static pageSize = 50;

    static perform() {
        FeedbackService.resetLockout();

        const rawKeywords = document.getElementById('keywordInput').value.split(',').map(s=>s.trim().toUpperCase()).filter(s=>s.length);
        const expandedKeywords = rawKeywords.map(k => {
            for (const [key, group] of Object.entries(AI_TRAINING_DATA.ALIASES)) {
                if (group.includes(k)) return group; 
            }
            return [k]; 
        });

        const cat = document.getElementById('catInput').value; 
        const crit = { kw: rawKeywords, mfg: document.getElementById('mfgInput').value, hp: document.getElementById('hpInput').value, volt: document.getElementById('voltInput').value, phase: document.getElementById('phaseInput').value, enc: document.getElementById('encInput').value };
        let res = [];
        window.LOCAL_DB.forEach(r => {
            let w = 0, p = true, hpV = false, miss = 0;
            if (cat === 'Standard') { if (r.category === 'low_voltage') return; } 
            else if (cat === 'LowVoltage') { if (r.category !== 'low_voltage') return; }
            
            if(crit.mfg !== "Any") { if (r.mfg === crit.mfg) { w += 10000; } else if (r.desc.includes(crit.mfg)) { w += 1000; } else { return; } }
            if(crit.hp !== "Any") { const strictMatch = (r.hp && parseFloat(r.hp) === parseFloat(crit.hp)); const safetyRegex = new RegExp(`\\b${crit.hp}\\s*(?:HP|H\\.P|H|KW)\\b`, 'i'); const safetyMatch = safetyRegex.test(r.desc); if (strictMatch) { w += 5000; } else if (safetyMatch) { w += 2000; } else { return; } }
            if(crit.volt!=="Any") { if(!r.volt || !r.volt.includes(crit.volt)) return; w += 500; }
            if(crit.phase!=="Any") { if(r.phase!==crit.phase) return; w += 500; }
            if(crit.enc!=="Any") { if(r.enc!==crit.enc) return; w += 500; }
            
            if(expandedKeywords.length) { 
                const text = (r.id + " " + r.desc).toUpperCase();
                const allGroupsMatch = expandedKeywords.every(group => {
                    return group.some(alias => {
                        const cleanAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
                        const regex = new RegExp(`\\b${cleanAlias}\\b`, 'i');
                        return regex.test(text);
                    });
                });

                if(!allGroupsMatch) return; 
                w+=10; 
            }

            if(!r.pdfUrl) w -= 1000000; 
            r.w=w; r.p=p; r.hpV=hpV; res.push(r);
        });
        res.sort((a,b) => { if(a.w !== b.w) return b.w - a.w; return b.id.localeCompare(a.id, undefined, {numeric:true, sensitivity:'base'}); });
        
        this.currentResults = res;
        this.currentPage = 1;
        this.renderCurrentPage(crit);
        
        document.getElementById('pagination-footer').style.display = res.length > 0 ? 'flex' : 'none';
        
        UI.toggleSearch(false);
    }

    static renderCurrentPage(crit) {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.currentResults.slice(start, end);
        
        const area = document.getElementById('results-area');
        area.style.opacity = '0';
        
        setTimeout(() => {
            UI.render(pageData, crit || {}, this.currentResults.length);
            this.updateControls();
            area.style.opacity = '1';
            document.getElementById('results-scroll-area').scrollTop = 0;
        }, 150);
    }

    static updateControls() {
        const total = this.currentResults.length;
        const totalPages = Math.ceil(total / this.pageSize);
        
        document.getElementById('page-prev').disabled = (this.currentPage === 1);
        document.getElementById('page-next').disabled = (this.currentPage === totalPages || total === 0);
        
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(start + this.pageSize - 1, total);
        
        document.getElementById('page-info').innerText = total > 0 
            ? `${start}-${end} of ${total}` 
            : 'No Results';
    }

    static nextPage() {
        if ((this.currentPage * this.pageSize) < this.currentResults.length) {
            this.currentPage++;
            this.renderCurrentPage();
        }
    }

    static prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderCurrentPage();
        }
    }
}

class PdfExporter {
    static async export() {
        if (!PdfViewer.doc) return alert("No PDF loaded!");
        const btn = document.querySelector('button[onclick="PdfExporter.export()"]');
        const origText = btn.innerText; btn.innerText = "⏳ PROCESSING..."; btn.disabled = true;
        try {
            const existingPdfBytes = await fetch(PdfViewer.currentBlobUrl).then(res => res.arrayBuffer());
            const mainPdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
            const compositeDoc = await PDFLib.PDFDocument.create();
            
            let coverPage;
            if (window.TEMPLATE_BYTES) {
                const templateDoc = await PDFLib.PDFDocument.load(window.TEMPLATE_BYTES.slice(0));
                const [embeddedTemplate] = await compositeDoc.copyPages(templateDoc, [0]);
                coverPage = compositeDoc.addPage(embeddedTemplate);
            } else {
                const [origPage1] = await compositeDoc.copyPages(mainPdfDoc, [0]);
                coverPage = compositeDoc.addPage(origPage1);
            }

            if (mainPdfDoc.getPageCount() > 1) {
                const remainingIndices = Array.from({ length: mainPdfDoc.getPageCount() - 1 }, (_, i) => i + 1);
                const remainingPages = await compositeDoc.copyPages(mainPdfDoc, remainingIndices);
                
                let infoImg, stdImg;
                if(window.BORDER_INFO_BYTES) infoImg = await compositeDoc.embedPng(window.BORDER_INFO_BYTES.slice(0));
                if(window.BORDER_STD_BYTES) stdImg = await compositeDoc.embedPng(window.BORDER_STD_BYTES.slice(0));

                remainingPages.forEach((p, idx) => {
                    const newPage = compositeDoc.addPage(p);
                    const { width, height } = newPage.getSize();
                    if (idx === 0 && infoImg) { newPage.drawImage(infoImg, { x: 0, y: 0, width, height }); } 
                    else if (stdImg) { newPage.drawImage(stdImg, { x: 0, y: 0, width, height }); }
                });
            }

            const pages = compositeDoc.getPages();
            const fontTimes = await compositeDoc.embedFont(PDFLib.StandardFonts.TimesRoman); 
            const fontCourier = await compositeDoc.embedFont(PDFLib.StandardFonts.Courier);

            pages.forEach((page, index) => {
                const pdfWidth = page.getWidth(); const pdfHeight = page.getHeight();
                const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${index + 1}"]`);
                if (wrapper) {
                    const container = wrapper.querySelector('.pdf-content-container');
                    const zones = container.querySelectorAll('.redaction-box');
                    zones.forEach(box => {
                        const relX = box.offsetLeft / container.offsetWidth; 
                        const relY = box.offsetTop / container.offsetHeight;
                        const relW = box.offsetWidth / container.offsetWidth; 
                        const relH = box.offsetHeight / container.offsetHeight;
                        
                        const drawX = relX * pdfWidth; const drawH = relH * pdfHeight;
                        const drawY = pdfHeight - (relY * pdfHeight) - drawH; const drawW = relW * pdfWidth;
                        
                        const isTransparent = box.dataset.transparent === "true";

                        if ((!window.TEMPLATE_BYTES || index > 0) && !isTransparent) {
                             page.drawRectangle({ x: drawX, y: drawY, width: drawW, height: drawH, color: PDFLib.rgb(1,1,1), borderColor: PDFLib.rgb(1,1,1), borderWidth: 0 });
                        }

                        const text = box.querySelector('span')?.innerText || "";
                        if (text) { 
                            const fontSizeStr = box.style.fontSize; const fontSize = parseInt(fontSizeStr) || 12;
                            const textWidth = fontTimes.widthOfTextAtSize(text, fontSize); 
                            
                            // v1.49: Use Visual Alignment for PDF drawing
                            let textX = drawX;
                            if (box.style.textAlign === 'center') textX = drawX + (drawW/2) - (textWidth/2);
                            else if (box.style.textAlign === 'right') textX = drawX + drawW - textWidth;

                            const textY = drawY + (drawH/2) - (fontSize/4); 
                            
                            let fontToUse = fontTimes;
                            if (box.style.fontFamily.includes('Courier')) fontToUse = fontCourier;

                            page.drawText(text, { x: textX, y: textY, size: fontSize, font: fontToUse, color: PDFLib.rgb(0,0,0) }); 
                            if (box.dataset.decoration === 'underline') {
                                page.drawLine({ start: { x: textX, y: textY - 2 }, end: { x: textX + textWidth, y: textY - 2 }, thickness: 1, color: PDFLib.rgb(0,0,0) });
                            }
                        }
                    });
                }
            });

            const pdfBytes = await compositeDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `redacted_${new Date().getTime()}.pdf`; link.click();
        } catch (e) { console.error(e); alert("Export Failed: " + e.message); } finally { btn.innerText = origText; btn.disabled = false; }
    }
}

class PdfViewer {
    static doc = null; static currentScale = 1.1; static url = ""; static currentBlobUrl = "";
    static async load(url) {
        this.url = url;
        document.getElementById('pdf-fallback').style.display = 'none'; document.getElementById('pdf-toolbar').style.display = 'flex';
        document.getElementById('custom-pdf-viewer').style.display = 'flex'; document.getElementById('pdf-viewer-frame').style.display = 'none';
        const proxyUrl = `${WORKER_URL}?target=pdf&url=${encodeURIComponent(url)}`;
        const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
        if (!resp.ok) throw new Error(`Fetch Error: ${resp.status}`);
        const blob = await resp.blob();
        if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
        this.currentBlobUrl = URL.createObjectURL(blob);
        const task = pdfjsLib.getDocument(this.currentBlobUrl);
        this.doc = await task.promise; 

        // v1.58: Check mobile on load
        if (window.innerWidth < 768) {
             this.currentScale = 0.8;
             // Also auto-collapse the search panel on mobile for better view
             UI.toggleSearch(true); // true = collapsed
        } else {
             this.currentScale = 1.1;
        }

        this.renderStack(); 
    }
    static print() {
        if (!this.currentBlobUrl) return alert("No PDF loaded to print.");
        const iframe = document.createElement('iframe'); iframe.style.display = 'none'; iframe.src = this.currentBlobUrl; document.body.appendChild(iframe);
        iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 2000); };
    }
    static async renderStack() {
        const container = document.getElementById('pdf-main-view'); container.innerHTML = ''; 
        document.getElementById('pdf-zoom-level').innerText = Math.round(this.currentScale * 100) + "%";
        
        let coverDoc = this.doc;
        if (window.TEMPLATE_BYTES) {
             const tTask = pdfjsLib.getDocument(window.TEMPLATE_BYTES.slice(0));
             coverDoc = await tTask.promise;
        }

        let infoImgUrl, stdImgUrl;
        if (window.BORDER_INFO_BYTES) {
            const blob = new Blob([window.BORDER_INFO_BYTES.slice(0)], { type: "image/png" });
            infoImgUrl = URL.createObjectURL(blob);
        }
        if (window.BORDER_STD_BYTES) {
            const blob = new Blob([window.BORDER_STD_BYTES.slice(0)], { type: "image/png" });
            stdImgUrl = URL.createObjectURL(blob);
        }

        for (let i = 1; i <= this.doc.numPages; i++) {
            await new Promise(r => setTimeout(r, 10)); 
            let page; let isTemplate = false;
            if (i === 1 && window.TEMPLATE_BYTES && DemoManager.isGeneratorActive) { page = await coverDoc.getPage(1); isTemplate = true; } else { page = await this.doc.getPage(i); }

            const viewport = page.getViewport({ scale: this.currentScale });
            const wrapper = document.createElement('div'); wrapper.className = 'pdf-page-wrapper';
            // v1.44 FIX: Wrapper width fits content, but height is now flexible (toolbar + content)
            wrapper.style.width = Math.floor(viewport.width) + "px"; 
            wrapper.dataset.pageNumber = i; 
            
            // 1. Inject Toolbar (Stacked on top via Flexbox in CSS)
            const toolbar = document.createElement('div');
            toolbar.className = 'page-toolbar';
            toolbar.innerHTML = `
                <span>PAGE ${i}</span>
                <select class="page-profile-select" onchange="LayoutScanner.updatePageProfile(${i}, this.value)">
                    <option value="AUTO">✨ Auto (Detected)</option>
                    <option value="TITLE">🏷️ Title Sheet</option>
                    <option value="INFO">📝 Info / Notes</option>
                    <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Std)</option>
                    <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Land)</option>
                    <option value="GENERAL">📐 General</option>
                </select>
            `;
            wrapper.appendChild(toolbar);

            // 2. Inject Content Container (Holds Canvas + Redaction Layer)
            const contentContainer = document.createElement('div');
            contentContainer.className = 'pdf-content-container';
            contentContainer.style.width = Math.floor(viewport.width) + "px";
            contentContainer.style.height = Math.floor(viewport.height) + "px";

            const canvas = document.createElement('canvas'); canvas.className = 'pdf-page-canvas';
            canvas.width = viewport.width; canvas.height = viewport.height; 
            
            if (DemoManager.isGeneratorActive && !isTemplate) { 
                const img = document.createElement('img'); img.className = 'pdf-border-overlay';
                if (i === 2 && infoImgUrl) img.src = infoImgUrl; else if (i > 2 && stdImgUrl) img.src = stdImgUrl;
                if (img.src) contentContainer.appendChild(img);
            }

            const rLayer = document.createElement('div'); rLayer.className = 'redaction-layer';
            if(document.body.classList.contains('demo-mode')) rLayer.classList.add('editing');
            
            contentContainer.appendChild(canvas); 
            contentContainer.appendChild(rLayer); 
            wrapper.appendChild(contentContainer); 
            container.appendChild(wrapper); 

            page.render({ canvasContext: canvas.getContext('2d'), viewport });
        }
        if(DemoManager.isGeneratorActive) { 
            setTimeout(() => {
                LayoutScanner.refreshProfileOptions();
                LayoutScanner.scanAllPages();
            }, 500); 
        }
    }
    static zoom(delta) { this.currentScale+=delta; if(this.currentScale<0.2) this.currentScale=0.2; this.renderStack(); }
}

class PdfController {
    static load(id, url) {
        document.getElementById('pdf-placeholder-text').style.display = 'none';
        const rec = window.ID_MAP.get(id);
        if(rec && rec.displayId) { document.getElementById('demo-panel-id').value = rec.displayId; }
        if (!url) { document.getElementById('pdf-fallback').style.display = 'block'; return; }
        PdfViewer.load(url);
    }
}

class UI {
    static init() { if(localStorage.getItem('cox_theme') === 'dark') { document.body.classList.add('dark-mode'); } window.addEventListener('mousemove', (e) => RedactionManager.handleDrag(e)); window.addEventListener('mouseup', () => RedactionManager.endDrag()); document.addEventListener('click', (e) => { const menu = document.getElementById('main-menu'); const btn = document.querySelector('.menu-btn'); if (menu.classList.contains('visible') && !menu.contains(e.target) && !btn.contains(e.target)) { menu.classList.remove('visible'); } }); }
    static toggleDarkMode() { document.body.classList.toggle('dark-mode'); localStorage.setItem('cox_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); }
    static handleEnter(e) { if(e.key==='Enter') SearchEngine.perform(); }
    static resetSearch() { document.querySelectorAll('select').forEach(s=>s.value="Any"); document.getElementById('keywordInput').value=''; this.toggleSearch(true); }
    static closeMobilePreview() { document.body.classList.remove('viewing-pdf'); }
    static toggleLeftSidebar() { document.getElementById('sidebar-left').classList.toggle('collapsed'); document.getElementById('toggle-left').innerText = document.getElementById('sidebar-left').classList.contains('collapsed') ? '›' : '‹'; }
    static toggleRightSidebar() { const el = document.getElementById('sidebar-right'); el.classList.toggle('collapsed'); document.getElementById('toggle-right').innerText = el.classList.contains('collapsed') ? '⚙️' : '›'; }
    static toggleSearch(e) { const c = document.getElementById('search-controls'); if(!c) return; if(e) { c.classList.remove('collapsed'); document.getElementById('refine-btn-area').classList.remove('visible'); } else { c.classList.add('collapsed'); document.getElementById('refine-btn-area').classList.add('visible'); } }
    static toggleMenu() { document.getElementById('main-menu').classList.toggle('visible'); }
    static pop() { const m = document.getElementById('mfgInput'); const cv = m.value; const whitelist = Object.keys(AI_TRAINING_DATA.MANUFACTURERS); const fullList = new Set([...whitelist, ...window.FOUND_MFGS]); const cleanList = Array.from(fullList).filter(mf => whitelist.includes(mf)).sort(); m.innerHTML='<option value="Any">Any</option>'; cleanList.forEach(v=>m.add(new Option(v,v))); m.value=cv; ['hp','volt','phase','enc'].forEach(k=>{ const s=document.getElementById(k+'Input'); if(!s)return; const d=(k==='enc')?Object.keys(AI_TRAINING_DATA.ENCLOSURES):AI_TRAINING_DATA.DATA[k.toUpperCase()]; s.innerHTML='<option value="Any">Any</option>'; d.forEach(v=>s.add(new Option(v,v))); }); }
    static render(res, crit, totalCount) { const a = document.getElementById('results-area'); a.innerHTML = `<div style="padding:5px;font-size:12px;opacity:0.7;">Found ${totalCount || res.length} records</div>`; const critJson = JSON.stringify(crit).replace(/"/g, '&quot;'); res.forEach(i => { const h = TheHealer.healedData[i.id]; let b = ''; if(i.category === 'low_voltage') b+=`<span class="hud-badge match-orange">LOW VOLT</span>`; if (crit.mfg !== "Any" && i.mfg) { const isMatch = (i.mfg === crit.mfg); const style = isMatch ? 'match-green' : 'match-orange'; b += `<span class="hud-badge ${style}">${h?.mfg || i.mfg}</span>`; } if(crit.volt !== "Any") { if(i.volt) b+=`<span class="hud-badge match-green">${h?.volt||i.volt}V</span>`; else b+=`<span class="hud-badge match-orange">? V</span>`; } if(crit.phase !== "Any") { if(i.phase) b+=`<span class="hud-badge match-green">${h?.phase||i.phase}PH</span>`; else b+=`<span class="hud-badge match-orange">? PH</span>`; } if(crit.hp !== "Any") { if(i.hp) { if (parseFloat(i.hp) === parseFloat(crit.hp)) b+=`<span class="hud-badge match-green">${h?.hp||i.hp} HP</span>`; else b+=`<span class="hud-badge match-orange">${h?.hp||i.hp} HP</span>`; } else { b+=`<span class="hud-badge match-orange">? HP</span>`; } } if(crit.enc !== "Any" && i.enc) { b+=`<span class="hud-badge match-green">${h?.enc||i.enc}</span>`; } if(crit.kw && crit.kw.length > 0) { crit.kw.forEach(k => { if(crit.mfg !== "Any" && i.mfg === k.toUpperCase()) return; b += `<span class="hud-badge match-keyword">${k.toUpperCase()}</span>`; }); } if(!i.pdfUrl) b += `<span class="hud-badge no-pdf">NO PDF</span>`; const c = document.createElement('div'); c.className = `record-card ${!i.p?'varied-result':''}`; c.innerHTML = `<div class="panel-name">${i.displayId || i.id}</div><div class="badge-row">${b}</div><div class="card-actions"><button class="thumb-btn up" onclick="event.stopPropagation();FeedbackService.up('${i.id}',this, ${critJson})">👍</button><button class="thumb-btn down" onclick="event.stopPropagation();FeedbackService.down('${i.id}')">👎</button></div>`; c.onclick = () => { document.querySelectorAll('.record-card').forEach(x=>x.classList.remove('active-view')); c.classList.add('active-view'); PdfController.load(i.id, i.pdfUrl); }; a.appendChild(c); }); }
}

window.UI = UI;

window.LOCAL_DB = []; window.ID_MAP = new Map(); window.FOUND_MFGS = new Set();
document.addEventListener('DOMContentLoaded', () => { 
    try {
        UI.init(); 
        if(AuthService.init()) { 
            DataLoader.preload(); 
        }
    } catch(e) {
        console.error("Critical Init Error:", e);
        alert("System failed to initialize. Please clear cache and reload.");
    }
});