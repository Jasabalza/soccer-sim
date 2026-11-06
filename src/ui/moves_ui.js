"use strict";
// v16 Off-season moves: one page for everything that changes hands between two seasons. Highlights (with a walk-through that
// steps through the hottest moves one at a time), Players (transfers, free agents, released), Coaches (hired, sacked, academy
// managers getting their shot, national jobs) and Retired (players and coaches ranked by prestige or peak level).
// Loaded before app.js; the helpers it uses (api, esc, enc, flag, crest, money, ovr, leagueLink, FAVS, STATUS, ...) are only touched when a page is drawn.

const MV = { kind: "t", mv: "all", sorts: { players: "pay", coaches: "hot", retired: "prestige" }, league: "", who: "p", limit: 60, cokind: "all", view: "list", mtab: "all", metric: "net", club: "", mall: false };
const MV_TABS = [["players", "Players"], ["coaches", "Coaches"], ["retired", "Retired"]];
const mvChips = (attr, list, cur) => `<div class="mchips" role="group">${list.map(([k, t]) => `<button ${attr}="${esc(k)}" class="${k === cur ? "on" : ""}">${t}</button>`).join("")}</div>`;
const mvTag = (m) => m === "up" ? `<span class="tag green">&#9650; Step up</span>` : m === "down" ? `<span class="tag red">&#9660; Step down</span>` : m === "side" ? `<span class="tag">&#9644; Lateral</span>` : "";
const mvAgo = (n) => (n === 1 ? "a year" : n + " years");
const mvPos = (r) => (r.pos ? `<span class="pos-${esc(r.pos)}">${esc(r.pos)}</span>` : "");
// the one emblem on a row: the club the person ends up at, or the one they leave; a flag for a national job
function mvBadge(r, size) {
  size = size || 22;
  if (r.k === "n") return flag(r.nation, size - 4);
  const club = r.to || r.from || r.club;
  return club ? crest(club, size) : "";
}
function mvWho(r) {
  const nm = r.uid ? `<a href="#/player/${r.uid}">${esc(r.name)}</a>` : r.hid ? `<a href="#/hofcard/${esc(r.hid)}">${esc(r.name)}</a>` : esc(r.name);
  return nm;
}
// one short phrase for one coach event (a coach with several events gets several phrases and several bubbles)
function mvEvPhrase(e) {
  if (e.k === "h") return e.src === "acad" ? `${esc(e.from)} academy &rarr; ${esc(e.to)}` : e.src === "new" ? `first job &rarr; ${esc(e.to)}` : e.from ? `${esc(e.from)} &rarr; ${esc(e.to)}` : `hired by ${esc(e.to)}`;
  if (e.k === "x") return `sacked by ${esc(e.from)}`;
  if (e.k === "q") return `left ${esc(e.from)}`;
  if (e.k === "cr") return "retired";
  return `${esc(e.nation)} national team`;
}
function mvTags(e) {
  if (e.k === "h") return e.src === "acad" ? `<span class="tag gold">Academy shot</span>` : `<span class="tag green">Hired</span>${mvTag(e.mv)}`;
  if (e.k === "x") return `<span class="tag red">Sacked</span>`;
  if (e.k === "q") return `<span class="tag">Left</span>`;
  if (e.k === "cr") return `<span class="tag">Retired</span>`;
  return `<span class="tag blue">National</span>`;
}
function mvLine(r) {
  if (r.evs && r.evs.length > 1) return "Coach &middot; age " + r.age + " &middot; " + r.evs.map(mvEvPhrase).join(" &middot; ");
  const age = r.age ? `age ${r.age}` : "";
  const who = r.k === "t" || r.k === "f" || r.k === "r" || r.k === "p" ? [mvPos(r), age].filter(Boolean).join(" &middot; ") : "Coach &middot; " + age;
  let mid = "";
  if (r.k === "t") mid = `${esc(r.from)} &rarr; ${esc(r.to)}`;
  else if (r.k === "f") mid = r.first ? `first pro contract &rarr; ${esc(r.to)}` : r.from ? `${esc(r.from)} &rarr; ${esc(r.to)}` : `free agent &rarr; ${esc(r.to)}`;
  else if (r.k === "r") mid = `released by ${esc(r.from)}`;
  else if (r.k === "p") mid = `${r.club ? "last at " + esc(r.club) : "no club"} &middot; peak ${r.pk || r.ovr}`;
  else if (r.k === "h") mid = r.src === "acad" ? `${esc(r.from)} academy &rarr; ${esc(r.to)}` : r.src === "new" ? `first job &rarr; ${esc(r.to)}` : r.from ? `${esc(r.from)} &rarr; ${esc(r.to)}` : `hired by ${esc(r.to)}`;
  else if (r.k === "x") mid = `sacked by ${esc(r.from)}`;
  else if (r.k === "q") mid = `left ${esc(r.from)}`;
  else if (r.k === "cr") mid = r.from ? `last at ${esc(r.from)}` : "retired";
  else if (r.k === "n") mid = `${esc(r.nation)} national team`;
  return [who, mid].filter(Boolean).join(" &middot; ");
}
function mvRight(r) {
  if (r.evs && r.evs.length > 1) return `<span class="mvtags2">${r.evs.map(mvTags).join("")}</span>`;
  if (r.k === "t") return `<b>${money(r.fee)}</b>${mvTag(r.mv)}`;
  if (r.k === "f") return `<b>${r.wage ? money(r.wage) + "/yr" : "free"}</b>${mvTag(r.mv)}`;
  if (r.k === "r") return `<b>${r.wage ? money(r.wage) + "/yr" : ""}</b><span class="tag">no club</span>`;
  if (r.k === "p") return `<b>${r.prestige}</b><span class="dim small">prestige</span>`;
  if (r.k === "h") return r.src === "acad" ? `<span class="tag gold">Academy shot</span>` : `<span class="tag green">Hired</span>${mvTag(r.mv)}`;
  if (r.k === "x") return `<span class="tag red">Sacked</span>`;
  if (r.k === "q") return `<span class="tag">Left</span>`;
  if (r.k === "cr") return `<span class="tag">Retired</span>`;
  return `<span class="tag blue">National</span>`;
}
// a two-line row: emblem, name with rating, a short line, and the money or tag on the right
// the bidding war behind a transfer, like the old Transfers page: how the price was set and every club's bid
function mvBid(r) {
  const b = r.bid, tr = b ? b.traits || [] : [], tn = (k, v) => v >= 3 ? k + ": high" : v <= 1 ? k + ": low" : null;
  const traits = b ? [tn("Money", tr[0]), tn("Loyalty", tr[1]), tn("Ambition", tr[2]), tn("Trophies", tr[3])].filter(Boolean).join(", ") : "";
  return `<div class="mvdet">${r.why ? `<div class="meta" style="margin-bottom:6px">${esc(r.why)}</div>` : ""}${b ? `
    <div class="row"><span>Base value</span><b>${money(b.base)}</b></div>
    <div class="row"><span>Asking price after demand ${b.demand}x${b.premium > 1.001 ? ` and a ${Math.round((b.premium - 1) * 100)}% rival premium` : ""}</span><b>${money(b.asking)}</b></div>
    <div class="row"><span>Paid</span><b>${money(r.fee)}</b></div>
    ${b.comp > 0 ? `<div class="row"><span>Training compensation to ${clubLink(b.trainer)}</span><b>${money(b.comp)}</b></div>` : ""}
    ${traits ? `<div class="meta" style="margin:4px 0">Player: ${traits}</div>` : ""}
    <h4 class="sh" style="margin-top:6px">Bids</h4>
    ${b.bids.map((c, k) => `<div class="row"><span>${k === 0 ? "&#127942; " : ""}${clubLink(c.club)}${c.rival ? ' <span class="tag red">rival</span>' : ""}</span><span class="meta">bid ${money(c.bid)} &middot; wage ${money(c.wage)} &middot; score ${c.score}</span></div>`).join("")}` : ""}</div>`;
}
function mvRow(r, i, attrs) {
  const star = (r.k === "t" || r.k === "f" || r.k === "r" || r.k === "p") && r.ovr ? " " + ovr(r.k === "p" ? (r.pk || r.ovr) : r.ovr) : "";
  const hot = r.hot >= 70 ? `<span class="mvhot" title="hot move">&#128293;</span>` : "";
  const nb = r.bid ? r.bid.bids.length : 0, war = nb > 1 ? ` &middot; <span class="mvwar">${nb} clubs bid</span>` : "";
  const inner = `<div class="hr-a"><span class="mvb">${mvBadge(r)}</span><div class="hr-m"><b>${r.nat ? flag(r.nat, 16) + " " : ""}${mvWho(r)}${star}${hot}</b><span class="dim small">${mvLine(r)}${war}${r.k === "p" && r.hofFrom ? ` &middot; Hall of Fame from ${esc(r.hofFrom)}` : ""}</span></div><span class="hr-r mvR">${mvRight(r)}</span></div>`;
  if (r.bid || r.why) return `<details class="hr mvr mvd" ${attrs || ""}><summary>${inner}</summary>${mvBid(r)}</details>`;
  return `<div class="hr mvr" ${attrs || ""}>${inner}</div>`;
}
const mvSeasonLabel = (d) => `Season ${d.season} &middot; ${esc(d.label)}`;


// ---------------------------------------------------------------- the Money view (Players tab): leagues for the world, clubs for one league
const mvCol = (v) => (v >= 0 ? "var(--accent)" : "var(--red)");
// one bar row. mode "net": bar grows from the middle (green up, red down). Otherwise it grows from the left in `col`.
function mvBarRow(label, v, mx, mode, col, attrs, star) {
  const w = mx > 0 ? Math.min(100, Math.abs(v) / mx * (mode === "net" ? 50 : 100)) : 0;
  const bar = mode === "net" ? `<i style="${v >= 0 ? "left:50%" : "right:50%"};width:${w}%;background:${mvCol(v)}"></i><u></u>` : `<i style="left:0;width:${w}%;background:${col}"></i>`;
  const txt = mode === "net" ? `<b style="color:${mvCol(v)}">${moneyS(v)}</b>` : `<b>${money(v)}</b>`;
  return `<a href="#" class="mvm" ${attrs}><span class="mvm-l">${star ? "&#9733; " : ""}${esc(label)}</span><span class="mvm-b">${bar}</span>${txt}<span class="mvm-c">&rsaquo;</span></a>`;
}
const mvTiles = (a, b, c) => `<div class="mvm-t">${[a, b, c].map((x) => `<div><b${x[2] ? ` style="color:${x[2]}"` : ""}>${x[0]}</b><span>${x[1]}</span></div>`).join("")}</div>`;
async function mvMoneyHtml(S, favL) {
  const lg = MV.league && MV.league !== "@favs" ? MV.league : "";
  const m = await api("/api/movemoney?season=" + S + (lg ? "&league=" + enc(lg) : ""));
  if (!m.season) return "";
  if (!lg) {
    MV.club = "";
    const favT = MV.league === "@favs" || MV.mtab === "fav", key = MV.metric === "spent" ? "paid" : MV.metric === "earned" ? "recv" : "net";
    const rows = m.leagues.filter((r) => !favT || favL.includes(r.league)).sort((a, b) => key === "net" ? b.net - a.net : b[key] - a[key]);
    const mx = Math.max(0.1, ...rows.map((r) => Math.abs(r[key])));
    const mode = key === "net" ? "net" : "abs", col = key === "paid" ? "var(--blue)" : "var(--accent2)";
    return `${mvTiles([money(m.world.total), "fees paid"], [m.world.n, "moves"], [m.world.abroad, "between leagues"])}
      <div class="card mvm-card"><h3>${favT ? "Favorite leagues" : "Leagues"} <small>tap one to see its clubs</small></h3>
      <div class="seg mvsub" role="tablist"><button data-mt="all" class="${favT ? "" : "on"}">All leagues</button><button data-mt="fav" class="${favT ? "on" : ""}">&#9733; Favorites</button></div>
      ${mvChips("data-me", [["net", "Net"], ["spent", "Spent"], ["earned", "Earned"]], MV.metric)}
      ${rows.length ? rows.map((r) => mvBarRow(r.league, r[key], mx, mode, col, `data-ml="${esc(r.league)}"`, !favT && favL.includes(r.league))).join("") : `<div class="dim small" style="padding:6px 2px">No favorite leagues yet. Pick them on the World page.</div>`}
      <div class="dim small" style="margin-top:6px">${key === "net" ? "Fees received for sales minus fees paid for signings." : key === "paid" ? "Fees each league's clubs paid for signings." : "Fees each league's clubs received for sales."}</div></div>`;
  }
  const st = m.stat || { paid: 0, recv: 0, net: 0 }, tiles = mvTiles([money(st.paid), "spent"], [money(st.recv), "earned"], [moneyS(st.net), `net &middot; ${ordN(m.rank)} of ${m.leagues.length}`, mvCol(st.net)]);
  if (MV.club && !m.clubs.some((c) => c.club === MV.club)) MV.club = "";
  if (MV.club) return await mvClubHtml(S, lg, m.clubs.find((c) => c.club === MV.club));
  const card = (title, sub, key, col) => {
    const list = m.clubs.slice().sort((a, b) => b[key] - a[key]), mx = Math.max(0.1, ...list.map((c) => c[key])), cut = MV.mall ? list.length : 6;
    return `<div class="card mvm-card"><h3>${title} <small>${sub}</small></h3>${list.slice(0, cut).map((c) => mvBarRow(c.club, c[key], mx, "abs", col, `data-mc="${esc(c.club)}"`)).join("")}
      ${list.length > 6 ? `<a href="#" class="mvm-all" data-mall="1">${MV.mall ? "Show fewer" : "Show all " + list.length + " clubs"}</a>` : ""}</div>`;
  };
  return `${tiles}${card("Biggest spenders", "fees paid", "spent", "var(--blue)")}${card("Biggest sellers", "fees received", "earned", "var(--accent2)")}<div class="dim small" style="margin-top:6px">Tap a club for its buys and sells.</div>`;
}
async function mvClubHtml(S, lg, c) {
  const d = await api("/api/moves?season=" + S + "&tab=players&kind=t&club=" + enc(c.club) + "&sort=pay&limit=200");
  const bought = d.rows.filter((r) => r.to === c.club), sold = d.rows.filter((r) => r.from === c.club);
  const list = (rows, none) => rows.length ? `<div class="hlist">${rows.map((r) => mvRow(r, 0)).join("")}</div>` : `<div class="dim small" style="padding:4px 2px">${none}</div>`;
  return `<a href="#" class="crumb" id="mv-back">&lsaquo; ${esc(lg)} clubs</a>
    <div class="card mvm-card"><div class="mvm-ch">${clubLink(c.club)} <small>${esc(lg)}</small></div>${mvTiles([money(c.spent), `spent &middot; ${c.buys} buy${c.buys === 1 ? "" : "s"}`], [money(c.earned), `earned &middot; ${c.sells} sale${c.sells === 1 ? "" : "s"}`], [moneyS(c.net), "net", mvCol(c.net)])}</div>
    <h4 class="sh">Bought</h4>${list(bought, "No signings for a fee.")}<h4 class="sh">Sold</h4>${list(sold, "No sales for a fee.")}`;
}

// ---------------------------------------------------------------- the page
async function viewMoves(season, tab) {
  tab = tab === "walk" || MV_TABS.some((t) => t[0] === tab) ? tab : "players";
  if (tab === "money") { MV.view = "money"; location.replace("#/moves/" + (season || "") + "/players"); return; }
  const walking = tab === "walk";
  const favL = (FAVS || []).filter((k) => k.startsWith("L:")).map((k) => k.slice(2));
  const lgq = MV.league === "@favs" ? (favL.length ? favL.join("|") : "") : MV.league;
  const q = new URLSearchParams();
  if (season) q.set("season", season);
  q.set("tab", walking ? "highlights" : tab);
  if (lgq) q.set("league", lgq);
  if (tab === "players") { if (MV.kind !== "all") q.set("kind", MV.kind); if (MV.mv !== "all") q.set("mv", MV.mv); }
  if (tab === "coaches") { if (MV.cokind !== "all") q.set("kind", MV.cokind); if (MV.mv !== "all") q.set("mv", MV.mv); }
  if (tab === "retired") q.set("who", MV.who);
  if (!walking) q.set("sort", MV.sorts[tab]);
  const moneyV = tab === "players" && MV.view === "money";
  q.set("limit", moneyV ? 1 : MV.limit);
  const d = await api("/api/moves?" + q.toString());
  if (!d.season) { $("#view").innerHTML = `<div class="v2"><div class="hd"><div><h1>Off-season moves</h1></div></div><div class="card dim small">No completed season yet. Transfers, new coaches and retirements appear here once a season is over.</div></div>`; return; }
  if (walking) return mvWalk(d);
  const S = d.season, c = d.counts;
  const head = `<div class="hd"><div><h1>Off-season moves</h1><div class="sub">${mvSeasonLabel(d)}</div></div>${d.recorded ? `<a class="btn sm" href="#/moves/${S}/walk">Walk-through</a>` : ""}</div>
    <p class="filters"><select id="mv-s" aria-label="Season">${Array.from({ length: d.seasons }, (_, i) => d.seasons - i).map((s) => `<option value="${s}" ${s === S ? "selected" : ""}>Season ${s}</option>`).join("")}</select>
    <select id="mv-l" aria-label="League"><option value="">Whole world</option>${favL.length ? `<option value="@favs" ${MV.league === "@favs" ? "selected" : ""}>My favourite leagues</option>` : ""}${leagueOpts(d.leagues, MV.league)}</select></p>
    <div class="seg mtabs" role="tablist">${MV_TABS.map(([k, t]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${t}</button>`).join("")}</div>
    <div class="dim small mvsum">${c.transfers} transfers &middot; ${c.free} free agents signed &middot; ${c.hired + c.fired + c.left} coach moves &middot; ${c.retired} retired</div>`;
  let body = "", moneyHtml = "";
  if (tab === "players") body = `<div class="seg mvsw" role="tablist"><button data-vw="list" class="${moneyV ? "" : "on"}">List</button><button data-vw="money" class="${moneyV ? "on" : ""}">Money</button></div>`;
  if (moneyV) moneyHtml = await mvMoneyHtml(S, favL);
  if (moneyV) body += moneyHtml;
  else if (!d.recorded && tab !== "players") body = `<div class="card dim small">Coach moves and retirements were not written down for this season. Transfers were: see the Players tab.</div>`;
  else if (tab === "players") {
    const mc = d.mvCounts || { up: 0, side: 0, down: 0 };
    body += `${mvChips("data-k", [["t", "Transfers"], ["f", "Free agents"], ["r", "Released"], ["all", "All"]], MV.kind)}
      <div class="dim small" style="margin:8px 2px 4px">Move</div>${mvChips("data-m", [["all", "All"], ["up", "&#9650; Up " + mc.up], ["side", "&#9644; Lateral " + mc.side], ["down", "&#9660; Down " + mc.down]], MV.mv)}
      <p class="filters" style="margin:8px 0"><select id="mv-o" aria-label="Sort">${[["pay", "Highest paid"], ["hot", "Hottest"], ["level", "Best player"], ["jump", "Biggest jump"], ["young", "Youngest"]].map(([k, t]) => `<option value="${k}" ${d.sort === k ? "selected" : ""}>Sort: ${t}</option>`).join("")}</select><span class="dim small">${d.total} moves${MV.kind === "t" ? " &middot; tap one for the bidding war" : ""}</span></p>`;
  } else if (tab === "coaches") {
    body = `${mvChips("data-ck", [["all", "All"], ["h", "Hired"], ["acad", "Academy shot"], ["x", "Sacked"], ["q", "Left"], ["cr", "Retired"], ["n", "National"]], MV.cokind)}
      <div class="dim small" style="margin:8px 2px 4px">Move</div>${mvChips("data-m", [["all", "All"], ["up", "&#9650; Up"], ["side", "&#9644; Lateral"], ["down", "&#9660; Down"]], MV.mv)}
      <p class="filters" style="margin:8px 0"><select id="mv-o" aria-label="Sort">${[["hot", "Hottest"], ["name", "Biggest name"], ["jump", "Biggest jump"]].map(([k, t]) => `<option value="${k}" ${d.sort === k ? "selected" : ""}>Sort: ${t}</option>`).join("")}</select><span class="dim small">${d.total} moves</span></p>`;
  } else {
    body = `${mvChips("data-w", [["p", "Players"], ["c", "Coaches"]], MV.who)}
      <p class="filters" style="margin:8px 0"><select id="mv-o" aria-label="Sort">${[["prestige", "Prestige"], ["peak", "Peak level"], ["age", "Oldest"]].map(([k, t]) => `<option value="${k}" ${d.sort === k ? "selected" : ""}>Rank by: ${t}</option>`).join("")}</select><span class="dim small">${d.total} retired</span></p>`;
  }
  if (!moneyV && (d.recorded || tab === "players")) {
    body += d.rows.length ? `<div class="hlist">${d.rows.map((r) => mvRow(r, 0)).join("")}</div>${d.total > d.rows.length ? `<button class="btn mvmore" id="mv-more">Show more (${d.total - d.rows.length} left)</button>` : ""}`
      : `<div class="card dim small">Nothing matches these filters.</div>`;
  }
  $("#view").innerHTML = `<div class="v2 mvp">${head}${body}</div>`;
  const go = (t) => { MV.limit = 60; if (location.hash === "#/moves/" + S + "/" + t) route(); else location.hash = "#/moves/" + S + "/" + t; };
  document.querySelectorAll(".mtabs [data-t]").forEach((b) => b.onclick = () => go(b.dataset.t));
  $("#mv-s").onchange = (e) => { MV.club = ""; location.hash = "#/moves/" + e.target.value + "/" + tab; };
  $("#mv-l").onchange = (e) => { MV.league = e.target.value; MV.club = ""; MV.mall = false; MV.limit = 60; route(); };
  document.querySelectorAll("[data-vw]").forEach((b) => b.onclick = () => { MV.view = b.dataset.vw; MV.club = ""; route(); });
  document.querySelectorAll("[data-mt]").forEach((b) => b.onclick = () => { MV.mtab = b.dataset.mt; if (MV.league === "@favs") MV.league = ""; route(); });
  document.querySelectorAll("[data-me]").forEach((b) => b.onclick = () => { MV.metric = b.dataset.me; route(); });
  const goTop = (f) => (e) => { e.preventDefault(); f(e.currentTarget); window.scrollTo(0, 0); route(); };
  document.querySelectorAll("[data-ml]").forEach((a) => a.onclick = goTop((x) => { MV.league = x.dataset.ml; MV.club = ""; MV.mall = false; }));
  document.querySelectorAll("[data-mc]").forEach((a) => a.onclick = goTop((x) => { MV.club = x.dataset.mc; }));
  document.querySelectorAll("[data-mall]").forEach((a) => a.onclick = (e) => { e.preventDefault(); MV.mall = !MV.mall; const y = window.scrollY; route(); setTimeout(() => window.scrollTo(0, y), 0); });
  const bk = $("#mv-back"); if (bk) bk.onclick = (e) => { e.preventDefault(); MV.club = ""; route(); };
  const o = $("#mv-o"); if (o) o.onchange = (e) => { MV.sorts[tab] = e.target.value; MV.limit = 60; route(); };
  document.querySelectorAll(".mchips [data-k]").forEach((b) => b.onclick = () => { MV.kind = b.dataset.k; MV.sorts.players = b.dataset.k === "all" ? "hot" : "pay"; MV.limit = 60; route(); });
  document.querySelectorAll("[data-ck]").forEach((b) => b.onclick = () => { MV.cokind = b.dataset.ck; MV.limit = 60; route(); });
  document.querySelectorAll(".mchips [data-m]").forEach((b) => b.onclick = () => { MV.mv = b.dataset.m; MV.limit = 60; route(); });
  document.querySelectorAll(".mchips [data-w]").forEach((b) => b.onclick = () => { MV.who = b.dataset.w; MV.sorts.retired = "prestige"; route(); });
  const more = $("#mv-more"); if (more) more.onclick = () => { MV.limit += 60; route(); };
}

// ---------------------------------------------------------------- the walk-through
function mvStory(r) {
  if (r.evs && r.evs.length > 1) return r.evs.map((e) => mvStory(Object.assign({}, r, e, { evs: null }))).join(" ");
  const nm = esc(r.name);
  if (r.k === "t") return `${nm} (${esc(r.pos || "")}, ${r.age}) joins ${esc(r.to)} from ${esc(r.from)} for ${money(r.fee)}.${r.abroad ? ` ${esc(r.fromL)} to ${esc(r.toL)}.` : ""}`;
  if (r.k === "f") return r.first ? `First pro contract, with ${esc(r.to)}: ${money(r.wage)}/yr.` : `${r.from ? "Out of contract at " + esc(r.from) + ". " : ""}Signs for ${esc(r.to)}: ${money(r.wage)}/yr.`;
  if (r.k === "r") return `Released by ${esc(r.from)}. Still looking.`;
  if (r.k === "h") {
    if (r.src === "acad") return `Promoted from the ${esc(r.from)} academy to manage ${esc(r.to)}.`;
    if (r.src === "new") return `First head coach job, at ${esc(r.to)}.`;
    return `${r.from ? "Leaves " + esc(r.from) + " for " + esc(r.to) : "Appointed by " + esc(r.to)}.${r.idle > 0 ? ` Out of work for ${mvAgo(r.idle)}.` : ""}`;
  }
  if (r.k === "x") return `Sacked by ${esc(r.from)} after ${r.seasons} season${r.seasons === 1 ? "" : "s"}${r.titles ? ", " + r.titles + " title" + (r.titles === 1 ? "" : "s") : ""}.`;
  if (r.k === "q") return `Leaves ${esc(r.from)}.`;
  if (r.k === "cr") return `Retires after ${r.seasons} seasons: ${r.titles} title${r.titles === 1 ? "" : "s"}, ${r.cups} cup${r.cups === 1 ? "" : "s"}.`;
  if (r.k === "n") return `Named ${esc(r.nation)} coach${r.prev ? ", replacing " + esc(r.prev) : ""}.`;
  if (r.k === "p") return `Retires${r.club ? " from " + esc(r.club) : ""}. Peak ${r.pk || r.ovr}, prestige ${r.prestige}.${r.hofFrom ? " Hall of Fame ballot from " + esc(r.hofFrom) + "." : ""}`;
  return "";
}
function mvSlide(r, n, total) {
  const money_ = r.k === "t" ? `<div class="mvbig">${money(r.fee)}</div>` : r.k === "f" && r.wage ? `<div class="mvbig">${money(r.wage)}<small>/yr</small></div>` : "";
  const fromTo = (r.k === "t" || r.k === "f" || r.k === "h") && r.to ? `<div class="mvft"><span>${r.from ? crest(r.from, 32) + `<i>${esc(r.from)}</i>` : `<i>${r.k === "h" ? "" : "free agent"}</i>`}</span><span class="mvar">&rarr;</span><span>${crest(r.to, 32)}<i>${esc(r.to)}</i></span></div>` : r.k === "n" ? `<div class="mvft"><span>${flag(r.nation, 32)}<i>${esc(r.nation)}</i></span></div>` : (r.from || r.club) ? `<div class="mvft"><span>${crest(r.from || r.club, 32)}<i>${esc(r.from || r.club)}</i></span></div>` : "";
  const rating = r.ovr ? `${ovr(r.ovr)}` : "";
  return `<div class="hrv mvs"><div class="dim small">${esc(r.chapter)} &middot; ${r.n} of ${r.of}</div>
    <div class="hrv-n">${r.nat ? flag(r.nat, 24) : ""}<div><div class="hrv-name">${mvWho(r)} ${rating}</div><div class="dim small">${r.k === "p" || r.k === "t" || r.k === "f" || r.k === "r" ? mvPos(r) + " &middot; age " + r.age : "Coach &middot; age " + r.age}${r.nat ? " &middot; " + esc(r.nat) : ""}</div></div></div>
    ${fromTo}${money_}
    <div class="mvstory">${mvStory(r)}</div>
    <div class="mvtags">${r.evs && r.evs.length > 1 ? r.evs.map(mvTags).join("") : r.k === "h" && r.src === "acad" ? `<span class="tag gold">Academy manager gets his shot</span>` : `<span class="tag">${esc(r.kind)}</span>`}${mvTag(r.mv)}${r.rival ? `<span class="tag red">Rivals</span>` : ""}${r.hid ? `<span class="tag gold">Hall of Fame candidate</span>` : ""}</div>
    <div class="mvheat"><span class="dim small">Heat</span><div class="hbar"><i class="${r.hot >= 70 ? "g" : ""}" style="width:${r.hot}%"></i></div><b>${r.hot}</b></div></div>`;
}
function mvWalk(d) {
  const S = d.season, w = d.walk;
  if (!w || !w.length) { location.replace("#/moves/" + S + "/players"); return; }
  let i = Math.min(w.length - 1, Math.max(0, +sessionStorage.getItem("mvStart") || 0)); try { sessionStorage.removeItem("mvStart"); } catch (e) { }
  const chapters = []; w.forEach((r, k) => { if (!chapters.length || chapters[chapters.length - 1][0] !== r.chapter) chapters.push([r.chapter, k]); });
  const inFlow = STATUS.header.phase === "transfers";
  const draw = () => {
    const done = i >= w.length, r = w[i];
    const head = `<a class="crumb" href="#/moves/${S}/players">&lsaquo; Off-season moves</a><div class="hd"><div><div class="dim small">${mvSeasonLabel(d)}</div><h1>${done ? "That was the off-season" : esc(r.chapter)}</h1></div></div>
      <div class="stp">${chapters.map(([c, k], x) => `<span class="${!done && r.chapter === c ? "on" : ""}" data-c="${k}">${esc(c)}</span>`).join("")}</div>
      <div class="mvprog"><i style="width:${Math.round((Math.min(i, w.length)) / w.length * 100)}%"></i></div>`;
    let body;
    if (!done) body = mvSlide(r, i + 1, w.length) + `<div class="foot"><button class="btn" id="mw-back" ${i === 0 ? "disabled" : ""}>Back</button><button class="btn pri" id="mw-next">${i === w.length - 1 ? "Finish" : "Next move"}</button></div><div style="text-align:center;margin-top:8px"><button class="linkbtn" id="mw-skip">Skip this chapter</button></div>`;
    else {
      const c = d.counts;
      body = `<div class="mtiles"><a><b>${c.transfers}</b><span>transfers</span></a><a><b>${c.free}</b><span>free agents signed</span></a><a><b>${c.hired + c.fired + c.left}</b><span>coach moves</span></a><a><b>${c.retired}</b><span>retired</span></a></div>
        <div class="dim small" style="margin:8px 2px">Want more? Every move is in the tabs, sorted the way you like.</div>
        <div class="foot"><button class="btn" id="mw-back">Back</button><a class="btn pri" href="#/moves/${S}/players">Browse all moves</a></div>
        ${inFlow ? `<div style="text-align:center;margin-top:8px"><button class="linkbtn" id="mw-grad">Continue to graduates</button></div>` : ""}`;
    }
    $("#view").innerHTML = `<div class="v2 hday mvp">${head}${body}</div>`;
    const nx = $("#mw-next"), bk = $("#mw-back"), sk = $("#mw-skip"), gr = $("#mw-grad");
    if (nx) nx.onclick = () => { i++; draw(); window.scrollTo(0, 0); };
    if (bk) bk.onclick = () => { i = Math.max(0, i - 1); draw(); window.scrollTo(0, 0); };
    if (sk) sk.onclick = () => { const cur = r.chapter; while (i < w.length && w[i].chapter === cur) i++; draw(); window.scrollTo(0, 0); };
    if (gr) gr.onclick = () => flowStep("graduates");
    document.querySelectorAll(".stp [data-c]").forEach((s) => s.onclick = () => { i = +s.dataset.c; draw(); });
  };
  draw();
}
