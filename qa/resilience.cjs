const {chromium}=require('C:/Users/NAMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createGameServer}=await import('../server.mjs');
 const server=createGameServer({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
   Object.defineProperty(crypto,'randomUUID',{value:undefined});
  });
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url);await p.waitForSelector('#loading',{state:'detached'});
  const click=name=>p.getByRole('button',{name,exact:true}).click();
  await click('Start');await click('Next');await p.getByRole('button',{name:'Jump',exact:true}).waitFor();
  await p.waitForTimeout(250);
  await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);
  await p.evaluate(()=>dispatchEvent(new Event('blur')));await p.keyboard.up('ArrowRight');
  let s=await p.evaluate(()=>gameDebug.snapshot());assert(s.paused);
  await p.waitForTimeout(250);assert.equal((await p.evaluate(()=>gameDebug.snapshot())).x,s.x);
  await click('Resume');await p.waitForTimeout(250);assert.equal((await p.evaluate(()=>gameDebug.snapshot())).x,s.x);
  await click('Pause game');await click('Start again');await click('Start');
  await p.getByRole('button',{name:'Next',exact:true}).waitFor();assert.deepEqual(errors,[]);
  await p.close();
  const broken=await browser.newPage();await broken.route('**/assets/manifest.json',r=>r.fulfill({status:503,body:'Unavailable'}));
  await broken.goto(url);await broken.getByText('The garden could not load. Please refresh the page.').waitFor();
  console.log('PASS: blocked storage, UUID fallback, reduced motion, blur pause, released controls, restart, and friendly asset-load failure.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})();
