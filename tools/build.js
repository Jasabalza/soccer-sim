// Builds dist/soccersim_artifact.html (Claude artifact) and dist/soccersim_pc.html (standalone file) from src/.
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
const rd = (p) => fs.readFileSync(path.join(R, p), "utf8");
const order = JSON.parse(rd("src/engine/ORDER.json"));
const data = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) data[k] = rd("data/" + k + ".json");
const rt = ["sha_consts", "rt_random", "rt_core", "rt_ser"].map((n) => rd("src/rt/" + n + ".js")).join("\n");
const engine = order.map((n) => rd("src/engine/" + n + ".js")).join("\n");
const platform = rd("src/platform/shim_web.js");
const engineJs = "const $mods = {};\n" + rt + "\n" + platform + "\n" + engine + "\nwindow.SIM = { request: $mods.shim.request, init: $mods.shim.init, store: $mods.shim.store, logos: $mods.shim.logos, canExport: $mods.shim.canExport };";
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
// optional: node tools/build.js --site  ->  also writes docs/ (the GitHub Pages site: index.html, manifest, service worker; icons come from tools/make_icons.js)
// optional: node tools/build.js --logos logos_pack  ->  also writes dist/soccersim_personal.html with the logo pack baked in (PERSONAL use, never published)
const li = process.argv.indexOf("--logos"), LOGOS = li > 0 ? path.join(R, process.argv[li + 1]) : null;
function logoScript() {
  const man = JSON.parse(fs.readFileSync(path.join(LOGOS, "manifest.json"), "utf8")), out = {};
  for (const [name, e] of Object.entries(man.clubs)) out[name] = fs.readFileSync(path.join(LOGOS, "128", e.file)).toString("base64");
  return "window.__LOGOS = " + JSON.stringify(out) + ";";
}
function page(kind, logos) {
  const css = rd("src/ui/style.css");
  const scripts = [
    "window.__DATA = " + JSON.stringify(data) + ";" + "window.__KIND = " + JSON.stringify(kind) + ";" + (logos ? logoScript() : ""),
    "(function(){\n" + engineJs + "\n})();",
    rd("src/ui/emblems.js"), rd("src/ui/flags.js"), rd("src/ui/pages.js"), rd("src/ui/hof_ui.js"), rd("src/ui/moves_ui.js"), rd("src/ui/app.js"),
  ].map((s) => "<script>" + safe(s) + "</script>").join("\n");
  return `<title>Soccer Sim</title>\n<style>\n:root { color-scheme: dark; }\n${css}\n</style>\n${rd("src/ui/body.html")}\n${scripts}\n`;
}
fs.mkdirSync(path.join(R, "dist"), { recursive: true });
const art = page("artifact");
fs.writeFileSync(path.join(R, "dist/soccersim_artifact.html"), art);
fs.writeFileSync(path.join(R, "dist/soccersim_pc.html"),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">' + page("pc") + "</body></html>");
if (LOGOS) {
  fs.writeFileSync(path.join(R, "dist/soccersim_personal.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">' + page("pc", true) + "</body></html>");
  fs.writeFileSync(path.join(R, "dist/soccersim_artifact_logos.html"), page("artifact", true));
  console.log("personal build", (fs.statSync(path.join(R, "dist/soccersim_personal.html")).size / 1024) | 0, "KB (logos baked in)");
}
if (process.argv.includes("--site")) {
  const crypto = require("crypto"), body = page("pc");
  const ver = crypto.createHash("sha1").update(body).digest("hex").slice(0, 10);
  const D = path.join(R, "docs"); fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, "index.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<meta name="theme-color" content="#0a120d"><meta name="color-scheme" content="dark">' +
    '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">' +
    '<meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="Soccer Sim">' +
    '<meta name="description" content="A multi-season club soccer ecosystem simulator: 16 leagues, 304 clubs, 110 nations.">' +
    '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><link rel="icon" href="icons/icon-192.png">' +
    '</head><body style="margin:0">' + body +
    '<script>if ("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });</script>' +
    "</body></html>");
  fs.writeFileSync(path.join(D, "manifest.webmanifest"), JSON.stringify({
    name: "Soccer Sim", short_name: "Soccer Sim", start_url: "./", scope: "./", display: "standalone",
    background_color: "#0f1a14", theme_color: "#0a120d", description: "Multi-season club soccer ecosystem simulator",
    icons: [{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }, null, 2));
  fs.writeFileSync(path.join(D, "sw.js"),
    "// network-first: always take the newest game when online, fall back to the cached copy offline. Saves live in IndexedDB and are never touched here.\n" +
    'const CACHE = "soccersim-' + ver + '", FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"];\n' +
    'self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).catch(() => {})); });\n' +
    'self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));\n' +
    'self.addEventListener("fetch", (e) => { if (e.request.method !== "GET") return;\n' +
    '  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }))); });\n');
  fs.writeFileSync(path.join(D, ".nojekyll"), "");
  console.log("site -> docs/ (" + ((fs.statSync(path.join(D, "index.html")).size / 1024) | 0) + " KB, cache " + ver + ")");
}
fs.writeFileSync(path.join(R, "dist/bundle_engine.js"), engineJs.replace("window.SIM =", "globalThis.__SIM ="));
console.log("built", (art.length / 1024) | 0, "KB");
