import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,physics,dateAllowed,localDateKey,collectionPlatforms,carryOnPlatform,COLLECTION_WIDTH,FLOWERS} from '../engine.js';
test('one-way collision catches a descending jump on a raised platform',()=>{const s=freshState();s.x=370;s.vy=-500;s.grounded=false;let landed=false;for(let i=0;i<100;i++){const p=physics(s,1/120,0,[{x:310,y:545,w:130}],1020);if(p?.y===545){landed=true;break;}}assert(landed);assert.equal(s.y,545);assert.equal(s.vy,0);});
test('first jump cannot reach cliff; second jump can land on it',()=>{for(const [power,expected] of [[580,false],[720,true]]){const s=freshState();s.x=300;s.vy=-power;s.grounded=false;let landed=false;for(let i=0;i<180;i++){const p=physics(s,1/120,0,[{x:245,y:455,w:180}],450);if(p?.y===455){landed=true;break;}}assert.equal(landed,expected);}});
test('calendar accepts only real future dates',()=>{assert(!dateAllowed('2026-10-16','2026-10-17'));assert(!dateAllowed('2026-10-17','2026-10-17'));assert(!dateAllowed('2027-02-30','2026-10-17'));assert(!dateAllowed(null));assert(dateAllowed('2027-01-01','2026-10-17'));assert.equal(localDateKey(new Date(2026,9,17)),'2026-10-17');});
test('replay state owns fresh collection and effect arrays',()=>{const a=freshState(),b=freshState();a.collected.push(1);a.effects.push({});assert.equal(b.collected.length,0);assert.equal(b.effects.length,0);assert.equal(b.special,false);assert.equal(b.bouquet,false);});
test('the stepped flower route is reachable with the unchanged jump at 30 and 60 fps',()=>{
 for(const dt of [1/30,1/60])for(const [x,y,targetX,id] of [[222,620,222,'first-flower'],[407,620,407,'second-step'],[430,545,515,'second-flower'],[690,620,690,'third-step-low'],[715,555,790,'third-step-high'],[810,490,900,'third-flower'],[1090,620,1090,'fourth-step']]){
  const s={...freshState(),x,y,vy:-500,grounded:false};let hit;
  for(let t=0;t<2;t+=dt){hit=physics(s,dt,s.x<targetX-2?1:s.x>targetX+2?-1:0,collectionPlatforms(t),COLLECTION_WIDTH);if(hit)break;}
  assert.equal(hit?.id,id,`${id} at ${1/dt} fps`);
 }
});
test('moving bridge can be reached and left throughout its cycle; it carries a standing player',()=>{
 for(let phase=0;phase<5;phase+=.25)for(const dt of [1/30,1/60]){
  let platforms=collectionPlatforms(phase),bridge=platforms.find(p=>p.moving);
  const standing={...freshState(),x:bridge.x+39,y:bridge.y};carryOnPlatform(standing,platforms,collectionPlatforms(phase+dt));assert(Math.abs(standing.x-(collectionPlatforms(phase+dt).find(p=>p.moving).x+39))<1e-8);
  for(const [startX,startY,targetX,id] of [[1120,545,bridge.x+39,'moving-bridge'],[bridge.x+63,480,1345,'fourth-flower']]){
   const s={...freshState(),x:startX,y:startY,vy:-500,grounded:false};let hit;
   for(let t=dt;t<2;t+=dt){hit=physics(s,dt,s.x<targetX-2?1:0,collectionPlatforms(phase+t),COLLECTION_WIDTH);if(hit)break;}
   assert.equal(hit?.id,id,`${id}, phase ${phase}, ${1/dt} fps`);
  }
 }
});
test('later flowers cannot be collected by jumping straight up from the ground',()=>{
 const s={...freshState(),vy:-500,grounded:false};let highest=s.y;
 for(let t=0;t<1.2;t+=1/120){physics(s,1/120,0,[],COLLECTION_WIDTH);highest=Math.min(highest,s.y);}
 for(const flower of FLOWERS.slice(1))assert(highest-flower.y>=40);
});
