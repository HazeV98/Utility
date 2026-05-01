// Gestione Download Intelligente (Solo per APK)
document.addEventListener('click', function(e) {
    // 1. Controlliamo se siamo dentro l'APK (Capacitor Nativo)
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    
    // Se NON siamo su APK, non facciamo nulla e usciamo dalla funzione
    if (!isNative) return;

    // 2. Cerchiamo se l'elemento cliccato è un link
    const target = e.target.closest('a');
    
    if (target && target.href) {
        const url = target.href;
        
        // 3. Controlliamo se il link punta a un file
        if (url.match(/\.(apk|pdf|zip|docx|xlsx|jpg|png)$/i)) {
            
            // Blocchiamo il comportamento standard (che nell'APK fallirebbe)
            e.preventDefault(); 
            
            // Usiamo il plugin Browser per scaricare/aprire esternamente
            if (window.Capacitor.Plugins.Browser) {
                window.Capacitor.Plugins.Browser.open({ url: url });
            } else {
                // Fallback di sicurezza
                window.open(url, '_system');
            }
        }
    }
}, true);