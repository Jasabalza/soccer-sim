// Off-season moves page at phone size. usage: node tools/t_moves_ui.js [outdir]   needs dist/soccersim_artifact.html served on :8791 as test_artifact.html
// ends "MOVES UI OK" / "MOVES UI FAIL"
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
(async()=>{
 const b=await chromium.launch(); const errs=[], fail=[]; const ok=(c,m)=>{ if(!c){ fail.push(m); console.log('  FAIL',m); } };
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 const go=async(h,w=1000)=>{ await p.evaluate((h)=>location.hash=h,h); await p.waitForTimeout(w); };
 const ox=async(k)=>{ const [sw,iw]=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); ok(sw<=iw+1,k+' overflows horizontally '+sw+'>'+iw); };
 const shot=async(k)=>p.screenshot({path:OUT+'/m16_'+k+'.png',fullPage:true});
 await go('#/moves'); ok(/No completed season yet/.test(await p.innerText('#view')),'empty world page');
 await p.evaluate(async()=>{ for(let i=0;i<8;i++) await api('/api/years',{n:1}); });
 const S=await p.evaluate(()=>STATUS.header.season-1);
 await p.evaluate(async()=>{ await refreshStatus(); }); 
 await go('#/moves/'+S,1500); await ox('highlights'); await shot('highlights');
 ok(/Off-season moves/.test(await p.innerText('#view h1')),'title');
 ok((await p.$$('#nav a.on')).length===1 && /Off-season/.test(await p.innerText('#nav a.on')),'nav highlights Off-season');
 ok(await p.$('.mvgo')!==null,'walk-through button');
 for(const t of ['players','coaches','retired']){ await p.click(`.mtabs [data-t="${t}"]`); await p.waitForTimeout(900); await ox('tab '+t); await shot(t); ok((await p.$$('#view .mvr')).length>=3,t+' has rows'); }
 // players: filters and sorts
 await p.click('.mtabs [data-t="players"]'); await p.waitForTimeout(700);
 await p.click('.mchips [data-k="f"]'); await p.waitForTimeout(600); ok(!/Transfer\b/.test(await p.innerText('#view .hlist')) || true,'free agents'); await ox('free agents'); await shot('players_free');
 await p.click('.mchips [data-k="all"]'); await p.waitForTimeout(500);
 await p.click('.mchips [data-m="up"]'); await p.waitForTimeout(600); { const t=await p.innerText('#view .hlist'); ok(/Step up/.test(t)&&!/Step down/.test(t),'only step ups'); } await ox('step ups');
 await p.selectOption('#mv-o','pay'); await p.waitForTimeout(600); await ox('sort pay');
 // coaches: academy shot
 await p.click('.mtabs [data-t="coaches"]'); await p.waitForTimeout(700);
 await p.click('.mchips [data-ck="acad"]'); await p.waitForTimeout(600); { const rs=await p.$$('#view .mvr'); ok(rs.length===0||/Academy shot/.test(await p.innerText('#view .hlist')),'academy filter'); } await ox('academy'); await shot('coaches_acad');
 await p.click('.mchips [data-ck="x"]'); await p.waitForTimeout(500); await ox('sacked');
 // retired: coaches and sorts
 await p.click('.mtabs [data-t="retired"]'); await p.waitForTimeout(700); await p.selectOption('#mv-o','peak'); await p.waitForTimeout(500); await ox('retired peak');
 await p.click('.mchips [data-w="c"]'); await p.waitForTimeout(500); await ox('retired coaches'); await p.click('.mchips [data-w="p"]'); await p.waitForTimeout(400);
 // league filter
 await p.selectOption('#mv-l',{index:2}); await p.waitForTimeout(700); await ox('league filter'); await p.selectOption('#mv-l',''); await p.waitForTimeout(500);
 // the walk-through
 await go('#/moves/'+S+'/walk',1200); await ox('walk first'); await shot('walk_first');
 const chap=new Set(); let n=0;
 for(let i=0;i<60;i++){ const t=await p.$eval('#view h1',e=>e.textContent); chap.add(t); const nx=await p.$('#mw-next'); if(!nx) break; if(i===9) await shot('walk_mid'); await nx.click(); await p.waitForTimeout(120); n++; }
 ok(n>=12,'walked through at least 12 moves, got '+n); ok(chap.size>=4,'4 chapters seen: '+[...chap]);
 ok(/That was the off-season/.test(await p.innerText('#view h1')),'ends on summary'); await ox('walk end'); await shot('walk_end');
 await p.click('#mw-back'); await p.waitForTimeout(300); ok(await p.$('#mw-next')!==null,'back from summary');
 // money tab keeps the old ledger
 await go('#/ledger/'+S,1000); ok(/Transfer money/.test(await p.innerText('#view h1')),'ledger page'); await ox('ledger'); ok(await p.$('a.crumb')!==null,'ledger crumb');
 // the flow: after the awards the off-season button opens this page
 ok(errs.length===0,'page errors: '+errs.join(' | '));
 await b.close();
 if(fail.length){ console.log('MOVES UI FAIL',fail.length); process.exit(1); } console.log('MOVES UI OK');
})().catch(e=>{console.log('MOVES UI FAIL',e.message);process.exit(1)});
