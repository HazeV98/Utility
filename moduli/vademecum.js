import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { inizializzaMappaCanali } from './vd_mappa.js';
import { inizializzaScheda } from './vd_scheda.js';
import { inizializzaPlanimetria } from './vd_planimetria.js';

const firebaseConfig = { 
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4", 
    authDomain: "utility-haze.firebaseapp.com", 
    projectId: "utility-haze", 
    storageBucket: "utility-haze.firebasestorage.app", 
    messagingSenderId: "686237947418", 
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3" 
};

const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app);

// Inizializza albero vuoto[span_2](start_span)[span_2](end_span)
let treeData = { "root": [] };

let navigationStack = ["root"];
let isEditMode = false;
let globalIsAdmin = false;
let globalIsCollab = false;
let sortableInstance = null;

// ==========================================
// 1. INIEZIONE UI VADEMECUM
// ==========================================
export function initUIVademecum() {
    if (document.getElementById('modal-vademecum-main')) return;

    if (!document.querySelector('link[href*="leaflet.css"]')) {
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />');
    }
    if (!document.querySelector('script[src*="Sortable"]')) {
        let scriptSortable = document.createElement('script');
        scriptSortable.src = "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js";
        document.head.appendChild(scriptSortable);
    }
    if (!document.querySelector('script[src*="leaflet.js"]')) {
        let scriptLeaflet = document.createElement('script');
        scriptLeaflet.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        document.head.appendChild(scriptLeaflet);
    }

    window.apriModal = (id) => document.getElementById(id).style.display = 'flex';
    window.chiudiModal = (id) => document.getElementById(id).style.display = 'none';
    window.chiudiSuSfondo = (e, id) => { if (e.target.id === id) window.chiudiModal(id); };

    const uiHTML = `
    <style>
        #modal-vademecum-main { 
            --primary: #0066cc; 
            --primary-hover: #0052a3;
            --primary-glow: rgba(0, 102, 204, 0.2);
            --surface: #ffffff;
            --surface-hover: #f8f9fa;
            --text-main: #1a1a1a; 
            --text-muted: #5f6368;
            --border-color: #e0e0e0;
            --bg-color: #f0f2f5;
            --danger: #d93025;
            --success: #0f9d58;
            --warning: #ffb74d;
            --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            --shadow-md: 0 10px 20px -5px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05);
            --shadow-lg: 0 25px 50px -12px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04);
            --radius-md: 14px;
            --radius-lg: 24px;
            --transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        :root[data-theme="dark"] #modal-vademecum-main {
            --primary: #4da3ff;
            --primary-hover: #73b9ff;
            --primary-glow: rgba(77, 163, 255, 0.25);
            --bg-color: #0f1115;
            --surface: #1a1d24;
            --surface-hover: #232730;
            --text-main: #e8eaed;
            --text-muted: #9aa0a6;
            --border-color: #2f333d;
            --success: #34a853;
            --danger: #ea4335;
            --warning: #ffb74d;
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) #modal-vademecum-main {
                --primary: #4da3ff;
                --primary-hover: #73b9ff;
                --bg-color: #0f1115;
                --surface: #1a1d24;
                --surface-hover: #232730;
                --text-main: #e8eaed;
                --text-muted: #9aa0a6;
                --border-color: #2f333d;
            }
        }

        #modal-vademecum-main {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 6000;
            font-family: 'Inter', -apple-system, sans-serif; 
            background-color: var(--bg-color);
            margin: 0; padding: 0; overflow: hidden; color: var(--text-main);
            transition: background-color 0.4s ease;
        }

        #modal-vademecum-main .vd-header {
            position: absolute; 
            top: calc(12px + env(safe-area-inset-top)); 
            left: 50%; transform: translateX(-50%);
            width: calc(100% - 32px); max-width: 1168px;
            height: 65px; padding: 0 20px; 
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            box-shadow: var(--shadow-md); z-index: 100; box-sizing: border-box;
            display: flex; align-items: center; justify-content: space-between;
            border-radius: var(--radius-lg);
            border: 1px solid rgba(255, 255, 255, 0.6);
            transition: var(--transition);
        }

        :root[data-theme="dark"] #modal-vademecum-main .vd-header { background: rgba(26, 29, 36, 0.85); border-color: rgba(255, 255, 255, 0.1); }
        @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) #modal-vademecum-main .vd-header { background: rgba(26, 29, 36, 0.85); border-color: rgba(255, 255, 255, 0.1); } }

        #modal-vademecum-main .vd-header-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        #modal-vademecum-main .vd-header-center { flex: 1; transition: var(--transition); padding: 0 10px; overflow: hidden; }
        #modal-vademecum-main .vd-header-center.text-center { text-align: center; }
        #modal-vademecum-main .vd-header-center.text-left { text-align: left; }
        #modal-vademecum-main .vd-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; justify-content: flex-end; }
        #modal-vademecum-main .vd-title { font-size: 19px; font-weight: 800; margin: 0; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.5px; }
        
        #modal-vademecum-main .icon-btn {
            background: var(--surface); border: 1px solid var(--border-color); font-size: 18px;
            color: var(--primary); cursor: pointer; width: 38px; height: 38px; 
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm);
        }
        #modal-vademecum-main .icon-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--primary); color: var(--primary-hover); }
        #modal-vademecum-main .icon-btn:active { transform: scale(0.92) translateY(2px); box-shadow: var(--shadow-sm); }
        #modal-vademecum-main .icon-btn.btn-transparent { background: transparent; border: none; box-shadow: none; font-size: 20px; width: auto; height: auto; }
        #modal-vademecum-main .icon-btn.btn-transparent:hover { transform: none; color: var(--primary-hover); }

        #modal-vademecum-main .vd-viewport {
            position: relative; width: 100%; height: 100vh;
            padding-top: calc(90px + env(safe-area-inset-top)); 
            overflow-x: hidden; box-sizing: border-box;
        }

        #modal-vademecum-main .vd-panel {
            position: absolute; top: calc(90px + env(safe-area-inset-top)); left: 0;
            width: 100%; height: calc(100vh - 90px - env(safe-area-inset-top));
            padding: 20px; box-sizing: border-box; overflow-y: auto;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        #modal-vademecum-main .panel-center { transform: translateX(0); }
        #modal-vademecum-main .panel-left { transform: translateX(-100%); }
        #modal-vademecum-main .panel-right { transform: translateX(100%); }

        #modal-vademecum-main .vd-list-item {
            display: flex; align-items: center; justify-content: space-between;
            background: var(--surface); padding: 18px 20px; border-radius: var(--radius-md); 
            margin-bottom: 12px; cursor: pointer; border: 1px solid var(--border-color); transition: var(--transition);
            box-shadow: 0 6px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03), inset 0 -4px 6px rgba(0,0,0,0.02);
        }
        :root[data-theme="dark"] #modal-vademecum-main .vd-list-item { box-shadow: 0 10px 20px -2px rgba(0,0,0,0.9), 0 4px 8px -2px rgba(0,0,0,0.7), inset 0 -6px 12px rgba(0,0,0,0.7), inset 1px 1px 3px rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); }
        @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) #modal-vademecum-main .vd-list-item { box-shadow: 0 10px 20px -2px rgba(0,0,0,0.9), 0 4px 8px -2px rgba(0,0,0,0.7), inset 0 -6px 12px rgba(0,0,0,0.7), inset 1px 1px 3px rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); } }
        
        #modal-vademecum-main .vd-list-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--primary); }
        #modal-vademecum-main .vd-list-item:active { background: var(--surface-hover); transform: scale(0.97) translateY(2px); box-shadow: var(--shadow-sm); }
        #modal-vademecum-main .item-title { font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 14px; }
        #modal-vademecum-main .edit-controls { display: none; gap: 10px; align-items: center; }
        #modal-vademecum-main .drag-handle { color: var(--text-muted); cursor: grab; padding: 10px; font-size: 18px; }
        #modal-vademecum-main .drag-handle:active { cursor: grabbing; }

        #modal-vademecum-main .modal-overlay { 
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.6); justify-content: center; align-items: center; 
            z-index: 7000; padding: 20px; box-sizing: border-box; 
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); 
            animation: fadeIn 0.3s ease; 
        }
        #modal-vademecum-main .modal-content { 
            background: var(--surface); padding: 32px; border-radius: var(--radius-lg); 
            width: 100%; max-width: 380px; text-align: left; 
            box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255,255,255,0.1) inset; 
            border: 1px solid var(--border-color); position: relative; 
            color: var(--text-main); max-height: 90vh; overflow-y: auto; 
            animation: slideInUpBouncy 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUpBouncy { 
            0% { opacity: 0; transform: translateY(35px) scale(0.9); } 
            65% { opacity: 1; transform: translateY(-4px) scale(1.02); } 
            100% { opacity: 1; transform: translateY(0) scale(1); } 
        }

        #modal-vademecum-main .vd-list-item .info-btn-view { display: none; }
        #modal-vademecum-main .vd-list-item.has-info .info-btn-view { display: flex; }
        #modal-vademecum-main .edit-mode .vd-list-item .info-btn-view,
        #modal-vademecum-main .edit-mode .edit-controls { display: flex; }

        #modal-vademecum-main .input-field { width: 100%; padding: 12px 16px; margin-bottom: 20px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-color); color: var(--text-main); font-family: inherit; font-size: 14px; box-sizing: border-box; transition: var(--transition); }
        #modal-vademecum-main .input-field:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
        #modal-vademecum-main .btn-action { width: 100%; padding: 14px; border: none; border-radius: var(--radius-md); background-color: var(--primary); color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: var(--transition); box-shadow: 0 4px 12px var(--primary-glow); }
        #modal-vademecum-main .btn-action:hover { background-color: var(--primary-hover); transform: translateY(-2px); box-shadow: var(--shadow-md); }
        #modal-vademecum-main .btn-action:active { transform: scale(0.98) translateY(0); box-shadow: var(--shadow-sm); }
    </style>

    <div id="modal-vademecum-main" style="display:none;">
        <header class="vd-header">
            <div class="vd-header-left">
                <button class="icon-btn btn-transparent" onclick="document.getElementById('modal-vademecum-main').style.display='none'" title="Chiudi Vademecum">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <button id="btn-back" class="icon-btn btn-transparent" style="display: none;" onclick="window.Vademecum.goBack()">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            </div>
            <div class="vd-header-center text-center" id="header-title-container">
                <h2 id="vd-main-title" class="vd-title">Vademecum</h2>
            </div>
            <div class="vd-header-right">
                <button id="btn-token-admin" class="icon-btn" style="display:none; color: var(--warning); border-color: var(--warning);" onclick="window.apriModal('tokenModal')" title="Imposta Token">
                    <i class="fa-solid fa-key"></i>
                </button>
                <button id="btn-edit-mode" class="icon-btn" style="display:none;" onclick="window.Vademecum.toggleEditMode()" title="Modifica">
                    <i id="edit-icon" class="fa-solid fa-pen"></i>
                </button>
            </div>
        </header>

        <main class="vd-viewport" id="viewport"></main>

        <div id="add-fab" style="display: none; position: absolute; bottom: 30px; right: 30px; z-index: 90;">
            <button class="icon-btn" style="background: var(--primary); color: white; border-radius: 50%; width: 60px; height: 60px; box-shadow: 0 4px 12px rgba(0,102,204,0.4); font-size: 24px;" onclick="window.Vademecum.openAddModal()">
                <i class="fa-solid fa-plus"></i>
            </button>
        </div>

        <div id="tokenModal" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'tokenModal')">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; color: var(--text-muted); cursor: pointer;" onclick="window.chiudiModal('tokenModal')"></i>
                <h3 style="margin-top:0; color: var(--danger);"><i class="fa-solid fa-key"></i> Token GitHub</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Inserisci il Personal Access Token per abilitare il caricamento di planimetrie e foto.</p>
                <input type="password" id="adminPatToken" class="input-field" placeholder="ghp_...">
                <button class="btn-action" onclick="window.Vademecum.salvaToken()">Salva Token</button>
            </div>
        </div>

        <div id="nodeModal" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'nodeModal')">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; color: var(--text-muted); cursor: pointer;" onclick="window.chiudiModal('nodeModal')"></i>
                <h3 id="nodeModalTitle" style="margin-top:0; color: var(--primary);"><i class="fa-solid fa-plus"></i> Nuova Voce</h3>
                <input type="hidden" id="nodeId">
                <input type="hidden" id="nodeParent">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom:8px; display:block;">TITOLO</label>
                <input type="text" id="nodeTitolo" class="input-field" placeholder="Es. Procedure di Emergenza">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom:8px; display:block;">ICONA (FontAwesome)</label>
                <input type="text" id="nodeIcona" class="input-field" placeholder="es. fa-life-ring">
                <div id="sezione-tipo-nodo">
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom:8px; display:block;">TIPO CONTENUTO</label>
                    <select id="nodeTipo" class="input-field">
                        <option value="categoria">Sottocartella (Menu)</option>
                        <option value="scheda">Scheda Testuale/Foto</option>
                        <option value="planimetria">Planimetria Interattiva</option>
                        <option value="mappa">Mappa Dinamica</option>
                    </select>
                </div>
                <div style="margin-bottom: 20px; background: rgba(255, 183, 77, 0.1); padding: 12px; border-radius: 12px; border: 1px dashed var(--warning);">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #d88900;">
                        <input type="checkbox" id="nodeInLavorazione" style="width: 18px; height: 18px;">
                        <i class="fa-solid fa-person-digging"></i> In lavorazione (Nascosto)
                    </label>
                </div>
                <button id="btn-salva-nodo" class="btn-action" onclick="window.Vademecum.salvaNodo()">Salva Voce</button>
                <button id="btn-elimina-nodo" class="btn-action" style="background: transparent; color: var(--danger); border: 2px solid var(--danger); margin-top: 10px; display: none;" onclick="window.Vademecum.eliminaNodo()">Elimina Voce</button>
            </div>
        </div>

        <div id="moveModal" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'moveModal')">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; color: var(--text-muted); cursor: pointer;" onclick="window.chiudiModal('moveModal')"></i>
                <h3 style="margin-top:0; color: var(--primary);"><i class="fa-solid fa-folder-tree"></i> Sposta in...</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">Seleziona la cartella di destinazione:</p>
                <div id="move-folder-list" style="max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;"></div>
            </div>
        </div>

        <div id="infoNodoModal" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'infoNodoModal')">
            <div class="modal-content">
                <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; color: var(--text-muted); cursor: pointer;" onclick="window.chiudiModal('infoNodoModal')"></i>
                <div id="infoNodoContent"></div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO VADEMECUM
// ==========================================
export function avviaMotoreVademecum() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "utenti", user.uid));
            if (docSnap.exists()) {
                const userData = docSnap.data();
                globalIsAdmin = (user.uid === "xm1LR5TeiKgBfuo0Htt6q3G1LdU2");
                globalIsCollab = (userData.ruolo === 'collaborator');

                if (globalIsAdmin || globalIsCollab) {
                    document.getElementById('adminPatToken').value = localStorage.getItem('gh_admin_token') || '';
                    document.getElementById('btn-edit-mode').style.display = 'flex';
                }
            }
            await loadTreeDataFromFirebase();
            renderPanel("root", "panel-center");
        } else {
            alert("Effettua il login su Utility per accedere.");
            window.location.href = "index.html";
        }
    });

    window.Vademecum = { 
        goBack, navigate, toggleEditMode, salvaToken,
        openAddModal, openEditNodeModal, salvaNodo, eliminaNodo,
        openMoveModal, eseguiSpostamento, apriInfoNodo, salvaInfoNodo
    };
}

// ==========================================
// LOGICA DI NAVIGAZIONE E DRILL-DOWN[span_3](start_span)[span_3](end_span)
// ==========================================

function navigate(targetId, targetTitolo, tipo) {
    if (isEditMode) return; 

    const btnEdit = document.getElementById('btn-edit-mode');
    if (tipo !== "categoria") {
        if (btnEdit) btnEdit.style.display = 'none';
    }

    if (tipo === "categoria") {
        navigationStack.push(targetId);
        aggiornaHeader(targetTitolo, true);
        renderPanel(targetId, "panel-right");
        effettuaScorrimento("avanti");
    } else if (tipo === "mappa") {
        apriMappaLeaflet(targetId, targetTitolo);
    } else if (tipo === "planimetria") {
        apriPlanimetria(targetId, targetTitolo);
    } else if (tipo === "scheda") {
        apriScheda(targetId, targetTitolo);
    }
}

function goBack() {
    if (navigationStack.length <= 1) return;
    if (isEditMode) toggleEditMode(); 
    
    navigationStack.pop();
    const currentId = navigationStack[navigationStack.length - 1];
    
    let targetTitolo = "Vademecum";
    let isSub = false;
    if (currentId !== "root") {
        isSub = true;
        for (const key in treeData) {
            const found = treeData[key].find(item => item.id === currentId);
            if (found) { targetTitolo = found.titolo; break; }
        }
    }
    
    aggiornaHeader(targetTitolo, isSub);
    
    const btnEdit = document.getElementById('btn-edit-mode');
    if (globalIsAdmin || globalIsCollab) {
        if (btnEdit) btnEdit.style.display = 'flex';
    }

    renderPanel(currentId, "panel-left");
    effettuaScorrimento("indietro");
}

function aggiornaHeader(titolo, isSottocategoria) {
    document.getElementById('vd-main-title').innerText = titolo;
    document.getElementById('btn-back').style.display = isSottocategoria ? 'block' : 'none';
    
    const container = document.getElementById('header-title-container');
    if (isSottocategoria) {
        container.classList.replace('text-center', 'text-left');
    } else {
        container.classList.replace('text-left', 'text-center');
    }
}

function effettuaScorrimento(direzione) {
    setTimeout(() => {
        const panels = document.querySelectorAll('.vd-panel');
        if (panels.length < 2) return;
        
        const o = panels[panels.length - 2]; 
        const n = panels[panels.length - 1]; 

        if (direzione === "avanti") { 
            o.classList.replace('panel-center', 'panel-left'); 
            n.classList.replace('panel-right', 'panel-center'); 
        } else { 
            o.classList.replace('panel-center', 'panel-right'); 
            n.classList.replace('panel-left', 'panel-center'); 
        }
        
        setTimeout(() => { 
            if (o) o.remove(); 
            document.querySelectorAll('.vd-panel').forEach(p => {
                if (p !== n) p.remove();
            });
        }, 400);
    }, 50);
}

function renderPanel(nodeId, positionClass) {
    const viewport = document.getElementById('viewport');
    if (positionClass === "panel-center") {
        const existing = document.getElementById(`panel-${nodeId}`);
        if(existing) existing.remove();
    }
    
    const panel = document.createElement('div');
    panel.className = `vd-panel ${positionClass}`;
    panel.id = `panel-${nodeId}`;

    const items = treeData[nodeId] || [];
    
    let renderedCount = 0;

    if (items.length === 0) {
        panel.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Nessuna voce presente. <br> Premi la matita in alto per aggiungerne una.</div>`;
    } else {
        items.forEach(item => {
            if (item.inLavorazione && !(globalIsAdmin || globalIsCollab)) {
                return; 
            }
            
            renderedCount++;

            const isNav = item.tipo === 'categoria' ? '' : 'display:none;';
            const iconColor = item.tipo === 'categoria' ? 'color:var(--primary);' : 'color:var(--text-muted);';
            const safeTitle = item.titolo.replace(/'/g, "\\'");
            
            const wipBadge = item.inLavorazione ? `<span style="background: var(--warning); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: bold;"><i class="fa-solid fa-person-digging"></i> WIP</span>` : '';
            
            const hasInfoClass = (item.infoTesto && item.infoTesto.trim() !== '') ? 'has-info' : '';

            const itemHTML = `
                <div class="vd-list-item ${hasInfoClass}" data-id="${item.id}" onclick="window.Vademecum.navigate('${item.id}', '${safeTitle}', '${item.tipo}')">
                    <div class="item-title"><i class="fa-solid ${item.icona || 'fa-folder'}" style="${iconColor}"></i> ${item.titolo} ${wipBadge}</div>
                    
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="edit-controls">
                            <button class="icon-btn" style="color:#17a2b8; width:32px; height:32px;" onclick="event.stopPropagation(); window.Vademecum.openMoveModal('${item.id}', '${item.tipo}')">
                                <i class="fa-solid fa-arrow-right-to-bracket" style="font-size:14px;"></i>
                            </button>
                            <button class="icon-btn" style="color:var(--text-muted); width:32px; height:32px;" onclick="event.stopPropagation(); window.Vademecum.openEditNodeModal('${item.id}', '${safeTitle}', '${item.icona}', '${item.tipo}', ${item.inLavorazione ? 'true' : 'false'})">
                                <i class="fa-solid fa-pen" style="font-size:14px;"></i>
                            </button>
                            <i class="fa-solid fa-grip-lines drag-handle"></i>
                        </div>
                        
                        <button class="icon-btn btn-transparent info-btn-view" style="color:var(--primary); font-size:18px; padding:0; margin:0;" onclick="event.stopPropagation(); window.Vademecum.apriInfoNodo('${item.id}')" title="Info Voce">
                            <i class="fa-solid fa-circle-info"></i>
                        </button>

                        <i class="fa-solid fa-chevron-right" style="color:var(--border-color); ${isNav}"></i>
                    </div>
                </div>`;
            panel.insertAdjacentHTML('beforeend', itemHTML);
        });

        if (renderedCount === 0 && !(globalIsAdmin || globalIsCollab)) {
             panel.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Contenuti in lavorazione.</div>`;
        }
    }
    viewport.appendChild(panel);
    if (isEditMode) initSortable(panel);
}

// ==========================================
// EDITOR ALBERO (AGGIUNTA / MODIFICA / ORDINE)[span_4](start_span)[span_4](end_span)
// ==========================================

function openAddModal() {
    document.getElementById('nodeModalTitle').innerHTML = '<i class="fa-solid fa-plus"></i> Nuova Voce';
    document.getElementById('nodeId').value = "";
    document.getElementById('nodeTitolo').value = "";
    document.getElementById('nodeIcona').value = "fa-folder";
    document.getElementById('nodeInLavorazione').checked = false; 
    
    document.getElementById('sezione-tipo-nodo').style.display = "block";
    document.getElementById('nodeTipo').value = "categoria";
    document.getElementById('btn-elimina-nodo').style.display = "none";
    
    const currentId = navigationStack[navigationStack.length - 1];
    document.getElementById('nodeParent').value = currentId;
    
    window.apriModal('nodeModal');
}

function openEditNodeModal(id, titolo, icona, tipo, inLavorazione = false) {
    document.getElementById('nodeModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Modifica Voce';
    document.getElementById('nodeId').value = id;
    document.getElementById('nodeTitolo').value = titolo;
    document.getElementById('nodeIcona').value = icona || '';
    document.getElementById('nodeInLavorazione').checked = inLavorazione; 
    
    document.getElementById('sezione-tipo-nodo').style.display = "none";
    document.getElementById('btn-elimina-nodo').style.display = "block";
    
    const currentId = navigationStack[navigationStack.length - 1];
    document.getElementById('nodeParent').value = currentId;
    
    window.apriModal('nodeModal');
}

function salvaNodo() {
    const id = document.getElementById('nodeId').value;
    const parent = document.getElementById('nodeParent').value;
    const titolo = document.getElementById('nodeTitolo').value.trim();
    let icona = document.getElementById('nodeIcona').value.trim() || 'fa-folder';
    const tipo = document.getElementById('nodeTipo').value;
    const inLavorazione = document.getElementById('nodeInLavorazione').checked;
    
    if (!icona.includes('fa-')) icona = 'fa-solid fa-' + icona;

    if (!titolo) return alert("Inserisci un titolo valido.");
    if (!treeData[parent]) treeData[parent] = [];
    
    if (id) {
        const item = treeData[parent].find(i => i.id === id);
        if(item) {
            item.titolo = titolo;
            item.icona = icona;
            item.inLavorazione = inLavorazione; 
        }
    } else {
        const newId = tipo + "_" + Date.now();
        treeData[parent].push({
            id: newId,
            titolo: titolo,
            icona: icona,
            tipo: tipo,
            inLavorazione: inLavorazione 
        });
        if (tipo === 'categoria') treeData[newId] = []; 
    }
    
    window.chiudiModal('nodeModal');
    salvaAlberoSuFirebase();
    renderPanel(parent, "panel-center"); 
}

function eliminaNodo() {
    if(!confirm("Attenzione: Sei sicuro di voler eliminare questa voce? Se è una scheda, anche il testo e tutti i file multimediali collegati verranno eliminati dal server definitivamente.")) return;
    
    const id = document.getElementById('nodeId').value;
    const parent = document.getElementById('nodeParent').value;
    const nodo = treeData[parent].find(i => i.id === id);
    
    if (nodo && nodo.tipo === 'scheda') {
        puliziaFileGitHub(nodo.id);
    }
    
    treeData[parent] = treeData[parent].filter(i => i.id !== id);
    if (treeData[id]) delete treeData[id]; 
    
    window.chiudiModal('nodeModal');
    salvaAlberoSuFirebase();
    renderPanel(parent, "panel-center");
}

async function puliziaFileGitHub(schedaId) {
    const token = localStorage.getItem('gh_admin_token');
    if (!token) return;
    
    const GH_OWNER = "hazev98"; 
    const GH_REPO = "Utility-test";
    const pathScheda = `assets/schede/${schedaId}.json`;
    
    try {
        const resScheda = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pathScheda}?t=${Date.now()}`, { headers: { 'Authorization': `token ${token}` }});
        
        if (resScheda.ok) {
            const fileData = await resScheda.json();
            const jsonStr = decodeURIComponent(escape(atob(fileData.content)));
            const datiScheda = JSON.parse(jsonStr);
            
            if (datiScheda.media && datiScheda.media.length > 0) {
                for (const mediaPath of datiScheda.media) {
                    const resMedia = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${mediaPath}`, { headers: { 'Authorization': `token ${token}` }});
                    if (resMedia.ok) {
                        const mediaSha = (await resMedia.json()).sha;
                        await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${mediaPath}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: `Pulizia media scheda eliminata`, sha: mediaSha })
                        });
                    }
                }
            }
            
            await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pathScheda}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Eliminata scheda ${schedaId}`, sha: fileData.sha })
            });
        }
    } catch(e) { console.error("Errore pulizia in background:", e); }
}


function toggleEditMode() {
    isEditMode = !isEditMode;
    const viewport = document.getElementById('viewport');
    const icona = document.getElementById('edit-icon');
    const btnToken = document.getElementById('btn-token-admin');
    const fab = document.getElementById('add-fab');

    if (isEditMode) {
        viewport.classList.add('edit-mode');
        icona.className = "fa-solid fa-check"; icona.style.color = "var(--success)";
        btnToken.style.display = "flex";
        fab.style.display = "block";
        const activePanel = document.querySelector('.vd-panel.panel-center');
        if (activePanel) initSortable(activePanel);
        
        window.dispatchEvent(new CustomEvent('vademecum-edit-toggled', { detail: { isEdit: true } }));
    } else {
        viewport.classList.remove('edit-mode');
        icona.className = "fa-solid fa-pen"; icona.style.color = "var(--primary)";
        btnToken.style.display = "none";
        fab.style.display = "none";
        
        if (sortableInstance) {
            try { sortableInstance.destroy(); } catch(e) {}
            sortableInstance = null;
        }
        
        salvaAlberoSuFirebase();
        
        window.dispatchEvent(new CustomEvent('vademecum-edit-toggled', { detail: { isEdit: false } }));
    }
}

function initSortable(element) {
    if (sortableInstance) {
        try { sortableInstance.destroy(); } catch(e) {}
        sortableInstance = null;
    }
    
    sortableInstance = new Sortable(element, { 
        handle: '.drag-handle', 
        animation: 150,
        onEnd: () => {
            const currentId = navigationStack[navigationStack.length - 1];
            const nuovoOrdine = [];
            
            element.querySelectorAll('.vd-list-item').forEach(el => {
                const itemId = el.getAttribute('data-id');
                const found = treeData[currentId].find(i => i.id === itemId);
                if (found) nuovoOrdine.push(found);
            });
            
            treeData[currentId] = nuovoOrdine;
        }
    });
}


function salvaToken() {
    const pat = document.getElementById('adminPatToken').value.trim();
    if (pat) localStorage.setItem('gh_admin_token', pat);
    window.chiudiModal('tokenModal');
}

// ==========================================
// LOGICA INFO VOCE MENU[span_5](start_span)[span_5](end_span)
// ==========================================

function apriInfoNodo(id) {
    let nodo = null;
    for (const key in treeData) {
        const found = treeData[key].find(item => item.id === id);
        if (found) { nodo = found; break; }
    }
    if (!nodo) return;

    let html = `<h3 style="margin-bottom: 15px; color: var(--primary);"><i class="fa-solid fa-circle-info"></i> Info: ${nodo.titolo}</h3>`;
    
    if (isEditMode) {
        html += `
            <textarea id="node-info-text" style="width:100%; min-height:150px; padding:10px; border-radius:8px; border:1px solid var(--border-color); box-sizing:border-box; margin-bottom:15px; font-family:inherit;">${nodo.infoTesto || ""}</textarea>
            <button onclick="window.Vademecum.salvaInfoNodo('${id}')" style="width:100%; background:var(--success); color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-floppy-disk"></i> Salva Informazioni</button>
        `;
    } else {
        html += `
            <div style="width:100%; min-height:100px; padding:10px; border-radius:8px; background:var(--surface); border:1px solid var(--border-color); box-sizing:border-box; white-space:pre-wrap; color: var(--text-main); line-height: 1.5;">${nodo.infoTesto || "Nessuna informazione disponibile."}</div>
        `;
    }

    document.getElementById('infoNodoContent').innerHTML = html;
    window.apriModal('infoNodoModal');
}

function salvaInfoNodo(id) {
    let nodo = null;
    let parentKey = null;
    
    for (const key in treeData) {
        const found = treeData[key].find(item => item.id === id);
        if (found) { nodo = found; parentKey = key; break; }
    }
    
    if (!nodo) return;

    nodo.infoTesto = document.getElementById('node-info-text').value;
    salvaAlberoSuFirebase();
    window.chiudiModal('infoNodoModal');
    
    const currentId = navigationStack[navigationStack.length - 1];
    if (parentKey === currentId) {
        renderPanel(currentId, "panel-center");
    }
}

// ==========================================
// LOGICA SPOSTAMENTO (FILE E CARTELLE)[span_6](start_span)[span_6](end_span)
// ==========================================

let nodeToMove = null;
let nodeToMoveParent = null;

function openMoveModal(id, tipo) {
    nodeToMove = id;
    nodeToMoveParent = navigationStack[navigationStack.length - 1];

    let forbiddenIds = [id];
    if (tipo === 'categoria') {
        forbiddenIds = forbiddenIds.concat(getTuttiFigliCategoria(id));
    }

    const container = document.getElementById('move-folder-list');
    container.innerHTML = '';

    if (nodeToMoveParent !== 'root') {
         container.innerHTML += createMoveBtn('root', 'Principale (Vademecum)', 0);
    }

    buildFolderTree('root', 0, forbiddenIds, container);

    window.apriModal('moveModal');
}

function getTuttiFigliCategoria(catId) {
    let figli = [];
    if (treeData[catId]) {
        treeData[catId].forEach(item => {
            if (item.tipo === 'categoria') {
                figli.push(item.id);
                figli = figli.concat(getTuttiFigliCategoria(item.id));
            }
        });
    }
    return figli;
}

function buildFolderTree(parentId, level, forbiddenIds, container) {
    if (!treeData[parentId]) return;
    
    treeData[parentId].forEach(item => {
        if (item.tipo === 'categoria') {
            if (!forbiddenIds.includes(item.id)) {
                if (item.id !== nodeToMoveParent) {
                    container.innerHTML += createMoveBtn(item.id, item.titolo, level + 1);
                }
                buildFolderTree(item.id, level + 1, forbiddenIds, container);
            }
        }
    });
}

function createMoveBtn(id, titolo, level) {
    const padding = level * 15;
    return `<button style="text-align:left; padding: 14px 14px 14px ${14 + padding}px; background:var(--surface-hover); border:1px solid var(--border-color); border-radius:10px; color:var(--text-main); font-weight:600; cursor:pointer;" onclick="window.Vademecum.eseguiSpostamento('${id}')"><i class="fa-solid fa-folder" style="color:var(--primary); margin-right:10px;"></i> ${titolo}</button>`;
}

function eseguiSpostamento(targetParentId) {
    const idx = treeData[nodeToMoveParent].findIndex(i => i.id === nodeToMove);
    if(idx > -1) {
        const obj = treeData[nodeToMoveParent].splice(idx, 1)[0];
        
        if (!treeData[targetParentId]) treeData[targetParentId] = [];
        treeData[targetParentId].push(obj);
        
        salvaAlberoSuFirebase();
        window.chiudiModal('moveModal');
        
        renderPanel(nodeToMoveParent, "panel-center");
    }
}

// ==========================================
// INIZIALIZZAZIONE COMPONENTI FINALI[span_7](start_span)[span_7](end_span)
// ==========================================

function apriMappaLeaflet(id, titolo) {
    const existing = document.getElementById(`panel-mappa_${id}`);
    if (existing) existing.remove(); 

    navigationStack.push("mappa_" + id);
    aggiornaHeader(titolo, true);
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`; panel.id = `panel-mappa_${id}`;
    panel.innerHTML = `<div id="container-mappa-canali" style="width: 100%; height: 100%;"></div>`;
    document.getElementById('viewport').appendChild(panel);
    effettuaScorrimento("avanti");
    inizializzaMappaCanali("container-mappa-canali");
}

function apriScheda(id, titolo) {
    const existing = document.getElementById(`panel-scheda_${id}`);
    if (existing) existing.remove(); 

    navigationStack.push("scheda_" + id);
    aggiornaHeader(titolo, true);
    
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`; 
    panel.id = `panel-scheda_${id}`;
    
    panel.innerHTML = `<div id="container-scheda-${id}" style="padding-bottom: 80px;"></div>`;
    
    document.getElementById('viewport').appendChild(panel);
    effettuaScorrimento("avanti");
    
    inizializzaScheda(`container-scheda-${id}`, id, db, (globalIsAdmin || globalIsCollab));
}


function apriPlanimetria(id, titolo) {
    const existing = document.getElementById(`panel-plan_${id}`);
    if (existing) existing.remove(); 

    navigationStack.push("plan_" + id);
    aggiornaHeader(titolo, true);
    const panel = document.createElement('div');
    panel.className = `vd-panel panel-right`; panel.id = `panel-plan_${id}`;
    panel.innerHTML = `<div id="container-plan-${id}" style="width: 100%; height: 100%;"></div>`;
    document.getElementById('viewport').appendChild(panel);
    effettuaScorrimento("avanti");
    inizializzaPlanimetria(`container-plan-${id}`, id, db, (globalIsAdmin || globalIsCollab));
}

// ==========================================
// SALVATAGGIO CLOUD[span_8](start_span)[span_8](end_span)
// ==========================================

async function loadTreeDataFromFirebase() {
    try { 
        const snap = await getDoc(doc(db, "app_data", "vademecum_tree")); 
        if (snap.exists() && Object.keys(snap.data()).length > 0) {
            treeData = snap.data(); 
        } else {
            treeData = { "root": [] }; 
        }
    } catch(e) { console.error(e); }
}

async function salvaAlberoSuFirebase() {
    try { await setDoc(doc(db, "app_data", "vademecum_tree"), treeData); } 
    catch(e) { console.error("Errore Sync:", e); }
}
