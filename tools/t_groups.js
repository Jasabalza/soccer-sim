// v15.1 group stage: any group can be played to the end on its own (any order); the knockout waits for every group;
// results do not depend on the order of play. usage: node tools/t_groups.js [seed]    ends with "GROUPS OK" or "GROUPS FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "3";
(async () => {
  const R = globalThis.__R; await R.init(); const fail = [];
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body)); return r.body; };
  const raw = (p, b) => R.request(p, b);
  // bring a fresh world to the point where a group stage is the current round of a summer tournament
  const reach = async () => {
    await call("/api/new", { seed });
    for (let s = 0; s < 6; s++) {
      for (let k = 0; k < 150; k++) {
        const wd = await call("/api/world");
        const t = (wd.summer || []).find((x) => (process.env.KIND ? [process.env.KIND] : ["cwc", "wc"]).includes(x.kind));
        if (t) { const g = await raw("/api/games?comp=" + encodeURIComponent(t.id)); if (g.code === 200 && g.body.ready && g.body.groups_all) return t.id; }
        const st = await call("/api/status"); if ((st.header || st).done) break;
        await call("/api/sim", { scope: "world", weeks: 1 });
      }
      await call("/api/rollover", {}); await call("/api/flow", { step: "done" });
    }
    throw new Error("no group stage reached");
  };
  const snap = async (id) => { const x = await call("/api/comp?id=" + encodeURIComponent(id)); return JSON.stringify([x.winner, x.runner_up, x.groups.map((g) => g.teams.map((t) => [t.nation, t.p, t.pts, t.gf, t.ga])), x.bracket.ties]); };
  // A: the ordinary way, matchday by matchday to the end
  let id = await reach();
  await call("/api/sim", { comp: id, to_end: true });
  const A = await snap(id);
  // B: group by group, each group all three matchdays before the next
  id = await reach();
  let g = await call("/api/games?comp=" + encodeURIComponent(id));
  const all = g.groups_all, ng = Math.max(...all.map((m) => m.gr)) + 1;
  if (all.length < 24) fail.push("expected a full group stage, got " + all.length + " games");
  for (let gi = 0; gi < ng; gi++) {
    for (const m of all.filter((x) => x.gr === gi).sort((a, b) => a.md - b.md)) await call("/api/sim", { comp: id, game: m.key });
    const now = await call("/api/games?comp=" + encodeURIComponent(id));
    const mine = (now.groups_all || []).filter((x) => x.gr === gi);
    if (now.groups_all && !mine.every((x) => x.done)) fail.push("group " + gi + " not finished after playing its games");
    if (gi < ng - 1) {
      if (!now.event || !/Group matchday/.test(now.event.label)) fail.push("knockout started before all groups were done (after group " + gi + "): " + (now.event && now.event.label));
    }
  }
  const after = await call("/api/games?comp=" + encodeURIComponent(id));
  if (after.groups_all) fail.push("group stage still open after all groups were played");
  if (after.event && /Group matchday/.test(after.event.label)) fail.push("still on a group matchday after every group was played: " + after.event.label);
  // a game that was already played cannot be played again; a knockout game cannot be played during the group stage
  await call("/api/sim", { comp: id, to_end: true });
  const B = await snap(id);
  if (A !== B) fail.push("group-by-group play gives different results than matchday-by-matchday");
  else console.log("same tournament either way (" + all.length + " group games, " + ng + " groups)");
  // C: a mix: one group first, then the rest by matchday
  id = await reach();
  g = await call("/api/games?comp=" + encodeURIComponent(id));
  for (const m of g.groups_all.filter((x) => x.gr === 2).sort((a, b) => a.md - b.md)) await call("/api/sim", { comp: id, game: m.key });
  const dup = await raw("/api/sim", { comp: id, game: g.groups_all.find((x) => x.gr === 2).key });
  if (dup.code === 200) fail.push("a played game could be played twice");
  await call("/api/sim", { comp: id, to_end: true });
  if ((await snap(id)) !== A) fail.push("mixed order gives different results");
  console.log(fail.length ? "GROUPS FAIL " + fail.join(" | ") : "GROUPS OK");
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.log("GROUPS FAIL", e.message); process.exit(1); });
