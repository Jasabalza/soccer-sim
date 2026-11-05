"use strict";
/* Soccer Sim v11 - window front-end (phase 2). Plain JS, no libraries. */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = encodeURIComponent;
let STATUS = null;
let SORT = { key: "ovr", dir: -1 };

// ---------------------------------------------------------------- api
async function api(path, body) {
  let r;
  try { r = await SIM.request(path, body); } catch (e) { console.error(e); throw new Error("The game engine stopped: " + e); }
  if (r.code !== 200) throw new Error((r.body && r.body.error) || "Something went wrong");
  if (body !== undefined && SIM.store.persistent && !api.auto && (path === "/api/years" || path === "/api/rollover" || path === "/api/new")) {
    api.auto = true; try { const a = await SIM.request("/api/save", { name: "autosave" }); if (a.code !== 200) toast("Autosave failed: " + ((a.body && a.body.error) || "unknown")); } catch (e) { toast("Autosave failed."); } api.auto = false;
  }
  return r.body;
}
function toast(msg, ok) {
  const t = $("#toast");
  t.textContent = msg; t.className = ok ? "ok" : ""; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ok ? 2500 : 6000);
}
async function busy(text, fn) {
  $("#busy-text").textContent = text; $("#busy").hidden = false;
  try { return await fn(); } catch (e) { toast(e.message); } finally { $("#busy").hidden = true; }
}
function openModal(html) { $("#modal-box").innerHTML = html; $("#modal").hidden = false; }
function closeModal() { $("#modal").hidden = true; }
$("#modal").addEventListener("pointerdown", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ---------------------------------------------------------------- bits
function ovrColor(o) {
  const t = Math.max(0, Math.min(1, (o - 45) / 45));
  const h = 20 + t * 110; return `hsl(${h} 70% 55%)`;
}
const ovr = (o) => `<span class="ovr" style="background:${ovrColor(o)}">${o}</span>`;
const clubLink = (n) => `${crest(n, 16)}<a href="#/club/${enc(n)}">${esc(n)}</a>`;
const leagueLink = (n) => `<a href="#/league/${enc(n)}">${esc(n)}</a>`;
const natLink = (n) => `${flag(n, 18)}<a href="#/nation/${enc(n)}">${esc(n)}</a>`;
const playerLink = (p, nm) => `${flag(p.nat, 18)}<a href="#/player/${p.uid}">${esc(nm || p.name)}</a>`;
const bar = (d, t) => `<div class="bar"><i style="width:${t ? Math.round((100 * d) / t) : 0}%"></i></div>`;
const form = (f) => `<span class="form">${[...f].map((c) => `<span class="${c}">${c}</span>`).join("")}</span>`;
const fmt = (x, d = 0) => Number(x).toFixed(d);
const money = (m) => { m = Number(m); const a = Math.abs(m), sg = m < 0 ? "-" : ""; return sg + "\u20ac" + (a < 0.0005 ? "0" : a >= 1000 ? (a / 1000).toFixed(2) + "B" : a >= 10 ? Math.round(a) + "M" : a >= 1 ? a.toFixed(1) + "M" : Math.round(a * 1000) + "K"); };
const moneyS = (m) => (m > 0 ? "+" : "") + money(m);

// ---------------------------------------------------------------- shell
function renderShell() {
  const has = STATUS && STATUS.has_world;
  const route = location.hash.split("/")[1] || "";
  const items = [["world", "World"], ["nations", "Nations"], ["news", "News"], ["money", "Money"], ["ledger", "Transfers"], ["rivals", "Rivals"], ["players", "Players"], ["ceremony", "Awards"], ["trophies", "Trophies"], ["records", "Records"]];
  $("#nav").innerHTML = has ? items.map(([k, t]) => `<a href="#/${k}" class="${route === k ? "on" : ""}">${t}</a>`).join("") : "";
  const h = STATUS && STATUS.header;
  $("#season-info").innerHTML = h
    ? `Season <b>${h.season}</b> (${h.season_label}) &middot; year ${h.cycle_year}/4 (${esc(h.cycle_text)}) &middot; ` +
      (h.done ? "<b>season complete</b>" : `next: <b>${h.date ? h.date.text : "week " + h.week}</b>`)
    : "";
  renderSimBar();
}
let SBOPEN = false;
function renderSimBar() {
  const bar_ = $("#simbar");
  if (!STATUS || !STATUS.has_world) { bar_.innerHTML = ""; return; }
  const done = STATUS.header.done;
  bar_.classList.toggle("open", SBOPEN);
  bar_.innerHTML = `
    <span class="lbl">WORLD</span>
    ${done ? `<button class="pri main" id="sb-roll">Start next season</button>` : `<button class="main" id="sb-week">Next week</button>
    <button class="main" id="sb-4">4 weeks</button>
    <button class="main" id="sb-end">Rest of season</button>`}
    <button id="sb-tog" class="sb-tog" aria-expanded="${SBOPEN}">${SBOPEN ? "Less" : "More"}</button>
    <span class="sb-more"><span class="sep"></span>
    <span class="lbl">MANY SEASONS</span>
    <input type="number" id="sb-n" value="5" min="1" max="200">
    <button class="pri" id="sb-years">Sim</button>
    <button id="sb-stops">Stop checklist</button>
    <span class="sep"></span>
    <button id="sb-save">Save / Load</button> <button id="sb-set">Settings</button></span>`;
  const on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  on("#sb-week", () => simWorld({ weeks: 1 }));
  on("#sb-4", () => simWorld({ weeks: 4 }));
  on("#sb-end", () => simWorld({ to_end: true }));
  on("#sb-roll", rollover);
  on("#sb-tog", () => { SBOPEN = !SBOPEN; renderSimBar(); });
  $("#sb-years").onclick = simYears;
  $("#sb-stops").onclick = stopsDialog;
  $("#sb-save").onclick = saveDialog;
  $("#sb-set").onclick = settingsDialog;
}
async function refreshStatus() { STATUS = await api("/api/status"); if (STATUS.has_world) await loadFavs(); else FAVS = null; renderShell(); }

// ---------------------------------------------------------------- actions
async function afterSim() {
  const y = window.scrollY;
  await refreshStatus(); await route();
  window.scrollTo(0, y);
}
async function simWorld(opts) {
  const r = await busy("Simulating...", () => api("/api/sim", { scope: "world", ...opts }));
  await afterSim(); await playFinished(r && r.finished);
}
async function simIds(ids, opts, text) {
  for (const k in HOLD) delete HOLD[k];
  const r = await busy(text || "Simulating...", () => api("/api/sim", { scope: "ids", ids, ...opts }));
  await afterSim(); await playFinished(r && r.finished);
}
const GM = {}, HOLD = {}, ROPEN = {};      // GM: the round on screen per competition; HOLD: a round that just finished, kept on screen until you move on
async function simComp(comp, opts) {
  if (!(opts && opts.game)) delete HOLD[comp];
  const r = await busy("Simulating...", async () => { try { return await api("/api/sim", { comp, ...opts }); } catch (e) { toast(e.message); return null; } });
  await afterSim(); await playFinished(r && r.finished); return r;
}
// sim chosen games of the round on screen (one game, or a whole group's matchday). If that finishes the round, keep its scores on screen.
async function simGames(id, keys) {
  const prev = GM[id], got = [], fin = [];
  await busy("Simulating...", async () => { for (const k of keys) { try { const q = await api("/api/sim", { comp: id, game: k }); if (q && q.game) got.push(q.game); if (q && q.finished) fin.push(...q.finished); } catch (e) { toast(e.message); break; } } });
  if (prev && prev.ready && prev.event && got.length) {
    const h = JSON.parse(JSON.stringify(prev));
    for (const q of got) { const x = h.games.find((g) => g.key === q.key); if (x) { x.done = true; x.text = q.text; x.winner = q.winner; } }
    h.played = h.games.filter((g) => g.done).length;
    if (h.played >= h.total) HOLD[id] = h;
  }
  await afterSim(); await playFinished(fin);
}
// who went through, in words ("plain" also spells out an ordinary win)
function outcomeText(w, t, plain) {
  if (!w) return "";
  t = t || "";
  if (/pens/.test(t)) return w + " win on penalties";
  if (/\(agg/.test(t)) return w + " go through on aggregate" + (/aet/.test(t) ? " after extra time" : "");
  if (/aet/.test(t)) return w + " win after extra time";
  return plain ? w + " win" : "";
}
async function rollover() {
  for (const k in HOLD) delete HOLD[k];
  const r = await busy("Rolling into the next season...", () => api("/api/rollover", {}));
  await afterSim(); if (r) showReview(r.review);
}
async function simYears() {
  for (const k in HOLD) delete HOLD[k];
  const n = Math.max(1, parseInt($("#sb-n").value) || 1);
  const r = await busy(`Simulating ${n} season(s)...`, () => api("/api/years", { n }));
  await afterSim();
  if (r) { if (r.stopped || r.ran === 1) showReview(r.review, r); else { toast(`Simulated ${r.ran} season(s).`, true); } }
}
function showReview(rv, r) {
  if (!rv) return;
  if (rv.awards && rv.reasons && rv.reasons.includes("award ceremony") && !showReview.fromCeremony) {
    location.hash = "#/ceremony/" + rv.season; return;
  }
  showReview.fromCeremony = false;
  const row = (l, c) => `<div class="rv-l">${l}</div><div class="rv-c">${c}</div>`;
  const cups = Object.values(rv.cups).map((c) => row(esc(c.name), clubLink(c.winner))).join("") + (rv.cwc ? row("Club World Cup", clubLink(rv.cwc[0])) : "") + (rv.wc ? row("World Cup", natLink(rv.wc[0])) : "");
  const champs = Object.entries(rv.champs).map(([l, c]) => row(leagueLink(l), clubLink(c))).join("");
  openModal(`
    <h2>Season ${rv.season} review</h2>
    ${r && r.stopped ? `<div class="sub">Stopped after ${r.ran} season(s): ${esc(rv.reasons.slice(0, 5).join(" \u00b7 "))}</div>` : ""}
    <h3 class="rv-h">League champions</h3><div class="rv-grid">${champs}</div>
    <h3 class="rv-h">Cups</h3><div class="rv-grid">${cups}</div>
    <div class="meta" style="margin-top:8px">Transfers: ${rv.transfers.n} moves, ${money(rv.transfers.total)} in fees</div>
    ${rv.news.length ? `<details class="gres" style="margin-top:8px"><summary><b>Headlines</b> <span class="meta">${rv.news.length}</span></summary>${rv.news.map((n) => `<div class="review-line"><span class="tag">${esc(n.kind)}</span><span style="flex:1;margin-left:10px">${esc(n.text)}</span></div>`).join("")}</details>` : ""}
    <p style="text-align:right;margin-bottom:0">${rv.awards ? `<button onclick="closeModal();location.hash='#/ceremony/${rv.season}'">Awards ceremony</button> ` : ""}<button class="pri" onclick="closeModal()">Continue</button></p>`);
  $("#modal-box").querySelectorAll("a").forEach((a) => a.addEventListener("click", closeModal));
}
async function stopsDialog() {
  const s = STATUS.stops, items = STATUS.stop_items;
  openModal(`
    <h2>Stop checklist</h2>
    <div class="sub">When simming many seasons, the game pauses only when one of these happens.</div>
    <div class="tabs">${Object.keys(s.presets).map((p) => `<button data-p="${p}">${p}</button>`).join("")}</div>
    ${items.map((i) => `<label class="check"><input type="checkbox" data-k="${i.key}" ${s.on.includes(i.key) ? "checked" : ""}> ${esc(i.text)}</label>`).join("")}
    <div class="field"><span>N for "every N seasons"</span><input type="number" id="stop-n" min="1" max="100" value="${s.n}"></div>
    <div class="field"><span>Only these leagues count for "champion crowned" (none ticked = all)</span></div>
    <div class="rules">${STATUS.leagues.map((l) => `<label class="check"><input type="checkbox" data-l="${esc(l)}" ${s.leagues.includes(l) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>
    <p style="text-align:right"><button id="stops-ok" class="pri">Save</button></p>`);
  document.querySelectorAll("#modal-box [data-p]").forEach((b) => b.onclick = () => {
    document.querySelectorAll("#modal-box [data-k]").forEach((c) => (c.checked = s.presets[b.dataset.p].includes(c.dataset.k)));
  });
  $("#stops-ok").onclick = async () => {
    const on = [...document.querySelectorAll("#modal-box [data-k]")].filter((c) => c.checked).map((c) => c.dataset.k);
    const leagues = [...document.querySelectorAll("#modal-box [data-l]")].filter((c) => c.checked).map((c) => c.dataset.l);
    try { await api("/api/stops", { on, n: parseInt($("#stop-n").value) || 5, leagues }); closeModal(); await refreshStatus(); toast("Stop checklist saved", true); }
    catch (e) { toast(e.message); }
  };
}
function saveRows(saves, canSave) {
  if (!saves.length) return `<div class="empty">No saves yet.</div>`;
  return saves.map((s) => `<div class="row"><span><b>${esc(s.name)}</b> <span class="meta">${new Date(s.time * 1000).toLocaleString()} &middot; ${Math.round(s.size / 1024)} KB</span></span>
    <span>${canSave ? `<button data-over="${esc(s.name)}">Overwrite</button> ` : ""}<button data-load="${esc(s.name)}">Load</button> <button data-copy="${esc(s.name)}">Copy</button>${window.__KIND === "pc" ? ` <button data-file="${esc(s.name)}">File</button>` : ""} <button data-del="${esc(s.name)}">Delete</button></span></div>`).join("");
}
async function saveDialog() {
  const st = await api("/api/status");
  openModal(`<h2>Save / Load</h2>
    <div class="field"><input id="save-name" placeholder="Save name" style="flex:1"><button class="pri" id="save-go">Save</button></div>
    <div id="store-note"></div>
    <h2>Your saves</h2><div id="save-list">${saveRows(st.saves, true)}</div>
    ${saveTools()}
    <p style="text-align:right"><button onclick="closeModal()">Close</button></p>`);
  wireSaves(true); wireSaveTools(true); storageNote();
  $("#save-go").onclick = () => doSave($("#save-name").value);
}
async function storageNote() {
  const box = $("#store-note"); if (!box) return;
  const t = await api("/api/storage");
  const good = t.backend === "indexeddb", small = t.backend === "localstorage";
  box.innerHTML = `<div class="notebox ${good ? "ok" : "warn"}"><b>${good ? "Saves are stored in this browser." : small ? "Small-save storage in use." : "Saves will be lost when this page closes."}</b>
    <div class="meta">${good ? "Games are compressed and an autosave is written after each season." : esc(t.note || "")} Use Copy to keep a save as text${window.__KIND === "pc" ? " or File to keep it as a file" : ""}.</div></div>`;
}
function saveTools() {
  return `<h2>Bring a save in</h2>
    <details><summary>Paste save text or open a file</summary>
      <div class="field"><input id="imp-name" placeholder="Name for this save" value="imported" style="flex:1"></div>
      <p class="meta">Big saves are best brought in with <b>Open file</b>. Pasting is fine too: the text is kept out of the box so the page does not freeze.</p>
      <textarea id="imp-text" rows="2" placeholder="Paste the text from Copy here" style="width:100%"></textarea>
      <div id="imp-info" class="meta"></div>
      <p style="text-align:right"><input type="file" id="imp-file" accept=".sav,.txt,.json,text/plain" hidden><button id="imp-pick">Open file</button> <button class="pri" id="imp-go">Import</button></p>
    </details><div id="copy-box"></div>`;
}
function wireSaveTools(inGame) {
  const refresh = (saves) => { $("#save-list").innerHTML = saveRows(saves, inGame); wireSaves(inGame); };
  let held = null;                                         // big pasted text lives here, not in the text box
  const info = (t) => { const b = $("#imp-info"); if (b) b.textContent = t || ""; };
  const mb = (n) => (n / 1048576).toFixed(1) + " MB";
  const doImport = async (text) => {
    if (!text || !String(text).trim()) { toast("Nothing to import yet. Paste the save text or open the file first."); return; }
    try { const r = await busy("Importing " + mb(String(text).length) + " of save text...", () => api("/api/import_text", { text, name: $("#imp-name").value })); if (r) { held = null; info(""); $("#imp-text").value = ""; toast("Imported " + r.name + ". Tap Load to open it.", true); refresh(r.saves); } }
    catch (e) { toast(e.message); }
  };
  const ta = $("#imp-text");
  if (ta) {
    ta.addEventListener("paste", (e) => {
      const t = e.clipboardData && e.clipboardData.getData("text");
      if (t && t.length > 20000) { e.preventDefault(); held = t; ta.value = ""; info("Save text received (" + mb(t.length) + "). Tap Import."); }
    });
    ta.addEventListener("input", () => { held = null; info(""); });
  }
  if ($("#imp-go")) $("#imp-go").onclick = () => doImport(held || $("#imp-text").value);
  if ($("#imp-pick")) {
    $("#imp-pick").onclick = () => $("#imp-file").click();
    $("#imp-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      $("#imp-name").value = f.name.replace(/\.[^.]*$/, "").slice(0, 40) || "imported";
      try { info("Reading " + f.name + "..."); held = await f.text(); info("Save file read (" + mb(held.length) + "). Importing..."); await doImport(held); }
      catch (err) { info(""); toast("Could not read that file: " + err.message); }
      e.target.value = "";
    };
  }
}
async function doSave(name) {
  try { const r = await busy("Saving...", () => api("/api/save", { name })); if (!r) return; toast("Saved " + r.name + " (" + Math.round((r.saves.find((x) => x.name === r.name) || { size: 0 }).size / 1024) + " KB)", true); closeModal(); await refreshStatus(); }
  catch (e) { toast(e.message); }
}
function wireSaves(inGame) {
  document.querySelectorAll("[data-over]").forEach((b) => b.onclick = () => doSave(b.dataset.over));
  document.querySelectorAll("[data-copy]").forEach((b) => b.onclick = async () => {
    let r; try { r = await busy("Preparing...", () => api("/api/export_text?name=" + enc(b.dataset.copy))); } catch (e) { toast(e.message); return; }
    if (!r) return;
    try { await navigator.clipboard.writeText(r.text); toast("Copied " + b.dataset.copy + " (" + Math.round(r.text.length / 1024) + " KB of text). Paste it somewhere safe.", true); return; } catch (e) { /* show the text instead */ }
    const box = $("#copy-box"); if (!box) return;
    box.innerHTML = `<h2>Select and copy this text</h2><textarea id="copy-text" rows="4" readonly style="width:100%"></textarea>`;
    $("#copy-text").value = r.text; $("#copy-text").focus(); $("#copy-text").select();
  });
  document.querySelectorAll("[data-file]").forEach((b) => b.onclick = async () => {
    let r; try { r = await busy("Preparing...", () => api("/api/export_text?name=" + enc(b.dataset.file))); } catch (e) { toast(e.message); return; }
    if (!r) return;
    const showText = () => { const box = $("#copy-box"); if (!box) return; box.innerHTML = `<h2>Select and copy this text</h2><textarea id="copy-text" rows="4" readonly style="width:100%"></textarea>`; $("#copy-text").value = r.text; $("#copy-text").focus(); $("#copy-text").select(); };
    if (window.__KIND === "artifact") {                // the Claude viewer blocks ordinary downloads: ask it to save the file instead (.txt is on its list, .sav is not)
      let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { dl = null; }
      if (dl) {
        try { await dl.save({ filename: b.dataset.file + ".txt", data: r.text }); toast("Saved " + b.dataset.file + ".txt", true); }
        catch (e) { if (e && e.code === "declined") toast("Not saved."); else { toast("The viewer could not save the file. Select and copy the text instead.", false); showText(); } }
        return;
      }
      toast("This viewer cannot save files. Select and copy the text instead.", false); showText(); return;
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r.text], { type: "text/plain" })); a.download = b.dataset.file + ".sav"; document.body.appendChild(a); a.click(); a.remove();
    toast("Saved " + b.dataset.file + ".sav to your downloads", true);
  });
  document.querySelectorAll("[data-load]").forEach((b) => b.onclick = async () => {
    await busy("Loading the save (big saves can take 10-30 seconds on a tablet)...", () => api("/api/load", { name: b.dataset.load }));
    closeModal(); PICK_ASKED = false; location.hash = "#/world"; await refreshStatus(); await route();
  });
  document.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Tap again to delete"; setTimeout(() => { b.dataset.sure = ""; b.textContent = "Delete"; }, 3000); return; }
    const r = await api("/api/delete", { name: b.dataset.del });
    $("#save-list").innerHTML = saveRows(r.saves, inGame); wireSaves(inGame);
  });
}

// ---------------------------------------------------------------- favorites
// A favorite is a key: "L:<league>" or "<kind>:<confed>" (cup, ct, nl, qual). The list is kept inside the world, so it travels with every save.
const APP_VERSION = "v15.0", APP_TAG = "The Business Update";
let FAVS = null, PICK_ASKED = false;                    // FAVS: null until the player has chosen, then an array of keys
const CT_NAMES = { UEFA: "European Championship", CONMEBOL: "Copa America", CONCACAF: "Gold Cup", CAF: "Africa Cup of Nations", AFC: "Asian Cup", OFC: "OFC Nations Cup" };
const NL_NAMES = { UEFA: "UEFA Nations League", CONMEBOL: "CONMEBOL Nations League", CONCACAF: "CONCACAF Nations League", CAF: "CAF Nations League", AFC: "AFC Nations League", OFC: "OFC Nations League" };
function favOf(id) {
  let m;
  if (id.startsWith("L:")) return id;
  if ((m = /^C:(.+)$/.exec(id))) return "cup:" + m[1];
  if ((m = /^(CT|NL|Q):\d+:(.+)$/.exec(id))) return { CT: "ct", NL: "nl", Q: "qual" }[m[1]] + ":" + m[2];
  return null;                                           // Club World Cup, intercontinental play-off, World Cup: summer tournaments, never starred
}
const isFollowed = (id) => { const k = favOf(id); return FAVS === null || k === null || FAVS.includes(k); };
const favView = () => { try { return localStorage.getItem("ss_favview") !== "all"; } catch (e) { return true; } };
async function loadFavs() { try { FAVS = (await api("/api/favs")).favs; } catch (e) { FAVS = null; } }
async function saveFavs(list) { const r = await api("/api/favs", { set: list }); FAVS = r.favs; }
const starSvg = (w) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2.5 14.9,8.9 21.8,9.6 16.6,14.2 18.1,21 12,17.5 5.9,21 7.4,14.2 2.2,9.6 9.1,8.9"/></svg>`;
const starBtn = (key, on) => `<button class="star${on ? " on" : ""}" data-fav="${esc(key)}" aria-pressed="${on}" aria-label="${on ? "Stop following" : "Follow"} this competition" title="${on ? "Following" : "Follow"}">${starSvg(20)}</button>`;
// every competition that can be followed, by continent (national-team ones are listed even in seasons when they are not played)
function favCatalog(d) {
  return d.continents.map((c) => ({ name: c.name, code: c.code, rows: [
    ...c.leagues.map((l) => ({ key: "L:" + l.name, name: l.name, kind: "League" })),
    ...c.comps.filter((x) => x.kind === "cup").map((x) => ({ key: "cup:" + c.code, name: x.title, kind: "Continental" })),
    { key: "ct:" + c.code, name: CT_NAMES[c.code] || "Continental championship", kind: "National teams" },
    { key: "nl:" + c.code, name: NL_NAMES[c.code] || "Nations League", kind: "National teams" },
    { key: "qual:" + c.code, name: "World Cup qualifying - " + c.code, kind: "National teams" },
  ] }));
}
function favPicker(d) {
  const cat = favCatalog(d), all = cat.flatMap((c) => c.rows.map((r) => r.key));
  const sel = new Set((FAVS || []).filter((k) => all.includes(k)));
  const top = ["L:Premier League", "L:La Liga", "L:Bundesliga", "L:Serie A", "L:Ligue 1", "cup:UEFA", "nl:UEFA", "ct:UEFA"].filter((k) => all.includes(k));
  openModal(`<div class="fp"><h2>What do you follow?</h2>
    <div class="sub">Starred competitions show on your World page and get the winner popups. Everything else is still played, it just stays out of the way. You can change this any time.</div>
    <div class="fp-pre"><button id="fp-top" class="gold">Top 5, Champions League, Euros</button><button id="fp-all">All</button><button id="fp-none">None</button></div>
    <div id="fp-list"></div>
    <div class="fp-foot"><button class="pri wide" id="fp-save"></button><div class="meta" id="fp-note"></div><button id="fp-cancel" class="link">Not now</button></div></div>`);
  const draw = () => {
    $("#fp-list").innerHTML = cat.map((c) => `<div class="card fp-c"><div class="fp-h">${esc(c.name)}</div>${c.rows.map((r) => `<button class="fp-r" data-k="${esc(r.key)}"><span class="fp-b${sel.has(r.key) ? " on" : ""}">${sel.has(r.key) ? '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><polyline points="4,12.5 10,18.5 20,6" fill="none" stroke="#06210f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}</span><span class="fp-n">${esc(r.name)}</span><span class="meta">${r.kind}</span></button>`).join("")}</div>`).join("");
    $("#fp-save").textContent = "Save " + sel.size + " favorite" + (sel.size === 1 ? "" : "s");
    $("#fp-note").textContent = "The other " + (all.length - sel.size) + " are simmed in the background.";
    document.querySelectorAll("#fp-list [data-k]").forEach((b) => b.onclick = () => { const k = b.dataset.k; if (sel.has(k)) sel.delete(k); else sel.add(k); draw(); });
  };
  const preset = (keys) => { sel.clear(); keys.forEach((k) => sel.add(k)); draw(); };
  $("#fp-top").onclick = () => preset(top); $("#fp-all").onclick = () => preset(all); $("#fp-none").onclick = () => preset([]);
  $("#fp-cancel").onclick = closeModal;
  $("#fp-save").onclick = async () => { try { await saveFavs([...sel]); closeModal(); toast("Saved " + sel.size + " favorites", true); await route(); } catch (e) { toast(e.message); } };
  draw();
}
// the "Sim the other N" sheet: lists what it will play, and flags anything the summer tournaments are waiting for
function simOthersDialog(others, d) {
  const hasWC = d.summer.some((x) => x.kind === "wc"), hasCWC = d.summer.some((x) => x.kind === "cwc");
  const why = (r) => (r.kind === "qual" && hasWC ? "needed for the World Cup" : r.kind === "cup" && hasCWC ? "needed for the Club World Cup" : "");
  const need = others.filter((r) => why(r)), rest = others.filter((r) => !why(r));
  const list = (rows) => `<div class="so-l">${rows.map((r) => `<div class="so-r"><span>${esc(r.name)}</span>${why(r) ? `<span class="so-t">${why(r)}</span>` : ""}<span class="meta">${r.done}/${r.total}</span></div>`).join("")}</div>`;
  openModal(`<div class="fp"><h2>Sim the other ${others.length} competitions?</h2>
    <div class="sub">Plays each one to the end of its season. Nothing is skipped: tables, awards, transfers and the history book are all recorded, and your favorites are not touched.</div>
    ${need.length ? `<h4 class="sh">Needed by a summer tournament</h4>${list(need)}` : ""}
    ${rest.length ? `<h4 class="sh">${need.length ? "Everything else" : "Competitions"}</h4>${list(rest)}` : ""}
    <div class="fp-foot"><button class="pri wide" id="so-go">Sim ${others.length} to the end of the season</button><button id="so-no" class="link">Cancel</button></div></div>`);
  $("#so-no").onclick = closeModal;
  $("#so-go").onclick = () => { closeModal(); simIds(others.map((r) => r.sim), { to_end: true }, "Simulating the other competitions..."); };
}

// ---------------------------------------------------------------- club logos
// The game ships without any club logos. A logo file is one JSON file: { "format": "soccersim-logos", "version": 1, "mime": "image/webp", "clubs": { "<club name>": "<base64 or data URL>" } }
const LOGO_FORMAT = "soccersim-logos", LOGO_MAX = 400000;
function knownClubs() {
  try { return new Set(JSON.parse(window.__DATA.leagues).leagues.flatMap((l) => String(l.clubs).split(",").map((x) => x.trim().replace(/ \d+$/, "")))); } catch (e) { return new Set(); }
}
// check a parsed logo file; returns { clubs: {name: dataUrl}, matched, unknown, skipped }
function readLogoPack(obj) {
  if (!obj || typeof obj !== "object" || !obj.clubs || typeof obj.clubs !== "object") throw new Error("That is not a Soccer Sim logo file (no \"clubs\" list).");
  if (obj.format && obj.format !== LOGO_FORMAT) throw new Error("That file says it is \"" + obj.format + "\", not a Soccer Sim logo file.");
  const mime = /^image\/(webp|png|jpeg)$/.test(obj.mime || "") ? obj.mime : "image/webp", known = knownClubs();
  const out = { clubs: {}, matched: 0, unknown: [], skipped: [] };
  for (const [name, v] of Object.entries(obj.clubs)) {
    if (known.size && !known.has(name)) { out.unknown.push(name); continue; }
    let url = null;
    if (typeof v === "string" && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)) url = v;
    else if (typeof v === "string" && /^[A-Za-z0-9+/=]+$/.test(v)) url = "data:" + mime + ";base64," + v;
    if (!url || url.length > LOGO_MAX) { out.skipped.push(name); continue; }
    out.clubs[name] = url; out.matched++;
  }
  if (!out.matched) throw new Error("None of the club names in that file match this game" + (out.unknown.length ? " (for example \"" + out.unknown[0] + "\")." : "."));
  return out;
}
function logoState() {
  const total = knownClubs().size, n = window.__LOGOS ? Object.keys(window.__LOGOS).filter((k) => window.__LOGOS[k]).length : 0;
  return n ? `Logos for <b>${n}</b> of ${total || "all"} clubs.` : "No logo file imported: the game uses its own generated crests.";
}
function logoPanel() {
  return `<h2>Club logos</h2><div class="meta" id="logo-state">${logoState()}</div>
    <p style="margin:8px 0"><input type="file" id="logo-file" accept=".json,application/json" hidden><button id="logo-pick">Import logo file</button> <button id="logo-clear">Remove imported logos</button></p>
    <details class="opts"><summary>What is a logo file?</summary><p class="meta">One .json file with a picture for each club (format ${LOGO_FORMAT}, see docs/LOGOS.md in the project). The game does not include any logos, so you bring your own. They are kept in this browser next to your saves, not inside them, and clubs without a picture keep their generated crest.</p></details>`;
}
function wireLogoPanel() {
  const state = () => { const b = $("#logo-state"); if (b) b.innerHTML = logoState(); };
  const pick = $("#logo-pick"); if (!pick) return;
  pick.onclick = () => $("#logo-file").click();
  $("#logo-file").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const pack = readLogoPack(JSON.parse(await f.text()));
      setLogos({ clubs: pack.clubs });
      let kept = true;
      try { kept = await SIM.logos.save({ format: LOGO_FORMAT, version: 1, clubs: pack.clubs }); } catch (err) { toast(err.message); kept = false; }
      state();
      const extra = (pack.unknown.length ? ` ${pack.unknown.length} not recognized.` : "") + (pack.skipped.length ? ` ${pack.skipped.length} skipped (bad or too large).` : "");
      toast(`Imported ${pack.matched} logos.${extra}${kept ? "" : " Not kept after you close the page."}`, kept);
      if (STATUS && STATUS.has_world) await route();
    } catch (err) { toast(err instanceof SyntaxError ? "That file is not valid JSON." : err.message); }
  };
  $("#logo-clear").onclick = async () => { await SIM.logos.clear(); setLogos(null); state(); toast("Imported logos removed.", true); if (STATUS && STATUS.has_world) await route(); };
}

// ---------------------------------------------------------------- screens
async function viewStart() {
  const st = STATUS;
  const rules = Object.entries(st.rules || {});
  const hasSaves = !!(st.saves && st.saves.length);
  const newCard = `<div class="card"><h3>New world</h3>
      <div class="field"><label for="seed">Seed<span class="meta" style="display:block">same seed, same world</span></label><span class="seedrow"><input type="number" id="seed" value="1" min="1"><button id="seed-rnd">Random</button></span></div>
      <div class="field"><label for="start-year">First season starts in</label><input type="number" id="start-year" value="${esc((st.rules || {}).start_year ?? 2026)}" min="1900" max="2200" style="width:90px"></div>
      <details class="opts"><summary>Options</summary>
        <label class="check"><input type="checkbox" id="su-anim" ${animOn() ? "checked" : ""}> Winner animation when a league or cup finishes</label>
        <label class="check"><input type="checkbox" id="su-god" ${st.god ? "checked" : ""}> God mode (commissioner editor)</label>
        <label class="check"><input type="checkbox" id="rules-on"> Change rules before starting</label>
        <div class="rules" id="rules" hidden>${rules.map(([k, v]) => `<div class="field"><span>${esc(k)}</span><input data-rule="${esc(k)}" data-def="${esc(v)}" value="${esc(v)}" style="width:130px"></div>`).join("")}</div>
      </details>
      <button class="pri wide" id="go-new">Start new world</button></div>`;
  const loadCard = `<div class="card"><h3>${hasSaves ? "Your saves" : "Load a save"}</h3><div id="save-list">${saveRows(st.saves, false)}</div>
      <details class="opts"><summary>Storage, logos and importing</summary><div id="store-note"></div>${saveTools()}${logoPanel()}</details></div>`;
  $("#view").innerHTML = `<div class="start">
    <div class="start-head"><h1>Soccer Sim <span class="ver">${APP_VERSION}</span></h1>
      <div class="start-tag">${starSvg(14)} ${APP_TAG}<span>Follow what matters, sim the rest</span></div>
      <div class="sub">Commissioner mode: no lineups, no relegation, one worldwide player market.</div></div>
    ${hasSaves ? loadCard + newCard : newCard + loadCard}</div>`;
  $("#rules-on").onchange = (e) => ($("#rules").hidden = !e.target.checked);
  $("#seed-rnd").onclick = () => ($("#seed").value = 1 + Math.floor(Math.random() * 99999));
  $("#go-new").onclick = async () => {
    const rules = {};
    if ($("#rules-on").checked) document.querySelectorAll("[data-rule]").forEach((i) => { if (i.value !== i.dataset.def) rules[i.dataset.rule] = i.value; });
    if ($("#start-year").value && $("#start-year").value !== String((st.rules || {}).start_year ?? 2026)) rules.start_year = $("#start-year").value;
    try { localStorage.setItem("ss_anim", $("#su-anim").checked ? "1" : "0"); } catch (e) {}
    await api("/api/settings_set", { god: $("#su-god").checked });
    const ok = await busy("Building the world (about 2 seconds)...", () => api("/api/new", { seed: $("#seed").value, rules }));
    if (ok) { PICK_ASKED = false; location.hash = "#/world"; await refreshStatus(); await route(); }
  };
  wireSaves(false); wireSaveTools(false); wireLogoPanel(); storageNote();
}

function progressRow(c) {
  const btn = c.sim && c.done < c.total ? `<button class="mini" data-lsim="${esc(c.sim)}" title="Sim this competition to the end of its season">Sim</button>` : "";
  return `<div class="row prg"><span class="rl">${c.key ? starBtn(c.key, !!c.fav) : ""}<span class="rt">${c.link}<div class="meta">${c.sub || ""}</div></span></span><span class="prow" style="width:150px"><span style="flex:1">${bar(c.done, c.total)}<div class="meta" style="text-align:right">${c.done}/${c.total}</div></span>${btn}</span></div>`;
}
async function viewWorld() {
  const d = await api("/api/world");
  d.summer = d.summer.filter((x) => x.total > 0);        // a summer tournament with no games this season (e.g. the play-off waiting for its year) is not shown
  const last = d.last; const q = d.quick;
  const chosen = FAVS !== null, onlyFav = chosen && favView();
  const nextTxt = (x) => (x.next ? "next: " + esc(x.next) + (x.next_date ? " &middot; " + x.next_date.text : "") : "finished");
  const rowsOf = (c) => [
    ...c.leagues.map((l) => ({ key: "L:" + l.name, sim: "L:" + l.name, kind: "league", name: l.name, link: leagueLink(l.name), sub: `leader ${esc(l.leader)} (${l.pts} pts) &middot; avg OVR ${l.avg}`, done: l.done, total: l.total })),
    ...c.comps.map((x) => ({ key: x.kind + ":" + c.code, sim: x.id, kind: x.kind, name: x.title, link: `<a href="#/comp/${enc(x.id)}">${esc(x.title)}</a>`, sub: nextTxt(x), done: x.done, total: x.total })),
  ].map((r) => ({ ...r, fav: chosen && FAVS.includes(r.key) }));
  const conts = d.continents.map((c) => ({ c, rows: rowsOf(c) }));
  const others = conts.flatMap((x) => x.rows).filter((r) => chosen && !r.fav && r.done < r.total);
  const hiddenN = conts.flatMap((x) => x.rows).filter((r) => chosen && !r.fav).length;
  const leaguesDone = d.continents.every((c) => c.leagues.every((l) => l.done >= l.total));
  const summerOn = d.summer.length > 0 && leaguesDone;          // the World Cup and friends only show once every league has finished
  const summerCard = summerOn ? `<div class="card summer"><h3>Summer tournaments<small>every league is finished</small></h3>
      ${d.summer.map((x) => progressRow({ sim: x.locked.length ? "" : x.id, link: `<a href="#/comp/${enc(x.id)}">${esc(x.title)}</a>`, sub: x.locked.length ? "locked: needs " + x.locked.map((m) => esc(m.title)).join(", ") : x.next ? "next: " + esc(x.next) : "finished", done: x.done, total: x.total })).join("")}</div>` : "";
  const card = ({ c, rows }) => {
    const shown = onlyFav ? rows.filter((r) => r.fav) : rows;
    if (onlyFav && !shown.length) return "";
    return `<div class="card"><h3><a href="#/continent/${c.code}">${esc(c.name)}</a><small>${c.code}</small></h3>
        ${shown.map((r) => progressRow(r)).join("")}
        ${!c.leagues.length && !shown.length ? `<div class="meta">National teams only (${c.nations} nations)</div>` : ""}
        ${onlyFav ? "" : `<p style="margin:10px 0 0"><button data-sim="${c.code}">Sim this continent: next week</button> <button data-end="${c.code}">to season end</button></p>`}
      </div>`;
  };
  const strip = chosen && !onlyFav ? `<div class="strip"><span class="meta">Tap a star to follow a competition.</span>${others.length ? `<button class="sim-others">Sim the other ${others.length}</button>` : ""}</div>` : "";
  const hidden = onlyFav ? `<div class="card hid"><b>${hiddenN} other competition${hiddenN === 1 ? "" : "s"} hidden</b>
      <div class="meta">Still played, still in the history, awards and news. They just stay off this page.</div>
      ${others.length ? `<button class="pri wide sim-others">Sim the other ${others.length} to the end of the season</button>` : `<div class="meta" style="margin-top:6px">All of them are finished for this season.</div>`}
      <button class="link" id="edit-favs">Edit favorites</button></div>` : "";
  const hint = d.summer.length && !leaguesDone ? `<div class="meta whint">${d.summer.map((x) => esc(x.title)).join(" and ")} appear here once every league has finished.</div>` : "";
  const info = `${last ? `<div class="card" style="margin-bottom:14px"><h3>Season ${last.season} winners</h3>
       <div class="wl">
       ${Object.entries(last.cups).map(([c, x]) => `<div class="row"><span class="meta">${esc(x.name)}</span><span>${clubLink(x.winner)}</span></div>`).join("")}
       ${last.cwc ? `<div class="row"><span class="meta">Club World Cup</span><span>${clubLink(last.cwc[0])}</span></div>` : ""}
       ${last.wc ? `<div class="row"><span class="meta">World Cup</span><span>${natLink(last.wc[0])}</span></div>` : ""}
       </div></div>` : ""}
    ${q ? `<div class="quick"><a class="stat" href="#/league/${enc(q.league.name)}"><div class="k">Strongest league</div><div class="v">${esc(q.league.name)}</div><div class="meta">avg OVR ${q.league.avg}</div></a>
      <a class="stat" href="#/club/${enc(q.club.name)}"><div class="k">Strongest club</div><div class="v">${crest(q.club.name, 18)} ${esc(q.club.name)}</div><div class="meta">rating ${q.club.eff}</div></a>
      <a class="stat" href="#/nation/${enc(q.nation.name)}"><div class="k">Strongest nation</div><div class="v">${flag(q.nation.name, 22)} ${esc(q.nation.name)}</div><div class="meta">rating ${q.nation.eff}</div></a>
      <a class="stat" href="#/club/${enc(q.rich.name)}"><div class="k">Richest club</div><div class="v">${esc(q.rich.name)}</div><div class="meta">${money(q.rich.budget)} yearly income</div></a>
      <a class="stat" href="#/players"><div class="k">Players</div><div class="v">${q.players.toLocaleString()}</div><div class="meta">${q.clubs} clubs &middot; ${q.nations} nations</div></a></div>` : ""}`;
  $("#view").innerHTML = `<div class="whead"><h1>The world</h1>${chosen ? `<div class="seg" role="group"><button data-fv="all" class="${onlyFav ? "" : "on"}">All</button><button data-fv="fav" class="${onlyFav ? "on" : ""}">Favorites ${FAVS.length}</button></div>` : ""}</div>
    <div class="sub">${chosen ? "Star the competitions you care about, then flip to Favorites to hide the rest." : "Click a continent to go deeper, or use the buttons at the top to sim everything."}</div>
    ${onlyFav ? "" : info}
    ${strip}
    <div class="grid">${summerCard}${conts.map(card).join("")}</div>${hidden}${onlyFav ? info : ""}${hint}`;
  const ids = (code) => { const c = d.continents.find((x) => x.code === code); return [...c.leagues.map((l) => "L:" + l.name), ...c.comps.map((x) => x.id)]; };
  document.querySelectorAll("[data-lsim]").forEach((b) => b.onclick = () => simIds([b.dataset.lsim], { to_end: true }));
  document.querySelectorAll("[data-sim]").forEach((b) => b.onclick = () => simIds(ids(b.dataset.sim), { weeks: 1 }));
  document.querySelectorAll("[data-end]").forEach((b) => b.onclick = () => simIds(ids(b.dataset.end), { to_end: true }));
  document.querySelectorAll("[data-fv]").forEach((b) => b.onclick = () => { try { localStorage.setItem("ss_favview", b.dataset.fv); } catch (e) {} route(); });
  document.querySelectorAll("[data-fav]").forEach((b) => b.onclick = async () => {
    const k = b.dataset.fav, y = window.scrollY, cur = new Set(FAVS || []);
    if (cur.has(k)) cur.delete(k); else cur.add(k);
    try { await saveFavs([...cur]); } catch (e) { toast(e.message); return; }
    await route(); window.scrollTo(0, y);
  });
  document.querySelectorAll(".sim-others").forEach((b) => b.onclick = () => simOthersDialog(others, d));
  if ($("#edit-favs")) $("#edit-favs").onclick = () => favPicker(d);
  if (!chosen && !PICK_ASKED) { PICK_ASKED = true; favPicker(d); }
}

async function viewContinent(code) {
  const c = await api("/api/continent?code=" + code);
  const ids = [...c.leagues.map((l) => "L:" + l.name), ...c.comps.map((x) => x.id)];
  $("#view").innerHTML = `<div class="crumbs"><a href="#/world">World</a> / ${esc(c.name)}</div><h1>${esc(c.name)}</h1>
    <div class="sub">Leagues, the continental cup and World Cup qualifying run on the same calendar. Sim them together or open one.</div>
    <p><button data-w="1">Next week</button> <button data-w="4">4 weeks</button> <button id="c-end" class="pri">Continent to season end</button>
    <a href="#/nations/${code}" style="margin-left:14px">National teams of ${esc(c.name)}</a></p>
    <div class="card">${c.leagues.map((l) => progressRow({ link: leagueLink(l.name), sub: `${l.clubs} clubs &middot; leader ${esc(l.leader)} (${l.pts} pts) &middot; avg OVR ${l.avg}`, done: l.done, total: l.total })).join("")}
    ${c.comps.map((x) => progressRow({ link: `<a href="#/comp/${enc(x.id)}">${esc(x.title)}</a>`, sub: x.next ? "next: " + esc(x.next) + (x.next_date ? " &middot; " + x.next_date.text : "") : "finished", done: x.done, total: x.total })).join("")}</div>`;
  document.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => simIds(ids, { weeks: +b.dataset.w }));
  $("#c-end").onclick = () => simIds(ids, { to_end: true });
}

async function viewLeague(name, season) {
  const d = await api("/api/league?name=" + enc(name));
  let past = null;
  if (season) past = await api(`/api/league_season?name=${enc(name)}&season=${season}`);
  const rows = past ? past.rows.map((r) => ({ ...r, form: "", zone: "", ovr: null, gd: r.gf - r.ga })) : d.rows;
  const p = d.progress;
  const inProg = !past && d.next.some((f) => f.hg !== undefined);
  const fx = past ? null : await api("/api/fixtures?name=" + enc(name)).catch(() => null);
  $("#view").innerHTML = `<div class="crumbs"><a href="#/world">World</a> / <a href="#/continent/${d.confed}">${esc(d.confed)}</a> / ${esc(d.name)}</div>
    <h1>${withEmb(d.emblem, 40, esc(d.name))} ${past ? `<span class="tag gold">season ${past.season} final table</span>` : ""}</h1>
    <div class="sub">${d.games} games per club &middot; top ${d.slots} go to the ${esc(d.cup)} &middot; matchweek ${p.done}/${p.total}${d.next_date && !past ? " &middot; next: " + d.next_date.text : ""} &middot; league average OVR ${d.avg}</div>
    <p>${past ? `<button id="l-now">Back to this season</button>` : `
      <button class="pri" id="l-one" ${p.done >= p.total ? "disabled" : ""}>Next game</button>
      <button id="l-rest" ${p.done >= p.total || !inProg ? "disabled" : ""}>Finish matchweek</button>
      ${inProg ? "" : `<button data-m="1" ${p.done >= p.total ? "disabled" : ""}>Next matchweek</button>`}
      <button data-m="4" ${p.done >= p.total ? "disabled" : ""}>Next 4</button>
      <button class="pri" id="l-end" ${p.done >= p.total ? "disabled" : ""}>Rest of season</button>
      <span style="margin-left:10px" class="lbl">go to matchweek</span> <input type="number" id="l-goto" min="1" max="${p.total}" value="${Math.min(p.total, p.done + 1)}"><button id="l-go">Go</button>`}
      <span style="margin-left:14px" class="lbl">past season</span>
      <select id="l-past"><option value="">- choose -</option>${d.seasons.slice().reverse().map((s) => `<option value="${s}" ${past && past.season === s ? "selected" : ""}>Season ${s}</option>`).join("")}</select></p>
    <div class="cols league-cols"><div><div class="scroll"><table><thead><tr><th>#</th><th class="l">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>${past ? "" : "<th>OVR</th><th>Form</th><th class='l'>Leads to</th>"}</tr></thead><tbody>
    ${rows.map((r) => `<tr class="${past ? (r.pos === 1 ? "champ" : "") : r.pos === 1 ? "champ" : r.pos <= d.slots ? "cup" : ""}"><td>${r.pos}</td><td class="l">${clubLink(r.club)}${r.hot ? ' <span class="tag red">hot seat</span>' : ""}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd > 0 ? "+" : ""}${r.gd}</td><td class="pts">${r.pts}</td>${past ? "" : `<td>${ovr(r.ovr)}</td><td>${form(r.form)}</td><td class="l meta">${esc(r.zone)}</td>`}</tr>`).join("")}
    </tbody></table></div></div>
    <div>${past ? `<div class="card"><h3>Champion</h3>${clubLink(past.champion)}<div class="meta">coach ${esc(past.coach || "")}</div></div>` : `
      ${fx && fx.rows.length ? `<div class="card"><h3>Matchweek ${fx.week} <small>${fx.rows.filter((f) => f.done).length}/${fx.rows.length} played${d.next_date ? " &middot; " + d.next_date.text : ""}</small></h3>
        <div class="meta" style="margin-bottom:6px">Pick any game to sim it now, or open its preview first.</div>
        ${fx.rows.map((f, i) => `<div class="fix2"><div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">${f.done ? f.hg + "-" + f.ag : "v"}</span><span>${clubLink(f.a)}</span></div>
          <div class="fx-m">${f.rivalry ? `<span class="tag red">${esc(f.rivalry.name)}</span>` : ""}<a href="#/matchup/${enc(d.id)}/${enc(f.h)}/${enc(f.a)}">${f.done ? "Match info" : "Preview"}</a>${f.done ? "" : `<button data-fx="${i}">Sim this game</button>`}</div></div>`).join("")}</div>` : ""}
      ${inProg && !d.last.length ? "" : `<div class="card" ${inProg ? 'style="margin-top:14px"' : ""}><h3>${d.last.length ? "Last matchweek" : "Next matchweek"} <small>${d.last.length ? (d.last_date ? d.last_date.text : "") : (d.next_date ? d.next_date.text : "")}</small></h3>
      ${(d.last.length ? d.last.map((f) => `<div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">${f.hg}-${f.ag}</span><span>${clubLink(f.a)}</span></div>`) : d.next.map((f) => `<div class="fix"><span class="h">${clubLink(f.h)}</span><span class="s">v</span><span>${clubLink(f.a)}</span></div>`)).join("")}</div>`}`}
      <div class="card" style="margin-top:14px"><h3>Champions</h3>
      ${d.champs.length ? d.champs.slice(0, 15).map((c) => `<div class="row"><span>S${c.season} ${clubLink(c.club)}</span><span class="meta">${c.pts} pts &middot; ${esc(c.coach || "")}${c.date ? " &middot; " + c.date.text : ""}</span></div>`).join("") : '<div class="meta">No completed season yet.</div>'}</div></div></div>`;
  $("#view").insertAdjacentHTML("beforeend", `<div class="card" style="margin-top:14px"><h3>Player stats ${past ? "(season " + past.season + ")" : "(this season)"}</h3><div id="cstats"></div></div>`);
  loadStats($("#cstats"), d.id, past ? past.season : null);
  document.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => simComp(d.id, { matches: +b.dataset.m }));
  if ($("#l-one")) $("#l-one").onclick = () => simComp(d.id, { fixtures: 1 });
  document.querySelectorAll("[data-fx]").forEach((b) => b.onclick = () => { const f = fx.rows[+b.dataset.fx]; simComp(d.id, { fixture: { h: f.h, a: f.a } }); });
  if ($("#l-rest")) $("#l-rest").onclick = () => simComp(d.id, { matches: 1 });
  if ($("#l-end")) $("#l-end").onclick = () => simComp(d.id, { to_end: true });
  if ($("#l-go")) $("#l-go").onclick = () => { const n = parseInt($("#l-goto").value) - p.done; if (n > 0) simComp(d.id, { matches: n }); };
  if ($("#l-now")) $("#l-now").onclick = () => (location.hash = "#/league/" + enc(name));
  $("#l-past").onchange = (e) => (location.hash = e.target.value ? `#/league/${enc(name)}/${e.target.value}` : "#/league/" + enc(name));
}

function sortRows(rows, key, dir) {
  return rows.slice().sort((a, b) => { const x = a[key], y = b[key]; return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir || b.ovr - a.ovr; });
}

// ---- v15 club tabs: finance, academy, stadium ----------------------------------------------------------
const dotsHTML = (n, max = 3) => `<span class="dots">${"●".repeat(n)}<s>${"●".repeat(max - n)}</s></span>`;
function barsHTML(rows, h) {
  const m = Math.max(1e-9, ...rows.map((r) => Math.abs(r.v)));
  return `<div class="bars" style="height:${h * 2 + 18}px">${rows.map((r) => `<div class="bar-c" title="${esc(r.title || "")}"><div class="bar-top" style="height:${h}px">${r.v >= 0 ? `<i style="height:${Math.max(2, Math.abs(r.v) / m * h)}px"></i>` : ""}</div><div class="bar-bot" style="height:${h}px">${r.v < 0 ? `<i class="neg" style="height:${Math.max(2, Math.abs(r.v) / m * h)}px"></i>` : ""}</div><span>${esc(r.label)}</span></div>`).join("")}</div>`;
}
const LROWS = [["TV money", "tv", 1], ["Gate (tickets)", "gate", 1], ["Prize money", "prize", 1], ["Sponsors", "sponsor", 1], ["Player sales", "sales", 1], ["Owner funding", "owner", 1]];
const CROWS = [["Wages", "wages"], ["Running costs", "running"], ["Transfers in", "transfers"], ["Academy", "academy"], ["Stadium project", "stadium"], ["Interest", "interest"]];
function financeTab(c, sel) {
  const f = c.finance, L = f.ledger, row = (sel != null ? L.find((r) => r.season === sel) : null) || L[L.length - 1];
  if (!row) return `<div class="empty">The books open after the first completed season.</div>`;
  const prev = L[L.indexOf(row) - 1], costs = CROWS.reduce((a, [, k]) => a + row[k], 0), over = f.payroll / Math.max(1e-9, c.budget) > f.wage_cap;
  const surplus = [];
  L.forEach((r, i) => { const q = L[i - 1]; if (!q) return; if (r.acad != null && q.acad != null && r.acad - q.acad >= 0.4) surplus.push([r.season, `Academy level ${Math.round(q.acad)} to ${Math.round(r.acad)}`]); if (r.cap != null && q.cap != null && r.cap > q.cap) surplus.push([r.season, `Stadium expansion +${Math.round((r.cap - q.cap) * 10) / 10}k seats`]); });
  return `<div class="cols"><div>
    <div class="card"><h3>Cash <small>${c.finance.debt > 0 ? '<span class="tag red">in debt</span>' : ""}</small></h3>
      <div style="display:flex;justify-content:space-between;align-items:flex-end"><span class="bigv">${money(c.funds)}</span><span class="meta">${prev ? moneyS(row.cash - prev.cash) + " vs last season" : ""}</span></div>
      <div class="mbar" style="margin:8px 0 4px"><i style="width:${Math.min(100, c.funds / Math.max(1e-9, f.comfort) * 100)}%"></i></div>
      <div class="meta">Comfort level: 2x yearly income = ${money(f.comfort)}. Cash above it is invested in the academy and stadium. ${f.debt > 0 ? "Debt: " + money(f.debt) + "." : ""}</div></div>
    <div class="card" style="margin-top:14px"><h3>Season ${row.season} ledger <small><select id="fin-s">${L.map((r) => `<option ${r.season === row.season ? "selected" : ""}>${r.season}</option>`).join("")}</select></small></h3>
      ${LROWS.filter(([, k]) => row[k] || k !== "owner").map(([t, k]) => `<div class="row"><span>${t}</span><span class="pts">${moneyS(row[k])}</span></div>`).join("")}
      <div class="row" style="font-weight:700"><span>Income</span><span>${money(row.income)}</span></div>
      ${CROWS.map(([t, k]) => `<div class="row"><span>${t}</span><span class="${row[k] ? "neg" : ""}">${row[k] ? "-" + money(row[k]) : money(0)}</span></div>`).join("")}
      <div class="row" style="font-weight:700"><span>Costs</span><span>-${money(costs)}</span></div>
      <div class="row" style="font-weight:700"><span>Profit</span><span class="${row.profit >= 0 ? "pts" : "neg"}">${moneyS(row.profit)}</span></div>
      <div class="meta" style="margin-top:6px">Paid out to the transfer budget after the season: ${money(row.payout)}. Prize money from the Club World Cup arrives every fourth season; the yearly income counts a quarter of it each year.</div></div></div>
    <div><div class="card"><h3>Wage bill vs yearly income</h3>
      <div style="display:flex;justify-content:space-between"><span class="bigv" style="${over ? "color:var(--red)" : ""}">${Math.round(f.wage_ratio * 100)}%</span><span class="meta">limit ${Math.round(f.wage_cap * 100)}%</span></div>
      <div class="mbar" style="margin:8px 0 4px"><i style="width:${Math.min(100, f.wage_ratio / f.wage_cap * 100)}%;${over ? "background:var(--red)" : ""}"></i></div>
      <div class="meta">Wages ${money(f.payroll)} of ${money(c.budget)} yearly income. Room left: ${money(f.wage_room)}. Above the limit the club cannot sign anyone on higher wages.</div></div>
    <div class="card" style="margin-top:14px"><h3>Profit by season</h3>${barsHTML(L.slice(-8).map((r) => ({ label: "S" + r.season, v: r.profit, title: moneyS(r.profit) })), 54)}</div>
    <div class="card" style="margin-top:14px"><h3>Where the surplus went</h3>${surplus.length ? surplus.slice(-5).reverse().map(([sn, t]) => `<div class="row"><span>S${sn}</span><span>${esc(t)}</span></div>`).join("") : '<div class="meta">Nothing yet. A club invests once it has money above its comfort level.</div>'}</div></div></div>`;
}
function academyTab(c) {
  const a = c.finance.academy, sc = a.scouting, tot = a.origins.reduce((x, o) => x + o.n, 0);
  const top = a.origins.slice(0, 5), rest = a.origins.slice(5).reduce((x, o) => x + o.n, 0);
  const prospects = c.squad.filter((p) => p.age <= 21).sort((x, y) => y.pot - x.pot).slice(0, 5);
  return `<div class="cols"><div>
    <div class="card"><h3>Academy level</h3><div style="display:flex;justify-content:space-between;align-items:flex-end"><span class="bigv">${a.level} <span class="meta" style="font-size:15px">of 10</span></span><span class="meta">${money(a.cost)} a year</span></div>
      <div class="mbar" style="margin:8px 0"><i style="width:${a.level * 10}%"></i></div>
      <div class="meta">The club is aiming for level ${a.target}. Spending is chosen automatically from the club's money; an academy that is starved for years loses a level.</div></div>
    <div class="card" style="margin-top:14px"><h3>Where recent graduates came from</h3>
      ${top.length ? top.map((o) => `<div class="ir"><span class="n">${natLink(o.nat)}</span><div class="mbar"><i style="width:${Math.round(o.share * 100)}%"></i></div><span class="v">${Math.round(o.share * 100)}%</span></div>`).join("") + (rest ? `<div class="ir"><span class="n">Other nations</span><div class="mbar"><i style="width:${Math.round(rest / Math.max(1, tot) * 100)}%"></i></div><span class="v">${Math.round(rest / Math.max(1, tot) * 100)}%</span></div>` : "") : '<div class="meta">No graduates yet.</div>'}
      <div class="meta" style="margin-top:6px">Foreign intake slots a year: ${sc.slots}. Prospects choose by academy reputation, league, money and chance to play.</div></div>
    <div class="card" style="margin-top:14px"><h3>Recent graduates</h3>${a.graduates.length ? a.graduates.map((g) => `<div class="row"><span>${esc(g.name)} <span class="meta">${natLink(g.nat)} &middot; ${g.pos}, ${g.age}</span></span><span>${g.ovr} / <b class="pts">${g.pot}</b>${g.club && g.club !== c.name ? ` <span class="meta">now ${clubLink(g.club)}</span>` : ""}</span></div>`).join("") : '<div class="meta">No graduates yet.</div>'}</div></div>
    <div><div class="card"><h3>Scouting reach</h3>${sc.regions.map((r) => `<div class="row"><span>${esc(r.name)}${r.home ? ' <span class="meta">home</span>' : ""}</span>${dotsHTML(r.dots)}</div>`).join("")}
      <div class="row"><span>Pipelines</span><span class="meta">${sc.pipelines.length ? sc.pipelines.map(natLink).join(" &middot; ") : "none yet"}</span></div>
      <div class="meta" style="margin-top:6px">Reach grows with the academy level and the club's name. A pipeline is a country the club keeps signing kids from, which makes its best youngsters more likely to arrive.</div></div>
    <div class="card" style="margin-top:14px"><h3>Best prospects in the squad</h3>${prospects.length ? prospects.map((p) => `<div class="row"><span>${playerLink(p)} <span class="meta">${p.pos}, ${p.age}</span></span><span>${p.ovr} / <b class="pts">${p.pot}</b></span></div>`).join("") : '<div class="meta">No players under 21.</div>'}</div></div></div>`;
}
function stadiumTab(c, rivs) {
  const s = c.finance.stadium, L = c.finance.ledger, caps = L.filter((r) => r.cap != null).slice(-8);
  const live = (rivs || []).filter((r) => r.intensity >= 0.7);
  return `<div class="cols"><div>
    <div class="card"><h3>Capacity</h3><div style="display:flex;justify-content:space-between;align-items:flex-end"><span class="bigv">${s.capacity.toLocaleString()}</span><span class="meta">${Math.round(s.fill * 100)}% full</span></div>
      <div class="mbar" style="margin:8px 0"><i style="width:${Math.round(s.fill * 100)}%"></i></div>
      <div class="meta">Demand this season: ${s.demand.toLocaleString()} fans${s.turned_away > 0 ? `. About ${s.turned_away.toLocaleString()} could not get in.` : "."}${s.honeymoon ? " A new ground is open: the fan base is still growing." : ""}</div></div>
    <div class="card" style="margin-top:14px"><h3>Expansion project</h3>${s.project ? `<div class="row"><span>+${s.project.add.toLocaleString()} seats</span><span>${s.project.years - s.project.left} of ${s.project.years} seasons built</span></div><div class="mbar" style="margin:6px 0"><i style="width:${Math.round((s.project.years - s.project.left) / s.project.years * 100)}%"></i></div><div class="meta">Cost ${money(s.project.cost)}${s.project.big ? ". A big rebuild: the fans will celebrate the opening." : "."} Chosen automatically when demand stays above capacity and the club has spare cash.</div>` : '<div class="meta">No project under way. The club builds when demand stays above capacity and it has spare cash.</div>'}</div></div>
    <div><div class="card"><h3>Derbies</h3>${live.length ? live.map((r) => `<div class="row"><span>${clubLink(r.a === c.name ? r.b : r.a)} <span class="meta">${esc(r.name)}</span></span><span class="pts">live</span></div>`).join("") : '<div class="meta">No live derbies in this league.</div>'}<div class="meta" style="margin-top:6px">Each live rivalry fills the ground and lifts ticket income by 3% (up to three). A league full of rivalries is worth more to broadcasters too.</div></div>
    <div class="card" style="margin-top:14px"><h3>Capacity by season</h3>${caps.length > 1 ? lineChart(caps.map((r) => [r.season, r.cap]), 360, 140, "#3ddc84", false) : '<div class="meta">Shows after a few seasons.</div>'}</div>
    <div class="card" style="margin-top:14px"><h3>New stadium</h3><div class="meta">A club that outgrows its ground by a lot builds a bigger one over several seasons. When it opens, the fan base gets a one-season boost.</div></div></div></div>`;
}
async function viewClub(name) {
  const c = await api("/api/club?name=" + enc(name));
  const render = () => {
    const rows = sortRows(c.squad, SORT.key, SORT.dir);
    const th = (k, t, l) => `<th class="sortable ${l ? "l" : ""}" data-s="${k}">${t}${SORT.key === k ? (SORT.dir < 0 ? " v" : " ^") : ""}</th>`;
    $("#squad").innerHTML = `<table><thead><tr>${th("name", "Player", 1)}${th("pos", "Pos", 1)}${th("age", "Age")}${th("ovr", "OVR")}${th("pot", "Pot")}${th("nat", "Nation", 1)}${th("contract", "Contract")}${th("wage", "Wage/yr")}${th("value", "Value")}${th("gls", "G")}${th("ast", "A")}${th("cs", "CS")}</tr></thead><tbody>
      ${rows.map((p) => `<tr><td class="l">${playerLink(p)}</td><td class="l pos-${esc(p.pos)}">${esc(p.pos)}</td><td>${p.age}</td><td>${ovr(p.ovr)}</td><td>${p.pot}</td><td class="l">${natLink(p.nat)}</td><td>${p.contract}</td><td>${money(p.wage)}</td><td>${money(p.value)}</td><td>${p.gls ?? "-"}</td><td>${p.ast ?? "-"}</td><td>${p.cs ? p.cs : ""}</td></tr>`).join("")}</tbody></table>`;
    document.querySelectorAll("#squad [data-s]").forEach((h) => h.onclick = () => { SORT = { key: h.dataset.s, dir: SORT.key === h.dataset.s ? -SORT.dir : (h.dataset.s === "name" || h.dataset.s === "pos" || h.dataset.s === "nat" ? 1 : -1) }; render(); });
  };
  const co = c.coach;
  $("#view").innerHTML = `<div class="crumbs"><a href="#/world">World</a> / <a href="#/continent/${c.confed}">${esc(c.confed)}</a> / ${leagueLink(c.league)} / ${esc(c.name)}</div>
    <h1 class="hcrest">${crest(c.name, 52)}<span>${esc(c.name)}</span></h1>
    ${c.cwc.length ? `<div style="margin:4px 0 6px"><span class="tag gold">World champions${c.cwc.length > 1 ? " x" + c.cwc.length : ""}</span> <span class="meta">Club World Cup ${c.cwc.map((x) => "S" + x).join(", ")}</span></div>` : ""}
    <div class="sub">${leagueLink(c.league)} &middot; ${c.titles.length} league title(s) &middot; ${c.cups.length} continental cup(s) &middot; ${c.cwc.length} Club World Cup(s) &middot; last finish ${c.last_finish || "-"}</div>
    <div class="cols3" style="grid-template-columns:repeat(5,1fr);margin-bottom:14px">
      <div class="stat"><div class="k">Team OVR (best 11)</div><div class="v">${c.ovr}</div></div>
      <div class="stat"><div class="k">With coach</div><div class="v">${c.eff}</div></div>
      <div class="stat"><div class="k">Yearly income</div><div class="v">${money(c.budget)}</div></div>
      <div class="stat"><div class="k">Transfer funds</div><div class="v">${money(c.funds)}</div></div>
      <div class="stat"><div class="k">Squad</div><div class="v">${c.squad_size}</div></div></div>
    <div class="tabs" id="ct-tabs"><button class="on" data-ct="ov">Overview</button><button data-ct="fin">Finance</button><button data-ct="acad">Academy</button><button data-ct="stad">Stadium</button></div>
    <div id="ct-ov"><div class="cols"><div><h2 style="margin-top:0">Squad</h2><div class="scroll" id="squad"></div><div style="margin-top:14px">${trophyRoom(c.trophies, "Trophy room")}</div></div>
    <div><div class="card"><h3>Coach <small>${co.hot ? '<span class="tag red">hot seat</span>' : ""}</small></h3>
      <div class="kv"><span>Name</span><span>${esc(co.name)} (${esc(co.nat)}), ${co.age}</span><span>Prestige</span><span>${co.prestige}</span><span>Style</span><span>${esc(co.personality)} / ${esc(co.skill)}</span><span>Here</span><span>${co.stint} season(s)</span><span>Career</span><span>${co.titles} titles, ${co.cups} cups, ${co.win}% wins</span></div></div>
    <div class="card" style="margin-top:14px"><h3>Money</h3><div class="kv"><span>Income</span><span>${money(c.income)}</span><span>Cup prizes (last)</span><span>${money(c.prize_prev)}</span><span>Sold last summer</span><span>${money(c.sold)}</span><span>Bought last summer</span><span>${money(c.bought)}</span><span>Stature</span><span>${c.stature}</span></div></div>
    <div class="card" style="margin-top:14px"><h3>Recent transfers</h3>${c.transfers.length ? c.transfers.map((t) => `<div class="row"><span><span class="tag ${t.dir === "IN" ? "green" : "red"}">${t.dir}</span> ${esc(t.player)} <span class="meta">(${t.ovr}, ${t.age})</span><div class="meta">${t.dir === "IN" ? "from" : "to"} ${clubLink(t.other)} &middot; S${t.season}</div></span><b>${money(t.fee)}</b></div>`).join("") : '<div class="meta">None yet.</div>'}</div>
    <div class="card" style="margin-top:14px"><h3>League finishes</h3>${c.finishes.length ? c.finishes.slice(0, 10).map((f) => `<div class="row"><span>Season ${f.season}</span><span>${f.pos}${["st", "nd", "rd"][f.pos - 1] || "th"} &middot; ${f.pts} pts</span></div>`).join("") : '<div class="meta">No completed season yet.</div>'}</div></div></div><div id="ct-chart"></div></div>
    <div id="ct-fin" hidden></div><div id="ct-acad" hidden></div><div id="ct-stad" hidden></div>`;
  render();
  { // v15 tabs: the finance, academy and stadium views are built when first opened
    const built = {}, show = async (t) => {
      document.querySelectorAll("#ct-tabs [data-ct]").forEach((b) => b.classList.toggle("on", b.dataset.ct === t));
      ["ov", "fin", "acad", "stad"].forEach((k) => { $("#ct-" + k).hidden = k !== t; });
      if (built[t] || t === "ov") return; built[t] = 1;
      if (t === "fin") { const draw = (sel) => { $("#ct-fin").innerHTML = financeTab(c, sel); const sl = $("#fin-s"); if (sl) sl.onchange = (e) => draw(+e.target.value); }; draw(null); }
      if (t === "acad") $("#ct-acad").innerHTML = academyTab(c);
      if (t === "stad") { const rv = await api("/api/rivalries?club=" + enc(c.name)).catch(() => ({ rows: [] })); $("#ct-stad").innerHTML = stadiumTab(c, rv.rows); }
    };
    document.querySelectorAll("#ct-tabs [data-ct]").forEach((b) => b.onclick = () => show(b.dataset.ct));
  }
  const fin = c.finishes.slice().reverse().map((f) => [f.season, f.pos]);
  if (fin.length > 1) $("#ct-chart").insertAdjacentHTML("beforeend", `<div class="card" style="margin-top:14px"><h3>League finish by season <small>lower is better</small></h3>${lineChart(fin, 620, 170, "#4aa8ff", true)}</div>`);
}

// ---- trophy rooms ------------------------------------------------------------------------------------
function trophyRoom(list, title) {
  if (!list || !list.length) return `<div class="card"><h3>${title || "Trophy room"}</h3><div class="meta">No trophies yet.</div></div>`;
  const groups = [["world", "World"], ["continental", "Continental"], ["domestic", "Domestic"], ["individual", "Individual awards"]];
  const tile = (t) => `<div class="tro ${t.count ? "" : "none"}">${emblem(t.emblem, 54)}<div class="tro-info"><b>${esc(t.title)}</b>
    <div class="tro-n">${t.count ? "&times;" + t.count : "<span class='meta'>runner-up only</span>"}</div>
    <div class="meta">${t.count ? "S" + t.seasons.join(", S") : ""}${t.runner_up.length ? (t.count ? " &middot; " : "") + "2nd: S" + t.runner_up.join(", S") : ""}</div></div></div>`;
  return `<div class="card"><h3>${title || "Trophy room"}</h3>${groups.map(([g, name]) => {
    const items = list.filter((t) => t.group === g); return items.length ? `<div class="tro-group"><div class="lbl">${name}</div><div class="tro-grid">${items.map(tile).join("")}</div></div>` : "";
  }).join("")}</div>`;
}
const withEmb = (spec, size, inner) => `<span class="h1emb">${spec ? emblem(spec, size) : ""}<span>${inner}</span></span>`;

// ---- brackets ------------------------------------------------------------------------------------
// ties of the round being played that already have a result (single games simmed from the list) show it in the bracket before the round is over
function liveBracket(b, gm) {
  if (!b || !gm || !gm.ready || !gm.games || !gm.games.length) return b;
  const up = (b.upcoming || []).map((u) => {
    const g = gm.games.find((x) => x.done && ((x.a === u.a && x.b === u.b) || (x.a === u.b && x.b === u.a)));
    if (!g || !g.text) return u;
    const sc = (g.text.split("(agg")[0].match(/\d+-\d+/g) || []).map((m) => m.split("-").map(Number));
    if (!sc.length) return u;
    const fl = g.a !== u.a, o = (l) => (fl ? [l[1], l[0]] : l);
    const agg = /\(agg (\d+)-(\d+)\)/.exec(g.text), legs = sc.map(o);
    const v = { ...u, gdone: true, legs };
    if (g.leg === 1) return v;                                             // 1st leg only: still undecided
    if (agg) v.agg = o([+agg[1], +agg[2]]);
    if (!v.agg) v.agg = legs.reduce((a, l) => [a[0] + l[0], a[1] + l[1]], [0, 0]);
    v.pending = false; v.winner = g.winner; v.how = /pens/.test(g.text) ? "pens" : /aet/.test(g.text) ? "aet" : "";
    return v;
  });
  return { ...b, upcoming: up };
}
function bracketHTML(b, nation, cur) {
  const R = b.rounds.length;
  if (!R) return '<div class="empty">The bracket appears when the field is set.</div>';
  const L = nation ? natLink : clubLink;
  const n0 = 1 << (R - 1);
  const cols = Array.from({ length: R }, () => []);
  b.ties.forEach((t) => cols[t.round] && cols[t.round].push(t));
  const done = b.ties.length ? Math.max(...b.ties.map((t) => t.round)) + 1 : 0;
  if (done < R) b.upcoming.forEach((u) => cols[done].push({ pending: true, ...u }));
  const K = done < R && cols[done].length ? done : done - 1;
  for (let r = K - 1; r >= 0; r--) {          // order each round so feeders sit next to their tie
    const ord = [];
    cols[r + 1].forEach((t) => [t.a, t.b].forEach((team) => {
      const f = cols[r].find((x) => x.winner === team && !ord.includes(x)); if (f) ord.push(f);
    }));
    cols[r].forEach((x) => { if (!ord.includes(x)) ord.push(x); });
    cols[r] = ord;
  }
  const W = 210, GAP = 46, H = 80, BH = 60, HEAD = 26;
  const width = R * (W + GAP), height = n0 * H + HEAD;
  const yc = (r, j) => HEAD + (j + 0.5) * (1 << r) * H;
  let svg = "", boxes = "";
  for (let r = 0; r < R; r++) {
    const x = r * (W + GAP);
    boxes += `<div class="bk-head" style="left:${x}px;width:${W}px">${esc(b.rounds[r])}</div>`;
    const cnt = n0 >> r;
    for (let j = 0; j < cnt; j++) {
      const t = cols[r][j], y = yc(r, j) - BH / 2;
      if (r < R - 1) { const y2 = yc(r + 1, j >> 1), x1 = x + W, x2 = x + W + GAP;
        svg += `<path d="M${x1} ${yc(r, j)} H${x1 + GAP / 2} V${y2} H${x2}" class="bk-line"/>`; }
      if (!t) { boxes += `<div class="bk-tie empty" style="left:${x}px;top:${y}px;width:${W}px;height:${BH}px"><div class="bk-row"><span class="meta">to be decided</span></div></div>`; continue; }
      const sc = (side) => {
        if (t.pending) return t.legs && t.legs.length ? `<i>${t.legs[0][side]}</i>` : "";
        if (t.legs.length === 1) return `<i>${t.legs[0][side]}</i>`;
        return `<i>${t.legs.map((l) => l[side]).join(" ")}</i><b>${t.agg[side]}</b>`;
      };
      const row = (team, side) => `<div class="bk-row ${t.winner === team ? "win" : t.winner ? "lose" : ""}"><span class="nm">${L(team)}</span>${sc(side)}</div>`;
      const foot = t.pending ? (t.legs && t.legs.length ? "1st leg played" : "") : (t.legs.length > 1 ? `2 legs` : "") + (t.how ? (t.legs.length > 1 ? " &middot; " : "") + esc(t.how) : "");
      const live = t.pending && !t.gdone && cur && cur.ready, link = cur ? `#/matchup/${enc(cur.cid)}/${enc(t.a)}/${enc(t.b)}` : "";
      boxes += `<div class="bk-tie ${live ? "live" : ""} ${r > K ? "dim" : ""}" title="${t.date ? t.date : ""}" style="left:${x}px;top:${y}px;width:${W}px;height:${BH}px">${row(t.a, 0)}${row(t.b, 1)}<div class="bk-foot">${foot}${t.date ? (foot ? " &middot; " : "") + t.date.slice(5).replace("-", "/") : ""}</div>${live ? `<a class="bk-play" href="${link}" title="Preview and play this game">&#9654;</a>` : cur && (!t.pending || t.gdone) ? `<a class="bk-info" href="${link}" title="Match info">i</a>` : ""}</div>`;
    }
  }
  return `<div class="bk-box" data-cur="${K * (W + GAP)}" data-w="${width}" data-h="${height}">
    <div class="bk-tools"><button data-z="-" title="Zoom out">&minus;</button><button data-z="+" title="Zoom in">+</button><button data-z="fit" title="Fit the whole bracket on screen">Fit</button><button data-z="cur" title="Jump to the round being played">Current round</button><span class="meta bk-hint">drag to move, pinch or buttons to zoom</span></div>
    <div class="bk-wrap"><div class="bk-zoom" style="width:${width}px;height:${height}px"><div class="bk" style="width:${width}px;height:${height}px"><svg width="${width}" height="${height}">${svg}</svg>${boxes}</div></div></div></div>`;
}
// zoom (buttons, ctrl+wheel, two-finger pinch) and drag-to-move for every bracket under `root`
function wireBrackets(root) {
  (root || document).querySelectorAll(".bk-box").forEach((box) => {
    if (box.dataset.wired) return; box.dataset.wired = "1";
    const wrap = box.querySelector(".bk-wrap"), zoom = box.querySelector(".bk-zoom"), bk = box.querySelector(".bk");
    const W0 = +box.dataset.w, H0 = +box.dataset.h; let s = 1;
    const clamp = (v) => Math.max(0.2, Math.min(1.6, v));
    const set = (ns, cx, cy) => {
      ns = clamp(ns); const r = wrap.getBoundingClientRect(); cx = cx == null ? r.width / 2 : cx; cy = cy == null ? r.height / 2 : cy;
      const px = (wrap.scrollLeft + cx) / s, py = (wrap.scrollTop + cy) / s;
      s = ns; bk.style.transform = "scale(" + s + ")"; zoom.style.width = W0 * s + "px"; zoom.style.height = H0 * s + "px";
      wrap.scrollLeft = px * s - cx; wrap.scrollTop = py * s - cy;
    };
    const fit = () => Math.min(1, (wrap.clientWidth - 8) / W0, 1.6);
    const toCur = () => { wrap.scrollLeft = Math.max(0, +box.dataset.cur * s - 8); wrap.scrollTop = 0; };
    box.querySelectorAll("[data-z]").forEach((b) => b.onclick = () => {
      const z = b.dataset.z; if (z === "+") set(s * 1.25); else if (z === "-") set(s / 1.25); else if (z === "fit") { set(fit()); wrap.scrollLeft = 0; wrap.scrollTop = 0; } else { toCur(); }
    });
    wrap.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); const r = wrap.getBoundingClientRect(); set(s * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    let d0 = 0, s0 = 1;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    wrap.addEventListener("touchstart", (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); s0 = s; } }, { passive: true });
    wrap.addEventListener("touchmove", (e) => { if (e.touches.length === 2 && d0) { e.preventDefault(); const r = wrap.getBoundingClientRect(), t = e.touches; set(s0 * dist(t) / d0, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top); } }, { passive: false });
    wrap.addEventListener("touchend", () => { d0 = 0; }, { passive: true });
    let drag = null;                                          // mouse drag to move (touch already scrolls natively)
    wrap.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("a,button")) return; drag = [e.clientX, e.clientY, wrap.scrollLeft, wrap.scrollTop]; wrap.classList.add("grab"); });
    window.addEventListener("pointermove", (e) => { if (drag) { wrap.scrollLeft = drag[2] - (e.clientX - drag[0]); wrap.scrollTop = drag[3] - (e.clientY - drag[1]); } });
    window.addEventListener("pointerup", () => { drag = null; wrap.classList.remove("grab"); });
    box._cur = toCur; box._fit = () => set(Math.max(0.55, Math.min(1, fit())));
    box._fit(); toCur();
  });
}

function pastFinals(list, nation) {
  if (!list || !list.length) return "";
  const L = nation ? natLink : clubLink;
  return `<h2>Previous finals</h2><div class="scroll" style="max-height:300px"><table><tbody>${list.map((f) => `<tr><td class="l meta">S${f.season}</td><td class="l meta">${f.date.text}</td><td class="l"><b>${L(f.winner)}</b> <span class="meta">${f.runner_up ? "beat " + esc(f.runner_up) : ""}</span></td><td>${esc(f.text)}</td><td class="l meta">${esc(f.coach || "")}</td></tr>`).join("")}</tbody></table></div>`;
}


// the games of the round being played, each with Preview and Sim this game; later rounds stay locked until this one is done
function roundCard(g, id, filter, opt) {
  if (!g || !g.event) return "";
  opt = opt || {};
  const L = g.nation ? natLink : clubLink, head = esc(g.event.label) + (g.event.date ? " &middot; " + g.event.date.text : "");
  if (!g.ready) return `<div class="card round-card"><h3>${head}</h3><div class="meta">${esc(g.why || "")}</div></div>`;
  const rows = g.games.filter((x) => !filter || filter(x));
  const left = g.total - g.played, ok0 = id + "|", dflt = opt.held || window.innerWidth > 700 || g.total <= 4;
  const isOpen = (k, d) => (ok0 + k in ROPEN ? ROPEN[ok0 + k] : d), open = isOpen("", dflt);
  const score = (x) => { const m = (x.text || "").split("(agg")[0].match(/\d+-\d+/g) || []; return x.leg === 2 && m.length > 1 ? m[1] : m[0] || ""; };
  const one = (x) => {
    const w = x.winner, t = x.text || "", det = [];
    const ag = /\(agg (\d+-\d+)\)/.exec(t); if (x.done && ag) det.push("agg " + ag[1]);
    if (x.done && x.leg === 1) det.push("1st leg");
    const oc = outcomeText(w, t, false); if (x.done && oc) det.push(`<b>${esc(oc)}</b>`);
    return `<div class="fix2"><div class="fix"><span class="h ${w === x.a ? "won" : w ? "lost" : ""}">${L(x.a)}${w === x.a ? " &#10003;" : ""}</span><span class="s">${x.done ? esc(score(x)) : "v"}</span><span class="${w === x.b ? "won" : w ? "lost" : ""}">${L(x.b)}${w === x.b ? " &#10003;" : ""}</span></div>
      <div class="fx-m">${x.rivalry ? `<span class="tag red">${esc(x.rivalry.name)}</span>` : ""}${det.length ? `<span class="meta">${det.join(" &middot; ")}</span>` : ""}<a href="#/matchup/${enc(id)}/${enc(x.a)}/${enc(x.b)}" title="${x.home ? "at " + esc(x.home) : "neutral venue"}">${x.done ? "Match info" : "Preview"}</a>${x.done || opt.held ? "" : `<button class="mini" data-gm="${esc(x.key)}">Sim</button>`}</div></div>`;
  };
  let list, grouped = rows.some((x) => x.grl);
  if (grouped) {            // a group matchday: one block per group, each with its own Sim button (always visible), its games folded away
    const order = []; for (const x of rows) if (!order.includes(x.grl)) order.push(x.grl);
    list = order.map((gl) => { const gr = rows.filter((x) => x.grl === gl), gleft = gr.filter((x) => !x.done).length, gopen = isOpen(gl || "", opt.held || window.innerWidth > 700);
      return `<div class="grp-h"><b>${esc(gl || "")}</b> <span class="meta">${gleft ? gleft + " to play" : "played"}</span>${gleft && !opt.held ? `<button class="mini" data-grp="${esc(gl)}">Sim group</button>` : ""}</div>
        <details class="rlist" data-rk="${esc(gl || "")}" ${gopen ? "open" : ""}><summary class="meta">${gr.length} game${gr.length === 1 ? "" : "s"}</summary>${gr.map(one).join("")}</details>`; }).join("");
  } else list = rows.map(one).join("");
  const nx = opt.next && opt.next.event ? `${esc(opt.next.event.label)}${opt.next.event.date ? " &middot; " + opt.next.event.date.text : ""}` : "";
  return `<div class="card round-card${opt.held ? " held" : ""}"><h3>${head} <small>${g.played}/${g.total} played</small></h3>
    <div class="rstrip">${bar(g.played, g.total)}</div>
    ${opt.held ? `<p style="margin:8px 0"><button class="pri" id="hold-go">${nx ? "Continue to the next round" : "Done"}</button> <span class="meta">${nx ? "next: " + nx : "These are the final scores."}</span></p>`
      : `<div class="meta" style="margin:6px 0">${left ? "Pick any game in this round. The next round stays locked until all " + g.total + " are played." : "Round complete."}</div>`}
    ${grouped ? list : `<details class="rlist" data-rk="" data-n="${rows.length}" ${open ? "open" : ""}><summary class="meta">${rows.length} game${rows.length === 1 ? "" : "s"}: tap to ${open ? "fold" : "open"} the list</summary>${list}</details>`}</div>`;
}
function wireRound(id) {
  document.querySelectorAll("#view details.rlist").forEach((d) => d.addEventListener("toggle", () => {     // remember it, so a re-render after a single sim keeps the list as you left it
    ROPEN[id + "|" + d.dataset.rk] = d.open;
    if (d.dataset.n) d.querySelector("summary").textContent = d.dataset.n + " game" + (d.dataset.n === "1" ? "" : "s") + ": tap to " + (d.open ? "fold" : "open") + " the list";
  }));
  document.querySelectorAll("#view [data-gm]").forEach((b) => b.onclick = () => simGames(id, [b.dataset.gm]));
  document.querySelectorAll("#view [data-grp]").forEach((b) => b.onclick = () => { const g = GM[id]; if (!g) return; const keys = g.games.filter((x) => !x.done && x.grl === b.dataset.grp).map((x) => x.key); if (keys.length) simGames(id, keys); });
  const hg = $("#hold-go"); if (hg) hg.onclick = () => { delete HOLD[id]; route(); };
}
// one group: its table and, folded away, its results
function groupBox(label, rows, results, open) {
  return `<details class="gbox" ${open ? "open" : ""}><summary><b>${esc(label)}</b> <span class="meta">${rows[0] ? "leader " + esc(rows[0]) : ""}</span></summary>${results}</details>`;
}
const COMPTAB = {};
async function viewComp(id) {
  const x = await api("/api/comp?id=" + enc(id));
  const p = x.progress;
  const locked = p.locked.length;
  const finished0 = p.done >= p.total;
  const gm = !locked && !finished0 && ["cup", "cwc", "qual", "ic", "wc", "ct", "nl"].includes(x.kind) ? await api("/api/games?comp=" + enc(id)).catch(() => null) : null;
  GM[id] = gm && gm.ready ? gm : null;
  const held = HOLD[id];
  let body = "";
  if (x.kind === "qual") {
    body = `<div class="sub">Host ${esc(x.host)} &middot; ${x.slots} place(s) to win${x.qualified.length ? " &middot; qualified: " + x.qualified.map(natLink).join(", ") : ""}</div>
      <div class="grid g-groups">${x.groups.map((g, i) => groupBox("Group " + (i + 1), g.map((r) => r.nation), `<table class="gt"><thead><tr><th class="l">Nation</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>${g.map((r) => `<tr><td class="l">${natLink(r.nation)}</td><td>${r.p}</td><td>${r.gf - r.ga}</td><td class="pts">${r.pts}</td></tr>`).join("")}</tbody></table>`, i === 0 || window.innerWidth > 700)).join("")}</div>`;
  } else if (x.kind === "ic") {
    body = `<div class="sub">${x.spots} place(s)${x.field.length ? " &middot; field: " + x.field.map(natLink).join(", ") : ""}</div>${x.qualified.length ? "<p>Qualified: " + x.qualified.map(natLink).join(", ") + "</p>" : '<div class="empty">Not played yet.</div>'}`;
  } else if (x.kind === "wc" || x.kind === "ct" || x.kind === "nl" || x.kind === "cwc") {
    const lk = x.clubs ? clubLink : natLink, unit = x.clubs ? "Club" : "Nation";
    const gname = (g, i) => (g.label ? g.label : "Group " + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? i : ""));
    // W / D / L come from the group's own results
    const wdl = (g, n) => { let w = 0, d = 0, l = 0; for (const m of g.matches) { if (m.a !== n && m.b !== n) continue; const f = m.a === n ? m.sa - m.sb : m.sb - m.sa; if (f > 0) w++; else if (f < 0) l++; else d++; } return [w, d, l]; };
    const gtable = (g) => `<table class="gt"><thead><tr><th class="l">${unit}</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${g.teams.map((r, k) => { const [w, d, l] = wdl(g, r.nation); const gd = r.gf - r.ga; return `<tr class="${k < 2 && r.p ? "champ" : ""}"><td class="l">${lk(r.nation)}</td><td>${r.p}</td><td>${w}</td><td>${d}</td><td>${l}</td><td>${gd > 0 ? "+" + gd : gd}</td><td class="pts">${r.pts}</td></tr>`; }).join("")}</tbody></table>`;
    const gres = (g) => (g.matches.length ? `<details class="gres"><summary class="meta">Results (${g.matches.length})</summary><div class="meta">${g.matches.map((m) => `<a href="#/matchup/${enc(id)}/${enc(m.a)}/${enc(m.b)}">${esc(m.a)} ${m.sa}-${m.sb} ${esc(m.b)}</a>`).join(" &middot; ")}</div></details>` : "");
    const many = x.groups.length > 4;
    const chips = many ? `<div class="gchips" id="gchips"><button class="on" data-g="all">All</button>${x.groups.map((g, i) => `<button data-g="${i}">${esc(gname(g, i).replace("Group ", ""))}</button>`).join("")}</div>` : "";
    const fmt = x.format;
    const qcard = x.clubs && fmt ? `<div class="card" style="margin-top:14px"><h3>How clubs qualify</h3>
      <div class="row"><span>Continental champions</span><span class="pos">${Object.keys(fmt.slots).length} guaranteed</span></div>
      ${Object.entries(fmt.slots).map(([c, n]) => `<div class="row"><span>${esc(c)}</span><span>${n}</span></div>`).join("")}
      <div class="meta" style="margin-top:6px">Each continent's champion is in. The rest of its places go to the best clubs of the last four seasons: league finishes and continental cup runs. Four pots by that ranking, and never two clubs from one league in a group. Top two in each group reach the round of 16, then single matches on neutral grounds.</div></div>
      <div class="card"><h3>Prize pool</h3><div class="stack"><i style="width:30%;background:#4aa8ff"></i><i style="width:35%;background:#3ddc84"></i><i style="width:25%;background:#f5c542"></i><i style="width:10%;background:#b48cff"></i></div>
      <div class="leg"><span><u style="background:#4aa8ff"></u>Entry 30%</span><span><u style="background:#3ddc84"></u>Group results 35%</span><span><u style="background:#f5c542"></u>Knockouts 25%</span><span><u style="background:#b48cff"></u>Champion 10%</span></div>
      <div class="meta" style="margin-top:8px">${money(fmt.pool)} in total, paid as prize money every fourth season. Clubs plan their budget around a four-year average, so one big payday does not change their wages.</div></div>
      <div class="card"><h3>What winning is worth</h3><div class="meta">A permanent "World champions" line on the club page, more stature and fans, a better name for its league, and a place on the Club World Cup honours list.</div></div>` : "";
    body = `<div class="sub">${x.host ? "Host " + esc(x.host) : ""}${x.kind === "nl" ? "Tiers by national ranking; top tier ends with semifinals and a final." : ""}${x.clubs ? "Neutral grounds" : ""}${x.winner ? ` &middot; ${x.clubs ? "world champions" : "winner"} <b>${lk(x.winner)}</b>, runner-up ${lk(x.runner_up)}` : ""}</div>
      <div class="tabs"><button class="on" data-t="ko">Knockout bracket</button><button data-t="grp">Groups</button><button data-t="stats">Stats</button></div>
      <div id="tab-stats" hidden></div>
      <div id="tab-ko">${x.bracket.rounds.length ? bracketHTML(liveBracket(x.bracket, gm), !x.clubs, { cid: id, ready: !!(gm && gm.ready) }) : '<div class="empty">The draw is made when the tournament is unlocked.</div>'}</div>
      <div id="tab-grp" hidden>${x.groups.length ? `${chips}<div class="grid g-groups" id="gboxes">${x.groups.map((g, i) => `<div class="gwrap" data-gi="${i}">${groupBox(gname(g, i), g.teams.map((r) => r.nation), gtable(g) + gres(g), i === 0 || window.innerWidth > 700)}</div>`).join("")}</div><div class="meta" style="margin-top:6px">Top two of each group advance${x.kind === "wc" ? ", with the best third-placed sides filling the bracket" : ""}.</div>` : '<div class="empty">No draw yet.</div>'}</div>
      ${qcard}`;
  } else {
    body = `<div class="sub">${x.winner ? `Winner <b>${clubLink(x.winner)}</b>, runner-up ${clubLink(x.runner_up)}` : x.field.length ? `${x.field.length} clubs` : "The field is set when the qualifying cups finish."}</div>
      ${x.field.length ? `<div class="tabs"><button class="on" data-t="ko">Bracket</button><button data-t="res">Results</button><button data-t="fld">Field</button><button data-t="stats">Stats</button></div>
      <div id="tab-stats" hidden></div>
      <div id="tab-ko">${bracketHTML(liveBracket(x.bracket, gm), false, { cid: id, ready: !!(gm && gm.ready) })}</div>
      <div id="tab-res" hidden>${tiesTable(x.ties)}</div>
      <div id="tab-fld" hidden><div class="scroll"><table><thead><tr><th class="l">Club</th><th class="l">League</th><th>OVR</th></tr></thead><tbody>${x.field.map((f) => `<tr><td class="l">${clubLink(f.club)}</td><td class="l meta">${esc(f.league)}</td><td>${ovr(f.ovr)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}`;
  }
  const finished = p.done >= p.total;
  $("#view").innerHTML = `<div class="crumbs"><a href="#/world">World</a> / ${esc(x.title)}</div><h1>${withEmb(x.emblem, 44, esc(x.title))}</h1>
    ${locked ? `<div class="card" style="margin-bottom:14px"><span class="tag red">LOCKED</span> needs ${p.locked.map((m) => `<a href="#/comp/${enc(m.id)}">${esc(m.title)}</a>`).join(", ")} to finish first.
      <p style="margin:10px 0 0"><button id="k-up" class="pri">Sim up to here</button> <span class="meta">plays only what it needs, then stops so you can play it your way.</span></p>
      <p style="margin:8px 0 0"><button id="k-pre">Sim everything it needs, then this to the end</button></p></div>`
      : `<p id="k-row"><button id="k-n" ${finished ? "disabled" : ""}>Next ${x.kind === "qual" ? "window" : "round"}</button> <button id="k-e" class="pri" ${finished ? "disabled" : ""}>To the end</button> <span class="meta">${p.done}/${p.total} played${p.next ? " &middot; next: " + esc(p.next) + (p.next_date ? " &middot; " + p.next_date.text : "") : ""}</span></p>`}
    ${held ? roundCard(held, id, null, { held: true, next: gm }) : roundCard(gm, id)}
    ${body}${x.past_finals && x.past_finals.length ? `<details class="gres" style="margin-top:14px"><summary><b>Previous finals</b> <span class="meta">${x.past_finals.length}</span></summary>${pastFinals(x.past_finals, x.kind === "wc").replace("<h2>Previous finals</h2>", "")}</details>` : ""}`;
  wireRound(id); wireBrackets($("#view"));
  document.querySelectorAll(".tabs [data-t]").forEach((b) => b.onclick = () => {
    COMPTAB[id] = b.dataset.t;
    document.querySelectorAll(".tabs [data-t]").forEach((o) => o.classList.toggle("on", o === b));
    ["ko", "res", "fld", "grp", "stats"].forEach((t) => { const e = $("#tab-" + t); if (e) e.hidden = t !== b.dataset.t; });
    if (b.dataset.t === "ko") document.querySelectorAll(".bk-box").forEach((k) => { if (k._fit) { k._fit(); k._cur(); } });
    if (b.dataset.t === "stats" && !$("#tab-stats").dataset.loaded) { $("#tab-stats").dataset.loaded = "1"; loadStats($("#tab-stats"), id, null); }
  });
  { // keep the tab the user was on; nation tournaments open on Groups until knockouts start
    let want = COMPTAB[id];
    if (!want && ["wc", "ct", "nl"].includes(x.kind) && x.groups && x.groups.length && !(x.bracket.ties || []).length) want = "grp";
    const wb = want && document.querySelector(`.tabs [data-t="${want}"]`);
    if (wb) wb.click();
  }
  document.querySelectorAll("#gchips [data-g]").forEach((b) => b.onclick = () => {
    document.querySelectorAll("#gchips [data-g]").forEach((o) => o.classList.toggle("on", o === b));
    $("#gboxes").classList.toggle("one", b.dataset.g !== "all");
    document.querySelectorAll("#gboxes .gwrap").forEach((e) => { e.hidden = b.dataset.g !== "all" && e.dataset.gi !== b.dataset.g; const d = e.querySelector("details"); if (d && b.dataset.g !== "all") d.open = true; });
  });
  if ($("#k-n")) $("#k-n").onclick = () => simComp(id, { matches: 1 });
  if ($("#k-e")) $("#k-e").onclick = () => simComp(id, { to_end: true });
  if ($("#k-up")) $("#k-up").onclick = () => simComp(id, { upto: true });
  if ($("#k-pre")) $("#k-pre").onclick = () => simComp(id, { prereqs: true });
  // the sim buttons follow you down the page: when the top row scrolls away, the same buttons appear pinned at the bottom
  if ($("#k-row") && !finished && "IntersectionObserver" in window) {
    const bar = document.createElement("div"); bar.id = "comp-bar"; bar.hidden = true;
    bar.innerHTML = `<button id="kb-n">Next ${x.kind === "qual" ? "window" : "round"}</button><button class="pri" id="kb-e">To the end</button><span class="meta">${p.done}/${p.total}</span>`;     // slim: see #comp-bar in style.css
    $("#view").appendChild(bar);
    $("#kb-n").onclick = () => simComp(id, { matches: 1 }); $("#kb-e").onclick = () => simComp(id, { to_end: true });
    const io = new IntersectionObserver((en) => { if (!bar.isConnected) { io.disconnect(); document.body.classList.remove("has-compbar"); return; } bar.hidden = en[0].isIntersecting; document.body.classList.toggle("has-compbar", !bar.hidden); }, { threshold: 0, rootMargin: `-${($("#top") ? $("#top").offsetHeight : 0)}px 0px 0px 0px` });
    io.observe($("#k-row"));
  }
}
function tiesTable(ties, nations) {
  if (!ties.length) return '<div class="empty">Nothing played yet.</div>';
  const L = nations ? natLink : clubLink;
  return `<div class="scroll"><table><tbody>${ties.slice().reverse().map((t) => `<tr><td class="l meta">${esc(t.round)}</td><td class="l">${L(t.a)} v ${L(t.b)}</td><td>${esc(t.text)}</td><td class="l"><b>${L(t.winner)}</b></td></tr>`).join("")}</tbody></table></div>`;
}

async function viewNations(confed) {
  const d = await api("/api/nations" + (confed ? "?confed=" + confed : ""));
  $("#view").innerHTML = `<h1>National teams ${confed ? "- " + esc(confed) : ""}</h1><div class="sub">Every nation, strongest first. Tap one for its squad.</div>
    <details class="help"><summary>What do the columns mean?</summary><div class="meta"><b>Rating</b>: team strength, the best 11 players of the nation plus the national coach. <b>Pros</b>: players at professional clubs. <b>Talent</b>: quality of the nation's whole player pool. <b>Ranking pts</b>: world-ranking points, used to seed tournaments. <b>WC</b>: World Cup titles (and appearances). <b>Coach</b>: the national coach and their prestige.</div></details>
    <div class="tabs nat-tabs">${["", "UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"].map((c) => `<button class="${(confed || "") === c ? "on" : ""}" data-c="${c}">${c || "World"}</button>`).join("")}</div>
    <div class="scroll"><table class="hof wf nwl"><thead><tr><th>#</th><th class="l">Nation</th><th class="l hide-m">Conf.</th><th title="Team strength: best 11 players + national coach">Rating</th><th class="hide-m" title="Players at professional clubs">Pros</th><th class="hide-m" title="Quality of the whole player pool">Talent</th><th title="World-ranking points">Rank pts</th><th class="wc" title="World Cup titles (appearances)">WC</th><th class="l hide-m">Coach</th></tr></thead><tbody>
    ${d.rows.map((r) => `<tr><td>${r.rank}</td><td class="l">${natLink(r.name)}<div class="meta show-m">${r.confed} &middot; coach ${esc(r.coach)}</div></td><td class="l meta hide-m">${r.confed}</td><td class="pts">${r.rating}</td><td class="hide-m">${r.pros}</td><td class="hide-m">${r.talent}</td><td>${r.rank_pts}</td><td class="wc">${r.titles}<span class="meta hide-m"> (${r.apps})</span></td><td class="l hide-m">${esc(r.coach)} <span class="meta">(${r.coach_prestige})</span></td></tr>`).join("")}</tbody></table></div>`;
  document.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => (location.hash = "#/nations" + (b.dataset.c ? "/" + b.dataset.c : "")));
}

function federationCard(n) {
  const f = n.federation; if (!f) return "";
  const st = f.stages.map((t, i) => `<div class="${i < f.stage ? "done" : i === f.stage ? "on" : ""}">${t}</div>`).join("");
  const sp = f.split, last = f.last;
  const tot = last ? last.prize + last.comp + last.soli : 0;
  const ach = f.events.length ? f.events.map((e) => `<div class="ev"><b class="${e.pts < 0 ? "neg" : ""}">${e.pts > 0 ? "+" : ""}${e.pts}</b><span>${esc(e.text)} <span class="meta">S${e.season}</span></span></div>`).join("") : '<div class="meta">Nothing yet. Cup MVPs, a Ballon d\'Or, World Cup runs and a good crop of professionals move the score.</div>';
  return `<div class="card"><h3>Federation <small>${esc(f.stages[f.stage])}</small></h3>
    <div class="stages">${st}</div>
    <div class="row"><span>Football culture</span><span><b>${f.culture}</b> <span class="meta">/ 100</span> ${f.delta ? `<span class="${f.delta > 0 ? "pts" : "neg"}">${f.delta > 0 ? "+" : ""}${f.delta}</span>` : ""}</span></div>
    <div class="bar" style="margin:4px 0 6px"><i style="width:${Math.min(100, f.culture)}%"></i></div>
    <div class="meta">${f.next_at ? `Next stage at ${f.next_at}. ` : "Top stage. "}${f.lift > 0.5 ? `The score is ${f.lift} above where it started, which brings more high-potential youngsters.` : f.lift < -0.5 ? `The score is ${-f.lift} below where it started.` : "A higher score means more high-potential youngsters and better academies at home."}</div></div>
    <div class="card" style="margin-top:14px"><h3>Federation fund${last ? ` <small>season ${last.season}</small>` : ""}</h3>
      ${last ? `<div class="row"><span class="bigv">${money(tot)}</span><span class="meta">paid in</span></div>
      <div class="row"><span>Share of prize money</span><span class="pts">+${money(last.prize)}</span></div>
      <div class="row"><span>Training compensation</span><span class="pts">+${money(last.comp)}</span></div>
      <div class="row"><span>Solidarity and development</span><span class="pts">+${money(last.soli)}</span></div>
      <h4 class="sh" style="margin-top:10px">Spent on</h4>
      ${[["Home academies", sp[0]], ["Partner academies abroad", sp[1]], ["Coaching", sp[2]]].map(([t, v]) => `<div class="ir"><span class="n">${t}</span><div class="mbar"><i style="width:${Math.round(v * 100)}%"></i></div><span class="v">${Math.round(v * 100)}%</span></div>`).join("")}
      <div class="meta" style="margin-top:6px">Chosen automatically by the federation's stage.</div>` : '<div class="meta">The fund opens after the first completed season.</div>'}</div>
    <div class="card" style="margin-top:14px"><h3>Why the score moved</h3>${ach}</div>
    ${f.golden ? `<div class="card" style="margin-top:14px"><h3>Golden generation arriving</h3><div class="meta">${f.golden.count} prospects with ${f.golden.bar}+ potential aged ${f.golden.ages[0]} to ${f.golden.ages[1]}. Expect the national team to peak in a few seasons.</div>${f.golden.players.map((p) => `<div class="row"><span>${playerLink({ uid: p.uid, name: p.name, nat: n.name })} <span class="meta">${p.club ? esc(p.club) : "free agent"}, ${p.age}</span></span><span>${p.ovr} / <b class="pts">${p.pot}</b></span></div>`).join("")}</div>` : ""}
    <div class="card" style="margin-top:14px"><h3>Young players abroad</h3>${f.abroad.length ? f.abroad.map((p) => `<div class="row"><span>${playerLink({ uid: p.uid, name: p.name, nat: n.name })} <span class="meta">${clubLink(p.club)}, ${p.age}</span></span><span>${p.ovr} / <b class="pts">${p.pot}</b></span></div>`).join("") : '<div class="meta">No players under 21 abroad.</div>'}
      <div class="meta" style="margin-top:6px">${f.n_abroad} under 21 abroad, ${f.n_home} at home. They keep their nationality and their success counts for ${esc(n.name)}.</div></div>`;
}
async function viewNation(name) {
  const n = await api("/api/nation?name=" + enc(name));
  $("#view").innerHTML = `<div class="crumbs"><a href="#/nations">Nations</a> / ${esc(n.name)}</div><h1>${esc(n.name)}</h1>
    <div class="sub">${esc(n.confed)} &middot; rating ${n.rating} &middot; talent ${n.talent} (base ${n.base}) &middot; ${n.pros} professionals &middot; World Cup: ${n.titles} title(s) in ${n.apps} appearance(s)</div>
    <div class="cols"><div><h2 style="margin-top:0">Best players</h2><div class="scroll"><table><thead><tr><th class="l">Player</th><th class="l">Pos</th><th>Age</th><th>OVR</th><th class="l">Club</th></tr></thead><tbody>
    ${n.players.map((p) => `<tr><td class="l">${playerLink(p)}</td><td class="l pos-${esc(p.pos)}">${esc(p.pos)}</td><td>${p.age}</td><td>${ovr(p.ovr)}</td><td class="l">${p.club ? clubLink(p.club) : '<span class="meta">free agent</span>'}</td></tr>`).join("")}</tbody></table></div></div>
    <div>${federationCard(n)}${trophyRoom(n.trophies, "Trophy room")}<div class="card" style="margin-top:14px"><h3>National coach</h3><div class="kv"><span>Name</span><span>${esc(n.coach.name)}</span><span>Prestige</span><span>${n.coach.prestige}</span><span>Style</span><span>${esc(n.coach.personality)} / ${esc(n.coach.skill)}</span></div></div></div></div>`;
}
function pitchSVG(team) {
  const rows = { FWD: 130, MID: 300, DEF: 470, GK: 620 };
  const by = { FWD: [], MID: [], DEF: [], GK: [] };
  team.forEach((p) => by[p.pos].push(p));
  let g = "";
  Object.entries(by).forEach(([pos, ps]) => ps.forEach((p, i) => {
    const x = (i + 1) * (640 / (ps.length + 1)), y = rows[pos];
    g += `<g><circle cx="${x}" cy="${y}" r="27" fill="${ovrColor(p.ovr)}" stroke="#06210f" stroke-width="2"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-weight="800" fill="#06210f" font-size="17">${p.ovr}</text>
      <text x="${x}" y="${y + 46}" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">${esc(p.name)}</text>
      <text x="${x}" y="${y + 61}" text-anchor="middle" fill="#cfe8d8" font-size="11">${esc(p.club)}</text></g>`;
  }));
  return `<svg viewBox="0 0 640 700" class="pitch"><rect x="10" y="10" width="620" height="680" rx="8" fill="#1b6b3a" stroke="#e8f1ea" stroke-width="3"/>
    <line x1="10" y1="350" x2="630" y2="350" stroke="#e8f1ea" stroke-width="2" opacity=".6"/><circle cx="320" cy="350" r="60" fill="none" stroke="#e8f1ea" stroke-width="2" opacity=".6"/>
    <rect x="180" y="10" width="280" height="90" fill="none" stroke="#e8f1ea" stroke-width="2" opacity=".6"/><rect x="180" y="600" width="280" height="90" fill="none" stroke="#e8f1ea" stroke-width="2" opacity=".6"/>${g}</svg>`;
}
const MEDAL = ["gold", "silver", "bronze"];
function awardRow(p, rank, max, extra, unit) {
  const medal = MEDAL[rank - 1] || "";
  const stat = p.pos === "GK" ? `${p.cs} clean sheets` : `${p.goals} goals, ${p.assists} assists`;
  return `<div class="aw-row ${medal} ${rank === 1 ? "first" : ""}"><div class="rk">${rank}</div>
    <div class="who"><b>${p.uid ? playerLink(p) : esc(p.name)}</b> <span class="meta">${esc(p.pos)} &middot; ${esc(p.nat)} &middot; age ${p.age} &middot; OVR ${p.ovr}</span>
    <div class="meta">${clubLink(p.club)} &middot; ${stat}${extra ? " &middot; " + extra : ""}</div></div>
    <div class="votes"><div class="vbar"><i style="width:${Math.round((100 * p.pts) / max)}%"></i></div><b>${p.pts}</b><span class="meta"> ${unit || "pts"}${p.first != null ? ` &middot; ${p.first} first places` : ""}</span></div></div>`;
}
async function viewCeremony(season) {
  const d = await api("/api/awards" + (season ? "?season=" + season : ""));
  if (!d.awards) { $("#view").innerHTML = `<h1>Awards</h1><div class="empty">The first ceremony happens after season 1 finishes.</div>`; return; }
  const a = d.awards;
  const q = []; // reveal queue
  const sec = (title, sub, inner, key) => `<div class="aw-sec"><h2 class="rv" hidden>${key ? emblem(EMB_BY_SECTION[key], 34) + " " : ""}${title}</h2>${sub ? `<div class="sub rv" hidden>${sub}</div>` : ""}${inner}</div>`;
  const rows = (arr, mk) => arr.map((p, i) => ({ i, html: mk(p, i + 1) })).reverse().map((o) => `<div class="rv" hidden>${o.html}</div>`).join("");
  const maxB = a.ballon[0].pts, maxC = a.coach[0].pts;
  const html = `
    <div class="crumbs"><a href="#/world">World</a> / Awards</div>
    <h1>Awards ceremony <span class="tag gold">season ${d.season} (${d.season_label})</span></h1>
    <div class="sub">${a.date.text} &middot; ${a.voters} voters: journalists, national team coaches and fans. Each names a top five (6-4-3-2-1).
      <select id="aw-season" style="margin-left:10px">${d.seasons.slice().reverse().map((s) => `<option value="${s}" ${s === d.season ? "selected" : ""}>Season ${s}</option>`).join("")}</select></div>
    <div id="aw-bar"><button id="aw-back">Back</button><button class="pri" id="aw-next">Next</button><button id="aw-skip">Skip to end</button><span class="meta" id="aw-count"></span></div>
    <div id="aw-pad"></div>
    ${sec("Golden Boot", "Most league goals in the world", rows(a.boot.slice(0, 3), (p, r) => awardRow({ ...p, pts: p.goals, first: null }, r, a.boot[0].goals, `${p.league}`, "goals")), "boot")}
    ${sec("Young Player of the Year", "Under 22", rows(a.young, (p, r) => awardRow({ ...p, pts: +p.score.toFixed(1), first: null }, r, a.young[0].score, "", "panel score")), "young")}
    ${sec("Coach of the Year", "Judged on results against expectations, plus trophies", rows(a.coach, (c, r) => `<div class="aw-row ${MEDAL[r - 1] || ""} ${r === 1 ? "first" : ""}"><div class="rk">${r}</div><div class="who"><b>${esc(c.name)}</b> <span class="meta">${esc(c.nat)} &middot; prestige ${c.prestige}</span><div class="meta">${c.club ? clubLink(c.club) + " &middot; finished " + c.finish + " (expected " + c.expected + ")" : "National team: " + natLink(c.nation)}</div></div><div class="votes"><div class="vbar"><i style="width:${Math.round((100 * c.pts) / maxC)}%"></i></div><b>${c.pts}</b><span class="meta"> pts &middot; ${c.first} first places</span></div></div>`), "coach")}
    ${sec("Team of the Year", "Best XI by position, 4-3-3, from the panel's scores", `<div class="rv" hidden><div class="pitch-wrap">${pitchSVG(a.team)}</div></div>`, "team")}
    ${sec("Ballon d'Or", "Top ten, counted up to the winner", rows(a.ballon, (p, r) => awardRow(p, r, maxB, `${p.share}% of the maximum`)), "ballon")}
    <div class="rv" hidden><div class="card" style="margin-top:16px"><h3>How the panel voted <small>top three by voter group</small></h3>
      ${Object.entries(a.voter_split).map(([k, v]) => `<div class="row"><span><b>${k === "journalist" ? "Journalists" : k === "coach" ? "National team coaches" : "Fans"}</b></span><span class="meta">${v.map((x) => esc(x.name) + " " + x.pts).join(" &middot; ")}</span></div>`).join("")}</div></div>
    <div class="rv" hidden><div class="card" style="margin-top:16px"><h3>Competition awards <small>MVPs feed into the Ballon d'Or vote</small></h3><div class="scroll"><table><thead><tr><th class="l">Competition</th><th class="l">Winner</th><th class="l">Top scorer</th><th class="l">MVP</th><th class="l">Coach</th></tr></thead><tbody>
      ${Object.values(a.comps || {}).map((c) => { const tm = (n) => (c.nation ? natLink(n) : clubLink(n)); return `<tr><td class="l">${esc(c.name)}</td><td class="l">${c.winner ? tm(c.winner) : ""}</td><td class="l">${c.scorers && c.scorers[0] ? playerLink(c.scorers[0]) + ` <span class="meta">${c.scorers[0].goals}</span>` : ""}</td><td class="l">${c.mvp && c.mvp[0] ? playerLink(c.mvp[0]) : ""}</td><td class="l">${c.coach && c.coach[0] ? esc(c.coach[0].name) : ""}</td></tr>`; }).join("")}</tbody></table></div></div></div>
    <p class="rv" hidden style="margin-top:16px"><a href="#/world">Back to the world</a> &middot; <a href="#/ledger">Transfers</a></p>`;
  $("#view").innerHTML = html;
  const items = [...document.querySelectorAll("#view .rv")];
  let idx = 0;
  const upd = () => { $("#aw-count").textContent = idx >= items.length ? "That's everything." : idx + " / " + items.length; $("#aw-next").disabled = idx >= items.length; $("#aw-back").disabled = idx <= 0; };
  $("#aw-back").onclick = () => { if (idx > 0) { idx--; items[idx].hidden = true; if (idx > 0) items[idx - 1].scrollIntoView({ block: "center", behavior: "smooth" }); } upd(); };
  const next = () => { if (idx < items.length) { items[idx].hidden = false; items[idx].scrollIntoView({ block: "center", behavior: "smooth" }); idx++; } upd(); };
  $("#aw-next").onclick = next;
  $("#aw-skip").onclick = () => { items.forEach((e) => (e.hidden = false)); idx = items.length; upd(); };
  $("#aw-season").onchange = (e) => (location.hash = "#/ceremony/" + e.target.value);
  upd();
}
async function viewTrophies(key, tab) {
  tab = tab || "winners";
  const tabs = `<div class="tabs hof-tabs">${[["winners", "Winners"], ["players", "Players"], ["coaches", "Coaches"], ["clubs", "Clubs"]].map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${t}</button>`).join("")}</div>`;
  const go = (t) => (location.hash = t === "winners" ? "#/trophies" : "#/trophies/" + t);
  if (tab === "clubs") {
    const h = await api("/api/hof_clubs");
    $("#view").innerHTML = `<h1>Hall of Fame</h1><div class="sub">Greatest clubs of all time, ranked on trophies the way players are ranked on honours.</div>${tabs}
      <div class="scroll"><table class="hof"><thead><tr><th>#</th><th class="l">Club</th><th>Score</th><th class="l hide-m">League</th><th>Titles</th><th>Cont.</th><th class="hide-m">CWC</th><th title="Individual awards won by their players and coaches, plus Team of the Year places">Awards</th><th class="hide-m">Runner-up</th><th class="hide-m">Last</th><th class="l hide-m">Major honours</th></tr></thead><tbody>
      ${h.clubs.map((c, i) => `<tr><td>${i + 1}</td><td class="l"><b>${clubLink(c.name)}</b><div class="meta show-m">${esc(c.league)} &middot; last S${c.last}</div></td><td class="pts">${c.score}</td><td class="l meta hide-m">${esc(c.league)}</td><td>${c.league_titles}</td><td>${c.continental}</td><td class="hide-m">${c.cwc}</td><td>${c.awards + c.toty}</td><td class="hide-m">${c.runner_ups}</td><td class="hide-m">S${c.last}</td><td class="l meta wrap hide-m">${esc(c.honours)}</td></tr>`).join("") || '<tr><td colspan="11" class="empty">No trophies yet. Sim a season first.</td></tr>'}</tbody></table></div>
      <div class="meta" style="margin-top:8px">How the score works: ${esc(h.points)}. ${h.total} clubs have scored so far.</div>`;
    document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => go(b.dataset.tab));
    return;
  }
  if (tab === "players" || tab === "coaches") {
    const h = await api("/api/halloffame");
    $("#view").innerHTML = `<h1>Hall of Fame</h1><div class="sub">Greatest players and coaches of all time, scored on awards, titles and peak rating.</div>${tabs}` + (tab === "players"
      ? `<div class="scroll"><table class="hof"><thead><tr><th>#</th><th class="l">Player</th><th class="l hide-m">Nation</th><th class="l hide-m">Pos</th><th>Peak</th><th class="hide-m">Goals</th><th class="hide-m">Seasons</th><th class="l hide-m">Honours</th><th>Score</th></tr></thead><tbody>
      ${h.players.map((p, i) => { const hon = Object.entries(p.honours).map(([k, v]) => `${v}&times; ${esc(k)}`).join(" &middot; "); return `<tr><td>${i + 1}</td><td class="l"><b>${p.uid ? playerLink(p) : esc(p.name)}</b> ${p.retired ? '<span class="tag">retired</span>' : `<span class="meta">${p.club ? esc(p.club) : "free agent"}</span>`}<div class="meta show-m"><span class="pos-${esc(p.pos)}">${esc(p.pos)}</span> &middot; ${esc(p.nat)} &middot; ${p.goals} goals &middot; ${p.seasons} seasons</div>${hon ? `<div class="meta show-m">${hon}</div>` : ""}</td><td class="l hide-m">${natLink(p.nat)}</td><td class="l hide-m pos-${esc(p.pos)}">${esc(p.pos)}</td><td>${ovr(p.peak)}</td><td class="hide-m">${p.goals}</td><td class="hide-m">${p.seasons}</td>
      <td class="l meta wrap hide-m">${hon}</td><td class="pts">${p.score}</td></tr>`; }).join("") || '<tr><td colspan="9" class="empty">Nobody yet.</td></tr>'}</tbody></table></div>`
      : `<div class="scroll"><table class="hof"><thead><tr><th>#</th><th class="l">Coach</th><th class="l hide-m">Nation</th><th class="hide-m">Seasons</th><th>Titles</th><th>Cups</th><th class="hide-m">CWC</th><th>Awards</th><th class="hide-m">Win %</th><th>Score</th></tr></thead><tbody>
      ${h.coaches.map((c, i) => `<tr><td>${i + 1}</td><td class="l"><b>${esc(c.name)}</b> ${c.retired ? '<span class="tag">retired</span>' : ""}<div class="meta show-m">${esc(c.nat)} &middot; ${c.seasons} seasons &middot; ${c.win}% wins</div></td><td class="l hide-m">${esc(c.nat)}</td><td class="hide-m">${c.seasons}</td><td>${c.titles}</td><td>${c.cups}</td><td class="hide-m">${c.cwc}</td><td>${c.awards}</td><td class="hide-m">${c.win}</td><td class="pts">${c.score}</td></tr>`).join("") || '<tr><td colspan="10" class="empty">Nobody yet.</td></tr>'}</tbody></table></div>`);
    document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => go(b.dataset.tab));
    return;
  }
  const d = await api("/api/trophies" + (key ? "?key=" + enc(key) : "?key=award:ballon"));
  const sel = d.selected, groups = {};
  d.options.forEach((o) => (groups[o.group] = groups[o.group] || []).push(o));
  const L = sel && sel.nation ? natLink : clubLink;
  const aw = () => sel.key.startsWith("award:");
  const rowHTML = (r) => sel.key === "award:team"
    ? `<tr><td class="l meta">S${r.season}<div>${r.date || ""}</div></td><td class="l" colspan="2">${r.team.map((p) => `<span class="pos-${esc(p.pos)}">${esc(p.name)}</span> <span class="meta">(${esc(p.club)})</span>`).join(" &middot; ")}</td></tr>`
    : `<tr><td class="l meta nw">S${r.season}<div>${r.date ? esc(String(r.date).slice(-4)) : ""}</div></td><td class="l"><b>${aw() ? esc(r.winner) : L(r.winner)}</b>${r.club ? `<div class="meta">${clubOrNat(r.club)}</div>` : ""}
      ${r.runner_up ? `<div class="meta">${aw() ? "2nd " + esc(r.runner_up) : "beat " + L(r.runner_up)}</div>` : ""}${r.coach ? `<div class="meta">coach ${esc(r.coach)}</div>` : ""}</td><td class="nw">${esc(r.text || "")}</td></tr>`;
  $("#view").innerHTML = `<h1>${sel ? withEmb(sel.emblem, 48, esc(sel.title)) : "Trophies"}</h1><div class="sub">Every winner so far. Pick any competition from the list.</div>${tabs}
    <p><select id="tro-sel" style="min-width:min(300px,100%);max-width:100%">${Object.entries(groups).map(([g, os]) => `<optgroup label="${esc(g)}">${os.map((o) => `<option value="${esc(o.key)}" ${sel && sel.key === o.key ? "selected" : ""}>${esc(o.title)}</option>`).join("")}</optgroup>`).join("")}</select></p>
    ${sel && sel.rows.length ? `<div class="cols"><div><div class="scroll"><table class="hof"><thead><tr><th class="l">Season</th><th class="l">Winner</th><th>${aw() ? "Votes / stat" : "Final"}</th></tr></thead><tbody>${sel.rows.map(rowHTML).join("")}</tbody></table></div></div>
      <div><div class="card"><h3>Most successful</h3>${sel.board.map((b, i) => `<div class="row"><span>${i + 1}. ${sel.key.startsWith("award:") ? esc(b.name) : L(b.name)}</span><span class="meta"><b style="color:var(--accent2)">${b.count}</b> &middot; S${b.seasons.join(", S")}</span></div>`).join("")}</div></div></div>` : '<div class="empty">No winners yet. Sim a season first.</div>'}`;
  $("#tro-sel").onchange = (e) => (location.hash = "#/trophies/winners/" + enc(e.target.value));
  document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => go(b.dataset.tab));
}
const clubOrNat = (n) => (n ? esc(n) : "");
async function viewNews() {
  const d = await api("/api/news");
  $("#view").innerHTML = `<h1>News</h1>${d.items.length ? d.items.map((n) => `<div class="review-line"><span><span class="tag">S${n.season}${n.date ? " &middot; " + n.date.text : ""}</span> <span class="tag">${esc(n.kind)}</span> ${esc(n.text)}</span></div>`).join("") : '<div class="empty">Nothing yet. Sim some weeks.</div>'}`;
}
function multiLine(seasons, series, w, h) {
  const names = Object.keys(series); if (seasons.length < 2 || !names.length) return '<div class="meta">The chart appears after two completed seasons.</div>';
  const all = names.flatMap((n) => series[n].filter((v) => v != null)), y0 = Math.floor(Math.min(...all)) - 1, y1 = Math.ceil(Math.max(...all)) + 1;
  const X = (i) => 40 + (i / (seasons.length - 1)) * (w - 56), Y = (v) => h - 24 - ((v - y0) / Math.max(1, y1 - y0)) * (h - 40);
  const cols = ["#3ddc84", "#4aa8ff", "#f5c542", "#ff6b6b", "#c79bff", "#35d0c4", "#ff9f43", "#e8f1ea"];
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px">${names.map((n, k) => `<path d="${series[n].map((v, i) => (v == null ? "" : (i && series[n][i - 1] != null ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1))).join(" ")}" fill="none" stroke="${cols[k % 8]}" stroke-width="2"><title>${esc(n)}</title></path>`).join("")}
    <text x="4" y="${Y(y1 - 1) + 4}" class="axis">${y1 - 1}</text><text x="4" y="${Y(y0 + 1) + 4}" class="axis">${y0 + 1}</text><text x="${X(0)}" y="${h - 6}" class="axis" text-anchor="middle">S${seasons[0]}</text><text x="${X(seasons.length - 1)}" y="${h - 6}" class="axis" text-anchor="middle">S${seasons[seasons.length - 1]}</text></svg>
    <div class="legend">${names.map((n, k) => `<span><i style="background:${cols[k % 8]}"></i>${esc(n)}</span>`).join("")}</div>`;
}
function econCard(e) {
  if (!e || !e.seasons.length) return `<div class="card"><h3>World economy</h3><div class="meta">The economy opens after the first completed season.</div></div>`;
  const L = e.seasons[e.seasons.length - 1], hc = { Stable: "pts", Growing: "pts", Shrinking: "neg", Overheating: "neg" }[e.health] || "meta";
  const srcs = [["TV", L.tv, "#4aa8ff"], ["Gate", L.gate, "#3ddc84"], ["Sponsors", L.sponsor, "#f5c542"], ["Prizes", L.prize, "#b48cff"], ["Owners", L.owner, "#ff9f43"]];
  const uses = [["Wages", L.wages, "#ff6b6b"], ["Running", L.running, "#c79bff"], ["Interest", L.interest, "#8fa89a"], ["Academy", L.academy, "#35d0c4"], ["Stadium", L.stadium, "#e8f1ea"], ["Transfers", L.payout, "#4aa8ff"]];
  const stack = (a) => { const t = a.reduce((x, r) => x + Math.max(0, r[1]), 0) || 1; return `<div class="stack">${a.map((r) => `<i style="width:${(Math.max(0, r[1]) / t * 100).toFixed(1)}%;background:${r[2]}"></i>`).join("")}</div><div class="leg">${a.map((r) => `<span><u style="background:${r[2]}"></u>${r[0]} ${Math.round(Math.max(0, r[1]) / t * 100)}%</span>`).join("")}</div>`; };
  const rev = L.revenue;
  return `<div class="card"><h3>World economy <small>season ${e.season}</small></h3>
    <div class="row"><span class="bigv">${money(rev)}</span><span class="meta">revenue of all ${e.clubs} clubs</span></div>
    <div class="row"><span>Growth on last season</span><span class="${hc}">${e.growth == null ? "-" : (e.growth > 0 ? "+" : "") + (e.growth * 100).toFixed(1) + "%"} &middot; ${esc(e.health)}</span></div>
    <div class="row"><span>Cash held by clubs</span><b>${money(e.cash)}</b></div>
    <div class="row"><span>Debt</span><b>${money(e.debt)}</b></div>
    <h4 class="sh" style="margin-top:10px">Where the money comes from</h4>${stack(srcs)}
    <h4 class="sh" style="margin-top:10px">Where it goes</h4>${stack(uses)}
    <div class="meta" style="margin-top:8px">Stable means revenue grew by less than 2%. Above 5% the economy is overheating and prices rise faster than the game can absorb.</div></div>
    <div class="card" style="margin-top:12px"><h3>Revenue by league <small>season ${e.season}</small></h3>
    ${e.leagues.slice(0, 16).map((r) => `<div class="ir"><span class="n">${leagueLink(r.league)}</span><div class="mbar"><i style="width:${Math.round(r.share * 100)}%"></i></div><span class="v" style="flex-basis:64px">${money(r.revenue)}</span><span class="meta" style="flex:0 0 52px;text-align:right">${r.growth == null ? "" : (r.growth > 0 ? "+" : "") + (r.growth * 100).toFixed(1) + "%"}</span></div>`).join("")}</div>
    <div class="card" style="margin-top:12px"><h3>Biggest cash piles</h3>${e.piles.map((x) => `<div class="row"><span>${clubLink(x.club)}</span><span><b>${money(x.funds)}</b> <span class="meta">${x.ratio}x yearly income</span></span></div>`).join("")}
    <div class="meta" style="margin-top:6px">${e.over2x} of ${e.clubs} clubs hold more than twice their yearly income. Surplus cash goes into the academy, the stadium and the transfer budget.</div></div>`;
}
async function viewMoney() {
  const d = await api("/api/money"); const ch = await api("/api/charts"); const ec = await api("/api/worldmoney").catch(() => null);
  $("#view").innerHTML = `<h1>Leagues: strength and money</h1><div class="sub">How strong and how rich each league is, strongest first.</div>
    <details class="help"><summary>What do the columns mean?</summary><div class="meta"><b>Avg OVR</b>: average rating of the league's clubs. <b>Income</b>: average yearly income per club. <b>TV</b>: the league's TV-money multiplier (1.00 is the baseline; higher means more TV money per club). <b>Euro spots</b>: how many of the league's clubs get into the continental cups (Champions League and the others) each season. <b>Champion</b>: last season's winner.</div></details>
    <div class="scroll"><table class="hof wf"><thead><tr><th class="l">League</th><th class="l hide-m">Conf.</th><th>Avg OVR</th><th>Income</th><th class="hide-m">TV</th><th title="Clubs from this league that qualify for continental cups each season">Euro spots</th><th class="l hide-m">Champion</th></tr></thead><tbody>
    ${d.rows.map((r) => `<tr><td class="l">${leagueLink(r.league)}<div class="meta show-m">${r.confed}${r.champion ? " &middot; " + esc(r.champion) : ""}</div></td><td class="l meta hide-m">${r.confed}</td><td>${r.avg}</td><td>${money(r.budget)}</td><td class="hide-m">${r.tv.toFixed(2)}</td><td>${r.places}</td><td class="l hide-m">${r.champion ? clubLink(r.champion) : "-"}</td></tr>`).join("")}</tbody></table></div>`;
  $("#view").querySelector(".sub").insertAdjacentHTML("afterend", `<div style="margin:12px 0">${econCard(ec)}</div>`);
  $("#view").insertAdjacentHTML("beforeend", `<div class="card" style="margin-top:14px"><h3>League strength over time <small>average OVR, top eight leagues</small></h3>${multiLine(ch.seasons, ch.leagues, 760, 240)}</div>`);
}
function bidDetail(x) {
  const b = x.detail; if (!b) return "";
  const tr = b.traits || {}, tn = (k, v) => v >= 0.66 ? k + ": high" : v <= 0.33 ? k + ": low" : null;
  const traits = [tn("Money", tr.money), tn("Loyalty", tr.loyal), tn("Ambition", tr.ambition), tn("Trophies", tr.trophies)].filter(Boolean).join(", ");
  return `<details class="bidd"><summary>How the price was set</summary>
    <div class="row"><span>Base value</span><b>${money(b.base)}</b></div>
    <div class="row"><span>Asking price after demand ${b.demand}x${b.premium > 1.001 ? ` and a ${Math.round((b.premium - 1) * 100)}% rival premium` : ""}</span><b>${money(b.asking)}</b></div>
    <div class="row"><span>Paid</span><b class="pts">${money(x.fee)}</b></div>
    ${b.comp > 0 ? `<div class="row"><span>Training compensation to ${clubLink(b.trainer)}</span><b>${money(b.comp)}</b></div>` : ""}
    ${traits ? `<div class="meta" style="margin:4px 0">Player: ${traits}</div>` : ""}
    <h4 class="sh" style="margin-top:6px">Bids</h4>
    ${b.bids.map((c, i) => `<div class="row"><span>${i === 0 ? "&#127942; " : ""}${clubLink(c.club)}${c.rival ? ' <span class="tag red">rival</span>' : ""}</span><span class="meta">bid ${money(c.bid)} &middot; wage ${money(c.wage)} &middot; score ${c.score}</span></div>`).join("")}</details>`;
}
const TLG = { league: "" };       // the league chosen on the Transfers page (kept while you move around)
async function viewLedger(season) {
  const q = (season ? "season=" + enc(season) : "") + (TLG.league ? (season ? "&" : "") + "league=" + enc(TLG.league) : "");
  const d = await api("/api/ledger" + (q ? "?" + q : ""));
  if (!d.season) { $("#view").innerHTML = `<h1>Transfers</h1><div class="empty">No completed season yet.</div>`; return; }
  const all = d.season === "all", st = d.stat, scope = d.league || "the world";
  const seasons = Array.from({ length: d.seasons }, (_, i) => d.seasons - i);
  const summary = d.league
    ? `${d.n} moves involving ${esc(d.league)}${all ? " in all seasons" : ""} (${d.abroad} between leagues)`
    : `${d.n} moves (${d.abroad} between leagues) &middot; ${money(d.total)} paid in fees`;
  $("#view").innerHTML = `<h1>Transfers - ${all ? "all seasons" : "season " + d.season}${d.league ? ` <small>${esc(d.league)}</small>` : ""}</h1>
    <p class="filters"><select id="t-s"><option value="all" ${all ? "selected" : ""}>All seasons</option>${seasons.map((s) => `<option value="${s}" ${s === d.season ? "selected" : ""}>Season ${s}</option>`).join("")}</select>
    <select id="t-l"><option value="">All leagues</option>${d.leagues.map((l) => `<option ${l === d.league ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></p>
    <div class="sub">${summary}</div>
    ${st ? `<div class="quick" style="margin:8px 0"><div class="stat"><div class="k">Spent on signings</div><div class="v">${money(st.paid)}</div></div><div class="stat"><div class="k">Earned from sales</div><div class="v">${money(st.recv)}</div></div><div class="stat"><div class="k">Net</div><div class="v" style="color:${st.net >= 0 ? "var(--accent)" : "var(--red)"}">${moneyS(st.net)}</div></div></div>` : ""}
    <div class="cols"><div><h2 style="margin-top:0">Biggest fees${d.league ? " involving " + esc(d.league) : ""}${all ? " of all time" : ""}</h2><div class="fees">
    ${d.top.length ? d.top.map((x) => `<div class="fee"><div class="fee-top"><span><b>${esc(x.player)}</b> ${ovr(x.ovr)} <span class="meta">age ${x.age}${all ? " &middot; S" + x.season : ""}</span></span><b class="pts">${money(x.fee)}</b></div>
      <div class="meta">${clubLink(x.frm)} &rarr; ${clubLink(x.to)} &middot; ${esc(x.why || (x.kind === "bid" ? "Won in a bidding contest" : x.kind === "abroad" ? "Moved to a different league" : x.kind === "league" ? "Moved within the league system" : x.kind))}</div>${bidDetail(x)}</div>`).join("") : '<div class="empty">No big moves recorded.</div>'}</div></div>
    <div><h2 style="margin-top:0">Transfer money by league</h2><div class="meta" style="margin-bottom:6px">Fees a league's clubs received for sales minus fees they paid for signings. <span style="color:var(--accent)">Green</span>: the league made money on transfers. <span style="color:var(--red)">Red</span>: it spent more than it earned. Tap a league to see its biggest moves.</div>
      <div class="card">${d.net.map((r) => `<div class="row"><span><a href="#" data-tl="${esc(r.league)}">${esc(r.league)}</a></span><b style="color:${r.net >= 0 ? "var(--accent)" : "var(--red)"}">${moneyS(r.net)}</b></div>`).join("")}</div></div></div>`;
  $("#t-s").onchange = (e) => (location.hash = "#/ledger/" + e.target.value);
  $("#t-l").onchange = (e) => { TLG.league = e.target.value; route(); };
  document.querySelectorAll("[data-tl]").forEach((a) => a.onclick = (e) => { e.preventDefault(); TLG.league = a.dataset.tl; window.scrollTo(0, 0); route(); });
}
async function viewRecords() {
  const d = await api("/api/records");
  $("#view").innerHTML = `<h1>Records and Hall of Fame</h1>
    <div class="cols3"><div><h2>Best retired coaches</h2>${d.coaches.length ? d.coaches.map((c) => `<div class="row"><span>${esc(c.name)} <span class="meta">${esc(c.nat)}</span></span><span class="meta">${c.titles} titles, ${c.cups} cups, ${c.cwc} CWC, ${c.win}%</span></div>`).join("") : '<div class="meta">None retired yet.</div>'}</div>
    <div><h2>World Cup winners</h2>${d.wc.length ? d.wc.map((r) => `<div class="row"><span>S${r.season} ${natLink(r.winner)}</span><span class="meta">beat ${esc(r.runner_up)}, host ${esc(r.host)}</span></div>`).join("") : '<div class="meta">None yet.</div>'}
    <h2>Club World Cup winners</h2>${d.cwc.length ? d.cwc.map((r) => `<div class="row"><span>S${r.season} ${clubLink(r.winner)}</span><span class="meta">beat ${esc(r.runner_up)}</span></div>`).join("") : '<div class="meta">None yet.</div>'}</div>
    <div><h2>League records</h2>${d.records.map((r) => `<div class="row"><span>${leagueLink(r.league)}</span><span class="meta">${r.pts} pts (${esc(r.pts_club)})</span></div>`).join("") || '<div class="meta">None yet.</div>'}</div></div>`;
}


// ---------------------------------------------------------------- rivalries and match previews
const pct = (x) => Math.round(x * 100) + "%";
const chips = (f) => (f ? f.split("").map((c) => `<span class="chip ${c}">${c}</span>`).join("") : '<span class="meta">no games yet</span>');
function rivBadge(r) { return r ? `<span class="tag ${r.known && r.level === 3 ? "red" : "gold"}">${esc(r.name)}</span>` : ""; }
function h2hBlock(h, a, b) {
  if (!h.meet) return `<div class="meta">${esc(a)} and ${esc(b)} have not met since records began. They fill in as seasons are played.</div>`;
  const big = (x, who) => (x ? `<div class="row"><span>${esc(who)}'s biggest win</span><span><b>${x[1]}-${x[2]}</b> <span class="meta">S${x[0]} ${esc(x[3])}</span></span></div>` : `<div class="row"><span>${esc(who)}'s biggest win</span><span class="meta">none yet</span></div>`);
  return `<div class="h2h"><div class="h2h-n"><b>${h.wins[0]}</b><span>${esc(a)} wins</span></div><div class="h2h-n"><b>${h.draws}</b><span>draws</span></div><div class="h2h-n"><b>${h.wins[1]}</b><span>${esc(b)} wins</span></div></div>
    <div class="meta" style="text-align:center;margin:4px 0 10px">${h.meet} meetings &middot; goals ${h.goals[0]}-${h.goals[1]}${h.ko[0] + h.ko[1] ? ` &middot; knockout ties ${h.ko[0]}-${h.ko[1]}` : ""}${h.finals ? ` &middot; ${h.finals} final${h.finals > 1 ? "s" : ""}` : ""}</div>
    ${big(h.big[0], a)}${big(h.big[1], b)}
    <h2>Last meetings</h2>${h.last.map((x) => `<div class="row"><span class="meta">S${x[0]} ${esc(x[3])}</span><span><b>${esc(a)} ${x[1]}-${x[2]} ${esc(b)}</b></span></div>`).join("")}
    ${h.story.length ? `<h2>Moments</h2>${h.story.map((x) => `<div class="row"><span class="meta">S${x[0]}</span><span>${esc(x[1])}</span></div>`).join("")}` : ""}`;
}
async function viewMatchup(cid, h, a) {
  h = decodeURIComponent(h || ""); a = decodeURIComponent(a || "");
  const m = await api(`/api/matchup?home=${enc(h)}&away=${enc(a)}${cid && cid !== "-" ? "&comp=" + enc(cid) : ""}`);
  const nat = !!m.nation, L = nat ? natLink : clubLink, tour = m.game != null;
  if (tour) { h = m.home.name; a = m.away.name; }               // the tournament game's own home / first team goes on the left
  let fx = null;
  if (m.comp && m.comp.kind === "league") { const f = await api("/api/fixtures?name=" + enc(m.comp.title)).catch(() => null); fx = f && f.rows.find((r) => r.h === h && r.a === a); }
  const side = (s) => `<div class="card"><h3>${L(s.name)} <small>${esc(nat ? s.confed : s.league)}</small></h3>
    <div class="row"><span>${nat ? "Rating" : "Team OVR"}</span><b>${nat ? s.ovr : ovr(s.ovr)}</b></div>
    ${s.pos && s.group ? `<div class="row"><span>${esc(s.group)}</span><b>${s.pos}${["st", "nd", "rd"][s.pos - 1] || "th"} of ${s.size}</b></div><div class="row"><span>Points / played</span><b>${s.pts} / ${s.p}</b></div><div class="row"><span>Goals for / against</span><b>${s.gf} / ${s.ga}</b></div>` : ""}
    ${s.pos && !s.group ? `<div class="row"><span>League position</span><b>${s.pos}</b></div><div class="row"><span>Points / played</span><b>${s.pts} / ${s.p}</b></div><div class="row"><span>Goals for / against</span><b>${s.gf} / ${s.ga}</b></div><div class="row"><span>Form</span><span>${chips(s.form)}</span></div>` : ""}
    ${s.reached != null ? `<div class="row"><span>Rounds won so far</span><b>${s.reached}</b></div>` : ""}</div>`;
  const rv = m.rivalry, g = m.game;
  const gameCard = !tour ? "" : g.done ? `<div class="card" style="text-align:center"><div class="meta">${esc(g.round)}${g.text ? "" : ""}</div><div style="font-size:26px;font-weight:800">${esc(g.text || "Played")}</div>${g.winner ? `<div style="margin-top:4px;font-weight:700;color:var(--accent2)">${esc(outcomeText(g.winner, g.text, true))}</div>` : ""}</div>`
    : g.playable ? `<div class="card"><div class="meta">${esc(g.round)}${g.date ? " &middot; " + g.date.text : ""} &middot; ${g.venue ? "played at " + esc(g.venue) : "neutral venue"}${g.leg === 2 && g.leg1 ? " &middot; 1st leg finished " + g.leg1[0] + "-" + g.leg1[1] : ""}</div>
      <p style="margin:8px 0 0"><button class="pri" id="mu-gsim">Sim this game</button> <span class="meta">${esc(m.comp.title)}</span></p></div>`
    : `<div class="card"><div class="meta">${esc(g.why || "")}</div></div>`;
  $("#view").innerHTML = `<div class="crumbs"><a href="#/world">World</a> / ${m.comp ? `<a href="#/${m.comp.kind === "league" ? "league" : "comp"}/${enc(m.comp.kind === "league" ? m.comp.title : m.comp.id)}">${esc(m.comp.title)}</a>` : "Match preview"}</div>
    ${nat ? "" : `<div class="vscrests">${crest(h, 72)}<span class="meta">v</span>${crest(a, 72)}</div>`}
    <h1>${L(h)} <span class="meta">v</span> ${L(a)}</h1>
    ${rv ? `<div class="notebox warn"><b>${esc(rv.name)}</b> <span class="tag ${rv.known && rv.level === 3 ? "red" : "gold"}">${esc(rv.kind)}</span><div class="meta">Derby intensity ${pct(rv.intensity)}. In a rivalry game the form gap shrinks and the home edge fades. The bigger the stage, the bigger the effect.</div>
      <div style="margin-top:4px"><button id="rv-rename" class="sm" style="min-height:28px;padding:2px 10px;font-size:12px">Rename</button></div></div>` : `<div class="meta">No rivalry between these ${nat ? "nations" : "clubs"} yet. Close games, title races, cup ties and big ${nat ? "tournament" : "transfers"} meetings can start one.</div>`}
    ${gameCard}
    ${fx && fx.done ? `<div class="card" style="text-align:center"><div class="meta">Full time this matchweek</div><div style="font-size:30px;font-weight:800">${fx.hg} - ${fx.ag}</div></div>` : fx ? `<p><button class="pri" id="mu-sim">Sim this game</button> <span class="meta">${esc(m.comp.title)}, matchweek ${(await api("/api/fixtures?name=" + enc(m.comp.title))).week}</span></p>` : ""}
    <div class="odds"><div class="o-h" style="flex:${m.odds.home}"><b>${pct(m.odds.home)}</b><span>${esc(h)}</span></div><div class="o-d" style="flex:${m.odds.draw}"><b>${pct(m.odds.draw)}</b><span>${tour && g.playable && g.leg !== 1 && g.leg !== 2 && m.comp.kind !== "qual" && /^(cup|cwc|wc|ct|ic)$/.test(m.comp.kind) ? "draw after 90" : "draw"}</span></div><div class="o-a" style="flex:${m.odds.away}"><b>${pct(m.odds.away)}</b><span>${esc(a)}</span></div></div>
    <div class="cols" style="margin-top:14px">${side(m.home)}${side(m.away)}</div>
    <h2>Head to head</h2>${h2hBlock(m.h2h, h, a)}`;
  if ($("#mu-sim")) $("#mu-sim").onclick = async () => { await simComp(m.comp.id, { fixture: { h, a } }); };
  if ($("#mu-gsim")) $("#mu-gsim").onclick = async () => { await simComp(m.comp.id, { game: g.key }); await route(); };
  if ($("#rv-rename")) $("#rv-rename").onclick = () => renameRivalry(h, a, rv.name, () => route());
}
function renameRivalry(a, b, cur, done) {
  openModal(`<h2>Name this rivalry</h2><p class="meta">${esc(a)} v ${esc(b)}</p><div class="field"><input id="rv-name" maxlength="40" value="${esc(cur || "")}" style="flex:1"><button class="pri" id="rv-save">Save</button></div><p style="text-align:right"><button onclick="closeModal()">Cancel</button></p>`);
  $("#rv-save").onclick = async () => { try { await api("/api/rivalry_name", { a, b, name: $("#rv-name").value }); closeModal(); toast("Named: " + $("#rv-name").value, true); done(); } catch (e) { toast(e.message); } };
}
const RVS = { type: "clubs", sort: "heat", status: "all", scope: "world", q: "", limit: 25 };
async function viewRivals() {
  const d = await api("/api/rivals_page?" + Object.entries(RVS).map(([k, v]) => k + "=" + enc(v)).join("&"));
  const nat = d.type === "nations", L = nat ? natLink : clubLink;
  const sortName = { heat: "Heat", history: "History", rising: "Rising", meetings: "Most meetings", big: "Biggest win" };
  const tag = (r) => r.known ? `<span class="tag ${r.level === 3 ? "red" : "gold"}">${esc(r.kind)}</span>` : `<span class="tag green">Rising</span>`;
  const rowHTML = (r, i) => `<div class="rvrow"><div class="rk">${d.offset + i + 1}</div><div class="rvm">
      <div><a href="#/matchup/-/${enc(r.a)}/${enc(r.b)}"><b>${esc(r.name)}</b></a> ${tag(r)}${r.named ? ' <span class="meta">(your name)</span>' : ""}</div>
      <div class="rvt">${L(r.a)} <span class="meta">v</span> ${L(r.b)}</div>
      <div class="meta">${r.meet ? `${r.meet} meeting${r.meet === 1 ? "" : "s"} &middot; ${r.wins[0]}-${r.draws}-${r.wins[1]}${r.bigline ? ` &middot; biggest win: ${esc(r.bigline[0])} ${r.bigline[1][1]}-${r.bigline[1][2]} (S${r.bigline[1][0]})` : ""}` : "no meetings on record yet"}</div></div>
      <div class="rvh2" title="History is where the rivalry started. Heat is what this world has added."><div class="m hs"><span>History</span><div class="bar"><i style="width:${r.history}%"></i></div><b>${r.history}</b></div><div class="m ht"><span>Heat</span><div class="bar"><i style="width:${r.heat_pct}%"></i></div><b>${r.heat_pct}</b></div>${r.rise > 0.5 ? `<div class="up">+${Math.round(r.rise)} this season</div>` : ""}${!r.meet && r.known ? '<div class="meta">Not met yet</div>' : ""}</div></div>`;
  const scopeOpts = `<option value="world" ${d.scope === "world" ? "selected" : ""}>World</option><optgroup label="Confederation">${d.confeds.map((c) => `<option value="${c}" ${d.scope === c ? "selected" : ""}>${c}</option>`).join("")}</optgroup>${nat ? "" : `<optgroup label="League">${d.leagues.map((l) => `<option value="L:${esc(l)}" ${d.scope === "L:" + l ? "selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>`}`;
  $("#view").innerHTML = `<h1>Rivalries</h1>
    <div class="sub">The hottest rivalries in your world. Tap one for the head-to-head page, where you can rename it.</div>
    <div class="rvbar"><div class="tabs"><button data-ty="clubs" class="${nat ? "" : "on"}">Clubs</button><button data-ty="nations" class="${nat ? "on" : ""}">Nations</button></div>
      <select id="rv-scope" title="Where to look">${scopeOpts}</select>
      <select id="rv-sort" title="Rank by">${Object.entries(sortName).map(([k, v]) => `<option value="${k}" ${d.sort === k ? "selected" : ""}>Rank by: ${v}</option>`).join("")}</select>
      <input id="rv-q" placeholder="Search a team or rivalry" value="${esc(RVS.q)}"></div>
    <div class="meta" style="margin:6px 0">History is where a rivalry started. Heat is what this world has added. Rising shows who gained most this season.</div>
    <div class="rvbar"><button data-st="all" class="${d.status === "all" ? "pri" : ""}">All</button><button data-st="real" class="${d.status === "real" ? "pri" : ""}">Real</button><button data-st="rising" class="${d.status === "rising" ? "pri" : ""}">Earned</button>
      <span class="meta">${d.status === "real" ? "Real: long-standing rivalries from real football." : d.status === "rising" ? "Earned: new rivalries your world has built from matches, titles, finals and transfers." : "Real rivalries from real football, plus new ones your world has built."}</span></div>
    ${d.rows.length ? `<div class="rvlist">${d.rows.map(rowHTML).join("")}</div>
      <p class="meta" style="text-align:center">Showing ${d.offset + d.rows.length} of ${d.total}${d.offset + d.rows.length < d.total ? ` <button id="rv-more">Show 25 more</button>` : ""}</p>` : '<div class="empty">Nothing matches. Try a wider scope or clear the search.</div>'}
    ${!nat && d.derby && d.derby.length ? `<div class="card" style="margin-top:14px"><h3>Derby effect on the league</h3>${d.derby.filter((x) => d.scope.startsWith("L:") ? x.league === d.scope.slice(2) : true).slice(0, d.scope.startsWith("L:") ? 1 : 16).map((x) => `<div class="row"><span>${leagueLink(x.league)}</span><span><b class="gold">${x.index}</b> <span class="meta">TV ${x.tv > 0 ? "+" : ""}${x.tv}% &middot; gate ${x.gate > 0 ? "+" : ""}${x.gate}%</span></span></div>`).join("")}<div class="meta" style="margin-top:6px">The derby index measures how many live rivalries a league holds. Compared with the world's middle league, a higher index brings more TV money and a fuller ground, and a lower one a little less.</div></div>` : ""}`;
  const redo = (ch) => { Object.assign(RVS, ch, { limit: 25 }); route(); };
  document.querySelectorAll("[data-ty]").forEach((b) => b.onclick = () => redo({ type: b.dataset.ty, scope: "world" }));
  document.querySelectorAll("[data-st]").forEach((b) => b.onclick = () => redo({ status: b.dataset.st }));
  $("#rv-scope").onchange = (e) => redo({ scope: e.target.value });
  $("#rv-sort").onchange = (e) => redo({ sort: e.target.value });
  let tm = null; $("#rv-q").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { Object.assign(RVS, { q: e.target.value, limit: 25 }); route().then(() => { const i = $("#rv-q"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 350); };
  if ($("#rv-more")) $("#rv-more").onclick = () => { RVS.limit = d.offset + d.rows.length + 25; RVS.offset = 0; route(); };
}
async function clubRivals(name) {
  const d = await api("/api/rivalries?club=" + enc(name)).catch(() => null);
  if (!d || !d.rows.length) return;
  $("#view").insertAdjacentHTML("beforeend", `<h2>Rivals</h2><div class="card">${d.rows.slice(0, 6).map((r) => { const o = r.a === name ? r.b : r.a, w = r.a === name ? r.wins : [r.wins[1], r.wins[0]];
    return `<div class="row"><span>${clubLink(o)} <a class="meta" href="#/matchup/-/${enc(name)}/${enc(o)}">${esc(r.name)}</a></span><span class="meta">${r.kind}${r.meet ? ` &middot; ${w[0]}-${r.draws}-${w[1]}` : ""}</span></div>`; }).join("")}</div>`);
}

// ---------------------------------------------------------------- router

// ---------------------------------------------------------------- competition stats
function statsHTML(s) {
  const tm = (n) => (s.nation ? natLink(n) : clubLink(n));
  const tbl = (list, cols) => list.length ? `<div class="scroll"><table><thead><tr><th>#</th><th class="l">Player</th><th class="l">${s.nation ? "Nation" : "Club"}</th><th>Pos</th>${cols.map((c) => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>
    ${list.map((p, i) => `<tr><td>${i + 1}</td><td class="l">${playerLink(p)}</td><td class="l">${tm(p.team)}</td><td class="pos-${esc(p.pos)}">${esc(p.pos)}</td>${cols.map((c) => `<td class="${c[2] || ""}">${p[c[1]]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : '<div class="meta">Nothing yet.</div>';
  const mvp = `<div class="cols"><div><h4 class="sh">Most valuable player</h4>${s.mvp && s.mvp.length ? s.mvp.map((p, i) => `<div class="row"><span>${i + 1}. ${playerLink(p)} <span class="meta">${tm(p.team)} &middot; ${p.goals}g ${p.assists}a</span></span><b>${p.pts} pts</b></div>`).join("") : '<div class="meta">Nothing yet.</div>'}</div>
    <div><h4 class="sh">Coach of the competition</h4>${s.coach && s.coach.length ? s.coach.map((c, i) => `<div class="row"><span>${i + 1}. ${esc(c.name)} <span class="meta">${tm(c.team)}</span></span></div>`).join("") : '<div class="meta">Nothing yet.</div>'}</div></div>`;
  return `<div class="tabs sub-tabs"><button class="on" data-st="g">Top scorers</button><button data-st="a">Assists</button><button data-st="c">Clean sheets</button><button data-st="m">MVP and coach</button></div>
    <div data-sp="g">${tbl(s.scorers, [["Goals", "goals", "pts"], ["Ast", "assists"]])}</div><div data-sp="a" hidden>${tbl(s.assists, [["Ast", "assists", "pts"], ["Goals", "goals"]])}</div>
    <div data-sp="c" hidden>${tbl(s.keepers, [["Clean sheets", "cs", "pts"]])}</div><div data-sp="m" hidden>${mvp}</div>`;
}
const STATTAB = {};
async function loadStats(el, id, season) {
  el.innerHTML = '<div class="meta">Loading...</div>';
  try {
    const s = await api("/api/compstats?id=" + enc(id) + (season ? "&season=" + season : ""));
    el.innerHTML = statsHTML(s);
    const key = id + "|" + (season || "");
    el.querySelectorAll("[data-st]").forEach((b) => b.onclick = () => {
      STATTAB[key] = b.dataset.st;
      el.querySelectorAll("[data-st]").forEach((o) => o.classList.toggle("on", o === b));
      el.querySelectorAll("[data-sp]").forEach((d) => (d.hidden = d.dataset.sp !== b.dataset.st));
    });
    const sb = STATTAB[key] && el.querySelector(`[data-st="${STATTAB[key]}"]`);
    if (sb) sb.click();
  } catch (e) { el.innerHTML = `<div class="meta">${esc(e.message)}</div>`; }
}

// ---------------------------------------------------------------- competition-end overview (optional animation)
const animOn = () => { try { return localStorage.getItem("ss_anim") === "1"; } catch (e) { return false; } };
async function playFinished(list) {
  if (!list || !list.length || !animOn()) return;
  list = list.filter((x) => isFollowed(x.id));             // winner popups are for your favorites (and the summer tournaments)
  for (let i = 0; i < list.length; i++) {
    let s;
    if (list[i].kind === "qual") {
      try { s = await api("/api/qualstats?id=" + enc(list[i].id)); } catch (e) { continue; }
      if (await showQualEnd(s, i < list.length - 1)) break;
      continue;
    }
    try { s = await api("/api/compstats?id=" + enc(list[i].id)); } catch (e) { continue; }
    if (await showCompEnd(s, i < list.length - 1)) break;
  }
}
// World Cup qualifying finished: who is going, who needed a play-off, who missed out
function showQualEnd(s, more) {
  return new Promise((res) => {
    const q = s.qualified || [], pw = q.filter((t) => t.via === "play-off"), ms = s.missed || [];
    const facts = [];
    if (pw.length) facts.push(`Won their play-off: ${pw.map((t) => natLink(t.team)).join(", ")}`);
    if (ms.length) facts.push(`Biggest name missing: ${natLink(ms[0].team)} <span class="meta">rating ${ms[0].rating}</span>${ms.length > 1 ? `<br><span class="meta">Also out:</span> ${ms.slice(1, 3).map((t) => natLink(t.team)).join(", ")}` : ""}`);
    if (s.weakest) facts.push(`Lowest-rated qualifier: ${natLink(s.weakest.team)} <span class="meta">rating ${s.weakest.rating}</span>`);
    const sub = `Heading to the World Cup`;
    openModal(`<div class="ce"><div class="ce-emb"><svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="33" fill="#0f1a14" stroke="#f5c542" stroke-width="3"/><circle cx="36" cy="36" r="26" fill="none" stroke="#2a4235" stroke-width="2"/><polyline points="22,37 32,47 51,26" fill="none" stroke="#3ddc84" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="ce-t">${esc(s.name)} <span class="meta">${esc(s.season_label || "")}</span></div>
      <div class="ce-w">${q.length} nation${q.length === 1 ? "" : "s"} qualified</div><div class="ce-sub">${sub}</div>
      <div class="cq-grid">${q.map((t, i) => `<div class="cq-n" style="animation-delay:${1.0 + i * 0.1}s">${natLink(t.team)}</div>`).join("")}</div>
      <div class="ce-facts">${facts.map((f, i) => `<div class="ce-f" style="animation-delay:${1.0 + q.length * 0.1 + 0.3 + i * 0.45}s">${f}</div>`).join("")}</div>
      <div class="ce-btns"><button class="pri" id="ce-next">${more ? "Next" : "Close"}</button> <button id="ce-full">Full results</button>${more ? ' <button id="ce-skip">Skip all</button>' : ""}</div></div>`);
    const done = (skip) => { closeModal(); res(skip); };
    $("#ce-next").onclick = () => done(false);
    $("#ce-full").onclick = () => { location.hash = "#/comp/" + enc(s.id); done(true); };
    if ($("#ce-skip")) $("#ce-skip").onclick = () => done(true);
  });
}
function showCompEnd(s, more) {
  return new Promise((res) => {
    const tm = (n) => (s.nation ? natLink(n) : clubLink(n));
    const sc = s.scorers && s.scorers[0], mv = s.mvp && s.mvp[0], co = s.coach && s.coach[0];
    const facts = [];
    if (s.kind === "league" && s.top3) facts.push(`${s.top3.map((t, i) => `${i + 1}. ${tm(t.team)} <b>${t.pts}</b>`).join(" &nbsp; ")}`);
    else if (s.runner_up) facts.push(`Runner-up: ${tm(s.runner_up)}${s.final ? ` <span class="meta">(final ${esc(s.final)})</span>` : ""}`);
    if (sc) facts.push(`Top scorer: ${playerLink(sc)} <span class="meta">${tm(sc.team)}</span> <b>${sc.goals}</b> goals`);
    if (mv) facts.push(`Most valuable player: ${playerLink(mv)} <span class="meta">${tm(mv.team)}</span>`);
    if (co) facts.push(`Coach of the competition: <b>${esc(co.name)}</b> <span class="meta">${tm(co.team)}</span>`);
    openModal(`<div class="ce"><div class="ce-emb">${emblem(s.emblem, window.innerWidth < 700 ? 72 : 96)}</div><div class="ce-t">${esc(s.name)} <span class="meta">${esc(s.season_label || "")}</span></div>
      <div class="ce-w">${s.winner ? tm(s.winner) : "-"}</div><div class="ce-sub">${s.kind === "league" ? "Champions" : "Winners"}</div>
      <div class="ce-facts">${facts.map((f, i) => `<div class="ce-f" style="animation-delay:${1.3 + i * 0.45}s">${f}</div>`).join("")}</div>
      <div class="ce-btns"><button class="pri" id="ce-next">${more ? "Next" : "Close"}</button>${more ? ' <button id="ce-skip">Skip all</button>' : ""}</div></div>`);
    const done = (skip) => { closeModal(); res(skip); };
    $("#ce-next").onclick = () => done(false);
    if ($("#ce-skip")) $("#ce-skip").onclick = () => done(true);
  });
}

// ---------------------------------------------------------------- players
const PF = { q: "", pos: "", nat: "", league: "", sort: "ovr", offset: 0, maxage: "" };
async function viewPlayers() {
  const qs = () => Object.entries({ ...PF, limit: 100 }).filter(([k, v]) => v !== "" && v != null).map(([k, v]) => k + "=" + enc(v)).join("&");
  const d = await api("/api/players?" + qs());
  const opt = (list, cur, label) => `<option value="">${label}</option>` + list.map((x) => `<option ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("");
  $("#view").innerHTML = `<h1>Players</h1><div class="sub">${d.total.toLocaleString()} players. Search by name, filter, and click a name for the player page. G/A/CS are this season so far (league).</div>
    <p class="filters"><input id="pf-q" placeholder="Search name..." value="${esc(PF.q)}"> <select id="pf-pos">${opt(["GK", "DEF", "MID", "FWD"], PF.pos, "Any position")}</select>
    <select id="pf-nat">${opt(d.nations, PF.nat, "Any nation")}</select><select id="pf-league">${opt(d.leagues, PF.league, "Any league")}</select>
    <select id="pf-sort">${[["ovr", "Sort: OVR"], ["pot", "Potential"], ["age", "Youngest"], ["value", "Value"], ["wage", "Wage"], ["goals", "Goals"], ["assists", "Assists"], ["name", "Name"]].map(([k, t]) => `<option value="${k}" ${PF.sort === k ? "selected" : ""}>${t}</option>`).join("")}</select>
    <label class="lbl">max age</label> <input id="pf-age" type="number" min="15" max="45" placeholder="Max age" style="width:90px" value="${esc(PF.maxage)}"> <button id="pf-go" class="pri">Search</button></p>
    <div class="scroll"><table class="hof wf nwl"><thead><tr><th class="l">Player</th><th class="l hide-m">Pos</th><th class="hide-m">Age</th><th>OVR</th><th>Pot</th><th class="l hide-m">Club</th><th class="hide-m" title="Goals this season">G</th><th class="hide-m" title="Assists this season">A</th><th class="hide-m" title="Clean sheets this season">CS</th><th class="hide-m">Wage/yr</th><th>Value</th></tr></thead><tbody>
    ${d.rows.map((p) => `<tr><td class="l">${playerLink(p)}<div class="meta show-m"><span class="pos-${esc(p.pos)}">${esc(p.pos)}</span> &middot; age ${p.age} &middot; ${p.club ? esc(p.club) : "free agent"}</div><div class="meta show-m">${p.gls || p.ast || p.cs ? `${p.gls || 0} G &middot; ${p.ast || 0} A${p.cs ? " &middot; " + p.cs + " CS" : ""} &middot; ` : ""}wage ${money(p.wage)}/yr</div></td><td class="l hide-m pos-${esc(p.pos)}">${esc(p.pos)}</td><td class="hide-m">${p.age}</td><td>${ovr(p.ovr)}</td><td>${p.pot}</td><td class="l hide-m">${p.club ? clubLink(p.club) : '<span class="meta">free agent</span>'}</td><td class="hide-m">${p.gls ?? "-"}</td><td class="hide-m">${p.ast ?? "-"}</td><td class="hide-m">${p.cs || ""}</td><td class="hide-m">${money(p.wage)}</td><td>${money(p.value)}</td></tr>`).join("")}</tbody></table></div>
    <p>${PF.offset > 0 ? '<button id="pf-prev">Previous 100</button> ' : ""}<span class="meta">${PF.offset + 1}-${Math.min(d.total, PF.offset + 100)} of ${d.total}</span> ${PF.offset + 100 < d.total ? '<button id="pf-next">Next 100</button>' : ""}</p>`;
  const go = () => { PF.q = $("#pf-q").value; PF.pos = $("#pf-pos").value; PF.nat = $("#pf-nat").value; PF.league = $("#pf-league").value; PF.sort = $("#pf-sort").value; PF.maxage = $("#pf-age").value; PF.offset = 0; route(); };
  $("#pf-go").onclick = go; $("#pf-q").onkeydown = (e) => { if (e.key === "Enter") go(); };
  ["pf-pos", "pf-nat", "pf-league", "pf-sort"].forEach((i) => ($("#" + i).onchange = go));
  if ($("#pf-prev")) $("#pf-prev").onclick = () => { PF.offset = Math.max(0, PF.offset - 100); route(); };
  if ($("#pf-next")) $("#pf-next").onclick = () => { PF.offset += 100; route(); };
}
function lineChart(pts, w, h, color, invert) {
  if (pts.length < 2) return '<div class="meta">Not enough seasons yet.</div>';
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) - 2, y1 = Math.max(...ys) + 2;
  const X = (x) => 34 + ((x - x0) / Math.max(1, x1 - x0)) * (w - 44), Y = (y) => (invert ? 14 + ((y - y0) / Math.max(1, y1 - y0)) * (h - 36) : h - 22 - ((y - y0) / Math.max(1, y1 - y0)) * (h - 36));
  const path = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px"><path d="${path}" fill="none" stroke="${color || "#3ddc84"}" stroke-width="2.2"/>
    ${pts.map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3" fill="${color || "#3ddc84"}"><title>S${p[0]}: ${p[1]}</title></circle>`).join("")}
    <text x="4" y="${Y(y1 - 2) + 4}" class="axis">${y1 - 2}</text><text x="4" y="${Y(y0 + 2) + 4}" class="axis">${y0 + 2}</text>
    <text x="${X(x0)}" y="${h - 4}" class="axis" text-anchor="middle">S${x0}</text><text x="${X(x1)}" y="${h - 4}" class="axis" text-anchor="middle">S${x1}</text></svg>`;
}
async function viewPlayer(uid) {
  const p = await api("/api/player?uid=" + enc(uid));
  const grp = {};
  p.honours.forEach((h) => { (grp[h.title] = grp[h.title] || []).push(h.season); });
  const hon = Object.entries(grp).sort((a, b) => b[1].length - a[1].length);
  const tot = p.totals;
  $("#view").innerHTML = `<div class="crumbs"><a href="#/players">Players</a> / ${esc(p.name)}</div>
    <h1>${flag(p.nat, 34)} ${esc(p.name)} ${p.retired ? '<span class="tag">retired</span>' : ""}</h1>
    <div class="sub">${esc(p.pos)} &middot; age ${p.age} &middot; ${natLink(p.nat)} &middot; ${p.club ? clubLink(p.club) : "free agent"}${p.contract && p.club ? " &middot; contract " + p.contract + " yr" : ""}</div>
    <div class="cols3"><div class="stat"><div class="k">OVR</div><div class="v">${ovr(p.ovr)}</div></div><div class="stat"><div class="k">Potential / peak</div><div class="v">${p.pot} / ${p.peak}</div></div>
      <div class="stat"><div class="k">Value</div><div class="v">${money(p.value)}</div></div><div class="stat"><div class="k">Wage per year</div><div class="v">${money(p.wage)}</div></div>
      <div class="stat"><div class="k">Career goals</div><div class="v">${tot.goals}</div></div><div class="stat"><div class="k">Career assists</div><div class="v">${tot.assists}</div></div></div>
    ${STATUS && STATUS.god ? `<p><button id="g-edit-p" class="gold">God mode: edit player</button></p>` : ""}
    <div class="cols" style="margin-top:14px"><div>
      <div class="card"><h3>Rating by season</h3>${lineChart(p.career.map((c) => [c.season, c.ovr]), 520, 170)}</div>
      <div class="card" style="margin-top:14px"><h3>League seasons</h3>${p.seasons.length ? `<div class="scroll"><table><thead><tr><th>Season</th><th class="l">Club</th><th>Goals</th><th>Assists</th><th>CS</th></tr></thead><tbody>${p.seasons.slice().reverse().map((x) => `<tr><td>${x.season}${x.live ? " <span class=\"tag\">so far</span>" : ""}</td><td class="l">${clubLink(x.club)}</td><td>${x.goals}</td><td>${x.assists}</td><td>${x.cs || ""}</td></tr>`).join("")}</tbody></table></div>` : '<div class="meta">No completed seasons yet.</div>'}</div>
      <div class="card" style="margin-top:14px"><h3>Cups and tournaments</h3>${p.cups.length ? `<div class="scroll"><table><thead><tr><th>Season</th><th class="l">Competition</th><th class="l">Team</th><th>Goals</th><th>Assists</th><th>CS</th></tr></thead><tbody>${p.cups.slice().reverse().map((x) => `<tr><td>${x.season}</td><td class="l">${esc(x.comp)}</td><td class="l">${esc(x.team)}</td><td>${x.goals}</td><td>${x.assists}</td><td>${x.cs || ""}</td></tr>`).join("")}</tbody></table></div>` : '<div class="meta">Nothing yet.</div>'}</div></div>
    <div><div class="card"><h3>Honours</h3>${hon.length ? hon.map(([t, ys]) => `<div class="row"><span>${esc(t)}${ys.length > 1 ? " x" + ys.length : ""}</span><span class="meta">${ys.map((y) => "S" + y).join(", ")}</span></div>`).join("") : '<div class="meta">None yet.</div>'}</div>
      <div class="card" style="margin-top:14px"><h3>Career</h3>${p.career.length ? p.career.slice().reverse().map((c) => `<div class="row"><span>S${c.season} ${c.club ? clubLink(c.club) : "free agent"}</span><span>${ovr(c.ovr)}</span></div>`).join("") : '<div class="meta">No history yet.</div>'}</div></div></div>`;
  if ($("#g-edit-p")) $("#g-edit-p").onclick = () => godPlayer(p);
}

// ---------------------------------------------------------------- settings
async function settingsDialog() {
  const s = await api("/api/settings");
  openModal(`<h2>Settings</h2>
    <label class="check"><input type="checkbox" id="st-anim" ${animOn() ? "checked" : ""}> Show a winner animation and overview when a league or cup finishes</label>
    <label class="check"><input type="checkbox" id="st-god" ${s.god ? "checked" : ""}> God mode (commissioner editor: edit players, clubs, nations and money)</label>
    <p class="meta">Money is shown in euros (1 engine unit = ${s.money_x} million).</p>
    ${logoPanel()}
    <p><button class="pri" id="st-ok">Done</button> <button id="st-log">Commissioner edit log</button></p>`);
  $("#st-log").onclick = editLogDialog;
  wireLogoPanel();
  $("#st-ok").onclick = async () => {
    try { localStorage.setItem("ss_anim", $("#st-anim").checked ? "1" : "0"); } catch (e) {}
    await api("/api/settings_set", { god: $("#st-god").checked });
    closeModal(); await refreshStatus(); await route();
  };
}


// ---------------------------------------------------------------- god mode (commissioner editor)
function godDialog(title, kind, ident, fields, note) {
  openModal(`<h2>${esc(title)}</h2><div class="god-form">${fields.map((f) => `<label><span>${f.label}</span>${f.type === "select"
      ? `<select data-f="${f.k}">${f.opts.map((o) => `<option ${o === f.val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : f.type === "club" ? `<input data-f="${f.k}" list="god-clubs" value="${esc(f.val)}" placeholder="club name, or empty for free agent">`
      : `<input data-f="${f.k}" value="${esc(f.val)}" type="number" step="${f.step || 1}">`}</label>`).join("")}</div>
    <datalist id="god-clubs">${(godDialog.clubs || []).map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
    <label class="check"><input type="checkbox" id="g-now"> Also change competitions that are already running (they normally keep their start-of-season ratings)</label>
    <p class="meta">${note || "Changes apply to everything that has not started yet and are written to the edit log."}</p>
    <p><button class="pri" id="g-ok">Apply</button> <button id="g-cancel">Cancel</button></p><div class="meta" id="g-err" style="color:var(--red)"></div>`);
  $("#g-cancel").onclick = closeModal;
  $("#g-ok").onclick = async () => {
    const changed = {};
    document.querySelectorAll("#modal-box [data-f]").forEach((e) => { const f = fields.find((x) => x.k === e.dataset.f); if (String(e.value) !== String(f.val)) changed[f.k] = e.value; });
    if (!Object.keys(changed).length) { $("#g-err").textContent = "Nothing was changed."; return; }
    try { await api("/api/edit", { kind, ...ident, fields: changed, apply_now: $("#g-now").checked }); closeModal(); toast("Saved: " + title, true); await refreshStatus(); await route(); }
    catch (e) { $("#g-err").textContent = e.message; }
  };
}
async function godPlayer(p) {
  const st = await api("/api/settings"); godDialog.clubs = st.clubs;
  godDialog(`Edit ${p.name}`, "player", { uid: p.uid }, [
    { k: "ovr", label: "OVR", val: p.ovr }, { k: "pot", label: "Potential", val: p.pot }, { k: "age", label: "Age", val: p.age },
    { k: "pos", label: "Position", val: p.pos, type: "select", opts: ["GK", "DEF", "MID", "FWD"] },
    { k: "wage", label: "Wage per year (millions of euros)", val: p.wage, step: 0.1 }, { k: "contract", label: "Contract years left", val: p.contract },
    { k: "club", label: "Club", val: p.club || "", type: "club" }]);
}
async function godClub(name) {
  const c = await api("/api/club?name=" + enc(name)); const st = await api("/api/settings"); godDialog.clubs = st.clubs;
  godDialog(`Edit ${name}`, "club", { name }, [
    { k: "team_ovr", label: "Team OVR (best 11 average; shifts every player)", val: Math.round(c.top11) },
    { k: "budget", label: "Yearly income (millions of euros)", val: c.budget, step: 1 }, { k: "funds", label: "Transfer funds (millions of euros)", val: c.funds, step: 1 },
    { k: "stature", label: "Stature (0-100)", val: c.stature, step: 1 }]);
}
async function godNation(name) {
  const n = await api("/api/nation?name=" + enc(name));
  godDialog(`Edit ${name}`, "nation", { name }, [
    { k: "team_ovr", label: "National team OVR (best 11 of the nation; shifts those players)", val: Math.round(n.rating || n.ovr || 70) },
    { k: "dev", label: "Talent (how strong future players are, 30-100)", val: Math.round(n.talent || n.dev || 70) }]);
}
async function godLeague(name) {
  const d = await api("/api/league?name=" + enc(name));
  godDialog(`Edit ${name}`, "league", { name }, [{ k: "tvmult", label: "TV money multiplier", val: d.tv ?? 1, step: 0.05 }]);
}
async function editLogDialog() {
  const d = await api("/api/edits");
  openModal(`<h2>Commissioner edit log</h2>${d.edits.length ? d.edits.map((e) => `<div class="row"><span><b>${esc(e.who)}</b> <span class="meta">${esc(e.kind)} &middot; season ${e.season}</span><div class="meta">${esc(e.text)}</div></span></div>`).join("") : '<div class="meta">No edits yet.</div>'}<p><button class="pri" id="el-ok">Close</button></p>`);
  $("#el-ok").onclick = closeModal;
}
function decorateGod(r, a) {
  if (!STATUS || !STATUS.god) return;
  const h = document.querySelector("#view h1");
  if (!h || (r !== "club" && r !== "nation" && r !== "league")) return;
  h.insertAdjacentHTML("afterend", `<p><button class="gold" id="g-edit">God mode: edit ${r}</button></p>`);
  $("#g-edit").onclick = () => (r === "club" ? godClub(a) : r === "nation" ? godNation(a) : godLeague(a));
}

async function route() {
  document.body.classList.remove("has-compbar");
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const [r, a, b] = parts;
  if (!STATUS) await refreshStatus();
  if (!STATUS.has_world) { renderShell(); return viewStart(); }
  renderShell();
  try {
    await routeInner(r, a, b);
    decorateGod(r, a);
  } catch (e) {
    $("#view").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}
async function routeInner(r, a, b) {
  {
    if (!r || r === "start") return viewStart();
    if (r === "world") return await viewWorld();
    if (r === "continent") return await viewContinent(a);
    if (r === "league") return await viewLeague(a, b ? +b : null);
    if (r === "club") { await viewClub(a); return await clubRivals(a); }
    if (r === "matchup") return await viewMatchup(a, b, (location.hash.split("/")[4] || ""));
    if (r === "rivals") return await viewRivals();
    if (r === "comp") return await viewComp(a);
    if (r === "nations") return await viewNations(a);
    if (r === "nation") return await viewNation(a);
    if (r === "news") return await viewNews();
    if (r === "players") return await viewPlayers();
    if (r === "player") return await viewPlayer(a);
    if (r === "map") { location.replace("#/world"); return; }               // the league map was removed
    if (r === "ceremony") return await viewCeremony(a ? +a : null);
    if (r === "trophies") return a === "winners" ? await viewTrophies(b, "winners") : await viewTrophies(null, a || "winners");
    if (r === "money") return await viewMoney();
    if (r === "ledger") return await viewLedger(a);
    if (r === "records") return await viewRecords();
    location.hash = "#/world";
  }
}
window.addEventListener("hashchange", route);
$("#brand").onclick = () => (location.hash = STATUS && STATUS.has_world ? "#/world" : "#/");
(async () => {
  await SIM.init();
  try { const imp = await SIM.logos.load(); if (imp && imp.clubs) setLogos(imp); } catch (e) { /* no logos stored */ }
  if (!SIM.store.persistent) toast("Browser storage is blocked: saves will last only while this page is open.");
  await refreshStatus();
  if (STATUS.has_world && !location.hash) location.hash = "#/world";
  await route();
})();
