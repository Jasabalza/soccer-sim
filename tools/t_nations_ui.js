// v15.1 nations list and nation page tabs (phone size).
// usage: node tools/t_nations_ui.js [outdir]     needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const go=async(h)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(1200); };
 const noScroll=async()=>await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 await p.evaluate(async()=>{ await api('/api/years',{n:3}); });
 await go('#/nations');
 ck((await p.$$('.nr')).length===25,'25 nations first: '+(await p.$$('.nr')).length);
 ck(await noScroll(),'list: no sideways scroll'); await p.screenshot({path:OUT+'/nt_1.png',fullPage:true});
 await p.click('#nl-more'); await p.waitForTimeout(300); ck((await p.$$('.nr')).length===50,'show 25 more -> 50');
 await p.fill('#nl-q','mex'); await p.waitForTimeout(300); const nm=await p.$$eval('.nr .nm b',e=>e.map(x=>x.textContent)); ck(nm.includes('Mexico')&&nm.length<5,'search finds Mexico: '+nm.join(','));
 await p.fill('#nl-q',''); await p.selectOption('#nl-sort','titles'); await p.waitForTimeout(300);
 const first=await p.$$eval('.nr .rt b',e=>e.map(x=>+x.textContent)); ck(first[0]>=first[1],'sorted by titles: '+first.slice(0,3));
 await p.click('[data-c="CONCACAF"]'); await p.waitForTimeout(1000); ck(/#\/nations\/CONCACAF/.test(await p.evaluate(()=>location.hash)),'confed chip');
 await go('#/nation/Mexico');
 ck((await p.$$('.pr')).length===11+1-1+0 || (await p.$$('.pr')).length===11,'squad shows the best eleven: '+(await p.$$('.pr')).length);
 const pos=await p.$$eval('.pr .p',e=>e.map(x=>x.textContent)); const cnt=(k)=>pos.filter(x=>x===k).length;
 ck(cnt('GK')===1&&cnt('DEF')===4&&cnt('MID')===3&&cnt('FWD')===3,'4-3-3 eleven: '+pos.join(','));
 ck(await noScroll(),'nation: no sideways scroll'); await p.screenshot({path:OUT+'/nt_2.png',fullPage:true});
 await p.click('#nt-more'); await p.waitForTimeout(300); ck((await p.$$('.pr')).length>11,'next players shown: '+(await p.$$('.pr')).length);
 await p.click('[data-nt="fed"]'); await p.waitForTimeout(400);
 ck((await p.$$('.v2 .stages div')).length===4,'federation stages'); ck((await p.$$('details.acc')).length>=3,'federation accordions: '+(await p.$$('details.acc')).length);
 const dets=await p.$$('.v2 details.acc'); for(const d of dets) await d.evaluate(e=>e.open=true);
 ck(await noScroll(),'federation: no sideways scroll'); await p.screenshot({path:OUT+'/nt_3.png',fullPage:true});
 await p.click('[data-nt="hon"]'); await p.waitForTimeout(400); ck(/trophy room/i.test(await p.innerText('#view')),'honours tab');
 console.log('errors:',errs.slice(0,6));
 await b.close();
 console.log(bad.length||errs.length?'NATIONS UI FAIL':'NATIONS UI OK'); process.exit(bad.length||errs.length?1:0);
})();
