// National rivalries: how many are built over the years, heat of the real ones, and a sample of a head-to-head.
const fs=require("fs"),vm=require("vm");const D=__dirname+"/../data/";
globalThis.__DATA={};for(const k of["leagues","nations","clubs_geo","rivalries","rivalries_nat"])__DATA[k]=fs.readFileSync(D+k+".json","utf8");globalThis.require=require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js","utf8")+"\n;globalThis.__B={mods:$mods,$new,$kw,$plain};");
const {mods,$new,$kw}=globalThis.__B,S=mods.sim_core;
const YEARS=+process.argv[3]||40;
for (const seed of (process.argv[2]||"1").split(",").map(Number)) {
  const w=$new(S.World,[$new(S.Settings,[$kw({label:"game"})]),seed]); const t0=Date.now(); const row=[];
  for(let y=1;y<=YEARS;y++){ w.finish_season();
    if(y%10===0){ const ps=Object.values(w.rv.pairs).filter(r=>r.nat); const built=ps.filter(r=>r.built&&!mods.rivals.known()[r.a+"|"+r.b]); row.push("S"+y+": nat pairs tracked "+ps.length+", built "+built.length+", meetings total "+ps.reduce((a,r)=>a+r.r[5],0)); } }
  console.log("seed",seed,row.join(" | "),(Date.now()-t0)+"ms");
  const ps=Object.values(w.rv.pairs).filter(r=>r.nat).sort((a,b)=>b.heat-a.heat).slice(0,8);
  console.log(ps.map(r=>r.a+" v "+r.b+" heat "+r.heat+" meet "+r.r[5]+(r.built?" BUILT:"+r.name:"")+(mods.rivals.known()[r.a+"|"+r.b]?" ["+mods.rivals.known()[r.a+"|"+r.b].name+"]":"")).join("\n"));
  const nm=w.news_log.filter(n=>/international rivalry/.test(JSON.stringify(n))).length; console.log("news 'new international rivalry':",nm);
}
