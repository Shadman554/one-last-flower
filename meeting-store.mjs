import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {dateAllowed} from './engine.js';

export function openMeetingStore(filename){
 if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec(`CREATE TABLE IF NOT EXISTS meeting_dates (
  id INTEGER PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  meeting_date TEXT NOT NULL,
  confirmed_at TEXT NOT NULL
 )`);

 db.exec(`CREATE TABLE IF NOT EXISTS player_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  player_name TEXT,
  flowers_collected INTEGER DEFAULT 0,
  special_flower INTEGER DEFAULT 0,
  jump_attempts INTEGER DEFAULT 0,
  love_rating TEXT,
  love_rating_index INTEGER,
  secret_answer TEXT,
  meeting_choice TEXT,
  meeting_date TEXT,
  current_scene TEXT,
  completed INTEGER DEFAULT 0,
  play_time_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
 )`);

 const findMeeting=db.prepare('SELECT meeting_date FROM meeting_dates WHERE request_id = ?');
 const insertMeeting=db.prepare('INSERT INTO meeting_dates (request_id, meeting_date, confirmed_at) VALUES (?, ?, ?)');

 const upsertPlayer=db.prepare(`
  INSERT INTO player_data (
   session_id, player_name, flowers_collected, special_flower,
   jump_attempts, love_rating, love_rating_index, secret_answer,
   meeting_choice, meeting_date, current_scene, completed,
   play_time_seconds, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(session_id) DO UPDATE SET
   player_name = COALESCE(excluded.player_name, player_data.player_name),
   flowers_collected = MAX(player_data.flowers_collected, excluded.flowers_collected),
   special_flower = MAX(player_data.special_flower, excluded.special_flower),
   jump_attempts = MAX(player_data.jump_attempts, excluded.jump_attempts),
   love_rating = COALESCE(excluded.love_rating, player_data.love_rating),
   love_rating_index = COALESCE(excluded.love_rating_index, player_data.love_rating_index),
   secret_answer = COALESCE(excluded.secret_answer, player_data.secret_answer),
   meeting_choice = COALESCE(excluded.meeting_choice, player_data.meeting_choice),
   meeting_date = COALESCE(excluded.meeting_date, player_data.meeting_date),
   current_scene = COALESCE(excluded.current_scene, player_data.current_scene),
   completed = MAX(player_data.completed, excluded.completed),
   play_time_seconds = MAX(player_data.play_time_seconds, excluded.play_time_seconds),
   updated_at = excluded.updated_at
 `);

 const selectAllPlayers=db.prepare('SELECT * FROM player_data ORDER BY updated_at DESC');
 const selectPlayerBySession=db.prepare('SELECT * FROM player_data WHERE session_id = ?');
 const selectAllMeetings=db.prepare('SELECT * FROM meeting_dates ORDER BY confirmed_at DESC');
 const deletePlayer=db.prepare('DELETE FROM player_data WHERE session_id = ?');

 return {
  confirm(body){
   if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!=='date,requestId'||typeof body.date!=='string'||typeof body.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))return {status:400,error:'Invalid confirmation.'};
   const existing=findMeeting.get(body.requestId);
   if(existing)return existing.meeting_date===body.date?{status:200,saved:true,date:body.date}:{status:409,error:'This confirmation was already used.'};
   if(!dateAllowed(body.date))return {status:400,error:'Choose a valid future date.'};
   insertMeeting.run(body.requestId,body.date,new Date().toISOString());
   return {status:201,saved:true,date:body.date};
  },
  savePlayerData(body){
   if(!body||typeof body!=='object'||Array.isArray(body))return {status:400,error:'Invalid data format.'};
   const sessionId=typeof body.sessionId==='string'?body.sessionId.trim().slice(0,64):'';
   if(!sessionId||!/^[0-9a-zA-Z_-]+$/.test(sessionId))return {status:400,error:'Valid sessionId required.'};
   const now=new Date().toISOString();
   const playerName=typeof body.playerName==='string'&&body.playerName.trim()?body.playerName.trim().slice(0,50):null;
   const flowers=Number.isInteger(body.flowersCollected)?Math.max(0,Math.min(4,body.flowersCollected)):0;
   const special=body.specialFlower?1:0;
   const jumpAttempts=Number.isInteger(body.jumpAttempts)?Math.max(0,body.jumpAttempts):0;
   const loveRating=typeof body.loveRating==='string'?body.loveRating.slice(0,20):null;
   const loveRatingIndex=Number.isInteger(body.loveRatingIndex)?body.loveRatingIndex:null;
   const secretAnswer=typeof body.secretAnswer==='string'?body.secretAnswer.slice(0,20):null;
   const meetingChoice=typeof body.meetingChoice==='string'?body.meetingChoice.slice(0,30):null;
   const meetingDate=typeof body.meetingDate==='string'?body.meetingDate.slice(0,10):null;
   const currentScene=typeof body.currentScene==='string'?body.currentScene.slice(0,40):null;
   const completed=body.completed?1:0;
   const playTime=typeof body.playTime==='number'&&!Number.isNaN(body.playTime)?Math.max(0,body.playTime):0;

   upsertPlayer.run(
    sessionId,playerName,flowers,special,
    jumpAttempts,loveRating,loveRatingIndex,secretAnswer,
    meetingChoice,meetingDate,currentScene,completed,
    playTime,now,now
   );
   return {status:200,saved:true,sessionId};
  },
  getPlayerData(sessionId){
   if(sessionId)return selectPlayerBySession.get(sessionId)||null;
   return selectAllPlayers.all();
  },
  getMeetingDates(){
   return selectAllMeetings.all();
  },
  getStats(){
   const players=selectAllPlayers.all();
   const meetings=selectAllMeetings.all();
   const stats={
    totalSessions:players.length,
    completedSessions:players.filter(p=>p.completed).length,
    totalConfirmedDates:meetings.length,
    ratingBreakdown:{},
    secretAnswers:{yes:0,no:0,other:0},
    meetingChoices:{date:0,not_yet:0,other:0},
    avgPlayTimeSeconds:players.length?Math.round(players.reduce((a,b)=>a+(b.play_time_seconds||0),0)/players.length):0
   };
   for(const p of players){
    if(p.love_rating)stats.ratingBreakdown[p.love_rating]=(stats.ratingBreakdown[p.love_rating]||0)+1;
    if(p.secret_answer){
     const lower=p.secret_answer.toLowerCase();
     if(lower.includes('yes'))stats.secretAnswers.yes++;
     else if(lower.includes('no'))stats.secretAnswers.no++;
     else stats.secretAnswers.other++;
    }
    if(p.meeting_choice){
     const lower=p.meeting_choice.toLowerCase();
     if(lower.includes('day')||lower.includes('date')||lower.includes('choose'))stats.meetingChoices.date++;
     else if(lower.includes('not yet')||lower.includes('flower'))stats.meetingChoices.not_yet++;
     else stats.meetingChoices.other++;
    }
   }
   return stats;
  },
  deletePlayerData(sessionId){
   deletePlayer.run(sessionId);
   return {status:200,deleted:true};
  },
  close:()=>db.close()
 };
}
