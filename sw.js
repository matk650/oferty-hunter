// Minimalny service worker — app-shell offline + instalowalność (PWA). Bez build-systemu.
const C = "oferty-v1";
const SHELL = [
  "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);

  // Supabase REST/Realtime — nigdy nie cache'uj (zawsze świeże dane / websocket)
  if (u.hostname.endsWith("supabase.co")) return;

  // Nawigacja (sam dokument) — network-first, offline fallback do cache (świeży deploy gdy online)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(resp => {
        const cc = resp.clone();
        caches.open(C).then(c => c.put("./index.html", cc));
        return resp;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Zasoby z naszego origin (manifest, ikony) — cache-first
  if (u.origin === location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }

  // CDN (supabase-js) i zdjęcia — sieć, fallback do cache jeśli jest
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
