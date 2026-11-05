// Turns a logo folder (manifest.json + 128/<file>.webp) into the single JSON file the game's "Import logo file" button reads.
// usage: node tools/make_logo_json.js [logos_pack] [out.json]     (the logo pictures are NOT part of the project: this is for your own pack)
const fs = require("fs"), path = require("path");
const dir = process.argv[2] || "logos_pack", out = process.argv[3] || "soccersim_logos.json";
const man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")), clubs = {};
for (const [name, e] of Object.entries(man.clubs)) {
  const f = path.join(dir, "128", e.file);
  if (!fs.existsSync(f)) { console.log("missing:", name, e.file); continue; }
  clubs[name] = fs.readFileSync(f).toString("base64");
}
fs.writeFileSync(out, JSON.stringify({ format: "soccersim-logos", version: 1, mime: "image/webp", note: "personal use; one image per club, keyed by the club name used in the game", clubs }));
console.log(Object.keys(clubs).length + " logos ->", out, (fs.statSync(out).size / 1048576).toFixed(1) + " MB");
