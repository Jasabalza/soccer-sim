// v15.1 season-loop check: phases season -> summer -> done -> awards -> transfers -> season, through the real API.
// usage: node tools/t_flow.js [seed]     ends with "FLOW OK" or "FLOW FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "3";
(async () => {
  const R = globalThis.__R; await R.init(); const fail = [];
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body)); return r.body; };
  const raw = (p, b) => R.request(p, b);
  const hdr = async () => (await call("/api/status")).header || (await call("/api/status"));
  const ph = async () => { const s = await call("/api/status"); return (s.header || s).phase; };
  await call("/api/new", { seed });
  let seen = [], all = new Set();
  const note = async () => { const p = await ph(); all.add(p); if (seen[seen.length - 1] !== p) seen.push(p); return p; };
  // play seasons until one has summer tournaments (the Club World Cup starts in season 2), so the whole loop gets exercised
  for (let yr = 1; yr <= 4; yr++) {
    seen = []; await note();
    for (let k = 0; k < 150; k++) { const s = await call("/api/status"); if ((s.header || s).done) break; await call("/api/sim", { scope: "world", weeks: 1 }); await note(); }
    if ((await ph()) !== "done") fail.push("expected done after the last game, got " + (await ph()));
    console.log("season " + yr + " phases: " + seen.join(" > "));
    if (seen.includes("summer") || yr === 4) break;
    await call("/api/rollover", {}); await call("/api/flow", { step: "graduates" }); await call("/api/flow", { step: "done" });
  }
  if (!all.has("summer")) fail.push("never saw a summer phase");
  const r = await call("/api/rollover", {});
  const h = r.header; const season = h.flow && h.flow.season;
  if (h.phase !== "awards" || !season) fail.push("after rollover expected awards, got " + JSON.stringify(h));
  // a save taken during the off-season keeps the step
  // a save taken in the off-season keeps the step (serialise and read the world back, as saving and loading do)
  const A = $mods.app_v11 || $mods.app, w0 = A.ST.world, w1 = $deser($ser(w0));
  if (!w1.flow || w1.flow.get_("step") !== "awards") fail.push("flow step lost in a save round trip");
  const aw = await raw("/api/awards?season=" + season);
  if (aw.code !== 200) fail.push("awards for the rolled season not available");
  let bad = await raw("/api/flow", { step: "awards" });
  if (bad.code !== 200 && bad.code !== 409) fail.push("odd status on repeat step " + bad.code);
  let f = await call("/api/flow", { step: "transfers" });
  if (f.header.phase !== "transfers") fail.push("transfers step not reached: " + f.header.phase);
  const lg = await raw("/api/ledger?season=" + season);
  if (lg.code !== 200) fail.push("ledger for the rolled season failed");
  f = await call("/api/flow", { step: "graduates" });
  if (f.header.phase !== "graduates") fail.push("graduates step not reached: " + f.header.phase);
  for (const sc of ["grads", "all"]) {
    const pr = await call("/api/prospects?scope=" + sc);
    if (!pr.rows.length) fail.push("no prospects for scope " + sc);
    else if (pr.rows.some((r, i) => i && r.pot > pr.rows[i - 1].pot)) fail.push("prospects not sorted by potential (" + sc + ")");
    else console.log("prospects " + sc + ": " + pr.total + " | best " + pr.rows[0].name + " " + pr.rows[0].ovr + "/" + pr.rows[0].pot);
  }
  const pl = await call("/api/prospects?scope=all&league=" + encodeURIComponent((await call("/api/prospects?scope=all")).leagues[0]));
  if (pl.rows.some((r) => r.league !== pl.league)) fail.push("league filter leaks");
  f = await call("/api/flow", { step: "done" });
  if (f.header.phase === "awards" || f.header.phase === "transfers" || f.header.flow) fail.push("flow not cleared: " + JSON.stringify(f.header));
  if (f.header.season !== season + 1) fail.push("new season should be " + (season + 1) + " got " + f.header.season);
  if (f.header.phase !== "season") fail.push("new season should start in season phase, got " + f.header.phase);
  // multi-season sims never leave a flow behind
  const y = await call("/api/years", { years: 2 });
  const hh = await hdr();
  if (hh.flow) fail.push("years left a flow behind");
  // rollover then any sim clears
  for (let k = 0; k < 40; k++) { const s = await call("/api/status"); if ((s.header || s).done) break; await call("/api/sim", { scope: "world", weeks: 60 }); }
  await call("/api/rollover", {});
  await call("/api/sim", { scope: "world", weeks: 1 });
  if ((await hdr()).flow) fail.push("sim left a flow behind");
  console.log(fail.length ? "FLOW FAIL " + fail.join(" | ") : "FLOW OK");
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.log("FLOW FAIL", e.message); process.exit(1); });
