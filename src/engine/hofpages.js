// v16 Hall of Fame pages: plain reads over the cards and results in w.hof. Nothing here changes the simulation
// (apart from running a league's Hall of Fame day a little early, which gives the same result as the rollover would).
// Plain JS (not generated).
$mods["hofpages"] = (function () {
  const H = $mods.hof;
  const TIERS = ["W", "C", "L", "K"], TIER_NAME = { W: "World", C: "Country", L: "League", K: "Club" };
  const label = (w, y) => $mods.cal.season_label(w.cfg.start_year, y);
  const st = (w) => H.ensure(w);
  const cardOf = (w, id) => st(w).cards[id] || null;
  const kindOfKey = (key) => key[0];
  // which scope does a card's state key belong to
  const tierOf = (key) => key === "W" ? "W" : key[0];
  const nameOf = (key) => (key.length > 2 ? key.slice(2) : null);
  // the highest tier a card is in, with the scope behind it (for the one badge on a row)
  function badge(card) {
    let best = null;
    for (const [key, s] of Object.entries(card.st)) {
      if (s.status !== "in") continue;
      const t = tierOf(key), rank = TIERS.indexOf(t);
      if (!best || rank < best.rank || (rank === best.rank && s.yr < best.yr)) best = { tier: t, scope: nameOf(key), yr: s.yr, rank };
    }
    if (!best) return null;
    return { tier: best.tier, scope: best.scope, yr: best.yr };
  }
  // one line of career for a row
  function line(w, card) {
    if (card.k === "c") {
      const co = card.co, bits = [co.seasons + " seasons"];
      if (co.titles) bits.push(co.titles + (co.titles === 1 ? " league title" : " league titles"));
      if (co.cups) bits.push(co.cups + (co.cups === 1 ? " continental cup" : " continental cups"));
      if (co.cwc) bits.push(co.cwc + " Club World Cup");
      return bits.join(", ");
    }
    const d = H.dataOf(card), c = {}; for (const h of d.hon) { const k = h[1] === "award" ? h[2] : h[1]; c[k] = (c[k] || 0) + 1; }
    const bits = [d.cr.length + " seasons"];
    if (c.league) bits.push(c.league + (c.league === 1 ? " league title" : " league titles"));
    if (c.cup) bits.push(c.cup + (c.cup === 1 ? " continental cup" : " continental cups"));
    if (c.world) bits.push(c.world + " World Cup" + (c.world === 1 ? "" : "s"));
    if (c["Ballon d'Or"]) bits.push(c["Ballon d'Or"] + " Ballon d'Or");
    return bits.join(", ");
  }
  function row(w, card, extra) {
    const b = badge(card);
    return Object.assign({ id: card.id, k: card.k, name: card.name, nat: card.nat, pos: card.k === "p" ? card.pos : null, ret: card.ret, retired: label(w, card.ret),
      years: card.k === "p" ? yearsOf(card) : null, badge: b, line: line(w, card), home: card.k === "p" ? card.home : null }, extra || {});
  }
  const yearsOf = (card) => { const cr = H.dataOf(card).cr; return cr.length ? [cr[0][0], cr[cr.length - 1][0]] : null; };
  const entryRow = (w, e, key) => {
    const card = cardOf(w, e.id);
    return Object.assign({}, e, { retired: label(w, e.ret), badge: card ? badge(card) : null, line: card ? line(w, card) : "", home: card && card.k === "p" ? card.home : null,
      years: card && card.k === "p" ? yearsOf(card) : null, still: !!card });
  };
  // ---- the chain: where a person stands in each of the four halls ----------------------------------------------
  const STATUS_RANK = { in: 0, ballot: 1, off: 2 };
  function chain(w, card) {
    const out = { W: null, C: null, L: null, K: null, all: [], veto: card.vetoed || null };
    for (const [key, s] of Object.entries(card.st)) {
      const t = tierOf(key), scope = nameOf(key);
      const item = { tier: t, scope, status: s.status, yr: s.yr, label: s.yr ? label(w, s.yr) : null, n: s.n, pct: s.pct, first: s.first, left: Math.max(0, H.CFG.window - s.n), via: s.via };
      if (s.status === "in") out.all.push(item);
      const cur = out[t];
      if (!cur || STATUS_RANK[s.status] < STATUS_RANK[cur.status] || (STATUS_RANK[s.status] === STATUS_RANK[cur.status] && (s.yr || 0) > (cur.yr || 0) && s.status === "in" && false)) out[t] = item;
    }
    out.all.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.yr - b.yr);
    return out;
  }
  // ---- the world day (end of year): final-year watch, the vote, who fell off -----------------------------------
  function v_day(w, Y) {
    const h = st(w), fav = favourites(w, Y);
    const res = (key) => h.res[key + "|" + Y] || { ind: [], bal: [], off: [] };
    const wp = res("W"), wc = res("cW");
    const prev = h.res["W|" + (Y - 1)] || { bal: [] }, prevMap = {}; for (const e of prev.bal) prevMap[e.id] = e.pct;
    const all = wp.ind.concat(wp.bal, wp.off);
    const watch = all.filter((e) => e.left <= 2).sort((a, b) => (b.pct) - (a.pct)).slice(0, 8).map((e) => {
      const r = entryRow(w, e, "W"); r.last = prevMap[e.id] === undefined ? null : prevMap[e.id]; delete r.pct; return r;
    });
    const inducted = wp.ind.map((e) => entryRow(w, e, "W")), missed = wp.bal.filter((e) => e.pct >= 0.4 || e.left <= 1).slice(0, 8).map((e) => entryRow(w, e, "W"));
    const fell = wp.off.map((e) => entryRow(w, e, "W"));
    const vetoes = (h.res["VETO|" + Y] || []);
    return { season: Y, label: label(w, Y), watch, inducted, missed, fell, vetoes, coaches: { inducted: wc.ind.map((e) => entryRow(w, e, "cW")), missed: wc.bal.slice(0, 5).map((e) => entryRow(w, e, "cW")), fell: wc.off.map((e) => entryRow(w, e, "cW")) },
      favs: fav, cfg: { window: H.CFG.window, pass: H.CFG.pass, floor: H.CFG.floor, wait: H.CFG.wait } };
  }
  // what the followed leagues and nations did this year
  function favourites(w, Y) {
    const h = st(w), out = [];
    for (const f of (w.favs || [])) {
      const ln = f.startsWith("league:") ? f.slice(7) : null, nat = f.startsWith("nation:") ? f.slice(7) : null;
      if (ln && w.leagues.has(ln)) { const r = h.res["L:" + ln + "|" + Y]; if (r) out.push({ kind: "league", name: ln, inducted: r.ind.map((e) => e.name) }); else out.push({ kind: "league", name: ln, inducted: [] }); }
      else if (nat && w.nations.has(nat)) { const r = h.res["C:" + nat + "|" + Y]; out.push({ kind: "nation", name: nat, inducted: r ? r.ind.map((e) => e.name) : [] }); }
    }
    return out;
  }
  // ---- a league's Hall of Fame day ---------------------------------------------------------------------------------
  function leagueDone(w, ln) { const lc = w.comps.get(("L:" + ln)); return !!lc && !w.missing(lc).length; }
  function v_leagueday(w, ln, Y) {
    if (!w.leagues.has(ln)) throw new Error("unknown league");
    Y = Y || w.season;
    const h = st(w), ready = Y < w.season || leagueDone(w, ln);
    if (ready) H.runLeagueDay(w, ln, Y);
    const res = (key) => h.res[key + "|" + Y] || { ind: [], bal: [], off: [] };
    const lp = res("L:" + ln), lcoach = res("cL:" + ln);
    const clubs = w.leagues.get_(ln).get_("clubs").map((c) => {
      const p = res("K:" + c), co = res("cK:" + c);
      return { club: c, inducted: p.ind.map((e) => entryRow(w, e, "K")).concat(co.ind.map((e) => entryRow(w, e, "cK"))), ballot: p.bal.length + co.bal.length };
    });
    clubs.sort((a, b) => b.inducted.length - a.inducted.length || (a.club < b.club ? -1 : 1));
    const nL = lp.ind.length + lcoach.ind.length, nK = clubs.reduce((a, c) => a + c.inducted.length, 0);
    return { ready, league: ln, season: Y, label: label(w, Y), nLeague: nL, nClubs: nK,
      league_ind: lp.ind.map((e) => entryRow(w, e, "L")).concat(lcoach.ind.map((e) => entryRow(w, e, "cL"))), ballot: lp.bal.slice(0, 12).map((e) => entryRow(w, e, "L")), clubs,
      off: lp.off.map((e) => entryRow(w, e, "L")) };
  }
  // ---- the Hall of Fame tab: one hall (world, a country, a league or a club), players or coaches ----------------------
  function key_of(tier, name) { return tier === "W" ? "W" : tier + ":" + name; }
  function v_hof(w, q) {
    const h = st(w), tier = q.tier || "W", name = q.name || null, kind = q.kind === "c" ? "c" : "p", key = key_of(tier, name), rk = (kind === "c" ? "c" : "") + key;
    const members = [], onBallot = [];
    for (const id of Object.keys(h.cards)) {
      const c = h.cards[id]; if (c.k !== kind) continue;
      const s = c.st[key]; if (!s) continue;
      if (s.status === "in") members.push({ c, s });
    }
    members.sort((a, b) => b.s.yr - a.s.yr || (a.c.name < b.c.name ? -1 : 1));
    const classes = []; for (const m of members) { let cl = classes[classes.length - 1]; if (!cl || cl.y !== m.s.yr) { cl = { y: m.s.yr, label: label(w, m.s.yr), rows: [] }; classes.push(cl); } cl.rows.push(row(w, m.c, { yr: m.s.yr, pct: Math.round(m.s.pct * 100) / 100, n: m.s.n, via: m.s.via })); }
    // latest vote's ballot
    let by = null; for (let y = w.season; y > w.season - 4; y--) if (h.res[rk + "|" + y]) { by = y; break; }
    const last = by ? h.res[rk + "|" + by] : null;
    const ballot = last ? last.bal.slice(0, 20).map((e) => entryRow(w, e, key)) : [];
    const watch = last ? last.bal.filter((e) => e.left <= 2).slice(0, 10).map((e) => entryRow(w, e, key)) : [];
    const snubs = []; if (tier === "W" || tier === "C") {
      if (kind === "p") for (const f of h.fell) if (tier === "W" ? f.W >= H.CFG.W.gate : f.nat === name) snubs.push(Object.assign({ retired: label(w, f.ret) }, f));
    }
    const offs = []; for (let y = w.season; y > w.season - 10; y--) { const r = h.res[rk + "|" + y]; if (r) for (const e of r.off) offs.push(Object.assign(entryRow(w, e, key), { y, ylabel: label(w, y) })); }
    const recs = records(w, members);
    return { tier, name, kind, label: TIER_NAME[tier] + (name ? " · " + name : ""), total: members.length, classes: classes.slice(0, 40), ballot, ballot_year: by, ballot_label: by ? label(w, by) : null, watch, snubs: snubs.slice(-40).reverse(), dropped: offs.slice(0, 40), records: recs,
      options: options(w), cfg: { window: H.CFG.window, pass: H.CFG.pass, wait: H.CFG.wait } };
  }
  function records(w, members) {
    if (!members.length) return [];
    const out = [], by = (f) => members.slice().sort((a, b) => f(b) - f(a))[0];
    const first = members.filter((m) => m.s.n === 1); if (first.length) out.push({ label: "First-ballot inductees", value: first.length + " of " + members.length });
    const long = by((m) => m.s.n); out.push({ label: "Longest wait", value: long.c.name + " (year " + long.s.n + ")", id: long.c.id });
    const top = by((m) => m.s.pct); out.push({ label: "Highest vote", value: top.c.name + " (" + Math.round(top.s.pct * 100) + "%)", id: top.c.id });
    const nats = {}; for (const m of members) nats[m.c.nat] = (nats[m.c.nat] || 0) + 1; const bn = Object.entries(nats).sort((a, b) => b[1] - a[1])[0]; if (bn) out.push({ label: "Most inductees from one nation", value: bn[0] + " (" + bn[1] + ")" });
    return out;
  }
  function options(w) {
    const nations = new Set(), leagues = w.leagues.keysArr(), clubs = new Set();
    for (const id of Object.keys(st(w).cards)) { const c = st(w).cards[id]; for (const k of Object.keys(c.st)) if (c.st[k].status === "in") { if (k[0] === "C") nations.add(k.slice(2)); else if (k[0] === "K") clubs.add(k.slice(2)); } }
    return { leagues, nations: [...nations].sort(), clubs: [...clubs].sort() };
  }
  // ---- a single person's Hall of Fame page ------------------------------------------------------------------------------
  function v_card(w, id) {
    const card = cardOf(w, id); if (!card) throw new Error("unknown card");
    const ch = chain(w, card), out = { id: card.id, k: card.k, name: card.name, nat: card.nat, pos: card.pos || null, ret: card.ret, retired: label(w, card.ret), chain: ch, badge: badge(card), line: line(w, card), uid: card.uid || null };
    if (card.k === "p") {
      const d = H.dataOf(card); out.peak = card.peak; out.trn = card.trn; out.home = card.home; out.scores = { W: d.sc.W, C: d.sc.C }; out.nat_rec = d.nat_rec;
      out.clubs = Object.entries(d.sc.K).map(([c, s]) => ({ club: c, score: s })).sort((a, b) => b.score - a.score).slice(0, 4);
      out.career = d.cr.map((r) => ({ season: r[0], label: label(w, r[0]), club: r[1], ovr: r[2] }));
      out.honours = d.hon.map((r) => ({ season: r[0], kind: r[1], title: r[2] }));
    } else {
      const co = card.co, sc = H.cscores(w, co); out.scores = { W: sc.W }; out.stats = { seasons: co.seasons, w: co.w, d: co.d, l: co.l, titles: co.titles, cups: co.cups, cwc: co.cwc };
      out.stints = H.stintsOf(co).map((s) => { const n = H.stintNums(w, co, s); return { kind: s.k, team: s.t, from: s.f ? label(w, s.f) : null, to: s.u === null || s.u === undefined ? null : (s.u ? label(w, s.u) : null), seasons: Math.round(n.s || 0), titles: Math.round(n.ti || 0), cups: Math.round(n.cu || 0), wc: s.wc || 0, ct: s.ct || 0, est: !!s.est }; });
    }
    return out;
  }
  // a short chain for the player page (looks the card up by uid, or by name and peak for stars kept before v16)
  function chainFor(w, p) {
    const h = st(w); let card = null;
    for (const id of Object.keys(h.cards)) { const c = h.cards[id]; if (c.k === "p" && ((c.uid && c.uid === p.uid) || (c.name === p.name && c.nat === p.nat && c.peak === p.peak))) { card = c; break; } }
    return card ? { id: card.id, chain: chain(w, card), badge: badge(card) } : null;
  }
  // the people on any of the world's ballots in their last years, for the swipe cards before the vote
  function v_watch(w) {
    const h = st(w), out = [];
    for (const id of Object.keys(h.cards)) { const c = h.cards[id]; if (c.k !== "p") continue; const s = c.st.W; if (s && s.status === "ballot" && s.n >= H.CFG.window - 2) out.push(row(w, c, { n: s.n, left: H.CFG.window - s.n, pct: s.pct })); }
    out.sort((a, b) => b.pct - a.pct); return out.slice(0, 10);
  }
  return { TIERS, TIER_NAME, label, badge, chain, row, entryRow, v_day, v_leagueday, v_hof, v_card, chainFor, v_watch, favourites, line, cardOf };
})();
