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
  map.on("style.load", addOverlays);
  map.on("click", onMapClick);
  const co = (ll) => { const d = depthAt(ll.lat, ll.lng); $("#coord").textContent = `${dm(ll.lat, "N", "S")}  ${dm(ll.lng, "E", "W")}${d != null ? "  ·  ~" + U.depth(d) : ""}`; };
  map.on("mousemove", (e) => co(e.lngLat)); map.on("move", () => co(map.getCenter())); co(map.getCenter());
  $("#layersBtn").onclick = layersSheet; $("#locBtn").onclick = () => locate(true);
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
  applyLayers(); drawHot(); drawPois(); drawRoute(); drawTrack();
}
function applyLayers() { if (!map?.getLayer("hot")) return; const v = (id, on) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  v("hot", LAYERS.hot); v("seamark", LAYERS.seamark); v("contours", LAYERS.contours); v("contour-lbl", LAYERS.contours); v("gebco", LAYERS.gebco); v("sat", LAYERS.sat); v("pois", LAYERS.pois); v("pois-lbl", LAYERS.pois);
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
    ["sat", "صور الأقمار الصناعية", "Esri World Imagery", "sat", "#30d158"], ["pois", "شعاب وحطام وجزر", `من OpenStreetMap (${POIS.length})`, "pin", "#ff9f0a"], ["recs", "نقاطي وصيداتي", "مشفّرة", "star", "#ffd60a"]];
  const m = openSheet(`<h2>طبقات الخريطة</h2>${rows.map(([k, t, s, i, c]) => `<div class="layer-row"><div style="display:flex;gap:12px;align-items:center">${ic(i, c)}<div class="m"><b>${t}</b><small>${s}</small></div></div><input type="checkbox" class="switch" data-k="${k}" ${LAYERS[k] ? "checked" : ""}></div>`).join("")}
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
  const { lat, lng: lon } = e.lngLat;
  if (ROUTE.on) { ROUTE.pts.push({ lat, lon }); haptic(6); drawRoute(); routeSheet(); return; }
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
    <div class="actions"><button class="btn primary sm" id="pSave">${I("star")}احفظ نقطة</button><button class="btn tinted sm" id="pCatch">${I("fish")}سجّل صيدة</button><button class="btn sm" id="pWx">${I("sun")}طقس النقطة</button><button class="btn sm" id="pRoute">${I("route")}مسار لهنا</button></div>`);
  $("#pSave", m).onclick = () => spotSheet({ lat, lon }); $("#pCatch", m).onclick = () => catchSheet({ lat, lon });
  $("#pWx", m).onclick = () => { AT = { lat, lon, name: "نقطة على الخريطة" }; WX = null; closeSheet(); show("today"); };
  $("#pRoute", m).onclick = () => { closeSheet(); startRoute(here ? [{ lat: here.lat, lon: here.lon }, { lat, lon }] : [{ lat, lon }]); };
}
function recSheet(r) {
  const m = openSheet(`<h2>${r.kind === "spot" ? esc(r.name || "نقطة خاصة") : esc(spName(r.species, r.other))}</h2><div class="meta">${dm(r.lat, "N", "S")} · ${dm(r.lon, "E", "W")} · ${new Date(r.t).toLocaleString("ar-AE")}</div>
    ${r.photo ? `<img class="photo" src="${r.photo}">` : ""}${r.notes ? `<p>${esc(r.notes)}</p>` : ""}
    ${r.kind === "catch" ? `<div class="list">${[["الطول", r.length ? r.length + " سم" : "—"], ["الوزن", r.weight ? r.weight + " كجم" : "—"], ["الطُعم", r.bait || "—"], ["العمق", r.depth != null ? U.depth(r.depth) : "—"], ["القمر", r.moon != null ? moon(new Date(r.t)).name : "—"], ["المد", r.tide || "—"]].map(([a, b]) => `<div class="row"><div class="m">${a}</div><span class="val">${esc(b)}</span></div>`).join("")}</div>` : ""}
    <p><span class="badge ok">${I("lock")}مشفّرة على جهازك</span></p>
    <div class="actions"><button class="btn sm" id="rWx">${I("sun")}الطقس</button>${r.kind === "catch" ? `<button class="btn tinted sm" id="rCard">${I("share")}بطاقة صيدة</button>` : `<button class="btn sm" id="rRoute">${I("route")}مسار</button>`}<button class="btn sm" id="rShare">${I("share")}الإحداثيات</button><button class="btn danger sm" id="rDel">${I("trash")}حذف</button></div>`);
  $("#rWx", m).onclick = () => { AT = { lat: r.lat, lon: r.lon, name: r.name || spName(r.species) }; WX = null; closeSheet(); show("today"); };
  $("#rCard", m) && ($("#rCard", m).onclick = () => shareCard(r));
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
function catchSheet({ lat, lon }) { needKey(() => {
  let photo = null;
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
  $("#cp", m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; photo = await resizePhoto(f); $("#cpv", m).src = photo; $("#cpv", m).classList.remove("hidden"); $("#cAI", m).classList.remove("hidden"); };
  $("#cAI", m).onclick = async () => { if (!navigator.onLine) return toast("التعرّف يحتاج اتصال"); const b = $("#cAI", m); b.disabled = true; b.lastChild.textContent = "جاري التحليل…";
    try { const r = await ai({ action: "fishid", image: photo }); const d = r.data;
      $("#cAIo", m).innerHTML = `<div class="note info">${I("sparkles")}<div><b>${esc(d.common_name_ar || "")}</b> ${d.scientific_guess ? `<i dir="ltr">${esc(d.scientific_guess)}</i>` : ""} · ثقة ${Math.round((d.confidence || 0) * 100)}٪<br>${esc(d.notes || "")}<br><small>تقدير من الذكاء الاصطناعي، تأكد بنفسك.</small></div></div>`;
      if (d.species && (d.confidence || 0) >= 0.5) { const s = SPECIES.find((x) => x.ar === d.species || x.ar.startsWith(d.species)); if (s) { $("#cs", m).value = s.id; upd(); } } }
    catch (e) { $("#cAIo", m).innerHTML = `<div class="note warn">${I("warn")}<div>تعذّر التعرّف: ${esc(e.message)}</div></div>`; } b.disabled = false; b.lastChild.textContent = "تعرّف عليها بالذكاء الاصطناعي"; };
  $("#cOk", m).onclick = async () => { const n = (id) => { const v = parseFloat($(id, m).value); return isNaN(v) ? null : v; };
    const cond = condAt(new Date()); const ex = lat != null ? explain(lat, lon) : null;
    await saveRec("catch", { species: $("#cs", m).value, other: $("#co", m).value, length: n("#cl"), weight: n("#cw"), bait: $("#cb", m).value, depth: n("#cd"), released: $("#crel", m).checked, notes: $("#cx", m).value, photo, lat, lon, t: Date.now(),
      moon: moon().idx, tide: cond?.tideStage || null, pressure: cond?.pressure ?? null, ptrend: cond?.ptrend ?? null, wind: cond?.wind ?? null, wave: cond?.wave ?? null, sst: ex?.sst ?? cond?.sst ?? null });
    haptic([8, 30, 8]); closeSheet(); drawRecs(); recomputeHot(); toast("انحفظت الصيدة مشفّرة"); rerender(); };
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
  <div class="section-h">${I("sparkles")}نصيحة ذكية</div>
  <div class="card"><div id="adv"><p class="fine" style="margin:0 0 10px">تحليل بالذكاء الاصطناعي لأرقام اليوم (الطقس والمد والقمر وسجلّك). يحتاج اتصال.</p><button class="btn tinted" id="advBtn">${I("sparkles")}اسأل عن خطة اليوم</button></div></div>
  <p class="fine">المصادر: Open-Meteo (طقس وموج ومد نموذجي)، حسابات فلكية محلية. آخر تحديث ${hm(WX.t)}. ${navigator.onLine ? "" : "· غير متصل، بيانات محفوظة."}</p>`;
  bindPick(v); paintIcons(v);
  requestAnimationFrame(() => $$(".gauge circle[data-off]", v).forEach((c) => c.style.strokeDashoffset = c.dataset.off));
  $("#advBtn", v).onclick = async () => { if (!navigator.onLine) return toast("يحتاج اتصال"); const b = $("#advBtn", v); b.disabled = true; b.lastChild.textContent = "جاري التحليل…";
    try { const catches = RECS.filter((x) => x.kind === "catch").slice(-30).map((c) => ({ species: spName(c.species, c.other), t: new Date(c.t).toISOString(), moon: c.moon, tide: c.tide, depth: c.depth }));
      const j = await ai({ action: "advice", ctx: { place: at.name, now: r, score: cur.s, pressure_trend_3h: d3, tide: ts, tide_extrema: ext, solunar: sol.map((s) => ({ k: s.k, start: s.start, end: s.end })), moon: mo.name, sunrise: sun.sunrise, sunset: sun.sunset, limits: P0, catches } });
      $("#adv", v).innerHTML = `<div style="white-space:pre-wrap;line-height:1.7">${esc(j.text || j.data?.text || JSON.stringify(j.data || j))}</div><p class="fine">من الذكاء الاصطناعي، تحقق قبل ما تعتمد عليه.</p>`; }
    catch (e) { $("#adv", v).insertAdjacentHTML("beforeend", `<div class="note warn">${I("warn")}<div>${esc(e.message)}</div></div>`); paintIcons(v); b.disabled = false; b.lastChild.textContent = "حاول مرة ثانية"; } };
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
async function wake(on) { try { if (on && "wakeLock" in navigator) { TRACK.lock = await navigator.wakeLock.request("screen"); } else if (!on && TRACK.lock) { await TRACK.lock.release(); TRACK.lock = null; } } catch {} }
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
  v.innerHTML = `<h1 class="large-title">سجلّي</h1><p class="subtitle">مشفّر على جهازك · ${navigator.onLine ? "متزامن" : "بيتزامن لما يرجع النت"}</p>
  <div class="actions" style="margin:0 0 14px"><button class="btn primary sm" id="addC">${I("plus")}صيدة</button><button class="btn sm" id="addS">${I("star")}نقطة من موقعي</button><button class="btn sm" id="exp">${I("share")}GPX</button></div>
  <div class="grid g3"><div class="tile" style="min-height:0"><span class="lbl">${I("fish")}صيدات</span><span class="stat-big">${cs.length}</span></div><div class="tile" style="min-height:0"><span class="lbl">${I("star")}نقاط</span><span class="stat-big">${sp.length}</span></div><div class="tile" style="min-height:0"><span class="lbl">${I("chart")}كجم</span><span class="stat-big">${fmt(kg, 1)}</span></div></div>
  ${cs.length ? `<div class="section-h">${I("sparkles")}أفضل ظروفك (من سجلّك)</div>${learned(cs)}
  <div class="grid g2" style="margin-top:12px"><div class="card"><h3>${I("fish")}حسب النوع</h3>${hbars(count(cs, (c) => spName(c.species, c.other)), "var(--blue)")}</div>
    <div class="card"><h3>${I("star")}حسب النقطة</h3>${hbars(count(cs, (c) => nearSpot(c) || "بدون نقطة محفوظة"), "var(--orange)")}</div>
    <div class="card"><h3>${I("tide")}حسب المد</h3>${hbars(count(cs, (c) => c.tide || "غير مسجّل"), "var(--teal)")}</div>
    <div class="card"><h3>${I("moon")}حسب القمر</h3><svg viewBox="0 0 240 64" width="100%">${moons.map((h, i) => `<rect x="${i * 30 + 4}" y="${48 - (h / mm) * 44}" width="22" height="${Math.max(1, (h / mm) * 44)}" rx="4" fill="#ffd60a"/><text x="${i * 30 + 15}" y="61" font-size="8" fill="currentColor" opacity=".6" text-anchor="middle">${MOON8[i]}</text>`).join("")}</svg></div>
    <div class="card" style="grid-column:1/-1"><h3>${I("clock")}حسب الساعة</h3><svg viewBox="0 0 240 60" width="100%" style="direction:ltr">${hours.map((h, i) => `<rect x="${i * 10}" y="${50 - (h / mh) * 46}" width="8" height="${Math.max(1, (h / mh) * 46)}" rx="2" fill="var(--teal)"/>`).join("")}<text x="0" y="59" font-size="7" fill="currentColor" opacity=".6">00</text><text x="115" y="59" font-size="7" fill="currentColor" opacity=".6">12</text><text x="226" y="59" font-size="7" fill="currentColor" opacity=".6">23</text></svg></div></div>` : ""}
  <div class="section-h">${I("fish")}الصيدات</div>
  <div class="list">${cs.map((c) => `<div class="row tap" data-id="${c.id}">${c.photo ? `<img src="${c.photo}" style="width:48px;height:48px;border-radius:12px;object-fit:cover">` : ic("fish", "var(--blue)")}<div class="m"><b>${esc(spName(c.species, c.other))}${c.length ? ` · ${c.length} سم` : ""}${c.weight ? ` · ${c.weight} كجم` : ""}</b><small>${new Date(c.t).toLocaleString("ar-AE", { dateStyle: "medium", timeStyle: "short" })}${c.bait ? " · " + esc(c.bait) : ""}${c.released ? " · رجّعتها" : ""}</small></div>${I("chev", "chev")}</div>`).join("") || `<div class="row"><div class="m"><small>ما سجّلت صيدات للحين. اضغط على الخريطة أو «صيدة».</small></div></div>`}</div>
  <div class="section-h">${I("star")}نقاطي الخاصة</div>
  <div class="list">${sp.map((s) => `<div class="row tap" data-id="${s.id}">${ic("star", "var(--orange)")}<div class="m"><b>${esc(s.name)}</b><small>${dm(s.lat, "N", "S")} · ${dm(s.lon, "E", "W")}</small></div>${I("chev", "chev")}</div>`).join("") || `<div class="row"><div class="m"><small>ما في نقاط.</small></div></div>`}</div>`;
  paintIcons(v);
  $$(".row[data-id]", v).forEach((el) => el.onclick = () => { const r = RECS.find((x) => x.id === el.dataset.id); if (r?.lat != null) { show("map"); map.jumpTo({ center: [r.lon, r.lat], zoom: 11 }); } recSheet(r); });
  $("#addC", v).onclick = () => locate(false).then((h) => catchSheet(h || { lat: null, lon: null }));
  $("#addS", v).onclick = () => locate(false).then((h) => h ? spotSheet(h) : toast("ما قدرنا نحدد موقعك، اضغط على الخريطة بدال"));
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
function rerender() { ({ today: renderToday, trip: renderTrip, log: renderLog, more: renderMore }[VIEW] || (() => {}))(); }
$$("#tabbar button").forEach((b) => b.onclick = () => { haptic(5); show(b.dataset.v); });
async function netState() { const n = $("#net"), q = $("#queue"); if (!n) return; n.className = "status" + (navigator.onLine ? "" : " off"); n.textContent = navigator.onLine ? "متصل" : "بدون نت"; q.className = "status q";
  const pend = (await idb.all().catch(() => [])).filter((r) => r.dirty).length; q.classList.toggle("hidden", !pend); q.textContent = pend ? `${pend} بانتظار المزامنة` : ""; }
hooks.queue = netState;
addEventListener("online", () => { netState(); sync().then(() => { drawRecs(); rerender(); }); }); addEventListener("offline", netState);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && (TRACK.on || ANCHOR.on)) wake(true); });

async function start() {
  applyTheme(); paintIcons();
  if (!session) { $("#login").classList.remove("hidden"); $("#app").classList.add("hidden");
    const go = async () => { $("#loginErr").textContent = ""; $("#loginBtn").disabled = true; try { await login($("#em").value.trim(), $("#pw").value); location.reload(); } catch (e) { haptic([20, 30, 20]); $("#loginErr").textContent = e.message === "Invalid login credentials" ? "البريد أو كلمة المرور غير صحيحة" : e.message; } $("#loginBtn").disabled = false; };
    $("#loginBtn").onclick = go; $("#pw").onkeydown = (e) => { if (e.key === "Enter") go(); }; return; }
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#lockBtn").onclick = () => KEY ? lockVault() : vaultSheet(); lockIcon();
  updateSky(defAt(), null); initMap(); netState();
  OCEAN = await fetch("data/ocean.json").then((r) => r.json()).catch(() => null);
  recomputeHot(); loadPois().then(() => { drawPois(); recomputeHot(); });
  if (!KEY) setTimeout(() => vaultSheet(), 500);
  loadWx(defAt()).then((w) => { if (w) { WX = w; updateSky(defAt(), w); } });
}
if ("serviceWorker" in navigator && !location.search.includes("nosw")) navigator.serviceWorker.register("sw.js").catch(() => {});
window.__gf = { enc, dec, unlock, moon, solunar, sunTimes, hourScores, explain, idb, show, get KEY() { return KEY; }, get RECS() { return RECS; }, get map() { return map; }, get OCEAN() { return OCEAN; }, get HOT() { return HOT; }, sync, pointSheet, recSheet, shareCard, startRoute };
start();
