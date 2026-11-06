// v15.2 pages: league page with tabs, continent pages for every confederation, and competition pages (History and Stats)
// for every continental cup, national cup, Nations League, the World Cup and the Club World Cup.
// Loaded before app.js; every helper it uses (api, esc, enc, clubLink, natLink, money, ...) lives in app.js and is only touched when a page is drawn.

const LGS = {};            // league page state per league: tab, stats view
const STS = {};            // stats pane state per competition key
let CV_OPEN = null;         // a tab to open on the next club page (league Money -> club Finance)
const STCACHE = {};        // fetched all-time stats, cleared when the world changes
let STCACHE_FOR = null;

const famKey = (cid) => { const p = String(cid).split(":"); return p[0] === "C" ? "cup:" + p[1] : p[0] === "CWC" ? "cwc" : p[0] === "WC" ? "wc" : p[0] === "CT" ? "ct:" + p[2] : p[0] === "NL" ? "nl:" + p[2] : null; };
const shortTeam = (n) => String(n || "");
const pc = (x) => Math.round(x * 100);
const crumbHTML = (parts) => `<div class="crumbs dim small" style="min-height:30px;display:flex;align-items:center;flex-wrap:wrap">${parts.join("&nbsp;›&nbsp;")}</div>`;

// ---------------------------------------------------------------- shared stats pane (all time / per season)
function plRow(i, rank, name, sub, big, small, bar) {
  return `<div class="pl"><span class="rk ${rank === 1 ? "g" : rank === 2 ? "s" : rank === 3 ? "b" : ""}">${rank}</span><div class="m"><b>${name}</b><span>${sub}</span>${bar != null ? `<div class="pb"><i style="width:${Math.max(3, bar)}%"></i></div>` : ""}</div><div class="v"><b>${big}</b><span>${small}</span></div></div>`;
}
function chipRow(attr, list, cur) { return `<nav class="chips" aria-label="Statistic">${list.map(([k, t]) => `<button ${attr}="${k}" class="${k === cur ? "on" : ""}">${t}</button>`).join("")}</nav>`; }
function recRow(label, r, withTeam) {
  if (!r) return "";
  return `<div class="rec"><div class="m"><b>${label}</b><span>${r.who.map((x) => `${esc(x.name)}, ${esc(shortTeam(x.team))} (S${x.season})`).join(" · ")}</span></div><span class="n">${r.v}</span></div>`;
}
const ALL_CHIPS = [["goals", "Goals"], ["assists", "Assists"], ["cs", "Clean sheets"], ["golden", "Golden Boots"], ["coaches", "Coaches"]];
const SEASON_CHIPS = [["scorers", "Scorers"], ["assists", "Assists"], ["keepers", "Clean sheets"], ["mvp", "MVP"], ["coach", "Coaches"]];

function allTimeHTML(a, st, o) {
  if (!a.editions) return `<div class="card"><div class="dim small">Statistics appear once a full ${o.unit} has been played.</div></div>`;
  const t = a.top, ch = st.chip;
  const hero = t ? `<div class="card hero"><h3>All-time top scorer <small>${a.editions} ${a.editions === 1 ? o.unit : o.unit + "s"}</small></h3>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><div><div class="big"><a href="#/player/${t.uid}">${esc(t.name)}</a></div><div class="dim small">${esc(t.nat)} · ${t.teams.map(esc).join(", ")}</div></div>
      <div style="text-align:right"><div class="big gold">${t.goals}</div><div class="dim small">goals</div></div></div>
      <div class="two" style="margin-top:10px"><div>Assists<span>${t.assists}</span></div><div>${o.unit === "season" ? "Seasons" : "Editions"}<span>${t.editions}</span></div><div>Best ${o.unit}<span>${t.best.goals} (S${t.best.season})</span></div><div>Golden Boots<span>${t.golden}${t.golden ? " (" + t.golden_seasons.map((s) => "S" + s).join(", ") + ")" : ""}</span></div></div></div>` : "";
  const list = ch === "goals" ? a.goals : ch === "assists" ? a.assists : ch === "cs" ? a.cs : ch === "golden" ? a.golden : a.coaches;
  const lim = st.more ? list.length : 20;
  const top = list.length ? (ch === "coaches" ? Math.max(1, list[0].titles) : Math.max(1, list[0][ch === "cs" ? "cs" : ch === "golden" ? "golden" : ch])) : 1;
  const rows = list.slice(0, lim).map((p) => {
    if (ch === "coaches") return plRow(0, p.rank, esc(p.name), `${esc(p.nat || "")}${p.team ? " · " + esc(p.team) : ""}${p.awards ? " · " + p.awards + (p.awards === 1 ? " coach award" : " coach awards") : ""}`, p.titles, p.titles === 1 ? "title" : "titles", p.titles ? p.titles / top * 100 : 3);
    const nm = `<a href="#/player/${p.uid}">${esc(p.name)}</a>`, sub = `${esc(p.nat)} · ${p.teams.map(esc).join(", ")}`;
    if (ch === "goals") return plRow(0, p.rank, nm, sub, p.goals, p.assists + " ast", p.goals / top * 100);
    if (ch === "assists") return plRow(0, p.rank, nm, sub, p.assists, p.goals + " goals", p.assists / top * 100);
    if (ch === "cs") return plRow(0, p.rank, nm, sub, p.cs, p.editions + (p.editions === 1 ? " " + o.unit : " " + o.unit + "s"), p.cs / top * 100);
    return plRow(0, p.rank, nm, sub + " · " + p.golden_seasons.map((s) => "S" + s).join(", "), p.golden, p.goals + " goals", p.golden / top * 100);
  }).join("");
  const title = { goals: "Top scorers of all time", assists: "Most assists of all time", cs: "Most clean sheets", golden: "Golden Boot winners", coaches: "Coaches" }[ch];
  const rec = a.records;
  return `${hero}${chipRow("data-ach", ALL_CHIPS, ch)}
    <div class="card" style="margin-top:4px"><h3>${title} <small>top ${Math.min(lim, list.length)}</small></h3>${rows || '<div class="dim small">Nothing yet.</div>'}
      ${list.length > 20 ? `<button class="btn sm" id="st-more" style="margin-top:8px">${st.more ? "Show fewer" : "Show " + (list.length - 20) + " more"}</button>` : ""}</div>
    ${rec.goals || rec.assists || rec.cs ? `<div class="card"><h3>Single-${o.unit} records</h3>${recRow("Most goals", rec.goals)}${recRow("Most assists", rec.assists)}${recRow("Most clean sheets", rec.cs)}</div>` : ""}
    ${a.boots.length ? `<div class="card"><h3>Golden Boot winners <small>top scorer each ${o.unit}</small></h3>${a.boots.map((b) => `<div class="row"><span class="l"><span class="rk">${b.season}</span><span><a href="#/player/${b.uid}">${esc(b.name)}</a> <span class="dim small">${esc(b.team)}</span></span></span><b class="gold">${b.goals}</b></div>`).join("")}</div>` : ""}
    <div class="dim small" style="margin-top:12px;line-height:1.45">${esc(a.note)} Pick Per ${o.unit} to see any one in full: scorers, assists, clean sheets, MVP and coach.</div>`;
}
function seasonHTML(s, st, o) {
  if (!s) return `<div class="card"><div class="dim small">No statistics were stored for this ${o.unit}.</div></div>`;
  const ch = st.schip, tm = (n) => (o.nation ? natLink(n) : clubLink(n)), t = (s.scorers || [])[0];
  const live = st.season === "now", lab = live ? `Season ${o.nowSeason} so far` : `Season ${st.season} ${s.done === false ? "" : "final"}`;
  const coach = (s.coach || [])[0];
  const hero = `<div class="card hero"><h3>${lab} <small>Golden Boot${s.mvp && s.mvp.length ? " and MVP" : ""}</small></h3>${t ? `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><div><div class="big"><a href="#/player/${t.uid}">${esc(t.name)}</a></div><div class="dim small">${esc(t.nat)} · ${esc(t.team)} · ${esc(t.pos)}</div></div><div style="text-align:right"><div class="big gold">${t.goals}</div><div class="dim small">goals</div></div></div>` : `<div class="dim small">No goals yet.</div>`}
      <div class="two" style="margin-top:10px"><div>${o.champLabel}<span>${esc(s.winner || "-")}</span></div><div>${o.unit === "season" ? "Coach of the season" : "Coach of the " + o.unit}<span>${coach ? esc(coach.name) : "-"}</span></div></div></div>`;
  const list = (ch === "scorers" ? s.scorers : ch === "assists" ? s.assists : ch === "keepers" ? s.keepers : ch === "mvp" ? s.mvp : s.coach) || [];
  const top = list.length ? Math.max(1, ch === "scorers" ? list[0].goals : ch === "assists" ? list[0].assists : ch === "keepers" ? list[0].cs : ch === "mvp" ? list[0].pts : 1) : 1;
  const rows = list.map((p, i) => {
    if (ch === "coach") return plRow(0, i + 1, esc(p.name), `${esc(p.nat || "")} · ${tm(p.team)}`, i === 0 ? "Best" : "", "", null);
    const nm = `<a href="#/player/${p.uid}">${esc(p.name)}</a>`, sub = `${tm(p.team)} · ${esc(p.nat)} · age ${p.age} · <b>${p.ovr}</b>`;
    if (ch === "scorers") return plRow(0, i + 1, nm, sub, p.goals, p.assists + " ast", p.goals / top * 100);
    if (ch === "assists") return plRow(0, i + 1, nm, sub, p.assists, p.goals + " goals", p.assists / top * 100);
    if (ch === "keepers") return plRow(0, i + 1, nm, sub, p.cs, "clean sheets", p.cs / top * 100);
    return plRow(0, i + 1, nm, sub, p.pts, p.goals + "g " + p.assists + "a", p.pts / top * 100);
  }).join("");
  const title = { scorers: "Top scorers", assists: "Most assists", keepers: "Clean sheets", mvp: "Most valuable players", coach: "Coaches of the " + o.unit }[ch];
  return `${hero}${chipRow("data-sch", SEASON_CHIPS, ch)}<div class="card" style="margin-top:4px"><h3>${title}, ${live ? "season " + o.nowSeason : "season " + st.season} <small>top ${list.length}</small></h3>${rows || '<div class="dim small">Nothing yet.</div>'}</div>`;
}
// o: { key, el, unit: "season"|"edition", nation, allUrl, seasons: [{season, cid}] newest first, now: cid|null, nowSeason, champLabel }
async function statsPane(o) {
  const st = STS[o.key] || (STS[o.key] = { mode: "all", chip: "goals", schip: "scorers", season: null, more: false });
  if (st.season == null || (st.season === "now" && !o.now)) st.season = o.seasons.length ? o.seasons[0].season : (o.now ? "now" : null);   // newest finished one first; "now" is empty right after a rollover
  const el = o.el;
  const draw = async () => {
    const seg = `<div class="sg2" role="group" aria-label="Stats period"><button data-sm="all" class="${st.mode === "all" ? "on" : ""}">All time</button><button data-sm="season" class="${st.mode === "season" ? "on" : ""}">Per ${o.unit}</button></div>`;
    let body = "";
    el.innerHTML = seg + '<div class="dim small" style="padding:14px 0">Loading...</div>';
    try {
      if (st.mode === "all") {
        const a = STCACHE[o.allUrl] || (STCACHE[o.allUrl] = await api(o.allUrl));
        body = allTimeHTML(a, st, o);
      } else {
        const chips = `<nav class="chips" aria-label="${o.unit}">${o.now ? `<button data-ss="now" class="${st.season === "now" ? "on" : ""}">S${o.nowSeason} now</button>` : ""}${o.seasons.map((x) => `<button data-ss="${x.season}" class="${String(st.season) === String(x.season) ? "on" : ""}">S${x.season}${x.winner ? " " + esc(x.winner) : ""}</button>`).join("")}</nav>`;
        let s = null;
        if (st.season === "now") s = await api("/api/compstats?id=" + enc(o.now)).catch(() => null);
        else if (st.season != null) { const e = o.seasons.find((x) => String(x.season) === String(st.season)); if (e && e.stats !== false) s = await api("/api/compstats?id=" + enc(e.cid) + "&season=" + e.season).catch(() => null); }
        body = (o.seasons.length || o.now ? chips : "") + seasonHTML(s, st, o);
      }
    } catch (e) { body = `<div class="card"><div class="dim small">${esc(e.message)}</div></div>`; }
    el.innerHTML = seg + body;
    el.querySelectorAll("[data-sm]").forEach((b) => (b.onclick = () => { st.mode = b.dataset.sm; draw(); }));
    el.querySelectorAll("[data-ach]").forEach((b) => (b.onclick = () => { st.chip = b.dataset.ach; st.more = false; draw(); }));
    el.querySelectorAll("[data-sch]").forEach((b) => (b.onclick = () => { st.schip = b.dataset.sch; draw(); }));
    el.querySelectorAll("[data-ss]").forEach((b) => (b.onclick = () => { st.season = b.dataset.ss === "now" ? "now" : +b.dataset.ss; draw(); }));
    const mb = el.querySelector("#st-more"); if (mb) mb.onclick = () => { st.more = !st.more; draw(); };
  };
  await draw();
}

// ---------------------------------------------------------------- competition cards (continent and world pages)
const mostTxt = (c) => !c.most ? "None yet" : (c.winners_n === c.editions_n && c.most.n === 1) ? `${c.winners_n} winner${c.winners_n === 1 ? "" : "s"}${c.winners_n > 1 ? ", 1 each" : ""}` : c.most.names.length > 2 ? `${c.most.names.length} ${c.scope === "clubs" ? "clubs" : "nations"}, ${c.most.n} each` : `${c.most.names.map(esc).join(", ")}, ${c.most.n}`;
const everyTxt = (c) => (c.every === 1 ? "every season" : "every 4 years");
function compCard(c) {
  const cur = c.current, hd = c.holder, lk = c.scope === "clubs" ? clubLink : natLink;
  let status = "", prog = "";
  if (cur) {
    const fin = cur.total > 0 && cur.done >= cur.total;
    status = `<div class="st"><span>Season ${cur.season}: ${fin ? "finished" : cur.next ? esc(cur.next) + (cur.next_date ? " · " + esc(cur.next_date.text) : "") : "in progress"}</span><span>${cur.done} of ${cur.total}</span></div><div class="bar"><i style="width:${cur.total ? Math.round(cur.done / cur.total * 100) : 0}%"></i></div>`;
  } else status = `<div class="st"><span>Between tournaments${c.next_label ? " · next in " + esc(c.next_label) : ""}</span><span>${c.editions_n} played</span></div>`;
  return `<div class="cc"><div class="t"><span class="cem">${compEmb(c.title, c.emblem, 38)}</span><div class="m"><b>${esc(c.title)}</b><span><span class="tag ${c.scope === "clubs" ? "blue" : "gold"}">${c.scope === "clubs" ? "Clubs" : "National teams"}</span> · ${everyTxt(c)}</span></div></div>
    ${status}
    <div class="kv"><div><span>HOLDERS</span><b>${hd ? lk(hd.name) : "None yet"}</b></div><div><span>MOST TITLES</span><b>${mostTxt(c)}</b></div></div>
    <a class="go" href="#/c/${enc(c.key)}"><span>${cur ? "Current edition, history and stats" : "History, winners and stats"}</span><span>&rsaquo;</span></a></div>`;
}

// ---------------------------------------------------------------- continent page
async function viewContinent(code) {
  const [c, hub] = await Promise.all([api("/api/continent?code=" + code), api("/api/comphub").catch(() => ({ cards: [] }))]);
  const ids = [...c.leagues.map((l) => "L:" + l.name), ...c.comps.map((x) => x.id)];
  const cards = hub.cards.filter((x) => x.confed === code);
  const quals = c.comps.filter((x) => x.kind === "qual");
  const sections = { ov: ["Overview"], co: ["Competitions"], lg: ["Leagues"] };
  const clubsN = c.leagues.reduce((a, l) => a + l.clubs, 0);
  const compsHTML = `<h2 class="lbl2">Competitions</h2>${cards.length ? cards.map(compCard).join("") : '<div class="card"><div class="dim small">This confederation has no tournaments yet.</div></div>'}
    ${quals.length ? `<div class="card"><h3>World Cup qualifying</h3>${quals.map((x) => progressRow({ link: `<a href="#/comp/${enc(x.id)}">${esc(x.title)}</a>`, sub: x.next ? "next: " + esc(x.next) + (x.next_date ? " · " + x.next_date.text : "") : "finished", done: x.done, total: x.total })).join("")}</div>` : ""}`;
  const leaguesHTML = `<h2 class="lbl2">Leagues</h2><div class="card" style="margin-top:0">${c.leagues.map((l) => `<a class="lg" href="#/league/${enc(l.name)}"><div class="t"><span>${logoBox("leagues", l.name, 20)} ${esc(l.name)}</span><span class="dim small">${l.done} / ${l.total}</span></div><div class="s"><span>Leader ${esc(l.leader)} · ${l.pts} pts</span><span>OVR ${l.avg}</span></div><div class="bar"><i style="width:${l.total ? Math.round(l.done / l.total * 100) : 0}%"></i></div></a>`).join("")}</div>
    <a class="more" href="#/nations/${code}"><span>National teams of ${esc(c.name)}</span><span>&rsaquo;</span></a>`;
  const tab = (location.hash.split("/")[3] || "ov");
  $("#view").innerHTML = `<div class="v2">${crumbHTML([`<a href="#/world">World</a>`, esc(code)])}
    <div style="display:flex;align-items:center;gap:12px"><span class="crest big-c">${esc(code)}</span><div><h1>${esc(code)}</h1><div class="sub">${esc(c.name)} · ${c.leagues.length} league${c.leagues.length === 1 ? "" : "s"} · ${c.nations} national teams</div></div></div>
    <div class="stat4"><div><b>${c.leagues.length}</b><span>LEAGUES</span></div><div><b>${clubsN}</b><span>CLUBS</span></div><div><b>${c.nations}</b><span>NATIONS</span></div><div><b>${cards.length}</b><span>COMPETITIONS</span></div></div>
    <nav class="tabs2" id="cn-tabs" aria-label="${esc(c.name)} sections"><button data-cn="ov" class="${tab === "ov" ? "on" : ""}">Overview</button><button data-cn="co" class="${tab === "co" ? "on" : ""}">Competitions</button><button data-cn="lg" class="${tab === "lg" ? "on" : ""}">Leagues</button><a href="#/nations/${code}">Nations</a></nav>
    <div id="cn-sim" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px"><button class="btn" data-w="1">Next week</button><button class="btn" data-w="4">4 weeks</button><button class="btn pri" id="c-end">To season end</button></div>
    <div id="cn-ov">${compsHTML}${leaguesHTML}</div><div id="cn-co" hidden>${compsHTML}</div><div id="cn-lg" hidden>${leaguesHTML}</div></div>`;
  const show = (t) => { document.querySelectorAll("#cn-tabs [data-cn]").forEach((b) => b.classList.toggle("on", b.dataset.cn === t)); ["ov", "co", "lg"].forEach((k) => { $("#cn-" + k).hidden = k !== t; }); $("#cn-sim").hidden = t === "co"; };
  document.querySelectorAll("#cn-tabs [data-cn]").forEach((b) => (b.onclick = () => show(b.dataset.cn)));
  show(["co", "lg"].includes(tab) ? tab : "ov");
  document.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => simIds(ids, { weeks: +b.dataset.w })));
  $("#c-end").onclick = () => simIds(ids, { to_end: true });
}
// the World page also lists the two global tournaments
async function worldCompCards() {
  const hub = await api("/api/comphub").catch(() => null);
  if (!hub) return;
  const cards = hub.cards.filter((x) => x.confed === "WORLD");
  if (!cards.length || !$("#view") || !$("#view").querySelector(".grid")) return;
  $("#view").insertAdjacentHTML("beforeend", `<div class="v2"><h2 class="lbl2">World competitions</h2>${cards.map(compCard).join("")}</div>`);
}

// ---------------------------------------------------------------- competition page: History and Stats tabs
function compTabsHTML(key, tab, current) {
  const now = current ? `<a href="#/comp/${enc(current)}" class="${tab === "now" ? "on" : ""}">This season</a>` : `<b class="off">This season</b>`;
  return `<nav class="tabs2" aria-label="Competition sections">${now}<a href="#/c/${enc(key)}/history" class="${tab === "history" ? "on" : ""}">History</a><a href="#/c/${enc(key)}/stats" class="${tab === "stats" ? "on" : ""}">Stats</a></nav>`;
}
const ordinalSeasons = (a) => a.map((s) => "S" + s).join(" · ");
async function viewCompPage(key, tab) {
  const h = await api("/api/comphist?key=" + enc(key));
  const nation = h.nation, lk = nation ? natLink : clubLink, unit = h.every === 1 ? "season" : "edition";
  const k = h.kind, cf = h.confed;
  const sub = k === "cup" ? `${esc(cf)} clubs · knockout cup · every season` : k === "cwc" ? "Continental champions and the best clubs · every four years" : k === "wc" ? "National teams from every confederation · every four years" : k === "ct" ? `${esc(cf)} national teams · every four years · group stage then knockout` : `${esc(cf)} national teams · every four years`;
  const cur = h.current;
  const stat4 = `<div class="stat4"><div><b>${h.editions_n}</b><span>${h.every === 1 ? "SEASONS" : "EDITIONS"}</span></div><div><b>${h.winners_n}</b><span>WINNERS</span></div><div><b>${h.top_titles}</b><span>MOST TITLES</span></div><div><b>${cur ? "S" + cur.season : h.next_label ? esc(h.next_label) : "-"}</b><span>${cur ? "NOW" : "NEXT"}</span></div></div>`;
  const crumb = [`<a href="#/world">World</a>`];
  if (cf !== "WORLD") crumb.push(`<a href="#/continent/${esc(cf)}">${esc(cf)}</a>`);
  crumb.push(esc(h.title));
  $("#view").innerHTML = `<div class="v2">${crumbHTML(crumb)}
    <div style="display:flex;align-items:center;gap:12px"><span class="cem big-e">${compEmb(h.title, h.emblem, 48)}</span><div><h1>${esc(h.title)}</h1><div class="sub">${sub}</div></div></div>
    ${stat4}${compTabsHTML(key, tab, cur && cur.cid)}<div id="cp-body"></div></div>`;
  const body = $("#cp-body");
  if (tab === "stats") {
    if (STCACHE_FOR !== SIM_TAG()) { for (const x of Object.keys(STCACHE)) delete STCACHE[x]; STCACHE_FOR = SIM_TAG(); }
    await statsPane({ key, el: body, unit, nation, allUrl: "/api/compalltime?key=" + enc(key), seasons: h.editions, now: cur ? cur.cid : null, nowSeason: cur ? cur.season : null, champLabel: k === "cwc" ? "World champions" : "Winner" });
    return;
  }
  body.innerHTML = historyHTML(h, lk, nation);
}
const SIM_TAG = () => (STATUS && STATUS.header ? STATUS.header.seed + "|" + STATUS.header.season + "|" + STATUS.header.week : "");
function historyHTML(h, lk, nation) {
  if (!h.editions_n) return `<div class="card"><h3>History</h3><div class="dim small">Nothing has been decided yet. ${h.current ? "The first edition is in progress." : h.next_label ? "The first one is in " + esc(h.next_label) + "." : ""}</div>${h.current ? `<a class="more" href="#/comp/${enc(h.current.cid)}"><span>Open this season</span><span>&rsaquo;</span></a>` : ""}</div>`;
  const hd = h.holder, top = Math.max(1, h.top_titles);
  const lostTxt = (b) => (b.lost.length ? (b.lost.length === 1 ? " · lost the S" + b.lost[0] + " final" : " · lost " + b.lost.map((s) => "S" + s).join(", ")) : "");
  const hero = `<div class="card hero"><h3>Holders <small>season ${hd.season}</small></h3><div class="big">${lk(hd.winner)}</div>
      <div class="dim small">beat ${esc(hd.runner_up || "")}${hd.score ? " " + esc(hd.score) : ""}${hd.host ? " · host " + esc(hd.host) : ""}${hd.coach ? " · coach " + esc(hd.coach) : ""}${hd.date ? " · " + esc(hd.date) : ""}</div>
      <div style="margin-top:8px"><span class="tag gold">${hd.titles} title${hd.titles === 1 ? "" : "s"}</span> <span class="tag">${hd.finals} final${hd.finals === 1 ? "" : "s"}, ${hd.titles} win${hd.titles === 1 ? "" : "s"}</span></div></div>`;
  const board = `<div class="card"><h3>Titles by ${nation ? "nation" : "club"} <small>${h.editions_n} ${h.editions_n === 1 ? "edition" : "editions"}</small></h3>${h.by.map((b) => `<div class="tr"><span class="rk ${b.rank === 1 ? "g" : b.rank === 2 ? "s" : ""}">${b.rank}</span><div class="m"><b>${lk(b.name)}</b><span>${ordinalSeasons(b.seasons)}${lostTxt(b)}${nation && b.host && b.host.length ? " · host " + b.host.map(esc).join(", ") : ""}</span><div class="tb"><i style="width:${Math.round(b.titles / top * 100)}%"></i></div></div><div class="c"><b>${b.titles}</b><span>${b.finals} final${b.finals === 1 ? "" : "s"}</span></div></div>`).join("")}</div>`;
  const never = h.never_won.length ? `<div class="card"><h3>Finalists who never won</h3><div class="two">${h.never_won.map((n) => `<div>${lk(n.name)}<span>${n.finals > 1 ? n.finals + " finals" : "S" + n.seasons[0]}</span></div>`).join("")}</div></div>` : "";
  const gtop = h.by_group.length ? Math.max(1, h.by_group[0].n) : 1;
  const groups = h.by_group.length > 1 ? `<div class="card"><h3>${esc(h.by_group_label)}</h3>${h.by_group.map((g) => `<div class="lb"><span class="n">${esc(g.name)}</span><div class="tb"><i style="width:${Math.round(g.n / gtop * 100)}%"></i></div><b>${g.n}</b></div>`).join("")}</div>` : "";
  const finals = `<div class="card"><h3>Finals <small>newest first</small></h3>${h.finals.map((f) => `<div class="ed"><div class="a"><span class="rk ${f.season === hd.season ? "g" : ""}">${f.season}</span><b>${lk(f.winner)}</b><span class="s">${esc(f.score || "")}</span></div><div class="b">beat ${esc(f.runner_up || "")}${f.host ? " · host " + esc(f.host) : ""}${f.coach ? " · coach " + esc(f.coach) : ""}</div></div>`).join("")}</div>`;
  const hosts = h.hosts.length ? `<div class="card"><h3>Hosts</h3>${h.hosts.map((x) => `<div class="row"><span>S${x.season}</span><span class="dim small">${esc(x.host)}</span></div>`).join("")}${h.next_label ? `<div class="row"><span>${esc(h.next_label)}</span><span class="dim small">Chosen before the tournament</span></div>` : ""}</div>` : "";
  const recs = h.records.length ? `<div class="card"><h3>Records</h3>${h.records.map((r) => `<div class="row"><span>${esc(r.label)}</span><span class="dim small" style="text-align:right">${esc(r.text)}</span></div>`).join("")}</div>` : "";
  return hero + board + never + groups + finals + hosts + recs;
}
// the live tournament page gets the same tab strip
function liveTabs(cid) { const key = famKey(cid); return key ? `<div class="v2">${compTabsHTML(key, "now", cid)}</div>` : ""; }

// ---------------------------------------------------------------- league page
const LTABS = [["table", "Table"], ["money", "Money"], ["hof", "Honours"], ["halls", "Hall of Fame"], ["fix", "Fixtures"], ["stats", "Stats"]];
const HEALTH_TAG = { Strong: "green", Steady: "", Tight: "gold", "In debt": "red" };
function leagueMoneyHTML(mon, d) {
  if (!mon || !mon.season) return `<div class="card"><h3>League health</h3><div class="dim small">The books open after the first completed season.</div></div>`;
  const s = mon.sources, inc = Math.max(1e-9, s.income), cap = mon.wage_cap, n = mon.clubs;
  const gr = mon.growth == null ? "" : (mon.growth >= 0 ? "+" : "") + (mon.growth * 100).toFixed(1) + "% on last season";
  const stateTag = mon.state === "Shrinking" || mon.state === "Overheating" ? "red" : mon.state === "Growing" ? "gold" : "green";
  const seg = (list) => list.filter(([, v]) => v > 0.0004).map(([c, , v]) => `<i style="width:${(v / inc * 100).toFixed(1)}%;background:${c}"></i>`).join("");
  const src = [["#4aa8ff", "TV", s.tv], ["#3ddc84", "Gate", s.gate], ["#c79bff", "Player sales", s.sales], ["#f5c542", "Sponsors", s.sponsor], ["#8fa89a", "Other", s.prize + s.owner]];
  const use = [["#ff6b6b", "Wages", s.wages], ["#c79bff", "Running", s.running], ["#4aa8ff", "Transfers in", s.transfers], ["#35d0c4", "Academy", s.academy], ["#8fa89a", "Other", s.stadium + s.interest], ["#3ddc84", "Kept as profit", Math.max(0, s.profit)]];
  const leg = (list) => `<div class="leg">${list.filter(([, , v]) => v > 0.0004).map(([c, t, v]) => `<span><u style="background:${c}"></u>${t} ${Math.round(v / inc * 100)}%</span>`).join("")}</div>`;
  const near = (() => { const i = mon.leagues.findIndex((x) => x.league === mon.league), lo = Math.max(0, Math.min(i - 1, mon.leagues.length - 3)); return mon.leagues.slice(lo, lo + 3); })();
  return `<div class="card hero"><h3>League health <small>season ${mon.season} books</small></h3>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><div class="big">${money(mon.revenue)}</div><span class="tag ${stateTag}">${esc(mon.state)}</span></div>
      <div class="dim small">revenue of all ${n} clubs${gr ? ", " + gr : ""}</div>
      <div class="kv4"><div><span>RICHEST LEAGUE</span><b>#${mon.rank} of ${mon.of}</b></div><div><span>TV MULTIPLIER</span><b>x${(+mon.tv).toFixed(2)}</b></div><div><span>CLUBS IN DEBT</span><b>${mon.in_debt} of ${n}</b></div><div><span>OVER WAGE LIMIT</span><b>${mon.over_limit} of ${n}</b></div></div></div>
    <div class="stat4"><div><b>${pc(mon.avg_wage_ratio)}%</b><span>WAGES / INCOME</span></div><div><b>${moneyS(mon.avg_profit)}</b><span>AVG PROFIT</span></div><div><b>${money(mon.avg_cash)}</b><span>AVG CASH</span></div><div><b>${(mon.avg_ground / 1000).toFixed(0)}k</b><span>AVG GROUND</span></div></div>
    <div class="card"><h3>Where the money comes from <small>all ${n} clubs</small></h3><div class="stack">${seg(src)}</div>${leg(src)}<div class="dim small" style="margin-top:8px">Income ${money(s.income)} this season. A league with more rivalries and a bigger TV multiplier earns more from broadcasters.</div></div>
    <div class="card"><h3>Where it goes <small>share of income</small></h3><div class="stack">${seg(use)}</div>${leg(use)}<div class="dim small" style="margin-top:8px">Profit is paid out to the clubs' transfer budgets after the season (${money(s.payout)} this year).</div></div>
    <div class="card"><h3>Club finances <small>sorted by income</small></h3>
      ${mon.rows.map((r) => `<a class="fr" href="#/club/${enc(r.club)}" data-fin="1"><div class="t"><span>${crest(r.club, 16)} ${esc(r.club)}</span><b>${money(r.income)}</b></div>
        <div class="s"><span>Wages ${pc(r.wage_ratio)}% · Cash ${money(r.cash)} · Profit ${moneyS(r.profit)}</span><span class="tag ${HEALTH_TAG[r.health] || ""}">${r.health}</span></div>
        <div class="wb"><i style="width:${Math.min(100, r.wage_ratio / cap * 100)}%;${r.wage_ratio > cap ? "background:var(--red)" : ""}"></i></div></a>`).join("")}
      <div class="dim small" style="margin-top:8px;line-height:1.45">Bar: wage bill against the wage limit (${pc(cap)}% of income, the right edge). Strong = cash of at least one year of income. Steady = half a year or more. Tight = less than that, or wages near the limit. Tap a club to open its Finance tab.</div></div>
    <div class="card"><h3>Compare with other leagues</h3>${near.map((x) => `<a class="row" href="#/league/${enc(x.league)}"><span ${x.league === mon.league ? 'class="gold"' : ""}>${esc(x.league)}</span><span class="dim small">${money(x.avg_income)} · x${(+x.tv).toFixed(2)}</span></a>`).join("")}<a class="more" href="#/money"><span>All leagues: strength and money</span><span>&rsaquo;</span></a></div>`;
}
function leagueHofHTML(hof, d) {
  if (!hof || !hof.seasons_n) return `<div class="card"><h3>Honours</h3><div class="dim small">No completed season yet. Titles, champions and records appear after the first one.</div></div>`;
  const top = Math.max(1, hof.most_n), nm = (names) => (names.length > 2 ? names.length + " clubs" : names.map(esc).join(" and "));
  const run = hof.run;
  const tiles = `<div class="tiles"><div class="tile"><span class="eyebrow">Current champion</span><b>${clubLink(hof.holder.club)}</b><span class="dim small">season ${hof.holder.season}</span></div>
      <div class="tile"><span class="eyebrow">Different champions</span><b>${hof.different} of ${hof.clubs_n} clubs</b></div>
      <div class="tile"><span class="eyebrow">Most titles</span><b>${nm(hof.most)}, ${hof.most_n}</b></div>
      <div class="tile"><span class="eyebrow">Longest run</span><b>${run && run.n > 1 ? esc(run.club) + ", " + run.n : "No repeat yet"}</b><span class="dim small">${run && run.n > 1 ? "S" + run.from + "-S" + run.to : ""}</span></div></div>`;
  const board = `<div class="card"><h3>League titles by club <small>${hof.seasons_n} season${hof.seasons_n === 1 ? "" : "s"}</small></h3>${hof.board.map((b) => `<div class="tr"><span class="rk ${b.rank === 1 ? "g" : b.rank === 2 ? "s" : b.rank === 3 ? "b" : ""}">${b.rank}</span><div class="m"><b>${clubLink(b.club)}${b.cup ? ` <span class="tag blue">${b.cup} ${esc(b.cup_name || "cup")}</span>` : ""}</b><span>${ordinalSeasons(b.seasons)}${b.second.length ? " · runner-up " + b.second.map((s) => "S" + s).join(", ") : ""}</span><div class="tb"><i style="width:${Math.round(b.titles / top * 100)}%"></i></div></div><div class="c"><b>${b.titles}</b><span>${b.titles === 1 ? "title" : "titles"}</span></div></div>`).join("")}</div>`;
  const yet = hof.yet_to_win.length ? `<div class="card"><h3>${hof.yet_to_win.length} club${hof.yet_to_win.length === 1 ? "" : "s"} yet to win the league <small>best finish</small></h3><div class="two">${hof.yet_to_win.map((y) => `<div>${clubLink(y.club)}<span>${y.best ? ordN(y.best) : "-"}</span></div>`).join("")}</div></div>` : "";
  const strip = `<div class="card"><h3>Who won each season</h3><div class="strip">${hof.strip.slice().reverse().map((s) => `<a href="#/club/${enc(s.club)}" title="${esc(s.club)}"><small>S${s.season}</small>${crest(s.club, 24)}</a>`).join("")}</div></div>`;
  const champs = `<div class="card"><h3>Champions <small>newest first</small></h3>${d.champs.map((c) => `<div class="ed"><div class="a"><span class="rk ${c.season === hof.holder.season ? "g" : ""}">${c.season}</span><b>${clubLink(c.club)}</b><span class="s">${c.pts} pts</span></div><div class="b">${c.coach ? "coach " + esc(c.coach) : ""}${c.date ? (c.coach ? " · " : "") + esc(c.date.text) : ""}</div></div>`).join("")}</div>`;
  const r = hof.records, recs = [];
  if (r.most_pts) recs.push(["Most points in a season", `${esc(r.most_pts.club)} ${r.most_pts.pts} (S${r.most_pts.season})`]);
  if (r.fewest_pts) recs.push(["Fewest points by a champion", `${r.fewest_pts.who.map((x) => esc(x.club)).join(", ")} ${r.fewest_pts.pts} (${r.fewest_pts.who.map((x) => "S" + x.season).join(", ")})`]);
  if (r.coach) recs.push(["Most titles with one coach", `${r.coach.names.map(esc).join(", ")}, ${r.coach.n}`]);
  return tiles + board + yet + strip + champs + (recs.length ? `<div class="card"><h3>Records</h3>${recs.map(([a, b]) => `<div class="row"><span>${a}</span><span class="dim small" style="text-align:right">${b}</span></div>`).join("")}<a class="more" href="#/records"><span>World Hall of Fame: all clubs</span><span>&rsaquo;</span></a></div>` : "");
}
async function viewLeague(name, season) {
  const [d, mon, hof] = await Promise.all([api("/api/league?name=" + enc(name)), api("/api/leaguemoney?name=" + enc(name)).catch(() => null), api("/api/leaguehof?name=" + enc(name)).catch(() => null)]);
  const past = season ? await api(`/api/league_season?name=${enc(name)}&season=${season}`) : null;
  const rows = past ? past.rows.map((r) => ({ ...r, form: "", zone: "", ovr: null, gd: r.gf - r.ga })) : d.rows;
  const p = d.progress, inProg = !past && d.next.some((f) => f.hg !== undefined);
  const fx = past ? null : await api("/api/fixtures?name=" + enc(name)).catch(() => null);
  const S = LGS[name] || (LGS[name] = { tab: "table" });
  if (past) S.tab = "table";
  const titles = {}; if (hof) for (const b of hof.board) titles[b.club] = b.titles;
  const fin = p.done >= p.total;
  const tablePane = `<div class="card"><div class="hd"><div><div style="font-size:15px;font-weight:700">${past ? "Season " + past.season + " final table" : "Season " + STATUS.header.season + " · matchweek " + p.done + " of " + p.total}</div>
      <div class="dim small">${past ? "Champion " + esc(past.champion) : d.next_date ? "Next: matchweek " + Math.min(p.total, p.done + 1) + " · " + esc(d.next_date.text) : fin ? "Season finished" : ""}</div></div></div>
      ${past ? `<div style="margin-top:10px"><button class="btn" id="l-now">Back to this season</button></div>` : `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px"><button class="btn pri" id="l-one" ${fin ? "disabled" : ""}>Next game</button>
        ${inProg ? `<button class="btn" id="l-rest">Matchweek</button>` : `<button class="btn" data-m="1" ${fin ? "disabled" : ""}>Matchweek</button>`}<button class="btn" id="l-end" ${fin ? "disabled" : ""}>Rest of season</button></div>
      <details class="acc" style="margin-top:6px"><summary>More ways to sim</summary><div class="b"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn sm" data-m="4" ${fin ? "disabled" : ""}>Next 4</button><span class="dim small">go to matchweek</span><input type="number" id="l-goto" min="1" max="${p.total}" value="${Math.min(p.total, p.done + 1)}" style="width:64px;min-height:36px"><button class="btn sm" id="l-go">Go</button></div></div></details>`}
      <div style="margin-top:10px"><select class="sel" id="l-past" style="width:100%" aria-label="Past season"><option value="">Past season: choose</option>${d.seasons.slice().reverse().map((s) => `<option value="${s}" ${past && past.season === s ? "selected" : ""}>Season ${s}</option>`).join("")}</select></div></div>
    <div class="card"><div class="dim small" style="margin-bottom:6px">${hof && hof.seasons_n ? "Gold number = league titles won. " : ""}</div><div class="scroll"><table><thead><tr><th>#</th><th class="l">Club</th><th>P</th><th>GD</th><th>Pts</th>${past ? "" : "<th>Form</th>"}</tr></thead><tbody>
      ${rows.map((r) => `<tr class="${r.pos === 1 ? "champ" : !past && r.pos <= d.slots ? "cup" : ""}"><td>${r.pos}</td><td class="l">${clubLink(r.club)}${titles[r.club] ? ` <span class="ttl">${titles[r.club]}</span>` : ""}${r.hot ? ' <span class="tag red">hot seat</span>' : ""}</td><td>${r.p}</td><td>${r.gd > 0 ? "+" : ""}${r.gd}</td><td class="pts">${r.pts}</td>${past ? "" : `<td>${form(r.form)}</td>`}</tr>`).join("")}</tbody></table></div>
      ${past ? "" : `<div class="dim small" style="margin-top:8px"><span class="sw" style="background:var(--accent)"></span>Top ${d.slots}: ${esc(d.cup)}</div>`}
      <a class="more" data-lgo="hof"><span>Titles, champions and records</span><span>&rsaquo;</span></a></div>
    ${!past && d.last.length ? `<div class="card"><h3>Last matchweek <small>${d.last_date ? esc(d.last_date.text) : ""}</small></h3>${d.last.map((f) => `<div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">${f.hg}-${f.ag}</span><span>${clubLink(f.a)}</span></div>`).join("")}<a class="more" data-lgo="fix"><span>All fixtures and previews</span><span>&rsaquo;</span></a></div>` : ""}
    <a class="card" data-lgo="stats" style="display:block"><h3>Player stats <small>${past ? "season " + past.season : "this season"}</small></h3><div class="dim small">Top scorers, assists and ratings live on the Stats tab.</div><div class="more" style="color:#6db8ff"><span>Open player stats</span><span>&rsaquo;</span></div></a>`;
  const fixPane = `${fx && fx.rows.length ? `<div class="card"><h3>Matchweek ${fx.week} <small>${fx.rows.filter((f) => f.done).length}/${fx.rows.length} played${d.next_date ? " · " + esc(d.next_date.text) : ""}</small></h3>
      <div class="dim small" style="margin-bottom:6px">Pick any game to sim it now, or open its preview first.</div>
      ${fx.rows.map((f, i) => `<div class="fix2"><div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">${f.done ? f.hg + "-" + f.ag : "v"}</span><span>${clubLink(f.a)}</span></div>
        <div class="fx-m">${f.rivalry ? `<span class="tag red">${esc(f.rivalry.name)}</span>` : ""}<a href="#/matchup/${enc(d.id)}/${enc(f.h)}/${enc(f.a)}">${f.done ? "Match info" : "Preview"}</a>${f.done ? "" : `<button class="mini" data-fx="${i}">Sim this game</button>`}</div></div>`).join("")}</div>` : `<div class="card"><h3>Fixtures</h3><div class="dim small">${past ? "Past seasons keep the final table only." : "No fixtures left this season."}</div></div>`}
    ${d.last.length ? `<div class="card"><h3>Last matchweek <small>${d.last_date ? esc(d.last_date.text) : ""}</small></h3>${d.last.map((f) => `<div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">${f.hg}-${f.ag}</span><span>${clubLink(f.a)}</span></div>`).join("")}</div>` : ""}
    ${!inProg && d.next.length ? `<div class="card"><h3>Next matchweek <small>${d.next_date ? esc(d.next_date.text) : ""}</small></h3>${d.next.map((f) => `<div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">v</span><span>${clubLink(f.a)}</span></div>`).join("")}</div>` : ""}`;
  const subBits = [esc(d.confed), d.games + " games", "top " + d.slots + " reach the " + esc(d.cup)];
  $("#view").innerHTML = `<div class="v2">${crumbHTML([`<a href="#/world">World</a>`, `<a href="#/continent/${d.confed}">${esc(d.confed)}</a>`, esc(d.name)])}
    <div style="display:flex;align-items:center;gap:12px"><span class="cem big-e">${compEmb(d.name, d.emblem, 48)}</span><div><h1>${esc(d.name)}</h1><div class="sub">${subBits.join(" · ")}${past ? ` · <span class="tag gold">season ${past.season} final table</span>` : ""}</div></div></div>
    <div class="stat4"><div><b>${d.avg}</b><span>AVG OVR</span></div><div><b>${mon && mon.season ? money(mon.avg_income) : "-"}</b><span>CLUB INCOME</span></div><div><b>x${(+d.tv).toFixed(2)}</b><span>TV MONEY</span></div><div><b>${mon && mon.season ? "#" + mon.rank : "-"}</b><span>${mon && mon.season ? "RICHEST OF " + mon.of : "RICHEST"}</span></div></div>
    <nav class="tabs2" id="lg-tabs" aria-label="League sections">${LTABS.map(([k, t]) => `<button data-lt="${k}" class="${k === S.tab ? "on" : ""}">${t}</button>`).join("")}</nav>
    <div id="lg-table">${tablePane}</div><div id="lg-money" hidden>${leagueMoneyHTML(mon, d)}</div><div id="lg-hof" hidden>${leagueHofHTML(hof, d)}</div><div id="lg-fix" hidden>${fixPane}</div><div id="lg-halls" hidden></div><div id="lg-stats" hidden></div></div>`;
  const built = {};
  const show = (t) => {
    S.tab = t;
    document.querySelectorAll("#lg-tabs [data-lt]").forEach((b) => b.classList.toggle("on", b.dataset.lt === t));
    LTABS.forEach(([k]) => { $("#lg-" + k).hidden = k !== t; });
    if (t === "halls" && !built.halls) {
      built.halls = 1;
      Promise.all([api("/api/hof?tier=L&kind=p&name=" + enc(name)), api("/api/hof?tier=L&kind=c&name=" + enc(name))]).then(([hp, hc]) => {
        const last = hp.classes[0], lastC = hc.classes[0], fin = (STATUS.header.season - (p.done >= p.total ? 0 : 1));
        $("#lg-halls").innerHTML = `<div class="card"><h3>${esc(name)} Hall of Fame <small>${hp.total} players &middot; ${hc.total} coaches</small></h3>
          ${last ? `<div class="dim small" style="margin-bottom:6px">Class of ${esc(last.label)}</div><div class="hlist">${last.rows.map((r) => hofRow(r, { right: "year " + r.n })).join("")}</div>` : '<div class="dim small">Nobody inducted yet. People become eligible five years after they retire.</div>'}
          ${lastC ? `<div class="dim small" style="margin:10px 0 6px">Latest coach: class of ${esc(lastC.label)}</div><div class="hlist">${lastC.rows.map((r) => hofRow(r, { right: "year " + r.n })).join("")}</div>` : ""}
          <a class="more" href="#/hof/L/${enc(name)}"><span>Full league Hall of Fame</span><span>&rsaquo;</span></a>
          ${fin > 0 ? `<a class="more" href="#/hofleague/${enc(name)}/${p.done >= p.total ? STATUS.header.season : STATUS.header.season - 1}"><span>Latest Hall of Fame day</span><span>&rsaquo;</span></a>` : ""}</div>`;
      }).catch((e) => { $("#lg-halls").innerHTML = `<div class="card dim small">${esc(e.message)}</div>`; });
    }
    if (t === "stats" && !built.stats) {
      built.stats = 1;
      const seasons = (hof ? hof.strip : []).map((s) => ({ season: s.season, cid: d.id, winner: s.club, stats: true }));
      statsPane({ key: "league:" + name, el: $("#lg-stats"), unit: "season", nation: false, allUrl: "/api/compalltime?key=" + enc("league:" + name), seasons: past && !seasons.length ? [] : seasons, now: d.id, nowSeason: STATUS.header.season, champLabel: "Champion" });
    }
  };
  document.querySelectorAll("#lg-tabs [data-lt]").forEach((b) => (b.onclick = () => show(b.dataset.lt)));
  document.querySelectorAll("[data-lgo]").forEach((b) => (b.onclick = () => { show(b.dataset.lgo); window.scrollTo(0, 0); }));
  document.querySelectorAll("#lg-money [data-fin]").forEach((a) => (a.onclick = () => { CV_OPEN = "fin"; }));
  document.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => simComp(d.id, { matches: +b.dataset.m })));
  if ($("#l-one")) $("#l-one").onclick = () => simComp(d.id, { fixtures: 1 });
  document.querySelectorAll("[data-fx]").forEach((b) => (b.onclick = () => { const f = fx.rows[+b.dataset.fx]; simComp(d.id, { fixture: { h: f.h, a: f.a } }); }));
  if ($("#l-rest")) $("#l-rest").onclick = () => simComp(d.id, { matches: 1 });
  if ($("#l-end")) $("#l-end").onclick = () => simComp(d.id, { to_end: true });
  if ($("#l-go")) $("#l-go").onclick = () => { const n = parseInt($("#l-goto").value) - p.done; if (n > 0) simComp(d.id, { matches: n }); };
  if ($("#l-now")) $("#l-now").onclick = () => (location.hash = "#/league/" + enc(name));
  $("#l-past").onchange = (e) => (location.hash = e.target.value ? `#/league/${enc(name)}/${e.target.value}` : "#/league/" + enc(name));
  show(S.tab);
}
