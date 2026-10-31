// صيّاد الخليج — Edge Function: owner-only Gemini proxy. The AI key never reaches the client.
import { handle } from "./logic.ts";
const SB = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const KEY = Deno.env.get("TV_AI_API_KEY") ?? "";
const OWNER = "538e2219-4801-4f4b-8d21-78ec5712433e";
// web app, local dev, and the Capacitor Android app (WebView origin https://localhost)
const ORIGINS = ["https://almarar88.github.io", "http://localhost:8080", "http://127.0.0.1:8080", "https://localhost", "capacitor://localhost"];
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
  try { const r = await handle(body, KEY); return out(r.body, r.status); }
  catch (e) { return out({ error: "ai_unavailable", detail: String(e).slice(0, 120) }, 502); }
});
