// ==========================================
// ARCHIVIO - JS MODULE (file unico: interfaccia + logica)
// Gestore file dell'archivio sul server (data/archivio): si apre direttamente sulle cartelle, che si creano da qui.
// Tutti possono sfogliare, cercare, aprire e scaricare. Solo l'admin vede in alto i tasti per creare una cartella
// e per caricare un documento (generico, oppure file turni che il server analizza e a cui allega il PDF dei risultati),
// e su ogni riga il tasto per modificare, spostare o eliminare.
// Come in bateolive.js l'admin si riconosce dal ruolo "admin" nel profilo (collezione utenti).
//
// Uso (come documenti.js + ui_documenti.js, ma in un file solo):
//     import { initUIArchivio, avviaMotoreArchivio } from './archivio.js';
//     initUIArchivio();                                   // una volta sola: crea le finestre (modal-archivio-main...)
//     avviaMotoreArchivio(db, auth, userData);            // ogni volta che si apre l'archivio
// ==========================================

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js"; // stessa versione di bateolive.js

const API_URL = 'https://utilitybe.homeserver.foo';
const API = `${API_URL}/api/v1/archivio`;
const RADICE = '';                      // la radice è l'archivio stesso (data/archivio)

const stato = { path: RADICE, admin: false, auth: null, timer: null, richiesta: 0, uploadAttivo: null, pollJob: null, timerRicerca: null, gestito: null, caricato: false };

// ---------------------------------------------------------------- interfaccia (finestre)
export function initUIArchivio() {
    if (document.getElementById('modal-archivio-main')) return;

    const uiHTML = `
    <style>
        /* Finestre di caricamento e di gestione: autonome (non dipendono da .modal-overlay), stanno sopra la finestra dell'archivio */
        .arc-overlay { display: none; position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); align-items: center; justify-content: center; padding: calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box; }
        .arc-overlay .arc-box { position: relative; width: 100%; max-width: 420px; max-height: 100%; overflow-y: auto; background: var(--surface, #ffffff); color: var(--text-main, #1e293b); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; padding: 20px; box-sizing: border-box; box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .arc-overlay h3 { margin: 0 0 14px; color: var(--primary, #00529b); font-weight: 800; display: flex; align-items: center; gap: 10px; padding-right: 30px; }
        .arc-overlay .arc-chiudi { position: absolute; right: 18px; top: 18px; font-size: 22px; cursor: pointer; color: var(--text-muted, #64748b); }
        .arc-overlay label.arc-lbl { display: block; font-size: 12px; font-weight: 700; color: var(--text-muted, #64748b); margin: 12px 0 5px; text-transform: uppercase; letter-spacing: .03em; }
        .arc-overlay input[type=text], .arc-overlay input[type=date], .arc-overlay select, .arc-overlay textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: var(--surface, #ffffff); color: var(--text-main, #1e293b); }
        .arc-overlay textarea { min-height: 70px; resize: vertical; }
        .arc-overlay .arc-tipo { display: flex; gap: 8px; }
        .arc-overlay .arc-tipo button { flex: 1; padding: 10px 8px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: transparent; color: var(--text-main, #1e293b); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .arc-overlay .arc-tipo button.attivo { background: var(--primary, #00529b); border-color: var(--primary, #00529b); color: #ffffff; }
        .arc-overlay .arc-file-btn { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px dashed var(--border-color, #cbd5e1); border-radius: 10px; cursor: pointer; font-size: 14px; color: var(--text-main, #1e293b); word-break: break-word; }
        .arc-overlay .arc-hint { font-size: 12px; color: var(--text-muted, #64748b); margin-top: 6px; line-height: 1.4; }
        .arc-overlay .arc-err { display: none; margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: var(--danger, #dc3545); background: var(--danger-light, rgba(220,53,69,0.1)); border: 1px solid var(--danger-border, rgba(220,53,69,0.35)); }
        .arc-overlay .arc-azioni { display: flex; gap: 10px; margin-top: 18px; }
        .arc-overlay .arc-azioni button { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: transparent; color: var(--text-main, #1e293b); font: inherit; font-weight: 700; cursor: pointer; }
        .arc-overlay .arc-azioni button.pericolo { color: var(--danger, #dc3545); border-color: var(--danger, #dc3545); flex: 0 0 auto; padding: 12px 14px; }
        .arc-overlay .arc-azioni button.primario { background: var(--primary, #00529b); border-color: var(--primary, #00529b); color: #ffffff; }
        .arc-overlay .arc-bar { height: 10px; border-radius: 6px; background: var(--border-color, #e2e8f0); overflow: hidden; margin: 14px 0 10px; }
        .arc-overlay .arc-bar > span { display: block; height: 100%; width: 0; background: var(--primary, #00529b); transition: width .3s ease; }
        .arc-overlay .arc-check { display: flex; align-items: center; gap: 10px; margin-top: 14px; font-size: 14px; cursor: pointer; }
        .arc-overlay .arc-check input { width: 18px; height: 18px; }
        .arc-overlay .arc-riga { display: flex; gap: 8px; align-items: stretch; }
        .arc-overlay .arc-riga button { flex: 0 0 auto; padding: 0 16px; border-radius: 10px; border: none; background: var(--primary, #00529b); color: #ffffff; font: inherit; font-weight: 700; cursor: pointer; }
        .arc-overlay .arc-link { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 700; color: var(--primary, #00529b); text-decoration: none; }
        .arc-overlay .arc-msg { font-size: 14px; line-height: 1.45; }
    </style>

    <!-- MODALE ARCHIVIO TURNI -->
    <div id="modal-archivio-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-archivio-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark close-modal" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); transition: 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.chiudiModal('modal-archivio-main')"></i>

            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-box-archive"></i> Archivio
                <!-- solo admin: li mostra archivio_turni.js -->
                <span id="archivio-admin-btns" style="display:none; margin-left:auto; margin-right:38px; gap:8px; align-items:center;">
                    <button id="archivio-btn-cartella" title="Nuova cartella" aria-label="Nuova cartella" style="width:34px; height:34px; flex-shrink:0; border-radius:50%; border:1px solid var(--primary); background:transparent; color:var(--primary); font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-folder-plus"></i>
                    </button>
                    <button id="archivio-btn-nuovo" title="Carica documento" aria-label="Carica documento" style="width:34px; height:34px; flex-shrink:0; border-radius:50%; border:none; background:var(--primary); color:#ffffff; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </span>
            </h3>
            <div style="position:relative; margin: 14px 0 4px; flex-shrink:0;">
                <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:14px; pointer-events:none;"></i>
                <input type="text" id="archivio-cerca" placeholder="Cerca documenti, servizi, anni…" autocomplete="off" enterkeyhint="search" aria-label="Cerca documenti" style="width:100%; box-sizing:border-box; font:inherit; font-size:16px; padding:10px 38px 10px 38px; border-radius:10px; border:1px solid var(--border-color); background:var(--surface); color:var(--text-main);">
                <i class="fa-solid fa-circle-xmark" id="archivio-cerca-x" role="button" aria-label="Cancella ricerca" style="display:none; position:absolute; right:13px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:16px; cursor:pointer;"></i>
            </div>
            <div id="archivio-content-area" style="flex: 1; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 14px;">
            </div>
        </div>
    </div>

    <!-- FINESTRA DI CARICAMENTO (solo admin) -->
    <div id="modal-archivio-upload" class="arc-overlay" role="dialog" aria-modal="true" aria-label="Carica documento">
        <div class="arc-box">
            <i class="fa-solid fa-xmark arc-chiudi" id="arc-x" role="button" aria-label="Chiudi"></i>
            <h3><i class="fa-solid fa-cloud-arrow-up"></i> Carica documento</h3>

            <div id="arc-form">
                <input type="hidden" id="arc-modal-tipo" value="generico">
                <label class="arc-lbl">Tipo di documento</label>
                <div class="arc-tipo">
                    <button type="button" data-tipo="generico" class="attivo"><i class="fa-solid fa-file-lines"></i> Generico</button>
                    <button type="button" data-tipo="turni"><i class="fa-solid fa-table-list"></i> File turni</button>
                </div>

                <label class="arc-lbl">File PDF</label>
                <label class="arc-file-btn" for="arc-file"><i class="fa-solid fa-file-pdf" style="color:var(--danger, #dc3545); font-size:20px;"></i><span id="arc-file-nome">Scegli un file…</span></label>
                <input type="file" id="arc-file" accept=".pdf,application/pdf" style="display:none;">

                <label class="arc-lbl" for="arc-nome">Nome</label>
                <input type="text" id="arc-nome" maxlength="110" autocomplete="off">

                <label class="arc-lbl" for="arc-cartella">Cartella</label>
                <select id="arc-cartella"></select>
                <a href="#" class="arc-link" id="arc-nc-link"><i class="fa-solid fa-folder-plus"></i> Nuova cartella qui dentro…</a>
                <div class="arc-riga" id="arc-nc-box" style="display:none; margin-top:8px;">
                    <input type="text" id="arc-nc-nome" maxlength="110" placeholder="Nome della nuova cartella" autocomplete="off">
                    <button type="button" id="arc-nc-crea">Crea</button>
                </div>

                <div id="arc-blocco-generico">
                    <label class="arc-lbl" for="arc-nota">Nota (facoltativa)</label>
                    <textarea id="arc-nota" maxlength="2000" placeholder="Compare accanto al documento"></textarea>
                </div>

                <div id="arc-blocco-turni" style="display:none;">
                    <label class="arc-lbl" for="arc-servizio">Servizio che copre</label>
                    <input type="text" id="arc-servizio" maxlength="80" placeholder="es. Inverno 2026" autocomplete="off">
                    <label class="arc-lbl" for="arc-valido">Inizio validità</label>
                    <input type="date" id="arc-valido">
                    <div class="arc-hint">Se lasci vuota la data viene letta dal libro. Il PDF viene analizzato in automatico e il risultato resta allegato al documento.</div>
                </div>

                <div class="arc-err" id="arc-errore"></div>
                <div class="arc-azioni">
                    <button type="button" id="arc-annulla">Annulla</button>
                    <button type="button" id="arc-invia" class="primario">Carica</button>
                </div>
            </div>

            <div id="arc-progresso" style="display:none;">
                <div class="arc-bar"><span id="arc-barra"></span></div>
                <div class="arc-msg" id="arc-msg"></div>
                <div class="arc-azioni">
                    <button type="button" id="arc-fine" class="primario">Annulla</button>
                </div>
            </div>
        </div>
    </div>

    <!-- FINESTRA DI GESTIONE (solo admin): modifica file o cartella, nuova cartella -->
    <div id="modal-archivio-gestione" class="arc-overlay" role="dialog" aria-modal="true" aria-label="Gestisci">
        <div class="arc-box">
            <i class="fa-solid fa-xmark arc-chiudi" id="arg-x" role="button" aria-label="Chiudi"></i>
            <h3><i class="fa-solid fa-pen" id="arg-icona"></i> <span id="arg-titolo">Gestisci</span></h3>

            <div class="arc-hint" id="arg-hint" style="display:none; margin: 0 0 4px;"></div>

            <label class="arc-lbl" for="arg-nome">Nome</label>
            <input type="text" id="arg-nome" maxlength="110" autocomplete="off">

            <div id="arg-blocco-file" style="display:none;">
                <label class="arc-lbl" for="arg-nota">Nota</label>
                <textarea id="arg-nota" maxlength="2000" placeholder="Compare accanto al documento"></textarea>

                <div id="arg-blocco-analisi">
                    <label class="arc-check"><input type="checkbox" id="arg-analizza"><span id="arg-analizza-txt"></span></label>
                    <div id="arg-blocco-turni" style="display:none;">
                        <label class="arc-lbl" for="arg-servizio">Servizio che copre</label>
                        <input type="text" id="arg-servizio" maxlength="80" placeholder="es. Inverno 2026" autocomplete="off">
                        <label class="arc-lbl" for="arg-valido">Inizio validità</label>
                        <input type="date" id="arg-valido">
                    </div>
                </div>

                <label class="arc-lbl" for="arg-sposta">Sposta in</label>
                <select id="arg-sposta"></select>
            </div>

            <div class="arc-err" id="arg-errore"></div>
            <div class="arc-azioni">
                <button type="button" id="arg-elimina" class="pericolo" title="Elimina" aria-label="Elimina"><i class="fa-solid fa-trash"></i></button>
                <button type="button" id="arg-annulla">Annulla</button>
                <button type="button" id="arg-salva" class="primario">Salva</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ---------------------------------------------------------------- utilità
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);

function dmy(iso) {                     // "2026-09-14" -> "14/09/2026"
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function dimensione(b) {
    if (b >= 1048576) return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
}

// Stesso nome "pulito" di documenti.js: senza estensione, trattini bassi come spazi, iniziale maiuscola
function nomeVisibile(nome) {
    const n = String(nome).replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    return n.charAt(0).toUpperCase() + n.slice(1);
}

async function tokenUtente() {
    try {
        const u = stato.auth && stato.auth.currentUser;
        return u ? await u.getIdToken() : null;
    } catch (e) { return null; }
}

async function apiElenco(path) {
    const r = await fetch(`${API}?path=${encodeURIComponent(path)}&t=${Date.now()}`);
    const dati = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dati.error || `Errore ${r.status}`);
    return dati;
}

async function apiScrivi(metodo, percorso, body) {
    const token = await tokenUtente();
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${API}${percorso}`, { method: metodo, headers, body: body ? JSON.stringify(body) : undefined });
    const dati = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dati.error || `Errore ${r.status}`);
    return dati;
}

const genitoreDi = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');   // '' = radice
const percorsoLeggibile = (p) => (p ? p.split('/').join(' / ') : 'Archivio');

// Scarica il file invece di aprirlo nel browser (come window.downloadForzato in documenti.js)
async function scarica(url, nomeFile) {
    try {
        const risposta = await fetch(url);
        if (!risposta.ok) throw new Error('download non riuscito');
        const blob = await risposta.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = nomeFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
    } catch (e) {
        window.open(url, '_blank'); // se il download forzato non riesce lo apre in una nuova scheda
    }
}

// ---------------------------------------------------------------- avvio
export async function avviaMotoreArchivio(db, auth, userData) {
    initUIArchivio();      // se le finestre non esistono ancora le crea (non fa nulla se ci sono già)
    const area = el('archivio-content-area');
    if (!area) return;
    stato.auth = auth || null;
    stato.path = RADICE;
    stato.admin = false;
    stato.caricato = false;
    const campo = el('archivio-cerca');
    if (campo) campo.value = '';
    aggiornaCampoRicerca();
    collegaRicerca();
    collegaGestione();
    collegaUpload();
    impostaPulsanteAdmin();
    verificaRuoloAdmin(db, userData);   // non blocca la lista: il + compare appena il ruolo è noto
    await apriCartella(RADICE);
}

// Il tasto + compare solo con ruolo "admin" nel profilo (come in bateolive.js).
async function verificaRuoloAdmin(db, userData) {
    let ruolo = userData && userData.ruolo;
    if (ruolo === undefined && db && stato.auth && stato.auth.currentUser) {
        try {
            const snap = await getDoc(doc(db, 'utenti', stato.auth.currentUser.uid));
            ruolo = snap.exists() ? snap.data().ruolo : undefined;
        } catch (e) { /* senza profilo leggibile niente caricamento */ }
    }
    stato.admin = ruolo === 'admin';
    impostaPulsanteAdmin();
    if (stato.admin && stato.caricato) aggiorna();    // le righe già disegnate ricevono il tasto di gestione
}

function impostaPulsanteAdmin() {
    const gruppo = el('archivio-admin-btns');
    if (!gruppo) return;
    gruppo.style.display = stato.admin ? 'flex' : 'none';
    el('archivio-btn-nuovo').onclick = apriUpload;
    el('archivio-btn-cartella').onclick = () => apriGestione('nuova-cartella', { path: stato.path });
}

// Ricarica quello che si sta vedendo: i risultati della ricerca, oppure la cartella aperta
function aggiorna() {
    const q = ricercaAttiva();
    if (q) eseguiRicerca(q, true); else apriCartella(stato.path, true);
}

// ---------------------------------------------------------------- elenco cartelle e file
async function apriCartella(path, silenzioso) {
    const area = el('archivio-content-area');
    if (!area) return;
    const n = ++stato.richiesta;
    clearTimeout(stato.timer);
    if (!silenzioso) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento archivio...</div>`;
    }
    try {
        const dati = await apiElenco(path);
        if (n !== stato.richiesta) return;      // nel frattempo è stata aperta un'altra cartella
        stato.path = dati.path;
        disegna(area, dati);
    } catch (e) {
        if (n !== stato.richiesta) return;
        if (silenzioso) return;                 // aggiornamento in sottofondo: resta quello che si vede
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i> ${esc(e.message || 'Archivio non raggiungibile')}<br><a href="#" id="archivio-riprova" style="color:var(--primary); font-weight:700;">Riprova</a></div>`;
        const r = el('archivio-riprova');
        if (r) r.onclick = (ev) => { ev.preventDefault(); apriCartella(path); };
    }
}

function disegna(area, dati) {
    stato.caricato = true;
    area.innerHTML = '';

    const bc = briciole(dati);
    if (bc) area.appendChild(bc);

    const file = [...dati.file].sort((a, b) => {   // i libri turni dal più recente, poi gli altri per nome
        if (a.valido_dal && b.valido_dal && a.valido_dal !== b.valido_dal) return a.valido_dal < b.valido_dal ? 1 : -1;
        if (a.valido_dal && !b.valido_dal) return -1;
        if (!a.valido_dal && b.valido_dal) return 1;
        return a.nome.localeCompare(b.nome, 'it', { numeric: true });
    });

    if (!dati.cartelle.length && !file.length) {
        const vuoto = document.createElement('div');
        vuoto.className = 'status-message';
        const msg = dati.path === '' ? (stato.admin ? 'L\'archivio è vuoto. Crea la prima cartella con il pulsante in alto.' : 'L\'archivio è vuoto.') : 'Nessun documento in questa cartella.';
        vuoto.innerHTML = `<i class="fa-regular fa-folder-open" style="font-size:32px; color:var(--text-muted);"></i> ${msg}`;
        area.appendChild(vuoto);
        return;
    }

    let i = 0;
    dati.cartelle.forEach((c) => area.appendChild(rigaCartella(c, i++)));
    file.forEach((f) => area.appendChild(rigaFile(f, i++)));

    // finché c'è un'analisi in corso la lista si aggiorna da sola
    if (file.some((f) => f.analisi && f.analisi.stato === 'in_corso')) {
        stato.timer = setTimeout(() => {
            if (!area.isConnected || area.offsetParent === null) return;   // finestra chiusa: si ferma
            aggiorna();
        }, 3000);
    }
}

function briciole(dati) {
    const parti = dati.briciole;
    if (parti.length < 2) return null;   // nella radice non serve
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:13px; color:var(--text-muted);';
    parti.forEach((b, k) => {
        const ultima = k === parti.length - 1;
        const nome = b.path === '' ? 'Archivio' : b.nome;
        if (k) nav.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-chevron-right" style="font-size:10px;"></i>');
        if (ultima) {
            nav.insertAdjacentHTML('beforeend', `<span style="font-weight:700; color:var(--text-main);">${esc(nome)}</span>`);
        } else {
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = nome;
            a.style.cssText = 'color:var(--primary); font-weight:600; text-decoration:none;';
            a.onclick = (ev) => { ev.preventDefault(); apriCartella(b.path); };
            nav.appendChild(a);
        }
    });
    return nav;
}

const BTN_GESTISCI = `<button class="download-btn" data-azione="gestisci" title="Gestisci" aria-label="Gestisci"><i class="fa-solid fa-ellipsis-vertical"></i></button>`;

function rigaCartella(c, i, inRicerca) {
    const n = c.cartelle + c.file;
    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.animationDelay = `${i * 0.05}s`;
    row.innerHTML = `
        <a class="file-btn" href="#" style="justify-content: flex-start; gap: 12px;">
            <i class="fa-solid fa-folder" style="color: #f59e0b; font-size: 20px;"></i>
            <span style="flex: 1; word-break: break-word; min-width: 0;">
                <span style="display:block;">${esc(c.nome)}</span>
                <span style="display:block; font-size:12px; color:var(--text-muted); font-weight:400;">${n === 0 ? 'Vuota' : n === 1 ? '1 elemento' : n + ' elementi'}${inRicerca ? ' · in ' + esc(percorsoLeggibile(c.genitore)) : ''}</span>
            </span>
            <i class="fa-solid fa-chevron-right" style="color: var(--text-muted); font-size: 12px;"></i>
        </a>
        ${stato.admin && !c.protetta ? BTN_GESTISCI : ''}`;
    row.querySelector('a').addEventListener('click', (ev) => { ev.preventDefault(); azzeraRicerca(); apriCartella(c.path); });
    const g = row.querySelector('[data-azione="gestisci"]');
    if (g) g.addEventListener('click', () => apriGestione('cartella', c));
    return row;
}

function rigaFile(f, i, inRicerca) {
    let icona = 'fa-solid fa-file-lines', colore = 'var(--primary)';
    if (f.estensione === '.pdf') { icona = 'fa-solid fa-file-pdf'; colore = 'var(--danger)'; }
    else if (f.estensione === '.doc' || f.estensione === '.docx') { icona = 'fa-solid fa-file-word'; colore = '#2b579a'; }
    else if (f.estensione === '.xls' || f.estensione === '.xlsx') { icona = 'fa-solid fa-file-excel'; colore = 'var(--success)'; }

    const piccolo = 'display:block; font-size:12px; font-weight:400; color:var(--text-muted); margin-top:2px;';
    const a = f.analisi;
    let sotto = '';
    let extra = '';

    if (f.categoria === 'turni') {
        const dati = [f.servizio, f.valido_dal ? `dal ${dmy(f.valido_dal)}` : null].filter(Boolean).join(' · ');
        if (dati) sotto += `<span style="${piccolo}">${esc(dati)}</span>`;
        if (a && a.stato === 'completato' && a.riepilogo) {
            const r = a.riepilogo;
            const testo = `${r.turni} turni` + (r.non_a_norma ? ` · ${r.non_a_norma} non a norma` : ' · tutti a norma');
            sotto += `<span style="${piccolo}">${esc(testo)}</span>`;
        } else if (a && a.stato === 'in_corso') {
            sotto += `<span style="${piccolo}"><i class="fa-solid fa-circle-notch fa-spin"></i> Analisi in corso…</span>`;
        } else if (a && a.stato === 'errore') {
            sotto += `<span style="${piccolo} color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Analisi non riuscita: ${esc(a.errore || 'errore')}</span>`;
        } else if (a && a.stato === 'interrotta') {
            sotto += `<span style="${piccolo} color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Analisi interrotta (riavvio del server)</span>`;
        }
        if (a && a.stato === 'completato' && a.pdf_url) {
            extra = `<button class="download-btn" data-azione="info" title="Risultato dell'analisi" aria-label="Risultato dell'analisi"><i class="fa-solid fa-circle-info"></i></button>`;
        }
    } else {
        if (f.nota) sotto += `<span style="${piccolo} white-space:pre-wrap; color:var(--text-main); opacity:.85;">${esc(f.nota)}</span>`;
        const dettagli = [dimensione(f.dimensione), dmy(f.caricato || f.modificato)].filter(Boolean).join(' · ');
        sotto += `<span style="${piccolo}">${esc(dettagli)}</span>`;
    }

    if (inRicerca) sotto += `<span style="${piccolo}"><i class="fa-regular fa-folder"></i> ${esc(percorsoLeggibile(f.genitore))}</span>`;

    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.animationDelay = `${i * 0.05}s`;
    row.innerHTML = `
        <a class="file-btn" href="${esc(API_URL + f.url)}" target="_blank" rel="noopener" style="justify-content: flex-start; gap: 12px;">
            <i class="${icona}" style="color: ${colore}; font-size: 20px;"></i>
            <span style="flex: 1; word-break: break-word; min-width: 0;">
                <span style="display:block;">${esc(nomeVisibile(f.nome))}</span>
                ${sotto}
            </span>
        </a>
        <button class="download-btn" data-azione="scarica" title="Scarica documento" aria-label="Scarica documento"><i class="fa-solid fa-download"></i></button>
        ${extra}
        ${stato.admin ? BTN_GESTISCI : ''}`;

    const gest = row.querySelector('[data-azione="gestisci"]');
    if (gest) gest.addEventListener('click', () => apriGestione('file', f));
    row.querySelector('[data-azione="scarica"]').addEventListener('click', () => scarica(API_URL + f.url, f.nome));
    const info = row.querySelector('[data-azione="info"]');
    if (info) info.addEventListener('click', () => window.open(API_URL + a.pdf_url, '_blank', 'noopener'));
    return row;
}

// ---------------------------------------------------------------- ricerca
const ricercaAttiva = () => {
    const c = el('archivio-cerca');
    const q = c ? c.value.trim() : '';
    return q.length >= 2 ? q : '';
};

function aggiornaCampoRicerca() {
    const c = el('archivio-cerca'), x = el('archivio-cerca-x');
    if (x) x.style.display = c && c.value ? 'block' : 'none';
}

function azzeraRicerca() {
    const c = el('archivio-cerca');
    if (c) c.value = '';
    clearTimeout(stato.timerRicerca);
    aggiornaCampoRicerca();
}

function collegaRicerca() {
    const c = el('archivio-cerca');
    if (!c || c.dataset.pronto) return;
    c.dataset.pronto = '1';
    c.addEventListener('input', () => {
        aggiornaCampoRicerca();
        clearTimeout(stato.timerRicerca);
        stato.timerRicerca = setTimeout(() => {
            const q = ricercaAttiva();
            if (q) eseguiRicerca(q); else apriCartella(stato.path);   // campo svuotato: si torna alla cartella
        }, 300);
    });
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') c.blur(); });   // chiude la tastiera sul telefono
    el('archivio-cerca-x').onclick = () => { azzeraRicerca(); apriCartella(stato.path); c.focus(); };
}

async function eseguiRicerca(q, silenzioso) {
    const area = el('archivio-content-area');
    if (!area) return;
    const n = ++stato.richiesta;
    clearTimeout(stato.timer);
    if (!silenzioso) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i> Ricerca in corso...</div>`;
    }
    try {
        const r = await fetch(`${API}/cerca?q=${encodeURIComponent(q)}&path=${RADICE}&t=${Date.now()}`);
        const dati = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(dati.error || `Errore ${r.status}`);
        if (n !== stato.richiesta || ricercaAttiva() !== q) return;    // nel frattempo è cambiata la ricerca
        disegnaRisultati(area, q, dati);
    } catch (e) {
        if (n !== stato.richiesta || silenzioso) return;
        area.innerHTML = `<div class="status-message" style="color:var(--danger); border-color:var(--danger-border); background:var(--danger-light);"><i class="fa-solid fa-triangle-exclamation" style="font-size:28px;"></i> ${esc(e.message || 'Ricerca non riuscita')}</div>`;
    }
}

function disegnaRisultati(area, q, dati) {
    stato.caricato = true;
    area.innerHTML = '';
    if (!dati.risultati.length) {
        area.innerHTML = `<div class="status-message"><i class="fa-solid fa-magnifying-glass" style="font-size:28px; color:var(--text-muted);"></i> Nessun risultato per «${esc(q)}».</div>`;
        return;
    }
    const intest = document.createElement('div');
    intest.style.cssText = 'font-size:13px; color:var(--text-muted);';
    intest.textContent = dati.risultati.length === 1 ? '1 risultato' : `${dati.risultati.length} risultati${dati.troncato ? ' (ce ne sono altri: affina la ricerca)' : ''}`;
    area.appendChild(intest);
    let parziale = false;
    dati.risultati.forEach((r, i) => {
        if (r.corrispondenza === 'parziale' && !parziale) {      // da qui in poi contengono solo alcune delle parole cercate
            parziale = true;
            const sep = document.createElement('div');
            sep.style.cssText = 'font-size:12px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--text-muted); margin-top:6px;';
            sep.textContent = dati.completi ? 'Contengono solo alcune parole' : 'Nessuno le contiene tutte: ecco chi ne contiene alcune';
            area.appendChild(sep);
        }
        area.appendChild(r.tipo === 'cartella' ? rigaCartella(r, i, true) : rigaFile(r, i, true));
    });
    if (dati.risultati.some((r) => r.analisi && r.analisi.stato === 'in_corso')) {
        stato.timer = setTimeout(() => {
            if (!area.isConnected || area.offsetParent === null) return;
            aggiorna();
        }, 3000);
    }
}

// ---------------------------------------------------------------- caricamento (solo admin)
// Tutte le cartelle dell'archivio, in ordine ad albero, per la scelta della destinazione
async function elencoCartelle() {
    const esplora = async (path, livello) => {
        const r = await apiElenco(path);
        const sotto = await Promise.all(r.cartelle.map((c) => (livello < 5 ? esplora(c.path, livello + 1).catch(() => []) : [])));
        return r.cartelle.flatMap((c, k) => [{ path: c.path, nome: c.nome, livello }, ...sotto[k]]);
    };
    const figli = await esplora(RADICE, 1);
    return [{ path: RADICE, nome: 'Archivio (cartella principale)', livello: 0 }, ...figli];
}

async function riempiSelectCartelle(sel, selezionata) {
    sel.innerHTML = `<option value="">Carico le cartelle…</option>`;
    const cartelle = await elencoCartelle();
    // la radice nel menu vale "/" (il valore vuoto resta per "Carico le cartelle…")
    sel.innerHTML = cartelle.map((c) => `<option value="${esc(c.path || '/')}">${'\u00A0\u00A0'.repeat(c.livello)}${c.livello ? '↳ ' : ''}${esc(c.nome)}</option>`).join('');
    const voluta = selezionata || '/';
    sel.value = cartelle.some((c) => (c.path || '/') === voluta) ? voluta : '/';
}

function mostraErroreUpload(msg) {
    const e = el('arc-errore');
    if (!e) return;
    e.textContent = msg || '';
    e.style.display = msg ? 'block' : 'none';
}

function impostaTipo(tipo) {
    document.querySelectorAll('#modal-archivio-upload .arc-tipo button').forEach((b) => b.classList.toggle('attivo', b.dataset.tipo === tipo));
    el('arc-blocco-generico').style.display = tipo === 'generico' ? '' : 'none';
    el('arc-blocco-turni').style.display = tipo === 'turni' ? '' : 'none';
    el('arc-modal-tipo').value = tipo;
}

function chiudiUpload() {
    if (stato.uploadAttivo) { try { stato.uploadAttivo.abort(); } catch (e) { /* già finito */ } stato.uploadAttivo = null; }
    stato.pollJob = null;
    el('modal-archivio-upload').style.display = 'none';
}

async function apriUpload() {
    if (!stato.admin) return;
    const modal = el('modal-archivio-upload');
    if (!modal) return;

    // stato iniziale della finestra
    el('arc-file').value = '';
    el('arc-file-nome').textContent = 'Scegli un file…';
    el('arc-nome').value = '';
    el('arc-nota').value = '';
    el('arc-servizio').value = '';
    el('arc-valido').value = '';
    mostraErroreUpload('');
    el('arc-form').style.display = '';
    el('arc-progresso').style.display = 'none';
    el('arc-invia').disabled = false;
    impostaTipo('generico');
    modal.style.display = 'flex';

    // cartelle: si parte da quella aperta
    const sel = el('arc-cartella');
    el('arc-nc-box').style.display = 'none';
    el('arc-nc-nome').value = '';
    try {
        await riempiSelectCartelle(sel, stato.path);
    } catch (e) {
        sel.innerHTML = `<option value="/">Archivio (cartella principale)</option>`;
        mostraErroreUpload('Elenco cartelle non disponibile: ' + e.message);
    }
}

function collegaUpload() {
    const modal = el('modal-archivio-upload');
    if (!modal || modal.dataset.pronto) return;
    modal.dataset.pronto = '1';

    modal.addEventListener('click', (ev) => { if (ev.target === modal && el('arc-progresso').style.display === 'none') chiudiUpload(); });
    el('arc-x').onclick = () => chiudiUpload();
    el('arc-annulla').onclick = () => chiudiUpload();
    document.querySelectorAll('#modal-archivio-upload .arc-tipo button').forEach((b) => { b.onclick = () => impostaTipo(b.dataset.tipo); });

    el('arc-file').onchange = () => {
        const f = el('arc-file').files[0];
        el('arc-file-nome').textContent = f ? f.name : 'Scegli un file…';
        if (f && !el('arc-nome').value.trim()) el('arc-nome').value = f.name.replace(/\.[^.]+$/, '');
    };
    el('arc-invia').onclick = inviaUpload;

    // nuova cartella direttamente dalla finestra di caricamento: viene creata dentro quella scelta e poi selezionata
    el('arc-nc-link').onclick = (ev) => { ev.preventDefault(); const b = el('arc-nc-box'); b.style.display = b.style.display === 'none' ? 'flex' : 'none'; if (b.style.display === 'flex') el('arc-nc-nome').focus(); };
    el('arc-nc-crea').onclick = async () => {
        const nome = el('arc-nc-nome').value.trim();
        if (!nome) return mostraErroreUpload('Scrivi il nome della nuova cartella.');
        el('arc-nc-crea').disabled = true;
        try {
            const r = await apiScrivi('POST', '/cartelle', { path: el('arc-cartella').value || RADICE, nome });
            await riempiSelectCartelle(el('arc-cartella'), r.voce.path);
            el('arc-nc-box').style.display = 'none';
            el('arc-nc-nome').value = '';
            mostraErroreUpload('');
            aggiorna();
        } catch (e) {
            mostraErroreUpload(e.message);
        } finally {
            el('arc-nc-crea').disabled = false;
        }
    };
}

function mostraProgresso(percentuale, messaggio, { errore = false, fine = false, etichettaBottone } = {}) {
    el('arc-form').style.display = 'none';
    el('arc-progresso').style.display = '';
    el('arc-barra').style.width = Math.max(0, Math.min(100, percentuale)) + '%';
    el('arc-barra').style.background = errore ? 'var(--danger, #dc3545)' : (fine ? 'var(--success, #28a745)' : 'var(--primary, #00529b)');
    el('arc-msg').innerHTML = messaggio;
    el('arc-fine').textContent = etichettaBottone || 'Annulla';
}

async function inviaUpload() {
    if (!stato.admin) return;
    const file = el('arc-file').files[0];
    const tipo = el('arc-modal-tipo').value;
    const nome = el('arc-nome').value.trim();
    const servizio = el('arc-servizio').value.trim();
    if (!file) return mostraErroreUpload('Scegli il file da caricare.');
    if (!nome) return mostraErroreUpload('Scrivi il nome del documento.');
    if (tipo === 'turni' && !servizio) return mostraErroreUpload('Indica il servizio che copre (es. Inverno 2026).');
    if (tipo === 'turni' && !/\.pdf$/i.test(file.name)) return mostraErroreUpload('Il libro turni deve essere un PDF.');
    mostraErroreUpload('');

    const ext = (/\.[^.]+$/.exec(file.name) || ['.pdf'])[0];
    const q = new URLSearchParams({ cartella: el('arc-cartella').value || RADICE, nome: nome + ext, tipo });
    if (tipo === 'generico' && el('arc-nota').value.trim()) q.set('nota', el('arc-nota').value.trim());
    if (tipo === 'turni') {
        q.set('servizio', servizio);
        if (el('arc-valido').value) q.set('valido_dal', el('arc-valido').value);
    }
    const dataInserita = tipo === 'turni' ? el('arc-valido').value : '';
    const token = await tokenUtente();

    mostraProgresso(0, 'Caricamento in corso…');
    el('arc-fine').onclick = () => chiudiUpload();     // durante l'invio interrompe il caricamento

    const xhr = new XMLHttpRequest();
    stato.uploadAttivo = xhr;
    xhr.open('POST', `${API}/upload?${q.toString()}`);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const p = Math.round((ev.loaded / ev.total) * 100);
        mostraProgresso(p * 0.4, `Caricamento in corso… ${p}%`);
    };
    xhr.onerror = () => { stato.uploadAttivo = null; erroreUpload('Server non raggiungibile. Riprova.'); };
    xhr.onabort = () => { stato.uploadAttivo = null; };
    xhr.onload = () => {
        stato.uploadAttivo = null;
        let r = {};
        try { r = JSON.parse(xhr.responseText); } catch (e) { /* risposta non JSON */ }
        if (xhr.status >= 400) return erroreUpload(r.error || `Errore ${xhr.status}`);
        azzeraRicerca();
        apriCartella(r.voce && r.voce.path ? genitoreDi(r.voce.path) : stato.path, true);   // il file compare subito nell'elenco
        if (r.job) seguiAnalisi(r.job, dataInserita);
        else {
            mostraProgresso(100, '<i class="fa-solid fa-circle-check" style="color:var(--success, #28a745);"></i> Documento caricato.', { fine: true, etichettaBottone: 'Chiudi' });
            el('arc-fine').onclick = () => chiudiUpload();
        }
    };
    xhr.send(file);
}

function erroreUpload(msg) {
    el('arc-progresso').style.display = 'none';
    el('arc-form').style.display = '';
    mostraErroreUpload(msg);
}

// Avanzamento dell'analisi: stessa rotta già usata dal controllo dei libri turni
function seguiAnalisi(job, dataInserita) {
    const mio = {};
    stato.pollJob = mio;
    el('arc-fine').onclick = () => chiudiUpload();
    el('arc-fine').textContent = 'Chiudi (l\'analisi continua)';
    let fallimenti = 0;

    const giro = async () => {
        if (stato.pollJob !== mio) return;
        try {
            const r = await fetch(`${API_URL}/api/v1/analisi/job/${encodeURIComponent(job)}`, { cache: 'no-store' });
            if (r.status === 404) {
                aggiorna();
                return mostraProgresso(100, 'Controlla l\'elenco: l\'analisi non è più in memoria sul server.', { etichettaBottone: 'Chiudi' });
            }
            const d = await r.json();
            fallimenti = 0;
            if (d.stato === 'in_corso') {
                mostraProgresso(40 + (d.percentuale || 0) * 0.6, esc(d.messaggio || 'Analisi in corso…'));
                el('arc-fine').textContent = 'Chiudi (l\'analisi continua)';
                return setTimeout(giro, 1000);
            }
            aggiorna();
            if (d.stato === 'completato') {
                const g = (d.risultato && d.risultato.generale) || {};
                let msg = `<i class="fa-solid fa-circle-check" style="color:var(--success, #28a745);"></i> Analisi completata: <b>${esc(g.turni)}</b> turni, <b>${esc(g.non_a_norma)}</b> non a norma.`;
                const letta = d.risultato && d.risultato.valido_dal;
                if (dataInserita && letta && letta !== dataInserita) {
                    msg += `<br><br><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i> Attenzione: nel libro la data di inizio validità è <b>${esc(dmy(letta))}</b>, tu hai inserito <b>${esc(dmy(dataInserita))}</b>.`;
                }
                if (d.pdf_errore) msg += `<br><br>${esc(d.pdf_errore)}`;
                return mostraProgresso(100, msg, { fine: true, etichettaBottone: 'Chiudi' });
            }
            mostraProgresso(100, `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger, #dc3545);"></i> Analisi non riuscita: ${esc(d.errore || d.messaggio || 'errore')}<br><br>Il file resta in archivio.`, { errore: true, etichettaBottone: 'Chiudi' });
        } catch (e) {
            if (++fallimenti >= 5) return mostraProgresso(100, 'Connessione persa. Controlla l\'elenco più tardi.', { errore: true, etichettaBottone: 'Chiudi' });
            setTimeout(giro, 1500);
        }
    };
    giro();
}

// ---------------------------------------------------------------- gestione (solo admin)
function mostraErroreGestione(msg) {
    const e = el('arg-errore');
    e.textContent = msg || '';
    e.style.display = msg ? 'block' : 'none';
}

function chiudiGestione() {
    el('modal-archivio-gestione').style.display = 'none';
    stato.gestito = null;
}

function aggiornaBloccoTurniGestione() {
    const g = stato.gestito;
    if (!g || g.modo !== 'file') return;
    el('arg-blocco-turni').style.display = (g.voce.categoria === 'turni' || el('arg-analizza').checked) ? '' : 'none';
}

function collegaGestione() {
    const m = el('modal-archivio-gestione');
    if (!m || m.dataset.pronto) return;
    m.dataset.pronto = '1';
    m.addEventListener('click', (ev) => { if (ev.target === m) chiudiGestione(); });
    el('arg-x').onclick = chiudiGestione;
    el('arg-annulla').onclick = chiudiGestione;
    el('arg-analizza').onchange = aggiornaBloccoTurniGestione;
    el('arg-salva').onclick = salvaGestione;
    el('arg-elimina').onclick = eliminaGestito;
}

// modo: 'file' | 'cartella' | 'nuova-cartella' (in quest'ultimo caso voce.path è la cartella dove crearla)
async function apriGestione(modo, voce) {
    if (!stato.admin) return;
    collegaGestione();
    stato.gestito = { modo, voce };
    mostraErroreGestione('');
    const nuova = modo === 'nuova-cartella', eFile = modo === 'file';
    el('arg-icona').className = 'fa-solid ' + (nuova ? 'fa-folder-plus' : eFile ? 'fa-pen' : 'fa-folder');
    el('arg-titolo').textContent = nuova ? 'Nuova cartella' : eFile ? 'Modifica documento' : 'Modifica cartella';
    el('arg-hint').style.display = nuova ? '' : 'none';
    if (nuova) el('arg-hint').textContent = `Verrà creata in «${percorsoLeggibile(voce.path)}».`;
    el('arg-nome').value = nuova ? '' : (eFile ? voce.nome.replace(/\.[^.]+$/, '') : voce.nome);
    el('arg-elimina').style.display = nuova ? 'none' : '';
    el('arg-salva').textContent = nuova ? 'Crea' : 'Salva';
    el('arg-blocco-file').style.display = eFile ? '' : 'none';
    el('modal-archivio-gestione').style.display = 'flex';

    if (eFile) {
        el('arg-nota').value = voce.nota || '';
        el('arg-servizio').value = voce.servizio || '';
        el('arg-valido').value = voce.valido_dal || '';
        const turni = voce.categoria === 'turni';
        el('arg-blocco-analisi').style.display = voce.estensione === '.pdf' ? '' : 'none';
        el('arg-analizza').checked = false;
        el('arg-analizza-txt').textContent = turni ? 'Rilancia l\'analisi dopo il salvataggio' : 'Analizza come libro turni';
        aggiornaBloccoTurniGestione();
        const sel = el('arg-sposta');
        try { await riempiSelectCartelle(sel, genitoreDi(voce.path)); }
        catch (e) { sel.innerHTML = `<option value="${esc(genitoreDi(voce.path) || '/')}">${esc(percorsoLeggibile(genitoreDi(voce.path)))}</option>`; }
    }
    if (nuova) el('arg-nome').focus();
}

async function salvaGestione() {
    const g = stato.gestito;
    if (!g || !stato.admin) return;
    const nome = el('arg-nome').value.trim();
    if (!nome) return mostraErroreGestione('Scrivi il nome.');
    const btn = el('arg-salva');
    btn.disabled = true;
    mostraErroreGestione('');
    try {
        if (g.modo === 'nuova-cartella') {
            await apiScrivi('POST', '/cartelle', { path: g.voce.path, nome });
        } else if (g.modo === 'cartella') {
            if (nome !== g.voce.nome) await apiScrivi('POST', '/modifica', { path: g.voce.path, nome });
        } else {
            await salvaFile(g.voce, nome);
        }
        chiudiGestione();
        aggiorna();
    } catch (e) {
        mostraErroreGestione(e.message);
        aggiorna();     // un passaggio precedente potrebbe essere già andato a buon fine
    } finally {
        btn.disabled = false;
    }
}

// Salva i campi del file passo per passo: dati e nome, poi spostamento, poi eventuale nuova analisi
async function salvaFile(voce, nome) {
    const turni = voce.categoria === 'turni';
    const analizza = el('arg-analizza').checked && voce.estensione === '.pdf';
    const servizio = el('arg-servizio').value.trim();
    const valido = el('arg-valido').value;
    if ((turni || analizza) && !servizio) throw new Error('Indica il servizio che copre (es. Inverno 2026).');

    const corpo = { path: voce.path };
    if (nome + voce.estensione !== voce.nome) corpo.nome = nome + voce.estensione;
    if (el('arg-nota').value.trim() !== (voce.nota || '')) corpo.nota = el('arg-nota').value.trim();
    if ((turni || analizza) && servizio !== (voce.servizio || '')) corpo.servizio = servizio;
    if ((turni || analizza) && valido !== (voce.valido_dal || '')) corpo.valido_dal = valido;

    let corrente = voce.path;
    if (Object.keys(corpo).length > 1) corrente = (await apiScrivi('POST', '/modifica', corpo)).voce.path;

    const dest = el('arg-sposta').value;
    if (dest && dest !== (genitoreDi(corrente) || '/')) corrente = (await apiScrivi('POST', '/sposta', { path: corrente, destinazione: dest })).voce.path;

    if (analizza) {
        const q = new URLSearchParams({ path: corrente, servizio });
        if (valido) q.set('valido_dal', valido);
        await apiScrivi('POST', `/analizza?${q.toString()}`);
    }
}

async function eliminaGestito() {
    const g = stato.gestito;
    if (!g || !stato.admin || g.modo === 'nuova-cartella') return;
    const v = g.voce;
    let ricorsivo = false;
    if (g.modo === 'file') {
        if (!confirm(`Eliminare «${v.nome}»?` + (v.analisi ? '\nVerrà eliminata anche l\'analisi allegata.' : ''))) return;
    } else {
        const n = (v.cartelle || 0) + (v.file || 0);
        if (n > 0) {
            if (!confirm(`La cartella «${v.nome}» contiene ${n} ${n === 1 ? 'elemento' : 'elementi'}.\nEliminare la cartella e tutto il suo contenuto?`)) return;
            ricorsivo = true;
        } else if (!confirm(`Eliminare la cartella «${v.nome}»?`)) return;
    }
    const btn = el('arg-elimina');
    btn.disabled = true;
    try {
        await apiScrivi('DELETE', `/voce?path=${encodeURIComponent(v.path)}${ricorsivo ? '&ricorsivo=1' : ''}`);
        chiudiGestione();
        aggiorna();
    } catch (e) {
        mostraErroreGestione(e.message);
    } finally {
        btn.disabled = false;
    }
}
