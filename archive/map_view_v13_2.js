// Removed in v13.2 (user decision). League map view, kept for reference; needs archive/world.js (WORLD land polygons + proj()).
// ---- league map ---------------------------------------------------------------------------------------
const CONF_COLORS = { UEFA: "#4aa8ff", CONMEBOL: "#3ddc84", CONCACAF: "#ff6b6b", AFC: "#ff9f43", CAF: "#c79bff", OFC: "#35d0c4" };
const CONT_BOX = { "World": [-170, 75, 180, -55], "Europe": [-12, 62, 35, 34], "South America": [-82, 12, -34, -40], "North America": [-130, 52, -62, 14],
  "Asia": [95, 45, 146, 15], "Middle East": [34, 34, 60, 14] };
async function viewMap(focusName) {
  const d = await api("/api/map");
  const lg = Object.fromEntries(d.leagues.map((l) => [l.name, l]));
  const top = proj(0, 80)[1], bot = proj(0, -58)[1];
  const chaikin = (pts, n) => { for (let k = 0; k < n; k++) { const o = []; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }); pts = o; } return pts; };
  const path = (poly) => "M" + chaikin(poly.map(([lo, la]) => proj(lo, la)), 2).map((v) => v.map((x) => x.toFixed(2)).join(" ")).join(" L") + " Z";
  const landD = WORLD.land.map(path).join(" "), waterD = WORLD.water.map(path).join(" ");
  $("#view").innerHTML = `<div class="crumbs"><a href="#/world">World</a> / Map</div><h1>League map</h1>
    <div class="sub">Click a league to zoom in and see its clubs. Scroll to zoom, drag to move.</div>
    <div class="tabs" id="map-tabs">${Object.keys(CONT_BOX).map((k) => `<button data-box="${k}">${k}</button>`).join("")}</div>
    <div class="map-layout"><div class="map-box"><svg id="map" xmlns="http://www.w3.org/2000/svg"><rect id="map-sea" x="-1000" y="-1000" width="3000" height="3000" fill="#0b1c2c"/>
      <path d="${landD}" fill="#1e3a2a" stroke="#2f5a40" stroke-width="0.25" vector-effect="non-scaling-stroke"/><path d="${waterD}" fill="#0b1c2c" stroke="#2f5a40" stroke-width="0.25" vector-effect="non-scaling-stroke"/>
      <g id="map-layer"></g></svg><div id="map-tip" class="map-tip" hidden></div></div>
    <div id="map-panel"></div></div>`;
  const svg = $("#map"), layer = $("#map-layer"), tip = $("#map-tip");
  let vb = [-180, top, 360, bot - top], focus = null, anim = null;
  const ratio = () => { const r = svg.getBoundingClientRect(); return r.width / Math.max(1, r.height); };
  const fitBox = (x0, y0, x1, y1, pad) => {            // projected box -> viewBox with the svg's aspect ratio
    let w = Math.max(6, x1 - x0) * (1 + pad), h = Math.max(4, y1 - y0) * (1 + pad);
    const r = ratio(); if (w / h < r) w = h * r; else h = w / r;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; return [cx - w / 2, cy - h / 2, w, h];
  };
  const boxFor = (b) => { const [lo0, la0, lo1, la1] = b; const a = proj(lo0, la0), c = proj(lo1, la1); return fitBox(a[0], a[1], c[0], c[1], 0.06); };
  const clubBox = (l) => { const ps = l.clubs.map((c) => proj(c.lon, c.lat)); return fitBox(Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1])), 0.28); };
  const centroid = (l) => { const ps = l.clubs.map((c) => proj(c.lon, c.lat)); return [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length]; };
  const setVB = (v) => { vb = v; svg.setAttribute("viewBox", v.join(" ")); draw(); };
  const animateTo = (target) => {
    cancelAnimationFrame(anim); const from = vb.slice(), t0 = performance.now(), dur = 550;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; setVB(from.map((f, i) => f + (target[i] - f) * e)); if (k < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  };
  const px = () => vb[2] / Math.max(1, svg.getBoundingClientRect().width);   // one screen pixel in map units
  function draw() {
    const s = px(); let h = ""; const placed = [];
    const canLabel = (x, y, text, size) => {                  // greedy: skip a label that would overlap one already placed
      const sx = (x - vb[0]) / s, sy = (y - vb[1]) / s, w = text.length * size * 0.56 + 12, hh = size + 3;
      const r = [sx, sy - hh / 2, sx + w, sy + hh / 2];
      if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return false;
      placed.push(r); return true;
    };
    if (focus) {
      const l = lg[focus];
      l.clubs.slice().sort((a, b) => a.pos - b.pos).forEach((c) => { const [x, y] = proj(c.lon, c.lat), rr = (c.pos === 1 ? 7 : 5.5) * s;
        const lab = canLabel(x + 9 * s, y, c.name, 11.5);
        h += `<g class="map-club" data-club="${esc(c.name)}"><circle cx="${x}" cy="${y}" r="${rr}" fill="${ovrColor(c.ovr)}" stroke="${c.pos === 1 ? "#f5c542" : "#06210f"}" stroke-width="${(c.pos === 1 ? 2.2 : 1.2) * s}"/>
          ${lab ? `<text x="${x + 9 * s}" y="${y + 4 * s}" font-size="${11.5 * s}" class="map-label">${esc(c.name)}</text>` : ""}</g>`; });
    } else {
      const showNames = vb[2] < 150;
      d.leagues.slice().sort((a, b) => b.avg - a.avg).forEach((l) => { const [x, y] = centroid(l), r = (7 + Math.max(0, l.avg - 60) * 0.35) * s;
        const lab = showNames && canLabel(x + r + 4 * s, y, l.name, 12);
        h += `<g class="map-league" data-league="${esc(l.name)}"><circle cx="${x}" cy="${y}" r="${r}" fill="${CONF_COLORS[l.confed]}" fill-opacity=".85" stroke="#fff" stroke-width="${1.6 * s}"/>${lab ? `<text x="${x + r + 4 * s}" y="${y + 4 * s}" font-size="${12 * s}" class="map-label">${esc(l.name)}</text>` : ""}</g>`; });
    }
    layer.innerHTML = h;
  }
  function panel() {
    const p = $("#map-panel");
    if (focus) {
      const l = lg[focus], rows = l.clubs.slice().sort((a, b) => a.pos - b.pos).slice(0, 6);
      p.innerHTML = `<div class="card"><h3>${esc(l.name)} <small>${esc(l.confed)}</small></h3><div class="sub">${l.clubs.length} clubs &middot; average OVR ${l.avg} &middot; matchweek ${l.progress.done}/${l.progress.total}</div>
        ${rows.map((c) => `<div class="row"><span>${c.pos}. ${clubLink(c.name)}</span><span class="meta">${c.pts} pts &middot; OVR ${c.ovr}</span></div>`).join("")}
        <p style="margin:12px 0 0"><a href="#/league/${enc(l.name)}"><button class="pri">Open league page</button></a> <button id="map-back">Back to the world</button></p></div>`;
      $("#map-back").onclick = () => unfocus();
    } else {
      const by = {}; d.leagues.forEach((l) => (by[l.confed] = by[l.confed] || []).push(l));
      p.innerHTML = `<div class="card"><h3>Leagues</h3>${Object.entries(by).map(([cf, ls]) => `<div class="lbl" style="margin-top:8px"><span class="dot" style="background:${CONF_COLORS[cf]}"></span>${esc(d.continent_names[cf] || cf)}</div>
        ${ls.map((l) => `<div class="row map-item" data-league="${esc(l.name)}"><span>${esc(l.name)}</span><span class="meta">${l.avg} OVR &middot; ${esc(l.leader)}</span></div>`).join("")}`).join("")}</div>`;
      p.querySelectorAll("[data-league]").forEach((e) => (e.onclick = () => doFocus(e.dataset.league)));
    }
  }
  function doFocus(name) { focus = name; tip.hidden = true; panel(); animateTo(clubBox(lg[name])); location.replace("#/map/" + enc(name)); }
  function unfocus() { focus = null; panel(); animateTo([-180, top, 360, bot - top].length ? fitBox(-170, top, 180, bot, 0) : vb); location.replace("#/map"); }
  // interaction
  layer.addEventListener("click", (e) => { const l = e.target.closest("[data-league]"), c = e.target.closest("[data-club]");
    if (l) doFocus(l.dataset.league); else if (c) location.hash = "#/club/" + enc(c.dataset.club); });
  layer.addEventListener("pointermove", (e) => { const g = e.target.closest("[data-club],[data-league]"); if (!g) { tip.hidden = true; return; }
    let t = ""; if (g.dataset.club) { const c = lg[focus].clubs.find((x) => x.name === g.dataset.club); t = `<b>${esc(c.name)}</b><br>${c.pos}${["st", "nd", "rd"][c.pos - 1] || "th"} &middot; ${c.pts} pts &middot; OVR ${c.ovr}`; }
    else { const l = lg[g.dataset.league]; t = `<b>${esc(l.name)}</b><br>average OVR ${l.avg}<br>leader: ${esc(l.leader)}`; }
    const r = svg.getBoundingClientRect(); tip.innerHTML = t; tip.hidden = false; tip.style.left = Math.min(r.width - 190, e.clientX - r.left + 14) + "px"; tip.style.top = e.clientY - r.top + 14 + "px"; });
  layer.addEventListener("mouseleave", () => (tip.hidden = true));
  svg.addEventListener("wheel", (e) => { e.preventDefault(); cancelAnimationFrame(anim); const r = svg.getBoundingClientRect(), f = e.deltaY < 0 ? 0.8 : 1.25;
    const mx = vb[0] + ((e.clientX - r.left) / r.width) * vb[2], my = vb[1] + ((e.clientY - r.top) / r.height) * vb[3];
    const w = Math.max(3, Math.min(400, vb[2] * f)), h = (vb[3] / vb[2]) * w; setVB([mx - ((mx - vb[0]) / vb[2]) * w, my - ((my - vb[1]) / vb[3]) * h, w, h]); }, { passive: false });
  let drag = null; svg.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, vb: vb.slice(), moved: false }; });
  window.addEventListener("pointermove", (e) => { if (!drag) return; const r = svg.getBoundingClientRect(), dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) { cancelAnimationFrame(anim); setVB([drag.vb[0] - (dx / r.width) * drag.vb[2], drag.vb[1] - (dy / r.height) * drag.vb[3], drag.vb[2], drag.vb[3]]); } });
  window.addEventListener("pointerup", () => (drag = null)); window.addEventListener("pointercancel", () => (drag = null));
  document.querySelectorAll("#map-tabs [data-box]").forEach((b) => (b.onclick = () => { focus = null; panel(); location.replace("#/map"); animateTo(boxFor(CONT_BOX[b.dataset.box])); }));
  viewMap.esc = (e) => { if (e.key === "Escape" && focus) unfocus(); };
  document.addEventListener("keydown", viewMap.esc);
  window.addEventListener("hashchange", () => document.removeEventListener("keydown", viewMap.esc), { once: true });
  setVB(fitBox(-170, top, 180, bot, 0));
  panel();
  if (focusName && lg[focusName]) { focus = focusName; panel(); setVB(clubBox(lg[focusName])); }
}
