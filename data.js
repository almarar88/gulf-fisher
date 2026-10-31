// Verified facts only. Each item links its source. status: "verified" items may trigger alerts; "confirm" items never do.
export const SRC = {
  moccaeCal: "https://www.moccae.gov.ae/assets/download/ad45e7b3/Poster_FishDecreeCalendar_2023.pdf.aspx",
  moccae501: "https://moccae.gov.ae/Handlers/DownloadPDF.ashx?id=58214",
  kt: "https://www.khaleejtimes.com/life-and-living/fishing-in-the-uae-how-to-get-a-recreational-licence-penalties-seasons-explained",
  ead: "https://www.ead.gov.ae/-/media/Project/EAD/EAD/Documents/KnowledgeHub/Resources-and-Materials/EN-Recreational-Fishing-Factsheet-2023.pdf",
  eadDec: "https://www.mediaoffice.abudhabi/en/environment/environment-agency-abu-dhabi-issues-decision-to-regulate-recreational-fishing-and-fishing-competitions-in-the-emirate/",
  mpa: "https://www.admaritime.ae/wp-content/uploads/2025/12/ABU_DHABI_MARITIME_MPA_Guide_2020.pdf",
  hadaq: "https://moccae.gov.ae/en/about-us/ministry-apps/hadaaq-app",
  angl: "https://anglershub.ae/blogs/anglershub-blogs/sustainable-fishing-uae-bag-limits-protected-species",
  fwg: "https://www.fishingworldguide.com/en/blog/fishing-in-united-arab-emirates",
  om: "https://open-meteo.com/en/docs/marine-weather-api",
  gebco: "https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid",
  otd: "https://www.opentopodata.org/datasets/gebco2020/",
};
// Species named in the sources above (MOCCAE calendar / decision, EAD-related sources). "أخرى" lets the user type any name.
export const SPECIES = [
  { id: "hamour", ar: "هامور", en: "Grouper (Hamour)" },
  { id: "kanaad", ar: "كنعد", en: "Kingfish / Narrow-barred Spanish mackerel" },
  { id: "shaari", ar: "شعري", en: "Sheri / Shaari" },
  { id: "safi", ar: "صافي", en: "Safi (Rabbitfish)" },
  { id: "badeh", ar: "بدح", en: "Badeh" },
  { id: "sardine", ar: "عومة (سردين)", en: "Sardine" },
  { id: "anchovy", ar: "برية (أنشوفة)", en: "Anchovy" },
  { id: "shark", ar: "قرش", en: "Shark" },
  { id: "other", ar: "أخرى", en: "Other" },
];
// months are 1..12
export const RULES = [
  { id: "sheri-safi", status: "verified", species: ["shaari", "safi"], months: [3, 4], area: "كل الدولة",
    text: "حظر صيد وتداول الشعري والصافي من 1 مارس إلى 30 أبريل (القرار الوزاري رقم 501 لسنة 2015). ويطلب من الصيادين إرجاعها للماء إذا انصادت بالغلط.", src: [SRC.moccae501, SRC.moccaeCal] },
  { id: "shark-listed", status: "verified", species: ["shark"], months: [1,2,3,4,5,6,7,8,9,10,11,12], area: "كل الدولة",
    text: "صيد أنواع القرش الواردة في القوائم (1) و(2) و(3) من القرار الوزاري رقم 43 لسنة 2019 محظور طول السنة.", src: [SRC.moccaeCal, SRC.kt] },
  { id: "shark-other", status: "verified", species: ["shark"], months: [3, 4, 5, 6], area: "كل الدولة",
    text: "صيد أنواع القرش غير الواردة في القوائم (1) و(2) و(3) من القرار 43 لسنة 2019 محظور في مارس وأبريل ومايو ويونيو.", src: [SRC.moccaeCal, SRC.kt] },
  { id: "sardine", status: "verified", species: ["sardine", "anchovy"], months: [7], area: "كل الدولة",
    text: "صيد أسماك البرية والعومة (الأنشوفة والسردين) محظور في شهر يوليو.", src: [SRC.moccaeCal, SRC.kt] },
  { id: "badeh", status: "verified", species: ["badeh"], months: [4, 5], area: "أبوظبي فقط",
    text: "صيد وتسويق أسماك البدح في جميع مناطق الصيد في إمارة أبوظبي محظور في أبريل ومايو.", src: [SRC.moccaeCal, SRC.kt] },
  { id: "halaq", status: "verified", species: [], months: [], area: "حسب الإمارة",
    text: "شباك الحلاق (التحويط): محظورة طول السنة في أبوظبي ودبي، ومن يونيو إلى أكتوبر في الشارقة وعجمان وأم القيوين ورأس الخيمة والفجيرة. والقراقير محظورة طول السنة في مياه أبوظبي.", src: [SRC.moccaeCal, SRC.kt] },
  { id: "kanaad", status: "confirm", species: ["kanaad"], months: [], area: "؟",
    text: "موسم حظر الكنعد: المصادر غير الرسمية متعارضة (فبراير–أغسطس في مصدر، وأغسطس–أكتوبر في مصدر آخر). يحتاج تأكيد من الوزارة أو تطبيق حدق. لا يُستخدم للتنبيه.", src: [SRC.fwg, SRC.angl] },
  { id: "sizes", status: "confirm", species: ["hamour", "kanaad", "shaari", "safi"], months: [], area: "؟",
    text: "الحد الأدنى للطول حسب مصدر تجاري غير رسمي: هامور 45 سم، كنعد 45 سم، شعري 22 سم، صافي 17 سم. يحتاج تأكيد رسمي. لا يُستخدم للتنبيه.", src: [SRC.angl] },
];
export const LICENCE = [
  { status: "verified", text: "أبوظبي: الصيد الترفيهي يحتاج رخصة من هيئة البيئة عبر منصة تم. الرسوم 30 درهم أسبوعياً أو 120 درهم سنوياً، والعمر 18 فما فوق (ومن هم أقل يرافقون حامل رخصة).", src: [SRC.ead, SRC.eadDec] },
  { status: "verified", text: "أبوظبي: يمنع الصيد الترفيهي في المواقع المعلّم عليها بمنع الصيد، والمناطق العسكرية والنفطية، والمحميات، وقنوات الملاحة، وتحت الجسور البحرية.", src: [SRC.ead] },
  { status: "verified", text: "أبوظبي: عند استخدام بندقية الصيد يرفع علم الغوص الدولي، ولازم يكون على القارب 3 حاملين رخصة على الأقل. والصيد الترفيهي لا يُباع.", src: [SRC.ead, SRC.eadDec] },
];
export const MPA = [
  { status: "verified", text: "محميتا مروح والياسات: الصيد الترفيهي مسموح فقط بالخيط والسنارة للمرخّصين.", src: [SRC.mpa] },
  { status: "verified", text: "المناطق الأساسية في بطينة والبزم: يمنع أي نوع من الصيد.", src: [SRC.mpa] },
  { status: "verified", text: "يمنع الصيد في: محمية بو السيايف، ومنتزه القرم الوطني البحري، ومنتزه السعديات الوطني البحري، ومحمية رأس غناضة.", src: [SRC.mpa] },
  { status: "verified", text: "حدود المحميات غير مرسومة في هذا التطبيق. للتأكد من موقعك استخدم تطبيق حدق الرسمي من وزارة التغير المناخي والبيئة.", src: [SRC.hadaq] },
];
