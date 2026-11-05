const fs = require("fs"), vm = require("vm"); globalThis.require = require;
const D=__dirname+"/../data/";globalThis.__DATA={leagues:fs.readFileSync(D+"leagues.json","utf8"),nations:fs.readFileSync(D+"nations.json","utf8"),clubs_geo:fs.readFileSync(D+"clubs_geo.json","utf8"),rivalries:fs.readFileSync(D+"rivalries.json","utf8"),rivalries_nat:fs.readFileSync(D+"rivalries_nat.json","utf8")};
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js", "utf8") + `
;globalThis.$B = {mods: $mods, $new, $kw, $plain, $Dict, $round};`);
const {mods, $new, $kw, $round} = globalThis.$B;
const S = mods.sim_core;
const r = (x, n = 4) => (typeof x === "number" && !Number.isInteger(x) ? $round(x, n) : x);
function dump(w) {
  const d = {};
  d.season = w.season;
  d.players = w.players.map((p) => [p.name, p.age, p.ovr, p.pot, p.pos, p.nat, p.club, r(p.wage), p.contract, p.peak])
    .sort((a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; });
  d.clubs = {};
  for (const [n, c] of [...w.clubs.itemsArr()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) d.clubs[n] = [c.get_("league"), r(c.get_("ovr")), r(c.get_("eff")), r(c.get_("budget")), c.get_("coach") ? c.get_("coach").name : null, r(c.get_("stature")), r(c.get_("funds"))];
  d.nations = {};
  for (const [n, v] of [...w.nations.itemsArr()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) { const co = v.get_("coach"); d.nations[n] = [r(v.get_("dev")), r(v.get_("eff")), r(v.get_("ovr")), co ? co.name : null]; }
  d.hist = w.hist.map((h) => [h.get_("season"), [...h.get_("champs").itemsArr()].sort((a, b) => (a[0] < b[0] ? -1 : 1)), [...h.get_("cups").itemsArr()].map(([k, v]) => [k, v[0]]).sort((a, b) => (a[0] < b[0] ? -1 : 1)), h.get_("cwc"), h.get_("wc")]);
  d.nat_hist = {}; for (const [k, v] of [...w.nat_hist.itemsArr()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) d.nat_hist[k] = r(v);
  d.news = w.news_log.length; d.finals = w.finals.length;
  return d;
}
const seed = +process.argv[2], ns = +process.argv[3];
const cfg = $new(S.Settings, [$kw({label: "game"})]);
const w = $new(S.World, [cfg, seed]);
const t0 = Date.now();
if (process.argv[4] === "pre") { while (w.step() !== null) {} } else for (let i = 0; i < ns; i++) w.finish_season();
process.stderr.write(`sim ${ns} seasons: ${Date.now() - t0} ms\n`);
console.log(JSON.stringify(dump(w)));
