#!/usr/bin/env python3
"""Put a year back on a Club World Cup logo whose printed year was taken off.
  python3 tools/make_cwc_years.py club_world_cup.png OUT_DIR 2025 2029 2033
The old two digit year at the end of the ring is erased, the words round the ring are turned to sit balanced on the top, and the four digit year is drawn in the empty middle of the ring, in the logo's own gold.
(The game does the same live from the imported picture; this script is for stills.) Personal tool: the picture is yours, nothing is shipped."""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
from make_nation_logos import recenter_arc
FONTS = ["/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
def font(px):
    for f in FONTS:
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def erase(im):
    out = im.copy(); out.paste((0, 0, 0, 0), (1320, 740, 1500, 1050))
    return recenter_arc(out, 749, 744, 545, 1330)[0]          # the words CLUB WORLD CUP are turned so they sit balanced on the top
def gold(im):
    a = np.array(im); box = a[480:650, 1330:1480]; m = box[..., 3] > 200            # the P of CUP
    return tuple(int(v) for v in box[m][:, :3].mean(axis=0)) if m.any() else (246, 207, 106)
def with_year(base, year, col):
    im = base.copy(); d = ImageDraw.Draw(im); f = font(240); txt = f"{int(year):04d}"
    d.text((750, 745), txt, font=f, fill=col + (255,), anchor="mm", stroke_width=8, stroke_fill=col + (255,))
    return im
if __name__ == "__main__":
    src, outd, years = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(outd, exist_ok=True); orig = Image.open(src).convert("RGBA"); col = gold(orig); base = erase(orig)
    for y in years:
        with_year(base, y, col).save(os.path.join(outd, f"club_world_cup_{y}.png")); print(y)
