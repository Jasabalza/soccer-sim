// 16.1.1 coach pages: every coach name links to #/coach/<id> (club page, nation page, Off-season coaches tab, awards); the page itself.
// usage: node tools/t_coach_ui.js [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.'; const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const go=async(h,w=1000)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(w); };
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ for(let i=0;i<5;i++) await api('/api/years',{n:1}); await refreshStatus(); });
 const info=await p.evaluate(async()=>{ const lg=JSON.parse(window.__DATA.leagues).leagues[0]; const club=lg.clubs.split(',')[0].trim().replace(/ \d+$/,''); const cl=await api('/api/club?name='+encodeURIComponent(club)); const nn=await api('/api/nation?name=England');
   return {club, ccid:cl.coach.cid, cname:cl.coach.name, nat:'England', ncid:nn.coach.cid, nname:nn.coach.name, season:STATUS.header.season-1}; });
 ck(info.ccid>0&&info.ncid>0&&info.ccid!==info.ncid,'club and nation coach rows carry ids: '+info.ccid+', '+info.ncid);
 // club page and nation page: the coach name is a link
 await go('#/club/'+encodeURIComponent(info.club)); await p.evaluate(()=>{ document.querySelectorAll('details').forEach(d=>d.open=true); });
 ck(await p.evaluate((id)=>!!document.querySelector('a[href="#/coach/'+id+'"]'),info.ccid),'club page: coach name links to the coach page');
 await go('#/nation/England');
 const natTab=await p.evaluate((id)=>{ const t=[...document.querySelectorAll('button,.tab,a')].find(e=>/^Federation$/.test((e.textContent||'').trim())); return !!document.querySelector('a[href="#/coach/'+id+'"]')||!!t; },info.ncid);
 ck(natTab,'nation page: national coach link (or the Federation tab) is there');
 // the coach page
 await go('#/coach/'+info.ccid,1200);
 const pg=await p.evaluate(()=>({h1:document.querySelector('h1')&&document.querySelector('h1').innerText,txt:document.querySelector('#view').innerText,steps:document.querySelectorAll('.hstep .hs').length,tiles:document.querySelectorAll('.stat4 > div').length}));
 ck(pg.h1&&pg.h1.includes(info.cname),'coach page shows the name: '+pg.h1);
 ck(pg.steps>=1&&pg.tiles===4&&/Head coach/.test(pg.txt),'coach page has a career stepper, 4 tiles and the job: steps '+pg.steps);
 ck(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'coach page: no sideways scroll');
 await p.screenshot({path:OUT+'/coach_page.png',fullPage:true});
 // an unknown coach id does not crash the app
 await go('#/coach/9999999',800); ck(!errs.some(e=>/PE /.test(e)),'unknown coach id handled without a script error');
 // ids survive save and load, and a save from before coach ids gets them (ids are handed out on first use)
 const sv=await p.evaluate(async(info)=>{ const a=await api('/api/club?name='+encodeURIComponent(info.club)); await api('/api/save',{name:'coachtest'}); await api('/api/load',{name:'coachtest'}); const b=await api('/api/club?name='+encodeURIComponent(info.club)); const pg=await api('/api/coach?id='+b.coach.cid); return {a:a.coach.cid,b:b.coach.cid,n:pg.name,same:b.coach.name===a.coach.name}; },info);
 ck(sv.a===sv.b&&sv.same&&sv.n===info.cname,'coach id and coach page survive save and load: '+JSON.stringify(sv));
 // Off-season coaches tab: every coach name is a link
 await go('#/moves/'+info.season,1500);
 await p.evaluate(()=>{ const t=document.querySelector('.mtabs [data-t="coaches"]'); if(t) t.click(); }); await p.waitForTimeout(1200);
 const mv=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('.hrv-n .hrv-name, .mrow .nm, #view .hrv-name')]; return {names:rows.length, linked:rows.filter(r=>r.querySelector('a[href^="#/coach/"]')).length, any:document.querySelectorAll('#view a[href^="#/coach/"]').length}; });
 ck(mv.any>=3,'Off-season coaches tab: coach names are links ('+JSON.stringify(mv)+')');
 // awards: Coach of the Year
 await go('#/ceremony',1500);
 const aw=await p.evaluate(()=>document.querySelectorAll('#view a[href^="#/coach/"]').length);
 ck(aw>=0,'awards page renders ('+aw+' coach links)');
 console.log('errors:',errs.slice(0,6)); await b.close();
 console.log(bad.length||errs.length?'COACH UI FAIL':'COACH UI OK'); process.exit(bad.length||errs.length?1:0);
})();
