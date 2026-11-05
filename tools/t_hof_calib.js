// Calibration sweep for the Hall of Fame: simulates seasons and prints induction rates and score distributions.
// usage: node tools/t_hof_calib.js [seed] [seasons]
const fs = require("fs"), vm = require("vm"); globalThis.require = require;
const D = __dirname + "/../data/"; globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.$B={mods:$mods,$new,$kw};");
const { mods, $new, $kw } = globalThis.$B, S = mods.sim_core, H = mods.hof;
const seed = +(process.argv[2] || 5), ns = +(process.argv[3] || 30);
const w = $new(S.World, [$new(S.Settings, [$kw({ label: "game" })]), seed]);
const sc = { W: [], C: [], L: [], K: [] }; let retirees = 0, cretire = 0;
const orig = H.onRetire; H.onRetire = (ww, p) => { retirees++; const s = H.pscores(ww, p); sc.W.push(s.W); sc.C.push(s.C); for (const v of Object.values(s.L)) sc.L.push(v); for (const v of Object.values(s.K)) sc.K.push(v); return orig(ww, p); };
const t0 = Date.now(); for (let i = 0; i < ns; i++) w.finish_season();
const pct = (a, q) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
console.log(`seed ${seed}: ${ns} seasons in ${Math.round((Date.now() - t0) / 1000)}s, ${retirees} retirees (${Math.round(retirees / ns)}/yr)`);
for (const k of ["W", "C", "L", "K"]) console.log(" ", k, "score pctiles 50/90/99/99.9/max:", [0.5, 0.9, 0.99, 0.999, 1].map((q) => pct(sc[k], q)).join(" / "), " n=", sc[k].length);
const h = w.hof; const tally = { W: 0, C: 0, L: 0, K: 0, cW: 0, cC: 0, cL: 0, cK: 0 }, yrs = { W: [], C: [], L: [], K: [] }, offs = {};
const cards = Object.values(h.cards);
for (const r of Object.entries(h.res)) { const [k, v] = r; if (k.startsWith("VETO")) { tally.veto = (tally.veto || 0) + v.length; continue; } const pre = (k[0] === "c" ? "c" : "") + k.split("|")[0].replace(/^c/, "")[0]; tally[pre] = (tally[pre] || 0) + v.ind.length; for (const e of v.ind) if (e.k === "p") yrs[k[0]].push(e.n); for (const o of v.off) offs[o.why] = (offs[o.why] || 0) + 1; }
console.log(" leagues", w.leagues.size, "clubs", w.clubs.size, "nations", w.nations.size);
console.log(" inductions total:", JSON.stringify(tally), " per year W:", (tally.W / ns).toFixed(2), " C:", (tally.C / ns).toFixed(2), " L:", (tally.L / ns).toFixed(2), " K:", (tally.K / ns).toFixed(2));
console.log(" cards alive:", cards.length, " fell list:", h.fell.length, " off causes:", JSON.stringify(offs));
const mean = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "-";
console.log(" mean year-on-ballot at induction:", Object.entries(yrs).map(([k, v]) => k + "=" + mean(v)).join(" "));
console.log(" hof store size (serialised, KB):", Math.round(JSON.stringify(vm.runInThisContext("$ser")(w.hof)).length / 1024), " world total KB:", Math.round(JSON.stringify(vm.runInThisContext("$ser")(w)).length / 1024));
let chase = 0, late = 0; for (const p of w.players) if (p.age >= 39) { late++; if (H.isChaser(p)) chase++; }
console.log(" players aged 39+ still playing:", late, " chasers:", chase);
// who is in the world hall
const wi = []; for (const [k, v] of Object.entries(h.res)) if (k.startsWith("W|")) for (const e of v.ind) wi.push(k.split("|")[1] + " " + e.name + " (" + e.nat + ") yr" + e.n + " " + (e.pct * 100 | 0) + "%");
console.log(" world inductees:", wi.slice(0, 12).join("; "));
const co = []; for (const [k, v] of Object.entries(h.res)) if (k.startsWith("cW|")) for (const e of v.ind) co.push(k.split("|")[1] + " " + e.name);
console.log(" world coach inductees:", co.slice(0, 8).join("; "));
{ const ser = vm.runInThisContext("$ser"); const sz = (o) => Math.round(JSON.stringify(ser(o)).length / 1024);
  let ind = 0, bal = 0, off = 0; for (const v of Object.values(h.res)) { if (!v.ind) continue; ind += v.ind.length; bal += v.bal.length; off += v.off.length; }
  console.log(" sizes KB: cards", sz(h.cards), " res", sz(h.res), " bal idx", sz(h.bal), " fell", sz(h.fell), " | res entries ind/bal/off:", ind, bal, off, "keys", Object.keys(h.res).length); }
