// Offline: app shell cache-first, map tiles stale-while-revalidate (capped), API responses network-first.
const V = "gf-v8"; const SHELL = ["./", "index.html", "styles.css", "app.js", "data.js", "config.js", "manifest.json", "data/depth.json", "vendor/leaflet.js", "vendor/leaflet.css", "vendor/leaflet-heat.js", "icons/icon.svg", "icons/icon-192.png", "fonts/fonts.css", "fonts/plex-ar-arabic-400.woff2", "fonts/plex-ar-arabic-600.woff2", "fonts/plex-ar-latin-400.woff2"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== "gf-tiles").map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
async function trim(c, max) { const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url); if (e.request.method !== "GET") return;
  if (u.hostname.includes("supabase.co") || u.hostname.includes("open-meteo.com")) return; // app stores these in IndexedDB itself
  if (u.hostname.includes("tile.openstreetmap.org") || u.hostname.includes("wms.gebco.net")) {
    e.respondWith(caches.open("gf-tiles").then(async (c) => { const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") { c.put(e.request, r.clone()); trim(c, 3000); } return r; }).catch(() => hit);
      return hit || net; })); return; }
  if (u.origin === location.origin) e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((h) => h || fetch(e.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(V).then((c) => c.put(e.request, cl)); } return r; })));
});
