// v15 federation check: plays seasons through the real API and prints how culture, funds and stages move.
// usage: node tools/t_fed.js [seed] [seasons]     ends with "FED OK" or "FED FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "5", N = +process.argv[3] || 12;
const SHOW = ["England", "Brazil", "Mexico", "Nigeria", "Japan", "Luxembourg", "Morocco", "USA"];
(async () => {
  const R = globalThis.__R; await R.init(); const fail = [];
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body)); return r.body; };
  await call("/api/new", { seed });
  const row = async () => { const o = []; for (const n of SHOW) { const f = (await call("/api/nation?name=" + encodeURIComponent(n))).federation; o.push(n.slice(0, 5) + " " + f.culture + (f.delta ? "(" + (f.delta > 0 ? "+" : "") + f.delta + ")" : "") + " s" + f.stage + " $" + (f.last ? f.last.prize + "/" + f.last.comp + "/" + f.last.soli : "-")); } return o.join(" | "); };
  console.log("culture(change) stage $prize/comp/solidarity (display money)");
  for (let s = 1; s <= N; s++) {
    for (let k = 0; k < 14; k++) { const st = await call("/api/status"); if (st.season_done) break; await call("/api/sim", { scope: "world", weeks: 60 }); }
    await call("/api/rollover", {});
    console.log("S" + s, await row());
  }
  // all nations: spread of culture and stages
  const ns = (await call("/api/nations")).rows.map((r) => r.name); const cul = []; const st = [0, 0, 0, 0]; let golden = 0, lifts = [], gc = [];
  for (const n of ns) { const f = (await call("/api/nation?name=" + encodeURIComponent(n))).federation; cul.push(f.culture); st[f.stage]++; lifts.push(f.lift); if (f.golden) { golden++; gc.push(f.golden.count); } }
  lifts.sort((a, b) => a - b);
  console.log("stages Exporter/Developing/Self-sufficient/Powerhouse:", st.join("/"), "| culture min/max:", Math.min(...cul), Math.max(...cul), "| lift min/median/max:", lifts[0], lifts[lifts.length >> 1], lifts[lifts.length - 1], "| golden generations:", golden, "counts", gc.sort((a, b) => b - a).join(","));
  if (Math.max(...lifts) > 40 || Math.min(...lifts) < -40) fail.push("culture lift out of range");
  if (cul.some((c) => !(c >= 0 && c <= 100))) fail.push("culture outside 0..100");
  console.log(fail.length ? "FED FAIL: " + fail.join("; ") : "FED OK");
})().catch((e) => { console.log("FED FAIL", e && e.message || e); process.exit(1); });
