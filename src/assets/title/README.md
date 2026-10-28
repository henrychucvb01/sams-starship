# Approved Starship Panic! title assets

Six transparent WebP files total approximately 407KB. Originals remain in Canva and the user's exported files.

- starship-panic-logo.webp: Canva MAHZO34uaYw, source AaF-64cwLeKB579wnKFjAw-AaF-64cwreg8nHjgEzuv9A.jpg. 1200px wide. Exterior navy background removed; logo backing, blue outline and approved lettering preserved.
- approved-ship.webp: Canva MAHZO73M8dQ, source AaF-7LvI87pPdm4CAJ0nRw-AaF-7LvI-Ika3_MZAgOGyQ.jpg. 1100px wide. Exterior checkerboard removed. Cream/yellow panels, blue lights and red diamond retained. No lettering or pilot. CSS mirrors the left-facing source for rightward flight.
- space-muncher-chibi.webp: Canva MAHZUD2vxVA, Space Muncher — Black No Mouth Chibi. Downloaded the original through the user's signed-in Canva folder on 2026-10-28. Source is 1312x1199 RGBA. Preserved original alpha, cropped transparent margins and encoded at 384x354, quality 91 (39874 bytes). No redraw, recoloring, mouth or generated variants. Eight instances share this one asset but own independent routes, entrances, scale, hover and bank timings. Replaces the eight legacy Extra Fuzzy sprites, retained in Git history and Canva.

scripts/prepare-title-assets.py <source-directory> --chibi reproduces the current Muncher encoding with Pillow. The default legacy preparation path documents original ship/logo masks and old sprite slicing; its old eight creature outputs are no longer used by the game. Never replace approved art with thumbnails or generated substitutes.

Run node scripts/check-title-assets.mjs, production build and browser tests after changes. Visually inspect identity, alpha edges and animation phases.

## Planet and launch button artwork, 2026-10-28

Read directly from the user's Desktop/SL Butter Art folder; source files are untouched.

- planet-pink.webp: Canva MAHZUO1ior8, AaGDWYMJXI95zvEXdlUICA-AaGDWYMJF6yazxFlMFJlpA.jpg. 439x440; 34042 bytes.
- planet-purple.webp: Canva MAHZUPcsf9E, AaGDWYjFMxLAbuetFtPEDw-AaGDWYjFd0tD9hlaAu20HA.jpg. 520x353; 42972 bytes. Includes the approved rings; both white gaps inside the rings are transparent.
- lets-fly-button.webp: Canva MAHZUHBgyl4, AaGDWY_U9bKIFEWHYjE2xQ-AaGDWY_UxztcUrsJxMz8mQ.jpg. 900x285; 35570 bytes. Approved cream/red spaceship panel with blue end lights; rendered as decorative art inside a real keyboard-accessible button, with live HTML Let's Fly! lettering.

scripts/prepare-title-decor.py <source-directory> reproduces exterior background extraction and WebP optimization from these approved source pixels. No generated replacements are used.
