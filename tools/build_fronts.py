#!/usr/bin/env python3
"""«خط الماء»: detect ocean fronts (temperature, chlorophyll/colour, turbidity) for the last 3 days.
Sources (NOAA CoastWatch ERDDAP): NASA JPL MUR SST v4.1 (jplMURSST41), NOAA DINEOF gap-filled chlorophyll-a 2 km
(noaacwNPPN20S3ASCIDINEOF2kmDaily) and Kd490 turbidity 2 km (noaacwNPPN20S3AkdSCIDINEOF2kmDaily).
Method: smooth each field, compute gradient magnitude (per km), trace isolines of the field and keep only the stretches
where the gradient is strong (tightly packed isolines = a front), drop the 4 km next to the coast, de-duplicate parallel isolines.
Output: data/fronts.geojson (LineStrings with type, day, age, gradient, strength, length)."""
import json, os, sys, time
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(__file__))
import importlib.util
E = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/"
OUT = os.path.join(os.path.dirname(__file__), "..", "data")
O = json.load(open(os.path.join(OUT, "ocean.json")))
LA0, LO0, STEP, NR, NC = O["lat0"], O["lon0"], O["step"], O["rows"], O["cols"]; LA1, LO1 = LA0 + (NR - 1) * STEP, LO0 + (NC - 1) * STEP
tl = np.round(LA0 + np.arange(NR) * STEP, 3); to = np.round(LO0 + np.arange(NC) * STEP, 3)
sea = np.array(O["depth"]) >= 0
coast_km = ndimage.distance_transform_edt(sea) * STEP * 111.0
import urllib.request, urllib.parse
def get(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "gulf-fisher/1.0"}), timeout=180) as r: return r.read()
        except Exception as e: print("retry", i, str(e)[:120], file=sys.stderr); time.sleep(10 * (i + 1))
    return None
def grid(ds, var, stride, t, extra="", desc=False):
    la = f"({LA1}):{stride}:({LA0})" if desc else f"({LA0}):{stride}:({LA1})"
    q = f"{var}[{t}]{extra}[{la}][({LO0}):{stride}:({LO1})]"
    raw = get(E + ds + ".json?" + urllib.parse.quote(q, safe="[]():,-"))
    if raw is None and not desc: return grid(ds, var, stride, t, extra, True)
    if raw is None: return None
    j = json.loads(raw); rows = j["table"]["rows"]; c = j["table"]["columnNames"]
    la_i, lo_i, v_i, t_i = c.index("latitude"), c.index("longitude"), c.index(var), c.index("time")
    lats = np.array(sorted({r[la_i] for r in rows})); lons = np.array(sorted({r[lo_i] for r in rows}))
    a = np.full((len(lats), len(lons)), np.nan); li = {v: i for i, v in enumerate(lats)}; oi = {v: i for i, v in enumerate(lons)}
    for r in rows:
        if r[v_i] is not None: a[li[r[la_i]], oi[r[lo_i]]] = r[v_i]
    i = np.clip(np.searchsorted(lats, tl), 0, len(lats) - 1); k = np.clip(np.searchsorted(lons, to), 0, len(lons) - 1)
    return a[np.ix_(i, k)], rows[0][t_i][:10]
kmy = STEP * 111.0; kmx = STEP * 111.0 * np.cos(np.radians(tl))[:, None]
def smooth(a):
    m = sea & ~np.isnan(a); f = np.where(m, a, 0.0); w = ndimage.gaussian_filter(m.astype(float), 1.0); s = ndimage.gaussian_filter(f, 1.0)
    out = np.where(w > 0.3, s / np.maximum(w, 1e-6), np.nan); out[~sea] = np.nan; return out
def gradmag(a):
    f = np.where(np.isnan(a), np.nanmean(a), a); gy = ndimage.sobel(f, 0) / 8 / kmy; gx = ndimage.sobel(f, 1) / 8 / kmx
    g = np.hypot(gx, gy); bad = ndimage.binary_dilation(np.isnan(a), iterations=1); g[bad] = np.nan; g[coast_km < 4] = np.nan; return g
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
def hk(lat1, lon1, lat2, lon2): return 111.0 * np.hypot(lat2 - lat1, (lon2 - lon1) * np.cos(np.radians((lat1 + lat2) / 2)))
# type: (field transform, isoline step, absolute minimum gradient per km, unit label)
CFG = {"sst": (lambda a: a, 0.2, 0.03, "°C/كم"), "chl": (lambda a: np.log10(np.clip(a, 0.01, 100)), 0.05, 0.012, "log(mg/m³)/كم"), "kd": (lambda a: np.log10(np.clip(a, 0.005, 10)), 0.04, 0.010, "log(1/m)/كم")}
def fronts(kind, raw, day, age):
    tf, dl, gmin, unit = CFG[kind]; F = smooth(tf(raw)); g = gradmag(F); gv = g[~np.isnan(g)]
    if gv.size < 500: return [], None
    p90, p97, p995 = np.percentile(gv, [93, 97, 99.5]); thr = max(gmin, p90)
    lv = np.arange(np.floor(np.nanmin(F) / dl) * dl, np.nanmax(F) + dl, dl)
    cs = plt.contour(to, tl, np.where(np.isnan(F), np.nan, F), levels=lv); plt.close("all")
    cand = []
    for segs in cs.allsegs:
        for s in segs:
            if len(s) < 4: continue
            jj = np.clip(np.round((s[:, 0] - LO0) / STEP).astype(int), 0, NC - 1); ii = np.clip(np.round((s[:, 1] - LA0) / STEP).astype(int), 0, NR - 1)
            gs = g[ii, jj]; ok = np.nan_to_num(gs) >= thr
            k = 0
            while k < len(s):
                if not ok[k]: k += 1; continue
                e = k
                while e + 1 < len(s) and ok[e + 1]: e += 1
                run = s[k:e + 1]
                if len(run) >= 3:
                    L = float(np.sum(hk(run[:-1, 1], run[:-1, 0], run[1:, 1], run[1:, 0])))
                    if L >= 10: cand.append((float(np.nanmean(gs[k:e + 1])), L, run, ii[k:e + 1], jj[k:e + 1]))
                k = e + 1
    cand.sort(key=lambda c: -c[0] * np.sqrt(c[1])); taken = np.zeros((NR, NC), bool); feats = []
    for gm, L, run, ii, jj in cand:
        near = ndimage.binary_dilation(taken, iterations=2)[ii, jj].mean() if taken.any() else 0
        if near > 0.5: continue
        taken[ii, jj] = True
        st = "قوي" if gm >= p995 else "متوسط" if gm >= p97 else "ضعيف"
        feats.append({"type": "Feature", "properties": {"t": kind, "day": day, "age": age, "g": round(gm, 4), "unit": unit, "s": st, "km": round(L, 1)},
                      "geometry": {"type": "LineString", "coordinates": [[round(float(x), 3), round(float(y), 3)] for x, y in run]}})
        if len(feats) >= 40: break
    return feats, {"p90": round(float(p90), 4), "p97": round(float(p97), 4), "p995": round(float(p995), 4), "thr": round(float(thr), 4)}
feats, stats = [], {}
for kind, ds, var, stride, extra, desc in [("sst", "jplMURSST41", "analysed_sst", 2, "", False), ("chl", "noaacwNPPN20S3ASCIDINEOF2kmDaily", "chlor_a", 1, "[(0.0)]", True), ("kd", "noaacwNPPN20S3AkdSCIDINEOF2kmDaily", "kd_490", 1, "[(0.0)]", True)]:
    for age in range(3):
        r = grid(ds, var, stride, f"last-{age}" if age else "last", extra, desc)
        if r is None: print("skip", kind, age, file=sys.stderr); continue
        a, day = r; f, s = fronts(kind, a, day, age); feats += f; stats[f"{kind}:{day}"] = {**(s or {}), "n": len(f)}
        print(kind, day, "fronts", len(f), s)
srcs = {"sst": "NASA JPL MUR SST v4.1 (jplMURSST41) via NOAA CoastWatch ERDDAP", "chl": "NOAA DINEOF gap-filled chlorophyll-a 2 km (noaacwNPPN20S3ASCIDINEOF2kmDaily)", "kd": "NOAA DINEOF gap-filled Kd490 turbidity 2 km (noaacwNPPN20S3AkdSCIDINEOF2kmDaily)"}
json.dump({"type": "FeatureCollection", "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "sources": srcs, "stats": stats, "features": feats},
          open(os.path.join(OUT, "fronts.geojson"), "w"), ensure_ascii=False, separators=(",", ":"))
print("ok features", len(feats))
