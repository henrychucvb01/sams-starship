# Starship Panic! Step 4

Based on Agent 1/2 integrated production commit e98e561960ec568ae8d2923c2acb69eaf775c6ca. Engine, adapter, circuit board, mission selection/setup, toolkit and settings behavior remain unchanged.

The title screen uses the user's approved logo, standalone cream/yellow ship with red diamond tail and all eight extra-fuzzy Space Munchers. Ten transparent WebP files total approximately 610KB. See src/assets/title/README.md for Canva provenance and reproducible preparation. Originals remain untouched. No generated replacements or copyrighted reference artwork are shipped.

The lightweight CSS timeline loops over 17 seconds: eight seconds of calm flight, five of swarm chase/dodges, four of sparkling escape and return to calm. Stars and pastel planets provide parallax. Title and Let's Fly! remain separate from decoration; launch uses existing mission selection. How to Play and Settings open existing accessible dialogs. No top branding bar, taglines, footer copy or bottom resource icons appear on the title screen, following the user's correction.

Motion supports the OS preference, persistent settings, explicit pause/resume and background-tab pausing. Leaving the menu unmounts the scene. Images are decorative to assistive technology, with an accessible title heading and normal keyboard buttons.

Release checks: npm run build:release, npm test, npm run test:ui, then compiled-production desktop/mobile smoke tests. Playwright supports STARSHIP_DEV_PORT and STARSHIP_BROWSER_CHANNEL=msedge where bundled Chromium is unavailable. Scene tests seek CSS animation clocks directly; JS fake clocks alone do not advance compositor animations. Review desktop/mobile calm, chase, escape, small phones and reduced-motion states before deployment.
