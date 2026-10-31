import { SB_URL, SB_ANON, FN, OWNER, idb, session, saveSess, login, token, rest, enc, dec, unlock, loadLocal, saveRec, delRec, sync, KEY, setKey, RECS, clearRecs, hooks,
  sunTimes, solunar, moon, moonAlt, haversine, units, U } from "./core.js";
import { SPECIES, RULES, LICENCE, MPA, SRC } from "./data.js";

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n, d = 1) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(d));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const haptic = (p = 8) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); };
const hm = (d) => (d instanceof Date ? d : new Date(d)).toLocaleTimeString("ar-AE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dubai" });
const hmLtr = (d) => (d instanceof Date ? d : new Date(d)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
const dayName = (d) => new Date(d).toLocaleDateString("ar-AE", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Dubai" });
const spName = (id, other) => id === "other" ? (other || "أخرى") : (SPECIES.find((s) => s.id === id)?.ar ?? id);
const dm = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; return `${d}°${m.toFixed(3)}′${v >= 0 ? pos : neg}`; };
const prefs = () => ({ dmin: 5, dmax: 40, wave: 1.0, wind: 25, speed: 18, lph: 30, reserve: 20, ...JSON.parse(localStorage.getItem("gf_prefs") || "{}") });
const setPrefs = (o) => localStorage.setItem("gf_prefs", JSON.stringify({ ...prefs(), ...o }));

/* SF-Symbols-like line icons (drawn for this app) */
const P = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  boat: '<path d="M3 15h18l-2.5 4.5h-13z"/><path d="M12 3v12M12 4l6 9h-6"/>',
  fish: '<path d="M3 12c3-4.5 7.5-6 11-5 2.5.7 4.5 2.8 6 5-1.5 2.2-3.5 4.3-6 5-3.5 1-8-.5-11-5z"/><path d="M3 12 1 9v6zM16.5 10.8v.1"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5M3 17l9 5 9-5"/>',
  location: '<path d="M20 4 4 11l7 2 2 7z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>',
  wave: '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M7 10c0-3 2-6 6-6-1.5 1.5-2 3-1 5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 10h8"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  sparkles: '<path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  chev: '<path d="m15 6-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  sos: '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17v.1"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M19 19v2H6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  sunrise: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 3v6M9 6l3-3 3 3M4 12l1.5 1M20 12l-1.5 1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.1"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  play: '<path d="M7 4v16l13-8z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  sat: '<path d="m13 7 4 4-6 6-4-4z"/><path d="m5 15 4 4M15 5l4 4M3 21l3-3M17.5 3.5l3 3"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l3 3v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
P.bird = '<path d="M2 10c3-2.5 6.5-2.5 10 1.5 3.5-4 7-4 10-1.5"/><path d="M7 16c1.6-1.2 3.3-1.2 5 .6 1.7-1.8 3.4-1.8 5-.6"/>';
P.front = '<path d="M3 9c3-3 6 3 9 0s6-3 9 0"/><path d="M3 15c3-3 6 3 9 0s6-3 9 0" opacity=".45"/>';
const ALIAS = { loc: "location", tide: "wave", cal: "clock", wifi: "info", rec: "play" };
const I = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || P[ALIAS[n]] || ""}</svg>`;
const paintIcons = (r = document) => $$("[data-i]", r).forEach((el) => { if (!el._i) { el.insertAdjacentHTML("afterbegin", I(el.dataset.i)); el._i = 1; } });
const ic = (n, bg) => `<span class="ic" style="background:${bg}">${I(n)}</span>`;

/* ================= theme & dynamic sky ================= */
const theme = () => localStorage.getItem("gf_theme") || "auto";
function applyTheme() {
  const t = theme(), dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const prev = document.documentElement.dataset.theme; document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (prev && prev !== document.documentElement.dataset.theme && map) setMapStyle(); paintSky();
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
let SKY = { phase: "day", rough: false };
function paintSky() {
  const dark = document.documentElement.dataset.theme === "dark", { phase, rough } = SKY;
  const g = rough ? (dark ? ["#2a3340", "#0c1016"] : ["#9aa9b8", "#dfe6ec"]) :
    phase === "night" ? (dark ? ["#0b1430", "#020409"] : ["#3c4f86", "#c9d4ee"]) :
    phase === "dawn" ? (dark ? ["#3b2d5c", "#0f0d1d"] : ["#ffb38a", "#ffe9d6"]) :
    phase === "dusk" ? (dark ? ["#5a2b4f", "#120914"] : ["#ff9f80", "#ffe0d0"]) :
    (dark ? ["#0e3a63", "#03080f"] : ["#7cc4ff", "#eaf5ff"]);
  const r = document.documentElement.style; r.setProperty("--sky1", g[0]); r.setProperty("--sky2", g[1]);
}
function updateSky(at, wx) {
  const now = new Date(), s = sunTimes(now, at.lat, at.lon), h = 3600e3;
  SKY.phase = now < s.dawn || now > s.dusk ? "night" : now < +s.sunrise + h ? "dawn" : now > s.sunset - h ? "dusk" : "day";
  const c = wx && curRow(wx); SKY.rough = !!c && ((c.wave ?? 0) > prefs().wave || (c.wind ?? 0) > prefs().wind);
  paintSky();
}

/* ================= bottom sheet (drag handle, spring) ================= */
let sheetOnClose = null;
function openSheet(html, { onClose, keep } = {}) {
  const s = $("#sheet"), b = $("#sheetBody"); b.innerHTML = `<button class="sheet-x" id="shX" aria-label="إغلاق">${I("x")}</button>` + html; b.scrollTop = 0;
  paintIcons(b); s.classList.add("show"); s.classList.toggle("peek", !!keep); $("#scrim").classList.toggle("show", !keep); $("#shX").onclick = closeSheet; sheetOnClose = onClose || null; haptic(6); return b;
}
function closeSheet() { $("#sheet").classList.remove("show"); $("#scrim").classList.remove("show"); $("#sheet").style.transform = ""; const f = sheetOnClose; sheetOnClose = null; f && f(); }
$("#scrim").onclick = closeSheet;
(() => { const g = $("#sheet .grab"), s = $("#sheet"); let y0 = null, dy = 0;
  g.addEventListener("pointerdown", (e) => { y0 = e.clientY; dy = 0; s.classList.add("drag"); g.setPointerCapture(e.pointerId); });
  g.addEventListener("pointermove", (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); s.style.transform = `translateY(${dy}px)`; });
  const end = () => { if (y0 == null) return; s.classList.remove("drag"); s.style.transform = ""; if (dy > 110) closeSheet(); y0 = null; };
  g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end); })();

/* ================= vault (passphrase → AES-GCM key, on device) ================= */
function needKey(fn) { if (KEY) return fn(); vaultSheet(fn); }
function vaultSheet(after) {
  if ($("#sheet").classList.contains("show") && $("#vp")) return;
  const m = openSheet(`<div style="text-align:center;padding-top:8px"><span class="ic" style="background:var(--indigo);width:56px;height:56px;border-radius:16px;display:inline-grid;place-items:center;color:#fff">${I("lock")}</span>
    <h2>خزنة نقاطك</h2><p class="fine" style="font-size:14px">نقاطك وصيداتك ومساراتك تتشفّر على جهازك (AES-GCM 256) قبل ما ترتفع. السيرفر ما يشوف إلا نص مشفّر.</p></div>
    <label class="f">عبارة المرور<input id="vp" type="password" autocomplete="off" placeholder="6 أحرف على الأقل"></label>
    <div class="note warn">${I("warn")}<div>إذا نسيت العبارة ما في أي طريقة تسترجع بياناتك. احفظها بمكان آمن.</div></div>
    <p class="err" id="vErr"></p><button class="btn primary block" id="vOk">فتح الخزنة</button><button class="btn block" id="vNo" style="margin-top:8px;background:none;color:var(--blue)">لاحقاً</button>`);
  $("#vNo", m).onclick = closeSheet;
  const go = async () => { $("#vErr", m).textContent = ""; const b = $("#vOk", m); b.disabled = true; b.textContent = "جاري…";
    try { if ($("#vp", m).value.length < 6) throw new Error("6 أحرف على الأقل"); const r = await unlock($("#vp", m).value);
      closeSheet(); haptic([10, 40, 10]); toast(r === "created" ? "انشأت الخزنة" : "انفتحت الخزنة"); await loadLocal(); sync(); drawRecs(); recomputeHot(); rerender(); lockIcon(); after && after(); }
    catch (e) { setKey(null); $("#vErr", m).textContent = e.message; haptic([20, 30, 20]); } b.disabled = false; b.textContent = "فتح الخزنة"; };
  $("#vOk", m).onclick = go; $("#vp", m).onkeydown = (e) => { if (e.key === "Enter") go(); }; setTimeout(() => $("#vp", m)?.focus(), 350);
}
const lockIcon = () => { const b = $("#lockBtn"); if (!b) return; b.innerHTML = I(KEY ? "unlock" : "lock"); b.classList.toggle("on", !!KEY); };

/* ================= ocean data & hotspot model ================= */
let OCEAN = null, POIS = [], HOT = null, WX = null, AT = null, here = null;
const cellOf = (lat, lon) => { if (!OCEAN) return null; const i = Math.round((lat - OCEAN.lat0) / OCEAN.step), j = Math.round((lon - OCEAN.lon0) / OCEAN.step);
  return i < 0 || j < 0 || i >= OCEAN.rows || j >= OCEAN.cols ? null : [i, j]; };
const depthAt = (lat, lon) => { const c = cellOf(lat, lon); if (!c) return null; const d = OCEAN.depth[c[0]][c[1]]; return d < 0 ? null : d; };
const HW = { front: 0.3, chl: 0.2, slope: 0.2, structure: 0.1, depth: 0.1, log: 0.1 };
function recomputeHot() {
  if (!OCEAN) return; const { rows, cols, step, lat0, lon0 } = OCEAN, P0 = prefs();
  const score = new Float32Array(rows * cols).fill(-1), comp = {};
  const structs = POIS.filter((p) => p.k !== "island"), catches = RECS.filter((r) => r.kind === "catch" && r.lat != null);
  const wsum = HW.front + HW.chl + HW.slope + HW.depth + (structs.length ? HW.structure : 0) + HW.log;
  for (let i = 0; i < rows; i++) { const lat = lat0 + i * step, kx = 111 * Math.cos(lat * Math.PI / 180);
    for (let j = 0; j < cols; j++) { const d = OCEAN.depth[i][j]; if (d < 0) continue; const lon = lon0 + j * step;
      const f = OCEAN.parts.sst_front[i][j] / 100, c = OCEAN.parts.chl_edge[i][j] / 100, s = OCEAN.parts.slope[i][j] / 100;
      const band = d >= P0.dmin && d <= P0.dmax ? 1 : Math.max(0, 1 - Math.min(Math.abs(d - P0.dmin), Math.abs(d - P0.dmax)) / 10);
      let st = 0; if (structs.length) { let best = 1e9; for (const p of structs) { const dy = (p.lat - lat) * 111; if (Math.abs(dy) > 12) continue; const dx = (p.lon - lon) * kx; const k = dx * dx + dy * dy; if (k < best) best = k; } st = Math.exp(-best / (2 * 3 * 3)); }
      let lg = 0; for (const r of catches) { const dy = (r.lat - lat) * 111, dx = (r.lon - lon) * kx; lg += Math.exp(-(dx * dx + dy * dy) / (2 * 8 * 8)); } lg = Math.min(1, lg);
      score[i * cols + j] = (HW.front * f + HW.chl * c + HW.slope * s + HW.depth * band + (structs.length ? HW.structure * st : 0) + HW.log * lg) / wsum;
    } }
  v5Adjust(score);
  const sea = [...score].filter((x) => x >= 0).sort((a, b) => a - b);
  HOT = { score, p50: sea[Math.floor(sea.length * 0.6)], p98: sea[Math.floor(sea.length * 0.985)], structs: structs.length, catches: catches.length };
  if (map?.isStyleLoaded()) drawHot();
}
const RAMP = [[0, [41, 182, 246]], [0.35, [102, 255, 166]], [0.6, [255, 225, 77]], [0.8, [255, 122, 61]], [1, [255, 46, 99]]];
const ramp = (t) => { for (let k = 1; k < RAMP.length; k++) if (t <= RAMP[k][0]) { const [a, ca] = RAMP[k - 1], [b, cb] = RAMP[k], u = (t - a) / (b - a); return ca.map((v, n) => Math.round(v + (cb[n] - v) * u)); } return RAMP.at(-1)[1]; };
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
let MASK = null;
const isLand = (lat, lon) => { const M = OCEAN.mask; if (!M) return false; if (!MASK) MASK = Uint8Array.from(atob(M.bits), (c) => c.charCodeAt(0));
  const i = Math.round((lat - M.lat0) / M.dlat), j = Math.round((lon - M.lon0) / M.dlon); if (i < 0 || j < 0 || i >= M.rows || j >= M.cols) return true; const k = i * M.cols + j; return (MASK[k >> 3] >> (7 - (k & 7))) & 1; };
function sampleScore(lat, lon) { // bilinear over valid sea cells
  const { rows, cols, step, lat0, lon0 } = OCEAN, fi = (lat - lat0) / step, fj = (lon - lon0) / step, i0 = Math.floor(fi), j0 = Math.floor(fj), u = fi - i0, w = fj - j0;
  let sum = 0, wt = 0; for (const [di, dj, k] of [[0, 0, (1 - u) * (1 - w)], [1, 0, u * (1 - w)], [0, 1, (1 - u) * w], [1, 1, u * w]]) { const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= rows || j >= cols) continue; const v = HOT.score[i * cols + j]; if (v < 0) continue; sum += v * k; wt += k; }
  return wt > 0.05 ? sum / wt : -1; }
function hotImage() {
  const { rows, cols, step, lat0, lon0 } = OCEAN, latT = lat0 + (rows - 1) * step + step / 2, latB = lat0 - step / 2, lonL = lon0 - step / 2, lonR = lon0 + (cols - 0.5) * step;
  const M = OCEAN.mask, W = M ? M.cols : cols * 3, yT = mercY(latT), yB = mercY(latB), H = Math.round(W * (yT - yB) / ((lonR - lonL) * Math.PI / 180));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) { const my = yT - ((py + 0.5) / H) * (yT - yB), lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) * 180 / Math.PI;
    for (let px = 0; px < W; px++) { const lon = lonL + ((px + 0.5) / W) * (lonR - lonL); if (isLand(lat, lon)) continue; const s = sampleScore(lat, lon); if (s < 0) continue;
      const t = (s - HOT.p50) / (HOT.p98 - HOT.p50); if (t <= 0) continue; const c = ramp(clamp(t)), o = (py * W + px) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = Math.round(255 * (0.15 + 0.6 * clamp(t))); } }
  ctx.putImageData(img, 0, 0); return { url: cv.toDataURL("image/png"), coords: [[lonL, latT], [lonR, latT], [lonR, latB], [lonL, latB]] };
}
function explain(lat, lon) {
  const c = cellOf(lat, lon); if (!c || !HOT || isLand(lat, lon)) return null; const [i, j] = c, k = i * OCEAN.cols + j, s = HOT.score[k]; if (s < 0) return null;
  const P0 = prefs(), d = OCEAN.depth[i][j], kx = 111 * Math.cos(lat * Math.PI / 180);
  let near = null; for (const p of POIS) { if (p.k === "island") continue; const km = Math.hypot((p.lat - lat) * 111, (p.lon - lon) * kx); if (!near || km < near.km) near = { ...p, km }; }
  const nc = RECS.filter((r) => r.kind === "catch" && r.lat != null && haversine(r, { lat, lon }) < 10).length;
  const pct = Math.round(100 * clamp((s - HOT.p50) / (HOT.p98 - HOT.p50)));
  return { s, pct, d, sst: OCEAN.sst[i][j] / 10, grad: OCEAN.sst_grad?.[i][j] >= 0 ? OCEAN.sst_grad[i][j] / 1000 : null, chl: OCEAN.chl[i][j] >= 0 ? OCEAN.chl[i][j] / 100 : null, slope: OCEAN.depth_slope?.[i][j],
    parts: { front: OCEAN.parts.sst_front[i][j] / 100, chl: OCEAN.parts.chl_edge[i][j] / 100, slope: OCEAN.parts.slope[i][j] / 100, depth: d >= P0.dmin && d <= P0.dmax ? 1 : 0 }, near, nc };
}
async function loadPois() {
  try { const j = await fetch("data/pois.json").then((r) => r.json()); if (j.pois?.length) { POIS = j.pois; return; } } catch {}
  const c = await idb.get("pois"); if (c && Date.now() - c.t < 7 * 864e5) { POIS = c.pois; return; }
  if (!navigator.onLine) { POIS = c?.pois || []; return; }
  const bb = "22.4,51,26.8,57", q = `[out:json][timeout:90];(node["natural"="reef"](${bb});way["natural"="reef"](${bb});node["historic"="wreck"](${bb});node["seamark:type"="wreck"](${bb});node["natural"="shoal"](${bb});way["natural"="shoal"](${bb});node["place"~"^(island|islet)$"](${bb});way["place"~"^(island|islet)$"](${bb}););out center tags;`;
  try { const j = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) }).then((r) => { if (!r.ok) throw 0; return r.json(); });
    POIS = j.elements.map((e) => { const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
      return { k: t.historic === "wreck" || t["seamark:type"] === "wreck" ? "wreck" : t.natural === "reef" ? "reef" : t.natural === "shoal" ? "shoal" : "island", lat, lon, n: t["name:ar"] || t.name || t["name:en"] || "" }; }).filter((p) => p.lat != null);
    await idb.set("pois", { t: Date.now(), pois: POIS }); } catch { POIS = c?.pois || []; }
}

/* ================= map (MapLibre + OpenFreeMap vector + nautical overlays) ================= */
let map = null, markers = [], LAYERS = JSON.parse(localStorage.getItem("gf_layers") || "null") || { hot: true, seamark: true, contours: true, gebco: false, sat: false, pois: true, recs: true };
const saveLayers = () => localStorage.setItem("gf_layers", JSON.stringify(LAYERS));
const styleUrl = () => `https://tiles.openfreemap.org/styles/${document.documentElement.dataset.theme === "dark" ? "dark" : "liberty"}`;
function initMap() {
  try { maplibregl.setRTLTextPlugin(new URL("vendor/mapbox-gl-rtl-text.min.js", location.href).href, false); } catch {}
  map = new maplibregl.Map({ container: "map", style: styleUrl(), center: [54.6, 24.9], zoom: 6.6, minZoom: 5, maxZoom: 17, attributionControl: false, dragRotate: false, pitchWithRotate: false, cooperativeGestures: false });
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank">© OSM</a> · <a href="https://openseamap.org" target="_blank">OpenSeaMap</a> · GEBCO · SRTM15+ · NASA MUR · NOAA' }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl({ unit: units().dist === "nm" ? "nautical" : "metric", maxWidth: 110 }), "bottom-left");
  map.touchZoomRotate.disableRotation();
  map.on("style.load", () => { addOverlays(); navLayers(); if (NAV.on) { drawNav(NAV.R, NAV.last, NAV.i); map.getLayer("hot") && map.setLayoutProperty("hot", "visibility", "none"); } else if (PLAN?.R?.pts) drawNav(PLAN.R); });
  map.on("click", onMapClick); bindLongPress(); $("#goBtn").onclick = searchSheet;
  const co = (ll) => { const d = depthAt(ll.lat, ll.lng); $("#coord").textContent = `${dm(ll.lat, "N", "S")}  ${dm(ll.lng, "E", "W")}${d != null ? "  ·  ~" + U.depth(d) : ""}`; };
  map.on("mousemove", (e) => co(e.lngLat)); map.on("move", () => co(map.getCenter())); co(map.getCenter());
  $("#layersBtn").onclick = layersSheet; $("#birdBtn").onclick = birdSheet; $("#locBtn").onclick = () => locate(true);
}
function setMapStyle() { map.setStyle(styleUrl(), { diff: false }); }
function firstSymbol() { return map.getStyle().layers.find((l) => l.type === "symbol")?.id; }
function addOverlays() { if (map.getSource("route")) return;
  // Arabic labels where OSM has name:ar
  for (const l of map.getStyle().layers) if (l.type === "symbol" && map.getLayoutProperty(l.id, "text-field")) { try { map.setLayoutProperty(l.id, "text-field", ["coalesce", ["get", "name:ar"], ["get", "name"]]); } catch {} }
  if (document.documentElement.dataset.theme === "dark") for (const l of map.getStyle().layers) if (l["source-layer"] === "water" && l.type === "fill") { try { map.setPaintProperty(l.id, "fill-color", "#0a2135"); } catch {} }
  const below = firstSymbol();
  map.addSource("sat", { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" });
  map.addLayer({ id: "sat", type: "raster", source: "sat", layout: { visibility: "none" } }, below);
  map.addSource("gebco", { type: "raster", tiles: ["https://wms.gebco.net/mapserv?service=WMS&version=1.3.0&request=GetMap&layers=GEBCO_LATEST&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/png&transparent=true"], tileSize: 256, attribution: "GEBCO Compilation Group (2025) GEBCO Grid" });
  map.addLayer({ id: "gebco", type: "raster", source: "gebco", paint: { "raster-opacity": 0.6 }, layout: { visibility: "none" } }, below);
  map.addSource("contours", { type: "geojson", data: "data/contours.geojson" });
  map.addLayer({ id: "contours", type: "line", source: "contours", paint: { "line-color": ["interpolate", ["linear"], ["get", "d"], 5, "#7fd3ff", 20, "#3aa0e8", 50, "#1f6fbf", 200, "#123f7a"], "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 10, 1.1, 13, 1.6], "line-opacity": 0.75 } }, below);
  map.addLayer({ id: "contour-lbl", type: "symbol", source: "contours", minzoom: 8.5, layout: { "symbol-placement": "line", "text-field": ["concat", ["to-string", ["get", "d"]], " م"], "text-size": 11, "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#3aa0e8", "text-halo-color": "rgba(0,0,0,.55)", "text-halo-width": 1.2 } });
  map.addSource("hot", { type: "image", url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", coordinates: [[51, 26.8], [57, 26.8], [57, 22.4], [51, 22.4]] });
  map.addLayer({ id: "hot", type: "raster", source: "hot", paint: { "raster-opacity": 0.85, "raster-resampling": "linear", "raster-fade-duration": 300 } }, below);
  map.addSource("seamark", { type: "raster", tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"], tileSize: 256, minzoom: 6, maxzoom: 18, attribution: "© OpenSeaMap contributors" });
  map.addLayer({ id: "seamark", type: "raster", source: "seamark", minzoom: 8 });
  map.addSource("pois", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "pois", type: "circle", source: "pois", minzoom: 7, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 12, 6], "circle-color": ["match", ["get", "k"], "wreck", "#ff9f0a", "reef", "#ff375f", "shoal", "#bf5af2", "#30d158"], "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
  map.addLayer({ id: "pois-lbl", type: "symbol", source: "pois", minzoom: 9, layout: { "text-field": ["get", "label"], "text-size": 11, "text-offset": [0, 1.1], "text-font": ["Noto Sans Regular"], "text-optional": true }, paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,.7)", "text-halo-width": 1.2 } });
  for (const id of ["route", "track"]) { map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] } }); }
  map.addSource("anchor", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "anchor", type: "fill", source: "anchor", paint: { "fill-color": "#ff9f0a", "fill-opacity": 0.15 } });
  map.addLayer({ id: "anchor-l", type: "line", source: "anchor", paint: { "line-color": "#ff9f0a", "line-width": 2, "line-dasharray": [2, 2] } });
  map.addLayer({ id: "track", type: "line", source: "track", paint: { "line-color": "#ff375f", "line-width": 3.5 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "route", type: "line", source: "route", filter: ["==", "$type", "LineString"], paint: { "line-color": "#0a84ff", "line-width": 4, "line-dasharray": [1.5, 1] }, layout: { "line-cap": "round" } });
  map.addLayer({ id: "route-pt", type: "circle", source: "route", filter: ["==", "$type", "Point"], paint: { "circle-radius": 7, "circle-color": "#fff", "circle-stroke-color": "#0a84ff", "circle-stroke-width": 3 } });
  v5Overlays(below); applyLayers(); drawHot(); drawPois(); drawRoute(); drawTrack();
}
function applyLayers() { if (!map?.getLayer("hot")) return; const v = (id, on) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  v("hot", LAYERS.hot); v("seamark", LAYERS.seamark); v("contours", LAYERS.contours); v("contour-lbl", LAYERS.contours); v("gebco", LAYERS.gebco); v("sat", LAYERS.sat); v("pois", LAYERS.pois); v("pois-lbl", LAYERS.pois); v("fronts", LAYERS.fronts !== false); v("fronts-case", LAYERS.fronts !== false); v("fronts-old", LAYERS.fronts !== false && LAYERS.frontsOld !== false); v("birds", LAYERS.recs); v("birds-lbl", LAYERS.recs);
  markers.forEach((m) => (m.getElement().style.display = LAYERS.recs ? "" : "none")); $("#legend").classList.toggle("hidden", !LAYERS.hot); }
function drawHot() { if (!HOT || !map?.getSource("hot")) return; const { url, coords } = hotImage(); map.getSource("hot").updateImage({ url, coordinates: coords });
  $("#legend").innerHTML = `<b>البقع المرجّحة (تقدير)</b><div class="ramp"></div><div class="ends"><span>أقل</span><span>أعلى</span></div><div style="color:var(--fg2);margin-top:3px">حرارة السطح ${esc((OCEAN.sst_time || "").slice(0, 10))} · كلوروفيل ${esc((OCEAN.chl_time || "").slice(0, 10))}</div>`; }
const POI_AR = { wreck: "حطام", reef: "شعاب", shoal: "ضحضاح", island: "جزيرة" };
function drawPois() { if (!map?.getSource("pois")) return; map.getSource("pois").setData({ type: "FeatureCollection", features: POIS.map((p) => ({ type: "Feature", properties: { k: p.k, label: p.n || POI_AR[p.k] }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })) }); }
function drawRecs() { markers.forEach((m) => m.remove()); markers = []; if (!map) return;
  for (const r of RECS) { if (r.lat == null || (r.kind !== "spot" && r.kind !== "catch")) continue; const el = document.createElement("div"); el.className = "pin " + r.kind; el.innerHTML = `<span>${I(r.kind === "spot" ? "star" : "fish")}</span>`; el.querySelector("svg").style.cssText = "width:15px;height:15px";
    el.onclick = (e) => { e.stopPropagation(); haptic(); recSheet(r); }; markers.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([r.lon, r.lat]).addTo(map)); }
  applyLayers(); }
function layersSheet() {
  const rows = [["hot", "البقع المرجّحة", "تقدير من حرارة السطح والكلوروفيل والقاع", "sparkles", "#ff375f"], ["seamark", "علامات بحرية OpenSeaMap", "فنارات وعوامات وحطام (من زوم 8)", "anchor", "#0a84ff"],
    ["contours", "خطوط الأعماق", "من SRTM15+ (‏5–200 م)", "wave", "#64d2ff"], ["gebco", "تظليل الأعماق GEBCO", "شبكة GEBCO الأحدث 15 ثانية قوسية", "drop", "#5e5ce6"],
    ["sat", "صور الأقمار الصناعية", "Esri World Imagery", "sat", "#30d158"], ["pois", "شعاب وحطام وجزر", `من OpenStreetMap (${POIS.length})`, "pin", "#ff9f0a"], ["recs", "نقاطي وصيداتي والطيور", "مشفّرة", "star", "#ffd60a"], ["fronts", "خطوط الماء", "جبهات حرارة/كلوروفيل/عكارة من الأقمار", "front", "#ff453a"], ["frontsOld", "خطوط الأيام السابقة", "متقطّعة وباهتة لمقارنة الحركة", "clock", "#8e8e93"]];
  const m = openSheet(`<h2>طبقات الخريطة</h2>${rows.map(([k, t, s, i, c]) => `<div class="layer-row"><div style="display:flex;gap:12px;align-items:center">${ic(i, c)}<div class="m"><b>${t}</b><small>${s}</small></div></div><input type="checkbox" class="switch" data-k="${k}" ${LAYERS[k] ?? (k.startsWith("fronts") ? true : false) ? "checked" : ""}></div>`).join("")}
    <p class="fine">المصادر: الخريطة OpenFreeMap/OpenStreetMap، العلامات OpenSeaMap، الأعماق GEBCO وSRTM15+. EMODnet ما يغطي الخليج فما استخدمناه. ليست خريطة ملاحية.</p>`);
  $$(".switch", m).forEach((s) => s.onchange = () => { LAYERS[s.dataset.k] = s.checked; saveLayers(); applyLayers(); haptic(5); });
}
function locate(center) {
  if (!navigator.geolocation) { toast("الموقع غير متاح"); return Promise.resolve(null); }
  return new Promise((res) => navigator.geolocation.getCurrentPosition((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
    if (center && map) { map.flyTo({ center: [here.lon, here.lat], zoom: 11, speed: 1.4 }); }
    if (map) { if (!locate._m) { const el = document.createElement("div"); el.className = "me"; locate._m = new maplibregl.Marker({ element: el }); } locate._m.setLngLat([here.lon, here.lat]).addTo(map); } res(here); },
    () => { if (center) toast("ما قدرنا نحدد موقعك"); res(null); }, { enableHighAccuracy: true, timeout: 10000 }));
}

/* ================= map interactions ================= */
let ROUTE = { on: false, pts: [] };
function onMapClick(e) {
  if (NAV.on || Date.now() - LP < 800) return; const { lat, lng: lon } = e.lngLat;
  if (ROUTE.on) { ROUTE.pts.push({ lat, lon }); haptic(6); drawRoute(); routeSheet(); return; }
  const bb = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], fr = map.queryRenderedFeatures(bb, { layers: ["fronts", "fronts-old"].filter((l) => map.getLayer(l)) })[0];
  if (fr) return frontSheet(fr.properties, lat, lon);
  const f = map.queryRenderedFeatures(e.point, { layers: ["pois"].filter((l) => map.getLayer(l)) })[0];
  pointSheet(lat, lon, f?.properties);
}
const bar = (v, c = "var(--blue)") => `<div class="bar"><i style="width:${Math.round(clamp(v) * 100)}%;background:${c}"></i></div>`;
function pointSheet(lat, lon, poi) {
  const x = explain(lat, lon), d = depthAt(lat, lon), P0 = prefs();
  const lvl = x ? (x.pct >= 75 ? ["عالية", "bad"] : x.pct >= 40 ? ["متوسطة", "warn"] : ["منخفضة", "info"]) : null;
  const m = openSheet(`<h2>${poi ? esc(poi.label) : "نقطة على الخريطة"}</h2><div class="meta">${dm(lat, "N", "S")} · ${dm(lon, "E", "W")}</div>
    <div class="grid g2"><div class="tile"><span class="lbl">${I("drop")}العمق التقريبي</span><span class="big">${d == null ? "يابسة" : U.depth(d)}</span><span class="small">SRTM15+ · شبكة 0.02°</span></div>
    <div class="tile"><span class="lbl">${I("sparkles")}الترجيح</span><span class="big">${x ? x.pct : "—"}<small style="font-size:15px">/100</small></span><span class="small">${lvl ? `<span class="badge ${lvl[1]}">${lvl[0]}</span>` : "خارج البحر"}</span></div></div>
    ${x ? `<h3 class="section-h" style="margin:16px 0 4px">ليش هالدرجة؟</h3><div class="why">
      <div class="w"><span>جبهة حرارية (${HW.front * 100}٪)</span><b>${x.grad != null ? fmt(x.grad, 3) + "°/كم" : "—"}</b>${bar(x.parts.front, "#ff7a3d")}<small>حرارة السطح ${fmt(x.sst)}° · كل ما زاد فرق الحرارة بين المياه المتجاورة زادت الدرجة</small></div>
      <div class="w"><span>حافة الكلوروفيل (${HW.chl * 100}٪)</span><b>${x.chl != null ? fmt(x.chl, 2) + " ملغ/م³" : "—"}</b>${bar(x.parts.chl, "#30d158")}<small>تغيّر سريع في تركيز العوالق النباتية (حافة مياه خضراء/زرقاء)</small></div>
      <div class="w"><span>انحدار القاع (${HW.slope * 100}٪)</span><b>${x.slope != null && x.slope >= 0 ? x.slope + " م/كم" : "—"}</b>${bar(x.parts.slope, "#64d2ff")}<small>حواف وتغيّرات عمق مفاجئة</small></div>
      <div class="w"><span>عمقك المفضّل (${HW.depth * 100}٪)</span><b>${P0.dmin}–${P0.dmax} م</b>${bar(x.parts.depth, "#5e5ce6")}<small>تقدر تغيّره من الإعدادات</small></div>
      <div class="w"><span>شعاب وحطام (${HW.structure * 100}٪)</span><b>${x.near ? U.dist(x.near.km) : "—"}</b><small>${HOT.structs ? (x.near ? `أقرب ${POI_AR[x.near.k]}${x.near.n ? ": " + esc(x.near.n) : ""} (OpenStreetMap)` : "") : "ما توفرت بيانات الشعاب/الحطام من OpenStreetMap، فما دخلت بالحساب"}</small></div>
      <div class="w"><span>قرب صيداتك (${HW.log * 100}٪)</span><b>${x.nc} خلال 10 كم</b><small>من سجلّك المشفّر</small></div></div>
      <div class="note info">${I("info")}<div>تقدير حسابي من بيانات أقمار صناعية حقيقية (MUR SST ‏${esc((OCEAN.sst_time || "").slice(0, 10))}، كلوروفيل ${esc((OCEAN.chl_time || "").slice(0, 10))}) وأعماق SRTM15+. ما يضمن وجود سمك، وليس للملاحة.</div></div>` : ""}
    <div class="actions"><button class="btn primary sm" id="pNav">${I("navi")}وجّهني</button><button class="btn sm" id="pSave">${I("star")}احفظ نقطة</button><button class="btn tinted sm" id="pCatch">${I("fish")}سجّل صيدة</button><button class="btn sm" id="pWx">${I("sun")}طقس النقطة</button><button class="btn sm" id="pRoute">${I("route")}مسار لهنا</button></div>`);
  $("#pSave", m).onclick = () => spotSheet({ lat, lon }); $("#pCatch", m).onclick = () => catchSheet({ lat, lon });
  $("#pWx", m).onclick = () => { AT = { lat, lon, name: "نقطة على الخريطة" }; WX = null; closeSheet(); show("today"); };
  $("#pNav", m).onclick = () => planNav({ lat, lon, n: poi?.label || `نقطة ${lat.toFixed(3)}, ${lon.toFixed(3)}`, k: poi?.k || "pin" });
  $("#pRoute", m).onclick = () => { closeSheet(); startRoute(here ? [{ lat: here.lat, lon: here.lon }, { lat, lon }] : [{ lat, lon }]); };
}
function recSheet(r) {
  const m = openSheet(`<h2>${r.kind === "spot" ? esc(r.name || "نقطة خاصة") : esc(spName(r.species, r.other))}</h2><div class="meta">${dm(r.lat, "N", "S")} · ${dm(r.lon, "E", "W")} · ${new Date(r.t).toLocaleString("ar-AE")}</div>
    ${r.photo ? `<img class="photo" src="${r.photo}">` : ""}${r.notes ? `<p>${esc(r.notes)}</p>` : ""}
    ${r.kind === "catch" ? `<div class="list">${[["الطول", r.length ? r.length + " سم" : "—"], ["الوزن", r.weight ? r.weight + " كجم" : "—"], ["الطُعم", r.bait || "—"], ["العمق", r.depth != null ? U.depth(r.depth) : "—"], ["القمر", r.moon != null ? moon(new Date(r.t)).name : "—"], ["المد", r.tide || "—"]].map(([a, b]) => `<div class="row"><div class="m">${a}</div><span class="val">${esc(b)}</span></div>`).join("")}</div>` : ""}
    <p><span class="badge ok">${I("lock")}مشفّرة على جهازك</span></p>
    <div class="actions"><button class="btn primary sm" id="rNav">${I("navi")}وجّهني</button><button class="btn sm" id="rWx">${I("sun")}الطقس</button>${r.kind === "catch" ? `<button class="btn tinted sm" id="rCard">${I("share")}بطاقة صيدة</button>` : `<button class="btn sm" id="rRoute">${I("route")}مسار</button>`}<button class="btn sm" id="rShare">${I("share")}الإحداثيات</button><button class="btn danger sm" id="rDel">${I("trash")}حذف</button></div>`);
  $("#rWx", m).onclick = () => { AT = { lat: r.lat, lon: r.lon, name: r.name || spName(r.species) }; WX = null; closeSheet(); show("today"); };
  $("#rCard", m) && ($("#rCard", m).onclick = () => shareCard(r));
  $("#rNav", m).onclick = () => planNav({ lat: r.lat, lon: r.lon, n: r.name || spName(r.species, r.other), k: r.kind });
  $("#rRoute", m) && ($("#rRoute", m).onclick = () => { closeSheet(); startRoute(here ? [{ lat: here.lat, lon: here.lon }, { lat: r.lat, lon: r.lon }] : [{ lat: r.lat, lon: r.lon }]); });
  $("#rShare", m).onclick = () => { if (confirm("بتشارك الإحداثيات الدقيقة لهالنقطة. متأكد؟")) open(`https://wa.me/?text=${encodeURIComponent(`${r.name || "نقطة"}: https://maps.google.com/?q=${r.lat},${r.lon}`)}`, "_blank"); };
  $("#rDel", m).onclick = async () => { if (confirm("حذف نهائي؟")) { await delRec(r.id); closeSheet(); drawRecs(); toast("انحذفت"); rerender(); } };
}
function spotSheet({ lat, lon }) { needKey(() => {
  const m = openSheet(`<h2>نقطة خاصة</h2><div class="meta">${dm(lat, "N", "S")} · ${dm(lon, "E", "W")}</div>
    <label class="f">الاسم<input id="sn" placeholder="مثلاً: حافة الشعاب الشمالية"></label><label class="f">ملاحظات<textarea id="sx" rows="3"></textarea></label>
    <button class="btn primary block" id="sOk">${I("lock")}حفظ مشفّر</button>`);
  $("#sOk", m).onclick = async () => { await saveRec("spot", { name: $("#sn", m).value || "نقطة خاصة", notes: $("#sx", m).value, lat, lon, t: Date.now() }); haptic([8, 30, 8]); closeSheet(); drawRecs(); toast("انحفظت النقطة مشفّرة" + (navigator.onLine ? "" : " · بتتزامن لما يرجع النت")); };
}); }
async function resizePhoto(file) { const img = await createImageBitmap(file); const s = Math.min(1, 1200 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.8); }
function ruleAlerts(species, when = new Date()) { const mo = when.getMonth() + 1, y = when.getFullYear();
  return RULES.filter((r) => r.status === "verified" && r.species.includes(species) && r.months.includes(mo) && !(r.notIn || []).includes(y)); }
function catchSheet({ lat, lon, photo: ph0, guess }) { needKey(() => {
  let photo = ph0 || null;
  const m = openSheet(`<h2>صيدة جديدة</h2><div class="meta">${lat != null ? dm(lat, "N", "S") + " · " + dm(lon, "E", "W") : "بدون موقع"}</div>
    <label class="btn tinted block" style="cursor:pointer">${I("camera")}صورة السمكة<input id="cp" type="file" accept="image/*" capture="environment" hidden></label>
    <img id="cpv" class="photo hidden"><button class="btn sm hidden" id="cAI" style="margin-top:6px">${I("sparkles")}تعرّف عليها بالذكاء الاصطناعي</button><div id="cAIo"></div>
    <label class="f">النوع<select id="cs">${SPECIES.map((s) => `<option value="${s.id}">${s.ar}</option>`).join("")}</select></label>
    <label class="f hidden" id="coL">اسم النوع<input id="co"></label><div id="cAl"></div>
    <div class="grid g2"><label class="f">الطول (سم)<input id="cl" type="number" inputmode="decimal"></label><label class="f">الوزن (كجم)<input id="cw" type="number" inputmode="decimal"></label>
    <label class="f">الطُعم<input id="cb"></label><label class="f">العمق (م)<input id="cd" type="number" inputmode="decimal" value="${lat != null && depthAt(lat, lon) != null ? depthAt(lat, lon) : ""}"></label></div>
    <div class="layer-row"><span>رجّعتها البحر</span><input id="crel" type="checkbox" class="switch"></div>
    <label class="f">ملاحظات<textarea id="cx" rows="2"></textarea></label><button class="btn primary block" id="cOk">${I("lock")}حفظ مشفّر</button>`);
  const upd = () => { const sp = $("#cs", m).value; $("#coL", m).classList.toggle("hidden", sp !== "other");
    $("#cAl", m).innerHTML = ruleAlerts(sp).map((r) => `<div class="note bad">${I("ban")}<div>${esc(r.text)} <a href="${r.src[0]}" target="_blank">المصدر</a></div></div>`).join("") +
      RULES.filter((r) => r.status === "confirm" && r.species.includes(sp)).map((r) => `<div class="note warn">${I("warn")}<div>يحتاج تأكيد: ${esc(r.text)}</div></div>`).join(""); paintIcons(m); };
  $("#cs", m).onchange = upd; upd();
  const applyGuess = (d) => { $("#cAIo", m).innerHTML = fishCard(d); paintIcons(m); if (d.species && (d.confidence || 0) >= 0.5) { const s = SPECIES.find((x) => x.ar === d.species || x.ar.startsWith(d.species) || d.species.startsWith(x.ar)); if (s) { $("#cs", m).value = s.id; upd(); } } };
  if (photo) { $("#cpv", m).src = photo; $("#cpv", m).classList.remove("hidden"); $("#cAI", m).classList.remove("hidden"); } if (guess) applyGuess(guess);
  $("#cp", m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; photo = await resizePhoto(f); $("#cpv", m).src = photo; $("#cpv", m).classList.remove("hidden"); $("#cAI", m).classList.remove("hidden"); };
  $("#cAI", m).onclick = async () => { if (!navigator.onLine) return toast("التعرّف يحتاج اتصال"); const b = $("#cAI", m); b.disabled = true; b.lastChild.textContent = "جاري التحليل…";
    try { const d = (await ai({ action: "fishid", image: photo })).data || {}; applyGuess(d); }
    catch (e) { $("#cAIo", m).innerHTML = `<div class="note warn">${I("warn")}<div>تعذّر التعرّف: ${esc(AIERR(e))}</div></div>`; } b.disabled = false; b.lastChild.textContent = "تعرّف عليها بالذكاء الاصطناعي"; };
  $("#cOk", m).onclick = async () => { const n = (id) => { const v = parseFloat($(id, m).value); return isNaN(v) ? null : v; };
    const cond = condAt(new Date()); const ex = lat != null ? explain(lat, lon) : null;
    await saveRec("catch", { species: $("#cs", m).value, other: $("#co", m).value, length: n("#cl"), weight: n("#cw"), bait: $("#cb", m).value, depth: n("#cd"), released: $("#crel", m).checked, notes: $("#cx", m).value, photo, lat, lon, t: Date.now(),
      ...condRec(lat, lon) });
    haptic([8, 30, 8]); closeSheet(); drawRecs(); afterLearn(); toast("انحفظت الصيدة مشفّرة"); rerender(); };
}); }
async function ai(body) { const t = await token(); const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + t, apikey: SB_ANON }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "خطأ " + r.status); return j; }

/* ================= weather, tide, pressure (Open-Meteo) ================= */
const defAt = () => AT || (here ? { ...here, name: "موقعي" } : { lat: 25.25, lon: 55.15, name: "قبالة دبي" });
async function loadWx(at) {
  const k = `wx:${at.lat.toFixed(2)},${at.lon.toFixed(2)}`, cached = await idb.get(k);
  if (cached && Date.now() - cached.t < 30 * 60e3) return cached;
  if (navigator.onLine) { try {
    const [w, mr] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${at.lat}&longitude=${at.lon}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,cloud_cover,weather_code&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=Asia%2FDubai&past_days=1&forecast_days=3`).then((r) => r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${at.lat}&longitude=${at.lon}&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl,ocean_current_velocity,ocean_current_direction&timezone=Asia%2FDubai&past_days=1&forecast_days=3&cell_selection=sea`).then((r) => r.json())]);
    if (!w.hourly || !mr.hourly) throw 0;
    const mi = new Map(mr.hourly.time.map((t, i) => [t, i]));
    const rows = w.hourly.time.map((t, i) => { const j = mi.get(t), M = mr.hourly; return { t, temp: w.hourly.temperature_2m[i], wind: w.hourly.wind_speed_10m[i], gust: w.hourly.wind_gusts_10m[i], dir: w.hourly.wind_direction_10m[i], p: w.hourly.pressure_msl[i], cloud: w.hourly.cloud_cover[i], code: w.hourly.weather_code[i],
      wave: j != null ? M.wave_height[j] : null, wdir: j != null ? M.wave_direction[j] : null, per: j != null ? M.wave_period[j] : null, sst: j != null ? M.sea_surface_temperature[j] : null, lv: j != null ? M.sea_level_height_msl?.[j] : null, cur: j != null ? M.ocean_current_velocity?.[j] : null, cdir: j != null ? M.ocean_current_direction?.[j] : null }; });
    const d = { t: Date.now(), at, rows, daily: w.daily }; await idb.set(k, d); return d; } catch {} }
  return cached || null;
}
const nowKey = () => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" })); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`; };
const curIdx = (wx) => Math.max(0, wx.rows.findIndex((r) => r.t === nowKey()));
const curRow = (wx) => wx.rows[curIdx(wx)];
function tideStage(rows, i) { const a = rows[i - 1]?.lv, b = rows[i + 1]?.lv; if (a == null || b == null) return null; const r = (b - a) / 2; return Math.abs(r) < 0.03 ? "ركود" : r > 0 ? "مد طالع" : "جزر نازل"; }
function condAt(date) { if (!WX) return null; const i = curIdx(WX), r = WX.rows[i], p3 = WX.rows[i - 3]?.p; return { ...r, pressure: r.p, ptrend: p3 != null ? +(r.p - p3).toFixed(1) : null, tideStage: tideStage(WX.rows, i) }; }
function tideExtrema(rows) { const out = []; for (let i = 1; i < rows.length - 1; i++) { const a = rows[i - 1].lv, b = rows[i].lv, c = rows[i + 1].lv; if (a == null || b == null || c == null) continue; if (b > a && b >= c) out.push({ t: rows[i].t, v: b, hi: true }); if (b < a && b <= c) out.push({ t: rows[i].t, v: b, hi: false }); } return out; }
const dubai = (s) => new Date(s + ":00+04:00");

/* ================= fishing score (transparent heuristic) ================= */
function hourScores(wx, at, dayStr) {
  const P0 = prefs(), rows = wx.rows, idx = rows.map((r, i) => i).filter((i) => rows[i].t.startsWith(dayStr)); if (!idx.length) return [];
  const sol = solunar(dubai(dayStr + "T12"), at.lat, at.lon), sun = sunTimes(dubai(dayStr + "T12"), at.lat, at.lon);
  const rate = (i) => rows[i - 1]?.lv != null && rows[i + 1]?.lv != null ? Math.abs(rows[i + 1].lv - rows[i - 1].lv) / 2 : null;
  const maxRate = Math.max(0.01, ...idx.map(rate).filter((x) => x != null));
  return idx.map((i) => { const r = rows[i], t = dubai(r.t), tm = +t + 30 * 60e3;
    const windS = r.wind == null ? 0.5 : clamp(1 - (r.wind - 0.5 * P0.wind) / (0.8 * P0.wind)), waveS = r.wave == null ? 0.5 : clamp(1 - (r.wave - 0.5 * P0.wave) / (0.8 * P0.wave));
    const d3 = rows[i - 3]?.p != null ? r.p - rows[i - 3].p : 0, pS = clamp(1 - Math.max(0, Math.abs(d3) - 1) / 3);
    const rt = rate(i), tS = rt == null ? 0.5 : clamp(rt / maxRate);
    const inMaj = sol.some((s) => s.major && tm >= s.start && tm <= s.end), inMin = sol.some((s) => !s.major && tm >= s.start && tm <= s.end), mo = moon(t);
    const lunar = 0.7 * (inMaj ? 1 : inMin ? 0.75 : 0.35) + 0.3 * (0.5 + 0.5 * Math.abs(Math.cos((2 * Math.PI * mo.age) / 29.53)));
    const light = Math.abs(tm - sun.sunrise) < 5400e3 || Math.abs(tm - sun.sunset) < 5400e3 ? 1 : tm > sun.sunrise && tm < sun.sunset ? 0.6 : 0.35;
    let s = 100 * (0.22 * windS + 0.18 * waveS + 0.15 * pS + 0.15 * tS + 0.18 * lunar + 0.12 * light); const unsafe = windS === 0 || waveS === 0 || (r.gust ?? 0) > P0.wind * 1.6; if (unsafe) s = Math.min(s, 20);
    return { t: r.t, i, s: Math.round(s), unsafe, f: { wind: windS, wave: waveS, pressure: pS, tide: tS, lunar, light }, d3, inMaj, inMin }; });
}
const scoreColor = (s, unsafe) => unsafe ? "var(--red)" : s >= 70 ? "var(--green)" : s >= 50 ? "var(--yellow)" : s >= 35 ? "var(--orange)" : "var(--red)";
const scoreWord = (s, unsafe) => unsafe ? "مو آمن حسب حدودك" : s >= 75 ? "ممتاز" : s >= 60 ? "جيد" : s >= 45 ? "متوسط" : "ضعيف";
function gauge(s, unsafe) { const R = 62, C = 2 * Math.PI * R, arc = 0.75 * C, off = arc * (1 - s / 100);
  return `<div class="gauge"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${R}" stroke="var(--fill)" stroke-width="12" fill="none" stroke-dasharray="${arc} ${C}" stroke-linecap="round"/>
    <circle cx="75" cy="75" r="${R}" stroke="url(#gg)" stroke-width="12" fill="none" stroke-dasharray="${arc} ${C}" stroke-dashoffset="${arc}" data-off="${off}" stroke-linecap="round"/>
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff453a"/><stop offset=".5" stop-color="#ffd60a"/><stop offset="1" stop-color="#30d158"/></linearGradient></defs></svg>
    <div class="num"><div><b>${s}</b><span>${scoreWord(s, unsafe)}</span></div></div></div>`; }
const spark = (vals, w = 300, h = 60, color = "var(--blue)", fill = true) => { const v = vals.filter((x) => x != null); if (v.length < 2) return ""; const mn = Math.min(...v), mx = Math.max(...v), rg = mx - mn || 1;
  const pts = vals.map((x, i) => x == null ? null : [(i / (vals.length - 1)) * w, h - 4 - ((x - mn) / rg) * (h - 8)]).filter(Boolean);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="direction:ltr">${fill ? `<path d="${d} L${w} ${h} L0 ${h}Z" fill="${color}" opacity=".15"/>` : ""}<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/></svg>`; };
const compass = (deg, label) => `<svg class="compass" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="none" stroke="var(--fill)" stroke-width="4"/>
  ${["ش", "ق", "ج", "غ"].map((t, k) => `<text x="${32 + 22 * Math.sin(k * Math.PI / 2)}" y="${32 - 22 * Math.cos(k * Math.PI / 2) + 4}" font-size="9" text-anchor="middle" fill="var(--fg2)">${t}</text>`).join("")}
  <g transform="rotate(${(deg ?? 0) + 180} 32 32)"><path d="M32 10 L37 30 L32 27 L27 30Z" fill="var(--blue)"/></g><text x="32" y="36" font-size="10" font-weight="700" text-anchor="middle" fill="var(--fg)">${label}</text></svg>`;
const DIRS = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
const dirName = (d) => d == null ? "—" : DIRS[Math.round(d / 45) % 8];
const WCODE = (c) => c == null ? "" : c === 0 ? "صحو" : c <= 2 ? "غائم جزئياً" : c === 3 ? "غائم" : c <= 48 ? "ضباب" : c <= 67 ? "مطر" : c <= 82 ? "زخات" : c >= 95 ? "عواصف رعدية" : "متقلب";

/* ================= Today ================= */
async function renderToday() {
  const v = $("#v-today"), at = defAt();
  if (!WX || WX.at.lat !== at.lat || WX.at.lon !== at.lon) { v.innerHTML = `<div class="hero"><div class="place">${I("loc")}${esc(at.name)}</div><div class="cond" style="margin-top:40px">جاري تحميل الطقس…</div></div>`; WX = await loadWx(at); }
  const spots = RECS.filter((r) => r.kind === "spot");
  const pick = `<div class="chips" style="justify-content:center;margin:6px 0 4px">${[{ name: "موقعي", lat: here?.lat, lon: here?.lon, me: 1 }, { name: "قبالة دبي", lat: 25.25, lon: 55.15 }, { name: "قبالة أبوظبي", lat: 24.55, lon: 54.25 }, ...spots.slice(0, 6).map((s) => ({ name: s.name || "نقطة", lat: s.lat, lon: s.lon }))].map((p, k) => `<button class="chip ${p.name === at.name ? "on" : ""}" data-k="${k}" data-lat="${p.lat ?? ""}" data-lon="${p.lon ?? ""}" data-n="${esc(p.name)}">${esc(p.name)}</button>`).join("")}</div>`;
  if (!WX) { v.innerHTML = `<div class="hero"><div class="place">${I("loc")}${esc(at.name)}</div></div>${pick}<div class="note warn">${I("wifi")}<div>ما في بيانات طقس محفوظة لهالموقع وأنت غير متصل.</div></div>`; bindPick(v); paintIcons(v); return; }
  const rows = WX.rows, ci = curIdx(WX), r = rows[ci], today = r.t.slice(0, 10), now = new Date();
  const hs = hourScores(WX, at, today), cur = hs.find((h) => h.t === r.t) || hs[0];
  const sun = sunTimes(now, at.lat, at.lon), sol = solunar(now, at.lat, at.lon), mo = moon(now), P0 = prefs();
  const d3 = rows[ci - 3]?.p != null ? r.p - rows[ci - 3].p : null, d24 = rows[ci - 24]?.p != null ? r.p - rows[ci - 24].p : null;
  const ptxt = d3 == null ? "—" : Math.abs(d3) <= 1 ? "مستقر" : d3 < -3 ? "ينخفض بسرعة" : d3 < 0 ? "ينخفض ببطء" : d3 > 3 ? "يرتفع بسرعة" : "يرتفع ببطء";
  const ext = tideExtrema(rows.slice(ci, ci + 30)).slice(0, 4), ts = tideStage(rows, ci);
  updateSky(at, WX);
  const thr = Math.max(55, Math.max(...hs.map((h) => h.unsafe ? 0 : h.s)) - 8), best = []; for (let k = 0; k < hs.length;) { if (hs[k].s >= thr && !hs[k].unsafe) { let e = k; while (e + 1 < hs.length && hs[e + 1].s >= thr && !hs[e + 1].unsafe) e++; best.push([hs[k], hs[e]]); k = e + 1; } else k++; }
  const bestTxt = best.length ? best.sort((a, b) => Math.max(...hs.slice(hs.indexOf(b[0]), hs.indexOf(b[1]) + 1).map((x) => x.s)) - Math.max(...hs.slice(hs.indexOf(a[0]), hs.indexOf(a[1]) + 1).map((x) => x.s))).slice(0, 2).map(([a, b]) => `${a.t.slice(11, 16)}–${String(+b.t.slice(11, 13) + 1).padStart(2, "0")}:00`).join("  ·  ") : "ما في نافذة مناسبة اليوم";
  const nowFrac = (now - dubai(today + "T00")) / 864e5;
  const fac = [["الرياح", cur.f.wind], ["الموج", cur.f.wave], ["الضغط", cur.f.pressure], ["حركة المد", cur.f.tide], ["القمر", cur.f.lunar], ["الضوء", cur.f.light]];
  const days = [0, 1, 2].map((k) => { const ds = new Date(+dubai(today + "T12") + k * 864e5).toISOString().slice(0, 10), h = hourScores(WX, at, ds); if (!h.length) return null; const b = h.reduce((a, x) => x.s > a.s ? x : a); return { ds, b, max: WX.daily?.temperature_2m_max?.[1 + k], min: WX.daily?.temperature_2m_min?.[1 + k] }; }).filter(Boolean);
  const nx = rows.slice(ci, ci + 24);
  v.innerHTML = `${pick}
  <div class="hero"><div class="place">${I(at.name === "موقعي" ? "loc" : "pin")}${esc(at.name)}</div><div class="temp">${U.temp(r.temp)}</div>
    <div class="cond">${WCODE(r.code)} · الماء ${U.temp(r.sst)}</div><div class="hl">ع: ${U.temp(WX.daily?.temperature_2m_max?.[1])}  ص: ${U.temp(WX.daily?.temperature_2m_min?.[1])}</div></div>
  <div class="card"><h3>${I("gauge")}مؤشر الصيد الحين</h3><div class="gauge-wrap">${gauge(cur.s, cur.unsafe)}<div class="factors">${fac.map(([a, x]) => `<div class="factor"><span>${a}</span>${bar(x, x >= 0.66 ? "var(--green)" : x >= 0.4 ? "var(--yellow)" : "var(--red)")}<span style="text-align:left">${Math.round(x * 100)}</span></div>`).join("")}</div></div>
    <p class="fine">مؤشر تقديري يجمع قواعد صيادين شائعة (رياح وموج حسب حدودك، ثبات الضغط، سرعة تغيّر المد، فترات القمر Solunar، الفجر والمغرب). ما هو علم مضمون.</p></div>
  <div class="card"><h3>${I("clock")}أفضل وقت اليوم</h3><div style="font-size:20px;font-weight:600;direction:ltr;text-align:right">${bestTxt}</div>
    <div class="timeline"><div class="tl-bars">${hs.map((h) => `<i style="height:${Math.max(6, h.s)}%;background:${scoreColor(h.s, h.unsafe)}" title="${h.t.slice(11)} ${h.s}"></i>`).join("")}</div><div class="nowline" style="right:${(1 - nowFrac) * 100}%"></div><div class="tl-x"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div></div>
  <div class="card"><h3>${I("clock")}الساعات القادمة</h3><div class="hours">${nx.map((x, k) => { const h = hs.find((y) => y.t === x.t) || hourScores(WX, at, x.t.slice(0, 10)).find((y) => y.t === x.t);
    return `<div class="hr ${k ? "" : "now"}"><span>${k ? x.t.slice(11, 13) : "الحين"}</span><svg viewBox="0 0 20 20" width="18" height="18"><g transform="rotate(${(x.dir ?? 0) + 180} 10 10)"><path d="M10 2 L14 15 L10 12 L6 15Z" fill="var(--fg2)"/></g></svg><b>${Math.round(U.windN(x.wind))}</b><small>${fmt(x.wave)}م</small><span style="width:8px;height:8px;border-radius:9px;background:${h ? scoreColor(h.s, h.unsafe) : "var(--fill)"}"></span></div>`; }).join("")}</div><p class="fine">السهم اتجاه هبوب الريح · الرقم سرعة الريح (${U.windU()}) · ارتفاع الموج · لون المؤشر</p></div>
  <div class="grid g2">
    <div class="tile"><span class="lbl">${I("wind")}الرياح</span><div style="display:flex;align-items:center;gap:10px;margin-top:6px">${compass(r.dir, Math.round(U.windN(r.wind)))}<div><b>${dirName(r.dir)}</b><div class="small">هبّات ${U.wind(r.gust)}</div></div></div><span class="small">${r.wind > P0.wind ? `<span class="badge bad">فوق حدّك</span>` : `<span class="badge ok">ضمن حدّك</span>`}</span></div>
    <div class="tile"><span class="lbl">${I("wave")}الموج</span><span class="big">${fmt(r.wave)} م</span><span class="small">دورة ${fmt(r.per, 0)} ث · من ${dirName(r.wdir)}</span></div>
    <div class="tile"><span class="lbl">${I("gauge")}الضغط الجوي</span><span class="big" style="font-size:24px">${fmt(r.p, 0)} <small style="font-size:13px">hPa</small></span>${spark(rows.slice(Math.max(0, ci - 24), ci + 1).map((x) => x.p), 200, 34, "var(--purple)")}<span class="small">${ptxt} · ٣ساعات ${d3 == null ? "—" : (d3 > 0 ? "+" : "") + fmt(d3)} · ٢٤س ${d24 == null ? "—" : (d24 > 0 ? "+" : "") + fmt(d24)}</span></div>
    <div class="tile"><span class="lbl">${I("thermo")}حرارة الماء</span><span class="big">${U.temp(r.sst)}</span><span class="small">نموذج Open-Meteo Marine · خريطة الأقمار الصناعية: MUR</span></div>
    <div class="tile" style="grid-column:1/-1"><span class="lbl">${I("tide")}المد والجزر (نموذج)</span>${spark(rows.slice(ci, ci + 30).map((x) => x.lv), 600, 60, "var(--teal)")}
      <span class="small">الحين: <b>${ts || "—"}</b> ${ext.map((e) => ` · ${e.hi ? "أعلى" : "أدنى"} ${hmLtr(dubai(e.t))} (${fmt(e.v, 2)}م)`).join("")}</span><span class="small">${r.cur != null ? `التيار ${fmt(r.cur / 1.852, 1)} عقدة باتجاه ${dirName(r.cdir)}` : ""}</span></div>
    <div class="tile"><span class="lbl">${I("sunrise")}الشمس</span><div class="list" style="background:none;border:0;margin-top:4px">${[["أول ضوء", sun.nauticalDawn], ["الفجر المدني", sun.dawn], ["الشروق", sun.sunrise], ["الغروب", sun.sunset], ["آخر ضوء", sun.nauticalDusk]].map(([a, t]) => `<div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0"><span>${a}</span><b style="direction:ltr">${isNaN(t) ? "—" : hmLtr(t)}</b></div>`).join("")}</div></div>
    <div class="tile"><span class="lbl">${I("moon")}القمر</span><span class="big" style="font-size:24px">${mo.name}</span><span class="small">إضاءة ${Math.round(mo.illum * 100)}٪ · عمر ${fmt(mo.age, 1)} يوم</span>${bar(mo.illum, "#ffd60a")}</div>
  </div>
  <div class="section-h">${I("moon")}فترات Solunar اليوم</div>
  <div class="card"><div class="sol">${sol.length ? sol.map((s) => `<div class="p" style="${s.major ? "background:rgba(255,214,10,.18)" : ""}"><small>${s.major ? "رئيسية" : "ثانوية"} · ${{ transit: "عبور القمر", underfoot: "القمر تحت الأفق", rise: "شروق القمر", set: "غروب القمر" }[s.k]}</small><b>${hmLtr(s.start)} – ${hmLtr(s.end)}</b></div>`).join("") : "—"}</div>
    <p class="fine">طريقة جون نايت: الرئيسية ساعة قبل وبعد عبور القمر فوقك وتحتك، والثانوية نص ساعة حول شروقه وغروبه. محسوبة فلكياً لموقعك.</p></div>
  <div class="section-h">${I("cal")}الأيام القادمة</div>
  <div class="list">${days.map((d) => `<div class="row"><div class="m"><b>${dayName(dubai(d.ds + "T12"))}</b><small>أفضل ساعة ${d.b.t.slice(11)} · ${scoreWord(d.b.s, d.b.unsafe)}</small></div><span class="val" style="color:${scoreColor(d.b.s, d.b.unsafe)};font-weight:700">${d.b.s}</span></div>`).join("")}</div>
  <div class="ai-teaser card"><div class="ai-orb sm">${I("sparkles")}</div><div class="m"><b>المساعد الذكي</b><small>خطة اليوم: أفضل بقعة ووقت ومسار، أو اسأل بصوتك</small></div><button class="btn primary sm" id="advBtn">${I("route")}خطة اليوم</button><button class="btn tinted sm" id="askBtn">${I("mic")}اسأل</button></div>
  <p class="fine">المصادر: Open-Meteo (طقس وموج ومد نموذجي)، حسابات فلكية محلية. آخر تحديث ${hm(WX.t)}. ${navigator.onLine ? "" : "· غير متصل، بيانات محفوظة."}</p>`;
  bindPick(v); paintIcons(v);
  requestAnimationFrame(() => $$(".gauge circle[data-off]", v).forEach((c) => c.style.strokeDashoffset = c.dataset.off));
  $("#advBtn", v).onclick = () => { show("ai"); runPlan(); }; $("#askBtn", v).onclick = () => { show("ai"); setTimeout(() => $("#aQ")?.focus(), 200); };
}
function bindPick(v) { $$(".chips .chip[data-n]", v).forEach((c) => c.onclick = () => { haptic(5);
  if (c.dataset.n === "موقعي" && !c.dataset.lat) { locate(false).then(() => { if (here) { AT = { ...here, name: "موقعي" }; WX = null; renderToday(); } else toast("ما قدرت أحدد موقعك"); }); return; }
  AT = { lat: +c.dataset.lat, lon: +c.dataset.lon, name: c.dataset.n }; WX = null; renderToday(); }); }

/* ================= Trip: route planner, track recorder, anchor alarm ================= */
const fc = (f) => ({ type: "FeatureCollection", features: f });
const line = (pts) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts.map((p) => [p.lon, p.lat]) } });
function drawRoute() { const s = map?.getSource("route"); if (!s) return; s.setData(fc([...(ROUTE.pts.length > 1 ? [line(ROUTE.pts)] : []), ...ROUTE.pts.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } }))])); }
let TRACK = { on: false, pts: [], watch: null, lock: null, t0: 0 };
function drawTrack() { const s = map?.getSource("track"); if (s) s.setData(fc(TRACK.pts.length > 1 ? [line(TRACK.pts)] : [])); }
const pathKm = (pts) => pts.slice(1).reduce((a, p, i) => a + haversine(pts[i], p), 0);
function routeCalc(pts) { const P0 = prefs(), km = pathKm(pts), nm = km / 1.852, h = P0.speed > 0 ? nm / P0.speed : null, fuel = h != null ? h * P0.lph : null;
  return { km, nm, h, fuel, total: fuel != null ? fuel * (1 + P0.reserve / 100) : null, legs: pts.slice(1).map((p, i) => { const k = haversine(pts[i], p), y = Math.sin((p.lon - pts[i].lon) * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180), x = Math.cos(pts[i].lat * Math.PI / 180) * Math.sin(p.lat * Math.PI / 180) - Math.sin(pts[i].lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) * Math.cos((p.lon - pts[i].lon) * Math.PI / 180); return { km: k, brg: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 }; }) }; }
const dur = (h) => h == null ? "—" : `${Math.floor(h)}س ${Math.round((h % 1) * 60)}د`;
function startRoute(pts = []) { ROUTE = { on: true, pts }; show("map"); drawRoute(); routeSheet(); toast("اضغط على الخريطة لإضافة نقاط المسار"); }
function routeSheet() {
  const c = routeCalc(ROUTE.pts), P0 = prefs();
  const m = openSheet(`<h2>مخطط المسار</h2><div class="meta">${ROUTE.pts.length} نقاط · اضغط على الخريطة لإضافة نقطة</div>
    <div class="grid g3"><div class="tile" style="min-height:0"><span class="lbl">${I("route")}المسافة</span><span class="big" style="font-size:20px">${U.dist(c.km)}</span></div>
    <div class="tile" style="min-height:0"><span class="lbl">${I("clock")}الوقت</span><span class="big" style="font-size:20px">${dur(c.h)}</span><span class="small">على ${P0.speed} عقدة</span></div>
    <div class="tile" style="min-height:0"><span class="lbl">${I("fuel")}الوقود</span><span class="big" style="font-size:20px">${c.total != null ? Math.ceil(c.total) + " لتر" : "—"}</span><span class="small">${c.fuel != null ? Math.ceil(c.fuel) + " + احتياط " + P0.reserve + "٪" : ""}</span></div></div>
    ${c.legs.length ? `<div class="list" style="margin-top:12px">${c.legs.map((l, i) => `<div class="row"><div class="m"><b>مرحلة ${i + 1}</b><small>اتجاه ${Math.round(l.brg)}° (حقيقي)</small></div><span class="val">${U.dist(l.km)}</span></div>`).join("")}</div>` : ""}
    <p class="fine">السرعة والاستهلاك (${P0.lph} لتر/ساعة) من إعداداتك. التقدير ما يحسب الريح والتيار والموج، وخط مستقيم بين النقاط (مو ملاحة؛ انتبه للضحضاح والجزر).</p>
    <div class="actions"><button class="btn sm" id="rtUndo">${I("x")}تراجع</button><button class="btn sm" id="rtNew">${I("trash")}مسح</button><button class="btn primary sm" id="rtSave" ${ROUTE.pts.length < 2 ? "disabled" : ""}>${I("lock")}حفظ مشفّر</button><button class="btn tinted sm" id="rtDone">تم</button></div>`, { keep: true });
  $("#rtUndo", m).onclick = () => { ROUTE.pts.pop(); drawRoute(); routeSheet(); };
  $("#rtNew", m).onclick = () => { ROUTE.pts = []; drawRoute(); routeSheet(); };
  $("#rtDone", m).onclick = () => { ROUTE.on = false; closeSheet(); };
  $("#rtSave", m).onclick = () => needKey(async () => { const name = prompt("اسم المسار", "مسار " + new Date().toLocaleDateString("ar-AE")); if (name == null) return;
    await saveRec("route", { name, pts: ROUTE.pts, km: c.km, t: Date.now() }); ROUTE.on = false; closeSheet(); toast("انحفظ المسار مشفّر"); rerender(); });
}
async function wake(on) { try { if (window.GFNative?.keepAwake) return await window.GFNative.keepAwake(on); if (on && "wakeLock" in navigator) { TRACK.lock = await navigator.wakeLock.request("screen"); } else if (!on && TRACK.lock) { await TRACK.lock.release(); TRACK.lock = null; } } catch {} }
function toggleTrack() {
  if (!navigator.geolocation) return toast("الموقع غير متاح");
  if (TRACK.on) { navigator.geolocation.clearWatch(TRACK.watch); TRACK.on = false; wake(false); haptic([10, 40, 10]);
    if (TRACK.pts.length > 1) needKey(async () => { await saveRec("track", { name: "رحلة " + new Date(TRACK.t0).toLocaleString("ar-AE"), pts: TRACK.pts.map((p) => ({ lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), t: p.t })), km: pathKm(TRACK.pts), t: TRACK.t0, end: Date.now() }); toast("انحفظ المسار المسجّل مشفّر"); rerender(); });
    rerender(); return; }
  TRACK = { on: true, pts: [], t0: Date.now(), watch: null, lock: null }; wake(true); haptic(12);
  TRACK.watch = navigator.geolocation.watchPosition((p) => { const pt = { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now(), sp: p.coords.speed };
    here = { lat: pt.lat, lon: pt.lon, acc: p.coords.accuracy }; anchorCheck(p.coords);
    const last = TRACK.pts.at(-1); if (p.coords.accuracy < 60 && (!last || haversine(last, pt) > 0.015)) { TRACK.pts.push(pt); drawTrack(); if (VIEW === "trip") renderTripLive(); } },
    () => toast("فقدنا إشارة الموقع"), { enableHighAccuracy: true, maximumAge: 2000 });
  rerender();
}
let ANCHOR = { on: false, c: null, r: 50, watch: null, alarm: false, ctx: null };
function circle(c, rM) { const pts = []; for (let k = 0; k <= 64; k++) { const a = (k / 64) * 2 * Math.PI; pts.push([c.lon + (rM / 111320 / Math.cos(c.lat * Math.PI / 180)) * Math.sin(a), c.lat + (rM / 110540) * Math.cos(a)]); } return fc([{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [pts] } }]); }
function drawAnchor() { const s = map?.getSource("anchor"); if (s) s.setData(ANCHOR.on ? circle(ANCHOR.c, ANCHOR.r) : fc([])); }
function beep() { try { ANCHOR.ctx ||= new AudioContext(); const o = ANCHOR.ctx.createOscillator(), g = ANCHOR.ctx.createGain(); o.frequency.value = 880; o.type = "square"; g.gain.value = 0.25; o.connect(g).connect(ANCHOR.ctx.destination); o.start(); o.stop(ANCHOR.ctx.currentTime + 0.35); } catch {} }
function anchorCheck(co) { if (!ANCHOR.on) return; const d = haversine(ANCHOR.c, { lat: co.latitude, lon: co.longitude }) * 1000; ANCHOR.d = d; ANCHOR.acc = co.accuracy;
  const out = d > ANCHOR.r + Math.min(co.accuracy, 30) * 0.5; if (out && !ANCHOR.alarm) { ANCHOR.alarm = true; haptic([400, 200, 400, 200, 400]); beep(); ANCHOR.bi = setInterval(() => { beep(); haptic(300); }, 1200);
    try { Notification.permission === "granted" && new Notification("صيّاد الخليج: القارب يجرف!", { body: `ابتعدت ${Math.round(d)} م عن نقطة المرساة` }); } catch {} }
  if (VIEW === "trip") renderTripLive(); }
function stopAlarm() { ANCHOR.alarm = false; clearInterval(ANCHOR.bi); if (VIEW === "trip") renderTripLive(); }
function toggleAnchor(r) {
  if (ANCHOR.on) { navigator.geolocation.clearWatch(ANCHOR.watch); stopAlarm(); ANCHOR.on = false; drawAnchor(); wake(false); rerender(); return; }
  if (!navigator.geolocation) return toast("الموقع غير متاح");
  try { Notification.requestPermission?.(); ANCHOR.ctx ||= new AudioContext(); } catch {}
  navigator.geolocation.getCurrentPosition((p) => { ANCHOR = { ...ANCHOR, on: true, c: { lat: p.coords.latitude, lon: p.coords.longitude }, r, d: 0, acc: p.coords.accuracy };
    ANCHOR.watch = navigator.geolocation.watchPosition((q) => anchorCheck(q.coords), () => {}, { enableHighAccuracy: true, maximumAge: 1000 }); wake(true); drawAnchor(); haptic(12); toast("إنذار المرساة شغّال"); rerender(); },
    () => toast("ما قدرنا نحدد موقعك"), { enableHighAccuracy: true, timeout: 15000 });
}
function renderTripLive() { const el = $("#tripLive"); if (!el) return;
  const km = pathKm(TRACK.pts), hrs = (Date.now() - TRACK.t0) / 3600e3, last = TRACK.pts.at(-1);
  el.innerHTML = `${TRACK.on ? `<div class="grid g3"><div class="tile" style="min-height:0"><span class="lbl">المسافة</span><span class="big" style="font-size:20px">${U.dist(km)}</span></div><div class="tile" style="min-height:0"><span class="lbl">المدة</span><span class="big" style="font-size:20px">${dur(hrs)}</span></div><div class="tile" style="min-height:0"><span class="lbl">السرعة</span><span class="big" style="font-size:20px">${last?.sp != null ? fmt(last.sp * 1.94384, 1) + " عقدة" : "—"}</span></div></div>` : ""}
  ${ANCHOR.on ? `<div class="card ${ANCHOR.alarm ? "alarm" : ""}" style="margin-top:12px;${ANCHOR.alarm ? "background:rgba(255,69,58,.25)" : ""}"><h3>${I("anchor")}المرساة</h3><div class="stat-big">${Math.round(ANCHOR.d || 0)} م <small style="font-size:15px;color:var(--fg2)">من ${ANCHOR.r} م</small></div>${bar((ANCHOR.d || 0) / ANCHOR.r, ANCHOR.alarm ? "var(--red)" : "var(--orange)")}<p class="fine">دقة GPS ±${Math.round(ANCHOR.acc || 0)} م</p>${ANCHOR.alarm ? `<button class="btn danger block" id="stopAl">إسكات الإنذار</button>` : ""}</div>` : ""}`;
  paintIcons(el); $("#stopAl", el) && ($("#stopAl", el).onclick = stopAlarm); }
function renderTrip() {
  const v = $("#v-trip"), routes = RECS.filter((r) => r.kind === "route"), tracks = RECS.filter((r) => r.kind === "track"), P0 = prefs();
  v.innerHTML = `<h1 class="large-title">الرحلة</h1><p class="subtitle">خطط، سجّل مسارك، وخلّ المرساة تحت عينك</p>
  <div class="grid g2">
    <button class="card" id="tRec" style="text-align:right;cursor:pointer;${TRACK.on ? "background:rgba(255,55,95,.18)" : ""}"><h3>${I("play")}${TRACK.on ? "جاري التسجيل…" : "تسجيل الرحلة"}</h3><b style="font-size:17px">${TRACK.on ? "اضغط للإيقاف والحفظ" : "ابدأ تسجيل المسار"}</b><p class="fine" style="margin:6px 0 0">يبقي الشاشة شغالة ويحفظ مسارك مشفّر</p></button>
    <button class="card" id="tRoute" style="text-align:right;cursor:pointer"><h3>${I("route")}مخطط المسار</h3><b style="font-size:17px">مسافة · وقت · وقود</b><p class="fine" style="margin:6px 0 0">${P0.speed} عقدة · ${P0.lph} لتر/س</p></button></div>
  <div class="card"><h3>${I("anchor")}إنذار المرساة والجرف</h3>
    ${ANCHOR.on ? `<button class="btn danger block" id="aOff">إيقاف الإنذار</button>` : `<div class="seg" id="aR">${[30, 50, 80, 120].map((x) => `<button data-r="${x}" class="${x === 50 ? "on" : ""}">${x} م</button>`).join("")}</div><button class="btn primary block" id="aOn" style="margin-top:12px">${I("anchor")}ثبّت المرساة هنا</button>`}
    <p class="fine">ينبّهك بصوت واهتزاز وإشعار إذا طلع القارب من الدائرة. لازم تخلّي الصفحة مفتوحة والشاشة شغالة (المتصفح ما يسمح بالتتبع في الخلفية).</p></div>
  <div id="tripLive"></div>
  <div class="section-h">${I("route")}مساراتك المحفوظة</div>
  <div class="list">${[...routes, ...tracks].sort((a, b) => b.t - a.t).map((r) => `<div class="row tap" data-id="${r.id}">${ic(r.kind === "route" ? "route" : "play", r.kind === "route" ? "var(--blue)" : "var(--pink)")}<div class="m"><b>${esc(r.name)}</b><small>${r.kind === "route" ? "مخطط" : "مسجّل"} · ${U.dist(r.km)} · ${new Date(r.t).toLocaleDateString("ar-AE")}</small></div>${I("chev", "chev")}</div>`).join("") || `<div class="row"><div class="m"><small>ما في مسارات بعد</small></div></div>`}</div>
  <div class="actions" style="margin-top:12px">${tracks.length ? `<button class="btn sm" id="tGpx">${I("share")}تصدير GPX</button>` : ""}<button class="btn sm" id="tPlan">${I("sos")}خطة الرحلة لشخص بالبر</button></div>`;
  paintIcons(v); renderTripLive();
  $("#tRec", v).onclick = toggleTrack; $("#tRoute", v).onclick = () => startRoute(here ? [{ lat: here.lat, lon: here.lon }] : []);
  $("#aOn", v) && ($("#aOn", v).onclick = () => toggleAnchor(+$("#aR .on", v).dataset.r)); $("#aOff", v) && ($("#aOff", v).onclick = () => toggleAnchor());
  $$("#aR button", v).forEach((b) => b.onclick = () => { $$("#aR button", v).forEach((x) => x.classList.remove("on")); b.classList.add("on"); haptic(4); });
  $$(".row[data-id]", v).forEach((el) => el.onclick = () => { const r = RECS.find((x) => x.id === el.dataset.id);
    if (r.kind === "route") { ROUTE = { on: false, pts: r.pts }; } else { TRACK.on || (TRACK.pts = r.pts); }
    show("map"); drawRoute(); drawTrack(); const b = new maplibregl.LngLatBounds(); r.pts.forEach((p) => b.extend([p.lon, p.lat])); map.fitBounds(b, { padding: 80, maxZoom: 13 });
    const m = openSheet(`<h2>${esc(r.name)}</h2><div class="meta">${U.dist(r.km)}</div><div class="actions"><button class="btn danger sm" id="dR">${I("trash")}حذف</button><button class="btn sm" id="xR">إغلاق</button></div>`, { keep: true });
    $("#dR", m).onclick = async () => { if (confirm("حذف؟")) { await delRec(r.id); ROUTE.pts = []; drawRoute(); closeSheet(); rerender(); } }; $("#xR", m).onclick = closeSheet; });
  $("#tGpx", v) && ($("#tGpx", v).onclick = () => gpx());
  $("#tPlan", v).onclick = tripPlan;
}

/* ================= Log & stats ================= */
const MOON8 = ["محاق", "هلال+", "تربيع١", "أحدب+", "بدر", "أحدب−", "تربيع٢", "هلال−"];
const hbars = (obj, color) => { const e = Object.entries(obj).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...e.map((x) => x[1])); return e.map(([k, n]) => `<div class="hbar"><span>${esc(k)}</span>${bar(n / mx, color)}<b>${n}</b></div>`).join("") || `<p class="fine">—</p>`; };
const count = (arr, f) => arr.reduce((o, x) => { const k = f(x); if (k != null && k !== "") o[k] = (o[k] || 0) + 1; return o; }, {});
function learned(cs) {
  if (cs.length < 5) return `<p class="fine">بعد ${5 - cs.length} صيدات إضافية (مع ظروفها) يبدأ التطبيق يستنتج أفضل ظروفك.</p>`;
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const q = (arr) => { const v = arr.filter((x) => x != null).sort((a, b) => a - b); return v.length >= 3 ? [v[Math.floor(v.length * 0.25)], v[Math.floor(v.length * 0.75)]] : null; };
  const hr = top(count(cs, (c) => { const h = +new Date(c.t).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Dubai" }); return `${String(h - h % 3).padStart(2, "0")}–${String(h - h % 3 + 3).padStart(2, "0")}`; })),
    tide = top(count(cs, (c) => c.tide)), mo = top(count(cs, (c) => c.moon != null ? MOON8[c.moon] : null)), dep = q(cs.map((c) => c.depth)), sst = q(cs.map((c) => c.sst)), wind = q(cs.map((c) => c.wind)), pt = count(cs, (c) => c.ptrend == null ? null : Math.abs(c.ptrend) <= 1 ? "مستقر" : c.ptrend < 0 ? "ينخفض" : "يرتفع");
  const rows = [["أكثر وقت", hr && `${hr[0]} (${hr[1]} صيدة)`], ["حالة المد", tide && `${tide[0]} (${tide[1]})`], ["طور القمر", mo && `${mo[0]} (${mo[1]})`], ["العمق (النص الأوسط)", dep && `${dep[0]}–${dep[1]} م`], ["حرارة الماء", sst && `${fmt(sst[0])}–${fmt(sst[1])}°`], ["الرياح", wind && `${U.wind(wind[0])}–${U.wind(wind[1])}`], ["الضغط", top(pt) && `${top(pt)[0]} (${top(pt)[1]})`]];
  return `<div class="list">${rows.filter((r) => r[1]).map(([a, b]) => `<div class="row"><div class="m">${a}</div><span class="val">${esc(b)}</span></div>`).join("")}</div><p class="fine">من ${cs.length} صيدة مسجّلة عندك فقط. هذي أنماط في سجلّك، مو قاعدة عامة، وتصير أدق كل ما سجّلت أكثر.</p>`;
}
function renderLog() {
  const v = $("#v-log");
  if (!KEY) { v.innerHTML = `<h1 class="large-title">سجلّي</h1><div class="card" style="text-align:center;padding:28px"><span class="ic" style="background:var(--indigo);width:56px;height:56px;border-radius:16px;display:inline-grid;place-items:center;color:#fff">${I("lock")}</span><h2>سجلّك مقفل</h2><p class="fine">افتح الخزنة عشان تشوف صيداتك وإحصاءاتك.</p><button class="btn primary" id="unl">فتح الخزنة</button></div>`; $("#unl", v).onclick = () => vaultSheet(); paintIcons(v); return; }
  const cs = RECS.filter((r) => r.kind === "catch").sort((a, b) => b.t - a.t), sp = RECS.filter((r) => r.kind === "spot");
  const nearSpot = (c) => { if (c.lat == null) return null; let b = null; for (const s of sp) { const d = haversine(s, c); if (d < 2 && (!b || d < b.d)) b = { d, n: s.name }; } return b?.n || null; };
  const hours = Array(24).fill(0); cs.forEach((c) => hours[+new Date(c.t).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Dubai" }) % 24]++); const mh = Math.max(1, ...hours);
  const moons = Array(8).fill(0); cs.forEach((c) => c.moon != null && moons[c.moon]++); const mm = Math.max(1, ...moons);
  const kg = cs.reduce((a, c) => a + (c.weight || 0), 0);
  v.innerHTML = `<h1 class="large-title">سجلّي</h1><p class="subtitle">مشفّر على جهازك · ${navigator.onLine ? "متزامن" : "بيتزامن لما يرجع النت"}</p><button class="btn tinted block" id="lsum">${I("sparkles")}لخّص سجلّي بالذكاء الاصطناعي</button><div id="lsumOut"></div>
  <div class="actions" style="margin:0 0 14px"><button class="btn primary sm" id="addC">${I("plus")}صيدة</button><button class="btn sm" id="addS">${I("star")}نقطة من موقعي</button><button class="btn sm" id="addB">${I("ban")}رحلة بدون صيد</button><button class="btn sm" id="exp">${I("share")}GPX</button></div>
  <div class="grid g3"><div class="tile" style="min-height:0"><span class="lbl">${I("fish")}صيدات</span><span class="stat-big">${cs.length}</span></div><div class="tile" style="min-height:0"><span class="lbl">${I("star")}نقاط</span><span class="stat-big">${sp.length}</span></div><div class="tile" style="min-height:0"><span class="lbl">${I("chart")}كجم</span><span class="stat-big">${fmt(kg, 1)}</span></div></div>
  ${modelCard()}${cs.length ? `<div class="section-h">${I("sparkles")}أفضل ظروفك (من سجلّك)</div>${learned(cs)}
  <div class="grid g2" style="margin-top:12px"><div class="card"><h3>${I("fish")}حسب النوع</h3>${hbars(count(cs, (c) => spName(c.species, c.other)), "var(--blue)")}</div>
    <div class="card"><h3>${I("star")}حسب النقطة</h3>${hbars(count(cs, (c) => nearSpot(c) || "بدون نقطة محفوظة"), "var(--orange)")}</div>
    <div class="card"><h3>${I("tide")}حسب المد</h3>${hbars(count(cs, (c) => c.tide || "غير مسجّل"), "var(--teal)")}</div>
    <div class="card"><h3>${I("moon")}حسب القمر</h3><svg viewBox="0 0 240 64" width="100%">${moons.map((h, i) => `<rect x="${i * 30 + 4}" y="${48 - (h / mm) * 44}" width="22" height="${Math.max(1, (h / mm) * 44)}" rx="4" fill="#ffd60a"/><text x="${i * 30 + 15}" y="61" font-size="8" fill="currentColor" opacity=".6" text-anchor="middle">${MOON8[i]}</text>`).join("")}</svg></div>
    <div class="card" style="grid-column:1/-1"><h3>${I("clock")}حسب الساعة</h3><svg viewBox="0 0 240 60" width="100%" style="direction:ltr">${hours.map((h, i) => `<rect x="${i * 10}" y="${50 - (h / mh) * 46}" width="8" height="${Math.max(1, (h / mh) * 46)}" rx="2" fill="var(--teal)"/>`).join("")}<text x="0" y="59" font-size="7" fill="currentColor" opacity=".6">00</text><text x="115" y="59" font-size="7" fill="currentColor" opacity=".6">12</text><text x="226" y="59" font-size="7" fill="currentColor" opacity=".6">23</text></svg></div></div>` : ""}
  <div class="section-h">${I("fish")}الصيدات</div>
  <div class="list">${cs.map((c) => `<div class="row tap" data-id="${c.id}">${c.photo ? `<img src="${c.photo}" style="width:48px;height:48px;border-radius:12px;object-fit:cover">` : ic("fish", "var(--blue)")}<div class="m"><b>${esc(spName(c.species, c.other))}${c.length ? ` · ${c.length} سم` : ""}${c.weight ? ` · ${c.weight} كجم` : ""}</b><small>${new Date(c.t).toLocaleString("ar-AE", { dateStyle: "medium", timeStyle: "short" })}${c.bait ? " · " + esc(c.bait) : ""}${c.released ? " · رجّعتها" : ""}</small></div>${I("chev", "chev")}</div>`).join("") || `<div class="row"><div class="m"><small>ما سجّلت صيدات للحين. اضغط على الخريطة أو «صيدة».</small></div></div>`}</div>
  <div class="section-h">${I("star")}نقاطي الخاصة</div>
  <div class="list">${sp.map((s) => `<div class="row tap" data-id="${s.id}">${ic("star", "var(--orange)")}<div class="m"><b>${esc(s.name)}</b><small>${dm(s.lat, "N", "S")} · ${dm(s.lon, "E", "W")}</small></div>${I("chev", "chev")}</div>`).join("") || `<div class="row"><div class="m"><small>ما في نقاط.</small></div></div>`}</div>`;
  paintIcons(v); $("#lsum", v).onclick = () => runLogSummary($("#lsumOut", v));
  $$(".row[data-id]", v).forEach((el) => el.onclick = () => { const r = RECS.find((x) => x.id === el.dataset.id); if (r?.lat != null) { show("map"); map.jumpTo({ center: [r.lon, r.lat], zoom: 11 }); } recSheet(r); });
  $("#addC", v).onclick = () => locate(false).then((h) => catchSheet(h || { lat: null, lon: null }));
  $("#addS", v).onclick = () => locate(false).then((h) => h ? spotSheet(h) : toast("ما قدرنا نحدد موقعك، اضغط على الخريطة بدال"));
  $("#addB", v).onclick = blankSheet;
  $("#exp", v).onclick = gpx;
}
function gpx() { const x = (s) => esc(s);
  const g = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Gulf Fisher" xmlns="http://www.topografix.com/GPX/1/1">\n${RECS.filter((r) => (r.kind === "spot" || r.kind === "catch") && r.lat != null).map((r) => `<wpt lat="${r.lat}" lon="${r.lon}"><name>${x(r.kind === "spot" ? r.name : spName(r.species, r.other))}</name><time>${new Date(r.t).toISOString()}</time></wpt>`).join("\n")}
${RECS.filter((r) => r.kind === "route").map((r) => `<rte><name>${x(r.name)}</name>${r.pts.map((p) => `<rtept lat="${p.lat}" lon="${p.lon}"/>`).join("")}</rte>`).join("\n")}
${RECS.filter((r) => r.kind === "track").map((r) => `<trk><name>${x(r.name)}</name><trkseg>${r.pts.map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}">${p.t ? `<time>${new Date(p.t).toISOString()}</time>` : ""}</trkpt>`).join("")}</trkseg></trk>`).join("\n")}\n</gpx>`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([g], { type: "application/gpx+xml" })); a.download = "gulf-fisher.gpx"; a.click(); toast("الملف غير مشفّر، احفظه بمكان آمن"); }

/* ================= share catch card (1080×1350, no location by default) ================= */
async function shareCard(r) {
  const m = openSheet(`<h2>بطاقة الصيدة</h2><canvas id="cc" width="1080" height="1350" style="width:100%;border-radius:18px"></canvas>
    <div class="layer-row"><span>أضف المنطقة التقريبية (بدون إحداثيات)</span><input id="ccLoc" type="checkbox" class="switch"></div>
    <div class="actions"><button class="btn primary sm" id="ccShare">${I("share")}مشاركة</button><button class="btn sm" id="ccDl">تنزيل</button></div><p class="fine">الإحداثيات الدقيقة ما تنحط أبداً في البطاقة.</p>`);
  const cv = $("#cc", m);
  const draw = async () => { const c = cv.getContext("2d"), W = 1080, H = 1350; await document.fonts.ready;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a3d6b"); g.addColorStop(1, "#02101f"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (r.photo) { const img = new Image(); img.src = r.photo; await img.decode().catch(() => {}); const s = Math.max(W / img.width, 900 / img.height); c.save(); c.beginPath(); c.roundRect(40, 40, W - 80, 860, 48); c.clip(); c.drawImage(img, (W - img.width * s) / 2, 40 + (860 - img.height * s) / 2, img.width * s, img.height * s); c.restore(); }
    else { c.fillStyle = "rgba(255,255,255,.06)"; c.beginPath(); c.roundRect(40, 40, W - 80, 860, 48); c.fill(); c.font = "300px system-ui"; c.textAlign = "center"; c.fillText("🐟", W / 2, 600); }
    c.direction = "rtl"; c.textAlign = "right"; c.fillStyle = "#fff"; c.font = "700 92px 'IBM Plex Sans Arabic', system-ui"; c.fillText(spName(r.species, r.other), W - 70, 1030);
    c.font = "500 50px 'IBM Plex Sans Arabic', system-ui"; c.fillStyle = "rgba(255,255,255,.85)";
    c.fillText([r.length ? r.length + " سم" : "", r.weight ? r.weight + " كجم" : "", r.released ? "رجّعتها البحر" : ""].filter(Boolean).join("  ·  ") || " ", W - 70, 1110);
    c.font = "400 38px 'IBM Plex Sans Arabic', system-ui"; c.fillStyle = "rgba(255,255,255,.6)";
    const area = $("#ccLoc", m).checked && r.lat != null ? (r.lon < 54.9 ? "مياه أبوظبي" : r.lon < 55.45 ? "مياه دبي" : r.lat > 25.9 ? "مياه الشمالية" : "مياه الإمارات") : "";
    c.fillText([new Date(r.t).toLocaleDateString("ar-AE", { day: "numeric", month: "long", year: "numeric" }), r.moon != null ? "القمر: " + moon(new Date(r.t)).name : "", area].filter(Boolean).join("  ·  "), W - 70, 1180);
    c.textAlign = "left"; c.font = "600 34px 'IBM Plex Sans Arabic', system-ui"; c.fillStyle = "rgba(255,255,255,.5)"; c.fillText("صيّاد الخليج", 70, 1290); };
  await draw(); $("#ccLoc", m).onchange = draw;
  const blob = () => new Promise((res) => cv.toBlob(res, "image/jpeg", 0.92));
  $("#ccDl", m).onclick = async () => { const a = document.createElement("a"); a.href = URL.createObjectURL(await blob()); a.download = "catch.jpg"; a.click(); };
  $("#ccShare", m).onclick = async () => { const f = new File([await blob()], "catch.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: spName(r.species, r.other) }); } catch {} } else $("#ccDl", m).click(); };
}

/* ================= More: species, rules, safety, settings ================= */
const srcLinks = (a) => (a || []).map((u, i) => `<a href="${u}" target="_blank" rel="noopener">مصدر ${i + 1}</a>`).join(" · ");
const SP_COL = { hamour: "#ff9f0a", kanaad: "#0a84ff", shaari: "#bf5af2", safi: "#30d158", badeh: "#64d2ff" };
function speciesSheet(s) {
  const notes = RECS.filter((r) => r.kind === "note" && r.species === s.id).sort((a, b) => b.t - a.t), F = s.facts || {}, al = ruleAlerts(s.id);
  const m = openSheet(`<h2>${s.ar}</h2><div class="meta">${esc(s.en)}${s.sci ? ` · <i dir="ltr">${esc(s.sci)}</i>` : ""}</div>
    ${al.map((r) => `<div class="note bad">${I("ban")}<div>هالشهر: ${esc(r.text)}</div></div>`).join("")}
    ${s.facts ? `<div class="list">${[["العمق", F.depth], ["الطول", F.max], ["البيئة", F.habitat], ["الغذاء", F.diet || "ما لقينا مصدر موثّق"], ["الوضع", F.status]].filter((x) => x[1]).map(([a, b]) => `<div class="row" style="align-items:flex-start"><div class="m"><small>${a}</small><b style="font-size:15px;font-weight:400">${esc(b)}</b></div></div>`).join("")}</div>
      <p class="fine">المصادر: ${srcLinks([...(s.src || []), s.sci ? SRC.fb(s.sci) : null].filter(Boolean))}</p>` : `<p class="fine">ما أضفنا معلومات موثّقة عن هالنوع.</p>`}
    <div class="note info">${I("info")}<div>ما لقينا مصدر موثّق للطُعم والتقنية لهالنوع في الإمارات، فما نكتب شي من عندنا. سجّل ملاحظاتك أنت هنا (مشفّرة).</div></div>
    <h3 class="section-h" style="margin:14px 0 6px">ملاحظاتي: الطُعم والتقنية</h3>
    <div class="list">${notes.map((n) => `<div class="row"><div class="m"><b style="font-size:15px;font-weight:400">${esc(n.text)}</b><small>${new Date(n.t).toLocaleDateString("ar-AE")}</small></div><button class="btn sm danger" data-del="${n.id}">${I("trash")}</button></div>`).join("") || `<div class="row"><div class="m"><small>${KEY ? "ما في ملاحظات" : "افتح الخزنة عشان تشوف ملاحظاتك"}</small></div></div>`}</div>
    <label class="f">ملاحظة جديدة<textarea id="nt" rows="2" placeholder="مثلاً: ربيان حي، قاع، الفجر مع بداية المد"></textarea></label><button class="btn primary block" id="ntOk">${I("lock")}حفظ مشفّر</button>`);
  $("#ntOk", m).onclick = () => needKey(async () => { const t = $("#nt", m)?.value?.trim(); if (!t) return speciesSheet(s); await saveRec("note", { species: s.id, text: t, t: Date.now() }); haptic(8); toast("انحفظت"); speciesSheet(s); });
  $$("[data-del]", m).forEach((b) => b.onclick = async () => { await delRec(b.dataset.del); speciesSheet(s); });
}
let MORE = "species";
function renderMore() {
  const v = $("#v-more"), tabs = [["species", "الأسماك"], ["rules", "الأنظمة"], ["safety", "السلامة"], ["settings", "الإعدادات"]];
  v.innerHTML = `<h1 class="large-title">المزيد</h1><div class="seg" id="mseg" style="margin:10px 0 16px">${tabs.map(([k, a]) => `<button data-k="${k}" class="${MORE === k ? "on" : ""}">${a}</button>`).join("")}</div><div id="mbody"></div>`;
  $$("#mseg button", v).forEach((b) => b.onclick = () => { MORE = b.dataset.k; haptic(4); renderMore(); });
  const b = $("#mbody", v);
  if (MORE === "species") {
    b.innerHTML = `<div class="spgrid">${SPECIES.filter((s) => s.id !== "other").map((s) => `<div class="sp" data-s="${s.id}" style="${SP_COL[s.id] ? `background:linear-gradient(160deg,${SP_COL[s.id]}33,var(--card))` : ""}"><span class="ic" style="background:${SP_COL[s.id] || "var(--gray)"};width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff">${I("fish")}</span><b>${s.ar}</b><i>${esc(s.sci || s.en)}</i>${ruleAlerts(s.id).length ? `<span class="badge bad" style="margin-top:6px">محظور هالشهر</span>` : ""}</div>`).join("")}</div>
      <p class="fine">المعلومات من صفحات هيئة البيئة – أبوظبي وFishBase والوزارة. أي شي ما لقينا له مصدر ما كتبناه.</p>`;
    $$(".sp", b).forEach((el) => el.onclick = () => speciesSheet(SPECIES.find((s) => s.id === el.dataset.s)));
  } else if (MORE === "rules") {
    const mo = new Date().getMonth() + 1, y = new Date().getFullYear(), act = RULES.filter((r) => r.status === "verified" && r.months.includes(mo) && r.species.length && !(r.notIn || []).includes(y));
    const item = (r) => `<div class="row" style="align-items:flex-start"><span class="badge ${r.status === "verified" ? "ok" : "warn"}">${r.status === "verified" ? "موثّق" : "يحتاج تأكيد"}</span><div class="m"><b style="font-size:15px;font-weight:400;line-height:1.6">${esc(r.text)}</b><small>${r.area ? esc(r.area) + " · " : ""}${srcLinks(r.src)}</small></div></div>`;
    b.innerHTML = `${act.length ? act.map((r) => `<div class="note bad">${I("ban")}<div>هالشهر: ${esc(r.text)}</div></div>`).join("") : `<div class="note ok">${I("info")}<div>ما في حظر موسمي موثّق للأنواع المسجّلة هالشهر.</div></div>`}
      <div class="section-h">مواسم وأدوات الصيد</div><div class="list">${RULES.map(item).join("")}</div>
      <div class="section-h">الرخص (أبوظبي)</div><div class="list">${LICENCE.map(item).join("")}</div>
      <div class="section-h">المحميات البحرية (أبوظبي)</div><div class="list">${MPA.map(item).join("")}</div>
      <p class="fine">الأنظمة تتغيّر. المرجع الرسمي هو الوزارة وهيئة البيئة و<a href="${SRC.hadaq}" target="_blank">تطبيق حدق</a>.</p>`;
  } else if (MORE === "safety") {
    b.innerHTML = `<div class="note bad">${I("warn")}<div>التطبيق للتخطيط فقط، مو جهاز ملاحة. الأعماق تقريبية وما تصلح لتجنّب الشعاب والضحضاح. استخدم الخرائط البحرية الرسمية وأجهزة القارب واللاسلكي.</div></div>
      <button class="btn danger block" id="sos" style="font-size:17px;padding:16px">${I("sos")}أرسل موقعي للطوارئ عبر واتساب</button>
      <a class="btn block" href="tel:999" style="margin-top:10px">${I("phone")}اتصال 999</a>
      <p class="fine">يفتح واتساب برسالة فيها إحداثياتك، وأنت تختار لمن ترسلها.</p>
      <div class="section-h">خطة الرحلة</div><div class="card"><label class="f">رقم واتساب لشخص بالبر<input id="tp" dir="ltr" inputmode="tel" placeholder="9715xxxxxxxx" value="${esc(localStorage.getItem("gf_contact") || "")}"></label>
      <label class="f">متى ترجع؟<input id="tr" type="time" value="18:00"></label><button class="btn primary block" id="tpS">${I("share")}شارك خطة الرحلة</button></div>`;
    $("#sos", b).onclick = () => pos((c) => { const t = c ? `🆘 أحتاج مساعدة في البحر.\nموقعي: ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}${c.accuracy ? ` (±${Math.round(c.accuracy)}م)` : ""}\n${dm(c.latitude, "N", "S")} ${dm(c.longitude, "E", "W")}\nhttps://maps.google.com/?q=${c.latitude},${c.longitude}\nالوقت: ${new Date().toLocaleString("ar-AE")}` : "🆘 أحتاج مساعدة في البحر. ما قدرت أحدد الموقع."; open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank"); });
    $("#tpS", b).onclick = () => tripPlan($("#tp", b).value, $("#tr", b).value);
  } else {
    const u = units(), P0 = prefs(), seg = (id, cur, opts) => `<div class="seg" data-u="${id}">${opts.map(([k, a]) => `<button data-k="${k}" class="${cur === k ? "on" : ""}">${a}</button>`).join("")}</div>`;
    const num = (id, a, val, step = 1) => `<label class="f">${a}<input type="number" step="${step}" data-p="${id}" value="${val}" inputmode="decimal"></label>`;
    b.innerHTML = `<div class="section-h">المظهر</div><div class="card">${seg("theme", theme(), [["auto", "تلقائي"], ["light", "فاتح"], ["dark", "داكن"]])}</div>
      <div class="section-h">الوحدات</div><div class="card" style="display:grid;gap:10px"><small class="fine" style="margin:0">السرعة</small>${seg("speed", u.speed, [["kn", "عقدة"], ["kmh", "كم/س"], ["ms", "م/ث"]])}<small class="fine" style="margin:0">المسافة</small>${seg("dist", u.dist, [["nm", "ميل بحري"], ["km", "كم"]])}<small class="fine" style="margin:0">العمق</small>${seg("depth", u.depth, [["m", "متر"], ["ft", "قدم"]])}<small class="fine" style="margin:0">الحرارة</small>${seg("temp", u.temp, [["c", "°م"], ["f", "°ف"]])}</div>
      <div class="section-h">حدودك وعمقك المفضّل</div><div class="card"><div class="grid g2">${num("dmin", "أقل عمق (م)", P0.dmin)}${num("dmax", "أكثر عمق (م)", P0.dmax)}${num("wave", "أقصى موج (م)", P0.wave, 0.1)}${num("wind", "أقصى ريح (كم/س)", P0.wind)}</div></div>
      <div class="section-h">القارب</div><div class="card"><div class="grid g3">${num("speed", "سرعة الإبحار (عقدة)", P0.speed)}${num("lph", "استهلاك (لتر/ساعة)", P0.lph)}${num("reserve", "احتياط وقود ٪", P0.reserve)}</div></div>
      <div class="section-h">البيانات</div><div class="list">${[["حرارة السطح", `NASA JPL MUR SST 0.01° · ${esc((OCEAN?.sst_time || "").slice(0, 10))}`, SRC.mur], ["الكلوروفيل", `NOAA VIIRS DINEOF 2كم · ${esc((OCEAN?.chl_time || "").slice(0, 10))}`, SRC.chl], ["الأعماق", "SRTM15+ و GEBCO (عرض)", SRC.srtm], ["العلامات البحرية", "OpenSeaMap", SRC.osmap], ["الشعاب والحطام", `OpenStreetMap · ${POIS.length} عنصر`, SRC.osm], ["الخريطة", "OpenFreeMap", SRC.ofm], ["الطقس والموج والمد", "Open-Meteo (نموذج)", "https://open-meteo.com/"]].map(([a, bb, l]) => `<div class="row"><div class="m"><b>${a}</b><small>${bb}</small></div><a href="${l}" target="_blank" rel="noopener">${I("info")}</a></div>`).join("")}</div>
      <p class="fine">بيانات الأقمار الصناعية محسوبة مسبقاً (لقطة بتاريخها فوق) لأن خوادم NOAA ما تسمح بالطلب المباشر من المتصفح.</p>
      <div class="actions"><button class="btn sm" id="refWx">${I("clock")}تحديث الطقس</button><button class="btn sm" id="lockNow">${I("lock")}قفل الخزنة</button><button class="btn danger sm" id="logout">تسجيل خروج</button></div>`;
    $$(".seg[data-u] button", b).forEach((x) => x.onclick = () => { const k = x.parentElement.dataset.u; haptic(4);
      if (k === "theme") { localStorage.setItem("gf_theme", x.dataset.k); applyTheme(); } else { localStorage.setItem("gf_units", JSON.stringify({ ...units(), [k]: x.dataset.k })); if (k === "dist" && map) { map._controls.filter((c) => c instanceof maplibregl.ScaleControl).forEach((c) => c.setUnit(x.dataset.k === "nm" ? "nautical" : "metric")); } }
      renderMore(); });
    $$("input[data-p]", b).forEach((x) => x.onchange = () => { setPrefs({ [x.dataset.p]: +x.value }); if (["dmin", "dmax"].includes(x.dataset.p)) recomputeHot(); toast("انحفظ"); });
    $("#refWx", b).onclick = async () => { const at = defAt(); await idb.set(`wx:${at.lat.toFixed(2)},${at.lon.toFixed(2)}`, null); WX = null; toast("بيتحدّث في صفحة اليوم"); };
    $("#lockNow", b).onclick = lockVault; $("#logout", b).onclick = logout;
  }
  paintIcons(v);
}
const pos = (cb) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => cb(p.coords), () => cb(here ? { latitude: here.lat, longitude: here.lon, accuracy: null } : null), { enableHighAccuracy: true, timeout: 8000 }) : cb(null);
function tripPlan(phone, back) {
  if (phone == null) { MORE = "safety"; show("more"); return; }
  pos((c) => { const ph = String(phone).replace(/\D/g, ""); localStorage.setItem("gf_contact", ph);
    const rt = ROUTE.pts.length > 1 ? `\nالمسار المخطط: ${ROUTE.pts.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(" → ")}` : "";
    const t = `🚤 خطة طلعة بحر\nانطلاق: ${c ? `https://maps.google.com/?q=${c.latitude},${c.longitude}` : "غير محدد"}${rt}\nالرجوع المتوقع: ${back || "—"}\nإذا ما تواصلت بعد الموعد، اتصل علي وبعدين 999.`; open(`https://wa.me/${ph}?text=${encodeURIComponent(t)}`, "_blank"); });
}
function lockVault() { setKey(null); clearRecs(); drawRecs(); recomputeHot(); lockIcon(); rerender(); toast("انقفلت الخزنة"); }
async function logout() { if (!confirm("خروج؟ النسخة المحلية بتنمسح (المشفّرة على السيرفر تبقى).")) return;
  try { await fetch(SB_URL + "/auth/v1/logout", { method: "POST", headers: { apikey: SB_ANON, Authorization: "Bearer " + session.access_token } }); } catch {} await idb.clear(); saveSess(null); location.reload(); }

/* ================= shell ================= */
let VIEW = "map";
function show(v) { VIEW = v; $$("#tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); $$(".view").forEach((x) => x.classList.toggle("hidden", x.id !== "v-" + v));
  if (!(v === "map" && ROUTE.on)) closeSheet(); rerender(); if (v === "map" && map) requestAnimationFrame(() => map.resize()); }
function rerender() { ({ today: renderToday, trip: renderTrip, ai: renderAI, log: renderLog, more: renderMore }[VIEW] || (() => {}))(); }
$$("#tabbar button").forEach((b) => b.onclick = () => { haptic(5); show(b.dataset.v); });
async function netState() { const n = $("#net"), q = $("#queue"); if (!n) return; n.className = "status" + (navigator.onLine ? "" : " off"); n.textContent = navigator.onLine ? "متصل" : "بدون نت"; q.className = "status q";
  const pend = (await idb.all().catch(() => [])).filter((r) => r.dirty).length; q.classList.toggle("hidden", !pend); q.textContent = pend ? `${pend} بانتظار المزامنة` : ""; }
hooks.queue = netState;
addEventListener("online", () => { netState(); sync().then(() => { drawRecs(); rerender(); }); }); addEventListener("offline", netState);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && (TRACK.on || ANCHOR.on || NAV.on)) wake(true); });

async function start() {
  applyTheme(); paintIcons();
  if (!session) { $("#login").classList.remove("hidden"); $("#app").classList.add("hidden");
    const go = async () => { $("#loginErr").textContent = ""; $("#loginBtn").disabled = true; try { await login($("#em").value.trim(), $("#pw").value); location.reload(); } catch (e) { haptic([20, 30, 20]); $("#loginErr").textContent = e.message === "Invalid login credentials" ? "البريد أو كلمة المرور غير صحيحة" : e.message; } $("#loginBtn").disabled = false; };
    $("#loginBtn").onclick = go; $("#pw").onkeydown = (e) => { if (e.key === "Enter") go(); }; return; }
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#lockBtn").onclick = () => KEY ? lockVault() : vaultSheet(); lockIcon();
  updateSky(defAt(), null); initMap(); netState();
  OCEAN = await liveData("data/ocean.json");
  recomputeHot(); loadPois().then(() => { drawPois(); recomputeHot(); });
  if (!KEY) setTimeout(() => vaultSheet(), 500);
  loadWx(defAt()).then((w) => { if (w) { WX = w; updateSky(defAt(), w); } });
}
/* ================= sea navigation (Google-Maps-style, estimate only) ================= */
Object.assign(P, {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  navi: '<path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>',
  vol: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  port: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
});
const DEG = Math.PI / 180;
const NP = () => ({ draft: 1.0, margin: 1.5, hz: 300, ...JSON.parse(localStorage.getItem("gf_nav") || "{}") });
const setNP = (o) => localStorage.setItem("gf_nav", JSON.stringify({ ...NP(), ...o }));
const brg = (a, b) => { const y = Math.sin((b.lon - a.lon) * DEG) * Math.cos(b.lat * DEG), x = Math.cos(a.lat * DEG) * Math.sin(b.lat * DEG) - Math.sin(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos((b.lon - a.lon) * DEG); return (Math.atan2(y, x) / DEG + 360) % 360; };
const KIND_AR = { port: "ميناء / مرسى", spot: "نقطتي", catch: "صيدة", wreck: "حطام", reef: "شعاب", shoal: "ضحضاح", island: "جزيرة", pin: "نقطة" };
let PORTS = [], NAVD = null;
async function loadNavData() {
  if (!PORTS.length) PORTS = (await fetch("data/ports.json").then((r) => r.json()).catch(() => ({ ports: [] }))).ports || [];
  if (!NAVD) { const b = await fetch("data/navdepth.bin").then((r) => r.ok ? r.arrayBuffer() : null).catch(() => null); if (b && OCEAN?.mask && b.byteLength === OCEAN.mask.rows * OCEAN.mask.cols) NAVD = new Uint8Array(b); }
  return !!NAVD;
}
const MG = () => OCEAN.mask;
const cellK = (p) => { const M = MG(), i = Math.round((p.lat - M.lat0) / M.dlat), j = Math.round((p.lon - M.lon0) / M.dlon); return i < 0 || j < 0 || i >= M.rows || j >= M.cols ? -1 : i * M.cols + j; };
const cellLL = (k) => { const M = MG(); return { lat: M.lat0 + Math.floor(k / M.cols) * M.dlat, lon: M.lon0 + (k % M.cols) * M.dlon }; };
const navDepth = (p) => { const k = cellK(p); if (k < 0 || !NAVD) return null; return NAVD[k] === 255 ? -1 : NAVD[k]; };
// passability: 0 land/too shallow, 1 ok, 2 ok but within 3 m of the limit (penalised), 3 hazard buffer (reef/shoal/wreck)
function buildPass() {
  const M = MG(), C = M.cols, n = M.rows * C, p = NP(), need = p.draft + p.margin, key = [need, p.hz, POIS.length].join();
  if (buildPass.k === key) return buildPass.v;
  const pass = new Uint8Array(n);
  for (let k = 0; k < n; k++) { const d = NAVD[k]; pass[k] = d === 255 || d < need ? 0 : d < need + 3 ? 2 : 1; }
  const cellM = M.dlat * 111000;
  for (const q of POIS) { if (q.k === "island") continue; const c = cellK(q); if (c < 0) continue; const i0 = Math.floor(c / C), j0 = c % C, r = Math.ceil(p.hz / cellM) + 1, kx = Math.cos(q.lat * DEG);
    for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= M.rows || j >= C) continue;
      const dm = Math.hypot(di * cellM, dj * cellM * kx); if (dm <= Math.max(p.hz, cellM * 0.6) && pass[i * C + j]) pass[i * C + j] = 3; } }
  buildPass.k = key; buildPass.v = pass; return pass;
}
class Heap { constructor() { this.k = []; this.f = []; }
  push(k, f) { const K = this.k, F = this.f; let i = K.length; K.push(k); F.push(f); while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; K[i] = K[p]; F[i] = F[p]; i = p; } K[i] = k; F[i] = f; }
  pop() { const K = this.k, F = this.f, top = K[0], lk = K.pop(), lf = F.pop(); if (K.length) { let i = 0; const n = K.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; K[i] = K[c]; F[i] = F[c]; i = c; } K[i] = lk; F[i] = lf; } return top; }
  get size() { return this.k.length; } }
const okP = (pass, k) => k >= 0 && (pass[k] === 1 || pass[k] === 2);
function snapCell(pass, k, maxR = 24) { const M = MG(), C = M.cols, i0 = Math.floor(k / C), j0 = k % C; let best = -1, bd = 1e9;
  for (let r = 1; r <= maxR; r++) { for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= M.rows || j >= C) continue; const kk = i * C + j; if (pass[kk] !== 1) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = kk; } } if (best >= 0) return best; }
  return -1; }
function astar(pass, s, g) {
  const M = MG(), C = M.cols, R = M.rows, n = R * C, G = new Float32Array(n).fill(Infinity), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n), h = new Heap();
  const gi = Math.floor(g / C), gj = g % C, kxRow = new Float32Array(R); for (let i = 0; i < R; i++) kxRow[i] = Math.cos((M.lat0 + i * M.dlat) * DEG) * M.dlon / M.dlat;
  const H = (i, j) => Math.hypot(i - gi, (j - gj) * kxRow[i]);
  G[s] = 0; h.push(s, H(Math.floor(s / C), s % C)); const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]; let it = 0;
  while (h.size) { const k = h.pop(); if (k === g) break; if (closed[k]) continue; closed[k] = 1; if (++it > 2e6) return null; const i = Math.floor(k / C), j = k % C;
    for (const [di, dj] of NB) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= R || b >= C) continue; const kk = a * C + b; if (closed[kk] || !okP(pass, kk)) continue;
      if (di && dj && (!okP(pass, i * C + b) || !okP(pass, a * C + j))) continue; // no corner cutting
      const step = Math.hypot(di, dj * kxRow[i]) * (pass[kk] === 2 ? 1.8 : 1), ng = G[k] + step; if (ng < G[kk]) { G[kk] = ng; from[kk] = k; h.push(kk, ng + H(a, b)); } } }
  if (from[g] < 0 && s !== g) return null; const path = [g]; let k = g; while (k !== s) { k = from[k]; path.push(k); } return path.reverse();
}
function los(pass, a, b, allowEnds) { const M = MG(), n = Math.ceil(Math.hypot((b.lat - a.lat) / M.dlat, (b.lon - a.lon) / M.dlon) * 3) + 1;
  for (let t = 0; t <= n; t++) { const u = t / n; if (allowEnds && (t === 0 || t === n)) continue; if (!okP(pass, cellK({ lat: a.lat + (b.lat - a.lat) * u, lon: a.lon + (b.lon - a.lon) * u }))) return false; } return true; }
function pull(pass, pts) { if (pts.length < 3) return pts; const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = Math.min(pts.length - 1, i + 600); while (j > i + 1 && !los(pass, pts[i], pts[j])) j--; out.push(pts[j]); i = j; } return out; }
function seaRoute(o, d) {
  const t0 = performance.now(), pass = buildPass(), c0 = cellK(o), c1 = cellK(d);
  if (c0 < 0 || c1 < 0) return { err: "النقطة خارج نطاق الخريطة (مياه الإمارات وما حولها)" };
  const s = okP(pass, c0) ? c0 : snapCell(pass, c0), g = okP(pass, c1) ? c1 : snapCell(pass, c1);
  if (s < 0) return { err: "نقطة البداية بعيدة عن مياه بعمق كافي حسب إعداداتك" }; if (g < 0) return { err: "الوجهة بعيدة عن مياه بعمق كافي حسب إعداداتك" };
  const path = astar(pass, s, g); if (!path) return { err: "ما لقينا مسار بحري آمن بهالإعدادات (جرّب تقلّل الغاطس أو هامش الأمان)" };
  let core = pull(pass, path.map(cellLL)); const pts = [], hz = new Set(), dHaz = pass[c1] === 3;
  if (okP(pass, c0) && (core.length < 2 || los(pass, o, core[1]))) core[0] = { lat: o.lat, lon: o.lon }; else { pts.push({ lat: o.lat, lon: o.lon }); hz.add(0); }
  pts.push(...core);
  if (okP(pass, c1) && los(pass, pts.at(-2) || pts[0], d, true)) pts[pts.length - 1] = { lat: d.lat, lon: d.lon };
  else if (!dHaz) { hz.add(pts.length - 1); pts.push({ lat: d.lat, lon: d.lon }); }
  let minD = 1e9; for (let l = 0; l < pts.length - 1; l++) { if (hz.has(l)) continue; const a = pts[l], b = pts[l + 1], n = Math.max(1, Math.ceil(haversine(a, b) / 0.3)); for (let t = 0; t <= n; t++) { const v = navDepth({ lat: a.lat + (b.lat - a.lat) * t / n, lon: a.lon + (b.lon - a.lon) * t / n }); if (v != null && v >= 0) minD = Math.min(minD, v); } }
  return { pts, hz: [...hz], km: pathKm(pts), dest: d, approach: dHaz ? haversine(pts.at(-1), d) * 1000 : 0, minD: minD < 1e9 ? minD : null, ms: Math.round(performance.now() - t0), at: Date.now() };
}

/* ---- map drawing ---- */
function drawNav(R, fix, i) { const s = map?.getSource("nav"); if (!s) return; if (!R) { s.setData(fc([])); return; }
  const f = []; const pts = R.pts;
  for (let l = 0; l < pts.length - 1; l++) { if (fix && l < i - 1) continue; const a = fix && l === i - 1 ? fix : pts[l]; f.push({ type: "Feature", properties: { h: R.hz.includes(l) ? 1 : 0 }, geometry: { type: "LineString", coordinates: [[a.lon, a.lat], [pts[l + 1].lon, pts[l + 1].lat]] } }); }
  pts.slice(1, -1).forEach((p, k) => { if (!fix || k + 1 >= i) f.push({ type: "Feature", properties: { w: 1 }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } }); });
  f.push({ type: "Feature", properties: { end: 1 }, geometry: { type: "Point", coordinates: [R.dest.lon, R.dest.lat] } });
  s.setData(fc(f)); }
function navLayers() { if (!map || map.getSource("nav")) return; map.addSource("nav", { type: "geojson", data: fc([]) });
  map.addLayer({ id: "nav-case", type: "line", source: "nav", filter: ["==", "$type", "LineString"], paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.9 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "nav-line", type: "line", source: "nav", filter: ["==", "$type", "LineString"], paint: { "line-color": ["case", ["==", ["get", "h"], 1], "#ff9f0a", "#0a84ff"], "line-width": 6 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "nav-wp", type: "circle", source: "nav", filter: ["has", "w"], paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": "#0a84ff", "circle-stroke-width": 2.5 } });
  map.addLayer({ id: "nav-end", type: "circle", source: "nav", filter: ["has", "end"], paint: { "circle-radius": 10, "circle-color": "#ff375f", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } }); }
function fitNav(R) { if (!map || !R) return; const b = new maplibregl.LngLatBounds(); R.pts.forEach((p) => b.extend([p.lon, p.lat])); const mob = innerWidth < 900;
  map.fitBounds(b, { padding: mob ? { top: 90, bottom: Math.round(innerHeight * 0.5), left: 40, right: 40 } : { top: 80, bottom: 80, left: 80, right: 600 }, duration: 600, maxZoom: 13 }); }

/* ---- destination search ---- */
function destList() { const o = here || (map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : { lat: 24.5, lon: 54.4 });
  const L = [...RECS.filter((r) => (r.kind === "spot" || r.kind === "catch") && r.lat != null).map((r) => ({ k: r.kind, n: r.name || spName(r.species, r.other) || "نقطة", lat: r.lat, lon: r.lon })),
    ...PORTS.map((p) => ({ k: "port", n: p.n, en: p.en, lat: p.lat, lon: p.lon })), ...POIS.filter((p) => p.k !== "island").map((p) => ({ k: p.k, n: p.n || POI_AR[p.k], lat: p.lat, lon: p.lon }))];
  const seen = new Set(); return L.filter((x) => { const key = x.n + "|" + x.lat.toFixed(2) + "|" + x.lon.toFixed(2); if (seen.has(key)) return false; seen.add(key); return true; })
    .map((x) => ({ ...x, km: haversine(o, x) })).sort((a, b) => a.km - b.km); }
const kindIcon = (k) => ({ port: "port", spot: "star", catch: "fish", pin: "target" }[k] || "target");
function searchSheet() { loadNavData().then(() => {
  let F = "all"; const m = openSheet(`<h2>وين بتروح؟</h2><div class="meta">اختار وجهة، أو اضغط مطوّلاً على البحر في الخريطة</div>
    <div class="searchbox">${I("search")}<input id="q" type="search" placeholder="ابحث: ميناء، مرسى، شعاب، حطام، نقطتك…" autocomplete="off"></div>
    <div class="chips" id="qf">${[["all", "الكل"], ["mine", "نقاطي"], ["port", "موانئ ومراسي"], ["struct", "شعاب وحطام"]].map(([k, t]) => `<button class="chip${k === "all" ? " on" : ""}" data-f="${k}">${t}</button>`).join("")}</div>
    <button class="row dest" id="qFront">${ic("front", "#ff453a")}<div class="m"><b>أقرب خط ماء</b><small>جبهة حرارة/كلوروفيل متوسطة أو قوية من بيانات اليوم</small></div>${I("chev", "chev")}</button>
    <div class="list" id="ql"></div>`);
  $("#qFront", m).onclick = () => nearestFront();
  const draw = () => { const q = $("#q", m).value.trim().toLowerCase(); const L = destList().filter((x) => (F === "all" || (F === "mine" && (x.k === "spot" || x.k === "catch")) || (F === "port" && x.k === "port") || (F === "struct" && ["reef", "wreck", "shoal"].includes(x.k))) && (!q || (x.n + " " + (x.en || "") + " " + KIND_AR[x.k]).toLowerCase().includes(q))).slice(0, 40);
    $("#ql", m).innerHTML = L.length ? L.map((x, n) => `<button class="row dest" data-n="${n}">${ic(kindIcon(x.k), x.k === "port" ? "var(--blue)" : x.k === "spot" || x.k === "catch" ? "var(--orange)" : "var(--teal, #30b0c7)")}<div class="m"><b>${esc(x.n)}</b><small>${KIND_AR[x.k] || ""}${x.en && x.en !== x.n ? " · " + esc(x.en) : ""}</small></div><span class="small" dir="ltr">${U.dist(x.km)}</span></button>`).join("") : `<p class="fine">ما فيه نتائج${!KEY && F === "mine" ? " — افتح الخزنة عشان تشوف نقاطك" : ""}</p>`;
    $$(".dest", m).forEach((b) => b.onclick = () => { const x = L[+b.dataset.n]; planNav({ lat: x.lat, lon: x.lon, n: x.n, k: x.k }); }); };
  $("#q", m).oninput = draw; $$("#qf .chip", m).forEach((c) => c.onclick = () => { F = c.dataset.f; $$("#qf .chip", m).forEach((x) => x.classList.toggle("on", x === c)); draw(); }); draw(); }); }

/* ---- planning ---- */
let PLAN = null;
async function planNav(dest, origin) {
  if (!(await loadNavData())) { toast("بيانات العمق ما تحمّلت"); return null; }
  if (!origin) { if (!here) await locate(false); origin = here ? { lat: here.lat, lon: here.lon, n: "موقعي" } : null; }
  if (!origin) { const c = map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : dest; const p = PORTS.map((x) => ({ ...x, d: haversine(c, x) })).sort((a, b) => a.d - b.d)[0]; origin = p ? { lat: p.lat, lon: p.lon, n: p.n } : null; }
  if (!origin) { toast("حدد نقطة انطلاق"); return null; }
  if (!dest.n) dest.n = KIND_AR[dest.k] || "الوجهة"; PLAN = { dest, origin, R: seaRoute(origin, dest) }; show("map"); planSheet(); if (PLAN.R.pts) { drawNav(PLAN.R); fitNav(PLAN.R); } return PLAN.R;
}
function planSheet() { const { dest, origin, R } = PLAN, p = NP(), c = R.pts ? routeCalc(R.pts) : null, P0 = prefs();
  const ports = PORTS.map((x) => ({ ...x, d: haversine(dest, x) })).sort((a, b) => a.d - b.d).slice(0, 25);
  const warn = [];
  if (R.hz?.includes(0)) warn.push("أول جزء (برتقالي) يمرّ في مياه ضحلة أو داخل مرسى ما تغطيه بيانات العمق: امشِ مع القناة والعلامات الملاحية.");
  if (R.hz?.length && R.hz.at(-1) === R.pts.length - 2 && R.hz.at(-1) !== 0) warn.push("آخر جزء (برتقالي) لمياه ضحلة/قريبة من البر: قرّب بحذر.");
  if (R.approach) warn.push(`الوجهة نفسها خطر ملاحي، فالمسار يوقف على بعد ~${Math.round(R.approach)} م منها.`);
  const m = openSheet(`<h2>${I("navi")} ${esc(dest.n || "نقطة على الخريطة")}</h2>
    <div class="meta">من <select id="nFrom" class="inline-select">${here ? `<option value="me"${origin.n === "موقعي" ? " selected" : ""}>موقعي</option>` : ""}${ports.map((x, n) => `<option value="${n}"${x.lat === origin.lat && x.lon === origin.lon ? " selected" : ""}>${esc(x.n)}</option>`).join("")}${origin.n !== "موقعي" && !ports.some((x) => x.lat === origin.lat && x.lon === origin.lon) ? `<option selected>${esc(origin.n)}</option>` : ""}</select></div>
    ${R.err ? `<div class="note warn">${I("warn")} ${esc(R.err)}</div>` : `
    <div class="grid g3"><div class="tile" style="min-height:0"><span class="lbl">${I("route")}المسافة</span><span class="big" style="font-size:20px">${U.dist(c.km)}</span><span class="small">${R.pts.length - 1} مرحلة</span></div>
    <div class="tile" style="min-height:0"><span class="lbl">${I("clock")}الوقت</span><span class="big" style="font-size:20px">${dur(c.h)}</span><span class="small">على ${P0.speed} عقدة</span></div>
    <div class="tile" style="min-height:0"><span class="lbl">${I("wave")}أقل عمق</span><span class="big" style="font-size:20px">${R.minD != null ? U.depth(R.minD) : "—"}</span><span class="small">تقديري</span></div></div>
    ${warn.map((w) => `<div class="note warn">${I("warn")} ${w}</div>`).join("")}`}
    <details class="card"><summary>${I("gear")} إعدادات السلامة: غاطس ${p.draft} م + هامش ${p.margin} م · بُعد عن الشعاب ${p.hz} م</summary>
      <div class="grid g3"><label class="f">الغاطس (م)<input id="nDr" type="number" step="0.1" min="0.3" max="6" value="${p.draft}"></label><label class="f">هامش (م)<input id="nMg" type="number" step="0.5" min="0" max="10" value="${p.margin}"></label><label class="f">بُعد الشعاب (م)<input id="nHz" type="number" step="50" min="0" max="2000" value="${p.hz}"></label></div>
      <button class="btn sm" id="nRe">${I("route")}أعد الحساب</button></details>
    <p class="fine">المسار يتجنّب البر والمياه الأضحل من (الغاطس + الهامش) حسب SRTM15+/GEBCO بدقة ~900 م، ويبعد عن الشعاب والحطام المعروفة في OpenStreetMap. العمق نسبةً لمتوسط سطح البحر، والجزر (المدّ المنخفض) ينقصه. <b>مساعد تقديري — لا يغني عن الخرائط البحرية الرسمية والمراقبة بعينك.</b></p>
    <div class="actions"><button class="btn primary" id="nGo" ${R.err ? "disabled" : ""}>${I("navi")}ابدأ الملاحة</button><button class="btn sm" id="nX">إلغاء</button></div>`, { keep: true, onClose: () => { if (!NAV.on) { PLAN = null; drawNav(null); } } });
  $("#nFrom", m).onchange = (e) => { const v = e.target.value; const o = v === "me" ? { lat: here.lat, lon: here.lon, n: "موقعي" } : ports[+v] ? { lat: ports[+v].lat, lon: ports[+v].lon, n: ports[+v].n } : origin; planNav(dest, o); };
  $("#nRe", m).onclick = () => { setNP({ draft: +$("#nDr", m).value || 1, margin: +$("#nMg", m).value || 0, hz: +$("#nHz", m).value || 0 }); planNav(dest, origin); };
  $("#nX", m).onclick = closeSheet; $("#nGo", m).onclick = () => startNav(R, { sim: !!startNav.sim });
}

/* ---- navigation mode ---- */
let NAV = { on: false, voice: localStorage.getItem("gf_voice") !== "0" };
const SAID = [];
function say(t) { SAID.push(t); NAV.prompt = t; if (NAV.voice) speak(t); }
const nmTxt = (km) => { const nm = km / 1.852; return units().dist === "nm" ? (nm < 0.3 ? `${Math.round(km * 1000)} متر` : `${nm.toFixed(1)} ميل بحري`) : (km < 1 ? `${Math.round(km * 1000)} متر` : `${km.toFixed(1)} كيلو`); };
function legPhrase(from, i) { const b = NAV.R.pts[i], d = Math.round(brg(from, b)); return `اتجه ${dirName(d)}، ${d} درجة، لمسافة ${nmTxt(haversine(from, b))}`; }
let boatM = null;
function boatMarker(f) { if (!map) return; if (!boatM) { const el = document.createElement("div"); el.className = "boat"; el.innerHTML = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#0a84ff" stroke="#fff" stroke-width="3"/><path d="M20 8 12 29l8-4 8 4z" fill="#fff"/></svg>`; boatM = new maplibregl.Marker({ element: el, rotationAlignment: "map" }); }
  boatM.setLngLat([f.lon, f.lat]).setRotation(f.cog ?? 0).addTo(map); }
function startNav(R, { sim = false } = {}) {
  if (!R?.pts) return; NAV = { on: true, R, i: 1, dest: R.dest, last: null, off: 0, lastRR: 0, warned: {}, voice: NAV.voice, follow: true, sim, t0: Date.now(), reroutes: 0 };
  closeSheet(); show("map"); document.body.classList.add("navigating"); wake(true); drawNav(R); if (map?.getLayer("hot")) map.setLayoutProperty("hot", "visibility", "none");
  const o = R.pts[0]; map?.easeTo({ center: [o.lon, o.lat], zoom: 13, duration: 700 });
  say(`بدأت الملاحة إلى ${R.dest.n || "الوجهة"}. ${legPhrase(o, 1)}`); renderHud();
  if (!sim && navigator.geolocation) NAV.watch = navigator.geolocation.watchPosition((p) => onFix({ lat: p.coords.latitude, lon: p.coords.longitude, sog: p.coords.speed != null ? p.coords.speed * 1.94384 : null, cog: p.coords.heading ?? null, acc: p.coords.accuracy, t: p.timestamp }), () => { NAV.gpsErr = true; renderHud(); }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
}
function endNav(msg) { if (NAV.watch != null) navigator.geolocation.clearWatch(NAV.watch); NAV = { on: false, voice: NAV.voice }; PLAN = null; document.body.classList.remove("navigating"); $("#navHud").innerHTML = ""; drawNav(null); boatM?.remove(); applyLayers();
  if (!TRACK.on && !ANCHOR.on) wake(false); map?.easeTo({ bearing: 0, duration: 500 }); if (msg) toast(msg); }
function xte(p, a, b) { const kx = 111.32 * Math.cos(p.lat * DEG), ky = 110.57, ax = (a.lon - p.lon) * kx, ay = (a.lat - p.lat) * ky, bx = (b.lon - p.lon) * kx, by = (b.lat - p.lat) * ky, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? -(ax * dx + ay * dy) / L : 1, tc = clamp(t); return { d: Math.hypot(ax + tc * dx, ay + tc * dy), t }; }
function remainKm(f) { const p = NAV.R.pts; let k = haversine(f, p[NAV.i]); for (let l = NAV.i; l < p.length - 1; l++) k += haversine(p[l], p[l + 1]); return k; }
function onFix(f) {
  if (!NAV.on) return; f = { ...f, t: f.t || Date.now() }; const prev = NAV.last;
  if (prev) { const dk = haversine(prev, f), dt = (f.t - prev.t) / 3600000; if (f.sog == null && dt > 0) f.sog = dk / 1.852 / dt; if (f.cog == null) f.cog = dk > 0.005 ? brg(prev, f) : prev.cog; }
  NAV.last = f; NAV.gpsErr = false; here = { lat: f.lat, lon: f.lon, acc: f.acc }; const p = NAV.R.pts;
  // waypoint advance
  while (NAV.i < p.length - 1) { const x = xte(f, p[NAV.i - 1], p[NAV.i]); if (haversine(f, p[NAV.i]) < 0.15 || x.t > 1) { NAV.i++; say(legPhrase(f, NAV.i)); } else break; }
  const dWp = haversine(f, p[NAV.i]);
  if (NAV.i === p.length - 1 && dWp < 0.12) { say(`وصلت ${NAV.dest.n || "وجهتك"}`); const n = NAV.dest.n; endNav(`وصلت ${n || "وجهتك"} 🎣`); return; }
  if (NAV.i < p.length - 1 && dWp < 0.93 && !NAV.warned["pre" + NAV.i]) { NAV.warned["pre" + NAV.i] = 1; const nb = Math.round(brg(p[NAV.i], p[NAV.i + 1])); say(`بعد ${nmTxt(dWp)}، غيّر اتجاهك إلى ${dirName(nb)}، ${nb} درجة`); }
  // off-route → reroute
  const x = xte(f, p[NAV.i - 1], p[NAV.i]); NAV.xte = x.d; NAV.off = x.d > 0.4 ? NAV.off + 1 : 0;
  if (NAV.off >= 2 && Date.now() - NAV.lastRR > 15000) { NAV.lastRR = Date.now(); const R2 = seaRoute(f, NAV.dest);
    if (R2.pts) { R2.dest = NAV.dest; NAV.R = R2; NAV.i = 1; NAV.off = 0; NAV.reroutes++; say(`طلعت عن المسار. حسبت لك مسار جديد. ${legPhrase(f, 1)}`); } else say("طلعت عن المسار وما قدرت أحسب مسار جديد. ارجع للخط الأزرق"); }
  // shallow / land under the boat
  const dHere = navDepth(f), need = NP().draft + NP().margin; NAV.shallow = dHere != null && dHere < need;
  if (NAV.shallow && Date.now() - (NAV.warned.sh || 0) > 60000) { NAV.warned.sh = Date.now(); say("انتبه، العمق هنا قليل حسب الخريطة"); }
  boatMarker(f); drawNav(NAV.R, f, NAV.i);
  if (NAV.follow && map) map.easeTo({ center: [f.lon, f.lat], bearing: f.sog > 1.5 && f.cog != null ? f.cog : map.getBearing(), duration: 600, offset: [0, innerWidth < 900 ? 120 : 0] });
  renderHud();
}
function renderHud() { const h = $("#navHud"); if (!h || !NAV.on) return; const p = NAV.R.pts, f = NAV.last || p[0], wp = p[NAV.i], b = brg(f, wp), moving = f.sog > 1.5 && f.cog != null;
  const rel = moving ? ((b - f.cog + 540) % 360) - 180 : null, km = remainKm(f), sp = moving ? f.sog : prefs().speed, eta = new Date(Date.now() + (km / 1.852 / Math.max(sp, 1)) * 3600000);
  const turn = rel == null ? `اتجه ${dirName(b)}` : Math.abs(rel) < 12 ? "كمل سيدا" : rel > 0 ? `لف يمين ${Math.round(rel)}°` : `لف يسار ${Math.round(-rel)}°`;
  h.innerHTML = `<div class="hud-top glass${NAV.off ? " off" : ""}"><div class="hud-arrow" style="transform:rotate(${rel ?? b}deg)">${I("navi")}</div>
      <div class="hud-main"><b>${turn}</b><span dir="ltr" class="hud-brg">${Math.round(b)}°${moving ? "" : " T"}</span><small>${NAV.i < p.length - 1 ? "للنقطة التالية" : "للوجهة"} · ${U.dist(haversine(f, wp))}</small></div></div>
    ${NAV.off ? `<div class="hud-banner red glass">${I("info")} طلعت عن المسار (${Math.round((NAV.xte || 0) * 1000)} م) — جاري إعادة الحساب</div>` : NAV.shallow ? `<div class="hud-banner orange glass">${I("info")} عمق قليل هنا حسب الخريطة</div>` : NAV.gpsErr ? `<div class="hud-banner orange glass">${I("info")} ما فيه إشارة GPS</div>` : ""}
    <div class="hud-bot glass">${NAV.prompt ? `<div class="hud-say">${I("vol")} <span>${esc(NAV.prompt)}</span></div>` : ""}<div class="hud-stats"><div><b dir="ltr">${hmLtr(eta)}</b><small>الوصول</small></div><div><b>${U.dist(km)}</b><small>المتبقي</small></div><div><b dir="ltr">${f.sog != null ? f.sog.toFixed(1) : "—"}</b><small>عقدة SOG</small></div></div>
      <div class="hud-btns"><button class="round glass" id="hVoice" aria-label="الصوت">${I(NAV.voice ? "vol" : "mute")}</button><button class="round glass" id="hFollow" aria-label="تتبّع">${I("location")}</button><button class="btn sm" id="hHome">${I("home")}رجوع للميناء</button><button class="btn danger sm" id="hEnd">إنهاء</button></div>
      <p class="fine hud-fine">مساعد تقديري · لا يغني عن الخرائط البحرية الرسمية</p></div>`;
  $("#hEnd").onclick = () => endNav("انتهت الملاحة"); $("#hVoice").onclick = () => { NAV.voice = !NAV.voice; localStorage.setItem("gf_voice", NAV.voice ? "1" : "0"); if (!NAV.voice) stopSpeak(); renderHud(); };
  $("#hFollow").onclick = () => { NAV.follow = true; if (NAV.last) map.easeTo({ center: [NAV.last.lon, NAV.last.lat], zoom: 13 }); }; $("#hHome").onclick = returnToPort; }
function returnToPort() { const f = NAV.last || here; if (!f) { toast("ننتظر GPS"); return; } loadNavData().then(() => {
  const c = PORTS.map((x) => ({ ...x, d: haversine(f, x) })).sort((a, b) => a.d - b.d).slice(0, 5).map((x) => ({ x, R: seaRoute(f, { lat: x.lat, lon: x.lon, n: x.n }) })).filter((y) => y.R.pts).sort((a, b) => a.R.km - b.R.km)[0];
  if (!c) { toast("ما لقينا مسار لأقرب ميناء"); return; } c.R.dest = { lat: c.x.lat, lon: c.x.lon, n: c.x.n, k: "port" };
  const sim = NAV.sim; startNav(c.R, { sim }); say(`راجعين إلى ${c.x.n}. ${legPhrase(f, 1)}`); if (NAV.last == null) NAV.last = f; renderHud(); }); }
// long-press (touch) / right-click (desktop) on the sea → navigate there
let LP = 0;
function bindLongPress() { const el = map.getCanvasContainer(); let t = null, s = null;
  const fire = (x, y) => { LP = Date.now(); haptic(15); const r = el.getBoundingClientRect(), ll = map.unproject([x - r.left, y - r.top]); planNav({ lat: ll.lat, lon: ll.lng, n: `نقطة ${ll.lat.toFixed(3)}, ${ll.lng.toFixed(3)}`, k: "pin" }); };
  el.addEventListener("touchstart", (e) => { if (e.touches.length !== 1 || NAV.on) return; s = e.touches[0]; t = setTimeout(() => fire(s.clientX, s.clientY), 550); }, { passive: true });
  el.addEventListener("touchmove", (e) => { if (t && Math.hypot(e.touches[0].clientX - s.clientX, e.touches[0].clientY - s.clientY) > 10) { clearTimeout(t); t = null; } }, { passive: true });
  ["touchend", "touchcancel"].forEach((ev) => el.addEventListener(ev, () => { clearTimeout(t); t = null; }));
  map.on("contextmenu", (e) => { if (NAV.on) return; e.preventDefault?.(); LP = Date.now(); planNav({ lat: e.lngLat.lat, lon: e.lngLat.lng, n: `نقطة ${e.lngLat.lat.toFixed(3)}, ${e.lngLat.lng.toFixed(3)}`, k: "pin" }); });
  map.on("dragstart", () => { if (NAV.on) NAV.follow = false; }); }

/* ================= AI assistant (Gemini via owner-only Edge Function; estimates, never invented facts) ================= */
Object.assign(P, {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m10 13 4-4"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  bot: '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M9 12h.01M15 12h.01M9.5 16h5"/>',
});
const AIERR = (e) => { const m = String(e?.message || e); return m === "unauthorized" ? "جلستك انتهت أو مو مصرّح لها بالذكاء الاصطناعي. سجّل خروج ودخول من جديد."
  : m === "ai_unavailable" ? "خدمة الذكاء الاصطناعي مشغولة الحين، حاول بعد شوي." : /fetch|network|Failed/i.test(m) ? "ما فيه اتصال بالخدمة." : m; };
// one Arabic TTS path for nav prompts and assistant answers: native plugin in the APK, Web Speech in the browser
function speak(t) { try { const N = window.GFNative; if (N?.tts) return N.tts(t);
  if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "ar-SA"; const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("ar")); if (v) u.voice = v; speechSynthesis.speak(u); } catch {} }
function stopSpeak() { try { window.GFNative?.ttsStop ? window.GFNative.ttsStop() : speechSynthesis.cancel(); } catch {} }

// ---- context the assistant sees: only numbers the app already computed (no secrets, no raw vault) ----
function aiOrigin(port) { if (here && !port) return { lat: here.lat, lon: here.lon, n: "موقعي" }; const c = defAt();
  const p = PORTS.map((x) => ({ ...x, d: haversine(c, x) })).sort((a, b) => a.d - b.d)[0]; return p ? { lat: p.lat, lon: p.lon, n: p.n } : { lat: c.lat, lon: c.lon, n: c.name }; }
async function ensureHere() { if (!here) await Promise.race([locate(false), new Promise((r) => setTimeout(r, 6000))]).catch(() => {}); }
const verifiedRules = () => RULES.filter((r) => r.status === "verified").map((r) => ({ text: r.text, species: r.species.map((s) => spName(s)), months: r.months, source: r.src?.[0] }));
function nearName(p) { const s = RECS.filter((r) => r.kind === "spot" && r.lat != null).map((r) => ({ n: r.name, d: haversine(p, r) })).sort((a, b) => a.d - b.d)[0];
  if (s && s.d < 3) return s.n; const q = POIS.filter((x) => x.k !== "island" && x.n).map((x) => ({ n: x.n, d: haversine(p, x) })).sort((a, b) => a.d - b.d)[0]; return q && q.d < 5 ? `قرب ${q.n}` : `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`; }
const catchBrief = (cs) => cs.map((c) => { const d = new Date(c.t); return { species: spName(c.species, c.other), date: d.toISOString().slice(0, 10), hour_dubai: +d.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Dubai" }),
  moon: c.moon != null ? MOON8[c.moon] : null, tide: c.tide, pressure: c.pressure, ptrend_3h: c.ptrend, wind_kmh: c.wind, wave_m: c.wave, sst_c: c.sst, depth_m: c.depth, length_cm: c.length, weight_kg: c.weight, bait: c.bait || null, released: !!c.released,
  area: c.lat != null ? nearName(c) : null }; });
async function todayCtx() { const at = defAt(); if (!WX || WX.at.lat !== at.lat || WX.at.lon !== at.lon) WX = (await loadWx(at)) || WX; if (!WX) return { place: at.name, offline_weather: true };
  const rows = WX.rows, ci = curIdx(WX), r = rows[ci], day = r.t.slice(0, 10), hs = hourScores(WX, at, day), now = new Date(), sun = sunTimes(now, at.lat, at.lon), mo = moon(now);
  const tom = hourScores(WX, at, new Date(+dubai(day + "T12") + 864e5).toISOString().slice(0, 10));
  return { place: at.name, now_dubai: r.t, conditions: { air_c: r.temp, sst_c: r.sst, wind_kmh: r.wind, gust_kmh: r.gust, wind_dir: dirName(r.dir), wave_m: r.wave, pressure_hpa: r.p, pressure_trend_3h: rows[ci - 3]?.p != null ? +(r.p - rows[ci - 3].p).toFixed(1) : null, weather: WCODE(r.code) },
    tide_now: tideStage(rows, ci), tide_next: tideExtrema(rows.slice(ci, ci + 30)).slice(0, 4).map((x) => ({ at: x.t.slice(11, 16), type: x.hi ? "مد عالي" : "جزر", level_m: x.v })),
    moon: mo.name, sunrise: hmLtr(sun.sunrise), sunset: hmLtr(sun.sunset),
    hours_today: hs.filter((h) => h.t >= r.t.slice(0, 13)).map((h) => ({ t: h.t.slice(11, 16), score: h.s, unsafe: h.unsafe, solunar: h.inMaj ? "رئيسية" : h.inMin ? "ثانوية" : "" })),
    best_tomorrow: tom.length ? (({ t, s, unsafe }) => ({ t, score: s, unsafe }))(tom.reduce((a, x) => x.s > a.s ? x : a)) : null,
    user_limits: { max_wind_kmh: prefs().wind, max_wave_m: prefs().wave, depth_range_m: [prefs().dmin, prefs().dmax], boat_speed_kn: prefs().speed, fuel_lph: prefs().lph },
    sources: "Open-Meteo للطقس والموج والمد النموذجي؛ حسابات فلكية محلية للقمر والشمس؛ الدرجة من معادلة التطبيق" }; }
// candidate spots: saved spots + hotspot peaks + charted reefs/wrecks, each with a real sea route from the origin
async function candidates(o, n = 6) { await loadNavData(); if (!HOT) recomputeHot(); const L = [];
  RECS.filter((r) => r.kind === "spot" && r.lat != null).forEach((r) => L.push({ id: "s" + r.id, name: r.name || "نقطتي", kind: "نقطتي", lat: r.lat, lon: r.lon }));
  POIS.filter((p) => ["reef", "wreck"].includes(p.k)).forEach((p, k) => L.push({ id: "p" + k, name: p.n || `${POI_AR[p.k]} ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`, kind: POI_AR[p.k], lat: p.lat, lon: p.lon }));
  if (HOT && OCEAN) { const { rows, cols, step, lat0, lon0 } = OCEAN, peaks = [];
    for (let i = 1; i < rows - 1; i++) for (let j = 1; j < cols - 1; j++) { const s = HOT.score[i * cols + j]; if (s < HOT.p98) continue; let mx = true;
      for (let a = -1; a <= 1 && mx; a++) for (let b = -1; b <= 1; b++) if ((a || b) && HOT.score[(i + a) * cols + j + b] > s) { mx = false; break; } if (mx) peaks.push({ lat: lat0 + i * step, lon: lon0 + j * step, s }); }
    peaks.sort((a, b) => b.s - a.s).forEach((p, k) => L.push({ id: "h" + k, name: `بقعة مرجّحة ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`, kind: "بقعة مرجّحة", lat: p.lat, lon: p.lon })); }
  const near = L.map((x) => ({ ...x, km: haversine(o, x) })).filter((x) => x.km < 70).map((x) => ({ ...x, ex: explain(x.lat, x.lon) }))
    .map((x) => ({ ...x, rank: (x.ex?.pct ?? 30) + (x.kind === "نقطتي" ? 15 : 0) - x.km * 0.6 })).sort((a, b) => b.rank - a.rank).slice(0, n * 2);
  const out = []; for (const x of near) { if (out.length >= n) break; const R = seaRoute(o, x); if (!R.pts) continue; const c = routeCalc(R.pts);
    out.push({ id: x.id, name: x.name, kind: x.kind, lat: +x.lat.toFixed(4), lon: +x.lon.toFixed(4), hotspot_pct: x.ex?.pct ?? null, hotspot_score: x.ex ? Math.round(x.ex.s * 100) : null, depth_m: x.ex?.d ?? null, sst_c: x.ex?.sst ?? null, chlorophyll: x.ex?.chl ?? null,
      near_structure: x.ex?.near ? `${x.ex.near.n || POI_AR[x.ex.near.k]} (${x.ex.near.km.toFixed(1)} كم)` : null, my_catches_within_10km: x.ex?.nc ?? 0,
      route_nm: +(R.km / 1.852).toFixed(1), route_eta_min: c.h != null ? Math.round(c.h * 60) : null, route_fuel_l: c.fuel != null ? Math.round(c.fuel) : null, route_min_depth_m: R.minD, route_has_unverified_legs: !!R.hz?.length, _R: R }); }
  return out; }
async function fullCtx(withCands) { const o = aiOrigin(), base = await todayCtx(); const cs = RECS.filter((x) => x.kind === "catch").sort((a, b) => b.t - a.t).slice(0, 25);
  const ctx = { ...base, origin: o.n, selected_spot: AT ? { name: AT.name, lat: AT.lat, lon: AT.lon, hotspot: explain(AT.lat, AT.lon)?.pct ?? null } : null,
    my_spots: RECS.filter((r) => r.kind === "spot" && r.lat != null).slice(0, 20).map((r) => ({ name: r.name, km_from_origin: +haversine(o, r).toFixed(1), depth_m: depthAt(r.lat, r.lon) })),
    my_recent_catches: catchBrief(cs), navigation: { draft_m: NP().draft, margin_m: NP().margin, hazard_buffer_m: NP().hz, active: NAV.on ? { to: NAV.dest?.n, remaining_km: NAV.last ? +remainKm(NAV.last).toFixed(1) : null } : null },
    verified_rules: verifiedRules(), vault_locked: !KEY };
  if (withCands) ctx.candidates = (await candidates(o)).map(({ _R, ...c }) => c);
  return ctx; }

// ---- view ----
let CHAT = [], AIPLAN = null, REC = null;
function bubble(m) { if (m.role === "user") return `<div class="msg mine">${m.voice ? I("mic") : ""}${esc(m.text)}</div>`;
  if (m.err) return `<div class="msg bot err">${I("warn")} ${esc(m.text)}</div>`;
  if (m.wait) return `<div class="msg bot wait"><span class="dots"><i></i><i></i><i></i></span>${esc(m.text || "")}</div>`;
  return `<div class="msg bot"><div>${esc(m.text)}</div>${m.spot || m.window ? `<div class="msg-tags">${m.spot ? `<span class="tag">${I("pin")}${esc(m.spot)}</span>` : ""}${m.window ? `<span class="tag" dir="auto">${I("clock")}${esc(m.window)}</span>` : ""}</div>` : ""}<div class="msg-act"><button class="mini" data-say="${CHAT.indexOf(m)}">${I("vol")}اسمع</button>${(m.follow || []).map((f) => `<button class="mini fu">${esc(f)}</button>`).join("")}</div></div>`; }
function renderChat() { const c = $("#chat"); if (!c) return; c.innerHTML = CHAT.length ? CHAT.map(bubble).join("") : `<div class="chat-empty">${I("bot")}<b>اسألني عن الصيد اليوم</b><small>أجاوب من أرقام التطبيق: الطقس والمد والقمر والبقع وسجلّك. وما أخترع أنظمة أو نصايح طُعم بدون مصدر.</small>
    <div class="chips" style="justify-content:center">${["وين أروح اليوم وإيمتى؟", "الجو يسمح أطلع العصر؟", "شو أحسن بقعة قريبة مني؟", "شو اللي يتكرر في صيداتي؟"].map((q) => `<button class="chip fu">${q}</button>`).join("")}</div></div>`;
  paintIcons(c); $$(".fu", c).forEach((b) => b.onclick = () => ask(b.textContent)); $$("[data-say]", c).forEach((b) => b.onclick = () => speak(CHAT[+b.dataset.say].text));
  requestAnimationFrame(() => { const v = $("#v-ai"); v.scrollTop = v.scrollHeight; }); }
function renderAI() { const v = $("#v-ai"); if (!v) return;
  v.innerHTML = `<div class="ai-hero"><div class="ai-orb">${I("sparkles")}</div><h1>المساعد الذكي</h1><p>Gemini عبر خادم خاص بحسابك · تقديرات وليست ضمان</p></div>
    <div class="ai-actions"><button class="ai-act" id="aPlan">${ic("route", "linear-gradient(135deg,#0a84ff,#5e5ce6)")}<b>خطة اليوم</b><small>أفضل بقعة ووقت ومسار</small></button>
      <button class="ai-act" id="aFish">${ic("camera", "linear-gradient(135deg,#30d158,#0a84ff)")}<b>تعرّف على سمكة</b><small>من صورة</small><input id="aFishIn" type="file" accept="image/*" capture="environment" hidden></button>
      <button class="ai-act" id="aBird">${ic("bird", "linear-gradient(135deg,#64d2ff,#0a84ff)")}<b>رادار الطيور</b><small>صوّر سرب يغوص</small><input id="aBirdIn" type="file" accept="image/*" capture="environment" hidden></button>
      <button class="ai-act" id="aFront">${ic("front", "linear-gradient(135deg,#ff453a,#30d158)")}<b>أقرب خط ماء</b><small>وجّهني له</small></button>
      <button class="ai-act" id="aLog">${ic("chart", "linear-gradient(135deg,#ff9f0a,#ff375f)")}<b>لخّص سجلّي</b><small>أنماط صيداتك</small></button></div>
    <div id="aiPlan"></div><div id="aiBirdOut"></div><div id="aiFishOut"></div><div id="aiLogOut"></div>
    <div class="section-h">${I("bot")}المحادثة</div><div id="chat" class="chat"></div><div style="height:96px"></div>
    <div class="composer glass"><button class="round mic" id="aMic" aria-label="سؤال صوتي">${I("mic")}</button><input id="aQ" placeholder="اسأل… مثلاً: وين أروح العصر؟" enterkeyhint="send"><button class="round send" id="aSend" aria-label="إرسال">${I("send")}</button></div>`;
  paintIcons(v); renderChat(); if (AIPLAN) planCard(AIPLAN);
  $("#aSend", v).onclick = () => { const q = $("#aQ").value.trim(); if (q) { $("#aQ").value = ""; ask(q); } }; $("#aQ", v).onkeydown = (e) => { if (e.key === "Enter") $("#aSend").click(); };
  $("#aMic", v).onclick = toggleRec; $("#aPlan", v).onclick = runPlan; $("#aLog", v).onclick = () => runLogSummary($("#aiLogOut"));
  $("#aFish", v).onclick = (e) => { if (e.target.id !== "aFishIn") $("#aFishIn").click(); };
  $("#aBird", v).onclick = (e) => { if (e.target.id !== "aBirdIn") $("#aBirdIn").click(); }; $("#aFront", v).onclick = () => nearestFront();
  $("#aBirdIn", v).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; birdScan(await resizePhoto(f), $("#aiBirdOut")); };
  $("#aFishIn", v).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const ph = await resizePhoto(f); fishId(ph, $("#aiFishOut"), true); }; }
async function ask(q, audio) {
  if (!navigator.onLine) return toast("المساعد يحتاج اتصال"); const hist = CHAT.filter((m) => !m.wait && !m.err).slice(-10).map((m) => ({ role: m.role, text: m.text }));
  const um = { role: "user", text: q || "🎙️ …", voice: !!audio }; CHAT.push(um, { role: "bot", wait: true, text: audio ? "أسمع سؤالك…" : "" }); renderChat();
  try { await ensureHere(); const context = await fullCtx(/وين|بقع|مكان|أروح|اروح|اطلع|أطلع|قريب/.test(q || "") || !!audio); const j = await ai(audio ? { action: "voice", audio, history: hist, context } : { action: "chat", question: q, history: hist, context }); const d = j.data || {};
    if (audio) um.text = d.transcript || "(ما وضح الصوت)"; CHAT.pop(); CHAT.push({ role: "bot", text: d.answer || "—", spot: d.spot, window: d.window, follow: (d.follow_ups || []).slice(0, 3) });
    if (audio && d.answer) speak(d.answer); }
  catch (e) { CHAT.pop(); CHAT.push({ role: "bot", err: true, text: AIERR(e) }); } renderChat(); }
// ---- voice question: record → 16 kHz mono WAV → Gemini transcribes + answers (works in browsers and the Android WebView) ----
async function toggleRec() { const b = $("#aMic"); if (REC) { REC.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia) return toast("المايك غير مدعوم هنا"); let st;
  try { st = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); } catch { return toast("اسمح بالمايك من الإعدادات"); }
  stopSpeak(); const mr = new MediaRecorder(st), parts = []; REC = mr; b.classList.add("rec"); b.innerHTML = I("stop"); haptic(10); const t0 = Date.now(), cap = setTimeout(() => mr.state === "recording" && mr.stop(), 30000);
  mr.ondataavailable = (e) => e.data.size && parts.push(e.data);
  mr.onstop = async () => { clearTimeout(cap); st.getTracks().forEach((t) => t.stop()); REC = null; b.classList.remove("rec"); b.innerHTML = I("mic"); haptic(6);
    if (Date.now() - t0 < 700) return toast("اضغط، تكلّم، واضغط مرة ثانية"); try { ask(null, await toWav(new Blob(parts, { type: mr.mimeType }))); } catch { toast("ما قدرت أقرا التسجيل"); } };
  mr.start(); toast("أسمعك… اضغط مرة ثانية لما تخلص"); }
async function toWav(blob) { const ac = new (window.AudioContext || window.webkitAudioContext)(), buf = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close?.();
  const sr = 16000, n = Math.ceil(buf.duration * sr), off = new OfflineAudioContext(1, n, sr), src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start(); const pcm = (await off.startRendering()).getChannelData(0);
  const dv = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, s) => [...s].forEach((c, k) => dv.setUint8(o + k, c.charCodeAt(0)));
  w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
  for (let k = 0; k < n; k++) dv.setInt16(44 + k * 2, Math.max(-1, Math.min(1, pcm[k])) * 0x7fff, true);
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(new Blob([dv], { type: "audio/wav" })); }); }
// ---- daily AI trip plan: the app computes candidates + real sea routes, the AI only chooses and explains ----
async function runPlan() { const box = $("#aiPlan"); if (!box) return; if (!navigator.onLine) return toast("الخطة تحتاج اتصال");
  box.innerHTML = `<div class="card ai-card"><div class="msg bot wait"><span class="dots"><i></i><i></i><i></i></span>أحسب المسارات وأقارن البقع…</div></div>`;
  try { await ensureHere(); let o = aiOrigin(), cands = await candidates(o); if (!cands.length && here) { o = aiOrigin(true); cands = await candidates(o); } const base = { ...(await fullCtx(false)), origin: o.n };
    if (!cands.length) throw new Error("ما لقيت بقع قريبة بمسار بحري آمن حسب إعداداتك");
    const j = await ai({ action: "plan", context: { ...base, candidates: cands.map(({ _R, ...c }) => c) } }); AIPLAN = { d: j.data || {}, cands, o, at: Date.now() }; planCard(AIPLAN); }
  catch (e) { box.innerHTML = `<div class="note warn">${I("warn")}<div>${esc(AIERR(e))}</div></div>`; paintIcons(box); } }
function planCard({ d, cands, o }) { const box = $("#aiPlan"); if (!box) return; const c = cands.find((x) => x.id === d.spot_id), alt = cands.find((x) => x.id === d.alternative?.spot_id), go = { "نعم": "ok", "بحذر": "warn", "لا": "bad" }[d.go] || "info";
  box.innerHTML = `<div class="card ai-card"><h3>${I("sparkles")}خطة اليوم من ${esc(o.n)}</h3><div class="note ${go}"><b style="font-size:17px">${esc(d.go || "")}</b><div>${esc(d.headline || "")}</div></div>
    ${c ? `<div class="plan-spot">${ic("target", "var(--blue)")}<div class="m"><b>${esc(c.name)}</b><small>${c.route_nm} ميل بحري · ${c.route_eta_min ?? "—"} د · أقل عمق ${c.route_min_depth_m ?? "—"} م${c.hotspot_score != null ? ` · ترجيح ${c.hotspot_score}/100` : ""}</small></div><span class="tag big" dir="ltr">${I("clock")}${esc(d.window || "")}</span></div>` : ""}
    ${(d.why || []).length ? `<div class="section-h" style="margin-top:12px">ليش؟</div><ul class="ai-list">${d.why.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${d.route_note ? `<p class="fine">${I("route")} ${esc(d.route_note)}</p>` : ""}
    ${(d.plan || []).length ? `<div class="section-h">الجدول</div><ol class="ai-steps">${d.plan.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
    ${(d.safety || []).map((x) => `<div class="note warn">${I("warn")}<div>${esc(x)}</div></div>`).join("")}
    ${alt ? `<p class="fine">البديل: <b>${esc(alt.name)}</b> — ${esc(d.alternative.why || "")}</p>` : ""}
    <div class="grid g2" style="margin-top:10px">${c ? `<button class="btn primary" id="pGo">${I("navi")}ارسم المسار</button>` : ""}<button class="btn tinted" id="pRe">${I("sparkles")}خطة جديدة</button></div>
    <p class="fine">الأرقام من التطبيق (Open-Meteo، GEBCO، OSM) والاختيار والشرح من الذكاء الاصطناعي. تقدير وليس ضمان، ولا يغني عن الخرائط البحرية الرسمية.</p></div>`;
  paintIcons(box); if (c) $("#pGo", box).onclick = () => planNav({ lat: c.lat, lon: c.lon, n: c.name, k: "pin" }, here ? null : { lat: o.lat, lon: o.lon, n: o.n }); $("#pRe", box).onclick = runPlan; }
// ---- fish photo ID with explicit confidence ----
function fishCard(d) { const cf = clamp(d.confidence || 0), col = cf >= 0.75 ? "var(--green)" : cf >= 0.5 ? "var(--yellow)" : "var(--orange)", alts = (d.alternatives || []).filter((a) => a.name && a.name !== "غير ذلك");
  return `<div class="fish-res"><div class="fr-h"><b>${esc(d.common_name_ar || d.species || "غير معروف")}</b>${d.scientific_guess ? `<i dir="ltr">${esc(d.scientific_guess)}</i>` : ""}</div>
    <div class="conf"><span>الثقة</span>${bar(cf, col)}<b>${Math.round(cf * 100)}٪</b></div><small class="conf-w">${cf >= 0.75 ? "ثقة عالية نسبياً" : cf >= 0.5 ? "ثقة متوسطة" : "ثقة ضعيفة، لا تعتمد عليها"}</small>
    ${(d.features || []).length ? `<ul class="ai-list">${d.features.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${alts.length ? `<p class="fine">احتمالات ثانية: ${alts.map((a) => `${esc(a.name)} (${Math.round((a.confidence || 0) * 100)}٪)`).join("، ")}</p>` : ""}
    ${d.notes ? `<p class="fine">${esc(d.notes)}</p>` : ""}<div class="note warn">${I("info")}<div>هذا <b>تقدير</b> من الذكاء الاصطناعي من الصورة، وممكن يغلط بين الأنواع المتشابهة. تأكد بنفسك قبل ما تحتفظ بالسمكة أو تسجلها.</div></div></div>`; }
async function fishId(photo, out, standalone) { if (!navigator.onLine) { toast("التعرّف يحتاج اتصال"); return null; }
  out.innerHTML = `<div class="card ai-card"><img src="${photo}" class="photo"><div class="msg bot wait"><span class="dots"><i></i><i></i><i></i></span>أحلل الصورة…</div></div>`;
  try { const d = (await ai({ action: "fishid", image: photo })).data || {}; out.innerHTML = `<div class="card ai-card">${standalone ? `<img src="${photo}" class="photo">` : ""}${fishCard(d)}${standalone ? `<button class="btn tinted block" id="fLog">${I("fish")}سجّلها كصيدة</button>` : ""}</div>`;
    paintIcons(out); if (standalone) $("#fLog", out).onclick = () => locate(false).then((h) => catchSheet({ ...(h || { lat: null, lon: null }), photo, guess: d })); return d; }
  catch (e) { out.innerHTML = `<div class="note warn">${I("warn")}<div>تعذّر التعرّف: ${esc(AIERR(e))}</div></div>`; paintIcons(out); return null; } }
// ---- catch-log smart summary ----
async function runLogSummary(out) { if (!out) return; if (!KEY) return needKey(() => runLogSummary(out)); const cs = RECS.filter((x) => x.kind === "catch");
  if (cs.length < 2) { out.innerHTML = `<div class="note info">${I("info")}<div>سجّل صيدتين على الأقل عشان أقدر ألقى أنماط. (عندك ${cs.length})</div></div>`; paintIcons(out); return; }
  if (!navigator.onLine) return toast("الملخص يحتاج اتصال");
  out.innerHTML = `<div class="card ai-card"><div class="msg bot wait"><span class="dots"><i></i><i></i><i></i></span>أحلل ${cs.length} صيدة…</div></div>`;
  try { const d = (await ai({ action: "logsummary", log: catchBrief(cs.sort((a, b) => b.t - a.t).slice(0, 150)) })).data || {}; const S = { "قوي": "var(--green)", "متوسط": "var(--yellow)", "ضعيف": "var(--orange)" };
    out.innerHTML = `<div class="card ai-card"><h3>${I("sparkles")}ملخص سجلّك (${cs.length} صيدة)</h3><p style="line-height:1.7;margin:0 0 8px">${esc(d.summary || "")}</p>
      ${(d.patterns || []).map((p) => `<div class="pat"><span class="dot" style="background:${S[p.strength] || "var(--fg2)"}"></span><div><b>${esc(p.text)}</b><small>${esc(p.evidence || "")} · ${esc(p.strength || "")}</small></div></div>`).join("")}
      ${(d.suggestions || []).length ? `<div class="section-h">اقتراحات من سجلّك</div><ul class="ai-list">${d.suggestions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <p class="fine">${esc(d.caveat || "")} الأنماط من صيداتك أنت فقط، وتتحسن كل ما سجّلت أكثر.</p></div>`; paintIcons(out); }
  catch (e) { out.innerHTML = `<div class="note warn">${I("warn")}<div>${esc(AIERR(e))}</div></div>`; paintIcons(out); } }

// In the APK, bundled data would freeze at build time: fetch the daily-refreshed copy from GitHub Pages first, fall back to the bundled file offline.
async function liveData(path) { const get = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw 0; return r.json(); });
  if (window.Capacitor?.isNativePlatform?.()) { try { return await Promise.race([get("https://almarar88.github.io/gulf-fisher/" + path), new Promise((_, j) => setTimeout(j, 8000))]); } catch {} }
  return get(path).catch(() => null); }
/* ================= v5: خط الماء (fronts) · رادار الطيور · ذاكرة البحر ================= */
const FT_AR = { sst: "حرارة", chl: "كلوروفيل", kd: "عكارة" }, FT_COL = { sst: "#ff453a", chl: "#30d158", kd: "#c08a4a" };
let FRONTS = null;
async function loadFronts() { if (FRONTS) return FRONTS; FRONTS = await liveData("data/fronts.geojson"); return FRONTS; }
const frontsAge0 = (fc, strongOnly) => (fc?.features || []).filter((f) => f.properties.age === 0 && (!strongOnly || f.properties.s !== "ضعيف"));
function v5Overlays(below) {
  map.addSource("fronts", { type: "geojson", data: FRONTS || { type: "FeatureCollection", features: [] } }); loadFronts().then((f) => f && map.getSource("fronts")?.setData(f));
  const col = ["match", ["get", "t"], "sst", FT_COL.sst, "chl", FT_COL.chl, FT_COL.kd], w = ["match", ["get", "s"], "قوي", 3.2, "متوسط", 2.2, 1.3];
  map.addLayer({ id: "fronts-old", type: "line", source: "fronts", filter: [">", ["get", "age"], 0], paint: { "line-color": col, "line-width": ["*", 0.7, w], "line-opacity": ["match", ["get", "age"], 1, 0.45, 0.25], "line-dasharray": [2, 2] }, layout: { "line-cap": "butt" } }, below);
  map.addLayer({ id: "fronts-case", type: "line", source: "fronts", filter: ["==", ["get", "age"], 0], paint: { "line-color": "#000", "line-width": ["+", 2.5, w], "line-opacity": 0.45 }, layout: { "line-cap": "round", "line-join": "round" } }, below);
  map.addLayer({ id: "fronts", type: "line", source: "fronts", filter: ["==", ["get", "age"], 0], paint: { "line-color": col, "line-width": w, "line-opacity": 0.95 }, layout: { "line-cap": "round", "line-join": "round" } }, below);
  map.addSource("birds", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "birds", type: "circle", source: "birds", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 12, 11], "circle-color": "#fff", "circle-stroke-color": "#0a84ff", "circle-stroke-width": 3, "circle-opacity": ["get", "o"], "circle-stroke-opacity": ["get", "o"] } });
  map.addLayer({ id: "birds-lbl", type: "symbol", source: "birds", layout: { "text-field": ["get", "label"], "text-size": 11, "text-offset": [0, 1.4], "text-font": ["Noto Sans Regular"], "text-allow-overlap": true }, paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,.75)", "text-halo-width": 1.3 } });
  drawBirds();
}
/* ---- fronts UI ---- */
function frontSheet(p, lat, lon) {
  const m = openSheet(`<h2>خط ماء · ${FT_AR[p.t] || p.t}</h2><div class="meta">${dm(lat, "N", "S")} · ${dm(lon, "E", "W")}</div>
    <div class="grid g2"><div class="tile"><span class="lbl">${I("front")}القوة</span><span class="big">${esc(p.s)}</span><span class="small">تدرّج ${fmt(p.g, 3)} ${esc(p.unit)}</span></div>
    <div class="tile"><span class="lbl">${I("clock")}تاريخ البيانات</span><span class="big" style="font-size:20px">${esc(p.day)}</span><span class="small">${p.age ? `قبل ${p.age} يوم من أحدث صورة` : "أحدث يوم متوفر"} · طوله ${fmt(p.km, 0)} كم</span></div></div>
    <div class="note info">${I("info")}<div>${p.t === "sst" ? "حدّ بين مياه دافئة وباردة من NASA MUR SST (‏1 كم، تحليل يومي)." : p.t === "chl" ? "حدّ بين مياه خضراء غنية بالعوالق ومياه أصفى، من كلوروفيل NOAA المملوء الفجوات (DINEOF ‏2 كم) — يتأخر عادة ~10 أيام." : "حدّ عكارة (Kd490) من NOAA DINEOF ‏2 كم — يتأخر عادة ~10 أيام."} الخطوط تتحرك يومياً، فهي مؤشر وليست ضمان سمك، وما نرسم خطوط داخل ~4 كم من الساحل.</div></div>
    <div class="actions"><button class="btn primary sm" id="fNav">${I("navi")}وجّهني</button><button class="btn sm" id="fNear">${I("front")}أقرب خط قوي</button></div>`);
  $("#fNav", m).onclick = () => planNav({ lat, lon, n: `خط ماء (${FT_AR[p.t]}) ${p.day}`, k: "front" });
  $("#fNear", m).onclick = () => nearestFront();
}
async function nearestFront(from) {
  const fc = await loadFronts(); if (!fc) return toast("بيانات خطوط الماء ما تحمّلت"), null;
  if (!from) { await ensureHere(); from = here ? { lat: here.lat, lon: here.lon } : map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : null; } if (!from) return null;
  let best = null; for (const f of frontsAge0(fc, true)) for (const [lon, lat] of f.geometry.coordinates) { const d = haversine(from, { lat, lon }); if (d < 0.3) continue; if (!best || d < best.d) best = { d, lat, lon, p: f.properties }; }
  if (!best) { toast("ما فيه خطوط ماء متوسطة/قوية اليوم"); return null; }
  return planNav({ lat: best.lat, lon: best.lon, n: `أقرب خط ماء (${FT_AR[best.p.t]} · ${best.p.s}) ${best.p.day}`, k: "front" });
}
/* ---- رادار الطيور ---- */
const SIG_W = { "قوي": 1, "متوسط": 0.6, "ضعيف": 0.3 }, BIRD_LIFE_H = 6;
const activeBirds = (now = Date.now()) => RECS.filter((r) => r.kind === "bird" && r.lat != null && SIG_W[r.signal] && now - r.t < BIRD_LIFE_H * 3600e3);
function drawBirds() { if (!map?.getSource("birds")) return; const now = Date.now();
  map.getSource("birds").setData({ type: "FeatureCollection", features: activeBirds(now).map((r) => { const h = (now - r.t) / 3600e3; return { type: "Feature", geometry: { type: "Point", coordinates: [r.lon, r.lat] }, properties: { id: r.id, o: Math.max(0.25, Math.exp(-h / 2)), label: `طيور · ${r.signal} · ${h < 1 ? Math.round(h * 60) + " د" : h.toFixed(1) + " س"}` } }; }) }); }
setInterval(() => { if (activeBirds().length || drawBirds._was) { drawBirds._was = activeBirds().length > 0; recomputeHot(); drawBirds(); } }, 10 * 60e3);
function birdCard(d) { const cf = clamp(d.confidence || 0), sc = { "قوي": "bad", "متوسط": "warn", "ضعيف": "info" }[d.signal] || "";
  if (d.sea_photo === false) return `<div class="note warn">${I("warn")}<div>الصورة ما تبين بحر. صوّر سطح الماء والطيور فوقه.</div></div>`;
  return `<div class="fish-res"><div class="fr-h"><b>إشارة ${esc(d.signal || "—")}</b>${sc ? `<span class="badge ${sc}">${esc(d.bird_count || "")}</span>` : ""}</div>
    <div class="list">${[["الطيور", d.bird_count || "—"], ["سلوكها", d.behavior || "—"], ["فوران سمك على السطح", d.boil ? "نعم" : "لا"]].map(([a, b]) => `<div class="row"><div class="m"><b>${a}</b></div><span>${esc(b)}</span></div>`).join("")}</div>
    <div class="conf"><span>الثقة</span>${bar(cf, cf >= 0.75 ? "var(--green)" : "var(--yellow)")}<b>${Math.round(cf * 100)}٪</b></div>
    ${(d.evidence || []).length ? `<ul class="ai-list">${d.evidence.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${d.note ? `<p class="fine">${esc(d.note)}</p>` : ""}</div>`; }
async function logBird(d, where) { return new Promise((res) => needKey(async () => {
  await ensureHere(); const pos = where || (here ? { lat: here.lat, lon: here.lon } : null);
  if (!pos) { toast("نحتاج موقعك GPS عشان نسجّل الطيور"); return res(null); }
  const id = await saveRec("bird", { lat: pos.lat, lon: pos.lon, t: Date.now(), signal: d.signal, behavior: d.behavior || null, boil: !!d.boil, confidence: d.confidence ?? 0.6, count: d.bird_count || null, src: d.src || "photo" });
  recomputeHot(); drawBirds(); haptic([8, 30, 8]); toast("انسجّلت الطيور · ترفع الترجيح حولها لين 6 ساعات"); res(id); })); }
async function birdScan(photo, out) {
  if (!navigator.onLine) return toast("الرادار يحتاج اتصال"); out.innerHTML = `<div class="card"><img class="photo" src="${photo}"><p class="fine">${I("sparkles")}جاري تحليل الطيور والسطح…</p></div>`; paintIcons(out);
  try { const d = (await ai({ action: "birds", image: photo })).data || {}; out.innerHTML = `<div class="card"><img class="photo" src="${photo}">${birdCard(d)}${d.sea_photo !== false && SIG_W[d.signal] ? `<button class="btn primary block" id="bLog">${I("pin")}سجّلها هنا (GPS)</button>` : ""}</div>`; paintIcons(out);
    $("#bLog", out) && ($("#bLog", out).onclick = async () => { if (await logBird(d)) $("#bLog", out).remove(); }); return d; }
  catch (e) { out.innerHTML = `<div class="note warn">${I("warn")}<div>تعذّر التحليل: ${esc(AIERR(e))}</div></div>`; paintIcons(out); } }
function birdSheet() {
  const m = openSheet(`<h2>رادار الطيور</h2><div class="meta">الطيور اللي تغوص أو تحوم فوق نقطة غالباً فوق سمك طُعم</div>
    <label class="btn primary block" style="cursor:pointer">${I("camera")}صوّر الطيور<input id="bIn" type="file" accept="image/*" capture="environment" hidden></label><div id="bOut"></div>
    <div class="section-h">شفتها بعيني (بدون صورة)</div><div class="actions">${["قوي", "متوسط", "ضعيف"].map((s) => `<button class="btn sm" data-s="${s}">${s === "قوي" ? "سرب يغوص" : s === "متوسط" ? "طيور تحوم" : "طيور قليلة"}</button>`).join("")}</div>
    <div class="note info">${I("sat")}<div><b>ليش ما فيه رادار طيور بالأقمار الصناعية؟</b> الأقمار المجانية مثل Sentinel-2 دقتها 10 م (الطير أصغر من بكسل)، وتمرّ كل ~5 أيام، والصورة توصل بعد ساعات — والسرب يتحرك خلال دقائق. فما بنزيّف ميزة ما تشتغل؛ الرادار هنا من كاميرتك وعينك فقط.</div></div>
    <div class="list">${activeBirds().map((r) => `<div class="row"><div class="m"><b>${esc(r.signal)} · ${esc(r.behavior || "")}</b><small>${new Date(r.t).toLocaleTimeString("ar-AE", { timeStyle: "short" })}</small></div></div>`).join("")}</div>`);
  $("#bIn", m).onchange = async (e) => { const f = e.target.files[0]; if (f) birdScan(await resizePhoto(f), $("#bOut", m)); };
  $$("[data-s]", m).forEach((b) => b.onclick = () => logBird({ signal: b.dataset.s, behavior: b.textContent, confidence: 0.7, src: "manual" }));
}
/* ---- ذاكرة البحر: on-device logistic regression ---- */
const MF = [["sst", "حرارة السطح"], ["lchl", "الكلوروفيل"], ["depth", "العمق"], ["front", "قرب جبهة حرارية"], ["edge", "حافة كلوروفيل"], ["slope", "انحدار القاع"], ["moon", "إضاءة القمر"], ["tide", "حركة المد"], ["ptrend", "اتجاه الضغط"], ["wind", "الريح"], ["light", "الفجر/المغرب"]], NSP = 6;
function seaFeat(lat, lon) { const c = cellOf(lat, lon); if (!c) return null; const [i, j] = c; const d = OCEAN.depth[i][j]; if (d < 0) return null; const chl = OCEAN.chl[i][j];
  return { sst: OCEAN.sst[i][j] / 10, lchl: chl > 0 ? Math.log10(chl / 100) : null, depth: d, front: OCEAN.parts.sst_front[i][j] / 100, edge: OCEAN.parts.chl_edge[i][j] / 100, slope: OCEAN.parts.slope[i][j] / 100 }; }
const twilight = (t) => { const h = +new Date(t).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dubai" }).replace(":", ".") ; const x = Math.floor(h) + (h % 1) / 0.6; return Math.exp(-Math.min((x - 6) ** 2, (x - 17.5) ** 2) / 2); };
function timeFeat(r) { return { moon: r.moon != null ? (1 - Math.cos(2 * Math.PI * r.moon / 8)) / 2 : null, tide: r.tide ? (r.tide.includes("ركود") ? 0 : 1) : null, ptrend: r.ptrend ?? null, wind: r.wind ?? null, light: r.t ? twilight(r.t) : null }; }
function recVec(r) { const s = r.feat || seaFeat(r.lat, r.lon); if (!s) return null; return { ...s, ...timeFeat(r) }; }
let rng = 1; const rnd = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
function trainSeaModel() {
  if (!OCEAN) return null; const pos = RECS.filter((r) => r.kind === "catch" && r.lat != null).map(recVec).filter(Boolean), neg = RECS.filter((r) => r.kind === "blank" && r.lat != null).map(recVec).filter(Boolean);
  if (pos.length < 3) return (SEAM = { n: pos.length, nb: neg.length, w: 0, ready: false });
  const keys = MF.map((x) => x[0]), mean = {}; for (const k of keys) { const v = pos.map((x) => x[k]).filter((x) => x != null); mean[k] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
  rng = 7; const bg = [], nbg = Math.min(300, pos.length * 4), { rows, cols, step, lat0, lon0 } = OCEAN; let guard = 0;
  while (bg.length < nbg && guard++ < 20000) { const cr = RECS.filter((r) => r.kind === "catch" && r.lat != null), p = cr[Math.floor(rnd() * cr.length)];
    const lat = p.lat + (rnd() - 0.5) * 0.54, lon = p.lon + (rnd() - 0.5) * 0.6, s = seaFeat(lat, lon); if (!s) continue; bg.push({ ...s, moon: mean.moon, tide: mean.tide, ptrend: mean.ptrend, wind: mean.wind, light: mean.light }); }
  const X = [], Y = [], W = []; const fill = (x) => keys.map((k) => x[k] ?? mean[k]);
  pos.forEach((x) => { X.push(fill(x)); Y.push(1); W.push(1); }); neg.forEach((x) => { X.push(fill(x)); Y.push(0); W.push(1); }); bg.forEach((x) => { X.push(fill(x)); Y.push(0); W.push(pos.length / bg.length); });
  const mu = keys.map((_, k) => X.reduce((a, x) => a + x[k], 0) / X.length), sd = keys.map((_, k) => Math.sqrt(X.reduce((a, x) => a + (x[k] - mu[k]) ** 2, 0) / X.length) || 1);
  const Z = X.map((x) => x.map((v, k) => (v - mu[k]) / sd[k]));
  const fit = (idx) => { const b = new Array(keys.length + 1).fill(0), lam = 0.3, lr = 0.3, sw = idx.reduce((a, n) => a + W[n], 0);
    for (let it = 0; it < 400; it++) { const g = new Array(b.length).fill(0); for (const n of idx) { const z = Z[n], p = 1 / (1 + Math.exp(-(b[0] + z.reduce((a, v, k) => a + v * b[k + 1], 0)))), e = (p - Y[n]) * W[n]; g[0] += e; z.forEach((v, k) => (g[k + 1] += e * v)); }
      for (let k = 0; k < b.length; k++) b[k] -= lr * (g[k] / sw + (k ? lam * b[k] / sw * 4 : 0)); } return b; };
  const pred = (b, z) => 1 / (1 + Math.exp(-(b[0] + z.reduce((a, v, k) => a + v * b[k + 1], 0))));
  let auc = null; if (pos.length >= 8) { const all = Z.map((_, n) => n), sc = []; for (let f = 0; f < 4; f++) { const tr = all.filter((n) => n % 4 !== f), b = fit(tr); all.filter((n) => n % 4 === f).forEach((n) => sc.push([pred(b, Z[n]), Y[n], W[n]])); }
    const P = sc.filter((x) => x[1] === 1), N = sc.filter((x) => x[1] === 0); let num = 0, den = 0; for (const p of P) for (const q of N) { num += q[2] * (p[0] > q[0] ? 1 : p[0] === q[0] ? 0.5 : 0); den += q[2]; } auc = den ? num / den : null; }
  const b = fit(Z.map((_, n) => n)), n = pos.length + neg.length;
  const imp = keys.map((k, i) => ({ k, ar: MF[i][1], c: b[i + 1], spatial: i < NSP })).sort((a, c) => Math.abs(c.c) - Math.abs(a.c));
  const w = 0.4 * n / (n + 15) * (auc != null && auc < 0.55 ? 0.3 : 1);
  SEAM = { ready: true, keys, mu, sd, b, auc, n: pos.length, nb: neg.length, nbg: bg.length, w, imp, mean, t: Date.now() }; return SEAM;
}
let SEAM = null;
async function persistModel() { if (!SEAM?.ready || !KEY) return; const old = RECS.find((r) => r.kind === "model"); const { keys, mu, sd, b, auc, n, nb, w, t } = SEAM; await saveRec("model", { keys, mu, sd, b, auc, n, nb, w, t }, old?.id); }
function nowTime() { const c = condAt(new Date()); return { moon: (1 - Math.cos(2 * Math.PI * moon().idx / 8)) / 2, tide: c?.tideStage ? (c.tideStage.includes("ركود") ? 0 : 1) : null, ptrend: c?.ptrend ?? null, wind: c?.wind ?? null, light: twilight(Date.now()) }; }
function modelProb(x) { const M = SEAM; const z = M.keys.map((k, i) => ((x[k] ?? M.mean[k]) - M.mu[i]) / M.sd[i]); return 1 / (1 + Math.exp(-(M.b[0] + z.reduce((a, v, i) => a + v * M.b[i + 1], 0)))); }
function todayMatch() { if (!SEAM?.ready) return null; const t = nowTime(), m = SEAM.mean; return modelProb({ ...Object.fromEntries(SEAM.keys.slice(0, NSP).map((k) => [k, m[k]])), ...t }); }
function v5Adjust(score) { // bird boost + personal model blend, applied after base score
  const { rows, cols, step, lat0, lon0 } = OCEAN, B = activeBirds(), now = Date.now(); const stamp = RECS.filter((r) => r.kind === "catch" || r.kind === "blank").map((r) => r.updated_at).join(); if (!SEAM || SEAM.stamp !== stamp) { trainSeaModel(); SEAM.stamp = stamp; persistModel(); }
  const M = SEAM?.ready ? SEAM : null, tf = M ? nowTime() : null;
  if (M) for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const k = i * cols + j; if (score[k] < 0) continue; const s = seaFeat(lat0 + i * step, lon0 + j * step); if (!s) continue; score[k] = (1 - M.w) * score[k] + M.w * modelProb({ ...s, ...tf }); }
  for (const r of B) { const h = (now - r.t) / 3600e3, a = SIG_W[r.signal] * clamp(r.confidence ?? 0.6) * Math.exp(-h / 2), ci = Math.round((r.lat - lat0) / step), cj = Math.round((r.lon - lon0) / step), kx = 111 * Math.cos(r.lat * Math.PI / 180);
    for (let i = Math.max(0, ci - 8); i <= Math.min(rows - 1, ci + 8); i++) for (let j = Math.max(0, cj - 9); j <= Math.min(cols - 1, cj + 9); j++) { const k = i * cols + j; if (score[k] < 0) continue; const dy = (lat0 + i * step - r.lat) * 111, dx = (lon0 + j * step - r.lon) * kx;
      score[k] += 0.25 * Math.min(1, a * Math.exp(-(dx * dx + dy * dy) / (2 * 16))); } }
}
function modelCard() { const M = SEAM || trainSeaModel(); if (!M) return "";
  if (!M.ready) return `<div class="card"><h3>${I("sparkles")}ذاكرة البحر</h3><p class="fine">تتعلّم من صيداتك (والرحلات بدون صيد) أي ظروف تناسبك. تحتاج 3 صيدات بموقع على الأقل — عندك ${M.n}. لين ذاك الوقت الخريطة تعتمد على بيانات الأقمار فقط.</p></div>`;
  const conf = M.n + M.nb < 10 ? ["بدائية", "warn"] : M.auc != null && M.auc >= 0.7 ? ["جيدة", "ok"] : ["متوسطة", "info"], tm = todayMatch();
  return `<div class="card" id="seaModel"><h3>${I("sparkles")}ذاكرة البحر <span class="badge ${conf[1]}">ثقة ${conf[0]}</span></h3>
    <p class="fine">نموذج انحدار لوجستي يتدرّب على جهازك من ${M.n} صيدة و${M.nb} رحلة بدون صيد و${M.nbg} نقطة بحر عشوائية حولها${M.auc != null ? ` · دقة التمييز (AUC بالتحقق المتقاطع) ${M.auc.toFixed(2)}` : " · نحتاج 8 صيدات لقياس الدقة"}. وزنه في الخريطة الحين ${Math.round(M.w * 100)}٪ ويزيد كل ما زادت بياناتك.</p>
    <div class="why">${M.imp.slice(0, 4).map((f) => `<div class="w"><span>${f.ar}</span><b>${f.c > 0 ? "يزيد صيدك" : "يقلّل صيدك"}</b>${bar(Math.min(1, Math.abs(f.c) / Math.abs(M.imp[0].c || 1)), f.c > 0 ? "var(--green)" : "var(--orange)")}</div>`).join("")}</div>
    ${tm != null ? `<div class="note info">${I("clock")}<div>ظروف الحين (قمر/مد/ضغط/ريح/وقت) تطابق نمطك بنسبة <b>${Math.round(tm * 100)}٪</b>.</div></div>` : ""}
    <p class="fine">${I("lock")}النموذج محفوظ مشفّر مثل نقاطك. علاقة إحصائية من سجلّك، مو سبب مؤكد.</p></div>`; }
function blankSheet() { needKey(async () => { await ensureHere(); const pos = here ? { lat: here.lat, lon: here.lon } : map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : null;
  const m = openSheet(`<h2>رحلة بدون صيد</h2><div class="meta">${pos ? dm(pos.lat, "N", "S") + " · " + dm(pos.lon, "E", "W") + (here ? " (GPS)" : " (وسط الخريطة)") : "بدون موقع"}</div><p class="fine">تسجيل الرحلات الفاضية يعلّم «ذاكرة البحر» وين وإمتى ما ينفع — بنفس الظروف اللي تنحفظ مع الصيدة.</p>
    <label class="f">ملاحظات<textarea id="bx" rows="2"></textarea></label><button class="btn primary block" id="bOk">${I("lock")}حفظ مشفّر</button>`);
  $("#bOk", m).onclick = async () => { if (!pos) return toast("نحتاج موقع"); await saveRec("blank", { lat: pos.lat, lon: pos.lon, t: Date.now(), notes: $("#bx", m).value, ...condRec(pos.lat, pos.lon) }); closeSheet(); afterLearn(); toast("انحفظت الرحلة · الذاكرة تتعلّم"); rerender(); }; }); }
function condRec(lat, lon) { const cond = condAt(new Date()), ex = lat != null ? explain(lat, lon) : null; return { moon: moon().idx, tide: cond?.tideStage || null, pressure: cond?.pressure ?? null, ptrend: cond?.ptrend ?? null, wind: cond?.wind ?? null, wave: cond?.wave ?? null, sst: ex?.sst ?? cond?.sst ?? null, feat: lat != null ? seaFeat(lat, lon) : null, hour: new Date().getHours() }; }
function afterLearn() { SEAM = null; recomputeHot(); }

if ("serviceWorker" in navigator && !window.Capacitor?.isNativePlatform?.() && !location.search.includes("nosw")) navigator.serviceWorker.register("sw.js").catch(() => {});
window.__gf = { nearestFront, loadFronts, birdScan, birdSheet, logBird, activeBirds, trainSeaModel, get SEAM() { return SEAM; }, todayMatch, blankSheet, frontSheet, seaFeat, enc, dec, unlock, moon, solunar, sunTimes, hourScores, explain, idb, show, get KEY() { return KEY; }, get RECS() { return RECS; }, get map() { return map; }, get OCEAN() { return OCEAN; }, get HOT() { return HOT; }, sync, pointSheet, recSheet, shareCard, startRoute, planNav, startNav, endNav, navFix: onFix, seaRoute, returnToPort, searchSheet, loadNavData, SAID, get NAV() { return NAV; }, get PLAN() { return PLAN; }, get PORTS() { return PORTS; }, simMode(v) { startNav.sim = v; }, navDepth, NP, get POIS() { return POIS; }, fullCtx, candidates, runPlan, saveRec, recomputeHot, ask, fishCard, fishId, runLogSummary, toWav, get CHAT() { return CHAT; }, speak, todayCtx };
start();
