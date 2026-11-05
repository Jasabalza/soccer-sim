$mods["god"] = (function() {
let POS;
POS = ["GK", "DEF", "MID", "FWD"];
class EditError extends Exception {
}
$CLS['EditError'] = EditError;
function _int(v, lo, hi, what) {
  try {
    v = $int($round($float(v)));
  } catch ($e1) {
    if ($excmatch($e1, [TypeError_, ValueError])) {
      throw $new(EditError, [($str(what) + " must be a number")]);
    }
    else throw $e1;
  }
  if ((!($le(lo, v) && $le(v, hi)))) {
    throw $new(EditError, [($str(what) + " must be between " + $str(lo) + " and " + $str(hi))]);
  }
  return v;
}
function _flt(v, lo, hi, what) {
  try {
    v = $float(v);
  } catch ($e1) {
    if ($excmatch($e1, [TypeError_, ValueError])) {
      throw $new(EditError, [($str(what) + " must be a number")]);
    }
    else throw $e1;
  }
  if ((!($le(lo, v) && $le(v, hi)))) {
    throw $new(EditError, [($str(what) + " must be between " + $str(lo) + " and " + $str(hi))]);
  }
  return v;
}
function _set_ovr(p, ovr) {
  p.ovr = ovr;
  p.peak = $max(p.peak, ovr);
  p.pot = $max(p.pot, ovr);
}
function _shift_players(players, target, what) {
  let delta, p, top;
  top = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(players)) { p = $c0; $r.push(p.ovr); } return $r; })(), $kw({"reverse": true})), null, 11, null);
  if ((!$T(top))) {
    throw $new(EditError, ["no players to change"]);
  }
  delta = $round($sub(target, $div($sum(top), $len(top))));
  for (const $f1 of $iter(players)) {
    p = $f1;
    _set_ovr(p, $max(30, $min(99, $add(p.ovr, delta))));
  }
  return delta;
}
function refresh_eff(w, running = false) {
  let c, eff, n, started, $t1;
  w.recompute_clubs();
  w.recompute_nations();
  for (const $f2 of $iter($M.values(w.comps))) {
    c = $f2;
    started = ((c.ptr > 0) || $bool($getattr(c, "partial", null)) || (c.pg != null && Object.keys(c.pg).length > 0));
    if ($T(($T($t1 = started) ? (!$T(running)) : $t1))) {
      continue;
    }
    eff = $getattr(c, "eff", null);
    if ((!$isinstance(eff, $dict))) {
      continue;
    }
    for (const $f3 of $iter($list(eff))) {
      n = $f3;
      if (($in(n, w.clubs))) {
        $setidx(eff, n, $idx($idx(w.clubs, n), "eff"));
      } else if (($in(n, w.nations))) {
        $setidx(eff, n, $idx($idx(w.nations, n), "eff"));
      }
    }
  }
}
function apply(w, body, mx) {
  let c, club, d, entry, f, kind, log, n, now, p, pool, who, $t1, $t2, $t3, $t4;
  kind = $M.get(body, "kind");
  now = $bool($M.get(body, "apply_now"));
  log = [];
  if ((kind === "player")) {
    p = w.player_by_uid($int($idx(body, "uid")));
    if ((p == null)) {
      throw $new(EditError, ["unknown player"]);
    }
    f = $M.get(body, "fields", new $Dict());
    if (($in("ovr", f))) {
      _set_ovr(p, _int($idx(f, "ovr"), 30, 99, "OVR"));
      $M.append(log, ("OVR " + $str(p.ovr)));
    }
    if (($in("pot", f))) {
      p.pot = $max(p.ovr, _int($idx(f, "pot"), 30, 99, "Potential"));
      $M.append(log, ("potential " + $str(p.pot)));
    }
    if (($in("age", f))) {
      p.age = _int($idx(f, "age"), 15, 45, "Age");
      $M.append(log, ("age " + $str(p.age)));
    }
    if (($in("pos", f))) {
      if ((!$in($idx(f, "pos"), POS))) {
        throw $new(EditError, ["position must be GK, DEF, MID or FWD"]);
      }
      p.pos = $idx(f, "pos");
      $M.append(log, ("position " + $str(p.pos)));
    }
    if (($in("wage", f))) {
      p.wage = $div(_flt($idx(f, "wage"), 0, 200, "Wage"), mx);
      $M.append(log, ("wage " + $str($idx(f, "wage")) + "M"));
    }
    if (($in("contract", f))) {
      p.contract = _int($idx(f, "contract"), 0, 8, "Contract years");
      $M.append(log, ("contract " + $str(p.contract) + " yr"));
    }
    if (($in("club", f))) {
      club = ($T($t1 = $idx(f, "club")) ? $t1 : null);
      if (((club != null) && (!$in(club, w.clubs)))) {
        throw $new(EditError, ["unknown club"]);
      }
      p.club = club;
      if ($T(club)) {
        p.league = $idx($idx(w.clubs, club), "league");
      }
      $M.append(log, ("club " + $str(($T($t2 = club) ? $t2 : "free agent"))));
    }
    if ($T(($T($t3 = $M.get(body, "retire")) ? ($in(p, w.players)) : $t3))) {
      if ($T(($T($t4 = (p.peak >= 86)) ? $t4 : p.honours))) {
        $M.append(w.retired_players, p);
      }
      $M.remove(w.players, p);
      $M.append(log, "retired");
    }
    who = p.name;
  } else if ((kind === "club")) {
    n = $M.get(body, "name");
    if ((!$in(n, w.clubs))) {
      throw $new(EditError, ["unknown club"]);
    }
    c = $idx(w.clubs, n);
    f = $M.get(body, "fields", new $Dict());
    if (($in("budget", f))) {
      $setidx(c, "budget", $div(_flt($idx(f, "budget"), 1, 5000, "Budget"), mx));
      $setidx(c, "income", $idx(c, "budget"));
      $M.append(log, ("budget " + $str($idx(f, "budget")) + "M"));
    }
    if (($in("funds", f))) {
      $setidx(c, "funds", $div(_flt($idx(f, "funds"), 0, 5000, "Transfer funds"), mx));
      $M.append(log, ("transfer funds " + $str($idx(f, "funds")) + "M"));
    }
    if (($in("team_ovr", f))) {
      d = _shift_players((() => { const $r = []; let p; for (const $c0 of $iter(w.players)) { p = $c0; if (!($eq(p.club, n))) continue; $r.push(p); } return $r; })(), _int($idx(f, "team_ovr"), 40, 99, "Team OVR"), n);
      $M.append(log, ("team OVR set (squad " + $fmt(d, "+d") + ")"));
    }
    if (($in("stature", f))) {
      $setidx(c, "stature", _flt($idx(f, "stature"), 0, 100, "Stature"));
      $M.append(log, ("stature " + $str($idx(c, "stature"))));
    }
    who = n;
  } else if ((kind === "nation")) {
    n = $M.get(body, "name");
    if ((!$in(n, w.nations))) {
      throw $new(EditError, ["unknown nation"]);
    }
    f = $M.get(body, "fields", new $Dict());
    if (($in("dev", f))) {
      $setidx($idx(w.nations, n), "dev", _flt($idx(f, "dev"), 30, 100, "Talent"));
      $M.append(log, ("talent " + $fmt($idx($idx(w.nations, n), "dev"), ".0f")));
    }
    if (($in("team_ovr", f))) {
      pool = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(w.players)) { p = $c0; if (!($eq(p.nat, n))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-p.ovr))})), null, 23, null);
      d = _shift_players(pool, _int($idx(f, "team_ovr"), 40, 99, "Team OVR"), n);
      $M.append(log, ("national team OVR set (players " + $fmt(d, "+d") + ")"));
    }
    who = n;
  } else if ((kind === "league")) {
    n = $M.get(body, "name");
    if ((!$in(n, w.leagues))) {
      throw $new(EditError, ["unknown league"]);
    }
    f = $M.get(body, "fields", new $Dict());
    if (($in("tvmult", f))) {
      $setidx($idx(w.leagues, n), "tvmult", _flt($idx(f, "tvmult"), 0.1, 5, "TV money multiplier"));
      $M.append(log, ("TV money x" + $fmt($idx($idx(w.leagues, n), "tvmult"), ".2f")));
    }
    who = n;
  } else {
    throw $new(EditError, ["unknown edit"]);
  }
  if ((!$T(log))) {
    throw $new(EditError, ["nothing to change"]);
  }
  refresh_eff(w, now);
  if ((!$hasattr(w, "edit_log"))) {
    w.edit_log = [];
  }
  entry = $dict($kw({"season": w.season, "who": who, "kind": kind, "text": $M.join(", ", log), "now": now}));
  $M.append(w.edit_log, entry);
  return entry;
}
return {EditError: EditError, POS: POS, _flt: _flt, _int: _int, _set_ovr: _set_ovr, _shift_players: _shift_players, apply: apply, refresh_eff: refresh_eff};
})();
