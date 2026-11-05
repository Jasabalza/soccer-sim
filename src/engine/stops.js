$mods["stops"] = (function() {
let PRESETS, STOP_ITEMS;
STOP_ITEMS = [["year_end", "End of every season"], ["ceremony", "Award ceremony every season (Ballon d'Or, coach, team of the year)"], ["every_n", "Every N seasons (set N below)"], ["league_champ", "A league champion is crowned (chosen leagues)"], ["cup_winner", "A continental cup winner"], ["cwc_wc", "Club World Cup / World Cup winner"], ["dynasty", "A dynasty starts or ends (3+ titles in a row)"], ["star_move", "A star move (OVR 88+)"], ["giant_coach", "A giant club fires or hires a coach"], ["record", "A league record is broken"], ["first_wc", "A nation reaches its first World Cup"], ["league_rank", "A league changes place in the strength ranking"]];
PRESETS = $lit_dict([["quick", $set()], ["normal", $lit_set(["year_end"])], ["watch", (() => { const $r = new $Set(); let _, k; for (const $c0 of $iter(STOP_ITEMS)) { [k, _] = $iter($c0); if (!(k !== "every_n")) continue; $r.add(k); } return $r; })()]]);
class Stops {
  __init__() {
    const self = this;
    self.on = $set($idx(PRESETS, "normal"));
    self.n = 5;
    self.leagues = $set();
  }
  evaluate(w, rec) {
    const self = this;
    let _, a, b, c, confed, h, i, k, last, ln, n, news, nm, prev, rank, run, s, t, why, $t1, $t2, $t3;
    why = [];
    h = w.hist;
    s = $idx(rec, "season");
    if (($in("year_end", self.on))) {
      $M.append(why, "end of season");
    }
    if (($in("ceremony", self.on))) {
      $M.append(why, "award ceremony");
    }
    if ((($in("every_n", self.on)) && ($mod(s, self.n) === 0))) {
      $M.append(why, ("every " + $str(self.n) + " seasons"));
    }
    if (($in("league_champ", self.on))) {
      for (const $f1 of $iter($M.items($idx(rec, "champs")))) {
        [ln, c] = $iter($f1);
        if (((!$T(self.leagues)) || ($in(ln, self.leagues)))) {
          $M.append(why, ($str(ln) + " champion: " + $str(c)));
        }
      }
    }
    if (($in("cup_winner", self.on))) {
      for (const $f2 of $iter($M.items($idx(rec, "cups")))) {
        ($t1 = $iter($f2), confed = $t1[0], [a, b] = $iter($t1[1]));
        $M.append(why, ($str($idx($idx(w.cups, confed), "name")) + ": " + $str(a)));
      }
    }
    if (($in("cwc_wc", self.on))) {
      if ($T($idx(rec, "cwc"))) {
        $M.append(why, ("Club World Cup: " + $str($idx($idx(rec, "cwc"), 0))));
      }
      if ($T($idx(rec, "wc"))) {
        $M.append(why, ("World Cup: " + $str($idx($idx(rec, "wc"), 0)) + " (host " + $str($idx($idx(rec, "wc"), 2)) + ")"));
      }
    }
    if ((($in("dynasty", self.on)) && ($len(h) >= 4))) {
      for (const $f3 of $iter(w.leagues)) {
        ln = $f3;
        last = (() => { const $r = []; let r; for (const $c0 of $iter(h)) { r = $c0; $r.push($idx($idx(r, "champs"), ln)); } return $r; })();
        run = 1;
        while (($lt(run, $len(last)) && ($eq($idx(last, $sub((-1), run)), $idx(last, (-1)))))) {
          run = run + 1;
        }
        if ((run === 3)) {
          $M.append(why, ("dynasty: " + $str($idx(last, (-1))) + " win a third " + $str(ln) + " title in a row"));
        }
        prev = 1;
        while (($lt(prev, ($len(last) - 1)) && ($eq($idx(last, $sub((-2), prev)), $idx(last, (-2)))))) {
          prev = prev + 1;
        }
        if (((prev >= 3) && (!$eq($idx(last, (-1)), $idx(last, (-2)))))) {
          $M.append(why, ("dynasty ends: " + $str($idx(last, (-2))) + " lose the " + $str(ln) + " after " + $str(prev) + " straight titles"));
        }
      }
    }
    news = (() => { const $r = []; let x; for (const $c0 of $iter(w.news_log)) { x = $c0; if (!($eq($idx(x, 0), s))) continue; $r.push(x); } return $r; })();
    if ((($in("star_move", self.on)) && $any((() => { const $r = []; let _, k; for (const $c0 of $iter(news)) { [_, _, k, _] = $iter($c0); $r.push((k === "transfer")); } return $r; })()))) {
      $M.append(why, ("star move: " + $next((() => { const $r = []; let _, k, t; for (const $c0 of $iter(news)) { [_, _, k, t] = $iter($c0); if (!(k === "transfer")) continue; $r.push(t); } return $r; })())));
    }
    if (($in("giant_coach", self.on))) {
      for (const $f4 of $iter(news)) {
        [_, _, k, t] = $iter($f4);
        if (((k === "coach") && (($in("fire", t)) || ($in("leaves", t))))) {
          $M.append(why, ("coach: " + t));
          break;
        }
      }
    }
    if ($T(($T($t2 = ($in("record", self.on))) ? $M.get(rec, "records") : $t2))) {
      $M.append(why, ("record: " + $idx($idx(rec, "records"), 0)));
    }
    if ($T(($T($t3 = ($in("first_wc", self.on))) ? $idx(rec, "wc") : $t3))) {
      for (const $f5 of $iter($M.items(w.nations))) {
        [nm, n] = $iter($f5);
        if (($idx(n, "wc_apps") === 1)) {
          $M.append(why, ($str(nm) + " reach their first World Cup"));
        }
      }
    }
    if ((($in("league_rank", self.on)) && ($len(h) >= 2))) {
      rank = function rank(r) {
        return $sorted($idx(r, "lavg"), $kw({"key": ((l) => (-$idx($idx(r, "lavg"), l)))}));
      };
      [a, b] = $iter([rank($idx(h, (-2))), rank($idx(h, (-1)))]);
      for (const $f6 of $iter($enumerate(b))) {
        [i, ln] = $iter($f6);
        if (((!$eq($M.index(a, ln), i)) && (i < 6))) {
          $M.append(why, ($str(ln) + " moves from #" + $str(($M.index(a, ln) + 1)) + " to #" + $str((i + 1)) + " in league strength"));
        }
      }
    }
    return why;
  }
}
$CLS['Stops'] = Stops;
return {PRESETS: PRESETS, STOP_ITEMS: STOP_ITEMS, Stops: Stops};
})();
