import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. INIEZIONE UI BACHECA
// ==========================================
export function initUIBacheca() {
    if (document.getElementById('modal-bacheca-main')) return;
    
    const uiHTML = `
    <style>
        /* Stili ripresi e adattati dal tuo tema */
        .bacheca-header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; }
        .bacheca-controls { display: flex; gap: 10px; }
        .bacheca-search { flex: 1; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); }
        .bacheca-filter { padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); }
        
        .bacheca-post { background: var(--surface); padding: 15px; border-radius: var(--radius-md); margin-bottom: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
        .bacheca-post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .bacheca-post-author { font-size: 13px; font-weight: bold; color: var(--text-muted); }
        .bacheca-post-date { font-size: 11px; color: var(--text-muted); }
        .bacheca-post-title { font-size: 16px; font-weight: 900; color: var(--primary); margin: 0 0 8px 0; }
        .bacheca-post-body { font-size: 14px; line-height: 1.4; white-space: pre-wrap; color: var(--text-main); margin-bottom: 10px; }
        .bacheca-post-body a { color: #3498db; text-decoration: underline; }
        .bacheca-tag { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: rgba(52, 152, 219, 0.1); color: #3498db; }
        
        .bacheca-actions { display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 10px; }
        .btn-bacheca { padding: 6px 12px; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-edit { background: rgba(243, 156, 18, 0.2); color: #f39c12; }
        .btn-delete { background: rgba(220, 53, 69, 0.2); color: var(--danger); }
        
        .profile-collapsible { display: none; background: rgba(0,0,0,0.05); padding: 15px; border-radius: var(--radius-sm); margin-bottom: 15px; border: 1px solid var(--border-color); }
        .profile-collapsible.open { display: block; }
        .input-bacheca { width: 100%; padding: 10px; margin-bottom: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); }
        .input-error { border: 2px solid var(--danger) !important; background: rgba(220, 53, 69, 0.05); }

        .bacheca-alert { padding: 15px; border-radius: var(--radius-sm); margin-bottom: 15px; font-weight: bold; font-size: 14px; text-align: center; display: none; }
    </style>

    <!-- Modale Principale Bacheca -->
    <div id="modal-bacheca-main" class="modal-overlay" style="display:none;" onclick="window.bachecaAPI.chiudiSfondo(event, 'modal-bacheca-main')">
        <div class="modal-content" style="max-width: 500px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-bacheca-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 15px;">
                <i class="fa-solid fa-clipboard-list"></i> Bacheca
            </h3>
            
            <div id="bacheca-warn-alert" class="bacheca-alert" style="background: rgba(255, 193, 7, 0.2); border-left: 5px solid #ffc107; color: #856404;">
                <i class="fa-solid fa-triangle-exclamation"></i> Hai ricevuto un avviso (Warn) da un Amministratore per un post non adeguato. Al prossimo richiamo potresti essere bannato dalla bacheca.
            </div>

            <div class="bacheca-header">
                <div class="bacheca-controls">
                    <input type="text" id="bacheca-search-input" class="bacheca-search" placeholder="Cerca nel titolo..." oninput="window.bachecaAPI.filtraPost()">
                    <select id="bacheca-category-filter" class="bacheca-filter" onchange="window.bachecaAPI.filtraPost()">
                        <option value="tutte">Tutte le categorie</option>
                        <option value="offro">Offro</option>
                        <option value="vendo">Vendo</option>
                        <option value="regalo">Regalo</option>
                        <option value="cerco">Cerco</option>
                        <option value="personalizzata">Altro</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-action" style="flex: 1;" onclick="window.bachecaAPI.apriPubblica()"><i class="fa-solid fa-pen"></i> Pubblica Annuncio</button>
                    <button id="btn-bacheca-admin" class="btn-action" style="background: var(--danger); display: none;" onclick="window.bachecaAPI.apriAdmin()"><i class="fa-solid fa-shield-halved"></i> Admin</button>
                </div>
            </div>

            <div id="bacheca-feed" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%;">
                <div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin" style="color: var(--primary); font-size: 24px;"></i></div>
            </div>
        </div>
    </div>

    <!-- Modale Benvenuto -->
    <div id="modal-bacheca-welcome" class="modal-overlay" style="display:none; z-index: 10000; background: rgba(0,0,0,0.8);">
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 30px;">
            <i class="fa-solid fa-handshake-angle" style="font-size: 50px; color: var(--primary); margin-bottom: 20px;"></i>
            <h2 style="margin-top:0;">Benvenuto in Bacheca!</h2>
            <p style="margin-bottom: 20px; color: var(--text-main); line-height: 1.5;">
                In questa sezione troverai gli annunci pubblicati dai colleghi riguardanti qualsiasi cosa si voglia condividere.<br><br>
                <strong>L'unica regola è il rispetto reciproco.</strong> Annunci non adeguati verranno rimossi e potrebbero portare al blocco dell'accesso.
            </p>
            <button class="btn-action" style="width: 100%; font-size: 16px;" onclick="window.bachecaAPI.accettaBenvenuto()">Entra</button>
        </div>
    </div>

    <!-- Modale Pubblicazione -->
    <div id="modal-bacheca-publish" class="modal-overlay" style="display:none; z-index: 9999;">
        <div class="modal-content" style="max-width: 440px; max-height: 90vh; overflow-y: auto; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-bacheca-publish').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary);"><span id="bacheca-pub-title">Nuovo Annuncio</span></h3>
            
            <button class="btn-action" style="width:100%; margin-bottom: 10px; background: rgba(0,0,0,0.1); color: var(--text-main); border: 1px solid var(--border-color);" onclick="document.getElementById('bacheca-profile-sec').classList.toggle('open')">
                <i class="fa-solid fa-user"></i> Dati Profilo Contatto
            </button>
            
            <div id="bacheca-profile-sec" class="profile-collapsible">
                <input type="text" id="bacheca-p-nome" class="input-bacheca" placeholder="Nome *">
                <input type="text" id="bacheca-p-cognome" class="input-bacheca" placeholder="Cognome *">
                <input type="text" id="bacheca-p-matricola" class="input-bacheca" placeholder="Matricola *">
                <input type="tel" id="bacheca-p-tel" class="input-bacheca" placeholder="Numero di Telefono *">
                <p style="font-size: 11px; color: var(--text-muted); margin:0;">Questi dati saranno salvati nel tuo profilo.</p>
            </div>

            <select id="bacheca-in-categoria" class="input-bacheca" onchange="window.bachecaAPI.checkCategoriaPersonalizzata()">
                <option value="" disabled selected>Seleziona Categoria...</option>
                <option value="offro">Offro</option>
                <option value="vendo">Vendo</option>
                <option value="regalo">Regalo</option>
                <option value="cerco">Cerco</option>
                <option value="personalizzata">Personalizzata...</option>
            </select>
            <input type="text" id="bacheca-in-cat-pers" class="input-bacheca" placeholder="Scrivi la categoria..." style="display:none;">

            <input type="text" id="bacheca-in-titolo" class="input-bacheca" placeholder="Titolo dell'annuncio *">
            <textarea id="bacheca-in-testo" class="input-bacheca" placeholder="Testo dell'annuncio... (I link saranno cliccabili)" rows="6" style="resize: vertical;"></textarea>
            
            <input type="hidden" id="bacheca-edit-id">
            <button class="btn-action" style="width: 100%; margin-top: 10px;" onclick="window.bachecaAPI.salvaAnnuncio()">Pubblica</button>
        </div>
    </div>

    <!-- Modale Admin Warn/Ban -->
    <div id="modal-bacheca-admin" class="modal-overlay" style="display:none; z-index: 9999;">
        <div class="modal-content" style="max-width: 500px; height: 80vh; overflow-y: auto; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer;" onclick="document.getElementById('modal-bacheca-admin').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--danger);"><i class="fa-solid fa-shield-halved"></i> Pannello Moderazione</h3>
            <div id="bacheca-admin-list" style="margin-top: 15px;"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO BACHECA
// ==========================================
export function avviaMotoreBacheca(db, auth, userDataPrivate) {
    let posts = [];
    let isAdmin = userDataPrivate?.ruolo === "admin";
    let currentUserUid = auth.currentUser.uid;
    let unsubscribePosts = null;

    // Controllo Ban Immediato
    if (userDataPrivate?.bachecaBanned) {
        alert("Sei stato bannato dalla bacheca per violazione delle regole.");
        return; // Blocca l'apertura
    }

    // Oggetto API esposto a Window (Simile a come gestisci i modali di background nel tuo codice)
    window.bachecaAPI = {
        chiudiSfondo: function(event, id) {
            if (event.target.id === id) document.getElementById(id).style.display = 'none';
        },
        
        accettaBenvenuto: async function() {
            try {
                await updateDoc(doc(db, "utenti", currentUserUid), { bachecaWelcomeSeen: true });
                document.getElementById('modal-bacheca-welcome').style.display = 'none';
                userDataPrivate.bachecaWelcomeSeen = true;
            } catch (e) { console.error("Errore salvataggio benvenuto", e); }
        },

        checkCategoriaPersonalizzata: function() {
            const sel = document.getElementById('bacheca-in-categoria').value;
            document.getElementById('bacheca-in-cat-pers').style.display = (sel === 'personalizzata') ? 'block' : 'none';
        },

        apriPubblica: function(postToEdit = null) {
            // Reset Errori
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            
            const pNome = document.getElementById('bacheca-p-nome');
            const pCogn = document.getElementById('bacheca-p-cognome');
            const pMatr = document.getElementById('bacheca-p-matricola');
            const pTel = document.getElementById('bacheca-p-tel');
            const collaps = document.getElementById('bacheca-profile-sec');

            // Carica Dati Profilo
            pNome.value = userDataPrivate.nome || "";
            pCogn.value = userDataPrivate.cognome || "";
            pMatr.value = userDataPrivate.matricola || "";
            pTel.value = userDataPrivate.telefono || "";

            let mancanoDati = (!pNome.value || !pCogn.value || !pMatr.value || !pTel.value);
            
            if (mancanoDati) {
                collaps.classList.add('open');
                if(!pNome.value) pNome.classList.add('input-error');
                if(!pCogn.value) pCogn.classList.add('input-error');
                if(!pMatr.value) pMatr.classList.add('input-error');
                if(!pTel.value) pTel.classList.add('input-error');
            } else {
                collaps.classList.remove('open');
            }

            if (postToEdit) {
                document.getElementById('bacheca-pub-title').innerText = "Modifica Annuncio";
                document.getElementById('bacheca-edit-id').value = postToEdit.id;
                document.getElementById('bacheca-in-titolo').value = postToEdit.titolo;
                document.getElementById('bacheca-in-testo').value = postToEdit.testo;
                
                const catSelect = document.getElementById('bacheca-in-categoria');
                let opzioniBase = ["offro", "vendo", "regalo", "cerco"];
                if (opzioniBase.includes(postToEdit.categoria.toLowerCase())) {
                    catSelect.value = postToEdit.categoria.toLowerCase();
                    document.getElementById('bacheca-in-cat-pers').style.display = 'none';
                } else {
                    catSelect.value = "personalizzata";
                    document.getElementById('bacheca-in-cat-pers').style.display = 'block';
                    document.getElementById('bacheca-in-cat-pers').value = postToEdit.categoria;
                }
            } else {
                document.getElementById('bacheca-pub-title').innerText = "Nuovo Annuncio";
                document.getElementById('bacheca-edit-id').value = "";
                document.getElementById('bacheca-in-titolo').value = "";
                document.getElementById('bacheca-in-testo').value = "";
                document.getElementById('bacheca-in-categoria').value = "";
                document.getElementById('bacheca-in-cat-pers').style.display = 'none';
            }

            document.getElementById('modal-bacheca-publish').style.display = 'flex';
        },

        salvaAnnuncio: async function() {
            // Controlli validità
            const pNome = document.getElementById('bacheca-p-nome').value.trim();
            const pCogn = document.getElementById('bacheca-p-cognome').value.trim();
            const pMatr = document.getElementById('bacheca-p-matricola').value.trim();
            const pTel = document.getElementById('bacheca-p-tel').value.trim();
            
            if (!pNome || !pCogn || !pMatr || !pTel) {
                alert("Completa tutti i campi del profilo prima di pubblicare.");
                document.getElementById('bacheca-profile-sec').classList.add('open');
                return;
            }

            let cat = document.getElementById('bacheca-in-categoria').value;
            if (cat === "personalizzata") cat = document.getElementById('bacheca-in-cat-pers').value.trim();
            const tit = document.getElementById('bacheca-in-titolo').value.trim();
            const test = document.getElementById('bacheca-in-testo').value.trim();
            const idModifica = document.getElementById('bacheca-edit-id').value;

            if (!cat || !tit || !test) {
                alert("Compila categoria, titolo e testo.");
                return;
            }

            try {
                // Aggiorna profilo se modificato
                if (pNome !== userDataPrivate.nome || pCogn !== userDataPrivate.cognome || pMatr !== userDataPrivate.matricola || pTel !== userDataPrivate.telefono) {
                    await updateDoc(doc(db, "utenti", currentUserUid), {
                        nome: pNome, cognome: pCogn, matricola: pMatr, telefono: pTel
                    });
                    userDataPrivate.nome = pNome; userDataPrivate.cognome = pCogn; 
                    userDataPrivate.matricola = pMatr; userDataPrivate.telefono = pTel;
                }

                const postData = {
                    autoreId: currentUserUid,
                    autoreNome: `${pCogn} ${pNome}`,
                    autoreContatto: pTel,
                    categoria: cat,
                    titolo: tit,
                    testo: test,
                    timestamp: idModifica ? undefined : serverTimestamp()
                };

                if (idModifica) {
                    await updateDoc(doc(db, "bacheca", idModifica), {
                        categoria: cat, titolo: tit, testo: test
                    });
                } else {
                    await addDoc(collection(db, "bacheca"), postData);
                }
                
                document.getElementById('modal-bacheca-publish').style.display = 'none';
            } catch (e) {
                console.error("Errore salvataggio annuncio", e);
                alert("Errore durante il salvataggio.");
            }
        },

        filtraPost: function() {
            const search = document.getElementById('bacheca-search-input').value.toLowerCase();
            const filterCat = document.getElementById('bacheca-category-filter').value;
            
            const filtered = posts.filter(p => {
                const matchTitolo = p.titolo.toLowerCase().includes(search);
                const matchCat = filterCat === "tutte" || 
                                (filterCat === "personalizzata" ? !["offro","vendo","regalo","cerco"].includes(p.categoria.toLowerCase()) : p.categoria.toLowerCase() === filterCat);
                return matchTitolo && matchCat;
            });
            renderFeed(filtered);
        },

        gestisciPost: async function(id, act, autoreId) {
            if (act === 'edit') {
                const post = posts.find(p => p.id === id);
                if(post) this.apriPubblica(post);
            } else if (act === 'delete') {
                if(confirm("Sei sicuro di voler eliminare questo annuncio?")) {
                    try {
                        await deleteDoc(doc(db, "bacheca", id));
                        // Se chi elimina è ADMIN e NON è l'autore
                        if (isAdmin && autoreId !== currentUserUid) {
                            setTimeout(() => { this.promptWarnAdmin(autoreId); }, 500);
                        }
                    } catch (e) { console.error("Errore eliminazione", e); }
                }
            }
        },

        promptWarnAdmin: async function(targetUid) {
            try {
                const uDoc = await getDoc(doc(db, "utenti", targetUid));
                let warns = uDoc.data().bachecaWarns || 0;
                
                let msg = warns === 0 
                    ? "Post eliminato. Vuoi inviare un avviso (Warn) all'utente per post non adeguato?" 
                    : `L'utente ha già ${warns} Warn. Vuoi BANNARLO dalla bacheca?`;
                
                if (confirm(msg)) {
                    if (warns === 0) {
                        await updateDoc(doc(db, "utenti", targetUid), { bachecaWarns: 1 });
                        alert("Warn inviato con successo.");
                    } else {
                        await updateDoc(doc(db, "utenti", targetUid), { bachecaBanned: true });
                        alert("Utente bannato dalla bacheca.");
                    }
                }
            } catch (e) { console.error("Errore sistema warn", e); }
        },

        apriAdmin: async function() {
            document.getElementById('modal-bacheca-admin').style.display = 'flex';
            const container = document.getElementById('bacheca-admin-list');
            container.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Caricamento...';
            
            try {
                const qWarn = query(collection(db, "utenti"), where("bachecaWarns", ">", 0));
                const qBan = query(collection(db, "utenti"), where("bachecaBanned", "==", true));
                
                const [snapWarn, snapBan] = await Promise.all([getDocs(qWarn), getDocs(qBan)]);
                let adminHtml = '';
                
                let handled = new Set(); // Per evitare duplicati se uno ha warn e ban
                
                const addRow = (docData) => {
                    if(handled.has(docData.id)) return;
                    handled.add(docData.id);
                    let d = docData.data();
                    let stato = d.bachecaBanned ? '<span style="color:red; font-weight:bold;">BANNATO</span>' : `<span style="color:#f39c12; font-weight:bold;">${d.bachecaWarns} WARN</span>`;
                    
                    adminHtml += `
                        <div style="background:var(--surface); padding: 10px; margin-bottom: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                            <div><b>${d.cognome} ${d.nome}</b><br><small>${stato}</small></div>
                            <button class="btn-action" style="background:var(--success);" onclick="window.bachecaAPI.revocaWarnBan('${docData.id}')">Revoca</button>
                        </div>
                    `;
                };

                snapWarn.forEach(addRow);
                snapBan.forEach(addRow);

                if (adminHtml === '') adminHtml = '<p>Nessun utente con warn o ban.</p>';
                container.innerHTML = adminHtml;
            } catch (e) { console.error("Errore admin panel", e); }
        },

        revocaWarnBan: async function(targetUid) {
            if(confirm("Sei sicuro di voler revocare warn/ban per questo utente?")) {
                await updateDoc(doc(db, "utenti", targetUid), { bachecaWarns: 0, bachecaBanned: false });
                this.apriAdmin(); // Ricarica
            }
        }
    };

    function linkify(text) {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        // Escape HTML base per sicurezza
        let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return safeText.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }

    function renderFeed(listaPosts) {
        const feed = document.getElementById('bacheca-feed');
        if (listaPosts.length === 0) {
            feed.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Nessun annuncio presente.</div>';
            return;
        }

        let html = '';
        listaPosts.forEach(p => {
            const isOwner = p.autoreId === currentUserUid;
            let dateStr = p.timestamp ? p.timestamp.toDate().toLocaleString('it-IT') : "Ora";
            
            html += `
            <div class="bacheca-post">
                <div class="bacheca-post-header">
                    <span class="bacheca-post-author"><i class="fa-solid fa-user"></i> ${p.autoreNome}</span>
                    <span class="bacheca-post-date">${dateStr}</span>
                </div>
                <div style="margin-bottom: 5px;"><span class="bacheca-tag">${p.categoria.toUpperCase()}</span></div>
                <h4 class="bacheca-post-title">${p.titolo}</h4>
                <div class="bacheca-post-body">${linkify(p.testo)}</div>
                
                <div style="font-size: 12px; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> Contatto: <a href="tel:${p.autoreContatto}" style="color:var(--text-main); text-decoration:none; font-weight:bold;">${p.autoreContatto}</a></div>
                
                ${(isOwner || isAdmin) ? `
                <div class="bacheca-actions">
                    ${isOwner ? `<button class="btn-bacheca btn-edit" onclick="window.bachecaAPI.gestisciPost('${p.id}', 'edit', '${p.autoreId}')"><i class="fa-solid fa-pen"></i></button>` : ''}
                    <button class="btn-bacheca btn-delete" onclick="window.bachecaAPI.gestisciPost('${p.id}', 'delete', '${p.autoreId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
                ` : ''}
            </div>
            `;
        });
        feed.innerHTML = html;
    }

    // --- MAIN INIT LOGIC ---
    document.getElementById('modal-bacheca-main').style.display = 'flex';

    if (isAdmin) document.getElementById('btn-bacheca-admin').style.display = 'block';

    if (!userDataPrivate.bachecaWelcomeSeen) {
        document.getElementById('modal-bacheca-welcome').style.display = 'flex';
    }

    if (userDataPrivate.bachecaWarns > 0) {
        document.getElementById('bacheca-warn-alert').style.display = 'block';
    }

    // Listener in tempo reale per Firestore, ordinati dal più recente
    const q = query(collection(db, "bacheca"), orderBy("timestamp", "desc"));
    unsubscribePosts = onSnapshot(q, (snapshot) => {
        posts = [];
        snapshot.forEach((docSnap) => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });
        window.bachecaAPI.filtraPost(); // Usa la funzione di filtro per applicare eventuali ricerche attive
    }, (error) => {
        console.error("Errore fetch bacheca", error);
        document.getElementById('bacheca-feed').innerHTML = '<div style="color:var(--danger); text-align:center;">Errore caricamento annunci.</div>';
    });
}
