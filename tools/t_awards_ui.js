// v15.1 awards pages (phone size): results, Ballon d'Or detail, Team and cups, ceremony mode.
// usage: node tools/t_awards_ui.js [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const go=async(h)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(1200); };
 const noScroll=async()=>await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:3}); });
 await go('#/ceremony'); const SS=await p.evaluate(()=>+document.querySelector('#aw-season').value); console.log('season',SS);
 ck(/Awards/.test(await p.innerText('#view h1')),'results page title');
 ck((await p.$$('#aw-ballon, #aw-boot, #aw-young, #aw-coach, #aw-team, #aw-cups')).length===6,'six award sections');
 ck(!(await p.$('a[href$="/watch"]')),'results page has no watch button'); ck(await noScroll(),'results: no sideways scroll');
 await p.screenshot({path:OUT+'/aw_1.png',fullPage:true});
 await p.click('[data-go="aw-team"]'); await p.waitForTimeout(500);
 const det=await p.$$('#aw-cups details'); ck(det.length>0,'cup accordions: '+det.length); if(det.length){ await det[0].evaluate(e=>e.open=true); }
 await p.click('a[href="#/ceremony/'+SS+'/ballon"]'); await p.waitForTimeout(1000);
 ck((await p.$$('.vr')).length===10,'ballon top ten rows');
 ck(await noScroll(),'ballon: no sideways scroll'); await p.screenshot({path:OUT+'/aw_2.png',fullPage:true});
 await go('#/ceremony/'+SS+'/team');
 ck((await p.$$('svg.pitch')).length===1,'pitch on team page');
 const chips=await p.$$('[data-cg]'); ck(chips.length>=2,'cup group chips: '+chips.length);
 if(chips.length>1){ await chips[1].click(); await p.waitForTimeout(600); }
 ck(await noScroll(),'team: no sideways scroll'); await p.screenshot({path:OUT+'/aw_3.png',fullPage:true});
 await go('#/ceremony/'+SS+'/watch');
 let n=0; const titles=[];
 for(let i=0;i<8;i++){ titles.push((await p.innerText('.prog')).replace(/\s+/g,' ')); n++; const t=(await p.innerText('#aw-next')); if(/See all results/.test(t)) break; if(i===2) await p.screenshot({path:OUT+'/aw_4.png',fullPage:true}); await p.click('#aw-next'); await p.waitForTimeout(300); }
 ck(n===6,'ceremony has 6 screens: '+titles.join(' | '));
 await p.click('#aw-back'); await p.waitForTimeout(300); ck(/Award 5 of 6/.test(await p.innerText('.prog')),'back goes to award 5');
 await p.click('#aw-next'); await p.click('#aw-next'); await p.waitForTimeout(800);
 ck(new RegExp('#/ceremony/'+SS+'$').test(await p.evaluate(()=>location.hash)),'finish returns to results');
 console.log('errors:',errs.slice(0,6));
 await b.close();
 console.log(bad.length||errs.length?'AWARDS UI FAIL':'AWARDS UI OK'); process.exit(bad.length||errs.length?1:0);
})();
