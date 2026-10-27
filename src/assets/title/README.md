# Approved Starship Panic! title assets

These ten transparent WebP files derive from the user's three original exports supplied on 2026-10-27 from Desktop/SL Butter Art. Originals remain untouched there and in Canva folder FAHZO-esueI.

- starship-panic-logo.webp: Canva MAHZO34uaYw, original AaF-64cwLeKB579wnKFjAw-AaF-64cwreg8nHjgEzuv9A.jpg. 1200px wide. Only exterior navy background removed; logo backing, blue outline and approved lettering preserved.
- approved-ship.webp: Canva MAHZO73M8dQ, original AaF-7LvI87pPdm4CAJ0nRw-AaF-7LvI-Ika3_MZAgOGyQ.jpg. 1100px wide. Only connected exterior checkerboard removed. Cream/yellow panels, blue lights and red diamond retained. No lettering or pilot. Source faces left; CSS mirrors it to fly right.
- space-muncher-1.webp through space-muncher-8.webp: Canva MAHZO1Og2zc, original Space Munchers — Extra Fuzzy Concept.png. All eight creature silhouettes sliced individually from existing alpha, preserving fur. Maximum 320px per sprite.

Total approximately 610KB. WebP quality 90 with alpha. No animated image or video.

scripts/prepare-title-assets.py <source-directory> reproduces preparation with Pillow and NumPy. Subject pixels come from the approved sources; no generated/redrawn replacements are shipped. ImageGen cutout attempts added unwanted glow/design drift and were discarded, including the logo attempt. Neither those attempts nor thumbnails are used in the game.

Run node scripts/check-title-assets.mjs to check all ten files and alpha encoding, then build and run browser tests. Identity, edges and animation phases also require visual inspection.
