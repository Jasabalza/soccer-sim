// Order independence for single-game sims in tournaments: whole-season sim (A) vs random one-game-at-a-time order (B)
// vs partly one-at-a-time then the rest in bulk (C). Every game must come out the same whatever the order.
const fs=require("fs"),vm=require("vm");const D=__dirname+"/../data/";
globalThis.__DATA={};for(const k of["leagues","nations","clubs_geo","rivalries","rivalries_nat"])__DATA[k]=fs.readFileSync(D+k+".json","utf8");globalThis.require=require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js","utf8")+"\n;globalThis.__B={mods:$mods,$new,$kw,$plain};");
const {mods,$new,$kw,$plain}=globalThis.__B, S=mods.sim_core;
const YEARS=+process.argv[3]||5;
const mk=(seed)=>$new(S.World,[$new(S.Settings,[$kw({label:"game"})]),seed]);
function digest(w){ const r=(x)=>typeof x==="number"?Math.round(x*1e4)/1e4:x;
 const o={s:w.season, hist:$plain(w.hist), news:$plain(w.news_log).map(x=>JSON.stringify(x)).sort(), finals:(()=>{const f=$plain(w.finals);return (Array.isArray(f)?f:Object.entries(f)).map(x=>JSON.stringify(x)).sort();})(),
  p:w.players.map(p=>[p.name,p.age,p.ovr,p.club,r(p.wage)]).sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:1),
  c:w.clubs.itemsArr().map(([n,c])=>[n,r(c.get_("ovr")),r(c.get_("funds"))]).sort(),
  t:w.transfers.map(t=>[t.get_("player"),t.get_("frm"),t.get_("to"),t.get_("why")]),
  rv:Object.keys(w.rv.pairs).sort().map(k=>[k,w.rv.pairs[k].r,w.rv.pairs[k].heat,w.rv.pairs[k].name])};
 let h=0; const s=JSON.stringify(o); for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
let sd=12345; const rnd=()=>{ sd=(sd*1103515245+12345)&0x7fffffff; return sd/0x7fffffff; };
const pick=(a)=>a[Math.floor(rnd()*a.length)];
// play games one at a time in random order. `limit` = stop after that many games (null = until the season is done)
function oneByOne(w, limit){
  let n=0, stuck=false;
  while(!stuck && (limit==null||n<limit)){
    stuck=true;
    const cs=w.comps.itemsArr().map(x=>x[1]).filter(c=>c.has_event(w.season)&&!w.missing(c).length);
    if(!cs.length) break;
    const c=pick(cs);
    if(c.kind==="league"){ const u=c.unplayed(); if(u.length){ const f=pick(u); c.play_fixture(f[0],f[1]); n++; stuck=false; } else { c.play_next(); stuck=false; } continue; }
    c.ensure_prepared();
    const gs=c.unplayed_games();
    if(gs.length){ c.play_game(pick(gs).key); n++; stuck=false; }
    else if(!c.pg||!Object.keys(c.pg).length){ c.play_next(); stuck=false; }     // an event with no games in it
    else stuck=false;
  }
  return n;
}
for (const seed of (process.argv[2]||"1,2").split(",").map(Number)) {
  const A=mk(seed), B=mk(seed), C=mk(seed); let games=0;
  for (let y=0;y<YEARS;y++) {
    A.finish_season();
    games+=oneByOne(B,null); B.rollover();
    if (process.env.DBG) {
      const ha=$plain(A.hist), hb=$plain(B.hist);
      for(let i=0;i<ha.length;i++) for(const k of Object.keys(ha[i])) if(JSON.stringify(ha[i][k])!==JSON.stringify(hb[i][k])) console.log(" season",y+1,"rec",i,k,JSON.stringify(ha[i][k]).slice(0,150),"|||",JSON.stringify(hb[i][k]).slice(0,150));
      const fa=$plain(A.finals), fb=$plain(B.finals); const ka=JSON.stringify(fa), kb=JSON.stringify(fb);
      if (ka!==kb) { const A2=Array.isArray(fa)?fa:Object.entries(fa); const B2=Array.isArray(fb)?fb:Object.entries(fb); console.log("  finals len",A2.length,B2.length,"same set:",JSON.stringify(A2.map(x=>JSON.stringify(x)).sort())===JSON.stringify(B2.map(x=>JSON.stringify(x)).sort())); for(let i=0;i<A2.length;i++) if(JSON.stringify(A2[i])!==JSON.stringify(B2[i])){ console.log("  first diff at",i,JSON.stringify(A2[i]).slice(0,200),"|||",JSON.stringify(B2[i]).slice(0,200)); break; } }
      console.log(" season",y+1,"news same:",JSON.stringify($plain(A.news_log))===JSON.stringify($plain(B.news_log)),"finals same:",JSON.stringify($plain(A.finals))===JSON.stringify($plain(B.finals)));
    }
    oneByOne(C, 400+Math.floor(rnd()*600)); C.finish_season();
  }
  const a=digest(A),b=digest(B),c=digest(C);
  console.log("seed",seed,"A",a,"B",b,a===b?"SAME":"DIFFERENT","C",c,a===c?"SAME":"DIFFERENT","(one-by-one games in B:",games+")");
}
