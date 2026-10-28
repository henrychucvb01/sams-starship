"""Cut out and optimize the user's original planet/button pixels; never redraw."""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'src/assets/title'
specs = [
    ('AaGDWYMJXI95zvEXdlUICA-AaGDWYMJF6yazxFlMFJlpA.jpg', 'planet-pink', (440, 440), []),
    ('AaGDWYjFMxLAbuetFtPEDw-AaGDWYjFd0tD9hlaAu20HA.jpg', 'planet-purple', (520, 520), [(1015, 450), (200, 800)]),
    ('AaGDWY_U9bKIFEWHYjE2xQ-AaGDWY_UxztcUrsJxMz8mQ.jpg', 'lets-fly-button', (900, 300), []),
]
for filename, name, size, holes in specs:
    path = source / filename
    if not path.exists():
        print(f'Not yet supplied: {filename}', flush=True)
        continue
    image = Image.open(path).convert('RGBA')
    rgb = np.asarray(image)[:, :, :3].astype(np.int16)
    exterior = (rgb.min(2) > 220) & ((rgb.max(2) - rgb.min(2)) < 24)
    mask = Image.fromarray((exterior * 255).astype('uint8')).copy()
    for seed in [(0, 0)] + holes:
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128, thresh=0)
    alpha = Image.fromarray(np.where(np.asarray(mask) == 128, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.4))
    image.putalpha(alpha)
    image = image.crop(alpha.getbbox())
    image.thumbnail(size, Image.Resampling.LANCZOS)
    image.save(target / f'{name}.webp', quality=92, method=6, exact=True)
    print(name, image.size, (target / f'{name}.webp').stat().st_size, flush=True)
