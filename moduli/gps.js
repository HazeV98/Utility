// ==========================================
// 1. INIEZIONE UI GPS
// ==========================================
export function initUIGPS() {
    if (document.getElementById('modal-gps-main')) return;
    
    const uiHTML = `
    <style>
        .gps-section { text-align: center; margin-bottom: 30px; width: 100%; }
        .gps-title { font-size: 13px; color: var(--text-muted); margin-bottom: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        
        .compass-container { position: relative; width: 100%; height: 75px; overflow: hidden; margin-bottom: 5px; }
        .compass-tape { position: absolute; top: 0; left: 0; height: 100%; display: flex; transition: transform 0.15s linear; }
        
        .compass-mark { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 60px; flex-shrink: 0; }
        .tick { width: 2px; height: 12px; background: var(--border-color); margin-bottom: 6px; border-radius: 2px; }
        .tick.major { height: 24px; background: var(--primary); width: 3px; }
        .tick.medium { height: 18px; background: var(--text-muted); width: 2px; }
        
        .compass-label { color: var(--text-muted); font-size: 14px; font-weight: 600; }
        .compass-label.major { color: var(--text-main); font-size: 18px; font-weight: 900; }
        
        .compass-center-line { position: absolute; left: 50%; top: 0; width: 4px; height: 35px; background: var(--danger, #dc3545); transform: translateX(-50%); z-index: 10; border-radius: 2px; box-shadow: 0 0 4px rgba(0,0,0,0.3); }
        
        .gps-heading-text { font-size: 32px; font-weight: 900; color: var(--text-main); margin-top: -5px; }

        .gps-speed-container { margin: 40px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .gps-speed-row { display: flex; align-items: baseline; justify-content: center; }
        .gps-speed-val { font-size: 110px; font-weight: 900; color: var(--primary); font-variant-numeric: tabular-nums; line-height: 0.9; letter-spacing: -2px; }
        .gps-speed-unit { font-size: 24px; font-weight: bold; color: var(--text-muted); margin-left: 10px; }
        .gps-speed-knots { font-size: 22px; color: var(--text-main); font-weight: 800; margin-top: 10px; }
        
        .gps-coord-box { display: flex; justify-content: space-around; padding-top: 25px; border-top: 1px solid var(--border-color); }
        .gps-coord { font-size: 24px; color: var(--text-main); font-weight: bold; font-family: monospace; letter-spacing: -1px; }
        
        .gps-status-box { font-size: 14px; font-weight: bold; text-align: center; margin-top: 30px; padding: 12px; border-radius: var(--radius-sm); }
    </style>

    <div id="modal-gps-main" class="modal-overlay" style="display:none;" onclick="window.chiudiSuSfondo(event, 'modal-gps-main')">
        <div class="modal-content" style="max-width: 440px; height: 85vh; display: flex; flex-direction: column; padding: 20px; position: relative;">
            <i class="fa-solid fa-xmark" style="position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted); z-index: 20;" onclick="document.getElementById('modal-gps-main').style.display='none'"></i>
            
            <h3 style="margin-top: 0; color: var(--primary); font-weight: 800; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                <i class="fa-solid fa-location-crosshairs"></i> Navigazione
            </h3>

            <div style="flex: 1; overflow-y: auto; overflow-x: hidden; width: 100%; display: flex; flex-direction: column;">
                
                <div class="gps-section">
                    <div class="compass-container">
                        <div class="compass-center-line"></div>
                        <div id="compass-tape" class="compass-tape"></div>
                    </div>
                    <div class="gps-heading-text"><span id="gps-heading-val">--</span>°</div>
                </div>

                <div class="gps-speed-container">
                    <div class="gps-speed-row">
                        <div id="gps-speed-val" class="gps-speed-val">0.0</div>
                        <div class="gps-speed-unit">km/h</div>
                    </div>
                    <div id="gps-speed-knots" class="gps-speed-knots">0.0 nodi</div>
                </div>

                <div class="gps-coord-box">
                    <div style="text-align: center;">
                        <div class="gps-title">LATITUDINE</div>
                        <div id="gps-lat-val" class="gps-coord">--.-----</div>
                    </div>
                    <div style="text-align: center;">
                        <div class="gps-title">LONGITUDINE</div>
                        <div id="gps-lon-val" class="gps-coord">--.-----</div>
                    </div>
                </div>
                
                <div id="gps-status" class="gps-status-box" style="background: rgba(0,0,0,0.05); color: var(--text-muted);">
                    <i class="fa-solid fa-satellite-dish"></i> Modulo GPS pronto
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiHTML);
    
    const tape = document.getElementById('compass-tape');
    let tapeHTML = '';
    const directions = {0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO'};
    
    for (let cycle = -1; cycle <= 1; cycle++) {
        for (let deg = 0; deg < 360; deg += 10) {
            let isMajor = (deg % 90 === 0);
            let isMedium = (deg % 45 === 0 && !isMajor);
            
            let tickClass = 'tick' + (isMajor ? ' major' : (isMedium ? ' medium' : ''));
            let labelClass = 'compass-label' + (isMajor ? ' major' : '');
            let labelText = directions[deg] !== undefined ? directions[deg] : deg;
            
            tapeHTML += `
            <div class="compass-mark">
                <div class="${tickClass}"></div>
                <div class="${labelClass}">${labelText}</div>
            </div>`;
        }
    }
    tape.innerHTML = tapeHTML;
}

// ==========================================
// 2. MOTORE LOGICO GPS
// ==========================================
export function avviaMotoreGPS() {
    let watchId = null;
    
    const tape = document.getElementById('compass-tape');
    const headingVal = document.getElementById('gps-heading-val');
    const speedVal = document.getElementById('gps-speed-val');
    const speedKnots = document.getElementById('gps-speed-knots');
    const latVal = document.getElementById('gps-lat-val');
    const lonVal = document.getElementById('gps-lon-val');
    const statusDiv = document.getElementById('gps-status');

    const widthPerMark = 60; 
    const pxPerDegree = widthPerMark / 10; 
    const baseOffset = 36 * widthPerMark; 
    
    function aggiornaGhiera(heading) {
        if (heading === null || isNaN(heading)) return;
        
        let normalizedHeading = heading % 360;
        if (normalizedHeading < 0) normalizedHeading += 360;

        headingVal.textContent = Math.round(normalizedHeading).toString().padStart(3, '0');
        
        const containerWidth = tape.parentElement.clientWidth;
        const targetX = - (baseOffset + (normalizedHeading * pxPerDegree)) + (containerWidth / 2) - (widthPerMark / 2);
        
        tape.style.transform = `translateX(${targetX}px)`;
    }

    function elaboraPosizione(position) {
        const coords = position.coords;
        
        statusDiv.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Segnale Ricevuto (Prec: ±${Math.round(coords.accuracy)}m)`;
        statusDiv.style.color = "var(--success, #10b981)";
        statusDiv.style.background = "rgba(16, 185, 129, 0.1)";

        latVal.textContent = coords.latitude.toFixed(5);
        lonVal.textContent = coords.longitude.toFixed(5);

        let speedMs = coords.speed || 0;
        let speedKmh = speedMs * 3.6;
        let speedNodi = speedMs * 1.94384;
        
        speedVal.textContent = speedKmh.toFixed(1);
        speedKnots.textContent = `${speedNodi.toFixed(1)} nodi`;

        if (coords.heading !== null) {
            aggiornaGhiera(coords.heading);
        }
    }

    function gestisciErrore(error) {
        console.warn('Errore GPS:', error.message);
        let msg = "Errore GPS sconosciuto.";
        if (error.code === error.PERMISSION_DENIED) msg = "Permesso GPS negato.";
        if (error.code === error.POSITION_UNAVAILABLE) msg = "Posizione non disponibile.";
        if (error.code === error.TIMEOUT) msg = "Timeout richiesta GPS.";
        
        statusDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
        statusDiv.style.color = "var(--danger, #ef4444)";
        statusDiv.style.background = "rgba(239, 68, 68, 0.1)";
    }

    window.apriModaleGPS = function() {
        document.getElementById('modal-gps-main').style.display = 'flex';
        
        let currentHeading = parseFloat(headingVal.textContent);
        if(!isNaN(currentHeading)) setTimeout(() => aggiornaGhiera(currentHeading), 50); 
        
        window.addEventListener('resize', () => {
            let curr = parseFloat(headingVal.textContent);
            if(!isNaN(curr)) aggiornaGhiera(curr);
        });

        if (watchId === null && "geolocation" in navigator) {
            statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> In attesa di segnale GPS...`;
            statusDiv.style.color = "var(--text-main)";
            statusDiv.style.background = "rgba(0,0,0,0.05)";
            
            watchId = navigator.geolocation.watchPosition(
                elaboraPosizione,
                gestisciErrore,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        } else if (!("geolocation" in navigator)) {
            statusDiv.textContent = "Il tuo browser non supporta il GPS.";
        }
    };
}
