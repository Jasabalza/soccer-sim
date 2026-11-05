$mods["trophies"] = (function() {
const zlib = $py.zlib;
const {Counter, defaultdict} = $py.collections || {};
let AWARDS, CONF_COLOR, HOF_POINTS, SPEC_CWC, SPEC_WC;
CONF_COLOR = $lit_dict([["UEFA", "#4aa8ff"], ["CONMEBOL", "#3ddc84"], ["CONCACAF", "#ff6b6b"], ["AFC", "#ff9f43"], ["CAF", "#c79bff"], ["OFC", "#35d0c4"], ["WORLD", "#f5c542"]]);
AWARDS = $lit_dict([["ballon", ["Ballon d'Or", "ballon", "#f5c542"]], ["coach", ["Coach of the Year", "coach", "#9ad1ff"]], ["boot", ["Golden Boot", "boot", "#f5c542"]], ["young", ["Young Player of the Year", "young", "#3ddc84"]], ["team", ["Team of the Year", "team", "#ffd166"]]]);
function league_color(name) {
  return ("hsl(" + $str($mod(zlib.crc32($M.encode(name)), 360)) + " 62% 58%)");
}
function spec_league(name) {
  return $dict($kw({"kind": "league_cup", "color": league_color(name)}));
}
function spec_cup(confed) {
  return $dict($kw({"kind": "cup_eared", "color": $M.get(CONF_COLOR, confed, "#cfd8dc")}));
}
SPEC_CWC = $dict($kw({"kind": "cwc", "color": "#f5c542"}));
function spec_ct(confed) {
  return $dict($kw({"kind": "ct", "color": $M.get(CONF_COLOR, confed, "#cfd8dc")}));
}
function spec_nl(confed) {
  return $dict($kw({"kind": "nl", "color": $M.get(CONF_COLOR, confed, "#cfd8dc")}));
}
SPEC_WC = $dict($kw({"kind": "world_cup", "color": "#f5c542"}));
function spec_award(key) {
  let c, k, t;
  [t, k, c] = $iter($idx(AWARDS, key));
  return $dict($kw({"kind": k, "color": c}));
}
function club_trophies(w, name) {
  let a, add, c, cf, cs, cw, key, ln, n_players, out, r, seasons, seconds, titles, toty, $t1, $t2, $t3, $t4;
  c = $idx(w.clubs, name);
  [ln, cf] = $iter([$idx(c, "league"), $idx(c, "confed")]);
  out = [];
  add = function add(title, spec, group, seasons, seconds = []) {
    let $t1;
    if ($T(($T($t1 = seasons) ? $t1 : seconds))) {
      $M.append(out, $dict($kw({"title": title, "emblem": spec, "group": group, "count": $len(seasons), "seasons": $sorted(seasons), "runner_up": $sorted(seconds)})));
    }
  };
  titles = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($eq($M.get($idx(r, "champs"), ln), name))) continue; $r.push($idx(r, "season")); } return $r; })();
  seconds = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!(($len($M.get($idx(r, "tables"), ln, [])) > 1) && ($eq($idx($idx($idx(r, "tables"), ln), 1), name)))) continue; $r.push($idx(r, "season")); } return $r; })();
  add(ln, spec_league(ln), "domestic", titles, seconds);
  if (($in(cf, w.cups))) {
    cw = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($eq($idx($M.get($idx(r, "cups"), cf, [null, null]), 0), name))) continue; $r.push($idx(r, "season")); } return $r; })();
    cs = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($eq($idx($M.get($idx(r, "cups"), cf, [null, null]), 1), name))) continue; $r.push($idx(r, "season")); } return $r; })();
    add($idx($idx(w.cups, cf), "name"), spec_cup(cf), "continental", cw, cs);
  }
  cw = (() => { const $r = []; let r, $t1; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "cwc")) ? ($eq($idx($idx(r, "cwc"), 0), name)) : $t1))) continue; $r.push($idx(r, "season")); } return $r; })();
  cs = (() => { const $r = []; let r, $t1; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "cwc")) ? ($eq($idx($idx(r, "cwc"), 1), name)) : $t1))) continue; $r.push($idx(r, "season")); } return $r; })();
  add("Club World Cup", SPEC_CWC, "world", cw, cs);
  for (const $f1 of $iter(["ballon", "coach", "boot", "young"])) {
    key = $f1;
    seasons = [];
    for (const $f2 of $iter(w.hist)) {
      r = $f2;
      a = $M.get(r, "awards");
      if ((!$T(a))) {
        continue;
      }
      if (((key === "ballon") && ($eq($idx($idx($idx(a, "ballon"), 0), "club"), name)))) {
        $M.append(seasons, $idx(r, "season"));
      } else if (((key === "coach") && ($eq($idx($idx($idx(a, "coach"), 0), "club"), name)))) {
        $M.append(seasons, $idx(r, "season"));
      } else if ($T(($T($t1 = (key === "boot")) ? ($T($t2 = $idx(a, "boot")) ? ($eq($idx($idx($idx(a, "boot"), 0), "club"), name)) : $t2) : $t1))) {
        $M.append(seasons, $idx(r, "season"));
      } else if ($T(($T($t3 = (key === "young")) ? ($T($t4 = $idx(a, "young")) ? ($eq($idx($idx($idx(a, "young"), 0), "club"), name)) : $t4) : $t3))) {
        $M.append(seasons, $idx(r, "season"));
      }
    }
    add($idx($idx(AWARDS, key), 0), spec_award(key), "individual", seasons);
  }
  toty = (() => { const $r = []; let r, $t1; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "awards")) ? $any((() => { const $r = []; let p; for (const $c0 of $iter($idx($idx(r, "awards"), "team"))) { p = $c0; $r.push(($eq($idx(p, "club"), name))); } return $r; })()) : $t1))) continue; $r.push($idx(r, "season")); } return $r; })();
  n_players = $sum((() => { const $r = []; let p, r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T($M.get(r, "awards"))) continue; for (const $c1 of $iter($idx($idx(r, "awards"), "team"))) { p = $c1; if (!($eq($idx(p, "club"), name))) continue; $r.push(1); } } return $r; })());
  if ($T(toty)) {
    $M.append(out, $dict($kw({"title": "Team of the Year places", "emblem": spec_award("team"), "group": "individual", "count": n_players, "seasons": $sorted(toty), "runner_up": []})));
  }
  return out;
}
function nation_trophies(w, name) {
  let CT_TITLES, NL_TITLES, got, key, kind, nm, out, seasons, sec, spec, ttl, wins, $t1, $t2;
  out = [];
  wins = (() => { const $r = []; let r, $t1; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "wc")) ? ($eq($idx($idx(r, "wc"), 0), name)) : $t1))) continue; $r.push($idx(r, "season")); } return $r; })();
  sec = (() => { const $r = []; let r, $t1; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "wc")) ? ($eq($idx($idx(r, "wc"), 1), name)) : $t1))) continue; $r.push($idx(r, "season")); } return $r; })();
  if ($T(($T($t1 = wins) ? $t1 : sec))) {
    $M.append(out, $dict($kw({"title": "World Cup", "emblem": SPEC_WC, "group": "world", "count": $len(wins), "seasons": wins, "runner_up": sec})));
  }
  ({CT_TITLES, NL_TITLES} = $mods.natcomps);
  nm = $idx($idx(w.nations, name), "confed");
  for (const $f3 of $iter([["ct", spec_ct(nm), $M.get(CT_TITLES, nm)], ["nl", spec_nl(nm), $M.get(NL_TITLES, nm)]])) {
    [kind, spec, ttl] = $iter($f3);
    got = (() => { const $r = []; let r; for (const $c0 of $iter(w.hist)) { r = $c0; if (!($in(nm, $M.get(r, kind, new $Dict())))) continue; $r.push([$idx(r, "season"), $idx($idx(r, kind), nm)]); } return $r; })();
    wins = (() => { const $r = []; let se, t; for (const $c0 of $iter(got)) { [se, t] = $iter($c0); if (!($eq($idx(t, 0), name))) continue; $r.push(se); } return $r; })();
    sec = (() => { const $r = []; let se, t; for (const $c0 of $iter(got)) { [se, t] = $iter($c0); if (!(($len(t) > 1) && ($eq($idx(t, 1), name)))) continue; $r.push(se); } return $r; })();
    if ($T(($T($t2 = wins) ? $t2 : sec))) {
      $M.append(out, $dict($kw({"title": ttl, "emblem": spec, "group": "continental", "count": $len(wins), "seasons": wins, "runner_up": sec})));
    }
  }
  for (const $f4 of $iter(["ballon", "young", "boot"])) {
    key = $f4;
    seasons = (() => { const $r = []; let r, $t1, $t2, $t3, $t4, $t5, $t6, $t7; for (const $c0 of $iter(w.hist)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "awards")) ? ($T($t2 = ((key === "ballon") && ($eq($idx($idx($idx($idx(r, "awards"), "ballon"), 0), "nat"), name)))) ? $t2 : ($T($t3 = ($T($t4 = (key === "young")) ? ($T($t5 = $idx($idx(r, "awards"), "young")) ? ($eq($idx($idx($idx($idx(r, "awards"), "young"), 0), "nat"), name)) : $t5) : $t4)) ? $t3 : ($T($t6 = (key === "boot")) ? ($T($t7 = $idx($idx(r, "awards"), "boot")) ? ($eq($idx($idx($idx($idx(r, "awards"), "boot"), 0), "nat"), name)) : $t7) : $t6))) : $t1))) continue; $r.push($idx(r, "season")); } return $r; })();
    if ($T(seasons)) {
      $M.append(out, $dict($kw({"title": ($idx($idx(AWARDS, key), 0) + " (players)"), "emblem": spec_award(key), "group": "individual", "count": $len(seasons), "seasons": seasons, "runner_up": []})));
    }
  }
  return out;
}
function options(w) {
  let CT_TITLES, L, NL_TITLES, cf, col, cup, k, kind, ln, opts, t, $t1;
  opts = [];
  for (const $f5 of $iter($M.items(w.leagues))) {
    [ln, L] = $iter($f5);
    $M.append(opts, $dict($kw({"key": ("league:" + $str(ln)), "title": ln, "group": ("League - " + $str($idx(L, "confed"))), "emblem": spec_league(ln)})));
  }
  for (const $f6 of $iter($M.items(w.cups))) {
    [cf, cup] = $iter($f6);
    $M.append(opts, $dict($kw({"key": ("cup:" + $str(cf)), "title": $idx(cup, "name"), "group": "Continental cups", "emblem": spec_cup(cf)})));
  }
  $M.append(opts, $dict($kw({"key": "cwc", "title": "Club World Cup", "group": "World", "emblem": SPEC_CWC})));
  $M.append(opts, $dict($kw({"key": "wc", "title": "World Cup", "group": "World", "emblem": SPEC_WC})));
  ({CT_TITLES, NL_TITLES} = $mods.natcomps);
  for (const $f7 of $iter($M.items(CT_TITLES))) {
    [cf, t] = $iter($f7);
    $M.append(opts, $dict($kw({"key": ("ct:" + $str(cf)), "title": t, "group": "National team tournaments", "emblem": spec_ct(cf)})));
  }
  for (const $f8 of $iter($M.items(NL_TITLES))) {
    [cf, t] = $iter($f8);
    $M.append(opts, $dict($kw({"key": ("nl:" + $str(cf)), "title": t, "group": "National team tournaments", "emblem": spec_nl(cf)})));
  }
  for (const $f9 of $iter($M.items(AWARDS))) {
    ($t1 = $iter($f9), k = $t1[0], [t, kind, col] = $iter($t1[1]));
    $M.append(opts, $dict($kw({"key": ("award:" + $str(k)), "title": t, "group": "Individual awards", "emblem": spec_award(k)})));
  }
  return opts;
}
function winners(w, key) {
  let CT_TITLES, NL_TITLES, a, b, board, c, cf, count, f, fin, host, k, kind, ln, nation, r, rows, spec, t, title, $t1, $t2, $t3, $t4, $t5;
  fin = (() => { const $r = new $Dict(); let f; for (const $c0 of $iter($getattr(w, "finals", []))) { f = $c0; $r.set([$idx(f, "season"), $idx(f, "title")], f); } return $r; })();
  [rows, title, spec, nation] = $iter([[], "", new $Dict(), false]);
  if ($M.startswith(key, "league:")) {
    ln = $slice(key, 7, null, null);
    [title, spec] = $iter([ln, spec_league(ln)]);
    for (const $f10 of $iter(w.hist)) {
      r = $f10;
      t = $idx($idx(r, "tables"), ln);
      f = $M.get(fin, [$idx(r, "season"), ln]);
      $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx(t, 0), "runner_up": (($len(t) > 1) ? $idx(t, 1) : null), "coach": $M.get($idx(r, "champ_coach"), ln), "text": ($str($idx($idx($idx(r, "pts"), ln), $idx(t, 0))) + " pts"), "date": ($T(f) ? $idx($idx(f, "date"), "text") : null)})));
    }
  } else if ($M.startswith(key, "cup:")) {
    cf = $slice(key, 4, null, null);
    [title, spec] = $iter([$idx($idx(w.cups, cf), "name"), spec_cup(cf)]);
    for (const $f11 of $iter(w.hist)) {
      r = $f11;
      [a, b] = $iter($M.get($idx(r, "cups"), cf, [null, null]));
      f = $M.get(fin, [$idx(r, "season"), title]);
      $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": a, "runner_up": b, "coach": $M.get($idx(r, "cup_coach"), cf), "text": ($T(f) ? $idx(f, "text") : ""), "date": ($T(f) ? $idx($idx(f, "date"), "text") : null)})));
    }
  } else if ((key === "cwc")) {
    [title, spec] = $iter(["Club World Cup", SPEC_CWC]);
    for (const $f12 of $iter(w.hist)) {
      r = $f12;
      if ($T($M.get(r, "cwc"))) {
        f = $M.get(fin, [$idx(r, "season"), title]);
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx($idx(r, "cwc"), 0), "runner_up": $idx($idx(r, "cwc"), 1), "coach": ($T(f) ? $idx(f, "coach") : null), "text": ($T(f) ? $idx(f, "text") : ""), "date": ($T(f) ? $idx($idx(f, "date"), "text") : null)})));
      }
    }
  } else if ((key === "wc")) {
    [title, spec, nation] = $iter(["World Cup", SPEC_WC, true]);
    for (const $f13 of $iter(w.hist)) {
      r = $f13;
      if ($T($M.get(r, "wc"))) {
        f = $M.get(fin, [$idx(r, "season"), title]);
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx($idx(r, "wc"), 0), "runner_up": $idx($idx(r, "wc"), 1), "coach": ($T(f) ? $idx(f, "coach") : null), "text": (($T(f) ? ($idx(f, "text") + " - ") : "") + ("host " + $str($idx($idx(r, "wc"), 2)))), "date": ($T(f) ? $idx($idx(f, "date"), "text") : null)})));
      }
    }
  } else if ($M.startswith(key, ["ct:", "nl:"])) {
    [kind, cf] = $iter([$slice(key, null, 2, null), $slice(key, 3, null, null)]);
    ({CT_TITLES, NL_TITLES} = $mods.natcomps);
    title = $idx(((kind === "ct") ? CT_TITLES : NL_TITLES), cf);
    [spec, nation] = $iter([((kind === "ct") ? spec_ct(cf) : spec_nl(cf)), true]);
    for (const $f14 of $iter(w.hist)) {
      r = $f14;
      t = $M.get($M.get(r, kind, new $Dict()), cf);
      if ($T(($T($t1 = t) ? $idx(t, 0) : $t1))) {
        f = $M.get(fin, [$idx(r, "season"), title]);
        host = (((kind === "ct") && ($len(t) > 3)) ? (" - host " + $str($idx(t, 3))) : "");
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx(t, 0), "runner_up": $idx(t, 1), "coach": ($T(f) ? $idx(f, "coach") : null), "text": $add(($T(f) ? $idx(f, "text") : ""), host), "date": ($T(f) ? $idx($idx(f, "date"), "text") : null)})));
      }
    }
  } else if ($M.startswith(key, "award:")) {
    k = $slice(key, 6, null, null);
    [title, spec] = $iter([$idx($idx(AWARDS, k), 0), spec_award(k)]);
    for (const $f15 of $iter(w.hist)) {
      r = $f15;
      a = $M.get(r, "awards");
      if ((!$T(a))) {
        continue;
      }
      if ((k === "ballon")) {
        b = $idx($idx(a, "ballon"), 0);
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx(b, "name"), "club": $idx(b, "club"), "nat": $idx(b, "nat"), "runner_up": $idx($idx($idx(a, "ballon"), 1), "name"), "text": ($str($idx(b, "pts")) + " pts (" + $str($idx(b, "share")) + "%)"), "date": $idx($idx(a, "date"), "text")})));
      } else if ((k === "coach")) {
        c = $idx($idx(a, "coach"), 0);
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx(c, "name"), "club": ($T($t2 = $idx(c, "club")) ? $t2 : $idx(c, "nation")), "nat": $idx(c, "nat"), "runner_up": (($len($idx(a, "coach")) > 1) ? $idx($idx($idx(a, "coach"), 1), "name") : null), "text": ($str($idx(c, "pts")) + " pts"), "date": $idx($idx(a, "date"), "text")})));
      } else if ($T(($T($t3 = (k === "boot")) ? $idx(a, "boot") : $t3))) {
        b = $idx($idx(a, "boot"), 0);
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx(b, "name"), "club": $idx(b, "club"), "nat": $idx(b, "nat"), "runner_up": (($len($idx(a, "boot")) > 1) ? $idx($idx($idx(a, "boot"), 1), "name") : null), "text": ($str($idx(b, "goals")) + " goals"), "date": $idx($idx(a, "date"), "text")})));
      } else if ($T(($T($t4 = (k === "young")) ? $idx(a, "young") : $t4))) {
        b = $idx($idx(a, "young"), 0);
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": $idx(b, "name"), "club": $idx(b, "club"), "nat": $idx(b, "nat"), "runner_up": (($len($idx(a, "young")) > 1) ? $idx($idx($idx(a, "young"), 1), "name") : null), "text": ("age " + $str($idx(b, "age")) + ", OVR " + $str($idx(b, "ovr"))), "date": $idx($idx(a, "date"), "text")})));
      } else if ((k === "team")) {
        $M.append(rows, $dict($kw({"season": $idx(r, "season"), "winner": ($T($t5 = $M.join("; ", (() => { const $r = []; let p; for (const $c0 of $iter($slice($idx(a, "team"), null, 0, null))) { p = $c0; $r.push($idx(p, "name")); } return $r; })())) ? $t5 : "Best XI"), "team": (() => { const $r = []; let p; for (const $c0 of $iter($idx(a, "team"))) { p = $c0; $r.push($dict($kw({"name": $idx(p, "name"), "pos": $idx(p, "pos"), "club": $idx(p, "club"), "ovr": $idx(p, "ovr")}))); } return $r; })(), "text": "", "date": $idx($idx(a, "date"), "text")})));
      }
    }
  } else {
    throw $new(KeyError, [key]);
  }
  count = Counter((() => { const $r = []; let r, $t1; for (const $c0 of $iter(rows)) { r = $c0; if (!$T(($T($t1 = $M.get(r, "winner")) ? (key !== "award:team") : $t1))) continue; $r.push($idx(r, "winner")); } return $r; })());
  if ((key === "award:team")) {
    count = Counter((() => { const $r = []; let p, r; for (const $c0 of $iter(rows)) { r = $c0; for (const $c1 of $iter($idx(r, "team"))) { p = $c1; $r.push($idx(p, "name")); } } return $r; })());
  }
  board = (() => { const $r = []; let c, n; for (const $c0 of $iter(count.most_common(15))) { [n, c] = $iter($c0); $r.push($dict($kw({"name": n, "count": c, "seasons": $sorted((() => { const $r = []; let r; for (const $c0 of $iter(rows)) { r = $c0; if (!(($eq($M.get(r, "winner"), n)) || ((key === "award:team") && $any((() => { const $r = []; let p; for (const $c0 of $iter($idx(r, "team"))) { p = $c0; $r.push(($eq($idx(p, "name"), n))); } return $r; })())))) continue; $r.push($idx(r, "season")); } return $r; })())}))); } return $r; })();
  return $dict($kw({"key": key, "title": title, "emblem": spec, "nation": nation, "rows": $slice(rows, null, null, (-1)), "board": board}));
}
HOF_POINTS = $lit_dict([["Ballon d'Or", 15], ["Golden Boot", 5], ["Team of the Year", 4], ["Young Player of the Year", 2], ["league", 2], ["cup", 3], ["world", 5], ["contin", 3], ["nl", 1.5]]);
function player_hof(w, p, retired) {
  let counts, goals, kind, pts, season, title, $t1;
  [pts, counts] = $iter([0.0, Counter()]);
  for (const $f16 of $iter(p.honours)) {
    [season, kind, title] = $iter($f16);
    if ((kind === "award")) {
      pts = $iadd(pts, $M.get(HOF_POINTS, title, 1));
      $setidx(counts, title, $idx(counts, title) + 1);
    } else {
      pts = $iadd(pts, $M.get(HOF_POINTS, kind, 1));
      $t1 = ((kind !== "league") ? title : "League titles"), $setidx(counts, $t1, $idx(counts, $t1) + 1);
    }
  }
  pts = $iadd(pts, ($max(0, (p.peak - 80)) * 1.5));
  goals = $sum((() => { const $r = []; let s; for (const $c0 of $iter($getattr(p, "stats", []))) { s = $c0; $r.push($idx(s, 2)); } return $r; })());
  return $dict($kw({"uid": $getattr(p, "uid", 0), "name": p.name, "nat": p.nat, "pos": p.pos, "peak": p.peak, "age": p.age, "retired": retired, "club": p.club, "score": $round(pts, 1), "goals": goals, "seasons": $len(p.career), "honours": $dict(counts)}));
}
function halloffame(w) {
  let aw, co, coach_rows, coaches, players, pool;
  w.ensure_uids();
  players = (() => { const $r = []; let p; for (const $c0 of $iter(w.players)) { p = $c0; if (!$T(p.honours)) continue; $r.push(player_hof(w, p, false)); } return $r; })();
  players = $iadd(players, (() => { const $r = []; let p; for (const $c0 of $iter(w.retired_players)) { p = $c0; if (!$T(p.honours)) continue; $r.push(player_hof(w, p, true)); } return $r; })());
  $M.sort(players, $kw({"key": ((d) => (-$idx(d, "score")))}));
  coaches = new $Dict();
  pool = $add($add($list(w.retired_all), (() => { const $r = []; let c; for (const $c0 of $iter($M.values(w.clubs))) { c = $c0; if (!$T($idx(c, "coach"))) continue; $r.push($idx(c, "coach")); } return $r; })()), (() => { const $r = []; let n; for (const $c0 of $iter($M.values(w.nations))) { n = $c0; if (!$T($M.get(n, "coach"))) continue; $r.push($idx(n, "coach")); } return $r; })());
  for (const $f17 of $iter(pool)) {
    co = $f17;
    $setidx(coaches, $id(co), co);
  }
  coach_rows = [];
  for (const $f18 of $iter($M.values(coaches))) {
    co = $f18;
    aw = $sum((() => { const $r = []; let h; for (const $c0 of $iter($getattr(co, "honours", []))) { h = $c0; if (!($idx(h, 1) === "award")) continue; $r.push(1); } return $r; })());
    if ((co.seasons < 3)) {
      continue;
    }
    $M.append(coach_rows, $dict($kw({"name": co.name, "nat": co.nat, "seasons": co.seasons, "titles": co.titles, "cups": co.cups, "cwc": co.cwc, "win": $round($mul(co.win_pct, 100)), "awards": aw, "retired": ($in(co, w.retired_all)), "score": $round($add(co.hof_score, $mul(aw, 12)), 1)})));
  }
  $M.sort(coach_rows, $kw({"key": ((d) => (-$idx(d, "score")))}));
  return $dict($kw({"players": $slice(players, null, 30, null), "coaches": $slice(coach_rows, null, 20, null)}));
}

// ---- club Hall of Fame (plain JS): clubs ranked by trophies, same idea as the player ranking ----
const CLUB_HOF_W = {
  domestic: [3, 1],                 // league title / runner-up
  continental: [8, 2.5],
  world: [15, 4],                   // Club World Cup
  "Ballon d'Or": [4, 0], "Coach of the Year": [2, 0], "Golden Boot": [2, 0], "Young Player of the Year": [1.5, 0],
  "Team of the Year places": [0.25, 0]
};
function club_hof(w) {
  const rows = [];
  for (const name of [...$iter(w.clubs)]) {
    const c = $idx(w.clubs, name);
    const tr = club_trophies(w, name);
    if (!tr.length) continue;
    let pts = 0, dom = 0, cont = 0, cwc = 0, ind = 0, toty = 0, sec = 0, last = 0;
    const bits = [];
    for (const t of tr) {
      const grp = $idx(t, "group"), title = $idx(t, "title"), n = $idx(t, "count") || 0, secs = $len($idx(t, "runner_up"));
      const wt = grp === "individual" ? CLUB_HOF_W[title] || [1, 0] : CLUB_HOF_W[grp] || [1, 0];
      pts += n * wt[0] + secs * wt[1];
      if (grp === "domestic") dom += n; else if (grp === "continental") cont += n; else if (grp === "world") cwc += n;
      else if (title === "Team of the Year places") toty += n; else ind += n;
      sec += secs;
      for (const x of [...$iter($idx(t, "seasons"))]) if (x > last) last = x;
      if (n && grp !== "individual") bits.push([n, title]);
    }
    if (pts <= 0) continue;
    rows.push({ name, league: $idx(c, "league"), confed: $idx(c, "confed"), score: Math.round(pts * 10) / 10, league_titles: dom, continental: cont, cwc, awards: ind, toty, runner_ups: sec, last, honours: bits.map(([n, t]) => n + "\u00d7 " + t).join(" \u00b7 ") });
  }
  rows.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1));
  return { clubs: rows.slice(0, 40), total: rows.length,
    points: "League title 3 (runner-up 1), continental cup 8 (2.5), Club World Cup 15 (4), Ballon d'Or 4, Coach of the Year 2, Golden Boot 2, Young Player 1.5, Team of the Year place 0.25" };
}
return {club_hof: club_hof, AWARDS: AWARDS, CONF_COLOR: CONF_COLOR, Counter: Counter, HOF_POINTS: HOF_POINTS, SPEC_CWC: SPEC_CWC, SPEC_WC: SPEC_WC, club_trophies: club_trophies, defaultdict: defaultdict, halloffame: halloffame, league_color: league_color, nation_trophies: nation_trophies, options: options, player_hof: player_hof, spec_award: spec_award, spec_ct: spec_ct, spec_cup: spec_cup, spec_league: spec_league, spec_nl: spec_nl, winners: winners, zlib: zlib};
})();
