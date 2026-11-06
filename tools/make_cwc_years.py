#!/usr/bin/env python3
"""Put a year back on a Club World Cup logo whose printed year was taken off.
  python3 tools/make_cwc_years.py club_world_cup.png OUT_DIR 2025 2029 2033
The logo ring spells CLUB WORLD CUP and ends in a two digit year. The old digits are erased and the last two digits of the year
are drawn again in the two slots at the end of the ring, in the logo's own gold, turned to follow the ring.
Personal tool: the picture is yours, nothing is shipped with the game."""
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
FONTS = ["/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
# slot centres and ring angles measured on the 1500 x 1500 FootyLogos picture (ring centre about 750, 760)
CX, CY, SLOTS = 750, 760, [(1430, 816), (1405, 968)]
def font(px):
    for f in FONTS:
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def erase(im):
    out = im.copy(); out.paste((0, 0, 0, 0), (1320, 740, 1500, 1050)); return out
def gold(im):
    a = np.array(im); box = a[480:650, 1330:1480]; m = box[..., 3] > 200            # the P of CUP
    return tuple(int(v) for v in box[m][:, :3].mean(axis=0)) if m.any() else (246, 207, 106)
def digit(ch, col, size=1500):
    f = font(176); lay = Image.new("RGBA", (330, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    bb = d.textbbox((0, 0), ch, font=f, stroke_width=9); w, h = bb[2] - bb[0], bb[3] - bb[1]      # a heavy stroke to match the logo's thick letters
    d.text(((330 - w) / 2 - bb[0], (330 - h) / 2 - bb[1]), ch, font=f, fill=col + (255,), stroke_width=9, stroke_fill=col + (255,))
    return lay
def with_year(base, year, col):
    im = base.copy(); two = f"{int(year) % 100:02d}"
    for ch, (sx, sy) in zip(two, SLOTS):
        ang = np.degrees(np.arctan2(sy - CY, sx - CX))                # letters stand on the ring: their top points away from the centre
        lay = digit(ch, col).rotate(-(90 + ang), resample=Image.BICUBIC, expand=True)
        im.alpha_composite(lay, (int(sx - lay.width / 2), int(sy - lay.height / 2)))
    return im
if __name__ == "__main__":
    src, outd, years = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(outd, exist_ok=True); orig = Image.open(src).convert("RGBA"); col = gold(orig); base = erase(orig)
    for y in years:
        with_year(base, y, col).save(os.path.join(outd, f"club_world_cup_{y}.png")); print(y)
