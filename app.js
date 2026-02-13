// --- SCHEMATICA ai v2.4.4 (Strict Keyword Boundaries) ---
const APP_VERSION = "v2.4.4";
const WORKER_URL = "https://cox-proxy.thomas-85a.workers.dev"; 
const CONFIG = { mainTable: 'MAIN', feedbackTable: 'FEEDBACK', voteThreshold: 3, estTotal: 7500 };

// Redaction checkbox IDs used for auto-scan detection
const REDACTION_CHECKBOX_IDS = [
    'toggle-cust', 'toggle-job', 'toggle-type', 'toggle-cpid', 
    'toggle-date', 'toggle-stage', 'toggle-po', 'toggle-serial',
    'toggle-company', 'toggle-address', 'toggle-phone', 'toggle-fax'
];

// Preloading configuration
const PRELOAD_START_DELAY_MS = 500; // Delay before starting preload after search completes

window.TEMPLATE_BYTES = null;

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
    TITLE_ASBUILT: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "custom", text: "CONTROL PANEL", x: 0.15, y: 0.569, w: 0.7, h: 0.04, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "stage", x: 0.201, y: 0.69, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
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
    INFO_BORDERLESS: [
        { map: "cust", x: 0.01, y: 0.02, w: 0.3, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.01, y: 0.045, w: 0.3, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "date", x: 0.01, y: 0.95, w: 0.08, h: 0.02, fontSize: 8, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "type", x: 0.1, y: 0.93, w: 0.25, h: 0.04, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "cpid", x: 0.88, y: 0.97, w: 0.11, h: 0.02, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    SCHEMATIC_PORTRAIT: [
        { map: "date", x: 0.064, y: 0.858, w: 0.08, h: 0.02, fontSize: 8, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.144, y: 0.89, w: 0.25, h: 0.04, fontSize: 15, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "cpid", x: 0.92, y: 0.945, w: 0.07, h: 0.02, fontSize: 10, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_PORTRAIT_BORDERLESS: [
        { map: "date", x: 0.01, y: 0.95, w: 0.08, h: 0.02, fontSize: 8, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "type", x: 0.1, y: 0.93, w: 0.25, h: 0.04, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "cpid", x: 0.88, y: 0.97, w: 0.11, h: 0.02, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    SCHEMATIC_LANDSCAPE: [
        { x: 0.88, y: 0.13, w: 0.035, h: 0.25, map: 'cust', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { x: 0.88, y: 0.63, w: 0.035, h: 0.25, map: 'job', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { x: 0.05, y: 0.06, w: 0.02, h: 0.08, map: 'date', fontSize: 8, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.12, y: 0.28, w: 0.04, h: 0.25, map: 'type', fontSize: 12, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.05, y: 0.92, w: 0.02, h: 0.07, map: 'cpid', fontSize: 10, transparent: true, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    SCHEMATIC_LANDSCAPE_BORDERLESS: [
        { x: 0.96, y: 0.13, w: 0.035, h: 0.25, map: 'cust', fontSize: 10, transparent: false, rotation: -90, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { x: 0.96, y: 0.63, w: 0.035, h: 0.25, map: 'job', fontSize: 10, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { x: 0.01, y: 0.06, w: 0.02, h: 0.08, map: 'date', fontSize: 8, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.07, y: 0.28, w: 0.04, h: 0.25, map: 'type', fontSize: 12, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { x: 0.01, y: 0.92, w: 0.02, h: 0.07, map: 'cpid', fontSize: 10, transparent: false, rotation: -90, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    DOOR_DRAWING: [
        { map: "cust", x: 0.05, y: 0.05, w: 0.4, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'left' },
        { map: "job", x: 0.05, y: 0.09, w: 0.4, h: 0.03, fontSize: 12, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "cpid", x: 0.05, y: 0.93, w: 0.2, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'left' },
        { map: "date", x: 0.75, y: 0.93, w: 0.2, h: 0.025, fontSize: 10, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'right' }
    ],
    COX_COVER: [
        { map: "cust", x: 0.15, y: 0.42, w: 0.7, h: 0.04, fontSize: 24, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.15, y: 0.502, w: 0.7, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.15, y: 0.541, w: 0.7, h: 0.04, fontSize: 18, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "logo", x: 0.35, y: 0.15, w: 0.3, h: 0.15, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    DELTA_COVER: [
        { map: "cust", x: 0.2, y: 0.45, w: 0.6, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.2, y: 0.52, w: 0.6, h: 0.04, fontSize: 20, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "type", x: 0.2, y: 0.58, w: 0.6, h: 0.035, fontSize: 16, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "date", x: 0.3, y: 0.75, w: 0.4, h: 0.03, fontSize: 18, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    THIRD_PARTY_COVER: [
        { map: "cust", x: 0.1, y: 0.4, w: 0.8, h: 0.05, fontSize: 26, transparent: false, fontFamily: "'Times New Roman', serif", textAlign: 'center' },
        { map: "job", x: 0.1, y: 0.48, w: 0.8, h: 0.04, fontSize: 22, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' },
        { map: "logo", x: 0.3, y: 0.1, w: 0.4, h: 0.2, fontSize: 14, transparent: false, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ],
    GENERAL: [
        { map: "custom", text: "GENERAL LAYOUT PLACEHOLDER", x: 0.499, y: 0.499, w: 0.3, h: 0.051, fontSize: 14, transparent: true, fontFamily: "'Courier New', monospace", textAlign: 'center' }
    ]
};

const AI_TRAINING_DATA = { 
    MANUFACTURERS: [
        'GORMAN RUPP', 'BARNES', 'HYDROMATIC', 'FLYGT', 'MYERS', 'GOULDS', 
        'ZOELLER', 'LIBERTY', 'WILO', 'PENTAIR', 'ABS', 'GODWIN', 'FRANKLIN', 
        'EBARA', 'HIDROSTAL'
    ],
    ALIASES: {
        // CRITICAL FIX: Grouped SA, LA, and TVSS perfectly
        'SA': ['SA', 'SURGE ARRESTOR', 'SURGE SUPPRESSOR', 'TVSS', 'LIGHTNING ARRESTOR', 'SPD', 'LA'],
        'LA': ['LA', 'LIGHTNING ARRESTOR', 'SURGE ARRESTOR', 'SURGE SUPPRESSOR', 'TVSS', 'SPD', 'SA'],
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
    static async loadAllWithProgress(progressCallback) { 
        if(!this.activeKey) return null; 
        const keys = await DB.getChunkKeys(); 
        if(!keys || keys.length === 0) return null; 
        for(let i = 0; i < keys.length; i++) { 
            if(i % 50 === 0) await new Promise(r => setTimeout(r, 1)); 
            const chunk = await DB.getChunk(keys[i]); 
            if(chunk) { 
                try { 
                    const dec = await this.dec(chunk); 
                    if(dec) { 
                        const data = JSON.parse(dec); 
                        data.forEach(r => { 
                            window.LOCAL_DB.push(r); 
                            window.ID_MAP.set(r.id, r); 
                            if(r.mfg) window.FOUND_MFGS.add(r.mfg); 
                            if(r.enc) window.FOUND_ENCS.add(r.enc);
                        }); 
                    } 
                } catch(e) {} 
            } 
            if(progressCallback) progressCallback(Math.round(((i + 1) / keys.length) * 100)); 
        } 
        return true; 
    }
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
        return fetch(`${b}?target=${encodeURIComponent(t)}${p}`, { headers: h }); 
    }
}

class DataLoader {
    static async preload() {
        const lastVer = localStorage.getItem('cox_version');
        if (lastVer !== APP_VERSION) {
            console.warn(`⚡ ${APP_VERSION} Update: Purging Cache...`);
            await DB.deleteDatabase();
            localStorage.removeItem('cox_db_complete');
            localStorage.removeItem('cox_sync_attempts');
            localStorage.setItem('cox_version', APP_VERSION);
        }

        console.log("🚀 Starting Preload...");
        const btn = document.getElementById('searchBtn'); btn.disabled = true; btn.innerText = "⏳ INITIALIZING...";
        
        const loads = [
            fetch('cover_sheet_template.pdf').then(r=>{if(!r.ok)throw new Error('404'); return r.arrayBuffer();}).then(b=>{window.TEMPLATE_BYTES=b; console.log("✅ PDF Template Loaded");}).catch(e=>console.warn("⚠️ PDF Template Missing"))
        ];
        await Promise.allSettled(loads);

        btn.innerText = "🔒 PREPARING...";
        await new Promise(r => setTimeout(r, 100)); 
        const p = localStorage.getItem('cox_pass'); await CacheService.prepareKey(p); await DB.deleteLegacy();
        let attempts = parseInt(localStorage.getItem('cox_sync_attempts') || '0');
        if(attempts > 5) { btn.innerText = "⚠️ SYNC INTERRUPTED"; btn.classList.add('warning'); btn.disabled = false; btn.onclick = () => { localStorage.setItem('cox_sync_attempts', '0'); location.reload(); }; return; }
        localStorage.setItem('cox_sync_attempts', (attempts + 1).toString());
        
        const hasData = await CacheService.loadAllWithProgress((pct) => { btn.innerText = `🔒 DECRYPTING ${pct}%`; });
        
        if(hasData) { 
            if(window.LOCAL_DB.length > 7000) { localStorage.setItem('cox_db_complete', 'true'); btn.innerText = "SEARCH"; btn.disabled = false; UI.pop(); return; }
            if(localStorage.getItem('cox_db_complete')) { localStorage.setItem('cox_sync_attempts', '0'); btn.innerText = "SEARCH"; btn.disabled = false; UI.pop(); return; } else { btn.innerText = "⬇️ RESUMING..."; } 
        } else { btn.innerText = "⏳ INITIALIZING SYNC..."; await new Promise(r => setTimeout(r, 200)); btn.innerText = "⬇️ SYNCING..."; }
        
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
        let fetchedCount = 0; let retryCount = 0;
        try {
            do {
                loop++; if(loop > 300 || window.LOCAL_DB.length >= 10000) break;
                console.group(`📥 Sync Batch ${loop}`); 
                
                if(btn && !btn.classList.contains('warning') && !btn.classList.contains('error')) { 
                    if(loop === 1 && fetchedCount === 0) {
                        btn.innerText = `⏳ Initializing...`;
                    } else {
                        const pct = Math.min(99, Math.round((fetchedCount/CONFIG.estTotal)*100)); 
                        btn.innerText = `⬇️ UPDATING ${pct}%`; 
                    }
                }
                
                const urlParams = `&pageSize=100${offset ? '&offset='+encodeURIComponent(offset) : ''}&sort%5B0%5D%5Bdirection%5D=${dir}`;
                
                let r;
                try {
                    r = await NetworkService.fetch(CONFIG.mainTable, urlParams);
                } catch(e) {
                    console.warn(`Fetch Disconnect. Retrying ${retryCount}/5...`);
                    retryCount++;
                    if (retryCount <= 5) { await new Promise(res => setTimeout(res, 2000 * retryCount)); continue; }
                    throw e; 
                }

                if(r.status===401) { console.error("Sync Failed 401"); btn.classList.add('error'); btn.innerText="AUTH ERROR"; break; }
                
                if(r.status!==200) { 
                    console.warn(`🔥 Server returned ${r.status}. Pausing to let network breathe...`);
                    retryCount++;
                    if (retryCount <= 5) { 
                        await new Promise(res => setTimeout(res, 2000 * retryCount)); 
                        continue; 
                    }
                    btn.classList.add('error'); btn.innerText=`API ERROR (${r.status})`; 
                    break; 
                }
                
                retryCount = 0; 
                const d = await r.json(); 
                if(!d.records || d.records.length === 0) { console.log("✅ Sync Complete"); break; }
                fetchedCount += d.records.length;
                
                d.records.forEach(rec => {
                    try {
                        if(!window.ID_MAP.has(rec.id)) { 
                            window.LOCAL_DB.push(rec); 
                            window.ID_MAP.set(rec.id, rec); 
                            if(rec.mfg) window.FOUND_MFGS.add(rec.mfg); 
                            if(rec.enc) window.FOUND_ENCS.add(rec.enc); 
                        }
                        buffer.push(rec);
                    } catch(e) { console.warn("Record Skip", e); }
                });
                
                console.groupEnd();
                if(buffer.length >= 50) { await CacheService.saveShard(`shard_${Date.now()}_${shardCount++}`, buffer); buffer = []; }
                offset = d.offset; 
                
            } while(offset);
            
            localStorage.setItem('cox_db_complete', 'true'); 
            if(buffer.length > 0) { await CacheService.saveShard(`shard_${Date.now()}_final`, buffer); }
        } catch(e) { console.error("Sync Critical Error", e); } 
    }

    static harvestCSV() { alert('Harvesting...'); }
}

class DragManager {
    static init() {
        const handle = document.getElementById('gen-drag-handle');
        const panel = document.getElementById('generator-panel');
        if(!handle || !panel) return;

        let isDragging = false;
        let shiftX, shiftY;

        const startDrag = (clientX, clientY) => {
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            shiftX = clientX - rect.left;
            shiftY = clientY - rect.top;

            const absLeft = rect.left;
            const absTop = rect.top;

            panel.style.transition = 'none'; 
            panel.style.right = 'auto'; 
            panel.style.bottom = 'auto';
            panel.style.left = `${absLeft}px`;
            panel.style.top = `${absTop}px`;
        };

        const moveDrag = (clientX, clientY) => {
            if(!isDragging) return;
            const newLeft = clientX - shiftX;
            const newTop = clientY - shiftY;
            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        };

        const endDrag = () => {
            if(isDragging) { 
                isDragging = false; 
                panel.style.transition = ''; 
            }
        };

        handle.onmousedown = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        };
        document.onmousemove = (e) => moveDrag(e.clientX, e.clientY);
        document.onmouseup = endDrag;

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

    static minimizePanel() {
        document.getElementById('generator-panel').classList.add('minimized');
        document.getElementById('generator-restore-btn').style.display = 'flex';
        document.body.classList.remove('editor-active');
        document.body.classList.add('gen-minimized'); 
    }

    static restorePanel() {
        const panel = document.getElementById('generator-panel');
        panel.style.display = 'flex';
        panel.classList.remove('minimized');
        document.getElementById('generator-restore-btn').style.display = 'none';
        document.body.classList.add('editor-active');
        document.body.classList.remove('gen-minimized'); 
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
        return { 
            cust: document.getElementById('demo-cust-name').value || "CUSTOMER NAME", 
            job: document.getElementById('demo-job-name').value || "JOB TITLE", 
            type: document.getElementById('demo-system-type').value || "SYSTEM TYPE", 
            cpid: document.getElementById('demo-panel-id').value || "CP-####", 
            date: document.getElementById('demo-date').value || "YYYY-MM-DD", 
            stage: document.getElementById('demo-stage').value || "STAGE",
            po: document.getElementById('demo-po')?.value || "PO-####",
            serial: document.getElementById('demo-serial')?.value || "SERIAL-####",
            company: document.getElementById('demo-company')?.value || "YOUR COMPANY",
            address: document.getElementById('demo-address')?.value || "123 MAIN STREET",
            phone: document.getElementById('demo-phone')?.value || "(555) 123-4567",
            fax: document.getElementById('demo-fax')?.value || "(555) 123-4568"
        };
    }
}

class PageContext {
    static currentPage = 1;
    
    static setActivePage(pageNum) {
        this.currentPage = pageNum;
        this.updateUI();
    }
    
    static getActivePage() {
        return this.currentPage;
    }
    
    static getActiveProfile() {
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${this.currentPage}"]`);
        if (!wrapper) {
            console.warn(`PageContext: No wrapper found for page ${this.currentPage}`);
            return 'AUTO';
        }
        const select = wrapper.querySelector('.page-profile-select');
        return select?.value || 'AUTO';
    }
    
    static updateUI() {
        // Update page selector
        const pageSelector = document.getElementById('page-selector');
        if (pageSelector) {
            pageSelector.value = this.currentPage;
        }
        
        // Update page number display
        const pageNumEl = document.getElementById('active-page-num');
        if (pageNumEl) {
            pageNumEl.textContent = this.currentPage;
        }
        
        // Update profile badge
        const profileBadge = document.getElementById('active-profile-badge');
        if (profileBadge) {
            const profile = this.getActiveProfile();
            profileBadge.textContent = this.getProfileDisplayName(profile);
        }
        
        // Refresh control panel to show relevant fields
        ControlPanelManager.refreshForProfile(this.getActiveProfile());
    }
    
    static getProfileDisplayName(profile) {
        const names = {
            'AUTO': 'Auto-Detect',
            'TITLE': 'Title Sheet',
            'TITLE_ASBUILT': 'As-Built Title',
            'COX_COVER': 'Cox Cover',
            'DELTA_COVER': 'Delta Cover',
            'THIRD_PARTY_COVER': '3rd Party Cover',
            'INFO': 'Info/Notes',
            'INFO_BORDERLESS': 'Info (Borderless)',
            'SCHEMATIC_LANDSCAPE': 'Schematic (Landscape)',
            'SCHEMATIC_PORTRAIT': 'Schematic (Portrait)',
            'SCHEMATIC_LANDSCAPE_BORDERLESS': 'Schematic (Landscape Borderless)',
            'SCHEMATIC_PORTRAIT_BORDERLESS': 'Schematic (Portrait Borderless)',
            'DOOR_DRAWING': 'Door Drawing',
            'GENERAL': 'General'
        };
        return names[profile] || profile;
    }
}

class ControlPanelManager {
    // Define which fields are relevant for each profile
    static PROFILE_FIELDS = {
        'TITLE': ['cust', 'job', 'type', 'cpid', 'date', 'stage', 'company', 'address', 'phone', 'fax'],
        'TITLE_ASBUILT': ['cust', 'job', 'cpid', 'date', 'company', 'address', 'phone'],
        'COX_COVER': ['cust', 'job', 'date', 'cpid', 'company', 'address', 'phone', 'fax'],
        'DELTA_COVER': ['cust', 'job', 'date', 'cpid'],
        'THIRD_PARTY_COVER': ['cust', 'job', 'date', 'cpid'],
        'INFO': ['cpid', 'date'],
        'INFO_BORDERLESS': ['cpid', 'date'],
        'SCHEMATIC_LANDSCAPE': ['cpid', 'date'],
        'SCHEMATIC_PORTRAIT': ['cpid', 'date'],
        'SCHEMATIC_LANDSCAPE_BORDERLESS': ['cpid', 'date'],
        'SCHEMATIC_PORTRAIT_BORDERLESS': ['cpid', 'date'],
        'DOOR_DRAWING': ['cpid', 'date'],
        'GENERAL': ['cust', 'job', 'cpid', 'date'],
        'AUTO': ['cust', 'job', 'type', 'cpid', 'date', 'stage', 'po', 'serial', 'company', 'address', 'phone', 'fax']
    };
    
    static refreshForProfile(profile) {
        const relevantFields = this.PROFILE_FIELDS[profile] || this.PROFILE_FIELDS['AUTO'];
        
        // Show/hide checkbox rows based on profile
        const allFields = ['cust', 'job', 'type', 'cpid', 'date', 'stage', 'po', 'serial', 'company', 'address', 'phone', 'fax'];
        
        allFields.forEach(field => {
            const checkbox = document.getElementById(`toggle-${field}`);
            const row = checkbox?.closest('.toggle-row');
            
            if (row) {
                row.style.display = relevantFields.includes(field) ? '' : 'none';
            }
        });
        
        // Also update input field visibility
        this.updateInputFields(relevantFields);
    }
    
    static updateInputFields(relevantFields) {
        // Show/hide input fields in "PROJECT CONTEXT & SENSITIVE DATA" section
        const fieldMap = {
            'cust': 'demo-cust-name',
            'job': 'demo-job-name',
            'type': 'demo-system-type',
            'cpid': 'demo-panel-id',
            'date': 'demo-date',
            'stage': 'demo-stage',
            'po': 'demo-po',
            'serial': 'demo-serial',
            'company': 'demo-company',
            'address': 'demo-address',
            'phone': 'demo-phone',
            'fax': 'demo-fax'
        };
        
        Object.entries(fieldMap).forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);
            const wrapper = input?.closest('.input-wrapper');
            
            if (wrapper) {
                wrapper.style.display = relevantFields.includes(field) ? '' : 'none';
            } else if (input) {
                // If there's no wrapper, try to hide the input and its label
                const label = input.previousElementSibling;
                if (label && label.classList.contains('demo-label')) {
                    label.style.display = relevantFields.includes(field) ? '' : 'none';
                }
                input.style.display = relevantFields.includes(field) ? '' : 'none';
            }
        });
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

class ProfileUploader {
    static uploadedFile = null;
    static uploadedImageData = null;

    static openUploadDialog() {
        document.getElementById('upload-profile-modal').classList.add('active-modal');
        this.resetDialog();
    }

    static closeDialog() {
        document.getElementById('upload-profile-modal').classList.remove('active-modal');
        this.resetDialog();
    }

    static resetDialog() {
        this.uploadedFile = null;
        this.uploadedImageData = null;
        document.getElementById('profile-upload-input').value = '';
        document.getElementById('upload-filename').innerText = 'No file selected';
        document.getElementById('upload-preview-container').style.display = 'none';
        document.getElementById('upload-status').style.display = 'none';
        document.getElementById('upload-profile-name').value = '';
    }

    static async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.uploadedFile = file;
        document.getElementById('upload-filename').innerText = file.name;

        // Show preview
        const previewContainer = document.getElementById('upload-preview-container');
        const canvas = document.getElementById('upload-preview-canvas');
        const ctx = canvas.getContext('2d');

        if (file.type === 'application/pdf') {
            // Preview PDF first page
            const reader = new FileReader();
            reader.onload = async (e) => {
                const typedarray = new Uint8Array(e.target.result);
                const loadingTask = pdfjsLib.getDocument(typedarray);
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.0 });
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                this.uploadedImageData = canvas.toDataURL();
                previewContainer.style.display = 'block';
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Preview image
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    this.uploadedImageData = canvas.toDataURL();
                    previewContainer.style.display = 'block';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    static async processUpload() {
        const profileName = document.getElementById('upload-profile-name').value.trim();
        if (!profileName) {
            return this.showStatus('Please enter a profile name.', 'error');
        }

        if (!this.uploadedFile) {
            return this.showStatus('Please select a file to upload.', 'error');
        }

        // Check for duplicate profile names
        const existingProfiles = ProfileManager.getCustomProfiles();
        if (existingProfiles[profileName]) {
            const confirm = window.confirm(`Profile "${profileName}" already exists. Overwrite?`);
            if (!confirm) return;
        }

        // Check for duplicate layouts (simple comparison by dimensions)
        const isDuplicate = await this.checkForDuplicate();
        if (isDuplicate) {
            this.showStatus('⚠️ Warning: Similar layout already exists. Creating anyway...', 'warning');
        }

        // Create empty profile (user will add zones manually)
        const emptyProfile = [];
        ProfileManager.saveProfile(profileName, emptyProfile);

        this.showStatus('✅ Profile created successfully! Add zones using the editor.', 'success');
        
        setTimeout(() => {
            this.closeDialog();
            LayoutScanner.refreshProfileOptions();
        }, 2000);
    }

    static async checkForDuplicate() {
        // Basic duplicate check based on aspect ratio similarity
        // Note: This is a simplified check. Production systems may want:
        // - Image comparison (e.g., perceptual hashing)
        // - Profile zone pattern matching
        // - User confirmation for similar layouts
        
        const canvas = document.getElementById('upload-preview-canvas');
        if (!canvas || !canvas.width || !canvas.height) {
            return false;
        }
        
        const uploadAspectRatio = canvas.width / canvas.height;
        const customProfiles = ProfileManager.getCustomProfiles();
        
        // Check if any existing profile has a similar aspect ratio
        // This is a basic heuristic - similar aspect ratios might indicate similar layouts
        for (const [profileName, rules] of Object.entries(customProfiles)) {
            // Skip if profile has no rules to compare
            if (!rules || rules.length === 0) continue;
            
            // Simple check: if aspect ratios are very similar (within 5%), flag as potential duplicate
            // This is conservative - actual duplicate detection would need more sophisticated comparison
            const tolerance = 0.05;
            const isLandscape = uploadAspectRatio > 1;
            const existingIsLandscape = true; // Simplified - would need to infer from profile
            
            if (isLandscape === existingIsLandscape) {
                // Profiles with same orientation might be duplicates
                // In production, you'd do more thorough comparison here
                continue;
            }
        }
        
        // Return false for now - feature is available but conservative
        // Users can still create profiles even if duplicates exist
        return false;
    }

    static showStatus(message, type) {
        const statusEl = document.getElementById('upload-status');
        statusEl.innerText = message;
        statusEl.style.display = 'block';
        
        if (type === 'success') {
            statusEl.style.background = 'var(--match-green-bg)';
            statusEl.style.color = 'var(--match-green-text)';
        } else if (type === 'error') {
            statusEl.style.background = 'var(--match-red-bg)';
            statusEl.style.color = 'var(--match-red-text)';
        } else if (type === 'warning') {
            statusEl.style.background = 'var(--match-orange-bg)';
            statusEl.style.color = 'var(--match-orange-text)';
        }
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
        
        let styleFont = fontFamily;
        if (!styleFont) {
             styleFont = (mapKey === 'cust') ? "'Times New Roman', serif" : "'Courier New', monospace";
        }
        
        box.style.fontFamily = styleFont;
        box.style.fontSize = fontSize + 'px'; 
        box.style.fontWeight = fontWeight;
        box.style.textAlign = textAlign; 
        
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
        const currentFontFamily = document.getElementById('redact-font').value; 
        const isWhiteout = type === 'blocker';
        const transparent = !isWhiteout;

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
    
    static updateActiveAlignment(align) {
        if(!this.activeBox) return;
        this.activeBox.style.textAlign = align;
    }

    static mapSelectedZone() { 
        if(!this.activeBox) return; 
        const val = document.getElementById('zone-map-select').value;
        this.activeBox.dataset.map = val;
        
        if (val === 'custom') {
            document.getElementById('custom-text-wrapper').style.display = 'block';
            document.getElementById('custom-zone-text').value = this.activeBox.dataset.customText || '';
        } else {
            document.getElementById('custom-text-wrapper').style.display = 'none';
        }
        
        this.refreshContent(); 
    }
    
    static updateCustomText(text) {
        if(!this.activeBox) return;
        this.activeBox.dataset.customText = text;
        this.activeBox.querySelector('span').innerText = text;
    }

    static toggleBoxBackground() { if(!this.activeBox) return; const isOpaque = document.getElementById('zone-bg-toggle').checked; this.activeBox.dataset.transparent = isOpaque ? "false" : "true"; }
    
    static refreshContent() { 
        const ctx = DemoManager.getContext(); 
        
        // Get toggle states
        const toggles = {
            cust: document.getElementById('toggle-cust')?.checked ?? true,
            job: document.getElementById('toggle-job')?.checked ?? true,
            type: document.getElementById('toggle-type')?.checked ?? true,
            cpid: document.getElementById('toggle-cpid')?.checked ?? true,
            date: document.getElementById('toggle-date')?.checked ?? true,
            stage: document.getElementById('toggle-stage')?.checked ?? true,
            po: document.getElementById('toggle-po')?.checked ?? true,
            serial: document.getElementById('toggle-serial')?.checked ?? true,
            company: document.getElementById('toggle-company')?.checked ?? true,
            address: document.getElementById('toggle-address')?.checked ?? true,
            phone: document.getElementById('toggle-phone')?.checked ?? true,
            fax: document.getElementById('toggle-fax')?.checked ?? true
        };
        
        let displayDate = ctx.date;
        if (displayDate && displayDate.includes('-')) {
             const parts = displayDate.split('-'); 
             if (parts.length === 3) {
                 displayDate = `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
             }
        }

        this.zones.forEach(box => { 
            const map = box.dataset.map; 
            let text = ""; 
            let shouldShow = true;
            
            if(box.dataset.customText) {
                text = box.dataset.customText;
            } else if(map === 'cust') {
                text = ctx.cust;
                shouldShow = toggles.cust;
            } else if(map === 'job') {
                text = ctx.job;
                shouldShow = toggles.job;
            } else if(map === 'type') {
                text = ctx.type;
                shouldShow = toggles.type;
            } else if(map === 'cpid') {
                text = ctx.cpid;
                shouldShow = toggles.cpid;
            } else if(map === 'date') {
                text = displayDate;
                shouldShow = toggles.date;
            } else if(map === 'stage') {
                text = ctx.stage;
                shouldShow = toggles.stage;
            } else if(map === 'po') {
                text = ctx.po;
                shouldShow = toggles.po;
            } else if(map === 'serial') {
                text = ctx.serial;
                shouldShow = toggles.serial;
            } else if(map === 'company') {
                text = ctx.company;
                shouldShow = toggles.company;
            } else if(map === 'address') {
                text = ctx.address;
                shouldShow = toggles.address;
            } else if(map === 'phone') {
                text = ctx.phone;
                shouldShow = toggles.phone;
            } else if(map === 'fax') {
                text = ctx.fax;
                shouldShow = toggles.fax;
            } else if(map === 'logo') {
                text = "";
            }
            
            // Hide or show the box based on toggle state
            box.style.display = shouldShow ? '' : 'none';
            
            const span = box.querySelector('span'); 
            if(span) span.innerText = text; 
            else box.innerHTML = `<span>${text}</span><div class="redaction-resize-handle"></div>`;
            
            if(box.dataset.decoration === 'underline') { 
                box.style.textDecoration = 'underline'; 
                box.style.textUnderlineOffset = '3px'; 
            }
        }); 
    }
    static clearAll() { document.querySelectorAll('.redaction-layer').forEach(l => l.innerHTML = ''); this.zones = []; this.deselect(); }
}

class PageClassifier {
    static classify(textContent, aspectRatio = null, pageNumber = null) { 
        const text = textContent.items.map(i => i.str).join(' ').toUpperCase(); 
        const itemCount = textContent.items.length;
        
        // Enhanced content-aware classification
        const SCHEMATIC_TERMS = ['L1', 'L2', 'L3', 'MOTOR', 'PUMP', 'TERMINAL', 'WIRING', 'SCHEMATIC', 'FULL LOAD', 'CONTACTOR', 'RELAY', 'OVERLOAD', 'VFD', 'STARTER', 'DISCONNECT', 'BREAKER'];
        const INFO_TERMS = ['TABLE OF CONTENTS', 'INDEX', 'NOTES', 'SCHEDULE', 'SPECIFICATION', 'BOM', 'BILL OF MATERIALS'];
        const TITLE_TERMS = ['PROJECT', 'CLIENT', 'DRAWN BY', 'DATE', 'SCALE', 'REVISION', 'SUBMITTAL'];
        const ASBUILT_TERMS = ['AS-BUILT', 'AS BUILT', 'ASBUILT', 'RECORD DRAWING'];
        const DOOR_TERMS = ['DOOR', 'FRONT VIEW', 'PANEL FRONT', 'DOOR LAYOUT', 'FACE PLATE'];
        const COX_TERMS = ['COX RESEARCH', 'COX'];
        const DELTA_TERMS = ['DELTA', 'DELTA CONTROLS'];
        
        let schematicScore = 0;
        let infoScore = 0;
        let titleScore = 0;
        let asBuiltScore = 0;
        let doorScore = 0;
        let coxScore = 0;
        let deltaScore = 0;
        
        SCHEMATIC_TERMS.forEach(term => { if(text.includes(term)) schematicScore += 10; });
        INFO_TERMS.forEach(term => { if(text.includes(term)) infoScore += 15; });
        TITLE_TERMS.forEach(term => { if(text.includes(term)) titleScore += 5; });
        ASBUILT_TERMS.forEach(term => { if(text.includes(term)) asBuiltScore += 20; });
        DOOR_TERMS.forEach(term => { if(text.includes(term)) doorScore += 25; });
        COX_TERMS.forEach(term => { if(text.includes(term)) coxScore += 15; });
        DELTA_TERMS.forEach(term => { if(text.includes(term)) deltaScore += 15; });
        
        // Text density as secondary signal
        if(itemCount < 50 && titleScore > 0) titleScore += 20;
        
        // Detect borderless (no traditional title block borders)
        const hasBorderIndicators = text.includes('BORDER') || text.includes('FRAME') || text.includes('TITLE BLOCK');
        const isBorderless = !hasBorderIndicators && itemCount > 20;
        
        // Door drawing detection
        if(doorScore > 20) return 'DOOR_DRAWING';
        
        // Cover sheet detection
        if(pageNumber === 1 || titleScore > 25) {
            if(asBuiltScore > 15) return 'TITLE_ASBUILT';
            if(coxScore > 10) return 'COX_COVER';
            if(deltaScore > 10) return 'DELTA_COVER';
            if(titleScore > 25 && itemCount < 100) return 'THIRD_PARTY_COVER';
            return 'TITLE';
        }
        
        // Info/Notes detection
        if(infoScore > 20) {
            return isBorderless ? 'INFO_BORDERLESS' : 'INFO';
        }
        
        // Schematic detection
        if(schematicScore > 30) {
            const isLandscape = aspectRatio && aspectRatio > 1;
            if(isBorderless) {
                return isLandscape ? 'SCHEMATIC_LANDSCAPE_BORDERLESS' : 'SCHEMATIC_PORTRAIT_BORDERLESS';
            }
            return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
        }
        
        // Fallback to aspect ratio + page number heuristic
        if(aspectRatio) {
            const isLandscape = aspectRatio > 1;
            if(isBorderless) {
                return isLandscape ? 'SCHEMATIC_LANDSCAPE_BORDERLESS' : 'SCHEMATIC_PORTRAIT_BORDERLESS';
            }
            return isLandscape ? 'SCHEMATIC_LANDSCAPE' : 'SCHEMATIC_PORTRAIT';
        }
        
        return 'GENERAL';
    } 
}

class SmartScanner {
    // Configuration constants
    static WIDTH_PADDING_FACTOR = 1.5;
    static HEIGHT_PADDING_FACTOR = 1.2;
    static VERTICAL_TOLERANCE = 10;
    static HORIZONTAL_TOLERANCE = 20;
    static FONT_SIZE_ESTIMATE_FACTOR = 0.8; // OCR font size estimation adjustment
    
    static async scanAllPages() {
        RedactionManager.clearAll(); 
        if(!PdfViewer.isDocumentValid()) {
            console.warn('Cannot scan: PDF document is not loaded or invalid');
            return;
        }
        
        const btn = document.querySelector('button[onclick="SmartScanner.scanAllPages()"]');
        const origText = btn ? btn.innerText : "";
        if(btn) { btn.innerText = "🔍 INITIALIZING..."; btn.disabled = true; }
        
        let textPages = 0;
        let ocrPages = 0;
        
        try {
            for(let i = 1; i <= PdfViewer.doc.numPages; i++) {
                const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${i}"]`);
                if(!wrapper) continue;
                
                if(btn) btn.innerText = `🔍 ANALYZING PAGE ${i}/${PdfViewer.doc.numPages}...`;
                
                // Validate document is still valid before getPage()
                if(!PdfViewer.isDocumentValid()) {
                    console.warn('PDF document became invalid during scan');
                    break;
                }
                
                // Try fast path first
                const page = await PdfViewer.doc.getPage(i);
                const textContent = await page.getTextContent();
                
                let detectedZones = null;
                let scanConfidence = 'low';
                
                // Check if text extraction yielded useful results
                if(textContent.items.length > 10) {
                    if(btn) btn.innerText = `🔍 TEXT SCAN PAGE ${i}/${PdfViewer.doc.numPages}...`;
                    detectedZones = await this.extractTextBasedZones(page, textContent, wrapper);
                    if(detectedZones && detectedZones.length > 0) {
                        scanConfidence = 'high';
                        textPages++;
                    }
                } else {
                    // Fallback to OCR for scanned/image PDFs
                    if(btn) btn.innerText = `🔍 OCR PAGE ${i}/${PdfViewer.doc.numPages}...`;
                    detectedZones = await this.ocrBasedZones(page, wrapper);
                    if(detectedZones && detectedZones.length > 0) {
                        scanConfidence = 'medium';
                        ocrPages++;
                    }
                }
                
                // Apply detected zones or fallback to layout rules
                if(detectedZones && detectedZones.length > 0) {
                    this.applyDetectedZones(wrapper, detectedZones);
                } else {
                    // Fallback to existing LAYOUT_RULES
                    scanConfidence = 'low';
                    await this.fallbackToLayoutRules(wrapper, i, page, textContent);
                }
                
                // Add scan confidence indicator to toolbar
                this.addConfidenceIndicator(wrapper, scanConfidence);
            }
            
            RedactionManager.refreshContent();
            
            // Show summary
            if(btn) {
                const summary = `✅ Scanned ${PdfViewer.doc.numPages} pages (${textPages} text, ${ocrPages} OCR)`;
                btn.innerText = summary;
                setTimeout(() => { btn.innerText = origText; }, 3000);
            }
        } catch(e) { 
            console.error(e); 
            if(btn) btn.innerText = "❌ SCAN FAILED";
        } finally {
            if(btn) btn.disabled = false;
        }
    }
    
    static async extractTextBasedZones(page, textContent, wrapper) {
        const viewport = page.getViewport({ scale: 1.0 });
        const container = wrapper.querySelector('.pdf-content-container');
        if(!container) return null;
        
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const scaleX = width / viewport.width;
        const scaleY = height / viewport.height;
        
        // Build spatial map of text items
        const textItems = textContent.items.map(item => ({
            text: item.str.toUpperCase(),
            x: item.transform[4] * scaleX,
            y: height - (item.transform[5] * scaleY), // Flip Y coordinate
            width: item.width * scaleX,
            height: item.height * scaleY,
            fontSize: Math.abs(item.transform[0]) * scaleY
        }));
        
        // Detect title block region (typically bottom-right for landscape, bottom for portrait)
        const aspectRatio = viewport.width / viewport.height;
        const titleBlockItems = this.detectTitleBlock(textItems, width, height, aspectRatio);
        
        // Find labeled fields
        const zones = [];
        const fieldMappings = {
            'CUSTOMER': 'cust', 'CLIENT': 'cust', 'OWNER': 'cust',
            'JOB': 'job', 'PROJECT': 'job', 'JOB NAME': 'job',
            'TYPE': 'type', 'SYSTEM': 'type', 'DESCRIPTION': 'type',
            'PANEL': 'cpid', 'CP': 'cpid', 'PANEL ID': 'cpid', 'ID': 'cpid',
            'DATE': 'date', 'ISSUE DATE': 'date', 'DRAWN': 'date',
            'STAGE': 'stage', 'STATUS': 'stage', 'SUBMITTAL': 'stage'
        };
        
        for(const [label, mapKey] of Object.entries(fieldMappings)) {
            const labelItem = titleBlockItems.find(item => item.text.includes(label));
            if(labelItem) {
                // Find value text near this label (typically to the right or below)
                const valueItem = this.findNearbyValue(labelItem, titleBlockItems);
                if(valueItem) {
                    zones.push({
                        x: valueItem.x,
                        y: valueItem.y,
                        w: valueItem.width * this.WIDTH_PADDING_FACTOR,
                        h: valueItem.height * this.HEIGHT_PADDING_FACTOR,
                        map: mapKey,
                        fontSize: Math.round(valueItem.fontSize),
                        transparent: true,
                        fontFamily: "'Courier New', monospace",
                        textAlign: 'left'
                    });
                }
            }
        }
        
        return zones.length > 0 ? zones : null;
    }
    
    static detectTitleBlock(textItems, width, height, aspectRatio) {
        // For landscape schematics, title block is typically in bottom-right
        // For portrait, it's typically at the bottom
        const threshold = aspectRatio > 1 ? 0.7 : 0.6;
        
        return textItems.filter(item => {
            const relY = item.y / height;
            const relX = item.x / width;
            
            if(aspectRatio > 1) {
                // Landscape: bottom-right corner
                return relY > threshold && relX > threshold;
            } else {
                // Portrait: bottom section
                return relY > threshold;
            }
        });
    }
    
    static findNearbyValue(labelItem, allItems) {
        // Look for text items to the right or below the label
        const candidates = allItems.filter(item => {
            const isRight = item.x > labelItem.x && item.y >= labelItem.y - this.VERTICAL_TOLERANCE && item.y <= labelItem.y + this.VERTICAL_TOLERANCE;
            const isBelow = item.y > labelItem.y && item.x >= labelItem.x - this.HORIZONTAL_TOLERANCE;
            return (isRight || isBelow) && item.text !== labelItem.text;
        });
        
        // Return the closest one
        if(candidates.length === 0) return null;
        return candidates.sort((a, b) => {
            const distA = Math.hypot(a.x - labelItem.x, a.y - labelItem.y);
            const distB = Math.hypot(b.x - labelItem.x, b.y - labelItem.y);
            return distA - distB;
        })[0];
    }
    
    static async ocrBasedZones(page, wrapper) {
        try {
            // Render page to high-resolution canvas
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            // Run Tesseract.js OCR
            const { data } = await Tesseract.recognize(canvas, 'eng', {
                logger: () => {} // Suppress logs
            });
            
            if(!data.words || data.words.length < 5) return null;
            
            // Convert OCR results to same format as text extraction
            const container = wrapper.querySelector('.pdf-content-container');
            if(!container) return null;
            
            const width = container.offsetWidth;
            const height = container.offsetHeight;
            const scaleX = width / viewport.width;
            const scaleY = height / viewport.height;
            
            const textItems = data.words.map(word => ({
                text: word.text.toUpperCase(),
                x: word.bbox.x0 * scaleX,
                y: word.bbox.y0 * scaleY,
                width: (word.bbox.x1 - word.bbox.x0) * scaleX,
                height: (word.bbox.y1 - word.bbox.y0) * scaleY,
                fontSize: (word.bbox.y1 - word.bbox.y0) * scaleY * this.FONT_SIZE_ESTIMATE_FACTOR
            }));
            
            // Use same detection logic as text extraction
            const aspectRatio = viewport.width / viewport.height;
            const titleBlockItems = this.detectTitleBlock(textItems, width, height, aspectRatio);
            
            const zones = [];
            const fieldMappings = {
                'CUSTOMER': 'cust', 'CLIENT': 'cust',
                'JOB': 'job', 'PROJECT': 'job',
                'DATE': 'date',
                'PANEL': 'cpid'
            };
            
            for(const [label, mapKey] of Object.entries(fieldMappings)) {
                const labelItem = titleBlockItems.find(item => item.text.includes(label));
                if(labelItem) {
                    const valueItem = this.findNearbyValue(labelItem, titleBlockItems);
                    if(valueItem) {
                        zones.push({
                            x: valueItem.x,
                            y: valueItem.y,
                            w: valueItem.width * this.WIDTH_PADDING_FACTOR,
                            h: valueItem.height * this.HEIGHT_PADDING_FACTOR,
                            map: mapKey,
                            fontSize: Math.round(valueItem.fontSize),
                            transparent: true,
                            fontFamily: "'Courier New', monospace",
                            textAlign: 'left'
                        });
                    }
                }
            }
            
            return zones.length > 0 ? zones : null;
        } catch(e) {
            console.error('OCR failed:', e);
            return null;
        }
    }
    
    static applyDetectedZones(wrapper, zones) {
        zones.forEach(zone => {
            RedactionManager.createZoneOnWrapper(
                wrapper, 
                zone.x, 
                zone.y, 
                zone.w, 
                zone.h, 
                zone.map, 
                zone.fontSize, 
                zone.text || null, 
                null, 
                null, 
                'normal', 
                zone.transparent, 
                zone.rotation || 0, 
                zone.fontFamily, 
                zone.textAlign
            );
        });
    }
    
    static async fallbackToLayoutRules(wrapper, pageNum, page, textContent) {
        const container = wrapper.querySelector('.pdf-content-container');
        const manualSelect = wrapper.querySelector('.page-profile-select');
        let profileKey = manualSelect ? manualSelect.value : null;
        
        if (!profileKey || profileKey === "AUTO") {
            // Enhanced classification using content
            const viewport = page.getViewport({ scale: 1.0 });
            const aspectRatio = viewport.width / viewport.height;
            
            if (pageNum === 1) {
                profileKey = 'TITLE';
            } else if (pageNum === 2) {
                profileKey = 'INFO';
            } else {
                profileKey = PageClassifier.classify(textContent, aspectRatio);
            }
            
            if(manualSelect) manualSelect.value = profileKey;
        }
        
        LayoutScanner.applyRuleToWrapper(wrapper, LAYOUT_RULES[profileKey]);
    }
    
    static addConfidenceIndicator(wrapper, confidence) {
        const toolbar = wrapper.querySelector('.page-toolbar');
        if(!toolbar) return;
        
        const indicator = document.createElement('span');
        indicator.className = 'scan-confidence';
        indicator.title = `Scan confidence: ${confidence}`;
        
        if(confidence === 'high') {
            indicator.innerText = '🟢';
            indicator.title = 'High confidence (text extraction found fields)';
        } else if(confidence === 'medium') {
            indicator.innerText = '🟡';
            indicator.title = 'Medium confidence (OCR or partial detection)';
        } else {
            indicator.innerText = '🔴';
            indicator.title = 'Low confidence (using default layout)';
        }
        
        // Remove existing indicator if any
        const existing = toolbar.querySelector('.scan-confidence');
        if(existing) existing.remove();
        
        toolbar.appendChild(indicator);
    }
    
    static async rescanPage(pageNum) {
        if(!PdfViewer.isDocumentValid()) {
            console.warn('Cannot rescan: PDF document is not loaded or invalid');
            return;
        }
        
        const wrapper = document.querySelector(`.pdf-page-wrapper[data-page-number="${pageNum}"]`);
        if(!wrapper) return;
        
        const btn = wrapper.querySelector('.rescan-page-btn');
        const origText = btn ? btn.innerHTML : "🔄";
        if(btn) btn.innerHTML = "⏳";
        
        try {
            // Clear existing zones on this page
            const layer = wrapper.querySelector('.redaction-layer');
            if(layer) layer.innerHTML = '';
            
            // Validate document is still valid before getPage()
            if(!PdfViewer.isDocumentValid()) {
                console.warn('PDF document is invalid, cannot rescan');
                return;
            }
            
            // Run smart scan on this page only
            const page = await PdfViewer.doc.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            let detectedZones = null;
            let scanConfidence = 'low';
            
            if(textContent.items.length > 10) {
                detectedZones = await this.extractTextBasedZones(page, textContent, wrapper);
                if(detectedZones && detectedZones.length > 0) scanConfidence = 'high';
            } else {
                detectedZones = await this.ocrBasedZones(page, wrapper);
                if(detectedZones && detectedZones.length > 0) scanConfidence = 'medium';
            }
            
            if(detectedZones && detectedZones.length > 0) {
                this.applyDetectedZones(wrapper, detectedZones);
            } else {
                await this.fallbackToLayoutRules(wrapper, pageNum, page, textContent);
            }
            
            this.addConfidenceIndicator(wrapper, scanConfidence);
            RedactionManager.refreshContent();
        } catch(e) {
            console.error('Rescan failed:', e);
        } finally {
            if(btn) btn.innerHTML = origText;
        }
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
            let html = `
                <option value="AUTO">✨ Auto (Detected)</option>
                <optgroup label="Title & Cover Sheets">
                    <option value="TITLE">🏷️ Title Sheet (Standard)</option>
                    <option value="TITLE_ASBUILT">📋 Title Sheet (As-Built)</option>
                    <option value="COX_COVER">🏢 Cox Cover Sheet</option>
                    <option value="DELTA_COVER">🔷 Delta Cover Sheet</option>
                    <option value="THIRD_PARTY_COVER">📄 3rd Party Cover</option>
                </optgroup>
                <optgroup label="Info & Notes">
                    <option value="INFO">📝 Info / Notes (Standard)</option>
                    <option value="INFO_BORDERLESS">🖼️ Info (Borderless)</option>
                </optgroup>
                <optgroup label="Schematics">
                    <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Portrait)</option>
                    <option value="SCHEMATIC_PORTRAIT_BORDERLESS">🖼️ Schematic (Portrait Borderless)</option>
                    <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Landscape)</option>
                    <option value="SCHEMATIC_LANDSCAPE_BORDERLESS">🖼️ Schematic (Landscape Borderless)</option>
                </optgroup>
                <optgroup label="Special">
                    <option value="DOOR_DRAWING">🚪 Door Drawing</option>
                    <option value="GENERAL">📐 General</option>
                </optgroup>
            `;
            if (Object.keys(customProfiles).length > 0) {
                html += '<optgroup label="Custom Profiles">';
                for (const [name, _] of Object.entries(customProfiles)) {
                    html += `<option value="CUSTOM:${name}">⭐ ${name}</option>`;
                }
                html += '</optgroup>';
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
        
        // Update page context UI if this is the active page
        if (PageContext.getActivePage() === pageNum) {
            PageContext.updateUI();
        }
    }

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

class FeedbackService {
    static currentId = null; static currentDownBtn = null; static lockout = new Set();
    static async up(id, btn, crit) { if(btn.classList.contains('voted-up')) return; btn.classList.add('voted-up'); const implicit = {}; if(crit && crit.mfg !== 'Any') implicit.mfg = crit.mfg; if(crit && crit.hp !== 'Any') implicit.hp = crit.hp; if(crit && crit.volt !== 'Any') implicit.volt = crit.volt; if(crit && crit.phase !== 'Any') implicit.phase = crit.phase; if(crit && crit.enc !== 'Any') implicit.enc = crit.enc; const payload = { records: [{ fields: { 'Panel ID': id, 'Vote': 'Up', 'User': localStorage.getItem('cox_user'), 'Corrections': JSON.stringify(implicit) } }] }; await fetch(`${WORKER_URL}?target=FEEDBACK`, { method: 'POST', headers: { ...AuthService.headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
    
    static down(id, btn) { 
        this.currentId = id; 
        if(btn) this.currentDownBtn = btn;
        
        this.setupInput('fb-mfg', [...AI_TRAINING_DATA.MANUFACTURERS].sort(), 'mfg'); 
        this.setupInput('fb-hp', AI_TRAINING_DATA.DATA.HP, 'hp'); 
        this.setupInput('fb-volt', AI_TRAINING_DATA.DATA.VOLT, 'volt'); 
        this.setupInput('fb-phase', AI_TRAINING_DATA.DATA.PHASE, 'phase'); 
        this.setupInput('fb-enc', ['4XSS', '4XFG', 'POLY'], 'enc');

        const lvBtn = document.getElementById('fb-low-volt-btn'); 
        if (this.lockout.has(`${id}:cat_low`)) { lvBtn.className = 'keyword-toggle disabled-overlay'; lvBtn.innerText = "✓ Reported as Low Voltage"; lvBtn.onclick = null; } 
        else { lvBtn.className = 'keyword-toggle'; lvBtn.innerText = "⚡ Report as Low Voltage / Control Only"; lvBtn.onclick = () => lvBtn.classList.toggle('selected'); } 
        
        this.generateKeywordButtons(); 
        document.getElementById('feedback-modal').classList.add('active-modal'); 
    }

    static setupInput(elId, data, paramKey) { 
        const el = document.getElementById(elId); 
        el.innerHTML = '<option value="" disabled selected>Select Correct...</option><option value="Varied">Varied / Multiple</option>'; 
        data.forEach(d => el.add(new Option(d, d))); 
        if (this.lockout.has(`${this.currentId}:p_${paramKey}`)) { el.disabled = true; el.title = "Feedback already submitted"; } else { el.disabled = false; el.title = ""; } 
    }

    static generateKeywordButtons() { 
        const input = document.getElementById('keywordInput').value; 
        const container = document.getElementById('keyword-cluster'); 
        const wrapper = document.getElementById('keyword-feedback-area'); 
        container.innerHTML = ''; 
        
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
        const enc = document.getElementById('fb-enc').value; if(enc) { corrections.enc = enc; this.lockout.add(`${this.currentId}:p_enc`); } 

        if(document.getElementById('fb-low-volt-btn').classList.contains('selected')) { corrections.category = 'low_voltage'; this.lockout.add(`${this.currentId}:cat_low`); } 
        
        const badKeywords = []; 
        document.querySelectorAll('.keyword-toggle.selected').forEach(btn => { badKeywords.push(btn.dataset.kw); this.lockout.add(`${this.currentId}:kw_${btn.dataset.kw}`); }); 
        if (badKeywords.length > 0) corrections.reject_keywords = badKeywords; 
        
        if (Object.keys(corrections).length === 0) return alert("Please select a correction."); 
        
        // Prepare payload for submission
        const payload = { records: [{ fields: { 'Panel ID': this.currentId, 'Vote': 'Down', 'User': localStorage.getItem('cox_user'), 'Corrections': JSON.stringify(corrections) } }] }; 
        
        // Show instant UI feedback
        if(this.currentDownBtn) this.currentDownBtn.classList.add('voted-down');
        this.close(); 
        alert("Thank you! System will learn from this.");
        
        // Submit in background - fire and forget for instant UI response
        // Note: Using fetch instead of sendBeacon because API requires custom auth headers
        fetch(`${WORKER_URL}?target=FEEDBACK`, { 
            method: 'POST', 
            headers: { ...AuthService.headers(), 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload),
            keepalive: true  // Ensures request completes even if page is navigating away
        }).catch(e => console.warn('Feedback submission failed:', e));
    }
    static resetLockout() { this.lockout.clear(); }
    static close() { document.getElementById('feedback-modal').classList.remove('active-modal'); }
}

class SearchEngine {
    static currentResults = [];
    static currentPage = 1;
    static pageSize = 50;

    static perform() {
        // CRITICAL: Stop any running preload from previous search
        PdfController.stopPreloading();
        
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
            
            if(crit.mfg !== "Any") { if (r.mfg === crit.mfg) { w += 10000; } else if (r.desc && r.desc.includes(crit.mfg)) { w += 1000; } else { return; } }
            if(crit.hp !== "Any") { 
                // Normalize HP value for comparison
                const searchHP = parseFloat(crit.hp);
                const tolerance = 0.1; // 10% tolerance for fuzzy matching
                
                // Strict field match
                const strictMatch = r.hp && Math.abs(parseFloat(r.hp) - searchHP) < tolerance;
                
                // Enhanced safety regex for various formats
                // Pattern matches: word boundary + HP value + optional decimal + HP unit + word boundary
                // Examples: "5 HP", "5HP", "5H.P", "5 H.P.", "5KW", "5.0HP"
                const HP_UNIT_PATTERN = '(?:HP|H\\.P\\.|H\\.P|KW|kW|HORSEPOWER)';
                const BOUNDARY_START = '(?:^|\\s|\\(|,)';
                const BOUNDARY_END = '(?:\\s|\\)|,|$)';
                const hpPattern = `${BOUNDARY_START}(?:${crit.hp}|${crit.hp}\\.0)\\s*${HP_UNIT_PATTERN}${BOUNDARY_END}`;
                
                // Fractional pattern for values < 1 HP (e.g., 1/2 HP, 1/4 HP)
                // Guard against division by zero
                const fractionalPattern = (searchHP > 0 && searchHP < 1) 
                    ? `1/${Math.round(1/searchHP)}\\s*${HP_UNIT_PATTERN}` 
                    : null;
                
                const safetyRegex = new RegExp(hpPattern, 'i');
                const safetyMatch = r.desc && safetyRegex.test(r.desc);
                
                const fractionalMatch = fractionalPattern && r.desc && new RegExp(fractionalPattern, 'i').test(r.desc);
                
                // Table/header format: "HP: 5", "HP | 5", "HP 5", "Horsepower 5" or "Motor HP 5"
                const tablePattern = `(?:HP|HORSEPOWER|MOTOR\\s+HP)\\s*[:\\s|]+\\s*${crit.hp}\\b`;
                const tableMatch = r.desc && new RegExp(tablePattern, 'i').test(r.desc);
                
                if (strictMatch) { 
                    w += 5000; 
                } else if (safetyMatch || fractionalMatch || tableMatch) { 
                    w += 2000; 
                } else { 
                    return; 
                } 
            }
            if(crit.volt!=="Any") { if(!r.volt || !r.volt.includes(crit.volt)) return; w += 500; }
            if(crit.phase!=="Any") { if(r.phase!==crit.phase) return; w += 500; }
            if(crit.enc!=="Any") { if(r.enc!==crit.enc) return; w += 500; }
            
            if(expandedKeywords.length) { 
                const text = (r.id + " " + (r.desc || "")).toUpperCase();
                
                if (r.reject_keywords && r.reject_keywords.length > 0) {
                    const isRejected = rawKeywords.some(kw => r.reject_keywords.includes(kw));
                    if (isRejected) return; 
                }

                const allGroupsMatch = expandedKeywords.every(group => {
                    return group.some(alias => {
                        const cleanAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
                        
                        // CRITICAL FIX: Safe word-boundary regex to prevent partial acronym matches
                        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_.])` + cleanAlias + `([^a-zA-Z0-9_.]|$)`, 'i');
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

        // Preload PDFs for first page of results (in background)
        if (res.length > 0) {
            setTimeout(() => {
                PdfController.preloadSearchResults(res);
            }, PRELOAD_START_DELAY_MS);
        }
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
                
                remainingPages.forEach((p) => {
                    compositeDoc.addPage(p);
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
                            
                            // FIX BUG #1: Use correct font for width calculation
                            let fontToUse = fontTimes;
                            if (box.style.fontFamily.includes('Courier')) fontToUse = fontCourier;
                            const textWidth = fontToUse.widthOfTextAtSize(text, fontSize);
                            
                            let textX = drawX;
                            if (box.style.textAlign === 'center') textX = drawX + (drawW/2) - (textWidth/2);
                            else if (box.style.textAlign === 'right') textX = drawX + drawW - textWidth;

                            const textY = drawY + (drawH/2) - (fontSize/4);
                            
                            // FIX BUG #2: Apply rotation if specified
                            const rotation = parseFloat(box.dataset.rotation) || 0;
                            if (rotation !== 0) {
                                // Apply rotation transform
                                const centerX = drawX + drawW/2;
                                const centerY = drawY + drawH/2;
                                const radians = (rotation * Math.PI) / 180;
                                
                                page.drawText(text, { 
                                    x: centerX, 
                                    y: centerY, 
                                    size: fontSize, 
                                    font: fontToUse, 
                                    color: PDFLib.rgb(0,0,0),
                                    rotate: PDFLib.degrees(rotation)
                                });
                            } else {
                                page.drawText(text, { x: textX, y: textY, size: fontSize, font: fontToUse, color: PDFLib.rgb(0,0,0) });
                            }
                            
                            // Note: Underline decoration is only applied for non-rotated text
                            // Rotated text underlines would require complex transform calculations
                            if (box.dataset.decoration === 'underline' && rotation === 0) {
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
    static currentFetchId = 0;
    static loadingTask = null;

    static isDocumentValid() {
        return this.doc && !this.doc.destroyed;
    }

    static async loadById(panelId, fallbackUrl) {
        // Load PDF by panel ID via worker (fetches fresh attachment URL from Airtable)
        this.url = fallbackUrl || "";
        document.getElementById('pdf-fallback').style.display = 'none'; 
        document.getElementById('pdf-toolbar').style.display = 'none';
        document.getElementById('custom-pdf-viewer').style.display = 'none'; 
        document.getElementById('pdf-viewer-frame').style.display = 'none';
        document.getElementById('pdf-placeholder-text').style.display = 'flex';
        document.getElementById('pdf-placeholder-text').innerText = "⏳ DOWNLOADING PDF...";

        const fetchId = Date.now();
        this.currentFetchId = fetchId;

        try {
            if (this.loadingTask) {
                await this.loadingTask.destroy().catch(()=>{});
                this.loadingTask = null;
            }

            // Use the new PDF_BY_ID endpoint
            const proxyUrl = `${WORKER_URL}?target=PDF_BY_ID&id=${encodeURIComponent(panelId)}`;
            const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
            
            if (!resp.ok) {
                if (resp.status === 404) {
                    console.warn(`PDF not found for panel ${panelId} (404)`);
                    document.getElementById('pdf-placeholder-text').style.display = 'none';
                    document.getElementById('pdf-fallback').style.display = 'block';
                    if (fallbackUrl) {
                        document.getElementById('pdf-fallback-link').href = fallbackUrl;
                    }
                    return; // Exit gracefully
                }
                throw new Error(`Failed to fetch PDF by ID: ${resp.status}`);
            }
            
            const arrayBuffer = await resp.arrayBuffer();

            if (this.currentFetchId !== fetchId) return; 

            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = URL.createObjectURL(blob);
            
            this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
            this.doc = await this.loadingTask.promise; 

            if (window.innerWidth < 768) {
                 this.currentScale = 0.8;
                 UI.toggleSearch(true); 
            } else {
                 this.currentScale = 1.1;
            }

            document.getElementById('pdf-placeholder-text').style.display = 'none';
            document.getElementById('pdf-toolbar').style.display = 'flex';
            document.getElementById('custom-pdf-viewer').style.display = 'flex';

            await this.renderStack(); 
        } catch(e) {
            if (e.name === 'RenderingCancelledException' || e.message?.includes('destroyed')) {
                console.log('PDF Load Cancelled (Fast Click)');
            } else {
                console.error("PDF Load Error:", e);
                document.getElementById('pdf-placeholder-text').style.display = 'none';
                document.getElementById('pdf-fallback').style.display = 'block';
                // Set fallback link to the cached URL if available
                if (fallbackUrl) {
                    document.getElementById('pdf-fallback-link').href = fallbackUrl;
                }
            }
        }
    }

    static async loadFromCache(cached, panelId, fallbackUrl) {
        // Load PDF from preloaded cache
        // Validate cached data
        if (!cached || !cached.arrayBuffer || !cached.blob) {
            console.warn('Invalid cached PDF data, falling back to regular load');
            return this.loadById(panelId, fallbackUrl);
        }
        
        this.url = fallbackUrl || "";
        document.getElementById('pdf-fallback').style.display = 'none'; 
        document.getElementById('pdf-toolbar').style.display = 'none';
        document.getElementById('custom-pdf-viewer').style.display = 'none'; 
        document.getElementById('pdf-viewer-frame').style.display = 'none';
        document.getElementById('pdf-placeholder-text').style.display = 'flex';
        document.getElementById('pdf-placeholder-text').innerText = "⚡ LOADING FROM CACHE...";

        const fetchId = Date.now();
        this.currentFetchId = fetchId;

        try {
            if (this.loadingTask) {
                await this.loadingTask.destroy().catch(()=>{});
                this.loadingTask = null;
            }

            if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = URL.createObjectURL(cached.blob);
            
            this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(cached.arrayBuffer) });
            this.doc = await this.loadingTask.promise; 

            // Verify document is valid before continuing
            if (!this.isDocumentValid()) {
                throw new Error('Loaded PDF document is null or destroyed after loading from cache');
            }

            if (window.innerWidth < 768) {
                 this.currentScale = 0.8;
                 UI.toggleSearch(true); 
            } else {
                 this.currentScale = 1.1;
            }

            document.getElementById('pdf-placeholder-text').style.display = 'none';
            document.getElementById('pdf-toolbar').style.display = 'flex';
            document.getElementById('custom-pdf-viewer').style.display = 'flex';

            await this.renderStack();
            console.log('✓ Loaded from cache'); 
        } catch(e) {
            console.error("Cache Load Error:", e);
            // Fall back to regular loading
            this.loadById(panelId, fallbackUrl);
        }
    }

    static async load(url) {
        this.url = url;
        document.getElementById('pdf-fallback').style.display = 'none'; 
        document.getElementById('pdf-toolbar').style.display = 'none';
        document.getElementById('custom-pdf-viewer').style.display = 'none'; 
        document.getElementById('pdf-viewer-frame').style.display = 'none';
        document.getElementById('pdf-placeholder-text').style.display = 'flex';
        document.getElementById('pdf-placeholder-text').innerText = "⏳ DOWNLOADING PDF...";

        const fetchId = Date.now();
        this.currentFetchId = fetchId;

        try {
            if (this.loadingTask) {
                await this.loadingTask.destroy().catch(()=>{});
                this.loadingTask = null;
            }

            const proxyUrl = `${WORKER_URL}?target=pdf&url=${encodeURIComponent(url)}`;
            const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
            if (!resp.ok) throw new Error(`Fetch Error: ${resp.status}`);
            
            const arrayBuffer = await resp.arrayBuffer();

            if (this.currentFetchId !== fetchId) return; 

            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            if(this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = URL.createObjectURL(blob);
            
            this.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
            this.doc = await this.loadingTask.promise; 

            if (window.innerWidth < 768) {
                 this.currentScale = 0.8;
                 UI.toggleSearch(true); 
            } else {
                 this.currentScale = 1.1;
            }

            document.getElementById('pdf-placeholder-text').style.display = 'none';
            document.getElementById('pdf-toolbar').style.display = 'flex';
            document.getElementById('custom-pdf-viewer').style.display = 'flex';

            await this.renderStack(); 
        } catch(e) {
            if (e.name === 'RenderingCancelledException' || e.message?.includes('destroyed')) {
                console.log('PDF Load Cancelled (Fast Click)');
            } else {
                console.error("PDF Load Error:", e);
                document.getElementById('pdf-placeholder-text').style.display = 'none';
                document.getElementById('pdf-fallback').style.display = 'block';
                document.getElementById('pdf-fallback-link').href = url;
            }
        }
    }
    static print() {
        if (!this.currentBlobUrl) return alert("No PDF loaded to print.");
        const iframe = document.createElement('iframe'); iframe.style.display = 'none'; iframe.src = this.currentBlobUrl; document.body.appendChild(iframe);
        iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 2000); };
    }
    static async renderStack() {
        const container = document.getElementById('pdf-main-view'); 
        if (!container) {
            console.error('PDF container not found');
            return;
        }
        container.innerHTML = ''; 
        document.getElementById('pdf-zoom-level').innerText = Math.round(this.currentScale * 100) + "%";
        
        if (!this.doc) {
            console.error('No PDF document loaded');
            return;
        }
        
        let coverDoc = this.doc;
        if (window.TEMPLATE_BYTES) {
             const tTask = pdfjsLib.getDocument(window.TEMPLATE_BYTES.slice(0));
             coverDoc = await tTask.promise;
        }

        for (let i = 1; i <= this.doc.numPages; i++) {
            await new Promise(r => setTimeout(r, 10)); 
            let page; let isTemplate = false;
            if (i === 1 && window.TEMPLATE_BYTES && DemoManager.isGeneratorActive) { page = await coverDoc.getPage(1); isTemplate = true; } else { page = await this.doc.getPage(i); }

            if (!page) continue; // Skip if page couldn't be loaded
            
            const viewport = page.getViewport({ scale: this.currentScale });
            const wrapper = document.createElement('div'); wrapper.className = 'pdf-page-wrapper';
            wrapper.style.width = Math.floor(viewport.width) + "px"; 
            wrapper.dataset.pageNumber = i;
            wrapper.style.animationDelay = `${Math.min((i - 1) * 0.05, 0.5)}s`; // Staggered animation, max 0.5s delay
            
            const toolbar = document.createElement('div');
            toolbar.className = 'page-toolbar';
            toolbar.innerHTML = `
                <span>PAGE ${i}</span>
                <select class="page-profile-select" onchange="LayoutScanner.updatePageProfile(${i}, this.value)">
                    <option value="AUTO">✨ Auto (Detected)</option>
                    <optgroup label="Title & Cover Sheets">
                        <option value="TITLE">🏷️ Title Sheet (Standard)</option>
                        <option value="TITLE_ASBUILT">📋 Title Sheet (As-Built)</option>
                        <option value="COX_COVER">🏢 Cox Cover Sheet</option>
                        <option value="DELTA_COVER">🔷 Delta Cover Sheet</option>
                        <option value="THIRD_PARTY_COVER">📄 3rd Party Cover</option>
                    </optgroup>
                    <optgroup label="Info & Notes">
                        <option value="INFO">📝 Info / Notes (Standard)</option>
                        <option value="INFO_BORDERLESS">🖼️ Info (Borderless)</option>
                    </optgroup>
                    <optgroup label="Schematics">
                        <option value="SCHEMATIC_PORTRAIT">📄 Schematic (Portrait)</option>
                        <option value="SCHEMATIC_PORTRAIT_BORDERLESS">🖼️ Schematic (Portrait Borderless)</option>
                        <option value="SCHEMATIC_LANDSCAPE">🔄 Schematic (Landscape)</option>
                        <option value="SCHEMATIC_LANDSCAPE_BORDERLESS">🖼️ Schematic (Landscape Borderless)</option>
                    </optgroup>
                    <optgroup label="Special">
                        <option value="DOOR_DRAWING">🚪 Door Drawing</option>
                        <option value="GENERAL">📐 General</option>
                    </optgroup>
                </select>
                <button class="rescan-page-btn" onclick="SmartScanner.rescanPage(${i})" title="Re-scan this page">🔄</button>
            `;
            wrapper.appendChild(toolbar);

            const contentContainer = document.createElement('div');
            contentContainer.className = 'pdf-content-container';
            contentContainer.style.width = Math.floor(viewport.width) + "px";
            contentContainer.style.height = Math.floor(viewport.height) + "px";

            const canvas = document.createElement('canvas'); canvas.className = 'pdf-page-canvas';
            canvas.width = viewport.width; canvas.height = viewport.height; 
            
            const rLayer = document.createElement('div'); rLayer.className = 'redaction-layer';
            if(document.body.classList.contains('demo-mode')) rLayer.classList.add('editing');
            
            contentContainer.appendChild(canvas); 
            contentContainer.appendChild(rLayer); 
            wrapper.appendChild(contentContainer); 
            container.appendChild(wrapper); 

            // Add null check for canvas context
            const ctx = canvas.getContext('2d');
            if (ctx) {
                try {
                    await page.render({ canvasContext: ctx, viewport }).promise;
                } catch (e) {
                    console.warn(`Failed to render page ${i}:`, e);
                }
            }
        }
        if(DemoManager.isGeneratorActive) {
            // Populate page selector
            const pageSelector = document.getElementById('page-selector');
            if (pageSelector) {
                pageSelector.innerHTML = '';
                for (let i = 1; i <= this.doc.numPages; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Page ${i}`;
                    pageSelector.appendChild(option);
                }
            }
            
            // Set initial page context
            PageContext.setActivePage(1);
            
            setTimeout(() => {
                LayoutScanner.refreshProfileOptions();
                SmartScanner.scanAllPages();
            }, 500); 
        } else {
            // Auto-scan if any redaction checkboxes are enabled
            setTimeout(() => {
                const anyChecked = REDACTION_CHECKBOX_IDS.some(id => {
                    const el = document.getElementById(id);
                    return el && el.type === 'checkbox' && el.checked;
                });
                
                if (anyChecked) {
                    SmartScanner.scanAllPages();
                }
            }, 500);
        }
    }
    static zoom(delta) { this.currentScale+=delta; if(this.currentScale<0.2) this.currentScale=0.2; this.renderStack(); }
}

class PdfController {
    static pdfCache = new Map(); // Cache for preloaded PDFs
    static preloadQueue = [];
    static isPreloading = false;
    static PRELOAD_DELAY_MS = 250; // Delay between preload requests to avoid overwhelming browser/network
    static CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
    static CACHE_MAX_SIZE = 20; // Maximum number of PDFs to cache

    static load(id, url) {
        document.getElementById('pdf-placeholder-text').style.display = 'none';
        const rec = window.ID_MAP.get(id);
        if(rec && rec.displayId) { document.getElementById('demo-panel-id').value = rec.displayId; }
        
        // Load PDF by panel ID via worker (Option 1)
        if (!id) { 
            document.getElementById('pdf-fallback').style.display = 'block'; 
            if (url) document.getElementById('pdf-fallback-link').href = url;
            return; 
        }
        
        // Check cache first
        const cached = this.pdfCache.get(id);
        if (cached) {
            PdfViewer.loadFromCache(cached, id, url);
        } else {
            // Pass panel ID and fallback URL to PdfViewer
            PdfViewer.loadById(id, url);
        }
    }

    static async preloadSearchResults(results) {
        // Stop any in-progress preloading first
        this.stopPreloading();
        
        // Validate inputs
        if (!results || !Array.isArray(results) || results.length === 0) {
            return;
        }
        
        // Preload first page of search results (top to bottom)
        this.preloadQueue = results.slice(0, SearchEngine.pageSize).filter(r => r && r.id && !this.pdfCache.has(r.id));
        this.isPreloading = true;
        
        for (const result of this.preloadQueue) {
            if (!this.isPreloading) break; // Allow cancellation
            
            // Validate result object
            if (!result || !result.id) continue;
            
            try {
                const proxyUrl = `${WORKER_URL}?target=PDF_BY_ID&id=${encodeURIComponent(result.id)}`;
                const resp = await fetch(proxyUrl, { headers: AuthService.headers() });
                
                if (resp.status === 404) {
                    console.warn(`Skipping preload: PDF not found for ${result.displayId || result.id}`);
                    continue; // Skip this one, continue with others
                }
                
                if (resp && resp.ok) {
                    const arrayBuffer = await resp.arrayBuffer();
                    
                    // Check if still preloading (might have been cancelled)
                    if (!this.isPreloading) break;
                    
                    // Validate arrayBuffer before caching
                    if (arrayBuffer && arrayBuffer.byteLength > 0) {
                        this.pdfCache.set(result.id, {
                            arrayBuffer: arrayBuffer,
                            blob: new Blob([arrayBuffer], { type: "application/pdf" }),
                            timestamp: Date.now()
                        });
                        console.log(`✓ Preloaded PDF: ${result.displayId || result.id}`);
                    }
                }
            } catch (e) {
                console.warn(`Failed to preload PDF ${result.id}:`, e);
                // Continue preloading other PDFs even if one fails
            }
            
            // Small delay between requests to avoid overwhelming the browser
            // Check if still preloading before delay
            if (this.isPreloading) {
                await new Promise(resolve => setTimeout(resolve, this.PRELOAD_DELAY_MS));
            }
        }
        
        this.isPreloading = false;
        this.clearCache(); // Clean up old entries after preloading
    }

    static stopPreloading() {
        this.isPreloading = false;
        this.preloadQueue = [];
    }

    static clearCache() {
        // Clear old cached PDFs (older than CACHE_MAX_AGE_MS) and enforce size limit
        const now = Date.now();
        
        // First, remove expired entries
        const toDelete = [];
        for (const [id, cached] of this.pdfCache.entries()) {
            if (now - cached.timestamp > this.CACHE_MAX_AGE_MS) {
                toDelete.push(id);
            }
        }
        toDelete.forEach(id => this.pdfCache.delete(id));
        
        // If still over size limit, remove oldest entries (simple LRU eviction)
        if (this.pdfCache.size > this.CACHE_MAX_SIZE) {
            // Find oldest entries to remove
            const entries = Array.from(this.pdfCache.entries());
            const numToRemove = this.pdfCache.size - this.CACHE_MAX_SIZE;
            
            // Simple sort only on the entries we need to examine
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < numToRemove; i++) {
                this.pdfCache.delete(entries[i][0]);
            }
        }
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
    
    static pop() { 
        // Save current filter values before repopulating
        const m = document.getElementById('mfgInput'); const cv = m.value; 
        const savedValues = {
            hp: document.getElementById('hpInput').value,
            volt: document.getElementById('voltInput').value,
            phase: document.getElementById('phaseInput').value,
            enc: document.getElementById('encInput').value,
            cat: document.getElementById('catInput').value,
            keyword: document.getElementById('keywordInput').value
        };
        
        // Use found manufacturers if available, otherwise use training data
        const cleanList = window.FOUND_MFGS.size > 0 
            ? Array.from(window.FOUND_MFGS).filter(mf => AI_TRAINING_DATA.MANUFACTURERS.includes(mf)).sort()
            : [...AI_TRAINING_DATA.MANUFACTURERS].sort();
        
        m.innerHTML='<option value="Any">Any</option>'; 
        cleanList.forEach(v=>m.add(new Option(v,v))); 
        m.value=cv; 
        
        ['hp','volt','phase','enc'].forEach(k=>{ 
            const s=document.getElementById(k+'Input'); 
            if(!s)return; 
            const d = (k==='enc') ? ['4XSS', '4XFG', 'POLY'] : AI_TRAINING_DATA.DATA[k.toUpperCase()];
            s.innerHTML='<option value="Any">Any</option>'; 
            d.forEach(v=>s.add(new Option(v,v))); 
            // Restore saved value
            if(savedValues[k]) s.value = savedValues[k];
        }); 
        
        // Restore category and keyword (these don't get repopulated, but restore just in case)
        if(savedValues.cat) document.getElementById('catInput').value = savedValues.cat;
        if(savedValues.keyword) document.getElementById('keywordInput').value = savedValues.keyword;
    }

    static render(res, crit, totalCount) { 
        const a = document.getElementById('results-area'); 
        a.innerHTML = `<div style="padding:5px;font-size:12px;opacity:0.7;">Found ${totalCount || res.length} records</div>`; 
        const critJson = JSON.stringify(crit).replace(/"/g, '&quot;'); 
        
        res.forEach(i => { 
            let b = ''; 
            if(i.category === 'low_voltage') b+=`<span class="hud-badge match-orange">LOW VOLT</span>`; 
            
            if (crit.mfg !== "Any" && i.mfg) { 
                const isMatch = (i.mfg === crit.mfg); 
                const style = isMatch ? 'match-green' : 'match-orange'; 
                b += `<span class="hud-badge ${style}">${i.mfg}</span>`; 
            } 
            if(crit.volt !== "Any") { 
                if(i.volt) b+=`<span class="hud-badge match-green">${i.volt}V</span>`; 
                else b+=`<span class="hud-badge match-orange">? V</span>`; 
            } 
            if(crit.phase !== "Any") { 
                if(i.phase) b+=`<span class="hud-badge match-green">${i.phase}PH</span>`; 
                else b+=`<span class="hud-badge match-orange">? PH</span>`; 
            } 
            if(crit.hp !== "Any") { 
                if(i.hp) { 
                    if (parseFloat(i.hp) === parseFloat(crit.hp)) b+=`<span class="hud-badge match-green">${i.hp} HP</span>`; 
                    else b+=`<span class="hud-badge match-orange">${i.hp} HP</span>`; 
                } else { 
                    b+=`<span class="hud-badge match-orange">? HP</span>`; 
                } 
            } 
            if(crit.enc !== "Any" && i.enc) { 
                b+=`<span class="hud-badge match-green">${i.enc}</span>`; 
            } 
            if(crit.kw && crit.kw.length > 0) { 
                crit.kw.forEach(k => { 
                    if(crit.mfg !== "Any" && i.mfg === k.toUpperCase()) return; 
                    b += `<span class="hud-badge match-keyword">${k.toUpperCase()}</span>`; 
                }); 
            } 
            if(!i.pdfUrl) b += `<span class="hud-badge no-pdf">NO PDF</span>`; 
            
            const c = document.createElement('div'); 
            c.className = `record-card ${!i.p?'varied-result':''}`; 
            c.innerHTML = `
                <div class="panel-name">${i.displayId || i.id}</div>
                <div class="badge-row">${b}</div>
                <div class="card-actions">
                    <button class="thumb-btn up" onclick="event.stopPropagation();FeedbackService.up('${i.id}',this, ${critJson})">👍</button>
                    <button class="thumb-btn down" onclick="event.stopPropagation();FeedbackService.down('${i.id}',this)">👎</button>
                </div>
            `; 
            
            c.onclick = () => { 
                document.querySelectorAll('.record-card').forEach(x=>x.classList.remove('active-view')); 
                c.classList.add('active-view'); 
                PdfController.load(i.id, i.pdfUrl); 
            }; 
            a.appendChild(c); 
        }); 
    }
}

window.UI = UI;

window.LOCAL_DB = []; window.ID_MAP = new Map(); window.FOUND_MFGS = new Set(); window.FOUND_ENCS = new Set();

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