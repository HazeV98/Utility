self.addEventListener('install', (event) => {
  console.log('Service Worker installato');
});

self.addEventListener('fetch', (event) => {
  // Lasciamo passare le richieste normalmente
  event.respondWith(fetch(event.request));
});
