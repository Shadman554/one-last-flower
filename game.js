import {W,H,GROUND,COLLECTION_WIDTH,FLOWERS,collectionPlatforms,carryOnPlatform,freshState,localDateKey,dateAllowed,physics} from './engine.js';
import {RATINGS,REACTIONS,LINES} from './story.js';
import {createAssetLoader,stageForScene} from './asset-loader.js';
import {dialoguePose,BUTTERFLIES,butterflyMotion} from './animation.js';
const $=s=>document.querySelector(s),canvas=$('#canvas'),ctx=canvas.getContext('2d');
function confirmationId(){
 if(crypto.randomUUID)return crypto.randomUUID();
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
// Storage may be disabled by the browser; the game can still use an in-memory session.
const savedPreference=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const savePreference=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let sessionId=savedPreference('flower_session_id')||confirmationId();
savePreference('flower_session_id',sessionId);
let state=freshState(),images={},animations={},input={left:false,right:false},music=true,musicStarted=false,audio=null,master=null,transitioning=false,calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),last=0,toastTime=0;
async function savePlayerProgress(extra={}){
 const payload={
  sessionId,
  playerName:state.playerName||savedPreference('flower_player_name')||'Cute Little Mouse',
  flowersCollected:state.collected?state.collected.length:0,
  specialFlower:state.special?1:0,
  jumpAttempts:state.attempts||0,
  loveRating:state.submittedRating||null,
  loveRatingIndex:state.submittedRatingIndex??null,
  secretAnswer:state.secretAnswer||null,
  meetingChoice:state.meetingChoice||null,
  meetingDate:state.savedDate||null,
  currentScene:state.scene,
  completed:(extra.completed||state.scene==='FINAL')?1:0,
  playTime:Math.round(state.time||0),
  ...extra
 };
 try{
  await fetch('/api/player-data',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  });
 }catch(_){}
}
const backgroundMusic=new Audio('assets/audio/background-music.mp3');
backgroundMusic.loop=true;backgroundMusic.preload='none';backgroundMusic.volume=.45;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const playScenes=['FLOWER_COLLECTION','SPECIAL_FLOWER','FIRST_FAILED_JUMP','SECOND_SUCCESSFUL_JUMP'];
const isPlaying=()=>playScenes.includes(state.scene);
const specialScene=()=>isPlaying()&&state.scene!=='FLOWER_COLLECTION';
const count=()=>state.collected.length;
// Symbols retain their original accessible wording; their visible art comes from PNGs.
function illustratedText(html){return html.replace(/❤️|❤|♡|🌸/gu,glyph=>`<img class="inline-art" src="${glyph==='🌸'?'assets/flower.png':'assets/ui/heart.png'}" alt="${glyph}" draggable="false">`);}
const el=(tag,cls,html='')=>{const n=document.createElement(tag);n.className=cls;n.innerHTML=illustratedText(html);return n;};
function artButton(key,label,fn,cls=''){const b=el('button',`art-button ${cls}`,`<img src="assets/${key}.png" alt="${label}">`);b.setAttribute('aria-label',label);b.onclick=fn;return b;}
function button(label,fn,cls='soft-button'){const b=el('button',cls,label);b.setAttribute('aria-label',label.replace(/<[^>]*>/g,''));b.onclick=fn;return b;}
function resize(){const vv=window.visualViewport;const bodyStyle=getComputedStyle(document.body);const horizontalInset=parseFloat(bodyStyle.paddingLeft)+parseFloat(bodyStyle.paddingRight);const verticalInset=parseFloat(bodyStyle.paddingTop)+parseFloat(bodyStyle.paddingBottom);const scale=Math.min(((vv?.width||innerWidth)-horizontalInset)/450,((vv?.height||innerHeight)-verticalInset)/800,1.12);$('#frame').style.width=`${450*scale}px`;$('#frame').style.height=`${800*scale}px`;$('#game').style.transform=`scale(${scale})`;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=450*dpr;canvas.height=800*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);if(images['garden-hunt']&&animations.idle)draw();}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();

function initAudio(){if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=music?.12:0;master.connect(audio.destination);}if(audio.state==='suspended')audio.resume();}
function syncMusic(){
 const playing=musicStarted&&music&&!state.paused&&!document.hidden;
 if(master)master.gain.setTargetAtTime(playing ? .12 : 0,audio.currentTime,.05);
 if(playing){backgroundMusic.play().catch(error=>{if(error.name!=='AbortError'&&musicStarted&&music&&!state.paused&&!document.hidden)toast('Tap the music button to start the music.');});}
 else backgroundMusic.pause();
}
function startGameAudio(){musicStarted=true;initAudio();syncMusic();}
function tone(freq,start,duration=.8,volume=.15){if(!audio||!music||state.paused)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+duration);osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+duration+.03);}
function chime(){if(audio&&music){[523.25,659.25,783.99].forEach((f,i)=>tone(f,audio.currentTime+i*.11,.65,.3));}}
function clearInput(){input.left=input.right=false;document.querySelectorAll('.held').forEach(e=>e.classList.remove('held'));}
function toolbar(){const bar=$('#toolbar');bar.replaceChildren();if(isPlaying()||state.bouquet)bar.append(el('div','counter',`${count()}/4`));const m=artButton(music?'music':'mute',music?'Mute music':'Enable music',()=>{initAudio();music=!music;syncMusic();toolbar();},'icon');m.setAttribute('aria-pressed',String(music));bar.append(m);if(isPlaying())bar.append(artButton('pause','Pause game',()=>pause(true),'icon'));}
function pause(value){if(!isPlaying())return;state.paused=value;clearInput();const layer=$('#pause-layer');layer.hidden=!value;syncMusic();if(value){const panel=el('div','pause-card');panel.append(el('h2','','A little breather. ♡'),el('p','','Your flowers will be right here.'),button('Resume',()=>pause(false)),button('Start again',restart));layer.replaceChildren(panel);layer.querySelector('button').focus();}else {if(music)audio?.resume();$('#toolbar button:last-child')?.focus();}}
addEventListener('blur',()=>{clearInput();if(isPlaying())pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(isPlaying())pause(true);backgroundMusic.pause();audio?.suspend();savePlayerProgress();}else{if(audio&&music&&!state.paused)audio.resume();syncMusic();}});
async function go(scene){if(transitioning)return;transitioning=true;clearInput();$('#fade').classList.add('active');try{await Promise.all([new Promise(r=>setTimeout(r,reduced?0:220)),ensureSceneAssets(scene)]);}catch{transitioning=false;$('#fade').classList.remove('active');state.introLeaving=false;const nextButton=$('.next');if(nextButton)nextButton.disabled=false;toast('The next scene could not load. Please try again.');return;}state.scene=scene;state.dialogueIndex=0;state.sceneTime=0;state.animTime=0;state.effects=[];state.lock=0;if(scene==='FLOWER_COLLECTION'){state.x=65;state.y=GROUND;state.vy=0;state.grounded=true;}if(scene==='SPECIAL_FLOWER'){state.x=140;state.y=GROUND;state.vy=0;state.grounded=true;}renderUI();$('#fade').classList.remove('active');transitioning=false;warmNextScene(scene);}
function restart(){document.querySelector('.toast')?.remove();toastTime=0;state=freshState();sessionId=confirmationId();savePreference('flower_session_id',sessionId);calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);clearInput();$('#pause-layer').hidden=true;musicStarted=false;backgroundMusic.pause();backgroundMusic.currentTime=0;syncMusic();renderUI();}
function toast(text){document.querySelector('.toast')?.remove();$('#game').append(el('div','toast',`<span>${text}</span>`));toastTime=state.time+3;}
function heading(box,title,label='A little adventure, made with love'){box.append(el('p','eyebrow',label),el('h2','',title));}
function card(box,text,cls='story-card'){const c=el('div',`card ${cls}`,`<div class="card-copy">${text}</div>`);box.append(c);return c;}
function next(box,dest){box.append(artButton('next','Next',()=>go(dest),'next'));}
function dialogue(box,lines,dest,actions){
 const index=state.dialogueIndex||0;card(box,lines[index]);
 if(index<lines.length-1){box.append(artButton('next','Next',()=>{state.dialogueIndex++;renderUI();},'next'));}
 else if(actions)actions(box);else next(box,dest);
}
function choices(box,items){const row=el('div','choices');for(const [label,fn] of items)row.append(button(label,fn,'soft-button choice'));box.append(row);box.classList.add('has-choices');}
function beginWalk(){if(state.introLeaving)return;state.introLeaving=true;state.sceneTime=0;$('.next').disabled=true;setTimeout(()=>{if(state.scene==='INTRO')go('FLOWER_COLLECTION');},1100);}
function renderUI(){canvas.style.backgroundImage=`url("${images[specialScene()?'garden-cliff':'garden-hunt'].src}")`;toolbar();$('#scene').replaceChildren();$('#controls').replaceChildren();const box=el('div','scene');$('#scene').append(box);const sc=state.scene;box.dataset.scene=sc;
 if(sc==='TITLE'){
  box.append(el('h1','','One Last Flower,<br>Just for You 🌸'));
  const bottom=el('div','title-bottom');
  bottom.append(artButton('start','Start',()=>{
   state.playerName=state.playerName||'Cute Little Mouse';
   savePlayerProgress({currentScene:'INTRO'});
   startGameAudio();
   go('INTRO');
  }));
  box.append(bottom);
 }
 else if(sc==='INTRO'){dialogue(box,LINES.INTRO,null,b=>b.append(artButton('next','Next',beginWalk,'next')));}
 else if(isPlaying()){
  heading(box,sc==='FLOWER_COLLECTION'?'One last flower...':'Just one more...',sc==='FLOWER_COLLECTION'?'A LITTLE FLOWER HUNT':'THE LAST FLOWER');box.querySelector('h2').classList.add('game-heading');
  const text=sc==='FLOWER_COLLECTION'?(count()===4?"Okayyy, I need one more to finish my idea...":'Collect 4 pink flowers.'):state.failed?"I'm NOT giving up. One more time...":"Okay I NEED that one.";
  $('#scene').append(el('div','game-message',`<span>${text}</span>`));
  $('#scene').append(el('div','hint',sc==='FLOWER_COLLECTION'?'Climb the platforms · Hold an arrow + tap ↑ to leap':'Walk toward the flower · Tap ↑ to jump'));controls();
 }
 else if(sc==='BOUQUET_COMPLETE'){dialogue(box,LINES[sc],'ROMANTIC_MESSAGE');const b=box.querySelector('.next');if(state.sceneTime<1){b.disabled=true;setTimeout(()=>{if(state.scene===sc)b.disabled=false;},(1-state.sceneTime)*1000);}}
 else if(sc==='ROMANTIC_MESSAGE')dialogue(box,LINES[sc],'RATING_INTRO');
 else if(sc==='RATING_INTRO')dialogue(box,LINES[sc],'LOVE_RATING');
 else if(sc==='LOVE_RATING'){
  const panel=el('div','question-panel',`<p id="rating-question">How much do you think I love you?</p><output class="score" id="score">${RATINGS[state.rating]}</output><input aria-labelledby="rating-question" aria-valuetext="${RATINGS[state.rating]}" type="range" min="0" max="5" step="1" value="${state.rating}"><div class="range-labels">${RATINGS.map(r=>`<span>${r}</span>`).join('')}</div>`);
  const range=panel.querySelector('input');range.oninput=e=>{state.rating=Number(e.target.value);$('#score').value=RATINGS[state.rating];$('#score').textContent=RATINGS[state.rating];range.setAttribute('aria-valuetext',RATINGS[state.rating]);};
  range.addEventListener('keydown',e=>{if(state.rating===0&&['ArrowLeft','ArrowDown','PageDown'].includes(e.key))toast('Nice try. Not happening you cant reduce😂');});
  let startX=0;range.addEventListener('pointerdown',e=>{startX=e.clientX;if(state.rating===0&&e.clientX<range.getBoundingClientRect().left+12)toast('Nice try. Not happening you cant reduce😂');});range.addEventListener('pointermove',e=>{if(e.buttons&&state.rating===0&&e.clientX<startX-8)toast('Nice try. Not happening you cant reduce😂');});
  box.append(panel,el('p','rating-note','Your choice is important to me'));
  box.append(button('Submit answer',()=>{
   state.submittedRating=RATINGS[state.rating];
   state.submittedRatingIndex=state.rating;
   savePlayerProgress();
   chime();
   go('LOVE_REVEAL');
  },'soft-button next'));
 }
 else if(sc==='LOVE_REVEAL'){
  dialogue(box,REACTIONS[state.rating],'AFTER_RATING');box.append(button('try another number',()=>go('LOVE_RATING'),'soft-button try-again'));
 }
 else if(sc==='AFTER_RATING')dialogue(box,LINES[sc],'SECRET_QUESTION');
 else if(sc==='SECRET_QUESTION')dialogue(box,LINES[sc],null,b=>choices(b,[['Yes ❤️',()=>{state.secretAnswer='Yes ❤️';savePlayerProgress();go('SECRET_YES');}],['No 😢',()=>{state.secretAnswer='No 😢';savePlayerProgress();go('SECRET_NO');}]]));
 else if(sc==='SECRET_YES')dialogue(box,LINES[sc],'MEETING_CHOICE');
 else if(sc==='SECRET_NO')dialogue(box,LINES[sc],'MEETING_CHOICE');
 else if(sc==='MEETING_CHOICE'){
  card(box,'Can I see u ??? 🥹❤️');choices(box,[['Choose a day ❤️',()=>{state.ending='date';state.meetingChoice='Choose a day ❤️';savePlayerProgress();go('DATE_SELECTION');}],['Not yet 🌸',()=>{state.ending='flower';state.meetingChoice='Not yet 🌸';savePlayerProgress({completed:1});go('FLOWER_ENDING');}]]);
 }
 else if(sc==='DATE_SELECTION'){heading(box,'Okayyy, pick a day 🥹','');buildCalendar(box);}
 else if(sc==='DATE_CONFIRMATION'){dialogue(box,LINES[sc],'FINAL');box.append(el('p','saved-date',`Saved: ${formattedDate()}`));}
 else if(sc==='FLOWER_ENDING')dialogue(box,LINES[sc],'FINAL');
 else if(sc==='FINAL'){savePlayerProgress({completed:1});card(box,LINES.FINAL.map(line=>`<p>${line}</p>`).join(''));box.append(button('Play again',restart,'soft-button next'));}
}
function formattedDate(){return state.date?new Date(state.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'}):'';}
function buildCalendar(box){
 box.querySelector('.calendar')?.remove();const c=el('div','calendar'),nav=el('div','calendar-nav');
 const prev=artButton('left','Previous month',()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);buildCalendar(box);},'calendar-arrow');
 const today=new Date();prev.disabled=state.saving||(calendarMonth.getFullYear()===today.getFullYear()&&calendarMonth.getMonth()===today.getMonth());
 const future=artButton('right','Next month',()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);buildCalendar(box);},'calendar-arrow');future.disabled=state.saving;
 nav.append(prev,el('strong','',calendarMonth.toLocaleDateString(undefined,{month:'long',year:'numeric'})),future);c.append(nav,el('div','week','<span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>'));
 const grid=el('div','dates');for(let i=0;i<calendarMonth.getDay();i++)grid.append(el('span',''));
 const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth(),days=new Date(year,month+1,0).getDate();c.classList.toggle('six-weeks',calendarMonth.getDay()+days>35);
 for(let d=1;d<=days;d++){
  const key=localDateKey(new Date(year,month,d)),b=button(String(d),()=>{if(state.date!==key)state.requestId=null;state.date=key;state.saveError='';buildCalendar(box);},'day'+(key===localDateKey()?' today':'')+(key===state.date?' selected':''));
  b.dataset.date=key;b.disabled=state.saving||!dateAllowed(key);b.setAttribute('aria-label',new Date(year,month,d).toLocaleDateString(undefined,{dateStyle:'full'}));b.setAttribute('aria-pressed',String(state.date===key));grid.append(b);
 }
 c.append(grid,el('p','selected-date',state.date?formattedDate():'Choose a future day.'));
 const confirm=button(state.saving?'Saving your day...':'Confirm this day ❤️',confirmDate,'soft-button');confirm.disabled=state.saving||!dateAllowed(state.date);c.append(confirm);
 c.append(el('p','calendar-note','Confirming saves your chosen date to this game’s database.'));
 if(state.saveError){const error=el('p','save-error',state.saveError);error.setAttribute('role','alert');c.append(error);}
 const back=button('Back to the invitation',()=>go('MEETING_CHOICE'),'back');back.disabled=state.saving;c.append(back);box.append(c);
}
async function confirmDate(){
 if(state.saving||!dateAllowed(state.date))return;
 state.saving=true;state.saveError='';state.requestId ||= confirmationId();buildCalendar($('.scene'));
 try{
  const res=await fetch('/api/meeting-date',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:state.date,requestId:state.requestId}),signal:AbortSignal.timeout(10000)});
  const result=await res.json();if(!res.ok||result.date!==state.date||!result.saved)throw new Error('save');
  state.savedDate=result.date;state.saving=false;savePlayerProgress({meetingDate:result.date,completed:1});chime();go('DATE_CONFIRMATION');
 }catch{state.saving=false;state.saveError='Could not confirm the save. Please try again.';buildCalendar($('.scene'));}
}
function controls(){const row=el('div','controls');for(const key of ['left','right','jump']){const b=artButton(key==='jump'?'jump-button':key,key==='jump'?'Jump':`Move ${key}`,()=>{},'control');b.onpointerdown=e=>{e.preventDefault();initAudio();b.setPointerCapture(e.pointerId);b.classList.add('held');if(key==='jump')jump();else input[key]=true;};const release=()=>{b.classList.remove('held');if(key!=='jump')input[key]=false;};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;row.append(b);}$('#controls').append(row);}
addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.code==='Escape'){if(isPlaying())pause(!state.paused);return;}if(!isPlaying()||state.paused)return;if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'].includes(e.code)){e.preventDefault();initAudio();if(['ArrowLeft','KeyA'].includes(e.code))input.left=true;if(['ArrowRight','KeyD'].includes(e.code))input.right=true;if(!e.repeat&&['Space','ArrowUp','KeyW'].includes(e.code))jump();}});
addEventListener('keyup',e=>{if(['ArrowLeft','KeyA'].includes(e.code))input.left=false;if(['ArrowRight','KeyD'].includes(e.code))input.right=false;});
function setAnim(name){if(state.anim!==name){state.anim=name;state.animTime=0;}}
function message(text){const n=$('.game-message');if(n)n.innerHTML=`<span>${illustratedText(text)}</span>`;}
function effect(name,x,y,size=110){state.effects.push({name,x,y,size,t:0});}
function jump(){if(!isPlaying()||state.paused||!state.grounded||state.lock>0||transitioning||state.awaitingSpecial)return;let power=500;if(specialScene()){if(!state.failed){state.attempts=1;state.scene='FIRST_FAILED_JUMP';power=580;message('Okay I NEED that one.');}else{state.attempts++;state.scene='SECOND_SUCCESSFUL_JUMP';power=720;message("I'm NOT giving up. One more time...");}state.x=Math.min(state.x,200);}state.vy=-power;state.grounded=false;state.jumpAge=0;setAnim('jump');if(audio)tone(390,audio.currentTime,.25,.2);}
function update(dt){if(state.paused)return;state.time+=dt;state.sceneTime+=dt;state.animTime+=dt;state.effects.forEach(e=>e.t+=dt);state.effects=state.effects.filter(e=>e.t<animations[e.name].length/(e.name==='hearts'?9:12));if(toastTime&&state.time>toastTime){$('.toast')?.remove();toastTime=0;}
 if(!isPlaying()||transitioning)return;
 if(state.scene==='FLOWER_COLLECTION')carryOnPlatform(state,collectionPlatforms(state.time-dt),collectionPlatforms(state.time));
 if(state.lock>0){state.lock-=dt;if(state.lock<=0){if(state.pendingSpecial){state.pendingSpecial=false;state.awaitingSpecial=true;clearInput();$('.hint').textContent='';$('#controls').replaceChildren(artButton('next','Next',()=>{state.awaitingSpecial=false;go('SPECIAL_FLOWER');},'collection-next'));}else if(state.pendingBouquet){state.pendingBouquet=false;go('BOUQUET_COMPLETE');}else if(state.failed)message("I'm NOT giving up. One more time...");}return;}
 if(state.awaitingSpecial)return;
 const special=specialScene();let axis=Number(input.right)-Number(input.left);const wasGrounded=state.grounded,wasVy=state.vy;
 // A gentle horizontal assist keeps both story jumps approachable on small screens.
 if(special&&!state.grounded&&state.x<315)axis=Math.max(axis,.9);
 const platforms=special?(state.scene==='SECOND_SUCCESSFUL_JUMP'?[{x:245,y:455,w:180}]:[]):collectionPlatforms(state.time);
 const landing=physics(state,dt,axis,platforms,special?450:COLLECTION_WIDTH);
 if(special&&state.grounded&&state.y===GROUND&&state.x>215)state.x=215;
 if(!wasGrounded&&landing&&wasVy>20){effect('dust',state.x,state.y,110);if(special&&state.scene==='FIRST_FAILED_JUMP'){state.failed=true;state.scene='SPECIAL_FLOWER';message('NOOOOOOO 😭');setAnim('recover');state.lock=8/9;}else{setAnim('jump');state.animTime=5/10;state.lock=.12;}}
 else if(!state.grounded){state.jumpAge=(state.jumpAge||0)+dt;setAnim('jump');state.animTime=Math.min(.49,state.jumpAge);}
 else setAnim(axis?'walk':'idle');
 if(!special){FLOWERS.forEach((f,i)=>{if(!state.collected.includes(i)&&(count()<3||state.grounded)&&Math.abs(state.x-f.x)<30&&Math.abs(state.y-f.y)<40){state.collected.push(i);setAnim('pick');state.lock=6/9;effect('sparkle',f.x,f.y-40);chime();toolbar();savePlayerProgress({flowersCollected:state.collected.length});if(count()===4){message("Okayyy, I need one more to finish my idea...");state.pendingSpecial=true;state.lock=1.5;}}});}
 else if(state.scene==='SECOND_SUCCESSFUL_JUMP'&&state.grounded&&state.y===455&&state.x>=293&&!state.special){state.special=true;state.bouquet=true;state.pendingBouquet=true;state.lock=1.5;setAnim('pick');effect('sparkle',330,420,155);effect('hearts',state.x,390,190);effect('celebrate',state.x,390,210);message('YESSSSSSS! GOT IT 😂');chime();toolbar();savePlayerProgress({specialFlower:1,flowersCollected:4});}
}
function drawImage(im,x,y,w,h){if(!im)return;if(h===undefined)h=w*im.height/im.width;ctx.drawImage(im,x,y,w,h);}
// Visible art bounds exclude near-invisible padding in the supplied PNGs.
// Source pixels stay unchanged; one uniform scale preserves petals and round centers.
const flowerBounds={
 'flower-one':{x:209,y:241,w:578,h:739},
 'flower-two':{x:158,y:186,w:678,h:845},
 'flower-three':{x:32,y:213,w:643,h:816}
};
function drawFlower(key,x,feet,height){const b=flowerBounds[key],width=height*b.w/b.h;ctx.drawImage(images[key],b.x,b.y,b.w,b.h,x-width/2,feet-height,width,height);}
function sprite(name,t,x,feet,w=150,face=1,loop=true,pose=null){
 const frames=animations[name],calm=pose!==null||name==='think'||name==='shy';
 const fps={idle:6,walk:10,jump:10,recover:9,pick:9,present:8}[name]||12;
 // These sheets contain different expressions, not consecutive motion frames.
 // Hold the matching calm pose and breathe slowly, with feet anchored in place.
 const index=pose??(calm?1:loop?Math.floor(t*fps)%frames.length:Math.min(frames.length-1,Math.floor(t*fps)));
 if(calm&&!reduced)w*=1+.005*Math.sin(t*2*Math.PI/4.5);
 const h=w*320/360;ctx.save();ctx.translate(x,feet);const originalFacesLeft=name==='walk';ctx.scale((face===-1)!==originalFacesLeft?-1:1,1);drawImage(frames[index],-w/2,-h*290/320,w,h);ctx.restore();
}
function drawButterfly(kind){
 const spec=BUTTERFLIES[kind],motion=butterflyMotion(state.time,kind,reduced),[ax,ay]=spec.anchors[motion.frame],[sx,sy,sw,sh]=spec.crop;
 ctx.save();ctx.translate(motion.x,motion.y);ctx.rotate(motion.angle);ctx.scale(spec.scale,spec.scale);
 ctx.drawImage(animations[spec.name][motion.frame],sx,sy,sw,sh,sx-ax,sy-ay,sw,sh);ctx.restore();
}
function gardenDetails(sc){
 const celebrating=['DATE_CONFIRMATION','FINAL','BOUQUET_COMPLETE'].includes(sc);
 drawButterfly(celebrating?'joyful':'flutter');
 if(sc!=='DATE_SELECTION'&&sc!=='LOVE_RATING')drawButterfly('drifting');
 // Existing petal PNGs drift at the garden edges, clear of dialogue and controls.
 for(let i=0;i<4;i++){
  const phase=reduced?(i+.5)/4:((state.time/16+i/4)%1);
  const x=(i%2?411:29)+15*Math.sin(phase*Math.PI*2+i),y=225+phase*290;
  ctx.save();ctx.globalAlpha=Math.sin(phase*Math.PI)*.55;ctx.translate(x,y);ctx.rotate(phase*2+i);drawImage(images['ui-petal'],-5,-4,10);ctx.restore();
 }
 if(['TITLE','FLOWER_ENDING','FINAL'].includes(sc)){
  drawButterfly('resting');
 }
}
function draw(){
 ctx.clearRect(0,0,W,H);const sc=state.scene,playing=isPlaying(),special=specialScene();
 // The original background is a cached CSS image behind the transparent canvas.
 // All scenery, particles, flowers, shadows, and characters are supplied PNG artwork.
 gardenDetails(sc);
 if(playing){
  const camera=special?0:Math.max(0,Math.min(COLLECTION_WIDTH-W,state.x-170));ctx.save();ctx.translate(-camera,special?-100:-120);
  if(special){if(!state.special){drawFlower('flower-three',332,457,112);const shimmer=reduced?1:.8+Math.sin(state.time*2)*.2;ctx.save();ctx.globalAlpha=shimmer;drawImage(images['ui-sparkle'],276,365,12);drawImage(images['ui-sparkle'],385,341,14);ctx.restore();}}
  else{for(const p of collectionPlatforms(state.time))drawImage(images.ground,p.x,p.y-9,p.w);FLOWERS.forEach((f,i)=>{if(!state.collected.includes(i)){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(reduced?0:Math.sin(state.time*2+i)*.045);drawFlower(['flower-one','flower-two','flower-three'][i%3],0,2,54);ctx.restore();}});}
  drawImage(images['ui-shadow'],state.x-31,state.y-2,62);sprite(state.anim,state.animTime,state.x,state.y,175,state.facing,!['jump','recover','pick'].includes(state.anim));
  for(const e of state.effects)drawImage(animations[e.name][Math.min(animations[e.name].length-1,Math.floor(e.t*(e.name==='hearts'?9:12)))],e.x-e.size/2,e.y-e.size/2,e.size,e.size*320/360);ctx.restore();
 }else if(sc!=='DATE_SELECTION'){
  let feet=515,width=240,name=state.bouquet?'present':'idle',t=state.time,loop=true,x=225,pose=null;
  if(sc==='TITLE'){width=270;feet=520;}
  if(sc==='INTRO'){name=state.introLeaving?(state.sceneTime<.65?'turn':'walk'):'think';t=state.sceneTime;x+=state.introLeaving?Math.max(0,state.sceneTime-.65)*40:0;}
  if(sc==='LOVE_RATING'){feet=546;width=190;}
  if(sc==='SECRET_QUESTION'||sc==='SECRET_YES'||sc==='SECRET_NO'||sc==='MEETING_CHOICE'){name='shy';t=state.sceneTime;}
  if(sc==='MEETING_CHOICE'&&state.sceneTime>1.3)name='present';
  if(sc==='LOVE_REVEAL'){name=state.rating<2&&state.sceneTime<.6?'shocked':'present';}
  if(sc==='DATE_CONFIRMATION'){name=state.sceneTime<2.1?'happy':'present';t=state.sceneTime*.5;}
  if(sc==='FLOWER_ENDING')name='present';
  if(sc==='FINAL'){name='wave';t=state.sceneTime*.18;}
  if(name==='present'){t=state.sceneTime<1?state.sceneTime:.75+(Math.floor((state.sceneTime-1)*2)%2)*.125;loop=false;}
  if(sc==='BOUQUET_COMPLETE'&&state.sceneTime<.55){name='turn';t=state.sceneTime;loop=false;}
  if(name==='turn')loop=false;
  const expression=dialoguePose(sc,state.dialogueIndex,state.rating);
  if(expression){[name,pose]=expression;t=state.sceneTime;}
  if(['DATE_CONFIRMATION','BOUQUET_COMPLETE'].includes(sc)&&state.sceneTime<2.4&&!reduced){
   const frame=Math.min(animations.celebrate.length-1,Math.floor(state.sceneTime*3.3));
   drawImage(animations.celebrate[frame],x-110,feet-260,220,196);
  }
  sprite(name,t,x,feet,width,1,loop,pose);
  if(state.bouquet&&!['LOVE_RATING','SECRET_NO','FLOWER_ENDING','FINAL'].includes(sc)){
   const n=Math.floor(state.time*9)%8;drawImage(animations.hearts[n],100,feet-220,95,84);drawImage(animations.hearts[(n+3)%8],280,feet-235,90,80);
  }
 }
}
let assetLoader;
async function ensureSceneAssets(scene){
 const stage=stageForScene(scene);
 await assetLoader.loadStage('title');
 if(stage!=='title')await assetLoader.loadStage('intro');
 if(stage==='hunt'||stage==='cliff')await assetLoader.loadStage('hunt');
 if(stage==='cliff')await assetLoader.loadStage('cliff');
 if(stage==='story')await assetLoader.loadStage('story');
}
function warmNextScene(scene){
 const next={TITLE:'intro',INTRO:'hunt',FLOWER_COLLECTION:'cliff',SPECIAL_FLOWER:'story'}[scene];
 if(next)assetLoader.loadStage(next).then(()=>{if(scene==='FLOWER_COLLECTION')return assetLoader.loadStage('story');}).catch(()=>{});
}
function loop(now){
 const dt=Math.min((now-last)/1000||0,.033);last=now;
 if(!document.hidden&&!state.paused){update(dt);draw();}
 requestAnimationFrame(loop);
}
async function load(){try{
 const manifest=await fetch('assets/manifest.json').then(r=>r.json());
 const loadImage=path=>new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not load '+path));im.src=path;});
 assetLoader=createAssetLoader(manifest,images,animations,loadImage);
 await Promise.all([assetLoader.loadStage('title'),document.fonts.load('400 18px Kalam'),document.fonts.load('700 32px Kalam')]);
 $('#loading').remove();renderUI();requestAnimationFrame(loop);
 // Let the title paint before warming the next scene.
 setTimeout(()=>warmNextScene('TITLE'),150);
}catch(e){$('#loading').textContent='The garden could not load. Please refresh the page.';console.error(e);}}
window.addEventListener('pagehide',()=>{
 const payload=JSON.stringify({
  sessionId,
  playerName:state.playerName||savedPreference('flower_player_name')||'Cute Little Mouse',
  flowersCollected:state.collected?state.collected.length:0,
  specialFlower:state.special?1:0,
  jumpAttempts:state.attempts||0,
  loveRating:state.submittedRating||null,
  loveRatingIndex:state.submittedRatingIndex??null,
  secretAnswer:state.secretAnswer||null,
  meetingChoice:state.meetingChoice||null,
  meetingDate:state.savedDate||null,
  currentScene:state.scene,
  completed:state.scene==='FINAL'?1:0,
  playTime:Math.round(state.time||0)
 });
 if(navigator.sendBeacon){
  const blob=new Blob([payload],{type:'application/json'});
  navigator.sendBeacon('/api/player-data',blob);
 }
});
// Read-only diagnostics make end-to-end verification possible without bypassing play.
window.gameDebug={snapshot:()=>JSON.parse(JSON.stringify(state)),assets:()=>({animations:Object.fromEntries(Object.entries(animations).map(([k,v])=>[k,v.length])),images:Object.keys(images)})};
load();
