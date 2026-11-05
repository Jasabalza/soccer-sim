// v15 rivalry check: history vs heat, nothing past 100, new rivalries born in small numbers, derby index per league.
// usage: node tools/t_rivals_v15.js [seed] [seasons]     ends with "RIVALS OK" or "RIVALS FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "5", N = +process.argv[3] || 10;
(async () => {
  const R = globalThis.__R; await R.init(); const fail = [];
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body)); return r.body; };
  await call("/api/new", { seed });
  let prevReal = 0;
  for (let s = 1; s <= N; s++) {
    for (let k = 0; k < 14; k++) { const st = await call("/api/status"); if (st.season_done) break; await call("/api/sim", { scope: "world", weeks: 60 }); }
    await call("/api/rollover", {});
    const all = await call("/api/rivals_page?type=clubs&limit=400");
    const born = all.rows.filter((r) => !r.known).length;
    const hot = all.rows.filter((r) => r.heat_pct >= 90).length, max = Math.max(...all.rows.map((r) => Math.max(r.history, r.heat_pct)));
    console.log("S" + s, "clubs rows", all.total, "earned rivalries", born, "(+" + (born - prevReal) + ")", "heat>=90:", hot, "max shown", max);
    if (born - prevReal > 4) fail.push("S" + s + " more than 4 new rivalries in one season");
    if (max > 100) fail.push("a score above 100");
    prevReal = born;
  }
  const ri = await call("/api/rivals_page?type=clubs&sort=rising&limit=5");
  console.log("rising:", ri.rows.map((r) => r.a + " v " + r.b + " +" + r.rise + " H" + r.history + "/" + r.heat_pct).join(" | "));
  const h = await call("/api/rivals_page?type=clubs&sort=history&limit=3");
  console.log("history:", h.rows.map((r) => r.a + " v " + r.b + " H" + r.history + "/" + r.heat_pct + " met " + r.meet).join(" | "));
  const nn = await call("/api/rivals_page?type=nations&sort=history&limit=3");
  console.log("nations:", nn.rows.map((r) => r.a + " v " + r.b + " H" + r.history + "/" + r.heat_pct + " met " + r.meet).join(" | "));
  console.log("derby:", ri.derby.map((d) => d.league + " " + d.index + " (TV " + d.tv + "%, gate " + d.gate + "%)").join(" | "));
  if (!ri.derby.length) fail.push("no derby index");
  console.log(fail.length ? "RIVALS FAIL: " + fail.join("; ") : "RIVALS OK");
})().catch((e) => { console.log("RIVALS FAIL", e && e.message || e); process.exit(1); });
