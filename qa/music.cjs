const {chromium}=require('C:/Users/NAMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const {createGameServer}=await import('../server.mjs');
 const server=createGameServer({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--autoplay-policy=user-gesture-required']});
 try{
  const media=url+'/assets/audio/background-music.mp3',size=fs.statSync('assets/audio/background-music.mp3').size;
  const head=await fetch(media,{method:'HEAD'});assert.equal(head.headers.get('content-type'),'audio/mpeg');assert.equal(Number(head.headers.get('content-length')),size);
  for(const [range,length] of [['bytes=0-1023',1024],['bytes=-128',128]]){const r=await fetch(media,{headers:{Range:range}});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,length);}
  assert.equal((await fetch(media,{headers:{Range:`bytes=${size}-`}})).status,416);
  const p=await browser.newPage({viewport:{width:450,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('game.js','utf8')+'\nwindow.musicQA=()=>({paused:backgroundMusic.paused,time:backgroundMusic.currentTime,loop:backgroundMusic.loop,duration:backgroundMusic.duration,error:backgroundMusic.error?.code,volume:backgroundMusic.volume});'}));
  await p.goto(url);await p.waitForSelector('#loading',{state:'detached'});
  const snapshot=()=>p.evaluate(()=>musicQA());const click=name=>p.getByRole('button',{name,exact:true}).click();
  assert((await snapshot()).paused);assert.equal((await snapshot()).time,0);
  await click('Start');await p.waitForFunction(()=>musicQA().time>.3);let a=await snapshot();assert(a.loop);assert(Number.isFinite(a.duration)&&a.duration>0);assert(!a.error);
  await click('Next');await p.getByRole('button',{name:'Jump',exact:true}).waitFor();assert((await snapshot()).time>a.time);
  await click('Mute music');a=await snapshot();assert(a.paused);await p.waitForTimeout(250);assert.equal((await snapshot()).time,a.time);
  await click('Enable music');await p.waitForFunction(t=>musicQA().time>t+.1,a.time);
  await click('Pause game');a=await snapshot();assert(a.paused);await p.waitForTimeout(250);assert.equal((await snapshot()).time,a.time);
  await click('Resume');await p.waitForFunction(t=>musicQA().time>t+.1,a.time);
  await click('Pause game');await click('Start again');a=await snapshot();assert(a.paused);assert.equal(a.time,0);
  await click('Start');await p.waitForFunction(()=>musicQA().time>.2);assert((await snapshot()).time<2);
  assert.deepEqual(errors,[]);console.log('PASS: uploaded MP3 decodes, starts on Start, loops, continues across scenes, mutes/resumes, pauses/resumes, and restarts on replay. Audio byte ranges pass. Duration:',(await snapshot()).duration);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})();
