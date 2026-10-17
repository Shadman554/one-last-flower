import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../server.mjs';

test('health, player data persistence, admin access, and stats',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'player-data-test-'));
 const database=path.join(dir,'test.sqlite');
 process.env.ADMIN_KEY='test-secret-key';
 const server=createGameServer({database});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;

 try{
  // 1. Health check
  const healthRes=await fetch(`${url}/api/health`);
  assert.equal(healthRes.status,200);
  const health=await healthRes.json();
  assert.equal(health.status,'ok');

  // 2. Unauthenticated admin requests should fail with 401
  const unauth=await fetch(`${url}/api/player-data`);
  assert.equal(unauth.status,401);

  // 3. Save player data
  const sessionId=randomUUID();
  const postPlayer=body=>fetch(`${url}/api/player-data`,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify(body)
  });

  // Invalid payload
  assert.equal((await postPlayer({sessionId:'???invalid$$$',playerName:'Test'})).status,400);

  // Initial save at title/intro
  const res1=await postPlayer({
   sessionId,
   playerName:'Little Mouse',
   flowersCollected:0,
   currentScene:'INTRO'
  });
  assert.equal(res1.status,200);
  assert.equal((await res1.json()).saved,true);

  // Progression: rating and secret answer
  const res2=await postPlayer({
   sessionId,
   loveRating:'∞',
   loveRatingIndex:5,
   secretAnswer:'Yes ❤️',
   flowersCollected:4,
   specialFlower:1,
   jumpAttempts:2,
   currentScene:'LOVE_REVEAL'
  });
  assert.equal(res2.status,200);

  // Meeting choice & completion
  const res3=await postPlayer({
   sessionId,
   meetingChoice:'Choose a day ❤️',
   meetingDate:'2026-12-25',
   currentScene:'FINAL',
   completed:1,
   playTime:95
  });
  assert.equal(res3.status,200);

  // 4. Admin query with header key
  const adminRes=await fetch(`${url}/api/player-data`,{
   headers:{'x-admin-key':'test-secret-key'}
  });
  assert.equal(adminRes.status,200);
  const data=await adminRes.json();
  assert.equal(data.players.length,1);
  const p=data.players[0];
  assert.equal(p.session_id,sessionId);
  assert.equal(p.player_name,'Little Mouse');
  assert.equal(p.love_rating,'∞');
  assert.equal(p.secret_answer,'Yes ❤️');
  assert.equal(p.meeting_choice,'Choose a day ❤️');
  assert.equal(p.meeting_date,'2026-12-25');
  assert.equal(p.completed,1);
  assert.equal(p.special_flower,1);
  assert.equal(p.flowers_collected,4);
  assert.equal(p.jump_attempts,2);

  // 5. Query stats
  const statsRes=await fetch(`${url}/api/player-stats?key=test-secret-key`);
  assert.equal(statsRes.status,200);
  const stats=await statsRes.json();
  assert.equal(stats.totalSessions,1);
  assert.equal(stats.completedSessions,1);
  assert.equal(stats.ratingBreakdown['∞'],1);
  assert.equal(stats.secretAnswers.yes,1);
  assert.equal(stats.meetingChoices.date,1);

  // 6. Delete player data
  const delRes=await fetch(`${url}/api/player-data?sessionId=${sessionId}`,{
   method:'DELETE',
   headers:{'x-admin-key':'test-secret-key'}
  });
  assert.equal(delRes.status,200);
  const afterDel=await (await fetch(`${url}/api/player-data?key=test-secret-key`)).json();
  assert.equal(afterDel.players.length,0);

 }finally{
  delete process.env.ADMIN_KEY;
  await new Promise(r=>server.close(r));
  await rm(dir,{recursive:true,force:true});
 }
});
