#!/usr/bin/env python3
"""Generate Krystal 'K' wordmark icons for browser extension.

Produces:
  logo-16.png, logo-48.png, logo-128.png  (for dark UI: light K on transparent)
  logo-16-darkmode.png, logo-48-darkmode.png, logo-128-darkmode.png (for light UI: dark K)
  logo.png (128x128, primary icon)
  logo-full.png, logo-full-white.png (wider variants used by Logo.tsx)
"""
from PIL import Image, ImageDraw, ImageFont
import os
import subprocess

OUT = os.path.join(os.path.dirname(__file__), "public")

# Try to find a serif italic font on the system. Fall back gracefully.
CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "/System/Library/Fonts/Times.ttc",
    "/Library/Fonts/Georgia Italic.ttf",
]

def find_font():
    for c in CANDIDATES:
        if os.path.exists(c):
            return c
    # Ask fontconfig if available
    try:
        out = subprocess.check_output(["fc-match", "-f", "%{file}", "serif:italic"], text=True).strip()
        if out and os.path.exists(out):
            return out
    except Exception:
        pass
    return None

FONT_PATH = find_font()
print(f"Using font: {FONT_PATH}")

def render_k(size: int, fg: tuple[int, int, int, int]) -> Image.Image:
    """Render an italic serif 'K' centered in a transparent square."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Target visual height ~72% of icon size — leaves breathing room
    font_size = int(size * 0.85)
    if FONT_PATH:
        font = ImageFont.truetype(FONT_PATH, font_size)
    else:
        font = ImageFont.load_default()
    # Measure and center
    bbox = draw.textbbox((0, 0), "K", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), "K", font=font, fill=fg)
    return img

# Krystal palette (matches web app dark-mode teal-neutral):
# - Light mode toolbar (light UI): dark K
# - Dark mode toolbar (dark UI): light K
DARK_FG = (40, 37, 29, 255)      # Nexus text light-mode  #28251D
LIGHT_FG = (205, 204, 202, 255)  # Nexus text dark-mode  #CDCCCA

for size in (16, 48, 128):
    # Standard (shown on dark browser UI) → light K
    render_k(size, LIGHT_FG).save(os.path.join(OUT, f"logo-{size}.png"))
    # Darkmode variant (shown on light browser UI, per manifest theme_icons) → dark K
    render_k(size, DARK_FG).save(os.path.join(OUT, f"logo-{size}-darkmode.png"))

# Primary logo.png (used by <img> tags in-app) = 128 dark on transparent
render_k(128, DARK_FG).save(os.path.join(OUT, "logo.png"))

# Full-width wordmark variants used by Logo.tsx (h-14 = ~56px tall).
def render_wordmark(color: tuple[int, int, int, int], filename: str, target_h: int = 128):
    if FONT_PATH:
        font = ImageFont.truetype(FONT_PATH, int(target_h * 0.82))
    else:
        font = ImageFont.load_default()
    tmp = Image.new("RGBA", (2000, target_h * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), "Krystal", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x = int(target_h * 0.15)
    pad_y = int(target_h * 0.10)
    W = tw + pad_x * 2
    H = th + pad_y * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((pad_x - bbox[0], pad_y - bbox[1]), "Krystal", font=font, fill=color)
    img.save(os.path.join(OUT, filename))

render_wordmark(DARK_FG, "logo-full.png")         # for light UI
render_wordmark(LIGHT_FG, "logo-full-white.png")  # for dark UI

print("Icons written to", OUT)
for f in sorted(os.listdir(OUT)):
    print(" -", f)
