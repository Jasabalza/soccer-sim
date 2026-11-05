// The tournament single-game API: list a round's games, play one, round locking, and a World Cup year end to end.
const fs=require("fs"),vm=require("vm");const D=__dirname+"/../data/";
globalThis.__DATA={};for(const k of["leagues","nations","clubs_geo","rivalries","rivalries_nat"])__DATA[k]=fs.readFileSync(D+k+".json","utf8");globalThis.require=require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js","utf8")+"\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
(async()=>{
 const R=__R; await R.init(); let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
 const call=async(p,b)=>{ const r=await R.request(p,b); return r; };
 await call("/api/new",{seed:"1",rules:{}});
 // walk the calendar until a cup round is due
 const first=async(pred,maxw)=>{ for(let i=0;i<maxw;i++){ const r=await call("/api/world"); const ids=[...r.body.continents.flatMap(c=>c.comps.map(x=>x.id)),...(r.body.summer||[]).map(x=>x.id)]; for(const id of ids){ const g=await call("/api/games?comp="+encodeURIComponent(id)); if(g.code===200&&pred(g.body)) return g.body; } await call("/api/sim",{scope:"world",weeks:1}); } return null; };
 const cup=await first(g=>g.kind==="cup"&&g.ready&&g.total>0,60);
 ok(cup,"found a cup round that is due"); if(!cup) return;
 console.log("   ",cup.title,cup.event.label,cup.total,"games, first:",JSON.stringify(cup.games[0]));
 const key=cup.games[cup.games.length-1].key;
 let r=await call("/api/sim",{comp:cup.comp,game:key}); ok(r.code===200,"play one chosen game");
 let g2=(await call("/api/games?comp="+encodeURIComponent(cup.comp))).body;
 ok(g2.played===1&&g2.games.find(x=>x.key===key).done,"that game shows as played ("+g2.games.find(x=>x.key===key).text+")");
 r=await call("/api/sim",{comp:cup.comp,game:key}); ok(r.code===400,"playing it twice is refused: "+JSON.stringify(r.body));
 r=await call("/api/sim",{comp:cup.comp,game:"nobody|nobody"}); ok(r.code===400,"a game from another round is refused");
 // finish the round game by game; the next round must then be the current one
 for(const x of g2.games) if(!x.done){ r=await call("/api/sim",{comp:cup.comp,game:x.key}); ok(r.code===200,"play "+x.a+" v "+x.b+" -> "+(await call("/api/games?comp="+encodeURIComponent(cup.comp))).body.games.length); break; }
 let cur=(await call("/api/games?comp="+encodeURIComponent(cup.comp))).body;
 while(cur.ready&&cur.games.some(x=>!x.done)&&cur.event.label===cup.event.label){ const x=cur.games.find(y=>!y.done); r=await call("/api/sim",{comp:cup.comp,game:x.key}); if(r.code!==200){ok(false,"play "+JSON.stringify(r.body));break;} cur=(await call("/api/games?comp="+encodeURIComponent(cup.comp))).body; }
 ok(cur.event&&cur.event.label!==cup.event.label,"round finished -> now on: "+(cur.event&&cur.event.label)+", ready="+cur.ready+" ("+(cur.why||"")+")");
 // locking: a qualifying/WC comp that is not due must refuse
 const w=await call("/api/world"); const sm=(w.body.summer||[]).map(x=>x.id); console.log("    summer comps:",sm.join(", "));
 for(const id of sm.slice(0,2)){ const gg=await call("/api/games?comp="+encodeURIComponent(id)); ok(gg.code===200&&!gg.body.ready&&gg.body.games.length===0,id+" is locked: "+gg.body.why); const rr=await call("/api/sim",{comp:id,game:"a|b"}); ok(rr.code===409||rr.code===400,id+" refuses a game while locked ("+rr.code+")"); }
 // ---- a World Cup year, played game by game ----
 const wcFind=async()=>{ for(let k=0;k<12;k++){ const st=(await call("/api/status")).body; if(st.header.season>=4) break; await call("/api/years",{n:1}); }
   for(let i=0;i<60;i++){ const r=await call("/api/world"); const ids=[...r.body.continents.flatMap(c=>c.comps.map(x=>x.id)),...(r.body.summer||[]).map(x=>x.id)]; const wc=ids.find(x=>x.startsWith("WC:")); if(wc){ const g=await call("/api/games?comp="+encodeURIComponent(wc)); if(g.body.ready) return g.body; }
     const rr=await call("/api/sim",{scope:"world",weeks:1}); if(rr.code!==200||rr.body.weeks===0) break; } return null; };
 const wc=await wcFind(); ok(wc,"found the World Cup, ready"); if(wc){
  console.log("   ",wc.title,wc.event.label,wc.total,"games;","sample:",JSON.stringify(wc.games[0]));
  const id=wc.comp; let guard=0, played=0, evs=new Set();
  while(guard++<400){ const g=(await call("/api/games?comp="+encodeURIComponent(id))).body; if(!g.ready||!g.event) break; evs.add(g.event.label);
    const pick=g.games.filter(x=>!x.done); if(!pick.length) break; const x=pick[pick.length-1-(played%pick.length)]; const rr=await call("/api/sim",{comp:id,game:x.key}); if(rr.code!==200){ok(false,"WC game "+JSON.stringify(rr.body));break;} played++; }
  const fin=(await call("/api/comp?id="+encodeURIComponent(id))).body;
  ok(played>60,"played "+played+" World Cup games one at a time across rounds: "+[...evs].join(" | "));
  ok(fin.winner||fin.champion||JSON.stringify(fin).includes("final"),"World Cup produced a final");
 }
 console.log(fails?("FAILED "+fails):"ALL OK");
})().catch(e=>console.log("ERR",e&&e.stack||e));
