const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
async function ctxWith(b, init){const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1,permissions:[]});if(init)await c.addInitScript(init);return c;}
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const idle=async(p)=>{await p.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:120000});await p.waitForTimeout(300);};
 const hook=(p)=>{p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});};
 // A: normal IndexedDB
 let c=await ctxWith(b); let p=await c.newPage(); hook(p);
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(400);
 await p.click('#sb-years'); await idle(p); await p.evaluate(()=>closeModal());
 await p.click('#sb-save'); await p.waitForSelector('#save-name'); await p.waitForTimeout(300);
 console.log('A note:', (await p.innerText('#store-note')).replace(/\n/g,' ').slice(0,120));
 await p.fill('#save-name','alpha'); await p.click('#save-go'); await p.waitForTimeout(1200); console.log('A toast:',await p.textContent('#toast'));
 await p.click('#sb-save'); await p.waitForSelector('#save-name'); await p.waitForTimeout(400);
 console.log('A rows:', await p.$$eval('#save-list .row',a=>a.map(x=>x.innerText.replace(/\n/g,' ').slice(0,70))));
 // copy -> textarea fallback (clipboard denied in headless)
 await p.click('[data-copy="alpha"]'); await p.waitForTimeout(1500);
 let text=await p.evaluate(()=>{const t=document.querySelector('#copy-text');return t?t.value:null});
 console.log('A copy text len:', text&&text.length, text&&text.slice(0,10));
 await p.screenshot({path:'ui_save.png'});
 await c.close();
 // B: new browser profile imports the text, then loads it
 c=await ctxWith(b); p=await c.newPage(); hook(p); await p.goto(URL); await p.waitForTimeout(800);
 await p.evaluate(t=>{document.querySelector('#imp-text').value=t;},text); await p.evaluate(()=>{document.querySelector('details').open=true});
 await p.fill('#imp-name','fromtext'); await p.click('#imp-go'); await p.waitForTimeout(2000);
 console.log('B rows:', await p.$$eval('#save-list .row',a=>a.map(x=>x.innerText.replace(/\n/g,' ').slice(0,60))));
 await p.click('[data-load="fromtext"]'); await p.waitForSelector('#nav a',{timeout:30000}); await p.waitForTimeout(500);
 console.log('B season:', await p.textContent('#season-info'));
 await p.evaluate(()=>closeModal()); await p.evaluate(()=>location.hash='#/ceremony'); await p.waitForTimeout(800);
 console.log('B awards bar visible:', await p.evaluate(()=>{const r=document.querySelector('#aw-bar').getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom),innerHeight]}));
 await p.click('#aw-next'); await p.click('#aw-next'); await p.waitForTimeout(500); console.log('B count:', await p.textContent('#aw-count')); await p.click('#aw-back'); console.log('B back count:', await p.textContent('#aw-count'));
 await p.screenshot({path:'ui_awards.png'});
 await c.close();
 // C: IndexedDB removed -> localStorage fallback
 c=await ctxWith(b,()=>{try{Object.defineProperty(window,'indexedDB',{value:undefined})}catch(e){}}); p=await c.newPage(); hook(p); await p.goto(URL); await p.waitForTimeout(800);
 await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(400);
 await p.click('#sb-save'); await p.waitForSelector('#save-name'); await p.waitForTimeout(300); console.log('C note:', (await p.innerText('#store-note')).replace(/\n/g,' ').slice(0,110));
 await p.fill('#save-name','small'); await p.click('#save-go'); await p.waitForTimeout(1200); console.log('C toast:',await p.textContent('#toast'));
 await p.reload(); await p.waitForTimeout(1000); console.log('C after reload rows:', await p.$$eval('#save-list .row',a=>a.map(x=>x.innerText.replace(/\n/g,' ').slice(0,50))));
 await c.close();
 // D: nothing available -> memory only, clear warning
 c=await ctxWith(b,()=>{try{Object.defineProperty(window,'indexedDB',{value:undefined});Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})}catch(e){}}); p=await c.newPage(); hook(p); await p.goto(URL); await p.waitForTimeout(800);
 await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(400);
 await p.click('#sb-save'); await p.waitForSelector('#save-name'); await p.waitForTimeout(300); console.log('D note:', (await p.innerText('#store-note')).replace(/\n/g,' ').slice(0,200));
 console.log('errors:',errs); await b.close();
})();
