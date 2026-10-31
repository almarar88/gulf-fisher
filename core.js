export const OWNER = "538e2219-4801-4f4b-8d21-78ec5712433e";
import { SB_URL, SB_ANON, FN } from "./config.js";
export { SB_URL, SB_ANON, FN };
/* ---------------- IndexedDB ---------------- */
export const idb = (() => {
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
export let session = JSON.parse(localStorage.getItem("gf_session") || "null");
export const saveSess = (s) => { session = s; s ? localStorage.setItem("gf_session", JSON.stringify(s)) : localStorage.removeItem("gf_session"); };
export async function login(email, password) {
  const r = await fetch(SB_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: SB_ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error_description || j.msg || "فشل الدخول");
  if (j.user?.id !== OWNER) throw new Error("هذا الحساب غير مصرّح له");
  saveSess({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, user: { id: j.user.id, email: j.user.email } });
}
export async function token() {
  if (!session) return null;
  if (session.expires_at && session.expires_at * 1000 - Date.now() < 60000 && navigator.onLine) {
    const r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: SB_ANON, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (r.ok) { const j = await r.json(); saveSess({ ...session, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at }); }
    else if (r.status === 400 || r.status === 401) { saveSess(null); location.reload(); return null; }
  }
  return session.access_token;
}
export async function rest(path, init = {}) {
  const t = await token();
  const r = await fetch(SB_URL + "/rest/v1/" + path, { ...init, headers: { apikey: SB_ANON, Authorization: "Bearer " + t, "content-type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error("rest " + r.status);
  const tx = await r.text(); return tx ? JSON.parse(tx) : null;
}

/* ---------------- Vault: PBKDF2 -> AES-GCM, encryption happens on this device ---------------- */
const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64big = (buf) => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
export let KEY = null; export const setKey = (k) => { KEY = k; };
export async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function enc(obj, key = KEY) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))); return { ct: b64big(ct), iv: b64(iv) }; }
export async function dec(ct, iv, key = KEY) { const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(iv) }, key, ub64(ct)); return JSON.parse(new TextDecoder().decode(pt)); }
async function vaultMeta() {
  let v = await idb.get("vault");
  if (navigator.onLine && session) { try { const r = await rest("gf_vault?select=salt,check_ct,check_iv"); if (r?.[0]) { v = r[0]; await idb.set("vault", v); } } catch {} }
  return v;
}
export async function unlock(pass) {
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
export let RECS = []; export const clearRecs = () => { RECS = []; }; // decrypted {id, kind, ...data, updated_at}
export async function loadLocal() {
  const raw = await idb.all(); const out = [];
  for (const r of raw) { if (r.deleted) continue; try { out.push({ ...(await dec(r.ct, r.iv)), id: r.id, kind: r.kind, updated_at: r.updated_at }); } catch {} }
  RECS = out.sort((a, b) => (b.t || 0) - (a.t || 0)); renderQueue();
}
export async function saveRec(kind, data, id = crypto.randomUUID()) {
  const { ct, iv } = await enc(data);
  await idb.put({ id, kind, ct, iv, updated_at: new Date().toISOString(), dirty: true, deleted: false });
  await loadLocal(); sync(); return id;
}
export async function delRec(id) {
  const raw = (await idb.all()).find((r) => r.id === id); if (!raw) return;
  await idb.put({ ...raw, deleted: true, dirty: true, updated_at: new Date().toISOString() }); await loadLocal(); sync();
}
let syncing = false;
export async function sync() {
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
export const hooks = { queue: () => {} };
const renderQueue = () => hooks.queue();

/* ---------------- Astronomy (algorithms after SunCalc by V. Agafonkin, BSD; Meeus) ---------------- */
const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
const toDays = (d) => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
const rightAsc = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
const decl = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
const altitude = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
const sidereal = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
const solarMeanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);
const eclipticLon = (M) => M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
export function sunTimes(date, lat, lng) {
  const lw = rad * -lng, phi = rad * lat, d = toDays(date);
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI)), ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = solarMeanAnomaly(ds), L = eclipticLon(M), dec = decl(L, 0);
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const at = (h) => { const w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const a = 0.0009 + (w + lw) / (2 * Math.PI) + n; const Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); return [fromJulian(Jnoon - (Jset - Jnoon)), fromJulian(Jset)]; };
  const [sunrise, sunset] = at(-0.833), [dawn, dusk] = at(-6), [nDawn, nDusk] = at(-12);
  return { sunrise, sunset, dawn, dusk, nauticalDawn: nDawn, nauticalDusk: nDusk, noon: fromJulian(Jnoon) };
}
function moonCoords(d) { const L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.22935 * d);
  const l = L + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dt = 385001 - 20905 * Math.cos(M); return { ra: rightAsc(l, b), dec: decl(l, b), dist: dt }; }
export function moonAlt(date, lat, lng) { const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = moonCoords(d), H = sidereal(d, lw) - c.ra;
  let h = altitude(H, phi, c.dec); h += rad * 0.017 / Math.tan(h + rad * 10.26 / (h + rad * 5.10)); return h / rad; }
/** Solunar periods (J. A. Knight's method): majors = moon transit (overhead) and underfoot ±1 h; minors = moonrise / moonset ±30 min. */
export function solunar(day, lat, lon) {
  const t0 = new Date(day); t0.setHours(0, 0, 0, 0); const step = 5 * 60e3, pts = [];
  for (let t = t0.getTime() - 3600e3; t <= t0.getTime() + 25 * 3600e3; t += step) pts.push([t, moonAlt(new Date(t), lat, lon)]);
  const ev = [];
  for (let i = 1; i < pts.length - 1; i++) { const [t, a] = pts[i], p = pts[i - 1][1], n = pts[i + 1][1];
    if (a > p && a >= n) ev.push({ k: "transit", t: new Date(t) }); if (a < p && a <= n) ev.push({ k: "underfoot", t: new Date(t) });
    if (p < 0.125 && a >= 0.125) ev.push({ k: "rise", t: new Date(t) }); if (p > 0.125 && a <= 0.125) ev.push({ k: "set", t: new Date(t) }); }
  const inDay = (x) => x.t >= t0 && x.t < new Date(t0.getTime() + dayMs);
  return ev.filter(inDay).map((x) => { const major = x.k === "transit" || x.k === "underfoot", w = major ? 3600e3 : 1800e3; return { ...x, major, start: new Date(x.t - w), end: new Date(+x.t + w) }; }).sort((a, b) => a.t - b.t);
}
export function moon(d = new Date()) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14) / 864e5;
  const age = (((d.getTime() / 864e5 - ref) % syn) + syn) % syn;
  const illum = (1 - Math.cos((2 * Math.PI * age) / syn)) / 2;
  const names = ["محاق", "هلال متزايد", "تربيع أول", "أحدب متزايد", "بدر", "أحدب متناقص", "تربيع أخير", "هلال متناقص"];
  const idx = Math.floor(((age / syn) * 8 + 0.5)) % 8;
  return { age, illum, name: names[idx], idx };
}
export const haversine = (a, b) => { const R = 6371, dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }; // km

/* ---------------- Units ---------------- */
export const units = () => ({ speed: "kn", dist: "nm", depth: "m", temp: "c", ...JSON.parse(localStorage.getItem("gf_units") || "{}") });
export const U = {
  wind: (kmh) => kmh == null ? "—" : units().speed === "kn" ? `${Math.round(kmh / 1.852)} عقدة` : units().speed === "ms" ? `${(kmh / 3.6).toFixed(1)} م/ث` : `${Math.round(kmh)} كم/س`,
  windN: (kmh) => units().speed === "kn" ? kmh / 1.852 : units().speed === "ms" ? kmh / 3.6 : kmh,
  windU: () => ({ kn: "عقدة", ms: "م/ث", kmh: "كم/س" }[units().speed]),
  dist: (km) => km == null ? "—" : units().dist === "nm" ? `${(km / 1.852).toFixed(1)} ميل بحري` : `${km.toFixed(1)} كم`,
  depth: (m) => m == null ? "—" : units().depth === "ft" ? `${Math.round(m * 3.281)} قدم` : `${Math.round(m)} م`,
  temp: (c) => c == null ? "—" : units().temp === "f" ? `${Math.round(c * 9 / 5 + 32)}°ف` : `${c.toFixed(1)}°`,
  wave: (m) => m == null ? "—" : units().depth === "ft" ? `${(m * 3.281).toFixed(1)} قدم` : `${m.toFixed(1)} م`,
};
