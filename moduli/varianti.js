import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. INIEZIONE UI (Gestita dal LazyLoader)
// ==========================================
export function initUIVarianti() {
    if (document.getElementById('modal-varianti-main')) return;
    
    const uiHTML = `
    <style>
        .contact-item { background: var(--surface); padding: 16px; border-radius: var(--radius-md); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); border-left: 5px solid var(--primary); border: 1px solid var(--border-color); border-left-width: 5px; text-align: left;}
        .contact-info { text-align: left; flex: 1; }
        .contact-name { font-weight: 700; font-size: 16px; color: var(--text-main); margin-bottom: 4px; text-transform: capitalize; }
        .contact-detail { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .turno-badge { font-size: 16px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px; }
        .turno-badge.npl { color: var(--danger); }
        .turno-originale { font-size: 11px; color: var(--text-muted); font-weight: normal; display: block; margin-top: 4px; text-align: right;}
    </style>

    <div id="modal-varianti-main" class="modal-overlay" onclick="window.chiudiSuSfondo(event, 'modal-varianti-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-varianti-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <i class="fa-solid fa-calendar-users"></i> Varianti Servizio
            </h3>

            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%;">
                
                <div id="view-var-no-auth" style="display: none; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--danger); margin-top: 0;">Accesso Richiesto</h3>
                </div>

                <div id="view-var-no-setup" style="display: none; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--warning); margin-top: 0;">Calendario non configurato</h3>
                    <p style="color: var(--text-muted);">Configura la rotazione nel calendario prima di condividere i turni.</p>
                </div>

                <div id="view-var-opt-in" style="display: none; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-handshake-simple" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--primary); margin-top: 0;">Condividi i Turni</h3>
                    <p style="color: var(--text-muted); margin-bottom: 24px;">Entrando accetti di condividere il tuo calendario con i colleghi. Le motivazioni di assenza sensibili verranno nascoste automaticamente.</p>
                    <button class="btn-action" onclick="window.attivaCondivisioneVarianti()"><i class="fa-solid fa-share-nodes"></i> Accetta e Condividi</button>
                </div>

                <div id="view-var-main" style="display: none; flex-direction: column; width: 100%;">
                    <input type="date" id="data-ricerca-varianti" class="input-field" style="margin-bottom: 15px;" onchange="window.cercaVariantiGiorno()">
                    <div id="varianti-list" style="width: 100%;"></div>
                </div>

                <div id="view-var-loading" style="display: none; justify-content: center; margin-top: 40px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i>
                </div>

            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO E FILTRI
// ==========================================
export function avviaMotoreVarianti(db, auth, userDataPrivate) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        mostraVista('view-var-no-auth');
        return;
    }

    // Gestore Viste Interno
    function mostraVista(idVista) {
        ['view-var-no-auth', 'view-var-no-setup', 'view-var-opt-in', 'view-var-loading', 'view-var-main'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === idVista) ? 'flex' : 'none';
        });
    }

    // Filtro Privacy per dati sensibili
    function applicaFiltroPrivacy(turnoStr) {
        if (!turnoStr) return "";
        let t = turnoStr.toUpperCase().trim();
        const codiciSensibili = ["FER", "FEP", "FES", "FERIE", "KMAL", "MALATTIA", "PRT", "KNOP", "AVIS", "KINF"];
        
        let isSensibile = codiciSensibili.some(codice => {
            let regex = new RegExp(`\\b${codice}\\b`);
            return regex.test(t);
        });
        
        return isSensibile ? "NPL" : t;
    }

    // Caricamento Stato Iniziale (Eseguito subito al lancio)
    async function caricaStatoVarianti() {
        mostraVista('view-var-loading');

        let state = JSON.parse(localStorage.getItem('myTurniApp')) || {};
        if (!state.depositoAttivo) {
            mostraVista('view-var-no-setup');
            return;
        }

        try {
            const calRef = doc(db, "calendario", currentUser.uid);
            const calSnap = await getDoc(calRef);
            
            if (calSnap.exists() && calSnap.data().condivisioneVarianti === true) {
                mostraVista('view-var-main');
                const dataInput = document.getElementById('data-ricerca-varianti');
                if (!dataInput.value) dataInput.value = new Date().toISOString().split('T')[0];
                window.cercaVariantiGiorno();
            } else {
                mostraVista('view-var-opt-in');
            }
        } catch (error) { 
            console.error("Errore lettura varianti", error); 
        }
    }

    // Accettazione Opt-In
    window.attivaCondivisioneVarianti = async function() {
        if (!confirm("Confermi di voler condividere i tuoi turni giornalieri con gli altri colleghi?")) return;
        mostraVista('view-var-loading');
        
        try {
            const calRef = doc(db, "calendario", currentUser.uid);
            await updateDoc(calRef, {
                condivisioneVarianti: true,
                nomePubblico: userDataPrivate.nome || "",
                cognomePubblico: userDataPrivate.cognome || "",
                omonimiaPubblico: userDataPrivate.progressivo || "",
                matricolaPubblico: userDataPrivate.matricola || ""
            });
            caricaStatoVarianti(); 
        } catch (e) { 
            alert("Errore durante l'attivazione della condivisione."); 
            mostraVista('view-var-opt-in');
        }
    };

    // Ricerca turni nel Database
    window.cercaVariantiGiorno = async function() {
        const dataScelta = document.getElementById('data-ricerca-varianti').value;
        const listDiv = document.getElementById('varianti-list');
        listDiv.innerHTML = "<div style='text-align:center; margin-top:20px;'><i class='fa-solid fa-spinner fa-spin' style='color:var(--primary); font-size:24px;'></i></div>";
        
        try {
            const q = query(collection(db, "calendario"), where("condivisioneVarianti", "==", true));
            const querySnapshot = await getDocs(q);
            let turniCondivisi = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.cognomePubblico) {
                    
                    let turnoManuale = data.variazioni && data.variazioni[dataScelta] ? data.variazioni[dataScelta] : null;
                    let turnoOriginaleBase = "Turno Base"; // Placeholder per integrazione rotazione futura
                    
                    let isModificato = turnoManuale !== null;
                    let turnoDaMostrare = isModificato ? turnoManuale : turnoOriginaleBase;
                    
                    let turnoSchermato = applicaFiltroPrivacy(turnoDaMostrare);
                    let originaleSchermato = isModificato ? applicaFiltroPrivacy(turnoOriginaleBase) : "";

                    turniCondivisi.push({
                        nome: data.nomePubblico,
                        cognome: data.cognomePubblico,
                        omonimia: data.omonimiaPubblico,
                        matricola: data.matricolaPubblico,
                        turnoStr: turnoSchermato,
                        originaleStr: originaleSchermato,
                        modificato: isModificato
                    });
                }
            });
            
            turniCondivisi.sort((a, b) => a.cognome.localeCompare(b.cognome));
            disegnaVarianti(turniCondivisi);
        } catch (error) { 
            listDiv.innerHTML = "<div style='color:var(--danger); text-align:center;'>Errore di caricamento.</div>"; 
        }
    };

    // Rendering Lista
    function disegnaVarianti(array) {
        const listDiv = document.getElementById('varianti-list');
        listDiv.innerHTML = "";
        
        if (array.length === 0) {
            listDiv.innerHTML = "<div style='text-align:center; color:var(--text-muted); padding:20px;'>Nessun collega ha condiviso i turni per questa data.</div>";
            return;
        }
        
        array.forEach(c => {
            const item = document.createElement('div'); 
            item.className = "contact-item";
            const prog = c.omonimia ? ` (${c.omonimia})` : "";
            
            let classeNpl = c.turnoStr === "NPL" ? "npl" : "";
            let bloccoIcona = "";
            let textOriginale = "";
            
            if (c.modificato) {
                bloccoIcona = `<i class="fa-solid fa-pen-to-square" style="color:var(--warning); cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'"></i>`;
                textOriginale = `<span class="turno-originale" style="display:none;">Originale: ${c.originaleStr}</span>`;
            }
            
            item.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">${c.cognome} ${c.nome}${prog}</div>
                    <div class="contact-detail">Mat: ${c.matricola}</div>
                </div>
                <div>
                    <div class="turno-badge ${classeNpl}">
                        ${c.turnoStr} ${bloccoIcona}
                    </div>
                    ${textOriginale}
                </div>
            `;
            listDiv.appendChild(item);
        });
    }

    // PARTENZA AUTOMATICA DEL MOTORE
    caricaStatoVarianti();
}
