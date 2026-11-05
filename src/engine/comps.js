$mods["comps"] = (function() {
const math = $py.math;
const {defaultdict} = $py.collections || {};
let CUP_WEEKS, DOMESTIC_WEEKS, SEASON_WEEKS, SUMMER_START, WINDOW_WEEKS;
SEASON_WEEKS = 44;
WINDOW_WEEKS = [8, 17, 27, 36];
DOMESTIC_WEEKS = (() => { const $r = []; let w; for (const $c0 of $iter($range(1, (SEASON_WEEKS + 1)))) { w = $c0; if (!(!$in(w, WINDOW_WEEKS))) continue; $r.push(w); } return $r; })();
CUP_WEEKS = [[40], [31, 33], [22, 24], [12, 14], [5, 7]];
SUMMER_START = (SEASON_WEEKS + 1);
function fclamp(v, lo, hi) {
  return $max(lo, $min(hi, v));
}
function poisson(rng, lam) {
  let k, limit, p;
  limit = math.exp((-lam));
  [k, p] = $iter([0, 1.0]);
  while (true) {
    p = $mul(p, rng.random());
    if ($le(p, limit)) {
      return k;
    }
    k = k + 1;
  }
}
function score(...$args) {
  let [rng, eh, ea, neutral, f, rv] = $bind($args, ["rng", "eh", "ea", "neutral", "f", "rv"], [$R, $R, $R, () => false, () => 1.0, () => 0]);
  let al, hl, venue;
  // rivalry: the gap between the sides shrinks and the home edge fades (rv is 0 for ordinary games)
  if (rv) { const m = (eh + ea) / 2, k = 1 - 0.3 * rv; eh = m + (eh - m) * k; ea = m + (ea - m) * k; }
  venue = ($T(neutral) ? 1.0 : (rv ? 1 + 0.12 * (1 - 0.4 * Math.min(1, rv)) : 1.12));
  hl = $mul($max(0.2, $min(4.0, $mul((1.35 * $pow($div((eh + 2), (ea - 2)), 1.3)), venue))), f);
  al = $mul($max(0.2, $min(4.0, (1.35 * $pow($div((ea + 2), (eh - 2)), 1.3)))), f);
  return [poisson(rng, hl), poisson(rng, al)];
}
function pair_score(rng, eff, a, b, host = null, f = 1.0, neutral = true, rv = 0) {
  let sa, sb;
  if (((host != null) && ($eq(host, a)))) {
    return score(rng, $idx(eff, a), $idx(eff, b), false, f, rv);
  }
  if (((host != null) && ($eq(host, b)))) {
    [sb, sa] = $iter(score(rng, $idx(eff, b), $idx(eff, a), false, f, rv));
    return [sa, sb];
  }
  return score(rng, $idx(eff, a), $idx(eff, b), neutral, f, rv);
}
function settle(rng, eff, a, b, sa, sb, host = null, rv = 0) {
  let ea, eb, p;
  if ((!$eq(sa, sb))) {
    return ($gt(sa, sb) ? [a, b, ""] : [b, a, ""]);
  }
  [ea, eb] = $iter(pair_score(rng, eff, a, b, host, (1 / 3), true, rv));
  [sa, sb] = $iter([$add(sa, ea), $add(sb, eb)]);
  if ((!$eq(sa, sb))) {
    return ($gt(sa, sb) ? [a, b, " (aet)"] : [b, a, " (aet)"]);
  }
  p = fclamp((0.5 + ($sub($idx(eff, a), $idx(eff, b)) / 200)), 0.35, 0.65);
  return ($lt(rng.random(), p) ? [a, b, " (pens)"] : [b, a, " (pens)"]);
}
function circle_rounds(teams, rng = null) {
  let a, b, i, n, pairs, r, rounds;
  teams = $list(teams);
  if ((rng != null)) {
    rng.shuffle(teams);
  }
  if ($T($mod($len(teams), 2))) {
    $M.append(teams, null);
  }
  n = $len(teams);
  rounds = [];
  for (const $f1 of $iter($range((n - 1)))) {
    r = $f1;
    pairs = [];
    for (const $f2 of $iter($range(Math.floor(n / 2)))) {
      i = $f2;
      [a, b] = $iter([$idx(teams, i), $idx(teams, $sub((n - 1), i))]);
      if (((a == null) || (b == null))) {
        continue;
      }
      $M.append(pairs, (($mod(r, 2) === 0) ? [a, b] : [b, a]));
    }
    $M.append(rounds, pairs);
    teams = $add([$idx(teams, 0), $idx(teams, (-1))], $slice(teams, 1, (-1), null));
  }
  return rounds;
}
function double_rounds(teams, rng = null) {
  let r;
  r = circle_rounds(teams, rng);
  return $add(r, (() => { const $r = []; let rd; for (const $c0 of $iter(r)) { rd = $c0; $r.push((() => { const $r = []; let a, b; for (const $c0 of $iter(rd)) { [a, b] = $iter($c0); $r.push([b, a]); } return $r; })()); } return $r; })());
}
function pow2_floor(n) {
  let p;
  p = 1;
  while ($le($mul(p, 2), n)) {
    p = $mul(p, 2);
  }
  return p;
}
function round_name(n) {
  return $M.get($lit_dict([[2, "final"], [4, "semifinal"], [8, "quarterfinal"], [16, "round of 16"], [32, "round of 32"]]), n, ("round of " + $str(n)));
}
class Comp {
  __init__(world, cid, title, scope) {
    const self = this;
    self.w = world;
    self.id = cid;
    self.title = title;
    self.scope = scope;
    self.events = [];
    self.ptr = 0;
    self.requires = [];
    self.rng = world.comp_rng(cid);
    self.prepared = false;
    self.tlog = [];
  }
  get done() {
    const self = this;
    return $ge(self.ptr, $len(self.events));
  }
  has_event(season) {
    const self = this;
    return ($lt(self.ptr, $len(self.events)) && $le($idx($idx(self.events, self.ptr), "season"), season));
  }
  remaining(season) {
    const self = this;
    return $sum((() => { const $r = []; let e; for (const $c0 of $iter($slice(self.events, self.ptr, null, null))) { e = $c0; if (!$le($idx(e, "season"), season)) continue; $r.push(1); } return $r; })());
  }
  next_week() {
    const self = this;
    return $idx($idx(self.events, self.ptr), "week");
  }
  next_label() {
    const self = this;
    return $idx($idx(self.events, self.ptr), "label");
  }
  progress(season) {
    const self = this;
    let tot;
    tot = $sum((() => { const $r = []; let e; for (const $c0 of $iter(self.events)) { e = $c0; if (!$le($idx(e, "season"), season)) continue; $r.push(1); } return $r; })());
    return [$sub(tot, self.remaining(season)), tot];
  }
  play_next() {
    const self = this;
    let ev;
    ev = $idx(self.events, self.ptr);
    if ((!$T(self.prepared))) {
      self.prepare();
      self.prepared = true;
    }
    self.play(ev);
    self.ptr = self.ptr + 1;
  }
  prepare() {
    const self = this;
  }
  ensure_prepared() {
    const self = this;
    if ((!$T(self.prepared))) {
      self.prepare();
      self.prepared = true;
    }
  }
  log_tie(...$args) {
    const self = this;
    let [ev, left, a, b, legs, agg, how, winner, loser, nation] = $bind($args, ["ev", "left", "a", "b", "legs", "agg", "how", "winner", "loser", "nation"], [$R, $R, $R, $R, $R, $R, $R, $R, $R, () => false]);
    let t, txt;
    t = $dict($kw({"round": $M.get(ev, "rnd", 0), "name": round_name(left), "left": left, "a": a, "b": b, "legs": legs, "agg": agg, "how": $M.strip(how, " ()"), "winner": winner, "week": $idx(ev, "week"), "season": $idx(ev, "season"), "date": self.w.date_of($idx(ev, "season"), $idx(ev, "week"), self.kind).isoformat()}));
    $M.append(self.tlog, t);
    if ((left === 2)) {
      txt = (($len(legs) > 1) ? $M.join(" / ", (() => { const $r = []; let x, y; for (const $c0 of $iter(legs)) { [x, y] = $iter($c0); $r.push(($str(x) + "-" + $str(y))); } return $r; })()) : ($str($idx($idx(legs, 0), 0)) + "-" + $str($idx($idx(legs, 0), 1))));
      if (($len(legs) > 1)) {
        txt = txt + (" (agg " + $str($idx(agg, 0)) + "-" + $str($idx(agg, 1)) + ")");
      }
      self.w.record_final(self, winner, loser, $add(txt, ($T(how) ? (" " + $M.strip(how)) : "")), $idx(ev, "week"), $idx(ev, "season"), $kw({"nation": nation}));
    }
  }
  play(ev) {
    const self = this;
    throw $new(NotImplementedError, []);
  }
  ev(...$args) {
    const self = this;
    let [week, label, season, kw] = $bind($args, ["week", "label", "season"], [$R, $R, () => null], true);
    let d;
    d = $dict($kw({"week": week, "label": label, "season": ((season != null) ? season : self.w.season)}));
    $M.update(d, kw);
    $M.append(self.events, d);
  }
}
Comp.prototype.kind = "comp";
$CLS['Comp'] = Comp;

// ---------------------------------------------------------------------------------------------------------------
// Single-game framework (cups, qualifying, play-offs, World Cup, Nations League).
// An event (round / matchday / leg) is a list of games. Every game has its own random stream, seeded by the event's
// season, the competition, the event number and the two teams, so a game gives the same result whenever it is played.
// Results wait in this.pg until the whole event is done; then _finish() files them in fixture-list order, so any
// order of play gives the same competition state.
// ---------------------------------------------------------------------------------------------------------------
Comp.prototype.pg = null;
Comp.prototype.mlog = null;
Comp.prototype.cur_ev = function() { return this.ptr < this.events.length ? this.events[this.ptr] : null; };
Comp.prototype._games = function(ev) { return []; };
Comp.prototype._applied = function(ev, g, res) {};
Comp.prototype._finish = function(ev, list) {};
Comp.prototype.game_rng = function(ev, key) {
  const r = new $Random();
  r.seed(this.w.seed + "|" + $idx(ev, "season") + "|" + this.id + "|g|" + this.ptr + "|" + key);
  return r;
};
Comp.prototype.games = function() {
  const ev = this.cur_ev(); if (!ev) return [];
  return this._games(ev);
};
Comp.prototype.unplayed_games = function() {
  const pg = this.pg || {};
  return this.games().filter((g) => !(g.key in pg));
};
Comp.prototype.play_game = function(key) {
  const ev = this.cur_ev();
  if (!ev) throw $mkexc(ValueError, "Nothing is left to play in this competition.");
  this.ensure_prepared();
  const gs = this._games(ev), g = gs.find((x) => x.key === key);
  if (!g) throw $mkexc(ValueError, "That game is not part of the current round.");
  if (!this.pg) this.pg = {};
  if (key in this.pg) throw $mkexc(ValueError, "That game has already been played.");
  const res = this._sim(ev, g, this.game_rng(ev, g.key));
  this.pg[key] = res;
  this._applied(ev, g, res);
  if (gs.every((x) => x.key in this.pg)) { this.play_next(); this._autorun(); }
  return res;
};
// events with no games in them (e.g. "Qualifying complete") run by themselves once the games before them are done
Comp.prototype._autorun = function() {
  while (this.ptr < this.events.length && this.has_event(this.w.season) && this.games().length === 0) this.play_next();
};
Comp.prototype.play = function(ev) {
  const gs = this._games(ev), pg = this.pg || (this.pg = {});
  for (const g of gs) {
    if (g.key in pg) continue;
    const res = this._sim(ev, g, this.game_rng(ev, g.key));
    pg[g.key] = res;
    this._applied(ev, g, res);
  }
  const list = gs.map((g) => [g, pg[g.key]]);
  this.pg = null;
  this._finish(ev, list);
};
// played games of the current event, for the screens
Comp.prototype.rvfx = function(a, b, stk) { return $mods.rivals.effect(this.w, a, b, stk); };
Comp.prototype.played_now = function() {
  const pg = this.pg || {};
  return this.games().filter((g) => g.key in pg).map((g) => Object.assign({}, g, { res: pg[g.key] }));
};
// one row of a points table
Comp.prototype._tab = function(t, a, b, sa, sb) {
  const ta = $idx(t, a), tb = $idx(t, b);
  $setidx(ta, "p", $idx(ta, "p") + 1); $setidx(tb, "p", $idx(tb, "p") + 1);
  $setidx(ta, "gf", $idx(ta, "gf") + sa); $setidx(ta, "ga", $idx(ta, "ga") + sb);
  $setidx(tb, "gf", $idx(tb, "gf") + sb); $setidx(tb, "ga", $idx(tb, "ga") + sa);
  if (sa > sb) $setidx(ta, "pts", $idx(ta, "pts") + 3);
  else if (sa < sb) $setidx(tb, "pts", $idx(tb, "pts") + 3);
  else { $setidx(ta, "pts", $idx(ta, "pts") + 1); $setidx(tb, "pts", $idx(tb, "pts") + 1); }
};
class LeagueComp extends Comp {
  __init__(world, lname) {
    const self = this;
    let D, G, L, cyc, flip, k, rounds, wk;
    L = $idx(world.leagues, lname);
    super.__init__(world, ("L:" + $str(lname)), lname, $idx(L, "confed"));
    self.name = lname;
    self.clubs = $list($idx(L, "clubs"));
    self.eff = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.clubs)) { n = $c0; $r.set(n, $idx($idx(world.clubs, n), "eff")); } return $r; })();
    G = $idx(L, "games");
    self.games = G;
    cyc = double_rounds(self.clubs, self.rng);
    if ($lt(G, $len(cyc))) {
      self.rng.shuffle(cyc);
    }
    [rounds, flip] = $iter([[], false]);
    while ($lt($len(rounds), G)) {
      rounds = $iadd(rounds, ((!$T(flip)) ? cyc : (() => { const $r = []; let rd; for (const $c0 of $iter(cyc)) { rd = $c0; $r.push((() => { const $r = []; let a, b; for (const $c0 of $iter(rd)) { [a, b] = $iter($c0); $r.push([b, a]); } return $r; })()); } return $r; })()));
      flip = (!$T(flip));
    }
    self.rounds = $slice(rounds, null, G, null);
    D = $len(DOMESTIC_WEEKS);
    for (const $f3 of $iter($range(G))) {
      k = $f3;
      wk = ((G > 1) ? $idx(DOMESTIC_WEEKS, $round($div($mul(k, (D - 1)), (G - 1)))) : $idx(DOMESTIC_WEEKS, 0));
      self.ev(wk, ("Matchweek " + $str((k + 1))));
    }
    self.st = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.clubs)) { n = $c0; $r.set(n, $dict($kw({"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0}))); } return $r; })();
    self.results = [];
  }
  // Every fixture has its own random stream, seeded by season, competition, matchweek and the two clubs. A game gives the
  // same result whenever it is played, so games inside a matchweek can be simmed one at a time in any order.
  fixture_rng(h, a) {
    const r = new $Random();
    r.seed(this.w.seed + "|" + this.w.season + "|" + this.id + "|f|" + this.ptr + "|" + h + "|" + a);
    return r;
  }
  _fixture(h, a) {
    const self = this, st = self.st;
    const [hg, ag] = score(self.fixture_rng(h, a), self.eff.get_(h), self.eff.get_(a), false, 1.0, $mods.rivals.effect(self.w, h, a, 1.0));
    const sh = st.get_(h), sa = st.get_(a);
    sh.set("p", sh.get_("p") + 1); sa.set("p", sa.get_("p") + 1);
    sh.set("gf", sh.get_("gf") + hg); sh.set("ga", sh.get_("ga") + ag);
    sa.set("gf", sa.get_("gf") + ag); sa.set("ga", sa.get_("ga") + hg);
    if (hg > ag) { sh.set("w", sh.get_("w") + 1); sh.set("pts", sh.get_("pts") + 3); sa.set("l", sa.get_("l") + 1); }
    else if (hg < ag) { sa.set("w", sa.get_("w") + 1); sa.set("pts", sa.get_("pts") + 3); sh.set("l", sh.get_("l") + 1); }
    else { sh.set("d", sh.get_("d") + 1); sa.set("d", sa.get_("d") + 1); sh.set("pts", sh.get_("pts") + 1); sa.set("pts", sa.get_("pts") + 1); }
    return [h, a, hg, ag];
  }
  // played games of the current matchweek, always in fixture-list order (so statistics never depend on the order they were played)
  canon(list) {
    const fx = this.rounds[this.ptr], pos = new Map(fx.map((f, i) => [f[0] + "|" + f[1], i]));
    return list.slice().sort((x, y) => pos.get(x[0] + "|" + x[1]) - pos.get(y[0] + "|" + y[1]));
  }
  all_results() {
    return this.results.concat(this.partial && this.partial.length ? [this.canon(this.partial)] : []);
  }
  progress_key() {
    return [this.ptr, (this.partial || []).length];
  }
  // the games of the current matchweek that have not been played yet
  unplayed() {
    if (this.ptr >= this.rounds.length) return [];
    const done = new Set((this.partial || []).map((r) => r[0] + "|" + r[1]));
    return this.rounds[this.ptr].filter((f) => !done.has(f[0] + "|" + f[1]));
  }
  play_fixture(h, a) {
    const self = this;
    if (!self.unplayed().some((f) => f[0] === h && f[1] === a)) throw $mkexc(ValueError, "That game is not left to play this matchweek.");
    if (self.partial == null) self.partial = [];
    const r = self._fixture(h, a);
    self.partial.push(r);
    if (self.partial.length === self.rounds[self.ptr].length) self.play_next();       // matchweek complete: file it and move on
    return r;
  }
  play_one() {
    const f = this.unplayed()[0];
    return this.play_fixture(f[0], f[1]);
  }
  play(ev) {
    const self = this, st = self.st;
    const out = self.partial != null ? self.partial : [];
    for (const [h, a] of self.unplayed()) out.push(self._fixture(h, a));
    const filed = self.canon(out);
    self.partial = [];
    self.results.push(filed);
    if (self.ptr === self.events.length - 1) {                  // last matchweek: the title is decided
      const order = self.standings(), top = order[0];
      self.w.record_final(self, top, order.length > 1 ? order[1] : null, st.get_(top).get_("pts") + " pts", $idx(ev, "week"), $idx(ev, "season"));
    }
  }
  standings() {
    const self = this;
    let st;
    st = self.st;
    if (((!$T(self.results)) && (!$T(self.partial)))) {
      return $sorted(self.clubs, $kw({"key": ((n) => [(-$idx(self.eff, n)), n])}));
    }
    return $sorted(self.clubs, $kw({"key": ((n) => [(-$idx($idx(st, n), "pts")), (-$sub($idx($idx(st, n), "gf"), $idx($idx(st, n), "ga"))), (-$idx($idx(st, n), "gf")), n])}));
  }
}
LeagueComp.prototype.kind = "league";
LeagueComp.prototype.partial = null;
$CLS['LeagueComp'] = LeagueComp;
class CupComp extends Comp {
  __init__(world, confed, field = null, title = null, two_leg = true, cid = null, neutral_all = false) {
    const self = this;
    let cup, idx, left, r, size, weeks, $t1, $t2, $t3, $t4;
    cup = $idx(world.cups, confed);
    super.__init__(world, ($T($t1 = cid) ? $t1 : ("C:" + $str(confed))), ($T($t2 = title) ? $t2 : $idx(cup, "name")), confed);
    self.confed = confed;
    field = ((field == null) ? $list($M.get(world.cup_fields, confed, [])) : $list(field));
    size = ($T(field) ? pow2_floor($len(field)) : 0);
    self.eff = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(field)) { n = $c0; $r.set(n, $idx($idx(world.clubs, n), "eff")); } return $r; })();
    self.field = $slice($sorted(field, $kw({"key": ((n) => (-$idx(self.eff, n)))})), null, size, null);
    self.two_leg = two_leg;
    self.neutral_all = neutral_all;
    self.size = size;
    self.rounds_total = ((size > 1) ? $int(math.log2(size)) : 0);
    self.reached = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.field)) { n = $c0; $r.set(n, 0); } return $r; })();
    self.current = $list(self.field);
    self.pairs = [];
    self.leg1 = new $Dict();
    self.ties = [];
    $t3 = null;
    self.winner = $t3;
    self.runner_up = $t3;
    for (const $f5 of $iter($range(self.rounds_total))) {
      r = $f5;
      left = $shr(size, r);
      idx = $sub((self.rounds_total - 1), r);
      weeks = $idx(CUP_WEEKS, $min(idx, ($len(CUP_WEEKS) - 1)));
      if ($T(($T($t4 = two_leg) ? (left > 2) : $t4))) {
        self.ev($idx(weeks, 0), ($str($M.capitalize(round_name(left))) + ", 1st leg"), $kw({"rnd": r, "leg": 1}));
        self.ev($idx(weeks, (-1)), ($str($M.capitalize(round_name(left))) + ", 2nd leg"), $kw({"rnd": r, "leg": 2}));
      } else {
        self.ev($idx(weeks, (-1)), ($str($M.capitalize(round_name(left)))), $kw({"rnd": r, "leg": 0}));
      }
    }
  }
  _games(ev) {
    const self = this, leg = $idx(ev, "leg");
    let pairs;
    if (leg === 0 || leg === 1) {
      const cur = self.current, n = cur.length;
      pairs = []; for (let i = 0; i < Math.floor(n / 2); i++) pairs.push([cur[i], cur[n - 1 - i]]);
    } else pairs = self.pairs;
    const left = self.current.length;
    return pairs.map(([a, b]) => ({ key: a + "|" + b, a, b, leg, left }));
  }
  _sim(ev, g, rng) {
    const self = this, eff = self.eff, { a, b, leg, left } = g;
    const stk = left <= 2 ? 1.7 : left <= 4 ? 1.45 : left <= 8 ? 1.3 : 1.2;       // bigger stakes, bigger rivalry effect
    const rv = $mods.rivals.effect(self.w, a, b, stk);
    if (leg === 1) return { legs: [score(rng, $idx(eff, a), $idx(eff, b), false, 1.0, rv)] };
    if (leg === 2) {
      const [s1a, s1b] = $idx(self.leg1, [a, b]);
      const [s2b, s2a] = score(rng, $idx(eff, b), $idx(eff, a), false, 1.0, rv);
      const sa = s1a + s2a, sb = s1b + s2b;
      const [w, l, how] = settle(rng, eff, a, b, sa, sb);
      return { legs: [[s1a, s1b], [s2a, s2b]], agg: [sa, sb], w, l, how };
    }
    const [sa, sb] = score(rng, $idx(eff, a), $idx(eff, b), true, 1.0, rv);
    const [w, l, how] = settle(rng, eff, a, b, sa, sb);
    return { legs: [[sa, sb]], agg: [sa, sb], w, l, how };
  }
  _finish(ev, list) {
    const self = this, eff = self.eff, r = $idx(ev, "rnd"), leg = $idx(ev, "leg"), left = self.current.length;
    if (leg === 0 || leg === 1) self.pairs = list.map(([g]) => [g.a, g.b]);
    if (leg === 1) { for (const [g, res] of list) $setidx(self.leg1, [g.a, g.b], res.legs[0]); return; }
    const winners = [];
    for (const [g, res] of list) {
      const { a, b } = g, { w, l, how, legs, agg } = res;
      const text = leg === 2 ? (legs[0][0] + "-" + legs[0][1] + ", " + legs[1][0] + "-" + legs[1][1] + " (agg " + agg[0] + "-" + agg[1] + ")") : (agg[0] + "-" + agg[1]);
      winners.push(w);
      self.log_tie(ev, left, a, b, legs, agg, how, w, l);
      $setidx(self.reached, w, r + 1);
      self.ties.push([$idx(ev, "label"), a, b, text + how, w]);
      const diff = $idx(eff, l) - $idx(eff, w);
      if (left > 2 && ((left <= 4 && diff >= 6) || diff >= 12)) {
        self.w.news("upset", self.title + " " + round_name(left) + ": " + w + " (OVR " + $idx($idx(self.w.clubs, w), "ovr") + ") beat " + l + " (OVR " + $idx($idx(self.w.clubs, l), "ovr") + ")", $idx(ev, "week"));
      }
      if (left === 2) [self.winner, self.runner_up] = [w, l];
    }
    self.current = $sorted(winners, $kw({ "key": ((x) => (-$idx(eff, x))) }));
  }
}
CupComp.prototype.kind = "cup";
$CLS['CupComp'] = CupComp;
class ClubWorldCup extends CupComp {
  __init__(world) {
    const self = this;
    let left, r, wk, $t1;
    Comp.prototype.__init__.call(self, world, ("CWC:" + $str(world.season)), "Club World Cup", "WORLD");
    self.confed = "WORLD";
    self.two_leg = false;
    self.neutral_all = true;
    self.requires = (() => { const $r = []; let c; for (const $c0 of $iter(world.cups)) { c = $c0; $r.push(("C:" + $str(c))); } return $r; })();
    self.field = [];
    self.eff = new $Dict();
    self.reached = new $Dict();
    self.ties = [];
    $t1 = null;
    self.winner = $t1;
    self.runner_up = $t1;
    self.size = pow2_floor($sum((() => { const $r = []; let c; for (const $c0 of $iter($M.values(world.cups))) { c = $c0; $r.push($idx(c, "cwc_slots")); } return $r; })()));
    self.rounds_total = $int(math.log2(self.size));
    self.current = [];
    for (const $f7 of $iter($range(self.rounds_total))) {
      r = $f7;
      left = $shr(self.size, r);
      wk = $add(SUMMER_START, r);
      self.ev(wk, $M.capitalize(round_name(left)), $kw({"rnd": r, "leg": 0}));
    }
  }
  prepare() {
    const self = this;
    let comp, confed, cup, e, field, i, ranked, size, skip, w;
    w = self.w;
    field = [];
    for (const $f8 of $iter($M.items(w.cups))) {
      [confed, cup] = $iter($f8);
      comp = $M.get(w.comps, ("C:" + $str(confed)));
      if (((comp == null) || (!$T(comp.field)))) {
        continue;
      }
      ranked = $sorted(comp.field, $kw({"key": ((n) => [(-$idx(comp.reached, n)), (-$idx(comp.eff, n))])}));
      field = $iadd(field, $slice(ranked, null, $idx(cup, "cwc_slots"), null));
    }
    size = pow2_floor($len(field));
    self.eff = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(field)) { n = $c0; $r.set(n, $idx($idx(w.clubs, n), "eff")); } return $r; })();
    self.field = $slice($sorted(field, $kw({"key": ((n) => (-$idx(self.eff, n)))})), null, size, null);
    self.reached = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.field)) { n = $c0; $r.set(n, 0); } return $r; })();
    self.current = $list(self.field);
    if ($lt(size, self.size)) {
      skip = $sub($int(math.log2(self.size)), $int(math.log2($max(size, 1))));
      self.events = ($lt(skip, $len(self.events)) ? $slice(self.events, skip, null, null) : []);
      self.rounds_total = ((size > 1) ? $int(math.log2(size)) : 0);
      for (const $f9 of $iter($enumerate(self.events))) {
        [i, e] = $iter($f9);
        $setidx(e, "rnd", i);
      }
    }
  }
}
ClubWorldCup.prototype.kind = "cwc";
$CLS['ClubWorldCup'] = ClubWorldCup;
class QualComp extends Comp {
  __init__(world, confed, host) {
    const self = this;
    let Wg, eff, gcount, gi, hist, j, nat, nations, order, pot, pots, r, s0, slots, wins, $t1;
    s0 = world.season;
    super.__init__(world, ("Q:" + $str(s0) + ":" + $str(confed)), ("World Cup qualifying - " + $str(confed)), confed);
    self.confed = confed;
    self.start = s0;
    self.host = host;
    slots = $M.get($idx(world.wc, "slots"), confed, 0);
    nations = (() => { const $r = []; let n; for (const $c0 of $iter(world.nations)) { n = $c0; if (!(($eq($idx($idx(world.nations, n), "confed"), confed)) && (!$eq(n, host)))) continue; $r.push(n); } return $r; })();
    self.auto_host = (($eq($M.get($M.get(world.nations, host, new $Dict()), "confed"), confed)) ? host : null);
    self.slots = $max(0, $sub(slots, ($T(self.auto_host) ? 1 : 0)));
    self.slots = $min(self.slots, $len(nations));
    self.qualified = ($T(self.auto_host) ? [self.auto_host] : []);
    self.leftover = [];
    self.finished = false;
    self.playoff = [];
    eff = world.nat_eff;
    gcount = $max(1, $min($M.get($idx(world.wc, "qualifying_groups"), confed, 1), ($T($t1 = Math.floor($len(nations) / 2)) ? $t1 : 1)));
    hist = $getattr(world, "nat_hist", new $Dict());
    order = $sorted(nations, $kw({"key": ((n) => [(-$add($mul(3, $idx(eff, n)), $M.get(hist, n, 0.0))), n])}));
    pots = (() => { const $r = []; let i; for (const $c0 of $iter($range(0, $len(order), gcount))) { i = $c0; $r.push($slice(order, i, $add(i, gcount), null)); } return $r; })();
    self.groups = (() => { const $r = []; let _; for (const $c0 of $iter($range(gcount))) { _ = $c0; $r.push([]); } return $r; })();
    for (const $f10 of $iter(pots)) {
      pot = $f10;
      self.rng.shuffle(pot);
      for (const $f11 of $iter($enumerate(pot))) {
        [gi, nat] = $iter($f11);
        $M.append($idx(self.groups, gi), nat);
      }
    }
    self.sched = (() => { const $r = []; let g; for (const $c0 of $iter(self.groups)) { g = $c0; $r.push(double_rounds(g, self.rng)); } return $r; })();
    self.M = $max((() => { const $r = []; let s; for (const $c0 of $iter(self.sched)) { s = $c0; $r.push($len(s)); } return $r; })(), $kw({"default": 0}));
    self.tab = (() => { const $r = new $Dict(); let g, n; for (const $c0 of $iter(self.groups)) { g = $c0; for (const $c1 of $iter(g)) { n = $c1; $r.set(n, $dict($kw({"p": 0, "pts": 0, "gf": 0, "ga": 0}))); } } return $r; })();
    Wg = 10;
    wins = defaultdict($list);
    for (const $f12 of $iter($range(self.M))) {
      r = $f12;
      $M.append($idx(wins, $int($div($mul(r, Wg), $max(self.M, 1)))), r);
    }
    for (const $f13 of $iter($sorted(wins))) {
      j = $f13;
      self.ev($idx(WINDOW_WEEKS, $mod(j, 4)), (("Qualifying matchday " + $str(($idx($idx(wins, j), 0) + 1))) + (($len($idx(wins, j)) > 1) ? ("-" + $str(($idx($idx(wins, j), (-1)) + 1))) : "")), $kw({"season": $add(s0, Math.floor(j / 4)), "rounds": $idx(wins, j), "phase": "group"}));
    }
    self.pending_playoff = null;
    self.pl_current = [];
    self.pl_leg1 = new $Dict();
    self.pl_pairs = [];
    self.expect_playoff = true;
    self.direct = $min($M.get($idx(world.wc, "qualifying_direct"), confed, $len(self.groups)), self.slots);
    self.R = $sub(self.slots, self.direct);
    if ((self.R > 0)) {
      self.ev($idx(WINDOW_WEEKS, 2), "Play-off, 1st leg", $kw({"season": (s0 + 2), "phase": "po1"}));
      self.ev($idx(WINDOW_WEEKS, 3), "Play-off, 2nd leg", $kw({"season": (s0 + 2), "phase": "po2"}));
    } else {
      self.ev($idx(WINDOW_WEEKS, 3), "Qualifying complete", $kw({"season": (s0 + 2), "phase": "end"}));
    }
  }
  group_rank(g) {
    const self = this;
    let t;
    t = self.tab;
    return $sorted(g, $kw({"key": ((n) => [(-$idx($idx(t, n), "pts")), (-$sub($idx($idx(t, n), "gf"), $idx($idx(t, n), "ga"))), (-$idx($idx(t, n), "gf")), n])}));
  }
  // after the groups: who goes through directly, who plays the play-off (pure, so screens can show it before it happens)
  _po_plan() {
    const self = this, t = self.tab;
    const ranks = self.groups.map((g) => self.group_rank(g));
    const ppg = (n) => [(-$idx($idx(t, n), "pts")) / Math.max(1, $idx($idx(t, n), "p")), (-($idx($idx(t, n), "gf") - $idx($idx(t, n), "ga"))) / Math.max(1, $idx($idx(t, n), "p")), n];
    let ordered = [];
    const depth = Math.max(0, ...ranks.map((rk) => rk.length));
    for (let pos = 0; pos < depth; pos++) {
      const lvl = ranks.filter((rk) => rk.length > pos).map((rk) => rk[pos]);
      lvl.sort((x, y) => $cmp(ppg(x), ppg(y)));
      ordered = ordered.concat(lvl);
    }
    const direct = ordered.slice(0, self.direct), rest = ordered.slice(self.direct);
    const pool = rest.slice(0, 2 * self.R), n = pool.length, pairs = [];
    for (let i = 0; i < Math.floor(n / 2); i++) pairs.push([pool[i], pool[n - 1 - i]]);
    return { direct, rest, pool, left: rest.slice(2 * self.R), pairs };
  }
  _games(ev) {
    const self = this, ph = $idx(ev, "phase"), eff = self.w.nat_eff;
    if (ph === "group") {
      const out = [];
      for (const r of $idx(ev, "rounds")) for (const sched of self.sched) {
        if (r >= sched.length) continue;
        for (const [h, a] of sched[r]) out.push({ key: h + "|" + a, a: h, b: a, r, phase: "group", home: h });
      }
      return out;
    }
    if (ph === "po1") return self._po_plan().pairs.map(([a, b]) => ({ key: a + "|" + b, a, b, leg: 1, phase: "po", home: a }));
    if (ph === "po2") return self.pl_pairs.map(([a, b]) => ({ key: a + "|" + b, a, b, leg: 2, phase: "po", home: b }));
    return [];
  }
  _sim(ev, g, rng) {
    const self = this, eff = self.w.nat_eff, { a, b } = g;
    const rv = self.rvfx(a, b, g.phase === "group" ? 1.0 : 1.2);
    if (g.phase === "group") { const [sa, sb] = score(rng, $idx(eff, a), $idx(eff, b), false, 1.0, rv); return { sa, sb }; }
    if (g.leg === 1) { const [sa, sb] = score(rng, $idx(eff, a), $idx(eff, b), false, 1.0, rv); return { sa, sb }; }
    const [s1a, s1b] = $idx(self.pl_leg1, [a, b]);
    const [s2b, s2a] = score(rng, $idx(eff, b), $idx(eff, a), false, 1.0, rv);
    const [w, l, _] = settle(rng, eff, a, b, s1a + s2a, s1b + s2b, null, rv);
    return { s1: [s1a, s1b], s2: [s2a, s2b], w, l };
  }
  _applied(ev, g, res) {
    if (g.phase === "group") this._tab(this.tab, g.a, g.b, res.sa, res.sb);
  }
  _finish(ev, list) {
    const self = this, ph = $idx(ev, "phase");
    if (!self.mlog) self.mlog = [];
    if (ph === "group") { for (const [g, res] of list) self.mlog.push([g.a, g.b, res.sa, res.sb, "World Cup qualifying - " + self.confed]); return; }
    if (ph === "po1") for (const [g, res] of list) self.mlog.push([g.a, g.b, res.sa, res.sb, "World Cup qualifying play-off"]);
    if (ph === "po2") for (const [g, res] of list) { self.mlog.push([g.a, g.b, res.s1[0], res.s1[1], "World Cup qualifying play-off"]); self.mlog.push([g.a, g.b, res.s2[0], res.s2[1], "World Cup qualifying play-off"]); }
    if (ph === "po1" || ph === "end") {
      const plan = self._po_plan();
      self.qualified = self.qualified.concat(plan.direct);
      if (ph === "end") { self.leftover = plan.rest; self.finished = true; return; }
      self.leftover = plan.left;
      self.pl_pairs = plan.pairs;
      self.playoff_pool = plan.pool;
      for (const [g, res] of list) $setidx(self.pl_leg1, [g.a, g.b], [res.sa, res.sb]);
      return;
    }
    if (ph === "po2") {
      const lost = [];
      for (const [g, res] of list) { self.qualified.push(res.w); lost.push(res.l); }
      lost.sort((x, y) => self.playoff_pool.indexOf(x) - self.playoff_pool.indexOf(y));
      self.leftover = lost.concat(self.leftover);
      self.finished = true;
      self.w.news("qualifying", self.confed + " qualifying done: " + self.qualified.length + " nations booked World Cup places", $idx(ev, "week"));
    }
  }
}
QualComp.prototype.kind = "qual";
$CLS['QualComp'] = QualComp;
class IntercontinentalPlayoff extends Comp {
  __init__(world) {
    const self = this;
    super.__init__(world, ("IC:" + $str(world.season)), "Intercontinental play-off", "WORLD");
    self.requires = (() => { const $r = []; let c; for (const $c0 of $iter($M.values(world.comps))) { c = $c0; if (!(c.kind === "qual")) continue; $r.push(c.id); } return $r; })();
    self.spots = $idx(world.wc, "ic_spots");
    self.qualified = [];
    self.finished = false;
    self.field = [];
    self.ev((SEASON_WEEKS - 1), "Play-off semifinals", $kw({"season": (world.season + 2)}));
    self.ev(SEASON_WEEKS, "Play-off finals", $kw({"season": (world.season + 2)}));
    self.state = null;
  }
  prepare() {
    const self = this;
    let c, eff, ic_count, teams, w;
    w = self.w;
    ic_count = $lit_dict([["CONMEBOL", 1], ["CAF", 1], ["AFC", 1], ["CONCACAF", 2], ["OFC", 1]]);
    teams = [];
    for (const $f20 of $iter($M.values(w.comps))) {
      c = $f20;
      if ((c.kind === "qual")) {
        teams = $iadd(teams, $slice(c.leftover, null, $M.get(ic_count, c.confed, 0), null));
      }
    }
    eff = w.nat_eff;
    teams = $sorted(teams, $kw({"key": ((n) => (-$idx(eff, n)))}));
    self.field = teams;
    self.spots = $min(self.spots, $len(teams));
  }
  _semis_final(ev) { return $M.startswith($idx(ev, "label"), "Play-off semi"); }
  _games(ev) {
    const self = this, t = self.field, eff = self.w.nat_eff;
    if (t.length <= self.spots) return [];
    const out = [];
    if (self._semis_final(ev)) {
      const rest = t.slice(self.spots), n = rest.length;
      for (let i = 0; i < Math.floor(n / 2); i++) out.push({ key: rest[i] + "|" + rest[n - 1 - i], a: rest[i], b: rest[n - 1 - i] });
    } else {
      const seeds = self.state ? self.state[0] : t.slice(0, self.spots);
      const nxt = (self.state ? self.state[1] : t.slice(self.spots)).slice().sort((x, y) => $cmp([-$idx(eff, x)], [-$idx(eff, y)]));
      seeds.forEach((s, i) => { if (i < nxt.length) { const b = nxt[nxt.length - 1 - i]; out.push({ key: s + "|" + b, a: s, b }); } });
    }
    return out;
  }
  _sim(ev, g, rng) {
    const eff = this.w.nat_eff, rv = this.rvfx(g.a, g.b, 1.2), [sa, sb] = pair_score(rng, eff, g.a, g.b, null, 1.0, true, rv), [w, l, how] = settle(rng, eff, g.a, g.b, sa, sb, null, rv);
    return { sa, sb, w, l, how };
  }
  _finish(ev, list) {
    const self = this, t = self.field, eff = self.w.nat_eff;
    if (t.length <= self.spots) { self.qualified = $list(t); self.finished = true; return; }
    if (!self.mlog) self.mlog = [];
    for (const [g, res] of list) self.mlog.push([g.a, g.b, res.sa, res.sb, "Intercontinental play-off"]);
    if (self._semis_final(ev)) {
      const seeds = t.slice(0, self.spots), rest = t.slice(self.spots), n = rest.length;
      const nxt = list.map(([g, res]) => res.w);
      if (n % 2) nxt.push(rest[Math.floor(n / 2)]);
      self.state = [seeds, nxt];
    } else {
      const seeds = self.state ? self.state[0] : t.slice(0, self.spots);
      const nxt = (self.state ? self.state[1] : t.slice(self.spots)).slice().sort((x, y) => $cmp([-$idx(eff, x)], [-$idx(eff, y)]));
      const won = new Map(list.map(([g, res]) => [g.a, res.w]));
      self.qualified = seeds.map((s, i) => (i < nxt.length ? won.get(s) : s));
      self.finished = true;
    }
  }
}
IntercontinentalPlayoff.prototype.kind = "ic";
$CLS['IntercontinentalPlayoff'] = IntercontinentalPlayoff;
class WorldCup extends Comp {
  __init__(world, host) {
    const self = this;
    let i, r, $t1;
    super.__init__(world, ("WC:" + $str(world.season)), "World Cup", "WORLD");
    self.host = host;
    self.requires = (() => { const $r = []; let c; for (const $c0 of $iter($M.values(world.comps))) { c = $c0; if (!($in(c.kind, ["qual", "ic"]))) continue; $r.push(c.id); } return $r; })();
    self.field = [];
    self.groups = [];
    self.gtab = new $Dict();
    self.perf = new $Dict();
    $t1 = null;
    self.winner = $t1;
    self.runner_up = $t1;
    self.ko_current = [];
    self.glog = [];
    self.ties = [];
    self.ko_rounds = 5;
    for (const $f23 of $iter($range(3))) {
      i = $f23;
      self.ev($add(SUMMER_START, i), ("Group matchday " + $str((i + 1))), $kw({"phase": "grp", "md": i}));
    }
    self.ko_weeks = (() => { const $r = []; let i; for (const $c0 of $iter($range(5))) { i = $c0; $r.push($add((SUMMER_START + 3), i)); } return $r; })();
    for (const $f24 of $iter($range(5))) {
      r = $f24;
      self.ev($idx(self.ko_weeks, r), "KO", $kw({"phase": "ko", "rnd": r}));
    }
  }
  prepare() {
    const self = this;
    let c, eff, field, hist, ng, q, w;
    w = self.w;
    q = [self.host];
    for (const $f25 of $iter($M.values(w.comps))) {
      c = $f25;
      if (($in(c.kind, ["qual", "ic"]))) {
        q = $iadd(q, (() => { const $r = []; let n; for (const $c0 of $iter(c.qualified)) { n = $c0; if (!(!$in(n, q))) continue; $r.push(n); } return $r; })());
      }
    }
    eff = w.nat_eff;
    field = $sorted(q, $kw({"key": ((n) => (-$idx(eff, n)))}));
    ng = $max(1, Math.floor($len(field) / 4));
    field = $slice(field, null, $mul(ng, 4), null);
    hist = $getattr(w, "nat_hist", new $Dict());
    self.rank = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(field)) { n = $c0; $r.set(n, $add($mul(3, $idx(eff, n)), $M.get(hist, n, 0.0))); } return $r; })();
    $M.sort(field, $kw({"key": ((n) => [(-$idx(self.rank, n)), n])}));
    self._setup(field, ng, (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(field)) { n = $c0; $r.set(n, $idx(eff, n)); } return $r; })());
  }
  _setup(field, ng, eff) {
    const self = this;
    let base, e, gi, grp, i, kos, nat, nko, pi, pot, pots, rest, tp;
    if (($in(self.host, field))) {
      $M.remove(field, self.host);
      $M.insert(field, 0, self.host);
    }
    self.field = field;
    self.eff = $dict(eff);
    pots = (() => { const $r = []; let i; for (const $c0 of $iter($range(0, $len(field), ng))) { i = $c0; $r.push($slice(field, i, $add(i, ng), null)); } return $r; })();
    self.groups = (() => { const $r = []; let _; for (const $c0 of $iter($range(ng))) { _ = $c0; $r.push([]); } return $r; })();
    for (const $f26 of $iter($enumerate(pots))) {
      [pi, pot] = $iter($f26);
      if ((pi === 0)) {
        rest = (($in(self.host, pot)) ? (() => { const $r = []; let n; for (const $c0 of $iter(pot)) { n = $c0; if (!(!$eq(n, self.host))) continue; $r.push(n); } return $r; })() : pot);
        self.rng.shuffle(rest);
        pot = $add((($in(self.host, pot)) ? [self.host] : []), rest);
      } else {
        self.rng.shuffle(pot);
      }
      for (const $f27 of $iter($enumerate(pot))) {
        [gi, nat] = $iter($f27);
        $M.append($idx(self.groups, gi), nat);
      }
    }
    self.gsched = (() => { const $r = []; let g; for (const $c0 of $iter(self.groups)) { g = $c0; $r.push(circle_rounds(g, self.rng)); } return $r; })();
    self.gtab = (() => { const $r = new $Dict(); let g, n; for (const $c0 of $iter(self.groups)) { g = $c0; for (const $c1 of $iter(g)) { n = $c1; $r.set(n, $dict($kw({"p": 0, "pts": 0, "gf": 0, "ga": 0}))); } } return $r; })();
    tp = pow2_floor($mul(ng, 3));
    self.ko_size = tp;
    nko = ((tp > 1) ? $int(math.log2(tp)) : 0);
    self.ko_rounds = nko;
    kos = (() => { const $r = []; let e; for (const $c0 of $iter(self.events)) { e = $c0; if (!($idx(e, "phase") === "ko")) continue; $r.push(e); } return $r; })();
    grp = (() => { const $r = []; let e; for (const $c0 of $iter(self.events)) { e = $c0; if (!($idx(e, "phase") === "grp")) continue; $r.push(e); } return $r; })();
    kos = ($lt(nko, $len(kos)) ? $slice(kos, $sub($len(kos), nko), null, null) : kos);
    base = (SUMMER_START + 3);
    for (const $f28 of $iter($enumerate(kos))) {
      [i, e] = $iter($f28);
      $setidx(e, "rnd", i);
      $setidx(e, "week", $add(base, i));
      $setidx(e, "label", $M.capitalize(round_name($shr(tp, i))));
    }
    self.events = $add(grp, kos);
    self.perf = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(field)) { n = $c0; $r.set(n, 0.0); } return $r; })();
  }
  ranking_gain() {
    const self = this;
    return (() => { const $r = new $Dict(); let n, v; for (const $c0 of $iter($M.items(self.perf))) { [n, v] = $iter($c0); $r.set(n, $mul(self.RANK_K, (0.05 + v))); } return $r; })();
  }
  grp_rank(g) {
    const self = this;
    let t;
    t = self.gtab;
    return $sorted(g, $kw({"key": ((n) => [(-$idx($idx(t, n), "pts")), (-$sub($idx($idx(t, n), "gf"), $idx($idx(t, n), "ga"))), (-$idx($idx(t, n), "gf")), (-$idx(self.eff, n))])}));
  }
  _games(ev) {
    const self = this, host = self.host;
    if ($idx(ev, "phase") === "grp") {
      const md = $idx(ev, "md"), out = [];
      for (const sched of self.gsched) {
        if (md >= sched.length) continue;
        for (const [a, b] of sched[md]) out.push({ key: a + "|" + b, a, b, md, phase: "grp" });
      }
      return out;
    }
    const cur = self.ko_current, n = cur.length, out = [];
    for (let i = 0; i < Math.floor(n / 2); i++) out.push({ key: cur[i] + "|" + cur[n - 1 - i], a: cur[i], b: cur[n - 1 - i], n, phase: "ko" });
    return out;
  }
  _sim(ev, g, rng) {
    const self = this, eff = self.eff, { a, b } = g;
    const n = g.n || 0, rv = self.rvfx(a, b, g.phase === "grp" ? 1.0 : n <= 2 ? 1.7 : n <= 4 ? 1.45 : n <= 8 ? 1.3 : 1.2);
    const [sa, sb] = pair_score(rng, eff, a, b, self.host, 1.0, true, rv);
    if (g.phase === "grp") return { sa, sb };
    const [w, l, how] = settle(rng, eff, a, b, sa, sb, self.host, rv);
    return { sa, sb, w, l, how };
  }
  _applied(ev, g, res) {
    if (g.phase === "grp") this._tab(this.gtab, g.a, g.b, res.sa, res.sb);
  }
  _finish(ev, list) {
    const self = this, eff = self.eff;
    if ($idx(ev, "phase") === "grp") {
      const md = $idx(ev, "md");
      for (const [g, res] of list) self.glog.push([md, g.a, g.b, res.sa, res.sb]);
      if (md === 2) self._advance();
      return;
    }
    const r = $idx(ev, "rnd"), n = self.ko_current.length, winners = [];
    for (const [g, res] of list) {
      const { a, b } = g, { sa, sb, w, l, how } = res;
      self.ties.push([round_name(n), a, b, (sa + "-" + sb + how), w]);
      self.log_tie(ev, n, a, b, [[sa, sb]], [sa, sb], how, w, l, $kw({ "nation": true }));
      winners.push(w);
      $setidx(self.perf, w, 0.15 + (0.85 * (r + 1)) / self.ko_rounds);
      if (n > 4 && ($idx(eff, l) - $idx(eff, w)) >= 14) {
        self.w.news("upset", self.title + " " + round_name(n) + ": " + w + " (rating " + $fmt($idx(eff, w), ".0f") + ") beat " + l + " (rating " + $fmt($idx(eff, l), ".0f") + ")", $idx(ev, "week"));
      }
      if (n === 2) [self.winner, self.runner_up] = [w, l];
    }
    self.ko_current = $sorted(winners, $kw({ "key": ((x) => self.seed_key(x)) }));
  }
  seed_key(n) {
    const self = this;
    return (-$idx(self.eff, n));
  }
  _advance() {
    const self = this;
    let adv, n, need, ranks, rk, thirds;
    ranks = (() => { const $r = []; let g; for (const $c0 of $iter(self.groups)) { g = $c0; $r.push(self.grp_rank(g)); } return $r; })();
    [adv, thirds] = $iter([[], []]);
    for (const $f32 of $iter(ranks)) {
      rk = $f32;
      adv = $iadd(adv, $slice(rk, null, 2, null));
      thirds = $iadd(thirds, $slice(rk, 2, 3, null));
    }
    need = $sub(self.ko_size, $len(adv));
    if ((need > 0)) {
      $M.sort(thirds, $kw({"key": ((n) => [(-$idx($idx(self.gtab, n), "pts")), (-$sub($idx($idx(self.gtab, n), "gf"), $idx($idx(self.gtab, n), "ga"))), (-$idx(self.eff, n))])}));
      adv = $iadd(adv, $slice(thirds, null, need, null));
    } else if ((need < 0)) {
      $M.sort(adv, $kw({"key": ((n) => [(-$idx($idx(self.gtab, n), "pts")), (-$sub($idx($idx(self.gtab, n), "gf"), $idx($idx(self.gtab, n), "ga")))])}));
      adv = $slice(adv, null, self.ko_size, null);
    }
    for (const $f33 of $iter(adv)) {
      n = $f33;
      $setidx(self.perf, n, 0.15);
    }
    $M.sort(adv, $kw({"key": ((n) => [(-$idx($idx(self.gtab, n), "pts")), (-$sub($idx($idx(self.gtab, n), "gf"), $idx($idx(self.gtab, n), "ga"))), (-$idx($idx(self.gtab, n), "gf")), (-$idx(self.eff, n))])}));
    self.ko_current = adv;
  }
}
WorldCup.prototype.kind = "wc";
WorldCup.prototype.RANK_K = 100.0;
$CLS['WorldCup'] = WorldCup;
return {CUP_WEEKS: CUP_WEEKS, ClubWorldCup: ClubWorldCup, Comp: Comp, CupComp: CupComp, DOMESTIC_WEEKS: DOMESTIC_WEEKS, IntercontinentalPlayoff: IntercontinentalPlayoff, LeagueComp: LeagueComp, QualComp: QualComp, SEASON_WEEKS: SEASON_WEEKS, SUMMER_START: SUMMER_START, WINDOW_WEEKS: WINDOW_WEEKS, WorldCup: WorldCup, circle_rounds: circle_rounds, defaultdict: defaultdict, double_rounds: double_rounds, fclamp: fclamp, math: math, pair_score: pair_score, poisson: poisson, pow2_floor: pow2_floor, round_name: round_name, score: score, settle: settle};
})();
