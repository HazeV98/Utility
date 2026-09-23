// ==========================================
// BATEOLIVE - JS MODULE (Versione Completa)
// ==========================================

const API_URL = 'https://api.bateolive.stream';
let globalBoats = [];
let globalStops = [];
let map = null;
let oms = null;
let boatMarkers = {};
let otherUsersMarkers = {};
let userMarker = null;
let currentFilterLines = [];
let fetchInterval = null;
let mapDepsLoaded = false;
let activeSelection = null;

// Livelli Mappa e Stile
let baseOSM, baseSat, nauticLayer;
let currentMapMode = 0; // 0: Base, 1: Satellitare

// Variabili GPS, Identità e Unità Personalizzata
let watchId = null;
let speedHistory = [];
const SMOOTHING_WINDOW_MS = 2000;
let lastValidHeading = null;
let currentUserId = null;
let currentUserName = "Collega";
let customUnitName = localStorage.getItem('bv_custom_unit') || '';
let customLine = localStorage.getItem('bv_custom_line') || '';

// Variabili Controllo Vista Mappa
let followUser = false; 
let courseUp = false;

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

const BATEOLIVE_LINE_ITEMS = [
    { value: '', label: 'Nessuna linea', color: { bg: '#e7ebf1', text: '#1b2430', border: '#c9d2dd' } },
    { value: '1', label: 'Linea 1' },
    { value: '2', label: 'Linea 2' },
    { value: '2/', label: 'Linea 2/' },
    { value: '3', label: 'Linea 3' },
    { value: '4.1', label: 'Linea 4.1' },
    { value: '4.2', label: 'Linea 4.2' },
    { value: '5.1', label: 'Linea 5.1' },
    { value: '5.2', label: 'Linea 5.2' },
    { value: '6', label: 'Linea 6' },
    { value: '7', label: 'Linea 7' },
    { value: '8', label: 'Linea 8' },
    { value: '9', label: 'Linea 9' },
    { value: '10', label: 'Linea 10' },
    { value: '11', label: 'Linea 11' },
    { value: '12', label: 'Linea 12' },
    { value: '13', label: 'Linea 13' },
    { value: '14', label: 'Linea 14' },
    { value: '15', label: 'Linea 15' },
    { value: '17', label: 'Linea 17' },
    { value: '18', label: 'Linea 18' },
    { value: '20', label: 'Linea 20' },
    { value: '22', label: 'Linea 22' },
    { value: 'N', label: 'Linea N' }
];

function renderBateoLiveLineSelector() {
    const optionsEl = document.getElementById('bv-unit-line-options');
    const triggerEl = document.getElementById('bv-unit-line-trigger');
    const triggerContent = triggerEl && triggerEl.querySelector('.bv-line-select-content');

    if (!optionsEl || !triggerContent) return;

    const selectedItem = BATEOLIVE_LINE_ITEMS.find(item => item.value === customLine) || BATEOLIVE_LINE_ITEMS[0];
    const selectedColor = selectedItem.color || getLineColors(selectedItem.value);

    triggerContent.innerHTML = `
        <span class="bv-line-dot-badge" style="background: ${selectedColor.bg}; color: ${selectedColor.text}; border-color: ${selectedColor.border};">${selectedItem.value || '•'}</span>
        <span>${selectedItem.label}</span>
    `;

    optionsEl.innerHTML = BATEOLIVE_LINE_ITEMS.map(item => {
        const color = item.color || getLineColors(item.value);
        const isSelected = item.value === customLine;
        return `
            <button type="button" class="bv-line-option ${isSelected ? 'selected' : ''}" data-value="${item.value}" data-label="${item.label}">
                <span class="bv-line-dot-badge" style="background: ${color.bg}; color: ${color.text}; border-color: ${color.border};">${item.value || '•'}</span>
                <span>${item.label}</span>
            </button>
        `;
    }).join('');

    optionsEl.querySelectorAll('.bv-line-option').forEach(option => {
        option.addEventListener('click', () => {
            const nextValue = option.dataset.value;
            customLine = nextValue;
            renderBateoLiveLineSelector();
            optionsEl.classList.remove('active');
            triggerEl.setAttribute('aria-expanded', 'false');
        });
    });
}

function initBateoLiveLineSelectorEvents() {
    const triggerEl = document.getElementById('bv-unit-line-trigger');
    const optionsEl = document.getElementById('bv-unit-line-options');
    if (!triggerEl || !optionsEl) return;

    triggerEl.addEventListener('click', () => {
        const isOpen = optionsEl.classList.contains('active');
        optionsEl.classList.toggle('active', !isOpen);
        triggerEl.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (event) => {
        const isInside = event.target.closest('#bv-unit-line-trigger') || event.target.closest('#bv-unit-line-options');
        if (!isInside) {
            optionsEl.classList.remove('active');
            triggerEl.setAttribute('aria-expanded', 'false');
        }
    });
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
        #modal-bateolive-main { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #e0e0e0; display: none; flex-direction: column; font-family: 'Inter', sans-serif; overflow: hidden; }
        
        #bv-map-wrapper { flex-grow: 1; position: relative; overflow: hidden; background: #aad3df; z-index: 1; }
        #bv-map { width: 200%; height: 200%; position: absolute; top: -50%; left: -50%; z-index: 1; transition: transform 0.2s linear; }

        .bv-boat-icon { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); cursor: pointer; transform: rotate(var(--marker-rotation, 0deg)); transition: transform 0.2s linear, scale 0.2s ease; }
        .bv-boat-icon:hover { scale: 1.15; }
        
        .bv-stop-icon-wrap { width: 14px; height: 14px; }
        .bv-stop-icon-inner { background: #ffffff; border: 2.5px solid #00529b; border-radius: 50%; width: 14px; height: 14px; box-sizing: border-box; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer; transition: scale 0.2s ease; }
        .bv-stop-icon-inner:hover { scale: 1.4; }
        
        .bv-line-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid; flex-shrink: 0; box-sizing: border-box; }

        /* Tasto fluttuante in alto a sinistra (Indietro) */
        .bv-back-btn { position: absolute; top: calc(20px + env(safe-area-inset-top, 0px)); left: 20px; z-index: 1000; width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; color: #00529b; }

        /* Contenitore Fabs in basso a sinistra */
        .bv-fab-container { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom, 0px)); left: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 15px; }

        .bv-error-banner { position: absolute; top: calc(20px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%) translateY(-20px); z-index: 1500; background: #e53935; color: white; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease; max-width: 85%; text-align: center; }
        .bv-error-banner.active { opacity: 1; transform: translateX(-50%) translateY(0); }
        .bv-fab { width: 45px; height: 45px; border-radius: 50%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: transform 0.2s, background 0.2s; color: #00529b; }
        .bv-fab.active { background: #00529b; color: white; }
        .bv-fab:hover { transform: scale(1.05); }

        /* HUD Bussola Superiore */
        .bv-hud-compass { position: absolute; top: calc(15px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); width: 250px; height: 60px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 4px 15px rgba(0,0,0,0.2); overflow: hidden; z-index: 1000; display: flex; align-items: center; justify-content: center; display: none; }
        .bv-compass-tape { position: absolute; top: 10px; left: 0; height: 100%; display: flex; transition: transform 0.15s linear; }
        .bv-compass-mark { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 60px; flex-shrink: 0; }
        .bv-tick { width: 2px; height: 8px; background: #666; margin-bottom: 4px; border-radius: 2px; }
        .bv-tick.major { height: 16px; background: #00529b; width: 3px; }
        .bv-compass-label { color: #666; font-size: 12px; font-weight: 600; }
        .bv-compass-label.major { color: #333; font-size: 14px; font-weight: 900; }
        .bv-compass-center-line { position: absolute; left: 50%; top: 0; width: 3px; height: 30px; background: #e3001b; transform: translateX(-50%); z-index: 10; border-radius: 2px; }

        /* HUD Velocità Inferiore Destra */
        .bv-hud-speed { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom, 0px)); right: 20px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); padding: 12px 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 1000; display: none; }
        .bv-speed-wrapper { display: flex; align-items: baseline; justify-content: center; gap: 5px; }
        .bv-speed-val { font-size: 42px; font-weight: 900; color: #00529b; line-height: 0.9; }
        .bv-speed-unit { font-size: 16px; font-weight: bold; color: #666; }

        .bv-hud-status { position: absolute; top: calc(85px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); z-index: 1500; background: rgba(0,0,0,0.6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }

        #bv-drawer { position: absolute; top: calc(15px + env(safe-area-inset-top, 0px)); bottom: calc(15px + env(safe-area-inset-bottom, 0px)); right: -390px; width: 360px; max-height: calc(100% - 30px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); height: auto; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; box-shadow: -4px 10px 30px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.8); z-index: 1000; transition: right 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); display: flex; flex-direction: column; overflow: hidden; }
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

        .bv-modal-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(3px); opacity: 0; transition: opacity 0.2s ease; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }
        .bv-modal-overlay.active { display: flex; opacity: 1; }

        .bv-modal { background: white; padding: 20px; border-radius: 16px; width: 90%; max-width: 320px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; }
        .bv-modal h3 { margin-top: 0; margin-bottom: 15px; color: #00529b; font-weight: 600; flex-shrink: 0; }

        .bv-search-container { position: relative; flex-shrink: 0; }
        .bv-modal input[type="text"] { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; box-sizing: border-box; font-family: 'Inter', sans-serif; outline: none; font-size: 14px; }
        .bv-modal input[type="text"]:focus { border-color: #00529b; }
        .bv-line-select { position: relative; margin-bottom: 15px; }
        .bv-line-select-trigger { width: 100%; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: 'Inter', sans-serif; color: #222; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-sizing: border-box; }
        .bv-line-select-content { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .bv-line-select-arrow { color: #666; font-size: 12px; }
        .bv-line-select-options { display: none; position: absolute; left: 0; right: 0; top: calc(100% + 6px); background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.12); max-height: 250px; overflow-y: auto; z-index: 20; }
        .bv-line-select-options.active { display: block; }
        .bv-line-option { width: 100%; border: none; background: white; padding: 10px 12px; text-align: left; display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; font-family: 'Inter', sans-serif; color: #222; }
        .bv-line-option:hover, .bv-line-option.selected { background: #f3f7ff; }
        .bv-line-dot-badge { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; border: 2px solid; flex-shrink: 0; }
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

        <div id="bv-map-wrapper">
            <div id="bv-map"></div>
        </div>

        <!-- HUD Bussola e Stato -->
        <div id="bv-hud-compass" class="bv-hud-compass">
            <div class="bv-compass-center-line"></div>
            <div id="bv-compass-tape" class="bv-compass-tape"></div>
        </div>

        <div id="bv-hud-status" class="bv-hud-status">Acquisizione GPS...</div>

        <!-- HUD Velocità -->
        <div id="bv-hud-speed" class="bv-hud-speed">
            <div class="bv-speed-wrapper">
                <span id="bv-speed-val" class="bv-speed-val">0.0</span>
                <span class="bv-speed-unit">km/h</span>
            </div>
        </div>

        <!-- Tasti Fluttuanti (FAB) -->
        <div id="bv-error-banner" class="bv-error-banner">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span id="bv-error-banner-text">Impossibile collegarsi al server. Verifica la connessione.</span>
        </div>

        <div class="bv-fab-container">
            <div id="bv-fab-gps" class="bv-fab" onclick="toggleBvGPS()" title="Attiva/Disattiva GPS">
                <i class="fa-solid fa-satellite-dish"></i>
            </div>
            <div id="bv-fab-center" class="bv-fab" onclick="toggleBvCenterMap()" title="Centra sulla Posizione" style="display: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2L4 20L12 17L20 20L12 2Z"/></svg>
            </div>
            <div id="bv-fab-rotate" class="bv-fab" onclick="toggleBvMapRotation()" title="Rotazione Mappa (Rotta in alto)" style="display: none;">
                <i class="fa-regular fa-compass"></i>
            </div>
            <div id="bv-fab-layers" class="bv-fab" onclick="cambiaStileBvMappa()" title="Cambia Stile Cartografico">
                <i class="fa-solid fa-layer-group"></i>
            </div>
            <div class="bv-fab" onclick="apriBateoLiveUnitModal()" title="Configura Unità e Linea">
                <i class="fa-solid fa-ship"></i>
            </div>
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

        <!-- Sottomodale Configurazione Unità -->
        <div id="bv-unit-modal" class="bv-modal-overlay" onclick="chiudiBateoLiveModals(event)">
            <div class="bv-modal" onclick="event.stopPropagation()">
                <h3>Configurazione Unità</h3>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 600; color: #666; display: block; margin-bottom: 4px;">Nome Unità / Mezzo</label>
                    <input type="text" id="bv-unit-name-input" placeholder="Es. M/S 200, M/B 1" autocomplete="off">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; font-weight: 600; color: #666; display: block; margin-bottom: 4px;">Linea in servizio (opzionale)</label>
                    <div class="bv-line-select">
                        <button type="button" id="bv-unit-line-trigger" class="bv-line-select-trigger" aria-expanded="false">
                            <span class="bv-line-select-content"></span>
                            <span class="bv-line-select-arrow">▾</span>
                        </button>
                        <div id="bv-unit-line-options" class="bv-line-select-options" role="listbox" aria-label="Seleziona linea"></div>
                    </div>
                </div>
                <button class="bv-modal-btn" onclick="salvaConfigurazioneUnita()">Salva</button>
            </div>
        </div>

        <!-- Sottomodale Ricerca -->
        <div id="bv-search-modal" class="bv-modal-overlay" onclick="chiudiBateoLiveModals(event)">
            <div class="bv-modal" onclick="event.stopPropagation()">
                <h3>Cerca Mezzo / Fermata</h3>
                <div class="bv-search-container">
                    <input type="text" id="bv-search-input" placeholder="Es. Rialto, 4.2..." autocomplete="off">
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

    // Inizializzazione Tape Bussola
    const tape = document.getElementById('bv-compass-tape');
    let tapeHTML = '';
    const directions = {0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO'};
    for (let cycle = -1; cycle <= 1; cycle++) {
        for (let deg = 0; deg < 360; deg += 10) {
            let isMajor = (deg % 90 === 0);
            let tickClass = 'bv-tick' + (isMajor ? ' major' : '');
            let labelClass = 'bv-compass-label' + (isMajor ? ' major' : '');
            let labelText = directions[deg] !== undefined ? directions[deg] : deg;
            tapeHTML += `<div class="bv-compass-mark"><div class="${tickClass}"></div><div class="${labelClass}">${labelText}</div></div>`;
        }
    }
    tape.innerHTML = tapeHTML;

    window.chiudiBateoLive = chiudiBateoLive;
    window.chiudiBateoLiveModals = chiudiBateoLiveModals;
    window.closeBateoLiveDrawer = closeBateoLiveDrawer;
    window.apriBateoLiveSearchModal = apriBateoLiveSearchModal;
    window.apriBateoLiveFilterModal = apriBateoLiveFilterModal;
    window.apriBateoLiveUnitModal = apriBateoLiveUnitModal;
    window.salvaConfigurazioneUnita = salvaConfigurazioneUnita;
    window.eseguiBateoLiveSearch = eseguiBateoLiveSearch;
    window.applicaBateoLiveFilter = applicaBateoLiveFilter;
    window.selezionaBateoLiveSuggestion = selezionaBateoLiveSuggestion;
    window.locateBateoLiveBoat = locateBateoLiveBoat;
    window.toggleBvGPS = toggleBvGPS;
    window.toggleBvCenterMap = toggleBvCenterMap;
    window.toggleBvMapRotation = toggleBvMapRotation;
    window.cambiaStileBvMappa = cambiaStileBvMappa;

    initBateoLiveLineSelectorEvents();
    renderBateoLiveLineSelector();

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
// LOGICA DI CONTROLLO MOTORE & GPS
// ==========================================

export async function avviaMotoreBateoLive(db, auth, userData, isAdmin) {
    currentUserId = (auth && auth.currentUser) ? auth.currentUser.uid : 'user_' + Math.random().toString(36).substr(2, 9);
    currentUserName = (userData && userData.nome) ? userData.nome : "Collega";

    initUIBateoLive();
    document.getElementById('modal-bateolive-main').style.display = 'flex';

    await loadMapDependencies();

    if (!map) {
        baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
        baseSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
        nauticLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 18 });

        map = L.map('bv-map', { 
            attributionControl: false, 
            zoomControl: false,
            layers: [baseOSM, nauticLayer]
        }).setView([45.4371, 12.3326], 13);

        oms = new OverlappingMarkerSpiderfier(map, {
            keepSpiderfied: true,
            legWeight: 2,
            nearbyDistance: 35
        });

        map.on('dragstart', () => {
            if (followUser && !courseUp) {
                toggleBvCenterMap(false);
            }
        });

        loadStops();
        fetchAndUpdateBoats();
        fetchInterval = setInterval(() => {
            fetchAndUpdateBoats();
            sincronizzaPosizioneAltriUtenti();
        }, 1500);
    } else {
        setTimeout(() => map.invalidateSize(), 100);
        if (!fetchInterval) {
            fetchInterval = setInterval(() => {
                fetchAndUpdateBoats();
                sincronizzaPosizioneAltriUtenti();
            }, 1500);
            fetchAndUpdateBoats();
        }
    }
}

function apriBateoLiveUnitModal() {
    document.getElementById('bv-unit-modal').classList.add('active');
    lockBateoLiveMap();
    document.getElementById('bv-unit-name-input').value = customUnitName;
    renderBateoLiveLineSelector();
}

function salvaConfigurazioneUnita() {
    customUnitName = document.getElementById('bv-unit-name-input').value.trim();
    localStorage.setItem('bv_custom_unit', customUnitName);
    localStorage.setItem('bv_custom_line', customLine);
    chiudiBateoLiveModals({ target: { classList: { contains: () => true } } });
}

function cambiaStileBvMappa() {
    if (!map) return;
    
    currentMapMode = (currentMapMode + 1) % 2;
    const hudStatus = document.getElementById('bv-hud-status');
    
    if (map.hasLayer(baseOSM)) map.removeLayer(baseOSM);
    if (map.hasLayer(baseSat)) map.removeLayer(baseSat);
    
    if (!map.hasLayer(nauticLayer)) map.addLayer(nauticLayer);

    if (currentMapMode === 0) {
        map.addLayer(baseOSM);
        hudStatus.innerText = "Mappa Base Nautica";
    } else if (currentMapMode === 1) {
        map.addLayer(baseSat);
        hudStatus.innerText = "Mappa Satellitare";
    }
    
    if (map.hasLayer(nauticLayer)) nauticLayer.bringToFront();

    hudStatus.style.background = "rgba(0, 82, 155, 0.9)";
    hudStatus.style.display = 'block';
    setTimeout(() => {
        if (watchId && !lastValidHeading && document.getElementById('bv-speed-val').textContent === "0.0") {
            hudStatus.innerText = "Acquisizione GPS...";
            hudStatus.style.background = "rgba(0,0,0,0.6)";
        } else {
            hudStatus.style.display = 'none';
        }
    }, 2000);
}

function toggleBvCenterMap(forceState = null) {
    followUser = forceState !== null ? forceState : !followUser;
    document.getElementById('bv-fab-center').classList.toggle('active', followUser);
    
    if (followUser && userMarker && map) {
        map.setView(userMarker.getLatLng());
    }
    
    if (!followUser && courseUp) {
        toggleBvMapRotation(false);
    }
}

function toggleBvMapRotation(forceState = null) {
    courseUp = forceState !== null ? forceState : !courseUp;
    const fabRot = document.getElementById('bv-fab-rotate');
    fabRot.classList.toggle('active', courseUp);
    
    const mapEl = document.getElementById('bv-map');

    if (courseUp) {
        if (map) map.dragging.disable();
        if (!followUser) toggleBvCenterMap(true);
        
        let h = lastValidHeading || 0;
        let normalizedHeading = h % 360;
        if (normalizedHeading < 0) normalizedHeading += 360;
        
        mapEl.style.transform = `rotate(-${normalizedHeading}deg)`;
        mapEl.style.setProperty('--marker-rotation', `${normalizedHeading}deg`);
    } else {
        if (map) map.dragging.enable();
        mapEl.style.transform = `rotate(0deg)`;
        mapEl.style.setProperty('--marker-rotation', `0deg`);
    }
}

function toggleBvGPS() {
    const fab = document.getElementById('bv-fab-gps');
    const hudCompass = document.getElementById('bv-hud-compass');
    const hudSpeed = document.getElementById('bv-hud-speed');
    const hudStatus = document.getElementById('bv-hud-status');
    const fabCenter = document.getElementById('bv-fab-center');
    const fabRotate = document.getElementById('bv-fab-rotate');

    if (fab.classList.contains('active')) {
        fab.classList.remove('active');
        hudCompass.style.display = 'none';
        hudSpeed.style.display = 'none';
        hudStatus.style.display = 'none';
        fabCenter.style.display = 'none';
        fabRotate.style.display = 'none';
        
        toggleBvCenterMap(false);
        toggleBvMapRotation(false);
        
        if (watchId) navigator.geolocation.clearWatch(watchId);
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
    } else {
        fab.classList.add('active');
        hudCompass.style.display = 'flex';
        hudSpeed.style.display = 'block';
        hudStatus.style.display = 'block';
        hudStatus.innerText = "Acquisizione GPS...";
        hudStatus.style.background = "rgba(0,0,0,0.6)";
        fabCenter.style.display = 'flex';
        fabRotate.style.display = 'flex';
        
        toggleBvCenterMap(true); 
        speedHistory = [];
        
        watchId = navigator.geolocation.watchPosition(elaboraBvPosizioneGPS, (err) => {
            hudStatus.innerText = "Errore GPS: " + err.message;
            hudStatus.style.background = "rgba(227, 0, 27, 0.8)";
            hudStatus.style.display = 'block';
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    }
}

function elaboraBvPosizioneGPS(position) {
    const coords = position.coords;
    const now = Date.now();
    
    const hudStatus = document.getElementById('bv-hud-status');
    if (hudStatus.innerText === "Acquisizione GPS...") hudStatus.style.display = 'none'; 
    
    let rawSpeedMs = coords.speed || 0;
    speedHistory.push({ speed: rawSpeedMs, time: now });
    speedHistory = speedHistory.filter(entry => now - entry.time <= SMOOTHING_WINDOW_MS);
    let avgSpeedMs = speedHistory.reduce((sum, entry) => sum + entry.speed, 0) / speedHistory.length;

    let speedKmh = avgSpeedMs * 3.6;
    document.getElementById('bv-speed-val').textContent = speedKmh.toFixed(1);

    if (coords.heading !== null && (rawSpeedMs >= 0.5 || lastValidHeading === null)) {
        lastValidHeading = coords.heading;
    }
    
    let validHeading = lastValidHeading || 0;

    const svgArrow = `
    <div style="transform: rotate(${validHeading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5)); transition: transform 0.2s linear;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#00529b" stroke="white" stroke-width="1.5" stroke-linejoin="round">
            <path d="M12 2L4 20L12 17L20 20L12 2Z"/>
        </svg>
    </div>`;
    
    const userIcon = L.divIcon({ html: svgArrow, className: '', iconSize: [32,32], iconAnchor: [16,16] });

    if (!userMarker) {
        userMarker = L.marker([coords.latitude, coords.longitude], {
            icon: userIcon, zIndexOffset: 2000
        }).addTo(map);
    } else {
        userMarker.setLatLng([coords.latitude, coords.longitude]);
        userMarker.setIcon(userIcon);
    }
    
    if (followUser) map.setView([coords.latitude, coords.longitude]);

    let normalizedHeading = validHeading % 360;
    if (normalizedHeading < 0) normalizedHeading += 360;
    
    if (courseUp) {
        const mapEl = document.getElementById('bv-map');
        mapEl.style.transform = `rotate(-${normalizedHeading}deg)`;
        mapEl.style.setProperty('--marker-rotation', `${normalizedHeading}deg`);
    }

    const tape = document.getElementById('bv-compass-tape');
    const widthPerMark = 60; 
    const pxPerDegree = widthPerMark / 10; 
    const baseOffset = 36 * widthPerMark; 
    const targetX = - (baseOffset + (normalizedHeading * pxPerDegree)) + 125 - 30; 
    tape.style.transform = `translateX(${targetX}px)`;

    inviaBvPosizionePersonale(coords.latitude, coords.longitude, speedKmh, validHeading);
}

function inviaBvPosizionePersonale(lat, lon, speed, heading) {
    if (!currentUserId) return;

    fetch(`${API_URL}/api/users/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: currentUserId,
            lat: lat,
            lon: lon,
            speed: speed,
            heading: heading,
            nome: customUnitName || currentUserName,
            line: customLine || ''
        })
    }).catch(err => console.error("Errore invio posizione:", err));
}

async function sincronizzaPosizioneAltriUtenti() {
    if (!map || !currentUserId) return;
    try {
        const response = await fetch(`${API_URL}/api/users/live`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const users = await response.json();
        const activeIds = Object.keys(users);

        activeIds.forEach(uid => {
            if (uid === currentUserId) return; 

            const u = users[uid];
            const uHeading = u.heading || 0;
            const uLine = u.line ? u.line.trim() : '';

            let iconHtml = '';
            let iconSize = [32, 32];
            let iconAnchor = [16, 16];

            if (uLine) {
                const c = getLineColors(uLine.toUpperCase());
                iconHtml = `<div class="bv-boat-icon" style="background-color: ${c.bg}; color: ${c.text}; border: 3px solid #28a745; width: 26px; height: 26px; box-sizing: border-box;">${uLine}</div>`;
                iconSize = [26, 26];
                iconAnchor = [13, 13];
            } else {
                iconHtml = `
                <div style="transform: rotate(${uHeading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5)); transition: transform 0.2s linear;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#28a745" stroke="white" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M12 2L4 20L12 17L20 20L12 2Z"/>
                    </svg>
                </div>`;
            }

            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: iconSize, iconAnchor: iconAnchor });

            let popupContent = `<div style="text-align:center;">Velocità: ${parseFloat(u.speed || 0).toFixed(1)} km/h</div>`;
            if (u.nome && u.nome !== currentUserName) {
                popupContent = `<div style="text-align:center;"><b>${u.nome}</b><br>Velocità: ${parseFloat(u.speed || 0).toFixed(1)} km/h</div>`;
            }

            if (otherUsersMarkers[uid]) {
                otherUsersMarkers[uid].setLatLng([u.lat, u.lon]);
                otherUsersMarkers[uid].setIcon(icon);
                if (otherUsersMarkers[uid].getPopup()) {
                    otherUsersMarkers[uid].getPopup().setContent(popupContent);
                }
            } else {
                const marker = L.marker([u.lat, u.lon], { icon: icon }).addTo(map);
                marker.bindPopup(popupContent);
                otherUsersMarkers[uid] = marker;
            }
        });

        Object.keys(otherUsersMarkers).forEach(uid => {
            if (!activeIds.includes(uid)) {
                map.removeLayer(otherUsersMarkers[uid]);
                delete otherUsersMarkers[uid];
            }
        });
    } catch (error) { console.error("Errore ricezione altri utenti:", error); }
}

function lockBateoLiveMap() {
    if (!map) return;
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoom.disable();
    if (map.tap) map.tap.disable();
}

function unlockBateoLiveMap() {
    if (!map) return;
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoom.enable();
    if (map.tap) map.tap.enable();
}

function chiudiBateoLive() {
    document.getElementById('modal-bateolive-main').style.display = 'none';
    closeBateoLiveDrawer();
    if (watchId) navigator.geolocation.clearWatch(watchId);
    document.getElementById('bv-hud-compass').style.display = 'none';
    document.getElementById('bv-hud-speed').style.display = 'none';
    document.getElementById('bv-fab-center').style.display = 'none';
    document.getElementById('bv-fab-rotate').style.display = 'none';
    document.getElementById('bv-fab-gps').classList.remove('active');
    
    courseUp = false;
    followUser = false;
    const mapEl = document.getElementById('bv-map');
    mapEl.style.transform = `rotate(0deg)`;
    mapEl.style.setProperty('--marker-rotation', `0deg`);

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
    document.getElementById('bv-unit-modal').classList.remove('active');
    document.getElementById('bv-search-suggestions').classList.remove('active');

    unlockBateoLiveMap();

    const searchBtn = document.getElementById('bv-search-btn');
    if (searchBtn) {
        searchBtn.innerText = "Cerca";
        searchBtn.classList.remove("error");
    }
}

function apriBateoLiveSearchModal() {
    document.getElementById('bv-search-modal').classList.add('active');
    lockBateoLiveMap();
    const input = document.getElementById('bv-search-input');
    input.value = '';
    setTimeout(() => input.focus(), 50);
}

async function openBateoLiveFilterModalInternal() {
    document.getElementById('bv-filter-modal').classList.add('active');
    lockBateoLiveMap();
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
        oms.removeMarker(boatMarkers[id]);
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
        
        const stopIcon = L.divIcon({ html: '<div class="bv-stop-icon-inner"></div>', className: 'bv-stop-icon-wrap', iconSize: [14, 14], iconAnchor: [7, 7] });

        globalStops.forEach(stop => {
            const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon }).addTo(map);
            marker.on('click', () => renderStopDrawer(stop));
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
                        oms.removeMarker(boatMarkers[boat.id]);
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
                    oms.addMarker(marker);
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
