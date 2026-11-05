// Tournament screens at phone size: this-round card, group boxes, zoomable bracket, pre-match page, one-game sim.
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const idle=async()=>{await p.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:180000});await p.waitForTimeout(300);};
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500); if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 // sim 3 years (so qualifying is done and the World Cup year starts), then walk to the Champions League round of 16
 // Champions League page
 await p.evaluate(()=>location.hash='#/world'); await p.waitForTimeout(500);
 for(let i=0;i<30;i++){ await p.evaluate(async()=>{await api('/api/sim',{scope:'world',weeks:1});}).catch(()=>{}); const ready=await p.evaluate(async()=>{const g=await api('/api/games?comp=C:UEFA'); return g.ready&&g.total>0;}); if(ready) break; }
 await p.evaluate(()=>location.hash='#/comp/C:UEFA'); await p.waitForSelector('.round-card',{timeout:20000}); await p.waitForTimeout(800);
 console.log('round card:', (await p.innerText('.round-card')).replace(/\n/g,' | ').slice(0,200));
 console.log('bracket box:', !!(await p.$('.bk-box')), 'live ties:', await p.$$eval('.bk-tie.live',a=>a.length), 'play buttons:', await p.$$eval('.bk-play',a=>a.length));
 console.log('page overflow-x:', await p.evaluate(()=>[document.documentElement.scrollWidth, innerWidth]));
 await p.screenshot({path:OUT+'/t_cup.png'});
 // zoom controls
 const sc0=await p.evaluate(()=>document.querySelector('.bk').style.transform);
 await p.click('[data-z="+"]'); await p.click('[data-z="+"]'); const sc1=await p.evaluate(()=>document.querySelector('.bk').style.transform);
 await p.click('[data-z="fit"]'); const sc2=await p.evaluate(()=>document.querySelector('.bk').style.transform);
 console.log('zoom:',sc0,'->',sc1,'-> fit',sc2);
 await p.screenshot({path:OUT+'/t_cup_fit.png'});
 // preview a game and sim it
 await p.evaluate(()=>document.querySelectorAll('.round-card details').forEach(d=>d.open=true)); await p.click('.round-card a[href^="#/matchup"]'); await p.waitForSelector('#mu-gsim',{timeout:20000}); await p.waitForTimeout(500);
 console.log('matchup:', (await p.innerText('#view')).replace(/\n/g,' | ').slice(0,260));
 await p.screenshot({path:OUT+'/t_matchup.png'});
 await p.click('#mu-gsim'); await idle(); await p.waitForTimeout(800);
 console.log('after sim:', (await p.innerText('#view')).replace(/\n/g,' | ').slice(0,160));
 // sim the rest of the round with single games, then check the card moves on
 await p.evaluate(()=>location.hash='#/comp/C:UEFA'); await p.waitForSelector('.round-card');
 let n=0; while(await p.$('.round-card [data-gm]')&&n<12){ const lbl=await p.innerText('.round-card h3'); await p.evaluate(()=>document.querySelectorAll('.round-card details').forEach(d=>d.open=true)); await p.click('.round-card [data-gm]'); await idle(); n++; const l2=(await p.innerText('.round-card h3').catch(()=>'')); if(l2.split('\n')[0]!==lbl.split('\n')[0]) break; }
 console.log('single games played:',n,'| card now:', (await p.innerText('.round-card h3')).replace(/\n/g,' '));
 console.log('errors:',errs.slice(0,5));
 await b.close();
})();
