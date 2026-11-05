// v15 transfer market with real bidding. Plain JS (not generated). Runs once in the off-season after the older poach / cross-league
// rules. A lot is a player some clubs want: several clubs bid, the seller asks a price that rises with the number of bidders and with
// rivalry, and the player picks the offer he likes best (money, trophies, playing time, ambition; loyalty makes him harder to move).
$mods["bids"] = (function () {
  const h = (s) => $crc32($utf8(s)) / 4294967296;
  const trait = (p, k) => 1 + Math.floor(h(p.name + "|" + p.nat + "|" + k) * 3);        // 1 low .. 3 high, fixed for a player
  const traits = (p) => ({ money: trait(p, "m"), loyal: trait(p, "l"), ambition: trait(p, "a"), trophies: trait(p, "t") });
  function run(w, rec) {
    const cfg = w.cfg; if (!(cfg.bid_lots > 0) || globalThis.__NO_BIDS) return 0;
    w.recompute_clubs();
    const rng = w.rng, by = {}, pay = {}, attr = {}, floor = {};
    for (const n of w.clubs.keysArr()) { by[n] = []; pay[n] = 0; attr[n] = w.attr(n); }
    for (const p of w.players) if (p.club && by[p.club]) { by[p.club].push(p); pay[p.club] += p.wage; }
    for (const n of w.clubs.keysArr()) { const o = by[n].map((p) => p.ovr).sort((a, b) => b - a); floor[n] = o.length >= 11 ? o[10] : 0; }
    const pool = w.players.filter((p) => p.club && by[p.club] && p.age <= 34 && p.ovr >= 64);
    if (!pool.length) return 0;
    const weight = (p) => Math.pow(Math.max(1, w.fee_for(p)), 0.8) * (p.contract <= 1 ? 2 : 1) * (w.clubs.get_(p.club).get("debt", 0) > 0 ? 2 : 1);
    const picks = rng.choices(pool, pool.map(weight), $kw({ "k": cfg.bid_lots }));
    const done = new Set(); let moves = 0;
    for (const p of picks) {
      if (done.has(p) || !p.club || by[p.club].length <= 19) continue;
      const seller = p.club, S = w.clubs.get_(seller), T = traits(p), ask0 = w.fee_for(p);
      const wageAsk = wageFor(p);
      const cand = [];
      for (const b of w.clubs.keysArr()) {
        if (b === seller) continue;
        const B = w.clubs.get_(b), funds = B.get_("funds");
        if (attr[b] < attr[seller] - 6 || p.ovr < floor[b] + 1 || funds < ask0 || by[b].length >= 27) continue;
        if (pay[b] + wageAsk > cfg.wage_cap * B.get_("budget")) continue;
        cand.push({ b, B, funds, interest: (p.ovr - floor[b]) + 0.1 * Math.min(10, funds / Math.max(1, ask0)) + 3 * rng.random() });
      }
      if (!cand.length) continue;
      cand.sort((x, y) => y.interest - x.interest || (x.b < y.b ? -1 : 1));
      const bidders = [];
      for (const c of cand.slice(0, cfg.bid_max)) {
        const R = $mods.rivals.intensity(w, seller, c.b);
        if (R >= 0.7 && rng.random() < 0.8) continue;                 // a seller rarely does business with a major rival
        c.R = R; c.prem = R >= 0.7 ? 1.4 : R > 0.3 ? 1.2 : R > 0 ? 1.1 : 1.0; bidders.push(c);
      }
      if (!bidders.length) continue;
      const demand = 1 + 0.15 * (bidders.length - 1);
      for (const c of bidders) {
        c.bid = Math.round(Math.min(c.funds, ask0 * demand * c.prem * (0.97 + 0.12 * rng.random())) * 10) / 10; c.bid = Math.max(c.bid, ask0);
        const room = Math.max(0, cfg.wage_cap * c.B.get_("budget") - pay[c.b] - wageAsk), offer = wageAsk * (1 + 0.3 * Math.min(1, room / Math.max(1e-9, wageAsk)) * (0.5 + rng.random()));
        c.wage = offer;
        const play = Math.max(-0.5, Math.min(1, (p.ovr - floor[c.b]) / 10));
        c.score = T.money * 2 * (offer / Math.max(0.1, p.wage) - 1) + T.trophies * attr[c.b] / 100 + T.ambition * (attr[c.b] - attr[seller]) / 30 + 0.8 * play - 0.25 * T.loyal;
      }
      bidders.sort((x, y) => y.score - x.score || (x.b < y.b ? -1 : 1));
      const win = bidders[0], fee = win.bid;
      if (win.R >= 0.7 && fee < ask0 * 1.6 && rng.random() < 0.5) continue;     // the seller refuses to strengthen a major rival without a huge offer
      if (fee > win.funds) continue;
      const lose = bidders[1];
      $mods.market.setWhy(bidders.length > 1 ? "Bidding war: " + win.b + " beat " + lose.b + " and " + (bidders.length - 1 > 1 ? (bidders.length - 2) + " more" : "no one else") + (win.R > 0 ? " · rival premium" : "") : win.R > 0 ? "Sold to a rival at a premium" : "Only bidder");
      w._pay(win.b, seller, fee);
      w._log_transfer(p, seller, win.b, fee, "bid");
      const tl = w.transfers[w.transfers.length - 1];
      let comp = 0, trainer = null;      // training compensation to the club that developed him
      if (p.trn && p.trn !== seller && p.trn !== win.b && p.age <= 23 && w.clubs.has(p.trn)) { comp = Math.round(0.1 * fee * 10) / 10; trainer = p.trn; w._pay(win.b, p.trn, comp); }
      const X = cfg.money_x, e1 = (x) => Math.round(x * X * 10) / 10;
      tl.set("detail", $dict($kw({ "base": e1(ask0), "asking": e1(ask0 * demand * win.prem), "demand": Math.round(demand * 100) / 100, "premium": win.prem, "traits": $dict($kw({ "money": T.money, "loyal": T.loyal, "ambition": T.ambition, "trophies": T.trophies })),
        "bids": bidders.map((c) => $dict($kw({ "club": c.b, "bid": e1(c.bid), "wage": e1(c.wage), "score": Math.round(c.score * 100) / 100, "rival": c.R > 0 }))), "comp": e1(comp), "trainer": trainer })));
      by[seller] = by[seller].filter((x) => x !== p); by[win.b].push(p); pay[seller] -= p.wage; pay[win.b] += win.wage;
      p.club = win.b; p.league = win.B.get_("league"); p.wage = win.wage; p.contract = rng.randint(2, 4); p.prot = 0; done.add(p); moves++;
      if (fee >= 25) w._bid_news(p, win.b, seller, fee);
      floor[win.b] = Math.max(floor[win.b], Math.min(p.ovr, floor[win.b] + 1));
    }
    if (rec && rec.set) rec.set("bids", moves);
    return moves;
  }
  function wageFor(p) { return $mods.sim_core ? $mods.sim_core.wage_for(p.ovr, p.age) : p.wage; }
  return { run, traits };
})();
