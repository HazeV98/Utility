import { doc, getDoc, collection, getDocs, query, addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// 1. INIEZIONE UI STORIE
// ==========================================
export function initUIStorie() {
    if (document.getElementById('modal-storie-main')) return;
    
    const uiHTML = `
    <style>
        .storie-header { display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; }
        .storie-top-bar { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        
        .btn-icon-only { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.2s; flex-shrink: 0; font-size: 16px; }
        .btn-icon-only:hover { background: rgba(0,0,0,0.05); transform: translateY(-1px); }
        .btn-pdf { color: #e74c3c; border-color: rgba(231, 76, 60, 0.3); background: rgba(231, 76, 60, 0.05); }
        
        .input-storie { width: 100%; padding: 12px 15px; margin-bottom: 15px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-main); outline: none; font-family: inherit; font-size: 14px; transition: all 0.2s ease-in-out; box-sizing: border-box; }
        .input-storie:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2); }
        .input-storie:disabled { opacity: 0.6; cursor: not-allowed; background: rgba(0,0,0,0.05); }
        
        .storie-post { background: var(--surface); padding: 18px; border-radius: 16px; margin-bottom: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
        .storie-post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px; }
        .storie-post-author { font-size: 14px; font-weight: 900; color: var(--primary); }
        .storie-post-date { font-size: 11px; color: var(--text-muted); }
        
        .storie-admin-data { margin-top: 5px; padding: 8px; background: rgba(220, 53, 69, 0.05); border-left: 3px solid var(--danger); border-radius: 4px; font-size: 12px; color: var(--text-main); display: none; }
        
        .storie-post-body { font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: var(--text-main); font-style: italic; }
        
        /* Layout azioni e social */
        .storie-actions-wrapper { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px; }
        
        .storie-social-left { display: flex; gap: 18px; align-items: center; }
        .btn-social { background: transparent; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: bold; color: var(--text-muted); padding: 5px; transition: all 0.2s; outline: none; }
        .btn-social:hover { color: var(--text-main); transform: scale(1.05); }
        .btn-like.liked { color: #e74c3c; }
        .btn-like.liked i { font-weight: 900; } /* Cuore pieno */
        
        .storie-actions { display: flex; gap: 10px; }
        .btn-storie { padding: 8px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; transition: opacity 0.2s; }
        .btn-storie:hover { opacity: 0.8; }
        .btn-storie-ed { background: rgba(243, 156, 18, 0.15); color: #f39c12; }
        .btn-storie-del { background: rgba(220, 53, 69, 0.15); color: var(--danger); }
        
        /* Stili modale commenti */
        .comment-box { background: var(--surface-hover); border-radius: 12px; padding: 12px; margin-bottom: 10px; font-size: 13px; border: 1px solid var(--border-color); }
        .comment-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: bold; color: var(--primary); }
        .comment-text { color: var(--text-main); line-height: 1.4; white-space: pre-wrap; }
        
        .anon-divider { display: flex; align-items: center; text-align: center; margin: 5px 0 15px 0; color: var(--text-muted); font-size: 12px; font-weight: bold; }
        .anon-divider::before, .anon-divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border-color); }
        .anon-divider:not(:empty)::before { margin-right: .5em; }
        .anon-divider:not(:empty)::after { margin-left: .5em; }
        
        .checkbox-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 14px; font-weight: bold; color: var(--text-main); cursor: pointer; }
        .checkbox-wrapper input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

        /* Categoria post */
        .storie-cat-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .storie-cat-toggle { display: flex; flex: 1; gap: 8px; }
        .btn-cat { flex: 1; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--surface); color: var(--text-muted); font-weight: bold; font-size: 14px; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-cat.active { color: var(--primary); border-color: var(--primary); background: rgba(52, 152, 219, 0.1); }
        .btn-cat:disabled { opacity: 0.6; cursor: not-allowed; }
        .storie-badge { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
        .storie-badge.storia { color: #8e44ad; background: rgba(142, 68, 173, 0.12); }
        .storie-badge.pensiero { color: #16a085; background: rgba(22, 160, 133, 0.12); }
        .storie-badge.nessuna { color: var(--text-muted); background: rgba(0, 0, 0, 0.06); }
        .storie-info-item { text-align: left; margin-bottom: 18px; font-size: 14px; line-height: 1.6; color: var(--text-main); }
        .storie-info-item b { display: block; margin-bottom: 4px; font-size: 15px; }
    </style>

    <div id="modal-storie-main" class="modal-overlay" style="display:none;" onclick="window.storieAPI.chiudiSfondo(event, 'modal-storie-main')">
        <div class="modal-content" style="max-width: 600px; height: 90vh; display: flex; flex-direction: column; padding: 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-storie-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 900; margin-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <i class="fa-solid fa-thumbtack"></i> Bacheca Utility
            </h3>

            <div class="storie-header">
                <div class="storie-top-bar">
                    <button class="btn-icon-only btn-pdf" onclick="window.storieAPI.esportaPDF()" title="Esporta le storie in PDF">
                        <i class="fa-solid fa-file-pdf"></i>
                    </button>
                    <button class="btn-icon-only" style="color: var(--primary); border-color: var(--primary);" onclick="window.storieAPI.apriPubblica()" title="Nuovo post">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>

            <div id="storie-feed" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%; padding-right: 5px;">
                <div style="text-align:center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="color: var(--primary); font-size: 30px;"></i></div>
            </div>
        </div>
    </div>

    <!-- Modale Commenti -->
    <div id="modal-storie-comments" class="modal-overlay" style="display:none; z-index: 10000;" onclick="window.storieAPI.chiudiSfondo(event, 'modal-storie-comments')">
        <div class="modal-content" style="max-width: 500px; height: 75vh; display: flex; flex-direction: column; padding: 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.storieAPI.chiudiCommenti()"></i>
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 15px;"><i class="fa-regular fa-comments"></i> Commenti</h3>
            
            <div id="storie-comments-list" style="flex: 1; overflow-y: auto; margin-bottom: 15px; padding-right: 5px;"></div>
            
            <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                <textarea id="storie-in-commento" class="input-storie" placeholder="Scrivi un commento..." style="margin-bottom: 0; flex: 1; resize: none; border-radius: 20px; padding: 12px 15px;" rows="1"></textarea>
                <input type="hidden" id="storie-active-comment-id">
                <button class="btn-action" style="width: 45px; height: 45px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" onclick="window.storieAPI.salvaCommento()">
                    <i class="fa-solid fa-paper-plane" style="margin-left: -2px;"></i>
                </button>
            </div>
        </div>
    </div>

    <div id="modal-storie-welcome" class="modal-overlay" style="display:none; z-index: 10001; background: rgba(0,0,0,0.85);">
        <div class="modal-content" style="max-width: 420px; max-height: 90vh; overflow-y: auto; text-align: center; padding: 40px 30px;">
            <i class="fa-solid fa-thumbtack" style="font-size: 55px; color: var(--primary); margin-bottom: 25px;"></i>
            <h2 style="margin-top:0; font-weight: 900;">Bacheca Utility</h2>
            <p style="margin-bottom: 25px; color: var(--text-main); line-height: 1.6; font-size: 15px;">
                Benvenuto, in questo modulo potrai pubblicare e condividere pensieri o episodi particolari successi a lavoro con i colleghi. Quante volte abbiamo detto che con quello che succede potremmo scriverci un libro? Qui si potrà salvare un pdf in cui saranno raccolti tutti i post segnati come storia.<br><br>
                Potrai pubblicare pensieri e storie in anonimo o scrivendo un alias o il tuo nome.
            </p>
            <button class="btn-action" style="width: 100%; font-size: 16px; border-radius: 12px; padding: 14px;" onclick="window.storieAPI.accettaBenvenuto()">Entra nella Bacheca</button>
        </div>
    </div>

    <div id="modal-storie-publish" class="modal-overlay" style="display:none; z-index: 9999;">
        <div class="modal-content" style="max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-storie-publish').style.display='none'"></i>
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 20px;"><span id="storie-pub-title">Nuovo Post</span></h3>
            
            <div class="storie-cat-row">
                <div class="storie-cat-toggle">
                    <button type="button" id="storie-cat-pensiero" class="btn-cat" onclick="window.storieAPI.setCategoria('pensiero')"><i class="fa-solid fa-lightbulb"></i> Pensiero</button>
                    <button type="button" id="storie-cat-storia" class="btn-cat" onclick="window.storieAPI.setCategoria('storia')"><i class="fa-solid fa-book"></i> Storia</button>
                </div>
                <button type="button" class="btn-icon-only" style="width: 38px; height: 38px; font-size: 15px;" onclick="window.storieAPI.apriInfo()" title="Che tipo di post scegliere?"><i class="fa-solid fa-circle-info"></i></button>
            </div>
            <input type="hidden" id="storie-in-categoria">

            <textarea id="storie-in-testo" class="input-storie" placeholder="Scrivi qui..." rows="8" style="resize: vertical;"></textarea>
            
            <input type="text" id="storie-in-nome" autocomplete="off" class="input-storie" placeholder="Nome visualizzato">
            
            <div class="anon-divider">OPPURE</div>
            
            <label class="checkbox-wrapper">
                <input type="checkbox" id="storie-in-anonimo" onchange="window.storieAPI.toggleAnonimo()">
                Pubblica in Anonimo
            </label>
            
            <input type="hidden" id="storie-edit-id">
            <button id="storie-pub-btn" class="btn-action" style="width: 100%; margin-top: 5px; border-radius: 12px; padding: 14px; font-size: 15px;" onclick="window.storieAPI.salvaStoria()">Pubblica</button>
        </div>
    </div>

    <!-- Modale Info categorie -->
    <div id="modal-storie-info" class="modal-overlay" style="display:none; z-index: 10002;" onclick="window.storieAPI.chiudiSfondo(event, 'modal-storie-info')">
        <div class="modal-content" style="max-width: 420px; padding: 30px 25px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="window.storieAPI.chiudiInfo()"></i>
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 20px;"><i class="fa-solid fa-circle-info"></i> Che tipo di post?</h3>
            <div class="storie-info-item">
                <b><i class="fa-solid fa-lightbulb" style="color:#16a085;"></i> Pensiero</b>
                Per un semplice pensiero che vuoi condividere con i colleghi.
            </div>
            <div class="storie-info-item">
                <b><i class="fa-solid fa-book" style="color:#8e44ad;"></i> Storia</b>
                Per raccontare un episodio successo a lavoro, che poi si potrà unire alle altre storie dei colleghi.
            </div>
            <button class="btn-action" style="width: 100%; border-radius: 12px; padding: 12px; font-size: 15px;" onclick="window.storieAPI.chiudiInfo()">Ho capito</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// ==========================================
// 2. MOTORE LOGICO STORIE
// ==========================================
export function avviaMotoreStorie(db, auth, userDataPrivate) {
    let posts = [];
    let isAdmin = userDataPrivate?.ruolo === "admin";
    let currentUserUid = auth.currentUser.uid;
    let unsubscribeStorie = null;
    let unsubscribeCommenti = null;

    window.storieAPI = {
        chiudiSfondo: function(event, id) {
            if (event.target.id === id) {
                document.getElementById(id).style.display = 'none';
                if (id === 'modal-storie-comments' && unsubscribeCommenti) {
                    unsubscribeCommenti();
                    unsubscribeCommenti = null;
                }
            }
        },
        
        accettaBenvenuto: async function() {
            try {
                await updateDoc(doc(db, "utenti", currentUserUid), { bachecaWelcomeSeen: true });
                document.getElementById('modal-storie-welcome').style.display = 'none';
                userDataPrivate.bachecaWelcomeSeen = true;
            } catch (e) { console.error("Errore salvataggio benvenuto", e); }
        },

        toggleAnonimo: function() {
            const isAnon = document.getElementById('storie-in-anonimo').checked;
            const inputNome = document.getElementById('storie-in-nome');
            if (isAnon) {
                inputNome.value = "";
                inputNome.disabled = true;
            } else {
                inputNome.disabled = false;
            }
        },

        setCategoria: function(cat) {
            document.getElementById('storie-in-categoria').value = cat || "";
            document.getElementById('storie-cat-pensiero').classList.toggle('active', cat === 'pensiero');
            document.getElementById('storie-cat-storia').classList.toggle('active', cat === 'storia');
            const ta = document.getElementById('storie-in-testo');
            if (cat === 'storia') ta.placeholder = "C'era una volta durante il turno...";
            else if (cat === 'pensiero') ta.placeholder = "Cosa vuoi condividere con i colleghi?";
            else ta.placeholder = "Scrivi qui...";
        },

        apriInfo: function() {
            document.getElementById('modal-storie-info').style.display = 'flex';
        },

        chiudiInfo: function() {
            document.getElementById('modal-storie-info').style.display = 'none';
        },

        apriPubblica: function(postToEdit = null) {
            const elTesto = document.getElementById('storie-in-testo');
            const elNome = document.getElementById('storie-in-nome');
            const elAnon = document.getElementById('storie-in-anonimo');
            const btnPensiero = document.getElementById('storie-cat-pensiero');
            const btnStoria = document.getElementById('storie-cat-storia');
            const btnPub = document.getElementById('storie-pub-btn');

            // Reset stato campi
            elTesto.disabled = false;
            elAnon.disabled = false;
            btnPensiero.disabled = false;
            btnStoria.disabled = false;

            if (postToEdit) {
                // L'admin che non e' l'autore puo' cambiare solo la categoria
                const soloCategoria = isAdmin && postToEdit.autoreId !== currentUserUid;

                document.getElementById('storie-pub-title').innerText = soloCategoria ? "Classifica Post" : "Modifica Post";
                btnPub.innerText = "Salva";
                document.getElementById('storie-edit-id').value = postToEdit.id;
                elTesto.value = postToEdit.testo;
                this.setCategoria(postToEdit.categoria === 'storia' || postToEdit.categoria === 'pensiero' ? postToEdit.categoria : "");

                if (postToEdit.isAnonimo) {
                    elAnon.checked = true;
                    elNome.value = "";
                    elNome.disabled = true;
                } else {
                    elAnon.checked = false;
                    elNome.value = postToEdit.nomeVisualizzato;
                    elNome.disabled = false;
                }

                if (soloCategoria) {
                    elTesto.disabled = true;
                    elNome.disabled = true;
                    elAnon.disabled = true;
                }
            } else {
                document.getElementById('storie-pub-title').innerText = "Nuovo Post";
                btnPub.innerText = "Pubblica";
                document.getElementById('storie-edit-id').value = "";
                elTesto.value = "";
                this.setCategoria('pensiero');

                elNome.value = userDataPrivate.storieNomeVisualizzato || "";
                elAnon.checked = false;
                elNome.disabled = false;
            }

            document.getElementById('modal-storie-publish').style.display = 'flex';
        },

        salvaStoria: async function() {
            const isAnon = document.getElementById('storie-in-anonimo').checked;
            let nomeVis = document.getElementById('storie-in-nome').value.trim();
            const testo = document.getElementById('storie-in-testo').value.trim();
            const categoria = document.getElementById('storie-in-categoria').value;
            const idModifica = document.getElementById('storie-edit-id').value;

            if (categoria !== 'storia' && categoria !== 'pensiero') {
                alert("Scegli se il post è un pensiero o una storia.");
                return;
            }

            // Admin su post altrui: aggiorna solo la categoria
            if (idModifica) {
                const postEsistente = posts.find(p => p.id === idModifica);
                if (postEsistente && isAdmin && postEsistente.autoreId !== currentUserUid) {
                    try {
                        await updateDoc(doc(db, "storie", idModifica), { categoria: categoria });
                        document.getElementById('modal-storie-publish').style.display = 'none';
                    } catch (e) {
                        console.error("Errore aggiornamento categoria", e);
                        alert("Errore durante il salvataggio. Controlla le Regole di Sicurezza di Firebase: l'admin deve poter aggiornare il campo categoria.");
                    }
                    return;
                }
            }

            if (!testo) {
                alert("Non puoi pubblicare un post vuoto.");
                return;
            }
            if (!isAnon && !nomeVis) {
                alert("Inserisci un nome visualizzato o scegli di pubblicare in anonimo.");
                return;
            }

            try {
                const datiReali = {
                    nome: userDataPrivate.nome || "",
                    cognome: userDataPrivate.cognome || "",
                    matricola: userDataPrivate.matricola || "",
                    progressivo: userDataPrivate.progressivo || ""
                };

                const postData = {
                    autoreId: currentUserUid,
                    isAnonimo: isAnon,
                    nomeVisualizzato: isAnon ? "Anonimo" : nomeVis,
                    autoreReale: datiReali,
                    categoria: categoria,
                    testo: testo,
                    likes: [], // Array inizializzato per i Mi Piace
                    followers: [], // Array per chi attiva le notifiche su questo post
                    commentiCount: 0, // Contatore commenti
                    timestamp: idModifica ? undefined : serverTimestamp()
                };

                if (idModifica) {
                    await updateDoc(doc(db, "storie", idModifica), {
                        isAnonimo: isAnon,
                        nomeVisualizzato: isAnon ? "Anonimo" : nomeVis,
                        categoria: categoria,
                        testo: testo
                    });
                } else {
                    await addDoc(collection(db, "storie"), postData);
                }

                // Ricorda il nome visualizzato per le pubblicazioni successive
                if (!isAnon && nomeVis && nomeVis !== userDataPrivate.storieNomeVisualizzato) {
                    try {
                        await updateDoc(doc(db, "utenti", currentUserUid), { storieNomeVisualizzato: nomeVis });
                        userDataPrivate.storieNomeVisualizzato = nomeVis;
                    } catch (err) { console.error("Errore salvataggio nome visualizzato", err); }
                }
                
                document.getElementById('modal-storie-publish').style.display = 'none';
            } catch (e) {
                console.error("Errore salvataggio post", e);
                alert("Errore durante il salvataggio.");
            }
        },

        gestisciStoria: async function(id, act) {
            if (act === 'edit') {
                const post = posts.find(p => p.id === id);
                if(post) this.apriPubblica(post);
            } else if (act === 'delete') {
                if(confirm("Sei sicuro di voler eliminare questo post per sempre?")) {
                    try {
                        await deleteDoc(doc(db, "storie", id));
                    } catch (e) { console.error("Errore eliminazione storia", e); }
                }
            }
        },

        // --- SEZIONE SOCIAL: LIKES, NOTIFICHE & COMMENTI ---
        toggleLike: async function(storiaId) {
            const post = posts.find(p => p.id === storiaId);
            if (!post) return;
            
            let likesCorrenti = post.likes || [];
            const hasLiked = likesCorrenti.includes(currentUserUid);
            
            if (hasLiked) {
                likesCorrenti = likesCorrenti.filter(uid => uid !== currentUserUid); // Rimuovi like
            } else {
                likesCorrenti.push(currentUserUid); // Aggiungi like
            }
            
            try {
                await updateDoc(doc(db, "storie", storiaId), { likes: likesCorrenti });
            } catch (e) { console.error("Errore aggiornamento like", e); }
        },
        
        toggleNotifica: async function(storiaId) {
            const post = posts.find(p => p.id === storiaId);
            if (!post) return;
            
            // Crea una copia pulita dell'array per evitare errori di referenza
            let followersCorrenti = Array.isArray(post.followers) ? [...post.followers] : [];
            
            if (followersCorrenti.includes(currentUserUid)) {
                followersCorrenti = followersCorrenti.filter(uid => uid !== currentUserUid); // Rimuovi notifica
            } else {
                followersCorrenti.push(currentUserUid); // Attiva notifica
            }
            
            try {
                await updateDoc(doc(db, "storie", storiaId), { followers: followersCorrenti });
            } catch (e) { 
                console.error("Errore aggiornamento notifiche", e);
                alert("Impossibile attivare la notifica. Il problema sono le Regole di Sicurezza di Firebase che impediscono la modifica dei post altrui.");
            }
        },

        apriCommenti: function(storiaId) {
            document.getElementById('storie-active-comment-id').value = storiaId;
            document.getElementById('modal-storie-comments').style.display = 'flex';
            
            if (unsubscribeCommenti) { unsubscribeCommenti(); }
            
            // Ascolto in tempo reale dei commenti per questa specifica storia
            const q = query(collection(db, "storie", storiaId, "commenti"), orderBy("timestamp", "asc"));
            unsubscribeCommenti = onSnapshot(q, (snapshot) => {
                let commenti = [];
                snapshot.forEach(docSnap => {
                    commenti.push({ id: docSnap.id, ...docSnap.data() });
                });
                this.renderCommenti(commenti, storiaId);
            });
        },

        chiudiCommenti: function() {
            document.getElementById('modal-storie-comments').style.display = 'none';
            if (unsubscribeCommenti) {
                unsubscribeCommenti();
                unsubscribeCommenti = null;
            }
        },

        renderCommenti: function(commenti, storiaId) {
            const container = document.getElementById('storie-comments-list');
            if (commenti.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding: 30px; color: var(--text-muted);"><i class="fa-regular fa-comment-dots" style="font-size: 30px; margin-bottom:10px; display:block;"></i>Nessun commento. Scrivi il primo!</div>';
                return;
            }
            
            let html = '';
            commenti.forEach(c => {
                let dateStr = c.timestamp ? c.timestamp.toDate().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "Ora";
                const isOwner = c.autoreId === currentUserUid;
                
                html += `
                    <div class="comment-box">
                        <div class="comment-header">
                            <span><i class="fa-solid fa-user" style="font-size:10px; margin-right:4px;"></i> ${c.autoreNome}</span>
                            <div style="display:flex; gap: 10px; align-items:center;">
                                <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${dateStr}</span>
                                ${(isOwner || isAdmin) ? `<i class="fa-solid fa-trash" style="cursor:pointer; color: var(--danger);" onclick="window.storieAPI.eliminaCommento('${storiaId}', '${c.id}')" title="Elimina commento"></i>` : ''}
                            </div>
                        </div>
                        <div class="comment-text">${c.testo}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight; // Scroll automatico in basso
        },

        salvaCommento: async function() {
            const storiaId = document.getElementById('storie-active-comment-id').value;
            const input = document.getElementById('storie-in-commento');
            const testo = input.value.trim();
            
            if (!testo || !storiaId) return;
            
            try {
                // Prepara il nome per intero con l'eventuale numero omonimia (progressivo)
                let numOmo = userDataPrivate.progressivo ? ` ${userDataPrivate.progressivo}` : "";
                let nomeAutore = `${userDataPrivate.nome || 'Utente'} ${userDataPrivate.cognome || ''}${numOmo}`.trim();

                // Aggiungi commento
                await addDoc(collection(db, "storie", storiaId, "commenti"), {
                    autoreId: currentUserUid,
                    autoreNome: nomeAutore,
                    testo: testo,
                    timestamp: serverTimestamp()
                });
                
                // Aggiorna contatore e timestamp ultimo commento nella storia padre
                await updateDoc(doc(db, "storie", storiaId), {
                    commentiCount: increment(1),
                    lastCommentTimestamp: serverTimestamp(),
                    lastCommentAuthor: currentUserUid
                });

                input.value = ""; // Pulisci campo
            } catch(e) { console.error("Errore salvataggio commento", e); }
        },

        eliminaCommento: async function(storiaId, commentoId) {
            if(confirm("Vuoi eliminare questo commento?")) {
                try {
                    await deleteDoc(doc(db, "storie", storiaId, "commenti", commentoId));
                    // Decrementa contatore
                    await updateDoc(doc(db, "storie", storiaId), {
                        commentiCount: increment(-1)
                    });
                } catch(e) { console.error("Errore eliminazione commento", e); }
            }
        },
        // ----------------------------------------

        esportaPDF: function() {
            if (typeof html2pdf === 'undefined') {
                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
                script.onload = () => this.generaDocumento();
                document.head.appendChild(script);
            } else {
                this.generaDocumento();
            }
        },

        generaDocumento: function() {
            const storieDaEsportare = posts.filter(p => p.categoria === 'storia');
            if (storieDaEsportare.length === 0) {
                alert("Non ci sono ancora storie da esportare. Nel PDF finiscono solo i post segnati come Storia.");
                return;
            }

            const pdfContainer = document.createElement('div');
            pdfContainer.style.padding = "40px";
            pdfContainer.style.fontFamily = "Georgia, serif";
            pdfContainer.style.color = "#333";

            let htmlPDF = `
                <div style="text-align: center; margin-top: 300px;">
                    <h1 style="font-size: 40px; color: #2c3e50; margin-bottom: 10px;">Storie dal TPL</h1>
                    <h3 style="font-size: 20px; color: #7f8c8d; font-weight: normal;">Raccolta di aneddoti, avventure e disavventure vissute dai lavoratori del Trasporto Pubblico.</h3>
                    <p style="margin-top: 50px; font-size: 14px; color: #95a5a6;">Generato il: ${new Date().toLocaleDateString('it-IT')}</p>
                </div>
                <div class="html2pdf__page-break"></div>
            `;

            const storieOrdinate = [...storieDaEsportare].reverse(); 

            storieOrdinate.forEach((p, index) => {
                let dateStr = p.timestamp ? p.timestamp.toDate().toLocaleDateString('it-IT') : "";
                htmlPDF += `
                    <div style="margin-bottom: 40px; page-break-inside: avoid;">
                        <h4 style="font-size: 18px; color: #2980b9; margin-bottom: 5px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;">
                            Racconto di ${p.nomeVisualizzato}
                        </h4>
                        <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 15px;">${dateStr}</p>
                        <p style="font-size: 15px; line-height: 1.8; text-align: justify; white-space: pre-wrap;">${p.testo}</p>
                    </div>
                `;
            });

            pdfContainer.innerHTML = htmlPDF;

            const opt = {
                margin:       10,
                filename:     'Storie_TPL.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(pdfContainer).save();
        }
    };

    function renderFeed(listaPosts) {
        const feed = document.getElementById('storie-feed');
        if (listaPosts.length === 0) {
            feed.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); font-weight:bold;"><i class="fa-solid fa-book" style="font-size:40px; margin-bottom: 15px; opacity:0.5; display:block;"></i> Nessun post ancora pubblicato.</div>';
            return;
        }

        let html = '';
        listaPosts.forEach(p => {
            const isOwner = p.autoreId === currentUserUid;
            let dateStr = p.timestamp ? p.timestamp.toDate().toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Pubblicata ora";

            let adminBlock = '';
            if (isAdmin && p.autoreReale) {
                let numOmo = p.autoreReale.progressivo ? ` ${p.autoreReale.progressivo}` : "";
                adminBlock = `
                <div class="storie-admin-data" style="display: block;">
                    <i class="fa-solid fa-shield-halved"></i> <b>Admin Info:</b> ${p.autoreReale.nome} ${p.autoreReale.cognome}${numOmo} | Matr: ${p.autoreReale.matricola}
                </div>`;
            }
            
            // Gestione contatori Social
            let likesCorrenti = p.likes || [];
            let hasLiked = likesCorrenti.includes(currentUserUid);
            let likeCount = likesCorrenti.length;
            
            let commentCount = p.commentiCount || 0;
            let followers = p.followers || [];
            let isFollowing = followers.includes(currentUserUid);

            const cat = (p.categoria === 'storia' || p.categoria === 'pensiero') ? p.categoria : 'nessuna';
            const catLabel = { storia: 'Storia', pensiero: 'Pensiero', nessuna: 'Da classificare' }[cat];
            const catIcon = { storia: 'fa-book', pensiero: 'fa-lightbulb', nessuna: 'fa-tag' }[cat];
            const badgeCat = `<span class="storie-badge ${cat}"><i class="fa-solid ${catIcon}"></i> ${catLabel}</span>`;

            html += `
            <div class="storie-post">
                <div class="storie-post-header">
                    <span class="storie-post-author">
                        <i class="fa-solid ${p.isAnonimo ? 'fa-user-secret' : 'fa-user-pen'}" style="margin-right:5px;"></i> ${p.nomeVisualizzato}
                    </span>
                    <span class="storie-post-date" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">${badgeCat}<span>${dateStr}</span></span>
                </div>
                
                ${adminBlock}
                
                <div class="storie-post-body">${p.testo}</div>
                
                <div class="storie-actions-wrapper">
                    <!-- Sezione Social (Sinistra) -->
                    <div class="storie-social-left">
                        <button class="btn-social btn-like ${hasLiked ? 'liked' : ''}" onclick="window.storieAPI.toggleLike('${p.id}')">
                            <i class="${hasLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${likeCount}
                        </button>
                        <button class="btn-social" onclick="window.storieAPI.apriCommenti('${p.id}')" title="Commenti">
                            <i class="fa-regular fa-comment"></i> ${commentCount}
                        </button>
                        <button class="btn-social" style="color: ${isFollowing ? '#f39c12' : 'var(--text-muted)'}" onclick="window.storieAPI.toggleNotifica('${p.id}')" title="Notifiche Commenti">
                            <i class="${isFollowing ? 'fa-solid' : 'fa-regular'} fa-bell"></i>
                        </button>
                    </div>
                    
                    <!-- Sezione Azioni (Destra) -->
                    ${(isOwner || isAdmin) ? `
                    <div class="storie-actions">
                        <button class="btn-storie btn-storie-ed" onclick="window.storieAPI.gestisciStoria('${p.id}', 'edit')" title="${isOwner ? 'Modifica' : 'Classifica'}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-storie btn-storie-del" onclick="window.storieAPI.gestisciStoria('${p.id}', 'delete')" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    ` : ''}
                </div>
            </div>
            `;
        });
        feed.innerHTML = html;
    }

    document.getElementById('modal-storie-main').style.display = 'flex';

    if (!userDataPrivate.bachecaWelcomeSeen) {
        document.getElementById('modal-storie-welcome').style.display = 'flex';
    }

    const q = query(collection(db, "storie"), orderBy("timestamp", "desc"));
    unsubscribeStorie = onSnapshot(q, (snapshot) => {
        posts = [];
        snapshot.forEach((docSnap) => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderFeed(posts);

        // Nuove storie arrivate a modulo aperto: le sta vedendo, quindi risultano già lette
        const modaleAperto = document.getElementById('modal-storie-main')?.style.display === 'flex';
        if (modaleAperto && window.segnaStorieLette && snapshot.docChanges().some(c => c.type === 'added' && !snapshot.metadata.fromCache)) {
            window.segnaStorieLette();
        }
    }, (error) => {
        console.error("Errore fetch storie", error);
        document.getElementById('storie-feed').innerHTML = '<div style="color:var(--danger); text-align:center; padding: 20px; font-weight:bold;">Errore di caricamento. Riprova più tardi.</div>';
    });
}
