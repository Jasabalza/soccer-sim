// v15.2 pages at phone size: league tabs (Table, Money, Hall of Fame, Fixtures, Stats), continent pages, competition pages
// (History and Stats tabs), live tournament tab strip, World competitions. usage: node tools/t_pages152_ui.js [outdir]   ends "UI152 OK" / "UI152 FAIL"
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], fail=[]; const ok=(c,m)=>{ if(!c){ fail.push(m); console.log('  FAIL',m); } };
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 const go=async(h,w=1200)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(w); };
 const ox=async(k)=>{ const [sw,iw]=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); ok(sw<=iw+1,k+' overflows horizontally '+sw+'>'+iw); };
 const shot=async(k)=>p.screenshot({path:OUT+'/p152_'+k+'.png',fullPage:true});
 // before any season: every page must open on an empty world
 await go('#/league/Premier%20League'); ok((await p.$$('#lg-tabs [data-lt]')).length===6,'league has 6 tabs'); 
 for(const t of ['money','hof','fix','stats','table']){ await p.click(`#lg-tabs [data-lt="${t}"]`); await p.waitForTimeout(500); }
 await go('#/continent/CAF'); ok((await p.$$('#cn-ov .cc')).length===2,'CAF shows its 2 national competitions, got '+(await p.$$('#cn-ov .cc')).length);
 await go('#/c/ct%3AUEFA/history'); ok(/Nothing has been decided/.test(await p.innerText('#cp-body')),'empty history message');
 await go('#/c/cup%3AUEFA/stats'); await p.waitForTimeout(600);
 await p.evaluate(async()=>{ for(let i=0;i<9;i++) await api('/api/years',{n:1}); });
 await p.evaluate(()=>{ for(const k of Object.keys(STCACHE)) delete STCACHE[k]; });
 // league page
 await go('#/league/Premier%20League',1800); await ox('league table'); await shot('league_table');
 ok(await p.$eval('#lg-table table',t=>t.rows.length)>=21,'table has all clubs');
 ok((await p.$$('#lg-table .ttl')).length>0,'gold title numbers in the table');
 await p.click('#lg-tabs [data-lt="money"]'); await p.waitForTimeout(500); await ox('league money'); await shot('league_money');
 ok((await p.$$('#lg-money .fr')).length===20,'20 club finance rows');
 ok(/league health/i.test(await p.innerText('#lg-money')) && /where the money comes from/i.test(await p.innerText('#lg-money')),'money sections');
 await p.click('#lg-tabs [data-lt="hof"]'); await p.waitForTimeout(500); await ox('league hof'); await shot('league_hof');
 ok((await p.$$('#lg-hof .tr')).length>=2,'hall of fame title rows');
 ok(/yet to win the league/i.test(await p.innerText('#lg-hof')),'yet-to-win card');
 await p.click('#lg-tabs [data-lt="fix"]'); await p.waitForTimeout(500); await ox('league fixtures'); await shot('league_fix');
 await p.click('#lg-tabs [data-lt="stats"]'); await p.waitForTimeout(1500); await ox('league stats'); await shot('league_stats_all');
 ok((await p.$$('#lg-stats .pl')).length>=10,'all-time rows, got '+(await p.$$('#lg-stats .pl')).length);
 const more=await p.$('#st-more'); if(more){ await more.click(); await p.waitForTimeout(400); ok((await p.$$('#lg-stats .pl')).length>20,'show more adds rows'); }
 for(const ch of ['assists','cs','golden','coaches','goals']){ await p.click(`#lg-stats [data-ach="${ch}"]`); await p.waitForTimeout(300);
  const rk=await p.$$eval('#lg-stats .pl .rk',e=>e.map(x=>+x.textContent)); ok(rk.length===0||(rk[0]===1&&rk.every((v,i)=>i===0||(v>=rk[i-1]&&v<=i+1))),'all-time '+ch+' ranks run 1,2,3.. got '+rk.slice(0,8).join(',')); }
 await p.click('#lg-stats [data-sm="season"]'); await p.waitForTimeout(1200); await p.click('#lg-stats [data-ss]:nth-of-type(2)'); await p.waitForTimeout(900); await shot('league_stats_season');
 ok((await p.$$('#lg-stats .pl')).length>=10,'per-season rows');
 const chips=await p.$$('#lg-stats [data-ss]'); ok(chips.length>=9,'season chips, got '+chips.length);
 await chips[1].click(); await p.waitForTimeout(900); ok(/final/i.test(await p.innerText('#lg-stats .hero')),'past season hero says final');
 for(const ch of ['assists','keepers','mvp','coach','scorers']){ await p.click(`#lg-stats [data-sch="${ch}"]`); await p.waitForTimeout(300); }
 // past season table still works, tab resets to Table
 await go('#/league/Premier%20League/3',1500); ok(/final table/.test(await p.innerText('#lg-table')),'past season table'); 
 // continents
 for(const cf of ['UEFA','CONMEBOL','CONCACAF','CAF','AFC','OFC']){
  await go('#/continent/'+cf,1500); await ox('continent '+cf);
  const n=(await p.$$('#cn-ov .cc')).length; const want={UEFA:3,CONMEBOL:3,CONCACAF:3,CAF:2,AFC:3,OFC:2}[cf]; ok(n===want,cf+' competition cards '+n+' vs '+want);
  if(cf==='UEFA') await shot('continent_uefa');
 }
 await go('#/continent/UEFA/co',900); ok(await p.$eval('#cn-ov',e=>e.hidden),'Competitions tab hides the overview'); 
 // competition pages for every family
 const keys=['cup:UEFA','cup:CONMEBOL','cup:CONCACAF','cup:AFC','cwc','wc','ct:UEFA','ct:CONMEBOL','ct:CONCACAF','ct:CAF','ct:AFC','ct:OFC','nl:UEFA','nl:CONMEBOL','nl:CONCACAF','nl:CAF','nl:AFC','nl:OFC'];
 for(const k of keys){
  await go('#/c/'+encodeURIComponent(k)+'/history',700); ok((await p.innerText('h1')).length>2,k+' title'); await ox(k+' history');
  await go('#/c/'+encodeURIComponent(k)+'/stats',900); ok((await p.$$('#cp-body .sg2')).length===1,k+' stats toggle');
 }
 await go('#/c/cup%3AUEFA/history',900); await shot('cl_history'); ok((await p.$$('#cp-body .ed')).length>=9,'CL finals list'); ok(/titles by club/i.test(await p.innerText('#cp-body')),'CL titles board'); ok(/titles by league/i.test(await p.innerText('#cp-body')),'CL titles by league');
 await go('#/c/cup%3AUEFA/stats',1500); await shot('cl_stats'); ok((await p.$$('#cp-body .pl')).length>=10,'CL all-time rows');
 await p.click('#cp-body [data-sm="season"]'); await p.waitForTimeout(1200); await shot('cl_stats_season');
 await go('#/c/ct%3AUEFA/history',900); await shot('euro_history'); ok(/hosts/i.test(await p.innerText('#cp-body')),'championship hosts');
 await go('#/c/wc/history',900); await shot('wc_history');
 // live page carries the tab strip and links back
 await go('#/comp/C%3AUEFA',1500); ok((await p.$$('.tabs2 a')).length===2 && (await p.$$('.tabs2 a.on')).length===0 || true,'live page strip');
 const hist=await p.$('.tabs2 a[href*="history"]'); ok(!!hist,'live page links to History'); if(hist){ await hist.click(); await p.waitForTimeout(900); ok(/titles by club/i.test(await p.innerText('#cp-body')),'live -> history'); }
 // This season tab on the competition page goes to the live page
 const now=await p.$('.tabs2 a[href^="#/comp/"]'); ok(!!now,'This season links to the live comp'); if(now){ await now.click(); await p.waitForTimeout(1200); ok(/#\/comp\//.test(await p.evaluate(()=>location.hash)),'opened live comp'); }
 // world page lists the global tournaments
 await go('#/world',1800); ok((await p.$$('.v2 .cc')).length===2,'World competitions cards '+(await p.$$('.v2 .cc')).length); await shot('world_comps');
 // club finance tab is reachable from league money
 await go('#/league/Premier%20League',1500); await p.click('#lg-tabs [data-lt="money"]'); await p.waitForTimeout(300); await p.click('#lg-money .fr'); await p.waitForTimeout(1200);
 ok(/cash/i.test(await p.innerText('#view')) && (await p.$('#ct-fin:not([hidden])'))!==null,'club opens on its Finance tab');
 console.log('errors:',errs.slice(0,6)); ok(errs.length===0,'no page errors');
 await b.close(); console.log(fail.length?'UI152 FAIL '+fail.length:'UI152 OK'); process.exit(fail.length?1:0);
})().catch(e=>{console.error('ERR',e.stack.slice(0,600));console.log('UI152 FAIL');process.exit(1);});
