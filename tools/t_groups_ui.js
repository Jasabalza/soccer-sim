// v15.1 group stage UI at phone size: a summary card, one group at a time on the Groups tab, Sim / Sim whole group,
// knockout waits for every group. usage: KIND=cwc|wc node tools/t_groups_ui.js [outdir]
const {chromium,devices}=require('playwright');
const URL='http://localhost:8791/test_artifact.html';
const KIND=process.env.KIND||'cwc';
(async()=>{
 const b=await chromium.launch(); const errs=[], bad=[];
 const c=await b.newContext({...devices['Pixel 7'],deviceScaleFactor:1}); const p=await c.newPage();
 p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
 const ck=(ok,msg)=>{ if(!ok) bad.push(msg); console.log(ok?'ok  ':'FAIL',msg); };
 const idle=async()=>{await p.waitForFunction(()=>document.querySelector('#busy').hidden,null,{timeout:300000});await p.waitForTimeout(400);};
 const OUT=process.argv[2]||'.';
 await p.goto(URL); await p.waitForTimeout(800); await p.click('#go-new'); await p.waitForSelector('#nav a'); await p.waitForTimeout(500);
 if(await p.$('#fp-cancel')){ await p.click('#fp-cancel'); await p.waitForTimeout(300); }
 // forward to the summer tournament (Club World Cup in season 2, World Cup in season 4) with its group stage ready
 let id=null;
 for(let y=0;y<5&&!id;y++){
  await p.evaluate(async()=>{ await api('/api/years',{n:1}); });
  for(let i=0;i<80&&!id;i++){
   id=await p.evaluate(async(k)=>{ const w=await api('/api/world'); const t=(w.summer||[]).find(x=>x.kind===k); if(!t) return null; const g=await api('/api/games?comp='+encodeURIComponent(t.id)).catch(()=>null); return g&&g.ready&&g.groups_all?t.id:null; },KIND);
   if(!id){ const st=await p.evaluate(async()=>{ const s=await api('/api/status'); return s.header.done; }); if(st) break; await p.evaluate(async()=>{ await api('/api/sim',{scope:'world',weeks:1}); }); }
  }
 }
 ck(!!id,'found the '+KIND+' group stage: '+id);
 await p.evaluate(id=>location.hash='#/comp/'+id,id); await p.waitForSelector('.round-card',{timeout:30000}); await p.waitForTimeout(800);
 ck(/Group stage/.test(await p.innerText('.round-card h3')),'summary card: '+(await p.innerText('.round-card h3')).replace(/\n/g,' '));
 ck((await p.$$('.round-card .fix2')).length===0,'no long game list in the card');
 ck(await p.$eval('.tabs [data-t="grp"]',e=>e.classList.contains('on')),'opens on the Groups tab');
 const sel=await p.$$eval('#gchips .on',a=>a.map(x=>x.dataset.g)); ck(sel.length===1&&sel[0]!=='all','a group is selected: '+sel);
 const visible=async()=>await p.$$eval('#gboxes .gwrap',a=>a.filter(x=>!x.hidden).length);
 ck(await visible()===1,'one group shown');
 ck((await p.$$('#gboxes .gwrap:not([hidden]) .ggames .fix2')).length===6,'six games listed for the group');
 await p.screenshot({path:OUT+'/grp_1.png',fullPage:true});
 // one game
 await p.click('#gboxes .gwrap:not([hidden]) .ggames [data-gm]'); await idle();
 ck((await p.$$('#gboxes .gwrap:not([hidden]) .ggames [data-gm]')).length===5,'five games left after one Sim');
 ck(await visible()===1,'still on the same group after a Sim');
 // a whole group, later matchdays included
 await p.click('#gboxes .gwrap:not([hidden]) [data-gall]'); await idle();
 ck((await p.$$('#gboxes .gwrap:not([hidden]) .ggames [data-gm]')).length===0,'whole group played');
 const chipDone=await p.$$eval('#gchips [data-g]',a=>a.filter(x=>/✓/.test(x.textContent)).length); ck(chipDone===1,'finished group is ticked: '+chipDone);
 ck(/Group stage/.test(await p.innerText('.round-card h3')),'knockout has not started (still the group summary)');
 ck((await p.$eval('.round-card h3 small',e=>e.textContent))!==undefined,'progress: '+await p.$eval('.round-card h3 small',e=>e.textContent));
 await p.screenshot({path:OUT+'/grp_2.png',fullPage:true});
 // All shows tables only
 await p.click('#gchips [data-g="all"]'); await p.waitForTimeout(300);
 ck((await visible())>4 && (await p.$$('#gboxes .gwrap:not([hidden]) .ggames:not([hidden])')).length===0,'All view: tables only');
 ck(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll');
 // the rest of the groups, then the knockout appears
 const n=await p.$$eval('#gchips [data-g]',a=>a.length-1);
 for(let i=0;i<n;i++){ await p.click('#gchips [data-g="'+i+'"]'); await p.waitForTimeout(200); const g=await p.$('#gboxes .gwrap:not([hidden]) [data-gall]'); if(g){ await g.click(); await idle(); } }
 await p.waitForTimeout(500);
 const head=(await p.innerText('.round-card h3').catch(()=>'')).replace(/\n/g,' ');
 ck(!/Group stage/.test(head),'after every group the round card moves on: '+head);
 ck(await p.evaluate(async(id)=>{ const x=await api('/api/comp?id='+encodeURIComponent(id)); return (x.bracket.ties||[]).length>0||x.bracket.rounds.length>0; },id),'knockout bracket exists');
 console.log('errors:',errs.slice(0,6));
 await b.close();
 console.log(bad.length||errs.length?'GROUPS UI FAIL':'GROUPS UI OK'); process.exit(bad.length||errs.length?1:0);
})();
