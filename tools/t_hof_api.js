// API checks for the v16 Hall of Fame pages. usage: node tools/t_hof_api.js     ends with "HOF API OK"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};globalThis.__M=$mods;");
(async () => {
  const R = globalThis.__R, M = globalThis.__M; await R.init();
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body).slice(0, 200)); return JSON.parse(JSON.stringify(r.body)); };
  const fail = (m) => { console.log("HOF API FAIL:", m); process.exit(1); };
  await call("/api/new", { seed: "7" });
  const w = M.app_v11.ST.world; for (let i = 0; i < +(process.argv[2] || 16); i++) w.finish_season();
  const Y = w.season - 1, h = w.hof;
  const day = await call("/api/hofday?season=" + Y);
  if (!day.inducted || !day.watch || !day.cfg) fail("hofday shape");
  const anyDay = []; for (let y = w.season - 1; y >= 6; y--) { const d = await call("/api/hofday?season=" + y); if (d.inducted.length) { anyDay.push(d); break; } }
  if (!anyDay.length) fail("no year with a world inductee");
  const d0 = anyDay[0]; if (!d0.inducted[0].badge || d0.inducted[0].badge.tier !== "W") fail("world inductee badge: " + JSON.stringify(d0.inducted[0].badge));
  const ln = w.leagues.keysArr()[0];
  const lg = await call("/api/hofleague?league=" + encodeURIComponent(ln) + "&season=" + Y);
  if (!lg.clubs || lg.clubs.length < 10) fail("league day clubs");
  const hw = await call("/api/hof?tier=W&kind=p"); if (!hw.classes.length || !hw.records.length) fail("world hall empty");
  const hc = await call("/api/hof?tier=W&kind=c"); if (!Array.isArray(hc.classes)) fail("coach hall shape");
  const nat = hw.classes[0].rows[0].nat, hn = await call("/api/hof?tier=C&name=" + encodeURIComponent(nat) + "&kind=p"); if (hn.tier !== "C") fail("country hall");
  const hl = await call("/api/hof?tier=L&name=" + encodeURIComponent(ln) + "&kind=p"); if (hl.tier !== "L") fail("league hall");
  const club = w.leagues.get_(ln).get_("clubs")[0], hk = await call("/api/hof?tier=K&name=" + encodeURIComponent(club) + "&kind=p"); if (hk.tier !== "K") fail("club hall");
  const card = await call("/api/hofcard?id=" + hw.classes[0].rows[0].id); if (!card.chain.W || card.chain.W.status !== "in" || !card.career.length) fail("player card chain " + JSON.stringify(card.chain.W));
  const cc = Object.values(h.cards).find((c) => c.k === "c"); if (cc) { const x = await call("/api/hofcard?id=" + cc.id); if (!x.stints) fail("coach card stints"); }
  const wt = await call("/api/hofwatch"); if (!Array.isArray(wt.rows)) fail("watch");
  console.log("HOF API OK: world day " + d0.label + " (" + d0.inducted.length + " inducted), " + hw.total + " in the world hall, league day with " + lg.clubs.length + " clubs");
})().catch((e) => { console.log("HOF API FAIL", e && e.stack || e); process.exit(1); });
