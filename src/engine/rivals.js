// Rivalries and head-to-head records. Plain JS (not generated). Heat only changes at season end, so a season's
// results never depend on the order games are played in.
$mods["rivals"] = (function () {
  const KN = {};                                  // known rivalries: pair key -> {a,b,name,level}
  let loaded = false;
  const NAT_BUILD = 12, NAT_DEMOTE = 5, NAT_KINDS = new Set(["qual", "ic", "wc", "ct", "nl"]);      // national rivalries heat up on a smaller scale: nations meet far less often
  const key = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  const gv = (x, k) => (x instanceof $Dict ? x.get_(k) : x[k]);
  function load() {
    if (loaded) return;
    loaded = true;
    for (const r of JSON.parse($mods.shim.DATA.rivalries)) KN[key(r.a, r.b)] = r;
    for (const r of JSON.parse($mods.shim.DATA.rivalries_nat || "[]")) KN[key(r.a, r.b)] = r;
  }
  function st(w) {
    if (!w.rv) w.rv = { v: 1, pairs: {}, used: {}, done: 0 };
    return w.rv;
  }
  function rec(rv, a, b) {
    const k = key(a, b);
    let r = rv.pairs[k];
    if (!r) {
      const lo = a < b ? a : b, hi = a < b ? b : a;
      r = rv.pairs[k] = { a: lo, b: hi, r: [0, 0, 0, 0, 0, 0], bigA: null, bigB: null, last: [], heat: 0, built: false, name: null, custom: null,
        since: null, story: [], ko: [0, 0], fin: 0, tr: 0, tf: 0, hum: 0, near: false };
    }
    return r;
  }

  // ---- how strong is the rivalry between two clubs (0 = none, 1 = historic derby) ----
  function intensity(w, a, b) {
    load();
    const k = key(a, b), kn = KN[k], r = w.rv && w.rv.pairs[k];
    let v = 0;
    if (kn) v = kn.level === 3 ? 1.0 : kn.level === 2 ? 0.7 : 0.4;
    if (r) {
      if (r.built) v = Math.max(v, r.nat ? Math.min(1, 0.35 + (r.heat - NAT_BUILD) / 20) : Math.min(1, 0.35 + (r.heat - 20) / 40));
      else if (kn) v = Math.min(1.2, v + Math.min(0.2, r.heat / 100));
    }
    return v;
  }
  const effect = (w, a, b, stakes) => { if (globalThis.__NO_RULES) return 0; const i = intensity(w, a, b); return i ? i * stakes : 0; };

  // ---- places: clubs in the same league within 60 km are neighbours ----
  let near = null;
  function nearPairs(w) {
    if (near) return near;
    near = {};
    const GEO = $mods.app_v11.GEO, rad = Math.PI / 180;
    const dist = (p, q) => { const dl = (q[0] - p[0]) * rad, dn = (q[1] - p[1]) * rad, x = Math.sin(dl / 2) ** 2 + Math.cos(p[0] * rad) * Math.cos(q[0] * rad) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
    for (const [ln, L] of w.leagues.itemsArr()) {
      const cl = gv(L, "clubs");
      for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
        if (!GEO.has(cl[i]) || !GEO.has(cl[j])) continue;
        if (dist(GEO.get_(cl[i]), GEO.get_(cl[j])) <= 60) near[key(cl[i], cl[j])] = true;
      }
    }
    return near;
  }

  // ---- naming new rivalries ----
  const POOL = {
    title: ["The Title Feud", "The Crown Rivalry", "The Championship Duel", "The Silverware Standoff", "The Great Title Fight"],
    cup: ["The Knockout Feud", "The Cup Grudge", "The Tie That Never Ends", "The Elimination Rivalry", "The Giant Killers' Grudge"],
    final: ["The Final Showdown", "The Trophy Duel", "The Big Night Rivalry", "The Decider"],
    near: ["The Local Derby", "The Neighbours' Quarrel", "The Backyard Battle", "The Border Clash"],
    hum: ["The Grudge Match", "The Revenge Match", "The Scoreline Feud", "The Settling of Scores"],
    tf: ["The Transfer War", "The Betrayal Rivalry", "The Poaching Feud", "The Traitors' Tie"],
    any: ["The Rising Rivalry", "The New Feud", "The Fierce Contest", "The Heated Duel", "The Bad Blood Match"],
  };
  const POOL_N = {
    final: ["The Final Showdown", "The Trophy Duel", "The Big Night Rivalry", "The Decider"],
    cup: ["The Knockout Feud", "The Tournament Grudge", "The Tie That Never Ends", "The Elimination Rivalry"],
    hum: ["The Grudge Match", "The Revenge Match", "The Scoreline Feud", "The Settling of Scores"],
    any: ["The Rising Rivalry", "The New Feud", "The Fierce Contest", "The Heated Duel", "The Bad Blood Match"],
  };
  function genName(rv, r, season) {
    if (r.nat) {
      const cs = [["final", r.fin * 3], ["cup", r.ko[0] + r.ko[1]], ["hum", r.hum * 1.5]];
      cs.sort((x, y) => y[1] - x[1]);
      const pool = POOL_N[cs[0][1] > 0 ? cs[0][0] : "any"], h = $crc32($utf8(r.a + "|" + r.b + "|" + season));
      return pool[h % pool.length];
    }
    const causes = [["final", r.fin * 3], ["title", r.tr * 2], ["cup", r.ko[0] + r.ko[1]], ["near", r.near ? 2 : 0], ["hum", r.hum * 1.5], ["tf", r.tf * 1.5]];
    causes.sort((x, y) => y[1] - x[1]);
    const cat = causes[0][1] > 0 ? causes[0][0] : "any";
    const pool = POOL[cat], h = $crc32($utf8(r.a + "|" + r.b + "|" + season));
    return pool[h % pool.length];                    // names may repeat across the world; the clubs identify the rivalry
  }
  function story(r, season, text) { r.story.push([season, text]); if (r.story.length > 8) r.story.shift(); }

  // ---- season end: record every club meeting, then heat up / cool down ----
  const RN = { 16: "Round of 16", 8: "Quarter-final", 4: "Semi-final", 2: "Final" };
  function update_season(w) {
    load();
    const rv = st(w), season = w.season;
    if (rv.done === season) return;
    rv.done = season;
    const delta = {};
    const add = (a, b, v) => { const k = key(a, b); delta[k] = (delta[k] || 0) + v; };
    const clubs = w.clubs;
    const sorted = w.comps.itemsArr().filter((x) => x[1].kind === "league" || x[1].kind === "cup" || x[1].kind === "cwc").sort((p, q) => (p[0] < q[0] ? -1 : 1));
    for (const [cid, c] of sorted) {
      if (c.kind === "league") {
        const tag = c.title || cid;
        const weeks = (c.results || []).concat(c.partial && c.partial.length ? [c.partial] : []);
        for (const wk of weeks) for (const m of wk) {
          if (!clubs.has(m[0]) || !clubs.has(m[1])) continue;
          const d = Math.abs(m[2] - m[3]);
          let h = 0.35 + (d <= 1 ? 0.15 : 0) + (d >= 4 ? 0.7 : 0);
          addMatch(rv, m[0], m[1], m[2], m[3], season, tag);
          add(m[0], m[1], h);
          if (d >= 4) { const r = rec(rv, m[0], m[1]); r.hum++; if (d >= 5) story(r, season, (m[2] > m[3] ? m[0] : m[1]) + " won " + Math.max(m[2], m[3]) + "-" + Math.min(m[2], m[3]) + " in the league"); }
        }
        // a two-horse title race
        const order = c.standings();
        if (order.length > 1 && weeks.length) {
          const p1 = c.st.get ? gv(c.st, order[0]) : c.st[order[0]], p2 = c.st.get ? gv(c.st, order[1]) : c.st[order[1]];
          const gap = gv(p1, "pts") - gv(p2, "pts");
          if (gap <= 6) {
            add(order[0], order[1], gap <= 2 ? 7 : 5);
            const r = rec(rv, order[0], order[1]); r.tr++;
            story(r, season, order[0] + " edged " + order[1] + " for the " + (c.title || "league") + " by " + gap + " pt" + (gap === 1 ? "" : "s"));
          }
        }
      } else {
        const mult = c.kind === "cwc" ? 1.2 : 1;
        for (const t of c.tlog) {
          const A = gv(t, "a"), B = gv(t, "b"), left = gv(t, "left"), legs = gv(t, "legs"), win = gv(t, "winner"), how = gv(t, "how") || "";
          if (!clubs.has(A) || !clubs.has(B)) continue;
          const tag = (c.title || cid) + " " + (RN[left] || "tie");
          for (const lg of legs) { addMatch(rv, A, B, lg[0], lg[1], season, tag); add(A, B, 0.5 * mult); }
          const base = left <= 2 ? 7 : left <= 4 ? 3.5 : left <= 8 ? 2.5 : 1.5;
          add(A, B, (base + (how ? 1.5 : 0)) * mult);
          const r = rec(rv, A, B);
          if (win === r.a) r.ko[0]++; else r.ko[1]++;
          if (left <= 2) { r.fin++; story(r, season, win + " beat " + (win === A ? B : A) + " in the " + (c.title || "cup") + " final" + (how ? " (" + how + ")" : "")); }
          else if (left <= 4) story(r, season, win + " knocked out " + (win === A ? B : A) + " in the " + (c.title || "cup") + " semi-final");
        }
      }
    }
    // national teams: every finished tournament or qualifying competition is read once, the season it finishes
    if (!rv.nd) rv.nd = {};
    const nsorted = w.comps.itemsArr().filter((x) => NAT_KINDS.has(x[1].kind) && x[1].ptr >= x[1].events.length && !rv.nd[x[0]]).sort((p, q) => (p[0] < q[0] ? -1 : 1));
    for (const [cid, c] of nsorted) {
      rv.nd[cid] = season;
      const tag = c.title || cid, big = c.kind === "wc" ? 1.5 : c.kind === "ct" ? 1.2 : 1;
      const meet = (A, B, ga, gb, label, h0) => {
        if (!w.nations.has(A) || !w.nations.has(B)) return;
        addMatch(rv, A, B, ga, gb, season, label);
        const r = rec(rv, A, B); r.nat = true;
        const d = Math.abs(ga - gb);
        add(A, B, (h0 + (d <= 1 ? 0.1 : 0) + (d >= 4 ? 0.8 : 0)) * big);
        if (d >= 4) { r.hum++; if (d >= 5) story(r, season, (ga > gb ? A : B) + " won " + Math.max(ga, gb) + "-" + Math.min(ga, gb) + " in the " + tag); }
      };
      for (const m of c.glog || []) meet(m[1], m[2], m[3], m[4], tag + " group", 0.15);
      for (const m of c.mlog || []) meet(m[0], m[1], m[2], m[3], m[4] || tag, 0.15);
      for (const t of c.tlog || []) {
        const A = gv(t, "a"), B = gv(t, "b"), left = gv(t, "left"), legs = gv(t, "legs"), win = gv(t, "winner"), how = gv(t, "how") || "";
        if (!w.nations.has(A) || !w.nations.has(B)) continue;
        const lab = tag + " " + (RN[left] || "tie");
        for (const lg of legs) meet(A, B, lg[0], lg[1], lab, 0.5);
        const base = left <= 2 ? 5 : left <= 4 ? 3 : left <= 8 ? 2 : 1.2;
        add(A, B, (base + (how ? 1.5 : 0)) * big);
        const r = rec(rv, A, B); r.nat = true;
        if (win === r.a) r.ko[0]++; else r.ko[1]++;
        if (left <= 2) { r.fin++; story(r, season, win + " beat " + (win === A ? B : A) + " in the " + tag + " final" + (how ? " (" + how + ")" : "")); }
        else if (left <= 4) story(r, season, win + " knocked out " + (win === A ? B : A) + " in the " + tag + " semi-final");
      }
    }
    // neighbours in the same league feel each other every year
    for (const k of Object.keys(nearPairs(w))) { if (rv.pairs[k] || delta[k]) { add(...k.split("|"), 0.8); rec(rv, ...k.split("|")).near = true; } }
    // decay, add the season, then promote or cool
    for (const k of Object.keys(delta)) { const q = rec(rv, ...k.split("|")); if (KN[k] && KN[k].nat) q.nat = true; }
    for (const k of Object.keys(rv.pairs)) {
      const r = rv.pairs[k];
      const N = !!(r.nat || (KN[k] && KN[k].nat)), up = N ? NAT_BUILD : 20, down = N ? NAT_DEMOTE : 10, hot = N ? 20 : 30;
      r.heat = Math.round((r.heat * (N ? 0.9 : 0.85) + (delta[k] || 0)) * 100) / 100;
      if (!r.built && r.heat >= up && !KN[k]) {
        r.built = true; r.since = season;
        if (!r.name) r.name = genName(rv, r, season);
        w.news("rivalry", "A new " + (N ? "international " : "") + "rivalry is born: " + r.a + " v " + r.b + " (" + r.name + ")");
      } else if (r.built && r.heat < down) { r.built = false; }
      else if (!r.built && KN[k] && r.heat >= hot && !r.flared) { r.flared = season; w.news("rivalry", "The " + KN[k].name + " is red hot: " + r.a + " v " + r.b); }
    }
  }
  function addMatch(rv, a, b, ga0, gb0, season, tag) {
    const r = rec(rv, a, b), flip = r.a !== a, ga = flip ? gb0 : ga0, gb = flip ? ga0 : gb0;
    r.r[5]++; r.r[3] += ga; r.r[4] += gb;
    if (ga > gb) r.r[0]++; else if (ga < gb) r.r[2]++; else r.r[1]++;
    const d = ga - gb;
    if (d > 0 && (!r.bigA || d > r.bigA[1] - r.bigA[2] || (d === r.bigA[1] - r.bigA[2] && ga > r.bigA[1]))) r.bigA = [season, ga, gb, tag];
    if (d < 0 && (!r.bigB || -d > r.bigB[1] - r.bigB[2] || (-d === r.bigB[1] - r.bigB[2] && gb > r.bigB[1]))) r.bigB = [season, gb, ga, tag];
    r.last.push([season, ga, gb, tag]);
    if (r.last.length > 6) r.last.shift();
  }

  // ---- views ----
  function label(w, a, b) {
    load();
    const k = key(a, b), kn = KN[k], r = w.rv && w.rv.pairs[k], i = intensity(w, a, b);
    if (!i) return null;
    const name = (r && r.custom) || (kn && kn.name) || (r && r.name) || "Rivalry";
    const kind = kn ? (kn.level === 3 ? (kn.nat ? "Historic rivalry" : "Historic derby") : kn.level === 2 ? "Major rivalry" : "Rivalry") : "Rising rivalry";
    return { name, kind, known: !!kn, level: kn ? kn.level : 0, intensity: Math.round(i * 100) / 100, heat: r ? Math.round(r.heat * 10) / 10 : 0, since: r ? r.since : null, named: !!(r && r.custom) };
  }
  function h2h(w, a, b) {
    const k = key(a, b), r = w.rv && w.rv.pairs[k];
    const flip = a > b;                                   // record is stored for the alphabetically first club
    const out = { meet: 0, wins: [0, 0], draws: 0, goals: [0, 0], big: [null, null], last: [], ko: [0, 0], finals: 0, titles_races: 0, story: [] };
    if (!r) return out;
    const f = (x) => (flip ? [x[0], x[2], x[1], x[3]] : x);
    out.meet = r.r[5]; out.draws = r.r[1];
    out.wins = flip ? [r.r[2], r.r[0]] : [r.r[0], r.r[2]];
    out.goals = flip ? [r.r[4], r.r[3]] : [r.r[3], r.r[4]];
    out.big = flip ? [r.bigB, r.bigA] : [r.bigA, r.bigB];
    out.last = r.last.map((x) => (flip ? [x[0], x[2], x[1], x[3]] : x)).reverse();
    out.ko = flip ? [r.ko[1], r.ko[0]] : r.ko; out.finals = r.fin; out.titles_races = r.tr; out.story = r.story.slice().reverse();
    return out;
  }
  function fail(msg, code) { throw $new($mods.app_v11.ApiError, [msg, code || 400]); }
  function needClub(w, n) { if (!w.clubs.has(n)) fail("unknown club", 404); }
  function needTeam(w, n) { if (!w.clubs.has(n) && !w.nations.has(n)) fail("unknown team", 404); }
  function poissonPmf(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  function odds(eh, ea, rvv, neutral) {
    if (rvv) { const m = (eh + ea) / 2, k = 1 - 0.3 * rvv; eh = m + (eh - m) * k; ea = m + (ea - m) * k; }
    const venue = neutral ? 1.0 : (rvv ? 1 + 0.12 * (1 - 0.4 * Math.min(1, rvv)) : 1.12);
    const hl = Math.max(0.2, Math.min(4.0, 1.35 * Math.pow((eh + 2) / (ea - 2), 1.3) * venue));
    const al = Math.max(0.2, Math.min(4.0, 1.35 * Math.pow((ea + 2) / (eh - 2), 1.3)));
    let h = 0, d = 0, a = 0;
    for (let i = 0; i <= 10; i++) { const pi = poissonPmf(hl, i); for (let j = 0; j <= 10; j++) { const p = pi * poissonPmf(al, j); if (i > j) h += p; else if (i === j) d += p; else a += p; } }
    const s = h + d + a;
    return { home: h / s, draw: d / s, away: a / s, exp: [hl, al] };
  }
  function form(c, name) {
    const out = [], weeks = (c.results || []).concat(c.partial && c.partial.length ? [c.partial] : []);
    for (let i = weeks.length - 1; i >= 0 && out.length < 5; i--) for (const m of weeks[i]) {
      if (m[0] === name) { out.push(m[2] > m[3] ? "W" : m[2] < m[3] ? "L" : "D"); break; }
      if (m[1] === name) { out.push(m[3] > m[2] ? "W" : m[3] < m[2] ? "L" : "D"); break; }
    }
    return out.join("");
  }
  // the pre-match page: home club h, away club a, optionally inside a league competition
  function matchup(w, h, a, cid) {
    if (w.nations.has(h) && !w.clubs.has(h)) {                // two national teams, no competition: the plain preview
      needTeam(w, h); needTeam(w, a);
      const eff = (n) => gv(w.nat_eff, n), side = (n) => ({ name: n, confed: gv(w.nations.get_(n), "confed"), ovr: Math.round(eff(n) * 10) / 10, eff: Math.round(eff(n) * 10) / 10 });
      const lab = label(w, h, a);
      return { nation: true, home: side(h), away: side(a), h2h: h2h(w, h, a), rivalry: lab, stakes: 1.0, comp: null, odds: odds(eff(h), eff(a), lab ? lab.intensity : 0, true) };
    }
    needClub(w, h); needClub(w, a);
    const C = (n) => w.clubs.get_(n), side = (n, c) => {
      const o = { name: n, league: C(n).get_("league"), ovr: C(n).get_("ovr"), eff: Math.round(C(n).get_("eff") * 10) / 10, stature: Math.round(C(n).get_("stature")) };
      if (c && c.kind === "league") { const order = c.standings(), s = gv(c.st, n); o.pos = order.indexOf(n) + 1; o.pts = gv(s, "pts"); o.p = gv(s, "p"); o.gf = gv(s, "gf"); o.ga = gv(s, "ga"); o.form = form(c, n); }
      return o;
    };
    const comp = cid && w.comps.has(cid) ? w.comps.get_(cid) : null;
    const lab = label(w, h, a), stakes = 1.0;
    const effH = comp && comp.eff ? gv(comp.eff, h) : C(h).get_("eff"), effA = comp && comp.eff ? gv(comp.eff, a) : C(a).get_("eff");
    return { home: side(h, comp), away: side(a, comp), h2h: h2h(w, h, a), rivalry: lab, stakes, comp: comp ? { id: cid, title: comp.title, kind: comp.kind } : null,
      odds: odds(effH, effA, lab ? lab.intensity * stakes : 0, false) };
  }
  function list(w, club) {
    load();
    const rv = w.rv ? w.rv.pairs : {}, rows = [];
    const keys = new Set(Object.keys(KN)); for (const k of Object.keys(rv)) if (rv[k].built || rv[k].heat >= 12) keys.add(k);
    for (const k of keys) {
      const [a, b] = k.split("|");
      const pool = club && w.nations.has(club) && !w.clubs.has(club) ? w.nations : w.clubs;
      if (!pool.has(a) || !pool.has(b)) continue;
      if (club && a !== club && b !== club) continue;
      const lab = label(w, a, b); if (!lab) continue;
      const hh = h2h(w, a, b);
      rows.push({ a, b, ...lab, meet: hh.meet, wins: hh.wins, draws: hh.draws, last: hh.last[0] || null });
    }
    rows.sort((x, y) => y.intensity - x.intensity || y.heat - x.heat || (x.a < y.a ? -1 : 1));
    return rows;
  }
  function rename(w, a, b, name) {
    load(); needTeam(w, a); needTeam(w, b);
    name = String(name || "").replace(/[<>]/g, "").trim().slice(0, 40);
    if (!name) fail("Give the rivalry a name.");
    const rv = st(w), r = rec(rv, a, b);
    r.custom = name; rv.used[name] = 1;
    return { ok: true, name };
  }
  // called by the transfer rules: a player moving straight between two clubs adds heat
  function transfer_heat(w, a, b, amt) { const r = rec(st(w), a, b); r.heat += amt; r.tf++; }

  // this matchweek's games: played ones with the score, the rest open to pick
  function fixtures(w, name) {
    const cid = "L:" + name;
    if (!w.comps.has(cid)) fail("unknown league", 404);
    const c = w.comps.get_(cid);
    if (c.ptr >= c.rounds.length) return { league: name, comp: cid, week: null, weeks: c.rounds.length, rows: [] };
    const order = c.standings(), played = new Map((c.partial || []).map((r) => [r[0] + "|" + r[1], r]));
    const rows = c.rounds[c.ptr].map(([h, a]) => {
      const r = played.get(h + "|" + a), lab = label(w, h, a);
      return { h, a, done: !!r, hg: r ? r[2] : null, ag: r ? r[3] : null, ho: w.clubs.get_(h).get_("ovr"), ao: w.clubs.get_(a).get_("ovr"),
        hpos: order.indexOf(h) + 1, apos: order.indexOf(a) + 1, rivalry: lab ? { name: lab.name, kind: lab.kind, intensity: lab.intensity } : null };
    });
    return { league: name, comp: cid, week: c.ptr + 1, weeks: c.rounds.length, rows, left: rows.filter((x) => !x.done).length };
  }

  // the Rivalries screen: one ranked list, narrowed by type (clubs / nations), scope, status and a search, ordered by the chosen sort
  function page(w, q) {
    load();
    const type = q.type === "nations" ? "nations" : "clubs", sort = ["meetings", "big"].includes(q.sort) ? q.sort : "heat";
    const status = ["real", "rising"].includes(q.status) ? q.status : "all", scope = q.scope || "world", text = String(q.q || "").toLowerCase().trim();
    const limit = Math.max(5, Math.min(400, +q.limit || 25)), offset = Math.max(0, +q.offset || 0);
    const rv = w.rv ? w.rv.pairs : {}, N = type === "nations", pool = N ? w.nations : w.clubs;
    const keys = new Set(Object.keys(KN).filter((k) => !!KN[k].nat === N));
    for (const k of Object.keys(rv)) if (!!rv[k].nat === N && (rv[k].built || rv[k].heat >= (N ? 6 : 12))) keys.add(k);
    const confOf = (n) => (N ? gv(w.nations.get_(n), "confed") : gv(w.leagues.get_(gv(w.clubs.get_(n), "league")), "confed"));
    const lgOf = (n) => (N ? null : gv(w.clubs.get_(n), "league"));
    const rows = [];
    for (const k of keys) {
      const [a, b] = k.split("|");
      if (!pool.has(a) || !pool.has(b)) continue;
      const lab = label(w, a, b); if (!lab) continue;
      if (status === "real" && !lab.known) continue;
      if (status === "rising" && lab.known) continue;
      if (scope !== "world") {
        if (scope.startsWith("L:")) { if (lgOf(a) !== scope.slice(2) && lgOf(b) !== scope.slice(2)) continue; }
        else if (confOf(a) !== scope && confOf(b) !== scope) continue;
      }
      if (text && !(a.toLowerCase().includes(text) || b.toLowerCase().includes(text) || lab.name.toLowerCase().includes(text))) continue;
      const hh = h2h(w, a, b), big = Math.max(hh.big[0] ? hh.big[0][1] - hh.big[0][2] : 0, hh.big[1] ? hh.big[1][1] - hh.big[1][2] : 0);
      rows.push({ a, b, ...lab, meet: hh.meet, wins: hh.wins, draws: hh.draws, goals: hh.goals, big, bigline: hh.big[0] && (!hh.big[1] || hh.big[0][1] - hh.big[0][2] >= hh.big[1][1] - hh.big[1][2]) ? [a, hh.big[0]] : hh.big[1] ? [b, hh.big[1]] : null, last: hh.last[0] || null });
    }
    rows.sort((x, y) => (sort === "meetings" ? y.meet - x.meet : sort === "big" ? y.big - x.big : 0) || y.intensity - x.intensity || y.heat - x.heat || (x.a < y.a ? -1 : x.a > y.a ? 1 : 0));
    const leagues = [...new Set(w.clubs.itemsArr().map(([n, c]) => gv(c, "league")))].sort();
    return { type, sort, status, scope, total: rows.length, offset, limit, rows: rows.slice(offset, offset + limit), confeds: ["UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"], leagues };
  }
  function api(w, path, q) {
    if (path === "/api/rivals_page") return page(w, q);
    if (path === "/api/fixtures") return fixtures(w, q.name);
    if (path === "/api/rivalries") return { rows: list(w, q.club || null) };
    if (path === "/api/matchup") {
      const cc = q.comp && w.comps.has(q.comp) ? w.comps.get_(q.comp) : null;
      if (cc && cc.kind !== "league") return $mods.tourney.matchup(w, q.comp, q.home, q.away);
      return matchup(w, q.home, q.away, q.comp || null);
    }
    if (path === "/api/rivalry_name") return rename(w, q.a, q.b, q.name);
    return null;
  }
  return { odds, poissonPmf, effect, intensity, update_season, label, h2h, matchup, list, rename, transfer_heat, api, key, known: () => { load(); return KN; } };
})();
