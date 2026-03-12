const CACHE_NAME = 'utility-app-v1';

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installato');
    // Forza l'attivazione immediata del service worker
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Attivato');
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Lascia passare tutte le richieste normalmente alla rete
    event.respondWith(fetch(event.request));
});
