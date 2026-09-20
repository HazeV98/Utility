// ==========================================
// BATEOLIVE LITE - JS MODULE (Per Utility)
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

const ACTV_COLORS = {
    '1': { bg: '#ffffff', text: '#000000', border: '#000000' },
    '2': { bg: '#e3001b', text: '#ffffff', border: '#e3001b' },
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
// INIEZIONE UI Mappa Lite
// ==========================================
export function initUIBateoLite() {
    if (document.getElementById('modal-bateolite-main')) return;

    const uiHTML = `
    <style>
        #modal-bateolite-main { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #e0e0e0; display: none; flex-direction: column; }
        #bl-map { flex-grow: 1; width: 100%; height: 100%; z-index: 1; }
        
        .bl-boat-icon { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); cursor: pointer; }
        .bl-stop-icon { background: #ffffff; border: 2.5px solid #00529b; border-radius: 50%; width: 14px; height: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer; }
        .bl-line-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid; flex-shrink: 0; box-sizing: border-box; }

        /* Tasto fluttuante in alto a sinistra (Indietro) */
        .bl-back-btn { position: absolute; top: 20px; left: 20px; z-index: 1000; width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; color: #00529b; }
        
        /* Contenitore Fabs in basso a sinistra (Ricerca, Filtri) */
        .bl-fab-container { position: absolute; bottom: 30px; left: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 15px; }
        .bl-fab { width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; color: #00529b; }
        
        /* Sottomodali (Ricerca e Filtri) */
        .bl-submodal-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(3px); opacity: 0; transition: opacity 0.2s ease; }
        .bl-submodal-overlay.active { display: flex; opacity: 1; }
        
        .bl-submodal { background: white; padding: 20px; border-radius: 16px; width: 90%; max-width: 320px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; }
        .bl-submodal h3 { margin-top: 0; margin-bottom: 15px; color: #00529b; font-weight: 600; flex-shrink: 0; }
        
        .bl-search-container { position: relative; flex-shrink: 0; }
        .bl-submodal input[type="text"] { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; box-sizing: border-box; font-family: 'Inter', sans-serif; outline: none; font-size: 14px; }
        .bl-submodal input[type="text"]:focus { border-color: #00529b; }
        .bl-btn { background: #00529b; color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; transition: background 0.2s; flex-shrink: 0; margin-top: 15px; }
        .bl-btn:hover { background: #003666; }
        .bl-btn.error { background: #e53935; }
        
        .bl-suggestions-dropdown { position: absolute; top: 48px; left: 0; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); max-height: 220px; overflow-y: auto; z-index: 10; display: none; border: 1px solid #ddd; }
        .bl-suggestions-dropdown.active { display: block; }
        .bl-suggestion-item { padding: 12px 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
        .bl-suggestion-item:last-child { border-bottom: none; }
        .bl-suggestion-item:hover { background: #f0f8ff; color: #00529b; }
        
        .bl-filter-list { display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; flex-grow: 1; }
        .bl-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .bl-toggle-row:last-child { border-bottom: none; }
        .bl-toggle-info { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; color: #333; }
        
        .bl-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .bl-switch input { opacity: 0; width: 0; height: 0; }
        .bl-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 34px; }
        .bl-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .bl-switch input:checked + .bl-slider { background-color: #43a047; }
        .bl-switch input:checked + .bl-slider:before { transform: translateX(20px); }
        
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
        .leaflet-popup-content { margin: 15px; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    </style>

    <div id="modal-bateolite-main">
        
        <!-- Tasto Indietro -->
        <div class="bl-back-btn" onclick="chiudiBateoLite()" title="Torna al menu">
            <i class="fa-solid fa-arrow-left"></i>
        </div>

        <div id="bl-map"></div>
        
        <!-- Tasti Ricerca e Filtro -->
        <div class="bl-fab-container">
            <div class="bl-fab" onclick="apriBateoLiteSearchModal()" title="Cerca Mezzo o Fermata"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="bl-fab" onclick="apriBateoLiteFilterModal()" title="Filtra Linee"><i class="fa-solid fa-filter"></i></div>
        </div>

        <!-- Sottomodale Ricerca -->
        <div id="bl-search-modal" class="bl-submodal-overlay" onclick="chiudiBateoLiteModals(event)">
            <div class="bl-submodal" onclick="event.stopPropagation()">
                <h3>Cerca Mezzo / Fermata</h3>
                <div class="bl-search-container">
                    <input type="text" id="bl-search-input" placeholder="Es. Rialto, 4.2, MS 123..." autocomplete="off">
                    <div id="bl-search-suggestions" class="bl-suggestions-dropdown"></div>
                </div>
                <button id="bl-search-btn" class="bl-btn" onclick="eseguiBateoLiteSearch()">Cerca</button>
            </div>
        </div>
        
        <!-- Sottomodale Filtri -->
        <div id="bl-filter-modal" class="bl-submodal-overlay" onclick="chiudiBateoLiteModals(event)">
            <div class="bl-submodal" onclick="event.stopPropagation()">
                <h3>Filtra Linee</h3>
                <div id="bl-filter-list" class="bl-filter-list"></div>
                <button class="bl-btn" onclick="applicaBateoLiteFilter()">Applica Filtro</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    window.chiudiBateoLite = chiudiBateoLite;
    window.chiudiBateoLiteModals = chiudiBateoLiteModals;
    window.apriBateoLiteSearchModal = apriBateoLiteSearchModal;
    window.apriBateoLiteFilterModal = apriBateoLiteFilterModal;
    window.eseguiBateoLiteSearch = eseguiBateoLiteSearch;
    window.applicaBateoLiteFilter = applicaBateoLiteFilter;
    window.selezionaBateoLiteSuggestion = selezionaBateoLiteSuggestion;

    document.getElementById('bl-search-input').addEventListener('input', async function(e) {
        const q = e.target.value.toLowerCase().trim();
        const suggBox = document.getElementById('bl-search-suggestions');
        
        if(q.length < 2) { 
            suggBox.classList.remove('active'); 
            return; 
        }
        
        const mStops = globalStops.filter(s => s.name.toLowerCase().includes(q));
        const mBoats = globalBoats.filter(b => b.line.toLowerCase() === q || b.label.toLowerCase().includes(q));
        
        let html = '';
        
        mBoats.slice(0, 4).forEach(b => {
            const c = getLineColors(b.line);
            const dotHtml = `<div class="bl-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border}; width: 18px; height: 18px; font-size: 8px;">${b.line}</div>`;
            html += `<div class="bl-suggestion-item" onclick="selezionaBateoLiteSuggestion('boat', '${b.id}')">
                        ${dotHtml} <span>${b.label}</span>
                     </div>`;
        });
        
        mStops.slice(0, 4).forEach(s => {
            html += `<div class="bl-suggestion-item" onclick="selezionaBateoLiteSuggestion('stop', '${s.id}')">
                        ⚓ <span>${s.name}</span>
                     </div>`;
        });
        
        if(!html) html = `<div class="bl-suggestion-item" style="color:#999; justify-content: center;">Nessun risultato trovato</div>`;
        
        suggBox.innerHTML = html;
        suggBox.classList.add('active');
    });
}

// ==========================================
// LOGICA DI CONTROLLO
// ==========================================

export async function avviaMotoreBateoLite(db, auth, userData, isAdmin) {
    initUIBateoLite();
    document.getElementById('modal-bateolite-main').style.display = 'flex';
    
    // Attende che Leaflet e OMS siano scaricati e operativi
    await loadMapDependencies();
    
    if (!map) {
        map = L.map('bl-map', { attributionControl: false, zoomControl: false }).setView([45.4371, 12.3326], 13);
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

function chiudiBateoLite() {
    document.getElementById('modal-bateolite-main').style.display = 'none';
    if (fetchInterval) {
        clearInterval(fetchInterval);
        fetchInterval = null;
    }
}

function chiudiBateoLiteModals(e) { 
    if (e && e.target && e.target.classList && !e.target.classList.contains('bl-submodal-overlay')) return;
    document.getElementById('bl-search-modal').classList.remove('active'); 
    document.getElementById('bl-filter-modal').classList.remove('active'); 
    document.getElementById('bl-search-suggestions').classList.remove('active');
    
    const searchBtn = document.getElementById('bl-search-btn');
    if (searchBtn) {
        searchBtn.innerText = "Cerca";
        searchBtn.classList.remove("error");
    }
}

function apriBateoLiteSearchModal() { 
    document.getElementById('bl-search-modal').classList.add('active'); 
    const input = document.getElementById('bl-search-input');
    input.value = '';
    setTimeout(() => input.focus(), 50);
}

async function openBateoLiteFilterModalInternal() { 
    document.getElementById('bl-filter-modal').classList.add('active'); 
    try {
        const lines = [...new Set(globalBoats.map(b => b.line).filter(l => l !== '-'))].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
        
        let html = '';
        lines.forEach(line => {
            const isChecked = currentFilterLines.length === 0 || currentFilterLines.includes(line) ? 'checked' : '';
            const c = getLineColors(line);
            
            html += `
            <div class="bl-toggle-row">
                <div class="bl-toggle-info">
                    <div class="bl-line-dot" style="background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border};">${line}</div>
                    <span>Linea ${line}</span>
                </div>
                <label class="bl-switch">
                    <input type="checkbox" value="${line}" class="bl-line-filter-cb" ${isChecked}>
                    <span class="bl-slider"></span>
                </label>
            </div>`;
        });
        document.getElementById('bl-filter-list').innerHTML = html || '<p style="font-size:13px; color:#666; text-align:center;">Nessuna linea attiva trovata.</p>';
    } catch(e) {}
}

function apriBateoLiteFilterModal() {
    openBateoLiteFilterModalInternal();
}

function applicaBateoLiteFilter() {
    const checkboxes = document.querySelectorAll('.bl-line-filter-cb');
    const allChecked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    if (allChecked.length === checkboxes.length || allChecked.length === 0) {
        currentFilterLines = []; 
    } else {
        currentFilterLines = allChecked;
    }
    
    chiudiBateoLiteModals({target: {classList: {contains: ()=>true}}});
    
    Object.keys(boatMarkers).forEach(id => {
        oms.removeMarker(boatMarkers[id]); 
        map.removeLayer(boatMarkers[id]);
        delete boatMarkers[id];
    });
    fetchAndUpdateBoats(); 
}

function selezionaBateoLiteSuggestion(type, id) {
    chiudiBateoLiteModals({target: {classList: {contains: ()=>true}}});
    if (type === 'stop') {
        const stop = globalStops.find(s => s.id === id);
        if (stop) {
            map.setView([stop.lat, stop.lon], 16);
            L.popup()
                .setLatLng([stop.lat, stop.lon])
                .setContent(`<div style="font-family:'Inter', sans-serif; font-weight:600; text-align:center;">⚓ ${stop.name}</div>`)
                .openOn(map);
        }
    } else if (type === 'boat') {
        const boat = globalBoats.find(b => b.id === id);
        if(boat) {
            map.setView([boat.lat, boat.lon], 16);
            if (boatMarkers[boat.id]) {
                boatMarkers[boat.id].openPopup();
            }
        }
    }
}

function eseguiBateoLiteSearch() {
    const query = document.getElementById('bl-search-input').value.toLowerCase().trim();
    const btn = document.getElementById('bl-search-btn');
    
    if(!query) return;
    
    const suggBox = document.getElementById('bl-search-suggestions');
    const items = suggBox.querySelectorAll('.bl-suggestion-item');
    
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

async function loadStops() {
    try {
        const res = await fetch(`${API_URL}/api/stops`);
        globalStops = await res.json();
        const stopIcon = L.divIcon({ className: 'bl-stop-icon', iconSize: [14, 14], iconAnchor: [7, 7] });
        
        globalStops.forEach(stop => {
            const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(map);
            marker.bindPopup(`<div style="font-family:'Inter', sans-serif; font-weight:600; text-align:center; font-size:13px; color:#333;">⚓ ${stop.name}</div>`);
            oms.addMarker(marker); 
        });
    } catch(e) { console.error("Errore caricamento fermate:", e); }
}

async function fetchAndUpdateBoats() {
    if (!map) return;
    try {
        const response = await fetch(`${API_URL}/api/vaporetti/live`);
        const boats = await response.json();
        globalBoats = boats;

        boats.forEach(boat => {
            if (boat.lat && boat.lon) {
                if (currentFilterLines.length > 0 && !currentFilterLines.includes(boat.line.toUpperCase())) {
                    if (boatMarkers[boat.id]) {
                        oms.removeMarker(boatMarkers[boat.id]);
                        map.removeLayer(boatMarkers[boat.id]);
                        delete boatMarkers[boat.id];
                    }
                    return; 
                }

                const iconHtml = `<div class="bl-boat-icon" style="background-color: ${boat.color}; color: ${boat.textColor}; border: 2.5px solid ${boat.border}; width: 26px; height: 26px; box-sizing: border-box;">${boat.line}</div>`;
                const customBoatIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });

                const lineColor = boat.color === '#ffffff' ? '#000000' : boat.color;
                const popupContent = `
                    <div style="font-family:'Inter', sans-serif; text-align:center; padding:2px;">
                        <div style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.5px;">Linea <strong style="color:${lineColor}; font-size:14px; margin-left:2px;">${boat.line}</strong></div>
                        <div style="font-weight:600; font-size:14px; margin-top:6px; color:#333;">${boat.label}</div>
                    </div>`;

                if (boatMarkers[boat.id]) {
                    boatMarkers[boat.id].setLatLng([boat.lat, boat.lon]);
                    boatMarkers[boat.id].setIcon(customBoatIcon);
                    if (boatMarkers[boat.id].getPopup()) {
                        boatMarkers[boat.id].getPopup().setContent(popupContent);
                    } else {
                        boatMarkers[boat.id].bindPopup(popupContent);
                    }
                } else {
                    const marker = L.marker([boat.lat, boat.lon], { icon: customBoatIcon, zIndexOffset: 1000 }).addTo(map);
                    marker.bindPopup(popupContent);
                    oms.addMarker(marker); 
                    boatMarkers[boat.id] = marker;
                }
            }
        });
    } catch (error) { console.error("Errore di rete:", error); }
}
