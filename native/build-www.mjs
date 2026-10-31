// copies the web app (repo root) into www/ and injects the native shim
import fs from "fs"; import path from "path";
const R = path.resolve(import.meta.dirname, ".."), W = path.resolve(import.meta.dirname, "www");
fs.rmSync(W, { recursive: true, force: true }); fs.mkdirSync(W);
for (const f of ["index.html", "app.js", "core.js", "data.js", "config.js", "styles.css", "manifest.json", "icons", "fonts", "vendor", "data"]) if (fs.existsSync(path.join(R, f))) fs.cpSync(path.join(R, f), path.join(W, f), { recursive: true });
fs.copyFileSync(path.join(import.meta.dirname, "native.js"), path.join(W, "native.js"));
let h = fs.readFileSync(path.join(W, "index.html"), "utf8"); const tag = '<script src="native.js"></script>';
const i = h.search(/<script[^>]*maplibre/); h = i >= 0 ? h.slice(0, i) + tag + "\n  " + h.slice(i) : h.replace("</head>", tag + "\n</head>");
fs.writeFileSync(path.join(W, "index.html"), h); console.log("www ready", fs.readdirSync(W).join(" "));
