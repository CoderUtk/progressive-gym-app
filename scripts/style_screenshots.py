#!/usr/bin/env python3
"""Composite raw phone screenshots with a top-band overlay for the Play Store
listing. Each overlay carries a headline + supporting caption so a browsing
user understands the feature at a glance without opening the app.

Design:
- Top ~14% of the image gets a solid app-background band that fades into the
  screenshot below so it feels welded on rather than a separate strip.
- Title: uppercase, bold, mint green (matches app accent).
- Caption: single line under the title, white 60% opacity.
- A short accent underline separates the title from the caption for polish.

Run once from repo root: python scripts/style_screenshots.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAW = Path("store-screenshots/raw")
OUT = Path("store-screenshots/styled")
OUT.mkdir(parents=True, exist_ok=True)

# In listing order — first screenshot is what browsers see in search results.
# `band_ratio` overrides the default when a screenshot has PII too far down
# to be swallowed by the standard band.
PANELS = [
    # src,                        dst,                       title,                caption,                                       band_ratio
    ("01_dashboard.png",           "01_dashboard.png",         "TODAY'S TARGETS",     "Progressive overload, suggested every session.", None),
    ("06_workout_logger.png",      "02_workout_logger.png",    "LOG IN TWO TAPS",     "Weight suggestions from your last session.",     None),
    ("02_exercises.png",           "03_exercises.png",         "70+ EXERCISES",       "Filter by muscle. Add your own.",                None),
    ("07_add_custom_exercise.png", "04_muscle_tinted.png",     "COLOR-CODED LIBRARY", "Scan by muscle group, not by text.",             None),
    ("03_analytics.png",           "05_analytics.png",         "TRACK PROGRESS",      "Volume, PRs, weekly breakdown.",                 None),
    # Profile has photo + name + age all in the top card. Wider band swallows
    # the whole card so no scrubbing of pixels is needed downstream.
    ("04_profile.png",             "06_profile.png",           "STRENGTH & BADGES",   "Estimated 1RM, level, 25 milestones.",           0.35),
    ("05_settings.png",            "07_settings.png",          "CLOUD SYNC",          "Optional. Sign in or stay offline.",             None),
]

# The marketing band uses a warm off-white against dark text so it reads as
# an external frame — clearly not part of the (dark) app UI below. Mint
# accent underline anchors it visually to the app's brand palette.
BAND_TOP    = (255, 250, 244)         # soft warm off-white
BAND_BOTTOM = (241, 236, 228)         # subtle warm tint at bottom of band
ACCENT      = (12, 74, 110)           # deep slate-blue for title — high contrast on cream
ACCENT_DIM  = (62, 224, 158)          # brand mint for the underline
TEXT        = (12, 20, 30)            # near-black for title (used if needed)
MUTED       = (71, 85, 105)           # slate for the caption
# App theme constants (still used by scrubbers below).
BG          = (11, 14, 17)

# Fonts — Segoe UI is a Windows system font. Fall back gracefully if missing.
FONT_DIR = Path("C:/Windows/Fonts")
def font(name, size):
    candidates = [FONT_DIR / name, Path(name)]
    for c in candidates:
        try:
            return ImageFont.truetype(str(c), size)
        except OSError:
            continue
    return ImageFont.load_default()

# Height ratio of the top band relative to image height. 27% swallows the
# phone status bar, the app header ("Progressive · Utkarsh · Wed, 22 Jul"),
# and any greeting line — pushing the visible content down below the band.
BAND_RATIO = 0.27
# Horizontal padding as a fraction of image width — text must fit within
# (W - 2*PAD_X). Anything wider auto-shrinks.
PAD_X_RATIO = 0.06

# Dummy identity used to overwrite real profile data before publishing.
DUMMY_NAME  = "Alex"
DUMMY_EMAIL = "alex@example.com"
DUMMY_AVATAR_BG = (94, 234, 212)     # brand cyan-mint
DUMMY_AVATAR_FG = (11, 14, 17)       # app bg


def fit_font(draw, text, base_font_name, max_px, start_size, min_size=24):
    """Return the largest font size <= start_size that fits `text` within
    `max_px` pixels wide."""
    size = start_size
    while size >= min_size:
        f = font(base_font_name, size)
        bbox = draw.textbbox((0, 0), text, font=f)
        if bbox[2] - bbox[0] <= max_px:
            return f, size
        size -= 4
    return font(base_font_name, min_size), min_size


def render_band(base: Image.Image, title: str, caption: str,
                band_ratio: float | None = None) -> Image.Image:
    """Composite a top band with title + caption onto `base`. Returns a new
    Image; does not mutate `base`. Optional band_ratio overrides the default
    when a specific screenshot needs a taller band to swallow PII."""
    W, H = base.size
    band_h = int(H * (band_ratio if band_ratio is not None else BAND_RATIO))
    max_text_w = W - int(W * PAD_X_RATIO * 2)

    # Vertical gradient across the whole band: warm cream at the top for the
    # text area, easing all the way down to the app's dark background at the
    # bottom. Because the actual app screenshot is *also* dark, the eye reads
    # the band as one continuous transition rather than a taped-on overlay
    # — no explicit stroke or seam needed.
    #
    # Curve: cream stays roughly stable in the top 45% (where the text sits),
    # then accelerates the fade to dark across the bottom 55%. Easing keeps
    # the middle from looking muddy grey.
    band = Image.new("RGB", (W, band_h))
    bpx = band.load()
    for y in range(band_h):
        raw = y / band_h
        # Piecewise ease-in: linear near top, cubic near bottom.
        if raw < 0.45:
            t = raw * 0.15 / 0.45           # stay near cream (t → 0..0.15)
        else:
            u = (raw - 0.45) / 0.55         # 0..1
            t = 0.15 + (1 - 0.15) * (u * u * (3 - 2 * u))  # smoothstep
        r = int(BAND_TOP[0] * (1 - t) + BG[0] * t)
        g = int(BAND_TOP[1] * (1 - t) + BG[1] * t)
        b = int(BAND_TOP[2] * (1 - t) + BG[2] * t)
        for x in range(W):
            bpx[x, y] = (r, g, b)
    result = base.convert("RGB")
    result.paste(band, (0, 0))

    draw = ImageDraw.Draw(result.convert("RGB") if result.mode != "RGB" else result)

    # Auto-fit title and caption to available width. Start big; shrink until
    # they fit, so short titles stay bold and long ones don't clip.
    title_font, title_size = fit_font(
        draw, title, "segoeuib.ttf", max_text_w,
        start_size=int(band_h * 0.22),
    )
    caption_font, caption_size = fit_font(
        draw, caption, "segoeui.ttf", max_text_w,
        start_size=int(band_h * 0.11),
    )

    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_w = title_bbox[2] - title_bbox[0]
    title_h = title_bbox[3] - title_bbox[1]

    # Push the title down past the phone status bar (~110px on this device).
    status_bar_h = int(H * 0.045)
    title_y = status_bar_h + int(band_h * 0.10)
    title_x = (W - title_w) // 2
    draw.text((title_x, title_y), title, fill=ACCENT, font=title_font)

    # Accent underline.
    ul_w = int(W * 0.10)
    ul_y = title_y + title_h + int(band_h * 0.06)
    ul_x = (W - ul_w) // 2
    draw.rectangle([ul_x, ul_y, ul_x + ul_w, ul_y + 4], fill=ACCENT_DIM)

    # Caption.
    caption_bbox = draw.textbbox((0, 0), caption, font=caption_font)
    caption_w = caption_bbox[2] - caption_bbox[0]
    caption_x = (W - caption_w) // 2
    caption_y = ul_y + int(band_h * 0.07)
    draw.text((caption_x, caption_y), caption, fill=MUTED, font=caption_font)

    return result.convert("RGB")


# ────────────────────────────────────────────────────────────────────────
# Personal-data scrubbers. Coordinates are in the raw 1220x2712 image space.
# Each scrubber returns the mutated image. Called BEFORE the top band is
# composited so band position remains consistent across images.

# Note: the 27% top band already covers the header greeting ("Utkarsh 👋")
# on Dashboard, Exercises, Analytics, and the Workout Logger — no additional
# scrub needed on those screens. Only Profile (face photo + name) and
# Settings (Google email) still expose PII below the band.

def scrub_settings(img: Image.Image) -> Image.Image:
    """Paint the Google email in the Account card with alex@example.com.

    Email line on the Settings screen sits around y=1685..1780, well below
    the 27% top band."""
    CARD_BG = (21, 26, 33)
    draw = ImageDraw.Draw(img)
    draw.rectangle([90, 1665, 1130, 1795], fill=CARD_BG)
    email_font = font("segoeuib.ttf", 64)
    draw.text((115, 1690), DUMMY_EMAIL, fill=TEXT, font=email_font)
    return img


SCRUBBERS = {
    "05_settings.png":  scrub_settings,
}


def main():
    for src, dst, title, caption, band_ratio in PANELS:
        src_path = RAW / src
        if not src_path.exists():
            print(f"skip: {src_path} not found")
            continue
        img = Image.open(src_path).convert("RGB")
        scrubber = SCRUBBERS.get(src)
        if scrubber:
            img = scrubber(img)
        out = render_band(img, title, caption, band_ratio=band_ratio)
        out_path = OUT / dst
        out.save(out_path, format="PNG", optimize=True)
        print(f"wrote: {out_path} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()
