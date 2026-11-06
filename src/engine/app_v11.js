$mods["app_v11"] = (function() {
const argparse = $py.argparse;
const json = $py.json;
const mimetypes = $py.mimetypes;
const os = $py.os;
const re = $py.re;
const shutil = $py.shutil;
const subprocess = $py.subprocess;
const sys = $py.sys;
const threading = $py.threading;
const time = $py.time;
const traceback = $py.traceback;
const {BaseHTTPRequestHandler, ThreadingHTTPServer} = $py.http || {};
const {parse_qs, urlparse} = $py.urllib || {};
const cal = $mods.cal;
const compstats = $mods.compstats;
const shim = $mods.shim;
const G = $mods.god;
const S = $mods.sim_core;
const C = $mods.comps;
const T = $mods.trophies;
const {STOP_ITEMS, PRESETS, Stops} = $mods.stops || {};
let a_export = $mods.shim.a_export;
let list_saves = $mods.shim.list_saves;
let safe_slot = $mods.shim.safe_slot;
let a_save = $mods.shim.a_save;
let a_load = $mods.shim.a_load;
let a_delete = $mods.shim.a_delete;
let a_beat = $mods.shim.a_beat;
let a_quit = $mods.shim.a_quit;
let Handler = $mods.shim.Handler;
let find_browser = $mods.shim.find_browser;
let watchdog = $mods.shim.watchdog;
let main = $mods.shim.main;
let CONF_ORDER, GEO, GET, POST, ST, _LS;
GEO = json.loads($idx(shim.DATA, "clubs_geo"));
CONF_ORDER = ["UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"];
class State {
}
State.prototype.god = false;
State.prototype.world = null;
State.prototype.stops = $new(Stops, []);
State.prototype.last_beat = 0.0;
State.prototype.seen_beat = false;
State.prototype.last_review = null;
$CLS['State'] = State;
ST = $new(State, []);
function mx(x) {
  let k;
  k = ((ST.world != null) ? ST.world.cfg.money_x : 3.5);
  return $round($mul($float(x), k), 1);
}
function r1(x) {
  return $round($float(x), 1);
}
function need_world() {
  if ((ST.world == null)) {
    throw $new(ApiError, ["No world yet - start a new game or load a save.", 409]);
  }
  return ST.world;
}
class ApiError extends Exception {
  __init__(msg, code = 400) {
    const self = this;
    super.__init__(msg);
    self.code = code;
  }
}
$CLS['ApiError'] = ApiError;
function header(w) {
  let cy, ev, sy, wk;
  cy = w.cycle_year;
  ev = $idx($lit_dict([[1, "build-up"], [2, "Club World Cup + World Cup qualifying"], [3, "World Cup qualifying"], [4, "qualifying finals + World Cup"]]), cy);
  wk = w.current_week();
  sy = $getattr(w.cfg, "start_year", 2026);
  return $dict($kw({"season": w.season, "season_label": cal.season_label(sy, w.season), "cycle_year": cy, "cycle_text": ev, "week": wk, "date": ($T(wk) ? cal.pack(w.date_of(w.season, wk)) : null), "done": w.season_done(), "seed": w.seed, "phase": phase_of(w), "flow": $T(w.flow) ? w.flow : null}));
}
// where the season loop stands: season (leagues and cups), summer (only the summer tournaments are left), done (everything played,
// waiting for the wrap-up), then awards and transfers once the season has been rolled over from the Wrap-up button
function phase_of(w) {
  if ($T(w.flow)) return w.flow.get_("step");
  if ($T(w.season_done())) return "done";
  const act = w.active();
  return (act.length && act.every((c) => ["cwc", "wc", "ic"].includes(c.kind))) ? "summer" : "season";
}
function ev_date(w, c, ev) {
  return cal.pack(w.date_of($idx(ev, "season"), $idx(ev, "week"), c.kind));
}
function comp_progress(w, c) {
  let d, nd, t;
  [d, t] = $iter(c.progress(w.season));
  nd = ($T(c.has_event(w.season)) ? ev_date(w, c, $idx(c.events, c.ptr)) : null);
  return $dict($kw({"done": d, "total": t, "next": ($T(c.has_event(w.season)) ? c.next_label() : null), "next_date": nd, "locked": (() => { const $r = []; let m; for (const $c0 of $iter(w.missing(c))) { m = $c0; $r.push($dict($kw({"id": m, "title": $idx(w.comps, m).title}))); } return $r; })()}));
}
_LS = new $Dict();
function live_stats(w, cid) {
  let c, key, $t1;
  c = $idx(w.comps, cid);
  key = [$id(w), w.season, cid, c.ptr, $len(($T($t1 = $getattr(c, "partial", null)) ? $t1 : []))];
  if ((!$in(key, _LS))) {
    if (($len(_LS) > 80)) {
      $M.clear(_LS);
    }
    $setidx(_LS, key, $idx(compstats.comp_stats(w, cid), "_stats"));
  }
  return $idx(_LS, key);
}
function cur_stats(w, p) {
  let cid;
  if (((!$T(p.club)) || (!$in(p.club, w.clubs)))) {
    return null;
  }
  cid = ("L:" + $str($idx($idx(w.clubs, p.club), "league")));
  if ((!$in(cid, w.comps))) {
    return null;
  }
  return $M.get(live_stats(w, cid), $id(p));
}
function player_row(w, p) {
  let ls;
  ls = cur_stats(w, p);
  return $dict($kw({"uid": $getattr(p, "uid", 0), "gls": ($T(ls) ? $idx(ls, 0) : null), "ast": ($T(ls) ? $idx(ls, 1) : null), "cs": ($T(ls) ? $idx(ls, 2) : null), "name": p.name, "pos": p.pos, "age": p.age, "ovr": p.ovr, "pot": p.pot, "nat": p.nat, "club": p.club, "contract": p.contract, "wage": mx(p.wage), "value": mx(w.fee_for(p)), "peak": p.peak}));
}
function coach_row(co) {
  return $dict($kw({"name": co.name, "nat": co.nat, "age": co.age, "prestige": r1(co.prestige), "personality": co.personality, "skill": co.skill, "titles": co.titles, "cups": co.cups, "cwc": co.cwc, "seasons": co.seasons, "win": $round($mul(co.win_pct, 100)), "w": co.w, "d": co.d, "l": co.l}));
}
function v_status() {
  let w;
  w = ST.world;
  if ((w == null)) {
    return $dict($kw({"has_world": false, "god": ST.god, "saves": list_saves(), "stop_items": (() => { const $r = []; let k, t; for (const $c0 of $iter(STOP_ITEMS)) { [k, t] = $iter($c0); $r.push($dict($kw({"key": k, "text": t}))); } return $r; })(), "rules": rule_defaults()}));
  }
  return $dict($kw({"has_world": true, "god": ST.god, "header": header(w), "stops": stops_view(), "saves": list_saves(), "stop_items": (() => { const $r = []; let k, t; for (const $c0 of $iter(STOP_ITEMS)) { [k, t] = $iter($c0); $r.push($dict($kw({"key": k, "text": t}))); } return $r; })(), "leagues": $sorted(w.leagues), "seasons_played": $len(w.hist)}));
}
function stops_view() {
  let s;
  s = ST.stops;
  return $dict($kw({"on": $sorted(s.on), "n": s.n, "leagues": $sorted(s.leagues), "presets": (() => { const $r = new $Dict(); let k, v; for (const $c0 of $iter($M.items(PRESETS))) { [k, v] = $iter($c0); $r.set(k, $sorted(v)); } return $r; })()}));
}
function rule_defaults() {
  let cfg;
  cfg = $new(S.Settings, []);
  return (() => { const $r = new $Dict(); let k, v; for (const $c0 of $iter($M.items(cfg.__dict__))) { [k, v] = $iter($c0); if (!((k !== "label") && $isinstance(v, [$int, $float, $str, $bool]))) continue; $r.set(k, v); } return $r; })();
}
function v_world() {
  let L, avg, best_c, best_l, best_n, cc, cf, cid, conts, extra, last, lc, leagues, ln, quick, rich, summer, top, w, x;
  w = need_world();
  avg = w.league_avgs();
  conts = [];
  for (const $f1 of $iter(CONF_ORDER)) {
    cf = $f1;
    leagues = [];
    for (const $f2 of $iter($M.items(w.leagues))) {
      [ln, L] = $iter($f2);
      if ((!$eq($idx(L, "confed"), cf))) {
        continue;
      }
      lc = $idx(w.comps, ("L:" + $str(ln)));
      top = $idx(lc.standings(), 0);
      $M.append(leagues, $dict($kwx([["name", ln], ["clubs", $len($idx(L, "clubs"))], ["avg", r1($idx(avg, ln))], ["leader", top], ["pts", $idx($idx(lc.st, top), "pts")]], [comp_progress(w, lc)])));
    }
    extra = [];
    if (($in(cf, w.cups))) {
      cc = $idx(w.comps, ("C:" + $str(cf)));
      $M.append(extra, $dict($kwx([["id", cc.id], ["title", cc.title], ["kind", "cup"]], [comp_progress(w, cc)])));
    }
    for (const $f3 of $iter($M.items(w.comps))) {
      [cid, x] = $iter($f3);
      if ((($in(x.kind, ["qual", "ct", "nl"])) && ($eq(x.confed, cf)))) {
        $M.append(extra, $dict($kwx([["id", cid], ["title", x.title], ["kind", x.kind]], [comp_progress(w, x)])));
      }
    }
    $M.append(conts, $dict($kw({"code": cf, "name": $idx(S.CONTINENT, cf), "leagues": leagues, "comps": extra, "nations": $sum((() => { const $r = []; let n; for (const $c0 of $iter($M.values(w.nations))) { n = $c0; if (!($eq($idx(n, "confed"), cf))) continue; $r.push(1); } return $r; })())})));
  }
  summer = [];
  for (const $f4 of $iter($M.items(w.comps))) {
    [cid, x] = $iter($f4);
    if (($in(x.kind, ["cwc", "wc", "ic"]))) {
      $M.append(summer, $dict($kwx([["id", cid], ["title", x.title], ["kind", x.kind]], [comp_progress(w, x)])));
    }
  }
  last = ($T(w.hist) ? $idx(w.hist, (-1)) : null);
  best_l = $max(avg, $kw({"key": avg.get}));
  best_c = $max(w.clubs, $kw({"key": ((n) => $idx($idx(w.clubs, n), "eff"))}));
  best_n = $max(w.nations, $kw({"key": ((n) => $idx($idx(w.nations, n), "eff"))}));
  rich = $max(w.clubs, $kw({"key": ((n) => $idx($idx(w.clubs, n), "budget"))}));
  quick = $dict($kw({"league": $dict($kw({"name": best_l, "avg": r1($idx(avg, best_l))})), "club": $dict($kw({"name": best_c, "eff": r1($idx($idx(w.clubs, best_c), "eff"))})), "nation": $dict($kw({"name": best_n, "eff": r1($idx($idx(w.nations, best_n), "eff"))})), "rich": $dict($kw({"name": rich, "budget": mx($idx($idx(w.clubs, rich), "budget"))})), "clubs": $len(w.clubs), "players": $len(w.players), "nations": $len(w.nations)}));
  return $dict($kw({"header": header(w), "continents": conts, "summer": summer, "quick": quick, "last": ($T(last) ? $dict($kw({"season": $idx(last, "season"), "champs": $idx(last, "champs"), "cups": (() => { const $r = new $Dict(); let a, b, c, $t1; for (const $c0 of $iter($M.items($idx(last, "cups")))) { ($t1 = $iter($c0), c = $t1[0], [a, b] = $iter($t1[1])); $r.set(c, $dict($kw({"winner": a, "runner_up": b, "name": $idx($idx(w.cups, c), "name")}))); } return $r; })(), "cwc": $idx(last, "cwc"), "wc": $idx(last, "wc")})) : null)}));
}
function v_charts() {
  let latest, seasons, top, w;
  w = need_world();
  if ((!$T(w.hist))) {
    return $dict($kw({"seasons": [], "leagues": new $Dict()}));
  }
  seasons = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; $r.push($idx(r, "season")); } return $r; })();
  latest = $M.get($idx(w.hist, (-1)), "lavg", new $Dict());
  top = $slice($sorted(latest, $kw({"key": ((ln) => (-$idx(latest, ln)))})), null, 8, null);
  return $dict($kw({"seasons": seasons, "leagues": (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(top)) { ln = $c0; $r.set(ln, (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; $r.push($M.get($M.get(r, "lavg", new $Dict()), ln)); } return $r; })()); } return $r; })()}));
}
function v_map() {
  let L, avg, clubs, ln, out, rows, w;
  w = need_world();
  avg = w.league_avgs();
  out = [];
  for (const $f5 of $iter($M.items(w.leagues))) {
    [ln, L] = $iter($f5);
    rows = w.table_rows(ln);
    clubs = (() => { const $r = []; let r; for (const $c0 of $iter(rows)) { r = $c0; if (!($in($idx(r, "club"), GEO))) continue; $r.push($dict($kw({"name": $idx(r, "club"), "lat": $idx($idx(GEO, $idx(r, "club")), 0), "lon": $idx($idx(GEO, $idx(r, "club")), 1), "ovr": $idx(r, "ovr"), "pos": $idx(r, "pos"), "pts": $idx(r, "pts")}))); } return $r; })();
    $M.append(out, $dict($kw({"name": ln, "confed": $idx(L, "confed"), "avg": r1($idx(avg, ln)), "leader": $idx($idx(rows, 0), "club"), "pts": $idx($idx(rows, 0), "pts"), "clubs": clubs, "progress": comp_progress(w, $idx(w.comps, ("L:" + $str(ln))))})));
  }
  return $dict($kw({"leagues": out, "header": header(w), "continent_names": S.CONTINENT}));
}
function v_continent(code) {
  let c;
  need_world();
  for (const $f6 of $iter($idx(v_world(), "continents"))) {
    c = $f6;
    if (($eq($idx(c, "code"), code))) {
      return c;
    }
  }
  throw $new(ApiError, ["unknown continent", 404]);
}
function v_league(ln) {
  let L, a, ag, champs, cid, cup, fdate, form, h, hg, last, last_date, lc, md, next_date, nxt, part, r, rows, w, $t1;
  w = need_world();
  if ((!$in(ln, w.leagues))) {
    throw $new(ApiError, ["unknown league", 404]);
  }
  L = $idx(w.leagues, ln);
  lc = $idx(w.comps, ("L:" + $str(ln)));
  rows = w.table_rows(ln);
  cid = ("L:" + $str(ln));
  last = ($T(lc.results) ? (() => { const $r = []; let a, ag, h, hg; for (const $c0 of $iter($idx(lc.results, (-1)))) { [h, a, hg, ag] = $iter($c0); $r.push($dict($kw({"h": h, "a": a, "hg": hg, "ag": ag}))); } return $r; })() : []);
  form = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter($idx(L, "clubs"))) { n = $c0; $r.set(n, []); } return $r; })();
  for (const $f7 of $iter(lc.all_results())) {
    md = $f7;
    for (const $f8 of $iter(md)) {
      [h, a, hg, ag] = $iter($f8);
      $M.append($idx(form, h), ($gt(hg, ag) ? "W" : (($eq(hg, ag)) ? "D" : "L")));
      $M.append($idx(form, a), ($gt(ag, hg) ? "W" : (($eq(hg, ag)) ? "D" : "L")));
    }
  }
  for (const $f9 of $iter(rows)) {
    r = $f9;
    $setidx(r, "form", $M.join("", $slice($idx(form, $idx(r, "club")), (-5), null, null)));
    $setidx(r, "gd", $sub($idx(r, "gf"), $idx(r, "ga")));
  }
  nxt = [];
  if ($lt(lc.ptr, $len(lc.rounds))) {
    part = ($T($t1 = lc.partial) ? $t1 : []);
    nxt = (() => { const $r = []; let a, h, i, $t1; for (const $c0 of $iter($enumerate($idx(lc.rounds, lc.ptr)))) { ($t1 = $iter($c0), i = $t1[0], [h, a] = $iter($t1[1])); $r.push($dict($kwx([["h", h], ["a", a], ["ho", $idx($idx(w.clubs, h), "ovr")], ["ao", $idx($idx(w.clubs, a), "ovr")]], [($lt(i, $len(part)) ? $dict($kw({"hg": $idx($idx(part, i), 2), "ag": $idx($idx(part, i), 3)})) : new $Dict())]))); } return $r; })();
  }
  last_date = ((lc.ptr > 0) ? ev_date(w, lc, $idx(lc.events, (lc.ptr - 1))) : null);
  next_date = ($lt(lc.ptr, $len(lc.events)) ? ev_date(w, lc, $idx(lc.events, lc.ptr)) : null);
  fdate = (() => { const $r = new $Dict(); let f; for (const $c0 of $iter($getattr(w, "finals", []))) { f = $c0; $r.set([$idx(f, "season"), $idx(f, "title")], $idx(f, "date")); } return $r; })();
  champs = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; $r.push($dict($kw({"season": $idx(r, "season"), "club": $idx($idx(r, "champs"), ln), "coach": $M.get($idx(r, "champ_coach"), ln), "pts": $idx($idx($idx(r, "pts"), ln), $idx($idx(r, "champs"), ln)), "date": $M.get(fdate, [$idx(r, "season"), ln])}))); } return $r; })();
  cup = $M.get($M.get(w.cups, $idx(L, "confed"), new $Dict()), "name", "cup");
  return $dict($kw({"name": ln, "confed": $idx(L, "confed"), "games": $idx(L, "games"), "slots": $idx(L, "slots"), "cup": cup, "header": header(w), "progress": comp_progress(w, lc), "rows": rows, "last": last, "next": nxt, "last_date": last_date, "next_date": next_date, "emblem": T.spec_league(ln), "tv": $idx(L, "tvmult"), "champs": $slice(champs, null, null, (-1)), "seasons": (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; $r.push($idx(r, "season")); } return $r; })(), "id": cid, "avg": r1($idx(w.league_avgs(), ln)), "tvmult": $idx(L, "tvmult")}));
}
function v_league_season(ln, season) {
  let r, w;
  w = need_world();
  for (const $f10 of $iter(w.hist)) {
    r = $f10;
    if ((($eq($idx(r, "season"), season)) && ($in(ln, $idx(r, "tables_full"))))) {
      return $dict($kw({"name": ln, "season": season, "rows": $idx($idx(r, "tables_full"), ln), "champion": $idx($idx(r, "champs"), ln), "coach": $M.get($idx(r, "champ_coach"), ln)}));
    }
  }
  throw $new(ApiError, ["no such season", 404]);
}
function v_club(name) {
  let c, co, cups, cwc, fin, ln_, r, recent, row, sq, t, titles, top11, w;
  w = need_world();
  if ((!$in(name, w.clubs))) {
    throw $new(ApiError, ["unknown club", 404]);
  }
  w.ensure_uids();
  c = $idx(w.clubs, name);
  co = $idx(c, "coach");
  sq = $sorted((() => { const $r = []; let p; for (const $c0 of $iter(w.players)) { p = $c0; if (!($eq(p.club, name))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => [(-p.ovr), p.name])}));
  recent = $slice($slice((() => { const $r = []; let t; for (const $c0 of $iter(w.transfers)) { t = $c0; if (!(($eq($idx(t, "frm"), name)) || ($eq($idx(t, "to"), name)))) continue; $r.push(t); } return $r; })(), (-12), null, null), null, null, (-1));
  titles = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($eq($M.get($idx(r, "champs"), $idx(c, "league")), name))) continue; $r.push($idx(r, "season")); } return $r; })();
  cups = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($eq($idx($M.get($idx(r, "cups"), $idx(c, "confed"), [null]), 0), name))) continue; $r.push($idx(r, "season")); } return $r; })();
  cwc = (() => { const $r = []; let a, b, s; for (const $c0 of $iter(w.cwc_history)) { [s, a, b] = $iter($c0); if (!($eq(a, name))) continue; $r.push(s); } return $r; })();
  fin = [];
  for (const $f11 of $iter(w.hist)) {
    r = $f11;
    for (const $f12 of $iter($M.items($idx(r, "tables_full")))) {
      [ln_, t] = $iter($f12);
      for (const $f13 of $iter(t)) {
        row = $f13;
        if (($eq($idx(row, "club"), name))) {
          $M.append(fin, $dict($kw({"season": $idx(r, "season"), "pos": $idx(row, "pos"), "pts": $idx(row, "pts")})));
        }
      }
    }
  }
  top11 = $div($sum((() => { const $r = []; let p; for (const $c0 of $iter($slice(sq, null, 11, null))) { p = $c0; $r.push(p.ovr); } return $r; })()), $max(1, $len($slice(sq, null, 11, null))));
  return $dict($kw({"name": name, "league": $idx(c, "league"), "confed": $idx(c, "confed"), "ovr": $idx(c, "ovr"), "eff": r1($idx(c, "eff")), "base": $idx(c, "base"), "stature": r1($idx(c, "stature")), "prestige_pts": r1($idx(c, "cp")), "budget": mx($idx(c, "budget")), "income": mx($idx(c, "income")), "prize_prev": mx($idx(c, "prize_prev")), "funds": mx($idx(c, "funds")), "sold": mx($idx(c, "sales_prev")), "bought": mx($idx(c, "spent_prev")), "last_finish": $idx(c, "last_finish"), "coach": $dict(coach_row(co), $kw({"stint": $idx(c, "stint"), "hot": $ge(co.hot, (w.cfg.hot_tolerance - 3))})), "squad": (() => { const $r = []; let p; for (const $c0 of $iter(sq)) { p = $c0; $r.push(player_row(w, p)); } return $r; })(), "squad_size": $len(sq), "top11": r1(top11), "transfers": (() => { const $r = []; let t; for (const $c0 of $iter(recent)) { t = $c0; $r.push($dict($kw({"season": $idx(t, "season"), "dir": (($eq($idx(t, "to"), name)) ? "IN" : "OUT"), "player": $idx(t, "player"), "ovr": $idx(t, "ovr"), "age": $idx(t, "age"), "other": (($eq($idx(t, "to"), name)) ? $idx(t, "frm") : $idx(t, "to")), "fee": mx($idx(t, "fee")), "kind": $idx(t, "kind")}))); } return $r; })(), "titles": titles, "cups": cups, "cwc": cwc, "finishes": $slice($slice(fin, (-20), null, null), null, null, (-1)), "trophies": T.club_trophies(w, name), "league_emblem": T.spec_league($idx(c, "league")), "finance": club_finance(w, c, name)}));
}
function v_player(uid) {
  let cups, cur, p, retired, seasons, tot, w;
  w = need_world();
  p = w.player_by_uid($int(uid));
  if ((p == null)) {
    throw $new(ApiError, ["unknown player", 404]);
  }
  retired = (!$in(p, w.players));
  seasons = (() => { const $r = []; let s; for (const $c0 of $iter($getattr(p, "stats", []))) { s = $c0; $r.push($dict($kw({"season": $idx(s, 0), "club": $idx(s, 1), "goals": $idx(s, 2), "assists": $idx(s, 3), "cs": $idx(s, 4)}))); } return $r; })();
  cups = (() => { const $r = []; let s; for (const $c0 of $iter($getattr(p, "cstats", []))) { s = $c0; $r.push($dict($kw({"season": $idx(s, 0), "comp": $idx(s, 1), "team": $idx(s, 2), "goals": $idx(s, 3), "assists": $idx(s, 4), "cs": $idx(s, 5)}))); } return $r; })();
  cur = ((!$T(retired)) ? cur_stats(w, p) : null);
  if ((cur != null)) {
    $M.append(seasons, $dict($kw({"season": w.season, "club": p.club, "goals": $idx(cur, 0), "assists": $idx(cur, 1), "cs": $idx(cur, 2), "live": true})));
  }
  tot = $dict($kw({"goals": $add($sum((() => { const $r = []; let x; for (const $c0 of $iter(seasons)) { x = $c0; $r.push($idx(x, "goals")); } return $r; })()), $sum((() => { const $r = []; let x; for (const $c0 of $iter(cups)) { x = $c0; $r.push($idx(x, "goals")); } return $r; })())), "assists": $add($sum((() => { const $r = []; let x; for (const $c0 of $iter(seasons)) { x = $c0; $r.push($idx(x, "assists")); } return $r; })()), $sum((() => { const $r = []; let x; for (const $c0 of $iter(cups)) { x = $c0; $r.push($idx(x, "assists")); } return $r; })())), "cs": $add($sum((() => { const $r = []; let x; for (const $c0 of $iter(seasons)) { x = $c0; $r.push($idx(x, "cs")); } return $r; })()), $sum((() => { const $r = []; let x; for (const $c0 of $iter(cups)) { x = $c0; $r.push($idx(x, "cs")); } return $r; })()))}));
  return $dict(player_row(w, p), $kw({"uid": p.uid, "retired": retired, "career": (() => { const $r = []; let c; for (const $c0 of $iter(p.career)) { c = $c0; $r.push($dict($kw({"season": $idx(c, 0), "club": $idx(c, 1), "ovr": $idx(c, 2)}))); } return $r; })(), "honours": (() => { const $r = []; let h; for (const $c0 of $iter(p.honours)) { h = $c0; $r.push($dict($kw({"season": $idx(h, 0), "kind": $idx(h, 1), "title": $idx(h, 2)}))); } return $r; })(), "seasons": seasons, "cups": cups, "totals": tot, "league": p.league}));
}
function v_players(q) {
  let club, key, keyf, league, lim, n, nat, off, pool, pos, txt, w, $t1, $t2, $t3, $t4;
  w = need_world();
  w.ensure_uids();
  txt = $M.lower($M.strip(($T($t1 = $M.get(q, "q")) ? $t1 : "")));
  [pos, nat, club, league] = $iter([$M.get(q, "pos"), $M.get(q, "nat"), $M.get(q, "club"), $M.get(q, "league")]);
  pool = (() => { const $r = []; let p, $t1; for (const $c0 of $iter(w.players)) { p = $c0; if (!$T(($T($t1 = p.club) ? $t1 : $M.get(q, "free")))) continue; $r.push(p); } return $r; })();
  if ($T(txt)) {
    pool = (() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; if (!($in(txt, $M.lower(p.name)))) continue; $r.push(p); } return $r; })();
  }
  if ($T(pos)) {
    pool = (() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; if (!($eq(p.pos, pos))) continue; $r.push(p); } return $r; })();
  }
  if ($T(nat)) {
    pool = (() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; if (!($eq(p.nat, nat))) continue; $r.push(p); } return $r; })();
  }
  if ($T(club)) {
    pool = (() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; if (!($eq(p.club, club))) continue; $r.push(p); } return $r; })();
  }
  if ($T(league)) {
    pool = (() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; if (!($eq(p.league, league))) continue; $r.push(p); } return $r; })();
  }
  if ($T($M.get(q, "maxage"))) {
    pool = (() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; if (!$le(p.age, $int($idx(q, "maxage")))) continue; $r.push(p); } return $r; })();
  }
  key = ($T($t2 = $M.get(q, "sort")) ? $t2 : "ovr");
  keyf = $M.get($lit_dict([["ovr", ((p) => (-p.ovr))], ["pot", ((p) => (-p.pot))], ["age", ((p) => p.age)], ["value", ((p) => (-w.fee_for(p)))], ["wage", ((p) => (-p.wage))], ["goals", ((p) => { let $t1; return (-$idx(($T($t1 = cur_stats(w, p)) ? $t1 : [0, 0, 0]), 0)); })], ["assists", ((p) => { let $t1; return (-$idx(($T($t1 = cur_stats(w, p)) ? $t1 : [0, 0, 0]), 1)); })], ["name", ((p) => p.name)]]), key, ((p) => (-p.ovr)));
  $M.sort(pool, $kw({"key": ((p) => [keyf(p), p.name])}));
  n = $len(pool);
  lim = $min(200, $int(($T($t3 = $M.get(q, "limit")) ? $t3 : 100)));
  off = $int(($T($t4 = $M.get(q, "offset")) ? $t4 : 0));
  return $dict($kw({"total": n, "rows": (() => { const $r = []; let p; for (const $c0 of $iter($slice(pool, off, $add(off, lim), null))) { p = $c0; $r.push(player_row(w, p)); } return $r; })(), "nations": $sorted((() => { const $r = new $Set(); let p; for (const $c0 of $iter(w.players)) { p = $c0; $r.add(p.nat); } return $r; })()), "leagues": $sorted(w.leagues)}));
}
function comp_emblem(cid, comp) {
  let k;
  k = $idx($M.split(cid, ":"), 0);
  if ((k === "L")) {
    return T.spec_league($slice(cid, 2, null, null));
  }
  if ((k === "C")) {
    return T.spec_cup($slice(cid, 2, null, null));
  }
  if ((k === "CT")) {
    return T.spec_ct($idx($M.split(cid, ":"), 2));
  }
  if ((k === "NL")) {
    return T.spec_nl($idx($M.split(cid, ":"), 2));
  }
  return ((k === "CWC") ? T.SPEC_CWC : T.SPEC_WC);
}
function v_compsum(cid, season = null) {
  let c, co, fin, out, r, st, t, txt, w, $t1, $t2;
  w = need_world();
  if ($T(season)) {
    for (const $f14 of $iter(w.hist)) {
      r = $f14;
      if ($T(($T($t1 = ($eq($idx(r, "season"), season))) ? ($T($t2 = $M.get(r, "awards")) ? ($in(cid, $M.get($idx(r, "awards"), "comps", new $Dict()))) : $t2) : $t1))) {
        out = $dict($idx($idx($idx(r, "awards"), "comps"), cid));
        $setidx(out, "emblem", comp_emblem(cid, null));
        $setidx(out, "season", season);
        $setidx(out, "season_label", cal.season_label(w.cfg.start_year, season));
        return out;
      }
    }
    throw $new(ApiError, ["no statistics stored for that season", 404]);
  }
  if (((!$in(cid, w.comps)) || (!$in($idx(w.comps, cid).kind, ["league", "cup", "cwc", "wc", "ct", "nl"])))) {
    throw $new(ApiError, ["no statistics for this competition", 404]);
  }
  c = $idx(w.comps, cid);
  out = compstats.public(compstats.comp_stats(w, cid));
  $setidx(out, "emblem", comp_emblem(cid, c));
  if (($idx(out, "kind") === "league")) {
    st = c.standings();
    $setidx(out, "top3", (() => { const $r = []; let n; for (const $c0 of $iter($slice(st, null, 3, null))) { n = $c0; $r.push($dict($kw({"team": n, "pts": $idx($idx(c.st, n), "pts"), "w": $idx($idx(c.st, n), "w"), "d": $idx($idx(c.st, n), "d"), "l": $idx($idx(c.st, n), "l")}))); } return $r; })());
    co = ($T(st) ? $idx($idx(w.clubs, $idx(st, 0)), "coach") : null);
    $setidx(out, "winner_coach", ($T(co) ? co.name : null));
  } else {
    fin = (() => { const $r = []; let t; for (const $c0 of $iter(c.tlog)) { t = $c0; if (!($idx(t, "left") === 2)) continue; $r.push(t); } return $r; })();
    if ($T(fin)) {
      t = $idx(fin, (-1));
      txt = $M.join(" / ", (() => { const $r = []; let x, y; for (const $c0 of $iter($idx(t, "legs"))) { [x, y] = $iter($c0); $r.push(($str(x) + "-" + $str(y))); } return $r; })());
      $setidx(out, "final", $add(txt, ($T($idx(t, "how")) ? ((" (" + $idx(t, "how")) + ")") : "")));
    }
  }
  $setidx(out, "season", w.season);
  $setidx(out, "season_label", cal.season_label(w.cfg.start_year, w.season));
  // 16.1: how many titles the winner holds now (the star moment on the champion screen); the World Cup is counted on the nation, the Club World Cup from the history
  if ($T($idx(out, "winner")) && c.finished) {
    if ($idx(out, "kind") === "wc" && $in($idx(out, "winner"), w.nations)) $setidx(out, "star_n", $idx($idx(w.nations, $idx(out, "winner")), "wc_titles"));
    else if ($idx(out, "kind") === "cwc") $setidx(out, "star_n", w.cwc_history.filter((x) => $eq(x[1], $idx(out, "winner"))).length);
  }
  return out;
}
function bracket_upcoming(w, x) {
  let cur, ev, n, pairs, $t1, $t2, $t3;
  if ($T(($T($t1 = (!$T(x.has_event(w.season)))) ? $t1 : w.missing(x)))) {
    return [];
  }
  ev = $idx(x.events, x.ptr);
  if ((x.kind === "cup")) {
    cur = x.current;
    if (($M.get(ev, "leg") === 2)) {
      return (() => { const $r = []; let a, b; for (const $c0 of $iter(x.pairs)) { [a, b] = $iter($c0); if (!($in([a, b], x.leg1))) continue; $r.push($dict($kw({"a": a, "b": b, "legs": [$list($idx(x.leg1, [a, b]))], "name": round_name_($len(cur))}))); } return $r; })();
    }
    n = $len(cur);
    return (() => { const $r = []; let i; for (const $c0 of $iter($range(Math.floor(n / 2)))) { i = $c0; $r.push($dict($kw({"a": $idx(cur, i), "b": $idx(cur, $sub((n - 1), i)), "legs": [], "name": round_name_(n)}))); } return $r; })();
  }
  if ((x.kind === "nl")) {
    pairs = (($M.get(ev, "phase") === "sf") ? x.sf : (($len(x.ko_current) > 1) ? [[$idx(x.ko_current, 0), $idx(x.ko_current, 1)]] : []));
    return (() => { const $r = []; let a, b; for (const $c0 of $iter(pairs)) { [a, b] = $iter($c0); $r.push($dict($kw({"a": a, "b": b, "legs": [], "name": round_name_((($M.get(ev, "phase") === "sf") ? 4 : 2))}))); } return $r; })();
  }
  if ($T(($T($t2 = ($in(x.kind, ["wc", "ct", "cwc"]))) ? ($T($t3 = ($M.get(ev, "phase") === "ko")) ? x.ko_current : $t3) : $t2))) {
    cur = x.ko_current;
    n = $len(cur);
    return (() => { const $r = []; let i; for (const $c0 of $iter($range(Math.floor(n / 2)))) { i = $c0; $r.push($dict($kw({"a": $idx(cur, i), "b": $idx(cur, $sub((n - 1), i)), "legs": [], "name": round_name_(n)}))); } return $r; })();
  }
  return [];
}
function round_name_(n) {
  return C.round_name(n);
}
function v_comp(cid) {
  let g, gr, lab, out, rank, w, x, $t1, $t2;
  w = need_world();
  if ((!$in(cid, w.comps))) {
    throw $new(ApiError, ["unknown competition", 404]);
  }
  x = $idx(w.comps, cid);
  if ((($in(x.kind, ["cwc", "wc", "ic"])) && (!$T(w.missing(x))))) {
    x.ensure_prepared();
  }
  out = $dict($kw({"id": cid, "title": x.title, "kind": x.kind, "header": header(w), "progress": comp_progress(w, x)}));
  $setidx(out, "emblem", ((x.kind === "cup") ? T.spec_cup(x.confed) : ((x.kind === "cwc") ? T.SPEC_CWC : ((x.kind === "wc") ? T.SPEC_WC : ((x.kind === "ct") ? T.spec_ct(x.confed) : ((x.kind === "nl") ? T.spec_nl(x.confed) : $dict($kw({"kind": "cup_eared", "color": $M.get(T.CONF_COLOR, $getattr(x, "confed", "WORLD"), "#cfd8dc")}))))))));
  $setidx(out, "past_finals", $slice((() => { const $r = []; let f; for (const $c0 of $iter($getattr(w, "finals", []))) { f = $c0; if (!($eq($idx(f, "title"), x.title))) continue; $r.push(f); } return $r; })(), null, null, (-1)));
  if ((x.kind === "cup")) {
    $setidx(out, "field", (() => { const $r = []; let n; for (const $c0 of $iter(x.field)) { n = $c0; $r.push($dict($kw({"club": n, "ovr": $idx($idx(w.clubs, n), "ovr"), "league": $idx($idx(w.clubs, n), "league"), "reached": $M.get(x.reached, n, 0)}))); } return $r; })());
    $setidx(out, "ties", (() => { const $r = []; let t; for (const $c0 of $iter(x.ties)) { t = $c0; $r.push($dict($kw({"round": $idx(t, 0), "a": $idx(t, 1), "b": $idx(t, 2), "text": $idx(t, 3), "winner": $idx(t, 4)}))); } return $r; })());
    ($t1 = $iter([x.winner, x.runner_up]), $setidx(out, "winner", $t1[0]), $setidx(out, "runner_up", $t1[1]));
    $setidx(out, "bracket", $dict($kw({"ties": x.tlog, "upcoming": bracket_upcoming(w, x), "size": ($T(x.field) ? x.size : 0), "rounds": ($T(x.field) ? (() => { const $r = []; let r; for (const $c0 of $iter($range($max(0, x.rounds_total)))) { r = $c0; $r.push(round_name_($shr(x.size, r))); } return $r; })() : [])})));
  } else if ((x.kind === "qual")) {
    $setidx(out, "host", x.host);
    $setidx(out, "slots", x.slots);
    $setidx(out, "groups", (() => { const $r = []; let g; for (const $c0 of $iter(x.groups)) { g = $c0; $r.push((() => { const $r = []; let n; for (const $c0 of $iter(x.group_rank(g))) { n = $c0; $r.push($dict($kw({"nation": n, "pts": $idx($idx(x.tab, n), "pts"), "p": $idx($idx(x.tab, n), "p"), "gf": $idx($idx(x.tab, n), "gf"), "ga": $idx($idx(x.tab, n), "ga")}))); } return $r; })()); } return $r; })());
    $setidx(out, "qualified", $list(x.qualified));
  } else if ((x.kind === "ic")) {
    $setidx(out, "qualified", $list(x.qualified));
    $setidx(out, "spots", x.spots);
    $setidx(out, "field", $list(x.field));
  } else if (($in(x.kind, ["wc", "ct", "nl", "cwc"]))) {
    $setidx(out, "host", $getattr(x, "host", null));
    if ((x.kind === "cwc")) {
      $setidx(out, "clubs", true);
      $setidx(out, "format", $dict($kw({"clubs": $len(x.field), "groups": $len(x.groups), "pool": x.w.cfg.cwc_pool * x.w.cfg.cup_prize_scale * x.w.cfg.money_x, "slots": (() => { const $r = new $Dict(); for (const [cf, cup] of $M.items(x.w.cups)) $r.set(cf, $M.get(cup, "cwc_slots", 0)); return $r; })()})));
      $setidx(out, "qual", (() => { const $r = new $Dict(); for (const [n, h] of $M.items(x.qual)) $r.set(n, h); return $r; })());
    }
    if ((x.kind === "nl")) {
      $setidx(out, "has_finals", x.has_finals);
    }
    ($t2 = $iter([x.winner, x.runner_up]), $setidx(out, "winner", $t2[0]), $setidx(out, "runner_up", $t2[1]));
    gr = [];
    for (const $f15 of $iter(x.groups)) {
      g = $f15;
      rank = ($T(x.gtab) ? x.grp_rank(g) : $list(g));
      $M.append(gr, $dict($kw({"teams": (() => { const $r = []; let n; for (const $c0 of $iter(rank)) { n = $c0; $r.push($dict($kw({"nation": n, "p": $idx($idx(x.gtab, n), "p"), "pts": $idx($idx(x.gtab, n), "pts"), "gf": $idx($idx(x.gtab, n), "gf"), "ga": $idx($idx(x.gtab, n), "ga"), "eff": r1($idx(x.eff, n))}))); } return $r; })(), "matches": (() => { const $r = []; let a, b, m, sa, sb; for (const $c0 of $iter(x.glog)) { [m, a, b, sa, sb] = $iter($c0); if (!($in(a, g))) continue; $r.push($dict($kw({"md": m, "a": a, "b": b, "sa": sa, "sb": sb}))); } return $r; })()})));
    }
    if ((x.kind === "nl")) {
      for (const $f16 of $iter($zip(gr, x.labels))) {
        [g, lab] = $iter($f16);
        $setidx(g, "label", lab);
      }
    }
    $setidx(out, "groups", gr);
    $setidx(out, "ties", (() => { const $r = []; let t; for (const $c0 of $iter(x.ties)) { t = $c0; $r.push($dict($kw({"round": $idx(t, 0), "a": $idx(t, 1), "b": $idx(t, 2), "text": $idx(t, 3), "winner": $idx(t, 4)}))); } return $r; })());
    $setidx(out, "bracket", $dict($kw({"ties": x.tlog, "upcoming": bracket_upcoming(w, x), "size": $getattr(x, "ko_size", 0), "rounds": ($T($getattr(x, "ko_size", 0)) ? (() => { const $r = []; let r; for (const $c0 of $iter($range(x.ko_rounds))) { r = $c0; $r.push(round_name_($shr(x.ko_size, r))); } return $r; })() : [])})));
  }
  return out;
}
function v_nations(confed = null) {
  let rows, w;
  w = need_world();
  rows = (() => { const $r = []; let n; for (const $c0 of $iter($M.values(w.nations))) { n = $c0; if (!((!$T(confed)) || ($eq($idx(n, "confed"), confed)))) continue; $r.push(n); } return $r; })();
  $M.sort(rows, $kw({"key": ((n) => (-$idx(n, "eff")))}));
  return $dict($kw({"rows": (() => { const $r = []; let i, n; for (const $c0 of $iter($enumerate(rows, 1))) { [i, n] = $iter($c0); $r.push($dict($kw({"rank": i, "name": $idx(n, "name"), "confed": $idx(n, "confed"), "rating": r1($idx(n, "eff")), "pros": $idx(w.nat_pros, $idx(n, "name")), "talent": r1($idx(n, "dev")), "titles": $idx(n, "wc_titles"), "rank_pts": $round($M.get($getattr(w, "nat_hist", new $Dict()), $idx(n, "name"), 0.0)), "apps": $idx(n, "wc_apps"), "coach": $idx(n, "coach").name, "coach_prestige": r1($idx(n, "coach").prestige)}))); } return $r; })()}));
}
function v_nation(name) {
  let n, top, w;
  w = need_world();
  w.ensure_uids();
  n = $M.get(w.nations, name);
  if ((!$T(n))) {
    throw $new(ApiError, ["unknown nation", 404]);
  }
  top = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(w.players)) { p = $c0; if (!($eq(p.nat, name))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-p.ovr))})), null, 23, null);
  return $dict($kw({"name": name, "confed": $idx(n, "confed"), "rating": r1($idx(n, "eff")), "talent": r1($idx(n, "dev")), "base": $idx(n, "base"), "pros": $idx(w.nat_pros, name), "titles": $idx(n, "wc_titles"), "apps": $idx(n, "wc_apps"), "coach": coach_row($idx(n, "coach")), "players": (() => { const $r = []; let p; for (const $c0 of $iter(top)) { p = $c0; $r.push(player_row(w, p)); } return $r; })(), "trophies": T.nation_trophies(w, name), "federation": $mods.fed.info(w, name)}));
}
function v_news() {
  let w;
  w = need_world();
  return $dict($kw({"items": (() => { const $r = []; let k, s, t, wk; for (const $c0 of $iter($slice($slice(w.news_log, (-80), null, null), null, null, (-1)))) { [s, wk, k, t] = $iter($c0); $r.push($dict($kw({"season": s, "week": wk, "kind": k, "text": t, "date": ((wk <= 60) ? cal.pack(w.date_of(s, wk)) : null)}))); } return $r; })()}));
}
// ---- v15: finances ----
const LEDGER_KEYS = ["tv", "gate", "sponsor", "prize", "sales", "owner", "income", "wages", "running", "interest", "transfers", "academy", "stadium", "payout", "profit", "cash", "debt"];
function ledger_rows(c) {
  const out = [];
  for (const e of $M.get(c, "ledger", [])) { const row = {"season": $idx(e, "season")}; for (const k of LEDGER_KEYS) row[k] = mx($idx(e, k)); row.acad = $M.get(e, "acad", null); row.cap = $M.get(e, "cap", null); row.fans = $M.get(e, "fans", null); out.push($dict($kw(row))); }
  return out;
}
function payroll_of(w, name) { let t = 0; for (const p of w.players) if (p.club === name) t += p.wage; return t; }
function club_finance(w, c, name) {
  const pay = payroll_of(w, name), bud = $idx(c, "budget"), cap = w.cfg.wage_cap * bud;
  return $dict($kw({"payroll": mx(pay), "wage_ratio": $round(pay / Math.max(1e-9, bud), 3), "wage_cap": w.cfg.wage_cap, "wage_room": mx(Math.max(0, cap - pay)),
    "debt": mx($M.get(c, "debt", 0.0)), "comfort": mx(w.cfg.comfort * $idx(c, "income")), "ledger": ledger_rows(c),
    "academy": academy_info(w, c), "stadium": stadium_info(w, c)}));
}
function academy_info(w, c) {
  const acad = $M.get(c, "acad", 3.0), pri = $M.get(c, "acad_pri", 1.0), target = Math.min(10, 2.5 + 0.045 * $idx(c, "stature") * pri * 1.6), nat = new Map();
  const grads = []; for (const p of $M.get(c, "grads", [])) { grads.push($dict($kw({"name": p.name, "age": p.age, "pos": p.pos, "ovr": p.ovr, "pot": p.pot, "nat": p.nat, "club": p.club || ""})));
    nat.set(p.nat, (nat.get(p.nat) || 0) + 1); }
  const total = grads.length, origins = [...nat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => $dict($kw({"nat": k, "n": v, "share": $round(v / Math.max(1, total), 3)})));
  return $dict($kw({"level": $round(acad, 1), "target": $round(target, 1), "cost": mx(w.cfg.acad_cost * Math.pow(acad, 1.5)), "graduates": grads.slice(-8).reverse(), "origins": origins, "out_this_year": $M.get(c, "acad_out", 0), "scouting": $mods.acad.info(w, c)}));
}
function stadium_info(w, c) {
  const cap = $M.get(c, "cap", 0), fans = $M.get(c, "fans", 0), proj = $M.get(c, "proj", null);
  return $dict($kw({"capacity": $round(cap * 1000, 0), "demand": $round(fans * 1000, 0), "fill": $round(Math.min(cap, fans) / Math.max(1e-9, fans), 3), "turned_away": $round(Math.max(0, fans - cap) * 1000, 0),
    "project": $T(proj) ? $dict($kw({"add": $round($idx(proj, "add") * 1000, 0), "years": $idx(proj, "years"), "left": $idx(proj, "left"), "cost": mx($idx(proj, "cost")), "big": $idx(proj, "big")})) : null,
    "honeymoon": $M.get(c, "honey", 0) > 0, "fans": $round(fans * 1000, 0)}));
}
// ---- v15.2: league pages ----
function league_rev(e) { return $idx(e, "tv") + $idx(e, "gate") + $idx(e, "sponsor") + $idx(e, "prize") + $idx(e, "owner"); }
function v_leaguemoney(ln) {
  const w = need_world();
  if (!$in(ln, w.leagues)) throw $new(ApiError, ["unknown league", 404]);
  const pay = new Map(); for (const p of w.players) if (p.club) pay.set(p.club, (pay.get(p.club) || 0) + p.wage);
  const seasonOf = (c) => { const l = $M.get(c, "ledger", []); return l.length ? $idx(l[l.length - 1], "season") : 0; };
  let ls = 0; for (const [n, c] of $M.items(w.clubs)) ls = Math.max(ls, seasonOf(c));
  const rev = new Map(), prev = new Map(), inc = new Map(), cnt = new Map();   // per league: this season's revenue, last season's revenue, summed club income
  for (const [n, c] of $M.items(w.clubs)) {
    const L = $idx(c, "league");
    for (const e of $M.get(c, "ledger", [])) { const s = $idx(e, "season"); if (s === ls) { rev.set(L, (rev.get(L) || 0) + league_rev(e)); inc.set(L, (inc.get(L) || 0) + $idx(e, "income")); cnt.set(L, (cnt.get(L) || 0) + 1); } else if (s === ls - 1) prev.set(L, (prev.get(L) || 0) + league_rev(e)); }
  }
  const order = [...rev.keys()].sort((a, b) => rev.get(b) - rev.get(a));
  const all = order.map((L, i) => $dict($kw({"league": L, "revenue": mx(rev.get(L)), "avg_income": mx(inc.get(L) / Math.max(1, cnt.get(L))), "tv": $idx($idx(w.leagues, L), "tvmult"), "rank": i + 1})));
  const lg = $idx(w.leagues, ln), names = $idx(lg, "clubs"), cap = w.cfg.wage_cap, sum = {}, rows = [];
  for (const k of LEDGER_KEYS) sum[k] = 0;
  let debtN = 0, overN = 0, ratioSum = 0, profitSum = 0, cashSum = 0, groundSum = 0, nLed = 0;
  for (const n of names) {
    const c = $idx(w.clubs, n), led = $M.get(c, "ledger", []), e = led.length ? led[led.length - 1] : null;
    const payroll = pay.get(n) || 0, bud = Math.max(1e-9, $idx(c, "budget")), ratio = payroll / bud, funds = $idx(c, "funds"), debt = $M.get(c, "debt", 0.0);
    const income = e ? $idx(e, "income") : $idx(c, "income"), profit = e ? $idx(e, "profit") : 0;
    if (e) { for (const k of LEDGER_KEYS) sum[k] += $idx(e, k); nLed++; }
    if (debt > 0) debtN++; if (ratio > cap) overN++;
    ratioSum += ratio; profitSum += profit; cashSum += funds; groundSum += $M.get(c, "cap", 0) * 1000;
    const health = debt > 0 ? "In debt" : (ratio >= 0.9 * cap || funds < 0.5 * income) ? "Tight" : (funds >= income ? "Strong" : "Steady");
    rows.push($dict($kw({"club": n, "income": mx(income), "wage_ratio": $round(ratio, 3), "cash": mx(funds), "profit": mx(profit), "debt": mx(debt), "health": health})));
  }
  rows.sort((a, b) => $idx(b, "income") - $idx(a, "income"));
  const rv = rev.get(ln) || 0, pv = prev.get(ln), growth = (pv ? rv / pv - 1 : null), n = Math.max(1, names.length);
  const state = growth == null ? "no data yet" : (growth < -0.02 ? "Shrinking" : growth < 0.02 ? "Stable" : growth <= 0.05 ? "Growing" : "Overheating");
  const src = {}; for (const k of LEDGER_KEYS) src[k] = mx(sum[k]);
  return $dict($kw({"league": ln, "season": ls, "clubs": names.length, "ledger_clubs": nLed, "revenue": mx(rv), "growth": growth == null ? null : $round(growth, 4), "state": state,
    "rank": order.indexOf(ln) + 1, "of": order.length, "tv": $idx(lg, "tvmult"), "avg_income": mx((inc.get(ln) || 0) / Math.max(1, cnt.get(ln) || 1)),
    "in_debt": debtN, "over_limit": overN, "wage_cap": cap, "avg_wage_ratio": $round(ratioSum / n, 3), "avg_profit": mx(profitSum / n), "avg_cash": mx(cashSum / n), "avg_ground": $round(groundSum / n, 0),
    "sources": $dict($kw(src)), "rows": rows, "leagues": all}));
}
function v_worldmoney() {
  const w = need_world(), by = new Map(), lg = new Map();
  for (const [n, c] of $M.items(w.clubs)) {
    for (const e of $M.get(c, "ledger", [])) {
      const s = $idx(e, "season"); if (!by.has(s)) by.set(s, {season: s, n: 0}); const t = by.get(s); t.n++;
      for (const k of LEDGER_KEYS) t[k] = (t[k] || 0) + $idx(e, k);
      const L = $idx(c, "league"), key = s + "|" + L; if (!lg.has(key)) lg.set(key, {league: L, season: s, rev: 0}); lg.get(key).rev += $idx(e, "tv") + $idx(e, "gate") + $idx(e, "sponsor") + $idx(e, "prize") + $idx(e, "owner");
    }
  }
  const seasons = [...by.values()].sort((a, b) => a.season - b.season).slice(-12), rev = (t) => t.tv + t.gate + t.sponsor + t.prize + t.owner;
  const out = seasons.map((t, i) => { const prev = i ? rev(seasons[i - 1]) : 0; const row = {"season": t.season, "revenue": mx(rev(t)), "growth": prev ? $round(rev(t) / prev - 1, 4) : null}; for (const k of LEDGER_KEYS) row[k] = mx(t[k]); return $dict($kw(row)); });
  const last = seasons.length ? seasons[seasons.length - 1] : null, ls = last ? last.season : null, leagues = [];
  let top = 0; for (const [k, v] of lg) if (v.season === ls) top = Math.max(top, v.rev);
  for (const [k, v] of lg) { if (v.season !== ls) continue; const pv = lg.get((ls - 1) + "|" + v.league); leagues.push($dict($kw({"league": v.league, "revenue": mx(v.rev), "growth": pv ? $round(v.rev / pv.rev - 1, 4) : null, "share": $round(v.rev / Math.max(1e-9, top), 3)}))); }
  leagues.sort((a, b) => $idx(b, "revenue") - $idx(a, "revenue"));
  const piles = []; let over = 0;
  for (const [n, c] of $M.items(w.clubs)) { const r = $idx(c, "funds") / Math.max(1e-9, $idx(c, "income")); if (r > 2.0) over++; piles.push([n, r, $idx(c, "funds")]); }
  piles.sort((a, b) => b[1] - a[1]);
  const growth = out.length ? out[out.length - 1].get_("growth") : null;
  const health = growth == null ? "no data yet" : (growth < -0.02 ? "Shrinking" : growth < 0.02 ? "Stable" : growth <= 0.05 ? "Growing" : "Overheating");
  return $dict($kw({"season": ls, "seasons": out, "leagues": leagues, "health": health, "growth": growth, "money_x": w.cfg.money_x,
    "cash": mx($sum((() => { const r = []; for (const [n, c] of $M.items(w.clubs)) r.push($idx(c, "funds")); return r; })())),
    "debt": mx($sum((() => { const r = []; for (const [n, c] of $M.items(w.clubs)) r.push($M.get(c, "debt", 0.0)); return r; })())),
    "piles": piles.slice(0, 5).map((x) => $dict($kw({"club": x[0], "ratio": $round(x[1], 2), "funds": mx(x[2])}))), "over2x": over, "clubs": $len(w.clubs)}));
}
function v_money() {
  let L, avg, bud, last, ln, rows, w;
  w = need_world();
  avg = w.league_avgs();
  rows = [];
  for (const $f17 of $iter($M.items(w.leagues))) {
    [ln, L] = $iter($f17);
    last = ($T(w.hist) ? $idx($idx($idx(w.hist, (-1)), "champs"), ln) : null);
    bud = $div($sum((() => { const $r = []; let n; for (const $c0 of $iter($idx(L, "clubs"))) { n = $c0; $r.push($idx($idx(w.clubs, n), "budget")); } return $r; })()), $len($idx(L, "clubs")));
    $M.append(rows, $dict($kw({"league": ln, "confed": $idx(L, "confed"), "avg": r1($idx(avg, ln)), "budget": mx(bud), "tv": $idx(L, "tvmult"), "places": $idx(L, "slots"), "champion": last})));
  }
  $M.sort(rows, $kw({"key": ((r) => (-$idx(r, "avg")))}));
  return $dict($kw({"rows": rows}));
}
function v_ledger(season = null, league = null, all = false) {
  const w = need_world();
  if (!$T(w.hist)) return $dict($kw({"season": null}));
  const leagues = [...w.leagues.keysArr()].sort((a, b) => ($idx(w.leagues.get_(b), "prestige") - $idx(w.leagues.get_(a), "prestige")) || (a < b ? -1 : 1)), lg = (league && w.leagues.has(league)) ? league : null;
  const recs = all ? w.hist.slice() : [w.hist[(season && season >= 1 && season <= $len(w.hist) ? season : $len(w.hist)) - 1]];
  const s = all ? "all" : $idx(recs[0], "season"), pool = [], net = new Map(); let n = 0, abroad = 0, total = 0, paid = 0, recv = 0, any = false;
  for (const r of recs) {
    const t = $M.get(r, "transfers"); if (!t) continue; any = true;
    const tl = $M.get(t, "top_lg"), st = lg ? $M.get($M.get(t, "lg_stat", new $Dict()), lg, null) : null;
    const rows = lg ? (tl && tl.has(lg) ? tl.get_(lg) : $M.get(t, "top", []).filter((x) => $idx(x, "frm_league") === lg || $idx(x, "to_league") === lg)) : $M.get(t, "top", []);
    for (const x of rows) pool.push(x);
    if (lg && st) { n += $idx(st, "n"); abroad += $idx(st, "abroad"); paid += $idx(st, "paid"); recv += $idx(st, "recv"); total += $idx(st, "paid"); }
    else if (!lg) { n += $idx(t, "n"); abroad += $idx(t, "abroad"); total += $idx(t, "total"); }
    for (const [ln, v] of $M.items($idx(t, "net_by_league"))) net.set(ln, (net.get(ln) || 0) + v);
  }
  pool.sort((a, b) => $idx(b, "fee") - $idx(a, "fee"));
  const top = pool.slice(0, all ? 25 : (lg ? 15 : 10)).map((x) => $dict(x, $kw({"fee": mx($idx(x, "fee"))})));
  return $dict($kw({"season": s, "seasons": $len(w.hist), "league": lg, "leagues": leagues, "n": n, "abroad": abroad, "total": mx(total), "top": top,
    "stat": lg ? $dict($kw({"paid": mx(paid), "recv": mx(recv), "net": mx(recv - paid), "n": n, "abroad": abroad})) : null,
    "net": [...net.entries()].sort((a, b) => b[1] - a[1]).map(([ln, v]) => $dict($kw({"league": ln, "net": mx(v)})))}));
}
function v_records() {
  let w;
  w = need_world();
  return $dict($kw({"coaches": (() => { const $r = []; let c; for (const $c0 of $iter($slice($sorted((() => { const $r = []; let c; for (const $c0 of $iter(w.retired_all)) { c = $c0; if (!(c.seasons >= 5)) continue; $r.push(c); } return $r; })(), $kw({"key": ((c) => (-c.hof_score))})), null, 15, null))) { c = $c0; $r.push($dict(coach_row(c), $kw({"hof": r1(c.hof_score)}))); } return $r; })(), "records": (() => { const $r = []; let ln, rc; for (const $c0 of $iter($M.items(w.records))) { [ln, rc] = $iter($c0); $r.push($dict($kw({"league": ln, "pts": $idx($idx(rc, "pts"), 0), "pts_club": $idx($idx(rc, "pts"), 1), "gf": $idx($idx(rc, "gf"), 0), "gf_club": $idx($idx(rc, "gf"), 1)}))); } return $r; })(), "wc": $slice((() => { const $r = []; let a, b, h, s; for (const $c0 of $iter(w.wc_history)) { [s, a, b, h] = $iter($c0); $r.push($dict($kw({"season": s, "winner": a, "runner_up": b, "host": h}))); } return $r; })(), null, null, (-1)), "cwc": $slice((() => { const $r = []; let a, b, s; for (const $c0 of $iter(w.cwc_history)) { [s, a, b] = $iter($c0); $r.push($dict($kw({"season": s, "winner": a, "runner_up": b}))); } return $r; })(), null, null, (-1))}));
}
function awards_brief(a) {
  let b, c, $t1;
  if ((!$T(a))) {
    return null;
  }
  [b, c] = $iter([$idx($idx(a, "ballon"), 0), $idx($idx(a, "coach"), 0)]);
  return $dict($kw({"ballon": $dict($kw({"name": $idx(b, "name"), "club": $idx(b, "club"), "pts": $idx(b, "pts"), "share": $idx(b, "share")})), "coach": $dict($kw({"name": $idx(c, "name"), "club": ($T($t1 = $idx(c, "club")) ? $t1 : $idx(c, "nation"))})), "boot": $dict($kw({"name": $idx($idx($idx(a, "boot"), 0), "name"), "goals": $idx($idx($idx(a, "boot"), 0), "goals")})), "date": $idx(a, "date")}));
}
function v_awards(season = null) {
  let a, s, seasons, sy, w;
  w = need_world();
  seasons = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T($M.get(r, "awards"))) continue; $r.push($idx(r, "season")); } return $r; })();
  if ((!$T(seasons))) {
    return $dict($kw({"awards": null, "seasons": []}));
  }
  s = (($in(season, seasons)) ? season : $idx(seasons, (-1)));
  a = $next((() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($eq($idx(r, "season"), s))) continue; $r.push($idx(r, "awards")); } return $r; })());
  sy = $getattr(w.cfg, "start_year", 2026);
  return $dict($kw({"awards": a, "season": s, "season_label": cal.season_label(sy, s), "seasons": seasons}));
}
function review(rec, why) {
  let news, order, p, w;
  w = ST.world;
  order = $lit_dict([["worldcup", 0], ["award", 1], ["title", 2], ["transfer", 3], ["coach", 4], ["star", 5], ["collapse", 6], ["upset", 7]]);
  news = $slice($sorted((() => { const $r = []; let x; for (const $c0 of $iter(w.news_log)) { x = $c0; if (!(($eq($idx(x, 0), $idx(rec, "season"))) && ($in($idx(x, 2), order)))) continue; $r.push(x); } return $r; })(), $kw({"key": ((x) => $idx(order, $idx(x, 2)))})), null, 10, null);
  p = $M.get(rec, "potY");
  return $dict($kw({"season": $idx(rec, "season"), "champs": $idx(rec, "champs"), "cups": (() => { const $r = new $Dict(); let a, b, c, $t1; for (const $c0 of $iter($M.items($idx(rec, "cups")))) { ($t1 = $iter($c0), c = $t1[0], [a, b] = $iter($t1[1])); $r.set(c, $dict($kw({"name": $idx($idx(w.cups, c), "name"), "winner": a, "runner_up": b}))); } return $r; })(), "cwc": $idx(rec, "cwc"), "wc": $idx(rec, "wc"), "potY": ($T(p) ? $dict($kw({"name": $idx(p, 0), "ovr": $idx(p, 1), "club": $idx(p, 2), "nat": $idx(p, 3)})) : null), "news": (() => { const $r = []; let _, k, t; for (const $c0 of $iter(news)) { [_, _, k, t] = $iter($c0); $r.push($dict($kw({"kind": k, "text": t}))); } return $r; })(), "reasons": why, "awards": awards_brief($M.get(rec, "awards")), "transfers": $dict($kw({"n": $idx($idx(rec, "transfers"), "n"), "total": mx($idx($idx(rec, "transfers"), "total"))}))}));
}
function a_new(body) {
  let cfg, cur, k, seed, v, val, $t1, $t2;
  cfg = $new(S.Settings, [$kw({"label": "game"})]);
  for (const $f18 of $iter($M.items(($T($t1 = $M.get(body, "rules")) ? $t1 : new $Dict())))) {
    [k, v] = $iter($f18);
    if (((k === "label") || (!$hasattr(cfg, k)))) {
      throw $new(ApiError, [("unknown rule " + $str(k))]);
    }
    cur = $getattr(cfg, k);
    try {
      val = ($isinstance(cur, $bool) ? ($in($M.lower($str(v)), ["1", "true", "yes", "on"])) : shim.castlike(cur, v));
    } catch ($e1) {
      if ($excmatch($e1, [TypeError_, ValueError])) {
        throw $new(ApiError, [("bad value for " + $str(k))]);
      }
      else throw $e1;
    }
    $setattr(cfg, k, val);
  }
  try {
    seed = $int(($T($t2 = $M.get(body, "seed")) ? $t2 : 1));
  } catch ($e1) {
    if ($excmatch($e1, [ValueError])) {
      throw $new(ApiError, ["seed must be a whole number"]);
    }
    else throw $e1;
  }
  ST.world = $new(S.World, [cfg, seed]);
  ST.stops = $new(Stops, []);
  ST.last_review = null;
  return $dict($kw({"ok": true}));
}
function _a_sim(body) {
  let _, c, cid, e, ids, n, rid, scope, w, weeks, $t1;
  w = need_world();
  scope = $M.get(body, "scope", "ids");
  ids = ((scope === "world") ? null : $list(($T($t1 = $M.get(body, "ids")) ? $t1 : [])));
  if ($T($M.get(body, "comp"))) {
    cid = $idx(body, "comp");
    if ((!$in(cid, w.comps))) {
      throw $new(ApiError, ["unknown competition", 404]);
    }
    try {
      if ($T($M.get(body, "upto"))) {
        for (const $f19 of $iter(w.prerequisites(cid))) {
          rid = $f19;
          w.sim_comp(rid, $kw({"strict": false}));
        }
        return $dict($kw({"ok": true}));
      }
      if ($T($M.get(body, "fixture"))) {                    // one chosen game of this matchweek
        c = $idx(w.comps, cid);
        if ((c.kind !== "league")) {
          throw $new(ApiError, ["Single-game sim is for leagues", 400]);
        }
        const fxd = $idx(body, "fixture");
        try { c.play_fixture($idx(fxd, "h"), $idx(fxd, "a")); }
        catch (e) { if (e instanceof ValueError) throw $new(ApiError, [e.message, 400]); throw e; }
        return $dict($kw({"ok": true}));
      }
      if ($T($M.get(body, "game"))) {                        // one chosen game of a tournament round
        const gres = $mods.tourney.play_game(w, cid, $idx(body, "game"));
        return $dict($kw({"ok": true, "game": gres}));
      }
      if ($T($M.get(body, "fixtures"))) {
        c = $idx(w.comps, cid);
        if ((c.kind !== "league")) {
          throw $new(ApiError, ["Single-game sim is for leagues", 400]);
        }
        for (const $f20 of $iter($range($max(1, $min($int($idx(body, "fixtures")), 400))))) {
          _ = $f20;
          if ((!$T(c.has_event(w.season)))) {
            break;
          }
          c.play_one();
        }
        return $dict($kw({"ok": true}));
      }
      if ($T($M.get(body, "prereqs"))) {
        w.sim_with_prereqs(cid);
      } else {
        w.sim_comp(cid, $kw({"matches": ($T($M.get(body, "to_end")) ? null : $int($M.get(body, "matches", 1)))}));
      }
    } catch ($e1) {
      if ($excmatch($e1, [S.Locked])) {
        e = $e1;
        throw $new(ApiError, [("Locked - first finish: " + $M.join(", ", (() => { const $r = []; let m; for (const $c0 of $iter(e.missing)) { m = $c0; $r.push($idx(w.comps, m).title); } return $r; })())), 409]);
      }
      else throw $e1;
    }
    return $dict($kw({"ok": true}));
  }
  if (((scope === "ids") && (!$T(ids)))) {
    throw $new(ApiError, ["nothing selected"]);
  }
  weeks = ($T($M.get(body, "to_end")) ? null : $int($M.get(body, "weeks", 1)));
  n = 0;
  while (((weeks == null) || $lt(n, weeks))) {
    if ((w.step(ids) == null)) {
      break;
    }
    n = n + 1;
  }
  return $dict($kw({"ok": true, "weeks": n}));
}
function _done_set(w) {
  return (() => { const $r = new $Set(); let c, cid, $t1, $t2; for (const $c0 of $iter($M.items(w.comps))) { [cid, c] = $iter($c0); if (!$T(($T($t1 = ($in(c.kind, ["league", "cup", "cwc", "wc", "ct", "nl", "qual"]))) ? ($T($t2 = c.events) ? c.done : $t2) : $t1))) continue; $r.add(cid); } return $r; })();
}
function a_sim(body) {
  let before, c, cid, fin, out, rank, w;
  w = need_world();
  w.flow = null;
  before = _done_set(w);
  out = _a_sim(body);
  rank = $lit_dict([["wc", 0], ["cwc", 1], ["ct", 2], ["cup", 3], ["qual", 3.5], ["nl", 4], ["league", 5]]);
  fin = [];
  for (const $f21 of $iter($sorted($sub(_done_set(w), before), $kw({"key": ((i) => [$idx(rank, $idx(w.comps, i).kind), i])})))) {
    cid = $f21;
    c = $idx(w.comps, cid);
    $M.append(fin, $dict($kw({"id": cid, "title": c.title, "kind": c.kind})));
  }
  $setidx(out, "finished", fin);
  return out;
}
function a_settings(body) {
  if (($in("god", body))) {
    ST.god = $bool($idx(body, "god"));
  }
  return $dict($kw({"ok": true, "god": ST.god}));
}
function a_edit(body) {
  let e, ex, w;
  w = need_world();
  if ((!$T(ST.god))) {
    throw $new(ApiError, ["God mode is off. Turn it on in Settings.", 403]);
  }
  try {
    e = G.apply(w, body, w.cfg.money_x);
  } catch ($e1) {
    if ($excmatch($e1, [G.EditError])) {
      ex = $e1;
      throw $new(ApiError, [$str(ex), 400]);
    }
    else throw $e1;
  }
  $M.clear(_LS);
  return $dict($kw({"ok": true, "entry": e}));
}
function v_edits() {
  let w;
  w = need_world();
  return $dict($kw({"edits": $slice($slice($list($getattr(w, "edit_log", [])), null, null, (-1)), null, 100, null)}));
}
function a_year(body) {
  let _, n, ran, rec, w, why;
  w = need_world();
  w.flow = null;
  n = $max(1, $min($int($M.get(body, "n", 1)), 200));
  ran = 0;
  for (const $f22 of $iter($range(n))) {
    _ = $f22;
    rec = w.finish_season();
    ran = ran + 1;
    why = ST.stops.evaluate(w, rec);
    ST.last_review = review(rec, why);
    if ($T(why)) {
      return $dict($kw({"ok": true, "ran": ran, "stopped": true, "review": ST.last_review}));
    }
  }
  return $dict($kw({"ok": true, "ran": ran, "stopped": false, "review": ST.last_review}));
}
function a_rollover(body) {
  let rec, w;
  w = need_world();
  if ((!$T(w.season_done()))) {
    throw $new(ApiError, ["The season is not finished yet.", 409]);
  }
  rec = w.rollover();
  ST.last_review = review(rec, ST.stops.evaluate(w, rec));
  w.flow = $dict($kw({"season": $idx(rec, "season"), "step": "awards"}));      // the off-season: awards ceremony, then transfers, then the new season
  return $dict($kw({"ok": true, "review": ST.last_review, "header": header(w)}));
}
// move through the off-season: awards -> transfers -> done (the new season starts). Anything else is refused.
function a_flow(body) {
  const w = need_world(), step = $M.get(body, "step", "done"), cur = $T(w.flow) ? w.flow.get_("step") : null;
  if (!cur) return $dict($kw({"ok": true, "header": header(w)}));
  if (step === "transfers" && cur === "awards") w.flow.set("step", "transfers");
  else if (step === "graduates" && (cur === "transfers" || cur === "awards")) w.flow.set("step", "graduates");
  else if (step === "done") w.flow = null;
  else if (step !== cur) throw $new(ApiError, ["That step does not follow the current one.", 409]);
  return $dict($kw({"ok": true, "header": header(w)}));
}
// young talent: scope "grads" = academy graduates (clubs keep their latest twelve), "all" = every player aged 19 or under; best potential first
function v_prospects(q) {
  const w = need_world(); w.ensure_uids();
  const scope = $M.get(q, "scope", "grads"), league = $M.get(q, "league", null);
  let pool = [];
  if (scope === "all") { for (const p of w.players) if (p.age <= 19) pool.push([p, p.club ? $M.get(w.clubs, p.club) : null]); }
  else { for (const [cn, c] of $M.items(w.clubs)) for (const p of $M.get(c, "grads", [])) if (p.age <= 20) pool.push([p, c]); }
  if (league) pool = pool.filter(([p, c]) => c && c.league === league);
  pool.sort((a, b) => (b[0].pot - a[0].pot) || (b[0].ovr - a[0].ovr));
  const leagues = []; for (const [cn, c] of $M.items(w.clubs)) if (!leagues.includes(c.league)) leagues.push(c.league);
  return $dict($kw({"scope": scope, "league": league, "total": pool.length, "leagues": leagues, "season": w.season, "rows": pool.slice(0, 40).map(([p, c]) => $dict($kw({"uid": p.uid, "name": p.name, "age": p.age, "pos": p.pos, "nat": p.nat, "ovr": p.ovr, "pot": p.pot, "club": p.club || null, "league": c ? c.league : null, "grad": !!(c && $M.get(c, "grads", []).includes(p))}))) }));
}
function a_stops(body) {
  let keys, s;
  s = ST.stops;
  if (($in("preset", body))) {
    if ((!$in($idx(body, "preset"), PRESETS))) {
      throw $new(ApiError, ["unknown preset"]);
    }
    s.on = $set($idx(PRESETS, $idx(body, "preset")));
  }
  if (($in("on", body))) {
    keys = (() => { const $r = new $Set(); let _, k; for (const $c0 of $iter(STOP_ITEMS)) { [k, _] = $iter($c0); $r.add(k); } return $r; })();
    s.on = (() => { const $r = new $Set(); let k; for (const $c0 of $iter($idx(body, "on"))) { k = $c0; if (!($in(k, keys))) continue; $r.add(k); } return $r; })();
  }
  if (($in("n", body))) {
    s.n = $max(1, $min($int($idx(body, "n")), 100));
  }
  if (($in("leagues", body))) {
    s.leagues = $set($idx(body, "leagues"));
  }
  return stops_view();
}

// ---- favorites (a list of competition keys kept in the world, so it travels with the save) and who-qualified summaries
function v_favs() {
  const w = ST.world;
  return $dict($kw({"favs": ((w && w.favs) ? $list(w.favs) : null)}));
}
function a_favs(body) {
  const w = need_world();
  w.favs = $list(($T($M.get(body, "set")) ? $idx(body, "set") : [])).map((k) => String(k));
  return $dict($kw({"ok": true, "favs": $list(w.favs)}));
}
function v_qualstats(cid) {
  const w = need_world();
  if (!$in(cid, w.comps)) throw $new(ApiError, ["unknown competition", 404]);
  const c = $idx(w.comps, cid);
  if (c.kind !== "qual") throw $new(ApiError, ["not a qualifying competition", 404]);
  const eff = w.nat_eff, host = c.auto_host ? c.auto_host : null, got = $list(c.qualified);
  const nd = c.direct + (host ? 1 : 0);
  const rate = (n) => r1($M.get(eff, n, 0));
  const qual = got.map((n, i) => $dict($kw({"team": n, "via": ((host && i === 0) ? "host" : (i < nd ? "group" : "play-off")), "rating": rate(n)})));
  const left = $list(c.leftover);
  const missed = left.slice().sort((a, b) => $M.get(eff, b, 0) - $M.get(eff, a, 0) || (a < b ? -1 : 1)).slice(0, 4).map((n) => $dict($kw({"team": n, "rating": rate(n)})));
  const wk = got.slice().sort((a, b) => $M.get(eff, a, 0) - $M.get(eff, b, 0) || (a < b ? -1 : 1))[0];
  const weakest = got.length ? $dict($kw({"team": wk, "rating": rate(wk)})) : null;
  return $dict($kw({"id": cid, "name": c.title, "confed": c.confed, "season_label": cal.season_label(w.cfg.start_year, w.season), "finished": !!c.finished, "qualified": qual, "missed": missed, "best_missing": (missed.length ? missed[0] : null), "weakest": weakest, "playoff_places": c.R}));
}
GET = $lit_dict([["/api/status", ((q) => v_status())],
["/api/favs", ((q) => v_favs())],
["/api/prospects", ((q) => v_prospects(q))], ["/api/qualstats", ((q) => v_qualstats($idx(q, "id")))], ["/api/world", ((q) => v_world())], ["/api/leaguemoney", ((q) => v_leaguemoney($idx(q, "name")))], ["/api/leaguehof", ((q) => { const w = need_world(); if (!$in($idx(q, "name"), w.leagues)) throw $new(ApiError, ["unknown league", 404]); return $mods.pages.league_hof(w, $idx(q, "name")); })], ["/api/comphub", ((q) => $dict($kw({"cards": $mods.pages.cards(need_world(), (c) => comp_progress(need_world(), c), (n) => cal.season_label(need_world().cfg.start_year, n))})))], ["/api/comphist", ((q) => { const w = need_world(); if (!$mods.pages.is_valid(w, $idx(q, "key")) || $idx(q, "key").startsWith("league:")) throw $new(ApiError, ["unknown competition", 404]); return $mods.pages.history(w, $idx(q, "key"), (n) => cal.season_label(w.cfg.start_year, n)); })], ["/api/compalltime", ((q) => { const w = need_world(); if (!$mods.pages.is_valid(w, $idx(q, "key"))) throw $new(ApiError, ["unknown competition", 404]); return $mods.pages.alltime(w, $idx(q, "key")); })], ["/api/worldmoney", ((q) => v_worldmoney())], ["/api/continent", ((q) => v_continent($idx(q, "code")))], ["/api/map", ((q) => v_map())], ["/api/league", ((q) => v_league($idx(q, "name")))], ["/api/league_season", ((q) => v_league_season($idx(q, "name"), $int($idx(q, "season"))))], ["/api/club", ((q) => v_club($idx(q, "name")))], ["/api/player", ((q) => { const r = v_player($idx(q, "uid")), w = need_world(), p = w.player_by_uid($int($idx(q, "uid"))); r.set("hof", $mods.hofpages.chainFor(w, p)); return r; })], ["/api/players", ((q) => v_players(q))], ["/api/compstats", ((q) => v_compsum($idx(q, "id"), ($T($M.get(q, "season")) ? $int($idx(q, "season")) : null)))], ["/api/settings", ((q) => $dict($kw({"god": ST.god, "money_x": ($T(ST.world) ? ST.world.cfg.money_x : 3.5), "clubs": ($T(ST.world) ? $sorted(ST.world.clubs) : [])})))], ["/api/comp", ((q) => v_comp($idx(q, "id")))], ["/api/nations", ((q) => v_nations($M.get(q, "confed")))], ["/api/nation", ((q) => v_nation($idx(q, "name")))], ["/api/news", ((q) => v_news())], ["/api/money", ((q) => v_money())], ["/api/ledger", ((q) => v_ledger(($T($M.get(q, "season")) && $idx(q, "season") !== "all" ? $int($idx(q, "season")) : null), ($T($M.get(q, "league")) ? $idx(q, "league") : null), $M.get(q, "season") === "all"))], ["/api/records", ((q) => v_records())], ["/api/review", ((q) => $dict($kw({"review": ST.last_review})))], ["/api/awards", ((q) => v_awards(($T($M.get(q, "season")) ? $int($idx(q, "season")) : null)))], ["/api/trophies", ((q) => $dict($kw({"options": T.options(need_world()), "selected": ($T($M.get(q, "key")) ? T.winners(need_world(), $idx(q, "key")) : null)})))], ["/api/edits", ((q) => v_edits())], ["/api/charts", ((q) => v_charts())], ["/api/halloffame", ((q) => T.halloffame(need_world()))]]);
POST = $lit_dict([["/api/favs", a_favs],
["/api/settings_set", a_settings], ["/api/export", a_export], ["/api/edit", a_edit], ["/api/new", a_new], ["/api/sim", a_sim], ["/api/years", a_year], ["/api/rollover", a_rollover], ["/api/flow", a_flow], ["/api/stops", a_stops], ["/api/save", a_save], ["/api/load", a_load], ["/api/delete", a_delete], ["/api/beat", a_beat], ["/api/quit", a_quit]]);
// v16 Hall of Fame routes
{
  const HP = $mods.hofpages, hq = (q, k, d) => { const v = $M.get(q, k); return v === null || v === undefined || v === "" ? d : v; };
  const bad = (m, c = 404) => { throw $new(ApiError, [m, c]); };
  GET.set("/api/hofday", (q) => { const w = need_world(); return $dict($kw(HP.v_day(w, $T($M.get(q, "season")) ? $int($idx(q, "season")) : w.season))); });
  GET.set("/api/hofleague", (q) => { const w = need_world(); if (!w.leagues.has($idx(q, "league"))) bad("unknown league"); return $dict($kw(HP.v_leagueday(w, $idx(q, "league"), $T($M.get(q, "season")) ? $int($idx(q, "season")) : null))); });
  GET.set("/api/hof", (q) => { const w = need_world(); return $dict($kw(HP.v_hof(w, { tier: hq(q, "tier", "W"), name: hq(q, "name", null), kind: hq(q, "kind", "p") }))); });
  GET.set("/api/hofcard", (q) => { const w = need_world(); if (!HP.cardOf(w, $idx(q, "id"))) bad("unknown Hall of Fame card"); return $dict($kw(HP.v_card(w, $idx(q, "id")))); });
  GET.set("/api/academy", (q) => { const w = need_world(); if (!w.clubs.has($idx(q, "club"))) bad("unknown club"); const v = $mods.hof.acadView(w, $idx(q, "club")); v.in_halls = v.in_halls.map((id) => HP.row(w, HP.cardOf(w, id))); return $dict($kw(v)); });
  GET.set("/api/academies", (q) => { const w = need_world(), sc = hq(q, "scope", "world"), nm = hq(q, "name", null); const rows = $mods.hof.acadRanking(w, sc, nm); const leagues = w.leagues.keysArr(), conf = []; for (const l of w.leagues.valuesArr()) if (!conf.includes(l.get_("confed"))) conf.push(l.get_("confed")); return $dict($kw({ "rows": rows, "scope": sc, "name": nm, "leagues": leagues, "confeds": conf, "season": w.season })); });
  GET.set("/api/movemoney", (q) => { const w = need_world(); return $dict($kw($mods.movepages.v_money(w, { season: hq(q, "season", null) ? $int(hq(q, "season", null)) : 0, league: hq(q, "league", null) }))); });
  GET.set("/api/moves", (q) => { const w = need_world(); const g = (k) => hq(q, k, null); return $dict($kw($mods.movepages.v_moves(w, { season: g("season") ? $int(g("season")) : 0, tab: g("tab"), kind: g("kind"), mv: g("mv"), sort: g("sort"), league: g("league"), club: g("club"), who: g("who"), limit: g("limit") ? $int(g("limit")) : 0 }))); });
  GET.set("/api/hofwatch", (q) => $dict($kw({ "rows": HP.v_watch(need_world()) })));
}
return {ApiError: ApiError, BaseHTTPRequestHandler: BaseHTTPRequestHandler, C: C, CONF_ORDER: CONF_ORDER, G: G, GEO: GEO, GET: GET, Handler: Handler, POST: POST, PRESETS: PRESETS, S: S, ST: ST, STOP_ITEMS: STOP_ITEMS, State: State, Stops: Stops, T: T, ThreadingHTTPServer: ThreadingHTTPServer, _LS: _LS, _a_sim: _a_sim, _done_set: _done_set, a_beat: a_beat, a_delete: a_delete, a_edit: a_edit, a_export: a_export, a_load: a_load, a_new: a_new, a_quit: a_quit, a_rollover: a_rollover, a_save: a_save, a_settings: a_settings, a_sim: a_sim, a_stops: a_stops, a_year: a_year, argparse: argparse, awards_brief: awards_brief, bracket_upcoming: bracket_upcoming, cal: cal, coach_row: coach_row, comp_emblem: comp_emblem, comp_progress: comp_progress, compstats: compstats, cur_stats: cur_stats, ev_date: ev_date, find_browser: find_browser, header: header, json: json, list_saves: list_saves, live_stats: live_stats, main: main, mimetypes: mimetypes, mx: mx, need_world: need_world, os: os, parse_qs: parse_qs, player_row: player_row, r1: r1, re: re, review: review, round_name_: round_name_, rule_defaults: rule_defaults, safe_slot: safe_slot, shim: shim, shutil: shutil, stops_view: stops_view, subprocess: subprocess, sys: sys, threading: threading, time: time, traceback: traceback, urlparse: urlparse, v_awards: v_awards, v_charts: v_charts, v_club: v_club, v_comp: v_comp, v_compsum: v_compsum, v_continent: v_continent, v_edits: v_edits, v_league: v_league, v_league_season: v_league_season, v_ledger: v_ledger, v_map: v_map, v_money: v_money, v_nation: v_nation, v_nations: v_nations, v_news: v_news, v_player: v_player, v_players: v_players, v_records: v_records, v_status: v_status, v_world: v_world, watchdog: watchdog};
})();
