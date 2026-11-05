// order independence: same world, competitions simulated in different orders, must end identical
const fs=require("fs"),vm=require("vm");const D=__dirname+"/../data/";
globalThis.__DATA={};for(const k of["leagues","nations","clubs_geo","rivalries","rivalries_nat"])__DATA[k]=fs.readFileSync(D+k+".json","utf8");globalThis.require=require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js","utf8")+"\n;globalThis.__B={mods:$mods,$new,$kw,$round};");
const {mods,$new,$kw}=globalThis.__B, S=mods.sim_core;
const mk=(seed)=>$new(S.World,[$new(S.Settings,[$kw({label:"game"})]),seed]);
function digest(w){ const r=(x)=>typeof x==="number"?Math.round(x*1e4)/1e4:x; const o={s:w.season,
 p:w.players.map(p=>[p.name,p.age,p.ovr,p.club,r(p.wage)]).sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:1),
 c:w.clubs.itemsArr().map(([n,c])=>[n,r(c.get_("ovr")),r(c.get_("funds"))]).sort(),
 t:w.transfers.map(t=>[t.get_("player"),t.get_("frm"),t.get_("to"),t.get_("why")]),
 rv:Object.keys(w.rv.pairs).sort().map(k=>[k,w.rv.pairs[k].r,w.rv.pairs[k].heat,w.rv.pairs[k].name])};
 let h=0; const s=JSON.stringify(o); for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
for (const seed of [1,2]) {
  const A=mk(seed), B=mk(seed), C=mk(seed);
  for (let y=0;y<4;y++) {
    A.finish_season();
    const ids=[...B.comps.keysArr()].sort().reverse();           // reverse alphabetical, one competition at a time
    for (const id of ids) { try { B.sim_with_prereqs(id); } catch(e){ } }
    while (B.step()) {}
    B.rollover();
    // C: play some league games one at a time, last fixture first, then finish normally
    for (const [id,c] of C.comps.itemsArr()) if (c.kind==="league") { for (let k=0;k<3;k++){ const u=c.unplayed(); if(!u.length) break; c.play_fixture(u[u.length-1][0],u[u.length-1][1]); } }
    C.finish_season();
  }
  console.log("seed",seed,"A",digest(A),"B",digest(B),digest(A)===digest(B)?"SAME":"DIFFERENT", "C", digest(C), digest(A)===digest(C)?"SAME":"DIFFERENT");
}
