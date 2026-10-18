import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAssetLoader,stageForScene} from '../asset-loader.js';
const manifest=JSON.parse(await readFile(new URL('../assets/manifest.json',import.meta.url)));
test('title loading excludes later scenes and shared assets load only once',async()=>{
 const requests=[],images={},animations={};
 const loader=createAssetLoader(manifest,images,animations,async path=>{requests.push(path);return {src:path};});
 await loader.loadStage('title');
 assert(images['garden-hunt']);assert(animations.idle);assert(animations.butterfly1);
 assert(!animations.present);assert(!images['garden-cliff']);assert(!requests.some(p=>p.includes('butterfly2')||p.includes('cry-')));
 await Promise.all([loader.loadStage('intro'),loader.loadStage('intro'),loader.loadStage('story')]);
 assert.equal(new Set(requests).size,requests.length);
 assert.equal(stageForScene('SECOND_SUCCESSFUL_JUMP'),'cliff');
 assert.equal(stageForScene('SECRET_NO'),'story');
});
test('a failed scene asset can be retried without refetching successful assets',async()=>{
 let failed=false;const counts=new Map();
 const loader=createAssetLoader(manifest,{}, {},async path=>{
  counts.set(path,(counts.get(path)||0)+1);
  if(path===manifest.images.next&&!failed){failed=true;throw Error('offline');}
  return {src:path};
 });
 await assert.rejects(loader.loadStage('intro'));
 await loader.loadStage('intro');
 assert.equal(counts.get(manifest.images.next),2);
 assert.equal(counts.get(manifest.images.card),1);
});
