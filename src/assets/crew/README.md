# Approved spaceport boarding artwork

This directory contains optimized WebP exports for the crew-selection screen only. Text, radio choices, focus rings, selected state and navigation remain HTML/React. No room/server/engine logic or approved title-screen assets are changed.

| Export | Owner-approved source |
| --- | --- |
| `spaceport.webp` | Pastel Chibi Spaceport Vista.png — original terminal background, no replacement scene |
| `sam.webp` | Sam’s Cheerful Spaceport Adventure.png — original yellow mascot, helmet, backpack, melted corner and red S/L bow tie |
| `fox.webp` | Cheerful Fox Explorer in Spaceport.png — blue/white suit |
| `bunny.webp` | Chibi Bunny Astronaut at Spaceport.png — latest two-upright-ear version, lavender suit; earlier floppy-ear versions are excluded |
| `cat.webp` | Center character from Chibi Astronauts at the Spaceport.png — pink suit |
| `bear.webp` | Right character from Chibi Astronauts at the Spaceport.png — yellow suit |
| `selection-blue.webp` | Glossy Neon Space UI Tile.png — original blank navy option artwork |
| `selection-gold.webp` | Glowing Golden Space Selection Card.png — original blank gold option and checkmark |
| `continue-gold.webp` | Glossy Yellow Planet Button.png — original horizontal blank golden button |

The full-resolution approved originals were found among the owner's ChatGPT image exports after inspecting the supplied Canva folder. No thumbnail assets were used. The original background/continue artwork was converted directly to WebP. The five characters and two square buttons were edited only for transparent-background extraction, then trimmed to their alpha bounds and downscaled for delivery. Character extraction was visually compared with the approved artwork, including Sam's bow tie and the bunny's ear count.

Background-extraction prompt constraints: remove only the surrounding spaceport/floor/reflections (or the flat outer button canvas); preserve the original subject, pose, colors, facial details, costume, accessories, border, stars and planet; no replacement scene, redesign, new pose, text or numbers. For the cat/bear sheet, keep only the specified center/right character. Transparent cutouts were produced with the built-in image-editing tool. WebP conversion/cropping/resizing used Pillow; no new illustration was commissioned.

Nine production assets total approximately 665 KiB. Five separate character images can animate independently. Only the two approved square option graphics are reused for all five choices. Names and crew count remain presentation, not player/character assignment or any new game rule.
