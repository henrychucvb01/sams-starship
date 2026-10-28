# Approved Starship Panic! title assets

Three transparent WebP files total approximately 297KB. Originals remain in Canva and the user's exported files.

- starship-panic-logo.webp: Canva MAHZO34uaYw, source AaF-64cwLeKB579wnKFjAw-AaF-64cwreg8nHjgEzuv9A.jpg. 1200px wide. Exterior navy background removed; logo backing, blue outline and approved lettering preserved.
- approved-ship.webp: Canva MAHZO73M8dQ, source AaF-7LvI87pPdm4CAJ0nRw-AaF-7LvI-Ika3_MZAgOGyQ.jpg. 1100px wide. Exterior checkerboard removed. Cream/yellow panels, blue lights and red diamond retained. No lettering or pilot. CSS mirrors the left-facing source for rightward flight.
- space-muncher-chibi.webp: Canva MAHZUD2vxVA, Space Muncher — Black No Mouth Chibi. Downloaded the original through the user's signed-in Canva folder on 2026-10-28. Source is 1312x1199 RGBA. Preserved original alpha, cropped transparent margins and encoded at 384x354, quality 91 (39874 bytes). No redraw, recoloring, mouth or generated variants. Eight instances share this one asset but own independent routes, entrances, scale, hover and bank timings. Replaces the eight legacy Extra Fuzzy sprites, retained in Git history and Canva.

scripts/prepare-title-assets.py <source-directory> --chibi reproduces the current Muncher encoding with Pillow. The default legacy preparation path documents original ship/logo masks and old sprite slicing; its old eight creature outputs are no longer used by the game. Never replace approved art with thumbnails or generated substitutes.

Run node scripts/check-title-assets.mjs, production build and browser tests after changes. Visually inspect identity, alpha edges and animation phases.
