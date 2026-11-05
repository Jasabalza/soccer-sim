// v15 pages: world money, transfers bid detail, nation federation, rivalries (phone size).
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:6}); });
 const pages=[['money','#/money'],['ledger','#/ledger'],['nation','#/nation/Mexico'],['rivals','#/rivals']];
 for(const [k,h] of pages){
  await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(1500);
  console.log(k,'text',(await p.innerText('#view')).length,'| overflow-x',await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]));
  await p.screenshot({path:OUT+'/pg_'+k+'.png',fullPage:true});
 }
 const nb=await p.$$('.bidd'); console.log('bid details',nb.length); if(nb.length){ await nb[0].evaluate(e=>e.open=true); await p.screenshot({path:OUT+'/pg_bid.png',fullPage:true}); }
 await p.evaluate(()=>location.hash='#/rivals'); await p.waitForTimeout(800);
 for(const so of ['history','rising']){ const bt=await p.$(`[data-so="${so}"]`); if(bt){ await bt.click(); await p.waitForTimeout(800); console.log('sort',so,(await p.$$('.rvrow')).length,'rows'); } else console.log('no sort button',so); }
 console.log('errors:',errs.slice(0,6));
 await b.close();
})();
