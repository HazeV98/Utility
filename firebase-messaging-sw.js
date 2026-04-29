importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4",
    authDomain: "utility-haze.firebaseapp.com",
    projectId: "utility-haze",
    storageBucket: "utility-haze.appspot.com",
    messagingSenderId: "686237947418",
    appId: "1:686237947418:web:f03ba19ab8fff43110a3a3"
});

// Inizializza il modulo: ricevendo payload con "notification", 
// Firebase mostrerà automaticamente un singolo banner di sistema.
const messaging = firebase.messaging();
