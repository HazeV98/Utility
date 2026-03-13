# ⛴️ Utility App - Gestione Turni e Risorse

Una Progressive Web App (PWA) non ufficiale sviluppata per semplificare la vita lavorativa: gestione dei turni, calcolo delle statistiche mensili, consultazione rapida di orari, documenti aziendali, rubrica e link utili. 

L'app è progettata per essere leggera, veloce e installabile direttamente sulla schermata home degli smartphone (iOS e Android), funzionando anche offline grazie alla cache locale.

## ✨ Funzionalità Principali

* **📅 Calendario Turni Intelligente:** * Calcolo automatico delle rotazioni (es. Disponibili, F.Nove, Lido, Linea 12, ecc.).
    * Modifica manuale dei singoli giorni o modifiche multiple (es. periodi lunghi di ferie o malattia).
    * Tracciamento di Indennità Nebbia, Straordinari (ore/minuti) e Sospesi Riposo.
    * Esportazione del calendario in PDF o in formato `.ics` (per Google Calendar/Apple Calendar).
    * Sistema di Backup e Ripristino dei dati personali.
* **📊 Statistiche:** Calcolo automatico di giorni di ferie, malattia, riposi, permessi e ore totali di straordinario in un periodo selezionato.
* **📁 Gestione Documenti (API GitHub):** Lettura dinamica di PDF organizzati in cartelle per Turni, Orari e Documenti aziendali.
* **🔗 Link e Contatti:** Rubrica dinamica e lista di link utili (siti web, gruppi Facebook/Telegram) aggiornabili tramite file JSON, con tasto copia rapido.
* **🍔 Calcolatore Buoni Pasto:** Contatore manuale e calcolatore automatico basato sui giorni lavorati e la decurtazione fissa.

## 📱 Installazione (PWA)

L'app non si trova sugli store tradizionali (App Store / Play Store), ma si installa direttamente dal browser.

* **🍏 iPhone/iPad (Solo tramite Safari):** Apri il sito web, tocca l'icona "Condividi" (il quadrato con la freccia verso l'alto) e seleziona **"Aggiungi alla schermata Home"**.
* **🤖 Android (Chrome):** Apri il sito web e tocca il pulsante verde **"Installa"** nell'intestazione, oppure premi i tre puntini del browser e seleziona **"Aggiungi a schermata Home"**.

## 🛠️ Architettura e Manutenzione (Per lo Sviluppatore)

L'applicazione non utilizza un database backend (es. SQL/Firebase), ma si basa sul `localStorage` del dispositivo per i dati utente e sulle **API pubbliche di GitHub** per recuperare dinamicamente i file PDF e i file di configurazione JSON.

### Gestione Cartelle PDF (Turni e Orari)
L'app legge automaticamente le cartelle presenti nella root del repository in base al loro prefisso:
* **Turni:** Le cartelle devono chiamarsi `turni_pdf_[data]` oppure `turni_varianti_[nome]`.
* **Orari:** Le cartelle devono chiamarsi `orari_[data]` oppure `orari_varianti_[nome]`.

*Tip per le varianti:* Inserendo un file `nome.txt` all'interno di una cartella `_varianti_`, l'app utilizzerà il testo contenuto in quel file come etichetta per il pulsante, nascondendo il nome reale della cartella.

### Gestione Dati JSON (Link e Contatti)
Per aggiornare la rubrica e i collegamenti senza toccare il codice HTML, basta modificare i rispettivi file JSON nella root:
* `link.json`: Struttura a lista piatta contenente `nome` e `url`.
* `contatti.json`: Struttura a categorie. Ogni elemento richiede `nome`, `valore` (il numero o l'indirizzo) e `tipo` (`"telefono"` o `"email"`).

### Gestione Turni Base
Il core del calendario si appoggia a due file principali generati a ogni cambio turni generale:
* `info_turni_YYYY-MM-DD.json`: Contiene gli orari di inizio/fine e i luoghi di ogni singola riga di turno.
* `rotazioni_YYYY-MM-DD.json`: Contiene l'array sequenziale (il "nastro") dei turni per ogni specifico gruppo (es. `rot_fnove`, `disp_det`).

## 💻 Tecnologie Utilizzate

* **Frontend:** HTML5, CSS3, Vanilla JavaScript.
* **Librerie Esterne:**
    * [FullCalendar](https://fullcalendar.io/) (Visualizzazione griglia calendario)
    * [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) (Esportazione stampe PDF)
    * [Panzoom](https://github.com/timmywil/panzoom) (Zoom e pan delle immagini dei turni)
* **Analytics:** [GoatCounter](https://www.goatcounter.com/) (Statistiche di visita anonime e privacy-friendly).
* **Hosting:** GitHub Pages.

## ⚠️ Disclaimer
*Questo strumento non è un'applicazione ufficiale dell'azienda. L'ordine dei turni e gli orari possono subire variazioni. Consultare sempre le disposizioni ufficiali aziendali in bacheca o sui portali dedicati. Lo sviluppatore non si assume responsabilità per eventuali discordanze o errori di calcolo.*

