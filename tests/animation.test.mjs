import test from 'node:test';
import assert from 'node:assert/strict';
import {butterflyMotion,dialoguePose} from '../animation.js';

test('butterfly paths stay continuous across wing changes and within the garden',()=>{
 for(const kind of ['flutter','drifting','joyful']){
  let previous=butterflyMotion(0,kind);
  for(let i=1;i<60*90;i++){
   const next=butterflyMotion(i/60,kind);
   assert(Math.hypot(next.x-previous.x,next.y-previous.y)<1);
   assert(next.x>=80&&next.x<=370&&next.y>=230&&next.y<=370);
   previous=next;
  }
  assert.deepEqual(butterflyMotion(0,kind,true),butterflyMotion(120,kind,true));
 }
});
test('expressions follow dialogue beats and keep the gentle ending free of sad reactions',()=>{
 assert.deepEqual(dialoguePose('SECRET_NO',0),['cry',1]);
 assert.deepEqual(dialoguePose('SECRET_NO',1),['pout',4]);
 assert.deepEqual(dialoguePose('AFTER_RATING',2),['plead',0]);
 assert.equal(dialoguePose('FLOWER_ENDING',0),null);
 assert.equal(dialoguePose('FLOWER_ENDING',1),null);
 for(let rating=0;rating<6;rating++)for(let line=0;line<2;line++)assert(dialoguePose('LOVE_REVEAL',line,rating));
});

test('small and resting butterflies use real wing frames instead of a single still',()=>{
 for(const kind of ['drifting','resting']){
  const frames=new Set(Array.from({length:60},(_,i)=>butterflyMotion(i/60,kind).frame));
  assert(frames.size>=3);
  assert.deepEqual(butterflyMotion(0,kind,true),butterflyMotion(9,kind,true));
 }
});
