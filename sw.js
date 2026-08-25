// Minimalny service worker — app-shell offline + instalowalność (PWA). Bez build-systemu.
// Nazwa cache = WERSJA. Bump przy kazdym deployu, ktory zmienia index.html: handler
// `activate` usuwa wszystkie cache o innej nazwie, wiec bez bumpu stary app-shell
// (w tym stary index.html jako fallback offline) zostaje na telefonie na zawsze.
// v11 (2026-08-07): ukrywanie ofert (status hidden) + zakładka „Ukryte".
// v10 (2026-08-07): czytelność mapy — kolor/kształt/rozmiar pinezek, moja lokalizacja.
// v9 (2026-08-07): pełny ekran mapy + płaskie ikony iOS.
// v8 (2026-08-06): mapa + notatki. Poprzednia nazwa "oferty-v1" trzymala jeszcze
// wersje BEZ stronicowania fetchAllRows, czyli te, ktora pokazywala 1000 z 2300 ofert.
// v12 (2026-08-21): poprawka adresowania ofert po ID w popupach mapy — stary
// kod ukrywal INNA oferte niz klikniena (indeks w O przesuwal sie po odswiezeniu
// danych). Bump nazwy cache jest tu KONIECZNY, nie kosmetyczny: bez niego telefon
// serwuje z cache stara strone i dalej niszczy decyzje przy kazdym kliknieciu.
// v14 (2026-08-25): LEJEK — nowy status „visited" i zakladka „Top" pod Shortlista.
//   Bump obowiazkowy: bez niego telefon serwuje stary index.html z cache i lejka
//   po prostu nie ma, a wyglada to jak niedzialajacy przycisk.
// v13 (2026-08-21): plakietka statusu wrocila na zdjecie (kotwiczyla sie do calej
// karty i zakrywala przycisk 🚫) + przycisk „Otworz ogloszenie" w stopce karty.
const C = "oferty-v14";
const SHELL = [
  "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png",
  "./apple-touch-icon.png",
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
