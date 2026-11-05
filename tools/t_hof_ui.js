// v16 Hall of Fame pages at phone size. usage: node tools/t_hof_ui.js [outdir]   needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
// ends "HOF UI OK" / "HOF UI FAIL"
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], fail=[]; const ok=(c,m)=>{ if(!c){ fail.push(m); console.log('  FAIL',m); } };
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 const go=async(h,w=1000)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(w); };
 const ox=async(k)=>{ const [sw,iw]=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); ok(sw<=iw+1,k+' overflows horizontally '+sw+'>'+iw); };
 const shot=async(k)=>p.screenshot({path:OUT+'/h16_'+k+'.png',fullPage:true});
 // empty world: every page opens
 await go('#/hof'); ok(/No players in this hall yet/.test(await p.innerText('#view')),'empty world hall'); await ox('empty hall');
 await p.evaluate(async()=>{ for(let i=0;i<19;i++) await api('/api/years',{n:1}); });
 const S=await p.evaluate(()=>STATUS.header.season-1);
 await p.evaluate(()=>route()); await p.waitForTimeout(800); await ox('world hall'); await shot('hall_world');
 const rows=await p.$$('#view .hcls .hr'); ok(rows.length>=1,'world hall has inductees, got '+rows.length);
 ok(await p.$('#view .hb.W')!==null,'world badge on rows');
 for(const t of ['bal','watch','snub','rec','ind']){ await p.click(`[data-htab="${t}"]`); await p.waitForTimeout(500); await ox('tab '+t); if(t==='bal') await shot('hall_ballot'); }
 await p.click('[data-kind="c"]'); await p.waitForTimeout(500); await ox('coach hall'); await p.click('[data-kind="p"]'); await p.waitForTimeout(400);
 for(const t of ['C','L','K']){ await p.click(`[data-tier="${t}"]`); await p.waitForTimeout(900); await ox('tier '+t); if(t==='L') await shot('hall_league'); ok(await p.$('#hof-scope')!==null,'scope select on '+t); }
 // a person's page
 await go('#/hof/W',1200); await p.evaluate(()=>{HOF.tab='ind';route();}); await p.waitForTimeout(900);
 const href=await p.$eval('#view .hcls a',a=>a.getAttribute('href')); await go(href,900); await ox('card'); await shot('card');
 { const n=(await p.$$('#view .hch')).length; ok(n===4,'four halls on the card, got '+n+' at '+await p.evaluate(()=>location.hash)+' href '+href); }
 // world day
 await go('#/hofday/'+S+'/watch'); await ox('day watch'); await shot('day_watch');
 for(let i=0;i<12;i++){ const nx=await p.$('#hd-next'); if(!nx) break; await nx.click(); await p.waitForTimeout(250); if(i===2) await shot('day_vote'); }
 await ox('day end'); await go('#/hofday/'+S); await ox('day results'); await shot('day_results');
 // league day
 await go('#/hofleague/Premier%20League/'+S); await ox('league day'); await shot('league_day');
 for(const t of ['clubs','ballot','league']){ await p.click(`[data-ltab="${t}"]`); await p.waitForTimeout(400); await ox('league day '+t); }
 await go('#/hofleague/Premier%20League/'+S+'/watch'); await ox('league watch'); await shot('league_watch');
 const club=await p.evaluate(()=>0); await go('#/hofleague/Premier%20League/'+S+'/club/Chelsea'); await ox('club day'); await shot('club_day');
 // league page tabs
 await go('#/league/Premier%20League',1500); ok((await p.$$('#lg-tabs [data-lt]')).length===6,'league has 6 tabs');
 await p.click('#lg-tabs [data-lt="halls"]'); await p.waitForTimeout(900); await ox('league halls tab'); await shot('league_halls');
 // awards page card
 await go('#/ceremony/'+S); await ox('awards'); ok(await p.$('.hofcta')!==null,'induction day card on the awards page');
 ok(errs.length===0,'console errors: '+errs.slice(0,3).join(' | '));
 await b.close(); console.log(fail.length? 'HOF UI FAIL '+fail.length : 'HOF UI OK');
 process.exit(fail.length?1:0);
})();
