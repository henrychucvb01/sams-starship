# Starship Panic! Step 4

Based on Agent 1/2 integrated production commit e98e561960ec568ae8d2923c2acb69eaf775c6ca. Engine, adapter, circuit board, mission selection/setup, toolkit and settings behavior remain unchanged.

The title screen uses the user's approved logo, standalone cream/yellow ship with red diamond tail and eight independent instances of the updated Black No Mouth Chibi Muncher. Three transparent WebP files total approximately 297KB. See src/assets/title/README.md for Canva provenance and reproducible preparation. Originals remain untouched. No generated replacements or copyrighted reference artwork are shipped.

The lightweight CSS timeline loops over 17 seconds: eight seconds of calm flight, five of swarm chase/dodges, four of sparkling escape and return to calm. Stars and pastel planets provide parallax. Title and Let's Fly! remain separate from decoration; launch uses existing mission selection. How to Play and Settings open existing accessible dialogs. No top branding bar, taglines, footer copy or bottom resource icons appear on the title screen, following the user's correction.

Motion supports the OS preference, persistent settings, explicit pause/resume and background-tab pausing. Leaving the menu unmounts the scene. Images are decorative to assistive technology, with an accessible title heading and normal keyboard buttons.

Release checks: npm run build:release, npm test, npm run test:ui, then compiled-production desktop/mobile smoke tests. Playwright supports STARSHIP_DEV_PORT and STARSHIP_BROWSER_CHANNEL=msedge where bundled Chromium is unavailable. Scene tests seek CSS animation clocks directly; JS fake clocks alone do not advance compositor animations. Review desktop/mobile calm, chase, escape, small phones and reduced-motion states before deployment.

## Motion revision, 2026-10-28

Replaced the old swarm with eight independently steered instances of Canva MAHZUD2vxVA (Black No Mouth Chibi), downloaded at original resolution through signed-in Chrome. The old eight-sprite sheet assets are retired; total title art is now about 297KB. Current art and reproducible encoding are documented in src/assets/title/README.md.

Near stars now pass one seamless tile every six seconds, distant stars every nine seconds. Planets drift across on independent 28–42-second passes and reset only while offscreen. Current CSS planets remain pending the user's new art. The 17-second story retains calm/chase/escape timing. Individual Muncher routes have unique entrance vectors, arrival offsets, scale, bank and hover. There is no animated group transform.

The ship makes two sharp dodges (upward at about 9.5s, downward at about 11s), then uses a short engine flare, concentrated moving sparks and speed streaks to accelerate out. It relocates only while fully offscreen, re-enters from the left at hyperspeed, overshoots slightly under braking, and settles to an identical end/start pose. Reduced motion and pause affect every new effect.

## Planets/button and quicker return, 2026-10-28

Replaced both CSS planet illustrations with the user's downloaded pink cratered planet and purple ringed planet (MAHZUO1ior8, MAHZUPcsf9E). Removed the remaining CSS mint planet. Their existing parallax drift remains; originals are untouched. Added the approved cream/red launch-panel artwork (MAHZUHBgyl4) with live Let's Fly! text inside the existing semantic button. The original aspect ratio is preserved; keyboard focus, Enter/Space activation and mission selection remain available.

Ship relocation now occurs between 83% and 84.2% of the 17-second clock, rather than waiting until 87%. Hyperspeed arrival begins at 84.3%, reaches the visible approach by 87.5% (about 14.9s), brakes at 90.5% and settles by 94%. Corresponding return flare/streak timing is advanced. Offscreen relocation and identical start/end pose are preserved. Title tests verify the ship is already visible by 14.9s, both planet images and the illustrated button load, and controls work at desktop/mobile/320px sizes.

## Three booster outlets and clear return, 2026-10-28

All eight staggered Muncher routes now finish fading by 14.025s at the latest (local 79% plus the 595ms maximum arrival delay), before the ship's return phase starts at 14.331s. Tests sample the full return window, not only the first creature, and retain the quicker arrival timing.

Replaced the floating center-back effect with three separate emitters measured on the approved mirrored 1100x800 ship: upper (7.6%, 32.5%), middle (2.1%, 52.8%), lower (13.9%, 73.6%). Each emitter is anchored at a blue engine outlet, rotated along the engines' rearward axis, and owns a flare, trail and four sparks. All are inside the ship's transformed coordinate space; container units scale them with the artwork on mobile. No ship pixels or gameplay files changed. Reduced motion and pause cover all three effects.
