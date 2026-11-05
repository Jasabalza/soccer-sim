$mods["compstats"] = (function() {
const random = $py.random;
const {Counter, defaultdict} = $py.collections || {};
let ASSIST_W, FORMATION, GOAL_W, KIND_NAME, MVP_BALLOT, NATION_KINDS;
GOAL_W = $lit_dict([["FWD", 1.0], ["MID", 0.42], ["DEF", 0.1], ["GK", 0.0]]);
ASSIST_W = $lit_dict([["FWD", 0.55], ["MID", 0.9], ["DEF", 0.22], ["GK", 0.0]]);
FORMATION = [["GK", 1], ["DEF", 4], ["MID", 3], ["FWD", 3]];
MVP_BALLOT = [3, 2, 1];
KIND_NAME = $lit_dict([["L", "league"], ["C", "cup"], ["CWC", "cwc"], ["WC", "wc"], ["CT", "ct"], ["NL", "nl"]]);
NATION_KINDS = ["wc", "ct", "nl"];
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
function comp_kind(cid) {
  return $M.get(KIND_NAME, $idx($M.split(cid, ":"), 0));
}
function team_data(w, comp) {
  let MATCHES, _, a, a_, ag, b, c_, cs, g, ga, gf, gi, h, hg, i, k, li, loser, md, mi, n, names, nation, order, out, r, rank, reached, ru, sa, sb, size, succ, t, ti, total, win, x, y, $t1, $t2;
  MATCHES = [];
  out = new $Dict();
  k = comp_kind(comp.id);
  if ((k === "league")) {
    [gf, ga, cs] = $iter([defaultdict($int), defaultdict($int), defaultdict($int)]);
    for (const $f2 of $iter($enumerate(comp.all_results()))) {
      [mi, md] = $iter($f2);
      for (const $f3 of $iter(md)) {
        [h, a, hg, ag] = $iter($f3);
        $M.append(MATCHES, [h, hg, ag, ("m" + $str(mi))]);
        $M.append(MATCHES, [a, ag, hg, ("m" + $str(mi))]);
        $setidx(gf, h, $iadd($idx(gf, h), hg));
        $setidx(ga, h, $iadd($idx(ga, h), ag));
        $setidx(gf, a, $iadd($idx(gf, a), ag));
        $setidx(ga, a, $iadd($idx(ga, a), hg));
        if ((ag === 0)) {
          $setidx(cs, h, $idx(cs, h) + 1);
        }
        if ((hg === 0)) {
          $setidx(cs, a, $idx(cs, a) + 1);
        }
      }
    }
    size = $len(comp.clubs);
    order = comp.standings();
    for (const $f4 of $iter($enumerate(order))) {
      [i, n] = $iter($f4);
      succ = ((size > 1) ? $div($sub((size - 1), i), (size - 1)) : 1.0);
      $setidx(out, n, [$idx(gf, n), $idx(ga, n), $idx(cs, n), $pow(succ, 12)]);
    }
    return [out, false, MATCHES];
  }
  [gf, ga, cs] = $iter([defaultdict($int), defaultdict($int), defaultdict($int)]);
  reached = new $Dict();
  nation = ($in(k, NATION_KINDS));
  for (const $f5 of $iter($enumerate(comp.tlog))) {
    [ti, t] = $iter($f5);
    [a, b] = $iter([$idx(t, "a"), $idx(t, "b")]);
    for (const $f6 of $iter($enumerate($idx(t, "legs")))) {
      ($t1 = $iter($f6), li = $t1[0], [x, y] = $iter($t1[1]));
      $M.append(MATCHES, [a, x, y, ("t" + $str(ti) + "." + $str(li))]);
      $M.append(MATCHES, [b, y, x, ("t" + $str(ti) + "." + $str(li))]);
      $setidx(gf, a, $iadd($idx(gf, a), x));
      $setidx(ga, a, $iadd($idx(ga, a), y));
      $setidx(gf, b, $iadd($idx(gf, b), y));
      $setidx(ga, b, $iadd($idx(ga, b), x));
      if ((y === 0)) {
        $setidx(cs, a, $idx(cs, a) + 1);
      }
      if ((x === 0)) {
        $setidx(cs, b, $idx(cs, b) + 1);
      }
    }
  }
  if ($T(nation)) {
    for (const $f7 of $iter($enumerate(comp.glog))) {
      ($t2 = $iter($f7), gi = $t2[0], [md, a, b, sa, sb] = $iter($t2[1]));
      $M.append(MATCHES, [a, sa, sb, ("g" + $str(gi))]);
      $M.append(MATCHES, [b, sb, sa, ("g" + $str(gi))]);
      $setidx(gf, a, $iadd($idx(gf, a), sa));
      $setidx(ga, a, $iadd($idx(ga, a), sb));
      $setidx(gf, b, $iadd($idx(gf, b), sb));
      $setidx(ga, b, $iadd($idx(ga, b), sa));
      if ((sb === 0)) {
        $setidx(cs, a, $idx(cs, a) + 1);
      }
      if ((sa === 0)) {
        $setidx(cs, b, $idx(cs, b) + 1);
      }
    }
    reached = ($hasattr(comp, "perf") ? $dict(comp.perf) : new $Dict());
    total = 6.0;
    names = $bor($set(gf), $set(ga));
    for (const $f8 of $iter(names)) {
      n = $f8;
      r = $M.get(reached, n, 0);
      r = ($isinstance(r, [$int, $float]) ? r : 0);
      $setidx(out, n, [$idx(gf, n), $idx(ga, n), $idx(cs, n), 0.0]);
    }
    win = $getattr(comp, "winner", null);
    ru = $getattr(comp, "runner_up", null);
    rank = $lit_dict([[win, 1.0], [ru, 0.7]]);
    for (const $f9 of $iter(comp.tlog)) {
      t = $f9;
      if (($idx(t, "left") === 4)) {
        loser = (($eq($idx(t, "winner"), $idx(t, "a"))) ? $idx(t, "b") : $idx(t, "a"));
        $M.setdefault(rank, loser, 0.45);
      } else if (($idx(t, "left") === 8)) {
        loser = (($eq($idx(t, "winner"), $idx(t, "a"))) ? $idx(t, "b") : $idx(t, "a"));
        $M.setdefault(rank, loser, 0.25);
      }
    }
    for (const $f10 of $iter(names)) {
      n = $f10;
      [g, a_, c_, _] = $iter($idx(out, n));
      $setidx(out, n, [g, a_, c_, $M.get(rank, n, 0.08)]);
    }
    return [out, true, MATCHES];
  }
  total = $max(1, $getattr(comp, "rounds_total", 1));
  reached = $getattr(comp, "reached", new $Dict());
  for (const $f11 of $iter($bor($bor($set(gf), $set(ga)), $set(reached)))) {
    n = $f11;
    $setidx(out, n, [$idx(gf, n), $idx(ga, n), $idx(cs, n), $pow($div($M.get(reached, n, 0), total), 2)]);
  }
  return [out, false, MATCHES];
}
function comp_stats(w, cid, squads = null) {
  let _, a, allp, ass, assists, aw, bench, by_nat, c, cand, cc, co, coach, coach_obj, comp, cs, exp, fin, g, ga, ga_, gf, gf_, gk, gks, gw, hi, i, imp, k, keepers, key, kind, lavg, lf, line, ln, lo, matches, mvp, n, na, nation, order, order_t, over, owner, p, pid, pool, pools, prep, pts, q, r, ranked, rng, runner, sc, scale, scorers, sd, size, stats, succ, t, tcs, teams, top, ts, val, wi, winner, wq, wt, xi, $t1, $t2, $t3, $t4, $t5, $t6, $t7;
  w.ensure_uids();
  comp = $idx(w.comps, cid);
  kind = comp_kind(cid);
  rng = random.Random(($str(w.seed) + "|" + $str(w.season) + "|cstats|" + $str(cid)));
  [teams, nation, matches] = $iter(team_data(w, comp));
  if ((squads == null)) {
    squads = w.squads();
  }
  if ($T(nation)) {
    by_nat = defaultdict($list);
    for (const $f12 of $iter(w.players)) {
      p = $f12;
      if ($T(p.club)) {
        $M.append($idx(by_nat, p.nat), p);
      }
    }
    pools = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(teams)) { n = $c0; $r.set(n, $slice($sorted($M.get(by_nat, n, []), $kw({"key": ((p) => [(-p.ovr), p.name])})), null, 23, null)); } return $r; })();
  } else {
    pools = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(teams)) { n = $c0; $r.set(n, $sorted($M.get(squads, n, []), $kw({"key": ((p) => [(-p.ovr), p.name])}))); } return $r; })();
  }
  stats = new $Dict();
  owner = new $Dict();
  prep = new $Dict();
  for (const $f13 of $iter($sorted(teams))) {
    n = $f13;
    [xi, bench] = $iter(_xi($idx(pools, n)));
    pool = $add((() => { const $r = []; let p; for (const $c0 of $iter(xi)) { p = $c0; $r.push([p, 1.0]); } return $r; })(), (() => { const $r = []; let p; for (const $c0 of $iter(bench)) { p = $c0; $r.push([p, 0.2]); } return $r; })());
    $setidx(prep, n, [pool, (() => { const $r = []; let m, p; for (const $c0 of $iter(pool)) { [p, m] = $iter($c0); $r.push($mul($mul($idx(GOAL_W, p.pos), m), $pow((p.ovr / 70), 6))); } return $r; })(), (() => { const $r = []; let m, p; for (const $c0 of $iter(pool)) { [p, m] = $iter($c0); $r.push($mul($mul($idx(ASSIST_W, p.pos), m), $pow((p.ovr / 70), 4))); } return $r; })(), $next((() => { const $r = []; let p; for (const $c0 of $iter(xi)) { p = $c0; if (!(p.pos === "GK")) continue; $r.push(p); } return $r; })(), null)]);
    for (const $f14 of $iter(pool)) {
      [p, _] = $iter($f14);
      $setidx(stats, $id(p), [0, 0, 0]);
      $setidx(owner, $id(p), [p, n]);
    }
  }
  for (const $f15 of $iter(matches)) {
    [n, gf_, ga_, key] = $iter($f15);
    [pool, gw, aw, gk] = $iter($idx(prep, n));
    if (((gk != null) && (ga_ === 0))) {
      $t1 = $idx(stats, $id(gk)), $setidx($t1, 2, $idx($t1, 2) + 1);
    }
    if ((gf_ <= 0)) {
      continue;
    }
    r = random.Random(($str(w.seed) + "|" + $str(w.season) + "|cs|" + $str(cid) + "|" + $str(key) + "|" + $str(n)));
    for (const $f16 of $iter($M.items(_draw(r, gf_, gw)))) {
      [i, c] = $iter($f16);
      $t2 = $idx(stats, $id($idx($idx(pool, i), 0))), $setidx($t2, 0, $iadd($idx($t2, 0), c));
    }
    na = $sum((() => { const $r = []; let _; for (const $c0 of $iter($range(gf_))) { _ = $c0; if (!(r.random() < 0.78)) continue; $r.push(1); } return $r; })());
    for (const $f17 of $iter($M.items(_draw(r, na, aw)))) {
      [i, c] = $iter($f17);
      $t3 = $idx(stats, $id($idx($idx(pool, i), 0))), $setidx($t3, 1, $iadd($idx($t3, 1), c));
    }
  }
  lf = 1.0;
  if ((kind === "league")) {
    ln = $slice(comp.id, 2, null, null);
    lavg = w.league_avgs();
    [lo, hi] = $iter([$min($M.values(lavg)), $max($M.values(lavg))]);
    lf = (0.7 + (0.3 * ($gt(hi, lo) ? $div($sub($idx(lavg, ln), lo), $sub(hi, lo)) : 1.0)));
  }
  scale = $idx($lit_dict([["league", 1.0], ["cup", 3.0], ["cwc", 3.2], ["wc", 3.5], ["ct", 3.4], ["nl", 3.0]]), kind);
  ts = $idx($lit_dict([["league", 8.0], ["cup", 10.0], ["cwc", 8.0], ["wc", 9.0], ["ct", 9.0], ["nl", 6.0]]), kind);
  cand = [];
  for (const $f18 of $iter($M.items(owner))) {
    ($t4 = $iter($f18), pid = $t4[0], [p, n] = $iter($t4[1]));
    [g, a, cs] = $iter($idx(stats, pid));
    [gf, ga, tcs, succ] = $iter($idx(teams, n));
    if ((p.pos === "GK")) {
      imp = $mul((cs * 0.8), ((kind === "league") ? 1 : 2.2));
    } else if ((p.pos === "DEF")) {
      imp = $add($add($mul((tcs * 0.6), ((kind === "league") ? 1 : 1.6)), (g * 1.8)), (a * 1.0));
    } else if ((p.pos === "MID")) {
      imp = $add((g * 1.15), (a * 1.05));
    } else {
      imp = $add(g, (a * 0.7));
    }
    q = ((p.ovr - 60) / 5.0);
    i = ($mul($mul(imp, scale), lf) / 8.0);
    t = ($mul($mul(ts, succ), lf) / 4.0);
    $M.append(cand, [$add($add((0.8 * q), (0.9 * i)), (0.8 * t)), p, n, g, a, cs, q, i, t]);
  }
  $M.sort(cand, $kw({"key": ((x) => [(-$idx(x, 0)), $idx(x, 1).name])}));
  cand = $slice(cand, null, 30, null);
  pts = Counter();
  for (const $f19 of $iter($range(20))) {
    _ = $f19;
    [wq, wi, wt, sd] = $iter([rng.uniform(0.6, 1.2), rng.uniform(0.8, 1.3), rng.uniform(0.6, 1.2), 0.45]);
    sc = $sorted((() => { const $r = []; let c, k; for (const $c0 of $iter($enumerate(cand))) { [k, c] = $iter($c0); $r.push([$add($add($add($mul(wq, $idx(c, 6)), $mul(wi, $idx(c, 7))), $mul(wt, $idx(c, 8))), rng.gauss(0, sd)), k]); } return $r; })(), $kw({"reverse": true}));
    for (const $f20 of $iter($enumerate($slice(sc, null, $len(MVP_BALLOT), null)))) {
      ($t5 = $iter($f20), r = $t5[0], [_, k] = $iter($t5[1]));
      $setidx(pts, k, $iadd($idx(pts, k), $idx(MVP_BALLOT, r)));
    }
  }
  order = $sorted($range($len(cand)), $kw({"key": ((k) => [(-$idx(pts, k)), (-$idx($idx(cand, k), 0)), $idx($idx(cand, k), 1).name])}));
  line = function line(p, n, st, extra = null) {
    let d;
    d = $dict($kw({"uid": p.uid, "name": p.name, "team": n, "nat": p.nat, "pos": p.pos, "ovr": p.ovr, "age": p.age, "goals": $idx(st, 0), "assists": $idx(st, 1), "cs": $idx(st, 2)}));
    if ($T(extra)) {
      $M.update(d, extra);
    }
    return d;
  };
  mvp = [];
  for (const $f21 of $iter($slice(order, null, 3, null))) {
    k = $f21;
    c = $idx(cand, k);
    $M.append(mvp, line($idx(c, 1), $idx(c, 2), [$idx(c, 3), $idx(c, 4), $idx(c, 5)], $dict($kw({"pts": $idx(pts, k)}))));
  }
  allp = $sorted($M.values(owner), $kw({"key": ((x) => [(-$idx($idx(stats, $id($idx(x, 0))), 0)), (-$idx($idx(stats, $id($idx(x, 0))), 1)), $idx(x, 0).name])}));
  top = ((kind === "league") ? 20 : 10);
  scorers = (() => { const $r = []; let n, p; for (const $c0 of $iter($slice(allp, null, top, null))) { [p, n] = $iter($c0); if (!($idx($idx(stats, $id(p)), 0) > 0)) continue; $r.push(line(p, n, $idx(stats, $id(p)))); } return $r; })();
  ass = $sorted($M.values(owner), $kw({"key": ((x) => [(-$idx($idx(stats, $id($idx(x, 0))), 1)), (-$idx($idx(stats, $id($idx(x, 0))), 0)), $idx(x, 0).name])}));
  assists = (() => { const $r = []; let n, p; for (const $c0 of $iter($slice(ass, null, top, null))) { [p, n] = $iter($c0); if (!($idx($idx(stats, $id(p)), 1) > 0)) continue; $r.push(line(p, n, $idx(stats, $id(p)))); } return $r; })();
  gks = $sorted((() => { const $r = []; let x; for (const $c0 of $iter($M.values(owner))) { x = $c0; if (!(($idx(x, 0).pos === "GK") && ($idx($idx(stats, $id($idx(x, 0))), 2) > 0))) continue; $r.push(x); } return $r; })(), $kw({"key": ((x) => [(-$idx($idx(stats, $id($idx(x, 0))), 2)), $idx(x, 0).name])}));
  keepers = (() => { const $r = []; let n, p; for (const $c0 of $iter($slice(gks, null, 5, null))) { [p, n] = $iter($c0); $r.push(line(p, n, $idx(stats, $id(p)))); } return $r; })();
  cc = [];
  for (const $f22 of $iter($M.items(teams))) {
    ($t6 = $iter($f22), n = $t6[0], [gf, ga, cs, succ] = $iter($t6[1]));
    co = ($T(nation) ? $M.get($idx(w.nations, n), "coach") : $idx($idx(w.clubs, n), "coach"));
    if ((co == null)) {
      continue;
    }
    if ((kind === "league")) {
      size = $len(comp.clubs);
      fin = ($M.index(comp.standings(), n) + 1);
      ranked = $sorted(comp.clubs, $kw({"key": ((x) => [(-$idx(comp.eff, x)), x])}));
      exp = ($M.index(ranked, n) + 1);
      over = ($div($sub(exp, fin), $max(1, (size - 1))) * 5.0);
      val = $add(over, (8.0 * succ));
    } else {
      val = $add((10.0 * succ), ((kind !== "league") ? 0.6 : 0));
    }
    $M.append(cc, [$add(val, rng.gauss(0, 0.25)), co, n, succ]);
  }
  $M.sort(cc, $kw({"key": ((x) => (-$idx(x, 0)))}));
  coach = (() => { const $r = []; let c; for (const $c0 of $iter($slice(cc, null, 3, null))) { c = $c0; $r.push($dict($kw({"name": $idx(c, 1).name, "nat": $idx(c, 1).nat, "team": $idx(c, 2)}))); } return $r; })();
  coach_obj = ($T(cc) ? $idx($idx(cc, 0), 1) : null);
  $t7 = null;
  winner = $t7;
  runner = $t7;
  if ((kind === "league")) {
    order_t = comp.standings();
    winner = $idx(order_t, 0);
    runner = (($len(order_t) > 1) ? $idx(order_t, 1) : null);
  } else {
    [winner, runner] = $iter([$getattr(comp, "winner", null), $getattr(comp, "runner_up", null)]);
  }
  return $dict($kw({"cid": cid, "name": comp.title, "kind": kind, "nation": nation, "done": comp.done, "winner": winner, "runner_up": runner, "mvp": mvp, "scorers": scorers, "assists": assists, "keepers": keepers, "coach": coach, "_stats": stats, "_owner": owner, "_mvp_players": (() => { const $r = []; let k; for (const $c0 of $iter($slice(order, null, 3, null))) { k = $c0; $r.push([$idx($idx(cand, k), 1), $idx(pts, k)]); } return $r; })(), "_coach": coach_obj}));
}
function public_(s) {
  return (() => { const $r = new $Dict(); let k, v; for (const $c0 of $iter($M.items(s))) { [k, v] = $iter($c0); if (!(!$M.startswith(k, "_"))) continue; $r.set(k, v); } return $r; })();
}
return {ASSIST_W: ASSIST_W, Counter: Counter, FORMATION: FORMATION, GOAL_W: GOAL_W, KIND_NAME: KIND_NAME, MVP_BALLOT: MVP_BALLOT, NATION_KINDS: NATION_KINDS, _draw: _draw, _xi: _xi, comp_kind: comp_kind, comp_stats: comp_stats, defaultdict: defaultdict, public: public_, random: random, team_data: team_data};
})();
