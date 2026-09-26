// sw.js — Service worker. Its job is small and deliberately dull:
//
//   • it makes SnoopyTube installable as a desktop app (a browser will only offer
//     "Install" for a site with a manifest AND a service worker that handles fetch);
//   • it keeps a copy of the shell — HTML, CSS, JS, icons — so an already-installed
//     app still opens when the network is slow or gone.
//
// What it must NOT do:
//   • cache /api/* — Kids mode is decided by api/kids.js on every call, and serving a
//     stale "off" from a cache would be a way around the lock;
//   • cache anything from YouTube or Google — sign-in, the player and thumbnails all
//     have to go straight to the network.
//
// Static files are network-first, so a Vercel deploy is picked up immediately and the
// cache is only a fallback. Bump VERSION when you want old caches thrown away.

const VERSION = "snoopytube-v1";
const SHELL = ["/", "/index.html", "/css/style.css", "/manifest.json",
  "/icons/logo.png", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"];

self.addEventListener("install", e => {
  // addAll fails the whole install if any one file 404s, so each is added on its own.
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const bypass = url => url.pathname.startsWith("/api/") || url.origin !== self.location.origin;

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(bypass(url)) return;                       // let the browser handle it normally

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try{
      const fresh = await fetch(req);
      // Only full 200s are worth keeping; a range or error response is not.
      if(fresh && fresh.status === 200 && fresh.type === "basic") cache.put(req, fresh.clone());
      return fresh;
    }catch(err){
      const hit = await cache.match(req);
      if(hit) return hit;
      // A navigation with nothing cached for that exact URL still gets the shell:
      // /watch/abc is not a file, it's a path the page routes itself (js/urls.js).
      if(req.mode === "navigate"){ const shell = await cache.match("/index.html") || await cache.match("/"); if(shell) return shell; }
      throw err;
    }
  })());
});
