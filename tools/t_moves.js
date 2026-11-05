// Off-season moves: the move log and its API. usage: node tools/t_moves.js [seasons]     ends with "MOVES OK"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};globalThis.__M=$mods;");
(async () => {
  const R = globalThis.__R, M = globalThis.__M; await R.init();
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body).slice(0, 200)); return JSON.parse(JSON.stringify(r.body)); };
  const fail = (m) => { console.log("MOVES FAIL:", m); process.exit(1); };
  await call("/api/new", { seed: "7" });
  const w = M.app_v11.ST.world, N = +(process.argv[2] || 7); for (let i = 0; i < N; i++) w.finish_season();
  const S = w.hist.length;
  const hi = await call("/api/moves?season=" + S + "&tab=highlights");
  if (!hi.walk || hi.walk.length < 10) fail("walk too short " + (hi.walk && hi.walk.length));
  const chapters = [...new Set(hi.walk.map((r) => r.chapter))]; if (chapters.length < 4) fail("chapters " + chapters);
  for (const r of hi.walk) if (!(r.hot >= 0 && r.hot <= 100)) fail("hot out of range");
  const pl = await call("/api/moves?season=" + S + "&tab=players&sort=hot"); if (pl.rows.length < 20) fail("players rows");
  for (let i = 1; i < pl.rows.length; i++) if (pl.rows[i].hot > pl.rows[i - 1].hot) fail("hot sort");
  const ups = await call("/api/moves?season=" + S + "&tab=players&mv=up"), dns = await call("/api/moves?season=" + S + "&tab=players&mv=down"), sds = await call("/api/moves?season=" + S + "&tab=players&mv=side");
  if (!ups.total || !dns.total || !sds.total) fail("move types " + [ups.total, sds.total, dns.total]);
  if (ups.rows.some((r) => r.mv !== "up")) fail("up filter");
  const fr = await call("/api/moves?season=" + S + "&tab=players&kind=f&sort=pay"); if (!fr.rows.length || fr.rows.some((r) => r.k !== "f")) fail("free agents");
  for (let i = 1; i < fr.rows.length; i++) if (fr.rows[i].pay > fr.rows[i - 1].pay) fail("pay sort");
  const tr = await call("/api/moves?season=" + S + "&tab=players&kind=t&sort=pay"); for (let i = 1; i < tr.rows.length; i++) if (tr.rows[i].fee > tr.rows[i - 1].fee + 0.01) fail("fee sort");
  let co = null, ac = 0, fired = 0, nat = 0;
  for (let s = 1; s <= S; s++) { const c = await call("/api/moves?season=" + s + "&tab=coaches"); if (c.counts.academy) ac += c.counts.academy; fired += c.counts.fired; nat += c.counts.national; if (s === S) co = c; }
  if (!co.rows.length) fail("coach rows"); if (!ac) fail("no academy manager ever promoted"); if (!fired) fail("no firings"); if (!nat) fail("no national coach moves");
  const ca = await call("/api/moves?season=" + S + "&tab=coaches&kind=acad"); if (ca.rows.some((r) => r.src !== "acad")) fail("academy filter");
  const rt = await call("/api/moves?season=" + S + "&tab=retired"); if (!rt.rows.length) fail("retired rows"); for (let i = 1; i < rt.rows.length; i++) if (rt.rows[i].prestige > rt.rows[i - 1].prestige) fail("retired sort");
  const rp = await call("/api/moves?season=" + S + "&tab=retired&sort=peak"); for (let i = 1; i < rp.rows.length; i++) if (rp.rows[i].pk > rp.rows[i - 1].pk) fail("peak sort");
  const rc = await call("/api/moves?season=" + S + "&tab=retired&who=c"); if (rc.rows.some((r) => r.k !== "cr")) fail("retired coaches");
  const lg = w.leagues.keysArr()[0], pll = await call("/api/moves?season=" + S + "&tab=players&league=" + encodeURIComponent(lg));
  if (!pll.rows.length || pll.rows.some((r) => r.fromL !== lg && r.toL !== lg)) fail("league filter");
  // seasons before the log existed fall back to the transfer list
  delete w.mv.s[1]; const old = await call("/api/moves?season=1&tab=players"); if (old.recorded || !old.rows.length) fail("fallback " + JSON.stringify([old.recorded, old.rows.length, w.transfers.filter((t) => t.season === 1).length, w.transfers.map((t) => t.season).slice(0, 3)]));
  // the store stays small: one string per season, only the last KEEP seasons
  const bytes = Object.values(w.mv.s).reduce((a, s) => a + s.length, 0); if (bytes / Object.keys(w.mv.s).length > 260000) fail("store too big " + bytes);
  // saving and loading keeps it
  const before = await call("/api/moves?season=" + S + "&tab=coaches&limit=500");
  await call("/api/save", { name: "mvtest" }); await call("/api/load", { name: "mvtest" });
  const after = await call("/api/moves?season=" + S + "&tab=coaches&limit=500");
  if (JSON.stringify(before.rows) !== JSON.stringify(after.rows) || !after.rows.length) fail("save and load changed the move log");
  console.log("MOVES OK: season " + S + " walk " + hi.walk.length + ", players " + pl.total + " (up " + ups.total + " / side " + sds.total + " / down " + dns.total + "), coaches " + co.total + ", academy shots " + ac + ", retired " + rt.total + ", store " + Math.round(bytes / 1000) + " KB");
  process.exit(0);
})().catch((e) => { console.log("MOVES FAIL", e && e.stack || e); process.exit(1); });
