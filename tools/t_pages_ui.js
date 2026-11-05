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
 for(const so of ['history','rising']){ await p.selectOption('#rv-sort',so); await p.waitForTimeout(800); console.log('sort',so,(await p.$$('.rvrow')).length,'rows'); }
 // transfers: league filter and all seasons
 await p.evaluate(()=>location.hash='#/ledger'); await p.waitForTimeout(900);
 await p.selectOption('#t-l','Premier League'); await p.waitForTimeout(900);
 console.log('PL season rows',(await p.$$('.fee')).length,'| title:',(await p.innerText('h1')).replace(/\n/g,' '),'| stat tiles',(await p.$$('.quick .stat')).length);
 await p.selectOption('#t-s','all'); await p.waitForTimeout(900);
 console.log('PL all-seasons rows',(await p.$$('.fee')).length); await p.screenshot({path:OUT+'/pg_ledger_pl.png',fullPage:true});
 await p.click('[data-tl="La Liga"]'); await p.waitForTimeout(900); console.log('tapped La Liga ->',(await p.innerText('h1')).replace(/\n/g,' '));
 console.log('errors:',errs.slice(0,6));
 await b.close();
})();
