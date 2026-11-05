$mods["awards"] = (function() {
const random = $py.random;
const {Counter, defaultdict} = $py.collections || {};
const cal = $mods.cal;
const compstats = $mods.compstats;
let ASSIST_W, BALLOT, COACH_BALLOT, FORMATION, GOAL_W, VOTERS;
FORMATION = [["GK", 1], ["DEF", 4], ["MID", 3], ["FWD", 3]];
GOAL_W = $lit_dict([["FWD", 1.0], ["MID", 0.42], ["DEF", 0.1], ["GK", 0.0]]);
ASSIST_W = $lit_dict([["FWD", 0.55], ["MID", 0.9], ["DEF", 0.22], ["GK", 0.0]]);
BALLOT = [6, 4, 3, 2, 1];
COACH_BALLOT = [5, 3, 1];
VOTERS = [["journalist", 50, 0.55, 1.0, 0.55, 0.0, 0.55, 0.4], ["coach", 25, 1.0, 0.35, 0.35, 0.0, 0.45, 0.3], ["fan", 25, 0.55, 0.55, 1.0, 0.5, 0.7, 0.25]];
function _draw(rng, n, weights) {
  if (((n <= 0) || (!$T(weights)) || ($sum(weights) <= 0))) {
    return Counter();
  }
  return Counter(rng.choices($range($len(weights)), $kw({"weights": weights, "k": n})));
}
function _xi(squad) {
  let bench, c, n, pos, rest, used, xi, $t1;
  [used, xi] = $iter([$set(), []]);
  for (const $f1 of $iter(FORMATION)) {
    [pos, n] = $iter($f1);
    c = $slice((() => { const $r = []; let p; for (const $c0 of $iter(squad)) { p = $c0; if (!(($eq(p.pos, pos)) && (!$in($id(p), used)))) continue; $r.push(p); } return $r; })(), null, n, null);
    xi = $iadd(xi, c);
    used = $bor(used, (() => { const $r = new $Set(); let p; for (const $c0 of $iter(c)) { p = $c0; $r.add($id(p)); } return $r; })());
  }
  rest = (() => { const $r = []; let p; for (const $c0 of $iter(squad)) { p = $c0; if (!(!$in($id(p), used))) continue; $r.push(p); } return $r; })();
  while ($T(($T($t1 = ($len(xi) < 11)) ? rest : $t1))) {
    $M.append(xi, $M.pop(rest, 0));
  }
  bench = $slice((() => { const $r = []; let p; for (const $c0 of $iter(squad)) { p = $c0; if (!(!$in($id(p), (() => { const $r = new $Set(); let x; for (const $c0 of $iter(xi)) { x = $c0; $r.add($id(x)); } return $r; })()))) continue; $r.push(p); } return $r; })(), null, 7, null);
  return [xi, bench];
}
function _round_name_rank(reached, total) {
  return ($T(total) ? $div(reached, total) : 0.0);
}
function run(w, rec, sq0, finish, expected, cwc, wc) {
  let MVP_W, _, a, a_, ag, avg_ga, aw, ballon, ballot_pts, base, boot, by_kind, c, c_, cand, cc, cf, cfirst, cid, club_cs, club_ga, cnt, co, coach_c, coach_rank, coach_winner, comps_of, corder, cs, csum, cvotes, d, date, everyone, f, first_votes, g, gas, h, have, hg, hi, i, jitter, k, kind, lavg, lc, league_scorers, lf, line, ln, lo, loser, md, mean, mvp_boost, n, nat, nat_bonus, nvot, order, over, p, pick, pid, pos, pre, pre_score, ps, r, rank, ranked, rng, s, sc, score_sum, scorers, sd, season, size, sm, st, stats, t, team, team_xi, top, tval, voter_split, voters, wb, wgt, wi, wm, wo, wq, wt, xi, young, young_pool, $t1, $t2, $t3, $t4, $t5, $t6, $t7, $t8, $t9, $t10, $t11, $t12, $t13, $t14, $t15, $t16, $t17, $t18, $t19, $t20;
  w.ensure_uids();
  rng = random.Random(($str(w.seed) + "|" + $str(w.season) + "|awards"));
  season = w.season;
  lavg = w.league_avgs();
  [lo, hi] = $iter([$min($M.values(lavg)), $max($M.values(lavg))]);
  lf = (() => { const $r = new $Dict(); let ln, v; for (const $c0 of $iter($M.items(lavg))) { [ln, v] = $iter($c0); $r.set(ln, (0.7 + (0.3 * ($gt(hi, lo) ? $div($sub(v, lo), $sub(hi, lo)) : 1.0)))); } return $r; })();
  stats = new $Dict();
  csum = new $Dict();
  [club_cs, club_ga] = $iter([new $Dict(), new $Dict()]);
  for (const $f2 of $iter(w.leagues)) {
    ln = $f2;
    lc = $idx(w.comps, ("L:" + $str(ln)));
    cs = defaultdict($int);
    for (const $f3 of $iter(lc.results)) {
      md = $f3;
      for (const $f4 of $iter(md)) {
        [h, a, hg, ag] = $iter($f4);
        if ((ag === 0)) {
          $setidx(cs, h, $idx(cs, h) + 1);
        }
        if ((hg === 0)) {
          $setidx(cs, a, $idx(cs, a) + 1);
        }
      }
    }
    gas = (() => { const $r = []; let n; for (const $c0 of $iter($idx(w.league_clubs, ln))) { n = $c0; $r.push($idx($idx(lc.st, n), "ga")); } return $r; })();
    avg_ga = ($T(gas) ? $div($sum(gas), $len(gas)) : 0);
    for (const $f5 of $iter($idx(w.league_clubs, ln))) {
      n = $f5;
      $setidx(club_cs, n, $idx(cs, n));
      $setidx(club_ga, n, [$idx($idx(lc.st, n), "ga"), avg_ga]);
    }
    $setidx(csum, ("L:" + $str(ln)), compstats.comp_stats(w, ("L:" + $str(ln)), sq0));
    $M.update(stats, $idx($idx(csum, ("L:" + $str(ln))), "_stats"));
  }
  for (const $f6 of $iter(w.players)) {
    p = $f6;
    st = $M.get(stats, $id(p));
    if ($T(($T($t1 = (st != null)) ? p.club : $t1))) {
      if ((!$hasattr(p, "stats"))) {
        p.stats = [];
      }
      $M.append(p.stats, [season, p.club, $idx(st, 0), $idx(st, 1), $idx(st, 2)]);
    }
  }
  for (const $f7 of $iter(w.cups)) {
    cf = $f7;
    $setidx(csum, ("C:" + $str(cf)), compstats.comp_stats(w, ("C:" + $str(cf)), sq0));
  }
  if ((cwc != null)) {
    $setidx(csum, cwc.id, compstats.comp_stats(w, cwc.id, sq0));
  }
  if ($T(($T($t2 = (wc != null)) ? wc.winner : $t2))) {
    $setidx(csum, wc.id, compstats.comp_stats(w, wc.id, sq0));
  }
  for (const $f8 of $iter($M.values(w.comps))) {
    c_ = $f8;
    if ($T(($T($t3 = ($in(c_.kind, ["ct", "nl"]))) ? c_.winner : $t3))) {
      $setidx(csum, c_.id, compstats.comp_stats(w, c_.id, sq0));
    }
  }
  MVP_W = $lit_dict([["league", [1.0, 0.4, 0.2]], ["cup", [1.4, 0.55, 0.25]], ["cwc", [1.4, 0.55, 0.25]], ["wc", [2.0, 0.8, 0.4]], ["ct", [1.5, 0.6, 0.3]], ["nl", [0.5, 0.2, 0.1]]]);
  mvp_boost = defaultdict($float);
  for (const $f9 of $iter($M.items(csum))) {
    [cid, sm] = $iter($f9);
    for (const $f10 of $iter($zip($idx(sm, "_mvp_players"), $idx(MVP_W, $idx(sm, "kind"))))) {
      ($t4 = $iter($f10), [p, _] = $iter($t4[0]), wgt = $t4[1]);
      $t5 = $id(p), $setidx(mvp_boost, $t5, $iadd($idx(mvp_boost, $t5), wgt));
    }
  }
  for (const $f11 of $iter($M.items(csum))) {
    [cid, sm] = $iter($f11);
    for (const $f12 of $iter($M.items($idx(sm, "_owner")))) {
      ($t6 = $iter($f12), pid = $t6[0], [p, team] = $iter($t6[1]));
      [g, a_, c_] = $iter($idx($idx(sm, "_stats"), pid));
      if ($M.startswith(cid, "L:")) {
        continue;
      }
      if ($T(($T($t7 = g) ? $t7 : ($T($t8 = a_) ? $t8 : c_)))) {
        if ((!$hasattr(p, "cstats"))) {
          p.cstats = [];
        }
        $M.append(p.cstats, [season, $idx(sm, "name"), team, g, a_, c_]);
      }
    }
  }
  team = new $Dict();
  for (const $f13 of $iter($M.items(w.clubs))) {
    [n, c] = $iter($f13);
    ln = $idx(c, "league");
    size = $len($idx(w.league_clubs, ln));
    f = $idx(finish, n);
    base = ((size > 1) ? $div($sub(size, f), (size - 1)) : 1.0);
    t = $mul((8.0 * $pow(base, 12)), $idx(lf, ln));
    $setidx(team, n, t);
  }
  for (const $f14 of $iter((() => { const $r = []; let cf; for (const $c0 of $iter(w.cups)) { cf = $c0; $r.push([cf, $idx(w.comps, ("C:" + $str(cf)))]); } return $r; })())) {
    [cf, cc] = $iter($f14);
    if ($T(cc.rounds_total)) {
      wgt = $M.get($idx(w.cups, cf), "weight", 1.0);
      for (const $f15 of $iter($M.items(cc.reached))) {
        [n, r] = $iter($f15);
        $setidx(team, n, $iadd($idx(team, n), $mul((10.0 * wgt), $pow($div(r, cc.rounds_total), 2))));
      }
    }
  }
  if ($T(($T($t9 = cwc) ? cwc.rounds_total : $t9))) {
    for (const $f16 of $iter($M.items(cwc.reached))) {
      [n, r] = $iter($f16);
      $setidx(team, n, $iadd($idx(team, n), (8.0 * $pow($div(r, cwc.rounds_total), 2))));
    }
  }
  nat_bonus = new $Dict();
  for (const $f17 of $iter($M.values(w.comps))) {
    c_ = $f17;
    if ($T(($T($t10 = (c_.kind === "ct")) ? c_.winner : $t10))) {
      $setidx(nat_bonus, c_.winner, ($M.get(nat_bonus, c_.winner, 0.0) + 3.5));
      if ($T(c_.runner_up)) {
        $setidx(nat_bonus, c_.runner_up, ($M.get(nat_bonus, c_.runner_up, 0.0) + 2.0));
      }
    }
  }
  if ($T(($T($t11 = wc) ? wc.winner : $t11))) {
    $setidx(nat_bonus, wc.winner, 8.0);
    $setidx(nat_bonus, wc.runner_up, 4.5);
    for (const $f18 of $iter(wc.tlog)) {
      t = $f18;
      if (($idx(t, "left") === 4)) {
        loser = (($eq($idx(t, "winner"), $idx(t, "a"))) ? $idx(t, "b") : $idx(t, "a"));
        $M.setdefault(nat_bonus, loser, 2.5);
      }
    }
  }
  comps_of = function comps_of(p) {
    let a, avg, cs, g, ga, imp, ln, n, st, t;
    st = $M.get(stats, $id(p), [0, 0, 0]);
    [g, a, cs] = $iter(st);
    n = p.club;
    ln = $idx($idx(w.clubs, n), "league");
    if ((p.pos === "GK")) {
      [ga, avg] = $iter($idx(club_ga, n));
      imp = $add((cs * 0.8), ($max(0.0, $sub(avg, ga)) * 0.3));
    } else if ((p.pos === "DEF")) {
      imp = $add($add(($idx(club_cs, n) * 0.6), (g * 1.8)), (a * 1.0));
    } else if ((p.pos === "MID")) {
      imp = $add((g * 1.15), (a * 1.05));
    } else {
      imp = $add((g * 1.0), (a * 0.7));
    }
    t = $add($idx(team, n), $M.get(nat_bonus, p.nat, 0.0));
    return $dict($kw({"q": ((p.ovr - 60) / 5.0), "i": ($mul(imp, $idx(lf, ln)) / 8.0), "t": (t / 4.0), "big": ($idx($idx(w.clubs, n), "stature") / 100.0), "m": $M.get(mvp_boost, $id(p), 0.0)}));
  };
  everyone = (() => { const $r = []; let p, $t1; for (const $c0 of $iter(w.players)) { p = $c0; if (!$T(($T($t1 = p.club) ? ($in($id(p), stats)) : $t1))) continue; $r.push(p); } return $r; })();
  pre = (() => { const $r = new $Dict(); let p; for (const $c0 of $iter(everyone)) { p = $c0; $r.set($id(p), comps_of(p)); } return $r; })();
  pre_score = function pre_score(p) {
    let c;
    c = $idx(pre, $id(p));
    return $add($add($add((0.8 * $idx(c, "q")), (0.9 * $idx(c, "i"))), (0.8 * $idx(c, "t"))), (0.3 * $idx(c, "m")));
  };
  ranked = $sorted(everyone, $kw({"key": ((p) => [(-pre_score(p)), p.name])}));
  cand = $list($slice(ranked, null, 60, null));
  have = (() => { const $r = new $Set(); let p; for (const $c0 of $iter(cand)) { p = $c0; $r.add($id(p)); } return $r; })();
  for (const $f19 of $iter(FORMATION)) {
    [pos, _] = $iter($f19);
    for (const $f20 of $iter($slice((() => { const $r = []; let x; for (const $c0 of $iter(ranked)) { x = $c0; if (!($eq(x.pos, pos))) continue; $r.push(x); } return $r; })(), null, 10, null))) {
      p = $f20;
      if ((!$in($id(p), have))) {
        $M.append(cand, p);
        $M.add(have, $id(p));
      }
    }
  }
  for (const $f21 of $iter($slice((() => { const $r = []; let x; for (const $c0 of $iter(ranked)) { x = $c0; if (!(x.age <= 21)) continue; $r.push(x); } return $r; })(), null, 12, null))) {
    p = $f21;
    if ((!$in($id(p), have))) {
      $M.append(cand, p);
      $M.add(have, $id(p));
    }
  }
  voters = [];
  for (const $f22 of $iter(VOTERS)) {
    [kind, cnt, wq, wi, wt, wb, sd, wm] = $iter($f22);
    for (const $f23 of $iter($range(cnt))) {
      _ = $f23;
      jitter = ((x) => $mul(x, rng.uniform(0.8, 1.2)));
      $M.append(voters, [kind, jitter(wq), jitter(wi), jitter(wt), wb, sd, jitter(wm)]);
    }
  }
  score_sum = defaultdict($float);
  [ballot_pts, first_votes] = $iter([defaultdict($int), defaultdict($int)]);
  by_kind = defaultdict((() => defaultdict($int)));
  for (const $f24 of $iter(voters)) {
    [kind, wq, wi, wt, wb, sd, wm] = $iter($f24);
    sc = [];
    for (const $f25 of $iter(cand)) {
      p = $f25;
      c = $idx(pre, $id(p));
      s = $add($add($add($add($add($mul(wq, $idx(c, "q")), $mul(wi, $idx(c, "i"))), $mul(wt, $idx(c, "t"))), $mul(wb, $idx(c, "big"))), $mul(wm, $idx(c, "m"))), rng.gauss(0, sd));
      $M.append(sc, [s, p]);
      $t12 = $id(p), $setidx(score_sum, $t12, $iadd($idx(score_sum, $t12), s));
    }
    $M.sort(sc, $kw({"key": ((x) => (-$idx(x, 0)))}));
    for (const $f26 of $iter($enumerate($slice(sc, null, $len(BALLOT), null)))) {
      ($t13 = $iter($f26), k = $t13[0], [s, p] = $iter($t13[1]));
      $t14 = $id(p), $setidx(ballot_pts, $t14, $iadd($idx(ballot_pts, $t14), $idx(BALLOT, k)));
      $t15 = $idx(by_kind, kind), $t16 = $id(p), $setidx($t15, $t16, $iadd($idx($t15, $t16), $idx(BALLOT, k)));
      if ((k === 0)) {
        $t17 = $id(p), $setidx(first_votes, $t17, $idx(first_votes, $t17) + 1);
      }
    }
  }
  nvot = $len(voters);
  line = function line(p, pts = null) {
    let d, st, t;
    st = $M.get(stats, $id(p), [0, 0, 0]);
    t = $add($idx(team, p.club), $M.get(nat_bonus, p.nat, 0.0));
    d = $dict($kw({"uid": p.uid, "name": p.name, "club": p.club, "league": $idx($idx(w.clubs, p.club), "league"), "nat": p.nat, "pos": p.pos, "age": p.age, "ovr": p.ovr, "goals": $idx(st, 0), "assists": $idx(st, 1), "cs": $idx(st, 2), "finish": $idx(finish, p.club), "team": $round(t, 1)}));
    if ((pts != null)) {
      $setidx(d, "pts", pts);
      $setidx(d, "first", $M.get(first_votes, $id(p), 0));
    }
    return d;
  };
  order = $sorted(cand, $kw({"key": ((p) => [(-$idx(ballot_pts, $id(p))), (-$idx(score_sum, $id(p))), p.name])}));
  ballon = (() => { const $r = []; let p; for (const $c0 of $iter($slice(order, null, 10, null))) { p = $c0; $r.push(line(p, $idx(ballot_pts, $id(p)))); } return $r; })();
  top = $idx(order, 0);
  for (const $f27 of $iter(ballon)) {
    d = $f27;
    $setidx(d, "share", $round($div($mul(100, $idx(d, "pts")), $mul($idx(BALLOT, 0), nvot)), 1));
  }
  voter_split = (() => { const $r = new $Dict(); let k, m; for (const $c0 of $iter($M.items(by_kind))) { [k, m] = $iter($c0); $r.set(k, (() => { const $r = []; let pid, v; for (const $c0 of $iter($slice($sorted($M.items(m), $kw({"key": ((kv) => (-$idx(kv, 1)))})), null, 3, null))) { [pid, v] = $iter($c0); $r.push($dict($kw({"name": $next((() => { const $r = []; let p; for (const $c0 of $iter(cand)) { p = $c0; if (!($eq($id(p), pid))) continue; $r.push(p.name); } return $r; })()), "pts": v}))); } return $r; })()); } return $r; })();
  mean = (() => { const $r = new $Dict(); let p; for (const $c0 of $iter(cand)) { p = $c0; $r.set($id(p), $div($idx(score_sum, $id(p)), nvot)); } return $r; })();
  xi = [];
  for (const $f28 of $iter(FORMATION)) {
    [pos, n] = $iter($f28);
    pick = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(cand)) { p = $c0; if (!($eq(p.pos, pos))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-$idx(mean, $id(p))))})), null, n, null);
    xi = $iadd(xi, pick);
  }
  team_xi = (() => { const $r = []; let p; for (const $c0 of $iter(xi)) { p = $c0; $r.push($dict(line(p), $kw({"score": $round($idx(mean, $id(p)), 2)}))); } return $r; })();
  young_pool = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(cand)) { p = $c0; if (!((p.age <= 21) && ($idx($idx(pre, $id(p)), "i") >= 0.3))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-$idx(mean, $id(p))))})), null, 3, null);
  young = (() => { const $r = []; let p; for (const $c0 of $iter(young_pool)) { p = $c0; $r.push($dict(line(p), $kw({"score": $round($idx(mean, $id(p)), 2)}))); } return $r; })();
  scorers = $sorted(everyone, $kw({"key": ((p) => [(-$idx($idx(stats, $id(p)), 0)), (-$idx($idx(stats, $id(p)), 1)), p.name])}));
  boot = (() => { const $r = []; let p; for (const $c0 of $iter($slice(scorers, null, 5, null))) { p = $c0; $r.push(line(p)); } return $r; })();
  league_scorers = new $Dict();
  for (const $f29 of $iter(w.leagues)) {
    ln = $f29;
    ps = (() => { const $r = []; let p; for (const $c0 of $iter(everyone)) { p = $c0; if (!($eq($idx($idx(w.clubs, p.club), "league"), ln))) continue; $r.push(p); } return $r; })();
    $M.sort(ps, $kw({"key": ((p) => [(-$idx($idx(stats, $id(p)), 0)), (-$idx($idx(stats, $id(p)), 1)), p.name])}));
    $setidx(league_scorers, ln, (() => { const $r = []; let p; for (const $c0 of $iter($slice(ps, null, 3, null))) { p = $c0; $r.push($dict($kw({"name": p.name, "club": p.club, "goals": $idx($idx(stats, $id(p)), 0), "assists": $idx($idx(stats, $id(p)), 1)}))); } return $r; })());
  }
  coach_c = [];
  for (const $f30 of $iter($M.items(w.clubs))) {
    [n, c] = $iter($f30);
    co = $idx(c, "coach");
    if ((co == null)) {
      continue;
    }
    ln = $idx(c, "league");
    size = $len($idx(w.league_clubs, ln));
    over = ($div($sub($idx(expected, n), $idx(finish, n)), $max(1, (size - 1))) * 10.0);
    t = $mul($div($idx(team, n), $max(0.7, $idx(lf, ln))), (0.5 + (0.5 * $idx(lf, ln))));
    $M.append(coach_c, $dict($kw({"co": co, "club": n, "nation": null, "over": over, "t": t, "finish": $idx(finish, n), "expected": $idx(expected, n), "league": ln})));
  }
  if ($T(($T($t18 = wc) ? wc.winner : $t18))) {
    for (const $f31 of $iter([[wc.winner, 12.0], [wc.runner_up, 7.0]])) {
      [nat, tval] = $iter($f31);
      co = $M.get($idx(w.nations, nat), "coach");
      if ((co != null)) {
        $M.append(coach_c, $dict($kw({"co": co, "club": null, "nation": nat, "over": 2.0, "t": tval, "finish": null, "expected": null, "league": null})));
      }
    }
  }
  $M.sort(coach_c, $kw({"key": ((d) => (-$add(($idx(d, "over") * 0.5), $idx(d, "t"))))}));
  coach_c = $slice(coach_c, null, 40, null);
  cvotes = Counter();
  cfirst = Counter();
  for (const $f32 of $iter($range(60))) {
    _ = $f32;
    [wo, wt, sd] = $iter(rng.choice([[1.0, 0.8, 0.8], [0.6, 1.0, 0.7], [0.3, 1.2, 0.9]]));
    sc = $sorted((() => { const $r = []; let d, i; for (const $c0 of $iter($enumerate(coach_c))) { [i, d] = $iter($c0); $r.push([$add($add(($mul(wo, $idx(d, "over")) / 2.5), ($mul(wt, $idx(d, "t")) / 3.0)), rng.gauss(0, sd)), i]); } return $r; })(), $kw({"reverse": true}));
    for (const $f33 of $iter($enumerate($slice(sc, null, $len(COACH_BALLOT), null)))) {
      ($t19 = $iter($f33), k = $t19[0], [_, i] = $iter($t19[1]));
      $setidx(cvotes, i, $iadd($idx(cvotes, i), $idx(COACH_BALLOT, k)));
      if ((k === 0)) {
        $setidx(cfirst, i, $idx(cfirst, i) + 1);
      }
    }
  }
  corder = $sorted($range($len(coach_c)), $kw({"key": ((i) => [(-$idx(cvotes, i)), (-$add($idx($idx(coach_c, i), "over"), $idx($idx(coach_c, i), "t")))])}));
  coach_rank = [];
  for (const $f34 of $iter($slice(corder, null, 5, null))) {
    i = $f34;
    d = $idx(coach_c, i);
    co = $idx(d, "co");
    $M.append(coach_rank, $dict($kw({"name": co.name, "nat": co.nat, "prestige": $round(co.prestige, 1), "pts": $idx(cvotes, i), "first": $idx(cfirst, i), "club": $idx(d, "club"), "nation": $idx(d, "nation"), "league": $idx(d, "league"), "finish": $idx(d, "finish"), "expected": $idx(d, "expected"), "team": $round($idx(d, "t"), 1)})));
  }
  coach_winner = $idx($idx(coach_c, $idx(corder, 0)), "co");
  date = $add(cal.date_for(w.cfg.start_year, season, 52, "league"), cal.dt.timedelta($kw({"days": 1})));
  aw = $dict($kw({"season": season, "date": cal.pack(date), "voters": nvot, "ballon": ballon, "voter_split": voter_split, "coach": coach_rank, "team": team_xi, "young": young, "boot": boot, "league_scorers": league_scorers}));
  $setidx(aw, "comps", (() => { const $r = new $Dict(); let cid, sm; for (const $c0 of $iter($M.items(csum))) { [cid, sm] = $iter($c0); $r.set(cid, compstats.public(sm)); } return $r; })());
  for (const $f35 of $iter($M.items(csum))) {
    [cid, sm] = $iter($f35);
    for (const $f36 of $iter($zip($slice($idx(sm, "_mvp_players"), null, 1, null), [1]))) {
      ($t20 = $iter($f36), [p, _] = $iter($t20[0]), rank = $t20[1]);
      $M.append(p.honours, [season, "compaward", ($str($idx(sm, "name")) + " MVP")]);
    }
    co = $M.get(sm, "_coach");
    if ((co != null)) {
      if ((!$hasattr(co, "honours"))) {
        co.honours = [];
      }
      $M.append(co.honours, [season, "compaward", ($str($idx(sm, "name")) + " Coach of the Year")]);
    }
  }
  $setidx(rec, "awards", aw);
  $M.append(top.honours, [season, "award", "Ballon d'Or"]);
  for (const $f37 of $iter(xi)) {
    p = $f37;
    $M.append(p.honours, [season, "award", "Team of the Year"]);
  }
  if ($T(young_pool)) {
    $M.append($idx(young_pool, 0).honours, [season, "award", "Young Player of the Year"]);
  }
  if ($T(scorers)) {
    $M.append($idx(scorers, 0).honours, [season, "award", "Golden Boot"]);
  }
  if ((!$hasattr(coach_winner, "honours"))) {
    coach_winner.honours = [];
  }
  $M.append(coach_winner.honours, [season, "award", "Coach of the Year"]);
  w.news("award", ("Ballon d'Or: " + $str(top.name) + " (" + $str(top.nat) + ", " + $str(top.club) + ", OVR " + $str(top.ovr) + ") wins with " + $str($idx($idx(ballon, 0), "pts")) + " points; " + $str($idx($idx(ballon, 1), "name")) + " second with " + $str($idx($idx(ballon, 1), "pts"))));
  w.news("award", (("Coach of the year: " + $str(coach_winner.name)) + ($T($idx($idx(coach_rank, 0), "club")) ? (" (" + $str($idx($idx(coach_rank, 0), "club")) + ")") : (" (" + $str($idx($idx(coach_rank, 0), "nation")) + ")"))));
  return aw;
}
return {ASSIST_W: ASSIST_W, BALLOT: BALLOT, COACH_BALLOT: COACH_BALLOT, Counter: Counter, FORMATION: FORMATION, GOAL_W: GOAL_W, VOTERS: VOTERS, _draw: _draw, _round_name_rank: _round_name_rank, _xi: _xi, cal: cal, compstats: compstats, defaultdict: defaultdict, random: random, run: run};
})();
