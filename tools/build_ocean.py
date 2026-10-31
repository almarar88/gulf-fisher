#!/usr/bin/env python3
"""Build data/ocean.json (+ contours/POIs) from free public datasets. Run daily.
Sources: NASA JPL MUR SST v4.1 (0.01°), NOAA CoastWatch DINEOF gap-filled chlorophyll (2 km),
SRTM15+ bathymetry (15 arc-sec) via NOAA CoastWatch ERDDAP; OSM features via Overpass."""
import json, math, sys, time, urllib.request, urllib.parse, os
import numpy as np
from scipy import ndimage
E = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/"
LA0, LA1, LO0, LO1 = 22.4, 26.8, 51.0, 57.0
OUT = os.path.join(os.path.dirname(__file__), "..", "data")
def get(url, tries=6):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "gulf-fisher/1.0"}), timeout=180) as r: return r.read()
        except Exception as e:
            print("retry", i, e, file=sys.stderr); time.sleep(15 * (i + 1))
    raise SystemExit("failed " + url)
def grid(ds, var, stride, extra="", desc=False):
    la = f"({LA1}):{stride}:({LA0})" if desc else f"({LA0}):{stride}:({LA1})"
    q = f"{var}[(last)]{extra}[{la}][({LO0}):{stride}:({LO1})]"
    if ds == "srtm15plus": q = f"{var}[{la}][({LO0}):{stride}:({LO1})]"
    j = json.loads(get(E + ds + ".json?" + urllib.parse.quote(q, safe="[]():,")))
    rows = j["table"]["rows"]; c = j["table"]["columnNames"]
    ti = c.index("time") if "time" in c else None
    lats = sorted({r[c.index("latitude")] for r in rows}); lons = sorted({r[c.index("longitude")] for r in rows})
    li = {v: i for i, v in enumerate(lats)}; oi = {v: i for i, v in enumerate(lons)}
    a = np.full((len(lats), len(lons)), np.nan)
    for r in rows:
        v = r[c.index(var)]
        if v is not None: a[li[r[c.index("latitude")]], oi[r[c.index("longitude")]]] = v
    return np.array(lats), np.array(lons), a, (rows[0][ti] if ti is not None else None)
def regrid(lats, lons, a, tl, to):
    # nearest-neighbour onto target grid
    i = np.clip(np.searchsorted(lats, tl) , 0, len(lats) - 1); j = np.clip(np.searchsorted(lons, to), 0, len(lons) - 1)
    return a[np.ix_(i, j)]
STEP = 0.02
tl = np.round(np.arange(LA0, LA1 + 1e-9, STEP), 3); to = np.round(np.arange(LO0, LO1 + 1e-9, STEP), 3)
print("bathy…"); bl, bo, bz, _ = grid("srtm15plus", "z", 2)           # ~1/120°
print("sst…"); sl, so, sst, sst_t = grid("jplMURSST41", "analysed_sst", 2)  # 0.02°
print("chl…")
try: cl, co, chl, chl_t = grid("noaacwNPPN20S3ASCIDINEOF2kmDaily", "chlor_a", 1, "[(0.0)]", desc=True)
except SystemExit: cl, co, chl, chl_t = grid("noaacwNPPN20S3ASCIDINEOF2kmDaily", "chlor_a", 1, "[(0.0)]")
Z = regrid(bl, bo, bz, tl, to); S = regrid(sl, so, sst, tl, to); C = regrid(cl, co, chl, tl, to)
sea = (Z < -1) & ~np.isnan(S)  # sea = bathymetry below -1 m AND MUR has an ocean value
kmy = STEP * 111.0; kmx = STEP * 111.0 * np.cos(np.radians(tl))[:, None]
def gradmag(a):
    a = np.where(sea, a, np.nan); f = np.where(np.isnan(a), np.nanmean(a), a)
    gy = ndimage.sobel(f, 0) / 8 / kmy; gx = ndimage.sobel(f, 1) / 8 / kmx
    g = np.hypot(gx, gy); g[~sea] = np.nan
    # ignore gradients created by the coastline fill
    edge = ndimage.binary_dilation(~sea, iterations=1); g[edge] = np.nan; return g
gS = gradmag(S)                                  # °C per km
gC = gradmag(np.log10(np.clip(C, 0.01, 100)))    # log10(mg/m3) per km
gZ = gradmag(Z)                                  # m per km (slope)
# reef / wreck / shoal proximity from OpenStreetMap
print("overpass…")
oq = f"""[out:json][timeout:120];(node["natural"="reef"]({LA0},{LO0},{LA1},{LO1});way["natural"="reef"]({LA0},{LO0},{LA1},{LO1});
node["historic"="wreck"]({LA0},{LO0},{LA1},{LO1});node["seamark:type"="wreck"]({LA0},{LO0},{LA1},{LO1});
node["natural"="shoal"]({LA0},{LO0},{LA1},{LO1});way["natural"="shoal"]({LA0},{LO0},{LA1},{LO1});
node["place"="island"]({LA0},{LO0},{LA1},{LO1});way["place"="island"]({LA0},{LO0},{LA1},{LO1});node["place"="islet"]({LA0},{LO0},{LA1},{LO1}););out center tags;"""
pois = []
try:
    oj = json.loads(get("https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(oq), 2))
    for e in oj["elements"]:
        t = e.get("tags", {}); lat = e.get("lat") or e.get("center", {}).get("lat"); lon = e.get("lon") or e.get("center", {}).get("lon")
        if lat is None: continue
        k = "wreck" if (t.get("historic") == "wreck" or t.get("seamark:type") == "wreck") else "reef" if t.get("natural") == "reef" else "shoal" if t.get("natural") == "shoal" else "island"
        pois.append({"k": k, "lat": round(lat, 5), "lon": round(lon, 5), "n": t.get("name:ar") or t.get("name") or t.get("name:en") or ""})
except SystemExit: print("overpass failed", file=sys.stderr)
struct = np.zeros_like(Z, dtype=bool)
for p in pois:
    if p["k"] in ("reef", "wreck", "shoal"):
        i = int(round((p["lat"] - LA0) / STEP)); j = int(round((p["lon"] - LO0) / STEP))
        if 0 <= i < len(tl) and 0 <= j < len(to): struct[i, j] = True
dist = ndimage.distance_transform_edt(~struct) * STEP * 111.0 if struct.any() else np.full(Z.shape, 1e3)
def norm(g):
    v = g[sea & ~np.isnan(g)]; p = np.percentile(v, 95) if v.size else 1
    return np.clip(np.nan_to_num(g / (p or 1)), 0, 1)
# satellite pixels next to the coast are contaminated (land adjacency), and SRTM15+ nearshore depths are interpolated:
# taper edge signals from 0.3 at the shoreline to 1.0 at 8 km offshore.
coast_km = ndimage.distance_transform_edt(sea) * STEP * 111.0
taper = np.clip(0.3 + 0.7 * (coast_km - 2.0) / 6.0, 0.3, 1.0)
parts = {"sst_front": norm(gS) * taper, "chl_edge": norm(gC) * taper, "slope": norm(gZ) * np.clip(taper + 0.2, 0, 1), "structure": np.exp(-(dist ** 2) / (2 * 3.0 ** 2))}
q = lambda a: np.where(sea, np.round(a * 100), -1).astype(int).tolist()
out = {"generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "sst_time": sst_t, "chl_time": chl_t,
  "lat0": LA0, "lon0": LO0, "step": STEP, "rows": len(tl), "cols": len(to),
  "sources": {"sst": "NASA JPL MUR SST v4.1 via NOAA CoastWatch ERDDAP (jplMURSST41)", "chl": "NOAA CoastWatch DINEOF gap-filled chlorophyll 2 km (noaacwNPPN20S3ASCIDINEOF2kmDaily)",
    "depth": "SRTM15+ 15 arc-second via NOAA CoastWatch ERDDAP (srtm15plus)", "structure": "OpenStreetMap contributors via Overpass (natural=reef/shoal, historic=wreck, seamark:type=wreck)"},
  "depth": np.where(sea, np.round(-Z), -1).astype(int).tolist(),
  "sst": np.where(sea, np.round(np.nan_to_num(S) * 10), -1).astype(int).tolist(),
  "chl": np.where(sea & ~np.isnan(C), np.round(np.nan_to_num(C) * 100), -1).astype(int).tolist(),
  "parts": {k: q(v) for k, v in parts.items()},
  "sst_grad": np.where(sea & ~np.isnan(gS), np.round(np.nan_to_num(gS) * 1000), -1).astype(int).tolist(),
  "depth_slope": np.where(sea & ~np.isnan(gZ), np.round(np.nan_to_num(gZ)), -1).astype(int).tolist()}
# fine land mask (SRTM15+ at ~1/120°) so the heat layer never paints on land
land = np.isnan(bz) | (bz >= 0)
import base64
out["mask"] = {"lat0": float(bl[0]), "lon0": float(bo[0]), "dlat": float(bl[1] - bl[0]), "dlon": float(bo[1] - bo[0]), "rows": int(land.shape[0]), "cols": int(land.shape[1]),
  "bits": base64.b64encode(np.packbits(land.astype(np.uint8).ravel())).decode()}
# navigation depth grid for the sea router: uint8 metres (0-254), 255 = land/unknown; same geometry as mask
nd = np.where(land, 255, np.clip(np.round(-np.nan_to_num(bz, nan=1.0)), 0, 254)).astype(np.uint8)
open(os.path.join(OUT, "navdepth.bin"), "wb").write(nd.tobytes())
json.dump(out, open(os.path.join(OUT, "ocean.json"), "w"), separators=(",", ":"))
if pois: json.dump({"generated": out["generated"], "pois": pois}, open(os.path.join(OUT, "pois.json"), "w"), ensure_ascii=False, separators=(",", ":"))
else: print("keeping previous pois.json (Overpass failed)")
# depth contours from SRTM15+
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
levels = [5, 10, 20, 30, 50, 75, 100, 200]
D = np.where(np.isnan(bz), 0, -bz); D = ndimage.gaussian_filter(D, 0.8)
cs = plt.contour(bo, bl, D, levels=levels); feats = []
for lev, segs in zip(cs.levels, cs.allsegs):
    for s in segs:
        if len(s) < 4: continue
        feats.append({"type": "Feature", "properties": {"d": int(lev)}, "geometry": {"type": "LineString", "coordinates": [[round(x, 4), round(y, 4)] for x, y in s[:: 1]]}})
json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(OUT, "contours.geojson"), "w"), separators=(",", ":"))
print("ok", out["rows"], out["cols"], "sea cells", int(sea.sum()), "pois", len(pois), "contours", len(feats), sst_t, chl_t)
