// Episode 08 fixture: generates the two hero images deterministically.
//
//   assets/hero-large.png  — 4000×2250 PNG (oversized for a 1600 px-wide hero slot, lossless)
//   assets/hero-sized.webp — 1600×900 WebP (sized to the slot, lossy-encoded, quality 80)
//
// Both images are the same synthetic scene (a gradient sky, a sun disc, layered hills and a
// deterministic noise texture) so the pages are visually equivalent. No third-party assets.
// Rendering uses Python PIL (+ numpy) via child_process because Node has no stdlib image encoder.
// Output byte sizes are written to assets/asset-sizes.json.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const assets = path.join(here, 'assets');
fs.mkdirSync(assets, {recursive: true});

const py = String.raw`
import sys, json, numpy as np
from PIL import Image
out = sys.argv[1]

def scene(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    u, v = x / w, y / h
    # sky gradient: deep indigo at the top → warm amber near the horizon
    top = np.array([18, 22, 48]); hor = np.array([245, 150, 70])
    img = top[None, None, :] * (1 - v[..., None]) + hor[None, None, :] * v[..., None]
    # sun disc
    d = np.sqrt((u - 0.68) ** 2 + ((v - 0.52) * (h / w)) ** 2)
    sun = np.clip(1 - (d - 0.06) / 0.015, 0, 1)
    img = img * (1 - sun[..., None]) + np.array([255, 236, 190])[None, None, :] * sun[..., None]
    # three layered hills (darker as they come forward)
    for k, (amp, freq, base, col) in enumerate([
        (0.05, 3.0, 0.62, (60, 48, 96)),
        (0.06, 5.0, 0.74, (36, 30, 66)),
        (0.05, 7.0, 0.86, (16, 14, 32)),
    ]):
        edge = base + amp * np.sin(u * freq * np.pi + k) + 0.5 * amp * np.sin(u * freq * 2.3 * np.pi + 2 * k)
        m = (v > edge).astype(np.float64)[..., None]
        img = img * (1 - m) + np.array(col)[None, None, :] * m
    # deterministic fine texture (seeded) so the PNG cannot compress to almost nothing
    rng = np.random.default_rng(8)
    noise = rng.normal(0, 6, size=(h, w, 1))
    img = np.clip(img + noise, 0, 255)
    return Image.fromarray(img.astype(np.uint8), 'RGB')

large = scene(4000, 2250)
large.save(out + '/hero-large.png', 'PNG', optimize=False)
sized = large.resize((1600, 900), Image.LANCZOS)
sized.save(out + '/hero-sized.webp', 'WEBP', quality=80, method=4)
print(json.dumps({'large': large.size, 'sized': sized.size}))
`;

const r = spawnSync('python3', ['-I', '-c', py, assets], {encoding: 'utf8'});
if (r.status !== 0) {
  console.error(r.stderr);
  throw new Error('image generation failed (needs python3 with Pillow and numpy)');
}
const dims = JSON.parse(r.stdout.trim());
const sizes = {
  generatedAt: new Date().toISOString(),
  'hero-large.png': {bytes: fs.statSync(path.join(assets, 'hero-large.png')).size, width: dims.large[0], height: dims.large[1], encoding: 'PNG, lossless'},
  'hero-sized.webp': {bytes: fs.statSync(path.join(assets, 'hero-sized.webp')).size, width: dims.sized[0], height: dims.sized[1], encoding: 'WebP, quality 80'},
  slotWidthCssPx: 1600,
  note: 'Same synthetic scene, deterministic (seeded noise). Sizes are file bytes on disk, not transfer time.',
};
fs.writeFileSync(path.join(assets, 'asset-sizes.json'), JSON.stringify(sizes, null, 2));
console.log(JSON.stringify(sizes, null, 2));
