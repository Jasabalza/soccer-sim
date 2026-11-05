// v13.1: the club swap + save migration. usage: node tools/t_club_swap.js <old_save.txt> <old_bundle.js> <old_data_dir>
const fs = require("fs"), vm = require("vm"), zlib = require("zlib");
const [oldSave, oldBundle, oldData] = process.argv.slice(2);
const SW = { "Fatih Karagümrük": "Erzurumspor", "Antalyaspor": "Amed", "Kayserispor": "Çorum", "AVS": "Académico de Viseu", "Tondela": "Marítimo", "Mazatlán FC": "Atlante", "Livingston": "St Johnstone", "Júbilo Iwata": "Yokohama FC", "Al Raed": "Al Najma" };
function boot(bundle, dataDir) {
  const ctx = vm.createContext({ console, require, setTimeout, TextEncoder, TextDecoder, Buffer, atob: (s) => Buffer.from(s, "base64").toString("binary"), btoa: (s) => Buffer.from(s, "binary").toString("base64"), CompressionStream, DecompressionStream, Blob, Response, ReadableStream, WritableStream, TransformStream, crypto: globalThis.crypto });
  ctx.globalThis = ctx; ctx.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) ctx.__DATA[k] = fs.readFileSync(dataDir + "/" + k + ".json", "utf8");
  vm.runInContext(fs.readFileSync(bundle, "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init,mods:$mods,$plain};", ctx);
  return ctx.__R;
}
async function load(R, text) {
  await R.init();
  let r = await R.request("/api/import_text", { text, name: "t" }); if (r.code !== 200) throw new Error(JSON.stringify(r.body));
  r = await R.request("/api/load", { name: "t" }); if (r.code !== 200) throw new Error(JSON.stringify(r.body));
  return R.mods.app_v11.need_world();
}
(async () => {
  const text = fs.readFileSync(oldSave, "utf8");
  const O = boot(oldBundle, oldData), wo = await load(O, text);
  const N = boot(__dirname + "/../dist/bundle_engine.js", __dirname + "/../data"), wn = await load(N, text);   // new engine loads the OLD save: migrates on load
  let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log("FAIL", m); } };
  const keys = (w) => w.clubs.itemsArr().map((e) => e[0]);
  const kn = new Set(keys(wn)), ko = keys(wo);
  ok(ko.length === 304 && kn.size === 304, "304 clubs both sides");
  for (const c of ko) ok(kn.has(SW[c] || c), "club carried over: " + c);
  for (const o of Object.keys(SW)) ok(!kn.has(o), "old club gone: " + o);
  // every club in every league exists in the world and has a location
  const GEO = N.mods.app_v11.GEO; for (const [ln, L] of wn.leagues.itemsArr()) for (const c of (L.get_ ? L.get_("clubs") : L.clubs)) { ok(kn.has(c), "league club in world: " + c); ok(GEO.has(c), "geo: " + c); }
  // no old name left anywhere in the migrated world (checked on its saved text)
  { let r0 = await N.request("/api/save", { name: "chk" }); r0 = await N.request("/api/export_text?name=chk"); const t = r0.body.text, sn = zlib.gunzipSync(Buffer.from(t.slice(t.indexOf(":") + 1), "base64")).toString("utf8");
    for (const o of Object.keys(SW)) ok(!new RegExp("(?<![\\p{L}\\p{N}])" + o + "(?![\\p{L}\\p{N}])", "u").test(sn), "no leftover text: " + o); }
  // head-to-head records of every pair that involves a swapped club are identical, in both orientations
  const RX = new RegExp("(?<![\\p{L}\\p{N}])(?:" + Object.keys(SW).join("|") + ")(?![\\p{L}\\p{N}])", "gu"), m = (x) => SW[x] || x; let n = 0, flipped = 0;
  for (const k of Object.keys(wo.rv.pairs)) {
    const [a, b] = k.split("|"); if (!SW[a] && !SW[b]) continue; n++;
    if (m(a) > m(b)) flipped++;
    for (const [x, y] of [[a, b], [b, a]]) {
      const ho = JSON.stringify(O.$plain(O.mods.rivals.h2h(wo, x, y))).replace(RX, (t) => SW[t]), hn = JSON.stringify(N.$plain(N.mods.rivals.h2h(wn, m(x), m(y))));
      ok(ho === hn, "h2h " + x + " v " + y);
    }
    const ro = wo.rv.pairs[k], rn = wn.rv.pairs[[m(a), m(b)].sort((p, q) => (p < q ? -1 : 1)).join("|")];
    ok(!!rn && rn.heat === ro.heat && rn.fin === ro.fin && rn.tr === ro.tr && rn.hum === ro.hum, "pair meta " + k);
  }
  console.log("rivalry pairs with a swapped club:", n, "| re-sorted (flipped) :", flipped, "| total pairs", Object.keys(wo.rv.pairs).length, "->", Object.keys(wn.rv.pairs).length);
  // all pair keys canonical
  for (const k of Object.keys(wn.rv.pairs)) { const [a, b] = k.split("|"); ok(a < b && wn.rv.pairs[k].a === a && wn.rv.pairs[k].b === b, "canonical " + k); }
  // the migrated world keeps playing: play two more seasons, then save and reload it
  let r; for (let i = 0; i < 2; i++) { r = await N.request("/api/years", { n: 1 }); if (r.code !== 200) { ok(false, "years: " + JSON.stringify(r.body).slice(0, 200)); break; } }
  r = await N.request("/api/save", { name: "x" }); ok(r.code === 200, "save after play");
  r = await N.request("/api/export_text?name=x"); const again = r.body.text; const w2 = await load(boot(__dirname + "/../dist/bundle_engine.js", __dirname + "/../data"), again); ok(w2.clubs.itemsArr().length === 304, "reload after play");
  console.log("season now", wn.season, "| new clubs sample:", ["Amed", "Atlante", "Marítimo", "St Johnstone"].map((c) => c + "=" + (wn.clubs.get_(c).get_("ovr"))).join(", "));
  console.log(bad ? "FAILED " + bad : "ALL OK");
})().catch((e) => { console.log("ERR", e.stack || e); process.exit(1); });
