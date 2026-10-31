// Renders the app icon + splash art (SVG -> PNG) for @capacitor/assets
import puppeteer from "puppeteer-core"; import path from "path";
const D = import.meta.dirname;
const ticks = Array.from({ length: 36 }, (_, k) => { const a = k * 10 * Math.PI / 180, r1 = k % 9 === 0 ? 300 : 318, r2 = 334; return `<line x1="${512 + r1 * Math.sin(a)}" y1="${512 - r1 * Math.cos(a)}" x2="${512 + r2 * Math.sin(a)}" y2="${512 - r2 * Math.cos(a)}" stroke="#fff" stroke-opacity="${k % 9 ? .35 : .8}" stroke-width="${k % 9 ? 5 : 9}" stroke-linecap="round"/>`; }).join("");
const mark = `<g>
  <circle cx="512" cy="512" r="350" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="14"/>${ticks}
  <path d="M512 150 L548 250 L476 250 Z" fill="#ff453a"/>
  <path d="M300 640 q53 -34 106 0 t106 0 t106 0 t106 0" fill="none" stroke="#5ac8fa" stroke-width="22" stroke-linecap="round"/>
  <path d="M330 700 q46 -28 91 0 t91 0 t91 0 t91 0" fill="none" stroke="#5ac8fa" stroke-opacity=".55" stroke-width="16" stroke-linecap="round"/>
  <g transform="translate(512 470) rotate(-14)">
    <path d="M-200 0 C-120 -110 90 -120 170 -10 C90 100 -120 100 -200 0 Z" fill="url(#fish)"/>
    <path d="M150 -8 L250 -90 L230 0 L250 90 Z" fill="#ffd60a"/>
    <path d="M-40 -82 C-10 -140 60 -140 80 -88 Z" fill="#ff9f0a"/>
    <circle cx="-130" cy="-18" r="17" fill="#06121f"/><circle cx="-135" cy="-23" r="5" fill="#fff"/>
    <path d="M-80 -40 q20 40 0 80" fill="none" stroke="#b37800" stroke-width="9" stroke-linecap="round" opacity=".6"/>
  </g>
  <path transform="translate(-95 -60) scale(1)" d="M700 300 l12 34 l34 12 l-34 12 l-12 34 l-12 -34 l-34 -12 l34 -12 z" fill="#fff"/>
</g>`;
const defs = `<defs><radialGradient id="sea" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#1aa3e8"/><stop offset=".55" stop-color="#0b5a86"/><stop offset="1" stop-color="#041a33"/></radialGradient>
  <linearGradient id="fish" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ffb400"/></linearGradient></defs>`;
const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${bg || ""}${body}</svg>`;
const icon = svg(1024, 1024, mark, `<rect width="1024" height="1024" fill="url(#sea)"/>`);
const fg = svg(1024, 1024, `<g transform="translate(512 512) scale(.62) translate(-512 -512)">${mark}</g>`);
const bgi = svg(1024, 1024, "", `<rect width="1024" height="1024" fill="url(#sea)"/>`);
const splash = (bgc) => svg(2732, 2732, `<g transform="translate(1366 1250) scale(.75) translate(-512 -512)"><circle cx="512" cy="512" r="440" fill="url(#sea)"/>${mark}</g>
  <text x="1366" y="1830" font-family="Noto Kufi Arabic, Noto Sans Arabic, sans-serif" font-size="150" font-weight="700" fill="#fff" text-anchor="middle">صيّاد الخليج</text>`, `<rect width="2732" height="2732" fill="${bgc}"/>`);
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] }); const p = await b.newPage();
for (const [n, s, w, t] of [["icon-only", icon, 1024, 0], ["icon-foreground", fg, 1024, 1], ["icon-background", bgi, 1024, 0], ["splash", splash("#06121f"), 2732, 0], ["splash-dark", splash("#041a33"), 2732, 0]]) {
  await p.setViewport({ width: w, height: w }); await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(D, n + ".png"), omitBackground: !!t, clip: { x: 0, y: 0, width: w, height: w } }); }
await p.setViewport({ width: 512, height: 512 }); await p.setContent(`<body style="margin:0">${icon.replace('width="1024" height="1024"', 'width="512" height="512"')}</body>`); await p.screenshot({ path: path.join(D, "preview.png") });
await b.close(); console.log("art ok");
