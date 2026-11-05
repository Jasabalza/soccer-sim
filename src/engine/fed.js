// v15 federations: every nation has a football federation with a fund, a culture score (0-100) and a stage.
// The fund fills from a share of its clubs' prize money, training compensation for kids its clubs trained and solidarity payments
// on transfers; it is spent automatically by stage (home academies / partner academies abroad / coaching) and lifts the culture
// score. Achievements (a national's cup MVP, a Ballon d'Or, a World Cup run) move the score too. Culture above the nation's
// starting level (the "lift") raises how many high-potential youngsters it produces. Plain JS (not generated).
$mods["fed"] = (function () {
  const STAGES = ["Exporter", "Developing", "Self-sufficient", "Powerhouse"], CUT = [35, 60, 80];
  const SPLIT = [[0.40, 0.45, 0.15], [0.60, 0.25, 0.15], [0.70, 0.10, 0.20], [0.55, 0.05, 0.40]];       // home academies, partners abroad, coaching
  const stageOf = (c) => (c < CUT[0] ? 0 : c < CUT[1] ? 1 : c < CUT[2] ? 2 : 3);
  const r1 = (x) => Math.round(x * 10) / 10;
  function init(n) {
    if (n.has("culture")) return n;
    const b = Math.max(5, Math.min(95, +n.get_("base")));
    n.set("culture", b); n.set("cul0", b); n.set("fund", 0.0); n.set("partner", 0.0);
    n.set("fin", $dict($kw({ "prize": 0.0, "comp": 0.0, "soli": 0.0 }))); n.set("fed_hist", []);
    return n;
  }
  const nat = (w, nm) => (w.nations.has(nm) ? init(w.nations.get_(nm)) : null);
  // money arriving during the season (the season's tally is closed in close())
  function credit(w, nm, kind, amt) {
    const n = nat(w, nm); if (!n || !(amt > 0)) return;
    const f = n.get_("fin"); f.set(kind, f.get_(kind) + amt);
  }
  const lift = (w, nm) => { const n = nat(w, nm); return n ? n.get_("culture") - n.get_("cul0") : 0; };
  const pushOf = (w, nm) => { const n = nat(w, nm); return n ? Math.min(0.6, 0.1 * Math.sqrt(Math.max(0, n.get_("partner")))) : 0; };
  function close(w, rec, cwc, wc) {
    const cfg = w.cfg, season = w.season, ev = {};
    const add = (nm, pts, text) => { if (!w.nations.has(nm)) return; (ev[nm] = ev[nm] || []).push([pts, text]); };
    const aw = $M.get(rec, "awards");
    if (aw) {
      const ba = $M.get(aw, "ballon", []);
      ba.slice(0, 3).forEach((l, i) => add($idx(l, "nat"), i === 0 ? 6 : 3, $idx(l, "name") + (i === 0 ? " won the Ballon d'Or" : " finished " + (i + 1) + (i === 1 ? "nd" : "rd") + " for the Ballon d'Or")));
      const cs = $M.get(aw, "comps", new $Dict());
      for (const [cid, s] of $M.items(cs)) {
        const mvp = $M.get(s, "mvp", []); if (!mvp.length) continue;
        const k = $idx(s, "kind"), top = mvp[0];
        const wt = k === "cup" ? ($M.get($M.get(w.cups, cid.slice(2), new $Dict()), "weight", 0.7)) : k === "cwc" ? 1.0 : k === "wc" ? 1.4 : k === "ct" ? 0.7 : 0;
        if (wt > 0) add($idx(top, "nat"), r1(6 * wt), $idx(top, "name") + " named MVP of the " + $idx(s, "name"));
      }
      const xi = $M.get(aw, "team", []), cnt = {};
      for (const l of xi) { const nm = $M.get(l, "nat"); if (nm) cnt[nm] = (cnt[nm] || 0) + 1; }
      for (const nm of Object.keys(cnt)) add(nm, Math.min(3, cnt[nm]), cnt[nm] + " in the Team of the Year");
    }
    if (wc && wc.winner) for (const [nm, v] of $M.items(wc.perf)) {
      const pts = v >= 0.99 ? 6 : v >= 0.8 ? 3.5 : v >= 0.6 ? 2 : v >= 0.45 ? 1 : 0;
      if (pts) add(nm, pts, (v >= 0.99 ? "Won" : v >= 0.8 ? "Reached the final of" : v >= 0.6 ? "Reached the semi-finals of" : "Reached the quarter-finals of") + " the World Cup");
    }
    for (const c of w.comps.valuesArr ? w.comps.valuesArr() : $M.values(w.comps)) {
      if (c.kind === "ct" && c.winner) { add(c.winner, 3, "Won the " + c.title); if (c.runner_up) add(c.runner_up, 1.5, "Reached the final of the " + c.title); }
    }
    // nationals playing in the best leagues
    const top = {}; for (const p of w.players) { if (!p.club) continue; const L = w.leagues.has(p.league) ? w.leagues.get_(p.league) : null; if (L && L.get_("prestige") >= 80) top[p.nat] = (top[p.nat] || 0) + 1; }
    for (const nm of Object.keys(top)) if (top[nm] >= 8) add(nm, Math.min(2, r1(top[nm] / 15)), top[nm] + " players in the top leagues");
    for (const nm of w.nations.keysArr()) {
      const n = init(w.nations.get_(nm)), f = n.get_("fin");
      f.set("soli", f.get_("soli") + Math.pow(1 - n.get_("cul0") / 100, 1.5));            // a small development grant: weaker federations are helped most
      const inc = f.get_("prize") + f.get_("comp") + f.get_("soli");
      let fund = n.get_("fund") + inc;
      const st = stageOf(n.get_("culture")), sp = SPLIT[st], spend = 0.8 * fund; fund -= spend;
      const dom = spend * sp[0], par = spend * sp[1], coa = spend * sp[2];
      const gain = cfg.fed_gain * Math.sqrt(Math.max(0, dom + 0.6 * par + 0.8 * coa));
      const e = (ev[nm] || []), sc = Math.max(0.35, Math.min(1.0, 1.3 - n.get_("cul0") / 75));          // a title means more to a small football nation than to a giant
      let pts = 0; for (const x of e) pts += x[0]; pts = Math.min(5, pts * sc);
      const c0 = n.get_("culture"), c1 = Math.max(0, Math.min(100, c0 + Math.min(2, gain) + pts - cfg.fed_decay * (c0 - n.get_("cul0"))));
      n.set("culture", c1); n.set("fund", fund); n.set("partner", 0.5 * n.get_("partner") + 0.5 * par);
      const h = n.get_("fed_hist"); h.push($dict($kw({ "season": season, "prize": f.get_("prize"), "comp": f.get_("comp"), "soli": f.get_("soli"), "dom": dom, "partner": par, "coach": coa, "spend": spend, "delta": r1(c1 - c0), "culture": r1(c1), "stage": stageOf(c1), "events": e.map((x) => [x[0], x[1]]) })));
      if (h.length > 10) n.set("fed_hist", h.slice(-10));
      f.set("prize", 0.0); f.set("comp", 0.0); f.set("soli", 0.0);
      // a coaching budget makes a better national coach
      const co = n.get_("coach"); if (co && coa > 0 && co.prestige != null) co.prestige = Math.min(100, co.prestige + Math.min(0.6, 0.05 * Math.sqrt(coa)));
    }
  }
  // the screen: one nation's federation (money shown in the display currency)
  function info(w, nm) {
    const n = nat(w, nm); if (!n) return null;
    const X = w.cfg.money_x, e = (x) => r1(x * X), h = n.get_("fed_hist"), last = h.length ? h[h.length - 1] : null, cul = n.get_("culture"), st = stageOf(cul);
    const kids = w.players.filter((p) => p.nat === nm && p.age <= 20);
    const gold = kids.filter((p) => p.pot >= 88).sort((a, b) => b.pot - a.pot);
    const cc = (p) => (p.club && w.clubs.has(p.club) ? w.clubs.get_(p.club).get_("country") : null);
    const abroad = w.players.filter((p) => p.nat === nm && p.age <= 20 && p.club && cc(p) && cc(p) !== nm).sort((a, b) => b.pot - a.pot);
    const row = (p) => $dict($kw({ "uid": p.uid, "name": p.name, "club": p.club, "age": p.age, "ovr": p.ovr, "pot": p.pot }));
    const ach = []; for (const x of h.slice().reverse()) for (const [pts, text] of x.get_("events")) ach.push($dict($kw({ "season": x.get_("season"), "pts": pts, "text": text })));
    return $dict($kw({
      "stages": STAGES, "stage": st, "culture": r1(cul), "lift": r1(cul - n.get_("cul0")), "delta": last ? last.get_("delta") : 0, "next_at": st < 3 ? CUT[st] : null,
      "fund": e(n.get_("fund")), "split": SPLIT[st],
      "last": last ? $dict($kw({ "season": last.get_("season"), "prize": e(last.get_("prize")), "comp": e(last.get_("comp")), "soli": e(last.get_("soli")), "spend": e(last.get_("spend")) })) : null,
      "events": ach.slice(0, 8), "golden": gold.length >= 3 ? $dict($kw({ "bar": 88, "count": gold.length, "players": gold.slice(0, 6).map(row), "ages": [Math.min(...gold.map((p) => p.age)), Math.max(...gold.map((p) => p.age))] })) : null,
      "abroad": abroad.slice(0, 8).map(row), "n_abroad": abroad.length, "n_home": kids.length - abroad.length
    }));
  }
  return { init, credit, lift, pushOf, close, info, stageOf, STAGES };
})();
