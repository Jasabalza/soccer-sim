// 16.1 logo file v2 (nations, leagues, competitions), merge on import, federation badges, league logos, title stars (phone size).
// usage: node tools/t_logos_ui.js [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright'); const fs=require('fs');
const URL='http://localhost:8791/test_artifact.html';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.'; const tmp=OUT+'/_logo_test'; fs.mkdirSync(tmp,{recursive:true});
 const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const go=async(h)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(1000); };
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:1}); });
 const lg=await p.evaluate(()=>JSON.parse(window.__DATA.leagues).leagues[0].name);
 // star ladder
 const lad=await p.evaluate(()=>[0,1,4,5,6,9,10,25,26].map((n)=>starLadder(n).join('')));
 ck(JSON.stringify(lad)===JSON.stringify(['','g','gggg','b','bg','bgggg','bb','w','wg']),'star ladder 1 gold, 5 -> blue, 25 -> ice: '+lad.join(','));
 const sm=await p.evaluate(()=>[starMoment({winner:'X',kind:'wc',star_n:1}),starMoment({winner:'X',kind:'wc',star_n:5}),starMoment({winner:'X',kind:'cwc',star_n:3}),starMoment({winner:'X',kind:'cup',star_n:3})]);
 ck(/First World Cup/.test(sm[0])&&/fold/.test(sm[1])&&/Club World Cup/.test(sm[2])&&sm[3]==='','star moments M1 / M2 / M3, none for other cups');
 // before any import: flags and trophies as before
 await go('#/nations'); ck((await p.$$('.nr .nbadge')).length===0,'no badges before import');
 // import: nations + leagues + comps in one file
 fs.writeFileSync(tmp+'/a.json',JSON.stringify({format:'soccersim-logos',version:2,mime:'image/png',nations:{Mexico:PNG,Brazil:PNG,Atlantis:PNG},leagues:{[lg]:PNG},comps:{'UEFA Champions League':PNG,'Club World Cup':PNG}}));
 await go('#/start'); 
 const hasPanel=await p.$('#logo-file');
 if(!hasPanel){ await p.evaluate(()=>{ location.hash='#/settings'; }); await p.waitForTimeout(800); }
 ck(!!(await p.$('#logo-file')),'logo import control is on the page');
 await p.setInputFiles('#logo-file',tmp+'/a.json'); await p.waitForTimeout(1200);
 let st=await p.textContent('#logo-state'); ck(/2 of \d+ nations/.test(st)&&/1 of \d+ leagues/.test(st)&&/2 of \d+ competitions/.test(st),'status counts only matched names: '+st);
 // a second file (clubs) is added to the first
 const club=await p.evaluate(()=>JSON.parse(window.__DATA.leagues).leagues[0].clubs.split(',')[0].trim().replace(/ \d+$/,''));
 fs.writeFileSync(tmp+'/b.json',JSON.stringify({format:'soccersim-logos',version:2,mime:'image/png',clubs:{[club]:PNG}}));
 await p.setInputFiles('#logo-file',tmp+'/b.json'); await p.waitForTimeout(1200);
 st=await p.textContent('#logo-state'); ck(/2 of \d+ nations/.test(st)&&/1 of \d+ clubs/.test(st),'second import adds, does not replace: '+st);
 // screens
 await go('#/nations'); ck((await p.$$('.nr .nbadge')).length>=1,'nation list shows imported badges: '+(await p.$$('.nr .nbadge')).length);
 await go('#/nation/Mexico'); ck((await p.$$('h1')).length>0&&(await p.$$('.nbadge')).length>=1,'nation page uses the badge');
 await go('#/league/'+encodeURIComponent(lg)); ck((await p.$$('.lbox')).length>=1,'league page uses the league logo');
 await go('#/world'); await p.waitForTimeout(500);
 await go('#/world'); ck((await p.$$('.cc .lbox')).length>=1||(await p.$$('.cem .lbox')).length>=1,'competition hub uses imported competition logos');
 // edition year: drawn on a picture only when the file says so (yearSlots), four digits, centred in the ring
 ck(await p.evaluate(()=>!/<text/.test(logoBox('comps','Club World Cup',40,2029))),'no year drawn without yearSlots');
 fs.writeFileSync(tmp+'/d.json',JSON.stringify({format:'soccersim-logos',version:2,mime:'image/png',comps:{'Club World Cup':PNG},yearSlots:{'Club World Cup':'cwc','Gold Cup':'cwc','Atlantis':'cwc'}}));
 await go('#/start'); if(!(await p.$('#logo-file'))) await go('#/settings');
 await p.setInputFiles('#logo-file',tmp+'/d.json'); await p.waitForTimeout(1200);
 const yb=await p.evaluate(()=>({a:logoBox('comps','Club World Cup',40,2029),b:logoBox('comps','Club World Cup',40,0),c:logoBox('comps','UEFA Champions League',40,2029),slots:JSON.stringify(window.__LOGOS2.year)}));
 ck(/<text[^>]*>2029<\/text>/.test(yb.a)&&/x="750" y="745"/.test(yb.a),'Club World Cup draws a centred four digit year');
 ck(/>0000<\/text>|<img/.test(yb.b)||/<text/.test(yb.b),'year 0 does not break');
 ck(!/<text/.test(yb.c),'other competitions never get a year');
 ck(yb.slots==='{"Club World Cup":"cwc"}','only known competitions keep a year slot: '+yb.slots);
 await go('#/world'); await p.waitForTimeout(500); await go('#/world');
 ck((await p.$$('.lbox svg text')).length>=1,'competition hub shows the edition year on the Club World Cup logo');
 await p.screenshot({path:OUT+'/lg_1.png',fullPage:true});
 ck(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll');
 // a file with nothing recognisable is refused
 await go('#/start'); if(!(await p.$('#logo-file'))) await go('#/settings');
 fs.writeFileSync(tmp+'/c.json',JSON.stringify({format:'soccersim-logos',version:2,nations:{Atlantis:PNG}}));
 await p.setInputFiles('#logo-file',tmp+'/c.json'); await p.waitForTimeout(800);
 ck(/None of the names/.test(await p.innerText('body')),'unrecognised file is refused');
 // remove
 await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true)); await p.click('#logo-clear'); await p.waitForTimeout(800);
 ck(/No logo file imported/.test(await p.textContent('#logo-state')),'remove clears every section');
 await go('#/nations'); ck((await p.$$('.nr .nbadge')).length===0,'flags are back after removing');
 console.log('errors:',errs.slice(0,6));
 await b.close();
 console.log(bad.length||errs.length?'LOGOS UI FAIL':'LOGOS UI OK'); process.exit(bad.length||errs.length?1:0);
})();
