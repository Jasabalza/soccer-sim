// v16 Off-season moves: one compact log of everything that changes hands between two seasons (transfers, free agents signed,
// coaches hired / fired / retired, academy managers promoted, national coaches, player retirements) so the Off-season page can show,
// sort and walk through them. Nothing here changes the simulation: the hooks only write down what already happened.
// While a rollover runs, events sit in a module variable (never saved); at the end of it they are cut down and stored as ONE JSON string per season in w.mv.s.
// Plain JS (not generated).
$mods["moves"] = (function () {
  const KEEP = 10;                                           // seasons of detail kept
  const CAP = { t: 320, f: 160, p: 160, c: 200 };
  let CUR = null;                                            // { w, buf, rel: Map(player -> club it was released by) }
  const ensure = (w) => w.mv || (w.mv = { v: 1, s: {} });
  const att = (w, n) => { try { return n && w.clubs.has(n) ? Math.round(w.attr(n) * 10) / 10 : null; } catch (e) { return null; } };
  const on = (w) => CUR && CUR.w === w;
  const lg = (w, n) => { try { return w.clubs.get_(n).get_("league"); } catch (e) { return null; } };
  const r1 = (x) => Math.round(x * 10) / 10;
  const base = (w, p) => ({ n: p.name, u: 0, nat: p.nat, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, p: p });

  function begin(w) { ensure(w); try { w.ensure_uids(); } catch (e) { } CUR = { w, buf: [], rel: new Map() }; }
  function transfer(w, p, seller, buyer, fee, kind, rival) {
    if (!on(w)) return;
    const a0 = att(w, seller), a1 = att(w, buyer);
    CUR.buf.push(Object.assign(base(w, p), { k: "t", f: seller, t: buyer, fl: lg(w, seller), tl: lg(w, buyer), fee: r1(fee), kd: kind, a: a0 == null || a1 == null ? null : r1(a1 - a0), rv: rival ? 1 : 0, wg: r1(p.wage || 0) }));
  }
  function released(w, p, club) { if (on(w) && club) CUR.rel.set(p, club); }
  function signed(w, p, club, wage, first) {
    if (!on(w)) return;
    const from = CUR.rel.get(p) || null, a0 = from ? att(w, from) : null, a1 = att(w, club);
    CUR.rel.delete(p);
    CUR.buf.push(Object.assign(base(w, p), { k: "f", f: from, t: club, fl: from ? lg(w, from) : null, tl: lg(w, club), wg: r1(wage || 0), a: a0 == null || a1 == null ? null : r1(a1 - a0), first: first ? 1 : 0 }));
  }
  function retired(w, p, card) {
    if (!on(w)) return;
    let pr = 0; try { const sc = $mods.hof.pscores(w, p); pr = Math.round(sc.W); } catch (e) { }
    CUR.buf.push(Object.assign(base(w, p), { k: "p", pk: p.peak, c: p.club || null, cl: p.club ? lg(w, p.club) : null, pr, hid: card ? card.id : null, ss: (p.career || []).length, tn: (p.honours || []).length }));
  }
  const cbase = (co) => ({ n: co.name, nat: co.nat, age: co.age, pr: r1(co.prestige), ss: co.seasons, ti: co.titles, cu: co.cups, cwc: co.cwc });
  function coachOut(w, co, club, reason) {
    if (!on(w)) return;
    CUR.buf.push(Object.assign(cbase(co), { k: reason === "fired" ? "x" : "q", f: club, fl: lg(w, club) }));
  }
  function coachRetired(w, co, card) {
    if (!on(w)) return;
    const club = co.last_club || null;
    CUR.buf.push(Object.assign(cbase(co), { k: "cr", f: club, fl: club ? lg(w, club) : null, hid: card ? card.id : null }));
  }
  function coachIn(w, co, club) {
    if (!on(w)) { co.acad_from = null; return; }
    const prevA = co.prev_attr || 0, a1 = att(w, club);
    const acadFrom = co.acad_from || null; co.acad_from = null;
    const src = acadFrom ? "acad" : (co.seasons === 0 && !co.last_club && !(co.clubs && co.clubs.length > 1)) ? "new" : co.last_club ? "club" : "pool";
    CUR.buf.push(Object.assign(cbase(co), { k: "h", t: club, tl: lg(w, club), f: acadFrom || co.last_club || null, src, a: prevA > 0 && a1 != null && src !== "acad" ? r1(a1 - prevA) : null, ua: co.unemployed_years || 0 }));
  }
  function natCycle(w, before, after) {
    if (!on(w)) return;
    for (const nm of Object.keys(after)) {
      const nc = after[nm], oc = before[nm] || null;
      if (nc === oc) continue;
      CUR.buf.push(Object.assign(cbase(nc), { k: "n", t: nm, prev: oc ? oc.name : null, prevPr: oc ? r1(oc.prestige) : null, home: nc.nat === nm ? 1 : 0, src: nc.seasons === 0 && !(nc.clubs && nc.clubs.length) ? "new" : "pool" }));
    }
  }
  // end of the rollover: drop what is not interesting, store the rest as one string
  function finish(w, season) {
    if (!on(w)) return;
    const M = ensure(w), buf = CUR.buf, rel = CUR.rel; CUR = null;
    try { w.ensure_uids(); } catch (e) { }
    const fa = new Set(buf.filter((e) => e.k === "f").map((e) => e.p));
    for (const [p, club] of rel) if (!fa.has(p) && p.club == null && p.ovr >= 66) buf.push(Object.assign(base(w, p), { k: "r", f: club, fl: lg(w, club), wg: r1(p.wage || 0), a: null }));
    for (const e of buf) { if (e.p) { e.u = e.p.uid || 0; delete e.p; } }
    const out = [];
    const keep = (kinds, cap, score) => { const L = buf.filter((e) => kinds.includes(e.k)).sort((a, b) => score(b) - score(a)); for (const e of L.slice(0, cap)) out.push(e); return L.length; };
    const cnt = {};
    cnt.t = keep(["t"], CAP.t, (e) => e.fee + e.ovr);
    cnt.f = keep(["f", "r"], CAP.f, (e) => e.ovr * 2 + e.pot * (e.age <= 21 ? 1 : 0.3));
    cnt.p = keep(["p"], CAP.p, (e) => e.pr + e.pk * 3);
    cnt.c = keep(["h", "x", "q", "cr", "n"], CAP.c, (e) => e.pr);
    cnt.h = buf.filter((e) => e.k === "h").length; cnt.x = buf.filter((e) => e.k === "x").length; cnt.q = buf.filter((e) => e.k === "q").length; cnt.cr = buf.filter((e) => e.k === "cr").length; cnt.n = buf.filter((e) => e.k === "n").length;
    cnt.fa = buf.filter((e) => e.k === "f" && !e.first).length; cnt.first = buf.filter((e) => e.k === "f" && e.first).length; cnt.rel = buf.filter((e) => e.k === "r").length; cnt.ac = buf.filter((e) => e.k === "h" && e.src === "acad").length;
    M.s[season] = JSON.stringify({ ev: out, cnt });
    for (const k of Object.keys(M.s)) if (+k <= season - KEEP) delete M.s[k];
  }
  const PARSED = new WeakMap();
  function dataOf(w, season) {
    const M = ensure(w), s = M.s[season]; if (!s) return null;
    const hit = PARSED.get(M); if (hit && hit.s === s && hit.season === season) return hit.d;
    const d = JSON.parse(s); PARSED.set(M, { s, season, d }); return d;
  }
  return { ensure, begin, transfer, released, signed, retired, coachOut, coachRetired, coachIn, natCycle, finish, dataOf, KEEP };
})();
