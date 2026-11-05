"use strict";
/* National flags drawn as small vector images (emoji flags do not render on Windows) and
   ORIGINAL club crests generated from the club name (real club badges are trademarks, so none are used).
   Flags are simplified: stripes, crosses and symbols are right; detailed coats of arms are approximated. */
const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const H = (...c) => c.map((k, i) => R(0, (i * 40) / c.length, 60, 40 / c.length + 0.3, k)).join("");
const V = (...c) => c.map((k, i) => R((i * 60) / c.length, 0, 60 / c.length + 0.3, 40, k)).join("");
const HW = (...p) => { let y = 0, t = p.reduce((a, b) => a + b[1], 0); return p.map(([k, w]) => { const h = (40 * w) / t, s = R(0, y, 60, h + 0.3, k); y += h; return s; }).join(""); };
const VW = (...p) => { let x = 0, t = p.reduce((a, b) => a + b[1], 0); return p.map(([k, w]) => { const h = (60 * w) / t, s = R(x, 0, h + 0.3, 40, k); x += h; return s; }).join(""); };
const C_ = (x, y, r, c, e = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${e}/>`;
const P_ = (pts, c, e = "") => `<polygon points="${pts}" fill="${c}" ${e}/>`;
const STAR = (cx, cy, r, c, n = 5) => { let p = ""; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * (n === 5 ? 0.382 : 0.5) : r; p += (cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1) + " "; } return `<polygon points="${p}" fill="${c}"/>`; };
const CRES = (cx, cy, r, c, bg, dx) => C_(cx, cy, r, c) + C_(cx + (dx || r * 0.35), cy, r * 0.8, bg);
const NORD = (bg, cr, inn) => R(0, 0, 60, 40, bg) + R(16, 0, 9, 40, cr) + R(0, 15.5, 60, 9, cr) + (inn ? R(18.5, 0, 4, 40, inn) + R(0, 18, 60, 4, inn) : "");
const CROSS = (bg, cr, t) => R(0, 0, 60, 40, bg) + R(30 - t / 2, 0, t, 40, cr) + R(0, 20 - t / 2, 60, t, cr);
const SALT = (bg, cr, t) => R(0, 0, 60, 40, bg) + `<path d="M0 0L60 40M60 0L0 40" stroke="${cr}" stroke-width="${t}"/>`;
const UJ = (x, y, w, h) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="none">` + R(0, 0, 60, 30, "#012169") + '<path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#c8102e" stroke-width="2"/>' + R(25, 0, 10, 30, "#fff") + R(0, 10, 60, 10, "#fff") + R(27, 0, 6, 30, "#c8102e") + R(0, 12, 60, 6, "#c8102e") + "</svg>";
const stripes9 = (a, b) => Array.from({ length: 9 }, (_, i) => R(0, (i * 40) / 9, 60, 40 / 9 + 0.3, i % 2 ? b : a)).join("");
const dots = (cx, cy, r, n, rad, c) => Array.from({ length: n }, (_, i) => STAR(cx + rad * Math.cos((i * 2 * Math.PI) / n - Math.PI / 2), cy + rad * Math.sin((i * 2 * Math.PI) / n - Math.PI / 2), r, c)).join("");
const shield = (x, y, c1, c2) => `<path d="M${x} ${y}h8v6c0 4-4 6-4 7c0-1-4-3-4-7z" fill="${c1}" stroke="${c2}" stroke-width=".8"/>`;

const FLAGS = {
  England: () => CROSS("#fff", "#ce1124", 8),
  Scotland: () => SALT("#0065bd", "#fff", 7),
  Wales: () => H("#fff", "#00b140") + `<path d="M16 28c4-14 12-18 20-14c-3 2-6 3-6 7 4-3 8-1 10 3c-6-3-10 0-12 4c-4 2-9 1-12-0z" fill="#d30731"/>`,
  "Northern Ireland": () => CROSS("#fff", "#d00", 7) + STAR(30, 20, 7, "#fff") + C_(30, 20, 3, "#d00"),
  Ireland: () => V("#169b62", "#fff", "#ff883e"),
  France: () => V("#0055a4", "#fff", "#ef4135"),
  Belgium: () => V("#000", "#fae042", "#ed2939"),
  Netherlands: () => H("#ae1c28", "#fff", "#21468b"),
  Luxembourg: () => H("#ed2939", "#fff", "#00a1de"),
  Spain: () => HW(["#aa151b", 1], ["#f1bf00", 2], ["#aa151b", 1]),
  Portugal: () => VW(["#006600", 2], ["#ff0000", 3]) + C_(24, 20, 6, "#ffe000") + C_(24, 20, 3.4, "#fff"),
  Andorra: () => V("#10069f", "#fedf00", "#d50032"),
  Gibraltar: () => HW(["#fff", 2], ["#da000c", 1]) + R(26, 10, 8, 14, "#da000c") + R(24, 10, 12, 3, "#da000c"),
  Germany: () => H("#000", "#dd0000", "#ffce00"),
  Austria: () => H("#ed2939", "#fff", "#ed2939"),
  Switzerland: () => R(0, 0, 60, 40, "#da291c") + R(26, 8, 8, 24, "#fff") + R(18, 16, 24, 8, "#fff"),
  Liechtenstein: () => H("#002b7f", "#ce1126") + C_(12, 10, 4, "#ffd83d"),
  Czechia: () => H("#fff", "#d7141a") + P_("0,0 30,20 0,40", "#11457e"),
  Slovakia: () => H("#fff", "#0b4ea2", "#ee1c25") + shield(11, 12, "#ee1c25", "#fff") + R(14.2, 14, 1.6, 6, "#fff") + R(12.5, 16, 5, 1.6, "#fff"),
  Hungary: () => H("#ce2939", "#fff", "#477050"),
  Poland: () => H("#fff", "#dc143c"),
  Denmark: () => NORD("#c8102e", "#fff"),
  Sweden: () => NORD("#006aa7", "#fecc02"),
  Norway: () => NORD("#ba0c2f", "#fff", "#00205b"),
  Finland: () => NORD("#fff", "#003580"),
  Iceland: () => NORD("#02529c", "#fff", "#dc1e35"),
  Estonia: () => H("#0072ce", "#000", "#fff"),
  Latvia: () => HW(["#9e3039", 2], ["#fff", 1], ["#9e3039", 2]),
  Lithuania: () => H("#fdb913", "#006a44", "#c1272d"),
  "Faroe Islands": () => NORD("#fff", "#0065bd", "#ef303e"),
  Serbia: () => H("#c6363c", "#0c4076", "#fff") + shield(10, 10, "#c6363c", "#fff"),
  Croatia: () => H("#f00", "#fff", "#0093dd") + R(25, 14, 10, 12, "#f00") + R(25, 14, 2.5, 2.4, "#fff") + R(30, 14, 2.5, 2.4, "#fff") + R(27.5, 16.4, 2.5, 2.4, "#fff") + R(32.5, 16.4, 2.5, 2.4, "#fff") + R(25, 19, 2.5, 2.4, "#fff") + R(30, 19, 2.5, 2.4, "#fff"),
  Slovenia: () => H("#fff", "#005da4", "#ed1c24") + shield(9, 8, "#005da4", "#fff"),
  "Bosnia and Herzegovina": () => R(0, 0, 60, 40, "#002395") + P_("17,0 46,0 46,40", "#fecb00") + [[14, 4], [18, 9], [22, 14], [26, 19], [30, 24], [34, 29], [38, 34]].map(([x, y]) => STAR(x, y, 2.6, "#fff")).join("") + R(0, 0, 0, 0, "#000"),
  Montenegro: () => R(0, 0, 60, 40, "#d4af37") + R(2, 2, 56, 36, "#c40308") + C_(30, 20, 7, "#d4af37"),
  "North Macedonia": () => R(0, 0, 60, 40, "#d20000") + C_(30, 20, 7, "#ffe600") + [0, 45, 90, 135].map((a) => `<path d="M30 20L${(30 + 70 * Math.cos(((a - 90) * Math.PI) / 180)).toFixed(1)} ${(20 + 70 * Math.sin(((a - 90) * Math.PI) / 180)).toFixed(1)}L${(30 + 70 * Math.cos(((a - 82) * Math.PI) / 180)).toFixed(1)} ${(20 + 70 * Math.sin(((a - 82) * Math.PI) / 180)).toFixed(1)}Z" fill="#ffe600"/>`).join(""),
  Albania: () => R(0, 0, 60, 40, "#e41e20") + `<path d="M30 9l4 5 6-3-2 7 6 2-6 4 4 8-7-3-5 5-5-5-7 3 4-8-6-4 6-2-2-7 6 3z" fill="#000"/>`,
  Kosovo: () => R(0, 0, 60, 40, "#244aa5") + `<path d="M20 26l6-9 6-1 6-4 3 5-6 5-4 6z" fill="#d0a650"/>` + [0, 1, 2, 3, 4, 5].map((i) => STAR(14 + i * 6.4, 9 - Math.abs(2.5 - i) * 0.0, 2, "#fff")).join(""),
  Romania: () => V("#002b7f", "#fcd116", "#ce1126"),
  Bulgaria: () => H("#fff", "#00966e", "#d62612"),
  Greece: () => stripes9("#0d5eaf", "#fff") + R(0, 0, 22.2, 22.4, "#0d5eaf") + R(9, 0, 4.4, 22.4, "#fff") + R(0, 9, 22.2, 4.4, "#fff"),
  Italy: () => V("#009246", "#fff", "#ce2b37"),
  Malta: () => V("#fff", "#cf142b") + R(3, 3, 7, 7, "#9aa0a6"),
  "San Marino": () => H("#fff", "#5eb6e4") + C_(30, 20, 4, "#e8c76f"),
  Cyprus: () => R(0, 0, 60, 40, "#fff") + `<ellipse cx="30" cy="16" rx="12" ry="6" fill="#d57800"/><path d="M20 28q10 7 20 0" stroke="#4e9a2f" stroke-width="2" fill="none"/>`,
  Turkey: () => R(0, 0, 60, 40, "#e30a17") + CRES(24, 20, 10, "#fff", "#e30a17", 3.2) + STAR(36, 20, 4.2, "#fff"),
  Georgia: () => CROSS("#fff", "#f00", 6) + [[15, 10], [45, 10], [15, 30], [45, 30]].map(([x, y]) => R(x - 1.2, y - 3.6, 2.4, 7.2, "#f00") + R(x - 3.6, y - 1.2, 7.2, 2.4, "#f00")).join(""),
  Armenia: () => H("#d90012", "#0033a0", "#f2a800"),
  Azerbaijan: () => H("#00b5e2", "#ef3340", "#509e2f") + CRES(28, 20, 5.2, "#fff", "#ef3340", 1.5) + STAR(35, 20, 2.6, "#fff", 8),
  Israel: () => R(0, 0, 60, 40, "#fff") + R(0, 4, 60, 5, "#0038b8") + R(0, 31, 60, 5, "#0038b8") + P_("30,12 37,25 23,25", "none", 'stroke="#0038b8" stroke-width="1.6"') + P_("30,28 37,15 23,15", "none", 'stroke="#0038b8" stroke-width="1.6"'),
  Kazakhstan: () => R(0, 0, 60, 40, "#00afca") + C_(32, 17, 6, "#fec50c") + `<path d="M22 28q10 6 20 0" stroke="#fec50c" stroke-width="2" fill="none"/>`,
  Ukraine: () => H("#0057b7", "#ffd700"),
  Russia: () => H("#fff", "#0039a6", "#d52b1e"),
  Belarus: () => HW(["#c8313e", 2], ["#4aa657", 1]) + R(0, 0, 7, 40, "#fff") + [4, 12, 20, 28, 36].map((y) => P_(`3.5,${y - 3} 6,${y} 3.5,${y + 3} 1,${y}`, "#c8313e")).join(""),
  Moldova: () => V("#0046ae", "#ffd200", "#cc092f") + C_(30, 20, 5, "#9a5b2b"),
  Brazil: () => R(0, 0, 60, 40, "#009b3a") + P_("30,4 56,20 30,36 4,20", "#fedf00") + C_(30, 20, 9, "#002776") + `<path d="M21.5 17q9-3 17 3" stroke="#fff" stroke-width="1.6" fill="none"/>`,
  Argentina: () => H("#74acdf", "#fff", "#74acdf") + C_(30, 20, 4, "#f6b40e"),
  Uruguay: () => stripes9("#fff", "#0038a8") + R(0, 0, 24, 22.4, "#fff") + C_(12, 11, 5, "#fcd116"),
  Paraguay: () => H("#d52b1e", "#fff", "#0038a8") + C_(30, 20, 5, "none", 'stroke="#2b7a2b" stroke-width="1.4"'),
  Chile: () => HW(["#fff", 1], ["#d52b1e", 1]) + R(0, 0, 20, 20, "#0039a6") + STAR(10, 10, 6, "#fff"),
  Bolivia: () => H("#d52b1e", "#f9e300", "#007934"),
  Colombia: () => HW(["#fcd116", 2], ["#003893", 1], ["#ce1126", 1]),
  Ecuador: () => HW(["#ffdd00", 2], ["#034ea2", 1], ["#ed1c24", 1]) + C_(30, 20, 4, "#8a6d3b"),
  Peru: () => V("#d91023", "#fff", "#d91023"),
  Venezuela: () => H("#ffcc00", "#00247d", "#cf142b") + dots(30, 36, 2, 8, 12, "#fff").slice(0, 0) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => STAR(30 + 11 * Math.cos(Math.PI + (i * Math.PI) / 7 * 1), 24 - 7 * Math.sin((i * Math.PI) / 7), 1.7, "#fff")).join(""),
  USA: () => Array.from({ length: 13 }, (_, i) => R(0, (i * 40) / 13, 60, 40 / 13 + 0.2, i % 2 ? "#fff" : "#b22234")).join("") + R(0, 0, 26, 21.5, "#3c3b6e") + [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5].map((c) => C_(3 + c * 4.1 + (r % 2) * 2, 3 + r * 3.8, 0.9, "#fff")).join("")).join(""),
  Mexico: () => V("#006847", "#fff", "#ce1126") + C_(30, 20, 5, "#9a6b2f"),
  Canada: () => VW(["#d52b1e", 1], ["#fff", 2], ["#d52b1e", 1]) + P_("30,6 32,12 37,10 35,17 39,18 33,22 34,27 30,25 26,27 27,22 21,18 25,17 23,10 28,12", "#d52b1e"),
  "Costa Rica": () => HW(["#002b7f", 1], ["#fff", 1], ["#ce1126", 2], ["#fff", 1], ["#002b7f", 1]),
  Panama: () => R(0, 0, 30, 20, "#fff") + R(30, 0, 30, 20, "#d21034") + R(0, 20, 30, 20, "#005293") + R(30, 20, 30, 20, "#fff") + STAR(15, 10, 5, "#005293") + STAR(45, 30, 5, "#d21034"),
  Honduras: () => H("#0073cf", "#fff", "#0073cf") + [[24, 20], [36, 20], [30, 17], [24, 23], [36, 23]].map(([x, y]) => STAR(x, y, 2.4, "#0073cf")).join(""),
  "El Salvador": () => H("#0f47af", "#fff", "#0f47af") + C_(30, 20, 4, "#caa84a"),
  Guatemala: () => V("#4997d0", "#fff", "#4997d0") + C_(30, 20, 5, "#4e8a3c"),
  Jamaica: () => R(0, 0, 60, 40, "#000") + P_("0,0 60,0 30,20", "#009b3a") + P_("0,40 60,40 30,20", "#009b3a") + `<path d="M0 0L60 40M60 0L0 40" stroke="#fed100" stroke-width="5"/>`,
  Haiti: () => H("#00209f", "#d21034") + R(22, 14, 16, 12, "#fff"),
  "Trinidad and Tobago": () => R(0, 0, 60, 40, "#ce1126") + `<path d="M0 0L16 0L60 34L60 40L44 40L0 6Z" fill="#fff"/><path d="M4 0L12 0L60 36L60 40L52 40L0 4Z" fill="#000"/>`,
  "Curaçao": () => R(0, 0, 60, 40, "#002b7f") + R(0, 26, 60, 5, "#f9e814") + STAR(10, 9, 3.5, "#fff") + STAR(18, 14, 5, "#fff"),
  Morocco: () => R(0, 0, 60, 40, "#c1272d") + `<path d="M30 11l3 9-8-5.6h10l-8 5.6z" fill="none" stroke="#006233" stroke-width="1.6"/>`,
  Algeria: () => V("#006233", "#fff") + CRES(31, 20, 8, "#d21034", "#fff", 2.2) + STAR(33, 20, 3, "#d21034"),
  Tunisia: () => R(0, 0, 60, 40, "#e70013") + C_(30, 20, 10, "#fff") + CRES(30, 20, 6, "#e70013", "#fff", 1.8) + STAR(31, 20, 2.6, "#e70013"),
  Egypt: () => H("#ce1126", "#fff", "#000") + C_(30, 20, 3.5, "#c09300"),
  Senegal: () => V("#00853f", "#fdef42", "#e31b23") + STAR(30, 20, 6, "#00853f"),
  Nigeria: () => V("#008751", "#fff", "#008751"),
  "Ivory Coast": () => V("#f77f00", "#fff", "#009e60"),
  Ghana: () => H("#ce1126", "#fcd116", "#006b3f") + STAR(30, 20, 6, "#000"),
  Mali: () => V("#14b53a", "#fcd116", "#ce1126"),
  "Burkina Faso": () => H("#ef2b2d", "#009e49") + STAR(30, 20, 6.5, "#fcd116"),
  "Cape Verde": () => R(0, 0, 60, 40, "#003893") + R(0, 22, 60, 3, "#fff") + R(0, 25, 60, 3, "#cf2027") + R(0, 28, 60, 3, "#fff") + dots(21, 25, 1.4, 10, 11, "#f7d116"),
  Guinea: () => V("#ce1126", "#fcd116", "#009460"),
  Cameroon: () => V("#007a5e", "#ce1126", "#fcd116") + STAR(30, 20, 5.5, "#fcd116"),
  "DR Congo": () => R(0, 0, 60, 40, "#007fff") + `<path d="M0 33L50 0L60 0L60 7L10 40L0 40Z" fill="#f7d618"/><path d="M2 36L52 3L57 3L57 6L8 38Z" fill="#ce1021"/>` + STAR(11, 9, 6, "#f7d618"),
  Gabon: () => H("#009e60", "#fcd116", "#3a75c4"),
  "South Africa": () => HW(["#de3831", 1], ["#002395", 1]) + P_("0,0 22,20 0,40", "#000", 'stroke="#ffb612" stroke-width="1.2"') + `<path d="M0 0L24 17L60 17M0 40L24 23L60 23M24 17L24 23" stroke="#fff" stroke-width="9" fill="none"/><path d="M0 0L26 17.5L60 17.5M0 40L26 22.5L60 22.5" stroke="#007a4d" stroke-width="5.4" fill="none"/>` + R(26, 17.5, 34, 5, "#007a4d") + P_("0,6 14,20 0,34", "#000"),
  Zambia: () => R(0, 0, 60, 40, "#198a00") + R(42, 20, 5, 20, "#de2010") + R(47, 20, 6, 20, "#000") + R(53, 20, 7, 20, "#ef7d00") + `<path d="M40 10q6-6 12 0q-4 1-6 4q-2-3-6-4z" fill="#ef7d00"/>`,
  Japan: () => R(0, 0, 60, 40, "#fff") + C_(30, 20, 11, "#bc002d"),
  "South Korea": () => R(0, 0, 60, 40, "#fff") + `<path d="M19 20a11 11 0 0 1 22 0z" fill="#cd2e3a"/><path d="M19 20a11 11 0 0 0 22 0z" fill="#0047a0"/>` + R(6, 6, 8, 1.6, "#000") + R(6, 9, 8, 1.6, "#000") + R(6, 12, 8, 1.6, "#000") + R(46, 28, 8, 1.6, "#000") + R(46, 31, 8, 1.6, "#000") + R(46, 34, 8, 1.6, "#000"),
  China: () => R(0, 0, 60, 40, "#de2910") + STAR(10, 10, 6, "#ffde00") + [[20, 4], [24, 8], [24, 14], [20, 18]].map(([x, y]) => STAR(x, y, 2, "#ffde00")).join(""),
  Indonesia: () => H("#e70011", "#fff"),
  Australia: () => R(0, 0, 60, 40, "#00008b") + UJ(0, 0, 30, 20) + STAR(15, 31, 5, "#fff", 7) + STAR(44, 30, 2.6, "#fff") + STAR(50, 18, 2.6, "#fff") + STAR(38, 14, 2.6, "#fff") + STAR(46, 8, 2.6, "#fff"),
  "Saudi Arabia": () => R(0, 0, 60, 40, "#006c35") + R(14, 13, 32, 3, "#fff") + R(16, 28, 28, 2.4, "#fff"),
  Qatar: () => R(0, 0, 60, 40, "#8a1538") + `<path d="M0 0H22L16 3.6L22 7.2L16 10.8L22 14.4L16 18L22 21.6L16 25.2L22 28.8L16 32.4L22 36L16 40H0Z" fill="#fff"/>`,
  "United Arab Emirates": () => H("#00732f", "#fff", "#000") + R(0, 0, 15, 40, "#ff0000"),
  Oman: () => H("#fff", "#db161b", "#008000") + R(0, 0, 18, 40, "#db161b") + R(6, 6, 6, 6, "#fff"),
  Bahrain: () => R(0, 0, 60, 40, "#ce1126") + `<path d="M0 0H20L28 4L20 8L28 12L20 16L28 20L20 24L28 28L20 32L28 36L20 40H0Z" fill="#fff"/>`,
  Iraq: () => H("#ce1126", "#fff", "#000") + R(22, 17, 16, 6, "#007a3d"),
  Jordan: () => H("#000", "#fff", "#007a3d") + P_("0,0 28,20 0,40", "#ce1126") + STAR(9, 20, 3.6, "#fff", 7),
  Iran: () => H("#239f40", "#fff", "#da0000") + C_(30, 20, 4, "none", 'stroke="#da0000" stroke-width="2"'),
  Uzbekistan: () => HW(["#0099b5", 12], ["#ce1126", 1], ["#fff", 11], ["#ce1126", 1], ["#1eb53a", 12]) + CRES(9, 7, 4.4, "#fff", "#0099b5", 1.6) + [[17, 3], [21, 3], [25, 3], [19, 7], [23, 7], [21, 11]].map(([x, y]) => STAR(x, y, 1.6, "#fff")).join(""),
  "New Zealand": () => R(0, 0, 60, 40, "#00247d") + UJ(0, 0, 30, 20) + [[44, 8], [50, 18], [44, 30], [38, 18]].map(([x, y]) => STAR(x, y, 3, "#cc142b") + "").join(""),
  "New Caledonia": () => H("#0035ad", "#ed1c24", "#009543") + C_(22, 20, 9, "#fae600", 'stroke="#000" stroke-width="1.2"'),
};

const _fl = {};
function flag(nat, w) {
  w = w || 20;
  const f = FLAGS[nat];
  const h = Math.round((w * 2) / 3);
  if (!f) return `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 60 40"><rect width="60" height="40" fill="#34503f"/></svg>`;
  if (!_fl[nat]) { try { _fl[nat] = f(); } catch (e) { _fl[nat] = R(0, 0, 60, 40, "#34503f"); } }
  return `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 60 40" role="img" aria-label="${nat}"><title>${nat}</title>${_fl[nat]}<rect width="60" height="40" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>`;
}

/* original club crests: shield + colours + initials, deterministic from the club name */
function _hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function initials(name) {
  const w = name.replace(/[.']/g, "").split(/[\s-]+/).filter((x) => x && !/^(FC|CF|SC|AC|AS|SS|SV|CD|RC|FK|BK|IF|1\.|SK|SL|KV|US|UD|AFC|de|la|of|and)$/i.test(x));
  const base = w.length ? w : name.split(/\s+/);
  return (base.length > 1 ? base.slice(0, 3).map((x) => x[0]).join("") : base[0].slice(0, 3)).toUpperCase();
}
const _cr = {};
// personal build only: window.__LOGOS maps a club name to a base64 WebP. Each image becomes one blob URL that every crest then shares.
const _lg = {};
function _logoUrl(name) {
  if (name in _lg) return _lg[name];
  let u = null; const b64 = window.__LOGOS && window.__LOGOS[name];
  if (b64 && b64.startsWith("data:")) u = b64;                                     // an imported logo is already a data URL
  else if (b64 && window.__KIND === "artifact") u = "data:image/webp;base64," + b64;     // the hosted page may not allow blob: images
  else if (b64) { try { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); u = URL.createObjectURL(new Blob([a], { type: "image/webp" })); } catch (e) { u = "data:image/webp;base64," + b64; } }
  return (_lg[name] = u);
}
// logos: the baked-in set (personal builds) plus whatever the player imported. imp = { clubs: { name: dataUrl } } or null to drop the imported ones.
let _logoBase = null;
function setLogos(imp) {
  if (_logoBase === null) _logoBase = window.__LOGOS || {};
  for (const k in _lg) delete _lg[k];
  const m = Object.assign({}, _logoBase, imp && imp.clubs ? imp.clubs : {});
  window.__LOGOS = Object.keys(m).length ? m : undefined;
}
function crest(name, size) {
  size = size || 18;
  const lu = window.__LOGOS ? _logoUrl(name) : null;
  if (lu) return `<img class="crest" src="${lu}" width="${size}" height="${size}" alt="" decoding="async">`;
  if (!_cr[name]) {
    const h = _hash(name), h1 = h % 360, h2 = (h1 + 40 + ((h >> 9) % 140)) % 360, pat = (h >> 5) % 5;
    const a = `hsl(${h1} 62% 42%)`, b = `hsl(${h2} 70% 62%)`, txt = (h2 > 40 && h2 < 200) ? "#0b2418" : "#fff";
    const S = "M4 3h24v13c0 8-6 12-12 14C10 28 4 24 4 16z";
    let fill = "";
    if (pat === 0) fill = R(4, 3, 24, 28, a) + R(4, 3, 12, 28, b);
    else if (pat === 1) fill = R(4, 3, 24, 28, a) + R(4, 12, 24, 8, b);
    else if (pat === 2) fill = R(4, 3, 24, 28, a) + P_("4,3 28,3 28,12 16,18 4,12", b);
    else if (pat === 3) fill = R(4, 3, 24, 28, a) + [0, 1, 2].map((i) => R(4 + i * 8, 3, 4, 28, b)).join("");
    else fill = R(4, 3, 24, 28, b) + P_("4,31 4,14 16,3 28,14 28,31", a);
    const ini = initials(name), fs = ini.length > 2 ? 9 : 11;
    _cr[name] = `<defs><clipPath id="c${h}"><path d="${S}"/></clipPath></defs><g clip-path="url(#c${h})">${fill}</g><path d="${S}" fill="none" stroke="#06210f" stroke-width="1.6"/><text x="16" y="21.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${fs}" fill="${txt}" stroke="rgba(0,0,0,.45)" stroke-width=".5" paint-order="stroke">${ini}</text>`;
  }
  return `<svg class="crest" width="${size}" height="${Math.round(size * 1.0)}" viewBox="0 0 32 32" aria-hidden="true">${_cr[name]}</svg>`;
}
