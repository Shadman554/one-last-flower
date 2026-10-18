"""Create review contact sheets and an audit from finished PNGs; no game art is drawn."""
from pathlib import Path
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/os.environ.get('QA_OUTPUT','qa/final')
font=ImageFont.truetype(str(ROOT/'assets/fonts/Kalam-Regular.ttf'),23)

def fit_on(canvas,path,box):
    im=Image.open(path).convert('RGBA');im.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS)
    canvas.paste(im,(box[0]+(box[2]-im.width)//2,box[1]+(box[3]-im.height)//2),im)

def montage(entries,columns,width,height,output):
    sheet=Image.new('RGB',(columns*width,((len(entries)+columns-1)//columns)*(height+42)),'#fffaf3');d=ImageDraw.Draw(sheet)
    for i,(label,path) in enumerate(entries):
        x=i%columns*width;y=i//columns*(height+42)
        d.text((x+12,y+5),label,font=font,fill='#542b23');fit_on(sheet,path,(x,y+42,width,height))
    sheet.save(output)

scenes=[('Title','title'),('Flower hunt','gameplay'),('The last flower','special-flower'),('Bouquet','bouquet-1'),('Little message','message-2'),('Love rating','rating'),('Infinity reaction','reaction-5-2'),('Secret question','secret-question'),('Meeting choice','invitation'),('Calendar','calendar'),('Not yet','not-yet-2'),('Goodbye','final')]
montage([(label,QA/f'{name}.png') for label,name in scenes],4,315,560,QA/'all-screens.png')
montage([('Flower hunt',QA/'gameplay.png'),('The last flower',QA/'special-flower.png')],2,450,800,QA/'gameplay-preview.png')
montage([('Your example 1',ROOT/'game style example 1.png'),('Corrected game',QA/'gameplay.png'),('Your example 2',ROOT/'game style example 2.png'),('Corrected game',QA/'special-flower.png')],4,450,800,QA/'reference-comparison.png')
art=[('Original Start',ROOT/'assets/start.png'),('Original Next',ROOT/'assets/next.png'),('Original choice lettering',ROOT/'assets/choice.png'),('Original message card',ROOT/'assets/card.png'),('New blank button',ROOT/'assets/ui/blank-button.png'),('New landscape panel',ROOT/'assets/ui/landscape-panel.png'),('New portrait panel',ROOT/'assets/ui/portrait-panel.png'),('New slider rail',ROOT/'assets/ui/slider-rail.png'),('New selected date tile',ROOT/'assets/ui/calendar-tile.png'),('New slim banner (unused)',ROOT/'assets/ui/slim-banner.png'),('Original heart cutout',ROOT/'assets/ui/heart.png'),('Original shadow cutout',ROOT/'assets/ui/shadow.png')]
montage(art,3,420,250,ROOT/'qa/visual-fix/artwork-comparison.png')

manifest=json.loads((ROOT/'assets/manifest.json').read_text())
active={'idle','walk','jump','recover','pick','present','sparkle','dust','hearts','celebrate','flower','left','right','jump-button','card','music','mute','pause','start','next','counter','ground','think','turn','shy','shocked','happy','wave','cry','pout','plead','butterfly1','butterfly4','garden-hunt','garden-cliff','flower-one','flower-two','flower-three'}
def link(label,path):return f'[{label}](<{path.as_posix()}>)'

report='''# Visual and flow correction audit

The game now uses the supplied empty garden and cliff backgrounds, new flower PNGs, original character frames, and the supplied final dialogue. Movement and jump physics remain unchanged; the later difficulty update expands the four-flower platform route. Scene artwork is composited from PNGs, with CSS reserved for layout, text, focus, and interaction.

## Code-generated or inconsistent visuals found

| Previous visual | Correction |
| --- | --- |
| CSS radial-gradient page decoration | Removed; plain page surround and supplied illustrated backgrounds |
| CSS rounded dialogue, hint, title/footer, and notification pills | Real PNG frames where needed; plain instruction text; title extras removed for the new flow |
| CSS question and calendar panels | Illustrated landscape and portrait PNG panels |
| CSS rounded action buttons, fills, borders, and shadows | Illustrated blank button PNG with dynamic text |
| CSS heart-shaped slider thumb and flat slider track | Heart cropped from the original floating-hearts sheet plus an illustrated PNG rail |
| CSS calendar selection circles and text-arrow navigation ornaments | Illustrated selection tile; original left/right button PNGs |
| Canvas ellipse under the player | Shadow cropped from the original jumping sheet |
| Decorative Unicode hearts, flower/sparkle ornaments, and loading flower | Original PNG cutouts; unnecessary title ornaments removed |
| CSS patches hiding embedded Meeting Choice captions | Removed. Source lettering preserved; new flow captions use a separate blank PNG |
| Stretched/nine-slice image panels | Whole PNGs fitted proportionally, with text kept inside their safe areas |
| Mixed Georgia/Arial typography | Self-hosted Kalam Regular/Bold throughout dynamic game text |

No SVG illustration was found. Backgrounds, platforms, hedgehogs, flowers, and animated effects were already based on original artwork; they were not replaced with generated approximations. The latest two original backgrounds and three new flower images are now used directly. The cliff painted into background 2 replaces the former separately drawn cliff image in that scene.

The new flow expressly includes dialogue emojis. Those remain text; they are not used as substitutes for game characters or environmental artwork. Hearts and flower symbols display original PNG cutouts while retaining the requested symbols as accessible text.

## Original artwork reused

- Both new empty backgrounds and all three new flower PNGs.
- Original idle, walk, jump, falling/rising, picking, and bouquet-presentation sprites.
- Newly supplied thinking, turning, shy, shocked, happy-celebration, and waving frames, plus butterfly 2.
- Original raised-platform tile, message card, counter, Start, Next, direction/jump controls, music, mute, and pause images.
- Original sparkle, dust, floating-heart, and celebration frames; original flower/heart/shadow cutouts.
- Original Start, Next, and Meeting Choice lettering as typography references. Start/Next are used with their embedded lettering unchanged. New meeting labels have different wording and use the separate blank button image.

All 54 source PNG files are retained. All 35 files present before the visual correction match their recorded original SHA-256 hashes. The 19 later uploads were read and extracted into separate output files. There are 192 extracted animation frames, including 102 from the new sheets. Original sources are never overwritten.

## New illustrated PNGs generated

These were created with the image-generation tool using the original button/card images as visual references, then cropped from transparent raster atlases:

1. `assets/ui/blank-button.png` — dynamic labels and the gameplay message bubble.
2. `assets/ui/slider-rail.png` — love-rating track.
3. `assets/ui/calendar-tile.png` — selected date.
4. `assets/ui/landscape-panel.png` — rating and pause panels.
5. `assets/ui/portrait-panel.png` — calendar frame.
6. `assets/ui/slim-banner.png` — retained, unused after the final flow removed the extra title/footer text.

These are generated extensions, not original artist files. The comparison below makes their outline, color, and floral treatment reviewable. No character, flower, platform, or background needed AI replacement after inspecting your additional uploads.

**Assets that could not be generated: none required by the final implementation.**

## Typography

The original lettering is rounded and irregular, with broad strokes, a slight rightward slant, open counters, and playful spacing. An exact font could not be identified. Kalam, Caveat, and Patrick Hand were compared beside the original Start, Next, and Meeting Choice PNGs; Kalam was the closest match and is used consistently at regular and bold weights, without artificial stretching or skew.

Kalam is distributed under SIL Open Font License 1.1. The license is included in `assets/fonts/kalam-OFL.txt`; official source: https://github.com/google/fonts/blob/main/ofl/kalam/OFL.txt.

## Flow and database verification

- Two complete actual-input playthroughs passed, covering all six submitted rating reactions, the minimum-rating joke, both playful answers, both real meeting outcomes and replay.
- Dialogue text was checked against the supplied flow. No per-flower dialogue is added. Important story bubbles wait for Next.
- The original physics function is byte-for-byte unchanged. Movement speed, gravity, jump powers, collision rules, and existing collection/jump animation timings are preserved.
- The world is only rendered higher to align with the new painted ground and cliff. The hunt now uses nine original-art platforms across a longer route, including a moving bridge; the special-flower scene remains unchanged.
- Fourteen automated animation/loading/engine/server tests passed, including persistence after reopening the database, duplicate retry prevention, invalid/past dates, and blocking public access to private files.
- Only confirming a date writes a meeting record. Unconfirmed selections are also excluded from player progress records. Player progress and choices are saved separately by the existing player dashboard feature. A simulated failed save remained on the calendar and a retry saved once.
- Test dates were written only to a separate temporary database. Verification used isolated databases without adding test dates to the live game database.
- Multi-touch movement/jump, release, and cancellation passed. Responsive layouts were checked at 320×568, 390×844, 430×932, 450×800, and 1280×800.
- No browser JavaScript errors were reported. Physical mobile devices and Safari were not available for verification.

## Review images

'''
for title,file in [('Corrected scene overview',QA/'all-screens.png'),('Examples beside corrected gameplay',QA/'reference-comparison.png'),('Original and generated artwork comparison',ROOT/'qa/visual-fix/artwork-comparison.png'),('Three-font comparison with original lettering',ROOT/'qa/visual-fix/font-comparison.png')]:
    report+=f'### {title}\n\n![{title}](<{file.as_posix()}>)\n\n'
report+='## Individual screenshots\n\n'
for label,name in scenes:report+='- '+link(label,QA/f'{name}.png')+'\n'
report+='\nAdditional dialogue, all rating reactions, failed/successful jumps, calendar retry, and mobile screenshots are retained in `qa/final/`.\n\n## Complete source inventory\n\n| Supplied file | Role |\n| --- | --- |\n'
for source in sorted(manifest['sources'],key=lambda s:s['file'].lower()):
    key=source['use'].split(';')[0]
    if key in active:role='Used in the final game: '+key
    elif 'Ground platform' in source['file']:role='Used: raised platforms'
    elif source['file'].startswith('game style example'):role='Composition reference; retained unchanged'
    elif source['file']=='Meeting choice buttons .png':role='Typography reference; embedded lettering preserved'
    else:role='Inspected and retained; available in prepared assets but not shown in the final flow'
    report+=f"| {source['file']} | {role} |\n"
report+='\n## Flower follow-up correction\n\nThe supplied flower PNGs contained almost invisible pixels far outside the visible illustration. Their old fixed width/height rendering made the visible flowers too small and distorted some proportions. Rendering now crops to the visible source bounds and uses a single proportional scale, with stems anchored to the ground. Original PNG pixels remain unchanged. The cliff flower uses the supplied detailed third flower, and its two small sparkle accents sit outside the bloom. The collection effect remains unchanged.\n\nThe requested 10/10 reply and shortened secret question are updated in `story.js`. The secret-question button now reads No with a sad emoji; Skip this question was removed. A targeted browser check verified all three No dialogue bubbles continue with Next to the meeting choice.\n'
report+='\n## Four-flower challenge update\n\nThe collection route now has a warm-up jump, a two-step climb, narrower stepping platforms, and a moving bridge before the fourth flower. All original platform/flower artwork is reused. Falling returns the hedgehog to safe grass, with collected flowers retained. The bridge carries a standing player and freezes on pause. Automated physics checks verify the route at 30 and 60 fps and throughout the bridge cycle.\n'
report+='\n## Sprite detail update\n\nThe original wing-flapping and celebration sheets supply flying, drifting, resting, and celebratory butterflies. The single-frame drifting and resting sprites were replaced with real wing cycles; their source sheets remain unchanged. Body anchors and selected wing frames prevent jumping between differently positioned illustrations, while runtime source crops remove printed sheet numbers. Petals reuse the original cutout PNG. Dialogue-specific crying, pouting, pleading, happy, and surprised poses hold gently instead of cycling unrelated expressions. No new illustration files were generated.\n'
(ROOT/'VISUAL-AUDIT.md').write_text(report,encoding='utf-8')
print('Created review images and VISUAL-AUDIT.md')
