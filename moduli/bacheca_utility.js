import { collection, getDocs, getDoc, setDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";

let ddsDatesArray = [];

export function avviaMotoreBachecaUtility(appInstance, dbInstance, authInstance, isPrivileged, fullName) {
    window.bachecaContext = {
        app: appInstance,
        db: dbInstance,
        auth: authInstance,
        isPrivilegedUser: isPrivileged,
        currentUserFullName: fullName
    };

    const user = authInstance.currentUser;
    if (!user) return;

    if (isPrivileged) {
        const btnAdd = document.getElementById('btn-admin-add-bacheca');
        if (btnAdd) btnAdd.style.display = 'block';
    }

    // --- INIZIO AGGIUNTA: Rimozione avviso dal menù ---
    // Sostituisci 'ID_DEL_TUO_BADGE_MENU' con l'id reale dell'icona/pallino rosso che hai nel menù HTML
    const badgeAvvisoMenu = document.getElementById('ID_DEL_TUO_BADGE_MENU');
    if (badgeAvvisoMenu) {
        badgeAvvisoMenu.style.display = 'none'; 
    }
    // Emettiamo anche un evento globale nel caso il tuo menù sia gestito da un altro script in ascolto
    window.dispatchEvent(new Event('bacheca-utility-letta'));
    // --- FINE AGGIUNTA ---

    window.caricaBacheca();
}

window.attivaNotificheBacheca = async () => {
    const ctx = window.bachecaContext;
    if (!ctx || !ctx.auth.currentUser) return;
    
    const btn = document.getElementById('btn-attiva-notifiche-bacheca');
    if (!btn) return;

    const testoOriginale = btn.innerHTML;

    btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Attivazione in corso...";
    btn.disabled = true;
    btn.style.pointerEvents = 'none';

    try {
        const messaging = getMessaging(ctx.app);
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const swPath = basePath + '/firebase-messaging-sw.js';
            const swRegistration = await navigator.serviceWorker.register(swPath);

            const token = await getToken(messaging, {
                vapidKey: 'BLex63nSSs-uyUZUIRzWPOQyznfTkHC8ZtNnInGArryQnYddSfIHjAH1IwfoopM9otZ4jl2NGL5vM4xtLHkqwyI',
                serviceWorkerRegistration: swRegistration
            });

            if (token) {
                const prefDefault = { bachecaturni: false, bachecautility: true, promemoria: true, rotazioni: false };
                await setDoc(doc(ctx.db, "utenti", ctx.auth.currentUser.uid), { 
                    fcm_token: token,
                    notifiche_pref: prefDefault 
                }, { merge: true });

                btn.style.display = 'none';
                alert("🔔 Notifiche attivate! Riceverai un avviso per ogni nuovo Annuncio o DDS.");
            } else {
                 btn.innerHTML = testoOriginale;
                 btn.disabled = false;
                 btn.style.pointerEvents = 'auto';
                 alert("Non è stato possibile ottenere il token per le notifiche.");
            }
        } else {
            btn.style.display = 'none';
            alert("Hai negato il permesso per le notifiche.");
        }
    } catch (error) {
        console.error("Errore attivazione notifiche:", error);
        btn.innerHTML = testoOriginale;
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        alert("Errore durante l'attivazione delle notifiche. Controlla la console.");
    }
};

window.toggleCampiDDS = () => {
    const isDDS = document.getElementById('pub-tipo').value === 'dds';
    document.getElementById('area-dds').style.display = isDDS ? 'block' : 'none';
};

window.toggleAreaTarget = () => {
    const isSelezione = document.getElementById('pub-target').value === 'selezione';
    document.getElementById('area-target').style.display = isSelezione ? 'block' : 'none';
};

window.toggleSondaggio = () => {
    const area = document.getElementById('area-sondaggio');
    const isChecked = document.getElementById('pub-has-sondaggio').checked;
    area.style.display = isChecked ? 'block' : 'none';
    if (isChecked && document.getElementById('lista-opzioni-sondaggio').children.length === 0) {
        window.aggiungiOpzioneSondaggio("Sì");
        window.aggiungiOpzioneSondaggio("No");
    }
};

window.aggiungiOpzioneSondaggio = (valoreDefault = "") => {
    const div = document.createElement('input');
    div.type = 'text'; div.className = 'input-field opzione-sondaggio';
    div.placeholder = 'Testo opzione (es. Sì, No, Forse)';
    div.style.marginBottom = '10px'; div.style.textTransform = 'none'; div.value = valoreDefault;
    document.getElementById('lista-opzioni-sondaggio').appendChild(div);
};

window.apriDatePickerAvviso = () => { document.getElementById('modal-date-picker-avviso').style.display = 'flex'; window.aggiornaUI_DatePicker(); };
window.chiudiDatePickerAvviso = () => { document.getElementById('modal-date-picker-avviso').style.display = 'none'; document.getElementById('pub-date-dds-display').value = ddsDatesArray.length === 0 ? "" : ddsDatesArray.join(", "); };
window.aggiungiDataSingola = () => { const val = document.getElementById('input-date-single').value; if (!val) return; if (!ddsDatesArray.includes(val)) { ddsDatesArray.push(val); ddsDatesArray.sort(); window.aggiornaUI_DatePicker(); } document.getElementById('input-date-single').value = ""; };
window.rimuoviDataSingola = (dateStr) => { ddsDatesArray = ddsDatesArray.filter(d => d !== dateStr); window.aggiornaUI_DatePicker(); };
window.aggiornaUI_DatePicker = () => {
    const container = document.getElementById('date-tags-container');
    container.innerHTML = "";
    if(ddsDatesArray.length === 0) { container.innerHTML = `<span style="color:var(--text-muted); font-size: 13px;">Nessuna data aggiunta.</span>`; } 
    else { ddsDatesArray.forEach(d => { container.innerHTML += `<div class="date-tag">${d} <span class="date-tag-remove" onclick="window.rimuoviDataSingola('${d}')"><i class="fa-solid fa-xmark"></i></span></div>`; }); }
};

window.segnaComeLetto = async (msgId) => {
    const ctx = window.bachecaContext;
    if (!ctx || !ctx.auth.currentUser) return;
    const key = 'letto_' + msgId;
    if (localStorage.getItem(key)) return; 
    try {
        const readRef = doc(ctx.db, "bacheca_utility", msgId, "letture", ctx.auth.currentUser.uid);
        await setDoc(readRef, { nome: ctx.currentUserFullName, data_lettura: Date.now() }, { merge: true });
        localStorage.setItem(key, 'true');
    } catch(e) { console.log("Impossibile salvare la lettura"); }
};

window.caricaBacheca = async () => {
    const ctx = window.bachecaContext;
    if (!ctx) return;
    
    const container = document.getElementById('lista-messaggi');
    const stateApp = JSON.parse(localStorage.getItem('myTurniApp')) || {};
    const pid = stateApp.profiloAttivoId || 'default';
    const profileObj = stateApp.profiliSalvati ? stateApp.profiliSalvati[pid] : stateApp;
    const rotazioneUtente = profileObj ? profileObj.depositoAttivo : null;
    const oggiStr = new Date().toISOString().split('T')[0];

    container.innerHTML = `<div class="status-message"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i> Caricamento annunci...</div>`;

    try {
        const q = query(collection(ctx.db, "bacheca_utility"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        
        container.innerHTML = "";
        let msgsMostrati = 0;

        snap.forEach(d => { 
            let m = d.data(); 
            m.id = d.id; 
            
            if (m.scadenza && m.scadenza < oggiStr) return; 
            if (!ctx.isPrivilegedUser && m.target && m.target !== "tutti") {
                if (!rotazioneUtente || !m.target.includes(rotazioneUtente)) return;
            }

            window.segnaComeLetto(m.id);
            msgsMostrati++;
            const dataObj = new Date(m.timestamp);
            const dataFormattata = dataObj.toLocaleDateString('it-IT') + " alle " + dataObj.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
            
            let extraHTML = "";
            let cardClass = "card";

            if (m.tipo === "dds") {
                cardClass += " card-dds";
                extraHTML += `<div class="msg-title-dds"><i class="fa-solid fa-triangle-exclamation"></i> DDS: ${m.titolo_dds}</div>`;
                if (m.date_validita) extraHTML += `<div style="font-size: 14px; color: var(--danger); margin-bottom: 12px; font-weight: 600;"><i class="fa-regular fa-calendar-check"></i> Date valide: <b>${m.date_validita}</b></div>`;
            }

            if (m.target && m.target !== "tutti" && ctx.isPrivilegedUser) {
                extraHTML += `<div style="font-size: 11px; background: var(--primary-glow); color: var(--primary); display: inline-flex; align-items:center; gap:6px; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; font-weight:600;"><i class="fa-solid fa-bullseye"></i> Mirato a specifiche rotazioni</div><br>`;
            }

            if (m.link) extraHTML += `<a href="${m.link}" target="_blank" class="msg-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> Apri Link Esterno</a>`;

            let sondaggioHTML = "";
            if (m.sondaggio_opzioni && m.sondaggio_opzioni.length > 0) {
                sondaggioHTML = `<div id="sondaggio-${m.id}" style="margin-top: 16px;"><div style="font-size:13px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento sondaggio...</div></div>`;
                let isMulti = m.sondaggio_multi === true;
                window.calcolaSondaggio(m.id, m.sondaggio_opzioni, isMulti);
            }

            let adminBtn = ctx.isPrivilegedUser ? `<button class="btn-delete" onclick="window.eliminaMessaggio('${m.id}')"><i class="fa-solid fa-trash-can"></i> Elimina</button>` : '';
            
            // Il tasto infoBtn è visibile solo all'admin (proprio come elimina) e posizionato sotto ad esso.
            let infoBtn = ctx.isPrivilegedUser 
                ? `<button class="btn-outline" style="position: absolute; top: 52px; right: 16px; padding: 6px 10px; font-size: 12px; background: var(--surface); z-index: 1
