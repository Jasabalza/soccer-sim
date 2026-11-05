$mods["sim_core"] = (function() {
const gzip = $py.gzip;
const json = $py.json;
const math = $py.math;
const os = $py.os;
const pickle = $py.pickle;
const random = $py.random;
const statistics = $py.statistics;
const {Counter, defaultdict} = $py.collections || {};
const {dataclass, field, replace} = $py.dataclasses || {};
const awards = $mods.awards;
const cal = $mods.cal;
const C = $mods.comps;
const natcomps = $mods.natcomps;
const shim = $mods.shim;
let CONTINENT, DATA_DIR, FIRST_NAMES, HERE, LAST_NAMES, MAX_OVR, MIN_OVR, PLAN, SQUAD_MAX, XI;
HERE = "";
DATA_DIR = "data";
[SQUAD_MAX, XI] = $iter([25, 11]);
[MIN_OVR, MAX_OVR] = $iter([30, 99]);
PLAN = $add($add($add($add(["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"], ["GK", "GK"]), $mul(["DEF"], 4)), $mul(["MID"], 4)), $mul(["FWD"], 4));
FIRST_NAMES = ["Liam", "Noah", "Mateo", "Lucas", "Oliver", "Ethan", "Mason", "Leo", "Hugo", "Adam", "Ravi", "Kenji", "Tomas", "Diego", "Samuel", "Felix", "Jonas", "Marco", "Luca", "Andre", "Kwame", "Yusuf", "Omar", "Idris", "Sergio", "Ivan", "Pavel", "Niklas", "Stefan", "Lukas", "Emil", "Theo", "Victor", "Ruben", "Ibrahim", "Kai", "Ezra", "Declan", "Rafael", "Bruno", "Jamal", "Tariq", "Hiroshi", "Mateus", "Callum", "Jordan", "Dante", "Armando", "Javier", "Rico"];
LAST_NAMES = ["Silva", "Müller", "Okafor", "Tanaka", "Rossi", "Dubois", "Haddad", "Novak", "Lindqvist", "Garcia", "Kowalski", "Mensah", "Fernandes", "Yilmaz", "Ferreira", "Nakamura", "Andersen", "Moreau", "Costa", "Hansen", "Romero", "Khan", "Petrov", "Johansson", "Diallo", "Castillo", "Brennan", "Ortiz", "Walsh", "Kaur", "Meyer", "Schmidt", "Fischer", "Bianchi", "Lopez", "Ramos", "Herrera", "Abdullah", "Osei", "Ito", "Brandt", "Keller", "Lambert", "Vargas", "Navarro", "Murphy", "Sato", "Reyes", "Quinn", "Duarte"];
CONTINENT = $lit_dict([["UEFA", "Europe"], ["CONMEBOL", "South America"], ["CONCACAF", "North America"], ["AFC", "Asia"], ["CAF", "Africa"], ["OFC", "Oceania"]]);
function eur(m) {
  if ((m >= 1000)) {
    return ("€" + $fmt((m / 1000), ".2f") + "B");
  }
  if ((m >= 10)) {
    return ("€" + $fmt(m, ".0f") + "M");
  }
  if ((m >= 1)) {
    return ("€" + $fmt(m, ".1f") + "M");
  }
  return ("€" + $fmt($mul(m, 1000), ".0f") + "K");
}
class Settings {
  describe() {
    const self = this;
    let base, diffs, $t1;
    base = $new(Settings, []);
    diffs = (() => { const $r = []; let k, v; for (const $c0 of $iter($M.items(self.__dict__))) { [k, v] = $iter($c0); if (!((k !== "label") && (!$eq(v, $getattr(base, k))))) continue; $r.push(($str(k) + "=" + $str(v))); } return $r; })();
    return ($T($t1 = $M.join(", ", diffs)) ? $t1 : "defaults");
  }
  __init__(...$args) {
    const $v = $bind($args, ["label", "seasons", "target_pool", "cup_size", "cup_prize_scale", "anchor_gain", "league_rise", "dev_pot_growth", "pot_shift", "pot_low", "pot_mode", "poach_base", "spread_gain", "poach_buyers", "poach_max", "poach_contract_max", "poach_min_gain", "coach_match_bonus", "tactician_boost", "club_prestige_budget", "transfer_share", "prestige_decay", "title_pts", "apex_pts", "hot_tolerance", "fire_after", "loyal_resign", "money_resign", "contract_min", "contract_max", "retire_start", "retire_ramp", "outflow_base", "outflow_age_start", "outflow_age_slope", "outflow_max", "release_top_n", "tv_base", "tv_cycle", "gate_k", "rail", "owner_fund_league", "owner_fund_amount", "money_x", "stature_gain", "home_prob", "first_contract", "nat_rate", "nat_expo_gain", "nat_star_gain", "nat_wc_gain", "amateur_base", "nat_supply_pow", "nat_quality_div", "nat_dev_cap", "nat_form_decay", "nat_coach_years", "fee_scale", "funds_share", "sale_to_budget", "xleague_buyers", "xleague_p", "wc_size", "start_year", "wage_cap", "run_cost", "sponsor_share", "debt_rate", "cash_keep", "acad_cost", "acad_gain", "acad_decay", "acad_share", "invest_rate", "stad_cost", "stad_upkeep", "comfort", "bid_lots", "bid_max", "cwc_pool"], [() => "v11 default", () => 40, () => 350, () => 0, () => 1.0, () => 1.0, () => 0.15, () => true, () => 0, () => 54, () => 60, () => 0.8, () => 0.3, () => 3, () => 2, () => 2, () => 3, () => 2.0, () => 3.0, () => 0.03, () => 1.0, () => 0.05, () => 40.0, () => 80.0, () => 5, () => 2, () => 0.92, () => 0.65, () => 2, () => 5, () => 33, () => 0.15, () => 0.1, () => 24, () => 0.03, () => 0.9, () => 25, () => 1.12, () => 3, () => 0.6, () => 0.6, () => "", () => 0.0, () => 3.5, () => 1.0, () => 0.7, () => 3, () => 0.1, () => 0.8, () => 0.4, () => 12.0, () => 40.0, () => 2.5, () => 7.0, () => 20.0, () => 0.85, () => 4, () => 1.0, () => 0.3, () => 0.5, () => 30, () => 0.4, () => 0, () => 2026, () => 0.75, () => 0.10, () => 0.25, () => 0.06, () => 0.7, () => 0.3, () => 0.2, () => 0.3, () => 0.35, () => 0.3, () => 4.0, () => 0.08, () => 2.0, () => 240, () => 4, () => 340.0]);
    this.label = $v[0];
    this.seasons = $v[1];
    this.target_pool = $v[2];
    this.cup_size = $v[3];
    this.cup_prize_scale = $v[4];
    this.anchor_gain = $v[5];
    this.league_rise = $v[6];
    this.dev_pot_growth = $v[7];
    this.pot_shift = $v[8];
    this.pot_low = $v[9];
    this.pot_mode = $v[10];
    this.poach_base = $v[11];
    this.spread_gain = $v[12];
    this.poach_buyers = $v[13];
    this.poach_max = $v[14];
    this.poach_contract_max = $v[15];
    this.poach_min_gain = $v[16];
    this.coach_match_bonus = $v[17];
    this.tactician_boost = $v[18];
    this.club_prestige_budget = $v[19];
    this.transfer_share = $v[20];
    this.prestige_decay = $v[21];
    this.title_pts = $v[22];
    this.apex_pts = $v[23];
    this.hot_tolerance = $v[24];
    this.fire_after = $v[25];
    this.loyal_resign = $v[26];
    this.money_resign = $v[27];
    this.contract_min = $v[28];
    this.contract_max = $v[29];
    this.retire_start = $v[30];
    this.retire_ramp = $v[31];
    this.outflow_base = $v[32];
    this.outflow_age_start = $v[33];
    this.outflow_age_slope = $v[34];
    this.outflow_max = $v[35];
    this.release_top_n = $v[36];
    this.tv_base = $v[37];
    this.tv_cycle = $v[38];
    this.gate_k = $v[39];
    this.rail = $v[40];
    this.owner_fund_league = $v[41];
    this.owner_fund_amount = $v[42];
    this.money_x = $v[43];
    this.stature_gain = $v[44];
    this.home_prob = $v[45];
    this.first_contract = $v[46];
    this.nat_rate = $v[47];
    this.nat_expo_gain = $v[48];
    this.nat_star_gain = $v[49];
    this.nat_wc_gain = $v[50];
    this.amateur_base = $v[51];
    this.nat_supply_pow = $v[52];
    this.nat_quality_div = $v[53];
    this.nat_dev_cap = $v[54];
    this.nat_form_decay = $v[55];
    this.nat_coach_years = $v[56];
    this.fee_scale = $v[57];
    this.funds_share = $v[58];
    this.sale_to_budget = $v[59];
    this.xleague_buyers = $v[60];
    this.xleague_p = $v[61];
    this.wc_size = $v[62];
    this.start_year = $v[63];
    this.wage_cap = $v[64];
    this.run_cost = $v[65];
    this.sponsor_share = $v[66];
    this.debt_rate = $v[67];
    this.cash_keep = $v[68];
    this.acad_cost = $v[69];
    this.acad_gain = $v[70];
    this.acad_decay = $v[71];
    this.acad_share = $v[72];
    this.invest_rate = $v[73];
    this.stad_cost = $v[74];
    this.stad_upkeep = $v[75];
    this.comfort = $v[76];
    this.bid_lots = $v[77];
    this.bid_max = $v[78];
    this.cwc_pool = $v[79];
  }
}
$CLS['Settings'] = Settings;
class Player {
  __post_init__() {
    const self = this;
    if ((!$T(self.peak))) {
      self.peak = self.ovr;
    }
  }
  __init__(...$args) {
    const $v = $bind($args, ["name", "age", "pos", "ovr", "pot", "club", "league", "nat", "wage", "contract", "pref", "prot", "peak", "career", "honours", "stats", "cstats", "uid"], [$R, $R, $R, $R, $R, $R, $R, $R, $R, $R, () => null, () => 0, () => 0, () => $list(), () => $list(), () => $list(), () => $list(), () => 0]);
    this.name = $v[0];
    this.age = $v[1];
    this.pos = $v[2];
    this.ovr = $v[3];
    this.pot = $v[4];
    this.club = $v[5];
    this.league = $v[6];
    this.nat = $v[7];
    this.wage = $v[8];
    this.contract = $v[9];
    this.pref = $v[10];
    this.prot = $v[11];
    this.peak = $v[12];
    this.career = $v[13];
    this.honours = $v[14];
    this.stats = $v[15];
    this.cstats = $v[16];
    this.uid = $v[17];
    this.__post_init__();
  }
}
$CLS['Player'] = Player;
class Coach {
  get win_pct() {
    const self = this;
    let g;
    g = $add($add(self.w, self.d), self.l);
    return ($T(g) ? $div($add(self.w, (0.5 * self.d)), g) : 0.0);
  }
  get hof_score() {
    const self = this;
    return $add($add($add($add($add($mul(self.titles, 10), $mul(self.cups, 25)), $mul(self.cwc, 15)), (self.seasons * 0.5)), $mul(self.win_pct, 30)), (self.prestige * 0.2));
  }
  __init__(...$args) {
    const $v = $bind($args, ["name", "age", "personality", "skill", "prestige", "nat", "club", "last_club", "intl", "prev_attr", "contract", "hot", "unemployed_years", "seasons", "w", "d", "l", "titles", "cups", "cwc", "best_finish", "clubs", "honours"], [$R, $R, $R, $R, $R, () => "", () => null, () => null, () => null, () => 0.0, () => 0, () => 0, () => 0, () => 0, () => 0, () => 0, () => 0, () => 0, () => 0, () => 0, () => 99, () => $list(), () => $list()]);
    this.name = $v[0];
    this.age = $v[1];
    this.personality = $v[2];
    this.skill = $v[3];
    this.prestige = $v[4];
    this.nat = $v[5];
    this.club = $v[6];
    this.last_club = $v[7];
    this.intl = $v[8];
    this.prev_attr = $v[9];
    this.contract = $v[10];
    this.hot = $v[11];
    this.unemployed_years = $v[12];
    this.seasons = $v[13];
    this.w = $v[14];
    this.d = $v[15];
    this.l = $v[16];
    this.titles = $v[17];
    this.cups = $v[18];
    this.cwc = $v[19];
    this.best_finish = $v[20];
    this.clubs = $v[21];
    this.honours = $v[22];
  }
}
$CLS['Coach'] = Coach;
function clamp(v, lo = MIN_OVR, hi = MAX_OVR) {
  return $max(lo, $min(hi, v));
}
function fclamp(v, lo, hi) {
  return $max(lo, $min(hi, v));
}
function parse_clubs(text) {
  let name, out, ovr, part;
  out = [];
  for (const $f1 of $iter($M.split(text, ","))) {
    part = $f1;
    [name, ovr] = $iter($M.rsplit($M.strip(part), " ", 1));
    $M.append(out, [name, $int(ovr)]);
  }
  return out;
}
function wage_for(ovr, age) {
  let w;
  w = ($pow($max(0, (ovr - 55)), 1.5) * 0.05);
  if ((age >= 31)) {
    w = w * 0.7;
  }
  return $round(w, 2);
}
class Locked extends Exception {
  __init__(cid, missing) {
    const self = this;
    [self.cid, self.missing] = $iter([cid, missing]);
    super.__init__(($str(cid) + " is locked: needs " + $str($M.join(", ", missing)) + " first"));
  }
}
$CLS['Locked'] = Locked;
class World {
  __init__(cfg = null, seed = 1, data_dir = null) {
    const self = this;
    let $t1, $t2, $t3;
    self.cfg = ($T($t1 = cfg) ? $t1 : $new(Settings, []));
    self.seed = seed;
    self.rng = random.Random(seed);
    self.data_dir = ($T($t2 = data_dir) ? $t2 : DATA_DIR);
    [self.clubs, self.leagues, self.cups, self.nations] = $iter([new $Dict(), new $Dict(), new $Dict(), new $Dict()]);
    [self.players, self.hist, self.news_log] = $iter([[], [], []]);
    [self.coach_pool, self.retired_coaches, self.retired_all] = $iter([[], [], []]);
    self.season = 0;
    self.o_est = 0.2;
    $t3 = null;
    self.pool_prev = $t3;
    self.pool_last = $t3;
    self.stats = Counter();
    self.cup_fields = new $Dict();
    self.comps = new $Dict();
    self.wc_count = 0;
    self.records = new $Dict();
    self.giants = $set();
    [self.wc_history, self.cwc_history] = $iter([[], []]);
    [self.transfers, self.retired_players] = $iter([[], []]);
    self.nat_hist = new $Dict();
    self.finals = [];
    self._load_data();
    self._build();
    self.compute_cup_fields(null);
    self.money_update($kw({"initial": true}));
    self.start_season();
  }
  _load_data() {
    const self = this;
    let L, confeds, k, ld, ln, lst, lsub, n, nd, nm, v, w;
    ld = json.loads($idx(shim.DATA, "leagues"));
    nd = json.loads($idx(shim.DATA, "nations"));
    self.wc = $idx(nd, "world_cup");
    if ($T(self.cfg.wc_size)) {
      $setidx(self.wc, "size", self.cfg.wc_size);
    }
    for (const $f2 of $iter($idx(nd, "nations"))) {
      n = $f2;
      n = $dict(n);
      $M.update(n, $kw({"dev": $float($idx(n, "base")), "form": 0.0, "coach": null, "ovr": 0.0, "eff": 0.0, "league": null, "exp0": 0.0, "star0": 0.0, "wc_apps": 0, "wc_titles": 0, "best": 0.0}));
      $setidx(self.nations, $idx(n, "name"), n);
    }
    for (const $f3 of $iter($idx(ld, "leagues"))) {
      L = $f3;
      L = $dict(L);
      $setidx(L, "clubs", (() => { const $r = []; let _, name; for (const $c0 of $iter(parse_clubs($idx(L, "clubs")))) { [name, _] = $iter($c0); $r.push(name); } return $r; })());
      $setidx(L, "bases", $dict(parse_clubs($idx($next((() => { const $r = []; let x; for (const $c0 of $iter($idx(ld, "leagues"))) { x = $c0; if (!($eq($idx(x, "name"), $idx(L, "name")))) continue; $r.push(x); } return $r; })()), "clubs"))));
      $M.update(L, $kw({"target": 0.0, "start_avg": 0.0, "start_std": 0.0, "tvmult": 1.0, "slots": 0, "coef_hist": $mul([($idx(L, "prestige") / 40.0)], 5)}));
      $setidx(L, "coef0", $sum($idx(L, "coef_hist")));
      $setidx(self.leagues, $idx(L, "name"), L);
      $setidx($idx(self.nations, $idx(L, "country")), "league", $idx(L, "name"));
    }
    confeds = (() => { const $r = new $Set(); let L; for (const $c0 of $iter($M.values(self.leagues))) { L = $c0; $r.add($idx(L, "confed")); } return $r; })();
    for (const $f4 of $iter($M.items($idx(ld, "cups")))) {
      [k, v] = $iter($f4);
      if (($in(k, confeds))) {
        v = $dict(v);
        if ($T(self.cfg.cup_size)) {
          $setidx(v, "size", self.cfg.cup_size);
        }
        $setidx(self.cups, k, v);
      }
    }
    self.league_clubs = (() => { const $r = new $Dict(); let L, ln; for (const $c0 of $iter($M.items(self.leagues))) { [ln, L] = $iter($c0); $r.set(ln, $idx(L, "clubs")); } return $r; })();
    lsub = (() => { const $r = new $Dict(); let L, ln; for (const $c0 of $iter($M.items(self.leagues))) { [ln, L] = $iter($c0); $r.set(ln, $idx($idx(self.nations, $idx(L, "country")), "sub")); } return $r; })();
    self.prox = new $Dict();
    for (const $f5 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f5);
      lst = [];
      for (const $f6 of $iter($M.items(self.leagues))) {
        [ln, L] = $iter($f6);
        w = 0.05;
        if (($eq($idx(L, "confed"), $idx(n, "confed")))) {
          w = 0.3;
        }
        if (($eq($idx(lsub, ln), $idx(n, "sub")))) {
          w = 0.6;
        }
        if (($eq($idx(L, "country"), nm))) {
          w = 1.0;
        }
        w = $max(w, $M.get($idx(n, "ties"), ln, 0.0));
        $M.append(lst, [ln, w]);
      }
      $setidx(self.prox, nm, lst);
    }
    self.nat_names = $list(self.nations);
  }
  comp_rng(cid) {
    const self = this;
    return random.Random(($str(self.seed) + "|" + $str(self.season) + "|" + $str(cid)));
  }
  _name() {
    const self = this;
    return ($str(self.rng.choice(FIRST_NAMES)) + " " + $str(self.rng.choice(LAST_NAMES)));
  }
  _contract() {
    const self = this;
    return self.rng.randint(self.cfg.contract_min, self.cfg.contract_max);
  }
  _rand_nat() {
    const self = this;
    let w;
    w = (() => { const $r = []; let n; for (const $c0 of $iter(self.nat_names)) { n = $c0; $r.push($pow(($idx($idx(self.nations, n), "base") / 100), 2)); } return $r; })();
    return $idx(self.rng.choices(self.nat_names, w), 0);
  }
  _new_coach(...$args) {
    const self = this;
    let [prestige, age, nat] = $bind($args, ["prestige", "age", "nat"], [$R, () => null, () => null]);
    let rng, $t1;
    rng = self.rng;
    return $new(Coach, [$kw({"name": self._name(), "age": ((age != null) ? age : rng.randint(40, 62)), "personality": rng.choice(["loyal", "money"]), "skill": rng.choice(["scout", "tactician", "none", "none"]), "prestige": prestige, "nat": ($T($t1 = nat) ? $t1 : self._rand_nat()), "contract": self._contract()})]);
  }
  _build() {
    const self = this;
    let L, age, base, base_n, ci, cname, co, coach, dom, ex, exp, g, i, lname, n, names, nat, nm, order, ovr, pos, pot, prox_l, pull, rng, st0, star, ws, $t1;
    rng = self.rng;
    for (const $f7 of $iter($M.items(self.leagues))) {
      [lname, L] = $iter($f7);
      names = [];
      for (const $f8 of $iter($idx(L, "clubs"))) {
        cname = $f8;
        base = $idx($idx(L, "bases"), cname);
        nat = ((rng.random() < 0.75) ? $idx(L, "country") : self._rand_nat());
        coach = self._new_coach(fclamp($add((10 + ((base - 55) * 1.5)), rng.uniform((-6), 6)), 5, 95), $kw({"nat": nat}));
        coach.club = cname;
        $M.append(coach.clubs, cname);
        st0 = fclamp((25 + ((base - 55) * 2.3)), 5, 100);
        $setidx(self.clubs, cname, $lit_dict([["league", lname], ["country", $idx(L, "country")], ["confed", $idx(L, "confed")], ["lprestige", $idx(L, "prestige")], ["base", base], ["ovr", base], ["eff", $float(base)], ["budget", 0.0], ["income", 0.0], ["cp", fclamp($mul((base - 40), 8), 0, 1000)], ["coach", coach], ["stint", 0], ["stature", st0], ["st0", st0], ["prize", 0.0], ["prize_prev", 0.0], ["last_finish", 0], ["funds", 0.0], ["sales", 0.0], ["spent", 0.0], ["sales_prev", 0.0], ["spent_prev", 0.0]]));
        $M.append(names, cname);
      }
      order = $sorted(names, $kw({"key": ((n) => (-$idx($idx(self.clubs, n), "base")))}));
      for (const $f9 of $iter($enumerate(order, 1))) {
        [i, n] = $iter($f9);
        $setidx($idx(self.clubs, n), "last_finish", i);
      }
      $setidx(L, "start_avg", statistics.mean((() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($idx($idx(self.clubs, n), "base")); } return $r; })()));
      $setidx(L, "target", $idx(L, "start_avg"));
      $setidx(L, "start_std", statistics.pstdev((() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($idx($idx(self.clubs, n), "base")); } return $r; })()));
      g = $set($slice(order, null, 3, null));
      $setidx(L, "giants", g);
      self.giants = $bor(self.giants, g);
    }
    base_n = (() => { const $r = []; let nm; for (const $c0 of $iter(self.nat_names)) { nm = $c0; $r.push(($idx($idx(self.nations, nm), "base") / 100)); } return $r; })();
    pull = (() => { const $r = []; let b; for (const $c0 of $iter(base_n)) { b = $c0; $r.push(($pow(b, 2) * 0.4)); } return $r; })();
    prox_l = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(self.leagues)) { ln = $c0; $r.set(ln, (() => { const $r = []; let nm; for (const $c0 of $iter(self.nat_names)) { nm = $c0; $r.push($idx($dict($idx(self.prox, nm)), ln)); } return $r; })()); } return $r; })();
    for (const $f10 of $iter($M.items(self.leagues))) {
      [lname, L] = $iter($f10);
      ci = $M.index(self.nat_names, $idx(L, "country"));
      for (const $f11 of $iter($idx(L, "clubs"))) {
        cname = $f11;
        base = $idx($idx(self.clubs, cname), "base");
        for (const $f12 of $iter($enumerate(PLAN))) {
          [i, pos] = $iter($f12);
          if ($lt(i, XI)) {
            [ovr, age] = $iter([$add(base, rng.randint((-4), 4)), rng.randint(23, 30)]);
          } else {
            [ovr, age] = $iter([$sub(base, rng.randint(6, 14)), rng.randint(18, 33)]);
          }
          ovr = clamp(ovr);
          pot = ((age < 24) ? $add(ovr, rng.randint(0, 8)) : ovr);
          dom = (1.0 - $idx(L, "foreign"));
          if ($ge(ovr, ($idx(L, "start_avg") + 6))) {
            dom = dom * 0.55;
          }
          if ($lt(rng.random(), dom)) {
            nat = $idx(L, "country");
          } else {
            ex = (1.0 + ($max(0.0, (ovr - 70)) / 8));
            ws = (() => { const $r = []; let k; for (const $c0 of $iter($range($len(base_n)))) { k = $c0; $r.push($mul($add($idx($idx(prox_l, lname), k), $idx(pull, k)), $pow($idx(base_n, k), ex))); } return $r; })();
            $setidx(ws, ci, 0.0);
            nat = $idx(rng.choices(self.nat_names, ws), 0);
          }
          $M.append(self.players, $new(Player, [self._name(), age, pos, ovr, $max(pot, ovr), cname, lname, nat, wage_for(ovr, age), rng.randint(1, 4)]));
        }
      }
    }
    for (const $f13 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f13);
      co = self._new_coach(fclamp($add((8 + (($idx(n, "base") - 40) * 0.5)), rng.uniform((-5), 5)), 3, 60), $kw({"age": rng.randint(45, 66), "nat": nm}));
      [co.intl, co.contract] = $iter([nm, self.cfg.nat_coach_years]);
      $setidx(n, "coach", co);
    }
    self.recompute_clubs();
    self.recompute_nations();
    [exp, star] = $iter(self._nation_inputs());
    for (const $f14 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f14);
      ($t1 = $iter([$idx(exp, nm), $idx(star, nm)]), $setidx(n, "exp0", $t1[0]), $setidx(n, "star0", $t1[1]));
    }
  }
  ensure_uids() {
    const self = this;
    let p, pool, top;
    pool = $add($list(self.players), $list(self.retired_players));
    top = $max($add((() => { const $r = []; let p; for (const $c0 of $iter(pool)) { p = $c0; $r.push($getattr(p, "uid", 0)); } return $r; })(), [0]));
    for (const $f15 of $iter(pool)) {
      p = $f15;
      if ((!$T($getattr(p, "uid", 0)))) {
        top = top + 1;
        p.uid = top;
      }
    }
  }
  player_by_uid(uid) {
    const self = this;
    let p;
    self.ensure_uids();
    for (const $f16 of $iter($add($list(self.players), $list(self.retired_players)))) {
      p = $f16;
      if (($eq(p.uid, uid))) {
        return p;
      }
    }
    return null;
  }
  squads() {
    const self = this;
    let p, sq;
    sq = defaultdict($list);
    for (const $f17 of $iter(self.players)) {
      p = $f17;
      if ($T(p.club)) {
        $M.append($idx(sq, p.club), p);
      }
    }
    return sq;
  }
  _coach_bonus(co) {
    const self = this;
    let b;
    if (((co == null) || (self.cfg.coach_match_bonus <= 0))) {
      return 0.0;
    }
    b = $mul((co.prestige / 100), self.cfg.coach_match_bonus);
    if ((co.skill === "tactician")) {
      b = b + 0.5;
    }
    return b;
  }
  recompute_clubs() {
    const self = this;
    let c, cname, sq, top;
    sq = self.squads();
    for (const $f18 of $iter($M.items(self.clubs))) {
      [cname, c] = $iter($f18);
      top = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter($M.get(sq, cname, []))) { p = $c0; $r.push(p.ovr); } return $r; })(), $kw({"reverse": true})), null, XI, null);
      $setidx(c, "ovr", ($T(top) ? $round($div($sum(top), $len(top))) : MIN_OVR));
      $setidx(c, "eff", $add($idx(c, "ovr"), self._coach_bonus($idx(c, "coach"))));
    }
  }
  recompute_nations() {
    const self = this;
    let am, by, n, nm, p, top;
    by = defaultdict($list);
    for (const $f19 of $iter(self.players)) {
      p = $f19;
      $M.append($idx(by, p.nat), p.ovr);
    }
    self.nat_pros = new $Dict();
    self.nat_eff = new $Dict();
    for (const $f20 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f20);
      top = $slice($sorted($M.get(by, nm, []), $kw({"reverse": true})), null, XI, null);
      $setidx(self.nat_pros, nm, $len($M.get(by, nm, [])));
      am = $add(self.cfg.amateur_base, ($idx(n, "dev") / 10));
      top = $add(top, $mul([am], $sub(XI, $len(top))));
      $setidx(n, "ovr", $div($sum(top), XI));
      $setidx(n, "eff", $add($idx(n, "ovr"), self._coach_bonus($idx(n, "coach"))));
      $setidx(self.nat_eff, nm, $idx(n, "eff"));
    }
  }
  league_avgs() {
    const self = this;
    return (() => { const $r = new $Dict(); let ln, names; for (const $c0 of $iter($M.items(self.league_clubs))) { [ln, names] = $iter($c0); $r.set(ln, statistics.mean((() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($idx($idx(self.clubs, n), "ovr")); } return $r; })())); } return $r; })();
  }
  attr(n) {
    const self = this;
    let c;
    c = $idx(self.clubs, n);
    return $add($add(($idx(c, "cp") / 10), ($idx(c, "budget") / 20)), ($idx(c, "lprestige") / 10));
  }
  news(kind, text, week = 99) {
    const self = this;
    $M.append(self.news_log, [self.season, week, kind, text]);
  }
  _count(kind) {
    const self = this;
    return $sum((() => { const $r = []; let _, k, s; for (const $c0 of $iter(self.news_log)) { [s, _, k, _] = $iter($c0); if (!(($eq(s, self.season)) && ($eq(k, kind)))) continue; $r.push(1); } return $r; })());
  }
  get cycle_year() {
    const self = this;
    return ($mod((self.season - 1), 4) + 1);
  }
  wc_host() {
    const self = this;
    let order;
    order = $idx(self.wc, "host_order");
    return $idx(order, $mod(self.wc_count, $len(order)));
  }
  coef(ln) {
    const self = this;
    return $sum($slice($idx($idx(self.leagues, ln), "coef_hist"), (-5), null, null));
  }
  allocate_slots(confed) {
    const self = this;
    let c, cap, guard, ideal, l, lns, ranked, share, size, slots, tot, wts, $t1;
    size = $idx($idx(self.cups, confed), "size");
    lns = (() => { const $r = []; let L, ln; for (const $c0 of $iter($M.items(self.leagues))) { [ln, L] = $iter($c0); if (!($eq($idx(L, "confed"), confed))) continue; $r.push(ln); } return $r; })();
    share = (($len(lns) >= 4) ? 0.4 : 0.625);
    cap = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(lns)) { ln = $c0; $r.set(ln, $min($len($idx($idx(self.leagues, ln), "clubs")), $max(1, math.ceil($mul(size, share))))); } return $r; })();
    size = $min(size, $sum($M.values(cap)));
    wts = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(lns)) { ln = $c0; $r.set(ln, $pow(self.coef(ln), 1.5)); } return $r; })();
    tot = ($T($t1 = $sum($M.values(wts))) ? $t1 : 1);
    ideal = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(lns)) { ln = $c0; $r.set(ln, $div($mul(size, $idx(wts, ln)), tot)); } return $r; })();
    if ($lt(size, $len(lns))) {
      ranked = $sorted(lns, $kw({"key": ((l) => (-self.coef(l)))}));
      return (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(lns)) { ln = $c0; $r.set(ln, (($in(ln, $slice(ranked, null, size, null))) ? 1 : 0)); } return $r; })();
    }
    slots = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(lns)) { ln = $c0; $r.set(ln, $min($idx(cap, ln), $max(1, $int($idx(ideal, ln))))); } return $r; })();
    guard = 0;
    while (((!$eq($sum($M.values(slots)), size)) && (guard < 100))) {
      guard = guard + 1;
      if ($lt($sum($M.values(slots)), size)) {
        c = (() => { const $r = []; let l; for (const $c0 of $iter(lns)) { l = $c0; if (!$lt($idx(slots, l), $idx(cap, l))) continue; $r.push(l); } return $r; })();
        l = $max(c, $kw({"key": ((x) => $sub($idx(ideal, x), $idx(slots, x)))}));
        $setidx(slots, l, $idx(slots, l) + 1);
      } else {
        c = (() => { const $r = []; let l; for (const $c0 of $iter(lns)) { l = $c0; if (!($idx(slots, l) > 1)) continue; $r.push(l); } return $r; })();
        l = $min(c, $kw({"key": ((x) => $sub($idx(ideal, x), $idx(slots, x)))}));
        $setidx(slots, l, $idx(slots, l) - 1);
      }
    }
    return slots;
  }
  compute_cup_fields(tables) {
    const self = this;
    let confed, field_, ln, n, order, slots;
    self.cup_fields = new $Dict();
    for (const $f21 of $iter(self.cups)) {
      confed = $f21;
      slots = self.allocate_slots(confed);
      field_ = [];
      for (const $f22 of $iter($M.items(slots))) {
        [ln, n] = $iter($f22);
        $setidx($idx(self.leagues, ln), "slots", n);
        if ((tables == null)) {
          order = $sorted($idx(self.league_clubs, ln), $kw({"key": ((c) => [(-$idx($idx(self.clubs, c), "base")), c])}));
        } else {
          order = $idx(tables, ln);
        }
        field_ = $iadd(field_, $slice(order, null, n, null));
      }
      $setidx(self.cup_fields, confed, field_);
    }
  }
  old_budget(c) {
    const self = this;
    return $add($add($mul(($idx(c, "lprestige") - 50), 4), ($max(0, ($idx(c, "ovr") - 70)) * 1.5)), $mul($idx(c, "cp"), self.cfg.club_prestige_budget));
  }
  _fan_target(c, L) { return 6 + 0.7 * $idx(c, "stature") * Math.pow($idx(L, "prestige") / 80, 0.7); }
  _init_v15(c, n, L) {
    // academy level, fan base and stadium for a club that has none yet (new worlds and saves made before v15). Deterministic: no rng.
    let x = 7; for (let i = 0; i < n.length; i++) x = (x * 31 + n.charCodeAt(i)) % 100003;
    const h = (x % 1000) / 1000, h2 = ((x * 7) % 1000) / 1000, st = $idx(c, "stature"), fans = this._fan_target(c, L);
    const cap = Math.max(5, Math.round(fans * (0.85 + 0.35 * h2) * 2) / 2);
    $setidx(c, "acad", Math.max(1.0, Math.min(8.0, 1.5 + 0.06 * st + (h - 0.5) * 1.4)));
    $setidx(c, "fans", fans); $setidx(c, "cap", cap); $setidx(c, "fill0", Math.min(cap, fans) / fans);
    $setidx(c, "proj", null); $setidx(c, "honey", 0); $setidx(c, "grads", []); $setidx(c, "acad_out", 0); $setidx(c, "acad_pri", 0.6 + 0.9 * (((x * 13) % 1000) / 1000));
  }
  money_update(...$args) {
    // v15: a real P&L. Closes the season just played (revenue, wages, running costs, academy, stadium, interest, transfers) into each
    // club's ledger, lets the club invest (academy, stadium), then sets up next season's income. `funds` is spendable cash.
    const self = this;
    let [initial] = $bind($args, ["initial"], [() => false]);
    const cfg = self.cfg, sq = initial ? null : self.squads(), r1 = (x) => Math.round(x * 10) / 10;
    for (const [ln, L] of $M.items(self.leagues)) {
      const names = $idx(L, "clubs"), size = $len(names);
      const avg = (cfg.tv_base * 0.95) * Math.pow(Math.max(0.0, $idx(L, "prestige") - 45), 1.25) * $idx(L, "tvmult");
      for (const n of names) {
        const c = $idx(self.clubs, n);
        if (!$in("debt", c)) { $setidx(c, "debt", 0.0); $setidx(c, "ledger", []); $setidx(c, "parts", null); }
        if (!$in("acad", c)) self._init_v15(c, n, L);
        if (!initial && $T($idx(c, "parts"))) {
          const pq = $idx(c, "parts"), pt = {"tv": $idx(pq, "tv"), "gate": $idx(pq, "gate"), "sponsor": $idx(pq, "sponsor"), "owner": $idx(pq, "owner")};
          const prize = $idx(c, "prize"), sales = $idx(c, "sales"), spent = $idx(c, "spent");
          const wages = $sum((() => { const $r = []; for (const p of $M.get(sq, n, [])) $r.push(p.wage); return $r; })());
          const revenue = pt.tv + pt.gate + pt.sponsor + pt.owner + prize;
          let cap = $idx(c, "cap"), acad = $idx(c, "acad"), fans = $idx(c, "fans");
          const running = cfg.run_cost * (pt.tv + pt.gate + pt.sponsor) + cfg.stad_upkeep * cap;
          const interest = cfg.debt_rate * $idx(c, "debt");
          let upk = cfg.acad_cost * Math.pow(acad, 1.5);
          const op0 = revenue - wages - running - upk - interest;
          if (op0 < 0) { upk *= 0.5; acad = Math.max(1.0, acad - cfg.acad_decay); }       // a club losing money cuts its academy
          let invest = cfg.invest_rate * Math.max(0, op0);
          // stadium: pay the instalment of a running project, finish it, or start one when the ground is too small
          let stadPay = 0, proj = $idx(c, "proj");
          if ($T(proj)) {
            stadPay = $idx(proj, "cost") / $idx(proj, "years"); $setidx(proj, "left", $idx(proj, "left") - 1);
            if ($idx(proj, "left") <= 0) { cap += $idx(proj, "add"); if ($idx(proj, "big")) $setidx(c, "honey", 2); proj = null; $setidx(c, "proj", null); }
            invest = Math.max(0, invest - stadPay);
          } else if (fans > cap / 0.93 && cap > 0) {
            const add = Math.min(0.6 * cap, Math.max(2, Math.round((fans * 1.05 - cap) * 2) / 2)), years = Math.max(2, Math.min(4, Math.ceil(add / 4)));
            const big = add >= 0.4 * cap, cost = add * cfg.stad_cost * (big ? 1.4 : 1.0);
            if (cost / years <= 0.8 * invest + Math.max(0, $idx(c, "funds") - $idx(c, "income") * cfg.comfort)) { $setidx(c, "proj", $dict($kw({"add": add, "years": years, "left": years, "cost": cost, "big": big}))); invest = Math.max(0, invest - cost / years); }
          }
          // academy push towards the level the club's size can sustain
          const pri = $M.get(c, "acad_pri", 1.0), target = Math.min(10, 2.5 + 0.045 * $idx(c, "stature") * pri * 1.6);
          let push = 0;
          if (acad < target) { push = Math.min(invest, 1.2 * upk); acad = Math.min(10, acad + cfg.acad_gain * (push / Math.max(1e-9, upk)) * 3 / (1 + 0.3 * acad)); }
          else if (acad > target + 0.5) acad = Math.max(1.0, acad - 0.1);
          const rich = $idx(c, "funds") + revenue - wages - running - upk - stadPay - push - interest;
          if (rich > cfg.comfort * $idx(c, "income") && acad < 10) { const extra = Math.min(0.5 * (rich - cfg.comfort * $idx(c, "income")), 1.5 * upk); push += extra; acad = Math.min(10, acad + cfg.acad_gain * (extra / Math.max(1e-9, upk)) * 3 / (1 + 0.3 * acad)); }
          const operating = revenue - wages - running - upk - push - stadPay - interest;
          let cash = $idx(c, "funds") + operating, debt = $idx(c, "debt");
          if (cash < 0) { debt += -cash; cash = 0.0; }
          else if (debt > 0) { const rep = Math.min(debt, 0.5 * cash); debt -= rep; cash -= rep; }
          const keep = cash * cfg.cash_keep, payout = cash - keep;
          $M.append($idx(c, "ledger"), $dict($kw({"season": self.season, "tv": r1(pt.tv), "gate": r1(pt.gate), "sponsor": r1(pt.sponsor), "prize": r1(prize), "sales": r1(sales), "owner": r1(pt.owner),
            "income": r1(revenue + sales), "wages": r1(wages), "running": r1(running), "interest": r1(interest), "transfers": r1(spent), "academy": r1(upk + push), "stadium": r1(stadPay), "payout": r1(payout),
            "profit": r1(revenue + sales - wages - running - upk - push - stadPay - interest - spent), "cash": r1(keep), "debt": r1(debt), "acad": r1(acad), "cap": r1(cap), "fans": r1(fans)})));
          if ($len($idx(c, "ledger")) > 12) $setidx(c, "ledger", $slice($idx(c, "ledger"), -12, null, null));
          $setidx(c, "funds", keep); $setidx(c, "debt", debt); $setidx(c, "acad", acad); $setidx(c, "cap", cap);
          const honey = $idx(c, "honey"); fans += 0.25 * (self._fan_target(c, L) * (honey > 0 ? 1.05 : 1.0) - fans); $setidx(c, "fans", fans); $setidx(c, "honey", Math.max(0, honey - 1));
          $setidx(c, "acad_out", 0);
        }
        const f = ($T($idx(c, "last_finish")) ? $idx(c, "last_finish") : Math.floor(size / 2));
        const wgt = 1 + (0.6 * ((size + 1) - 2 * f)) / (size - 1);
        const tv = avg * (0.5 + 0.5 * wgt);
        const gate0 = cfg.gate_k * $idx(c, "stature") * Math.pow($idx(L, "prestige") / 90, 0.8);
        const fill = Math.min($idx(c, "cap"), $idx(c, "fans")) / Math.max(1e-9, $idx(c, "fans"));
        const gate = gate0 * (1 - cfg.sponsor_share) * fill / Math.max(0.3, $idx(c, "fill0")), sponsor = gate0 * cfg.sponsor_share;
        const owner = (($eq(cfg.owner_fund_league, ln)) ? cfg.owner_fund_amount : 0.0);
        $setidx(c, "parts", $dict($kw({"tv": tv, "gate": gate, "sponsor": sponsor, "owner": owner})));
        // the Club World Cup pays every fourth season: the budget counts a quarter of what the last four paid, not the lump
        let ch = $M.get(c, "cwc_hist", []); const cp = $M.get(c, "cwc_prize", 0.0);
        if (cp > 0) ch = ch.concat([[self.season, cp]]);
        ch = ch.filter((e) => e[0] > self.season - 4);
        const smooth = ch.reduce((a, e) => a + e[1], 0) / 4;
        $setidx(c, "cwc_hist", ch); $setidx(c, "cwc_smooth", smooth);
        $setidx(c, "income", tv + gate + sponsor + ($idx(c, "prize") - cp) + smooth + owner + cfg.sale_to_budget * $idx(c, "sales"));
        $setidx(c, "cwc_prize", 0.0);
        $setidx(c, "prize_prev", $idx(c, "prize"));
        $setidx(c, "prize", 0.0);
        $setidx(c, "sales_prev", $idx(c, "sales")); $setidx(c, "spent_prev", $idx(c, "spent"));
        $setidx(c, "sales", 0.0); $setidx(c, "spent", 0.0);
        if (initial) $setidx(c, "funds", cfg.funds_share * $idx(c, "income"));
        $setidx(c, "budget", Math.max($idx(c, "income"), cfg.rail * self.old_budget(c)));
      }
    }
  }
  fee_for(p) {
    const self = this;
    let base;
    base = (0.012 * $pow($max(0, (p.ovr - 50)), 2));
    if ((p.age <= 21)) {
      base = $mul(base, (1 + (0.04 * $max(0, $sub(p.pot, p.ovr)))));
    } else if ((p.age >= 31)) {
      base = base * 0.5;
    } else if ((p.age >= 28)) {
      base = base * 0.8;
    }
    base = $mul(base, (0.55 + (0.15 * $min(4, $max(1, p.contract)))));
    return $round($mul(base, self.cfg.fee_scale), 1);
  }
  _pay(buyer, seller, fee) {
    const self = this;
    let b, s_;
    [b, s_] = $iter([$idx(self.clubs, buyer), $idx(self.clubs, seller)]);
    $setidx(b, "funds", $sub($idx(b, "funds"), fee));
    $setidx(b, "spent", $iadd($idx(b, "spent"), fee));
    $setidx(s_, "funds", $iadd($idx(s_, "funds"), fee));
    $setidx(s_, "sales", $iadd($idx(s_, "sales"), fee));
  }
  _bid_news(p, buyer, seller, fee) {
    if (this._count("transfer") < 4) this.news("transfer", $str(buyer) + " sign " + $str(p.name) + " (OVR " + $str(p.ovr) + ", age " + $str(p.age) + ") from " + $str(seller) + " for " + $str(eur($mul(fee, this.cfg.money_x))));
  }
  _log_transfer(p, seller, buyer, fee, kind) {
    const self = this;
    $M.append(self.transfers, $dict($kw({"season": self.season, "player": p.name, "nat": p.nat, "age": p.age, "ovr": p.ovr, "pot": p.pot, "frm": seller, "to": buyer, "fee": fee, "kind": kind, "frm_league": $idx($idx(self.clubs, seller), "league"), "to_league": $idx($idx(self.clubs, buyer), "league"), "why": $mods.market.take_why()})));
    if (p.ovr >= 80 || $mods.rivals.intensity(self, seller, buyer) > 0) $mods.rivals.transfer_heat(self, seller, buyer, p.ovr >= 80 ? 2.5 : 1.5);
  }
  renegotiate_tv() {
    const self = this;
    let L, ln, rel;
    for (const $f25 of $iter($M.items(self.leagues))) {
      [ln, L] = $iter($f25);
      rel = $div(self.coef(ln), $idx(L, "coef0"));
      $setidx(L, "tvmult", fclamp((1 + (0.35 * (rel - 1))), 0.8, 1.4));
    }
  }
  start_season() {
    const self = this;
    let c, confed, cy, host, ic, ln, persist, q, w;
    self.season = self.season + 1;
    self.recompute_clubs();
    self.recompute_nations();
    persist = (() => { const $r = new $Dict(); let c, k; for (const $c0 of $iter($M.items(self.comps))) { [k, c] = $iter($c0); if (!(($in(c.kind, ["qual", "ic"])) && (!$T(c.done)))) continue; $r.set(k, c); } return $r; })();
    self.comps = new $Dict();
    for (const $f26 of $iter(self.leagues)) {
      ln = $f26;
      c = $new(C.LeagueComp, [self, ln]);
      $setidx(self.comps, c.id, c);
    }
    for (const $f27 of $iter(self.cups)) {
      confed = $f27;
      c = $new(C.CupComp, [self, confed]);
      $setidx(self.comps, c.id, c);
    }
    cy = self.cycle_year;
    if ((cy === 2)) {
      c = $new(C.ClubWorldCup, [self]);
      $setidx(self.comps, c.id, c);
      host = self.wc_host();
      for (const $f28 of $iter($idx(self.wc, "slots"))) {
        confed = $f28;
        q = $new(C.QualComp, [self, confed, host]);
        $setidx(self.comps, q.id, q);
      }
      ic = $new(C.IntercontinentalPlayoff, [self]);
      $setidx(self.comps, ic.id, ic);
    } else {
      $M.update(self.comps, persist);
    }
    if ((cy === 4)) {
      w = $new(C.WorldCup, [self, self.wc_host()]);
      $setidx(self.comps, w.id, w);
    }
    if ((cy === 1)) {
      for (const $f29 of $iter(natcomps.make_nl(self))) {
        c = $f29;
        $setidx(self.comps, c.id, c);
      }
    }
    if ((cy === 3)) {
      for (const $f30 of $iter(natcomps.make_ct(self))) {
        c = $f30;
        $setidx(self.comps, c.id, c);
      }
    }
  }
  date_of(season, week, kind = "league") {
    const self = this;
    return cal.date_for(($hasattr(self.cfg, "start_year") ? self.cfg.start_year : 2026), season, week, kind);
  }
  record_final(...$args) {
    const self = this;
    let [comp, winner, runner_up, text, week, season, nation] = $bind($args, ["comp", "winner", "runner_up", "text", "week", "season", "nation"], [$R, $R, $R, $R, $R, () => null, () => false]);
    let co, $t1, $t2;
    season = ((season != null) ? season : self.season);
    if ((!$hasattr(self, "finals"))) {
      self.finals = [];
    }
    co = null;
    if (((!$T(nation)) && ($in(winner, self.clubs)))) {
      co = $idx($idx(self.clubs, winner), "coach").name;
    } else if ($T(($T($t1 = nation) ? ($T($t2 = ($in(winner, self.nations))) ? $M.get($idx(self.nations, winner), "coach") : $t2) : $t1))) {
      co = $idx($idx(self.nations, winner), "coach").name;
    }
    $M.append(self.finals, $dict($kw({"season": season, "comp": comp.id, "title": comp.title, "kind": comp.kind, "scope": comp.scope, "winner": winner, "runner_up": runner_up, "text": text, "week": week, "date": cal.pack(self.date_of(season, week, comp.kind)), "coach": co, "nation": nation})));
  }
  missing(comp) {
    const self = this;
    let out, r, rid;
    out = [];
    for (const $f31 of $iter(comp.requires)) {
      rid = $f31;
      r = $M.get(self.comps, rid);
      if (((r != null) && (r.remaining(self.season) > 0))) {
        $M.append(out, rid);
      }
    }
    return out;
  }
  prerequisites(cid, seen = null) {
    const self = this;
    let r, rid;
    seen = ((seen != null) ? seen : []);
    for (const $f32 of $iter($idx(self.comps, cid).requires)) {
      rid = $f32;
      r = $M.get(self.comps, rid);
      if (((r != null) && (r.remaining(self.season) > 0) && (!$in(rid, seen)))) {
        self.prerequisites(rid, seen);
        $M.append(seen, rid);
      }
    }
    return seen;
  }
  active(ids = null) {
    const self = this;
    let pool;
    pool = ((ids == null) ? $M.values(self.comps) : (() => { const $r = []; let i; for (const $c0 of $iter(ids)) { i = $c0; if (!($in(i, self.comps))) continue; $r.push($idx(self.comps, i)); } return $r; })());
    return (() => { const $r = []; let c; for (const $c0 of $iter(pool)) { c = $c0; if (!$T(c.has_event(self.season))) continue; $r.push(c); } return $r; })();
  }
  step(ids = null) {
    const self = this;
    let c, cands, played, wk;
    cands = (() => { const $r = []; let c; for (const $c0 of $iter(self.active(ids))) { c = $c0; if (!(!$T(self.missing(c)))) continue; $r.push(c); } return $r; })();
    if ((!$T(cands))) {
      return null;
    }
    wk = $min((() => { const $r = []; let c; for (const $c0 of $iter(cands)) { c = $c0; $r.push(c.next_week()); } return $r; })());
    played = [];
    for (const $f33 of $iter(cands)) {
      c = $f33;
      if (($eq(c.next_week(), wk))) {
        $M.append(played, [c, c.next_label()]);
        c.play_next();
      }
    }
    return [wk, played];
  }
  sim_comp(...$args) {
    const self = this;
    let [cid, matches, strict] = $bind($args, ["cid", "matches", "strict"], [$R, () => null, () => true]);
    let comp, miss, n, $t1, $t2;
    comp = $idx(self.comps, cid);
    miss = self.missing(comp);
    if ($T(($T($t1 = miss) ? strict : $t1))) {
      throw $new(Locked, [cid, miss]);
    }
    n = 0;
    while ($T(($T($t2 = comp.has_event(self.season)) ? ((matches == null) || $lt(n, matches)) : $t2))) {
      comp.play_next();
      n = n + 1;
    }
    return n;
  }
  sim_with_prereqs(cid) {
    const self = this;
    let rid;
    for (const $f34 of $iter(self.prerequisites(cid))) {
      rid = $f34;
      self.sim_comp(rid, $kw({"strict": false}));
    }
    self.sim_comp(cid);
  }
  season_done() {
    const self = this;
    return (!$T(self.active()));
  }
  current_week() {
    const self = this;
    let a;
    a = (() => { const $r = []; let c; for (const $c0 of $iter(self.active())) { c = $c0; if (!(!$T(self.missing(c)))) continue; $r.push(c.next_week()); } return $r; })();
    return ($T(a) ? $min(a) : null);
  }
  sim_until_week(week, ids = null) {
    const self = this;
    let cands;
    while (true) {
      cands = (() => { const $r = []; let c; for (const $c0 of $iter(self.active(ids))) { c = $c0; if (!(!$T(self.missing(c)))) continue; $r.push(c); } return $r; })();
      if (((!$T(cands)) || $gt($min((() => { const $r = []; let c; for (const $c0 of $iter(cands)) { c = $c0; $r.push(c.next_week()); } return $r; })()), week))) {
        return null;
      }
      self.step(ids);
    }
  }
  sim_ids_to_end(ids) {
    const self = this;
    while ($T(self.step(ids))) {
    }
  }
  finish_season() {
    const self = this;
    while ($T(self.step())) {
    }
    return self.rollover();
  }
  sim_season() {
    const self = this;
    return self.finish_season();
  }
  rollover() {
    const self = this;
    let _, c, cc, cf, cwc, expected, f, finish, i, lc, left, ln, n, names, net, nm, p, rec, recs, s, sq0, t, tables, tr, w_, wc, $t1, $t2, $t3, $t4, $t5, $t6;
    if ((!$T(self.season_done()))) {
      left = (() => { const $r = []; let c; for (const $c0 of $iter(self.active())) { c = $c0; $r.push(c.id); } return $r; })();
      throw $new(RuntimeError, [("Season not finished: " + $M.join(", ", left))]);
    }
    $mods.rivals.update_season(self);
    rec = $lit_dict([["season", self.season], ["retired", 0], ["youth", 0], ["outflow", 0], ["down", 0], ["up", 0]]);
    [tables, recs] = $iter([new $Dict(), new $Dict()]);
    for (const $f35 of $iter(self.leagues)) {
      ln = $f35;
      lc = $idx(self.comps, ("L:" + $str(ln)));
      $setidx(tables, ln, lc.standings());
      for (const $f36 of $iter($M.items(lc.st))) {
        [n, s] = $iter($f36);
        $setidx(recs, n, [$idx(s, "w"), $idx(s, "d"), $idx(s, "l")]);
      }
    }
    $setidx(rec, "tables", tables);
    $setidx(rec, "pts", (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(tables)) { ln = $c0; $r.set(ln, (() => { const $r = new $Dict(); let n; for (const $c0 of $iter($idx(tables, ln))) { n = $c0; $r.set(n, $idx($idx($idx(self.comps, ("L:" + $str(ln))).st, n), "pts")); } return $r; })()); } return $r; })());
    $setidx(rec, "champs", (() => { const $r = new $Dict(); let ln, t; for (const $c0 of $iter($M.items(tables))) { [ln, t] = $iter($c0); $r.set(ln, $idx(t, 0)); } return $r; })());
    $setidx(rec, "cups", (() => { const $r = new $Dict(); let c; for (const $c0 of $iter(self.cups)) { c = $c0; $r.set(c, [$idx(self.comps, ("C:" + $str(c))).winner, $idx(self.comps, ("C:" + $str(c))).runner_up]); } return $r; })());
    cwc = $next((() => { const $r = []; let c; for (const $c0 of $iter($M.values(self.comps))) { c = $c0; if (!(c.kind === "cwc")) continue; $r.push(c); } return $r; })(), null);
    wc = $next((() => { const $r = []; let c; for (const $c0 of $iter($M.values(self.comps))) { c = $c0; if (!(c.kind === "wc")) continue; $r.push(c); } return $r; })(), null);
    $setidx(rec, "cwc", ($T(cwc) ? [cwc.winner, cwc.runner_up] : null));
    $setidx(rec, "wc", ($T(wc) ? [wc.winner, wc.runner_up, wc.host] : null));
    $setidx(rec, "ct", (() => { const $r = new $Dict(); let c; for (const $c0 of $iter($M.values(self.comps))) { c = $c0; if (!(c.kind === "ct")) continue; $r.set(c.confed, [c.winner, c.runner_up, c.title, c.host]); } return $r; })());
    $setidx(rec, "nl", (() => { const $r = new $Dict(); let c; for (const $c0 of $iter($M.values(self.comps))) { c = $c0; if (!(c.kind === "nl")) continue; $r.set(c.confed, [c.winner, c.runner_up, c.title]); } return $r; })());
    $setidx(rec, "champ_coach", (() => { const $r = new $Dict(); let c, ln; for (const $c0 of $iter($M.items($idx(rec, "champs")))) { [ln, c] = $iter($c0); $r.set(ln, $idx($idx(self.clubs, c), "coach").name); } return $r; })());
    $setidx(rec, "cup_coach", (() => { const $r = new $Dict(); let _, cf, w, $t1; for (const $c0 of $iter($M.items($idx(rec, "cups")))) { ($t1 = $iter($c0), cf = $t1[0], [w, _] = $iter($t1[1])); $r.set(cf, ($T(w) ? $idx($idx(self.clubs, w), "coach").name : null)); } return $r; })());
    $setidx(rec, "tables_full", new $Dict());
    for (const $f37 of $iter($M.items(tables))) {
      [ln, t] = $iter($f37);
      lc = $idx(self.comps, ("L:" + $str(ln)));
      $setidx($idx(rec, "tables_full"), ln, (() => { const $r = []; let i, n; for (const $c0 of $iter($enumerate(t, 1))) { [i, n] = $iter($c0); $r.push($dict($kwx([["pos", i], ["club", n]], [(() => { const $r = new $Dict(); let k; for (const $c0 of $iter(["p", "w", "d", "l", "gf", "ga", "pts"])) { k = $c0; $r.set(k, $idx($idx(lc.st, n), k)); } return $r; })()]))); } return $r; })());
    }
    $setidx(rec, "cup_detail", new $Dict());
    for (const $f38 of $iter(self.cups)) {
      cf = $f38;
      cc = $idx(self.comps, ("C:" + $str(cf)));
      $setidx($idx(rec, "cup_detail"), cf, $dict($kw({"field": $list(cc.field), "reached": $dict(cc.reached), "ties": $list(cc.ties)})));
    }
    if ($T(cwc)) {
      $setidx(rec, "cwc_detail", $dict($kw({"field": $list(cwc.field), "reached": $dict(cwc.reached), "ties": $list(cwc.ties)})));
    }
    if ($T(wc)) {
      $setidx(rec, "wc_detail", $dict($kw({"host": wc.host, "field": $list(wc.field), "perf": $dict(wc.perf), "ties": $list(wc.ties), "groups": (() => { const $r = []; let g; for (const $c0 of $iter(wc.groups)) { g = $c0; $r.push((() => { const $r = []; let n; for (const $c0 of $iter(wc.grp_rank(g))) { n = $c0; $r.push([n, $dict($idx(wc.gtab, n))]); } return $r; })()); } return $r; })(), "qualified": (() => { const $r = new $Dict(); let c; for (const $c0 of $iter($M.values(self.comps))) { c = $c0; if (!(c.kind === "qual")) continue; $r.set(c.confed, $list(c.qualified)); } return $r; })()})));
    }
    sq0 = self.squads();
    for (const $f39 of $iter($M.items($idx(rec, "champs")))) {
      [ln, c] = $iter($f39);
      for (const $f40 of $iter($M.get(sq0, c, []))) {
        p = $f40;
        $M.append(p.honours, [self.season, "league", ln]);
      }
    }
    for (const $f41 of $iter($M.items($idx(rec, "cups")))) {
      ($t1 = $iter($f41), cf = $t1[0], [w_, _] = $iter($t1[1]));
      for (const $f42 of $iter($M.get(sq0, w_, []))) {
        p = $f42;
        $M.append(p.honours, [self.season, "cup", $idx($idx(self.cups, cf), "name")]);
      }
    }
    if ($T(($T($t2 = cwc) ? cwc.winner : $t2))) {
      for (const $f43 of $iter($M.get(sq0, cwc.winner, []))) {
        p = $f43;
        $M.append(p.honours, [self.season, "cup", "Club World Cup"]);
      }
    }
    if ($T(($T($t3 = wc) ? wc.winner : $t3))) {
      for (const $f44 of $iter($slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(self.players)) { p = $c0; if (!($eq(p.nat, wc.winner))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-p.ovr))})), null, 14, null))) {
        p = $f44;
        $M.append(p.honours, [self.season, "world", "World Cup"]);
      }
    }
    for (const $f45 of $iter($M.values(self.comps))) {
      c = $f45;
      if ($T(($T($t4 = ($in(c.kind, ["ct", "nl"]))) ? c.winner : $t4))) {
        for (const $f46 of $iter($slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter(self.players)) { p = $c0; if (!($eq(p.nat, c.winner))) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-p.ovr))})), null, 14, null))) {
          p = $f46;
          $M.append(p.honours, [self.season, ((c.kind === "ct") ? "contin" : "nl"), c.title]);
        }
        self.news("worldcup", (($str(c.title) + ": " + $str(c.winner) + " win it") + ($T(c.runner_up) ? (", " + $str(c.runner_up) + " runners-up") : "")));
      }
    }
    self.update_ranking();
    finish = (() => { const $r = new $Dict(); let i, n, t; for (const $c0 of $iter($M.values(tables))) { t = $c0; for (const $c1 of $iter($enumerate(t, 1))) { [i, n] = $iter($c1); $r.set(n, i); } } return $r; })();
    expected = new $Dict();
    for (const $f47 of $iter($M.values(self.league_clubs))) {
      names = $f47;
      for (const $f48 of $iter($enumerate($sorted(names, $kw({"key": ((x) => (-$idx($idx(self.clubs, x), "ovr")))})), 1))) {
        [i, n] = $iter($f48);
        $setidx(expected, n, i);
      }
    }
    awards.run(self, rec, sq0, finish, expected, cwc, wc);
    self.apply_results(rec, recs, tables, finish, expected, cwc, wc);
    self.coach_offseason();
    self.season_end(rec);
    self.nations_offseason(rec, wc);
    tr = (() => { const $r = []; let t; for (const $c0 of $iter(self.transfers)) { t = $c0; if (!($eq($idx(t, "season"), self.season))) continue; $r.push(t); } return $r; })();
    net = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(self.leagues)) { ln = $c0; $r.set(ln, 0.0); } return $r; })();
    for (const $f49 of $iter(tr)) {
      t = $f49;
      $t5 = $idx(t, "frm_league"), $setidx(net, $t5, $iadd($idx(net, $t5), $idx(t, "fee")));
      $t6 = $idx(t, "to_league"), $setidx(net, $t6, $sub($idx(net, $t6), $idx(t, "fee")));
    }
    $setidx(rec, "transfers", $dict($kw({"n": $len(tr), "total": $sum((() => { const $r = []; let t; for (const $c0 of $iter(tr)) { t = $c0; $r.push($idx(t, "fee")); } return $r; })()), "abroad": $sum((() => { const $r = []; let t; for (const $c0 of $iter(tr)) { t = $c0; if (!($idx(t, "kind") === "abroad")) continue; $r.push(1); } return $r; })()), "top": $slice($sorted(tr, $kw({"key": ((t) => (-$idx(t, "fee")))})), null, 10, null), "net_by_league": net})));
    for (const $f50 of $iter($M.items(finish))) {
      [n, f] = $iter($f50);
      $setidx($idx(self.clubs, n), "last_finish", f);
    }
    if (($mod(self.season, self.cfg.tv_cycle) === 0)) {
      self.renegotiate_tv();
    }
    self.compute_cup_fields(tables);
    self.money_update();
    if ($T(wc)) {
      self.wc_count = self.wc_count + 1;
    }
    $setidx(rec, "lavg", self.league_avgs());
    $setidx(rec, "giants", (() => { const $r = new $Dict(); let c; for (const $c0 of $iter(self.giants)) { c = $c0; $r.set(c, $idx($idx(self.clubs, c), "ovr")); } return $r; })());
    $setidx(rec, "std", (() => { const $r = new $Dict(); let ln, names; for (const $c0 of $iter($M.items(self.league_clubs))) { [ln, names] = $iter($c0); $r.set(ln, statistics.pstdev((() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($idx($idx(self.clubs, n), "ovr")); } return $r; })())); } return $r; })());
    $setidx(rec, "pool", self.pool_last);
    $setidx(rec, "slots", (() => { const $r = new $Dict(); let L, ln; for (const $c0 of $iter($M.items(self.leagues))) { [ln, L] = $iter($c0); $r.set(ln, $idx(L, "slots")); } return $r; })());
    $setidx(rec, "tvmult", (() => { const $r = new $Dict(); let L, ln; for (const $c0 of $iter($M.items(self.leagues))) { [ln, L] = $iter($c0); $r.set(ln, $idx(L, "tvmult")); } return $r; })());
    $setidx(rec, "coef", (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(self.leagues)) { ln = $c0; $r.set(ln, self.coef(ln)); } return $r; })());
    $setidx(rec, "natdev", (() => { const $r = new $Dict(); let n, nm; for (const $c0 of $iter($M.items(self.nations))) { [nm, n] = $iter($c0); $r.set(nm, $idx(n, "dev")); } return $r; })());
    $setidx(rec, "nateff", (() => { const $r = new $Dict(); let n, nm; for (const $c0 of $iter($M.items(self.nations))) { [nm, n] = $iter($c0); $r.set(nm, $idx(n, "eff")); } return $r; })());
    $setidx(rec, "budget", (() => { const $r = new $Dict(); let ln, names; for (const $c0 of $iter($M.items(self.league_clubs))) { [ln, names] = $iter($c0); $r.set(ln, statistics.mean((() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($idx($idx(self.clubs, n), "budget")); } return $r; })())); } return $r; })());
    $M.append(self.hist, rec);
    self.start_season();
    if (((self.cycle_year === 1) && (self.season > 1))) {
      self.national_coach_cycle();
      self.recompute_nations();
      for (const $f51 of $iter(self.nations)) {
        nm = $f51;
        self.comps_nat_refresh(nm);
      }
    }
    return rec;
  }
  comps_nat_refresh(nm) {
    const self = this;
  }
  _reward(club, club_pts, coach_pts) {
    const self = this;
    let c, co, gain;
    c = $idx(self.clubs, club);
    co = $idx(c, "coach");
    $setidx(c, "cp", fclamp($add($idx(c, "cp"), club_pts), 0, 1000));
    if ((co != null)) {
      gain = $mul(coach_pts, (((co.skill === "scout") && (coach_pts > 0)) ? 1.5 : 1.0));
      co.prestige = fclamp($add(co.prestige, gain), 0, 100);
    }
  }
  _league_bump(club, amount) {
    const self = this;
    let L, ln;
    ln = $idx($idx(self.clubs, club), "league");
    L = $idx(self.leagues, ln);
    $setidx(L, "target", $min(($idx(L, "start_avg") + 8), $add($idx(L, "target"), amount)));
  }
  apply_results(rec, recs, tables, finish, expected, cwc, wc) {
    const self = this;
    let L, aw, b, c, cc, cfg, champ, club, cnt, co, comp, confed, cp_, cpts, cup, d, entered, fi, gf, idx, k, l, lf, ln, n, nm, prize, prize_rounds, pts, pts_, r_, rc, rise, rw, size, t, tag, top, w, w_, wgt, $t1, $t2, $t3, $t4, $t5, $t6, $t7, $t8, $t9;
    cfg = self.cfg;
    for (const $f52 of $iter($M.items(self.clubs))) {
      [n, c] = $iter($f52);
      co = $idx(c, "coach");
      [w, d, l] = $iter($idx(recs, n));
      size = $len($idx(self.league_clubs, $idx(c, "league")));
      lf = $pow(($idx(c, "lprestige") / 90), 2);
      co.seasons = co.seasons + 1;
      co.w = $iadd(co.w, w);
      co.d = $iadd(co.d, d);
      co.l = $iadd(co.l, l);
      co.best_finish = $min(co.best_finish, $idx(finish, n));
      fi = $mul($mul($div($sub((size + 1), $mul(2, $idx(finish, n))), (size - 1)), 4), lf);
      $setidx(c, "cp", fclamp($add($add($add($mul($idx(c, "cp"), (1 - cfg.prestige_decay)), (co.prestige * 0.04)), fi), ((co.skill === "tactician") ? cfg.tactician_boost : 0)), 0, 1000));
      $setidx(c, "stature", $min(100.0, $add($idx(c, "st0"), ($sub($idx(c, "stature"), $idx(c, "st0")) * 0.97))));
      if ($le($idx(finish, n), ($idx(expected, n) - 3))) {
        self._reward(n, 0, 1);
      }
      co.hot = ($gt($idx(finish, n), $add($idx(expected, n), cfg.hot_tolerance)) ? (co.hot + 1) : 0);
      $setidx(c, "stint", $idx(c, "stint") + 1);
      if ((($idx(expected, n) <= 3) && $ge($idx(finish, n), (size - 2)))) {
        self.news("collapse", ($str(n) + " collapse in the " + $str($idx(c, "league")) + ": expected top 3, finished " + $str($idx(finish, n)) + " of " + $str(size)));
      }
    }
    for (const $f53 of $iter($M.items($idx(rec, "champs")))) {
      [ln, champ] = $iter($f53);
      cc = $idx(self.clubs, champ);
      $idx(cc, "coach").titles = $idx(cc, "coach").titles + 1;
      self._reward(champ, $mul(cfg.title_pts, $pow(($idx(cc, "lprestige") / 90), 2)), ($mul(4, $idx(cc, "lprestige")) / 90));
      $setidx(cc, "stature", $min(100.0, $add($idx(cc, "stature"), (1.5 * cfg.stature_gain))));
      if (($idx(expected, champ) >= 12)) {
        self.news("title", ($str(champ) + " win the " + $str(ln) + " from expected rank " + $str($idx(expected, champ))));
      }
    }
    prize_rounds = [7.0, 4.5, 3.0, 2.0, 1.5];
    entered = $set();
    for (const $f54 of $iter($M.items(self.cups))) {
      [confed, cup] = $iter($f54);
      comp = $idx(self.comps, ("C:" + $str(confed)));
      wgt = $idx(cup, "weight");
      [w_, r_] = $iter([comp.winner, comp.runner_up]);
      if ((w_ == null)) {
        continue;
      }
      cpts = defaultdict($float);
      cnt = Counter((() => { const $r = []; let n; for (const $c0 of $iter(comp.field)) { n = $c0; $r.push($idx($idx(self.clubs, n), "league")); } return $r; })());
      for (const $f55 of $iter(comp.field)) {
        n = $f55;
        rw = $idx(comp.reached, n);
        pts = $add($add((2.0 * rw), (($in(n, [w_, r_])) ? 1.0 : 0.0)), (($eq(n, w_)) ? 2.0 : 0.0));
        $t1 = $idx($idx(self.clubs, n), "league"), $setidx(cpts, $t1, $iadd($idx(cpts, $t1), pts));
        prize = (3.0 * wgt);
        for (const $f56 of $iter($range(rw))) {
          k = $f56;
          idx = $sub((comp.rounds_total - 1), k);
          prize = $iadd(prize, $mul($idx(prize_rounds, $min(idx, ($len(prize_rounds) - 1))), wgt));
        }
        if ($T(cnt)) {
          prize = $iadd(prize, $div($mul((3.0 * wgt), self.coef($idx($idx(self.clubs, n), "league"))), $max((() => { const $r = []; let l; for (const $c0 of $iter(cnt)) { l = $c0; $r.push(self.coef(l)); } return $r; })())));
        }
        $t2 = $idx(self.clubs, n), $setidx($t2, "prize", $iadd($idx($t2, "prize"), $mul(prize, cfg.cup_prize_scale)));
      }
      for (const $f57 of $iter(cnt)) {
        ln = $f57;
        $M.add(entered, ln);
        $M.append($idx($idx(self.leagues, ln), "coef_hist"), $div($idx(cpts, ln), $idx(cnt, ln)));
      }
      for (const $f58 of $iter([[w_, "w", $mul(cfg.apex_pts, wgt), $mul(cfg.league_rise, wgt)], [r_, "r", ($mul(cfg.apex_pts, wgt) * 0.4), ($mul(cfg.league_rise, wgt) / 3)]])) {
        [club, pts_, cp_, rise] = $iter($f58);
        if ((pts_ === "w")) {
          $idx($idx(self.clubs, club), "coach").cups = $idx($idx(self.clubs, club), "coach").cups + 1;
          $setidx($idx(self.clubs, club), "stature", $min(100.0, $add($idx($idx(self.clubs, club), "stature"), (2.5 * cfg.stature_gain))));
        }
        self._reward(club, cp_, ((pts_ === "w") ? $mul(8, wgt) : $mul(3, wgt)));
        self._league_bump(club, rise);
      }
      d = $sub($idx(comp.eff, r_), $idx(comp.eff, w_));
      tag = ((d >= 6) ? (" (upset: OVR " + $str($idx($idx(self.clubs, w_), "ovr")) + " over " + $str($idx($idx(self.clubs, r_), "ovr")) + ")") : "");
      self.news("cup", ($str($idx(cup, "name")) + ": " + $str(w_) + " beat " + $str(r_) + " in the final" + $str(tag)));
    }
    for (const $f59 of $iter($M.items(self.leagues))) {
      [ln, L] = $iter($f59);
      if ((!$in(ln, entered))) {
        $M.append($idx(L, "coef_hist"), 0.0);
      }
      $setidx(L, "coef_hist", $slice($idx(L, "coef_hist"), (-6), null, null));
    }
    for (const $f60 of $iter($M.items(self.leagues))) {
      [ln, L] = $iter($f60);
      $setidx(L, "target", $add($idx(L, "start_avg"), ($sub($idx(L, "target"), $idx(L, "start_avg")) * 0.98)));
    }
    if ($T(($T($t3 = cwc) ? cwc.winner : $t3))) {
      $idx($idx(self.clubs, cwc.winner), "coach").cwc = $idx($idx(self.clubs, cwc.winner), "coach").cwc + 1;
      self._reward(cwc.winner, 40, 4);
      self._reward(cwc.runner_up, 15, 1.5);
      // v15: 32-club tournament. Prize money by results; stature and league standing follow how far a club went
      const pz = cwc.prizes();
      for (const nme of cwc.field) {
        const cl = $idx(self.clubs, nme), rch = cwc.reached.get(nme), amt = pz.get(nme);
        $setidx(cl, "prize", $idx(cl, "prize") + amt);
        $setidx(cl, "cwc_prize", $M.get(cl, "cwc_prize", 0.0) + amt);
        const gain = nme === cwc.winner ? 5.0 : nme === cwc.runner_up ? 3.0 : rch >= 4 ? 1.5 : rch >= 2 ? 0.6 : rch >= 1 ? 0.3 : 0.1;
        $setidx(cl, "stature", $min(100.0, $idx(cl, "stature") + gain * cfg.stature_gain));
        const L = $idx(self.leagues, $idx(cl, "league"));
        $setidx(L, "cwc_pts", $M.get(L, "cwc_pts", 0.0) + (rch >= 2 ? rch - 1 : 0) + (nme === cwc.winner ? 3 : 0));
      }
      $M.append(self.cwc_history, [self.season, cwc.winner, cwc.runner_up]);
      self.news("cup", ("Club World Cup: " + $str(cwc.winner) + " beat " + $str(cwc.runner_up) + " in the final and are world champions"));
    }
    if ($T(($T($t5 = wc) ? wc.winner : $t5))) {
      $M.append(self.wc_history, [self.season, wc.winner, wc.runner_up, wc.host]);
      for (const $f62 of $iter(wc.field)) {
        nm = $f62;
        n = $idx(self.nations, nm);
        $setidx(n, "wc_apps", $idx(n, "wc_apps") + 1);
        $setidx(n, "form", $add((0.5 * $idx(n, "form")), (0.5 * $M.get(wc.perf, nm, 0.0))));
        $setidx(n, "best", $max($idx(n, "best"), $M.get(wc.perf, nm, 0.0)));
        co = $idx(n, "coach");
        if ((co != null)) {
          co.prestige = fclamp($add(co.prestige, $mul(($M.get(wc.perf, nm, 0.0) - 0.25), 12)), 0, 100);
        }
      }
      $t6 = $idx(self.nations, wc.winner), $setidx($t6, "wc_titles", $idx($t6, "wc_titles") + 1);
      self.news("worldcup", ("World Cup (host " + $str(wc.host) + "): " + $str(wc.winner) + " beat " + $str(wc.runner_up) + " in the final"));
    }
    aw = $M.get(rec, "awards");
    if ($T(($T($t7 = aw) ? $idx(aw, "ballon") : $t7))) {
      b = $idx($idx(aw, "ballon"), 0);
      $setidx(rec, "potY", [$idx(b, "name"), $idx(b, "ovr"), $idx(b, "club"), $idx(b, "nat")]);
    }
    for (const $f63 of $iter($M.items(tables))) {
      [ln, t] = $iter($f63);
      top = $idx(t, 0);
      pts = $idx($idx($idx(rec, "pts"), ln), top);
      gf = $idx($idx($idx(self.comps, ("L:" + $str(ln))).st, top), "gf");
      rc = $M.setdefault(self.records, ln, $lit_dict([["pts", [0, ""]], ["gf", [0, ""]]]));
      if ($gt(pts, $idx($idx(rc, "pts"), 0))) {
        if ($T(($T($t8 = $idx($idx(rc, "pts"), 0)) ? (self.season > 3) : $t8))) {
          $M.append($M.setdefault(rec, "records", []), ($str(top) + " set a " + $str(ln) + " points record (" + $str(pts) + ")"));
        }
        $setidx(rc, "pts", [pts, top]);
      }
      if ($gt(gf, $idx($idx(rc, "gf"), 0))) {
        if ($T(($T($t9 = $idx($idx(rc, "gf"), 0)) ? (self.season > 3) : $t9))) {
          $M.append($M.setdefault(rec, "records", []), ($str(top) + " set a " + $str(ln) + " goals record (" + $str(gf) + ")"));
        }
        $setidx(rc, "gf", [gf, top]);
      }
    }
  }
  _vacate(n, reason) {
    const self = this;
    let c, cfg, co, $t1, $t2, $t3;
    cfg = self.cfg;
    c = $idx(self.clubs, n);
    co = $idx(c, "coach");
    $setidx(c, "cp", fclamp($sub($idx(c, "cp"), $mul(co.prestige, cfg.transfer_share)), 0, 1000));
    co.club = null;
    co.last_club = n;
    co.prev_attr = self.attr(n);
    co.hot = 0;
    $setidx(c, "coach", null);
    $setidx(c, "stint", 0);
    if ((reason === "retire")) {
      $t1 = self.stats, $setidx($t1, "coach_retire", $idx($t1, "coach_retire") + 1);
      $M.append(self.retired_coaches, co);
      $M.append(self.retired_all, co);
      if (((co.prestige >= 60) || (co.titles >= 3))) {
        self.news("coach", ("Coach " + $str(co.name) + " retires after " + $str(co.seasons) + " seasons (" + $str(co.titles) + " league titles, " + $str(co.cups) + " continental cups)"));
      }
    } else if ((reason === "fired")) {
      $t2 = self.stats, $setidx($t2, "fired", $idx($t2, "fired") + 1);
      co.prestige = $max(0, (co.prestige - 3));
      $M.append(self.coach_pool, co);
      if ((($in(n, self.giants)) || (co.prestige >= 45))) {
        self.news("coach", ($str(n) + " fire coach " + $str(co.name) + " (prestige " + $fmt(co.prestige, ".0f") + ")"));
      }
    } else {
      $t3 = self.stats, $setidx($t3, "left", $idx($t3, "left") + 1);
      $M.append(self.coach_pool, co);
    }
  }
  _hire(n, co) {
    const self = this;
    let c, cfg, $t1, $t2;
    cfg = self.cfg;
    c = $idx(self.clubs, n);
    $setidx(c, "cp", fclamp($add($idx(c, "cp"), $mul(co.prestige, cfg.transfer_share)), 0, 1000));
    co.club = n;
    co.contract = self._contract();
    co.hot = 0;
    co.unemployed_years = 0;
    $M.append(co.clubs, n);
    $setidx(c, "coach", co);
    $setidx(c, "stint", 0);
    $t1 = self.stats, $setidx($t1, "hires", $idx($t1, "hires") + 1);
    if (((co.last_club != null) && (!$eq(co.last_club, n)))) {
      $t2 = self.stats, $setidx($t2, "moves", $idx($t2, "moves") + 1);
      if ((co.prestige >= 50)) {
        self.news("coach", ($str(co.name) + " (prestige " + $fmt(co.prestige, ".0f") + ") leaves " + $str(co.last_club) + " for " + $str(n)));
      }
    }
  }
  coach_offseason() {
    const self = this;
    let attr, cands, cfg, co, fresh, keep, n, nm, pick, reason, resign, rng, vacancies, $t1;
    [cfg, rng] = $iter([self.cfg, self.rng]);
    keep = [];
    for (const $f64 of $iter(self.coach_pool)) {
      co = $f64;
      co.age = co.age + 1;
      co.unemployed_years = co.unemployed_years + 1;
      co.prestige = $max(0, (co.prestige - 2));
      if (((co.age >= 70) || (co.unemployed_years > 6))) {
        $M.append(self.retired_coaches, co);
        $M.append(self.retired_all, co);
        $t1 = self.stats, $setidx($t1, "coach_retire", $idx($t1, "coach_retire") + 1);
      } else {
        $M.append(keep, co);
      }
    }
    self.coach_pool = keep;
    for (const $f65 of $iter(self.retired_coaches)) {
      co = $f65;
      co.age = co.age + 1;
    }
    self.retired_coaches = (() => { const $r = []; let co; for (const $c0 of $iter(self.retired_coaches)) { co = $c0; if (!(co.age <= 75)) continue; $r.push(co); } return $r; })();
    for (const $f66 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f66);
      if (($idx(n, "coach") != null)) {
        $idx(n, "coach").age = $idx(n, "coach").age + 1;
      }
    }
    for (const $f67 of $iter($list(self.clubs))) {
      n = $f67;
      co = $idx($idx(self.clubs, n), "coach");
      co.age = co.age + 1;
      co.contract = co.contract - 1;
      reason = null;
      if (((co.age >= 70) || ((co.age >= 60) && $lt(rng.random(), (0.12 * (co.age - 59)))))) {
        reason = "retire";
      } else if (($ge(co.hot, cfg.fire_after) && ((co.personality === "money") || (rng.random() < 0.6)))) {
        reason = "fired";
      } else if ((co.contract <= 0)) {
        resign = ((co.personality === "loyal") ? cfg.loyal_resign : cfg.money_resign);
        if ($ge(rng.random(), resign)) {
          reason = "left";
        } else {
          co.contract = self._contract();
        }
      }
      if ($T(reason)) {
        self._vacate(n, reason);
      }
    }
    vacancies = (() => { const $r = []; let c, n; for (const $c0 of $iter($M.items(self.clubs))) { [n, c] = $iter($c0); if (!($idx(c, "coach") == null)) continue; $r.push(n); } return $r; })();
    while ($lt($len(self.coach_pool), ($len(vacancies) + 3))) {
      $M.append(self.coach_pool, self._new_coach(rng.uniform(5, 25), rng.randint(38, 50)));
    }
    $M.sort(vacancies, $kw({"key": ((n) => (-self.attr(n)))}));
    for (const $f68 of $iter(vacancies)) {
      n = $f68;
      attr = self.attr(n);
      cands = (() => { const $r = []; let co; for (const $c0 of $iter(self.coach_pool)) { co = $c0; if (!((!$eq(co.last_club, n)) && ((co.personality === "loyal") || (co.prev_attr === 0) || $ge(attr, $mul(co.prev_attr, $max(0.2, (0.85 - (0.2 * co.unemployed_years)))))))) continue; $r.push(co); } return $r; })();
      if ((!$T(cands))) {
        fresh = self._new_coach(rng.uniform(5, 25), rng.randint(38, 50));
        $M.append(self.coach_pool, fresh);
        cands = [fresh];
      }
      pick = $max(cands, $kw({"key": ((x) => $add(x.prestige, rng.uniform((-5), 5)))}));
      $M.remove(self.coach_pool, pick);
      self._hire(n, pick);
    }
  }
  update_ranking() {
    const self = this;
    let _dd, c, g, gain, n, old, $t1;
    ({defaultdict: _dd} = $py.collections);
    gain = _dd($float);
    for (const $f69 of $iter($M.values(self.comps))) {
      c = $f69;
      if (($in(c.kind, ["wc", "ct", "nl"]))) {
        for (const $f70 of $iter($M.items(c.ranking_gain()))) {
          [n, g] = $iter($f70);
          $setidx(gain, n, $iadd($idx(gain, n), g));
        }
      }
    }
    old = ($T($t1 = $getattr(self, "nat_hist", new $Dict())) ? $t1 : new $Dict());
    self.nat_hist = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.nations)) { n = $c0; $r.set(n, $add((0.7 * $M.get(old, n, 0.0)), $M.get(gain, n, 0.0))); } return $r; })();
  }
  national_coach_cycle() {
    const self = this;
    let best, bs, co, floor, n, nm, old, order, pool, rng, s;
    rng = self.rng;
    pool = (() => { const $r = []; let co; for (const $c0 of $iter(self.retired_coaches)) { co = $c0; if (!(co.intl == null)) continue; $r.push(co); } return $r; })();
    for (const $f71 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f71);
      old = $idx(n, "coach");
      if ((old != null)) {
        old.intl = null;
        if ((old.age <= 74)) {
          $M.append(pool, old);
        }
        $setidx(n, "coach", null);
      }
    }
    order = $sorted(self.nations, $kw({"key": ((nm) => (-$idx($idx(self.nations, nm), "eff")))}));
    for (const $f72 of $iter(order)) {
      nm = $f72;
      n = $idx(self.nations, nm);
      [best, bs] = $iter([null, (-1000000000.0)]);
      for (const $f73 of $iter(pool)) {
        co = $f73;
        s = $add($add(co.prestige, (($eq(co.nat, nm)) ? 12 : 0)), rng.uniform((-4), 4));
        if ($gt(s, bs)) {
          [best, bs] = $iter([co, s]);
        }
      }
      floor = (8 + (($idx(n, "base") - 40) * 0.3));
      if (((best != null) && $ge(bs, floor))) {
        $M.remove(pool, best);
        $setidx(n, "coach", best);
        if (($in(best, self.retired_coaches))) {
          $M.remove(self.retired_coaches, best);
        }
      } else {
        $setidx(n, "coach", self._new_coach(fclamp($add((8 + (($idx(n, "base") - 40) * 0.4)), rng.uniform((-5), 5)), 3, 60), $kw({"age": rng.randint(45, 66), "nat": nm})));
      }
      $idx(n, "coach").intl = nm;
      $idx(n, "coach").contract = self.cfg.nat_coach_years;
    }
    self.retired_coaches = (() => { const $r = []; let co; for (const $c0 of $iter(pool)) { co = $c0; if (!((co.intl == null) && (co.age <= 75))) continue; $r.push(co); } return $r; })();
  }
  _develop(p) {
    const self = this;
    let gap, inc, rng, step;
    rng = self.rng;
    if ((p.age <= 23)) {
      if ($T(self.cfg.dev_pot_growth)) {
        gap = $sub(p.pot, p.ovr);
        if ((gap > 0)) {
          step = $div(gap, $max(1, (24 - p.age)));
          inc = $add($int(step), ($lt(rng.random(), $sub(step, $int(step))) ? 1 : 0));
          inc = $max(0, $add(inc, rng.choice([(-1), 0, 0, 1])));
          p.ovr = $min($add(p.ovr, inc), p.pot);
        }
      } else if ($lt(p.ovr, p.pot)) {
        p.ovr = $min($add(p.ovr, rng.randint(1, 4)), p.pot);
      }
    } else if ((p.age <= 28)) {
      p.ovr = $iadd(p.ovr, rng.choice([(-1), 0, 0, 1]));
    } else if ((p.age <= 31)) {
      p.ovr = $iadd(p.ovr, rng.randint((-2), 0));
    } else {
      p.ovr = $iadd(p.ovr, rng.randint((-4), (-1)));
    }
    p.ovr = clamp(p.ovr);
    p.pot = $max(p.pot, p.ovr);
  }
  _should_retire(p) {
    const self = this;
    if ((p.age >= 39)) {
      return true;
    }
    if ($lt(p.age, self.cfg.retire_start)) {
      return false;
    }
    return $lt(self.rng.random(), $min(0.9, $mul(self.cfg.retire_ramp, ($sub(p.age, self.cfg.retire_start) + 1))));
  }
  _outflow_chance(age) {
    const self = this;
    let c;
    c = self.cfg;
    return $min(c.outflow_max, $add(c.outflow_base, $mul(c.outflow_age_slope, $max(0, $sub(age, c.outflow_age_start)))));
  }
  _youth_rate() {
    const self = this;
    let fa, need, o, sq, vac;
    sq = self.squads();
    vac = $sum((() => { const $r = []; let c; for (const $c0 of $iter(self.clubs)) { c = $c0; $r.push($max(0, $sub(SQUAD_MAX, $len($M.get(sq, c, []))))); } return $r; })());
    fa = $sum((() => { const $r = []; let p; for (const $c0 of $iter(self.players)) { p = $c0; if (!(p.club == null)) continue; $r.push(1); } return $r; })());
    o = fclamp(self.o_est, 0.05, 0.6);
    need = $add($sub(vac, fa), $div(self.cfg.target_pool, (1 - o)));
    return $div($max(0.0, need), $len(self.clubs));
  }
  poach() {
    const self = this;
    let L, _, ab, ask, b, buyers, cands, cfg, chance, fee, ln, names, need, p, payroll, rng, seller, sq, std, xi, $t1;
    [cfg, rng] = $iter([self.cfg, self.rng]);
    if (((cfg.poach_base <= 0) && (cfg.spread_gain <= 0))) {
      return null;
    }
    self.recompute_clubs();
    sq = self.squads();
    for (const $f74 of $iter($M.items(self.leagues))) {
      [ln, L] = $iter($f74);
      names = $idx(L, "clubs");
      std = statistics.pstdev((() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($idx($idx(self.clubs, n), "ovr")); } return $r; })());
      chance = fclamp($add(cfg.poach_base, $mul(cfg.spread_gain, $sub($idx(L, "start_std"), std))), 0.0, 0.9);
      if ((chance <= 0)) {
        continue;
      }
      payroll = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(names)) { n = $c0; $r.set(n, $sum((() => { const $r = []; let p; for (const $c0 of $iter($M.get(sq, n, []))) { p = $c0; $r.push(p.wage); } return $r; })())); } return $r; })();
      buyers = $slice($sorted(names, $kw({"key": ((n) => (-self.attr(n)))})), null, cfg.poach_buyers, null);
      for (const $f75 of $iter(buyers)) {
        b = $f75;
        for (const $f76 of $iter($range(cfg.poach_max))) {
          _ = $f76;
          if ($ge(rng.random(), chance)) {
            continue;
          }
          xi = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter($idx(sq, b))) { p = $c0; $r.push(p.ovr); } return $r; })(), $kw({"reverse": true})), null, XI, null);
          if ($lt($len(xi), XI)) {
            continue;
          }
          need = $add($idx(xi, (-1)), cfg.poach_min_gain);
          ab = self.attr(b);
          cands = (() => { const $r = []; let p, sname; for (const $c0 of $iter(names)) { sname = $c0; if (!((!$eq(sname, b)) && $lt(self.attr(sname), ab))) continue; for (const $c1 of $iter($M.get(sq, sname, []))) { p = $c1; if (!($ge(p.ovr, need) && (p.age <= 31) && (p.prot <= 0) && $le(p.contract, cfg.poach_contract_max))) continue; $r.push(p); } } return $r; })();
          $M.sort(cands, $kw({"key": ((p) => (-p.ovr))}));
          for (const $f77 of $iter(cands)) {
            p = $f77;
            if (!$mods.market.allow(self, p, b, "league")) continue;
            ask = wage_for(p.ovr, p.age);
            fee = self.fee_for(p);
            if (($gt($add($idx(payroll, b), ask), $mul(self.cfg.wage_cap, $idx($idx(self.clubs, b), "budget"))) || $gt(fee, $idx($idx(self.clubs, b), "funds")))) {
              continue;
            }
            seller = p.club;
            self._pay(b, seller, fee);
            self._log_transfer(p, seller, b, fee, "league");
            $M.remove($idx(sq, seller), p);
            $M.append($idx(sq, b), p);
            $setidx(payroll, seller, $sub($idx(payroll, seller), p.wage));
            $setidx(payroll, b, $iadd($idx(payroll, b), ask));
            [p.club, p.wage, p.contract] = $iter([b, ask, rng.randint(2, 4)]);
            $t1 = self.stats, $setidx($t1, "poached", $idx($t1, "poached") + 1);
            if (((p.ovr >= 88) && (self._count("transfer") < 2))) {
              self.news("transfer", ($str(b) + " sign " + $str(p.name) + " (OVR " + $str(p.ovr) + ", age " + $str(p.age) + ") from " + $str(seller) + " for " + $str(eur($mul(fee, self.cfg.money_x)))));
            }
            break;
          }
        }
      }
    }
  }
  xleague_market() {
    const self = this;
    let ask, attr, b, buyers, cands, cfg, fee, lb, need, p, payroll, rng, seller, sq, xi, $t1;
    [cfg, rng] = $iter([self.cfg, self.rng]);
    if (((cfg.xleague_p <= 0) || (cfg.xleague_buyers <= 0))) {
      return null;
    }
    self.recompute_clubs();
    sq = self.squads();
    payroll = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.clubs)) { n = $c0; $r.set(n, $sum((() => { const $r = []; let p; for (const $c0 of $iter($M.get(sq, n, []))) { p = $c0; $r.push(p.wage); } return $r; })())); } return $r; })();
    attr = (() => { const $r = new $Dict(); let n; for (const $c0 of $iter(self.clubs)) { n = $c0; $r.set(n, self.attr(n)); } return $r; })();
    buyers = $slice($sorted(self.clubs, $kw({"key": ((n) => (-$idx($idx(self.clubs, n), "funds")))})), null, cfg.xleague_buyers, null);
    for (const $f78 of $iter(buyers)) {
      b = $f78;
      if ($ge(rng.random(), cfg.xleague_p)) {
        continue;
      }
      xi = $slice($sorted((() => { const $r = []; let p; for (const $c0 of $iter($idx(sq, b))) { p = $c0; $r.push(p.ovr); } return $r; })(), $kw({"reverse": true})), null, XI, null);
      if ($lt($len(xi), XI)) {
        continue;
      }
      need = ($add($idx(xi, (-1)), cfg.poach_min_gain) + 1);
      lb = $idx($idx(self.clubs, b), "league");
      cands = (() => { const $r = []; let members, p, sname; for (const $c0 of $iter($M.items(sq))) { [sname, members] = $iter($c0); if (!((!$eq($idx($idx(self.clubs, sname), "league"), lb)) && $lt($idx(attr, sname), $idx(attr, b)))) continue; for (const $c1 of $iter(members)) { p = $c1; if (!($ge(p.ovr, need) && (p.age <= 29) && (p.prot <= 0) && $le(p.contract, cfg.poach_contract_max))) continue; $r.push(p); } } return $r; })();
      $M.sort(cands, $kw({"key": ((p) => (-p.ovr))}));
      for (const $f79 of $iter(cands)) {
        p = $f79;
        if (!$mods.market.allow(self, p, b, "abroad")) continue;
        ask = wage_for(p.ovr, p.age);
        fee = self.fee_for(p);
        if (($gt($add($idx(payroll, b), ask), $mul(self.cfg.wage_cap, $idx($idx(self.clubs, b), "budget"))) || $gt(fee, $idx($idx(self.clubs, b), "funds")))) {
          continue;
        }
        seller = p.club;
        self._pay(b, seller, fee);
        self._log_transfer(p, seller, b, fee, "abroad");
        $M.remove($idx(sq, seller), p);
        $M.append($idx(sq, b), p);
        $setidx(payroll, seller, $sub($idx(payroll, seller), p.wage));
        $setidx(payroll, b, $iadd($idx(payroll, b), ask));
        [p.club, p.league, p.wage, p.contract] = $iter([b, lb, ask, rng.randint(2, 4)]);
        $t1 = self.stats, $setidx($t1, "xleague", $idx($t1, "xleague") + 1);
        if (((p.ovr >= 88) && (self._count("transfer") < 2))) {
          self.news("transfer", ($str(b) + " sign " + $str(p.name) + " (OVR " + $str(p.ovr) + ", age " + $str(p.age) + ") from " + $str(seller) + " (" + $str($idx($idx(self.clubs, seller), "league")) + ") for " + $str(eur($mul(fee, self.cfg.money_x)))));
        }
        break;
      }
    }
  }
  _nation_inputs() {
    const self = this;
    let avg, exp, nm, p, star, strength, tw, vis, $t1, $t2;
    avg = self.league_avgs();
    strength = (() => { const $r = new $Dict(); let a, ln; for (const $c0 of $iter($M.items(avg))) { [ln, a] = $iter($c0); $r.set(ln, fclamp($mul((a - 50), 3), 0, 100)); } return $r; })();
    exp = new $Dict();
    for (const $f80 of $iter(self.nations)) {
      nm = $f80;
      tw = $sum((() => { const $r = []; let _, w; for (const $c0 of $iter($idx(self.prox, nm))) { [_, w] = $iter($c0); $r.push(w); } return $r; })());
      $setidx(exp, nm, $div($sum((() => { const $r = []; let ln, w; for (const $c0 of $iter($idx(self.prox, nm))) { [ln, w] = $iter($c0); $r.push($mul(w, $idx(strength, ln))); } return $r; })()), tw));
    }
    star = (() => { const $r = new $Dict(); let nm; for (const $c0 of $iter(self.nations)) { nm = $c0; $r.set(nm, 0.0); } return $r; })();
    for (const $f81 of $iter(self.players)) {
      p = $f81;
      if ($T(($T($t1 = (p.ovr >= 80)) ? p.club : $t1))) {
        vis = (0.5 + ((0.5 * $idx($idx(self.clubs, p.club), "lprestige")) / 90));
        $t2 = p.nat, $setidx(star, $t2, $iadd($idx(star, $t2), $mul((p.ovr - 79), vis)));
      }
    }
    for (const $f82 of $iter(star)) {
      nm = $f82;
      $setidx(star, nm, $min(30.0, $idx(star, nm)));
    }
    return [exp, star];
  }
  nations_offseason(rec, wc) {
    const self = this;
    let cfg, exp, n, nm, star, target;
    cfg = self.cfg;
    [exp, star] = $iter(self._nation_inputs());
    for (const $f83 of $iter($M.items(self.nations))) {
      [nm, n] = $iter($f83);
      target = $add($add($add($idx(n, "base"), $mul(cfg.nat_expo_gain, $sub($idx(exp, nm), $idx(n, "exp0")))), $mul(cfg.nat_star_gain, $sub($idx(star, nm), $idx(n, "star0")))), $mul(cfg.nat_wc_gain, $idx(n, "form")));
      $setidx(n, "dev", fclamp($add($idx(n, "dev"), $mul(cfg.nat_rate, $sub(target, $idx(n, "dev")))), $max(5.0, $sub($idx(n, "base"), cfg.nat_dev_cap)), $min(100.0, $add($idx(n, "base"), cfg.nat_dev_cap))));
      $setidx(n, "form", $mul($idx(n, "form"), cfg.nat_form_decay));
    }
    self.recompute_nations();
  }
  season_end(rec) {
    const self = this;
    let avg, cfg, fa_before, g, gap, gone, keep, members, p, rank, rng, $t1;
    [cfg, rng] = $iter([self.cfg, self.rng]);
    avg = self.league_avgs();
    gap = (() => { const $r = new $Dict(); let ln; for (const $c0 of $iter(avg)) { ln = $c0; $r.set(ln, $sub($idx($idx(self.leagues, ln), "target"), $idx(avg, ln))); } return $r; })();
    for (const $f84 of $iter(self.players)) {
      p = $f84;
      $M.append(p.career, [self.season, p.club, p.ovr]);
      p.age = p.age + 1;
      if ((p.prot > 0)) {
        p.prot = p.prot - 1;
      }
      self._develop(p);
      if ($gt(p.ovr, p.peak)) {
        p.peak = p.ovr;
      }
      if ($T(($T($t1 = (cfg.anchor_gain > 0)) ? p.club : $t1))) {
        g = $idx(gap, $idx($idx(self.clubs, p.club), "league"));
        if (((g > 0.5) && (p.age <= 28))) {
          if ($lt(rng.random(), $min(0.7, ($mul(cfg.anchor_gain, g) / 4)))) {
            p.ovr = clamp((p.ovr + 1));
            p.pot = $max(p.pot, p.ovr);
          }
        } else if (($lt(g, (-1.0)) && (p.age >= 24))) {
          if ($lt(rng.random(), $min(0.85, ($mul(cfg.anchor_gain, (-g)) / 3)))) {
            p.ovr = clamp((p.ovr - 1));
            if (($lt(g, (-3.0)) && (rng.random() < 0.5))) {
              p.ovr = clamp((p.ovr - 1));
            }
          }
        }
      }
    }
    keep = [];
    for (const $f85 of $iter(self.players)) {
      p = $f85;
      if ($T(self._should_retire(p))) {
        $setidx(rec, "retired", $idx(rec, "retired") + 1);
        if ((p.peak >= 86)) {
          $M.append(self.retired_players, p);
        }
      } else {
        $M.append(keep, p);
      }
    }
    self.players = keep;
    for (const $f86 of $iter($M.values(self.squads()))) {
      members = $f86;
      for (const $f87 of $iter($enumerate($sorted(members, $kw({"key": ((x) => (-x.ovr))}))))) {
        [rank, p] = $iter($f87);
        p.contract = p.contract - 1;
        if ((p.contract <= 0)) {
          if (($lt(rank, cfg.release_top_n) && (rng.random() < 0.9))) {
            p.contract = rng.randint(1, 4);
            p.wage = wage_for(p.ovr, p.age);
            p.prot = 0;
          } else {
            p.club = null;
          }
        }
      }
    }
    for (const $f88 of $iter(self.players)) {
      p = $f88;
      if ((p.club == null)) {
        p.pref = null;
      }
    }
    self.poach();
    self.xleague_market();
    $mods.bids.run(self, rec);
    self._make_youth(rec, gap);
    self.recompute_clubs();
    for (const $f89 of $iter($M.values(self.squads()))) {
      members = $f89;
      if ($gt($len(members), SQUAD_MAX)) {
        for (const $f90 of $iter($slice($sorted(members, $kw({"key": ((x) => x.ovr)})), null, $sub($len(members), SQUAD_MAX), null))) {
          p = $f90;
          p.club = null;
        }
      }
    }
    self.fill(rec);
    self.recompute_clubs();
    fa_before = $sum((() => { const $r = []; let p; for (const $c0 of $iter(self.players)) { p = $c0; if (!(p.club == null)) continue; $r.push(1); } return $r; })());
    gone = 0;
    keep = [];
    for (const $f91 of $iter(self.players)) {
      p = $f91;
      if (((p.club == null) && $lt(rng.random(), self._outflow_chance(p.age)))) {
        $setidx(rec, "outflow", $idx(rec, "outflow") + 1);
        gone = gone + 1;
      } else {
        $M.append(keep, p);
      }
    }
    self.players = keep;
    if ($T(fa_before)) {
      self.o_est = $add((0.5 * self.o_est), (0.5 * $div(gone, fa_before)));
    }
    self.pool_prev = self.pool_last;
    self.pool_last = $sum((() => { const $r = []; let p; for (const $c0 of $iter(self.players)) { p = $c0; if (!(p.club == null)) continue; $r.push(1); } return $r; })());
  }
  _make_youth(rec, gap) {
    const self = this;
    let ceiling, cfg, dev_mean, gaps, lw, n, n_total, names, nm, ovr, picks, pot, pref, q, qb, qn, rng, total, tw, wsum, wts;
    [cfg, rng] = $iter([self.cfg, self.rng]);
    total = $mul(self._youth_rate(), $len(self.clubs));
    n_total = $int(total);
    if ($lt(rng.random(), $sub(total, n_total))) {
      n_total = n_total + 1;
    }
    names = self.nat_names;
    wts = (() => { const $r = []; let n; for (const $c0 of $iter(names)) { n = $c0; $r.push($pow(($idx($idx(self.nations, n), "dev") / 100), cfg.nat_supply_pow)); } return $r; })();
    wsum = $sum(wts);
    dev_mean = $div($sum((() => { const $r = []; let n, w; for (const $c0 of $iter($zip(wts, names))) { [w, n] = $iter($c0); $r.push($mul(w, $idx($idx(self.nations, n), "dev"))); } return $r; })()), wsum);
    picks = rng.choices(names, wts, $kw({"k": n_total}));
    gaps = new $Dict();
    for (const $f92 of $iter($set(picks))) {
      nm = $f92;
      n = $idx(self.nations, nm);
      if ($T($idx(n, "league"))) {
        $setidx(gaps, nm, $idx(gap, $idx(n, "league")));
      } else {
        tw = $sum((() => { const $r = []; let _, w; for (const $c0 of $iter($idx(self.prox, nm))) { [_, w] = $iter($c0); $r.push(w); } return $r; })());
        $setidx(gaps, nm, $div($sum((() => { const $r = []; let ln, w; for (const $c0 of $iter($idx(self.prox, nm))) { [ln, w] = $iter($c0); $r.push($mul(w, $idx(gap, ln))); } return $r; })()), tw));
      }
    }
    const sq0 = self.squads(), room = [], rw = [];
    for (const [cn, cc] of $M.items(self.clubs)) { if ($len($M.get(sq0, cn, [])) < SQUAD_MAX) { room.push(cn); rw.push(Math.pow(Math.max(0.3, $M.get(cc, "acad", 3.0) - 0.5), 2)); } }
    for (const $f93 of $iter(picks)) {
      nm = $f93;
      n = $idx(self.nations, nm);
      const gradClub = (room.length && rng.random() < cfg.acad_share) ? rng.choices(room, rw, $kw({"k": 1}))[0] : null;
      if (gradClub) { const gc = $idx(self.clubs, gradClub); nm = ((rng.random() < 0.7) ? $idx(gc, "country") : nm); if (!$in(nm, gaps)) $setidx(gaps, nm, 0.0); n = $idx(self.nations, nm); }
      qb = $int($round(fclamp($mul(cfg.anchor_gain, $idx(gaps, nm)), (-10), 8)));
      qn = $int($round($div($sub($idx(n, "dev"), dev_mean), cfg.nat_quality_div)));
      if (gradClub) qb += Math.round(($idx($idx(self.clubs, gradClub), "acad") - 6) * 1.2);
      ovr = clamp($add($add(rng.randint(42, 56), Math.floor(qb / 2)), Math.floor(qn / 2)));
      q = $add($add(qb, cfg.pot_shift), qn);
      ceiling = fclamp((92 + q), 70, 99);
      pot = $max(ovr, $int(rng.triangular($add(cfg.pot_low, q), ceiling, $add(cfg.pot_mode, q))));
      pref = null;
      if ($lt(rng.random(), cfg.home_prob)) {
        if ($T($idx(n, "league"))) {
          pref = $idx(n, "league");
        } else {
          lw = $idx(self.prox, nm);
          pref = $idx(rng.choices((() => { const $r = []; let _, l; for (const $c0 of $iter(lw)) { [l, _] = $iter($c0); $r.push(l); } return $r; })(), (() => { const $r = []; let _, w; for (const $c0 of $iter(lw)) { [_, w] = $iter($c0); $r.push(w); } return $r; })()), 0);
        }
      }
      if (gradClub) {
        const gc = $idx(self.clubs, gradClub), gp = $new(Player, [self._name(), rng.randint(16, 18), rng.choice(PLAN), ovr, $min(99, pot), gradClub, $idx(gc, "league"), nm, wage_for(ovr, 17), cfg.first_contract, $kw({"pref": null, "prot": cfg.first_contract})]);
        gp.trn = gradClub; $M.append(self.players, gp); $M.append($idx(gc, "grads"), gp); $setidx(gc, "acad_out", $idx(gc, "acad_out") + 1);
        if ($len($idx(gc, "grads")) > 12) $setidx(gc, "grads", $slice($idx(gc, "grads"), -12, null, null));
        continue;
      }
      $M.append(self.players, $new(Player, [self._name(), rng.randint(16, 18), rng.choice(PLAN), ovr, $min(99, pot), null, "", nm, wage_for(ovr, 17), cfg.first_contract, $kw({"pref": pref})]));
    }
    $setidx(rec, "youth", $iadd($idx(rec, "youth"), n_total));
  }
  fill(rec) {
    const self = this;
    let ask, c, cname, count, fa, first, need, p, payroll, rng, sq, $t1, $t2, $t3, $t4;
    rng = self.rng;
    sq = self.squads();
    payroll = (() => { const $r = new $Dict(); let c; for (const $c0 of $iter(self.clubs)) { c = $c0; $r.set(c, $sum((() => { const $r = []; let p; for (const $c0 of $iter($M.get(sq, c, []))) { p = $c0; $r.push(p.wage); } return $r; })())); } return $r; })();
    count = (() => { const $r = new $Dict(); let c; for (const $c0 of $iter(self.clubs)) { c = $c0; $r.set(c, $len($M.get(sq, c, []))); } return $r; })();
    fa = $sorted((() => { const $r = []; let p; for (const $c0 of $iter(self.players)) { p = $c0; if (!(p.club == null)) continue; $r.push(p); } return $r; })(), $kw({"key": ((p) => (-$add(p.ovr, ((p.age <= 21) ? (0.35 * $sub(p.pot, p.ovr)) : 0))))}));
    for (const $f94 of $iter($sorted(self.clubs, $kw({"key": ((c) => (-$idx($idx(self.clubs, c), "budget")))})))) {
      cname = $f94;
      c = $idx(self.clubs, cname);
      need = $sub(SQUAD_MAX, $idx(count, cname));
      if ((need <= 0)) {
        continue;
      }
      for (const $f95 of $iter($list(fa))) {
        p = $f95;
        if ((need <= 0)) {
          break;
        }
        ask = wage_for(p.ovr, p.age);
        if ($gt($add($idx(payroll, cname), ask), $mul(self.cfg.wage_cap, $idx(c, "budget")))) {
          continue;
        }
        if ($T(($T($t1 = p.pref) ? ($T($t2 = (p.league === "")) ? ($T($t3 = (p.age <= 23)) ? (!$eq(p.pref, $idx(c, "league"))) : $t3) : $t2) : $t1))) {
          continue;
        }
        first = (p.league === "");
        if ($T(($T($t4 = p.league) ? (!$eq(p.league, $idx(c, "league"))) : $t4))) {
          if ($gt($idx($idx(self.leagues, p.league), "prestige"), $idx(c, "lprestige"))) {
            $setidx(rec, "down", $idx(rec, "down") + 1);
            if (((p.age >= 30) && (p.ovr >= 76) && (self._count("star") < 2))) {
              self.news("star", ($str(p.name) + " (age " + $str(p.age) + ", OVR " + $str(p.ovr) + ") leaves the " + $str(p.league) + " for " + $str(cname) + " (" + $str($idx(c, "league")) + ")"));
            }
          } else {
            $setidx(rec, "up", $idx(rec, "up") + 1);
          }
        }
        [p.club, p.league, p.wage] = $iter([cname, $idx(c, "league"), ask]);
        if ($T(first)) {
          [p.contract, p.prot] = $iter([self.cfg.first_contract, self.cfg.first_contract]);
        } else {
          p.contract = rng.randint(1, 4);
        }
        if ($T(first) && !p.trn) p.trn = cname;
        p.pref = null;
        $setidx(payroll, cname, $iadd($idx(payroll, cname), ask));
        need = need - 1;
        $M.remove(fa, p);
      }
    }
  }
  table_rows(ln) {
    const self = this;
    let cup, i, lc, n, order, rows, s, slots, zone;
    lc = $idx(self.comps, ("L:" + $str(ln)));
    order = lc.standings();
    slots = $idx($idx(self.leagues, ln), "slots");
    cup = $M.get($M.get(self.cups, $idx($idx(self.leagues, ln), "confed"), new $Dict()), "name", "cup");
    rows = [];
    for (const $f96 of $iter($enumerate(order, 1))) {
      [i, n] = $iter($f96);
      s = $idx(lc.st, n);
      if ((i === 1)) {
        zone = ($T(slots) ? ("champion + " + cup) : "champion");
      } else if ($le(i, slots)) {
        zone = cup;
      } else {
        zone = "";
      }
      $M.append(rows, $dict($kw({"pos": i, "club": n, "p": $idx(s, "p"), "w": $idx(s, "w"), "d": $idx(s, "d"), "l": $idx(s, "l"), "gf": $idx(s, "gf"), "ga": $idx(s, "ga"), "pts": $idx(s, "pts"), "zone": zone, "ovr": $idx($idx(self.clubs, n), "ovr"), "hot": $ge($idx($idx(self.clubs, n), "coach").hot, (self.cfg.hot_tolerance - 3))})));
    }
    return rows;
  }
  save(path) {
    const self = this;
  }
  static load(path) {
    return null;
  }
}
$CLS['World'] = World;
function digest(world) {
  let h, hashlib, r;
  hashlib = $py.hashlib;
  h = hashlib.sha256();
  for (const $f97 of $iter(world.hist)) {
    r = $f97;
    $M.update(h, $M.encode($repr([$idx(r, "season"), $sorted($M.items($idx(r, "champs"))), $sorted($M.items($idx(r, "cups"))), $idx(r, "cwc"), $idx(r, "wc"), $sorted((() => { const $r = []; let ln, t; for (const $c0 of $iter($M.items($idx(r, "pts")))) { [ln, t] = $iter($c0); $r.push([ln, $sorted(t)]); } return $r; })())])));
  }
  $M.update(h, $M.encode($repr($sorted((() => { const $r = []; let p; for (const $c0 of $iter(world.players)) { p = $c0; $r.push([p.name, p.age, p.ovr, $str(p.club), p.nat]); } return $r; })()))));
  return $slice(h.hexdigest(), null, 16, null);
}
return {C: C, CONTINENT: CONTINENT, Coach: Coach, Counter: Counter, DATA_DIR: DATA_DIR, FIRST_NAMES: FIRST_NAMES, HERE: HERE, LAST_NAMES: LAST_NAMES, Locked: Locked, MAX_OVR: MAX_OVR, MIN_OVR: MIN_OVR, PLAN: PLAN, Player: Player, SQUAD_MAX: SQUAD_MAX, Settings: Settings, World: World, XI: XI, awards: awards, cal: cal, clamp: clamp, dataclass: dataclass, defaultdict: defaultdict, digest: digest, eur: eur, fclamp: fclamp, field: field, gzip: gzip, json: json, math: math, natcomps: natcomps, os: os, parse_clubs: parse_clubs, pickle: pickle, random: random, replace: replace, shim: shim, statistics: statistics, wage_for: wage_for};
})();
