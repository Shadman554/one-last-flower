export const W=450,H=800,GROUND=620;
export const COLLECTION_WIDTH=1450;
export const PLATFORMS=[
 {id:'first-flower',x:175,y:550,w:95},
 {id:'second-step',x:365,y:545,w:90},
 {id:'second-flower',x:470,y:465,w:90},
 {id:'third-step-low',x:650,y:555,w:80},
 {id:'third-step-high',x:755,y:490,w:70},
 {id:'third-flower',x:860,y:425,w:80},
 {id:'fourth-step',x:1050,y:545,w:85},
 {id:'moving-bridge',x:1165,y:480,w:78,moving:true},
 {id:'fourth-flower',x:1300,y:405,w:90}
];
export const FLOWERS=[{x:222,y:550},{x:515,y:465},{x:900,y:425},{x:1345,y:405}];
export function collectionPlatforms(time){return PLATFORMS.map(p=>p.moving?{...p,x:p.x+34*Math.sin(time*2*Math.PI/5)}:p);}
export function carryOnPlatform(state,previous,current){
 if(!state.grounded)return;
 const support=previous.find(p=>p.moving&&Math.abs(state.y-p.y)<.01&&state.x+19>p.x&&state.x-19<p.x+p.w);
 if(support)state.x+=current.find(p=>p.id===support.id).x-support.x;
}
export function freshState(){return {scene:'TITLE',x:65,y:GROUND,vy:0,facing:1,grounded:true,collected:[],special:false,attempts:0,failed:false,bouquet:false,rating:0,dialogueIndex:0,ending:null,date:null,savedDate:null,saving:false,saveError:'',requestId:null,paused:false,anim:'idle',animTime:0,lock:0,time:0,sceneTime:0,effects:[]};}
export function localDateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function dateAllowed(key,today=localDateKey()){if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(key)||key<=today)return false;const date=new Date(key+'T12:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===key;}
export function physics(s,dt,axis,platforms,width){const oldY=s.y;s.x=Math.max(30,Math.min(width-30,s.x+axis*155*dt));s.vy+=1150*dt;s.y+=s.vy*dt;s.grounded=false;let land=null;for(const p of [...platforms,{x:-100,y:GROUND,w:width+200}]){if(s.vy>=0&&oldY<=p.y+1&&s.y>=p.y&&s.x+19>p.x&&s.x-19<p.x+p.w&&(!land||p.y<land.y))land=p;}if(land){s.y=land.y;s.vy=0;s.grounded=true;}if(axis)s.facing=axis<0?-1:1;return land;}
