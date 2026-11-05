// Club World Cup screen at phone size: groups with chips, knockout, qualification and prize cards.
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:1}); });      // season 2 holds the Club World Cup
 const id=await p.evaluate(async()=>{ const w=await api('/api/world'); const x=(w.summer||[]).find(x=>x.kind==='cwc'); return x&&x.id; });
 console.log('CWC id',id);
 await p.evaluate(async(id)=>{ await api('/api/sim',{comp:id,to_end:true,prereqs:true}).catch(()=>{}); },id);
 await p.evaluate(id=>location.hash='#/comp/'+id,id); await p.waitForTimeout(1200);
 console.log('tabs:', await p.$$eval('.tabs [data-t]',a=>a.map(x=>x.textContent+(x.classList.contains('on')?'*':''))));
 await p.click('.tabs [data-t="grp"]'); await p.waitForTimeout(300);
 console.log('chips:', await p.$$eval('#gchips [data-g]',a=>a.map(x=>x.textContent)).catch(()=>null));
 console.log('group boxes:', await p.$$eval('.gwrap',a=>a.length));
 await p.screenshot({path:OUT+'/cwc_groups.png'});
 await p.click('#gchips [data-g="2"]'); await p.waitForTimeout(200);
 console.log('visible after chip:', await p.$$eval('.gwrap',a=>a.filter(x=>!x.hidden).length));
 console.log('overflow-x:', await p.evaluate(()=>[document.documentElement.scrollWidth, innerWidth]));
 await p.screenshot({path:OUT+'/cwc_group_c.png'});
 await p.click('.tabs [data-t="ko"]'); await p.waitForTimeout(500);
 await p.screenshot({path:OUT+'/cwc_ko.png'});
 console.log('errors:',errs.slice(0,5));
 await b.close();
})();
