// PitStop Garage — SW desabilitado
// Este arquivo existe apenas para destruir SWs antigos
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async (e) => {
  // Limpa TODOS os caches
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  // Desregistra a si mesmo
  await self.registration.unregister();
  // Força reload em todos os clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.navigate(client.url));
});
self.addEventListener('fetch', e => {
  // Sempre busca da rede, nunca do cache
  e.respondWith(fetch(e.request, {cache: 'no-store'}));
});
