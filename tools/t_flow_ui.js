// v15.1 season loop in the UI (phone size): stepper, Wrap up -> Awards -> Transfers -> next season.
// usage: node tools/t_flow_ui.js [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 const ck=(ok,msg)=>{ if(!ok){ bad.push(msg); } console.log(ok?'ok  ':'FAIL',msg); };
 const step=async()=>(await p.innerText('#flowbar .on')).replace(/\s+/g,' ').trim();
 const main=async()=>(await p.$$eval('#simbar .main',e=>e.map(x=>x.textContent.trim()))).join(' | ');
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 ck(await step()==='Season','starts on Season: '+await step());
 ck((await main()).includes('Next week'),'season buttons: '+await main());
 await p.screenshot({path:OUT+'/flow_1.png'});
 // play the leagues out, then see the bar change
 let seen=new Set();
 for(let i=0;i<40;i++){ const st=await p.evaluate(()=>STATUS.header.phase); seen.add(st); if(st==='done') break; await p.click('#sb-end'); await p.waitForTimeout(1500); }
 ck(await p.evaluate(()=>STATUS.header.phase)==='done','season finished: '+[...seen].join('>'));
 ck((await main()).startsWith('Wrap up season 1'),'wrap-up button: '+await main());
 ck((await step())==='Awards','stepper waits on Awards: '+await step());
 await p.screenshot({path:OUT+'/flow_2.png'});
 await p.click('#sb-roll'); await p.waitForTimeout(2500);
 ck(/#\/ceremony\/1/.test(await p.evaluate(()=>location.hash)),'wrap up opens the ceremony: '+await p.evaluate(()=>location.hash));
 ck(await step()==='Awards','stepper on Awards: '+await step());
 ck((await main()).includes('Continue to transfers'),'awards buttons: '+await main());
 await p.screenshot({path:OUT+'/flow_3.png'});
 await p.click('#sb-tr'); await p.waitForTimeout(1500);
 ck(/#\/ledger\/1/.test(await p.evaluate(()=>location.hash)),'continue opens the transfers: '+await p.evaluate(()=>location.hash));
 ck(await step()==='Transfers','stepper on Transfers: '+await step());
 ck((await main()).includes('Start season 2'),'transfer buttons: '+await main());
 ck((await p.innerText('#view')).length>200,'transfer page has content');
 await p.screenshot({path:OUT+'/flow_4.png'});
 await p.click('#sb-next'); await p.waitForTimeout(1500);
 ck(/#\/world/.test(await p.evaluate(()=>location.hash)),'start season opens the world: '+await p.evaluate(()=>location.hash));
 ck(await step()==='Season','back on Season: '+await step());
 ck((await main()).includes('Next week'),'season buttons again: '+await main());
 ck(await p.evaluate(()=>[document.documentElement.scrollWidth<=innerWidth+1,document.documentElement.scrollWidth,innerWidth]).then(a=>a[0]),'no sideways scroll');
 console.log('errors:',errs.slice(0,6));
 await b.close();
 console.log(bad.length||errs.length?'FLOW UI FAIL':'FLOW UI OK'); process.exit(bad.length||errs.length?1:0);
})();
