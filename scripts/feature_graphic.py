#!/usr/bin/env python3
"""Generate the 1024x500 Google Play feature-graphic banner for Progressive.

Layout: app icon (left, contained), wordmark + tagline (right, larger),
against a subtle vertical gradient of the app's #0B0E11 bg. Everything sits
inside a 32px inner padding so the interior stays inside Play's safe area
even if their preview crops.

Output: assets/feature-graphic.png (1024x500 PNG).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path("assets/feature-graphic.png")
ICON = Path("assets/icon.png")

W, H = 1024, 500

BG_TOP    = (14, 18, 22)          # slightly lifted from bg
BG_BOTTOM = (7, 10, 13)           # slightly deeper than bg
ACCENT    = (94, 234, 212)        # brand cyan-mint
ACCENT2   = (62, 224, 158)        # secondary accent
TEXT      = (255, 255, 255)
MUTED     = (148, 163, 184)

FONT_DIR = Path("C:/Windows/Fonts")
def font(name, size):
    try:
        return ImageFont.truetype(str(FONT_DIR / name), size)
    except OSError:
        return ImageFont.load_default()


def make_bg():
    """Vertical gradient of the two app bg tones. Adds a soft mint glow at the
    top-left that reads as brand energy without dominating."""
    img = Image.new("RGB", (W, H), BG_BOTTOM)
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        for x in range(W):
            img.putpixel((x, y), (r, g, b))
    # Soft mint glow behind the icon area (blurred filled circle).
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([80, 90, 480, 490], fill=(94, 234, 212, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    return img


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img = make_bg()
    draw = ImageDraw.Draw(img)

    # ── Icon block, left side ─────────────────────────────────────────
    icon_size = 260
    icon_x = 90
    icon_y = (H - icon_size) // 2
    if ICON.exists():
        icon = Image.open(ICON).convert("RGBA")
        icon.thumbnail((icon_size, icon_size), Image.LANCZOS)
        # Rounded rectangle mask so the icon corners match the in-app icon
        # rendering rather than being a hard square.
        mask = Image.new("L", icon.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, icon.size[0], icon.size[1]], radius=48, fill=255
        )
        img.paste(icon, (icon_x, icon_y), mask)

    # ── Wordmark + tagline, right side ────────────────────────────────
    text_x = icon_x + icon_size + 60
    # Available width for the wordmark, respecting a 40px right margin so
    # nothing hits the safe-area edge that Play sometimes crops in previews.
    max_wm_w = W - text_x - 40
    # Auto-fit "PROGRESSIVE" — start big and shrink until it fits max_wm_w.
    wordmark = "PROGRESSIVE"
    wm_size = 92
    while wm_size > 40:
        wordmark_font = font("segoeuib.ttf", wm_size)
        wm_bbox = draw.textbbox((0, 0), wordmark, font=wordmark_font)
        if wm_bbox[2] - wm_bbox[0] <= max_wm_w:
            break
        wm_size -= 2
    wm_h = wm_bbox[3] - wm_bbox[1]
    wm_y = (H - wm_h) // 2 - 30

    # Soft glow behind the wordmark for the neon feel used in the app splash.
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.text((text_x + 2, wm_y + 4), wordmark, fill=(94, 234, 212, 90),
               font=wordmark_font)
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    draw.text((text_x, wm_y), wordmark, fill=ACCENT, font=wordmark_font)

    # Accent underline.
    ul_y = wm_y + wm_h + 22
    draw.rectangle([text_x, ul_y, text_x + 90, ul_y + 5], fill=ACCENT2)

    # Tagline.
    tag_font = font("segoeui.ttf", 34)
    tagline = "Lift smarter  ·  Track everything"
    draw.text((text_x, ul_y + 20), tagline, fill=MUTED, font=tag_font)

    img.save(OUT, format="PNG", optimize=True)
    print(f"wrote: {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
