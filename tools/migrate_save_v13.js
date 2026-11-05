// One-off, OFFLINE: bring a v12.x save up to v13 (Every Game Counts). Not part of the game.
// usage: node tools/migrate_save_v13.js <in.txt> <out.txt>
// What it does: loads the save with the v13 engine, backfills national head-to-head history from what the trophy history
// holds (World Cup, continental championship and Nations League finals), saves it back as SSAVE text.
// Scores of old finals are not in the history, so only the finals, winners, stories and heat are filled in (no goals).
const fs = require("fs"), vm = require("vm"), D = __dirname+"/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init,mods:$mods,$plain};");
const [inp, outp] = process.argv.slice(2);
(async () => {
  const R = __R; await R.init();
  let r = await R.request("/api/import_text", { text: fs.readFileSync(inp, "utf8"), name: "mig" }); if (r.code !== 200) throw new Error("import: " + JSON.stringify(r.body));
  r = await R.request("/api/load", { name: "mig" }); if (r.code !== 200) throw new Error("load: " + JSON.stringify(r.body));
  const w = R.mods.app_v11.need_world();
  if (!w.rv) w.rv = { v: 1, pairs: {}, used: {}, done: 0 };
  const rv = w.rv; if (!rv.nd) rv.nd = {};
  const key = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  const pair = (a, b) => { const k = key(a, b); return rv.pairs[k] || (rv.pairs[k] = { a: a < b ? a : b, b: a < b ? b : a, r: [0, 0, 0, 0, 0, 0], bigA: null, bigB: null, last: [], heat: 0, built: false, name: null, custom: null, since: null, story: [], ko: [0, 0], fin: 0, tr: 0, tf: 0, hum: 0, near: false }); };
  let added = 0;
  const final = (season, win, lose, title, heat) => {
    if (!win || !lose || !w.nations.has(win) || !w.nations.has(lose)) return;
    const p = pair(win, lose); p.nat = true; p.heat += heat; p.fin++; p.ko[p.a === win ? 0 : 1]++;
    if (p.since == null) p.since = season;
    p.story.push([season, win + " beat " + lose + " in the " + title + " final"]); if (p.story.length > 8) p.story.shift(); added++;
  };
  for (const h of w.hist.map((x) => R.$plain(x))) {
    if (h.wc) final(h.season, h.wc[0], h.wc[1], "World Cup", 7.5);
    for (const c of Object.values(h.ct || {})) final(h.season, c[0], c[1], c[2], 6);
    for (const c of Object.values(h.nl || {})) final(h.season, c[0], c[1], c[2], 5);
  }
  console.log("finals backfilled:", added, "| national pairs now:", Object.values(rv.pairs).filter((p) => p.nat).length);
  r = await R.request("/api/save", { name: "migrated" }); if (r.code !== 200) throw new Error("save: " + JSON.stringify(r.body));
  r = await R.request("/api/export_text?name=migrated"); if (r.code !== 200) throw new Error("export: " + JSON.stringify(r.body));
  fs.writeFileSync(outp, r.body.text); console.log("wrote", outp, Math.round(r.body.text.length / 1024) + " KB");
})().catch((e) => { console.log("ERR", e && e.stack || e); process.exit(1); });
