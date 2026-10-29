# Approved Game Mode artwork

Owner-approved originals from the SLButter project conversation, exported as WebP without repainting or substitution:

- `control-center.webp`: Chibi Spaceship Bridge Command Deck.png
- `adventure-title.webp`: Choose Your Adventure Space Banner.png
- `four-panels.webp`: Neon Mission Hub Panels.png (original illustration clipped to the four angled panel silhouettes; shared composition on desktop and individual clipped panels on smaller screens)
- `blank-button.webp`: Glossy Golden Glass UI Button.png (latest straight-on white/gold version)

Title and button exports trim transparent margins. All proportions and original panel colors are preserved. Button color variants use CSS filters on the same illustrated asset. Labels, descriptions, selection controls, difficulty, launch and unavailable states remain HTML. Engine and room service are unchanged.

`AdventurePanels.tsx` uses SVG clipping paths to remove the surrounding room from the four-panel illustration without repainting or changing its pixels. The separate Control Center is the only menu background.
