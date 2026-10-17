const {chromium}=require('C:/Users/NAMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
(async()=>{
 const {createGameServer}=await import('../server.mjs');
 const {RATINGS,REACTIONS,LINES}=await import('../story.js');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'flower-browser-')),database=path.join(dir,'test.sqlite');
 const server=createGameServer({database});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext({viewport:{width:450,height:800},deviceScaleFactor:1,timezoneId:'Asia/Baghdad'});
 if(process.env.FLOW_CAPTURE_ONLY)await context.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined}));
 const p=await context.newPage(),errors=[],posts=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()==='POST')posts.push(r.postDataJSON());});
 await fs.mkdir('qa/final',{recursive:true});
 const snap=()=>p.evaluate(()=>gameDebug.snapshot());
 const rows=()=>{const db=new DatabaseSync(database);const result=db.prepare('SELECT * FROM meeting_dates').all();db.close();return result;};
 const screenshot=name=>p.screenshot({path:`qa/final/${name}.png`});
 const waitScene=async scene=>{await p.waitForFunction(s=>gameDebug.snapshot().scene===s,scene);await p.waitForTimeout(280);};
 const click=name=>p.getByRole('button',{name,exact:true}).click();
 const text=()=>p.locator('.card-copy').evaluate(n=>{const copy=n.cloneNode(true);for(const im of copy.querySelectorAll('img'))im.replaceWith(im.alt);return copy.textContent;});
 async function moveTo(x){const s=await snap(),key=s.x<x?'ArrowRight':'ArrowLeft';await p.keyboard.down(key);await p.waitForFunction(({x,dir})=>dir>0?gameDebug.snapshot().x>=x:gameDebug.snapshot().x<=x,{x,dir:s.x<x?1:-1},{timeout:15000});await p.keyboard.up(key);}
 async function through(scene,nextScene,capture){await waitScene(scene);for(let i=0;i<LINES[scene].length;i++){assert.equal(await text(),LINES[scene][i]);if(capture)await screenshot(`${capture}-${i+1}`);await click('Next');}await waitScene(nextScene);}
 async function play(){
  await click('Start');await waitScene('INTRO');assert.equal(await text(),LINES.INTRO[0]);await screenshot('intro');await click('Next');await waitScene('FLOWER_COLLECTION');await screenshot('gameplay');
  await click('Pause game');let s=await snap();assert(s.paused);await screenshot('pause');await p.waitForTimeout(200);assert.equal((await snap()).time,s.time);await click('Resume');
  const settle=async y=>p.waitForFunction(y=>{const s=gameDebug.snapshot();return s.grounded&&s.y===y&&s.lock<=0;},y,{timeout:15000});
  const jumpTo=async(x,y)=>{await p.waitForFunction(()=>{const s=gameDebug.snapshot();return s.grounded&&s.lock<=0;});await p.keyboard.press('Space');await moveTo(x);if(y!==null)await settle(y);};
  const groundStep=async(x,y)=>{await moveTo(x);await p.waitForFunction(()=>{const s=gameDebug.snapshot();return s.grounded&&s.lock<=0;});if((await snap()).y!==y)await jumpTo(x,y);};
  // Walking the entire route on the grass must no longer collect any flower.
  await moveTo(1390);assert.equal((await snap()).collected.length,0);await moveTo(222);
  await jumpTo(222,550);assert.deepEqual((await snap()).collected,[0]);
  await groundStep(407,545);await moveTo(430);await jumpTo(515,465);assert((await snap()).collected.includes(1));await screenshot('hunt-second-flower');
  await groundStep(690,555);await moveTo(715);await jumpTo(790,490);await moveTo(810);await screenshot('hunt-stepping-stones');await jumpTo(900,425);assert((await snap()).collected.includes(2));
  await groundStep(1090,545);await moveTo(1120);
  await p.evaluate(async()=>{window.qaPlatforms=(await import('./engine.js')).collectionPlatforms;});
  const bridge=await p.evaluate(()=>qaPlatforms(gameDebug.snapshot().time).find(p=>p.moving));await jumpTo(bridge.x+39,480);
  let riding=await snap();await p.waitForTimeout(400);let carried=await snap();assert.equal(carried.y,480);assert.notEqual(carried.x,riding.x);await screenshot('hunt-moving-platform');
  await click('Pause game');riding=await snap();await p.waitForTimeout(250);assert.equal((await snap()).time,riding.time);assert.equal((await snap()).x,riding.x);await click('Resume');
  await p.keyboard.down('ArrowRight');await p.waitForFunction(()=>{const s=gameDebug.snapshot(),b=qaPlatforms(s.time).find(p=>p.moving);return s.x>=b.x+b.w-17;});await p.keyboard.up('ArrowRight');
  await jumpTo(1345,null);await p.waitForFunction(()=>gameDebug.snapshot().collected.length===4);
  await p.waitForFunction(()=>gameDebug.snapshot().awaitingSpecial);await screenshot('four-flowers');await p.waitForTimeout(1700);assert.equal((await snap()).scene,'FLOWER_COLLECTION');await click('Next');
  await waitScene('SPECIAL_FLOWER');await screenshot('special-flower');await p.keyboard.press('Space');await waitScene('FIRST_FAILED_JUMP');await p.waitForFunction(()=>gameDebug.snapshot().failed);assert.equal((await snap()).special,false);assert.equal(await p.locator('.game-message').innerText(),'NOOOOOOO 😭');await screenshot('failed-jump');
  await p.waitForFunction(()=>gameDebug.snapshot().lock<=0);assert.equal(await p.locator('.game-message').innerText(),"I'm NOT giving up. One more time...");await p.keyboard.press('Space');await waitScene('SECOND_SUCCESSFUL_JUMP');await p.waitForFunction(()=>gameDebug.snapshot().special);assert.equal(await p.locator('.game-message').innerText(),'YESSSSSSS! GOT IT 😂');await screenshot('success-jump');
  await waitScene('BOUQUET_COMPLETE');await p.waitForTimeout(900);assert((await snap()).bouquet);await through('BOUQUET_COMPLETE','ROMANTIC_MESSAGE','bouquet');await through('ROMANTIC_MESSAGE','RATING_INTRO','message');await through('RATING_INTRO','LOVE_RATING','rating-intro');
 }
 async function submitRating(index,checkBoth=true){const slider=p.getByRole('slider');await slider.fill(String(index));assert.equal(await slider.getAttribute('aria-valuetext'),RATINGS[index]);await click('Submit answer');await waitScene('LOVE_REVEAL');assert.equal(await text(),REACTIONS[index][0]);await screenshot(`reaction-${index}-1`);if(checkBoth){await click('Next');assert.equal(await text(),REACTIONS[index][1]);await screenshot(`reaction-${index}-2`);}}
 async function secret(answer){await click('Next');await through('AFTER_RATING','SECRET_QUESTION','after-rating');assert.equal(await text(),LINES.SECRET_QUESTION[0]);await click('Next');assert.equal(await text(),LINES.SECRET_QUESTION[1]);await screenshot('secret-question');await click(answer);}
 async function finishEnding(scene){await through(scene,'FINAL',scene==='DATE_CONFIRMATION'?'date-ending':'not-yet');await screenshot('final');assert((await text()).includes('Byeeee 🦔❤️'));await click('Play again');await waitScene('TITLE');const s=await snap();assert.equal(s.rating,0);assert.equal(s.date,null);assert.equal(s.collected.length,0);assert.equal(s.attempts,0);}
 try{
  await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForSelector('#loading',{state:'detached'});await screenshot('title');assert.equal(await p.locator('.title-sub').count(),0);
  await play();assert.equal((await snap()).rating,0);await p.getByRole('slider').focus();await p.keyboard.press('ArrowLeft');assert.equal((await snap()).rating,0);assert.equal(await p.locator('.toast').innerText(),'Nice try. Not happening 😂');await p.waitForTimeout(3100);await screenshot('rating');
  for(let i=0;i<6;i++){await submitRating(i);if(i<5){await click('Try another number 😂');await waitScene('LOVE_RATING');}}
  assert.equal(posts.length,0);assert.equal(rows().length,0);
  await secret('Yes ❤️');await through('SECRET_YES','MEETING_CHOICE','secret-yes');await p.waitForTimeout(1400);await screenshot('invitation');await p.setViewportSize({width:320,height:568});await screenshot('invitation-320');await p.setViewportSize({width:450,height:800});await click('Choose a day ❤️');await waitScene('DATE_SELECTION');await screenshot('calendar-current');assert(await p.getByRole('button',{name:'Confirm this day ❤️',exact:true}).isDisabled());
  await click('Next month');await p.locator('.day:not([disabled])').first().click();assert.equal(posts.length,0);assert.equal(rows().length,0);await screenshot('calendar');
  for(let n=0;n<12&&await p.locator('.dates .day,.dates span').count()<=35;n++)await click('Next month');await screenshot('calendar-six-weeks');
  await p.setViewportSize({width:320,height:568});await screenshot('calendar-320');await p.setViewportSize({width:450,height:800});
  await p.route('**/api/meeting-date',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Test unavailable"}'}),{times:1});await click('Confirm this day ❤️');await p.locator('.save-error').waitFor();await screenshot('calendar-retry');assert.equal((await snap()).scene,'DATE_SELECTION');assert.equal(rows().length,0);
  await click('Confirm this day ❤️');await waitScene('DATE_CONFIRMATION');assert.equal(rows().length,1);assert.equal(rows()[0].meeting_date,(await snap()).date);assert.equal(posts[0].requestId,posts[1].requestId);await finishEnding('DATE_CONFIRMATION');
  console.log('PASS: all six rating reactions, Yes path, date persistence, error/retry, replay.');
  if(process.env.FLOW_CAPTURE_ONLY){assert.deepEqual(errors,[]);console.log('PASS: final visual capture and UUID fallback for local-network mobile play.');return;}
  await play();await submitRating(0);await secret('No 😢');assert.equal(await p.getByRole('button',{name:'Skip this question',exact:true}).count(),0);await through('SECRET_NO','MEETING_CHOICE','secret-no');await click('Not yet 🌸');await finishEnding('FLOWER_ENDING');assert.equal(rows().length,1);assert.equal(posts.length,2);
  console.log('PASS: No joke, real Not yet choice, calm ending, no additional saves.');
  for(const [width,height] of [[320,568],[390,844],[430,932],[1280,800]]){await p.setViewportSize({width,height});await screenshot(`layout-${width}`);const b=await p.locator('#frame').boundingBox();assert(b.width<=width+1&&b.height<=height+1);}
  assert(await p.evaluate(()=>document.fonts.check('700 32px Kalam')&&document.fonts.check('400 18px Kalam')));assert.deepEqual(errors,[]);
  await fs.writeFile('qa/final/test-results.json',JSON.stringify({passed:true,scenes:'Two complete actual-input playthroughs',ratings:RATINGS,posts:posts.length,confirmedRows:rows().length,pageErrors:errors,checks:['Movement and both jumps','Pause and resume','All dialogue lines','All rating reactions','Minimum rating joke','Yes and No','No skip link','Not yet','Future calendar','Failed save and retry','Replay','Four viewport sizes']},null,2));
  console.log('PASS: exact dialogue, all viewports, fonts, no browser errors. Test database isolated from real game.');
 }catch(e){console.log('STATE',await snap());await screenshot('failure');throw e;}
 finally{await browser.close();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
})();
