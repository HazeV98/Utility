// ==========================================
// 1. INIEZIONE UI GPS
// ==========================================
export function initUIGPS() {
    if (document.getElementById('modal-gps-main')) return;
    
    const uiHTML = `
    <style>
        .gps-card { background: var(--surface); padding: 20px; border-radius: var(--radius-md); margin-bottom: 15px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); text-align: center; }
        .gps-title { font-size: 14px; color: var(--text-muted); margin-bottom: 5px; font-weight: bold; }
        .gps-value { font-size: 48px; font-weight: 900; color: var(--primary); font-variant-numeric: tabular-nums; line-height: 1.1; }
        .gps-unit { font-size: 18px; font-weight: normal; color: var(--text-muted); }
        .gps-coord { font-size: 20px; color: var(--text-main); font-weight: bold; font-family: monospace; }
        
        /* Stili per la Ghiera Rotante Lineare */
        .compass-container { position: relative; width: 100%; height: 60px; background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 5px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
        .compass-tape { position: absolute; top: 0; left: 0; height: 100%; display: flex; align-items: flex-end; transition: transform 0.15s linear; }
        .compass-mark { display: inline-flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 40px; flex-shrink: 0; padding-bottom: 8px; color: var(--text-muted); font-size: 12px; font-weight: bold; border-right: 1px solid rgba(128,128,128,0.2); height: 100%; }
        .compass-mark.major { border-right: 2px solid var(--primary); color: var(--text-main); font-size: 14px; }
        
        /* Linea e freccia centrali fisse */
        .compass-center-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--danger, #dc3545); transform: translateX(-50%); z-index: 10; }
        .compass-center-arrow { position: absolute; left: 50%; top: 0; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid var(--danger, #dc3545); transform: translateX(-50%); z-index: 10; }
    </style>

    <div id="modal-gps-main" class="modal-overlay" style="display:none;" onclick="window.chiudiSuSfondo(event, 'modal-gps-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);" onclick="document.getElementById('modal-gps-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <i class="fa-solid fa-location-crosshairs"></i> Strumenti Navigazione
            </h3>

            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; width: 100%;">
                
                <!-- Ghiera Rotta -->
                <div class="gps-card" style="padding-top: 15px; padding-bottom: 10px;">
                    <div class="gps-title">ROTTA (HEADING)</div>
                    <div class="compass-container">
                        <div class="compass-center-arrow"></div>
                        <div class="compass-center-line"></div>
                        <div id="compass-tape" class="compass-tape"></div>
                    </div>
                    <div style="font-size: 28px; font-weight: 900; color: var(--text-main);"><span id="gps-heading-val">--</span>°</div>
                </div>

                <!-- Tachimetro -->
                <div class="gps-card">
                    <div class="gps-title">VELOCITÀ</div>
                    <div id="gps-speed-val" class="gps-value">0.0 <span class="gps-unit">km/h</span></div>
                    <div id="gps-speed-knots" style="font-size: 16px; color: var(--text-muted); margin-top: 8px; font-weight: bold;">0.0 nodi</div>
                </div>

                <!-- Coordinate -->
                <div class="gps-card">
                    <div class="gps-title">COORDINATE GPS</div>
                    <div style="display:flex; justify-content: space-around; margin-top:15px;">
                        <div>
                            <div style="font-size:12px; color:var(--text-muted); margin-bottom: 4px;">LATITUDINE</div>
                            <div id="gps-lat-val" class="gps-coord">--.-----</div>
                        </div>
                        <div>
                            <div style="font-size:12px; color:var(--text-muted); margin-bottom: 4px;">LONGITUDINE</div>
                            <div id="gps-lon-val" class="gps-coord">--.-----</div>
                        </div>
                    </div>
                </div>
                
                <div id="gps-status" style="font-size: 13px; font-weight: bold; text-align: center; color: var(--text-muted); margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: var(--radius-sm);">
                    <i class="fa-solid fa-spinner fa-spin"></i> In attesa del segnale GPS...
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
    
    // Generazione dinamica della ghiera lineare (Nastro dei gradi)
    const tape = document.getElementById('compass-tape');
    let tapeHTML = '';
    const directions = {0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO'};
    
    // Creiamo 3 cicli completi (0-360) per garantire un'animazione fluida continua senza bordi vuoti
    for (let cycle = -1; cycle <= 1; cycle++) {
        for (let deg = 0; deg < 360; deg += 10) {
            let isMajor = (deg % 90 === 0);
            let label = directions[deg] !== undefined ? directions[deg] : deg;
            tapeHTML += `<div class="compass-mark ${isMajor ? 'major' : ''}">${label}</div>`;
        }
    }
    tape.innerHTML = tapeHTML;
}

// ==========================================
// 2. MOTORE LOGICO GPS
// ==========================================
export function avviaMotoreGPS() {
    let watchId = null;
    
    // Riferimenti DOM
    const tape = document.getElementById('compass-tape');
    const headingVal = document.getElementById('gps-heading-val');
    const speedVal = document.getElementById('gps-speed-val');
    const speedKnots = document.getElementById('gps-speed-knots');
    const latVal = document.getElementById('gps-lat-val');
    const lonVal = document.getElementById('gps-lon-val');
    const statusDiv = document.getElementById('gps-status');

    // Impostazioni Ghiera
    // Ogni cella di 10 gradi è larga 40px (1 grado = 4px)
    const pxPerGrado = 40 / 10; 
    // Il blocco centrale (0-360) inizia dopo un ciclo intero (36 intervalli da 40px)
    const offsetBaseNastro = 36 * 40; 
    
    function aggiornaGhiera(heading) {
        if (heading === null || isNaN(heading)) return;
        
        // Assicuriamoci che la rotta sia sempre compresa tra 0 e 359
        let normalizedHeading = heading % 360;
        if (normalizedHeading < 0) normalizedHeading += 360;

        headingVal.textContent = Math.round(normalizedHeading).toString().padStart(3, '0');
        
        // Calcolo dello scorrimento:
        // Spostiamo il nastro verso sinistra in base all'offset base + i gradi rilevati.
        // Aggiungiamo metà della larghezza del contenitore per far cadere il valore esatto al centro sotto la freccia.
        const larghezzaContenitore = tape.parentElement.clientWidth;
        const targetX = - (offsetBaseNastro + (normalizedHeading * pxPerGrado)) + (larghezzaContenitore / 2);
        
        tape.style.transform = `translateX(${targetX}px)`;
    }

    function elaboraPosizione(position) {
        const coords = position.coords;
        
        statusDiv.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> GPS Attivo - Prec: ${Math.round(coords.accuracy)}m`;
        statusDiv.style.color = "var(--success, #28a745)";
        statusDiv.style.background = "rgba(40, 167, 69, 0.1)";

        // Aggiorna Coordinate
        latVal.textContent = coords.latitude.toFixed(5);
        lonVal.textContent = coords.longitude.toFixed(5);

        // Aggiorna Velocità (L'API restituisce m/s)
        let speedMs = coords.speed;
        if (speedMs !== null && speedMs > 0) {
            let speedKmh = speedMs * 3.6;
            let speedNodi = speedMs * 1.94384;
            speedVal.innerHTML = `${speedKmh.toFixed(1)} <span class="gps-unit">km/h</span>`;
            speedKnots.textContent = `${speedNodi.toFixed(1)} nodi`;
        } else {
            speedVal.innerHTML = `0.0 <span class="gps-unit">km/h</span>`;
            speedKnots.textContent = `0.0 nodi`;
        }

        // Aggiorna Rotta / Heading
        let heading = coords.heading;
        if (heading !== null) {
            aggiornaGhiera(heading);
        }
    }

    function gestisciErrore(error) {
        console.warn('Errore Segnale GPS:', error.message);
        statusDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Segnale debole o negato (${error.message})`;
        statusDiv.style.color = "var(--danger, #dc3545)";
        statusDiv.style.background = "rgba(220, 53, 69, 0.1)";
    }

    // Esponi funzione per aprire la modale
    window.apriModaleGPS = function() {
        document.getElementById('modal-gps-main').style.display = 'flex';
        
        // Forza l'aggiornamento grafico della ghiera per allinearla subito
        let currentHeading = parseFloat(headingVal.textContent);
        if(!isNaN(currentHeading)) {
            setTimeout(() => aggiornaGhiera(currentHeading), 50); 
        }

        // Se non stiamo già tracciando, avviamo il watchPosition
        if (watchId === null && "geolocation" in navigator) {
            statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Acquisizione satelliti...`;
            statusDiv.style.color = "var(--text-main)";
            
            watchId = navigator.geolocation.watchPosition(elaboraPosizione, gestisciErrore, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            });
            
            // Centra dinamicamente quando il dispositivo viene ruotato o la finestra cambia dimensioni
            window.addEventListener('resize', () => {
                let curr = parseFloat(headingVal.textContent);
                if(!isNaN(curr)) aggiornaGhiera(curr);
            });
        } else if (!("geolocation" in navigator)) {
            statusDiv.textContent = "Geolocalizzazione non supportata dal dispositivo.";
        }
    };
}
