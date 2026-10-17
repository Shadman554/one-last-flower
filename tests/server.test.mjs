import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createGameServer} from '../server.mjs';
import {localDateKey} from '../engine.js';

test('only explicit valid confirmation persists, retries are idempotent, private data is not served',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'flower-db-test-')),database=path.join(dir,'test.sqlite');
 const start=async()=>{const s=createGameServer({database});await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;};
 const stop=s=>new Promise(r=>s.close(r));let server=await start();
 try{
  let url=`http://127.0.0.1:${server.address().port}`;
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const date=localDateKey(tomorrow),requestId=randomUUID();
  const post=(body,headers={})=>fetch(url+'/api/meeting-date',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const rows=()=>{const db=new DatabaseSync(database);const count=db.prepare('SELECT COUNT(*) AS n FROM meeting_dates').get().n;db.close();return count;};
  assert.equal((await fetch(url)).status,200);assert.equal(rows(),0);
  assert.equal((await fetch(url+'/api/meeting-date')).status,405);
  for(const route of ['/data/meeting-dates.sqlite','/server.mjs','/meeting-store.mjs','/assets/../data/meeting-dates.sqlite'])assert.equal((await fetch(url+route)).status,404);
  assert.equal((await post({date:localDateKey(),requestId})).status,400);
  assert.equal((await post({date:'2099-02-30',requestId})).status,400);
  assert.equal((await post({date,requestId,rating:5})).status,400);
  assert.equal((await post({date,requestId},{Origin:'https://unrelated.example'})).status,403);
  assert.equal(rows(),0);
  assert.equal((await post({date,requestId})).status,201);assert.equal(rows(),1);
  assert.equal((await post({date,requestId})).status,200);assert.equal(rows(),1);
  assert.equal((await post({date:'2099-12-31',requestId})).status,409);
  await stop(server);server=await start();url=`http://127.0.0.1:${server.address().port}`;
  assert.equal(rows(),1);const replay=await post({date,requestId});assert.equal(replay.status,200);assert.equal((await replay.json()).date,date);assert.equal(rows(),1);
 }finally{await stop(server);await rm(dir,{recursive:true,force:true});}
});
