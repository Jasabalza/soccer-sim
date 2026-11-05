$mods["natcomps"] = (function() {
const math = $py.math;
const {Comp, WorldCup, SUMMER_START, WINDOW_WEEKS, circle_rounds, double_rounds, pair_score, score, settle, round_name} = $mods.comps || {};
let CT_SIZE, CT_TITLES, MIN_FIELD, NL_TITLES;
CT_TITLES = $lit_dict([["UEFA", "European Championship"], ["CONMEBOL", "Copa America"], ["CONCACAF", "Gold Cup"], ["CAF", "Africa Cup of Nations"], ["AFC", "Asian Cup"], ["OFC", "OFC Nations Cup"]]);
CT_SIZE = $lit_dict([["UEFA", 24], ["CAF", 16], ["AFC", 16], ["CONMEBOL", 10], ["CONCACAF", 12], ["OFC", 8]]);
NL_TITLES = $lit_dict([["UEFA", "UEFA Nations League"], ["CONMEBOL", "CONMEBOL Nations League"], ["CONCACAF", "CONCACAF Nations League"], ["CAF", "CAF Nations League"], ["AFC", "AFC Nations League"], ["OFC", "OFC Nations League"]]);
MIN_FIELD = 4;
function rank_of(world, n) {
  return $add($mul(3, $idx(world.nat_eff, n)), $M.get($getattr(world, "nat_hist", new $Dict()), n, 0.0));
}
function _pool(world, confed) {
  return (() => { const $r = []; let n; for (const $c0 of $iter(world.nations)) { n = $c0; if (!($eq($idx($idx(world.nations, n), "confed"), confed))) continue; $r.push(n); } return $r; })();
}
class ContinentalChampionship extends WorldCup {
  __init__(world, confed) {
    const self = this;
    let field, i, ng, pool, r, $t1;
    Comp.prototype.__init__.call(self, world, ("CT:" + $str(world.season) + ":" + $str(confed)), $idx(CT_TITLES, confed), confed);
    self.confed = confed;
    pool = _pool(world, confed);
    self.rank = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(pool)) { n = $c0; $r.set(n, rank_of(world, n)); } return $r; })();
    self.snap = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(pool)) { n = $c0; $r.set(n, $idx(world.nat_eff, n)); } return $r; })();
    field = $slice($sorted(pool, $kw({"key": ((n) => [(-$idx(self.rank, n)), n])})), null, $M.get(CT_SIZE, confed, 16), null);
    self.requires = [];
    self.host = self.rng.choice($sorted(field));
    $t1 = null;
    self.winner = $t1;
    self.runner_up = $t1;
    self.ko_current = [];
    self.glog = [];
    self.ties = [];
    self.field = [];
    self.groups = [];
    self.gtab = new $Dict();
    self.perf = new $Dict();
    self.ko_rounds = 5;
    self.ko_size = 0;
    self.eff = new $Dict();
    for (const $f1 of $iter($range(3))) {
      i = $f1;
      self.ev($add(SUMMER_START, i), ("Group matchday " + $str((i + 1))), $kw({"phase": "grp", "md": i}));
    }
    for (const $f2 of $iter($range(5))) {
      r = $f2;
      self.ev($add((SUMMER_START + 3), r), "KO", $kw({"phase": "ko", "rnd": r}));
    }
    self.ko_weeks = (() => { const $r = []; let r; for (const $c0 of $iter($range(5))) { r = $c0; $r.push($add((SUMMER_START + 3), r)); } return $r; })();
    ng = $max(1, math.ceil(($len(field) / 4)));
    self._setup($list(field), ng, (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(field)) { n = $c0; $r.set(n, $idx(self.snap, n)); } return $r; })());
    self.prepared = true;
  }
  prepare() {
    const self = this;
  }
  seed_key(n) {
    const self = this;
    return (-$idx(self.eff, n));
  }
}
ContinentalChampionship.prototype.kind = "ct";
ContinentalChampionship.prototype.RANK_K = 55.0;
$CLS['ContinentalChampionship'] = ContinentalChampionship;
class NationsLeague extends Comp {
  __init__(world, confed) {
    const self = this;
    let M, g, gi, gs, j, last, n, ng, order, pool, pot, pots, r, t, ti, tiers, wins, $t1, $t2;
    super.__init__(world, ("NL:" + $str(world.season) + ":" + $str(confed)), $idx(NL_TITLES, confed), confed);
    self.confed = confed;
    pool = _pool(world, confed);
    self.rank = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(pool)) { n = $c0; $r.set(n, rank_of(world, n)); } return $r; })();
    self.eff = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(pool)) { n = $c0; $r.set(n, $idx(world.nat_eff, n)); } return $r; })();
    order = $sorted(pool, $kw({"key": ((n) => [(-$idx(self.rank, n)), n])}));
    tiers = (() => { const $r = []; let i; for (const $c0 of $iter($range(0, $len(order), 16))) { i = $c0; $r.push($slice(order, i, (i + 16), null)); } return $r; })();
    if ((($len(tiers) > 1) && $lt($len($idx(tiers, (-1))), MIN_FIELD))) {
      last = $M.pop(tiers);
      $t1 = (-1), $setidx(tiers, $t1, $iadd($idx(tiers, $t1), last));
    }
    self.tiers = tiers;
    [self.groups, self.labels, self.tier_of] = $iter([[], [], []]);
    for (const $f3 of $iter($enumerate(tiers))) {
      [ti, t] = $iter($f3);
      ng = $max(1, math.ceil(($len(t) / 4)));
      pots = (() => { const $r = []; let i; for (const $c0 of $iter($range(0, $len(t), ng))) { i = $c0; $r.push($slice(t, i, $add(i, ng), null)); } return $r; })();
      gs = (() => { const $r = []; let _; for (const $c0 of $iter($range(ng))) { _ = $c0; $r.push([]); } return $r; })();
      for (const $f4 of $iter(pots)) {
        pot = $f4;
        self.rng.shuffle(pot);
        for (const $f5 of $iter($enumerate(pot))) {
          [gi, n] = $iter($f5);
          $M.append($idx(gs, gi), n);
        }
      }
      for (const $f6 of $iter($enumerate(gs))) {
        [gi, g] = $iter($f6);
        $M.append(self.groups, g);
        $M.append(self.labels, ("League " + $str($chr((65 + ti))) + " - group " + $str((gi + 1))));
        $M.append(self.tier_of, ti);
      }
    }
    self.gsched = (() => { const $r = []; let g; for (const $c0 of $iter(self.groups)) { g = $c0; $r.push(double_rounds(g, self.rng)); } return $r; })();
    self.gtab = (() => { const $r = new $Dict(); let g, n; for (const $c0 of $iter(self.groups)) { g = $c0; for (const $c1 of $iter(g)) { n = $c1; $r.set(n, $dict($kw({"p": 0, "pts": 0, "gf": 0, "ga": 0}))); } } return $r; })();
    self.glog = [];
    self.ties = [];
    $t2 = null;
    self.winner = $t2;
    self.runner_up = $t2;
    self.sf = [];
    self.finalists = [];
    self.ko_current = [];
    M = $max((() => { const $r = []; let s; for (const $c0 of $iter(self.gsched)) { s = $c0; $r.push($len(s)); } return $r; })(), $kw({"default": 0}));
    wins = new $Dict();
    for (const $f7 of $iter($range(M))) {
      r = $f7;
      $M.append($M.setdefault(wins, $min(3, $int($div($mul(r, 4), $max(M, 1)))), []), r);
    }
    self.group_events = 0;
    for (const $f8 of $iter($sorted(wins))) {
      j = $f8;
      self.ev($idx(WINDOW_WEEKS, j), (("Matchday " + $str(($idx($idx(wins, j), 0) + 1))) + (($len($idx(wins, j)) > 1) ? ("-" + $str(($idx($idx(wins, j), (-1)) + 1))) : "")), $kw({"rounds": $idx(wins, j), "phase": "group"}));
      self.group_events = self.group_events + 1;
    }
    self.ngA = $sum((() => { const $r = []; let t; for (const $c0 of $iter(self.tier_of)) { t = $c0; if (!(t === 0)) continue; $r.push(1); } return $r; })());
    self.has_finals = (self.ngA >= 2);
    if ($T(self.has_finals)) {
      self.ev(SUMMER_START, "Finals: semifinals", $kw({"phase": "sf", "rnd": 0}));
      self.ev((SUMMER_START + 1), "Finals: final", $kw({"phase": "fin", "rnd": 1}));
    }
    self.ko_size = ($T(self.has_finals) ? 4 : 0);
    self.ko_rounds = ($T(self.has_finals) ? 2 : 0);
    self.perf = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(pool)) { n = $c0; $r.set(n, 0.0); } return $r; })();
  }
  grp_rank(g) {
    const self = this;
    let t;
    t = self.gtab;
    return $sorted(g, $kw({"key": ((n) => [(-$idx($idx(t, n), "pts")), (-$sub($idx($idx(t, n), "gf"), $idx($idx(t, n), "ga"))), (-$idx($idx(t, n), "gf")), (-$idx(self.eff, n)), n])}));
  }
  _finish_groups(ev) {
    const self = this;
    let a_groups, f, g, key, n, pos, ranks, rk, seconds, t, winners;
    a_groups = (() => { const $r = []; let g, t; for (const $c0 of $iter($zip(self.groups, self.tier_of))) { [g, t] = $iter($c0); if (!(t === 0)) continue; $r.push(g); } return $r; })();
    ranks = (() => { const $r = []; let g; for (const $c0 of $iter(a_groups)) { g = $c0; $r.push(self.grp_rank(g)); } return $r; })();
    key = ((n) => [(-$idx($idx(self.gtab, n), "pts")), (-$sub($idx($idx(self.gtab, n), "gf"), $idx($idx(self.gtab, n), "ga"))), (-$idx($idx(self.gtab, n), "gf")), (-$idx(self.eff, n)), n]);
    winners = $sorted((() => { const $r = []; let rk; for (const $c0 of $iter(ranks)) { rk = $c0; $r.push($idx(rk, 0)); } return $r; })(), $kw({"key": key}));
    seconds = $sorted((() => { const $r = []; let rk; for (const $c0 of $iter(ranks)) { rk = $c0; if (!($len(rk) > 1)) continue; $r.push($idx(rk, 1)); } return $r; })(), $kw({"key": key}));
    if ($T(self.has_finals)) {
      self.finalists = $slice($add(winners, seconds), null, 4, null);
      f = self.finalists;
      if (($len(f) === 4)) {
        self.sf = [[$idx(f, 0), $idx(f, 3)], [$idx(f, 1), $idx(f, 2)]];
      } else if (($len(f) >= 2)) {
        self.sf = [[$idx(f, 0), $idx(f, 1)]];
      }
    } else if ($T(winners)) {
      self.winner = $idx(winners, 0);
      self.runner_up = (($len($idx(ranks, 0)) > 1) ? $idx($idx(ranks, 0), 1) : null);
      self.w.record_final(self, self.winner, self.runner_up, "group winners", $idx(ev, "week"), $idx(ev, "season"), $kw({"nation": true}));
    }
    for (const $f9 of $iter(ranks)) {
      rk = $f9;
      for (const $f10 of $iter($enumerate(rk))) {
        [pos, n] = $iter($f10);
        $setidx(self.perf, n, $max($idx(self.perf, n), $idx([0.3, 0.2, 0.1, 0.0], $min(pos, 3))));
      }
    }
    for (const $f11 of $iter((() => { const $r = []; let g, t; for (const $c0 of $iter($zip(self.groups, self.tier_of))) { [g, t] = $iter($c0); $r.push([g, t, self.grp_rank(g)]); } return $r; })())) {
      [g, t, rk] = $iter($f11);
      if ((t === 0)) {
        continue;
      }
      for (const $f12 of $iter($enumerate(rk))) {
        [pos, n] = $iter($f12);
        $setidx(self.perf, n, $max($idx(self.perf, n), $idx([0.3, 0.2, 0.1, 0.0], $min(pos, 3))));
      }
    }
  }
  _games(ev) {
    const self = this, ph = $idx(ev, "phase"), out = [];
    if (ph === "group") {
      for (const r of $idx(ev, "rounds")) for (const sched of self.gsched) {
        if (r >= sched.length) continue;
        for (const [a, b] of sched[r]) out.push({ key: a + "|" + b, a, b, r, phase: "group" });
      }
    } else if (ph === "sf") {
      for (const [a, b] of self.sf) out.push({ key: a + "|" + b, a, b, phase: "sf" });
    } else if (ph === "fin" && self.ko_current.length >= 2) {
      out.push({ key: self.ko_current[0] + "|" + self.ko_current[1], a: self.ko_current[0], b: self.ko_current[1], phase: "fin" });
    }
    return out;
  }
  _sim(ev, g, rng) {
    const eff = this.eff, { a, b } = g;
    const rv = this.rvfx(a, b, g.phase === "group" ? 1.0 : g.phase === "sf" ? 1.45 : 1.7);
    if (g.phase === "group") { const [sa, sb] = score(rng, $idx(eff, a), $idx(eff, b), false, 1.0, rv); return { sa, sb }; }
    const [sa, sb] = pair_score(rng, eff, a, b, null, 1.0, true, rv), [w, l, how] = settle(rng, eff, a, b, sa, sb, null, rv);
    return { sa, sb, w, l, how };
  }
  _applied(ev, g, res) {
    if (g.phase === "group") this._tab(this.gtab, g.a, g.b, res.sa, res.sb);
  }
  _finish(ev, list) {
    const self = this, ph = $idx(ev, "phase");
    if (ph === "group") {
      for (const [g, res] of list) self.glog.push([g.r, g.a, g.b, res.sa, res.sb]);
      if (self.ptr === self.group_events - 1) self._finish_groups(ev);
      return;
    }
    if (ph === "sf") {
      const winners = [];
      for (const [g, res] of list) {
        const { a, b } = g, { sa, sb, w, l, how } = res;
        self.ties.push(["semifinal", a, b, (sa + "-" + sb + how), w]);
        self.log_tie(ev, 4, a, b, [[sa, sb]], [sa, sb], how, w, l, $kw({ "nation": true }));
        winners.push(w);
        $setidx(self.perf, l, $max($idx(self.perf, l), 0.5));
      }
      self.ko_current = winners;
      return;
    }
    if (ph === "fin") {
      if (list.length) {
        const [g, res] = list[0], { a, b } = g, { sa, sb, w, l, how } = res;
        self.ties.push(["final", a, b, (sa + "-" + sb + how), w]);
        self.log_tie(ev, 2, a, b, [[sa, sb]], [sa, sb], how, w, l, $kw({ "nation": true }));
        [self.winner, self.runner_up] = [w, l];
        $setidx(self.perf, w, 1.0);
        $setidx(self.perf, l, 0.75);
      } else if (self.ko_current.length) self.winner = self.ko_current[0];
    }
  }
  ranking_gain() {
    const self = this;
    let g, n, out, ti, wt;
    out = new $Dict();
    for (const $f17 of $iter($zip(self.groups, self.tier_of))) {
      [g, ti] = $iter($f17);
      wt = $idx(self.TIER_W, $min(ti, 3));
      for (const $f18 of $iter(g)) {
        n = $f18;
        $setidx(out, n, $mul((30.0 * wt), (0.1 + $M.get(self.perf, n, 0.0))));
      }
    }
    return out;
  }
}
NationsLeague.prototype.kind = "nl";
NationsLeague.prototype.TIER_W = [1.0, 0.6, 0.4, 0.25];
$CLS['NationsLeague'] = NationsLeague;
function make_ct(world) {
  let confed, out;
  out = [];
  for (const $f19 of $iter(CT_TITLES)) {
    confed = $f19;
    if ($ge($len(_pool(world, confed)), MIN_FIELD)) {
      $M.append(out, $new(ContinentalChampionship, [world, confed]));
    }
  }
  return out;
}
function make_nl(world) {
  let confed, out;
  out = [];
  for (const $f20 of $iter(NL_TITLES)) {
    confed = $f20;
    if ($ge($len(_pool(world, confed)), MIN_FIELD)) {
      $M.append(out, $new(NationsLeague, [world, confed]));
    }
  }
  return out;
}
return {CT_SIZE: CT_SIZE, CT_TITLES: CT_TITLES, Comp: Comp, ContinentalChampionship: ContinentalChampionship, MIN_FIELD: MIN_FIELD, NL_TITLES: NL_TITLES, NationsLeague: NationsLeague, SUMMER_START: SUMMER_START, WINDOW_WEEKS: WINDOW_WEEKS, WorldCup: WorldCup, _pool: _pool, circle_rounds: circle_rounds, double_rounds: double_rounds, make_ct: make_ct, make_nl: make_nl, math: math, pair_score: pair_score, rank_of: rank_of, round_name: round_name, score: score, settle: settle};
})();
