// v15 academies recruit worldwide. A club's scouting reach (how many dots it has in each part of the world) comes from its academy
// level and stature; a country it keeps taking kids from becomes a pipeline. A graduate is either a local kid or a recruit from the
// nation drawn for the intake; recruiting abroad needs reach there, and each academy has only a few foreign intake slots a year.
// Plain JS (not generated). No random numbers are used outside the caller's own rng stream.
$mods["acad"] = (function () {
  const REGIONS = ["Europe", "South America", "North and Central America", "Africa", "Asia and Oceania"];
  const REGION_OF = { UEFA: 0, CONMEBOL: 1, CONCACAF: 2, CAF: 3, AFC: 4, OFC: 4 };
  const AFFINITY = { UEFA: [0, 0.4, 0, 0.4, 0], CONMEBOL: [0.3, 0, 0.2, 0, 0], CONCACAF: [0.1, 0.3, 0, 0.1, 0], AFC: [0, 0, 0, 0.1, 0] };
  const region = (confed) => (confed in REGION_OF ? REGION_OF[confed] : 4);
  // pipelines: nations other than the home country that supplied at least two of the last twelve graduates
  function pipes(c, home) {
    const cnt = {};
    for (const p of c.get("grads", [])) if (p.nat !== home) cnt[p.nat] = (cnt[p.nat] || 0) + 1;
    return Object.keys(cnt).filter((k) => cnt[k] >= 2).sort((a, b) => cnt[b] - cnt[a] || (a < b ? -1 : 1)).slice(0, 2);
  }
  // dots (0-3) in each of the five regions, and the home region is always full
  function reach(w, c) {
    const acad = c.get("acad", 3.0), st = c.get("stature"), hc = c.get("confed"), hr = region(hc), aff = AFFINITY[hc] || [0, 0, 0, 0, 0];
    const pp = pipes(c, c.get("country")), out = [];
    for (let r = 0; r < 5; r++) {
      if (r === hr) { out.push(3); continue; }
      let d = (acad - 3) * 0.3 + st / 90 - 0.95 + aff[r];
      for (const n of pp) if (w.nations.has(n) && region(w.nations.get_(n).get_("confed")) === r) d += 1;
      out.push(Math.max(0, Math.min(3, Math.round(d))));
    }
    return out;
  }
  const slots = (c) => 1 + Math.floor(c.get("acad", 3.0) / 2);
  // which nation does this graduate come from? `drawn` is the nation the intake lottery gave; `used` counts foreign recruits so far this summer
  function nation(w, cname, drawn, rng, used) {
    const c = w.clubs.get_(cname), home = c.get("country"), acad = c.get("acad", 3.0);
    if (drawn === home || !w.nations.has(drawn)) return home;
    if ((used[cname] || 0) >= slots(c)) return home;
    if (rng.random() < 0.45 + 0.03 * (10 - acad)) return home;                    // most kids are local
    const dots = reach(w, c)[region(w.nations.get_(drawn).get_("confed"))], pp = pipes(c, home);
    const acc = Math.min(1, (dots === 0 ? 0.12 : dots === 1 ? 0.45 : dots === 2 ? 0.8 : 1.0) * (pp.includes(drawn) ? 1.5 : 1) * (1 + $mods.fed.pushOf(w, drawn)));
    if (rng.random() < acc) { used[cname] = (used[cname] || 0) + 1; return drawn; }
    return home;
  }
  function info(w, c) {
    const home = c.get("country"), r = reach(w, c), pp = pipes(c, home);
    return $dict($kw({ "regions": REGIONS.map((n, i) => $dict($kw({ "name": n, "dots": r[i], "home": i === region(c.get("confed")) }))), "pipelines": pp, "slots": slots(c), "reach_cost": 0 }));
  }
  return { REGIONS, reach, pipes, slots, nation, info };
})();
