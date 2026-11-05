// Transfer realism. Plain JS (not generated). A club may not raid a rival, and top clubs do not trade with each other
// unless the move makes sense: a high-rated player whose output is well below what his rating predicts.
$mods["market"] = (function () {
  let cache = { key: null, elite: null, perf: null };
  let why = null;
  const gv = (x, k) => (x instanceof $Dict ? x.get_(k) : x[k]);
  // elite = top 4 of its own league by strength, or one of the 25 strongest clubs anywhere
  function eliteSet(w, phase) {
    const k = w.season + ":" + phase;
    if (cache.key === k && cache.elite) return cache.elite;
    const E = new Set(), all = [];
    for (const n of w.clubs.keysArr()) all.push([w.attr(n), n]);
    all.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
    for (const [, n] of all.slice(0, 25)) E.add(n);
    for (const L of w.leagues.valuesArr()) {
      const names = gv(L, "clubs").slice().sort((a, b) => w.attr(b) - w.attr(a) || (a < b ? -1 : 1));
      for (const n of names.slice(0, 4)) E.add(n);
    }
    cache = { key: k, elite: E, perf: cache.key === k ? cache.perf : null };
    return E;
  }
  // output last season, by position (goals and assists for attackers, clean sheets for keepers)
  const metric = (pos, s) => (pos === "FWD" ? s[2] + 0.7 * s[3] : pos === "MID" ? 1.15 * s[2] + 1.05 * s[3] : null);
  function lastStat(p, season) {
    const st = p.stats; if (!st || !st.length) return null;
    const s = st[st.length - 1];
    return s[0] === season ? s : null;
  }
  function peers(w) {
    if (cache.perf && cache.perf.season === w.season) return cache.perf;
    const by = { FWD: [], MID: [] };
    for (const p of w.players) {
      if (!p.club || !by[p.pos]) continue;
      const s = lastStat(p, w.season); if (!s) continue;
      by[p.pos].push([p.ovr, metric(p.pos, s)]);
    }
    cache.perf = { season: w.season, by };
    return cache.perf;
  }
  // true when the player produced far less than similar players: below half the median for his position and rating band
  function underperforming(w, p) {
    const s = lastStat(p, w.season), P = peers(w).by[p.pos];
    if (!s || !P) return null;
    const m = metric(p.pos, s), band = P.filter((x) => Math.abs(x[0] - p.ovr) <= 4).map((x) => x[1]).sort((a, b) => a - b);
    if (band.length < 8) return null;
    const med = band[band.length >> 1];
    if (med < 4) return null;
    return m < 0.5 * med ? { m, med } : null;
  }
  const roll = (w, p, buyer) => $crc32($utf8(w.seed + "|" + w.season + "|" + p.name + "|" + buyer)) / 4294967296;

  // Called for every candidate in poach / xleague_market. Returns false to skip the player.
  function allow(w, p, buyer, kind) {
    if (globalThis.__NO_RULES) return true;           // test switch: the old behaviour
    why = null;
    const seller = p.club;
    const R = $mods.rivals.intensity(w, seller, buyer);
    const E = eliteSet(w, kind), top = E.has(seller) && E.has(buyer);
    const up = underperforming(w, p);
    const sensible = p.ovr >= 82 && up;
    if (R >= 0.7) return false;                                   // never sell to a derby or major rival
    if (R > 0.3 && !(sensible && roll(w, p, buyer) < 0.15)) return false;
    if (top) {
      if (!sensible || roll(w, p, buyer) >= 0.5) return false;
      why = "Out of form: " + (p.pos === "FWD" ? "scored and set up " : "contributed ") + (up.m).toFixed(1) + " vs about " + up.med.toFixed(1) + " for similar players";
    } else if (R > 0) {
      why = "Rare move between rivals: out of form";
    } else {
      why = E.has(buyer) && !E.has(seller) ? "Steps up to a bigger club" : kind === "abroad" ? "Moves abroad for a bigger role" : "Moves for a better role and pay";
    }
    return true;
  }
  const take_why = () => { const x = why; why = null; return x; };
  return { allow, take_why, eliteSet, underperforming };
})();
