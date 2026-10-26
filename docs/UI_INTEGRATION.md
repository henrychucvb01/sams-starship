# Circuit-board-first UI and revised engine integration

Branch `agent/game-ui`, PR #2 → `feature/first-playable-prototype`. Main merge and production deployment are authorized for completed, tested work. This update incorporates Agent 1's revised engine commit `6c82ee5`; all engine modules are unchanged from that commit.

## Player experience

Nova and Pip's numerically sorted racks appear above Sam's. The engine's `position` is authoritative; all 48 tile IDs/positions persist after resolution. Each row has an avatar, player identity, active-turn indicator, remaining count and its own horizontal scrolling container. Desktop tiles fit 16-slot rows on wide screens; mobile keeps readable, touch-sized tiles and fixed labels outside the scroll region. The small spaceship remains visible beside the board on desktop and above it on mobile. Mission status is a compact ribbon rather than dashboard cards.

Select one Sam tile and one crew tile to open a declaration panel. The selected Sam number is prefilled and read-only: no arbitrary declaration is accepted. Cancel clears the target; changing tiles updates the confirmation. Connect calls `selectCircuit` followed by the revised two-argument `attemptConnection(target, selectedNumber)`. Off-turn/restored/terminal actions are disabled. The engine independently validates every action. Pass and selected-number solo resolution call the engine's public commands; UI does not calculate solo eligibility.

## Public state boundary

`src/adapters/engineAdapter.ts` imports only `GameEngine` and public types from the engine barrel. There are no generator/private-board imports, seed-derived answers or engine references exposed on window.

- Racks map public `circuits`, sorted by engine `position`. AI values appear only when `getGameState()` explicitly includes them following a clue, mistake or resolution.
- `currentParticipant` and `turnNumber` drive turn labels and disabled controls. Thinking labels are presentation during the scheduled AI pause; the UI never decides whose turn comes next.
- Unlimited deduction tooltips are removed. Production does not render possibilities or exact-answer hint buttons. Sam’s Hint is an explicitly charged, engine-generated deduction.
- `incorrectGuesses` persist on target tiles as excluded declarations. Public mistake numbers and all clue/connection records remain reviewable in the expandable deduction log.
- Status ribbon, communication panel, ship condition and results consume adapter snapshots. Progress is in pair-equivalents; Remaining counts individual circuits.

## Event-driven effects

`CONNECTION_SUCCESS` maps directly to a success effect with participant and all resolved circuit IDs. Both tiles glow, an SVG arc connects their actual rendered tile centers, the cleared anchors stay in place, and ship systems light up. Four-tile solo successes glow every affected tile.

`CONNECTION_FAILED` supplies the public declaration/reveal log. `SHIP_ATTACK` produces one visual damage event; these two events never apply damage twice. The engine owns hull changes. The adapter maps the matching public failed guess to both selected endpoint IDs, and includes the actor for AI action highlighting. Fatal attack events remain in the queue even when immediately followed by LOST.

`useEffects` queues unseen stable event IDs and never invokes engine commands. Projectile, impact flash, sparks, short shake and Sam's surprised marker provide feedback. Hull stages use actual percentage: normal 76–100, minor 51–75, heavy 26–50, critical 1–25, shutdown 0. Smoke/flicker and captions persist as appropriate. Every effect is bounded to at most one second; terminal results wait 1.1 seconds for the final impact. Reduced-motion OS/user preferences remove moving effects while keeping static state feedback.

## Scheduling and restart

A 250ms scheduler advances actual `performance.now()` deltas, reconciling tab suspension. AI is scheduled 1.3 seconds after the engine starts a non-Sam turn; `advanceAI()` is called exactly once for that current AI turn, never on Sam's turn. The engine chooses the next participant, skips empty racks and determines actions. Timers stop on terminal state, leaving gameplay and unmount. Restart resets the seeded mission, event history/cursors, selections and scheduler. The same puzzle is retained for retry, as specified by the engine API. Settings/help do not pause gameplay.

## Assets, mocks and limitations

The ship is original CSS environment art. Sam remains a dashed TEMP ART marker with thinking, happy, surprised, worried, celebrating and sad hooks. Nova and Pip use temporary initial avatars. Approved mascot/character art is pending. Sound is explicitly unavailable. Only Restore the Lights/Easy is enabled; other content remains Coming Soon.

Production uses the revised real engine, with no mock fallback or compatibility gameplay. `tests/fixtures/boardHarness.tsx` is a labeled visual-only fixture for deterministic interaction/effect checks. `tests/fixtures/realHarness.tsx` uses the real standard engine with fixed seed 42 (and an optional fatal-damage override) for repeatable browser verification. Both HTML entries are test-only and excluded from the production SPA build.

## Validation

- `npm ci`, `npm run dev`
- `npm run build`
- `npm test`: revised engine + real adapter tests
- `npx playwright install chromium`, `npm run test:ui`: desktop and iPhone-size touch layouts

Browser tests solve the real 48-tile standard mission using only public rendered deductions/clues; verify victory, fatal mistake/reveal/attack, timer defeat and restart; check real AI turns, action disabling, no document overflow, fixed rack order, settings and unavailable features. Isolated visual fixtures additionally exercise keyboard selection, read-only declaration, cancel, duplicate-click prevention, SVG feedback, public reveal persistence and reduced motion.


## Self-Match and Sam’s Toolkit

Select two distinct equal Sam tiles to open Connect Pair. The adapter invokes `selfMatch(firstId,secondId)`; `selfMatches` supplies eligibility/explanations. No eligibility or remaining-copy rule is recalculated in UI. Four-copy successes draw arcs across all four affected stable anchors; CONNECTION_SUCCESS is animated once, not again for SELF_MATCH_SUCCESS. Invalid attempts display the engine explanation without damage or a spent turn.

Easy tools are configured in the engine constructor: scanner and dualScanner unlocked=false; shield and hint retain one use each. The panel renders engine availability, charges and validTargetIds. Both later-mission scanners are implemented and tested through engine-enabled test configuration, but remain locked in the first mission. Scanner accepts one hidden target and a threshold; Dual Scanner accepts two distinct engine-valid targets and a selected Sam tile. Scanner comparisons persist on the tile/log. Dual success resolves only the engine-chosen pair and leaves the unchosen circuit secret.

The confirmation click captures toolToken from the rendered snapshot and passes it unchanged. The adapter never refreshes the token for a queued duplicate request. Engine tokens reject repeated charges; UI clears selection on submission and disables inappropriate tool controls. Charges do not replenish from connections; restart restores the configured tools.

SCANNER_ACTIVATED drives a beam. DUAL_SCANNER_SUCCESS/FAILED drives a two-target scan followed by the normal engine outcome. SHIELD_ACTIVATED surrounds the ship with energy; SHIELD_PREVENTED drives interception and suppresses the associated zero-damage SHIP_ATTACK animation. Hull remains engine-owned. HINT_GENERATED drives a thinking reaction and persistent limited clue panel. All public tool messages remain in history.

Browser coverage uses the real engine for four-copy Self-Match, invalid eligibility, finite hints, Easy scanner locks, shield interception, and later scanner/dual interactions. Engine tests cover two remaining copies, AI Self-Match, shield exhaustion and token idempotency. The browser full-mission test driver reasons from rendered public board information; no unlimited deduction assistance is shipped in the UI.

To verify an external deployment on desktop and mobile: `STARSHIP_TEST_BASE_URL=https://starship.slbutter.com npm run test:ui`. This selects tests/deployed.spec.ts and skips the local development server. Production uses neither fixed-seed realHarness nor scripted boardHarness: both are excluded from the built SPA.
