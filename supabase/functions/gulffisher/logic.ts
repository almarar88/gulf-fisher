// صيّاد الخليج — AI logic (Gemini). Pure functions: no auth here; index.ts gates every call to the owner.
const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODELS: [string, any][] = [["gemini-3.5-flash", { thinkingLevel: "low" }], ["gemini-flash-latest", null], ["gemini-3.5-flash-lite", { thinkingLevel: "low" }], ["gemini-flash-lite-latest", null]];
const SPECIES = ["هامور", "كنعد", "شعري", "صافي", "بدح", "عومة", "برية", "قرش", "غير ذلك"];
const RULES = `قواعد صارمة:
- استخدم فقط البيانات الموجودة في السياق (توقعات Open-Meteo، المد، القمر، الدرجات التقديرية للتطبيق، البقع المرشحة، سجل صيد المستخدم، والقواعد الموثقة مع مصادرها).
- لا تخترع أنظمة أو مواسم منع أو أحجام دنيا أو غرامات. إذا انسأل عنها وما كانت في "verified_rules" قل: ما عندي مصدر موثّق، راجع وزارة التغير المناخي والبيئة أو الجهة المحلية.
- لا تعطي نصائح طُعم محددة على أنها حقيقة لأن التطبيق ما عنده مصدر موثّق لها؛ تقدر تقترح يعتمد على سجل المستخدم نفسه (إذا مسجل طُعم) وقل إن هذا من سجله.
- لا تعطي أرقام إحداثيات غير الموجودة في السياق. كل أرقامك لازم تكون من السياق.
- السلامة أولاً: إذا الرياح أو الموج فوق حدود المستخدم أو unsafe=true قلها بوضوح.
- اكتب بلهجة خليجية إماراتية واضحة ومختصرة.`;

async function gen(system: string, parts: any[], key: string, temp = 0.3) {
  let last = "busy";
  for (const [i, [m, think]] of MODELS.entries()) {
    const generationConfig: any = { temperature: temp, maxOutputTokens: 4000, responseMimeType: "application/json" };
    if (think) generationConfig.thinkingConfig = think;
    try {
      const r = await fetch(API + m + ":generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts }], generationConfig }), signal: AbortSignal.timeout(i < 2 ? 25000 : 40000) });
      if (!r.ok) { last = "http " + r.status; continue; }
      const j = await r.json();
      const t = (j.candidates?.[0]?.content?.parts ?? []).filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join("");
      if (t) return { data: JSON.parse(t.trim().replace(/^```json\s*|```$/g, "")), model: m };
    } catch (e) { last = String(e).slice(0, 80); }
  }
  throw new Error(last);
}
const J = (x: unknown, n: number) => JSON.stringify(x ?? {}).slice(0, n);
const hist = (msgs: any) => (Array.isArray(msgs) ? msgs.slice(-12) : []).map((m: any) => `${m.role === "user" ? "المستخدم" : "المساعد"}: ${String(m.text || "").slice(0, 1500)}`).join("\n");
const dataUrl = (s: string, kind: string, max: number) => { const m = String(s || "").match(new RegExp(`^data:(${kind}/[a-z0-9.+-]+)(?:;[^,]*)?;base64,(.+)$`)); return m && s.length <= max ? { mime: m[1], data: m[2] } : null; };
const CHAT_SCHEMA = `{"answer": نص الجواب (حتى 120 كلمة), "spot": اسم بقعة من السياق أو "", "window": نافذة وقت من السياق أو "", "follow_ups": [حتى 3 أسئلة قصيرة مقترحة], "used": [أسماء حقول السياق اللي اعتمدت عليها]}`;

export async function handle(body: any, key: string) {
  const a = body?.action;
  if (a === "fishid") {
    const img = dataUrl(body.image, "image", 3_000_000); if (!img) return { status: 400, body: { error: "image" } };
    const sys = `أنت مساعد تعرّف على أسماك الخليج العربي. أجب بالعربي فقط بصيغة JSON: {"species": واحد من ${JSON.stringify(SPECIES)}, "common_name_ar": اسم شائع, "scientific_guess": اسم علمي أو "", "confidence": رقم 0-1 يعكس يقينك الفعلي, "alternatives": [حتى نوعين محتملين آخرين {"name": اسم, "confidence": 0-1}], "features": [حتى 3 علامات شكلية شفتها في الصورة وبنيت عليها], "notes": جملة قصيرة, "length_note": ملاحظة عن تقدير الطول إن وجد مرجع في الصورة وإلا ""}. لا تخترع. إذا الصورة ليست سمكة أو غير واضحة اجعل confidence أقل من 0.3 وspecies "غير ذلك". هذا تقدير وليس تأكيد.`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ inline_data: { mime_type: img.mime, data: img.data } }, { text: "تعرّف على هذه السمكة." }], key, 0.1)) } };
  }
  if (a === "birds") {
    const img = dataUrl(body.image, "image", 3_000_000); if (!img) return { status: 400, body: { error: "image" } };
    const sys = `أنت محلل صور بحرية لصياد في الخليج العربي. افحص الصورة بصدق وابحث عن علامات نشاط سمك على السطح: طيور بحرية تغوص أو تحوم بكثافة فوق نقطة (نوارس، خطاف البحر)، أو "فوران/غليان" سطحي (سمك صغير يقفز أو ماء يرتج بسبب سمك يطارد طُعم).
لا تفترض وجود شي ما تشوفه بوضوح. إذا الصورة مو للبحر أو مو واضحة قل ذلك. لا تخمّن نوع السمك تحت الماء.
أجب بالعربي بصيغة JSON فقط: {"sea_photo": true|false, "birds": true|false, "bird_count": "لا يوجد"|"قليل (1-5)"|"سرب (6-30)"|"سرب كبير (+30)", "behavior": "تغوص"|"تحوم فوق نقطة"|"طائرة عابرة"|"جالسة على الماء"|"لا يوجد", "boil": true|false, "signal": "قوي"|"متوسط"|"ضعيف"|"لا يوجد", "confidence": رقم 0-1, "evidence": [حتى 4 ملاحظات مرئية محددة], "note": جملة قصيرة}
"قوي" فقط إذا فيه طيور تغوص/تحوم بكثافة فوق نقطة أو فوران واضح. طيور طائرة عابرة أو جالسة = "ضعيف".`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ inline_data: { mime_type: img.mime, data: img.data } }, { text: "حلّل هذه الصورة." }], key, 0.1)) } };
  }
  if (a === "advice") {
    const sys = `أنت مستشار رحلات صيد ترفيهي في مياه الإمارات.\n${RULES}\nأجب بصيغة JSON: {"go": "نعم"|"بحذر"|"لا", "best_window": نص, "summary": فقرة قصيرة, "tips": [حتى 5 نقاط مبنية على السياق], "safety": [نقاط سلامة], "disclaimer": "تقدير وليس ضمان"}.`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ text: "الظروف: " + J(body.ctx ?? body.conditions, 9000) }], key)) } };
  }
  if (a === "chat") {
    const q = String(body.question || "").slice(0, 1500); if (!q) return { status: 400, body: { error: "question" } };
    const sys = `أنت "مساعد صيّاد الخليج"، مساعد صيد ذكي يرد بالعربي على صاحب التطبيق عن الصيد الترفيهي في مياه الإمارات: وين وإيمتى يروح، الظروف، بقعه، وسجله.\n${RULES}\nأجب بصيغة JSON: ${CHAT_SCHEMA}`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ text: `السياق (JSON): ${J(body.context, 14000)}\n\nالمحادثة السابقة:\n${hist(body.history)}\n\nسؤال المستخدم الآن: ${q}` }], key)) } };
  }
  if (a === "voice") {
    const au = dataUrl(body.audio, "audio", 4_000_000); if (!au) return { status: 400, body: { error: "audio" } };
    const sys = `أنت "مساعد صيّاد الخليج". المستخدم سجّل سؤال صوتي بالعربي (غالباً لهجة إماراتية). أولاً فرّغ كلامه حرفياً، ثم جاوب.\n${RULES}\nأجب بصيغة JSON: {"transcript": تفريغ كلام المستخدم, ${CHAT_SCHEMA.slice(1)}. إذا الصوت غير واضح اجعل transcript "" وanswer يطلب منه يعيد.`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ inline_data: { mime_type: au.mime, data: au.data } }, { text: `السياق (JSON): ${J(body.context, 14000)}\n\nالمحادثة السابقة:\n${hist(body.history)}` }], key)) } };
  }
  if (a === "plan") {
    const sys = `أنت مخطط رحلة صيد يومية. عندك من التطبيق: درجات الساعات (score 0-100، unsafe)، والبقع المرشحة مع درجتها وأسبابها والمسافة والمسار البحري المحسوب، والظروف. اختار أفضل بقعة ونافذة وقت من الموجود فقط، واشرح ليش.\n${RULES}\nأجب بصيغة JSON: {"go": "نعم"|"بحذر"|"لا", "spot_id": معرف البقعة المختارة من candidates (id) أو "", "window": "HH:MM–HH:MM" من hours, "headline": جملة واحدة, "why": [3-5 أسباب مبنية على الأرقام], "route_note": جملة عن المسار (المسافة/الوقت/الوقود من السياق), "plan": [خطوات الرحلة بالترتيب مع أوقات], "safety": [نقاط], "alternative": {"spot_id": "", "why": ""}}. إذا كل الساعات unsafe خلي go "لا" وspot_id "".`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ text: "بيانات اليوم: " + J(body.context, 16000) }], key, 0.2)) } };
  }
  if (a === "logsummary") {
    const sys = `أنت محلل سجل صيد. حلّل صيدات المستخدم (مع المد والقمر والضغط والرياح والوقت والبقعة والنوع) وطلّع أنماط حقيقية مدعومة بأرقام من السجل نفسه.\n${RULES}\n- لا تعمم من عدد قليل: إذا الأنماط مبنية على أقل من 10 صيدات خلي strength "ضعيف" أو "متوسط" وقل إنها مؤشر أولي.\nأجب بصيغة JSON: {"summary": فقرة قصيرة, "patterns": [{"text": نمط, "evidence": "مثلاً 4 من 6 صيدات…", "strength": "قوي"|"متوسط"|"ضعيف"}], "best": {"species": "", "spot": "", "tide": "", "hour": ""}, "suggestions": [حتى 4 اقتراحات مبنية على السجل], "caveat": نص}.`;
    return { status: 200, body: { ok: true, ...(await gen(sys, [{ text: "السجل: " + J(body.log, 20000) }], key, 0.2)) } };
  }
  return { status: 400, body: { error: "action" } };
}
