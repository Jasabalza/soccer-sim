"use strict";
// v16 Hall of Fame pages: the Hall of Fame tab (World / Country / League / Club, players and coaches), a person's Hall of Fame page,
// the world induction day (final-year watch, the vote, who fell off), and a league's Hall of Fame day with its results.
// Loaded before app.js; the helpers it uses (api, esc, enc, flag, crest, emblem, clubLink, ...) are only touched when a page is drawn.

const HOF = { kind: "p", tab: "ind" };
const HOF_CLR = { W: "#f5c542", C: "#b48cff", L: "#4aa8ff", K: "#8fa8b8" };
const HOF_LBL = { W: "World", C: "Country", L: "League", K: "Club" };
const hueOf = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 360; };
const hofStar = (px) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2.5 14.9,8.9 21.8,9.6 16.6,14.2 18.1,21 12,17.5 5.9,21 7.4,14.2 2.2,9.6 9.1,8.9" fill="#f5c542"/></svg>`;
// one badge per row: the highest tier reached, drawn with the emblem of that scope (star, flag, league cup, club crest)
function hofBadge(b, size) {
  if (!b) return "";
  size = size || 24;
  let inner;
  if (b.tier === "W") inner = hofStar(size - 10);
  else if (b.tier === "C" && b.scope) inner = flag(b.scope, size - 10);
  else if (b.tier === "L" && b.scope) inner = emblem({ kind: "league_cup", color: `hsl(${hueOf(b.scope)} 62% 58%)` }, size - 8);
  else if (b.tier === "K" && b.scope) inner = crest(b.scope, size - 10);
  else inner = `<i class="hb-s ${b.tier}"></i>`;
  const tip = HOF_LBL[b.tier] + " Hall of Fame" + (b.scope ? ": " + b.scope : "");
  return `<span class="hb ${b.tier}" style="width:${size}px;height:${size}px;--hc:${HOF_CLR[b.tier]}" title="${esc(tip)}">${inner}</span>`;
}
const hofPct = (x) => Math.round(x * 100) + "%";
const hofYrs = (r) => (r.years ? `S${r.years[0]}-S${r.years[1]}` : "");
function hofSub(r) {
  const bits = [r.k === "c" ? "Coach" : (r.pos ? `<span class="pos-${esc(r.pos)}">${esc(r.pos)}</span>` : ""), r.nat ? esc(r.nat) : "", hofYrs(r), r.n ? "year " + r.n + (r.left !== undefined ? " of 10" : "") : ""].filter(Boolean);
  return bits.join(" &middot; ");
}
const hofLink = (r, txt) => `<a href="#/hofcard/${esc(r.id)}">${esc(txt || r.name)}</a>`;
// a two-line row: name and badge on top, a short line below
function hofRow(r, o) {
  o = o || {};
  const right = o.right != null ? `<span class="hr-r">${o.right}</span>` : "";
  const tag = o.tag ? `<span class="tag ${o.tagc || ""}">${o.tag}</span>` : "";
  const bar = o.bar != null ? `<div class="hbar"><i class="${o.gold ? "g" : ""}" style="width:${Math.round(o.bar * 100)}%"></i><u style="left:75%"></u></div>` : "";
  return `<div class="hr"><div class="hr-a">${r.nat ? flag(r.nat, 18) : ""}<div class="hr-m"><b>${r.still === false ? esc(r.name) : hofLink(r)}</b><span class="dim small">${o.sub != null ? o.sub : hofSub(r)}</span></div>${tag}${right}${hofBadge(r.badge, 22)}</div>${bar}</div>`;
}
const hofSeg = (attr, list, cur) => `<div class="seg" role="group">${list.map(([k, t]) => `<button ${attr}="${esc(k)}" class="${k === cur ? "on" : ""}">${t}</button>`).join("")}</div>`;

// ---------------------------------------------------------------- the Hall of Fame tab
async function viewHof(tier, name) {
  tier = ["W", "C", "L", "K"].includes(tier) ? tier : "W";
  const d = await api("/api/hof?tier=" + tier + "&kind=" + HOF.kind + (name ? "&name=" + enc(name) : ""));
  const opts = d.options;
  const favLeagues = (FAVS || []).filter((k) => k.startsWith("L:")).map((k) => k.slice(2));
  if (tier !== "W" && !name) {
    const first = tier === "L" ? (favLeagues[0] || opts.leagues[0]) : tier === "C" ? (opts.nations[0] || "") : (opts.clubs[0] || "");
    if (first) { location.replace("#/hof/" + tier + "/" + enc(first)); return; }
  }
  const scopes = tier === "L" ? opts.leagues : tier === "C" ? opts.nations : tier === "K" ? opts.clubs : [];
  const scopeSel = tier === "W" ? "" : `<select id="hof-scope" aria-label="${HOF_LBL[tier]}">${tier === "L" && favLeagues.length ? `<optgroup label="Favourites">${favLeagues.map((n) => `<option value="${esc(n)}" ${n === name ? "selected" : ""}>${esc(n)}</option>`).join("")}</optgroup><optgroup label="All leagues">` : ""}${scopes.map((n) => `<option value="${esc(n)}" ${n === name ? "selected" : ""}>${esc(n)}</option>`).join("")}${tier === "L" && favLeagues.length ? "</optgroup>" : ""}</select>`;
  const tabs = [["ind", "Inductees"], ["bal", "Ballot"], ["watch", "Watch"], ["snub", "Snubs"], ["rec", "Records"]];
  const tab = HOF.tab;
  let body = "";
  const people = HOF.kind === "c" ? "coaches" : "players";
  if (tab === "ind") {
    body = d.classes.length ? d.classes.map((c, i) => `<details class="hcls" ${i < 1 ? "open" : ""}><summary><b>Class of ${esc(c.label)}</b><span class="dim small">${c.rows.length} inducted</span></summary>${c.rows.map((r) => hofRow(r, { right: r.n === 1 ? "first ballot" : "year " + r.n, sub: hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</details>`).join("")
      : `<div class="card dim small">No ${people} in this hall yet. People become eligible ${d.cfg.wait} years after they retire.</div>`;
  } else if (tab === "bal") {
    body = d.ballot.length ? `<div class="dim small" style="margin:0 2px 8px">${esc(d.ballot_label)} vote &middot; ${Math.round(d.cfg.pass * 100)}% to get in &middot; up to ${d.cfg.window} years on the ballot</div><div class="hlist">${d.ballot.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left <= 1 ? (r.left === 0 ? "last year" : "1 year left") : "", tagc: "red" })).join("")}</div>`
      : `<div class="card dim small">Nobody is on this ballot right now.</div>`;
  } else if (tab === "watch") {
    body = d.watch.length ? `<div class="dim small" style="margin:0 2px 8px">Running out of time: two years or fewer left on the ballot.</div><div class="hlist">${d.watch.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left === 0 ? "last year" : r.left + " left", tagc: "red" })).join("")}</div>` : `<div class="card dim small">Nobody is close to running out of time.</div>`;
  } else if (tab === "snub") {
    const list = (tier === "W" || tier === "C") && HOF.kind === "p" ? d.snubs : [];
    body = (list.length ? `<div class="dim small" style="margin:0 2px 8px">Great careers that fell off the ballot without being voted in.</div><div class="hlist">${list.map((r) => hofRow(Object.assign({ still: false, k: "p" }, r), { sub: `${esc(r.pos || "")} &middot; ${esc(r.nat)} &middot; peak ${r.peak}`, right: "off " + r.y })).join("")}</div>` : "")
      + (d.dropped.length ? `<h2 class="lbl2">Came off the ballot</h2><div class="hlist">${d.dropped.map((r) => hofRow(r, { right: r.why === "time" ? "ten years" : "no support", sub: hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</div>` : "")
      || `<div class="card dim small">Nobody has fallen off the ballot yet.</div>`;
  } else {
    body = d.records.length ? `<div class="card" style="margin-top:0">${d.records.map((r) => `<div class="row"><span>${esc(r.label)}</span><span class="dim small" style="text-align:right">${r.id ? `<a href="#/hofcard/${esc(r.id)}">${esc(r.value)}</a>` : esc(r.value)}</span></div>`).join("")}</div>` : `<div class="card dim small">Records appear once someone is inducted.</div>`;
  }
  $("#view").innerHTML = `<div class="v2 hof2"><h1>Hall of Fame</h1>
    ${hofSeg("data-tier", [["W", "World"], ["C", "Country"], ["L", "League"], ["K", "Club"]], tier)}
    <div class="hof-ctl">${scopeSel}${hofSeg("data-kind", [["p", "Players"], ["c", "Coaches"]], HOF.kind)}</div>
    <div class="hof-sc">${HOF_LBL[tier]}${name ? " &middot; " + esc(name) : ""} <span class="dim small">&middot; ${d.total} ${people} inducted</span></div>
    <nav class="chips hof-tabs">${tabs.map(([k, t]) => `<button data-htab="${k}" class="${k === tab ? "on" : ""}">${t}</button>`).join("")}</nav>
    ${body}
    <a class="more" href="#/academies"><span>Academies ranking</span><span>&rsaquo;</span></a><a class="more" href="#/trophies/players"><span>All-time rankings by points</span><span>&rsaquo;</span></a></div>`;
  document.querySelectorAll("[data-tier]").forEach((b) => (b.onclick = () => (location.hash = "#/hof/" + b.dataset.tier)));
  document.querySelectorAll("[data-kind]").forEach((b) => (b.onclick = () => { HOF.kind = b.dataset.kind; route(); }));
  document.querySelectorAll("[data-htab]").forEach((b) => (b.onclick = () => { HOF.tab = b.dataset.htab; route(); }));
  const sel = $("#hof-scope"); if (sel) sel.onchange = () => (location.hash = "#/hof/" + tier + "/" + enc(sel.value));
}

// ---------------------------------------------------------------- one person's Hall of Fame page
const HOF_ST = (it, c) => {
  if (!it) return `<span class="dim">Not nominated</span>`;
  if (it.status === "in") return `<b class="gold">Inducted ${esc(it.label)}</b>${it.via === "world" ? ` <span class="dim small">with the world</span>` : ""}`;
  if (it.status === "ballot") return `On the ballot, year ${it.n || 0} of 10`;
  return `<span class="dim">Fell off the ballot</span>`;
};
async function viewHofCard(id) {
  const c = await api("/api/hofcard?id=" + enc(id)), ch = c.chain;
  const rows = ["W", "C", "L", "K"].map((t) => {
    const it = ch[t], tierBadge = hofBadge(it && it.status === "in" ? { tier: t, scope: it.scope } : { tier: t, scope: null }, 24);
    return `<div class="hch ${it && it.status === "in" ? "in" : ""}">${tierBadge}<div class="hch-m"><b>${HOF_LBL[t]}</b><span class="small">${HOF_ST(it, c)}${it && it.scope ? ` <span class="dim small">${esc(it.scope)}</span>` : ""}</span></div></div>`;
  }).join("");
  const more = ch.all.filter((x) => (x.tier === "L" || x.tier === "K") && !(ch[x.tier] && ch[x.tier].scope === x.scope));
  const veto = ch.veto ? `<div class="hveto">${esc(ch.veto.text)}</div>` : "";
  let tail = "";
  if (c.k === "p") {
    const hon = {}; for (const h of c.honours) { const k = h.kind === "award" ? h.title : h.kind === "league" ? "League titles" : h.kind === "cup" ? "Continental and club cups" : h.kind === "world" ? "World Cups" : h.kind === "contin" ? "Continental championships" : h.kind === "nl" ? "Nations League" : h.title; hon[k] = (hon[k] || 0) + 1; }
    const seasons = c.career.length, clubs = [...new Set(c.career.map((r) => r.club).filter(Boolean))];
    tail = `<div class="card"><h3>Career <small>${seasons} seasons &middot; peak ${c.peak}</small></h3>
      <div class="dim small">${clubs.map((x) => clubLink(x)).join(" &rarr; ")}</div>
      <div class="hhon">${Object.entries(hon).map(([k, v]) => `<span class="tag">${v}&times; ${esc(k)}</span>`).join(" ")}</div>
      ${c.trn ? `<div class="dim small" style="margin-top:8px">Academy graduate of ${clubLink(c.trn)}</div>` : ""}
      ${c.nat_rec ? `<div class="dim small" style="margin-top:8px">For ${esc(c.nat)}: ${c.nat_rec.seasons} seasons of national-team football, ${c.nat_rec.g + c.nat_rec.a} goals and assists${c.nat_rec.world ? ", " + c.nat_rec.world + " World Cup" + (c.nat_rec.world > 1 ? "s" : "") : ""}</div>` : ""}</div>`;
  } else {
    const s = c.stats;
    tail = `<div class="card"><h3>Coaching career <small>${s.seasons} seasons &middot; ${s.titles} league titles &middot; ${s.cups} continental cups</small></h3>
      <div class="hstep">${c.stints.map((x) => `<div class="hs"><i></i><div><b>${x.kind === "acad" ? "Academy manager, " + clubLink(x.team) : x.kind === "nat" ? natLink(x.team) : clubLink(x.team)}</b><div class="dim small">${x.est ? "earlier career" : (x.from || "") + (x.to ? " to " + x.to : " to now")} &middot; ${x.seasons} seasons${x.titles ? " &middot; " + x.titles + " titles" : ""}${x.cups ? " &middot; " + x.cups + " cups" : ""}${x.wc ? " &middot; World Cup" : ""}</div></div></div>`).join("")}</div></div>`;
  }
  $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/hof">&lsaquo; Hall of Fame</a>
    <div class="hd"><div><h1>${flag(c.nat, 26)} ${esc(c.name)}</h1><div class="sub">${c.k === "c" ? "Coach" : esc(c.pos || "")} &middot; ${natLink(c.nat)} &middot; retired ${esc(c.retired)}</div></div>${hofBadge(c.badge, 38)}</div>
    <div class="dim small" style="margin-bottom:8px">${esc(c.line)}</div>
    <div class="card"><h3>The four halls</h3><div class="hchain">${rows}</div>${more.length ? `<div class="dim small" style="margin-top:8px">Also: ${more.map((x) => `${esc(x.scope)} (${esc(x.label)})`).join(", ")}</div>` : ""}${veto}</div>${tail}
    ${c.uid ? `<a class="more" href="#/player/${c.uid}"><span>Full player page</span><span>&rsaquo;</span></a>` : ""}</div>`;
}
// the block on a player's page
function hofPlayerBlock(h) {
  if (!h) return "";
  const ch = h.chain, rows = ["W", "C", "L", "K"].map((t) => {
    const it = ch[t];
    return `<div class="hch ${it && it.status === "in" ? "in" : ""}">${hofBadge(it && it.status === "in" ? { tier: t, scope: it.scope } : { tier: t, scope: null }, 22)}<div class="hch-m"><b>${HOF_LBL[t]}</b><span class="small">${HOF_ST(it)}</span></div></div>`;
  }).join("");
  return `<div class="card"><h3>Hall of Fame <small><a href="#/hofcard/${esc(h.id)}">full page</a></small></h3><div class="hchain">${rows}</div>${ch.veto ? `<div class="hveto">${esc(ch.veto.text)}</div>` : ""}</div>`;
}

// ---------------------------------------------------------------- reveal card, shared by both ceremonies
function hofReveal(e, scopeText, idx, n) {
  const gold = true;
  return `<div class="hrv"><div class="dim small">${esc(scopeText)}${n ? ` &middot; ${idx + 1} of ${n}` : ""}</div>
    <div class="hrv-n">${flag(e.nat, 34)}<div><div class="hrv-name">${esc(e.name)}</div><div class="dim small">${hofSub(Object.assign({}, e, { n: 0 }))}</div></div></div>
    <div class="hrv-p"><span class="dim small">${e.n === 1 ? "First ballot" : "Year " + e.n + " on the ballot"}</span><b>${hofPct(e.pct)}</b></div>
    <div class="hbar big"><i class="g" style="width:${Math.round(e.pct * 100)}%"></i><u style="left:75%"></u></div>
    <div class="dim small">${esc(e.line || "")}</div>
    <div style="margin-top:12px"><span class="tag gold">Inducted</span> ${hofBadge(e.badge || { tier: e.tier || "W", scope: e.scope || null }, 26)}</div></div>`;
}

// ---------------------------------------------------------------- world induction day
async function viewHofDay(season, sub) {
  const S = season || STATUS.header.season - (STATUS.header.flow ? 0 : 1);
  const d = await api("/api/hofday?season=" + S);
  if (sub === "watch") return hofDayWatch(d);
  const list = (arr, o) => arr.length ? `<div class="hlist">${arr.map((r) => hofRow(r, o(r))).join("")}</div>` : "";
  const ind = d.inducted.concat(d.coaches.inducted);
  $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/ceremony/${S}">&lsaquo; Awards &middot; Season ${S}</a>
    <div class="hd"><div><h1>World Hall of Fame</h1><div class="sub">Class of ${esc(d.label)}</div></div><a class="btn sm" href="#/hofday/${S}/watch">Watch the vote</a></div>
    <h2 class="lbl2">Inducted</h2>${ind.length ? list(ind, (r) => ({ right: hofPct(r.pct), bar: r.pct, gold: true })) : `<div class="card dim small">Nobody reached ${Math.round(d.cfg.pass * 100)}% this year.</div>`}
    ${d.vetoes.length ? d.vetoes.map((v) => `<div class="hveto"><b>${esc(v.nat)} did not honour ${esc(v.name)}.</b> ${esc(v.text.replace(/^.*?Federation veto: /, "Federation veto: "))}</div>`).join("") : ""}
    ${d.missed.length ? `<h2 class="lbl2">Missed out</h2>${list(d.missed, (r) => ({ right: hofPct(r.pct), bar: r.pct, tag: r.left === 0 ? "last year" : r.left === 1 ? "1 year left" : "", tagc: "red" }))}` : ""}
    ${d.fell.length ? `<h2 class="lbl2">Fell off the ballot</h2>${list(d.fell, (r) => ({ right: r.why === "time" ? "ten years" : "no support" }))}` : ""}
    ${d.favs.length ? `<h2 class="lbl2">Your favourites</h2><div class="hlist">${d.favs.map((f) => `<div class="hr"><div class="hr-a"><div class="hr-m"><b>${f.kind === "league" ? leagueLink(f.name) : natLink(f.name)}</b><span class="dim small">${f.inducted.length ? "inducted " + f.inducted.map(esc).join(", ") : "no inductees this year"}</span></div></div></div>`).join("")}</div>` : ""}
    <a class="more" href="#/hof"><span>Open the Hall of Fame</span><span>&rsaquo;</span></a></div>`;
}
function hofDayWatch(d) {
  const S = d.season, steps = ["Watch", "Vote", "Fell off"];
  let step = d.watch.length ? 0 : 1, i = 0;
  const ind = d.inducted.concat(d.coaches.inducted).sort((a, b) => a.pct - b.pct);
  const head = (t) => `<a class="crumb" href="#/hofday/${S}">&lsaquo; Results</a><div class="hd"><div><div class="dim small">World Hall of Fame &middot; class of ${esc(d.label)}</div><h1>${t}</h1></div></div>
    <div class="stp">${steps.map((s, k) => `<span class="${k === step ? "on" : ""}">${k + 1} ${s}</span>`).join("")}</div>`;
  const draw = () => {
    let h;
    if (step === 0) {
      h = head("Final-year watch") + `<div class="dim small" style="margin:8px 2px">They are running out of time. Swipe to see who is on the edge before the vote.</div>
        <div class="hswipe">${d.watch.map((r) => `<div class="hsw"><div class="hrv-n">${flag(r.nat, 30)}<div><div class="hrv-name">${esc(r.name)}</div><div class="dim small">${hofSub(Object.assign({}, r, { n: 0 }))}</div></div></div>
          <div class="hrv-p"><span class="dim small">Year ${r.n} of 10</span>${r.left === 0 ? '<span class="tag red">last chance</span>' : `<span class="tag red">${r.left} left</span>`}</div>
          ${r.last != null ? `<div class="hbar"><i style="width:${Math.round(r.last * 100)}%"></i><u style="left:75%"></u></div><div class="dim small">Last year ${hofPct(r.last)}</div>` : ""}
          <div class="dim small" style="margin-top:6px">${esc(r.line)}</div></div>`).join("")}</div>
        <div class="foot"><button class="btn" id="hd-skip">Skip</button><button class="btn pri" id="hd-next">The vote</button></div>`;
    } else if (step === 1) {
      if (i < ind.length) {
        const e = ind[i];
        h = head("The vote") + `<div class="dim small" style="margin:8px 2px">${ind.length} inducted, revealed from the lowest vote up.</div>${hofReveal(e, (e.k === "c" ? "World Hall of Fame · coach" : "World Hall of Fame"), i, ind.length)}
          <div class="foot"><button class="btn" id="hd-skip">Skip to summary</button><button class="btn pri" id="hd-next">${i === ind.length - 1 ? "Summary" : "Next"}</button></div>`;
      } else {
        h = head("The vote: summary") + `<h2 class="lbl2">Inducted</h2>${ind.length ? `<div class="hlist">${ind.slice().reverse().map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, gold: true })).join("")}</div>` : '<div class="card dim small">Nobody reached 75% this year.</div>'}
          ${d.vetoes.map((v) => `<div class="hveto"><b>${esc(v.nat)} did not honour ${esc(v.name)}.</b> ${esc(v.text.replace(/^.*?Federation veto: /, "Federation veto: "))}</div>`).join("")}
          ${d.missed.length ? `<h2 class="lbl2">Missed out</h2><div class="hlist">${d.missed.slice(0, 4).map((r) => hofRow(r, { right: hofPct(r.pct), tag: r.left === 0 ? "last year" : r.left === 1 ? "1 year left" : "", tagc: "red" })).join("")}</div>` : ""}
          ${d.favs.length ? `<h2 class="lbl2">Your favourites</h2><div class="hlist">${d.favs.map((f) => `<div class="hr"><div class="hr-a"><div class="hr-m"><b>${esc(f.name)}</b><span class="dim small">${f.inducted.length ? "inducted " + f.inducted.map(esc).join(", ") : "no inductees"}</span></div></div></div>`).join("")}</div>` : ""}
          <div class="foot"><button class="btn" id="hd-back">Back</button><button class="btn pri" id="hd-next">Who fell off</button></div>`;
      }
    } else {
      h = head("Fell off the ballot") + (d.fell.length ? `<div class="dim small" style="margin:8px 2px">Their time is up. They keep their other halls.</div><div class="hlist">${d.fell.map((r) => hofRow(r, { right: r.why === "time" ? "ten years" : "no support", sub: `${hofSub(Object.assign({}, r, { n: 0 }))} &middot; ${esc(r.line)}` })).join("")}</div>` : '<div class="card dim small">Nobody fell off the world ballot this year.</div>')
        + `<div class="foot"><button class="btn" id="hd-back">Back</button><a class="btn pri" href="#/hofday/${S}">Results</a></div>`;
    }
    $("#view").innerHTML = `<div class="v2 hday">${h}</div>`;
    const nx = $("#hd-next"), sk = $("#hd-skip"), bk = $("#hd-back");
    if (nx) nx.onclick = () => { if (step === 0) { step = 1; i = 0; } else if (step === 1) { if (i < ind.length) i++; else step = 2; } draw(); window.scrollTo(0, 0); };
    if (sk) sk.onclick = () => { if (step === 0) { step = 1; i = 0; } else i = ind.length; draw(); };
    if (bk) bk.onclick = () => { if (step === 2) { step = 1; i = ind.length; } else { i = Math.max(0, ind.length - 1); } draw(); };
  };
  draw();
}

// ---------------------------------------------------------------- a league's Hall of Fame day
const HLG = { tab: "league" };
async function viewHofLeague(league, season, sub, club) {
  const d = await api("/api/hofleague?league=" + enc(league) + (season ? "&season=" + season : ""));
  if (!d.ready) { $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/league/${enc(league)}">&lsaquo; ${esc(league)}</a><h1>Hall of Fame day</h1><div class="card dim small">The vote happens when the ${esc(league)} season finishes.</div></div>`; return; }
  if (sub === "watch") return hofLeagueWatch(d);
  if (sub === "club" && club) {
    const c = d.clubs.find((x) => x.club === club);
    const cd = await api("/api/hof?tier=K&kind=p&name=" + enc(club));
    $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/hofleague/${enc(league)}/${d.season}">&lsaquo; ${esc(league)} results</a>
      <div class="row" style="gap:10px;margin-top:8px">${crest(club, 44)}<div><h1 style="margin:0">${esc(club)}</h1><div class="dim small">Club Hall of Fame &middot; class of ${esc(d.label)}</div></div></div>
      <h2 class="lbl2">Inducted this year</h2>${c && c.inducted.length ? `<div class="hlist">${c.inducted.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, gold: true })).join("")}</div>` : '<div class="card dim small">Nobody this year.</div>'}
      ${cd.ballot.length ? `<h2 class="lbl2">Still on the club ballot</h2><div class="hlist">${cd.ballot.slice(0, 6).map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left <= 1 ? (r.left === 0 ? "last year" : "1 year left") : "", tagc: "red" })).join("")}</div>` : ""}
      <a class="more" href="#/hof/K/${enc(club)}"><span>Full ${esc(club)} Hall of Fame</span><span>&rsaquo;</span></a></div>`;
    return;
  }
  const tab = HLG.tab;
  let body;
  if (tab === "league") body = (d.league_ind.length ? `<h2 class="lbl2">${esc(league)} Hall of Fame</h2><div class="hlist">${d.league_ind.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, gold: true })).join("")}</div>` : `<div class="card dim small">No league inductees this year.</div>`);
  else if (tab === "clubs") body = `<h2 class="lbl2">Clubs <span class="dim small" style="text-transform:none;letter-spacing:0">tap a club for its results</span></h2><div class="hlist">${d.clubs.map((c) => `<a class="hr hr-link" href="#/hofleague/${enc(league)}/${d.season}/club/${enc(c.club)}"><div class="hr-a">${crest(c.club, 28)}<div class="hr-m"><b>${esc(c.club)}</b></div><span class="tag ${c.inducted.length ? "gold" : ""}">${c.inducted.length ? c.inducted.length + " inducted" : "none"}</span><i class="chev"></i></div></a>`).join("")}</div>`;
  else body = d.ballot.length ? `<div class="hlist">${d.ballot.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left <= 1 ? (r.left === 0 ? "last year" : "1 year left") : "", tagc: "red" })).join("")}</div>` : `<div class="card dim small">Nobody is on the league ballot.</div>`;
  $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/league/${enc(league)}">&lsaquo; ${esc(league)}</a>
    <div class="hd"><div><h1>Hall of Fame day ${esc(d.label)}</h1><div class="sub">${esc(league)} &middot; ${d.nLeague} league and ${d.nClubs} club inductees</div></div><a class="btn sm" href="#/hofleague/${enc(league)}/${d.season}/watch">Watch</a></div>
    ${hofSeg("data-ltab", [["league", "League"], ["clubs", "Clubs"], ["ballot", "Ballot"]], tab)}${body}
    <a class="more" href="#/hof/L/${enc(league)}"><span>Full ${esc(league)} Hall of Fame</span><span>&rsaquo;</span></a></div>`;
  document.querySelectorAll("[data-ltab]").forEach((b) => (b.onclick = () => { HLG.tab = b.dataset.ltab; route(); }));
}
function hofLeagueWatch(d) {
  const items = [];
  for (const e of d.league_ind) items.push({ e, scope: d.league + " Hall of Fame" + (e.k === "c" ? " · coach" : "") });
  for (const c of d.clubs) for (const e of c.inducted) items.push({ e, scope: c.club + " Hall of Fame" + (e.k === "c" ? " · coach" : "") });
  let i = 0;
  const draw = () => {
    const last = i >= items.length;
    $("#view").innerHTML = `<div class="v2 hday"><a class="crumb" href="#/hofleague/${enc(d.league)}/${d.season}">&lsaquo; Results</a>
      <div class="hd"><div><div class="dim small">${esc(d.league)} &middot; ${esc(d.label)}</div><h1>Hall of Fame day</h1></div></div>
      ${items.length ? (last ? `<div class="card" style="text-align:center;padding:22px 14px"><div class="eyebrow gold">That is the class</div><div style="font-size:18px;font-weight:700;margin:8px 0">${d.nLeague} league and ${d.nClubs} club inductees</div></div>` : hofReveal(items[i].e, items[i].scope, i, items.length)) : `<div class="card dim small">Nobody was inducted this year.</div>`}
      <div class="foot">${last || !items.length ? `<a class="btn" href="#/hof/L/${enc(d.league)}">League hall</a><a class="btn pri" href="#/hofleague/${enc(d.league)}/${d.season}">Results</a>` : `<a class="btn" href="#/hofleague/${enc(d.league)}/${d.season}">Skip to results</a><button class="btn pri" id="hl-next">${i === items.length - 1 ? "Finish" : "Next"}</button>`}</div></div>`;
    const nx = $("#hl-next"); if (nx) nx.onclick = () => { i++; draw(); window.scrollTo(0, 0); };
  };
  draw();
}
// the block in the league-finish popup: fetched once the league is done
async function hofLeagueBlock(league) {
  try {
    const d = await api("/api/hofleague?league=" + enc(league));
    if (!d.ready) return null;
    return d;
  } catch (e) { return null; }
}

// ---------------------------------------------------------------- academies: prestige, manager, ranking
const GRADE_TXT = { 1: ["Strong", "green"], 0: ["Average", ""], "-1": ["Weak", "red"] };
async function academyHofBlock(club) {
  const el = $("#acad-hof"); if (!el) return;
  try {
    const a = await api("/api/academy?club=" + enc(club)), m = a.manager, g = m ? GRADE_TXT[m.grade] : null, od = a.odds;
    const bar = (x, c) => `<span style="display:block;height:100%;width:${Math.round(x * 100)}%;background:${c}"></span>`;
    el.innerHTML = `<div class="v2"><div class="card hero"><h3>Academy prestige <small>#${a.rank} of ${a.of}</small></h3>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><div class="big">${Math.round(a.prestige)}</div><span class="tag ${a.rising > 1 ? "green" : a.rising < -1 ? "red" : ""}">${a.rising > 1 ? "Rising" : a.rising < -1 ? "Falling" : "Steady"} ${a.rising > 0 ? "+" : ""}${a.rising}</span></div>
      <div class="dim small">Earned from graduates: how good they became, what they won, and every Hall of Fame they enter.</div>
      <div class="stat4"><div><b>${a.graduates}</b><span>GRADUATES</span></div><div><b>${a.pros}</b><span>FIVE+ SEASONS</span></div><div><b>${a.stars}</b><span>80+ PEAK</span></div><div><b>${a.halls}</b><span>HALL POINTS</span></div></div>
      <a class="more" href="#/academies"><span>All academies ranked</span><span>&rsaquo;</span></a></div>
    <div class="card"><h3>Academy manager ${g ? `<small><span class="tag ${g[1]}">${g[0]}</span></small>` : ""}</h3>
      ${m ? `<div class="row"><span><b>${esc(m.name)}</b> <span class="dim small">${natLink(m.nat)} &middot; age ${m.age}</span></span><span class="dim small">since S${m.since}</span></div>` : '<div class="dim small">No manager yet.</div>'}
      <div class="dim small" style="margin-top:6px">He adds ${m ? (m.grade > 0 ? "a boost to" : m.grade < 0 ? "a drag on" : "nothing extra to") : "nothing to"} the academy's development. If the first-team job opens he is a candidate, and the academy then draws a fresh manager.</div>
      <div class="dim small" style="margin-top:8px">Next draw: ${hofPct(od.strong)} strong, ${hofPct(od.average)} average, ${hofPct(od.weak)} weak</div>
      <div style="display:flex;height:6px;gap:2px;margin-top:6px;border-radius:3px;overflow:hidden">${bar(od.strong, "#3ddc84")}${bar(od.average, "#8fa89a")}${bar(od.weak, "#ff6b6b")}</div></div>
    <div class="card"><h3>Best graduates</h3>${a.best.length ? a.best.map((b) => `<div class="row"><span>${flag(b.nat, 16)} ${b.uid ? `<a href="#/player/${b.uid}">${esc(b.name)}</a>` : esc(b.name)}${b.active ? ' <span class="tag green">playing</span>' : ""}</span><span class="dim small">peak ${b.peak}</span></div>`).join("") : '<div class="dim small">No graduates have broken through yet.</div>'}</div>
    ${a.in_halls.length ? `<div class="card"><h3>Graduates in a Hall of Fame</h3><div class="hlist">${a.in_halls.map((r) => hofRow(r)).join("")}</div></div>` : ""}</div>`;
  } catch (e) { el.innerHTML = ""; }
}
const ACV = { sort: "prestige", scope: "world" };
async function viewAcademies(scope, name) {
  scope = ["world", "continent", "league"].includes(scope) ? scope : ACV.scope; ACV.scope = scope;
  const d = await api("/api/academies?scope=" + scope + (name ? "&name=" + enc(name) : ""));
  if (scope !== "world" && !name) { location.replace("#/academies/" + scope + "/" + enc(scope === "league" ? d.leagues[0] : d.confeds[0])); return; }
  let rows = d.rows.slice();
  if (ACV.sort === "rising") rows = rows.filter((r) => r.rising > 0).sort((a, b) => b.rising - a.rising);
  else if (ACV.sort === "under") rows = rows.filter((r) => r.under).sort((a, b) => b.level - a.level);
  rows = rows.slice(0, 30);
  const sel = scope === "world" ? "" : `<select id="ac-sel">${(scope === "league" ? d.leagues : d.confeds).map((n) => `<option ${n === name ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/hof">&lsaquo; Hall of Fame</a><h1>Academies</h1><div class="sub">Ranked by prestige: what their graduates became.</div>
    ${hofSeg("data-acs", [["world", "World"], ["continent", "Continent"], ["league", "League"]], scope)}
    <div class="hof-ctl">${sel}${hofSeg("data-acsort", [["prestige", "Top"], ["rising", "Rising"], ["under", "Underachievers"]], ACV.sort)}</div>
    <div class="hlist" style="margin-top:10px">${rows.length ? rows.map((r) => `<a class="hr hr-link" href="#/club/${enc(r.club)}" data-acad="1"><div class="hr-a"><span class="rk">${r.rank}</span>${crest(r.club, 26)}<div class="hr-m"><b>${esc(r.club)}</b><span class="dim small">level ${r.level} &middot; ${r.stars} stars &middot; ${r.graduates} graduates</span></div>${r.rising > 1 ? '<span class="tag green">rising</span>' : ""}${r.under ? '<span class="tag red">spent a lot</span>' : ""}<span class="hr-r">${Math.round(r.prestige)}</span></div><div class="hbar"><i style="width:${Math.min(100, r.prestige)}%"></i></div></a>`).join("") : '<div class="card dim small" style="margin:0">Nobody fits yet.</div>'}</div></div>`;
  document.querySelectorAll("[data-acs]").forEach((b) => (b.onclick = () => (location.hash = "#/academies/" + b.dataset.acs)));
  document.querySelectorAll("[data-acsort]").forEach((b) => (b.onclick = () => { ACV.sort = b.dataset.acsort; route(); }));
  document.querySelectorAll("[data-acad]").forEach((a) => (a.onclick = () => { CV_OPEN = "acad"; }));
  const s2 = $("#ac-sel"); if (s2) s2.onchange = () => (location.hash = "#/academies/" + scope + "/" + enc(s2.value));
}
