// A v15.0/15.1 save has a Club World Cup already drawn with the old 16-club slots. Loading it must give the full 32 clubs in 8 groups.
// usage: node tools/t_cwc_migrate.js     ends with "CWC MIGRATE OK"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};globalThis.__M=$mods;");
(async () => {
  const R = globalThis.__R, M = globalThis.__M; await R.init();
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body).slice(0, 200)); return r.body; };
  const fail = (m) => { console.log("CWC MIGRATE FAIL:", m); process.exit(1); };
  await call("/api/new", { seed: "5" });
  for (let s = 0; s < 12; s++) { const st = await call("/api/status"); if (st.header.cycle_year === 2) break; for (let k = 0; k < 16; k++) { const t = await call("/api/status"); if (t.header.season_done) break; await call("/api/sim", { scope: "world", weeks: 60 }); } await call("/api/rollover", {}); }
  const A = M.app_v11; let w = A.ST.world, cid = "CWC:" + w.season;
  // play until the qualifying cups are done, so the Club World Cup can be drawn
  for (let k = 0; k < 60 && w.missing(w.comps.get(cid)).length; k++) await call("/api/sim", { scope: "world", weeks: 1 });
  const c = w.comps.get(cid); if (!c || w.missing(c).length) fail("could not reach a drawable Club World Cup");
  // make it look like an older save: old slots, drawn with them, nothing played
  const old = { UEFA: 8, CONMEBOL: 4, CONCACAF: 2, AFC: 2 };
  for (const [cf, n] of Object.entries(old)) $setidx($idx(w.cups, cf), "cwc_slots", n);
  const stale = $new(M.comps.ClubWorldCup, [w]); w.comps.set(cid, stale); stale.ensure_prepared();
  if (stale.field.length !== 16) fail("setup: expected a 16-club draw, got " + stale.field.length);
  w.migrate_v15();
  const x = await call("/api/comp?id=" + encodeURIComponent(cid)), n = x.groups.reduce((a, g) => a + g.teams.length, 0);
  if (x.groups.length !== 8 || n !== 32) fail("after loading: " + x.groups.length + " groups / " + n + " clubs");
  // a draw that has started stays as it is
  const w2 = A.ST.world; const part = w2.comps.get(cid); part.ptr = 1;
  const fld = part.field.length; w2.migrate_v15();
  if (w2.comps.get(cid) !== part) fail("a started Club World Cup was replaced");
  console.log("CWC MIGRATE OK: 16-club draw became " + n + " clubs in " + x.groups.length + " groups; a started one was left alone");
})().catch((e) => { console.log("CWC MIGRATE FAIL", e && e.stack || e); process.exit(1); });
