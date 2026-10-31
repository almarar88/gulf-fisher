import { SB_URL, SB_ANON, FN } from "./config.js";
import { SPECIES, RULES, LICENCE, MPA, SRC } from "./data.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); };
const fmt = (n, d = 1) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(d));
const spName = (id, other) => id === "other" ? (other || "أخرى") : (SPECIES.find((s) => s.id === id)?.ar ?? id);
const OWNER = "538e2219-4801-4f4b-8d21-78ec5712433e";

/* ---------------- IndexedDB ---------------- */
const idb = (() => {
  let dbp;
  const open = () => dbp ??= new Promise((res, rej) => { const r = indexedDB.open("gulf-fisher", 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("recs", { keyPath: "id" }); d.createObjectStore("kv"); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (st, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(st, mode); const s = t.objectStore(st); const out = fn(s); t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out); t.onerror = () => rej(t.error); }); };
  return {
    all: () => tx("recs", "readonly", (s) => s.getAll()),
    put: (v) => tx("recs", "readwrite", (s) => s.put(v)),
    get: (k) => tx("kv", "readonly", (s) => s.get(k)),
    set: (k, v) => tx("kv", "readwrite", (s) => s.put(v, k)),
    clear: async () => { await tx("recs", "readwrite", (s) => s.clear()); await tx("kv", "readwrite", (s) => s.clear()); },
  };
})();

/* ---------------- Auth (Supabase GoTrue, anon key + RLS) ---------------- */
let session = JSON.parse(localStorage.getItem("gf_session") || "null");
const saveSess = (s) => { session = s; s ? localStorage.setItem("gf_session", JSON.stringify(s)) : localStorage.removeItem("gf_session"); };
async function login(email, password) {
  const r = await fetch(SB_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: SB_ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error_description || j.msg || "فشل الدخول");
  if (j.user?.id !== OWNER) throw new Error("هذا الحساب غير مصرّح له");
  saveSess({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: { id: j.user.id, email: j.user.email } });
}
async function token() {
  if (!session) return null;
  if (session.expires_at && session.expires_at * 1000 - Date.now() < 60000 && navigator.onLine) {
    const r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: SB_ANON, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (r.ok) { const j = await r.json(); saveSess({ ...session, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at }); }
    else if (r.status === 400 || r.status === 401) { saveSess(null); location.reload(); return null; }
  }
  return session.access_token;
}
async function rest(path, init = {}) {
  const t = await token();
  const r = await fetch(SB_URL + "/rest/v1/" + path, { ...init, headers: { apikey: SB_ANON, Authorization: "Bearer " + t, "content-type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error("rest " + r.status);
  const tx = await r.text(); return tx ? JSON.parse(tx) : null;
}

/* ---------------- Vault: PBKDF2 -> AES-GCM, encryption happens on this device ---------------- */
const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64big = (buf) => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
let KEY = null;
async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function enc(obj, key = KEY) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))); return { ct: b64big(ct), iv: b64(iv) }; }
async function dec(ct, iv, key = KEY) { const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(iv) }, key, ub64(ct)); return JSON.parse(new TextDecoder().decode(pt)); }
async function vaultMeta() {
  let v = await idb.get("vault");
  if (navigator.onLine && session) { try { const r = await rest("gf_vault?select=salt,check_ct,check_iv"); if (r?.[0]) { v = r[0]; await idb.set("vault", v); } } catch {} }
  return v;
}
async function unlock(pass) {
  let v = await vaultMeta();
  if (!v) {
    const salt = crypto.getRandomValues(new Uint8Array(16)); const k = await deriveKey(pass, salt); const c = await enc({ ok: "gulf-fisher" }, k);
    v = { salt: b64(salt), check_ct: c.ct, check_iv: c.iv }; await idb.set("vault", v); await idb.set("vault_dirty", true);
    KEY = k; return "created";
  }
  const k = await deriveKey(pass, ub64(v.salt));
  try { const c = await dec(v.check_ct, v.check_iv, k); if (c.ok !== "gulf-fisher") throw 0; } catch { throw new Error("عبارة المرور غير صحيحة"); }
  KEY = k; return "ok";
}

/* ---------------- Records (spots & catches), offline queue ---------------- */
let RECS = []; // decrypted {id, kind, ...data, updated_at}
async function loadLocal() {
  const raw = await idb.all(); const out = [];
  for (const r of raw) { if (r.deleted) continue; try { out.push({ ...(await dec(r.ct, r.iv)), id: r.id, kind: r.kind, updated_at: r.updated_at }); } catch {} }
  RECS = out.sort((a, b) => (b.t || 0) - (a.t || 0)); renderQueue();
}
async function saveRec(kind, data, id = crypto.randomUUID()) {
  const { ct, iv } = await enc(data);
  await idb.put({ id, kind, ct, iv, updated_at: new Date().toISOString(), dirty: true, deleted: false });
  await loadLocal(); sync(); return id;
}
async function delRec(id) {
  const raw = (await idb.all()).find((r) => r.id === id); if (!raw) return;
  await idb.put({ ...raw, deleted: true, dirty: true, updated_at: new Date().toISOString() }); await loadLocal(); sync();
}
let syncing = false;
async function sync() {
  if (syncing || !navigator.onLine || !session || !KEY) { renderQueue(); return; }
  syncing = true;
  try {
    if (await idb.get("vault_dirty")) { const v = await idb.get("vault"); await rest("gf_vault", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ owner: session.user.id, ...v }) }); await idb.set("vault_dirty", false); }
    const raw = await idb.all();
    for (const r of raw.filter((x) => x.dirty)) {
      await rest("gf_spots", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: r.id, owner: session.user.id, kind: r.kind, ct: r.ct, iv: r.iv, deleted: r.deleted, updated_at: r.updated_at }) });
      await idb.put({ ...r, dirty: false });
    }
    const remote = await rest("gf_spots?select=id,kind,ct,iv,deleted,updated_at&order=updated_at.desc&limit=2000");
    const local = new Map((await idb.all()).map((r) => [r.id, r]));
    for (const r of remote || []) { const l = local.get(r.id); if (!l || (!l.dirty && l.updated_at < r.updated_at)) await idb.put({ ...r, dirty: false }); }
    await idb.set("last_sync", Date.now()); await loadLocal();
  } catch (e) { console.warn("sync", e); }
  syncing = false; renderQueue();
}
async function renderQueue() {
  const n = (await idb.all()).filter((r) => r.dirty).length; const q = $("#queue");
  q.classList.toggle("hidden", !n); q.textContent = `بانتظار المزامنة: ${n}`;
  const net = $("#net"); net.textContent = navigator.onLine ? "متصل" : "أوفلاين"; net.className = "pill " + (navigator.onLine ? "ok" : "off");
}

/* ---------------- Astronomy: moon phase ---------------- */
function moon(d = new Date()) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14) / 864e5;
  const age = (((d.getTime() / 864e5 - ref) % syn) + syn) % syn;
  const illum = (1 - Math.cos((2 * Math.PI * age) / syn)) / 2;
  const names = ["محاق", "هلال متزايد", "تربيع أول", "أحدب متزايد", "بدر", "أحدب متناقص", "تربيع أخير", "هلال متناقص"];
  const idx = Math.floor(((age / syn) * 8 + 0.5)) % 8;
  return { age, illum, name: names[idx], idx };
}

/* ---------------- Bathymetry (GEBCO 2020 grid, 0.1°) ---------------- */
let DEPTH = null;
const depthAt = (lat, lon) => { if (!DEPTH) return null; const i = Math.round((lat - DEPTH.lat0) / DEPTH.step), j = Math.round((lon - DEPTH.lon0) / DEPTH.step);
  if (i < 0 || j < 0 || i >= DEPTH.rows || j >= DEPTH.cols) return null; return DEPTH.elev[i][j]; };

/* ---------------- Hotspot scoring (rule-based estimate) ---------------- */
const W = { front: 0.4, slope: 0.3, depth: 0.1, log: 0.2 };
let HOT = null; // {t, pts:[{lat,lon,sst,score,parts}]}
async function fetchSST(points) {
  const out = [];
  for (let k = 0; k < points.length; k += 120) {
    const ch = points.slice(k, k + 120);
    const u = `https://marine-api.open-meteo.com/v1/marine?latitude=${ch.map((p) => p.lat).join(",")}&longitude=${ch.map((p) => p.lon).join(",")}&current=sea_surface_temperature&cell_selection=sea`;
    const r = await fetch(u); if (!r.ok) throw new Error("sst " + r.status); let j = await r.json(); if (!Array.isArray(j)) j = [j];
    j.forEach((x, i) => out.push({ ...ch[i], sst: x.current?.sea_surface_temperature ?? null }));
  }
  return out;
}
function computeScores(pts, prefs) {
  const step = 0.2, key = (a, o) => `${a.toFixed(1)},${o.toFixed(1)}`, m = new Map(pts.map((p) => [key(p.lat, p.lon), p]));
  const catches = RECS.filter((r) => r.kind === "catch" && r.lat != null);
  const raw = pts.map((p) => {
    const nb = [[step, 0], [-step, 0], [0, step], [0, -step]].map(([a, o]) => m.get(key(p.lat + a, p.lon + o))).filter((x) => x && x.sst != null);
    const grad = p.sst == null || !nb.length ? 0 : Math.max(...nb.map((x) => Math.abs(x.sst - p.sst)));
    const d0 = depthAt(p.lat, p.lon); const dn = [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]].map(([a, o]) => depthAt(p.lat + a, p.lon + o)).filter((x) => x != null && x < 0);
    const slope = d0 == null || !dn.length ? 0 : Math.max(...dn.map((x) => Math.abs(x - d0)));
    const dd = -d0; const inBand = dd >= prefs.dmin && dd <= prefs.dmax ? 1 : Math.max(0, 1 - Math.min(Math.abs(dd - prefs.dmin), Math.abs(dd - prefs.dmax)) / 15);
    let lg = 0; for (const c of catches) { const km = Math.hypot((c.lat - p.lat) * 111, (c.lon - p.lon) * 111 * Math.cos((p.lat * Math.PI) / 180)); lg += Math.exp(-(km * km) / (2 * 8 * 8)); }
    return { ...p, depth: d0, grad, slope, inBand, lg: Math.min(1, lg) };
  });
  const p95 = (arr) => { const s = arr.filter((x) => x > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length * 0.95)] || s[s.length - 1] : 1; };
  const gN = p95(raw.map((r) => r.grad)), sN = p95(raw.map((r) => r.slope));
  return raw.map((r) => { const parts = { front: Math.min(1, r.grad / gN), slope: Math.min(1, r.slope / sN), depth: r.inBand, log: r.lg };
    return { ...r, parts, score: W.front * parts.front + W.slope * parts.slope + W.depth * parts.depth + W.log * parts.log }; });
}
function waterGrid() { const pts = []; if (!DEPTH) return pts;
  for (let i = 0; i < DEPTH.rows; i += 2) for (let j = 0; j < DEPTH.cols; j += 2) { const e = DEPTH.elev[i][j]; if (e < -2) pts.push({ lat: +(DEPTH.lat0 + i * DEPTH.step).toFixed(1), lon: +(DEPTH.lon0 + j * DEPTH.step).toFixed(1) }); }
  return pts; }
const prefs = () => ({ dmin: 5, dmax: 40, wave: 0.8, wind: 20, ...JSON.parse(localStorage.getItem("gf_prefs") || "{}") });
async function loadHot(force) {
  const cached = await idb.get("hot");
  if (cached && !force && Date.now() - cached.t < 6 * 3600e3) HOT = cached;
  else if (navigator.onLine) { try { const s = await fetchSST(waterGrid()); HOT = { t: Date.now(), raw: s }; await idb.set("hot", HOT); } catch (e) { HOT = cached; toast("تعذّر جلب حرارة السطح، نعرض آخر نسخة محفوظة"); } }
  else HOT = cached;
  if (HOT) HOT.pts = computeScores(HOT.raw, prefs());
}

/* ---------------- Map ---------------- */
let map, heat, depthL, spotsL, layersOn = { heat: true, depth: false, spots: true }, here = null;
function initMap() {
  map = L.map("map", { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([24.9, 54.6], 7);
  L.control.zoom({ position: "bottomleft" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, className: "base-tiles", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  depthL = L.tileLayer.wms("https://wms.gebco.net/mapserv?", { layers: "GEBCO_LATEST", format: "image/png", transparent: true, opacity: 0.55, attribution: 'Bathymetry © <a href="https://www.gebco.net">GEBCO</a>' });
  spotsL = L.layerGroup().addTo(map);
  map.on("click", (e) => pointSheet(e.latlng.lat, e.latlng.lng));
  $$(".map-tools .chip[data-layer]").forEach((b) => b.onclick = () => { const k = b.dataset.layer; layersOn[k] = !layersOn[k]; b.classList.toggle("on", layersOn[k]); drawLayers(); });
  $("#locBtn").onclick = () => locate(true);
}
function drawLayers() {
  if (heat) { map.removeLayer(heat); heat = null; }
  if (layersOn.heat && HOT?.pts && map.getSize().x > 0) try { heat = L.heatLayer(((t) => HOT.pts.filter((p) => p.score >= t))(HOT.pts.map((p) => p.score).sort((a, b) => a - b)[Math.floor(HOT.pts.length * 0.7)] || 0).map((p) => [p.lat, p.lon, p.score]), { radius: 20, blur: 16, max: 0.6, maxZoom: 5, minOpacity: 0.15, gradient: { 0.2: "#1e3cff", 0.4: "#2ec4cf", 0.6: "#a6ff4d", 0.8: "#ffd000", 1: "#ff3b3b" } }).addTo(map); } catch {}
  layersOn.depth ? depthL.addTo(map) : map.removeLayer(depthL);
  spotsL.clearLayers();
  if (layersOn.spots) for (const r of RECS) { if (r.lat == null) continue;
    const icon = L.divIcon({ className: "", html: `<div class="${r.kind === "spot" ? "spot-pin" : "catch-pin"}"></div>`, iconSize: [26, 26], iconAnchor: [13, 26] });
    L.marker([r.lat, r.lon], { icon }).addTo(spotsL).on("click", (e) => { L.DomEvent.stopPropagation(e); recSheet(r); }); }
}
function nearestHot(lat, lon) { if (!HOT?.pts) return null; let b = null, bd = 1e9; for (const p of HOT.pts) { const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2; if (d < bd) { bd = d; b = p; } } return bd < 0.05 ? b : null; }
function sheet(html) { const s = $("#sheet"); s.innerHTML = `<button class="icon-btn" style="float:left" id="shX">✕</button>` + html; s.classList.add("show"); $("#shX").onclick = () => s.classList.remove("show"); return s; }
function pointSheet(lat, lon) {
  const d = depthAt(lat, lon), h = nearestHot(lat, lon);
  const bar = (v) => `<div style="height:6px;background:#082841;border-radius:4px"><div style="height:6px;width:${Math.round(v * 100)}%;background:var(--acc);border-radius:4px"></div></div>`;
  const s = sheet(`<h3>نقطة ${lat.toFixed(4)}, ${lon.toFixed(4)}</h3>
    <div class="grid2"><div class="kpi"><b>${d == null ? "—" : d >= 0 ? "يابسة" : fmt(-d, 0) + " م"}</b><span>العمق (GEBCO تقريبي)</span></div>
    <div class="kpi"><b>${h ? Math.round(h.score * 100) : "—"}</b><span>درجة تقديرية /100</span></div></div>
    ${h ? `<div class="tiny" style="margin-top:8px">حرارة السطح: ${fmt(h.sst)}°م · فرق حراري مع الجيران: ${fmt(h.grad, 2)}°م</div>
    <div class="list" style="margin-top:8px;gap:6px">
      <div class="tiny">جبهة حرارية (${W.front * 100}%)</div>${bar(h.parts.front)}
      <div class="tiny">انحدار القاع (${W.slope * 100}%)</div>${bar(h.parts.slope)}
      <div class="tiny">ضمن عمقك المفضل (${W.depth * 100}%)</div>${bar(h.parts.depth)}
      <div class="tiny">قرب صيداتك السابقة (${W.log * 100}%)</div>${bar(h.parts.log)}</div>` : `<p class="tiny">لا توجد درجة لهذه النقطة (خارج الشبكة أو يابسة).</p>`}
    <p class="fine">تقدير حسابي بقواعد بسيطة، وليس توقع مؤكد ولا خريطة ملاحية.</p>
    <div class="row"><button class="btn primary sm" id="pSave">⭐ احفظ نقطة خاصة</button><button class="btn sm" id="pCatch">🐟 سجّل صيدة هنا</button><button class="btn sm" id="pWx">🌤️ طقس هالنقطة</button></div>`);
  $("#pSave", s).onclick = () => spotModal({ lat, lon });
  $("#pCatch", s).onclick = () => catchModal({ lat, lon });
  $("#pWx", s).onclick = () => { PLAN_AT = { lat, lon, name: "نقطة على الخريطة" }; show("plan"); };
}
function recSheet(r) {
  const s = sheet(`<h3>${r.kind === "spot" ? "⭐ " + esc(r.name || "نقطة خاصة") : "🐟 " + esc(spName(r.species, r.other))}</h3>
    ${r.photo ? `<img src="${r.photo}" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px">` : ""}
    <p class="muted">${esc(r.notes || "")}</p><p class="tiny">${r.lat.toFixed(5)}, ${r.lon.toFixed(5)} · ${new Date(r.t).toLocaleString("ar-AE")}</p>
    <span class="tag ok">🔐 مشفّرة على جهازك</span>
    <div class="row" style="margin-top:10px"><button class="btn sm" id="rWx">🌤️ الطقس</button><button class="btn sm" id="rShare">مشاركة واتساب</button><button class="btn danger sm" id="rDel">حذف</button></div>`);
  $("#rWx", s).onclick = () => { PLAN_AT = { lat: r.lat, lon: r.lon, name: r.name || spName(r.species) }; show("plan"); };
  $("#rShare", s).onclick = () => { if (confirm("بتشارك الإحداثيات الدقيقة. متأكد؟")) open(`https://wa.me/?text=${encodeURIComponent(`${r.name || "نقطة"}: https://maps.google.com/?q=${r.lat},${r.lon}`)}`, "_blank"); };
  $("#rDel", s).onclick = async () => { if (confirm("حذف نهائي؟")) { await delRec(r.id); s.classList.remove("show"); drawLayers(); toast("انحذفت"); } };
}
function locate(center) {
  if (!navigator.geolocation) return toast("الموقع غير متاح");
  navigator.geolocation.getCurrentPosition((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
    if (center && map) { map.setView([here.lat, here.lon], 11); L.circleMarker([here.lat, here.lon], { radius: 8, color: "#2ec4cf", fillOpacity: 0.8 }).addTo(map); } },
    () => toast("ما قدرنا نحدد موقعك"), { enableHighAccuracy: true, timeout: 10000 });
}

/* ---------------- Modals ---------------- */
function modal(html) { $("#modalCard").innerHTML = html; $("#modal").classList.remove("hidden"); return $("#modalCard"); }
const closeModal = () => $("#modal").classList.add("hidden");
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
function needKey(fn) { if (KEY) return fn(); vaultModal(fn); }
function vaultModal(after) {
  if (!$("#modal").classList.contains("hidden") && $("#vp")) return;
  const m = modal(`<h2>🔐 خزنة النقاط الخاصة</h2><p class="muted">نقاطك وسجلّك يتشفّرون على جهازك (AES-GCM 256) قبل الرفع. السيرفر يشوف نص مشفّر بس.</p>
    <label>عبارة المرور<input id="vp" type="password" autocomplete="off"></label>
    <div class="alert warn">إذا نسيت العبارة ما في أي طريقة لاسترجاع البيانات، ولا حتى من عندنا. اكتبها في مكان آمن.</div>
    <p class="err" id="vErr"></p><div class="row"><button class="btn primary" id="vOk">فتح</button><button class="btn" id="vNo">لاحقاً</button></div>`);
  $("#vNo", m).onclick = closeModal;
  const go = async () => { $("#vErr", m).textContent = ""; $("#vOk", m).disabled = true; $("#vOk", m).textContent = "جاري…";
    try { if ($("#vp", m).value.length < 6) throw new Error("6 أحرف على الأقل"); const r = await unlock($("#vp", m).value); sessionStorage.setItem("gf_unlocked", "1");
      closeModal(); toast(r === "created" ? "انشأت الخزنة" : "انفتحت الخزنة"); await loadLocal(); sync(); drawLayers(); rerender(); after && after(); }
    catch (e) { KEY = null; $("#vErr", m).textContent = e.message; } $("#vOk", m).disabled = false; $("#vOk", m).textContent = "فتح"; };
  $("#vOk", m).onclick = go; $("#vp", m).onkeydown = (e) => { if (e.key === "Enter") go(); }; setTimeout(() => $("#vp", m).focus(), 50);
}
function spotModal({ lat, lon }) { needKey(() => {
  const m = modal(`<h2>⭐ نقطة خاصة جديدة</h2><p class="tiny">${lat.toFixed(5)}, ${lon.toFixed(5)}</p>
    <label>الاسم<input id="sn" placeholder="مثلاً: حافة الشعاب الشمالية"></label><label>ملاحظات<textarea id="sx" rows="3"></textarea></label>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="sOk">حفظ مشفّر</button><button class="btn" id="sNo">إلغاء</button></div>`);
  $("#sNo", m).onclick = closeModal;
  $("#sOk", m).onclick = async () => { await saveRec("spot", { name: $("#sn", m).value || "نقطة خاصة", notes: $("#sx", m).value, lat, lon, t: Date.now() }); closeModal(); drawLayers(); toast("انحفظت النقطة مشفّرة" + (navigator.onLine ? "" : " (بتتزامن لما يرجع النت)")); };
}); }
async function resizePhoto(file) { const img = await createImageBitmap(file); const s = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.78); }
function ruleAlerts(species, when = new Date()) { const mo = when.getMonth() + 1;
  return RULES.filter((r) => r.status === "verified" && r.species.includes(species) && r.months.includes(mo)); }
function catchModal({ lat, lon }) { needKey(() => {
  let photo = null;
  const m = modal(`<h2>🐟 تسجيل صيدة</h2><p class="tiny">${lat != null ? lat.toFixed(5) + ", " + lon.toFixed(5) : "بدون موقع"}</p>
    <label>الصورة<input id="cp" type="file" accept="image/*" capture="environment"></label><img id="cpv" class="hidden" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;margin-top:8px">
    <div class="row" style="margin-top:8px"><button class="btn sm gold hidden" id="cAI">🤖 تعرّف على السمكة</button></div><div id="cAIo"></div>
    <label>النوع<select id="cs">${SPECIES.map((s) => `<option value="${s.id}">${s.ar}</option>`).join("")}</select></label>
    <label id="coL" class="hidden">اسم النوع<input id="co"></label>
    <div id="cAl"></div>
    <div class="grid2"><label>الطول (سم)<input id="cl" type="number" inputmode="decimal"></label><label>الوزن (كجم)<input id="cw" type="number" inputmode="decimal"></label>
    <label>الطُعم<input id="cb"></label><label>العمق (م)<input id="cd" type="number" inputmode="decimal" value="${lat != null && depthAt(lat, lon) < 0 ? Math.round(-depthAt(lat, lon)) : ""}"></label></div>
    <label><input id="crel" type="checkbox" style="width:auto"> رجّعتها البحر</label>
    <label>ملاحظات<textarea id="cx" rows="2"></textarea></label>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="cOk">حفظ مشفّر</button><button class="btn" id="cNo">إلغاء</button></div>`);
  const upd = () => { const sp = $("#cs", m).value; $("#coL", m).classList.toggle("hidden", sp !== "other");
    const al = ruleAlerts(sp); $("#cAl", m).innerHTML = al.map((r) => `<div class="alert bad">⛔ ${esc(r.text)} <a href="${r.src[0]}" target="_blank">المصدر</a></div>`).join("");
    const cf = RULES.filter((r) => r.status === "confirm" && r.species.includes(sp)); $("#cAl", m).innerHTML += cf.map((r) => `<div class="alert warn">يحتاج تأكيد: ${esc(r.text)}</div>`).join(""); };
  $("#cs", m).onchange = upd; upd();
  $("#cp", m).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; photo = await resizePhoto(f); $("#cpv", m).src = photo; $("#cpv", m).classList.remove("hidden"); $("#cAI", m).classList.remove("hidden"); };
  $("#cAI", m).onclick = async () => { if (!navigator.onLine) return toast("التعرّف يحتاج اتصال"); $("#cAI", m).textContent = "جاري التحليل…";
    try { const r = await ai({ action: "fishid", image: photo }); const d = r.data;
      $("#cAIo", m).innerHTML = `<div class="alert info">🤖 <b>${esc(d.common_name_ar || "")}</b> ${d.scientific_guess ? `<i dir="ltr">${esc(d.scientific_guess)}</i>` : ""} · ثقة ${Math.round((d.confidence || 0) * 100)}%<br>${esc(d.notes || "")}<br><span class="tiny">تقدير من الذكاء الاصطناعي، تأكد بنفسك.</span></div>`;
      if (d.species && (d.confidence || 0) >= 0.5) { const s = SPECIES.find((x) => x.ar === d.species || x.ar.startsWith(d.species)); if (s) { $("#cs", m).value = s.id; upd(); } } }
    catch (e) { $("#cAIo", m).innerHTML = `<div class="alert warn">تعذّر التعرّف: ${esc(e.message)}</div>`; } $("#cAI", m).textContent = "🤖 تعرّف على السمكة"; };
  $("#cNo", m).onclick = closeModal;
  $("#cOk", m).onclick = async () => { const n = (id) => { const v = parseFloat($(id, m).value); return isNaN(v) ? null : v; };
    const mo = moon(); await saveRec("catch", { species: $("#cs", m).value, other: $("#co", m).value, length: n("#cl"), weight: n("#cw"), bait: $("#cb", m).value, depth: n("#cd"),
      released: $("#crel", m).checked, notes: $("#cx", m).value, photo, lat, lon, t: Date.now(), moon: mo.idx, sst: nearestHot(lat ?? 0, lon ?? 0)?.sst ?? null });
    closeModal(); drawLayers(); if (HOT) { HOT.pts = computeScores(HOT.raw, prefs()); drawLayers(); } toast("انحفظت الصيدة مشفّرة"); rerender(); };
}); }
async function ai(body) { const t = await token(); const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + t, apikey: SB_ANON }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || "خطأ"); return j; }

/* ---------------- Plan view: weather window, tide, moon ---------------- */
let PLAN_AT = null, PLAN = null;
async function loadPlan(at) {
  const k = `plan:${at.lat.toFixed(2)},${at.lon.toFixed(2)}`;
  if (navigator.onLine) { try {
    const [mr, wr] = await Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${at.lat}&longitude=${at.lon}&hourly=wave_height,wave_period,sea_surface_temperature,sea_level_height_msl&timezone=Asia%2FDubai&forecast_days=3&cell_selection=sea`).then((r) => r.json()),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${at.lat}&longitude=${at.lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&daily=sunrise,sunset&timezone=Asia%2FDubai&forecast_days=3`).then((r) => r.json())]);
    const d = { t: Date.now(), m: mr, w: wr }; await idb.set(k, d); return d; } catch {} }
  return idb.get(k);
}
function tideExtrema(times, lv) { const out = []; for (let i = 1; i < lv.length - 1; i++) { if (lv[i] == null) continue; if (lv[i] > lv[i - 1] && lv[i] >= lv[i + 1]) out.push({ t: times[i], v: lv[i], hi: true }); if (lv[i] < lv[i - 1] && lv[i] <= lv[i + 1]) out.push({ t: times[i], v: lv[i], hi: false }); } return out; }
const hm = (s) => s.slice(11, 16);
const dayName = (s) => new Date(s).toLocaleDateString("ar-AE", { weekday: "long", day: "numeric", month: "short" });
async function renderPlan() {
  const v = $("#v-plan"); const P = prefs();
  const at = PLAN_AT || (here ? { ...here, name: "موقعي" } : { lat: 25.25, lon: 55.15, name: "قبالة دبي (افتراضي)" });
  const spots = RECS.filter((r) => r.kind === "spot");
  v.innerHTML = `<div class="wrap"><div class="card"><h2>🌤️ نافذة الطلعة</h2>
    <label>الموقع<select id="plAt"><option value="cur">${esc(at.name)} (${at.lat.toFixed(2)}, ${at.lon.toFixed(2)})</option>${spots.map((s) => `<option value="${s.id}">⭐ ${esc(s.name)}</option>`).join("")}</select></label>
    <div class="grid2"><label>أقصى موج (م)<input id="pW" type="number" step="0.1" value="${P.wave}"></label><label>أقصى ريح (كم/س)<input id="pV" type="number" value="${P.wind}"></label></div>
    <p class="fine">الحدود هذي إعداداتك أنت حسب قاربك وخبرتك، وليست معايير رسمية.</p></div><div id="plOut"><div class="card muted">جاري التحميل…</div></div></div>`;
  $("#plAt").onchange = (e) => { const s = spots.find((x) => x.id === e.target.value); if (s) { PLAN_AT = { lat: s.lat, lon: s.lon, name: s.name }; renderPlan(); } };
  const sv = () => { localStorage.setItem("gf_prefs", JSON.stringify({ ...prefs(), wave: +$("#pW").value, wind: +$("#pV").value })); renderPlanOut(at); };
  $("#pW").onchange = sv; $("#pV").onchange = sv;
  PLAN = await loadPlan(at); renderPlanOut(at);
}
function renderPlanOut(at) {
  const o = $("#plOut"); if (!o) return; const P = prefs();
  if (!PLAN?.m?.hourly) { o.innerHTML = `<div class="card alert warn">ما في بيانات (أوفلاين وما في نسخة محفوظة لهالموقع).</div>`; return; }
  const H = PLAN.m.hourly, WH = PLAN.w.hourly; const now = new Date();
  const rows = H.time.map((t, i) => ({ t, wave: H.wave_height[i], per: H.wave_period[i], sst: H.sea_surface_temperature[i], lv: H.sea_level_height_msl?.[i], wind: WH.wind_speed_10m[i], gust: WH.wind_gusts_10m[i], dir: WH.wind_direction_10m[i] }));
  const cls = (r) => r.wave == null || r.wind == null ? "" : r.wave <= P.wave && r.wind <= P.wind && r.gust <= P.wind * 1.5 ? "g" : r.wave <= P.wave * 1.4 && r.wind <= P.wind * 1.3 ? "y" : "r";
  const days = [...new Set(rows.map((r) => r.t.slice(0, 10)))];
  // best windows: contiguous green runs >= 3h in daylight-ish hours (05-19)
  const wins = []; let cur = null;
  rows.forEach((r) => { const h = +r.t.slice(11, 13); const ok = cls(r) === "g" && h >= 5 && h <= 19 && new Date(r.t) > new Date(now.getTime() - 3600e3);
    if (ok) { cur ? (cur.end = r.t) : (cur = { start: r.t, end: r.t }); } else { if (cur) wins.push(cur); cur = null; } }); if (cur) wins.push(cur);
  const good = wins.filter((w) => (new Date(w.end) - new Date(w.start)) / 3600e3 >= 2).slice(0, 4);
  const tides = H.sea_level_height_msl ? tideExtrema(H.time, H.sea_level_height_msl) : [];
  const mo = moon();
  o.innerHTML = `<div class="cols"><div class="card"><h3>أفضل النوافذ</h3>${good.length ? good.map((w) => `<div class="item"><span class="tag ok">مناسب</span><div class="m"><b>${dayName(w.start)}</b><small>${hm(w.start)} – ${hm(w.end)}</small></div></div>`).join("") : `<div class="alert warn">ما في نافذة مناسبة حسب حدودك خلال 3 أيام.</div>`}
      <div class="row" style="margin-top:10px"><button class="btn gold" id="aiAdv">🤖 نصيحة الطلعة بالذكاء الاصطناعي</button></div><div id="aiOut"></div></div>
    <div class="card"><h3>القمر والمد</h3><div class="grid2"><div class="kpi"><b>${mo.name}</b><span>إضاءة ${Math.round(mo.illum * 100)}% · عمر ${fmt(mo.age, 1)} يوم</span></div>
      <div class="kpi"><b>${fmt(rows.find((r) => r.sst != null)?.sst)}°م</b><span>حرارة السطح</span></div></div>
      <div class="list" style="margin-top:8px">${tides.slice(0, 6).map((x) => `<div class="item"><span class="tag ${x.hi ? "ok" : ""}">${x.hi ? "مد عالي" : "جزر"}</span><div class="m"><b>${dayName(x.t)} ${hm(x.t)}</b><small>${fmt(x.v, 2)} م</small></div></div>`).join("") || `<p class="tiny">لا تتوفر بيانات مستوى البحر.</p>`}</div>
      <p class="fine">المد من نموذج Open-Meteo لمستوى البحر (مع المد الفلكي)، ودقته قرب الساحل غير مؤكدة. للتأكد ارجع لجداول المد الرسمية.</p></div></div>
    ${days.map((d) => `<div class="card"><h3>${dayName(d)}</h3><div class="wx">${rows.filter((r) => r.t.startsWith(d)).map((r) => `<div class="h ${cls(r)}"><b>${hm(r.t).slice(0, 2)}</b>🌊${fmt(r.wave)}<br>💨${fmt(r.wind, 0)}</div>`).join("")}</div>
      <p class="tiny">🌅 ${hm(PLAN.w.daily.sunrise[days.indexOf(d)] || "")} · 🌇 ${hm(PLAN.w.daily.sunset[days.indexOf(d)] || "")} · 🌊 موج (م) · 💨 ريح (كم/س)</p></div>`).join("")}
    <p class="fine">المصدر: Open-Meteo (توقعات الموج والريح وحرارة السطح). آخر تحديث: ${new Date(PLAN.t).toLocaleString("ar-AE")}. <a href="${SRC.om}" target="_blank">التوثيق</a></p>`;
  $("#aiAdv").onclick = async () => { if (!navigator.onLine) return toast("يحتاج اتصال"); const b = $("#aiAdv"); b.textContent = "جاري…"; b.disabled = true;
    const h = nearestHot(at.lat, at.lon); const mo2 = moon();
    const catches = RECS.filter((r) => r.kind === "catch").slice(0, 30).map((c) => ({ species: spName(c.species, c.other), month: new Date(c.t).getMonth() + 1, hour: new Date(c.t).getHours(), moon: c.moon, depth: c.depth, bait: c.bait }));
    const conditions = { place: at.name, lat: +at.lat.toFixed(2), lon: +at.lon.toFixed(2), depth_gebco_m: depthAt(at.lat, at.lon), hotspot_score: h ? Math.round(h.score * 100) : null, moon: mo2.name, moon_illum: Math.round(mo2.illum * 100),
      user_limits: { max_wave_m: P.wave, max_wind_kmh: P.wind }, good_windows: good.map((w) => w.start + " → " + w.end), tides: tides.slice(0, 6), hourly: rows.filter((_, i) => i % 3 === 0).map((r) => ({ t: r.t, wave: r.wave, wind: r.wind, gust: r.gust, sst: r.sst })),
      verified_rules_this_month: RULES.filter((r) => r.status === "verified" && r.months.includes(new Date().getMonth() + 1)).map((r) => r.text), my_recent_catches: catches };
    try { const r = await ai({ action: "advice", conditions }); const d = r.data;
      $("#aiOut").innerHTML = `<div class="alert info"><b>${esc(d.go)}</b> · ${esc(d.best_window || "")}<br>${esc(d.summary || "")}<ul>${(d.tips || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${(d.safety || []).length ? `<b>السلامة:</b><ul>${d.safety.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<span class="tiny">${esc(d.disclaimer || "تقدير وليس ضمان")}</span></div>`; }
    catch (e) { $("#aiOut").innerHTML = `<div class="alert warn">تعذّرت النصيحة: ${esc(e.message)}</div>`; } b.textContent = "🤖 نصيحة الطلعة بالذكاء الاصطناعي"; b.disabled = false; };
}

/* ---------------- Log view ---------------- */
function renderLog() {
  const v = $("#v-log");
  if (!KEY) { v.innerHTML = `<div class="wrap"><div class="card"><h2>🔐 سجلّك مقفل</h2><p class="muted">افتح الخزنة عشان تشوف نقاطك وصيداتك.</p><button class="btn primary" id="unl">فتح الخزنة</button></div></div>`; $("#unl").onclick = () => vaultModal(); return; }
  const cs = RECS.filter((r) => r.kind === "catch"), sp = RECS.filter((r) => r.kind === "spot");
  const by = {}; cs.forEach((c) => { const k = spName(c.species, c.other); by[k] = (by[k] || 0) + 1; });
  const hours = Array(24).fill(0); cs.forEach((c) => hours[new Date(c.t).getHours()]++); const mh = Math.max(1, ...hours);
  const moons = Array(8).fill(0); cs.forEach((c) => c.moon != null && moons[c.moon]++); const mm = Math.max(1, ...moons);
  const mn = ["محاق", "هلال+", "تربيع1", "أحدب+", "بدر", "أحدب-", "تربيع2", "هلال-"];
  v.innerHTML = `<div class="wrap"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 style="margin:0">🐟 سجلّي</h2>
    <div class="row"><button class="btn primary sm" id="addC">+ صيدة</button><button class="btn sm" id="addS">+ نقطة من موقعي</button><button class="btn sm" id="exp">تصدير GPX</button></div></div>
    <div class="grid2" style="margin-bottom:12px"><div class="kpi"><b>${cs.length}</b><span>صيدات</span></div><div class="kpi"><b>${sp.length}</b><span>نقاط خاصة</span></div></div>
    ${cs.length ? `<div class="cols"><div class="card"><h3>حسب النوع</h3>${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="row" style="justify-content:space-between"><span>${esc(k)}</span><b>${n}</b></div>`).join("")}</div>
    <div class="card"><h3>حسب الساعة</h3><svg viewBox="0 0 240 60" width="100%">${hours.map((h, i) => `<rect x="${i * 10}" y="${50 - (h / mh) * 46}" width="8" height="${(h / mh) * 46}" rx="2" fill="#2ec4cf"/>`).join("")}<text x="0" y="59" font-size="7" fill="#6f97ad">0</text><text x="115" y="59" font-size="7" fill="#6f97ad">12</text><text x="228" y="59" font-size="7" fill="#6f97ad">23</text></svg>
    <h3 style="margin-top:8px">حسب طور القمر</h3><svg viewBox="0 0 240 64" width="100%">${moons.map((h, i) => `<rect x="${i * 30 + 4}" y="${48 - (h / mm) * 44}" width="22" height="${(h / mm) * 44}" rx="3" fill="#f2c14e"/><text x="${i * 30 + 15}" y="60" font-size="7" fill="#a9c8d8" text-anchor="middle">${mn[i]}</text>`).join("")}</svg>
    <p class="fine">إحصاءات من سجلّك أنت فقط، وتحتاج صيدات كثيرة قبل ما تعني شي.</p></div></div>` : ""}
    <div class="card"><h3>الصيدات</h3><div class="list">${cs.map((c) => `<div class="item" data-id="${c.id}">${c.photo ? `<img src="${c.photo}">` : `<div style="width:54px;height:54px;border-radius:10px;background:#0e3b5f;display:grid;place-items:center;font-size:24px">🐟</div>`}<div class="m"><b>${esc(spName(c.species, c.other))} ${c.length ? `· ${c.length} سم` : ""} ${c.weight ? `· ${c.weight} كجم` : ""}</b><small>${new Date(c.t).toLocaleString("ar-AE")} ${c.bait ? "· " + esc(c.bait) : ""} ${c.released ? "· رجّعتها" : ""}</small></div></div>`).join("") || `<p class="tiny">ما سجّلت صيدات للحين. اضغط على الخريطة أو "+ صيدة".</p>`}</div></div>
    <div class="card"><h3>نقاطي الخاصة</h3><div class="list">${sp.map((s) => `<div class="item" data-id="${s.id}"><div style="font-size:22px">⭐</div><div class="m"><b>${esc(s.name)}</b><small>${s.lat.toFixed(4)}, ${s.lon.toFixed(4)} · ${esc(s.notes || "")}</small></div></div>`).join("") || `<p class="tiny">ما في نقاط.</p>`}</div></div></div>`;
  $$(".item[data-id]", v).forEach((el) => el.onclick = () => { const r = RECS.find((x) => x.id === el.dataset.id); if (r?.lat != null) { show("map"); map.setView([r.lat, r.lon], 11); recSheet(r); } });
  $("#addC").onclick = () => { if (here) catchModal(here); else navigator.geolocation?.getCurrentPosition((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude }; catchModal(here); }, () => catchModal({ lat: null, lon: null })); };
  $("#addS").onclick = () => navigator.geolocation?.getCurrentPosition((p) => spotModal({ lat: p.coords.latitude, lon: p.coords.longitude }), () => toast("ما قدرنا نحدد موقعك، اضغط على الخريطة بدال"));
  $("#exp").onclick = () => { const g = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Gulf Fisher" xmlns="http://www.topografix.com/GPX/1/1">\n${RECS.filter((r) => r.lat != null).map((r) => `<wpt lat="${r.lat}" lon="${r.lon}"><name>${esc(r.kind === "spot" ? r.name : spName(r.species, r.other))}</name><time>${new Date(r.t).toISOString()}</time></wpt>`).join("\n")}\n</gpx>`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([g], { type: "application/gpx+xml" })); a.download = "gulf-fisher.gpx"; a.click(); toast("الملف غير مشفّر، احفظه بمكان آمن"); };
}

/* ---------------- Rules & Safety ---------------- */
function renderRules() {
  const mo = new Date().getMonth() + 1; const act = RULES.filter((r) => r.status === "verified" && r.months.includes(mo) && r.species.length);
  const src = (a) => a.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">مصدر ${i + 1}</a>`).join(" · ");
  const item = (r) => `<div class="item" style="align-items:flex-start"><span class="tag ${r.status === "verified" ? "ok" : "warn"}">${r.status === "verified" ? "موثّق" : "يحتاج تأكيد"}</span><div class="m"><div>${esc(r.text)}</div><small>${r.area ? esc(r.area) + " · " : ""}${src(r.src)}</small></div></div>`;
  $("#v-rules").innerHTML = `<div class="wrap"><div class="card"><h2>📜 الأنظمة</h2>
    ${act.length ? act.map((r) => `<div class="alert bad">⛔ هالشهر: ${esc(r.text)}</div>`).join("") : `<div class="alert info">ما في حظر موسمي موثّق للأنواع المسجّلة في التطبيق هالشهر.</div>`}
    <p class="fine">التنبيهات تستخدم البنود الموثّقة فقط. التقويم الرسمي المرجعي هنا نسخة 2023، والأنظمة ممكن تتغيّر، والمرجع هو الجهات الرسمية و<a href="${SRC.hadaq}" target="_blank">تطبيق حدق</a>.</p></div>
    <div class="card"><h3>مواسم وأدوات الصيد</h3><div class="list">${RULES.map(item).join("")}</div></div>
    <div class="card"><h3>الرخص (أبوظبي)</h3><div class="list">${LICENCE.map(item).join("")}</div></div>
    <div class="card"><h3>المحميات البحرية (أبوظبي)</h3><div class="list">${MPA.map(item).join("")}</div></div></div>`;
}
function renderSafe() {
  $("#v-safe").innerHTML = `<div class="wrap"><div class="card"><h2>🆘 السلامة</h2>
    <div class="alert bad">هذا التطبيق للتخطيط فقط. ليس جهاز ملاحة، والأعماق تقريبية (GEBCO) وما تصلح لتجنّب الشعاب والضحضاح. استخدم الخرائط البحرية الرسمية وأجهزة القارب واللاسلكي.</div>
    <button class="btn danger" style="width:100%;font-size:17px;padding:16px;border-width:2px" id="sos">📍 أرسل موقعي للطوارئ عبر واتساب</button>
    <p class="fine">يفتح واتساب برسالة فيها إحداثياتك ورابط الخريطة، وأنت تختار لمن ترسلها. في حالة الخطر اتصل 999.</p>
    <a class="btn" style="display:block;text-align:center;text-decoration:none;margin-top:8px" href="tel:999">📞 اتصال 999</a></div>
    <div class="card"><h3>خطة الرحلة</h3><label>رقم واتساب لشخص يعرف عن طلعتك<input id="tp" dir="ltr" placeholder="9715xxxxxxxx" value="${esc(localStorage.getItem("gf_contact") || "")}"></label>
      <label>متى ترجع؟<input id="tr" type="time" value="18:00"></label><button class="btn primary" id="tpS">شارك خطة الرحلة</button>
      <p class="fine">إذا ما رجعت بالوقت، الشخص يعرف موقع انطلاقك ووقت رجوعك المتوقع.</p></div>
    <div class="card"><h3>عن البيانات</h3><p class="fine">الأعماق: GEBCO 2020 عبر opentopodata.org، شبكة 0.1° وطبقة GEBCO WMS للعرض. الموج والريح وحرارة السطح ومستوى البحر: Open-Meteo. الخريطة: OpenStreetMap. الدرجات التقديرية: قواعد بسيطة (جبهة حرارية 40٪، انحدار القاع 30٪، العمق المفضل 10٪، قرب صيداتك 20٪)، وطور القمر يُحسب فلكياً ويُعرض للمعلومة فقط.</p>
      <div class="grid2"><label>أقل عمق مفضّل (م)<input id="dmin" type="number" value="${prefs().dmin}"></label><label>أكثر عمق مفضّل (م)<input id="dmax" type="number" value="${prefs().dmax}"></label></div>
      <button class="btn sm" id="dSave" style="margin-top:8px">حفظ وإعادة حساب</button> <button class="btn sm" id="hotRef">تحديث حرارة السطح</button></div></div>`;
  const pos = (cb) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => cb(p.coords), () => cb(here ? { latitude: here.lat, longitude: here.lon, accuracy: null } : null), { enableHighAccuracy: true, timeout: 8000 }) : cb(null);
  $("#sos").onclick = () => pos((c) => { const t = c ? `🆘 أحتاج مساعدة في البحر.\nموقعي: ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}${c.accuracy ? ` (±${Math.round(c.accuracy)}م)` : ""}\nhttps://maps.google.com/?q=${c.latitude},${c.longitude}\nالوقت: ${new Date().toLocaleString("ar-AE")}` : "🆘 أحتاج مساعدة في البحر. ما قدرت أحدد الموقع."; open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank"); });
  $("#tpS").onclick = () => pos((c) => { const ph = $("#tp").value.replace(/\D/g, ""); localStorage.setItem("gf_contact", ph);
    const t = `🚤 خطة طلعة بحر\nانطلاق: ${c ? `https://maps.google.com/?q=${c.latitude},${c.longitude}` : "غير محدد"}\nالرجوع المتوقع: ${$("#tr").value}\nإذا ما تواصلت بعد الموعد، اتصل علي وبعدين 999.`; open(`https://wa.me/${ph}?text=${encodeURIComponent(t)}`, "_blank"); });
  $("#dSave").onclick = () => { localStorage.setItem("gf_prefs", JSON.stringify({ ...prefs(), dmin: +$("#dmin").value, dmax: +$("#dmax").value })); if (HOT) { HOT.pts = computeScores(HOT.raw, prefs()); drawLayers(); } toast("انحفظ"); };
  $("#hotRef").onclick = async () => { toast("جاري التحديث…"); await loadHot(true); drawLayers(); toast("تم"); };
}

/* ---------------- Shell ---------------- */
let CUR = "map";
function show(v) { CUR = v; $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); $$(".view").forEach((x) => x.classList.toggle("hidden", x.id !== "v-" + v)); $("#sheet").classList.remove("show"); rerender(); if (v === "map") setTimeout(() => { map.invalidateSize(); drawLayers(); }, 50); }
function rerender() { ({ plan: renderPlan, log: renderLog, rules: renderRules, safe: renderSafe }[CUR] || (() => {}))(); }
$$(".tabs button").forEach((b) => b.onclick = () => show(b.dataset.v));
addEventListener("online", () => { renderQueue(); sync(); }); addEventListener("offline", renderQueue);

async function start() {
  if (!session) { $("#login").classList.remove("hidden"); $("#app").classList.add("hidden");
    const go = async () => { $("#loginErr").textContent = ""; $("#loginBtn").disabled = true; try { await login($("#em").value.trim(), $("#pw").value); location.reload(); } catch (e) { $("#loginErr").textContent = e.message === "Invalid login credentials" ? "البريد أو كلمة المرور غير صحيحة" : e.message; } $("#loginBtn").disabled = false; };
    $("#loginBtn").onclick = go; $("#pw").onkeydown = (e) => { if (e.key === "Enter") go(); }; return; }
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#logoutBtn").onclick = async () => { if (!confirm("خروج؟ النسخة المحلية بتنمسح (المشفّرة على السيرفر تبقى).")) return; try { await fetch(SB_URL + "/auth/v1/logout", { method: "POST", headers: { apikey: SB_ANON, Authorization: "Bearer " + session.access_token } }); } catch {} await idb.clear(); saveSess(null); location.reload(); };
  $("#lockBtn").onclick = () => { if (KEY) { KEY = null; RECS = []; drawLayers(); rerender(); toast("انقفلت الخزنة"); } else vaultModal(); };
  initMap(); renderQueue();
  DEPTH = await fetch("data/depth.json").then((r) => r.json()).catch(() => null);
  await loadHot(); drawLayers();
  if (!KEY) setTimeout(() => vaultModal(), 400);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
window.__gf = { enc, dec, deriveKey, unlock, moon, computeScores, idb, get KEY() { return KEY; }, get RECS() { return RECS; }, sync };
start();
