// Load only the artwork needed for the current part of the game.
export const STAGES={
 title:{images:['garden-hunt','ui-petal','flower','music','mute','start'],animations:['idle','butterfly1']},
 intro:{images:['card','next'],animations:['think','turn','walk']},
 hunt:{images:['ground','flower-one','flower-two','flower-three','ui-shadow','left','right','jump-button','pause','counter','next'],animations:['walk','jump','pick','sparkle','dust'],ui:['blank-button']},
 cliff:{images:['garden-cliff','ui-sparkle'],animations:['recover','hearts','celebrate']},
 story:{images:['card','next','ui-heart'],animations:['present','turn','hearts','celebrate','cry','pout','plead','shocked','happy','shy','think','wave','butterfly4'],ui:['blank-button','landscape-panel','portrait-panel','calendar-tile','slider-rail','heart']}
};
export function stageForScene(scene){
 if(scene==='TITLE')return 'title';
 if(scene==='INTRO')return 'intro';
 if(scene==='FLOWER_COLLECTION')return 'hunt';
 if(['SPECIAL_FLOWER','FIRST_FAILED_JUMP','SECOND_SUCCESSFUL_JUMP'].includes(scene))return 'cliff';
 return 'story';
}
export function createAssetLoader(manifest,images,animations,loadImage){
 const files=new Map(),stages=new Map();
 const file=path=>{
  if(!files.has(path))files.set(path,loadImage(path).catch(error=>{files.delete(path);throw error;}));
  return files.get(path);
 };
 const loadStage=stage=>{
  if(!stages.has(stage)){
   const spec=STAGES[stage];
   stages.set(stage,Promise.all([
    ...spec.images.map(async key=>{images[key]=await file(manifest.images[key]);}),
    ...spec.animations.map(async key=>{animations[key]=await Promise.all(manifest.animations[key].map(file));}),
    ...(spec.ui||[]).map(key=>file(`assets/ui/${key}.png`))
   ]).catch(error=>{stages.delete(stage);throw error;}));
  }
  return stages.get(stage);
 };
 return {loadStage};
}
