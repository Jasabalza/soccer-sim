const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,250))});
 const idle=async()=>{await p.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:120000});await p.waitForTimeout(400);};
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(400);
 await p.evaluate(()=>location.hash='#/league/La%20Liga'); await p.waitForSelector('[data-fx]'); 
 console.log('fixtures:', await p.$$eval('.fix2',a=>a.length), 'derbies:', await p.$$eval('.fx-m .tag',a=>a.map(x=>x.textContent)));
 // find the El Clasico row (or any) and open preview
 await p.screenshot({path:'ui_fx.png'});
 const link=await p.$$eval('.fx-m a',a=>a.map(x=>x.getAttribute('href')));
 await p.evaluate(h=>location.hash=h,link[0]); await p.waitForSelector('.odds'); await p.waitForTimeout(300);
 console.log('preview title:', await p.textContent('h1'), '| notebox:', (await p.$$eval('.notebox b',a=>a.map(x=>x.textContent))));
 await p.screenshot({path:'ui_preview.png'});
 // sim this game from preview
 await p.click('#mu-sim'); await idle(); await p.waitForTimeout(500);
 console.log('after sim h1/score:', await p.textContent('h1'), await p.$$eval('.card div',a=>a.map(x=>x.textContent).filter(t=>/^\d+ - \d+$/.test(t))));
 // back to league: one game should be done; sim another chosen game (last one)
 await p.evaluate(()=>location.hash='#/league/La%20Liga'); await p.waitForSelector('[data-fx]'); await p.waitForTimeout(300);
 const btns=await p.$$('[data-fx]'); console.log('open games:',btns.length); await btns[btns.length-1].click(); await idle(); await p.waitForTimeout(400);
 console.log('played now:', await p.$$eval('.fix .s',a=>a.map(x=>x.textContent).filter(t=>t!=='v').length));
 // rivalries page and club page
 await p.evaluate(()=>location.hash='#/rivals'); await p.waitForSelector('.rvrow'); console.log('rivals rows:', await p.$$eval('.rvrow',a=>a.length), '| first:', await p.$eval('.rvrow',e=>e.innerText.replace(/\n/g,' / ').slice(0,160))); await p.screenshot({path:'ui_rivals.png'});
 await p.click('[data-ty=nations]'); await p.waitForFunction(()=>document.querySelector('[data-ty=nations].on')); console.log('nation rows:', await p.$$eval('.rvrow',a=>a.length), '| first:', await p.$eval('.rvrow',e=>e.innerText.replace(/\n/g,' / ').slice(0,160))); await p.screenshot({path:'ui_rivals_nat.png'});
 await p.selectOption('#rv-scope','CONMEBOL'); await p.waitForTimeout(500); console.log('CONMEBOL rows:', await p.$$eval('.rvrow',a=>a.length));
 await p.selectOption('#rv-sort','meetings'); await p.waitForTimeout(500);
 await p.click('[data-ty=clubs]'); await p.waitForFunction(()=>document.querySelector('[data-ty=clubs].on')); await p.selectOption('#rv-scope','L:La Liga'); await p.waitForTimeout(500); console.log('La Liga rows:', await p.$$eval('.rvrow',a=>a.length), 'overflow-x:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await p.click('[data-st=rising]'); await p.waitForTimeout(500); console.log('rising rows:', await p.$$eval('.rvrow',a=>a.length));
 await p.evaluate(()=>{});
 await p.click('[data-st=all]'); await p.selectOption('#rv-scope','world'); await p.waitForTimeout(500); await p.fill('#rv-q','real madrid'); await p.waitForTimeout(1200); console.log('search rows:', await p.$$eval('.rvrow',a=>a.length), '| more btn:', !!(await p.$('#rv-more')));
 await p.fill('#rv-q',''); await p.waitForTimeout(1200);
 await p.evaluate(()=>location.hash='#/club/Real%20Madrid'); await p.waitForTimeout(800); console.log('club rivals text:', (await p.innerText('#view')).split('Rivals')[1]?.slice(0,200).replace(/\n/g,' | '));
 // rename
 await p.evaluate(()=>location.hash='#/matchup/-/Real%20Madrid/FC%20Barcelona'); await p.waitForSelector('#rv-rename'); await p.click('#rv-rename'); await p.fill('#rv-name','The Big One'); await p.click('#rv-save'); await p.waitForTimeout(800);
 console.log('renamed banner:', await p.$$eval('.notebox b',a=>a.map(x=>x.textContent)));
 // a season, then save/load keeps rivalry state
 await p.click('#sb-years'); await idle(); await p.evaluate(()=>closeModal());
 await p.click('#sb-save'); await p.waitForSelector('#save-name'); await p.fill('#save-name','rv'); await p.click('#save-go'); await p.waitForTimeout(1500);
 await p.reload(); await p.waitForTimeout(1200); await p.click('[data-load="rv"]'); await p.waitForSelector('#nav a',{timeout:30000}); await p.waitForTimeout(500);
 await p.evaluate(()=>location.hash='#/matchup/-/Real%20Madrid/FC%20Barcelona'); await p.waitForSelector('.odds'); console.log('after load banner:', await p.$$eval('.notebox b',a=>a.map(x=>x.textContent)), '| h2h numbers:', await p.$$eval('.h2h-n b',a=>a.map(x=>x.textContent)));
 console.log('errors:',errs); await b.close();
})();
