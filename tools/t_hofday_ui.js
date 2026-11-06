// v16.1.2: league Hall of Fame day is a ceremony (opening, counted votes, verdict, class), the overview is not skipped,
// the league hall shows the league's logo, a player page shows his academy and his managers.
// usage: node tools/t_hofday_ui.js <save.sav.txt> [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright'); const fs=require('fs');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const fail=[], errs=[]; const ok=(c,m)=>{ if(!c){ fail.push(m); console.log('  FAIL',m); } };
 const c=await b.newContext({...devices['iPhone 14'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message));
 const OUT=process.argv[3]||'.'; const text=fs.readFileSync(process.argv[2],'utf8');
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async(t)=>{ await api('/api/import_text',{text:t,name:'tsave'}); await api('/api/load',{name:'tsave'}); await refreshStatus(); },text);
 const go=async(h,w=1200)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(w); };
 // find a league with a league inductee and a club inductee
 const info=await p.evaluate(async()=>{ const S=STATUS.header.season; for(const s of [S,S-1]) for(const ln of ['Premier League','La Liga','Bundesliga','Serie A','Ligue 1']){ try{ const d=await api('/api/hofleague?league='+encodeURIComponent(ln)+'&season='+s); if(d.ready&&d.nLeague+d.nClubs>0) return {ln,s,nL:d.nLeague,nK:d.nClubs}; }catch(e){} } return null; });
 ok(info,'a league day with inductees exists'); console.log('league day',JSON.stringify(info));
 // ceremony
 await go('#/hofleague/'+encodeURIComponent(info.ln)+'/'+info.s+'/watch',800);
 ok(/Hall of Fame day/.test(await p.innerText('#view')) && await p.$('.hday-open'),'opening screen');
 ok(await p.$('.hday-logo .lbox, .hday-logo .emb, .hday-logo svg'),'league logo or emblem on opening');
 await p.screenshot({path:OUT+'/hd_open.png'});
 let n=0; await p.click('#hl-next'); await p.waitForTimeout(300);
 const first=await p.$eval('.hrv-pct',e=>e.textContent); ok(await p.$('.hrv.live'),'reveal is animated');
 await p.waitForTimeout(2300); const fin=await p.$eval('.hrv-pct',e=>e.textContent); const want=await p.$eval('.hrv-pct',e=>e.dataset.p+'%');
 ok(fin===want,'vote counted up to '+want+', got '+fin); ok(+await p.$eval('.hrv-v',e=>getComputedStyle(e).opacity)===1,'verdict visible after the count');
 await p.screenshot({path:OUT+'/hd_reveal.png'});
 let guard=0; while(await p.$('#hl-next') && guard++<80){ n++; await p.click('#hl-next'); await p.waitForTimeout(120); }
 ok(n===info.nL+info.nK,'one reveal per inductee, saw '+n+' of '+(info.nL+info.nK));
 ok(/that is the class/i.test(await p.innerText('#view')),'class summary at the end'); await p.screenshot({path:OUT+'/hd_class.png'});
 // the league overview popup stays up for a followed league with inductees; the ceremony is a button
 await go('#/world',500);
 await p.evaluate((ln)=>{ FAVS=['L:'+ln]; showCompEnd({kind:'league',name:ln,winner:'Arsenal',season_label:'x',top3:[{team:'Arsenal',pts:80}],emblem:{kind:'league_cup',color:'#fc0'}},false); },info.ln);
 await p.waitForTimeout(1800);
 ok(await p.$('#modal-box .ce-w') && await p.$('#ce-hw'),'league overview still up with a Watch the ceremony button'); await p.screenshot({path:OUT+'/hd_overview.png'});
 await p.evaluate(()=>{ closeModal(); });
 // hall page: league row uses a logo box when the league has an imported logo, else the emblem; never overflows
 const card=await p.evaluate(async([ln,s])=>{ const d=await api('/api/hofleague?league='+encodeURIComponent(ln)+'&season='+s); const r=d.league_ind[0]||d.clubs.flatMap(c=>c.inducted)[0]; return r?r.id:null; },[info.ln,info.s]);
 ok(card,'a league inductee card'); await go('#/hofcard/'+card,900); await p.screenshot({path:OUT+'/hd_card.png',fullPage:true});
 const cardTxt=await p.innerText('#view'); ok(/Played under|Academy graduate/.test(cardTxt),'card shows academy or managers: '+cardTxt.slice(0,80));
 // with an imported league logo the league badge uses it, not the generic cup
 await p.evaluate((ln)=>{ window.__LOGOS2=Object.assign({nations:{},leagues:{},comps:{},year:{}},window.__LOGOS2||{}); window.__LOGOS2.leagues[ln]='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"/></svg>'; route(); },info.ln); await p.waitForTimeout(900);
 ok(await p.$('.hb.L .lbox img'),'league badge shows the imported league logo'); await p.screenshot({path:OUT+'/hd_card_logo.png'});
 // player page
 const pu=await p.evaluate(async(id)=>{ const c=await api('/api/hofcard?id='+id); return c.uid; },card);
 if(pu){ await go('#/player/'+pu,900); const t=await p.innerText('#view'); ok(/Origins/.test(t)&&/Played under/.test(t),'player page has Origins and Played under'); await p.screenshot({path:OUT+'/hd_player.png',fullPage:true}); }
 const sw=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); ok(sw[0]<=sw[1]+1,'no horizontal overflow');
 ok(!errs.length,'page errors '+errs.join('|'));
 await b.close(); console.log(fail.length?'HOFDAY UI FAIL':'HOFDAY UI OK');
})();
