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
                
                <div id="view-var-no-auth" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-lock" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--danger); margin-top: 0;">Accesso Richiesto</h3>
                </div>

                <div id="view-var-no-setup" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 48px; color: var(--warning); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--warning); margin-top: 0;">Calendario non configurato</h3>
                    <p style="color: var(--text-muted);">Configura la rotazione nel calendario prima di condividere i turni.</p>
                </div>

                <div id="view-var-opt-in" style="display: none; flex-direction: column; align-items: center; text-align: center; margin-top: 20px;">
                    <i class="fa-solid fa-handshake-simple" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h3 style="color: var(--primary); margin-top: 0;">Condividi i Turni</h3>
                    <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 13.5px; line-height: 1.5; text-align: justify;">In questa sezione puoi trovare un calendario in cui giorno per giorno puoi vedere la lista di colleghi che hanno accettato di condividere i propri turni e il turno che fanno, si potranno vedere anche i cambi turno salvati sul calendario. Le sigle di assenza (KMAL, KNOP, AVIS, KINF, FER, FEP, FES, PRT) non verranno visualizzate, saranno sostituite da NPL. Entrando accetti di condividere i tuoi turni con gli altri. A chi entra si chiede di tenere aggiornato il calendario con assenze e cambi per avere sempre dati accurati.</p>
                    <button class="btn-action" onclick="window.attivaCondivisioneVarianti()"><i class="fa-solid fa-share-nodes"></i> Accetta e Condividi</button>
                </div>

                <div id="view-var-main" style="display: none; flex-direction: column; width: 100%;">
                    <input type="date" id="data-ricerca-varianti" class="input-field" style="margin-bottom: 15px;" onchange="window.cercaVariantiGiorno()">
                    <div id="varianti-list" style="width: 100%;"></div>
                </div>

                <div id="view-var-loading" style="display: none; flex-direction: column; align-items: center; justify-content: center; margin-top: 40px;">
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
    let globalRotCache = null;
    const DATA_INIZIO_NUOVI_TURNI = "2026-06-01"; 

    if (!currentUser) {
        mostraVista('view-var-no-auth');
        return;
    }

    // --- HELPER MATEMATICI PER IL CALCOLO TURNI ---
    function stringToNum(s) { 
        if(!s) return 0; 
        let p = s.split('-'); 
        return Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000); 
    }

    function isGiornoRiposoBase(curr, cfg) { 
        if (!cfg.riposoStart) return false; 
        let ref = stringToNum(cfg.riposoStart); 
        if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0); 
        let pos = ((curr - ref + 6) % 15 + 15) % 15; 
        return (pos === 6 || pos === 13 || pos === 14); 
    }

    // Ricostruisce il turno originale per un determinato utente in una certa data
    function calcolaTurnoBase(dStr, cfgData) {
        if (!cfgData || !cfgData.depositoAttivo || !cfgData.riposoStart) return "N/D";
        
        let curr = stringToNum(dStr);
        let isPastUpdate = (cfgData.history && curr < stringToNum(DATA_INIZIO_NUOVI_TURNI)); 
        let cfgBase = isPastUpdate ? cfgData.history : cfgData;
        
        if (isGiornoRiposoBase(curr, cfgBase)) {
            let tituloRiposo = 'RI'; 
            if (cfgBase.riposoStart && cfgBase.depositoAttivo !== 'disp_det') { 
                let ref = stringToNum(cfgBase.riposoStart); 
                let pos = ((curr - ref + 6) % 15 + 15) % 15; 
                if (pos === 13) tituloRiposo = 'AL'; 
            }
            return tituloRiposo;
        }

        if (cfgBase.depositoAttivo.startsWith('disp_')) return "DISP";

        if (cfgBase.rotazioneStart) {
            let activeCfg = (cfgData.futureConfig && curr >= stringToNum(cfgData.futureConfig.dataInizio)) 
                ? { start: cfgData.futureConfig.dataInizio, idx: cfgData.futureConfig.turnoIndex, tcPattern: cfgData.futureConfig.tcPattern } 
                : { start: cfgBase.rotazioneStart, idx: cfgBase.turnoIndex, tcPattern: cfgBase.tcPattern };
            
            let refRot = stringToNum(activeCfg.start), w = 0; 
            
            if (curr >= refRot) { 
                for (let j = refRot; j < curr; j++) { if (!isGiornoRiposoBase(j, cfgBase)) w++; } 
            } else { 
                for (let j = refRot; j > curr; j--) { if (!isGiornoRiposoBase(j, cfgBase)) w--; } 
            }
            
            let refRip = stringToNum(cfgBase.riposoStart); 
            let startPos = ((refRot - refRip + 6) % 15 + 15) % 15; 
            let offset = [1, 3, 5, 8, 10, 12].includes(startPos) ? 1 : 0;
            
            // Trova la rotazione giusta nel tempo
            let rotList = [];
            if (globalRotCache) {
                const dateChiavi = Object.keys(globalRotCache).sort();
                let rotCorrente = dateChiavi.length > 0 ? globalRotCache[dateChiavi[0]] : null; 
                for (let i = dateChiavi.length - 1; i >= 0; i--) { 
                    if (curr >= stringToNum(dateChiavi[i])) { rotCorrente = globalRotCache[dateChiavi[i]]; break; } 
                }
                if (rotCorrente && rotCorrente[cfgBase.depositoAttivo]) {
                    rotList = rotCorrente[cfgBase.depositoAttivo];
                }
            }

            if (rotList.length > 0) {
                if (cfgBase.depositoAttivo.startsWith('tc_')) {
                    let currPos = ((curr - refRip + 6) % 15 + 15) % 15; 
                    let isBlock2 = (currPos >= 7 && currPos <= 12); 
                    let k = isBlock2 ? (currPos - 7) : currPos; 
                    let patternDopoSingolo = activeCfg.tcPattern || cfgBase.tcPattern || 'doppio'; 
                    let isAlternato = (patternDopoSingolo === 'disp') ? isBlock2 : !isBlock2;
                    let idx = Math.floor(k / 2); 
                    
                    if (idx >= rotList.length) idx = rotList.length - 1; 
                    let t = rotList[idx].toUpperCase();
                    
                    if (isAlternato) { 
                        let dispOnEven = (cfgBase.depositoAttivo === 'tc_spez_lido'); 
                        if (dispOnEven && k % 2 === 0) t = "DISP"; 
                        if (!dispOnEven && k % 2 !== 0) t = "DISP"; 
                    }
                    return t;
                } else {
                    let expandedRotList = []; 
                    let originalToExpanded = [];
                    for (let j = 0; j < rotList.length; j++) { 
                        originalToExpanded[j] = expandedRotList.length; 
                        let currentTurn = rotList[j].toUpperCase(); 
                        if (currentTurn.includes('+')) { 
                            let parts = currentTurn.split('+'); 
                            expandedRotList.push(parts[0].trim()); 
                            if (parts.length > 1) { expandedRotList.push(parts[1].trim()); } 
                        } else { 
                            expandedRotList.push(currentTurn); 
                            expandedRotList.push(currentTurn); 
                        } 
                    }
                    let L_exp = expandedRotList.length; 
                    let baseExpIdx = originalToExpanded[activeCfg.idx]; 
                    let blockStartIdx = baseExpIdx - (baseExpIdx % 2); 
                    let idxExp = (blockStartIdx + w + offset) % L_exp; 
                    if (idxExp < 0) idxExp += L_exp; 
                    return expandedRotList[idxExp];
                }
            }
        }
        return "N/D";
    }

    // --- CARICAMENTO DATI STRUTTURALI (ROT CACHE) ---
    async function initRotCache() {
        if (globalRotCache) return;
        globalRotCache = {};
        try {
            const resMap = await fetch("mappa_file.json?v=" + Date.now());
            if (resMap.ok) {
                const mappa = await resMap.json();
                const albero = mappa.albero || [];
                for (let file of albero) {
                    if (file.startsWith("rotazioni_")) {
                        const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
                        if (dateMatch) {
                            const res = await fetch(file + "?v=" + Date.now());
                            if (res.ok) {
                                globalRotCache[dateMatch[0]] = await res.json();
                            }
                        }
                    }
                }
            }
        } catch (e) { console.error("Errore download mappe rotazioni", e); }
    }

    // Gestore Viste Interno
    function mostraVista(idVista) {
        ['view-var-no-auth', 'view-var-no-setup', 'view-var-opt-in', 'view-var-loading', 'view-var-main'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === idVista) ? 'flex' : 'none';
        });
    }

    // Filtro Privacy per dati sensibili (Sigle aggiornate come da richiesta)
    function applicaFiltroPrivacy(turnoStr) {
        if (!turnoStr) return "";
        let t = turnoStr.toUpperCase().trim();
        const codiciSensibili = ["KMAL", "KNOP", "AVIS", "KINF", "FER", "FEP", "FES", "PRT"];
        
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
            await initRotCache(); // Carica le rotazioni per calcolare i turni degli altri

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
            mostraVista('view-var-opt-in');
        }
    }

    // Accettazione Opt-In
    window.attivaCondivisioneVarianti = async function() {
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

    // Ricerca turni nel Database per il giorno selezionato
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
                    
                    // Utilizza il motore copiato per calcolare il turno strutturale dell'utente
                    let turnoOriginaleBase = calcolaTurnoBase(dataScelta, data);
                    
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
