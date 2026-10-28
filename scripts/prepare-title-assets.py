"""Prepare approved source pixels only: exterior masks, sprite slicing, WebP encoding.

Usage: python scripts/prepare-title-assets.py <source-directory>
The user's files remain untouched. No generated/redrawn image is used.
"""
from pathlib import Path
from collections import deque
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'src/assets/title'
target.mkdir(parents=True, exist_ok=True)

# Current Muncher is the user's transparent single-character Canva export.
# Encoding only; do not generate variations or change its approved appearance.
if len(sys.argv) > 2 and sys.argv[2] == '--chibi':
    current = Image.open(source / 'Space Muncher — Black No Mouth Chibi.png').convert('RGBA')
    current = current.crop(current.getchannel('A').getbbox())
    current.thumbnail((384, 384), Image.Resampling.LANCZOS)
    current.save(target / 'space-muncher-chibi.webp', quality=91, method=6, exact=True)
    print('Saved current approved chibi Muncher')
    sys.exit(0)

def exterior_cutout(path, kind):
    image = Image.open(path).convert('RGBA')
    rgb = np.asarray(image)[:, :, :3].astype(np.int16)
    if kind == 'ship':
        exterior = (rgb.min(2) > 200) & ((rgb.max(2) - rgb.min(2)) < 26)
    else:
        exterior = (rgb[:, :, 0] < 32) & (rgb[:, :, 1] < 47) & (rgb[:, :, 2] < 95)
    mask = Image.fromarray((exterior * 255).astype('uint8')).copy()
    ImageDraw.floodfill(mask, (0, 0), 128, thresh=0)
    alpha = Image.fromarray(np.where(np.asarray(mask) == 128, 0, 255).astype('uint8'))
    # One-pixel antialiasing of the boundary; never recolor subject pixels.
    alpha = alpha.filter(ImageFilter.GaussianBlur(.45))
    image.putalpha(alpha)
    return image.crop(alpha.getbbox())

def save(image, name, max_size):
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    image.save(target / f'{name}.webp', quality=90, method=6, exact=True)
    print(name, image.size, (target / f'{name}.webp').stat().st_size)

save(exterior_cutout(source / 'AaF-7LvI87pPdm4CAJ0nRw-AaF-7LvI-Ika3_MZAgOGyQ.jpg', 'ship'), 'approved-ship', (1100, 850))
save(exterior_cutout(source / 'AaF-64cwLeKB579wnKFjAw-AaF-64cwreg8nHjgEzuv9A.jpg', 'logo'), 'starship-panic-logo', (1200, 700))

sheet = Image.open(source / 'Space Munchers — Extra Fuzzy Concept.png').convert('RGBA')
alpha = np.asarray(sheet)[:, :, 3]
remaining = alpha > 64
height, width = remaining.shape
components = []
for y, x in np.argwhere(remaining):
    if not remaining[y, x]:
        continue
    queue = deque([(int(x), int(y))])
    remaining[y, x] = False
    points = []
    while queue:
        px, py = queue.popleft()
        points.append((px, py))
        for nx, ny in ((px-1, py), (px+1, py), (px, py-1), (px, py+1)):
            if 0 <= nx < width and 0 <= ny < height and remaining[ny, nx]:
                remaining[ny, nx] = False
                queue.append((nx, ny))
    if len(points) > 6000:
        points = np.asarray(points)
        components.append((int(points[:, 0].min()), int(points[:, 1].min()), int(points[:, 0].max())+1, int(points[:, 1].max())+1))
if len(components) != 8:
    raise ValueError(f'Expected 8 separate approved creatures, found {len(components)}; inspect before proceeding')
components.sort(key=lambda b: (b[1] // 450, b[0]))
for index, (left, top, right, bottom) in enumerate(components, 1):
    # Padding preserves fine alpha fur around each connected silhouette.
    box = (max(0, left-5), max(0, top-5), min(width, right+5), min(height, bottom+5))
    save(sheet.crop(box), f'space-muncher-{index}', (320, 320))
