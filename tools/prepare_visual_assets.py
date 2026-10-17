"""Crop real supplied/generated PNG artwork. No drawing or procedural art creation."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/ui'
OUT.mkdir(exist_ok=True)
atlas=Image.open(ROOT/'qa/visual-fix/generated-ui-atlas.png').convert('RGBA')

def trim(im, threshold=16):
    alpha=np.array(im.getchannel('A'))
    ys,xs=np.where(alpha>threshold)
    return im.crop((max(0,int(xs.min())-2),max(0,int(ys.min())-2),min(im.width,int(xs.max())+3),min(im.height,int(ys.max())+3)))

def isolated(im):
    a=np.array(im.convert('RGBA'));labels,n=ndi.label(a[:,:,3]>128)
    counts=np.bincount(labels.ravel());keep=labels==(1+np.argmax(counts[1:]))
    a[~ndi.binary_dilation(keep,iterations=1),3]=0
    return trim(Image.fromarray(a))

for name,box in [('blank-button',(20,60,1510,500)),('slider-rail',(35,515,1490,646)),('calendar-tile',(600,660,935,982))]:
    im=trim(atlas.crop(box),64)
    im.save(OUT/(name+'.png'),optimize=True)
    print(name,im.size)

panels=Image.open(ROOT/'qa/visual-fix/generated-panels-atlas.png').convert('RGBA')
for name,box in [('landscape-panel',(0,0,1018,800)),('portrait-panel',(1020,0,1536,826)),('slim-banner',(0,826,1536,1024))]:
    im=trim(panels.crop(box),64);im.save(OUT/(name+'.png'),optimize=True);print(name,im.size)

# Original central heart; crop preserves the artist's contour and glossy highlight.
isolated(Image.open(ROOT/'assets/hearts-1.png').crop((143,108,223,179))).save(OUT/'heart.png')
# Original petal and sparkle from the existing collection effect; no redrawing.
isolated(Image.open(ROOT/'assets/sparkle-3.png').crop((201,74,257,132))).save(OUT/'petal.png')
isolated(Image.open(ROOT/'assets/sparkle-3.png').crop((141,121,204,200))).save(OUT/'sparkle.png')
# Reuse the existing illustrated jumping shadow, with only edge-connected white removed.
im=Image.open(ROOT/'Hedgehog Jumping Sprite Sheet.png').convert('RGBA').crop((660,456,805,482))
a=np.array(im);rgb=a[:,:,:3].astype(int);mask=(rgb.min(2)>220)&(rgb.max(2)-rgb.min(2)<30)
seed=np.zeros(mask.shape,bool);seed[0]=mask[0];seed[-1]=mask[-1];seed[:,0]=mask[:,0];seed[:,-1]=mask[:,-1]
a[ndi.binary_propagation(seed,mask=mask),3]=0
trim(Image.fromarray(a)).save(OUT/'shadow.png')
# Recover the entire first button border, including the top edge omitted by the old crop.
im=Image.open(ROOT/'Meeting choice buttons .png').convert('RGBA').crop((20,150,1425,560))
trim(im).save(ROOT/'assets/choice.png',optimize=True)
# Use PNG for the original backgrounds too, retaining their existing rendered dimensions.
for key,name in [('garden','Garden background without characters, text, or UI.png'),('ending','Romantic ending background without characters or UI.png')]:
    Image.open(ROOT/name).resize((564,1003),Image.Resampling.LANCZOS).save(ROOT/f'assets/{key}.png',optimize=True)
manifest=json.loads((ROOT/'assets/manifest.json').read_text())
for key in ['garden','ending']:manifest['images'][key]=f'assets/{key}.png'
for key in ['heart','petal','sparkle','shadow']:manifest['images']['ui-'+key]=f'assets/ui/{key}.png'
manifest['visual_correction']={
 'generated_pngs':['assets/ui/blank-button.png','assets/ui/slider-rail.png','assets/ui/calendar-tile.png','assets/ui/landscape-panel.png','assets/ui/portrait-panel.png','assets/ui/slim-banner.png'],
 'derived_from_originals':{'heart':'Floating Hearts Animation Sheet.png, frame 2','petal':'Flower Collection Sparkle Animation Sheet.png, frame 4','sparkle':'Flower Collection Sparkle Animation Sheet.png, frame 4','shadow':'Hedgehog Jumping Sprite Sheet.png, frame 2'},
 'font':'Kalam Regular and Bold, SIL Open Font License 1.1; assets/fonts/kalam-OFL.txt',
 'original_button_lettering':'Original Start and Next PNG lettering is used unchanged. Meeting choice PNG lettering remains preserved as a reference; the newly requested Choose a day / Not yet captions use the separate blank PNG shell.'}
(ROOT/'assets/manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
