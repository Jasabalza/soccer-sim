// v15.2 engine pages: competition hub cards, history, all-time stats, league hall of fame and league money.
// usage: node tools/t_pages_v152.js [seed]    ends with "PAGES OK" or "PAGES FAIL"
const fs = require("fs"), vm = require("vm"), D = __dirname + "/../data/";
globalThis.__DATA = {}; for (const k of ["leagues", "nations", "clubs_geo", "rivalries", "rivalries_nat"]) __DATA[k] = fs.readFileSync(D + k + ".json", "utf8");
globalThis.require = require;
vm.runInThisContext(fs.readFileSync(__dirname + "/../dist/bundle_engine.js", "utf8") + "\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const seed = process.argv[2] || "3", SEASONS = +(process.argv[3] || 9);
(async () => {
  const R = globalThis.__R; await R.init(); const fail = [];
  const ok = (c, m) => { if (!c) { fail.push(m); console.log("  FAIL", m); } };
  const call = async (p, b) => { const r = await R.request(p, b); if (r.code !== 200) throw new Error(p + " " + r.code + " " + JSON.stringify(r.body).slice(0, 200)); return r.body; };
  const raw = (p, b) => R.request(p, b), q = (o) => Object.entries(o).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  await call("/api/new", { seed });
  // before any season is played everything must already answer (empty histories)
  let hub = await call("/api/comphub"); ok(hub.cards.length === 18, "18 competition families, got " + hub.cards.length);
  ok((await call("/api/comphist?" + q({ key: "cup:UEFA" }))).editions_n === 0, "empty history before play");
  for (let i = 0; i < SEASONS; i++) await call("/api/years", { n: 1 });
  hub = await call("/api/comphub");
  const keys = hub.cards.map((c) => c.key);
  ok(new Set(keys).size === 18 && keys.includes("wc") && keys.includes("cwc") && keys.includes("ct:CAF") && keys.includes("nl:OFC"), "hub has every family once");
  for (const c of hub.cards) {
    ok(c.title && c.confed && (c.scope === "clubs" || c.scope === "nations"), "card basics " + c.key);
    ok(c.current || c.next_season || c.kind === "cup", "card " + c.key + " shows current edition or next season");
    if (c.holder) ok(c.holder.name && c.most && c.most.n >= 1, "card holder/most " + c.key);
  }
  for (const key of keys) {
    const h = await call("/api/comphist?" + q({ key })), tr = await call("/api/trophies?" + q({ key }));
    const tw = tr.selected.rows.filter((r) => r.winner);
    ok(h.editions_n === tw.length, key + " editions match trophies (" + h.editions_n + " vs " + tw.length + ")");
    ok(h.by.reduce((a, b) => a + b.titles, 0) === h.editions_n, key + " title counts add up");
    ok(h.finals.every((f, i) => i === 0 || f.season < h.finals[i - 1].season), key + " finals newest first");
    ok(h.finals.every((f) => !/^(\d+)-(\d+)/.test(f.score) || +/^(\d+)-(\d+)/.exec(f.score)[1] >= +/^(\d+)-(\d+)/.exec(f.score)[2]), key + " scores are winner first");
    ok(h.never_won.every((n) => !h.by.some((b) => b.name === n.name)), key + " finalists who never won are disjoint from winners");
    ok(h.by.every((b, i) => i === 0 || b.titles <= h.by[i - 1].titles), key + " board sorted");
    ok(h.editions.length === h.editions_n && h.editions.every((e) => e.cid), key + " editions listed with ids");
    if (h.editions_n) {
      const a = await call("/api/compalltime?" + q({ key }));
      ok(a.editions <= h.editions_n, key + " stat editions <= editions");
      ok(a.goals.every((p, i) => i === 0 || p.goals <= a.goals[i - 1].goals), key + " goals sorted");
      // each list is ranked on its own: first place is 1, ranks never go down, and tied values share a rank
      for (const [nm, f] of [["goals", "goals"], ["assists", "assists"], ["cs", "cs"], ["golden", "golden"]]) {
        const L = a[nm] || [];
        ok(L.every((p, i) => (i === 0 ? p.rank === 1 : p.rank >= L[i - 1].rank && (p[f] === L[i - 1][f]) === (p.rank === L[i - 1].rank))), key + " " + nm + " ranks are 1,2,3.. with ties shared");
      }
      // independent check: the leader's goals equal the sum over the per-season stored lists
      if (a.goals.length) {
        const top = a.goals[0]; let sum = 0;
        for (const e of h.editions) { if (!e.stats) continue; const s = await raw("/api/compstats?" + q({ id: e.cid, season: e.season })); if (s.code !== 200) continue; let m = 0; for (const l of [s.body.scorers, s.body.assists, s.body.keepers]) for (const p of l || []) if (p.uid === top.uid) m = Math.max(m, p.goals); sum += m; }
        ok(sum === top.goals, key + " top scorer total " + top.goals + " equals per-season sum " + sum);
        ok(a.records.goals && a.records.goals.v >= a.goals[0].best.goals, key + " single-edition record covers the leader's best");
      }
    }
  }
  const h = await call("/api/comphist?" + q({ key: "cup:UEFA" }));
  ok(h.current && !h.next_season && h.by_group.length && h.by_group_label === "Titles by league", "club cup always has a current edition and league split");
  const ct = await call("/api/comphist?" + q({ key: "ct:UEFA" }));
  ok(ct.nation && ct.hosts.length === ct.editions_n && ct.every === 4, "championship has hosts every four years");
  ok(!ct.current ? ct.next_season % 4 === 3 : true, "championship next season falls on its cycle year");
  const lg = "Premier League", hof = await call("/api/leaguehof?" + q({ name: lg })), lgd = await call("/api/league?" + q({ name: lg }));
  ok(hof.seasons_n === SEASONS && hof.board.reduce((a, b) => a + b.titles, 0) === SEASONS, "league titles add up to seasons played");
  ok(hof.board.length + hof.yet_to_win.length >= hof.clubs_n - 0 && hof.board.every((b) => !hof.yet_to_win.some((y) => y.club === b.club)), "titleholders and yet-to-win are disjoint");
  ok(hof.strip.length === SEASONS && hof.strip[0].season === SEASONS, "season strip newest first");
  ok(JSON.stringify(hof.strip.map((s) => s.club)) === JSON.stringify(lgd.champs.map((c) => c.club)), "strip matches champions list");
  ok(hof.run && hof.run.n >= 1, "longest run exists");
  const mon = await call("/api/leaguemoney?" + q({ name: lg }));
  ok(mon.rows.length === 20 && mon.of === 16 && mon.rank >= 1 && mon.rank <= 16, "league money rows and rank");
  ok(mon.revenue > 0 && mon.leagues.length === 16 && mon.leagues[0].rank === 1, "league money totals and league table");
  ok(mon.rows.every((r, i) => i === 0 || r.income <= mon.rows[i - 1].income), "club finance sorted by income");
  ok(["Strong", "Steady", "Tight", "In debt"].includes(mon.rows[0].health), "health label");
  for (const bad of ["/api/comphist?key=nope", "/api/comphist?key=league:Premier%20League", "/api/compalltime?key=nope", "/api/leaguehof?name=nope", "/api/leaguemoney?name=nope"]) ok((await raw(bad)).code === 404, bad + " answers 404");
  console.log(fail.length ? "PAGES FAIL " + fail.length : "PAGES OK");
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error("ERR", e.stack.slice(0, 700)); console.log("PAGES FAIL"); process.exit(1); });
