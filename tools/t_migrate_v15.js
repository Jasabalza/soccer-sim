// An old (v14.1) save loaded into the v15 engine, including one made in the middle of an old-style Club World Cup.
// usage: node tools/t_migrate_v15.js <old_bundle_engine.js>
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
function boot(bundle) {
  const ctx = {}; // each engine in its own context so globals do not clash
  const c = vm.createContext({ console, require, setTimeout, TextEncoder, TextDecoder, Math, Date, JSON, Uint8Array, Buffer, process, btoa, atob, CompressionStream: undefined, globalThis: null });
  c.globalThis = c; c.__DATA = {};
  for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) c.__DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
  vm.runInContext(fs.readFileSync(bundle, "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};", c);
  return c.__R;
}
(async () => {
  const oldB = process.argv[2], newB = __dirname + "/../dist/bundle_engine.js";
  const O = boot(oldB); await O.init();
  const oc = async (p, b) => { const r = await O.request(p, b); if (r.code !== 200) throw new Error("old " + p + " " + r.code + " " + JSON.stringify(r.body).slice(0, 200)); return r.body; };
  await oc("/api/new", { seed: "7" });
  let st;
  // sim whole seasons until cycle year 2 (Club World Cup summer), then stop partway through it
  for (let s = 1; s < 12; s++) {
    st = await oc("/api/status"); if (st.header.cycle_year === 2) break;
    for (let k = 0; k < 16; k++) { st = await oc("/api/status"); if (st.header.season_done) break; await oc("/api/sim", { scope: "world", weeks: 60 }); }
    await oc("/api/rollover", {});
  }
  st = await oc("/api/status"); console.log("old engine at season", st.header.season, "cycle year", st.header.cycle_year);
  const out = {};
  for (const [tag, step] of [["start", 0], ["mid", 10], ["late", 14]]) {
    if (step) await oc("/api/sim", { scope: "world", weeks: step });
    await oc("/api/save", { name: tag }); const t = (await O.request("/api/export_text?name=" + tag)).body.text; out[tag] = t;
    st = await oc("/api/status"); console.log(" saved", tag, "week", st.header.week);
  }
  const N = boot(newB); await N.init();
  for (const tag of ["start", "mid", "late"]) {
    const nc = async (p, b) => { const r = await N.request(p, b); if (r.code !== 200) throw new Error("new " + p + " " + r.code + " " + JSON.stringify(r.body).slice(0, 300)); return r.body; };
    let r = await N.request("/api/import_text", { text: out[tag], name: "old" + tag }); if (r.code !== 200) throw new Error("import " + JSON.stringify(r.body));
    await nc("/api/load", { name: "old" + tag });
    const w = await nc("/api/world"), cl = await nc("/api/club?name=" + encodeURIComponent("Manchester City"));
    await nc("/api/worldmoney"); await nc("/api/nation?name=Mexico"); await nc("/api/rivals_page?type=clubs&sort=heat&status=all&scope=world&q=&limit=25"); await nc("/api/rivals_page?type=nations&sort=rising&status=all&scope=world&q=&limit=25");
    await nc("/api/ledger"); await nc("/api/money");
    const cw = await nc("/api/comp?id=" + encodeURIComponent("CWC:" + (await nc("/api/status")).header.season)); console.log(" ", tag, "CWC page ok, winner", cw.winner || "-", "groups", (cw.groups || []).length);
    await nc("/api/records");
    // run the rest of the season, then a rollover, then a second season, checking the new pages along the way
    for (let seas = 0; seas < 2; seas++) {
      for (let k = 0; k < 16; k++) { const s2 = await nc("/api/status"); if (s2.header.season_done) break; await nc("/api/sim", { scope: "world", weeks: 60 }); }
      await nc("/api/rollover", {});
    }
    const c2 = await nc("/api/club?name=" + encodeURIComponent("Manchester City")), wm = await nc("/api/worldmoney"), f = (await nc("/api/nation?name=Mexico")).federation;
    console.log(tag, "OK: finance rows", c2.finance.ledger.length, "| world health", wm.health, "| fed stage", f.stage, "culture", f.culture);
  }
  console.log("ALL OK");
})().catch((e) => { console.log("ERR", e && e.stack || e); process.exit(1); });
