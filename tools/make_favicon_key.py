#!/usr/bin/env python3
"""Site icon (idea 7 of IconIdeas.pdf: a key whose bit is shaped like an F), drawn with Pillow with the same
geometry as svg/07-key-f.svg. Writes favicon.ico (16, 32, 48), favicon-16x16.png, favicon-32x32.png,
apple-touch-icon.png (180) and safari-pinned-tab.svg into tools/out-key/ (not in git), ready to copy to static/.
After copying, bump the ?v= version of the icon links in config.yml, or browsers keep the old icon."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent / "out-key"
S = 16                                   # 64-unit SVG grid drawn at 1024 px
NAVY, WHITE = (30, 58, 138, 255), (255, 255, 255, 255)
# shaft and the F-shaped bit: (x0, y0, x1, y1) in SVG units, drawn with round caps
STROKES = [(31, 32, 53, 32), (45, 32, 45, 42), (45, 37, 51, 37), (53, 32, 53, 44)]


def draw(tile_rounded=True, small=False):
    """small: the 16 px variant, with thicker strokes so the key stays readable."""
    size = 64 * S
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if tile_rounded:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=14 * S, fill=NAVY)
    else:
        d.rectangle((0, 0, size - 1, size - 1), fill=NAVY)
    w = (7 if small else 5) * S
    r = 11 * S                                   # ring (bow of the key)
    d.ellipse((20 * S - r - w / 2, 32 * S - r - w / 2, 20 * S + r + w / 2, 32 * S + r + w / 2), fill=WHITE)
    d.ellipse((20 * S - r + w / 2, 32 * S - r + w / 2, 20 * S + r - w / 2, 32 * S + r - w / 2), fill=NAVY)
    for x0, y0, x1, y1 in STROKES:
        d.line((x0 * S, y0 * S, x1 * S, y1 * S), fill=WHITE, width=w)
        for x, y in ((x0, y0), (x1, y1)):        # round caps
            d.ellipse((x * S - w / 2, y * S - w / 2, x * S + w / 2, y * S + w / 2), fill=WHITE)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    big = draw()
    big.resize((512, 512), Image.LANCZOS).save(OUT / "icon-512.png")
    s16 = draw(small=True).resize((16, 16), Image.LANCZOS)
    s16.save(OUT / "favicon-16x16.png")
    s32 = big.resize((32, 32), Image.LANCZOS)
    s32.save(OUT / "favicon-32x32.png")
    big.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[s16, s32])
    draw(tile_rounded=False).resize((180, 180), Image.LANCZOS).convert("RGB").save(OUT / "apple-touch-icon.png")
    (OUT / "safari-pinned-tab.svg").write_text(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
        "<circle cx='20' cy='32' r='11' fill='none' stroke='#000' stroke-width='5'/>"
        "<path d='M31 32h22M45 32v10M45 37h6M53 32v12' stroke='#000' stroke-width='5' stroke-linecap='round' fill='none'/></svg>\n")
    print("written:", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
