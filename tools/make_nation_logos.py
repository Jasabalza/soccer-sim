#!/usr/bin/env python3
"""Build the nations / competitions part of a Soccer Sim logo file (format soccersim-logos v2) from PNG badges you own.
The game never ships any logos. This is a personal tool, like tools/make_logo_json.js is for clubs.

  python3 tools/make_nation_logos.py OUT.json --nations DIR [DIR...] [--clean slug=PNG ...] [--comp "Name=PNG" ...] [--keep-stars germany]

  --nations DIR   folders of FootyLogos style files named <slug>-national-team-logo-footylogos.png (first folder wins)
  --league N=PNG a league picture (a league name from data/leagues.json)
  --comp N=PNG    a competition picture; N must be a name the game knows (see COMP_NAMES in src/ui/app.js)
  --strip-loc N   remove a printed host/year line (green footer) from that competition picture
  --keep-stars S  badges (slug) whose printed stars stay (default: germany)
What it does: 1) takes printed title stars off the badges that have them (a transparent row gap above the crest),
2) gives badges and logos with dark edges a soft light glow so they read on the dark theme, 3) trims and shrinks to 256 px WebP.
"""
import sys, os, re, json, glob, base64, io, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ALIASES = {"usa": "United States", "cotedivoire": "Ivory Coast", "caboverde": "Cape Verde", "capeverde": "Cape Verde", "drcongo": "DR Congo",
           "czechia": "Czech Republic", "republicofireland": "Ireland", "curacao": "Curaçao", "korearepublic": "South Korea"}
STAR_BADGES = {"argentina", "brazil", "france", "germany", "spain", "uruguay", "iraq", "italy"}   # printed title stars
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower().replace("&", "and"))

def to_name(slug, names):
    k = norm(slug); m = {norm(n): n for n in names}
    return m.get(k) or (m.get(norm(ALIASES[k])) if k in ALIASES else None)

def trim(im, pad=0):
    bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bb) if bb else im
    if pad:
        out = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); out.paste(im, (pad, pad)); im = out
    return im

def strip_star_blobs(im):
    """stars that touch the crest's row range: drop small separate pieces that sit wholly in the top 30 percent of the picture"""
    a = np.array(im.getchannel("A")) > 20; h = a.shape[0]
    lab, n = ndi.label(ndi.binary_dilation(a, iterations=1)); out = np.array(im); gone = 0
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        area = (lab[sl] == i).sum()
        if sl[0].stop < 0.30 * h and area < 0.03 * a.sum(): out[..., 3][lab == i] = 0; gone += 1
    return (trim(Image.fromarray(out, "RGBA")), True) if gone else (im, False)

def strip_stars(im):
    """cut the band of printed stars: the first group of rows (under 28 percent of the height) before a clear transparent gap"""
    im = trim(im); a = np.array(im.getchannel("A")) > 20; h = a.shape[0]
    rows = a.any(axis=1); y = 0
    while y < h and rows[y]: y += 1                       # first band
    if y >= h or y > 0.28 * h: return strip_star_blobs(im)
    g = y
    while g < h and not rows[g]: g += 1                   # the gap
    if g - y < max(2, 0.012 * h) or g >= h: return im, False
    return trim(im.crop((0, g, im.width, im.height))), True

def strip_green_footer(im):
    """remove a printed host / year line (green letters) and anything below the last non-green row"""
    arr = np.array(im).astype(int); r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    green = (a > 20) & (g > r + 50) & (g > b + 20)
    rowsg = green.sum(axis=1) > 3
    if not rowsg.any(): return im
    y0 = int(np.argmax(rowsg & (np.arange(len(rowsg)) > len(rowsg) * 0.6)))
    arr[y0:, :, 3] = 0
    return trim(Image.fromarray(arr.astype("uint8"), "RGBA"))

def strip_last_band(im):
    """remove the last line of text (a printed host / year) when a transparent gap separates it from the rest and it is under 20 percent of the height"""
    im = trim(im); a = np.array(im.getchannel("A")) > 20; h = a.shape[0]; rows = a.any(axis=1)
    y = h - 1
    while y >= 0 and rows[y]: y -= 1                      # last band (from the bottom)
    if y < 0 or h - y - 1 > 0.2 * h: return im
    gtop = y
    while gtop >= 0 and not rows[gtop]: gtop -= 1         # the gap above it
    if gtop < 0 or y - gtop < max(2, 0.01 * h): return im
    return trim(im.crop((0, 0, im.width, gtop + 1)))

def dark_share(im):
    """share of opaque pixels whose brightest channel is under 110 (black, navy, dark green): those vanish on the dark theme.
    Saturated reds and blues do not count, they stay visible."""
    arr = np.array(im).astype(float); op = arr[..., 3] > 40
    if not op.any(): return 0.0
    return float(((arr[..., :3].max(axis=2) < 110) & op).sum() / op.sum())

def glow(im, px=256):
    """soft light halo under every opaque shape (also inside letters), so dark crests and dark lettering stay readable"""
    pad = 10; big = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); big.paste(im, (pad, pad))
    a = np.array(big.getchannel("A")) > 20
    ga = np.clip(ndi.gaussian_filter(ndi.binary_dilation(a, iterations=2).astype(float), 2.6) * 1.15, 0, 1) * 0.92
    base = Image.fromarray(np.dstack([np.full(a.shape, 244), np.full(a.shape, 249), np.full(a.shape, 244), (ga * 255).astype("uint8")]).astype("uint8"), "RGBA")
    base.alpha_composite(big); return base

def encode(im, px=256):
    im = trim(im); s = px / max(im.size)
    if s < 1: im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=88, method=6); return base64.b64encode(buf.getvalue()).decode()

def process(im, name, keep_stars=False, strip_loc=False, comp=False):
    notes = []
    im = im.convert("RGBA")
    if strip_loc:
        n0 = trim(im.convert("RGBA")).height; im = strip_last_band(im); im = strip_green_footer(im) if trim(im).height == n0 else im; notes.append("location removed")
    if name in STAR_BADGES and not keep_stars:
        im, ok = strip_stars(im)
        if ok: notes.append("stars removed")
    im = trim(im)
    small = im.copy(); small.thumbnail((256, 256))
    sh = dark_share(small)
    arr = np.array(small).astype(float); op = arr[..., 3] > 40
    white = float(((arr[..., :3].min(axis=2) > 200) & op).sum() / max(1, op.sum()))     # mostly white lettering: a white halo would blur it
    if not keep_stars and white < 0.6 and (comp or sh >= 0.28):
        notes.append("glow %.2f" % sh)
        return glow(small), notes
    return small, notes

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("out"); ap.add_argument("--nations", nargs="*", default=[]); ap.add_argument("--comp", nargs="*", default=[]); ap.add_argument("--league", nargs="*", default=[])
    ap.add_argument("--strip-loc", nargs="*", default=[]); ap.add_argument("--keep-stars", nargs="*", default=["germany"]); ap.add_argument("--clean", nargs="*", default=[])
    ap.add_argument("--preview", help="write a contact sheet PNG here")
    o = ap.parse_args()
    names = [n["name"] for n in json.load(open(os.path.join(HERE, "..", "data", "nations.json")))["nations"]]
    out = {"format": "soccersim-logos", "version": 2, "mime": "image/webp", "nations": {}, "leagues": {}, "comps": {}}; prev = []
    seen = {}
    for d in o.nations:
        for f in sorted(glob.glob(os.path.join(d, "*-national-team-logo-footylogos.png")) + glob.glob(os.path.join(d, "*-national-team-*.png"))):
            slug = os.path.basename(f).split("-national-team")[0]
            if slug in seen: continue
            n = to_name(slug, names)
            if n: seen[slug] = (n, f)
    over = dict(s.split("=", 1) for s in o.clean)          # slug=PNG: a badge whose stars were already taken off by hand
    for slug, (n, f) in sorted(seen.items(), key=lambda x: x[1][0]):
        im, notes = process(Image.open(over.get(slug, f)), "" if slug in over else slug, keep_stars=slug in o.keep_stars)
        if slug in over: notes.insert(0, "hand-cleaned stars")
        out["nations"][n] = "data:image/webp;base64," + encode(im); prev.append((n, im)); 
        if notes: print(f"  {n}: {', '.join(notes)}")
    for sec, specs in (("comps", o.comp), ("leagues", o.league)):
      for spec in specs:
        name, path = spec.split("=", 1)
        im, notes = process(Image.open(path), "", strip_loc=name in o.strip_loc, comp=True)
        out[sec][name] = "data:image/webp;base64," + encode(im, 256); prev.append((name, im)); print(f"  {name}: {', '.join(notes) or 'as is'}")
    json.dump(out, open(o.out, "w"), separators=(",", ":"))
    print(f"{len(out['nations'])} nations, {len(out['leagues'])} leagues, {len(out['comps'])} competitions -> {o.out} ({os.path.getsize(o.out)//1024} KB)")
    print("no badge yet:", ", ".join(n for n in names if n not in out["nations"]))
    if o.preview:
        from PIL import ImageDraw
        C, cs = 12, 128; rows = (len(prev) + C - 1) // C; sh = Image.new("RGB", (C * cs, rows * (cs + 14)), (20, 40, 28)); dr = ImageDraw.Draw(sh)
        for i, (n, im) in enumerate(prev):
            t = im.copy(); t.thumbnail((cs - 8, cs - 8)); x, y = (i % C) * cs + 4, (i // C) * (cs + 14) + 2; sh.paste(t, (x, y), t); dr.text((x, y + cs - 6), n[:20], fill=(255, 255, 255))
        sh.save(o.preview)
if __name__ == "__main__": main()
