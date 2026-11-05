// v15 Club World Cup check: plays seasons through the real API and verifies the 32-club group + knockout format.
// usage: node tools/t_cwc.js [seed] [seasons]     ends with "CWC OK" or "CWC FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "3", N = +process.argv[3] || 6;
(async () => {
  const R = globalThis.__R; await R.init(); const fail = []; let seen = 0;
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body)); return r.body; };
  await call("/api/new", { seed });
  for (let s = 1; s <= N; s++) {
    for (let k = 0; k < 14; k++) { const st = await call("/api/status"); if (st.season_done) break; await call("/api/sim", { scope: "world", weeks: 60 }); }
    const wd = await call("/api/world");
    const cw = (wd.summer || []).find((x) => x.kind === "cwc");
    if (cw) {
      seen++;
      const x = await call("/api/comp?id=" + encodeURIComponent(cw.id));
      const teams = x.groups.reduce((a, g) => a + g.teams.length, 0);
      console.log("S" + s, x.title, "groups", x.groups.length, "clubs", teams, "winner", x.winner, "runner-up", x.runner_up, "pool", Math.round(x.format.pool));
      if (x.groups.length !== 8 || teams !== 32) fail.push("S" + s + " expected 8 groups of 4, got " + x.groups.length + "/" + teams);
      const lg = x.groups.map((g) => g.teams.map((t) => t.nation));
      const seenL = {};
      const cl = await Promise.all(lg.flat().map((n) => call("/api/club?name=" + encodeURIComponent(n))));
      const L = {}; cl.forEach((c) => (L[c.name] = c.league));
      lg.forEach((g, i) => { const c = {}; g.forEach((n) => (c[L[n]] = (c[L[n]] || 0) + 1)); if (Object.values(c).some((v) => v > 1)) fail.push("S" + s + " group " + i + " has two clubs of one league: " + JSON.stringify(c)); });
      const conf = {}; cl.forEach((c) => (conf[c.confed] = (conf[c.confed] || 0) + 1));
      console.log("   by confederation", JSON.stringify(conf));
      if (!x.winner) fail.push("no winner");
      if (x.bracket.ties.length !== 15) fail.push("S" + s + " expected 15 knockout ties, got " + x.bracket.ties.length);
      if (x.groups.some((g) => g.matches.length !== 6)) fail.push("S" + s + " each group should have 6 matches");
    }
    await call("/api/rollover", {});
  }
  if (!seen) fail.push("no Club World Cup in " + N + " seasons");
  console.log(fail.length ? "CWC FAIL: " + fail.join("; ") : "CWC OK (" + seen + " tournament(s))");
})().catch((e) => { console.log("CWC FAIL", e && e.message || e); process.exit(1); });
