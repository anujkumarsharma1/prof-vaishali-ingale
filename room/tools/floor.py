# WoodFloor051 (ambientCG, CC0): colour tinted toward the room's floor colour, plus the GL normal map.
import sys
from PIL import Image, ImageStat
raw, out = sys.argv[1], sys.argv[2]
col = Image.open(f'{raw}/WoodFloor051_1K-JPG_Color.jpg').convert('RGB')
target = (216, 189, 155)  # PAL.floor #d8bd9b
mean = ImageStat.Stat(col).mean
# lift the darker oak toward the palette, keeping grain contrast at 70 %
lut = []
for c in range(3):
    lut += [max(0, min(255, round(target[c] + (v - mean[c]) * 0.7))) for v in range(256)]
col = col.point(lut)
nor = Image.open(f'{raw}/WoodFloor051_1K-JPG_NormalGL.jpg').convert('RGB')
for size in (512, 256):
    col.resize((size, size), Image.LANCZOS).save(f'{out}/woodfloor051_color_{size}.webp', 'WEBP', quality=78, method=6)
nor.resize((512, 512), Image.LANCZOS).save(f'{out}/woodfloor051_normal_512.webp', 'WEBP', quality=80, method=6)
