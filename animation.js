// Original sprite poses are chosen for story beats, never shuffled as motion frames.
export function dialoguePose(scene,line=0,rating=0){
 if(scene==='LOVE_REVEAL')return (line===0
  ?[['cry',1],['pout',0],['shy',4],['happy',0],['shocked',0],['happy',1]]
  :[['pout',4],['plead',3],['happy',0],['present',6],['shocked',4],['happy',1]])[rating];
 if(scene==='AFTER_RATING')return [['pout',4],['think',0],['plead',0],['cry',1],['pout',4]][line];
 if(scene==='SECRET_NO')return [['cry',1],['pout',4],['shy',1]][line];
 if(scene==='SECRET_YES')return ['happy',0];
 if(scene==='DATE_CONFIRMATION')return [['shocked',0],['happy',1],['happy',6],['present',6]][line];
 return null;
}

// Anchors follow the butterfly's body, rather than the changing wing/trail bounds.
// Crops exclude the printed frame labels on the original presentation sheets.
export const BUTTERFLIES={
 flutter:{name:'butterfly1',sequence:[0,1,2,1],fps:5.5,scale:.23,crop:[60,105,235,166],anchors:[[207,207],[196,214],[188,213]]},
 drifting:{name:'butterfly1',sequence:[0,1,2,1],fps:5,scale:.17,crop:[60,105,235,166],anchors:[[207,207],[196,214],[188,213]]},
 resting:{name:'butterfly1',sequence:[0,1,2,1],fps:3.5,scale:.15,crop:[60,105,235,166],anchors:[[207,207],[196,214],[188,213]]},
 joyful:{name:'butterfly4',sequence:[0,1,0,2],fps:3,scale:.24,crop:[75,95,220,174],anchors:[[205,211],[205,207],[198,211]]}
};
export function butterflyMotion(time,kind='flutter',reduced=false){
 const t=reduced?0:time,spec=BUTTERFLIES[kind],frame=spec.sequence[Math.floor(t*spec.fps)%spec.sequence.length];
 if(kind==='resting')return {frame,x:383+2*Math.sin(t*.8),y:464+2*Math.sin(t),angle:0};
 const phase=t*(kind==='drifting'?.17:.23)+(kind==='drifting'?2.1:0);
 return {frame,x:225+145*Math.sin(phase),y:(kind==='drifting'?340:262)+29*Math.sin(phase*2+.6),angle:reduced?0:.12*Math.sin(phase+.4)};
}
