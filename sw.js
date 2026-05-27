// PitStop Garage — Service Worker v3.0.2
const VERSION = 'v3.0.2';
const CACHE = 'pitstop-' + VERSION;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url=e.request.url;
  if(url.includes('index.html')||url.endsWith('/')||e.request.destination==='document'){
    e.respondWith(fetch(e.request,{cache:'no-store'})); return;
  }
  if(url.includes('supabase.co')||url.includes('googleapis')||url.includes('jsdelivr'))return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    if(res&&res.status===200)caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
    return res;
  })));
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});
