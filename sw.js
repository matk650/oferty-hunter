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
// v15 (2026-08-26): edytowalna macierz porownawcza Top + komentarze zapisywane
//   append-only w decisions. Bump jest konieczny, bo to przede wszystkim zmiana UI.
// v16 (2026-08-26): kompaktowe wiersze porownania Top; pola rosna automatycznie
//   do wysokosci zapisanej tresci zamiast wymuszac 74-82 px dla kazdej komorki.
// v17 (2026-08-27): interaktywny workspace Top — sticky header, focus, gestosc,
//   szerokosc i kolejnosc kolumn, autosave oraz automatyczne podsumowanie ocen.
// v18 (2026-08-30): reczne rozmiary kolumn i wierszy, dopasowanie calej tabeli
//   do ekranu oraz izolowany wydruk trybu Top w A4/A3.
// v19 (2026-08-30): mobilny tryb mini i szybki widok dwoch ofert obok siebie.
// v20 (2026-08-30): pole „Wymiary" w tabeli Top, uwzgledniane w sredniej ocen.
// v21 (2026-08-30): pole „Naslonecznienie" pod mediami, jako 11. kryterium oceny.
// v22 (2026-08-30): niegrupowane, kompaktowe pinezki oraz przełącznik mapy
// ulicznej i satelitarnej Esri z zapamiętywaniem wybranej warstwy.
// v23 (2026-08-30): usunięcie zbędnego wiersza Link z porównania Top.
// v24 (2026-08-30): jedna wspólna szerokość wszystkich kolumn ofert w Top.
// v13 (2026-08-21): plakietka statusu wrocila na zdjecie (kotwiczyla sie do calej
// karty i zakrywala przycisk 🚫) + przycisk „Otworz ogloszenie" w stopce karty.
const C = "oferty-v24";
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
