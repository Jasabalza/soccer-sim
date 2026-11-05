const fs=require("fs"),vm=require("vm");const D=__dirname+"/../data/";
const seeds=(process.argv[2]||"1,2,3").split(",").map(Number), N=+process.argv[3]||20, off=process.argv[4]==="off";
if(off) globalThis.__NO_RULES=true;
globalThis.__DATA={};for(const k of["leagues","nations","clubs_geo","rivalries","rivalries_nat"])__DATA[k]=fs.readFileSync(D+k+".json","utf8");globalThis.require=require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js","utf8")+"\n;globalThis.__B={mods:$mods,$new,$kw};");
const {mods,$new,$kw}=globalThis.__B; const S=mods.sim_core;
let tot={n:0,top:0,rival:0,known:0,why:0,built:0};
for(const seed of seeds){
  const w=$new(S.World,[$new(S.Settings,[$kw({label:"game"})]),seed]);
  const t0=Date.now(); for(let i=0;i<N;i++) w.finish_season();
  const E=mods.market.eliteSet(w,"x"); const KN=mods.rivals.known();
  let top=0,rv=0,kn=0,why=0; const sample=[];
  for(const t of w.transfers){ const a=t.get_("frm"),b=t.get_("to"); const k=mods.rivals.key(a,b); if(E.has(a)&&E.has(b)) top++; if(KN[k]) kn++; if(mods.rivals.intensity(w,a,b)>0) rv++; if(t.get_("why")) why++; if(E.has(a)&&E.has(b)&&sample.length<3) sample.push(`${t.get_("player")} (${t.get_("ovr")}) ${a} -> ${b}: ${t.get_("why")}`); }
  const pairs=w.rv?Object.values(w.rv.pairs):[]; const built=pairs.filter(p=>p.built);
  console.log(`seed ${seed}: ${w.transfers.length} transfers; elite->elite ${top}; between any rivals ${rv} (known ${kn}); with a why ${why}; pairs ${pairs.length}; built rivalries now ${built.length}; ${Date.now()-t0}ms`);
  if(sample.length) console.log("   e.g.",sample.join(" | "));
  console.log("   built:",built.slice(0,5).map(p=>`${p.a} v ${p.b} "${p.name}" heat ${p.heat}`).join(" ; "));
}
