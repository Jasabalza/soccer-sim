// v15 finance check: runs the real API for N seasons and checks the money model stays sane.
// usage: node tools/t_finance.js [seed] [seasons]     prints a table and ends with "FINANCE OK" or "FINANCE FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "5", N = +process.argv[3] || 12;
(async () => {
  const R = globalThis.__R; await R.init(); const fail = [];
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body)); return r.body; };
  await call("/api/new", { seed });
  for (let s = 1; s <= N; s++) { for (let k = 0; k < 14; k++) { const st = await call("/api/status"); if (st.season_done) break; await call("/api/sim", { scope: "world", weeks: 60 }); } await call("/api/rollover", {}); }
  const m = await call("/api/worldmoney");
  console.log("season | revenue | growth | wages | running | academy | stadium | transfers | payout | profit | debt");
  for (const r of m.seasons) console.log([r.season, r.revenue, r.growth, r.wages, r.running, r.academy, r.stadium, r.transfers, r.payout, r.profit, r.debt].join(" | "));
  console.log("health:", m.health, "| clubs with cash above 2x income:", m.over2x, "of", m.clubs, "| world debt:", m.debt);
  const gs = m.seasons.map((r) => r.growth).filter((g) => g != null);
  if (gs.some((g) => g > 0.08 || g < -0.05)) fail.push("world revenue growth out of range: " + gs.join(","));
  if (m.over2x > m.clubs * 0.05) fail.push("too many clubs above 2x cash: " + m.over2x);
  const last = m.seasons[m.seasons.length - 1];
  if (last.wages / last.revenue > 0.95 || last.wages / last.revenue < 0.1) fail.push("wage share of revenue odd: " + (last.wages / last.revenue).toFixed(2));
  const c = await call("/api/club?name=" + encodeURIComponent("Manchester City"));
  if (!c.finance || !c.finance.ledger.length || c.finance.ledger.length > 12) fail.push("club ledger missing or too long");
  if (c.finance.debt < 0) fail.push("negative debt");
  if (!c.finance.academy || !(c.finance.academy.level >= 1 && c.finance.academy.level <= 10)) fail.push("academy level out of range");
  if (!c.finance.stadium || !(c.finance.stadium.capacity > 0)) fail.push("stadium missing");
  console.log("City academy", c.finance.academy.level, "graduates", c.finance.academy.graduates.length, "| stadium", c.finance.stadium.capacity, "demand", c.finance.stadium.demand);
  console.log(fail.length ? "FINANCE FAIL: " + fail.join("; ") : "FINANCE OK");
})().catch((e) => { console.log("FINANCE FAIL", e && e.message || e); process.exit(1); });
