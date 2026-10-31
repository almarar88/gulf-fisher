// صيّاد الخليج — Edge Function: owner-only Gemini proxy (fish photo ID + trip advice). The AI key never reaches the client.
const SB = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const KEY = Deno.env.get("TV_AI_API_KEY") ?? "";
const OWNER = "538e2219-4801-4f4b-8d21-78ec5712433e";
const ORIGINS = ["https://almarar88.github.io", "http://localhost:8080", "http://127.0.0.1:8080"];
const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODELS: [string, any][] = [["gemini-3.5-flash", { thinkingLevel: "low" }], ["gemini-flash-latest", null], ["gemini-3.5-flash-lite", { thinkingLevel: "low" }], ["gemini-flash-lite-latest", null]];
const SPECIES = ["هامور", "كنعد", "شعري", "صافي", "بدح", "عومة", "برية", "قرش", "غير ذلك"];

async function gen(system: string, parts: any[]) {
  let last = "busy";
  for (const [m, think] of MODELS) {
    const generationConfig: any = { temperature: 0.2, maxOutputTokens: 3000, responseMimeType: "application/json" };
    if (think) generationConfig.thinkingConfig = think;
    try {
      const r = await fetch(API + m + ":generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }], generationConfig }), signal: AbortSignal.timeout(60000) });
      if (!r.ok) { last = "http " + r.status; continue; }
      const j = await r.json();
      const t = (j.candidates?.[0]?.content?.parts ?? []).filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join("");
      if (t) return { data: JSON.parse(t.replace(/^```json|```$/g, "")), model: m };
    } catch (e) { last = String(e).slice(0, 80); }
  }
  throw new Error(last);
}

Deno.serve(async (req) => {
  const o = req.headers.get("origin") || "";
  const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "method" }, 405);
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: ANON, Authorization: "Bearer " + tok } });
  const uj = u.ok ? await u.json() : null;
  if (!uj?.id || uj.id !== OWNER) return out({ error: "unauthorized" }, 401);
  let body: any; try { body = await req.json(); } catch { return out({ error: "bad json" }, 400); }
  try {
    if (body.action === "fishid") {
      const img = String(body.image || ""); const m = img.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (!m || img.length > 3_000_000) return out({ error: "image" }, 400);
      const sys = `أنت مساعد تعرّف على أسماك الخليج العربي. أجب بالعربي فقط بصيغة JSON: {"species": واحد من ${JSON.stringify(SPECIES)}, "common_name_ar": اسم شائع, "scientific_guess": اسم علمي أو "", "confidence": رقم 0-1, "notes": جملة قصيرة, "length_note": ملاحظة عن تقدير الطول إن وجد مرجع في الصورة وإلا ""}. لا تخترع. إذا الصورة ليست سمكة أو غير واضحة اجعل confidence أقل من 0.3. هذا تقدير وليس تأكيد.`;
      const r = await gen(sys, [{ inline_data: { mime_type: m[1], data: m[2] } }, { text: "تعرّف على هذه السمكة." }]);
      return out({ ok: true, ...r });
    }
    if (body.action === "advice") {
      const c = JSON.stringify(body.conditions ?? {}).slice(0, 6000);
      const sys = `أنت مستشار رحلات صيد ترفيهي في مياه الإمارات. استخدم فقط البيانات المعطاة (توقعات Open-Meteo، طور القمر، المد، الدرجات التقديرية، سجل صيد المستخدم، القواعد الموثّقة). لا تخترع أنظمة أو أرقام. أجب بلهجة خليجية واضحة بصيغة JSON: {"go": "نعم"|"بحذر"|"لا", "best_window": نص, "summary": فقرة قصيرة, "tips": [حتى 5 نقاط], "safety": [نقاط سلامة], "disclaimer": "تقدير وليس ضمان، ليس للملاحة"}.`;
      const r = await gen(sys, [{ text: "الظروف: " + c }]);
      return out({ ok: true, ...r });
    }
    return out({ error: "action" }, 400);
  } catch (e) { return out({ error: "ai_unavailable", detail: String(e).slice(0, 120) }, 502); }
});
