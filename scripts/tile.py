"""Turn a generated texture into a seamless repeating tile.

Usage: python scripts/tile.py <name> [--size 512] [--match "#676d38"]

Reads assets/raw/<name>.png, writes public/art/<name>.webp. The image is blended with a copy of itself
rolled by half its size: the copy's edges are the original's middle, so they wrap cleanly, and the
original covers the copy's seam in the centre. --match shifts the average colour to the given one, so
the tile sits on the same felt as the rest of the scene.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

ap = argparse.ArgumentParser()
ap.add_argument("name")
ap.add_argument("--size", type=int, default=512)
ap.add_argument("--match")
args = ap.parse_args()

img = Image.open(ROOT / "assets" / "raw" / f"{args.name}.png").convert("RGB")
side = min(img.size)
img = img.crop((0, 0, side, side)).resize((args.size, args.size), Image.LANCZOS)
a = np.asarray(img, dtype=np.float32) / 255
n = args.size

rolled = np.roll(a, (n // 2, n // 2), axis=(0, 1))
# Weight for the original: 1 in the middle, falling to 0 at the edges.
ramp = 1 - np.abs(np.linspace(-1, 1, n))
w = np.clip(np.minimum.outer(ramp, ramp) * 3, 0, 1)[..., None]
out = a * w + rolled * (1 - w)

if args.match:
    target = np.array([int(args.match[i : i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255
    out = out * (target / out.reshape(-1, 3).mean(0))

Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(
    ROOT / "public" / "art" / f"{args.name}.webp", quality=88
)
print(f"public/art/{args.name}.webp {n}x{n}")
