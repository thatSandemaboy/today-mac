"""Generate the Today app icon at every macOS-required size.

Design intent: a bold sans-serif "T" centered on a slate squircle.
Matches the renderer's neutral Linear/Notion-style palette
(--accent #18181b, --accent-foreground #ffffff).

Run from the project root:
    python3 build/make_icon.py
Then assemble the .icns:
    iconutil -c icns build/icon.iconset
"""
from __future__ import annotations

import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), "icon.iconset")
os.makedirs(OUT_DIR, exist_ok=True)

# Slate background matches --accent (#18181b). Foreground is near-white.
BG = (24, 24, 27, 255)
FG = (250, 250, 250, 255)

# Fonts to try, in order. First TTF/TTC that loads wins. SFNS is Apple's system
# font (San Francisco) — present on every macOS install. Helvetica is the safe
# fallback. The variable-font path is what's actually shipped on Sequoia+.
FONT_CANDIDATES = [
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial Bold.ttf",
]


def load_font(px: int) -> ImageFont.FreeTypeFont:
    """Return the first font that loads at `px` pixels."""
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                # SFNS.ttf is a variable font; PIL needs an explicit index for .ttc.
                if path.endswith(".ttc"):
                    return ImageFont.truetype(path, px, index=0)
                return ImageFont.truetype(path, px)
            except Exception:
                continue
    # Last-ditch fallback — bitmap font, will look bad but won't crash.
    return ImageFont.load_default()


def render_master(size: int = 1024) -> Image.Image:
    """Render the largest icon. Smaller sizes are downsampled from this."""
    # Render at 2x then downscale for crisper antialiased edges (the "supersample"
    # trick — software rendering trick where you draw at higher resolution and
    # filter down to suppress aliasing on rounded corners and glyph edges).
    scale = 2
    w = size * scale
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Apple's app-icon mask uses a corner radius of ~22.37% of the icon edge.
    # We approximate with a rounded rect, which the system mask will clip
    # further on platforms that do their own rounding.
    radius = int(round(w * 0.2237))
    draw.rounded_rectangle((0, 0, w, w), radius=radius, fill=BG)

    # Draw the "T" centered. Optical centering: SF/Helvetica capital glyphs
    # have descender padding in the bbox that visually drops the character —
    # we re-center using the actual ink bounds via getbbox on a transparent
    # text layer.
    font = load_font(int(w * 0.62))
    text = "T"

    # Render text into its own layer so we can measure its true ink box.
    text_layer = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_layer)
    tdraw.text((0, 0), text, font=font, fill=FG)
    bbox = text_layer.getbbox()
    if bbox is None:
        raise RuntimeError("Text layer empty — font failed to render.")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    cropped = text_layer.crop(bbox)

    # Place centered. Slight optical lift (~2% of size) so the visual mass
    # of the T sits at the geometric center instead of below it.
    x = (w - tw) // 2
    y = (w - th) // 2 - int(w * 0.02)
    img.alpha_composite(cropped, (x, y))

    # Downsample with LANCZOS — best for high-frequency content like glyph edges.
    return img.resize((size, size), Image.LANCZOS)


# macOS .icns expected files. Each "@2x" is just the next-power-of-two PNG.
ICONSET_SIZES = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]


def main() -> int:
    master = render_master(1024)
    # Save the master separately too — useful for the website / Finder Get Info.
    master.save(os.path.join(os.path.dirname(__file__), "icon-1024.png"))

    for name, size in ICONSET_SIZES:
        out = master.resize((size, size), Image.LANCZOS) if size != 1024 else master
        out.save(os.path.join(OUT_DIR, name))
        print(f"  wrote {name} ({size}x{size})")

    print(f"\nDone. Now run:\n    iconutil -c icns {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
