// World Cup screens at phone size: groups, round card, locked bracket, then knockout play buttons.
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const idle=async()=>{await p.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:300000});await p.waitForTimeout(300);};
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500); if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 // three seasons forward, then step to the World Cup
 await p.evaluate(async()=>{ for(let i=0;i<3;i++) await api('/api/years',{n:1}); });
 let wc=null;
 for(let i=0;i<60&&!wc;i++){ wc=await p.evaluate(async()=>{ const w=await api('/api/world'); const ids=[...w.continents.flatMap(c=>c.comps.map(x=>x.id)),...(w.summer||[]).map(x=>x.id)]; const id=ids.find(x=>x.startsWith('WC:')); if(!id) return null; const g=await api('/api/games?comp='+encodeURIComponent(id)); return g.ready?id:null; }); if(!wc) await p.evaluate(async()=>{ await api('/api/sim',{scope:'world',weeks:1}); }); }
 console.log('WC id',wc);
 await p.evaluate(id=>location.hash='#/comp/'+id,wc); await p.waitForSelector('.round-card',{timeout:30000}); await p.waitForTimeout(800);
 console.log('tabs:', await p.$$eval('.tabs [data-t]',a=>a.map(x=>x.textContent+(x.classList.contains('on')?'*':''))));
 console.log('group boxes:', await p.$$eval('#gboxes .gwrap',a=>a.length), 'shown:', await p.$$eval('#gboxes .gwrap:not([hidden])',a=>a.length));
 console.log('overflow-x:', await p.evaluate(()=>[document.documentElement.scrollWidth, innerWidth]));
 await p.screenshot({path:OUT+'/wc_groups.png'});
 // play one whole group from the Groups tab (the card is only a summary now)
 await p.click('#gboxes .gwrap:not([hidden]) [data-gall]'); await idle();
 console.log('card now:',(await p.innerText('.round-card h3')).replace(/\n/g,' '));
 await p.screenshot({path:OUT+'/wc_after_md1.png'});
 console.log('errors:',errs.slice(0,5));
 await b.close();
})();
