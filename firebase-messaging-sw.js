importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// La tua configurazione Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4",
    authDomain: "utility-haze.firebaseapp.com",
    projectId: "utility-haze",
    storageBucket: "utility-haze.firebasestorage.app",
    messagingSenderId: "686237947418",
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gestione delle notifiche quando l'app è in background o chiusa
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Ricevuto messaggio in background:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'icon-512.png' // L'icona che apparirà nella notifica (assicurati che il nome sia corretto)
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

