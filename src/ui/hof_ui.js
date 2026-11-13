"use strict";
// v16 Hall of Fame pages: the Hall of Fame tab (World / Country / League / Club, players and coaches), a person's Hall of Fame page,
// the world induction day (final-year watch, the vote, who fell off), and a league's Hall of Fame day with its results.
// Loaded before app.js; the helpers it uses (api, esc, enc, flag, crest, emblem, clubLink, ...) are only touched when a page is drawn.

const HOF = { kind: "p", tab: "ind", ranked: false };
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
  else if (b.tier === "L" && b.scope) inner = compEmb(b.scope, { kind: "league_cup", color: `hsl(${hueOf(b.scope)} 62% 58%)` }, size - 8);   // the league's own logo, the cup only when it has none
  else if (b.tier === "K" && b.scope) inner = crest(b.scope, size - 10);
  else inner = `<i class="hb-s ${b.tier}"></i>`;
  const tip = HOF_LBL[b.tier] + " Hall of Fame" + (b.scope ? ": " + b.scope : "");
  return `<span class="hb ${b.tier}" style="width:${size}px;height:${size}px;--hc:${HOF_CLR[b.tier]}" title="${esc(tip)}">${inner}</span>`;
}
// <option>s for a long list of leagues: favourite leagues first (in their own group), then every league
function leagueOpts(list, cur) {
  const fav = (typeof FAVS !== "undefined" && FAVS ? FAVS : []).filter((k) => k.startsWith("L:")).map((k) => k.slice(2)).filter((n) => list.includes(n));
  const o = (n) => `<option value="${esc(n)}" ${n === cur ? "selected" : ""}>${esc(n)}</option>`;
  return fav.length ? `<optgroup label="Favourites">${fav.map(o).join("")}</optgroup><optgroup label="All leagues">${list.map(o).join("")}</optgroup>` : list.map(o).join("");
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

// needs attention: last chance first, then the closest to the pass mark. Time left and odds on every row.
const attnSort = (a, b) => (a.left - b.left) || (Math.abs(0.75 - a.pct) - Math.abs(0.75 - b.pct));
function attnRow(r, hall) {
  const tag = r.left === 0 ? "last chance" : r.left + (r.left === 1 ? " year left" : " years left");
  const p = r.pct != null ? r.pct : r.last;            // on ceremony day the vote is hidden: show last year's number
  const rt = p == null ? "" : (r.pct != null ? hofPct(p) : "last yr " + hofPct(p));
  return `<div class="hr attn"><div class="hr-a">${r.nat ? flag(r.nat, 18) : ""}<div class="hr-m"><b>${hofLink(r)}</b><span class="dim small">${hofSub(Object.assign({}, r, { n: 0 }))}${hall ? " &middot; " + esc(hall) : ""}</span></div><span class="tag red">${tag}</span><span class="hr-r">${rt}</span></div>${p != null ? `<div class="hbar"><i style="width:${Math.round(p * 100)}%"></i><u style="left:75%"></u></div>` : ""}</div>`;
}
function hofRankedList(d) {
  return `<div class="hlist">${d.classes.flatMap((c) => c.rows.map((r) => Object.assign({ cl: c.label }, r))).sort((a, b) => (b.score || 0) - (a.score || 0)).map((r, i) => hofRow(r, { right: (r.score != null ? r.score + " pts" : ""), sub: "#" + (i + 1) + " &middot; class of " + esc(r.cl) + " &middot; " + hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</div>`;
}
// pick which halls you follow: a searchable list (hundreds of clubs, over a hundred countries), starred ones first
function hofBrowse(tier, scopes, favS, current) {
  const lbl = tier === "L" ? "league" : tier === "C" ? "country" : "club";
  const sel = new Set(favS);
  openModal(`<div class="fp"><h2>${lbl.charAt(0).toUpperCase() + lbl.slice(1)} Halls of Fame</h2><div class="sub">Star the ones you want in your row. Tap a name to open its Hall of Fame.</div>
    <input id="hb-q" type="search" placeholder="Search ${lbl}s..." autocomplete="off" style="width:100%;min-height:44px;margin:6px 0">
    <div id="hb-list" class="hb-list"></div><div class="fp-foot"><button class="pri wide" id="hb-done">Done</button></div></div>`);
  const save = async () => { const arr = [...sel]; if (tier === "L") { const keep = (FAVS || []).filter((k) => !k.startsWith("L:")); await saveFavs([...keep, ...arr.map((n) => "L:" + n)]); } else if (tier === "C") await saveFavNations(arr); else await saveFavClubs(arr); };
  const draw = () => {
    const q = $("#hb-q").value.trim().toLowerCase();
    const list = scopes.filter((n) => !q || n.toLowerCase().includes(q)).sort((a, b) => (sel.has(b) - sel.has(a)) || a.localeCompare(b)).slice(0, 80);
    $("#hb-list").innerHTML = list.length ? list.map((n) => `<div class="hb-r"><button class="hb-n" data-o="${esc(n)}">${tier === "K" ? crest(n, 22) : tier === "C" ? natBadge(n, 22) : ""}<span>${esc(n)}</span></button><button class="star${sel.has(n) ? " on" : ""}" data-t="${esc(n)}" aria-pressed="${sel.has(n)}" aria-label="Follow ${esc(n)}">${starSvg(22)}</button></div>`).join("") : '<div class="dim small" style="padding:8px">Nothing matches.</div>';
    document.querySelectorAll("#hb-list [data-o]").forEach((b) => (b.onclick = () => { closeModal(); location.hash = "#/hof/" + tier + "/" + enc(b.dataset.o); }));
    document.querySelectorAll("#hb-list [data-t]").forEach((b) => (b.onclick = async () => { const n = b.dataset.t; if (sel.has(n)) sel.delete(n); else sel.add(n); try { await save(); } catch (e) { toast(e.message); } draw(); }));
  };
  $("#hb-q").oninput = draw; $("#hb-done").onclick = () => { closeModal(); route(); };
  draw();
}
// ---------------------------------------------------------------- the Hall of Fame tab
// every followed hall in one list: the World plus your countries, leagues and clubs, players and coaches, ranked by urgency
async function viewHofAttention() {
  if (FAVN === null) await loadFavNations();
  if (FAVC === null) await loadFavClubs();
  const halls = [["W", "", "World"]];
  (FAVN || []).forEach((n) => halls.push(["C", n, n]));
  (FAVS || []).filter((k) => k.startsWith("L:")).forEach((k) => halls.push(["L", k.slice(2), k.slice(2)]));
  (FAVC || []).forEach((n) => halls.push(["K", n, n]));
  const jobs = [];
  halls.forEach(([t, n, lbl]) => ["p", "c"].forEach((kind) => jobs.push(api("/api/hof?tier=" + t + "&kind=" + kind + (n ? "&name=" + enc(n) : "")).then((d) => d.watch.map((r) => Object.assign({}, r, { k: kind, hall: lbl + (kind === "c" ? " coaches" : "")}))).catch(() => []))));
  const all = (await Promise.all(jobs)).flat().sort(attnSort);
  const last = all.filter((r) => r.left === 0).length;
  $("#view").innerHTML = `<div class="v2 hof2"><h1>Hall of Fame</h1>
    ${hofSeg("data-tier", [["A", "Watch"], ["W", "World"], ["C", "Country"], ["L", "League"], ["K", "Club"]], "A")}
    <div class="dim small" style="margin:10px 2px">Needs attention: two years or fewer left on a ballot, across the World and the ${halls.length - 1} ${halls.length === 2 ? "hall" : "halls"} you follow. ${last ? `${last} on their last chance.` : ""} The line marks the 75% needed.</div>
    ${all.length ? `<div class="hlist">${all.map((r) => attnRow(r, r.hall)).join("")}</div>` : `<div class="card dim small">Nobody is running out of time right now.</div>`}
    <div class="dim small" style="margin:12px 2px">Follow more countries, leagues and clubs in their own tabs to watch their halls here.</div></div>`;
  document.querySelectorAll("[data-tier]").forEach((b) => (b.onclick = () => (location.hash = "#/hof/" + b.dataset.tier)));
}
async function viewHof(tier, name) {
  if (tier === "A") return viewHofAttention();
  tier = ["W", "C", "L", "K"].includes(tier) ? tier : "W";
  const d = await api("/api/hof?tier=" + tier + "&kind=" + HOF.kind + (name ? "&name=" + enc(name) : ""));
  const opts = d.options;
  const favLeagues = (FAVS || []).filter((k) => k.startsWith("L:")).map((k) => k.slice(2));
  if (FAVN === null) await loadFavNations();
  const favNats = (FAVN || []).filter((n) => opts.nations.includes(n));
  if (FAVC === null) await loadFavClubs();
  const favClubs = (FAVC || []).filter((n) => opts.clubs.includes(n));
  if (tier !== "W" && !name) {
    const first = tier === "L" ? (favLeagues[0] || opts.leagues[0]) : tier === "C" ? (favNats[0] || opts.nations[0] || "") : (favClubs[0] || "");
    if (first) { location.replace("#/hof/" + tier + "/" + enc(first)); return; }
  }
  const noScope = tier === "K" && !name;                 // no club followed yet: ask the player to pick, instead of dropping them on an arbitrary club
  const scopes = tier === "L" ? opts.leagues : tier === "C" ? opts.nations : tier === "K" ? opts.clubs : [];
  const favS = tier === "L" ? favLeagues : tier === "C" ? favNats : tier === "K" ? favClubs : [];
  const mine = name && !favS.includes(name) ? [name, ...favS] : favS;
  const lblS = tier === "L" ? "league" : tier === "C" ? "country" : "club";
  const scopeSel = tier === "W" ? "" : `<div class="hof-mine" aria-label="Your ${lblS} halls"><span class="dim small">My ${lblS} halls</span><div class="chips">${mine.map((n) => `<button data-hscope="${esc(n)}" class="${n === name ? "on" : ""}">${esc(n)}</button>`).join("")}<button class="hadd" id="hof-browse">&#43; Browse</button></div></div>`;
  const tabs = [["ind", "Inductees"], ["bal", "Ballot"], ["watch", "Watch"], ["snub", "Snubs"], ["rec", "Records"]];
  const tab = HOF.tab;
  let body = "";
  const people = HOF.kind === "c" ? "coaches" : "players";
  if (tab === "ind") {
    const ctl = "";
    const rankedOn = !!HOF.ranked && d.classes.length;
    const showSel = d.classes.length > 1 && !rankedOn ? `<select id="hexp-sel" aria-label="Classes shown">${[["ten", "Show last 10"], ["one", "Latest only"], ["all", "Show all"], ["none", "Collapse all"]].map(([k, t]) => `<option value="${k}" ${(HOF.open || "ten") === k ? "selected" : ""}>${t}</option>`).join("")}</select>` : "";
    const viewSw = d.classes.length ? `<div class="hof-ctl">${hofSeg("data-hrank", [["0", "By class"], ["1", "Ranked"]], rankedOn ? "1" : "0")}${showSel}</div>` : "";
    const ranked = rankedOn ? `<div class="dim small" style="margin:8px 2px">Everyone in this hall, ranked by their score for it: awards, titles and peak rating.</div><div class="hlist">${d.classes.flatMap((c) => c.rows.map((r) => Object.assign({ cl: c.label }, r))).sort((a, b) => (b.score || 0) - (a.score || 0)).map((r, i) => hofRow(r, { right: (r.score != null ? r.score + " pts" : ""), sub: "#" + (i + 1) + " &middot; class of " + esc(r.cl) + " &middot; " + hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</div>` : "";
    body = rankedOn ? viewSw + ranked : d.classes.length ? viewSw + ctl + d.classes.map((c, i) => `<details class="hcls" ${i < (HOF.open === "all" ? 999 : HOF.open === "none" ? 0 : HOF.open === "one" ? 1 : 10) ? "open" : ""}><summary><b>Class of ${esc(c.label)}</b><span class="dim small">${c.rows.length} inducted</span></summary>${c.rows.map((r) => hofRow(r, { right: r.n === 1 ? "first ballot" : "year " + r.n, sub: hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</details>`).join("")
      : `<div class="card dim small">No ${people} in this hall yet. People become eligible ${d.cfg.wait} years after they retire.</div>`;
  } else if (tab === "bal") {
    body = d.ballot.length ? `<div class="dim small" style="margin:0 2px 8px">${esc(d.ballot_label)} vote &middot; ${Math.round(d.cfg.pass * 100)}% to get in &middot; up to ${d.cfg.window} years on the ballot</div><div class="hlist">${d.ballot.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left <= 1 ? (r.left === 0 ? "last year" : "1 year left") : "", tagc: "red" })).join("")}</div>`
      : `<div class="card dim small">Nobody is on this ballot right now.</div>`;
  } else if (tab === "watch") {
    body = d.watch.length ? `<div class="dim small" style="margin:0 2px 8px">Running out of time: two years or fewer left on the ballot.</div><div class="hlist">${d.watch.map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left === 0 ? "last year" : r.left + " left", tagc: "red" })).join("")}</div>` : `<div class="card dim small">Nobody is close to running out of time.</div>`;
  } else if (tab === "snub") {
    const list = (tier === "W" || tier === "C") && HOF.kind === "p" ? d.snubs : [];
    body = (list.length ? `<div class="dim small" style="margin:0 2px 8px">Great careers that fell off the ballot without being voted in.</div><div class="hlist">${list.map((r) => hofRow(Object.assign({ still: false, k: "p" }, r), { sub: `${esc(r.pos || "")} &middot; ${esc(r.nat)} &middot; peak ${r.peak} &middot; score ${Math.round((tier === "C" ? r.C : r.W) * 10) / 10}`, right: "off " + r.y })).join("")}</div>` : "")
      + (d.dropped.length ? `<h2 class="lbl2">Came off the ballot</h2><div class="hlist">${d.dropped.map((r) => hofRow(r, { right: r.why === "time" ? "ten years" : "no support", sub: hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</div>` : "")
      || `<div class="card dim small">Nobody has fallen off the ballot yet.</div>`;
  } else {
    body = d.records.length ? `<div class="card" style="margin-top:0">${d.records.map((r) => `<div class="row"><span>${esc(r.label)}</span><span class="dim small" style="text-align:right">${r.id ? `<a href="#/hofcard/${esc(r.id)}">${esc(r.value)}</a>` : esc(r.value)}</span></div>`).join("")}</div>` : `<div class="card dim small">Records appear once someone is inducted.</div>`;
  }
  if (noScope) body = `<div class="card dim small">No club followed yet. There are hundreds of club Halls of Fame, so pick the ones you care about: tap <b>Browse</b>, search a club and star it.</div>`;
  $("#view").innerHTML = `<div class="v2 hof2"><h1>Hall of Fame</h1>
    ${hofSeg("data-tier", [["A", "Watch"], ["W", "World"], ["C", "Country"], ["L", "League"], ["K", "Club"]], tier)}
    <div class="hof-ctl">${scopeSel}${hofSeg("data-kind", [["p", "Players"], ["c", "Coaches"]], HOF.kind)}</div>
    <div class="hof-sc">${HOF_LBL[tier]}${name ? " &middot; " + esc(name) : ""} <span class="dim small">&middot; ${d.total} ${people} inducted</span>${tier === "K" && name ? ` <button class="star${favClubs.includes(name) ? " on" : ""}" id="hof-favc" aria-pressed="${favClubs.includes(name)}" aria-label="Follow ${esc(name)}">${starSvg(20)}</button>` : tier === "C" && name ? " " + favNatBtn(name, favNats.includes(name)) : tier === "L" && name ? ` <button class="star${favLeagues.includes(name) ? " on" : ""}" id="hof-favl" aria-pressed="${favLeagues.includes(name)}" aria-label="Follow ${esc(name)}">${starSvg(20)}</button>` : ""}</div>
    <nav class="chips hof-tabs five">${tabs.map(([k, t]) => `<button data-htab="${k}" class="${k === tab ? "on" : ""}">${t}</button>`).join("")}</nav>
    ${body}
</div>`;
  document.querySelectorAll("[data-tier]").forEach((b) => (b.onclick = () => (location.hash = "#/hof/" + b.dataset.tier)));
  document.querySelectorAll("[data-kind]").forEach((b) => (b.onclick = () => { HOF.kind = b.dataset.kind; route(); }));
  const hs = $("#hexp-sel"); if (hs) hs.onchange = () => { HOF.open = hs.value; document.querySelectorAll("details.hcls").forEach((el, i) => { el.open = HOF.open === "all" || (HOF.open === "ten" && i < 10) || (HOF.open === "one" && i < 1); }); };
  document.querySelectorAll("[data-htab]").forEach((b) => (b.onclick = () => { HOF.tab = b.dataset.htab; route(); }));
  document.querySelectorAll("[data-hrank]").forEach((b) => (b.onclick = () => { HOF.ranked = b.dataset.hrank === "1"; route(); }));
  wireFavNat();
  const fc = $("#hof-favc"); if (fc) fc.onclick = async () => { const cur = new Set(FAVC || []); if (cur.has(name)) cur.delete(name); else cur.add(name); try { await saveFavClubs([...cur]); } catch (e) { toast(e.message); return; } route(); };
  document.querySelectorAll("[data-hscope]").forEach((b) => (b.onclick = () => (location.hash = "#/hof/" + tier + "/" + enc(b.dataset.hscope))));
  const hb = $("#hof-browse"); if (hb) hb.onclick = () => hofBrowse(tier, scopes, favS, name);
  const fl = $("#hof-favl"); if (fl) fl.onclick = async () => { const cur = new Set(FAVS || []), k = "L:" + name; if (cur.has(k)) cur.delete(k); else cur.add(k); try { await saveFavs([...cur]); } catch (e) { toast(e.message); return; } route(); };
}

// ---------------------------------------------------------------- halls on the club, league and nation pages
// one hall as a card: how many are in, the latest class, a link to the full hall (and the ballot, ceremony results...)
// one place for every hall: any "check the candidates" button opens the main Hall of Fame on that hall's ballot
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-hgo]"); if (!b) return;
  e.preventDefault(); const [t, n, tab] = b.dataset.hgo.split("|");
  HOF.tab = tab || "bal"; const h = "#/hof/" + t + (n ? "/" + enc(n) : "");
  if (location.hash === h) route(); else location.hash = h;
});
// a capped look at a hall: the latest class first, then the best of all time (by the hall's own score)
function hofCapped(d, n) {
  n = n || 3;
  const recent = d.classes.slice(0, 2).flatMap((c) => c.rows.map((r) => Object.assign({}, r, { why: "class of " + c.label }))).slice(0, n);
  const ids = new Set(recent.map((r) => r.id));
  const best = d.classes.flatMap((c) => c.rows).slice().sort((a, b) => (b.score || 0) - (a.score || 0)).filter((r) => !ids.has(r.id)).slice(0, n).map((r) => Object.assign({}, r, { why: "all-time best" }));
  return { recent, best };
}
const hofCappedHTML = (d, label) => {
  const { recent, best } = hofCapped(d, 3);
  const list = (rows, h) => rows.length ? `<div class="dim small" style="margin:8px 0 2px">${h}</div><div class="hlist">${rows.map((r) => hofRow(r, { right: r.score != null ? r.score + " pts" : "", sub: hofSub(Object.assign({}, r, { n: 0 })) })).join("")}</div>` : "";
  return recent.length ? list(recent, "Latest " + label) + list(best, "Best of all time") : `<div class="dim small" style="margin:8px 0 2px">Nobody inducted yet. People become eligible ${d.cfg.wait} years after they retire.</div>`;
};
async function hallCardHTML(tier, name, title, extra) {
  const q = (kind) => api("/api/hof?tier=" + tier + "&kind=" + kind + "&name=" + enc(name)).catch(() => null);
  const [p, c] = await Promise.all([q("p"), q("c")]);
  if (!p) return "";
  const latest = hofCappedHTML(p, "players"), coaches = c && c.classes.length ? hofCappedHTML(c, "coaches").replace(/Best of all time/, "Best coaches") : "";
  return `<div class="card"><h3>${hofBadge({ tier, scope: name }, 22)} ${esc(title)} <small>${p.total} players &middot; ${c ? c.total : 0} coaches</small></h3>${extra || ""}${latest}${coaches}
    <a class="more" data-hgo="${tier}|${esc(name)}|ind"><span>Open in the Hall of Fame</span><span>&rsaquo;</span></a>
    <a class="more" data-hgo="${tier}|${esc(name)}|bal"><span>Check the candidates</span><span>&rsaquo;</span></a></div>`;
}
async function hallPanel(sel, halls) {
  const el = $(sel); if (!el) return;
  el.innerHTML = `<div class="dim small" style="padding:14px 2px">Loading...</div>`;
  const parts = await Promise.all(halls.map((h) => hallCardHTML(h.tier, h.name, h.title, h.extra)));
  el.innerHTML = parts.join("") || `<div class="card dim small">No Hall of Fame here yet.</div>`;
}
// the countries whose Hall of Fame the player follows (the World page card and the star on a nation)
let FAVN = null, FAVC = null;
async function loadFavClubs() { try { FAVC = (await api("/api/favclubs")).clubs; } catch (e) { FAVC = []; } return FAVC; }
async function saveFavClubs(list) { const r = await api("/api/favclubs", { set: list }); FAVC = r.clubs; favMemSet("clubs", FAVC); return FAVC; }
async function loadFavNations() { try { FAVN = (await api("/api/favnations")).nations; } catch (e) { FAVN = []; } return FAVN; }
async function saveFavNations(list) { const r = await api("/api/favnations", { set: list }); FAVN = r.nations; favMemSet("nations", FAVN); return FAVN; }
const favNatBtn = (nat, on) => `<button class="star${on ? " on" : ""}" data-favn="${esc(nat)}" aria-pressed="${on}" aria-label="${on ? "Stop following" : "Follow"} the ${esc(nat)} Hall of Fame" title="${on ? "Following this Hall of Fame" : "Follow this Hall of Fame on the World page"}">${starSvg(20)}</button>`;
function wireFavNat(after) {
  document.querySelectorAll("[data-favn]").forEach((b) => (b.onclick = async () => {
    const cur = new Set(FAVN || []), k = b.dataset.favn; if (cur.has(k)) cur.delete(k); else cur.add(k);
    try { await saveFavNations([...cur]); } catch (e) { toast(e.message); return; }
    if (after) await after(); else await route();
  }));
}
// World page card: the followed countries, each with its hall at a glance, and a picker to follow more
async function worldHallsCard(sel) {
  const el = $(sel); if (!el) return;
  const [fav, all] = await Promise.all([loadFavNations(), api("/api/nations")]);
  const names = all.rows.map((r) => r.name).sort();
  const infos = await Promise.all(fav.map((n) => api("/api/hof?tier=C&kind=p&name=" + enc(n)).then((d) => ({ n, d })).catch(() => ({ n, d: null }))));
  const row = ({ n, d }) => { const cl = d && d.classes[0]; return `<div class="row prg"><span class="rl">${favNatBtn(n, true)}<span class="rt"><a href="#/hof/C/${enc(n)}">${natBadge(n, 18)} ${esc(n)}</a><div class="meta">${d ? d.total + " inducted" + (cl ? " &middot; latest: " + cl.rows.slice(0, 2).map((r) => esc(r.name)).join(", ") + (cl.rows.length > 2 ? " +" + (cl.rows.length - 2) : "") + " (" + esc(cl.label) + ")" : "") : ""}</div></span></span><a class="dim small" href="#/hof/C/${enc(n)}">open &rsaquo;</a></div>`; };
  el.innerHTML = `<div class="card"><h3>Country Halls of Fame <small>${fav.length ? "the ones you follow" : "follow the countries you care about"}</small></h3>
    ${infos.map(row).join("") || `<div class="meta">Nothing followed yet. Each country has its own Hall of Fame; pick the ones you want here so you do not get all ${names.length}.</div>`}
    <div style="display:flex;gap:8px;margin-top:10px"><select id="wh-add" aria-label="Follow a country" style="flex:1"><option value="">Follow a country...</option>${names.filter((n) => !fav.includes(n)).map((n) => `<option>${esc(n)}</option>`).join("")}</select><a class="btn" href="#/hof/C">Browse all</a></div></div>`;
  wireFavNat(() => worldHallsCard(sel));
  const add = $("#wh-add"); if (add) add.onchange = async () => { if (!add.value) return; try { await saveFavNations([...fav, add.value]); } catch (e) { toast(e.message); return; } worldHallsCard(sel); };
}

// ---------------------------------------------------------------- one person's Hall of Fame page
// the four halls as rows: every hall he is in or up for (a player can be in several league and club halls), the tier's own row when none
function hofChainRows(ch, size) {
  return ["W", "C", "L", "K"].map((t) => {
    const items = (ch.by && ch.by[t] && ch.by[t].length) ? ch.by[t] : (ch[t] ? [ch[t]] : []);
    if (!items.length) return `<div class="hch">${hofBadge({ tier: t, scope: null }, size)}<div class="hch-m"><b>${HOF_LBL[t]}</b><span class="small">${HOF_ST(null)}</span></div></div>`;
    return items.map((it) => `<div class="hch ${it.status === "in" ? "in" : ""}">${hofBadge({ tier: t, scope: it.scope }, size)}<div class="hch-m"><b>${HOF_LBL[t]}</b><span class="small">${HOF_ST(it)}${it.scope ? ` <span class="dim small">${esc(it.scope)}</span>` : ""}</span></div></div>`).join("");
  }).join("");
}
const HOF_ST = (it, c) => {
  if (!it) return `<span class="dim">Not nominated</span>`;
  if (it.status === "in") return `<b class="gold">Inducted ${esc(it.label)}</b>${it.via === "world" ? ` <span class="dim small">with the world</span>` : ""}`;
  if (it.status === "ballot") return `On the ballot, year ${it.n || 0} of 10`;
  return `<span class="dim">Fell off the ballot</span>`;
};
// the career stepper of a coach: one line per spell at a club, an academy or a nation
function coachStintsHTML(stints) {
  return `<div class="hstep">${stints.map((x) => `<div class="hs"><i></i><div><b>${x.kind === "acad" ? "Academy manager, " + clubLink(x.team) : x.kind === "nat" ? natLink(x.team) : clubLink(x.team)}</b><div class="dim small">${x.est ? "earlier career" : (x.from || "") + (x.to ? " to " + x.to : " to now")} &middot; ${x.seasons} seasons${x.titles ? " &middot; " + x.titles + " titles" : ""}${x.cups ? " &middot; " + x.cups + " cups" : ""}${x.wc ? " &middot; World Cup" : ""}</div></div></div>`).join("")}</div>`;
}
// the page of any coach, working or retired (#/coach/<id>)
async function viewCoach(id) {
  const c = await api("/api/coach?id=" + enc(id)), s = c.stats, j = c.job;
  const job = j.kind === "club" ? `Head coach, ${clubLink(j.team)}` : j.kind === "acad" ? `Academy manager, ${clubLink(j.team)}` : j.kind === "nation" ? `National team coach, ${natLink(j.team)}` : j.kind === "retired" ? `Retired${j.team ? ", last at " + clubLink(j.team) : ""}` : "Without a job";
  const grp = {}; c.honours.forEach((h) => { (grp[h.title] = grp[h.title] || []).push(h.label); });
  const hon = Object.entries(grp);
  $("#view").innerHTML = `<div class="v2">${heroBlock(c.nat, natBadge(c.nat, 200), `<span class="sbox">${flag(c.nat, 56)}</span>`, esc(c.name), `<div class="sub">${job} &middot; ${natLink(c.nat)} &middot; age ${c.age}</div>`)}
    <div class="stat4"><div><b>${s.seasons}</b><span>SEASONS</span></div><div><b>${s.win}%</b><span>WIN RATE</span></div><div><b>${s.titles}</b><span>LEAGUE TITLES</span></div><div><b>${s.cups + s.cwc}</b><span>CUPS</span></div></div>
    <div class="card"><h3>Profile</h3><div class="row"><span>Record</span><span class="dim">${s.w} W &middot; ${s.d} D &middot; ${s.l} L</span></div>
      <div class="row"><span>Prestige</span><span class="dim">${c.prestige}</span></div><div class="row"><span>Style</span><span class="dim">${esc(c.personality)}${c.skill && c.skill !== "none" ? " / " + esc(c.skill) : ""}</span></div>
      ${s.cwc ? `<div class="row"><span>Club World Cups</span><span class="dim">${s.cwc}</span></div>` : ""}</div>
    <div class="card"><h3>Coaching career <small>${s.seasons} seasons &middot; ${s.titles} league titles &middot; ${s.cups} continental cups</small></h3>${coachStintsHTML(c.stints)}</div>
    ${hon.length ? `<div class="card"><h3>Honours</h3>${hon.map(([t, ys]) => `<div class="row"><span>${esc(t)}${ys.length > 1 ? " x" + ys.length : ""}</span><span class="meta">${ys.join(", ")}</span></div>`).join("")}</div>` : ""}
    ${c.hid ? `<a class="more" href="#/hofcard/${esc(c.hid)}"><span>Hall of Fame page</span><span>&rsaquo;</span></a>` : ""}</div>`;
}
async function viewHofCard(id) {
  const c = await api("/api/hofcard?id=" + enc(id)), ch = c.chain;
  const rows = hofChainRows(ch, 24);
  const veto = ch.veto ? `<div class="hveto">${esc(ch.veto.text)}</div>` : "";
  let tail = "";
  if (c.k === "p") {
    const hon = {}; for (const h of c.honours) { const k = h.kind === "award" ? h.title : h.kind === "league" ? "League titles" : h.kind === "cup" ? "Continental and club cups" : h.kind === "world" ? "World Cups" : h.kind === "contin" ? "Continental championships" : h.kind === "nl" ? "Nations League" : h.title; hon[k] = (hon[k] || 0) + 1; }
    const seasons = c.career.length, clubs = [...new Set(c.career.map((r) => r.club).filter(Boolean))];
    tail = `<div class="card"><h3>Career <small>${seasons} seasons &middot; peak ${c.peak}</small></h3>
      <div class="dim small">${clubs.map((x) => clubLink(x)).join(" &rarr; ")}</div>
      <div class="hhon">${Object.entries(hon).map(([k, v]) => `<span class="tag">${v}&times; ${esc(k)}</span>`).join(" ")}</div>
      ${c.trn ? `<div class="dim small" style="margin-top:8px">Academy graduate of ${clubLink(c.trn)}</div>` : ""}${c.under && c.under.length ? `<div class="dim small" style="margin-top:8px">Played under ${c.under.map((u) => `${coachLink(u.cid, u.name)} (${clubLink(u.club)}, S${u.from}${u.to !== u.from ? "-S" + u.to : ""})`).join(", ")}</div>` : ""}
      ${c.nat_rec ? `<div class="dim small" style="margin-top:8px">For ${esc(c.nat)}: ${c.nat_rec.seasons} seasons of national-team football, ${c.nat_rec.g + c.nat_rec.a} goals and assists${c.nat_rec.world ? ", " + c.nat_rec.world + " World Cup" + (c.nat_rec.world > 1 ? "s" : "") : ""}</div>` : ""}</div>`;
  } else {
    const s = c.stats;
    tail = `<div class="card"><h3>Coaching career <small>${s.seasons} seasons &middot; ${s.titles} league titles &middot; ${s.cups} continental cups</small></h3>
      ${coachStintsHTML(c.stints)}</div></div>`;
  }
  $("#view").innerHTML = `<div class="v2">${heroBlock(c.nat, natBadge(c.nat, 200), `<span class="sbox">${flag(c.nat, 56)}</span>`, esc(c.name), `<div class="sub">${c.k === "c" ? "Coach" : esc(c.pos || "")} &middot; ${natLink(c.nat)} &middot; retired ${esc(c.retired)}</div>`)}
    <div class="dim small" style="margin-bottom:8px">${esc(c.line)}</div>
    <div class="card"><h3>The four halls</h3><div class="hchain">${rows}</div>${veto}</div>${tail}
    ${c.uid && c.has_page ? `<a class="more" href="#/player/${c.uid}"><span>Full player page</span><span>&rsaquo;</span></a>` : ""}</div>`;
}
// the block on a player's page
function hofPlayerBlock(h) {
  if (!h) return "";
  const ch = h.chain, rows = hofChainRows(ch, 22);
  return `<div class="card"><h3>Hall of Fame <small><a href="#/hofcard/${esc(h.id)}">full page</a></small></h3><div class="hchain">${rows}</div>${ch.veto ? `<div class="hveto">${esc(ch.veto.text)}</div>` : ""}</div>`;
}

// ---------------------------------------------------------------- reveal card, shared by both ceremonies
function hofReveal(e, scopeText, idx, n, icon) {
  const an = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches), pc = Math.round(e.pct * 100);
  return `<div class="hrv${an ? " live" : ""}"><div class="hrv-sc">${icon || ""}<div class="dim small">${esc(scopeText)}${n ? ` &middot; ${idx + 1} of ${n}` : ""}</div></div>
    <div class="hrv-n">${flag(e.nat, 34)}<div><div class="hrv-name">${esc(e.name)}</div><div class="dim small">${hofSub(Object.assign({}, e, { n: 0 }))}</div></div></div>
    <div class="hrv-p"><span class="dim small">${e.via === "world" ? "With his World induction" : e.n === 1 ? "First ballot" : "Year " + e.n + " on the ballot"}</span><b class="hrv-pct" data-p="${pc}">${hofPct(e.pct)}</b></div>
    <div class="hbar big"><i class="g" style="width:${pc}%"></i><u style="left:75%"></u></div>
    <div class="dim small hrv-need">${e.via === "world" ? "The federation honours the world's inductees (World vote shown)" : "75% of the votes are needed"}</div>
    ${e.both ? `<div class="dim small" style="margin-top:8px">${esc(e.both)} vote: <b>${hofPct(e.bothPct)}</b></div><div class="hbar"><i class="g" style="width:${Math.round(e.bothPct * 100)}%"></i><u style="left:75%"></u></div>` : ""}
    <div class="dim small">${esc(e.line || "")}</div>
    <div class="hrv-v"><span class="tag gold">${e.both ? "Inducted into both" : "Inducted"}</span> ${hofBadge(e.tier ? { tier: e.tier, scope: e.scope || null } : (e.badge || { tier: "W" }), 26)}${e.both ? " " + hofBadge({ tier: "L", scope: e.both }, 26) : ""}</div></div>`;
}
// the vote counts up and the verdict lands last (CSS does the bar and the stamp; this only counts the number)
function hofCount() {
  const el = document.querySelector(".hrv.live .hrv-pct"); if (!el) return;
  const to = +el.dataset.p, t0 = performance.now(), D = 1500;
  const step = (t) => { if (!el.isConnected) return; const k = Math.min(1, (t - t0) / D); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + "%"; if (k < 1) requestAnimationFrame(step); };
  el.textContent = "0%"; requestAnimationFrame(step);
}

// ---------------------------------------------------------------- world induction day
// ONE Hall of Fame stage. The gate shows nothing of the results; "play" runs every ceremony in turn (the world, then each country and league you follow);
// "results" is the one page that holds everything. Nothing here sends you to a league or country page.
const hofHalls = (d) => [{ k: "W", name: "World" }].concat((d.favs || []).map((f) => ({ k: f.kind === "league" ? "L" : "C", name: f.name })));
async function viewHofDay(season, sub, idx) {
  const S = season || STATUS.header.season - (STATUS.header.flow ? 0 : 1);
  const d = await api("/api/hofday?season=" + S);
  if (sub === "watch") { sub = "play"; idx = 0; }
  if (sub === "play") return hofPlay(d, S, Math.max(0, +idx || 0));
  if (sub === "results") return hofResults(d, S);
  const halls = hofHalls(d);
  $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/ceremony/${S}">&lsaquo; Awards &middot; Season ${S}</a>
    <div class="hd"><div><h1>Hall of Fame day</h1><div class="sub">Class of ${esc(d.label)}</div></div></div>
    <div class="hintro"><div class="hi-k">${halls.length} ${halls.length === 1 ? "hall votes" : "halls vote"} today</div>
      <div class="hi-halls">${halls.map((h) => `<span class="tag">${esc(h.name)}</span>`).join("")}</div>
      <div class="dim small" style="margin:10px 0">The world votes first, then each country and league you follow. Every presentation plays here, one hall after another.</div>
      <div class="hi-b"><a class="btn pri" href="#/hofday/${S}/play/0">Play the ceremonies</a></div>
      <div class="hi-b" style="margin-top:8px"><a class="btn" href="#/hofday/${S}/results">Skip to results</a></div></div>
    <a class="more" data-hgo="W||bal"><span>Check the candidates</span><span>&rsaquo;</span></a></div>`;
}
async function hofResults(d, S) {
  if (HOFSEEN !== S) { HOFSEEN = S; api("/api/hofseen", { season: S }).then(() => refreshStatus()).catch(() => {}); }
  const list = (arr, o) => arr.length ? `<div class="hlist">${arr.map((r) => hofRow(r, o(r))).join("")}</div>` : "";
  const ind = d.inducted.concat(d.coaches.inducted);
  const fav = await Promise.all((d.favs || []).map(async (f) => {
    try {
      if (f.kind === "league") { const x = await api("/api/hofleague?league=" + enc(f.name) + "&season=" + S); if (!x.ready) return { f, rows: [], none: "The vote happens when this league's season finishes." }; return { f, rows: x.league_ind.concat(x.clubs.flatMap((c) => c.inducted.map((e) => Object.assign({}, e, { club: c.club })))) }; }
      const x = await api("/api/hofnation?nation=" + enc(f.name) + "&season=" + S); return { f, rows: x.inducted };
    } catch (e) { return { f, rows: [], none: "" }; }
  }));
  const favHTML = (f, rows, none) => `<h2 class="lbl2">${esc(f.name)} Hall of Fame</h2>${rows.length ? list(rows.slice(0, 8), (r) => ({ right: r.via === "world" ? "with the world" : hofPct(r.pct), bar: r.via === "world" ? null : r.pct, gold: true, sub: hofSub(Object.assign({}, r, { n: 0 })) + (r.club ? " &middot; " + esc(r.club) : "") })) + (rows.length > 8 ? `<div class="dim small" style="margin:6px 2px">and ${rows.length - 8} more</div>` : "") : `<div class="card dim small">${esc(none || "Nobody inducted this year.")}</div>`}
    <a class="more" data-hgo="${f.kind === "league" ? "L" : "C"}|${esc(f.name)}|bal"><span>Check the ${esc(f.name)} candidates</span><span>&rsaquo;</span></a>`;
  const worldHTML = `<div class="hintro"><div class="hi-k">World Hall of Fame</div><div class="hi-n"><div><b>${d.inducted.length}</b><span>players in</span></div><div><b>${d.coaches.inducted.length}</b><span>coaches in</span></div><div><b>${d.fell.length + d.coaches.fell.length}</b><span>fell off</span></div></div></div>
    <h2 class="lbl2">World: inducted</h2>${ind.length ? list(ind, (r) => ({ right: hofPct(r.pct), bar: r.pct, gold: true })) : `<div class="card dim small">Nobody reached ${Math.round(d.cfg.pass * 100)}% this year.</div>`}
    ${d.vetoes.map((v) => `<div class="hveto"><b>${esc(v.nat)} did not honour ${esc(v.name)}.</b> ${esc(v.text.replace(/^.*?Federation veto: /, "Federation veto: "))}</div>`).join("")}
    ${d.missed.length ? `<h2 class="lbl2">World: missed out</h2>${list(d.missed, (r) => ({ right: hofPct(r.pct), bar: r.pct, tag: r.left === 0 ? "last year" : r.left === 1 ? "1 year left" : "", tagc: "red" }))}` : ""}
    ${d.fell.length ? `<h2 class="lbl2">World: fell off the ballot</h2>${list(d.fell, (r) => ({ right: r.why === "time" ? "ten years" : "no support" }))}` : ""}
    <a class="more" data-hgo="W||ind"><span>Open the Hall of Fame</span><span>&rsaquo;</span></a>`;
  const panes = [{ name: "World", html: worldHTML }].concat(fav.map(({ f, rows, none }) => ({ name: f.name, html: favHTML(f, rows, none) })));
  const inFlow = !!(STATUS.header.flow && STATUS.header.phase === "awards");
  const draw = (cur) => {
    $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/ceremony/${S}">&lsaquo; Awards &middot; Season ${S}</a>
      <div class="hd"><div><h1>Hall of Fame results</h1><div class="sub">Class of ${esc(d.label)}</div></div></div>
      ${inFlow ? `<div class="foot top"><button class="btn pri" id="hr-go">Continue to off-season</button></div>` : ""}
      ${panes.length > 1 ? `<nav class="chips hof-mine" aria-label="My halls">${panes.map((x, i) => `<button data-hp="${i}" class="${i === cur ? "on" : ""}">${esc(x.name)}</button>`).join("")}</nav>` : ""}
      ${panes[cur].html}
</div>`;
    document.querySelectorAll("[data-hp]").forEach((b) => (b.onclick = () => { draw(+b.dataset.hp); window.scrollTo(0, 0); }));
    const go = $("#hr-go"); if (go) go.onclick = () => flowStep("graduates");
  };
  draw(0);
}
// where we are in the day: every hall in order, done ones ticked, the current one lit
const hofHallSteps = (chain) => chain && chain.names ? `<div class="hstp" aria-label="Halls today">${chain.names.map((n, k) => `<span class="${k < chain.idx ? "done" : k === chain.idx ? "on" : ""}"${k === chain.idx ? ' aria-current="step"' : ""}>${k < chain.idx ? "&#10003; " : ""}${esc(n)}</span>`).join("")}</div>` : "";
// play hall number idx of today's list; the last one ends on the results page
async function hofPlay(d, S, idx) {
  const halls = hofHalls(d);
  if (idx >= halls.length) { location.replace("#/hofday/" + S + "/results"); return; }
  const h = halls[idx], nx = halls[idx + 1];
  const chain = { S, idx, n: halls.length, name: h.name, names: halls.map((x) => x.name), next: nx ? `#/hofday/${S}/play/${idx + 1}` : `#/hofday/${S}/results`, label: nx ? "Next hall: " + nx.name : "Results" };
  if (h.k === "W") return hofDayWatch(d, chain);
  if (h.k === "L") return viewHofLeague(h.name, S, "watch", null, chain);
  return viewHofNation(h.name, S, "watch", chain);
}
function hofDayWatch(d, chain) {
  chain = chain || { S: d.season, idx: 0, n: 1, name: "World", next: "#/hofday/" + d.season + "/results", label: "Results" };
  const S = d.season, steps = ["Watch", "Vote", "Fell off"];
  let step = d.watch.length ? 0 : 1, i = 0;
  const ind = d.inducted.concat(d.coaches.inducted).sort((a, b) => a.pct - b.pct);
  const head = (t) => `<a class="crumb" href="#/hofday/${S}">&lsaquo; Hall of Fame day</a><div class="hd"><div><div class="dim small">World Hall of Fame &middot; class of ${esc(d.label)} &middot; hall ${chain.idx + 1} of ${chain.n}</div><h1>${t}</h1></div></div>
    <div class="stp">${steps.map((s, k) => `<span class="${k === step ? "on" : ""}">${k + 1} ${s}</span>`).join("")}</div>`;
  const draw = () => {
    let h;
    if (step === 0) {
      h = head("Final-year watch") + `<div class="dim small" style="margin:8px 2px">Running out of time, most urgent first. The line marks the 75% needed.</div>
        <div class="hlist">${d.watch.slice().sort(attnSort).map((r) => attnRow(r, "")).join("")}</div>
        <div class="foot"><button class="btn" id="hd-skip">Skip this hall</button><button class="btn pri" id="hd-next">The vote</button></div>`;
    } else if (step === 1) {
      if (i < ind.length) {
        const e = ind[i];
        h = head("The vote") + `<div class="dim small" style="margin:8px 2px">${ind.length} inducted, revealed from the lowest vote up.</div>${hofReveal(Object.assign({}, e, { tier: "W" }), (e.k === "c" ? "World Hall of Fame · coach" : "World Hall of Fame"), i, ind.length, hofBadge({ tier: "W" }, 30))}
          <div class="foot"><button class="btn" id="hd-skip">Skip this hall</button><button class="btn pri" id="hd-next">${i === ind.length - 1 ? "Summary" : "Next"}</button></div>`;
      } else {
        h = head("The vote: summary") + `<h2 class="lbl2">Inducted</h2>${ind.length ? `<div class="hlist">${ind.slice().reverse().map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, gold: true })).join("")}</div>` : '<div class="card dim small">Nobody reached 75% this year.</div>'}
          ${d.vetoes.map((v) => `<div class="hveto"><b>${esc(v.nat)} did not honour ${esc(v.name)}.</b> ${esc(v.text.replace(/^.*?Federation veto: /, "Federation veto: "))}</div>`).join("")}
          ${d.missed.length ? `<h2 class="lbl2">Missed out</h2><div class="hlist">${d.missed.slice(0, 4).map((r) => hofRow(r, { right: hofPct(r.pct), tag: r.left === 0 ? "last year" : r.left === 1 ? "1 year left" : "", tagc: "red" })).join("")}</div>` : ""}
          
          <div class="foot"><button class="btn" id="hd-back">Back</button><button class="btn pri" id="hd-next">Who fell off</button></div>`;
      }
    } else {
      h = head("Fell off the ballot") + (d.fell.length ? `<div class="dim small" style="margin:8px 2px">Their time is up. They keep their other halls.</div><div class="hlist">${d.fell.map((r) => hofRow(r, { right: r.why === "time" ? "ten years" : "no support", sub: `${hofSub(Object.assign({}, r, { n: 0 }))} &middot; ${esc(r.line)}` })).join("")}</div>` : '<div class="card dim small">Nobody fell off the world ballot this year.</div>')
        + `<div class="foot"><button class="btn" id="hd-back">Back</button><a class="btn pri" href="${chain.next}">${esc(chain.label)}</a></div>`;
    }
    // the buttons sit under the title so a whole ceremony can be clicked through without scrolling
    const fm = /<div class="foot">[\s\S]*?<\/div>\s*$/.exec(h);
    if (fm) { const top = fm[0].replace('class="foot"', 'class="foot top"'); h = h.slice(0, fm.index); const k = h.indexOf('<div class="stp">'); const e = k >= 0 ? h.indexOf("</div>", k) + 6 : -1; h = e > 0 ? h.slice(0, e) + hofHallSteps(chain) + top + h.slice(e) : top + h; }
    $("#view").innerHTML = `<div class="v2 hday">${h}</div>`; hofCount();
    const nx = $("#hd-next"), sk = $("#hd-skip"), bk = $("#hd-back");
    if (nx) nx.onclick = () => { if (step === 0) { step = 1; i = 0; } else if (step === 1) { if (i < ind.length) i++; else step = 2; } draw(); window.scrollTo(0, 0); };
    if (sk) sk.onclick = () => { location.hash = chain.next; };
    if (bk) bk.onclick = () => { if (step === 2) { step = 1; i = ind.length; } else { i = Math.max(0, ind.length - 1); } draw(); };
  };
  draw();
}

// ---------------------------------------------------------------- a league's Hall of Fame day
const HLG = { tab: "league" };
async function viewHofLeague(league, season, sub, club, chain) {
  const d = await api("/api/hofleague?league=" + enc(league) + (season ? "&season=" + season : ""));
  if (!d.ready && chain) { location.replace(chain.next); return; }
  if (!d.ready) { $("#view").innerHTML = `<div class="v2"><a class="crumb" href="#/league/${enc(league)}">&lsaquo; ${esc(league)}</a><h1>Hall of Fame day</h1><div class="card dim small">The vote happens when the ${esc(league)} season finishes.</div></div>`; return; }
  if (sub === "watch") return hofLeagueWatch(d, chain);
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
// One Hall of Fame day as a ceremony: opening, each inductee in turn (the vote counts up, then the verdict), the class and what is left.
// cfg: { title, sub, logo(size), items: [{ e, scope, icon, phase }], counts: [[n, label]...], blurb, back, results, hall, tail (html for the class page), start }
function hofCeremony(cfg) {
  const items = cfg.items;
  let i = cfg.start === "class" ? items.length : -1;
  const draw = () => {
    const last = i >= items.length;
    let body, foot;
    if (i < 0) {
      body = `<div class="hday-open"><div class="hday-logo">${cfg.logo(84)}</div><div class="eyebrow gold">Hall of Fame day</div><h1 style="margin:6px 0">${esc(cfg.title)}</h1><div class="dim">${esc(cfg.sub)}</div>
        <div class="hday-n">${cfg.counts.map(([n, t]) => `<div><b>${n}</b><span>${esc(t)}</span></div>`).join("")}</div>
        <div class="dim small">${items.length ? esc(cfg.blurb) : "Nobody was inducted this year."}</div></div>`;
      foot = items.length ? `<button class="btn" id="hc-skip">Skip this hall</button><button class="btn pri" id="hc-next">Begin</button>` : `<a class="btn pri" href="${cfg.end[1]}">${esc(cfg.end[0])}</a>`;
    } else if (!last) {
      const it = items[i], nxt = items[i + 1];
      body = `<div class="dim small" style="margin:8px 2px">${esc(it.phase || "")}${i === items.length - 1 && items.length > 1 ? " &middot; the final name" : ""}</div>${hofReveal(it.e, it.scope, i, items.length, it.icon)}`;
      foot = `<button class="btn" id="hc-skip">Skip this hall</button><button class="btn pri" id="hc-next">${nxt ? (nxt.phase !== it.phase && nxt.phase ? esc(nxt.phase) : "Next") : "The class"}</button>`;
    } else {
      body = `<div class="card" style="text-align:center;padding:22px 14px"><div class="hday-logo">${cfg.logo(56)}</div><div class="eyebrow gold">${items.length ? "That is the class" : "No class this year"}</div><div style="font-size:18px;font-weight:700;margin:8px 0">${esc(cfg.counts.map(([n, t]) => n + " " + t).join(" and "))}</div></div>
        ${items.length ? `<div class="hlist">${items.slice().reverse().map((it) => hofRow(Object.assign({}, it.e, { badge: { tier: it.e.tier, scope: it.e.scope } }), { right: it.e.via === "world" ? "with the world" : hofPct(it.e.pct), bar: it.e.via === "world" ? 0 : it.e.pct, gold: true, sub: esc(it.scope) })).join("")}</div>` : ""}
        ${cfg.tail || ""}`;
      foot = `<a class="btn pri" href="${cfg.end[1]}">${esc(cfg.end[0])}</a>`;
    }
    $("#view").innerHTML = `<div class="v2 hday"><a class="crumb" href="${cfg.back}">${esc(cfg.backLabel)}</a><div class="hd"><div><div class="dim small">${esc(cfg.title)} &middot; ${esc(cfg.sub)}${cfg.chain ? " &middot; hall " + (cfg.chain.idx + 1) + " of " + cfg.chain.n : ""}</div><h1>Hall of Fame day</h1></div></div>${hofHallSteps(cfg.chain)}<div class="foot top">${foot}</div>${body}</div>`;
    hofCount();
    const cur = document.querySelector(".hstp .on"); if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: "center", block: "nearest" });
    const nx = $("#hc-next"); if (nx) nx.onclick = () => { i++; draw(); window.scrollTo(0, 0); };
    const sk = $("#hc-skip"); if (sk) sk.onclick = () => { if (cfg.chain) { location.hash = cfg.end[1]; return; } i = items.length; draw(); window.scrollTo(0, 0); };
  };
  draw();
}
function hofLeagueWatch(d, chain) {
  const lg = d.league, spec = { kind: "league_cup", color: `hsl(${hueOf(lg)} 62% 58%)` }, items = [];
  for (const c of d.clubs) for (const e of c.inducted) items.push({ e: Object.assign({}, e, { tier: "K", scope: c.club }), scope: c.club + " Hall of Fame" + (e.k === "c" ? " · coach" : ""), icon: crest(c.club, 30), phase: "The club halls" });
  // one card for a name voted into both his club hall and the league hall (matched by id, else name and nation)
  const idOf = (e) => (e.id != null ? "i" + e.id : e.pid != null ? "i" + e.pid : e.cid != null ? "c" + e.cid : (e.k || "p") + "|" + e.name + "|" + (e.nat || ""));
  const clubItem = new Map(items.map((it) => [idOf(it.e), it]));
  for (const e of d.league_ind.slice().sort((a, b) => a.pct - b.pct)) {
    const both = clubItem.get(idOf(e));
    if (both) { both.scope += " and " + lg + " Hall of Fame"; both.phase = "Inducted into both"; both.e.both = lg; both.e.bothPct = e.pct; continue; }
    items.push({ e: Object.assign({}, e, { tier: "L", scope: lg }), scope: lg + " Hall of Fame" + (e.k === "c" ? " · coach" : ""), icon: compEmb(lg, spec, 30), phase: "The league hall" });
  }
  items.sort((a, b) => (a.phase === "Inducted into both" ? 1 : 0) - (b.phase === "Inducted into both" ? 1 : 0) || 0);
  const res = `#/hofleague/${enc(lg)}/${d.season}`;
  hofCeremony({ title: lg, sub: d.label, logo: (n) => compEmb(lg, spec, n), items, counts: [[d.nClubs, "club inductees"], [d.nLeague, "league inductees"]], blurb: "The clubs vote first, then the league. Each name needs 75% of the votes.",
    chain, back: chain ? "#/hofday/" + chain.S : res, backLabel: chain ? "‹ Hall of Fame day" : "‹ Results", results: res, end: chain ? [chain.label, chain.next] : ["Results", res], hall: `#/hof/L/${enc(lg)}`, hallLabel: "League hall",
    tail: d.ballot.length ? `<h2 class="lbl2">Still on the league ballot</h2><div class="hlist">${d.ballot.slice(0, 4).map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left <= 1 ? (r.left === 0 ? "last year" : "1 year left") : "", tagc: "red" })).join("")}</div>` : "" });
}
// a country's day: the federation honours this year's world inductees, then its own vote
async function viewHofNation(nat, season, sub, chain) {
  const d = await api("/api/hofnation?nation=" + enc(nat) + "&season=" + (season || STATUS.header.season));
  const items = [], res = `#/hofnation/${enc(nat)}/${d.season}`;
  for (const e of d.inducted.filter((x) => x.via === "world").sort((a, b) => a.pct - b.pct)) items.push({ e, scope: nat + " Hall of Fame · with the world", icon: natBadge(nat, 30), phase: "Honoured with the World class" });
  for (const e of d.inducted.filter((x) => x.via !== "world").sort((a, b) => a.pct - b.pct)) items.push({ e, scope: nat + " Hall of Fame" + (e.k === "c" ? " · coach" : ""), icon: natBadge(nat, 30), phase: "The country's own vote" });
  const vetoes = d.vetoes.map((v) => `<div class="hveto"><b>${esc(v.nat)} did not honour ${esc(v.name)}.</b> ${esc(v.text.replace(/^.*?Federation veto: /, "Federation veto: "))}</div>`).join("");
  hofCeremony({ title: nat, sub: d.label, logo: (n) => natBadge(nat, n), items, counts: [[d.nWorld, "honoured with the world"], [d.nOwn, "by the country's own vote"]], blurb: "The federation honours the world's inductees first, then the country votes. Each name on the ballot needs 75%.",
    chain, back: "#/hofday/" + d.season, backLabel: "‹ Hall of Fame day", results: res, end: chain ? [chain.label, chain.next] : ["Hall of Fame day", "#/hofday/" + d.season], hall: `#/hof/C/${enc(nat)}`, hallLabel: nat + " hall",
    start: sub === "watch" ? "open" : "class",
    tail: vetoes + (d.ballot.length ? `<h2 class="lbl2">Still on the ballot</h2><div class="hlist">${d.ballot.slice(0, 4).map((r) => hofRow(r, { right: hofPct(r.pct), bar: r.pct, tag: r.left <= 1 ? (r.left === 0 ? "last year" : "1 year left") : "", tagc: "red" })).join("")}</div>` : "") });
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
  const sel = scope === "world" ? "" : `<select id="ac-sel">${scope === "league" ? leagueOpts(d.leagues, name) : d.confeds.map((n) => `<option ${n === name ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  $("#view").innerHTML = `<div class="v2">${plTabs("academies")}<h1>Academies</h1><div class="sub">Ranked by prestige: what their graduates became.</div>
    ${hofSeg("data-acs", [["world", "World"], ["continent", "Continent"], ["league", "League"]], scope)}
    <div class="hof-ctl">${sel}${hofSeg("data-acsort", [["prestige", "Top"], ["rising", "Rising"], ["under", "Underachievers"]], ACV.sort)}</div>
    <div class="hlist" style="margin-top:10px">${rows.length ? rows.map((r) => `<a class="hr hr-link" href="#/club/${enc(r.club)}" data-acad="1"><div class="hr-a"><span class="rk">${r.rank}</span>${crest(r.club, 26)}<div class="hr-m"><b>${esc(r.club)}</b><span class="dim small">level ${r.level} &middot; ${r.stars} stars &middot; ${r.graduates} graduates</span></div>${r.rising > 1 ? '<span class="tag green">rising</span>' : ""}${r.under ? '<span class="tag red">spent a lot</span>' : ""}<span class="hr-r">${Math.round(r.prestige)}</span></div><div class="hbar"><i style="width:${Math.min(100, r.prestige)}%"></i></div></a>`).join("") : '<div class="card dim small" style="margin:0">Nobody fits yet.</div>'}</div></div>`;
  document.querySelectorAll("[data-acs]").forEach((b) => (b.onclick = () => (location.hash = "#/academies/" + b.dataset.acs)));
  document.querySelectorAll("[data-acsort]").forEach((b) => (b.onclick = () => { ACV.sort = b.dataset.acsort; route(); }));
  document.querySelectorAll("[data-acad]").forEach((a) => (a.onclick = () => { CV_OPEN = "acad"; }));
  const s2 = $("#ac-sel"); if (s2) s2.onchange = () => (location.hash = "#/academies/" + scope + "/" + enc(s2.value));
}
