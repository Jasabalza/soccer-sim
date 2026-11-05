// Tournament games: the games of the current round of any cup, qualifying group, play-off, World Cup, continental
// championship or Nations League, who may be played now, and the single-game sim. Plain JS (not generated).
$mods["tourney"] = (function () {
  const NATION = new Set(["qual", "ic", "wc", "ct", "nl"]);
  const gv = (x, k) => (x instanceof $Dict ? x.get_(k) : x[k]);
  function fail(msg, code) { throw $new($mods.app_v11.ApiError, [msg, code || 400]); }
  const comp = (w, cid) => { if (!w.comps.has(cid)) fail("unknown competition", 404); return w.comps.get_(cid); };

  // can this competition's current round be played right now?
  function ready(w, c) {
    if (c.kind === "league") return { ok: c.ptr < c.rounds.length && c.has_event(w.season), why: null };
    if (c.ptr >= c.events.length) return { ok: false, why: "This competition is finished." };
    if (!c.has_event(w.season)) return { ok: false, why: "The next round is not due yet. Sim forward to reach it." };
    const miss = w.missing(c);
    if (miss.length) return { ok: false, why: "Waiting for " + miss.map((m) => w.comps.get_(m).title).join(", ") + " to finish.", locked_by: miss };
    return { ok: true, why: null };
  }
  const ovr = (w, c, n) => (NATION.has(c.kind) ? Math.round(gv(c.eff && c.eff.has && c.eff.has(n) ? c.eff : w.nat_eff, n) * 10) / 10 : w.clubs.get_(n).get_("ovr"));
  // where the game is played: {home: team or null (neutral)}
  function venue(c, g) {
    const k = c.kind;
    if (k === "cup") return g.leg === 1 ? g.a : g.leg === 2 ? g.b : null;
    if (k === "cwc" || k === "ic") return null;
    if (k === "qual") return g.phase === "group" ? g.a : g.leg === 1 ? g.a : g.leg === 2 ? g.b : null;
    if (k === "wc" || k === "ct") return c.host === g.a || c.host === g.b ? c.host : null;
    if (k === "nl") return g.phase === "group" ? g.a : null;
    return null;
  }
  // the result as text, "2-1", "1-1 (pens)", or "2-0, 1-1 (agg 3-1)"
  function text(c, g, res) {
    if (!res) return null;
    if (res.legs) {
      const how = (res.how || "").trim();
      if (res.legs.length === 1) { const l = res.legs[0]; return res.agg ? l[0] + "-" + l[1] + (how ? " " + how : "") : l[0] + "-" + l[1] + " (1st leg)"; }
      return res.legs.map((l) => l[0] + "-" + l[1]).join(", ") + " (agg " + res.agg[0] + "-" + res.agg[1] + ")" + (how ? " " + how : "");
    }
    if (res.s1) return res.s1[0] + "-" + res.s1[1] + ", " + res.s2[0] + "-" + res.s2[1] + " (agg " + (res.s1[0] + res.s2[0]) + "-" + (res.s1[1] + res.s2[1]) + ")" + (res.how ? " " + res.how.trim() : "");
    const how = res.how ? " " + res.how.trim() : "";
    return res.sa + "-" + res.sb + how;
  }
  function stakes(c, g) {
    const left = g.left || g.n || 0;
    if (c.kind === "cup" || c.kind === "cwc") return left <= 2 ? 1.7 : left <= 4 ? 1.45 : left <= 8 ? 1.3 : 1.2;
    return 1.0;
  }
  function games(w, cid) {
    const c = comp(w, cid);
    if (c.kind === "league") fail("Use the fixtures list for leagues", 400);
    const rd = ready(w, c);
    const out = { comp: cid, title: c.title, kind: c.kind, nation: NATION.has(c.kind), ready: rd.ok, why: rd.why, locked_by: rd.locked_by || [],
      event: null, played: 0, total: 0, games: [], events: c.events.length, ptr: c.ptr };
    if (c.ptr >= c.events.length) return out;
    const ev = c.events[c.ptr], evd = $mods.app_v11.ev_date(w, c, ev);
    out.event = { label: gv(ev, "label"), week: gv(ev, "week"), season: gv(ev, "season"), date: evd };
    if (!rd.ok) return out;
    c.ensure_prepared();
    const pg = c.pg || {};
    out.games = c.games().map((g) => {
      const done = g.key in pg, res = done ? pg[g.key] : null, rv = !NATION.has(c.kind) ? $mods.rivals.label(w, g.a, g.b) : null;
      let gr = -1, grl = null;
      if ((g.phase === "group" || g.phase === "grp") && c.groups) {
        gr = c.groups.findIndex((m) => m.includes(g.a));
        if (gr >= 0) grl = c.kind === "nl" && c.labels ? c.labels[gr] : c.kind === "qual" ? "Group " + (gr + 1) : "Group " + String.fromCharCode(65 + (gr % 26)) + (gr >= 26 ? gr : "");
      }
      return { key: g.key, a: g.a, b: g.b, leg: g.leg || 0, gr, grl, home: venue(c, g), done, text: text(c, g, res),
        winner: res && res.w ? res.w : null, ao: ovr(w, c, g.a), bo: ovr(w, c, g.b), stakes: stakes(c, g),
        rivalry: rv ? { name: rv.name, kind: rv.kind, intensity: rv.intensity } : null };
    });
    out.total = out.games.length; out.played = out.games.filter((x) => x.done).length;
    return out;
  }
  // play one chosen game of the current round
  function play_game(w, cid, key) {
    const c = comp(w, cid);
    const rd = ready(w, c);
    if (!rd.ok) fail(rd.why || "That round cannot be played yet.", 409);
    try {
      const g = c.games().find((x) => x.key === key);                    // the round moves on once its last game is played, so read the game first
      const res = c.play_game(key);
      return { key, a: g ? g.a : null, b: g ? g.b : null, text: g ? text(c, g, res) : null, winner: res && res.w ? res.w : null };
    } catch (e) { if (e instanceof ValueError) fail(e.message, 400); throw e; }
  }

  // ---- the pre-match page for a tournament game ----
  function groupInfo(w, c, n) {
    const tab = c.kind === "qual" ? c.tab : c.gtab;
    if (!tab || !c.groups) return null;
    const gi = c.groups.findIndex((g) => g.includes(n));
    if (gi < 0) return null;
    const rank = c.kind === "qual" ? c.group_rank(c.groups[gi]) : c.grp_rank(c.groups[gi]);
    const t = gv(tab, n);
    const label = c.kind === "nl" ? c.labels[gi] : "Group " + String.fromCharCode(65 + gi);
    return { group: label, pos: rank.indexOf(n) + 1, p: gv(t, "p"), pts: gv(t, "pts"), gf: gv(t, "gf"), ga: gv(t, "ga"), size: c.groups[gi].length };
  }
  function pastTie(c, a, b) {
    for (const t of c.tlog || []) if ((gv(t, "a") === a && gv(t, "b") === b) || (gv(t, "a") === b && gv(t, "b") === a)) return t;
    return null;
  }
  function matchup(w, cid, home, away) {
    const c = comp(w, cid), nation = NATION.has(c.kind);
    for (const n of [home, away]) if (!(nation ? w.nations : w.clubs).has(n)) fail("unknown " + (nation ? "nation" : "club"), 404);
    const rd = ready(w, c);
    let game = null, info = null;
    if (rd.ok) { c.ensure_prepared(); const gs = games(w, cid); game = gs.games.find((x) => (x.a === home && x.b === away) || (x.a === away && x.b === home)); info = gs.event; }
    if (game && game.a !== home) { const t = home; home = away; away = t; }      // always show the game's own home/first team on the left
    const eff = (n) => (c.eff && c.eff.has && c.eff.has(n) ? gv(c.eff, n) : nation ? gv(w.nat_eff, n) : w.clubs.get_(n).get_("eff"));
    const side = (n) => {
      const o = nation ? { name: n, confed: gv(w.nations.get_(n), "confed"), ovr: Math.round(eff(n) * 10) / 10, eff: Math.round(eff(n) * 10) / 10 }
        : { name: n, league: w.clubs.get_(n).get_("league"), ovr: w.clubs.get_(n).get_("ovr"), eff: Math.round(eff(n) * 10) / 10, stature: Math.round(w.clubs.get_(n).get_("stature")) };
      const gi = groupInfo(w, c, n); if (gi) Object.assign(o, gi);
      if ((c.kind === "cup" || c.kind === "cwc") && c.reached && c.reached.has(n)) o.reached = gv(c.reached, n);
      return o;
    };
    const lab = nation ? $mods.rivals.label(w, home, away) : $mods.rivals.label(w, home, away);
    const st = game ? game.stakes : 1.0, hv = game ? game.home : null;
    const neutral = !hv, flip = hv === away;
    const o = $mods.rivals.odds(flip ? eff(away) : eff(home), flip ? eff(home) : eff(away), lab ? lab.intensity * st : 0, neutral);
    const odds = flip ? { home: o.away, draw: o.draw, away: o.home, exp: [o.exp[1], o.exp[0]] } : o;
    const past = !game ? pastTie(c, home, away) : null;
    const leg1 = c.leg1 && c.leg1.has && game && game.leg === 2 ? gv(c.leg1, [game.a, game.b]) : null;
    return { nation, home: side(home), away: side(away), h2h: $mods.rivals.h2h(w, home, away), rivalry: lab, stakes: st, odds,
      comp: { id: cid, title: c.title, kind: c.kind },
      game: game ? { key: game.key, round: info ? info.label : "", date: info ? info.date : null, venue: hv, neutral, leg: game.leg, leg1, done: game.done, text: game.text, winner: game.winner, playable: !game.done, why: null }
        : { key: home + "|" + away, round: info ? info.label : "", venue: null, neutral: true, done: !!past, winner: past ? gv(past, "winner") : null, text: past ? (gv(past, "legs").map((l) => l[0] + "-" + l[1]).join(", ") + (gv(past, "how") ? " " + gv(past, "how") : "")) : null,
            playable: false, why: past ? "Already played." : (rd.ok ? "This game is not in the current round." : rd.why) } };
  }
  return { matchup, ready, games, play_game, venue, text, stakes, NATION };
})();
