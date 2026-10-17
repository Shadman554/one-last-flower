export const W=450,H=800,GROUND=620;
export const PLATFORMS=[{x:310,y:545,w:130},{x:790,y:535,w:145}];
export const FLOWERS=[{x:185,y:620},{x:375,y:545},{x:620,y:620},{x:860,y:535}];
export function freshState(){return {scene:'TITLE',x:65,y:GROUND,vy:0,facing:1,grounded:true,collected:[],special:false,attempts:0,failed:false,bouquet:false,rating:5,ending:null,date:null,paused:false,anim:'idle',animTime:0,lock:0,time:0,sceneTime:0,effects:[]};}
export function localDateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function dateAllowed(key,today=localDateKey()){return /^\d{4}-\d{2}-\d{2}$/.test(key)&&key>=today;}
export function physics(s,dt,axis,platforms,width){const oldY=s.y;s.x=Math.max(30,Math.min(width-30,s.x+axis*155*dt));s.vy+=1150*dt;s.y+=s.vy*dt;s.grounded=false;let land=null;for(const p of [...platforms,{x:-100,y:GROUND,w:width+200}]){if(s.vy>=0&&oldY<=p.y+1&&s.y>=p.y&&s.x+19>p.x&&s.x-19<p.x+p.w&&(!land||p.y<land.y))land=p;}if(land){s.y=land.y;s.vy=0;s.grounded=true;}if(axis)s.facing=axis<0?-1:1;return land;}
