// v15.2: league hall of fame, competition history and all-time statistics for every competition family.
// Pure reads over w.hist / w.finals / w.comps. Nothing here changes the simulation.
$mods["pages"] = (function() {
const NAME = {cup: null, cwc: "Club World Cup", wc: "World Cup"};
const EVERY = {cup: 1, cwc: 4, wc: 4, ct: 4, nl: 4};
const CYCLE = {nl: 1, cwc: 2, ct: 3, wc: 0};   // season % 4 on which each tournament is played
const deep = (v) => Array.isArray(v) ? v.map(deep) : (v && v.constructor === Object ? $dict($kw(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])))) : v);
const g = (r, k, d = null) => $M.get(r, k, d);

// "C:UEFA" -> "cup:UEFA", "CT:7:UEFA" -> "ct:UEFA", "L:Premier League" -> "league:Premier League"; qualifiers and playoffs have no family
function fam(cid) {
  const p = String(cid).split(":");
  switch (p[0]) {
    case "L": return "league:" + String(cid).slice(2);
    case "C": return "cup:" + p[1];
    case "CWC": return "cwc";
    case "WC": return "wc";
    case "CT": return "ct:" + p[2];
    case "NL": return "nl:" + p[2];
    default: return null;
  }
}
function kind_of(key) { return key.startsWith("league:") ? "league" : key.split(":")[0]; }
function confed_of(w, key) { const k = kind_of(key); return (k === "cwc" || k === "wc") ? "WORLD" : (k === "league" ? $idx($idx(w.leagues, key.slice(7)), "confed") : key.split(":")[1]); }
function cid_for(key, season) {
  const k = kind_of(key), cf = key.split(":")[1];
  if (k === "cup") return "C:" + cf;
  if (k === "cwc") return "CWC:" + season;
  if (k === "wc") return "WC:" + season;
  if (k === "ct") return "CT:" + season + ":" + cf;
  if (k === "nl") return "NL:" + season + ":" + cf;
  return "L:" + key.slice(7);
}
function title_of(w, key) {
  const k = kind_of(key), NC = $mods.natcomps;
  if (k === "league") return key.slice(7);
  if (k === "cup") return $idx($idx(w.cups, key.slice(4)), "name");
  if (k === "cwc") return NAME.cwc;
  if (k === "wc") return NAME.wc;
  return $idx(k === "ct" ? NC.CT_TITLES : NC.NL_TITLES, key.slice(3));
}
function is_valid(w, key) {
  try { const k = kind_of(key); if (k === "cup") return $in(key.slice(4), w.cups); if (k === "ct" || k === "nl") return $in(key.slice(3), $mods.natcomps[k === "ct" ? "CT_TITLES" : "NL_TITLES"]); if (k === "league") return $in(key.slice(7), w.leagues); return k === "cwc" || k === "wc"; } catch (e) { return false; }
}
function emblem_of(key) {
  const T = $mods.trophies, k = kind_of(key), cf = key.split(":")[1];
  if (k === "league") return T.spec_league(key.slice(7));
  if (k === "cup") return T.spec_cup(cf);
  if (k === "cwc") return T.SPEC_CWC;
  if (k === "wc") return T.SPEC_WC;
  return k === "ct" ? T.spec_ct(cf) : T.spec_nl(cf);
}
function orient(t) { const m = /^(\d+)-(\d+)(.*)$/.exec(t || ""); if (!m) return t || ""; let a = +m[1], b = +m[2]; if (a < b) [a, b] = [b, a]; return a + "-" + b + m[3]; }
function rank_ties(rows, val) { let last = null, rk = 0; rows.forEach((r, i) => { const v = val(r); if (v !== last) { rk = i + 1; last = v; } r.rank = rk; }); return rows; }
const counts = (arr) => { const m = new Map(); for (const x of arr) if (x) m.set(x, (m.get(x) || 0) + 1); return m; };
const topnames = (m, min = 1) => { let best = 0; for (const v of m.values()) best = Math.max(best, v); return best >= min ? { n: best, names: [...m].filter(([k, v]) => v === best).map(([k]) => k) } : null; };

// ---- editions (winner rows) for the cup / tournament families ----
function edition_rows(w, key) {
  const wn = $mods.trophies.winners(w, key), out = [];
  for (const r of $idx(wn, "rows")) {
    const win = g(r, "winner"); if (!win) continue;
    let text = g(r, "text", "") || "", host = null;
    const m = /(?:^| - )host (.+)$/.exec(text); if (m) { host = m[1]; text = text.slice(0, m.index); }
    out.push({season: $idx(r, "season"), winner: win, runner_up: g(r, "runner_up"), coach: g(r, "coach"), score: orient(text.trim()), date: g(r, "date"), host, cid: cid_for(key, $idx(r, "season"))});
  }
  return out.reverse();                                   // oldest first
}
function stats_seasons(w, key) {
  const out = new Set();
  for (const r of w.hist) { const a = g(r, "awards"); if (!a) continue; for (const [cid] of $M.items(g(a, "comps", new $Dict()))) if (fam(cid) === key) out.add($idx(r, "season")); }
  return out;
}
function active_comp(w, key) {
  for (const [cid, c] of $M.items(w.comps)) if (fam(cid) === key) return c;
  return null;
}
function next_season(w, key, has_active) {
  const k = kind_of(key); if (k === "cup" || k === "league") return null;
  if (has_active) return null;
  for (let s = w.season + 1; s < w.season + 9; s++) if (s % 4 === CYCLE[k]) return s;
  return null;
}
function group_of(w, key, name) {
  const k = kind_of(key);
  if (k === "wc" || k === "ct" || k === "nl") { const n = g(w.nations, name); return n ? $idx(n, "confed") : "Other"; }
  const c = g(w.clubs, name); return c ? $idx(c, "league") : "Other";
}

function history(w, key, label) {
  const rows = edition_rows(w, key), k = kind_of(key), nation = (k === "wc" || k === "ct" || k === "nl");
  const winners = counts(rows.map((r) => r.winner)), lost = counts(rows.map((r) => r.runner_up));
  const first = new Map(); rows.forEach((r) => { if (!first.has(r.winner)) first.set(r.winner, r.season); });
  const by = [...winners].map(([name, titles]) => ({name, titles, seasons: rows.filter((r) => r.winner === name).map((r) => r.season), lost: rows.filter((r) => r.runner_up === name).map((r) => r.season), finals: titles + (lost.get(name) || 0), host: nation ? rows.filter((r) => r.winner === name).map((r) => r.host).filter(Boolean) : []}));
  by.sort((a, b) => b.titles - a.titles || first.get(a.name) - first.get(b.name));
  rank_ties(by, (r) => r.titles);
  const never = [...lost].filter(([n]) => !winners.has(n)).map(([name, finals]) => ({name, finals, seasons: rows.filter((r) => r.runner_up === name).map((r) => r.season)})).sort((a, b) => b.finals - a.finals || b.seasons[b.seasons.length - 1] - a.seasons[a.seasons.length - 1]);
  const grp = new Map(); for (const r of rows) { const gr = group_of(w, key, r.winner); grp.set(gr, (grp.get(gr) || 0) + 1); }
  const by_group = (k === "ct" || k === "nl") ? [] : [...grp].map(([name, n]) => ({name, n})).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  // records
  const rec = [];
  const runs = []; let run = []; rows.forEach((r, i) => { if (i && rows[i - 1].winner === r.winner) run.push(r); else { if (run.length > 1) runs.push(run); run = [r]; } }); if (run.length > 1) runs.push(run);
  if (runs.length) rec.push({label: "Back-to-back champions", text: runs.map((x) => x[0].winner + " S" + x[0].season + "-S" + x[x.length - 1].season).join(" · ")});
  const pens = rows.filter((r) => /pens/.test(r.score)); if (pens.length) rec.push({label: "Finals won on penalties", text: pens.length + " (" + pens.map((r) => "S" + r.season).join(", ") + ")"});
  const cc = topnames(counts(rows.map((r) => r.coach)), 2); if (cc) rec.push({label: "Most titles as coach", text: cc.n + ": " + cc.names.join(", ")});
  const ml = topnames(lost, 2); if (ml) rec.push({label: "Most finals lost", text: ml.names.join(", ") + ", " + ml.n});
  let big = null; for (const r of rows) { const m = /^(\d+)-(\d+)/.exec(r.score); if (m && !/pens/.test(r.score)) { const d = +m[1] - +m[2]; if (!big || d > big.d) big = {d, r}; } }
  if (big && big.d >= 2) rec.push({label: "Biggest final win", text: big.r.winner + " " + big.r.score + " " + big.r.runner_up + " (S" + big.r.season + ")"});
  const ac = active_comp(w, key), ns = next_season(w, key, !!ac), ss = stats_seasons(w, key);
  const newest = rows.length ? rows[rows.length - 1] : null;
  const top = by.length ? by[0] : null;
  return deep({
    key, title: title_of(w, key), kind: k, confed: confed_of(w, key), nation, every: EVERY[k], editions_n: rows.length, winners_n: winners.size,
    most: topnames(winners), holder: newest ? Object.assign({}, newest, {titles: winners.get(newest.winner), finals: winners.get(newest.winner) + (lost.get(newest.winner) || 0)}) : null,
    current: ac ? {cid: ac.id, done: !!ac.done, season: w.season} : null, next_season: ns, next_label: (ns && label) ? label(ns) : null, between: !ac, emblem: emblem_of(key),
    editions: rows.map((r) => ({season: r.season, cid: r.cid, winner: r.winner, stats: ss.has(r.season)})).reverse(),
    by, never_won: never, by_group, by_group_label: nation ? "Titles by confederation" : "Titles by league",
    finals: rows.slice().reverse(), hosts: rows.filter((r) => r.host).map((r) => ({season: r.season, host: r.host})).reverse(), records: rec,
    top_titles: top ? top.titles : 0
  });
}

// ---- all-time statistics from the per-edition lists stored in history ----
function alltime(w, key) {
  const emb = emblem_of(key);
  const editions = [], P = new Map(), coaches = new Map(), boots = [], rec = {goals: [], assists: [], cs: []};
  const rows = (kind_of(key) === "league") ? null : edition_rows(w, key);
  const coach_titles = rows ? counts(rows.map((r) => r.coach)) : counts(w.hist.map((r) => g(g(r, "champ_coach", new $Dict()), key.slice(7))));
  const hist = w.hist.slice().sort((a, b) => $idx(a, "season") - $idx(b, "season"));
  for (const r of hist) {
    const a = g(r, "awards"); if (!a) continue;
    const s = $idx(r, "season");
    for (const [cid, e] of $M.items(g(a, "comps", new $Dict()))) {
      if (fam(cid) !== key) continue;
      editions.push(s);
      const ed = new Map();                                  // uid -> this edition's numbers
      const put = (p, f) => { const u = $idx(p, "uid"); let x = ed.get(u); if (!x) { x = {uid: u, name: $idx(p, "name"), nat: $idx(p, "nat"), pos: g(p, "pos"), team: $idx(p, "team"), g: 0, a: 0, cs: 0}; ed.set(u, x); }
        const n = (k) => g(p, k, 0) || 0; if (f !== "cs") { x.g = Math.max(x.g, n("goals")); x.a = Math.max(x.a, n("assists")); } if (f === "cs" || n("cs")) x.cs = Math.max(x.cs, n("cs")); };
      for (const p of g(e, "scorers", [])) put(p, "s");
      for (const p of g(e, "assists", [])) put(p, "a");
      for (const p of g(e, "keepers", [])) put(p, "cs");
      const sc = g(e, "scorers", []);
      if (sc.length && $idx(sc[0], "goals") > 0) { const b = sc[0]; boots.push({season: s, uid: $idx(b, "uid"), name: $idx(b, "name"), team: $idx(b, "team"), nat: $idx(b, "nat"), goals: $idx(b, "goals")}); }
      for (const x of ed.values()) {
        let t = P.get(x.uid); if (!t) { t = {uid: x.uid, name: x.name, nat: x.nat, pos: x.pos, goals: 0, assists: 0, cs: 0, editions: 0, teams: [], best: {goals: 0, season: 0}, golden: 0, golden_seasons: []}; P.set(x.uid, t); }
        t.goals += x.g; t.assists += x.a; t.cs += x.cs; t.editions += 1; t.name = x.name; t.nat = x.nat; t.pos = x.pos || t.pos;
        if (!t.teams.includes(x.team)) t.teams.push(x.team);
        if (x.g > t.best.goals) t.best = {goals: x.g, season: s};
      }
      for (const x of ed.values()) { rec.goals.push({season: s, name: x.name, team: x.team, v: x.g}); rec.assists.push({season: s, name: x.name, team: x.team, v: x.a}); if (x.cs) rec.cs.push({season: s, name: x.name, team: x.team, v: x.cs}); }
      const cl = g(e, "coach", []);
      if (cl.length) { const c0 = cl[0], nm = $idx(c0, "name"); let c = coaches.get(nm); if (!c) { c = {name: nm, nat: g(c0, "nat"), team: g(c0, "team"), awards: 0, titles: 0, seasons: []}; coaches.set(nm, c); } c.awards += 1; c.seasons.push(s); c.team = g(c0, "team"); }
    }
  }
  for (const b of boots) { const t = P.get(b.uid); if (t) { t.golden += 1; t.golden_seasons.push(b.season); } }
  for (const [nm, n] of coach_titles) { let c = coaches.get(nm); if (!c) { c = {name: nm, nat: null, team: null, awards: 0, titles: 0, seasons: []}; coaches.set(nm, c); } c.titles = n; }
  const all = [...P.values()].map((t) => Object.assign(t, {teams: t.teams.slice(-4)}));
  const list = (field, min, lim) => all.filter((t) => t[field] >= min).sort((a, b) => b[field] - a[field] || b.assists - a.assists || a.name.localeCompare(b.name)).slice(0, lim);
  const best = (arr) => { arr = arr.filter((x) => x.v > 0); if (!arr.length) return null; const m = Math.max(...arr.map((x) => x.v)); return {v: m, who: arr.filter((x) => x.v === m).slice(0, 3)}; };
  const goals = rank_ties(list("goals", 1, 40), (t) => t.goals), assists = rank_ties(list("assists", 1, 40), (t) => t.assists), cs = rank_ties(list("cs", 1, 40), (t) => t.cs);
  const golden = rank_ties(all.filter((t) => t.golden > 0).sort((a, b) => b.golden - a.golden || b.goals - a.goals).slice(0, 40), (t) => t.golden);
  const coach_list = rank_ties([...coaches.values()].filter((c) => c.titles + c.awards > 0).sort((a, b) => b.titles - a.titles || b.awards - a.awards || a.name.localeCompare(b.name)).slice(0, 40), (c) => c.titles * 100 + c.awards);
  return deep({key, emblem: emb, title: title_of(w, key), editions: editions.length, seasons: editions, goals, assists, cs, golden, coaches: coach_list,
    records: {goals: best(rec.goals), assists: best(rec.assists), cs: best(rec.cs)}, boots: boots.reverse(), top: goals.length ? goals[0] : null,
    note: "All-time totals add up each edition's stored top lists, so they are exact for the leaders."});
}

// ---- league hall of fame ----
function league_hof(w, ln) {
  const L = $idx(w.leagues, ln), clubs = [...$idx(L, "clubs")];
  const seasons = [], by = new Map(), best = new Map(), pts = [];
  const hist = w.hist.slice().sort((a, b) => $idx(a, "season") - $idx(b, "season"));
  const coachRuns = new Map();
  for (const r of hist) {
    const s = $idx(r, "season"), ch = g(g(r, "champs", new $Dict()), ln); if (!ch) continue;
    seasons.push({season: s, club: ch});
    let b = by.get(ch); if (!b) { b = {club: ch, titles: 0, seasons: [], second: []}; by.set(ch, b); } b.titles++; b.seasons.push(s);
    const t = g(g(r, "tables", new $Dict()), ln, []); if (t.length > 1) { let x = by.get(t[1]); if (!x) { x = {club: t[1], titles: 0, seasons: [], second: []}; by.set(t[1], x); } x.second.push(s); }
    const p = g(g(g(r, "pts", new $Dict()), ln, new $Dict()), ch); if (p != null) pts.push({season: s, club: ch, pts: p});
    const co = g(g(r, "champ_coach", new $Dict()), ln); if (co) coachRuns.set(co, (coachRuns.get(co) || 0) + 1);
    const full = g(g(r, "tables_full", new $Dict()), ln, []);
    full.forEach((row, i) => { const nm = typeof row === "string" ? row : $idx(row, "club"); const pos = typeof row === "string" ? i + 1 : (g(row, "pos") || i + 1); if (!best.has(nm) || pos < best.get(nm).pos) best.set(nm, {pos, season: s}); });
    if (!full.length && t.length) t.forEach((nm, i) => { if (!best.has(nm) || i + 1 < best.get(nm).pos) best.set(nm, {pos: i + 1, season: s}); });
  }
  const boardAll = [...by.values()].filter((b) => b.titles > 0).sort((a, b) => b.titles - a.titles || a.seasons[0] - b.seasons[0]);
  rank_ties(boardAll, (b) => b.titles);
  // continental cup wins of each titleholder (Champions League etc.)
  const cf = $idx(L, "confed"), cupWins = new Map();
  for (const r of hist) { const c = g(g(r, "cups", new $Dict()), cf, [null, null]); if (c && c[0]) cupWins.set(c[0], (cupWins.get(c[0]) || 0) + 1); }
  const cupName = g(g(w.cups, cf, new $Dict()), "name", null);
  for (const b of boardAll) { b.cup = cupWins.get(b.club) || 0; b.cup_name = cupName; }
  // longest run of consecutive titles
  let run = null, cur = null; for (const s of seasons) { if (cur && cur.club === s.club && s.season === cur.to + 1) { cur.to = s.season; cur.n++; } else cur = {club: s.club, from: s.season, to: s.season, n: 1}; if (!run || cur.n > run.n) run = Object.assign({}, cur); }
  const yet = clubs.filter((c) => !by.has(c) || by.get(c).titles === 0).map((c) => ({club: c, best: best.has(c) ? best.get(c).pos : null, season: best.has(c) ? best.get(c).season : null})).sort((a, b) => (a.best == null) - (b.best == null) || a.best - b.best || a.club.localeCompare(b.club));
  const mp = pts.slice().sort((a, b) => b.pts - a.pts)[0], fp = pts.slice().sort((a, b) => a.pts - b.pts);
  const lowest = fp.length ? fp.filter((x) => x.pts === fp[0].pts) : [];
  const cl = topnames(coachRuns, 2);
  const mostT = boardAll.length ? boardAll[0].titles : 0;
  const holder = seasons.length ? seasons[seasons.length - 1] : null;
  const curLeader = null;
  return deep({league: ln, seasons_n: seasons.length, different: boardAll.length, clubs_n: clubs.length, most: boardAll.filter((b) => b.titles === mostT).map((b) => b.club), most_n: mostT, holder,
    run, board: boardAll, yet_to_win: yet, strip: seasons.slice().reverse(),
    records: {most_pts: mp || null, fewest_pts: lowest.length ? {pts: fp[0].pts, who: lowest.slice(0, 3)} : null, coach: cl}});
}

// ---- competition cards (for continent / world pages) ----
function families(w) {
  const NC = $mods.natcomps, keys = [];
  for (const cf of w.cups.keysArr()) keys.push("cup:" + cf);
  keys.push("cwc", "wc");
  for (const cf of NC.CT_TITLES.keysArr()) keys.push("ct:" + cf);
  for (const cf of NC.NL_TITLES.keysArr()) keys.push("nl:" + cf);
  return keys;
}
function card(w, key, progress, label) {
  const k = kind_of(key), rows = edition_rows(w, key), winners = counts(rows.map((r) => r.winner)), last = rows.length ? rows[rows.length - 1] : null;
  const ac = active_comp(w, key), cf = confed_of(w, key);
  let size = null;
  if (k === "cup") size = [...w.leagues.keysArr()].filter((ln) => $idx($idx(w.leagues, ln), "confed") === cf).length;
  else if (k === "ct" || k === "nl") size = [...w.nations.keysArr()].filter((n) => $idx($idx(w.nations, n), "confed") === cf).length;
  const mt = topnames(winners);
  return deep({key, title: title_of(w, key), kind: k, confed: cf, scope: (k === "cup" || k === "cwc") ? "clubs" : "nations", every: EVERY[k], size,
    editions_n: rows.length, winners_n: winners.size, most: mt, holder: last ? {name: last.winner, runner_up: last.runner_up, season: last.season, score: last.score} : null,
    current: ac ? Object.assign({cid: ac.id, season: w.season}, progress ? $plain_of(progress(ac)) : {}) : null, next_season: next_season(w, key, !!ac), next_label: (!ac && next_season(w, key, false) && label) ? label(next_season(w, key, false)) : null, emblem: emblem_of(key)});
}
function $plain_of(v) { return v && v.keysArr ? Object.fromEntries(v.keysArr().map((x) => [x, v.get_(x)])) : v; }
function cards(w, progress, label) {
  return families(w).map((key) => card(w, key, progress, label));
}

return {fam, kind_of, cid_for, title_of, is_valid, history, alltime, league_hof, cards, card, families, orient, emblem_of};
})();
