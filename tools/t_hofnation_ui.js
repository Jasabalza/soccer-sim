// v16.1.3: a followed country gets a ceremony; the card lists every hall; no veto next to an induction.
// needs a save that has played ~25 seasons. usage: node tools/t_hofnation_ui.js <outdir> <save.sav.txt>
const {chromium,devices}=require('playwright'); const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const fail=[], errs=[]; const ok=(c,m)=>{ if(!c){ fail.push(m); console.log('  FAIL',m); } };
 const c=await b.newContext({...devices['iPhone 14'],deviceScaleFactor:1}); const p=await c.newPage(); p.on('pageerror',e=>errs.push('PE '+e.message));
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 const go=async(h,w=1000)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(w); };
 const text=require('fs').readFileSync(process.argv[3],'utf8');
 await p.evaluate(async(t)=>{ await api('/api/import_text',{text:t,name:'tlong'}); await api('/api/load',{name:'tlong'}); await refreshStatus(); },text);
 const found=await p.evaluate(async()=>{ const S=STATUS.header.season; const nats=(await api('/api/nations')).rows.map(r=>r.name); let best=null; for(const s of [S-1,S-2,S-3,S-4]) for(const n of nats){ const d=await api('/api/hofnation?nation='+encodeURIComponent(n)+'&season='+s); if(d.inducted.length && (!best || d.inducted.length>best.k)) best={n,s,k:d.inducted.length,w:d.nWorld,o:d.nOwn}; } return best; }); let tries=0;
 console.log('seasons played',tries,'country class',JSON.stringify(found)); ok(found,'a country class appears');
 if(found){
  await p.evaluate(async(n)=>{ await api('/api/favnations',{set:[n]}); },found.n);
  const day=await p.evaluate(async(s)=>{ const d=await api('/api/hofday?season='+s); return d.favs.some(f=>f.kind==='nation'); },found.s); ok(day,'the followed country is in the World day favourites');
  await go('#/hofday/'+found.s,900); ok(await p.$('a[href*="#/hofnation/"]'),'a Ceremony button for the followed country');
  await go('#/hofnation/'+encodeURIComponent(found.n)+'/'+found.s+'/watch',900); ok(await p.$('.hday-open'),'country ceremony opens');
  await p.screenshot({path:OUT+'/hn_open.png'}); await p.click('#hc-next'); await p.waitForTimeout(2300); await p.screenshot({path:OUT+'/hn_reveal.png'});
  let m=1,g=0; while(await p.$('#hc-next') && g++<80){ await p.click('#hc-next'); m++; await p.waitForTimeout(100); }
  ok(m-1===found.k,'one reveal per inductee: '+(m-1)+' of '+found.k); ok(/that is the class/i.test(await p.innerText('#view')),'class page'); await p.screenshot({path:OUT+'/hn_class.png'});
  await go('#/hofnation/'+encodeURIComponent(found.n)+'/'+found.s,900); ok(/that is the class/i.test(await p.innerText('#view')),'results page is the class');
 }
 // multi-hall display: a card with several halls lists them all
 const multi=await p.evaluate(async()=>{ const ids=[]; const S=STATUS.header.season; for(let y=S;y>S-6;y--){ const d=await api('/api/hofday?season='+y); for(const r of d.inducted) ids.push(r.id); } for(const id of ids){ const c=await api('/api/hofcard?id='+id); const n=c.chain.by.K.length+c.chain.by.L.length; if(n>=2) return {id,n}; } return null; });
 if(multi){ await go('#/hofcard/'+multi.id,900); const rows=await p.$$eval('.hchain .hch',e=>e.length); ok(rows>=5,'card shows every hall ('+rows+' rows)'); await p.screenshot({path:OUT+'/hn_multi.png',fullPage:true}); } else console.log('(no multi-hall world inductee yet)');
 ok(!errs.length,'page errors '+errs.join('|')); await b.close(); console.log(fail.length?'HOFNATION UI FAIL':'HOFNATION UI OK');
})();
