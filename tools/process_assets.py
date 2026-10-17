"""Deterministic extraction of the supplied artwork; never alters source files."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
manifest = {'animations': {}, 'images': {}, 'sources': []}

def groups(values):
    return [g for g in np.split(values, np.where(np.diff(values)>1)[0]+1) if len(g)]

def clean(im, black=False, character=False):
    a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].astype(int)
    candidate = (rgb.max(2)<48) if black else ((rgb.min(2)>220)&(rgb.max(2)-rgb.min(2)<30))
    candidate |= a[:,:,3]==0
    seed=np.zeros(candidate.shape,bool);seed[0]=candidate[0];seed[-1]=candidate[-1];seed[:,0]=candidate[:,0];seed[:,-1]=candidate[:,-1]
    bg=ndi.binary_propagation(seed,mask=candidate)
    a[bg,3]=0
    labels,n=ndi.label(a[:,:,3]>0)
    sizes=np.bincount(labels.ravel()); largest=1+np.argmax(sizes[1:]) if n else 0
    for lab in range(1,n+1):
        mask=labels==lab
        color=rgb[mask].mean(0)
        # Remove detached grass and ground shadows, retain expressive motion marks.
        grass=character and lab!=largest and color[1]>color[0]*1.12 and color[1]>color[2]*1.12
        shadow=character and lab!=largest and color.min()>140 and color.max()-color.min()<40
        if sizes[lab]<14 or grass or shadow:a[mask,3]=0
    return Image.fromarray(a)

def save(im,key,maxsize=700):
    a=np.array(im.convert('RGBA'));a[a[:,:,3]<9,3]=0;im=Image.fromarray(a)
    box=im.getbbox()
    if box:im=im.crop(box)
    im.thumbnail((maxsize,maxsize),Image.Resampling.LANCZOS)
    im.save(OUT/f'{key}.png',optimize=True)
    manifest['images'][key]=f'assets/{key}.png'
    return im

sheets={
 'idle':'Hedgehog Idle Breathing Sprite Sheet.png',
 'walk':'Hedgehog Walking Sprite Sheet.png',
 'walk-guide':'Hedgehog Walking Animation Guide.png',
 'jump':'Hedgehog Jumping Sprite Sheet.png',
 'recover':'Hedgehog Falling and Rising Sprite Sheet.png',
 'pick':'Hedgehog’s Flower-Picking Adventure.png',
 'present':'Kawaii Hedgehog Bouquet Presentation Comic.png',
 'sparkle':'Flower Collection Sparkle Animation Sheet.png',
 'glow':'Special Flower Glow Sprite Sheet.png',
 'dust':'Soft Landing Dust Animation Sheet.png',
 'hearts':'Floating Hearts Animation Sheet.png',
 'celebrate':'Celebration Effect Sprite Sheet.png',
}
previews=[]
for key,name in sheets.items():
    im=Image.open(ROOT/name).convert('RGBA');a=np.array(im);dark=a[:,:,:3].max(2)<90
    horizontal=groups(np.where(dark.sum(1)>im.width*.5)[0]);frames=[];boxes=[]
    for top,bottom in zip(horizontal[::2],horizontal[1::2]):
        y0,y1=int(top[-1]+7),int(bottom[0]-6)
        vertical=groups(np.where(dark[y0:y1].sum(0)>(y1-y0)*.8)[0])
        for left,right in zip(vertical[::2],vertical[1::2]):
            box=(int(left[-1]+7),y0,int(right[0]-6),y1);boxes.append(box)
            frame=clean(im.crop(box),character=key in ['idle','walk','walk-guide','jump','recover','pick','present'])
            frames.append(frame)
    assert len(frames) in (6,8),(key,boxes)
    character=key in ['idle','walk','walk-guide','jump','recover','pick','present']
    # One common scale per sequence, and the same baseline in every output frame.
    if character:
        heights=[]
        for fr in frames:
            labs,n=ndi.label(np.array(fr)[:,:,3]>0);sz=np.bincount(labs.ravel());obj=ndi.find_objects(labs)[np.argmax(sz[1:])];heights.append(obj[0].stop-obj[0].start)
        scale=230/max(heights)
    else:scale=min(280/max(fr.width for fr in frames),280/max(fr.height for fr in frames))
    paths=[]
    for i,fr in enumerate(frames):
        canvas=Image.new('RGBA',(360,320))
        bb=fr.getbbox();fr=fr.crop(bb);fr=fr.resize((round(fr.width*scale),round(fr.height*scale)),Image.Resampling.LANCZOS)
        canvas.alpha_composite(fr,((360-fr.width)//2,290-fr.height if character else (320-fr.height)//2))
        path=f'assets/{key}-{i}.png';canvas.save(ROOT/path,optimize=True);paths.append(path)
        previews.append((f'{key} {i+1}',canvas))
    manifest['animations'][key]=paths
    manifest['sources'].append({'file':name,'use':key,'frames':len(frames),'detected_crops':boxes})

singles={
 'flower':'Kawaii Pink Flower Sticker.png','special':'Glossy Kawaii Pink Flower Asset.png',
 'bouquet':'Kawaii Pink Flower Bouquet Sticker.png','left':'Left movement button.png','right':'Right movement button.png','jump-button':'Jump button.png',
 'cliff':'Raised grassy cliffplatform — separate transparent.png','card':'Romantic message card.png',
 'music':'Music buttons (reuse existing ones if available).png','mute':'mute buttons (reuse existing ones if available).png',
 'pause':'Pause and Resume button.png','start':'start button.png','next':'next button .png','counter':'Flower counter background (numbers rendered in code).png',
}
for key,name in singles.items():
    im=Image.open(ROOT/name).convert('RGBA')
    if im.getextrema()[3]==(255,255): im=clean(im,black=True)
    save(im,key,800 if key in ['card','cliff'] else 500)
    manifest['sources'].append({'file':name,'use':key})
for key,name in [('garden','Garden background without characters, text, or UI.png'),('ending','Romantic ending background without characters or UI.png')]:
    im=Image.open(ROOT/name);im.resize((564,1003),Image.Resampling.LANCZOS).save(OUT/f'{key}.webp',quality=88)
    manifest['images'][key]=f'assets/{key}.webp';manifest['sources'].append({'file':name,'use':key})
tiles=Image.open(ROOT/'Ground platform tiles for walking and jumping.png').convert('RGBA')
save(tiles.crop((400,65,1050,310)),'ground')
manifest['sources'].append({'file':'Ground platform tiles for walking and jumping.png','use':'ground; original full sheet retained'})
choice=Image.open(ROOT/'Meeting choice buttons .png').convert('RGBA')
for key,box in [('choice',(20,200,1425,570)),('choice-alt',(20,600,1425,980))]:
    save(choice.crop(box),key,900)
manifest['sources'].append({'file':'Meeting choice buttons .png','use':'original button lettering retained for reference; dynamic labels use a separate blank PNG'})
for file in ROOT.glob('game style example*.png'):manifest['sources'].append({'file':file.name,'use':'composition reference only'})
for file in ROOT.glob('*.png'):
    if file.name not in {source['file'] for source in manifest['sources']}:
        manifest['sources'].append({'file':file.name,'use':'additional supplied artwork; processed by tools/import_new_art.py'})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
sheet=Image.new('RGB',(1200,((len(previews)+7)//8)*155),'#dce5d5');d=ImageDraw.Draw(sheet)
for i,(label,im) in enumerate(previews):
    im=im.copy();im.thumbnail((145,130));x=i%8*150;y=i//8*155;sheet.paste(im,(x,y),im);d.text((x+4,y+132),label,fill='black')
sheet.save(ROOT/'qa/extracted-frames.jpg')
print('Extracted',len(previews),'frames; accounted for',len(manifest['sources']),'source files.')
