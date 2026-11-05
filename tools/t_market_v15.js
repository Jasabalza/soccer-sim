// v15 market check: bidding on vs off. usage: node tools/t_market_v15.js [seeds=1,2] [seasons=20]
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
const seeds = (process.argv[2] || "1,2").split(",").map(Number), N = +process.argv[3] || 20;
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8"); globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__B={mods:$mods,$new,$kw};");
const { mods, $new, $kw } = globalThis.__B, S = mods.sim_core, g = (c, k) => (c.get_ ? c.get_(k) : c[k]);
for (const off of [true, false]) {
  globalThis.__NO_BIDS = off;
  for (const seed of seeds) {
    const w = $new(S.World, [$new(S.Settings, [$kw({ label: "game" })]), seed]); const t0 = Date.now();
    for (let i = 0; i < N; i++) w.finish_season();
    const tr = w.transfers, bid = tr.filter((t) => g(t, "kind") === "bid"), fees = tr.map((t) => +g(t, "fee") || 0), tot = fees.reduce((a, b) => a + b, 0);
    const champs = {}; for (const h of w.hist) { const ch = g(h, "champs"); if (ch) for (const [l, c] of (ch.itemsArr ? ch.itemsArr() : Object.entries(ch))) champs[c] = (champs[c] || 0) + 1; }
    const wins = Object.values(champs).sort((a, b) => b - a), nT = wins.reduce((a, b) => a + b, 0);
    const ov = [...w.clubs.itemsArr()].map(([n, c]) => g(c, "ovr")); const mean = ov.reduce((a, b) => a + b, 0) / ov.length, sd = Math.sqrt(ov.reduce((a, b) => a + (b - mean) ** 2, 0) / ov.length);
    const rv = bid.filter((t) => mods.rivals.intensity(w, g(t, "frm"), g(t, "to")) > 0).length, top = bid.slice().sort((a, b) => +g(b, "fee") - +g(a, "fee"))[0];
    console.log(`${off ? "OFF" : "ON "} seed ${seed}: ${tr.length} transfers (${bid.length} bids, ${rv} between rivals), fees ${tot.toFixed(0)} total, ${(tot / N).toFixed(0)}/season | titles: ${nT} won by ${wins.length} clubs, top club ${wins[0]} | club OVR mean ${mean.toFixed(1)} sd ${sd.toFixed(2)} | biggest ${top ? g(top, "player") + " " + g(top, "fee") + " " + g(top, "frm") + ">" + g(top, "to") : "-"} | ${(Date.now() - t0) / 1000}s`);
  }
}
