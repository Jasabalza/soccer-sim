const fs=require("fs"), vm=require("vm");
const D=__dirname+"/../data/";
globalThis.__DATA={leagues:fs.readFileSync(D+"leagues.json","utf8"),nations:fs.readFileSync(D+"nations.json","utf8"),clubs_geo:fs.readFileSync(D+"clubs_geo.json","utf8"),rivalries:fs.readFileSync(D+"rivalries.json","utf8"),rivalries_nat:fs.readFileSync(D+"rivalries_nat.json","utf8")};
globalThis.require=require;
vm.runInThisContext(fs.readFileSync(__dirname+"/../dist/bundle_engine.js","utf8")+"\n;globalThis.__R={request:$mods.shim.request,init:$mods.shim.init};");
const steps=JSON.parse(fs.readFileSync(__dirname+"/../golden/scen.json","utf8"));
const q=encodeURIComponent;
(async()=>{
 const R=globalThis.__R; await R.init(); const out=[];
 const call=async(p,b)=>{const r=await R.request(p,b); const v=r.code===200?r.body:{__err:r.code,m:r.body.error}; return v;};
 const G=async(p)=>{const r=await call(p); out.push([p,r]); return r;};
 const crawl=async()=>{
  for(const p of ["status","map","news","money","records","review","awards","trophies","edits","charts","halloffame","settings","ledger"]) await G("/api/"+p);
  const nat=await G("/api/nations"); const w=await G("/api/world");
  const leagues=w.continents.flatMap(c=>c.leagues.map(l=>l.name));
  const comps=w.continents.flatMap(c=>c.comps.map(x=>x.id)).concat((w.summer||[]).map(x=>x.id));
  for(const c of w.continents) await G("/api/continent?code="+c.code);
  for(let i=0;i<leagues.length;i++){const r=await G("/api/league?name="+q(leagues[i]));
   if(i%4===0){await G("/api/league_season?name="+q(leagues[i])+"&season="+Math.max(1,w.header.season-1));
    if(r.rows&&r.rows.length){const cl=await G("/api/club?name="+q(r.rows[0].club)); if(cl.squad&&cl.squad.length) await G("/api/player?uid="+cl.squad[0].uid);}}}
  for(const cid of comps){await G("/api/comp?id="+q(cid)); await G("/api/compstats?id="+q(cid));}
  await G("/api/players?pos=ST&sort=ovr&limit=30");
  for(const n of nat.rows.slice(0,3)) await G("/api/nation?name="+q(n.name));
  await G("/api/nations?confed=UEFA"); await G("/api/ledger?season=1");
 };
 for(const s of steps){ if(s[0]==="CRAWL") await crawl(); else if(s[0]==="EDITS"){} else out.push([s[1], await call(s[1], s[2])]); }
 fs.writeFileSync(process.argv[2], JSON.stringify(out)); console.log(out.length,"calls");
})();
