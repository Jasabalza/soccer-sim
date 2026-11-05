// OFFLINE helper: bring a save up to v13.1 (club swaps). The game does this by itself whenever a save is loaded, so you normally don't
// need this; it just writes the result out as a new SSAVE text file.
// usage: node tools/migrate_save_v13_1.js <in.txt> <out.txt>
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init,mods:$mods,$plain};");
const [inp, outp] = process.argv.slice(2);
(async () => {
  const R = __R; await R.init();
  let r = await R.request("/api/import_text", { text: fs.readFileSync(inp, "utf8"), name: "mig" }); if (r.code !== 200) throw new Error("import: " + JSON.stringify(r.body));
  r = await R.request("/api/load", { name: "mig" }); if (r.code !== 200) throw new Error("load: " + JSON.stringify(r.body));
  r = await R.request("/api/save", { name: "migrated" }); if (r.code !== 200) throw new Error("save: " + JSON.stringify(r.body));
  r = await R.request("/api/export_text?name=migrated"); if (r.code !== 200) throw new Error("export: " + JSON.stringify(r.body));
  fs.writeFileSync(outp, r.body.text); console.log("wrote", outp, Math.round(r.body.text.length / 1024) + " KB");
})().catch((e) => { console.log("ERR", e && e.stack || e); process.exit(1); });
