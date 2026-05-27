// ─── SERVICE WORKER — PitStop Garage ──────────────────────
// ⚠️  REGRA: sempre que mudar o index.html, atualize VERSION
//     para o mesmo valor de APP_VERSION definido no index.
//     Ex: index APP_VERSION = 'v2.0.1' → VERSION = 'v2.0.1'
// ──────────────────────────────────────────────────────────
const VERSION = 'v2.0.1';
const CACHE   = `pitstop-${VERSION}`;

// Só cacheia fontes e libs externas — NUNCA o index.html
const ASSETS = [
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ── INSTALL: ativa imediatamente ────────────────────────────
self.addEventListener('install', event => {
  console.log(`[SW] Instalando ${CACHE}`);
  self.skipWaiting(); // não espera fechar abas
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS).catch(err => console.warn('[SW] Cache parcial:', err))
    )
  );
});

// ── ACTIVATE: apaga todos os caches antigos ─────────────────
self.addEventListener('activate', event => {
  console.log(`[SW] Ativando ${CACHE}`);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log(`[SW] Removendo cache antigo: ${k}`);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim()) // toma controle imediato
  );
});

// ── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Nunca intercepta chamadas externas
  if (url.includes('supabase.co'))    return;
  if (url.includes('googleapis.com')) return;
  if (url.includes('jsdelivr.net'))   return;
  if (url.includes('gstatic.com'))    return;

  // HTML → SEMPRE busca da rede, nunca cacheia
  const isHTML =
    event.request.destination === 'document' ||
    url.endsWith('.html') ||
    url.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html')) // fallback offline
    );
    return;
  }

  // Fontes e libs → cache-first (economiza banda)
  if (url.includes('fonts.') || url.includes('jsdelivr') || url.includes('cdn.')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        }).catch(() => null);
      })
    );
    return;
  }

  // Resto → network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── MESSAGE: força atualização manual ───────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
