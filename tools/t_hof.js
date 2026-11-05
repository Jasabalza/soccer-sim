// Engine tests for the v16 Hall of Fame. usage: node tools/t_hof.js     ends with "HOF OK"
const fs = require("fs"), vm = require("vm"); globalThis.require = require;
const D = __dirname + "/../data/"; globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.$B={mods:$mods,$new,$kw,$ser,$deser};");
const { mods, $new, $kw, $ser, $deser } = globalThis.$B, S = mods.sim_core, H = mods.hof;
const fail = (m) => { console.log("HOF FAIL:", m); process.exit(1); };
const mk = (seed) => $new(S.World, [$new(S.Settings, [$kw({ label: "game" })]), seed]);
const NS = +(process.argv[2] || 20);
const a = mk(7); for (let i = 0; i < NS; i++) a.finish_season();
const h = a.hof, cfg = H.CFG;
// 1. rules
const inScope = {}; let nInd = 0, maxN = 0, vetoes = 0;
for (const [k, v] of Object.entries(h.res)) {
  if (k.startsWith("VETO|")) { vetoes += v.length; for (const x of v) if (!/did not honour/.test(x.text)) fail("veto without a reason: " + JSON.stringify(x)); continue; }
  const [key, y] = k.split("|"), kind = key.replace(/^c/, "")[0];
  const slots = { W: cfg.W.slots, C: cfg.C.slots, L: cfg.L.slots, K: cfg.K.slots }[kind];
  const cslots = { W: cfg.cw.slots, C: cfg.cc.slots, L: cfg.cl.slots, K: cfg.ck.slots }[kind];
  if (v.ind.length > (key[0] === "c" && key[1] !== "W" || key === "cW" ? cslots : slots)) fail("too many inductees in " + k + ": " + v.ind.length);
  for (const e of v.ind) { nInd++; if (e.pct < cfg.pass) fail("inducted below 75%: " + k + " " + e.name); const id = key + "|" + e.id; if (inScope[id]) fail("inducted twice into " + key + ": " + e.name); inScope[id] = 1; if (e.n > cfg.window) fail("over " + cfg.window + " years on a ballot"); if (+y < e.ret + cfg.wait) fail("inducted before eligible: " + e.name + " ret " + e.ret + " vote " + y); }
  for (const e of v.off) { if (e.n > cfg.window) fail("on a ballot for " + e.n + " years"); if (e.why === "time" && e.n < cfg.window) fail("timed out early"); }
}
if (!nInd) fail("nobody was ever inducted");
// 2. determinism and lazy league days: run each league's day before the rollover in world B, must equal world A
const b = mk(7); for (let i = 0; i < NS; i++) { while (!b.season_done()) b.step(); for (const ln of b.leagues.keysArr()) H.runLeagueDay(b, ln, b.season); b.rollover(); }
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
if (!same(a.hof.res, b.hof.res)) fail("results differ when league days run before the rollover");
// 3. a save round trip does not change what comes next
const c = $deser(JSON.parse(JSON.stringify($ser(a)))); for (let i = 0; i < 3; i++) { a.finish_season(); c.finish_season(); }
if (!same(a.hof.res, c.hof.res)) fail("results differ after a save and load");
// 4. an old save with no Hall of Fame gets a founding class from its retired stars
const o = mk(11); for (let i = 0; i < 12; i++) o.finish_season();
const before = Object.keys(o.hof.cards).length; delete o.hof; o.migrate_v15();
const fcards = Object.values(o.hof.cards).filter((x) => x.k === "p");
if (!o.hof.founded || !fcards.length) fail("no founding class (" + fcards.length + " cards from " + o.retired_players.length + " retired stars)");
for (const x of fcards) for (const st of Object.values(x.st)) if (st.first < o.season) fail("founding class votes before the current season");
console.log("  founding class:", fcards.length, "players,", Object.values(o.hof.cards).filter((x) => x.k === "c").length, "coaches (fresh world made", before, "cards by itself)");
// 5. chasers play longer
let late = 0, lateChaser = 0; for (const p of a.players) if (p.age >= 39) { late++; if (H.isChaser(p)) lateChaser++; }
if (late && lateChaser !== late) fail("a non-chaser is still playing at 39+");
console.log("  " + nInd + " inductions over " + NS + " seasons; " + vetoes + " federation vetoes; " + late + " players aged 39+ (all chasers)");
console.log("HOF OK");
