"""Extract supplied sprite cells and copy backgrounds. No new art is drawn."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
manifest = json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))

def groups(values):
    return [g for g in np.split(values, np.where(np.diff(values)>1)[0]+1) if len(g)]

def clean(im, character=False):
    a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].astype(int)
    candidate=((rgb.min(2)>220)&(rgb.max(2)-rgb.min(2)<30))|(a[:,:,3]==0)
    seed=np.zeros(candidate.shape,bool)
    seed[0]=candidate[0];seed[-1]=candidate[-1];seed[:,0]=candidate[:,0];seed[:,-1]=candidate[:,-1]
    a[ndi.binary_propagation(seed,mask=candidate),3]=0
    labels,n=ndi.label(a[:,:,3]>0);sizes=np.bincount(labels.ravel())
    largest=1+np.argmax(sizes[1:]) if n else 0
    for lab in range(1,n+1):
        mask=labels==lab;color=rgb[mask].mean(0)
        grass=character and lab!=largest and color[1]>color[0]*1.12 and color[1]>color[2]*1.12
        shadow=character and lab!=largest and color.min()>140 and color.max()-color.min()<40
        if sizes[lab]<14 or grass or shadow:a[mask,3]=0
    return Image.fromarray(a)

sheets={
 'cry':'hadgehog crying.png','wave':'Hadgehog goodbye waving.png',
 'happy':'hadgehog happy celebration.png','plead':'hadgehog pleading.png',
 'pout':'hadgehog pouting.png','sad':'hadgehog sad.png',
 'shocked':'hadgehog shocked and dramatic.png','shy':'hadgehog shy and nervous.png',
 'think':'hadgehog thinking.png','turn':'hadgehog turning toward player.png'
}
previews=[]
def record(name,key,boxes=None):
    manifest['sources']=[s for s in manifest['sources'] if s['file']!=name]
    manifest['sources'].append({'file':name,'use':key,**({'frames':len(boxes),'detected_crops':boxes} if boxes else {})})

for key,name in sheets.items():
    im=Image.open(ROOT/name).convert('RGBA');dark=np.array(im)[:,:,:3].max(2)<90
    horizontal=groups(np.where(dark.sum(1)>im.width*.5)[0]);frames=[];boxes=[]
    for top,bottom in zip(horizontal[::2],horizontal[1::2]):
        y0,y1=int(top[-1]+7),int(bottom[0]-6)
        vertical=groups(np.where(dark[y0:y1].sum(0)>(y1-y0)*.8)[0])
        for left,right in zip(vertical[::2],vertical[1::2]):
            box=(int(left[-1]+7),y0,int(right[0]-6),y1);boxes.append(box)
            frames.append(clean(im.crop(box),True))
    assert len(frames) in (6,8),(key,boxes)
    heights=[]
    for fr in frames:
        labs,n=ndi.label(np.array(fr)[:,:,3]>0);sizes=np.bincount(labs.ravel())
        obj=ndi.find_objects(labs)[np.argmax(sizes[1:])];heights.append(obj[0].stop-obj[0].start)
    scale=230/max(heights);paths=[]
    for i,fr in enumerate(frames):
        fr=fr.crop(fr.getbbox());fr=fr.resize((round(fr.width*scale),round(fr.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(360,320));canvas.alpha_composite(fr,((360-fr.width)//2,290-fr.height))
        path=f'assets/{key}-{i}.png';canvas.save(ROOT/path,optimize=True);paths.append(path);previews.append((f'{key} {i+1}',canvas))
    manifest['animations'][key]=paths;record(name,key,boxes)

# Ungridded butterfly sheets: crop only the artwork above the frame numbers.
for number,columns in [(1,4),(2,4),(3,3),(4,4)]:
    name=f'butterfly {number}.png';key=f'butterfly{number}';im=Image.open(ROOT/name).convert('RGBA')
    boxes=[];frames=[]
    for row,(top,bottom) in enumerate([(95,490),(650,954)] if number==3 else [(100,470),(560,875)]):
        for col in range(columns):
            box=(round(col*im.width/columns),top,round((col+1)*im.width/columns),bottom)
            boxes.append(box);frames.append(clean(im.crop(box)))
    scale=min(280/max(f.width for f in frames),250/max(f.height for f in frames));paths=[]
    for i,fr in enumerate(frames):
        # Keep a common cell origin for flutter alignment, never stretch individual poses.
        fr=fr.resize((round(fr.width*scale),round(fr.height*scale)),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(360,320));canvas.alpha_composite(fr,((360-fr.width)//2,(320-fr.height)//2))
        path=f'assets/{key}-{i}.png';canvas.save(ROOT/path,optimize=True);paths.append(path);previews.append((f'{key} {i+1}',canvas))
    manifest['animations'][key]=paths;record(name,key,boxes)

for key,name in [('garden-hunt','empty background1  .png'),('garden-cliff','empty background2.png'),('flower-one','flower 1 .png'),('flower-two','flower 2.png'),('flower-three','flower 3.png')]:
    im=Image.open(ROOT/name).convert('RGBA')
    if key.startswith('flower'):im=im.crop(im.getbbox())
    im.save(OUT/f'{key}.png',optimize=True)
    manifest['images'][key]=f'assets/{key}.png';record(name,key)

(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
sheet=Image.new('RGB',(1200,((len(previews)+7)//8)*155),'#e5e9df');d=ImageDraw.Draw(sheet)
for i,(label,im) in enumerate(previews):
    im=im.copy();im.thumbnail((145,130));x=i%8*150;y=i//8*155;sheet.paste(im,(x,y),im);d.text((x+4,y+132),label,fill='black')
sheet.save(ROOT/'qa/new-extracted-frames.jpg')
print(f'Imported {len(previews)} original animation frames and five original PNGs.')
