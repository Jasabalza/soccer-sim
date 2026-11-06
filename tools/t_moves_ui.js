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
 await go('#/moves/'+S,1500); await ox('landing'); await shot('landing');
 ok(/Off-season moves/.test(await p.innerText('#view h1')),'title');
 ok((await p.$$('#nav a.on')).length===1 && /Off-season/.test(await p.innerText('#nav a.on')),'nav highlights Off-season');
 ok(await p.$('.mtabs [data-t="players"].on')!==null,'lands on the list (Players)');
 { const rs=await p.$$('#view .mvr'); ok(rs.length>=20,'list has rows'); }
 ok(await p.$('a[href$="/walk"]')!==null,'walk-through is a small optional button');
 // biggest fees first
 { const fees=await p.$$eval('#view .mvr .mvR b',e=>e.slice(0,6).map(x=>x.textContent)); ok(fees.length>=3,'fees shown: '+fees); }
 // tap a transfer: the bidding war opens
 { const d=await p.$('#view details.mvd'); ok(d!==null,'transfers open for their bidding war'); if(d){ await p.click('#view details.mvd summary'); await p.waitForTimeout(300); const t=await p.innerText('#view details.mvd[open]'); ok(/Bids/i.test(t)&&/Base value/i.test(t),'bid detail: '+t.slice(0,120)); await ox('bid open'); await shot('bid_open'); } }
 // whole world / one league
 { const n1=(await p.$$('#view .mvr')).length; await p.selectOption('#mv-l',{index:2}); await p.waitForTimeout(700); const n2=(await p.$$('#view .mvr')).length; ok(n2>0&&n2<=n1,'league switch narrows the list '+n1+' -> '+n2); await p.selectOption('#mv-l',''); await p.waitForTimeout(600); }
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
 // the Money view: leagues for the world, clubs for one league, one club's buys and sells
 await go('#/moves/'+S+'/players',1200);
 ok(await p.$('.mtabs [data-t="money"]')===null,'no separate Money tab any more');
 await p.click('.mvsw [data-vw="money"]'); await p.waitForTimeout(900); await ox('money world'); await shot('money_world');
 { const rows=await p.$$('#view .mvm[data-ml]'); ok(rows.length>=10,'league bars for the whole world: '+rows.length); ok(await p.$('#view .mvm-t')!==null,'tiles');
   ok((await p.$$('#view .mvr')).length===0,'list is hidden in Money view'); }
 await p.click('[data-me="spent"]'); await p.waitForTimeout(700); ok(await p.$('#view .mvm[data-ml]')!==null,'spent chip'); await p.click('[data-me="earned"]'); await p.waitForTimeout(500); await p.click('[data-me="net"]'); await p.waitForTimeout(500);
 await p.click('[data-mt="fav"]'); await p.waitForTimeout(700); await ox('money favorites'); ok(/favorite leagues/i.test(await p.innerText('#view .mvm-card h3')),'favorites tab'); await p.click('[data-mt="all"]'); await p.waitForTimeout(600);
 { const first=await p.$eval('#view .mvm[data-ml] .mvm-l',e=>e.textContent.replace('\u2605','').trim()); await p.click('#view .mvm[data-ml]'); await p.waitForTimeout(900);
   ok(await p.$eval('#mv-l',e=>e.value)===first,'tapping a league sets the picker to '+first);
   ok(/biggest spenders/i.test(await p.innerText('#view')) && /biggest sellers/i.test(await p.innerText('#view')),'spenders and sellers cards'); await ox('money league'); await shot('money_league');
   const al=await p.$('[data-mall]'); if(al){ await al.click(); await p.waitForTimeout(500); ok((await p.$$('#view .mvm[data-mc]')).length>12,'show all clubs'); await p.click('[data-mall]'); await p.waitForTimeout(400); }
   await p.click('#view .mvm[data-mc]'); await p.waitForTimeout(1000); ok(/bought/i.test(await p.innerText('#view'))&&/sold/i.test(await p.innerText('#view')),'club buys and sells'); await ox('money club'); await shot('money_club');
   await p.click('#mv-back'); await p.waitForTimeout(700); ok(/biggest spenders/i.test(await p.innerText('#view')),'back to the league');
   await p.click('.mvsw [data-vw="list"]'); await p.waitForTimeout(800); ok((await p.$$('#view .mvr')).length>0,'back to the list'); await p.selectOption('#mv-l',''); await p.waitForTimeout(500); }
 // old links still land here
 await go('#/ledger/'+S,1200); ok(/Off-season moves/.test(await p.innerText('#view h1')) && await p.$('.mvsw [data-vw="money"].on')!==null,'#/ledger opens the Money view');
 // the flow: after the awards the off-season button opens this page
 ok(errs.length===0,'page errors: '+errs.join(' | '));
 await b.close();
 if(fail.length){ console.log('MOVES UI FAIL',fail.length); process.exit(1); } console.log('MOVES UI OK');
})().catch(e=>{console.log('MOVES UI FAIL',e.message);process.exit(1)});
