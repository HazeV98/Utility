// GESTORE DOWNLOAD INTERNO

document.addEventListener('click', async function(e) {

    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

    const target = e.target.closest('a');



    if (target && target.href && isNative) {

        const url = target.href;



        // Gestisce solo i file specifici

        if (url.match(/\.(apk|pdf|zip|docx|xlsx|jpg|png)$/i)) {

            e.preventDefault();



            try {

                const { Filesystem } = window.Capacitor.Plugins;

                const fileName = url.substring(url.lastIndexOf('/') + 1);



                // 1. Chiedi i permessi

                const perm = await Filesystem.requestPermissions();

                if (perm.publicStorage !== 'granted') {

                    alert("Devi autorizzare l'app a scrivere file per scaricarli.");

                    return;

                }



                alert("Download in corso: " + fileName);



                // 2. Scarica il file

                // Usiamo DOCUMENTS perché è la cartella più facile da trovare sul telefono

                await Filesystem.downloadFile({

                    url: url,

                    path: fileName,

                    directory: 'DOCUMENTS',

                    recursive: true

                });



                alert("✅ File salvato nella cartella 'Documenti' del telefono!");



            } catch (err) {

                console.error("Errore:", err);

                alert("Impossibile scaricare il file. Verifica la connessione.");

            }

        }

    }

}, true);