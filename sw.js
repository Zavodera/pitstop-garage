// ─── SERVICE WORKER — PitStop Garage ─────────────────────
const VERSION = 'v1.0.1';
const CACHE   = `pitstop-${VERSION}`;

// Apenas cacheia o essencial — NÃO cacheia o index.html
const ASSETS = [
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  console.log(`[SW] Instalando ${CACHE}`);
  // Ativa imediatamente sem esperar tab fechar
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Alguns assets não foram cacheados:', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  console.log(`[SW] Ativando ${CACHE}`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log(`[SW] Removendo cache antigo: ${k}`);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Toma controle imediato de todas as abas
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Nunca intercepta chamadas ao Supabase
  if (url.includes('supabase.co')) return;
  if (url.includes('googleapis.com')) return;
  if (url.includes('jsdelivr.net')) return;
  if (url.includes('gstatic.com')) return;

  // HTML (index.html / raiz): SEMPRE network-first, sem fallback para cache antigo
  const isHTML = event.request.destination === 'document'
    || url.endsWith('.html')
    || url.endsWith('/')
    || url.split('?')[0].split('#')[0].split('/').pop() === '';

  if (isHTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          // Nunca armazena HTML no cache
          return response;
        })
        .catch(() => {
          // Só usa cache se estiver OFFLINE de verdade
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Fonts e libs externas: cache-first (economiza banda)
  if (url.includes('fonts.') || url.includes('jsdelivr') || url.includes('cdn.')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => null);
      })
    );
    return;
  }

  // Demais recursos: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
