const CACHE = "sonate-v21";
const ASSETS = [
  "./","./index.html","./styles.css",
  "./app.js?v=2.1","./config.js?v=2.1",
  "./manifest.webmanifest","./icon-192.png","./icon-512.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if(e.request.method!=="GET") return;
  e.respondWith(
    fetch(e.request,{cache:"no-store"})
      .then(r=>{const clone=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,clone)); return r;})
      .catch(()=>caches.match(e.request))
  );
});
