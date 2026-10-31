// Native bridge for the Android build (Capacitor). Runs before the app; no-op in a normal browser.
(function () {
  const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const P = C.Plugins || {}, G = P.Geolocation, BG = P.BackgroundGeolocation, KA = P.KeepAwake, TTS = P.TextToSpeech;
  const pos = (l) => ({ coords: { latitude: l.latitude, longitude: l.longitude, accuracy: l.accuracy ?? 10, altitude: l.altitude ?? null, altitudeAccuracy: l.altitudeAccuracy ?? null, heading: l.bearing ?? l.heading ?? null, speed: l.speed ?? null }, timestamp: l.time || Date.now() });
  const err = (e) => ({ code: /denied|permission/i.test(String(e?.message || e)) ? 1 : 2, message: String(e?.message || e) });
  const W = new Map(); let n = 0;
  const geo = {
    getCurrentPosition(ok, bad, o) { G.getCurrentPosition({ enableHighAccuracy: o?.enableHighAccuracy !== false, timeout: o?.timeout || 15000, maximumAge: o?.maximumAge || 0 }).then((p) => ok(p), (e) => bad && bad(err(e))); },
    watchPosition(ok, bad, o) { const id = ++n;
      // background watcher keeps fixes coming with the screen off (foreground-service notification) — used by navigation and the anchor alarm
      if (BG) BG.addWatcher({ backgroundTitle: "صيّاد الخليج يتابع موقعك", backgroundMessage: "الملاحة أو منبّه المرساة شغّال", requestPermissions: true, stale: false, distanceFilter: 0 },
        (l, e) => { if (e) { bad && bad(err(e)); return; } if (l) ok(pos(l)); }).then((wid) => W.set(id, { bg: wid }), () => fallback());
      else fallback();
      function fallback() { G.watchPosition({ enableHighAccuracy: o?.enableHighAccuracy !== false, timeout: o?.timeout || 20000, maximumAge: 0 }, (p, e) => { if (e) bad && bad(err(e)); else if (p) ok(p); }).then((cid) => W.set(id, { fg: cid })); }
      return id; },
    clearWatch(id) { const w = W.get(id); if (!w) return; W.delete(id); if (w.bg) BG.removeWatcher({ id: w.bg }); if (w.fg) G.clearWatch({ id: w.fg }); },
  };
  try { Object.defineProperty(navigator, "geolocation", { value: geo, configurable: true }); } catch {}
  window.GFNative = {
    async keepAwake(on) { try { on ? await KA.keepAwake() : await KA.allowSleep(); } catch {} },
    tts(t) { TTS && TTS.stop().catch(() => {}).finally(() => TTS.speak({ text: t, lang: "ar-SA", rate: 1.0, category: "playback" }).catch(() => {})); },
    ttsStop() { TTS && TTS.stop().catch(() => {}); },
  };
})();
