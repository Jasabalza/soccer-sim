// v16 Hall of Fame. Players and coaches are voted into four halls: a club's, a league's, a country's and the world's.
// A vote is a vote by people: points only set the odds. Eligible five years after retirement, up to ten years on a ballot,
// under 5% two years running and you come off, 75% to get in, and a limited number of places each year.
// Everything here is deterministic from the cards and a hash of (seed, season, scope): it never touches the simulation's own random stream,
// so a league's Hall of Fame day can be run lazily (when its season finishes) and the result is the same however it is reached.
// Plain JS (not generated).
$mods["hof"] = (function () {
  // ---- tuning (calibrated by tools/t_hof_calib.js) -------------------------------------------------------------
  const CFG = {
    wait: 5, window: 10, pass: 0.75, floor: 0.05,
    // per scope kind: gate = lowest score that gets on a ballot, mid = score with a 50% base vote, scale = how fast the vote rises
    W: { gate: 45, mid: 92, scale: 12, slots: 3 },
    C: { gate: 12, mid: 28, scale: 5, slots: 2 },
    L: { gate: 12, mid: 28, scale: 6, slots: 2 },
    K: { gate: 22, mid: 44, scale: 8, slots: 1 },
    cw: { gate: 60, mid: 92, scale: 12, slots: 3 },     // coaches: world
    cc: { gate: 14, mid: 34, scale: 9, slots: 1 },      // country (needs a spell coaching that nation)
    cl: { gate: 30, mid: 54, scale: 9, slots: 1 },
    ck: { gate: 24, mid: 38, scale: 6, slots: 1 },
    noise: 0.05, ramp: 0.012, chaser: 0.3, veto_nat: 5,
  };
  const HP = { "Ballon d'Or": 15, "Golden Boot": 5, "Team of the Year": 4, "Young Player of the Year": 2, "league": 2, "cup": 3, "world": 5, "contin": 3, "nl": 1.5, "compaward": 1.5 };
  // ---- hashing: a seeded stream that never touches w.rng -----------------------------------------------------------
  function h32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(s) { let a = (h32(s) + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const nrm = (s) => (rnd(s + "a") + rnd(s + "b") + rnd(s + "c") - 1.5) * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cget = (w, n, k, d) => { if (!w.clubs.has(n)) return d; const v = w.clubs.get_(n).get(k); return v === null || v === undefined ? d : v; };
  const leagueOf = (w, club) => cget(w, club, "league", null);
  const rd1 = (x) => Math.round(x * 10) / 10;
  // ---- the store -------------------------------------------------------------------------------------------------
  function ensure(w) {
    if (!w.hof) w.hof = { v: 1, next: 1, cards: {}, bal: {}, ran: {}, res: {}, fell: [], acad: {}, founded: false };
    return w.hof;
  }
  const scopeKind = (key) => key[0] === "W" ? "W" : key[0] === "C" ? "C" : key[0] === "L" ? "L" : "K";
  const scopeName = (key) => key.length > 2 ? key.slice(2) : null;
  const kindOf = (card, key) => (card.k === "c" ? "c" + scopeKind(key).toLowerCase() : scopeKind(key));
  // ---- player scoring ----------------------------------------------------------------------------------------------
  const quality = (ovr) => clamp((ovr - 72) / 3, -4, 8);                 // a poor late season is below zero: chasing can backfire
  function awardPts(title, kind) { return kind === "compaward" ? HP.compaward : (HP[title] || 1); }
  function pscores(w, p) {
    const sc2c = {}, per = {};
    for (const [s, c] of p.career) sc2c[s] = c;
    const slot = (c) => per[c] || (per[c] = { n: 0, q: 0, ti: 0, cu: 0, cwc: 0, aw: 0, g: 0, a: 0, cs: 0, lg: leagueOf(w, c) });
    for (const [s, c, ovr] of p.career) { if (!c || !w.clubs.has(c)) continue; const x = slot(c); x.n++; x.q += quality(ovr); }
    for (const r of (p.stats || [])) { const x = r[1] && per[r[1]]; if (x) { x.g += r[2]; x.a += r[3]; x.cs += (r[4] || 0); } }
    let wpts = 0, natHon = { world: 0, contin: 0, nl: 0 };
    for (const [s, kind, title] of p.honours) {
      const c = sc2c[s], x = c && per[c];
      if (kind === "award" || kind === "compaward") { const v = awardPts(title, kind); wpts += v; if (x) x.aw += v; }
      else if (kind === "league") { wpts += HP.league; if (x) x.ti++; }
      else if (kind === "cup") { wpts += HP.cup; if (x) { if (title === "Club World Cup") x.cwc++; else x.cu++; } }
      else if (kind === "world" || kind === "contin" || kind === "nl") { wpts += HP[kind]; natHon[kind]++; }
    }
    const nr = { seasons: 0, g: 0, a: 0 }, sn = new Set();
    for (const r of (p.cstats || [])) if (r[2] === p.nat && w.nations.has(r[2])) { sn.add(r[0]); nr.g += r[3]; nr.a += r[4]; }
    nr.seasons = sn.size;
    const out = { W: 0, C: 0, L: {}, K: {}, nat: Object.assign(nr, natHon), clubs: per };
    let totq = 0, ga = 0, seasons = 0;
    const clubsUsed = Object.keys(per);
    for (const c of clubsUsed) {
      const x = per[c]; totq += Math.max(0, x.q); ga += x.g + x.a; seasons += x.n;
      let sK = x.n * 1.2 + x.q + 7 * x.ti + 9 * x.cu + 12 * x.cwc + 0.9 * x.aw + 0.12 * (x.g + x.a) + 0.06 * x.cs;
      if (clubsUsed.length === 1 && x.n >= 8) sK *= 1.15;
      if (p.trn === c && x.n >= 6) sK += 4;
      out.K[c] = rd1(Math.max(0, sK));
      const lg = x.lg; if (lg) out.L[lg] = (out.L[lg] || 0) + x.n * 0.5 + 0.55 * x.q + 4 * x.ti + 4.5 * (x.cu + x.cwc) + 0.5 * x.aw + 0.07 * (x.g + x.a);
    }
    for (const k of Object.keys(out.L)) out.L[k] = rd1(Math.max(0, out.L[k]));
    out.W = rd1(wpts + Math.max(0, p.peak - 80) * 2.2 + 0.5 * totq + 0.04 * ga);
    out.C = rd1(0.45 * out.W + 2 * nr.seasons + 0.2 * (nr.g + nr.a) + 10 * natHon.world + 5 * natHon.contin + 2 * natHon.nl);
    out.seasons = seasons;
    return out;
  }
  // ---- coach scoring (from the Coach object itself, so a coach hired again keeps one record) ----------------------------
  function stintsOf(co) {
    if (co.stints && co.stints.length) return co.stints;
    // older saves only know the clubs a coach worked at: spread his record over them
    const cl = co.clubs || [], n = Math.max(1, cl.length), out = [];
    cl.forEach((c, i) => out.push({ k: "club", t: c, f: 0, u: 0, s: co.seasons / n, ti: co.titles / n, cu: co.cups / n, cwc: co.cwc / n, w: co.w / n, d: co.d / n, l: co.l / n, est: true }));
    return out;
  }
  function stintNums(w, co, st) {
    if (st.est) return st;
    const open = st.u === null || st.u === undefined;
    if (!open) return st;
    if (st.k === "nat") return Object.assign({}, st, { s: Math.max(0, w.season - st.f + 1), ti: 0, cu: 0, cwc: 0, w: 0, d: 0, l: 0 }, natTitles(w, st.t, st.f, w.season));
    return Object.assign({}, st, { s: co.seasons - st.s0, ti: co.titles - st.t0, cu: co.cups - st.c0, cwc: co.cwc - st.x0, w: co.w - st.w0, d: co.d - st.d0, l: co.l - st.l0 });
  }
  function stintScore(st) {
    const g = st.w + st.d + st.l, wp = g ? (st.w + 0.5 * st.d) / g : 0.5;
    return st.s * 1.2 + 9 * st.ti + 14 * st.cu + 12 * st.cwc + (wp - 0.5) * 30 * Math.min(1, st.s / 5);
  }
  function cscores(w, co) {
    const out = { W: 0, C: {}, L: {}, K: {}, nat: {} };
    let tot = 0, aw = 0;
    for (const h of (co.honours || [])) if (h[1] === "award") aw += (h[2] === "Coach of the Year" ? 8 : 3); else if (h[1] === "compaward") aw += 1.5;
    for (const raw of stintsOf(co)) {
      const st = stintNums(w, co, raw);
      if (st.k === "club") {
        const sc = stintScore(st); tot += sc;
        out.K[st.t] = (out.K[st.t] || 0) + sc + 0.6 * (st.s || 0);
        const lg = leagueOf(w, st.t); if (lg) out.L[lg] = (out.L[lg] || 0) + 0.8 * sc;
      } else if (st.k === "nat") {
        const sc = st.s * 2.5 + 25 * (st.wc || 0) + 12 * (st.ct || 0) + 5 * (st.nl || 0); tot += 0.7 * sc;
        out.C[st.t] = (out.C[st.t] || 0) + sc; out.nat[st.t] = st;
      }
    }
    out.W = rd1(tot + aw + (co.prestige || 0) * 0.15);
    for (const o of [out.C, out.L, out.K]) for (const k of Object.keys(o)) o[k] = rd1(o[k] + aw * 0.3);
    return out;
  }
  // ---- cards -------------------------------------------------------------------------------------------------------------
  function newState(first, key) { return { first, n: 0, low: 0, status: "ballot", pct: 0, yr: null, via: null }; }
  function gateOf(kind, s) { return s >= CFG[kind].gate; }
  // a card keeps its bulky parts (career rows, honours, scores) as one JSON string, which keeps saves small; PARSED caches the parse
  const PARSED = new WeakMap();
  function dataOf(card) {
    let d = PARSED.get(card);
    if (!d) { d = card.d ? JSON.parse(card.d) : { cr: [], hon: [], sc: { W: 0, C: 0, L: {}, K: {} }, nat_rec: null }; PARSED.set(card, d); }
    return d;
  }
  function listOn(H, key) { return H.bal[key] || (H.bal[key] = []); }
  function put(H, card, key, state) { card.st[key] = state; listOn(H, (card.k === "c" ? "c" : "") + key).push(card.id); }
  const cKey = (nat) => "C:" + nat;
  function makePlayerCard(w, p, ret, firstMin) {
    const H = ensure(w), sc = pscores(w, p), want = [];
    const first = Math.max(ret + CFG.wait, firstMin || 0);
    if (gateOf("W", sc.W)) want.push("W");
    if (gateOf("C", sc.C)) want.push(cKey(p.nat));
    for (const [lg, s] of Object.entries(sc.L)) if (gateOf("L", s)) want.push("L:" + lg);
    for (const [c, s] of Object.entries(sc.K)) if (gateOf("K", s)) want.push("K:" + c);
    if (!want.length) return null;
    const id = "p" + (H.next++);
    const card = { id, k: "p", uid: p.uid || null, name: p.name, nat: p.nat, pos: p.pos, peak: p.peak, ret, trn: p.trn || null, st: {}, vetoed: null, home: null,
      d: JSON.stringify({ cr: p.career.map((r) => [r[0], r[1], r[2]]), hon: p.honours.map((h) => [h[0], h[1], h[2]]), sc: { W: sc.W, C: sc.C, L: sc.L, K: sc.K }, nat_rec: sc.nat }) };
    card.home = bestHome(dataOf(card).sc.K);
    H.cards[id] = card;
    for (const key of want) put(H, card, key, newState(first));
    return card;
  }
  function bestHome(K) { let b = null, bs = -1; for (const [c, s] of Object.entries(K)) if (s > bs) { b = c; bs = s; } return b; }
  function makeCoachCard(w, co, ret, firstMin) {
    const H = ensure(w), sc = cscores(w, co), want = [];
    const first = Math.max(ret + CFG.wait, firstMin || 0);
    if (gateOf("cw", sc.W)) want.push("W");
    for (const [n, s] of Object.entries(sc.C)) if (gateOf("cc", s)) want.push("C:" + n);
    for (const [lg, s] of Object.entries(sc.L)) if (gateOf("cl", s)) want.push("L:" + lg);
    for (const [c, s] of Object.entries(sc.K)) if (gateOf("ck", s)) want.push("K:" + c);
    if (!want.length) return null;
    const id = "c" + (H.next++);
    const card = { id, k: "c", co, name: co.name, nat: co.nat, ret, st: {}, vetoed: null };
    H.cards[id] = card;
    for (const key of want) put(H, card, key, newState(first));
    return card;
  }
  // ---- retirement hooks (called from sim_core) ----------------------------------------------------------------------------
  function onRetire(w, p) { const H = ensure(w); try { return makePlayerCard(w, p, w.season, 0); } catch (e) { return null; } }
  function onCoachRetire(w, co) { const H = ensure(w); co.ret_s = w.season; closeStint(w, co); co.card = null; try { return makeCoachCard(w, co, w.season, 0); } catch (e) { return null; } }
  // coaches keep a list of stints: one per spell at a club or with a nation
  function openStint(w, co, kind, team) {
    const f0 = kind === "nat" ? w.season : w.season + 1;
    if (!co.stints) {
      co.stints = [];
      const prior = kind === "club" ? (co.clubs || []).slice(0, -1) : (co.clubs || []), n = Math.max(1, prior.length);
      if (co.seasons > 0) for (const c of prior) co.stints.push({ k: "club", t: c, f: 0, u: 0, s: co.seasons / n, ti: co.titles / n, cu: co.cups / n, cwc: co.cwc / n, w: co.w / n, d: co.d / n, l: co.l / n, est: true });
    }
    co.stints.push({ k: kind, t: team, f: f0, u: null, s0: co.seasons, t0: co.titles, c0: co.cups, x0: co.cwc, w0: co.w, d0: co.d, l0: co.l, wc0: 0 });
  }
  function closeStint(w, co, kind) {
    const L = co.stints; if (!L || !L.length) return;
    const st = L[L.length - 1]; if (st.u !== null && st.u !== undefined) return;
    if (kind && st.k !== kind) return;
    const n = stintNums(w, co, st); Object.assign(st, { s: n.s, ti: n.ti, cu: n.cu, cwc: n.cwc, w: n.w, d: n.d, l: n.l, u: Math.max(st.f, st.k === "nat" ? w.season - 1 : w.season) });
    if (st.k === "nat") { const t = natTitles(w, st.t, st.f, st.u); st.wc = t.wc; st.ct = t.ct; st.nl = t.nl; }
  }
  function natTitles(w, nation, f, u) {
    let wc = 0, ct = 0, nl = 0;
    for (const r of w.hist) { const s = r.get_("season"); if (s < f || s > u) continue; const a = r.get("wc"); if (a && a[0] === nation) wc++; const c = r.get("ct"); if (c) for (const v of c.valuesArr()) if (v[0] === nation) ct++; const n = r.get("nl"); if (n) for (const v of n.valuesArr()) if (v[0] === nation) nl++; }
    return { wc, ct, nl };
  }
  function coachHired(w, co, club) { closeStint(w, co); openStint(w, co, "club", club); }
  function coachLeft(w, co) { closeStint(w, co, "club"); }
  function natCoachSet(w, co, nation) { closeStint(w, co, "nat"); if (nation) openStint(w, co, "nat", nation); }
  // ---- chasers: a borderline player with the trait plays on, hoping the late seasons tip the vote -------------------------
  const isChaser = (p) => rnd("chase|" + p.name + "|" + p.nat + "|" + (p.career.length ? p.career[0][0] : 0)) < CFG.chaser;
  function borderline(w, p) {
    const sc = pscores(w, p), t = (kind, s) => s < CFG[kind].mid + 1.1 * CFG[kind].scale && s >= CFG[kind].mid - 0.9 * CFG[kind].scale;
    if (t("W", sc.W) || t("C", sc.C)) return true;
    for (const s of Object.values(sc.L)) if (t("L", s)) return true;
    for (const s of Object.values(sc.K)) if (t("K", s)) return true;
    return false;
  }
  function stretch(w, p) {
    if (p.age < 33 || p.age > 41 || p.career.length < 8 || !isChaser(p)) return false;
    if (rnd("str|" + p.name + "|" + p.nat + "|" + p.age) > 0.75) return false;
    return borderline(w, p);
  }
  // ---- voting ----------------------------------------------------------------------------------------------------------------
  const scoreOf = (w, card, key) => {
    if (card.k === "p") { const s = dataOf(card).sc; return key === "W" ? s.W : key[0] === "C" ? s.C : key[0] === "L" ? (s.L[scopeName(key)] || 0) : (s.K[scopeName(key)] || 0); }
    const s = SC.get(card) || (SC.set(card, cscores(w, card.co)), SC.get(card)); return key === "W" ? s.W : key[0] === "C" ? (s.C[scopeName(key)] || 0) : key[0] === "L" ? (s.L[scopeName(key)] || 0) : (s.K[scopeName(key)] || 0);
  };
  const SC = new WeakMap();
  const working = (card) => card.k === "c" && (card.co.club != null || card.co.intl != null);
  function pctFor(w, card, key, Y) {
    const kind = kindOf(card, key), C = CFG[kind], st = card.st[key], n = st.n;
    const s = scoreOf(w, card, key);
    const base = 1 / (1 + Math.exp(-(s - C.mid) / C.scale));
    return clamp(base + nrm(w.seed + "|" + Y + "|" + key + "|" + card.id) * CFG.noise + CFG.ramp * (n - 1), 0, 0.99);
  }
  const entry = (card, key, st, extra) => Object.assign({ id: card.id, name: card.name, nat: card.nat, pos: card.pos || null, k: card.k, pct: Math.round(st.pct * 1000) / 1000, n: st.n, left: Math.max(0, CFG.window - st.n), ret: card.ret }, extra || {});
  // one vote for one scope in one year. kindK is "p" (players) or "c" (coaches). Returns {ind, bal, off}
  function runScope(w, key, Y, kindK, slotsOverride) {
    const H = ensure(w), res = { ind: [], bal: [], off: [] }, lk = (kindK === "c" ? "c" : "") + key, ids = H.bal[lk] || [];
    const cands = [], waiting = [];
    for (const id of ids) {
      const card = H.cards[id]; if (!card) continue;
      const st = card.st[key];
      if (!st || st.status !== "ballot") continue;
      if (st.first > Y || working(card)) { waiting.push(id); continue; }
      cands.push(card);
    }
    cands.sort((a, b) => (a.id < b.id ? -1 : 1));
    const kind = kindK === "c" ? "c" + scopeKind(key).toLowerCase() : scopeKind(key), C = CFG[kind], slots = slotsOverride || C.slots;
    for (const card of cands) { const st = card.st[key]; st.n += 1; st.pct = pctFor(w, card, key, Y); SC.delete(card); }
    const eligible = cands.filter((c) => c.st[key].pct >= CFG.pass).sort((a, b) => b.st[key].pct - a.st[key].pct || (a.id < b.id ? -1 : 1));
    const chosen = new Set(eligible.slice(0, slots).map((c) => c.id)), keep = waiting.slice();
    for (const card of cands) {
      const st = card.st[key];
      if (chosen.has(card.id)) { st.status = "in"; st.yr = Y; res.ind.push(entry(card, key, st)); continue; }
      st.low = st.pct < CFG.floor ? st.low + 1 : 0;
      const why = st.low >= 2 ? "support" : st.n >= CFG.window ? "time" : null;
      if (why) { st.status = "off"; res.off.push(entry(card, key, st, { why })); }
      else { res.bal.push(entry(card, key, st, { waiting: st.pct >= CFG.pass })); keep.push(card.id); }
    }
    if (keep.length) H.bal[lk] = keep; else delete H.bal[lk];
    res.bal.sort((a, b) => b.pct - a.pct);
    return res;
  }
  const rkey = (key, Y) => key + "|" + Y;
  function store(w, key, Y, res) {
    const H = ensure(w);
    if (res.ind.length || res.bal.length || res.off.length) H.res[rkey(key, Y)] = res;
  }
  function news(w, text) { w.news("hof", text); }
  // a league's Hall of Fame day: the league board votes on the league's hall, each club's directors on theirs
  function runLeagueDay(w, ln, Y) {
    const H = ensure(w), g = "LD|" + ln + "|" + Y;
    if (H.ran[g]) return false;
    H.ran[g] = true;
    for (const kk of ["p", "c"]) {
      const r = runScope(w, "L:" + ln, Y, kk); store(w, (kk === "c" ? "c" : "") + "L:" + ln, Y, r);
      for (const e of r.ind) news(w, e.name + " is inducted into the " + ln + " Hall of Fame");
    }
    for (const club of w.leagues.get_(ln).get_("clubs")) {
      for (const kk of ["p", "c"]) {
        if (!H.bal[(kk === "c" ? "c" : "") + "K:" + club]) continue;
        const r = runScope(w, "K:" + club, Y, kk); store(w, (kk === "c" ? "c" : "") + "K:" + club, Y, r);
        for (const e of r.ind) news(w, e.name + " enters the " + club + " Hall of Fame");
      }
    }
    return true;
  }
  const natRecordPoor = (card) => { const r = dataOf(card).nat_rec || { seasons: 0, g: 0, a: 0, world: 0, contin: 0, nl: 0 }; return r.seasons < CFG.veto_nat && !(r.world || r.contin); };
  function vetoText(card) { const r = dataOf(card).nat_rec; return card.nat + " did not honour " + card.name + ". Federation veto: " + r.seasons + " national-team " + (r.seasons === 1 ? "season" : "seasons") + ", " + (r.g + r.a) + " goals and assists, no tournament honours."; }
  function setIn(H, card, key, Y, via) {
    const st = card.st[key], lk = (card.k === "c" ? "c" : "") + key;
    st.status = "in"; st.yr = Y; st.via = via || null; st.pct = st.pct || 1;
    if (H.bal[lk]) { H.bal[lk] = H.bal[lk].filter((x) => x !== card.id); if (!H.bal[lk].length) delete H.bal[lk]; }
  }
  // the end-of-year day: the world votes first, then each federation (it honours a world inductee unless his national record is poor)
  function runYearDay(w, Y) {
    const H = ensure(w), g = "YD|" + Y;
    if (H.ran[g]) return false;
    for (const ln of w.leagues.keysArr()) runLeagueDay(w, ln, Y);
    H.ran[g] = true;
    const vetoes = [];
    for (const kk of ["p", "c"]) {
      const r = runScope(w, "W", Y, kk); store(w, (kk === "c" ? "c" : "") + "W", Y, r);
      for (const e of r.ind) {
        const card = H.cards[e.id]; news(w, e.name + " is inducted into the World Hall of Fame");
        if (kk !== "p") continue;
        const key = cKey(card.nat), cs = card.st[key];
        if (cs && cs.status === "in") continue;
        if (natRecordPoor(card)) { card.vetoed = { yr: Y, text: vetoText(card) }; vetoes.push({ id: card.id, name: card.name, nat: card.nat, text: card.vetoed.text }); continue; }
        if (!cs) { card.st[key] = { first: Y, n: 0, low: 0, status: "in", pct: 1, yr: Y, via: "world" }; } else setIn(H, card, key, Y, "world");
      }
    }
    if (vetoes.length) H.res["VETO|" + Y] = vetoes;
    for (const lk of Object.keys(H.bal).filter((k) => /^c?C:/.test(k)).sort()) {
      const kk = lk[0] === "c" ? "c" : "p", key = kk === "c" ? lk.slice(1) : lk;
      const r = runScope(w, key, Y, kk); store(w, lk, Y, r);
      for (const e of r.ind) news(w, e.name + " is inducted into the " + scopeName(key) + " Hall of Fame" + (kk === "c" ? " as a coach" : ""));
    }
    prune(w, Y);
    trimRes(H, Y);
    return true;
  }
  // old ballots are dropped after three years and old drop-offs after ten: the inductees list is the lasting record
  function trimRes(H, Y) {
    for (const k of Object.keys(H.res)) {
      const v = H.res[k]; if (!v.bal) continue;
      const y = +k.slice(k.lastIndexOf("|") + 1);
      if (y < Y - 2 && v.bal.length) v.bal = [];
      if (y < Y - 10 && v.off.length) v.off = [];
      if (!v.ind.length && !v.bal.length && !v.off.length) delete H.res[k];
    }
  }
  function prune(w, Y) {
    const H = ensure(w);
    for (const id of Object.keys(H.cards)) {
      const c = H.cards[id], keys = Object.keys(c.st);
      if (keys.some((k) => c.st[k].status !== "off")) continue;
      if (c.k === "p" && (c.st.W || c.st[cKey(c.nat)])) { const d = dataOf(c); H.fell.push({ id: c.id, name: c.name, nat: c.nat, pos: c.pos, peak: c.peak, ret: c.ret, y: Y, W: d.sc.W, C: d.sc.C }); if (H.fell.length > 300) H.fell.shift(); }
      delete H.cards[id];
    }
  }
  // ---- the rollover hook and migration -----------------------------------------------------------------------------------------
  function rollover(w, Y) { ensure(w); foundOnce(w); return runYearDay(w, Y); }
  // a save from before v16 has no cards: the retired stars and retired coaches become a founding class, voted on from now
  function foundOnce(w) {
    const H = ensure(w);
    if (H.founded) return false;
    H.founded = true;
    for (const p of w.retired_players) {
      const ret = p.career.length ? p.career[p.career.length - 1][0] : w.season - 1;
      try { makePlayerCard(w, p, ret, w.season); } catch (e) { /* skip */ }
    }
    for (const co of (w.retired_all || [])) {
      if (co.seasons < 6 || co.club != null || co.intl != null) continue;
      if (co.ret_s === undefined) co.ret_s = w.season - 1;
      try { makeCoachCard(w, co, co.ret_s, w.season); } catch (e) { /* skip */ }
    }
    return true;
  }
  // a fresh World starts founded: nothing to found
  function init(w) { const H = ensure(w); H.founded = true; return H; }
  return { CFG, HP, ensure, init, pscores, cscores, makePlayerCard, makeCoachCard, onRetire, onCoachRetire, coachHired, coachLeft, natCoachSet, closeStint, openStint,
    stretch, isChaser, borderline, runScope, dataOf, cKey, runLeagueDay, runYearDay, rollover, foundOnce, prune, scoreOf, pctFor, rnd, nrm, leagueOf, stintsOf, stintNums, rkey, scopeName, scopeKind, quality, natRecordPoor };
})();
