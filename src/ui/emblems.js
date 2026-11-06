"use strict";
/* Trophy emblems: original SVG illustrations in the spirit of real trophies (big-eared cup,
   lidded league cup, globe on a column, golden ball, boot...). Colours come from the server. */
let _eid = 0;
// a competition or league: the imported logo when there is one, else the generated trophy illustration (champion screens and trophy rooms always keep the trophy)
function compEmb(name, spec, size) { return logoBox("comps", name, size) || logoBox("leagues", name, size) || (spec ? emblem(spec, size) : ""); }
function emblem(spec, size) {
  size = size || 48;
  const id = "e" + (++_eid), k = spec.kind, c = spec.color || "#f5c542";
  const defs = `<defs><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#fff2ad"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#b8860b"/></linearGradient>
    <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfd8de"/><stop offset="1" stop-color="#8795a0"/></linearGradient></defs>`;
  const G = `url(#${id}g)`, S = `url(#${id}s)`, DK = "#8a6508";
  const star = (cx, cy, ro, ri) => { let p = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro; p += (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1); } return p + "Z"; };
  let b = "";
  if (k === "cup_eared") {
    b = `<path d="M19 11 C5 9 5 31 24 32" fill="none" stroke="${S}" stroke-width="3.2" stroke-linecap="round"/><path d="M45 11 C59 9 59 31 40 32" fill="none" stroke="${S}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M18 8 H46 C46 24 41 33 36 37 V45 H28 V37 C23 33 18 24 18 8 Z" fill="${S}"/><path d="M18 8 H46" stroke="#fff" stroke-width="2"/>
      <rect x="23" y="45" width="18" height="4" rx="1" fill="${S}"/><rect x="17" y="49" width="30" height="9" rx="2" fill="${c}"/><rect x="26" y="52" width="12" height="3" rx="1" fill="${G}"/>`;
  } else if (k === "league_cup") {
    b = `<circle cx="32" cy="5.5" r="2.8" fill="${G}"/><path d="M19 17 C19 9 45 9 45 17 Z" fill="${G}"/>
      <path d="M18 17 H46 C46 31 41 38 36 40 V46 H28 V40 C23 38 18 31 18 17 Z" fill="${G}"/><path d="M18.6 22 H45.4 L44.6 27 H19.4 Z" fill="${c}"/>
      <path d="M18 19 C8 19 8 34 22 35" fill="none" stroke="${G}" stroke-width="3" stroke-linecap="round"/><path d="M46 19 C56 19 56 34 42 35" fill="none" stroke="${G}" stroke-width="3" stroke-linecap="round"/>
      <rect x="23" y="46" width="18" height="4" rx="1" fill="${G}"/><rect x="16" y="50" width="32" height="8" rx="2" fill="${c}"/>`;
  } else if (k === "world_cup") {
    b = `<circle cx="32" cy="17" r="13" fill="${G}"/><ellipse cx="32" cy="17" rx="6" ry="13" fill="none" stroke="${DK}" stroke-width="1"/><path d="M19 17 H45 M21 10.5 H43 M21 23.5 H43" stroke="${DK}" stroke-width="1" fill="none"/>
      <path d="M23 54 C21 42 28 36 32 31 C36 36 43 42 41 54 Z" fill="${G}"/><path d="M27 50 C30 44 34 42 36 37" stroke="${DK}" stroke-width="1.4" fill="none"/>
      <rect x="20" y="54" width="24" height="5" rx="1.5" fill="#1f9d55"/><rect x="20" y="59" width="24" height="3" rx="1" fill="${G}"/>`;
  } else if (k === "cwc") {
    b = `<path d="M19 11 C5 9 5 31 24 32" fill="none" stroke="${G}" stroke-width="3.2" stroke-linecap="round"/><path d="M45 11 C59 9 59 31 40 32" fill="none" stroke="${G}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M18 8 H46 C46 24 41 33 36 37 V45 H28 V37 C23 33 18 24 18 8 Z" fill="${G}"/><circle cx="32" cy="20" r="6.5" fill="none" stroke="${DK}" stroke-width="1.3"/><path d="M25.5 20 H38.5 M32 13.5 V26.5" stroke="${DK}" stroke-width="1.1"/>
      <rect x="23" y="45" width="18" height="4" rx="1" fill="${G}"/><rect x="17" y="49" width="30" height="9" rx="2" fill="#2b6cb0"/><rect x="26" y="52" width="12" height="3" rx="1" fill="${G}"/>`;
  } else if (k === "ct") {
    b = `<circle cx="32" cy="6" r="3.6" fill="${G}"/><path d="M26 9.6h12l-2 5H28z" fill="${G}"/>
      <path d="M18 18 C6 16 6 36 22 37" fill="none" stroke="${G}" stroke-width="3" stroke-linecap="round"/><path d="M46 18 C58 16 58 36 42 37" fill="none" stroke="${G}" stroke-width="3" stroke-linecap="round"/>
      <path d="M17 15h30C47 30 41 38 36 41V46h-8V41C23 38 17 30 17 15Z" fill="${G}"/><path d="M17.6 21h28.8l-.9 5H18.5Z" fill="${c}"/>
      <rect x="22" y="46" width="20" height="4" rx="1" fill="${G}"/><rect x="15" y="50" width="34" height="8" rx="2" fill="${c}"/><rect x="25" y="52.6" width="14" height="2.8" rx="1" fill="${G}"/>`;
  } else if (k === "nl") {
    b = `<path d="M32 4 L52 10 V28 C52 40 43 47 32 52 C21 47 12 40 12 28 V10 Z" fill="${G}" stroke="${DK}" stroke-width="1.6"/>
      <path d="M32 9 L47 13.5 V27.5 C47 37 40 42.5 32 46.5 C24 42.5 17 37 17 27.5 V13.5 Z" fill="${c}"/><path d="${star(32, 27, 10, 4.2)}" fill="#fff" opacity=".92"/>
      <rect x="24" y="52" width="16" height="4" rx="1" fill="${G}"/><rect x="18" y="56" width="28" height="5" rx="2" fill="#1b1b1b"/>`.replace(/<polygon/, "<polygon");
  } else if (k === "ballon") {
    b = `<circle cx="32" cy="27" r="19" fill="${G}"/><path d="M32 17 L40.5 23.5 L37.3 33.5 H26.7 L23.5 23.5 Z" fill="${DK}" opacity=".6"/>
      <path d="M32 17 V9 M40.5 23.5 L48 20.5 M37.3 33.5 L42 40 M26.7 33.5 L22 40 M23.5 23.5 L16 20.5" stroke="${DK}" stroke-width="1.4" fill="none"/>
      <path d="M18 54 C22 47 42 47 46 54 Z" fill="#2a2a2a"/><rect x="14" y="54" width="36" height="7" rx="2" fill="#1b1b1b"/><rect x="24" y="56" width="16" height="3" rx="1" fill="${G}"/>`;
  } else if (k === "coach") {
    b = `<rect x="9" y="7" width="46" height="35" rx="4" fill="${c}"/><rect x="12" y="10" width="40" height="29" rx="2" fill="#10331f"/>
      <path d="M18 16 l5 5 m0 -5 l-5 5 M41 28 l5 5 m0 -5 l-5 5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="17" r="3" fill="none" stroke="#fff" stroke-width="2"/>
      <path d="M21 31 C28 24 36 25 44 21" stroke="#f5c542" stroke-width="1.8" stroke-dasharray="3 2" fill="none"/>
      <rect x="28" y="42" width="8" height="9" fill="${G}"/><rect x="16" y="51" width="32" height="8" rx="2" fill="${G}"/>`;
  } else if (k === "boot") {
    b = `<path d="M11 12 L26 12 L27 28 C37 29 49 33 55 41 L55 47 L11 47 Z" fill="${G}"/><path d="M11 47 H55 V50 H11 Z" fill="${DK}"/>
      <rect x="15" y="50" width="4" height="4" fill="${DK}"/><rect x="25" y="50" width="4" height="4" fill="${DK}"/><rect x="36" y="50" width="4" height="4" fill="${DK}"/><rect x="47" y="50" width="4" height="4" fill="${DK}"/>
      <path d="M13 18 H25 M13 23 H25.5 M30 32 L38 35" stroke="${DK}" stroke-width="1.6" fill="none"/><rect x="8" y="55" width="48" height="6" rx="2" fill="#1b1b1b"/>`;
  } else if (k === "young") {
    b = `<circle cx="32" cy="29" r="22" fill="none" stroke="${G}" stroke-width="4"/><path d="${star(32, 30, 15, 6.5)}" fill="${c}" stroke="#0d3a20" stroke-width="1.2"/>
      <rect x="22" y="52" width="20" height="4" rx="1" fill="${G}"/><rect x="16" y="56" width="32" height="5" rx="2" fill="#1b1b1b"/>`;
  } else if (k === "team") {
    const dots = [[32, 51], [21, 42], [29, 43], [35, 43], [43, 42], [24, 32], [32, 33], [40, 32], [22, 21], [32, 20], [42, 21]];
    b = `<path d="M32 3 L55 11 V30 C55 45 45 54 32 60 C19 54 9 45 9 30 V11 Z" fill="${G}" stroke="${DK}" stroke-width="2"/>${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#10331f"/>`).join("")}`;
  } else {
    b = `<circle cx="32" cy="32" r="22" fill="${G}"/>`;
  }
  return `<svg class="emb" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${defs}${b}</svg>`;
}
const EMB_BY_SECTION = { boot: { kind: "boot", color: "#f5c542" }, young: { kind: "young", color: "#3ddc84" }, coach: { kind: "coach", color: "#9ad1ff" },
  team: { kind: "team", color: "#ffd166" }, ballon: { kind: "ballon", color: "#f5c542" } };
