// v16 Off-season moves pages: reads over w.mv (the move log) and, for seasons from before the log, over w.transfers.
// Nothing here changes the simulation. Plain JS (not generated).
$mods["movepages"] = (function () {
  const M = () => $mods.moves, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const label = (w, y) => $mods.cal.season_label(w.cfg.start_year, y);
  const UP = 4, DOWN = -4;                                         // how far a club's pull must change to count as a step up or down
  const mvOf = (a) => a == null ? null : a >= UP ? "up" : a <= DOWN ? "down" : "side";
  const kx = (w) => w.cfg.money_x;

  // the events of one season, with the old transfer list as a fallback for seasons before the log existed
  function eventsOf(w, S) {
    const d = M().dataOf(w, S);
    if (d) return { ev: d.ev, cnt: d.cnt, recorded: true };
    const ev = [];
    for (const t of w.transfers) if ($idx(t, "season") === S) ev.push({ k: "t", n: $idx(t, "player"), u: 0, nat: $idx(t, "nat"), pos: null, age: $idx(t, "age"), ovr: $idx(t, "ovr"), pot: $idx(t, "pot"), f: $idx(t, "frm"), t: $idx(t, "to"), fl: $idx(t, "frm_league"), tl: $idx(t, "to_league"), fee: $idx(t, "fee"), kd: $idx(t, "kind"), a: null, rv: 0, wg: 0 });
    return { ev, cnt: { t: ev.length }, recorded: false };
  }

  // ---- how hot a move is (0 to 100) ---------------------------------------------------------------------------------
  function hotOf(e, ctx) {
    let h = 0;
    switch (e.k) {
      case "t": h = clamp((e.ovr - 64) * 2.1, 0, 44) + 34 * Math.sqrt(e.fee / (ctx.maxFee || 1)) + (e.fl !== e.tl ? 5 : 0) + (e.rv ? 8 : 0) + (e.a == null ? 0 : Math.min(9, Math.abs(e.a) / 2)) + (e.age <= 21 && e.pot >= 82 ? 6 : 0); break;
      case "f": h = clamp((e.ovr - 62) * 2.1, 0, 46) + 20 * Math.sqrt((e.wg || 0) / (ctx.maxWage || 1)) + (e.age <= 21 && e.pot >= 82 ? 8 : 0) + (e.a == null ? 0 : Math.min(8, Math.abs(e.a) / 2)); h = Math.min(h, 88); break;
      case "r": h = clamp((e.ovr - 62) * 1.6, 0, 40); break;
      case "p": h = clamp(e.pr / ctx.maxPr * 78 + (e.pk - 80) * 1.2, 0, 100); break;
      case "h": h = e.pr * 1.15 + (e.src === "acad" ? 30 : 0) + (e.src === "new" ? 6 : 0) + (e.a == null ? 0 : Math.min(14, Math.abs(e.a) / 1.5)); break;
      case "x": h = e.pr * 1.05 + 10; break;
      case "q": h = e.pr * 0.95 + 4; break;
      case "cr": h = e.pr * 1.0 + e.ti * 2; break;
      case "n": h = e.pr * 0.9 + 8 + (e.home ? 4 : 0); break;
    }
    return Math.round(clamp(h, 0, 100));
  }
  const ctxOf = (list) => {
    const c = { maxFee: 0.1, maxWage: 0.1, maxPr: 1 };
    for (const e of list) { if (e.k === "t") c.maxFee = Math.max(c.maxFee, e.fee); if (e.k === "f" || e.k === "r") c.maxWage = Math.max(c.maxWage, e.wg || 0); if (e.k === "p") c.maxPr = Math.max(c.maxPr, e.pr); }
    return c;
  };
  const KIND = { t: "Transfer", f: "Free agent", r: "Released", p: "Retired", h: "Hired", x: "Sacked", q: "Walked away", cr: "Retired", n: "National team" };

  function rowOf(w, e, i, ctx, who) {
    const r = { i, k: e.k, kind: KIND[e.k], hot: hotOf(e, ctx), name: e.n, nat: e.nat, age: e.age, mv: null, a: e.a == null ? null : e.a };
    if (e.k === "t" || e.k === "f" || e.k === "r" || e.k === "p") Object.assign(r, { uid: e.u || 0, pos: e.pos, ovr: e.ovr, pot: e.pot, pk: e.pk || null });
    if (e.k === "t") Object.assign(r, { from: e.f, to: e.t, fromL: e.fl, toL: e.tl, fee: Math.round(e.fee * kx(w) * 10) / 10, kd: e.kd, why: e.why || null, bid: e.bd ? { base: e.bd.b, asking: e.bd.a, demand: e.bd.d, premium: e.bd.pm, comp: e.bd.c, trainer: e.bd.tn, traits: e.bd.tr, bids: e.bd.bids.map((c) => ({ club: c[0], bid: c[1], wage: c[2], score: c[3], rival: !!c[4] })) } : null, rival: !!e.rv, pay: e.fee, mv: mvOf(e.a), abroad: e.fl !== e.tl });
    if (e.k === "f") Object.assign(r, { from: e.f, to: e.t, fromL: e.fl, toL: e.tl, wage: Math.round(e.wg * kx(w) * 10) / 10, pay: e.wg * 3, mv: mvOf(e.a), first: !!e.first, abroad: !!(e.fl && e.fl !== e.tl) });
    if (e.k === "r") Object.assign(r, { from: e.f, fromL: e.fl, wage: Math.round(e.wg * kx(w) * 10) / 10, pay: e.wg * 3 });
    if (e.k === "p") Object.assign(r, { club: e.c, clubL: e.cl, prestige: e.pr, seasons: e.ss, honours: e.tn, hid: e.hid });
    if (e.k === "h" || e.k === "x" || e.k === "q" || e.k === "cr" || e.k === "n") Object.assign(r, { prestige: e.pr, seasons: e.ss, titles: e.ti, cups: e.cu, cwc: e.cwc, pay: e.pr });
    if (e.k === "h") Object.assign(r, { to: e.t, toL: e.tl, from: e.f, src: e.src, mv: e.src === "acad" ? "up" : mvOf(e.a), idle: e.ua });
    if (e.k === "x" || e.k === "q") Object.assign(r, { from: e.f, fromL: e.fl });
    if (e.k === "cr") Object.assign(r, { from: e.f, fromL: e.fl, hid: e.hid });
    if (e.k === "n") Object.assign(r, { nation: e.t, prev: e.prev, home: !!e.home, src: e.src });
    return r;
  }
  const inLeague = (e, lg) => { if (!lg) return true; const L = lg.indexOf("|") >= 0 ? lg.split("|") : [lg]; return L.includes(e.fl) || L.includes(e.tl) || L.includes(e.cl); };
  const SORTS = {
    hot: (a, b) => b.hot - a.hot,
    pay: (a, b) => (b.pay || 0) - (a.pay || 0),
    level: (a, b) => (b.ovr || 0) - (a.ovr || 0) || b.hot - a.hot,
    jump: (a, b) => Math.abs(b.a || 0) - Math.abs(a.a || 0) || b.hot - a.hot,
    young: (a, b) => (a.age || 99) - (b.age || 99) || b.hot - a.hot,
    name: (a, b) => (b.prestige || 0) - (a.prestige || 0),
    prestige: (a, b) => (b.prestige || 0) - (a.prestige || 0) || (b.pk || 0) - (a.pk || 0),
    peak: (a, b) => (b.pk || 0) - (a.pk || 0) || (b.prestige || 0) - (a.prestige || 0),
    age: (a, b) => (b.age || 0) - (a.age || 0)
  };

  // the walk-through: chapters, hottest first inside each
  function walk(w, rows) {
    const take = (kinds, n, filt) => rows.filter((r) => kinds.includes(r.k) && (!filt || filt(r))).sort(SORTS.hot).slice(0, n);
    const chap = [["Transfers", take(["t"], 8)], ["Free agents", take(["f"], 5)], ["Coaches", []], ["Retirements", take(["p"], 4).concat(take(["cr"], 2))]];
    const co = rows.filter((r) => ["h", "x", "q", "n"].includes(r.k)).sort(SORTS.hot), pick = [];
    const add = (r) => { if (r && !pick.includes(r)) pick.push(r); };
    add(co.find((r) => r.src === "acad")); add(co.find((r) => r.k === "x")); for (const r of co) { if (pick.length >= 7) break; add(r); }
    chap[2][1] = pick.sort(SORTS.hot);
    const out = []; for (const [c, list] of chap) list.forEach((r, j) => out.push(Object.assign({}, r, { chapter: c, n: j + 1, of: list.length })));
    return out;
  }

  // one row per coach: the events of the same person (left, then retired; sacked, then hired) share a row and show as several bubbles
  const COACH = ["h", "x", "q", "cr", "n"];
  function mergeCoaches(rows) {
    const out = [], by = new Map();
    for (const r of rows) {
      if (!COACH.includes(r.k)) { out.push(r); continue; }
      const key = r.name + "|" + r.nat, g = by.get(key);
      if (!g) { const m = Object.assign({}, r, { evs: [r] }); by.set(key, m); out.push(m); }
      else { g.evs.push(r); g.evs.sort((a, b) => a.i - b.i); const last = g.evs[g.evs.length - 1], ev = g.evs; Object.assign(g, last, { evs: ev, hot: Math.max.apply(null, ev.map((x) => x.hot)) }); }
    }
    return out;
  }
  function v_moves(w, q) {
    const seasons = w.hist.length, S = q.season >= 1 && q.season <= seasons ? q.season : seasons;
    if (!seasons) return { season: null };
    const { ev, cnt, recorded } = eventsOf(w, S), ctx = ctxOf(ev);
    const tab = q.tab || "highlights", lg = q.league || null;
    const leagues = w.leagues.keysArr().slice().sort((a, b) => (w.leagues.get_(b).get_("prestige") - w.leagues.get_(a).get_("prestige")) || (a < b ? -1 : 1));
    const all = ev.map((e, i) => ({ e, i }));
    const rowsFor = (kinds) => all.filter((x) => kinds.includes(x.e.k) && inLeague(x.e, lg)).map((x) => rowOf(w, x.e, x.i, ctx));
    const base = { season: S, label: label(w, S), seasons, recorded, league: lg, leagues, tab, counts: { transfers: cnt.t || 0, free: cnt.fa || 0, hired: cnt.h || 0, fired: cnt.x || 0, left: cnt.q || 0, coachRetired: cnt.cr || 0, academy: cnt.ac || 0, national: cnt.n || 0, retired: cnt.p || 0 }, sort: null, shown: 0, total: 0, rows: [] };
    if (tab === "highlights") {
      const rows = mergeCoaches(rowsFor(["t", "f", "p", "h", "x", "q", "cr", "n"]));
      const wk = walk(w, rows); base.walk = wk; base.rows = []; base.total = wk.length; return markLinks(w, base);
    }
    let kinds, filt = () => true;
    if (tab === "players") {
      const k = q.kind || "all"; kinds = k === "t" ? ["t"] : k === "f" ? ["f"] : k === "r" ? ["r"] : ["t", "f", "r"];
      if (q.mv && q.mv !== "all") filt = (r) => r.mv === q.mv;
    } else if (tab === "coaches") {
      const k = q.kind || "all"; kinds = k === "all" ? ["h", "x", "q", "cr", "n"] : k === "acad" ? ["h"] : [k];
      const evs = (r) => r.evs || [r];
      filt = (r) => (k === "all" || (k === "acad" ? evs(r).some((e) => e.k === "h" && e.src === "acad") : evs(r).some((e) => e.k === k))) && (!q.mv || q.mv === "all" || evs(r).some((e) => e.mv === q.mv));
    } else { kinds = q.who === "c" ? ["cr"] : ["p"]; }
    const sort = SORTS[q.sort] ? q.sort : (tab === "retired" ? "prestige" : "hot");
    let rows = rowsFor(kinds); if (tab === "coaches") rows = mergeCoaches(rows);
    rows = rows.filter(filt).sort(SORTS[sort]);
    base.sort = sort; base.total = rows.length; base.rows = rows.slice(0, +q.limit || 60); base.shown = base.rows.length;
    if (tab === "players") { const mvc = { up: 0, side: 0, down: 0 }; for (const r of rowsFor(["t", "f"])) if (r.mv) mvc[r.mv]++; base.mvCounts = mvc; }
    return markLinks(w, base);
  }
  // which people can be opened: active players have a page, retired ones through their Hall of Fame card
  function markLinks(w, d) {
    const act = new Set(); for (const p of w.players) if (p.uid) act.add(p.uid); for (const p of w.retired_players) if (p.uid) act.add(p.uid);
    const fix = (r) => {
      if (r.uid && !act.has(r.uid)) r.uid = 0;
      if (r.hid) { const c = $mods.hofpages.cardOf(w, r.hid); if (!c) r.hid = null; else { const f = Object.values(c.st).map((s) => s.first).filter((x) => x); if (f.length) r.hofFrom = label(w, Math.min.apply(null, f)); r.hofTiers = Object.keys(c.st).map((k) => k[0]).filter((v, i, a) => a.indexOf(v) === i).length; } }
    };
    d.rows.forEach(fix); if (d.walk) d.walk.forEach(fix);
    return d;
  }
  return { v_moves, eventsOf, hotOf, mvOf, UP, DOWN };
})();
