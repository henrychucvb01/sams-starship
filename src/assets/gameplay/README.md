# Approved gameplay artwork

All files are optimized crops/exports of owner-approved artwork. No replacement art was generated.

- `terminal.webp`, `terminal-window.webp`, `crew-monitor.webp`, `ship-monitor.webp`, `local-console.webp`: **Blank Neon Sci-Fi Cockpit Interface.png**, the latest blank vertical terminal, without baked portraits, slots or controls. Window and frame sections allow a variable number of real crew rows. CSS nine-slice frames preserve corner artwork while letting blank centers accommodate readable content.
- `cartridge-{blue,red,yellow,green,gray}.webp`: the five separate blank cartridges cropped from **Five Neon Sci-Fi Data Modules.png**. Original metallic connectors, accent colors and blank centers are retained. Background pixels are retained from the approved sheet; no new shapes or imagery were painted.
- `portrait-frame.webp`: **Futuristic Neon Sci-Fi Portrait Frame.png**.
- `message-panel.webp`: **Futuristic Neon Sci-Fi HUD Banner.png**.
- `captain-badge.webp`: **Glossy Galactic Captain Crown Badge.png**.
- `setup-popup.webp`: **Futuristic Empty Spaceship UI Frame.png**, the blank blue-and-gold popup. Its decorative X is covered with a required-setup lock; it is not a close control.
- `confirm-button.webp`: a trim of the existing approved `crew/continue-gold.webp`, reused for starting-information confirmation.

Ship status reuses the approved `title/approved-ship.webp`. Character artwork reuses the previously approved crew cutouts and server-selected cosmetic roster. Nova and Pip retain their existing letter portraits inside the approved frame: individual approved Nova/Pip portrait files have not been supplied. Equipment/power controls retain their current illustrations and behavior.

Numbers, questions, slot labels, selection, progress pips, messages, status values and actions are live HTML. Cartridge lights never contribute to progress calculations. No engine, AI, deck, room service or game rules changed.

`damaged-monitor.webp`: blank second panel cropped (25,280,724,466) from owner-approved “Damaged Spaceship Bridge: DANGER status.png”, Library libfile_a46dd34618688191892e36c833c36daf. Used only as the defeat result frame; baked status labels from the source are excluded.

## Dynamic ship damage monitor

- `ship-healthy.webp`: **Top-Down Colorful Sci-Fi Spaceship.png**, approved Library asset `libfile_7e195ae006e88191987ebec7c51a58b0`.
- `ship-damaged.webp`: **Battle-Worn Cartoon Spaceship Overhead.png**, approved Library asset `libfile_b3d513d38d40819193ab8db0b32f53a3`.
- Both originals are 1672×941. Normalized to RGB. The damaged source is registered to the healthy reference by translation **(+3,+5) source pixels**, without rotation, stretching or independent scaling. Translation is the median offset from three stable high-correlation patches: healthy centers (559,310), (806,385), (937,164) matched to damaged centers (556,305), (803,377), (935,160). Local generated damage changes some contours; remaining stable-landmark differences are under two pixels in the 960px export.
- Both registered images use the identical crop **(90,0,1650,910)** and proportional resize to **960×560**, WebP quality 88, method 6. Combined image payload: **218,466 bytes**. The originals' orientation, colors, stars, engine glow and smoke are retained; no replacement art is generated.
- `ShipDamageMonitor.tsx` uses a healthy base plus five copies of the same cached damaged asset, each with a fixed soft elliptical CSS mask. Cockpit, upper engine, central hull, lower engine and rear systems activate progressively at presentation thresholds 100/80/60/40/20. Only zone opacity transitions; the entire damaged image is shown at zero hull or authoritative defeat. The displayed percentage and bar still show the actual supplied hull even for a catastrophic defeat that leaves numeric hull above zero.
- Zone positions and strengths derive only from supplied hull/maxHull and terminal status, never randomness or local elapsed time. CSS handles damage/repair glows and reduced motion. No engine, server, rule, database or network-command changes are involved.

## Owner-supplied circuit tracker artwork

The October 29 uploads are used directly, without generating replacements:

| Export | Owner attachment | Crop in original pixels | Export size |
| --- | --- | --- | --- |
| `tracker-blue.webp` | Glossy Cyan Sci-Fi Console Panel(1).png | (90,145,1040,1210) | 320×359 |
| `tracker-green.webp` | Neon Green Completion Badge(1).png | (145,110,1010,1185) | 320×398 |
| `tracker-yellow.webp` | Glowing yellowSci-Fi Module.png | (125,55,1120,1130) | 320×346 |
| `tracker-red.webp` | Glossy red Sci-Fi Module.png | (235,130,1055,1025) | 320×349 |
| `tracker-border.webp` | Futuristic Neon Sci-Fi HUD Banner(1).png | alpha > 8 bounds (28,67,2021,609) | 1440×392 |

WebP quality 90, method 6. Module aspect ratios are retained. The HUD uses a sliced border so its illustrated corners stay intact. Blue and green are the main number-tracker states; yellow and red are the existing public special-position badges. The source's four gold connector lights are not treated as always-lit decoration: an aligned darkened copy covers the original lamp bank, then each of the four original lamp windows is independently restored to full brightness according to `tracker.numbers[].resolved`. Numbers and counts remain HTML; completion comes from the engine's `complete` flag. No connection counters, matching rules or private information are inferred or changed.
