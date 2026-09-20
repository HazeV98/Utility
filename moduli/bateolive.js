// ==========================================
// BATEOLIVE - JS MODULE (Versione Completa)
// ==========================================

const API_URL = 'https://bateolive.tailec23c3.ts.net';
let globalBoats = [];
let globalStops = [];
let map = null;
let oms = null;
let boatMarkers = {};
let currentFilterLines = [];
let fetchInterval = null;
let mapDepsLoaded = false;
let activeSelection = null;

const ACTV_COLORS = {
    '1': { bg: '#ffffff', text: '#000000', border: '#000000' },
    '2': { bg: '#e3001b', text: '#ffffff', border: '#e3001b' },
    '2/': { bg: '#e3001b', text: '#ffffff', border: '#e3001b' },
    '3': { bg: '#ff8c00', text: '#000000', border: '#ff8c00' },
    '4.1': { bg: '#bd429b', text: '#ffffff', border: '#bd429b' },
    '4.2': { bg: '#bd429b', text: '#ffffff', border: '#bd429b' },
    '5.1': { bg: '#60b9a6', text: '#000000', border: '#60b9a6' },
    '5.2': { bg: '#60b9a6', text: '#000000', border: '#60b9a6' },
    '6': { bg: '#0070bc', text: '#ffffff', border: '#0070bc' },
    '7': { bg: '#008b54', text: '#ffffff', border: '#008b54' },
    '8': { bg: '#6d4c41', text: '#ffffff', border: '#6d4c41' },
    '9': { bg: '#797b3a', text: '#ffffff', border: '#797b3a' },
    '10': { bg: '#00c1d5', text: '#000000', border: '#00c1d5' },
    '11': { bg: '#f49ab4', text: '#000000', border: '#f49ab4' },
    '12': { bg: '#fced22', text: '#000000', border: '#fced22' },
    '13': { bg: '#583f99', text: '#ffffff', border: '#583f99' },
    '14': { bg: '#f36e21', text: '#000000', border: '#f36e21' },
    '15': { bg: '#fced22', text: '#e3001b', border: '#e3001b' },
    '17': { bg: '#8a8c8e', text: '#ffffff', border: '#8a8c8e' },
    '18': { bg: '#fced22', text: '#000000', border: '#e3001b' },
    '20': { bg: '#cbb3d5', text: '#000000', border: '#cbb3d5' },
    '22': { bg: '#c4d82d', text: '#006600', border: '#006600' },
    'N':  { bg: '#1c355e', text: '#ffffff', border: '#1c355e' }
};

function getLineColors(lineId) {
    if (lineId === '-') return { bg: '#000000', text: '#ffffff', border: '#ffffff' };
    return ACTV_COLORS[lineId] || { bg: '#888888', text: '#ffffff', border: '#888888' };
}

const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
});

async function loadMapDependencies() {
    if (mapDepsLoaded) return;
    if (!document.getElementById('leaflet-css')) {
        const css = document.createElement('link');
        css.id = 'leaflet-css';
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
    }
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/OverlappingMarkerSpiderfier-Leaflet/0.2.6/oms.min.js');
    mapDepsLoaded = true;
}

// ==========================================
// INIEZIONE UI Mappa Completa
// ==========================================
export function initUIBateoLive() {
    if (document.getElementById('modal-bateolive-main')) return;

    const uiHTML = `
    <style>
        #modal-bateolive-main { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #e0e0e0; display: none; flex-direction: column; font-family: 'Inter', sans-serif; }
        #bv-map { flex-grow: 1; width: 100%; height: 100%; z-index: 1; }

        .bv-boat-icon { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); cursor: pointer; transition: scale 0.2s ease; }
        .bv-boat-icon:hover { scale: 1.15; }
        .bv-stop-icon { background: #ffffff; border: 2.5px solid #00529b; border-radius: 50%; width: 14px; height: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer; transition: scale 0.2s ease; }
        .bv-stop-icon:hover { scale: 1.4; }
        .bv-line-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid; flex-shrink: 0; box-sizing: border-box; }

        /* Tasto fluttuante in alto a sinistra (Indietro) */
        .bv-back-btn { position: absolute; top: 20px; left: 20px; z-index: 1000; width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; color: #00529b; }

        /* Contenitore Fabs in basso a sinistra (Ricerca, Filtri) */
        .bv-fab-container { position: absolute; bottom: 30px; left: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 15px; }

        .bv-error-banner { position: absolute; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px); z-index: 1500; background: #e53935; color: white; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease; max-width: 85%; text-align: center; }
        .bv-error-banner.active { opacity: 1; transform: translateX(-50%) translateY(0); }
        .bv-fab { width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: transform 0.2s, background 0.2s; color: #00529b; }
        .bv-fab:hover { transform: scale(1.05); background: white; }

        #bv-drawer { position: absolute; top: 15px; bottom: 15px; right: -390px; width: 360px; max-height: calc(100% - 30px); height: auto; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; box-shadow: -4px 10px 30px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.8); z-index: 1000; transition: right 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); display: flex; flex-direction: column; overflow: hidden; }
        #bv-drawer.open { right: 15px; }
        #bv-drawer-header { padding: 20px; background: linear-gradient(135deg, #00529b 0%, #003666 100%); color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        #bv-drawer-title { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; }
        #bv-close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 14px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        #bv-close-btn:hover { background: rgba(255,255,255,0.4); }
        #bv-drawer-content { padding: 0; overflow-y: auto; flex-grow: 1; }

        .bv-drawer-section { padding: 20px; }
        .bv-speed-card { background: linear-gradient(to right, #f8f9fa, #ffffff); padding: 15px; border-radius: 10px; font-size: 14px; margin-bottom: 20px; border-left: 4px solid #00529b; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
        .bv-timeline-title { font-size: 13px; text-transform: uppercase; color: #666; font-weight: 600; margin-bottom: 15px; letter-spacing: 0.5px; }

        .bv-time-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; cursor: pointer; transition: background-color 0.2s ease; }
        .bv-time-row:hover { background-color: rgba(0,0,0,0.02); }
        .bv-time-row:last-child { border-bottom: none; }
        .bv-stop-info { display: flex; align-items: center; gap: 10px; flex: 1; padding-right: 15px; overflow: hidden; }
        .bv-dot { width: 8px; height: 8px; background: #00529b; border-radius: 50%; }
        .bv-stop-name { font-weight: 500; color: #333; }

        .bv-stop-passed { opacity: 0.5; }
        .bv-stop-passed .bv-dot { background: #999; }
        .bv-stop-current { background: #f0f8ff; border-radius: 8px; padding: 12px 10px; margin: -12px -10px; }

        .bv-time-block { text-align: right; min-width: 90px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .bv-time-sub { font-size: 12px; color: #555; margin-bottom: 2px; }
        .bv-time-main { font-weight: 700; font-size: 14px; color: #111; }
        .bv-time-strike { text-decoration: line-through; color: #9e9e9e; font-size: 12px; margin-right: 4px; font-weight: 400; }

        .bv-badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; color: white; display: inline-block; text-align: center; margin-top: 4px; }
        .bv-badge-delay { background: #e53935; }
        .bv-badge-early { background: #f39c12; }
        .bv-badge-ok { background: #43a047; }

        .bv-modal-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(3px); opacity: 0; transition: opacity 0.2s ease; }
        .bv-modal-overlay.active { display: flex; opacity: 1; }

        .bv-modal { background: white; padding: 20px; border-radius: 16px; width: 90%; max-width: 320px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; }
        .bv-modal h3 { margin-top: 0; margin-bottom: 15px; color: #00529b; font-weight: 600; flex-shrink: 0; }

        .bv-search-container { position: relative; flex-shrink: 0; }
        .bv-modal input[type="text"] { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; box-sizing: border-box; font-family: 'Inter', sans-serif; outline: none; font-size: 14px; }
        .bv-modal input[type="text"]:focus { border-color: #00529b; }
        .bv-modal-btn { background: #00529b; color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; transition: background 0.2s; flex-shrink: 0; margin-top: 15px; }
        .bv-modal-btn:hover { background: #003666; }
        .bv-modal-btn.error { background: #e53935; }

        .bv-suggestions-dropdown { position: absolute; top: 48px; left: 0; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); max-height: 220px; overflow-y: auto; z-index: 10; display: none; border: 1px solid #ddd; }
        .bv-suggestions-dropdown.active { display: block; }
        .bv-suggestion-item { padding: 12px 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
        .bv-suggestion-item:last-child { border-bottom: none; }
        .bv-suggestion-item:hover { background: #f0f8ff; color: #00529b; }

        .bv-filter-list { display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; flex-grow: 1; }
        .bv-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .bv-toggle-row:last-child { border-bottom: none; }
        .bv-toggle-info { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; color: #333; }

        .bv-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .bv-switch input { opacity: 0; width: 0; height: 0; }
        .bv-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 34px; }
        .bv-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .bv-switch input:checked + .bv-slider { background-color: #43a047; }
        .bv-switch input:checked + .bv-slider:before { transform: translateX(20px); }

        #modal-bateolive-main ::-webkit-scrollbar { width: 6px; }
        #modal-bateolive-main ::-webkit-scrollbar-track { background: transparent; }
        #modal-bateolive-main ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    </style>

    <div id="modal-bateolive-main">

        <!-- Tasto Indietro -->
        <div class="bv-back-btn" onclick="chiudiBateoLive()" title="Torna al menu">
            <i class="fa-solid fa-arrow-left"></i>
        </div>

        <div id="bv-map"></div>

        <!-- Tasti Ricerca e Filtro -->
        <div id="bv-error-banner" class="bv-error-banner">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span id="bv-error-banner-text">Impossibile collegarsi al server. Verifica la connessione.</span>
        </div>

        <div class="bv-fab-container">
            <div class="bv-fab" onclick="apriBateoLiveSearchModal()" title="Cerca Mezzo o Fermata"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="bv-fab" onclick="apriBateoLiveFilterModal()" title="Filtra Linee"><i class="fa-solid fa-filter"></i></div>
        </div>

        <div id="bv-drawer">
            <div id="bv-drawer-header">
                <h3 id="bv-drawer-title">Dettagli</h3>
                <button id="bv-close-btn" onclick="closeBateoLiveDrawer()">✖</button>
            </div>
            <div id="bv-drawer-content"></div>
        </div>

        <!-- Sottomodale Ricerca -->
        <div id="bv-search-modal" class="bv-modal-overlay" onclick="chiudiBateoLiveModals(event)">
            <div class="bv-modal" onclick="event.stopPropagation()">
                <h3>Cerca Mezzo / Fermata</h3>
                <div class="bv-search-container">
                    <input type="text" id="bv-search-input" placeholder="Es. Rialto, 4.2, MS 123..." autocomplete="off">
                    <div id="bv-search-suggestions" class="bv-suggestions-dropdown"></div>
                </div>
                <button id="bv-search-btn" class="bv-modal-btn" onclick="eseguiBateoLiveSearch()">Cerca</button>
            </div>
        </div>

        <!-- Sottomodale Filtri -->
        <div id="bv-filter-modal" class="bv-modal-overlay" onclick="chiudiBateoLiveModals(event)">
            <div class="bv-modal" onclick="event.stopPropagation()">
                <h3>Filtra Linee</h3>
                <div id="bv-filter-list" class="bv-filter-list"></div>
                <button class="bv-modal-btn" onclick="applicaBateoLiveFilter()">Applica Filtro</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    window.chiudiBateoLive = chiudiBateoLive;
    window.chiudiBateoLiveModals = chiudiBateoLiveModals;
    window.closeBateoLiveDrawer = closeBateoLiveDrawer;
    window.apriBateoLiveSearchModal = apriBateoLiveSearchModal;
    window.apriBateoLiveFilterModal = apriBateoLiveFilterModal;
    window.eseguiBateoLiveSearch = eseguiBateoLiveSearch;
    window.applicaBateoLiveFilter = applicaBateoLiveFilter;
    window.selezionaBateoLiveSuggestion = selezionaBateoLiveSuggestion;
    window.locateBateoLiveBoat = locateBateoLiveBoat;

    document.getElementById('bv-search-input').addEventListener('input', async function(e) {
        const q = e.target.value.toLowerCase().trim();
        const suggBox = document.getElementById('bv-search-suggestions');

        if (q.length < 2) {
            suggBox.classList.remove('active');
            return;
        }

        const mStops = globalStops.filter(s => s.name.toLowerCase().includes(q));
        const mBoats = globalBoats.filter(b => b.line.toLowerCase() === q || b.label.toLowerCase().includes(q));

        let html = '';

        mBoats.slice(0, 4).forEach(b => {
            const c = getLineColors(b.line);
            const dotHtml = `<div class="bv-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border}; width: 18px; height: 18px; font-size: 8px;">${b.line}</div>`;
            html += `<div class="bv-suggestion-item" onclick="selezionaBateoLiveSuggestion('boat', '${b.id}')">
                        ${dotHtml} <span>🚤 ${b.label}</span>
                     </div>`;
        });

        mStops.slice(0, 5).forEach(s => {
            html += `<div class="bv-suggestion-item" onclick="selezionaBateoLiveSuggestion('stop', '${s.id}')">
                        ⚓ <span>${s.name}</span>
                     </div>`;
        });

        if (!html) html = `<div class="bv-suggestion-item" style="color:#999; justify-content: center;">Nessun risultato trovato</div>`;

        suggBox.innerHTML = html;
        suggBox.classList.add('active');
    });
}

// ==========================================
// LOGICA DI CONTROLLO
// ==========================================

export async function avviaMotoreBateoLive(db, auth, userData, isAdmin) {
    initUIBateoLive();
    document.getElementById('modal-bateolive-main').style.display = 'flex';

    await loadMapDependencies();

    if (!map) {
        map = L.map('bv-map', { attributionControl: false, zoomControl: false }).setView([45.4371, 12.3326], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        oms = new OverlappingMarkerSpiderfier(map, {
            keepSpiderfied: true,
            legWeight: 2,
            nearbyDistance: 35
        });

        loadStops();
        fetchAndUpdateBoats();
        fetchInterval = setInterval(fetchAndUpdateBoats, 500);
    } else {
        setTimeout(() => map.invalidateSize(), 100);
        if (!fetchInterval) {
            fetchInterval = setInterval(fetchAndUpdateBoats, 500);
            fetchAndUpdateBoats();
        }
    }
}

function chiudiBateoLive() {
    document.getElementById('modal-bateolive-main').style.display = 'none';
    closeBateoLiveDrawer();
    if (fetchInterval) {
        clearInterval(fetchInterval);
        fetchInterval = null;
    }
}

function closeBateoLiveDrawer() {
    activeSelection = null;
    const drawer = document.getElementById('bv-drawer');
    if (drawer) drawer.classList.remove('open');
}

function openBateoLiveDrawer(title, htmlContent) {
    document.getElementById('bv-drawer-title').innerText = title;
    document.getElementById('bv-drawer-content').innerHTML = `<div class="bv-drawer-section">${htmlContent}</div>`;
    document.getElementById('bv-drawer').classList.add('open');
}

function chiudiBateoLiveModals(e) {
    if (e && e.target && e.target.classList && !e.target.classList.contains('bv-modal-overlay')) return;
    document.getElementById('bv-search-modal').classList.remove('active');
    document.getElementById('bv-filter-modal').classList.remove('active');
    document.getElementById('bv-search-suggestions').classList.remove('active');

    const searchBtn = document.getElementById('bv-search-btn');
    if (searchBtn) {
        searchBtn.innerText = "Cerca";
        searchBtn.classList.remove("error");
    }
}

function apriBateoLiveSearchModal() {
    document.getElementById('bv-search-modal').classList.add('active');
    const input = document.getElementById('bv-search-input');
    input.value = '';
    setTimeout(() => input.focus(), 50);
}

async function openBateoLiveFilterModalInternal() {
    document.getElementById('bv-filter-modal').classList.add('active');
    try {
        const lines = [...new Set(globalBoats.map(b => b.line).filter(l => l !== '-'))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        let html = '';
        lines.forEach(line => {
            const isChecked = currentFilterLines.length === 0 || currentFilterLines.includes(line) ? 'checked' : '';
            const c = getLineColors(line);

            html += `
            <div class="bv-toggle-row">
                <div class="bv-toggle-info">
                    <div class="bv-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border};">${line}</div>
                    <span>Linea ${line}</span>
                </div>
                <label class="bv-switch">
                    <input type="checkbox" value="${line}" class="bv-line-filter-cb" ${isChecked}>
                    <span class="bv-slider"></span>
                </label>
            </div>`;
        });
        document.getElementById('bv-filter-list').innerHTML = html || '<p style="font-size:13px; color:#666; text-align:center;">Nessuna linea attiva trovata.</p>';
    } catch (e) {}
}

function apriBateoLiveFilterModal() {
    openBateoLiveFilterModalInternal();
}

function applicaBateoLiveFilter() {
    const checkboxes = document.querySelectorAll('.bv-line-filter-cb');
    const allChecked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    if (allChecked.length === checkboxes.length || allChecked.length === 0) {
        currentFilterLines = [];
    } else {
        currentFilterLines = allChecked;
    }

    chiudiBateoLiveModals({ target: { classList: { contains: () => true } } });

    Object.keys(boatMarkers).forEach(id => {
        map.removeLayer(boatMarkers[id]);
        delete boatMarkers[id];
    });
    fetchAndUpdateBoats();
}

function selezionaBateoLiveSuggestion(type, id) {
    chiudiBateoLiveModals({ target: { classList: { contains: () => true } } });
    if (type === 'stop') {
        const stop = globalStops.find(s => s.id === id);
        if (stop) {
            map.setView([stop.lat, stop.lon], 16);
            renderStopDrawer(stop);
        }
    } else if (type === 'boat') {
        const boat = globalBoats.find(b => b.id === id);
        if (boat) {
            map.setView([boat.lat, boat.lon], 16);
            renderBoatDrawer(boat);
        }
    }
}

function eseguiBateoLiveSearch() {
    const query = document.getElementById('bv-search-input').value.toLowerCase().trim();
    const btn = document.getElementById('bv-search-btn');

    if (!query) return;

    const suggBox = document.getElementById('bv-search-suggestions');
    const items = suggBox.querySelectorAll('.bv-suggestion-item');

    if (items.length > 0 && items[0].innerText !== 'Nessun risultato trovato') {
        items[0].click();
        return;
    }

    btn.innerText = "Nessun Risultato";
    btn.classList.add("error");
    setTimeout(() => {
        btn.innerText = "Cerca";
        btn.classList.remove("error");
    }, 2000);
}

function locateBateoLiveBoat(staticTripId, liveBoatId) {
    let boat = null;
    if (liveBoatId) {
        boat = globalBoats.find(b => b.id === liveBoatId);
    }
    if (!boat) {
        boat = globalBoats.find(b => b.tripId === staticTripId);
    }

    if (boat) {
        map.setView([boat.lat, boat.lon], 16);
        renderBoatDrawer(boat);
    } else {
        const msgDiv = document.getElementById('msg-' + staticTripId);
        if (msgDiv) {
            msgDiv.innerHTML = "Posizione non disponibile";
            msgDiv.style.color = "#e53935";
            setTimeout(() => { msgDiv.innerHTML = ""; }, 3000);
        }
    }
}

function showBateoLiveError(show, message) {
    const banner = document.getElementById('bv-error-banner');
    if (!banner) return;
    if (message) document.getElementById('bv-error-banner-text').innerText = message;
    banner.classList.toggle('active', !!show);
}

function formatTime(unixTimestamp) {
    if (!unixTimestamp || isNaN(unixTimestamp)) return '--:--';
    const d = new Date(unixTimestamp * 1000);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function getDelayBadge(delaySec) {
    if (delaySec === 0 || delaySec === null || delaySec === undefined) return `<span class="bv-badge bv-badge-ok">In orario</span>`;
    const min = Math.round(delaySec / 60);
    if (min >= 1) return `<span class="bv-badge bv-badge-delay">+${min}'</span>`;
    if (min <= -1) return `<span class="bv-badge bv-badge-early">${min}'</span>`;
    return `<span class="bv-badge bv-badge-ok">In orario</span>`;
}

function buildTimeLine(label, scheduled, estimated, isDelayed) {
    if (estimated) {
        if (isDelayed && scheduled) {
            return `<div class="bv-time-sub">${label}: <span class="bv-time-strike">${formatTime(scheduled)}</span><span class="bv-time-main">${formatTime(estimated)}</span></div>`;
        }
        return `<div class="bv-time-sub">${label}: <span class="bv-time-main">${formatTime(scheduled || estimated)}</span></div>`;
    }
    return `<div class="bv-time-sub">${label}: <span class="bv-time-main">--:--</span></div>`;
}

async function renderBoatDrawer(boat) {
    activeSelection = { type: 'boat', data: boat };
    let baseInfo = `
        <div class="bv-speed-card" style="justify-content: flex-start;">
            <div>Linea <strong style="font-size:16px;">${boat.line}</strong></div>
        </div>`;

    if (!boat.tripId) {
        openBateoLiveDrawer(boat.label, baseInfo + `<p style="color:#666; font-size:14px;">In attesa di assegnazione corsa...</p>`);
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/trip/${boat.tripId}/${boat.id}`);
        const stopTimes = await res.json();

        if (!activeSelection || activeSelection.type !== 'boat' || activeSelection.data.id !== boat.id) return;

        if (stopTimes.length === 0) {
            openBateoLiveDrawer(boat.label, baseInfo + `<p style="color:#666; font-size:14px;">Nessun orario disponibile per la corsa.</p>`);
            return;
        }

        let html = baseInfo + `<div class="bv-timeline-title">Percorso corsa attuale</div>`;
        stopTimes.forEach(st => {
            let badgeHtml = getDelayBadge(st.delay);
            const isOffSchedule = Math.abs(Math.round(st.delay / 60)) >= 1;

            const passedClass = st.status === 'PASSED' ? 'bv-stop-passed' : (st.status === 'CURRENT' ? 'bv-stop-current' : '');
            const dotIndicator = st.status === 'PASSED' ? '✔️' : (st.status === 'CURRENT' ? '⚓' : '<div class="bv-dot"></div>');

            let timeContent = "";
            if (st.status === 'FUTURE') {
                const targetSched = st.scheduledDeparture || st.scheduledArrival;
                const targetEst = st.estimatedDeparture || st.estimatedArrival;

                if (targetEst) {
                    if (isOffSchedule && targetSched) {
                        timeContent = `<div><span class="bv-time-strike">${formatTime(targetSched)}</span><span class="bv-time-main">${formatTime(targetEst)}</span></div>`;
                    } else {
                        timeContent = `<div><span class="bv-time-main">${formatTime(targetSched || targetEst)}</span></div>`;
                    }
                } else {
                    timeContent = `<div><span class="bv-time-main">--:--</span></div>`;
                }
            } else {
                let arrHtml = buildTimeLine("Arr", st.scheduledArrival, st.estimatedArrival, isOffSchedule);
                let depHtml = "";
                if (st.status === 'CURRENT') {
                    depHtml = `<div class="bv-time-sub">Part: <span class="bv-time-main" style="color:#00529b;">In sosta...</span></div>`;
                } else {
                    depHtml = buildTimeLine("Part", st.scheduledDeparture, st.estimatedDeparture, isOffSchedule);
                }
                timeContent = arrHtml + depHtml;
            }

            html += `
            <div class="bv-time-row ${passedClass}" style="cursor:default;">
                <div class="bv-stop-info">
                    ${dotIndicator}
                    <span class="bv-stop-name">${st.stopName}</span>
                </div>
                <div class="bv-time-block">
                    ${timeContent}
                    ${badgeHtml}
                </div>
            </div>`;
        });
        openBateoLiveDrawer(boat.label, html);
    } catch (e) { console.error(e); }
}

async function renderStopDrawer(stop) {
    activeSelection = { type: 'stop', data: stop };
    try {
        const res = await fetch(`${API_URL}/api/stop/${stop.id}`);
        const arrivals = await res.json();

        if (!activeSelection || activeSelection.type !== 'stop' || activeSelection.data.id !== stop.id) return;

        let html = `<div class="bv-timeline-title" style="margin-bottom:20px;">Partenze (Fino a -1h / +3h)</div>`;
        if (arrivals.length === 0) {
            html += `<p style="color:#666; font-size:14px;">Nessuna partenza in programma.</p>`;
        } else {
            arrivals.forEach(arr => {
                let badgeHtml = getDelayBadge(arr.delay);
                const isOffSchedule = Math.abs(Math.round(arr.delay / 60)) >= 1;

                let timeHtml = "";
                if (arr.estimated) {
                    if (isOffSchedule && arr.scheduled) {
                        timeHtml = `<span class="bv-time-strike">${formatTime(arr.scheduled)}</span><span class="bv-time-main">${formatTime(arr.estimated)}</span>`;
                    } else {
                        timeHtml = `<span class="bv-time-main">${formatTime(arr.scheduled || arr.estimated)}</span>`;
                    }
                } else {
                    timeHtml = `<span class="bv-time-main">--:--</span>`;
                }

                let opacityClass = arr.status === 'PASSED' ? 'style="opacity: 0.5;"' : (arr.status === 'CURRENT' ? 'style="background: #f0f8ff; padding: 10px; border-radius: 8px; margin: -10px;"' : '');

                let statusTextHtml = '';
                if (arr.status === 'PASSED') statusTextHtml = '<small style="color:#666; margin-top:2px;">(Partito)</small>';
                else if (arr.status === 'CURRENT') statusTextHtml = '<small style="color:#00529b; margin-top:2px; font-weight:600;">(In sosta)</small>';

                const colors = getLineColors(arr.routeId);
                const dotHtml = `<div class="bv-line-dot" style="background-color: ${colors.bg}; color: ${colors.text}; border-color: ${colors.border}; margin-right: 8px;">${arr.routeId}</div>`;

                html += `
                <div class="bv-time-row" ${opacityClass} onclick="locateBateoLiveBoat('${arr.tripId}', '${arr.liveBoatId || ''}')">
                    <div class="bv-stop-info" style="flex-direction: column; align-items: flex-start; gap: 4px; padding-bottom:4px;">
                        <div style="display: flex; align-items: center; width: 100%;">
                            ${dotHtml}
                            <span style="font-size: 14px; font-weight: 600; color: #333; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${arr.destination || 'Sconosciuta'}">${arr.destination || 'Sconosciuta'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; width:100%;">
                            ${statusTextHtml}
                            <span id="msg-${arr.tripId}" style="font-size:10px; font-weight:600; height:12px; margin-left: auto;"></span>
                        </div>
                    </div>
                    <div class="bv-time-block">
                        <div>${timeHtml}</div>
                        ${badgeHtml}
                    </div>
                </div>`;
            });
        }
        openBateoLiveDrawer(stop.name, html);
    } catch (e) { console.error(e); }
}

async function loadStops() {
    try {
        const res = await fetch(`${API_URL}/api/stops`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        globalStops = await res.json();
        showBateoLiveError(false);
        const stopIcon = L.divIcon({ className: 'bv-stop-icon', iconSize: [14, 14], iconAnchor: [7, 7] });

        // Il click va gestito tramite il listener nativo di OMS (non con un marker.on('click', ...)
        // separato): avere entrambi in competizione è ciò che faceva "scattare" il pallino,
        // anche per una fermata isolata.
        oms.addListener('click', function(marker) {
            if (marker.stopData) renderStopDrawer(marker.stopData);
        });

        globalStops.forEach(stop => {
            const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(map);
            marker.stopData = stop;
            // Solo le fermate (statiche) vengono registrate in OMS: le barche si muovono
            // di continuo e lo spiderfy di OMS entrava in conflitto col refresh posizione.
            oms.addMarker(marker);
        });
    } catch (e) {
        console.error("Errore caricamento fermate:", e);
        showBateoLiveError(true, "Impossibile collegarsi al server. Verifica la connessione.");
    }
}

async function fetchAndUpdateBoats() {
    if (!map) return;
    try {
        const response = await fetch(`${API_URL}/api/vaporetti/live`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const boats = await response.json();
        globalBoats = boats;
        showBateoLiveError(false);

        boats.forEach(boat => {
            if (boat.lat && boat.lon) {
                if (currentFilterLines.length > 0 && !currentFilterLines.includes(boat.line.toUpperCase())) {
                    if (boatMarkers[boat.id]) {
                        map.removeLayer(boatMarkers[boat.id]);
                        delete boatMarkers[boat.id];
                    }
                    return;
                }

                const c = getLineColors(boat.line.toUpperCase());
                const iconHtml = `<div class="bv-boat-icon" style="background-color: ${c.bg}; color: ${c.text}; border: 2.5px solid ${c.border}; width: 26px; height: 26px; box-sizing: border-box;">${boat.line}</div>`;
                const customBoatIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });

                if (boatMarkers[boat.id]) {
                    boatMarkers[boat.id].setLatLng([boat.lat, boat.lon]);
                    boatMarkers[boat.id].setIcon(customBoatIcon);
                    boatMarkers[boat.id].off('click').on('click', () => renderBoatDrawer(boat));
                } else {
                    const marker = L.marker([boat.lat, boat.lon], { icon: customBoatIcon, zIndexOffset: 1000 }).addTo(map);
                    marker.on('click', () => renderBoatDrawer(boat));
                    boatMarkers[boat.id] = marker;
                }

                if (activeSelection && activeSelection.type === 'boat' && activeSelection.data.id === boat.id) {
                    renderBoatDrawer(boat);
                }
            }
        });

        if (activeSelection && activeSelection.type === 'stop') {
            renderStopDrawer(activeSelection.data);
        }

    } catch (error) {
        console.error("Errore di rete:", error);
        showBateoLiveError(true, "Impossibile collegarsi al server. Verifica la connessione.");
    }
}
