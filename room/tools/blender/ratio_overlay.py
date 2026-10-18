"""Draw the golden-ratio / thirds / fifths guides (exported by ingale_char.py) over the front render."""
import json, sys
from PIL import Image, ImageDraw
d, prefix = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'v3_')
g = json.load(open(f'{d}/{prefix}front_guides.json'))
im = Image.open(f'{d}/{prefix}front.png').convert('RGBA'); ov = Image.new('RGBA', im.size); dr = ImageDraw.Draw(ov)
cols = {'hairline': (255, 210, 90), 'brow': (255, 210, 90), 'nose base': (255, 210, 90), 'chin': (255, 210, 90), 'mouth (golden split)': (255, 90, 120), 'eyes': (120, 220, 255)}
for n, (a, b) in g['h'].items():
    dr.line([tuple(a), tuple(b)], fill=cols[n] + (230,), width=2); dr.text((b[0] + 6, b[1] - 7), n, fill=cols[n] + (255,))
for n, (a, b) in g['v'].items():
    dr.line([tuple(a), tuple(b)], fill=(150, 255, 170, 170), width=1)
(x0, y0), (x1, y1) = g['box']; dr.rectangle([x0, y0, x1, y1], outline=(255, 255, 255, 200), width=2)
c = g['consts']
txt = [f"phi = {c['PHI']}", f"face L:W = {c['FACE_L']}:{c['FACE_W']} = {c['FACE_L']/c['FACE_W']:.3f}", f"thirds = {c['THIRD']} m each",
       f"eye W {c['EYE_W']}  H {c['EYE_H']}  (W/H={c['EYE_W']/c['EYE_H']:.3f}); fifths = 5 eye widths", f"nose W {c['NOSE_W']} = eye gap; mouth W {c['MOUTH_W']} = phi x nose",
       f"lips: upper {c['LIP_UP']}  lower {c['LIP_LO']} (= phi x upper)"]
dr.rectangle([10, 10, 470, 18 + 16 * len(txt)], fill=(20, 16, 24, 170))
for i, t in enumerate(txt): dr.text((18, 14 + 16 * i), t, fill=(255, 255, 255, 255))
Image.alpha_composite(im, ov).convert('RGB').save(f'{d}/{prefix}front_ratio_overlay.png'); print('ok')
