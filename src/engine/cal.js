$mods["cal"] = (function() {
const dt = $py.datetime;
let OFFSET;
OFFSET = $lit_dict([["league", 0], ["cup", 4], ["cwc", 0], ["wc", 0], ["ic", 4], ["qual", 5], ["comp", 0], ["ct", 0], ["nl", 5]]);
function season_start(start_year, season) {
  let d;
  d = dt.date(($add(start_year, season) - 1), 8, 1);
  return $add(d, dt.timedelta($kw({"days": $mod((5 - d.weekday()), 7)})));
}
function date_for(start_year, season, week, kind = "league") {
  return $add(season_start(start_year, season), dt.timedelta($kw({"days": $add($mul(7, (week - 1)), $M.get(OFFSET, kind, 0))})));
}
function text(d) {
  return ($fmt(d, "%a") + " " + $str(d.day) + " " + $fmt(d, "%b") + " " + $str(d.year));
}
function season_label(start_year, season) {
  let y;
  y = ($add(start_year, season) - 1);
  return ($str(y) + "/" + $fmt($mod((y + 1), 100), "02d"));
}
function pack(d) {
  return $dict($kw({"iso": d.isoformat(), "text": text(d)}));
}
return {OFFSET: OFFSET, date_for: date_for, dt: dt, pack: pack, season_label: season_label, season_start: season_start, text: text};
})();
