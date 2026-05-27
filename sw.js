// ─── SERVICE WORKER — PitStop Garage ─────────────────────
const VERSION = 'v1.0.0';
const CACHE   = `pitstop-${VERSION}`;

const ASSETS = [
  './index.html',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  console.log(`[SW] Instalando ${CACHE}`);
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Alguns assets não foram cacheados:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log(`[SW] Removendo cache antigo: ${k}`);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('googleapis.com')) return;
  if (event.request.url.includes('jsdelivr.net')) return;
  if (event.request.url.includes('cdn.')) return;

  const isHTML = event.request.destination === 'document'
    || event.request.url.endsWith('.html')
    || event.request.url.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => null);
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
