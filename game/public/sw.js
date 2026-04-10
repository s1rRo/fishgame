// ============================================================
// SERVICE WORKER — Задача №12 (PWA offline support)
// Кэшируем ассеты, Firebase работает в режиме offline persistence
// ============================================================

const CACHE_NAME = 'river-lord-v2.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase и Google APIs — всегда сеть (не кэшируем)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('google-analytics')
  ) {
    return; // Браузер обрабатывает напрямую
  }

  // Стратегия: Network First для HTML, Cache First для ассетов
  if (event.request.mode === 'navigate') {
    // Network First
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html').then(r => r || new Response('Offline')))
    );
    return;
  }

  // Network First для JS/CSS/Images (свежая версия приоритетна)
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// ── PUSH УВЕДОМЛЕНИЯ (будущая функция) ────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'River Lord', {
    body:    data.body || 'Твои рыбы ждут!',
    icon:    '/assets/images/icon-192.png',
    badge:   '/assets/images/icon-192.png',
  });
});
