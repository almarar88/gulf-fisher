// Offline: app shell + data stale-while-revalidate; map tiles/styles/fonts cached (capped); APIs left to the app (IndexedDB).
const V = "gf-v23";
const SHELL = ["./", "index.html", "styles.css", "app.js", "core.js", "data.js", "config.js", "manifest.json", "data/ocean.json", "data/pois.json", "data/ports.json", "data/navdepth.bin", "data/contours.geojson",
  "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "vendor/mapbox-gl-rtl-text.min.js", "icons/icon.svg", "icons/icon-192.png", "fonts/fonts.css",
  "fonts/plex-ar-arabic-400.woff2", "fonts/plex-ar-arabic-500.woff2", "fonts/plex-ar-arabic-600.woff2", "fonts/plex-ar-arabic-700.woff2", "fonts/plex-ar-latin-400.woff2", "fonts/plex-ar-latin-600.woff2"];
const TILE_HOSTS = ["tiles.openfreemap.org", "tiles.openseamap.org", "t1.openseamap.org", "server.arcgisonline.com", "wms.gebco.net"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== "gf-tiles2").map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
async function trim(c, max) { const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url); if (e.request.method !== "GET") return;
  if (TILE_HOSTS.some((h) => u.hostname === h)) {
    e.respondWith(caches.open("gf-tiles2").then(async (c) => { const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") { c.put(e.request, r.clone()); trim(c, 4000); } return r; }).catch(() => hit || Response.error());
      return hit || net; })); return; }
  if (u.origin === location.origin) e.respondWith(caches.open(V).then(async (c) => { const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net; }));
});
