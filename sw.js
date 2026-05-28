/* =============================================================
   BudżetFlow — Service Worker
   Strategia: Cache First + Network Fallback
   Zmień CACHE_VERSION przy każdym deployu, aby wymusić aktualizację.
   ============================================================= */

const CACHE_VERSION = 'budzetflow-v2';

// Pliki do cache'owania przy instalacji
// UWAGA: ścieżki muszą pasować do GitHub Pages subdir /budzetflow/
const PRECACHE_ASSETS = [
  '/budzetflow/',
  '/budzetflow/index.html',
  '/budzetflow/manifest.json',
];

/* ----------------------------------------------------------
   INSTALL — pobierz i zapisz zasoby
   ---------------------------------------------------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // aktywuj od razu
  );
});

/* ----------------------------------------------------------
   ACTIVATE — usuń stare cache
   ---------------------------------------------------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_VERSION) // stare wersje
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim()) // przejmij otwarte karty
  );
});

/* ----------------------------------------------------------
   FETCH — Cache First, sieć jako fallback
   ---------------------------------------------------------- */
self.addEventListener('fetch', event => {
  // Obsługuj tylko GET i żądania z tego samego origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Nie ma w cache — idź do sieci
      return fetch(event.request)
        .then(response => {
          // Nie cache'uj błędów ani zasobów cross-origin
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Zapisz kopię do cache
          const toCache = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, toCache));

          return response;
        })
        .catch(() => {
          // Offline i brak w cache — zwróć stronę główną
          return caches.match('/budzetflow/index.html');
        });
    })
  );
});
