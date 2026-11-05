const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1280,height:800}}); const p=await c.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,250))});
 await p.goto('file://'+__dirname+'/../dist/soccersim_pc.html'); await p.waitForTimeout(1000);
 await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 await p.click('#sb-save'); await p.waitForSelector('#save-name'); await p.waitForTimeout(300);
 console.log('note:', (await p.innerText('#store-note')).replace(/\n/g,' ').slice(0,100));
 await p.fill('#save-name','pc1'); await p.click('#save-go'); await p.waitForTimeout(1500);
 await p.click('#sb-save'); await p.waitForSelector('[data-file]'); 
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-file="pc1"]')]); console.log('download:',dl.suggestedFilename());
 await dl.saveAs('/tmp/pc1.sav'); console.log('size KB',require('fs').statSync('/tmp/pc1.sav').size/1024|0);
 console.log('errors:',errs); await b.close();
})();
