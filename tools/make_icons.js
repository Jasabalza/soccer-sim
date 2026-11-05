// Draws the app icons (pitch markings on dark green) into docs/icons/. usage: node tools/make_icons.js
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const out = path.join(__dirname, "..", "docs", "icons"); fs.mkdirSync(out, { recursive: true });
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3025"/><stop offset="1" stop-color="#0a120d"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)" fill="none" stroke="#3ddc84" stroke-width="14" stroke-linejoin="round" stroke-linecap="round">
<rect x="96" y="136" width="320" height="240" rx="14"/><line x1="256" y1="136" x2="256" y2="376"/>
<circle cx="256" cy="256" r="52"/><rect x="96" y="204" width="46" height="104"/><rect x="370" y="204" width="46" height="104"/></g>
<circle cx="256" cy="256" r="14" fill="#f5c542"/></svg>`;
(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  for (const [name, size, pad] of [["icon-192", 192, 1], ["icon-512", 512, 1], ["apple-touch-icon", 180, 1], ["icon-maskable-512", 512, 0.78]]) {
    await pg.setViewportSize({ width: size, height: size });
    await pg.setContent(`<body style="margin:0"><div style="width:${size}px;height:${size}px">${svg(pad).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</div></body>`);
    await pg.screenshot({ path: path.join(out, name + ".png"), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close(); console.log("icons ->", out);
})();
