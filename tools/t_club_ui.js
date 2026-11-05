// v15 club page: Finance, Academy and Stadium tabs at phone size.
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:3}); });
 await p.evaluate(()=>location.hash='#/club/Manchester%20City'); await p.waitForSelector('#ct-tabs',{timeout:30000}); await p.waitForTimeout(600);
 for(const t of ['fin','acad','stad']){ await p.click(`#ct-tabs [data-ct="${t}"]`); await p.waitForTimeout(500); console.log(t,'text length',(await p.innerText('#ct-'+t)).length,'| overflow-x',await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth])); await p.screenshot({path:OUT+'/club_'+t+'.png',fullPage:true}); }
 console.log('errors:',errs.slice(0,5));
 await b.close();
})();
