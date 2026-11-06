// 16.1 generated World Cup banner: one per edition (host from the fixed rotation, own four digit year), on the competition card / page and in trophy rooms.
// usage: node tools/t_wclogo_ui.js [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html'; const fs=require('fs');
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.'; const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const go=async(h)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(1000); };
 await p.goto(URL); await p.waitForTimeout(800);
 // a Club World Cup logo with a year slot is imported before the world starts
 const tmp=OUT+'/_wcb_test'; fs.mkdirSync(tmp,{recursive:true}); fs.writeFileSync(tmp+'/cwc.json',JSON.stringify({format:'soccersim-logos',version:2,mime:'image/png',comps:{'Club World Cup':PNG},yearSlots:{'Club World Cup':'cwc'}}));
 await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await p.setInputFiles('#logo-file',tmp+'/cwc.json'); await p.waitForTimeout(1000);
 await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 // 1. the generator: every nation as host, every year, never throws, four digits, years keep going for centuries
 const g=await p.evaluate(()=>{ const out={bad:[],n:0}; const nats=JSON.parse(window.__DATA.nations).nations.map(n=>n.name);
   for(const n of nats) for(const st of ['poster','roundel']){ try{ const s=wcLogo(n,'2125',{style:st}); out.n++; if(!/2125/.test(s)||!/<svg/.test(s)) out.bad.push(n); }catch(e){ out.bad.push(n+': '+e.message); } }
   out.yr=[0,5,999,2025,2125,2825,9999,12345].map(yr4); out.order=JSON.parse(window.__DATA.nations).world_cup.host_order; out.h=[0,1,17,18,19,36].map(hostFor); return out; });
 ck(g.bad.length===0&&g.n>=220,'banner draws for all '+g.n/2+' nations, both layouts '+g.bad.slice(0,3));
 ck(JSON.stringify(g.yr)==='["0000","0005","0999","2025","2125","2825","9999","2345"]','years are always four digits: '+g.yr);
 ck(g.h[0]===g.order[0]&&g.h[1]===g.order[1]&&g.h[2]===g.order[17]&&g.h[3]===g.order[0]&&g.h[4]===g.order[1]&&g.h[5]===g.order[0],'host cycles through the fixed list and wraps: '+g.h);
 // 2. play to the first World Cups, then the hosts shown follow the real history
 await p.evaluate(async()=>{ for(let i=0;i<10;i++){ await api('/api/years',{n:1}); const x=await api('/api/comphist?key=wc'); if(x.editions_n>=2) break; } });
 const h=await p.evaluate(async()=>{ const x=await api('/api/comphist?key=wc'); return {hosts:x.hosts.slice().reverse(), n:x.editions_n, win:x.finals[0].winner, ws:x.finals.map(f=>f.winner), season:x.finals[0].season, label:STATUS&&STATUS.header&&STATUS.header.season_label, order:JSON.parse(window.__DATA.nations).world_cup.host_order}; });
 ck(h.n>=2,'two World Cups played: '+h.n);
 ck(h.hosts.every((x,i)=>x.host===h.order[i%h.order.length]),'real hosts follow host_order: '+h.hosts.map(x=>x.host).join(','));
 // 3. card and page show the banner of the next edition: host from the rotation, year from the calendar
 await p.evaluate(async()=>{ await refreshStatus(); }); await go('#/nations'); await go('#/world');
 const card=await p.evaluate(()=>[...document.querySelectorAll('.cc .wcb')].map(e=>e.title));
 const nextHost=h.order[h.n%h.order.length];
 ck(card.length>=1&&card.every(t=>t.includes(nextHost)&&/\b\d{4}\b/.test(t)),'competition card banner = next host + year: '+card);
 // 4. trophy room of a World Cup winner shows one banner per title, own host and year
 await go('#/nation/'+encodeURIComponent(h.win)); await p.evaluate(()=>{ const t=[...document.querySelectorAll('button,.tab,a')].find(e=>/^Honours$/.test((e.textContent||'').trim())); if(t) t.click(); }); await p.waitForTimeout(800);
 const tro=await p.evaluate(()=>[...document.querySelectorAll('.tro-strip figure')].map(f=>({t:(f.querySelector('.wcb')||{}).title||'',c:f.querySelector('figcaption').textContent})));
 const wins=h.ws.filter(w=>w===h.win).length;
 ck(tro.length===wins&&tro.every(x=>/World Cup .+ \d{4}/.test(x.t)),'trophy room shows '+wins+' banner(s) for '+h.win+': '+JSON.stringify(tro));
 await p.screenshot({path:OUT+'/wcb_trophy.png',fullPage:true});
 // Club World Cup winner: the imported logo with each title's own year
 const cw=await p.evaluate(async()=>{ const x=await api('/api/comphist?key=cwc'); return {win:x.finals[0].winner, ws:x.finals.map(f=>f.winner)}; });
 await go('#/club/'+encodeURIComponent(cw.win)); await p.evaluate(()=>{ const t=[...document.querySelectorAll('button,.tab,a')].find(e=>/^Honours$/.test((e.textContent||'').trim())); if(t) t.click(); }); await p.waitForTimeout(800);
 const cs=await p.evaluate(()=>[...document.querySelectorAll('.tro-strip figure')].map(f=>({y:[...f.querySelectorAll('svg text')].map(x=>x.textContent).join(''),c:f.querySelector('figcaption').textContent})));
 const cwins=cw.ws.filter(w=>w===cw.win).length;
 ck(cs.length>=cwins&&cs.every(x=>/^\d{4}$/.test(x.y)),'Club World Cup trophy room: imported logo with each title year: '+JSON.stringify(cs));
 ck(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll');
 console.log('errors:',errs.slice(0,6)); await b.close();
 console.log(bad.length||errs.length?'WCLOGO UI FAIL':'WCLOGO UI OK'); process.exit(bad.length||errs.length?1:0);
})();
