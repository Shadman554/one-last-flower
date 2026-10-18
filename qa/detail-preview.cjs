const {chromium}=require('C:/Users/NAMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
 const {createGameServer}=await import('../server.mjs');
 const server=createGameServer({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  await fs.mkdir('qa/performance',{recursive:true});
  const context=await browser.newContext({viewport:{width:450,height:800},recordVideo:{dir:'qa/performance/video',size:{width:450,height:800}}});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/game.js',async r=>r.fulfill({contentType:'text/javascript',body:await fs.readFile('game.js','utf8')+'\nwindow.previewScene=async(scene,line=0)=>{await ensureSceneAssets(scene);state.scene=scene;state.dialogueIndex=line;state.sceneTime=0;state.bouquet=true;state.collected=[0,1,2,3];renderUI();};'}));
  await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForSelector('#loading',{state:'detached'});
  await p.waitForTimeout(10000);
  await p.evaluate(()=>previewScene('LOVE_RATING'));
  assert.equal(await p.locator('.rating-note').innerText(),'Your choice is important to me');
  await p.screenshot({path:'qa/performance/updated-rating.png'});
  await p.getByRole('slider').focus();await p.keyboard.press('ArrowLeft');
  assert.equal(await p.locator('.toast').innerText(),'Nice try. Not happening you cant reduce😂');
  await p.screenshot({path:'qa/performance/updated-toast.png'});
  await p.waitForTimeout(3200);
  for(const [scene,line,name] of [['LOVE_REVEAL',0,'tearful-reaction'],['LOVE_REVEAL',1,'playful-pout'],['AFTER_RATING',2,'miss-you'],['DATE_CONFIRMATION',1,'happy-reaction']]){
   await p.evaluate(([s,l])=>previewScene(s,l),[scene,line]);await p.waitForTimeout(1300);
   await p.screenshot({path:`qa/performance/${name}.png`});
   if(scene==='LOVE_REVEAL')assert.equal(await p.getByRole('button',{name:'try another number',exact:true}).count(),1);
  }
  await p.evaluate(()=>previewScene('FINAL'));await p.waitForTimeout(3000);
  assert.deepEqual(errors,[]);await context.close();await p.video().saveAs('qa/performance/animation-preview.webm');
  console.log('PASS: updated text, original pose previews, butterfly motion video, no browser errors.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})();
