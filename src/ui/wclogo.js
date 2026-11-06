"use strict";
/* Generated World Cup banner. The game draws it for the World Cup when no World Cup logo was imported: each edition gets the host nation and its own four digit year.
   wcLogo(host, year, {style:"poster"|"roundel", w}) builds an ORIGINAL logo: one simple trophy, the host's flag colours, the host's name and the year.
   Nothing here is a real FIFA mark. hostPalette(nation) reads the colours from the game's own flag drawing. */
let _wcid = 0;
function _hex(c) { c = c.replace("#", ""); if (c.length === 3) c = c.replace(/./g, "$&$&"); return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16)); }
function _rgb(a) { return "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
const _lum = (a) => (0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]) / 255;
const _mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const _dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// the three main colours of a nation's flag, biggest area first. Whites and blacks only fill in when the flag has fewer than three colours.
function hostPalette(nation) {
  const svg = (typeof FLAGS === "object" && FLAGS[nation]) ? FLAGS[nation]() : "";
  const w = {};
  const add = (c, a) => { if (!/^#[0-9a-f]{3,6}$/i.test(c)) return; const k = _rgb(_hex(c)); w[k] = (w[k] || 0) + a; };
  for (const m of svg.matchAll(/<rect[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"[^>]*?fill="(#[0-9a-fA-F]+)"/g)) add(m[3], m[1] * m[2]);
  for (const m of svg.matchAll(/<circle[^>]*?r="([\d.]+)"[^>]*?fill="(#[0-9a-fA-F]+)"/g)) add(m[2], Math.PI * m[1] * m[1]);
  for (const m of svg.matchAll(/<polygon[^>]*?fill="(#[0-9a-fA-F]+)"/g)) add(m[1], 260);
  for (const m of svg.matchAll(/<path[^>]*?fill="(#[0-9a-fA-F]+)"/g)) add(m[1], 120);
  const all = Object.entries(w).sort((a, b) => b[1] - a[1]).map(([k]) => _hex(k));
  const sat = (a) => Math.max(...a) - Math.min(...a);
  const pick = [];
  for (const c of all) if (sat(c) > 60 && _lum(c) > 0.06 && pick.every((p) => _dist(p, c) > 90)) pick.push(c);
  for (const c of all) if (pick.length < 3 && pick.every((p) => _dist(p, c) > 90)) pick.push(c);
  if (!pick.length) return ["#1d6b3a", "#f5c542", "#ffffff"];       // a nation without a drawn flag
  while (pick.length < 3) pick.push(pick.length === 1 ? _mix(pick[0], [255, 255, 255], 0.75) : _mix(pick[0], [0, 0, 0], 0.5));
  return pick.slice(0, 3).map(_rgb);
}
// the one trophy: a globe held by a flaring column on a banded base. 100 x 160 box.
function _trophy(id, band) {
  return `<defs><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#fff2ad"/><stop offset=".45" stop-color="#f5c542"/><stop offset="1" stop-color="#a87708"/></linearGradient></defs>
  <path d="M33 56C20 74 34 90 41 106c4 10 0 16-7 24h32c-7-8-11-14-7-24 7-16 21-32 8-50-8 5-18 7-17 7s-9-2-17-7z" fill="url(#${id}g)"/>
  <circle cx="50" cy="36" r="27" fill="url(#${id}g)"/><path d="M30 28c4-9 13-14 22-13" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M24 38c9 6 43 6 52 0" stroke="#8a6508" stroke-opacity=".45" stroke-width="1.6" fill="none"/>
  <rect x="26" y="130" width="48" height="9" rx="2" fill="url(#${id}g)"/><rect x="26" y="139" width="48" height="6" rx="2" fill="${band}"/>`;
}
function wcLogo(host, year, o) {
  o = o || {}; const style = o.style || "poster", id = "wl" + (++_wcid), pal = o.palette || hostPalette(host), w = o.w || 240;
  const sat = (a) => Math.max(...a) - Math.min(...a), cand = pal.map(_hex).filter((a) => sat(a) > 60), bgc = cand.length ? cand.reduce((a, b) => (_lum(b) < _lum(a) ? b : a)) : _hex(pal[0]);
  const p1 = _hex(pal[0]), p2 = pal[1], p3 = pal[2], bg1 = _rgb(_lum(bgc) > 0.5 ? _mix(bgc, [0, 0, 0], 0.4) : _mix(bgc, [0, 0, 0], 0.1)), bg0 = _rgb(_mix(_hex(bg1), [0, 0, 0], 0.5));
  const name = String(host).toUpperCase(), fs = name.length > 14 ? 17 : name.length > 10 ? 20 : 24;
  if (style === "roundel") {
    const ink = _lum(p1) > 0.6 ? "#111" : "#fff";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" width="${w}" height="${w}" role="img" aria-label="World Cup ${esc(host)} ${year}">
      <defs><radialGradient id="${id}b" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg0}"/></radialGradient>
        <path id="${id}t" d="M38 130a92 92 0 0 1 184 0"/><path id="${id}u" d="M26 130a104 104 0 0 0 208 0"/></defs>
      <circle cx="130" cy="130" r="124" fill="url(#${id}b)" stroke="${pal[0]}" stroke-width="10"/><circle cx="130" cy="130" r="113" fill="none" stroke="${p2}" stroke-width="2.5"/>
      <text font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="15" letter-spacing="5" fill="#fff" text-anchor="middle"><textPath href="#${id}t" startOffset="50%">WORLD CUP</textPath></text>
      <g transform="translate(97 46) scale(.64)">${_trophy(id, p2)}</g>
      <rect x="62" y="158" width="136" height="36" rx="6" fill="${pal[0]}" stroke="${p3}" stroke-width="2.5"/>
      <text x="130" y="185" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="27" letter-spacing="3" fill="${ink}" text-anchor="middle">${year}</text>
      <text font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${name.length > 11 ? 12 : 14}" letter-spacing="${name.length > 11 ? 2 : 4}" fill="#f5c542" text-anchor="middle"><textPath href="#${id}u" startOffset="50%">${esc(name)}</textPath></text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width="${w}" height="${w * 320 / 240}" role="img" aria-label="World Cup ${esc(host)} ${year}">
    <defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg0}"/></linearGradient><clipPath id="${id}c"><rect width="240" height="320" rx="20"/></clipPath></defs>
    <g clip-path="url(#${id}c)"><rect width="240" height="320" fill="url(#${id}b)"/>
      <circle cx="120" cy="128" r="92" fill="none" stroke="${p2}" stroke-opacity=".55" stroke-width="3"/><circle cx="120" cy="128" r="104" fill="none" stroke="${p3}" stroke-opacity=".3" stroke-width="1.5"/>
      <text x="120" y="34" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="15" letter-spacing="6" fill="#fff" fill-opacity=".92" text-anchor="middle">WORLD CUP</text>
      <g transform="translate(62 48) scale(1.15)">${_trophy(id, p2)}</g>
      <text x="120" y="244" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${fs}" letter-spacing="3" fill="#fff" text-anchor="middle">${esc(name)}</text>
      <text x="120" y="284" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="40" letter-spacing="2" fill="#f5c542" text-anchor="middle">${year}</text>
      <rect y="296" width="240" height="8" fill="${pal[0]}"/><rect y="304" width="240" height="8" fill="${p2}"/><rect y="312" width="240" height="8" fill="${p3}"/></g></svg>`;
}
