"""Cut the raw Codex assets out of their backgrounds and write web-ready WebPs.

Usage: python scripts/cutout.py            (all assets)
       python scripts/cutout.py tree cloud (just these)

Raw PNGs live in assets/raw/, output goes to public/art/<name>.webp.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw"
OUT = ROOT / "public" / "art"

# name -> (background mode, max long edge in px)
ASSETS = {
    "style-key": ("plain", 1200),
    "back-pointing": ("plain", 1200),
    "title-sign": ("green", 1600),
    "signpost": ("green", 1200),
    "bridge": ("green", 1800),
    "cloud": ("green", 900),
    "tree": ("magenta", 1200),
    "backdrop-far": ("none", 2000),
    "backdrop-near": ("magenta", 2000),
    "town": ("green", 1600),
    "typewriter": ("green", 1000),
    "village": ("magenta", 1800),
    "foreground": ("magenta", 2400),
    "fence-tile": ("green", 800),  # cropped gap-to-gap from fence.png so it repeats along the rail
    "balloon": ("green", 700),
    "bush": ("magenta", 700),
    "post": ("green", 900),
}


def smoothstep(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def key_chroma(rgb, mode):
    """Alpha from how strongly a pixel leans toward the key colour, plus despill."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if mode == "green":
        lean = g - np.maximum(r, b)
    else:  # magenta
        lean = np.minimum(r, b) - g
    alpha = 1 - smoothstep(0.08, 0.22, lean)
    # Despill: remove the key colour's excess from semi-transparent and edge pixels.
    excess = np.clip(lean, 0, None)
    out = rgb.copy()
    if mode == "green":
        out[..., 1] -= excess
    else:
        out[..., 0] -= excess
        out[..., 2] -= excess
    return out, alpha


def key_plain(rgb):
    """Flood-fill the flat light backdrop inward from the image border."""
    # The backdrop and the soft shadow Codex paints around the card are both pale and
    # unsaturated (sat <= ~0.22); the kraft border and the stick are clearly saturated (>= ~0.33).
    value = rgb.max(-1)
    sat = (value - rgb.min(-1)) / np.maximum(value, 1e-6)
    near_bg = (sat < 0.27) & (value > 0.7)
    labels, _ = ndimage.label(near_bg)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge_labels[edge_labels > 0])
    return rgb, (~background).astype(np.float32)


def clean_alpha(alpha):
    """Drop specks, shave the halo by a pixel and soften the edge slightly."""
    solid = alpha > 0.5
    labels, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(solid, labels, range(1, n + 1))
        keep = np.isin(labels, 1 + np.flatnonzero(sizes >= max(400, sizes.max() * 0.002)))
        alpha = alpha * ndimage.binary_dilation(keep, iterations=2)
    img = Image.fromarray((alpha * 255).astype(np.uint8))
    img = img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(img).astype(np.float32) / 255


def process(name, mode, max_edge):
    im = Image.open(RAW / f"{name}.png").convert("RGB")
    rgb = np.asarray(im).astype(np.float32) / 255
    if mode == "none":
        out = im
    else:
        rgb, alpha = key_chroma(rgb, mode) if mode in ("green", "magenta") else key_plain(rgb)
        alpha = clean_alpha(alpha)
        rgba = np.dstack([np.clip(rgb, 0, 1), alpha])
        out = Image.fromarray((rgba * 255).astype(np.uint8))
        out = out.crop(out.getbbox())
    scale = min(1, max_edge / max(out.size))
    if scale < 1:
        out = out.resize((round(out.width * scale), round(out.height * scale)), Image.LANCZOS)
    out.save(OUT / f"{name}.webp", quality=88, method=6)
    return out.size


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = sys.argv[1:] or list(ASSETS)
    sizes_path = OUT / "sizes.json"
    sizes = json.loads(sizes_path.read_text()) if sizes_path.exists() else {}
    for name in names:
        mode, max_edge = ASSETS[name]
        w, h = process(name, mode, max_edge)
        sizes[name] = [w, h]
        print(f"{name}: {w}x{h}")
    sizes_path.write_text(json.dumps(sizes, indent=2) + "\n")


if __name__ == "__main__":
    main()
