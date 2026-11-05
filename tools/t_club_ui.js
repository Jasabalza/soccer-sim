// v15.1 club page at phone size: Overview, Squad (filters), Finance, Academy, Stadium and Honours tabs.
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[]; const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:3}); });
 await p.evaluate(()=>location.hash='#/club/Manchester%20City'); await p.waitForSelector('#ct-tabs',{timeout:30000}); await p.waitForTimeout(600);

 const ns=async()=>await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 ck((await p.$$('#ct-ov .pr')).length===5,'overview shows five key players'); ck(await ns(),'overview: no sideways scroll'); await p.screenshot({path:OUT+'/cl_1.png',fullPage:true});
 await p.click('#ct-tabs [data-ct="sq"]'); await p.waitForTimeout(400);
 const all=(await p.$$('#ct-sq .pr')).length; ck(all>=18,'squad lists everyone: '+all); await p.screenshot({path:OUT+'/cl_2.png',fullPage:true});
 await p.click('#ct-sq [data-pos="GK"]'); await p.waitForTimeout(300); const gk=await p.$$eval('#ct-sq .pr .p',e=>e.map(x=>x.textContent)); ck(gk.length>=2&&gk.every(x=>x==='GK'),'GK filter: '+gk.length);
 await p.click('#ct-sq [data-pos="ALL"]'); await p.selectOption('#sq-sort','age'); await p.selectOption('#sq-u','1'); await p.waitForTimeout(300);
 const ages=await p.$$eval('#ct-sq .pr .nm span',e=>e.map(x=>parseInt(x.textContent))); ck(ages.length>0&&ages.every(a=>a<23)&&ages.every((a,i)=>!i||a>=ages[i-1]),'under 23 sorted by age: '+ages.slice(0,6));
 ck(await ns(),'squad: no sideways scroll');
 await p.click('#ct-tabs [data-ct="hon"]'); await p.waitForTimeout(300); ck(/trophy room/i.test(await p.innerText('#ct-hon')),'honours tab');
 await p.click('#ct-tabs [data-ct="ov"]'); await p.waitForTimeout(300);
 for(const t of ['fin','acad','stad']){ await p.click(`#ct-tabs [data-ct="${t}"]`); await p.waitForTimeout(500); console.log(t,'text length',(await p.innerText('#ct-'+t)).length,'| overflow-x',await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth])); await p.screenshot({path:OUT+'/club_'+t+'.png',fullPage:true}); }
 console.log('errors:',errs.slice(0,5));
 await b.close();
 console.log(bad.length||errs.length?'CLUB UI FAIL':'CLUB UI OK'); process.exit(bad.length||errs.length?1:0);
})();
