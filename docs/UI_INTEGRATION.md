# Circuit-board-first UI and revised engine integration

Branch `agent/game-ui`, PR #2 → `feature/first-playable-prototype`. No merge into main or production deployment. This update incorporates Agent 1's revised engine commit `b878d81`; all engine modules are unchanged from that commit.

## Player experience

Nova and Pip's numerically sorted racks appear above Sam's. The engine's `position` is authoritative; all 48 tile IDs/positions persist after resolution. Each row has an avatar, player identity, active-turn indicator, remaining count and its own horizontal scrolling container. Desktop tiles fit 16-slot rows on wide screens; mobile keeps readable, touch-sized tiles and fixed labels outside the scroll region. The small spaceship remains visible beside the board on desktop and above it on mobile. Mission status is a compact ribbon rather than dashboard cards.

Select one Sam tile and one crew tile to open a declaration panel. The selected Sam number is prefilled and read-only: no arbitrary declaration is accepted. Cancel clears the target; changing tiles updates the confirmation. Connect calls `selectCircuit` followed by the revised two-argument `attemptConnection(target, selectedNumber)`. Off-turn/restored/terminal actions are disabled. The engine independently validates every action. Pass and selected-number solo resolution call the engine's public commands; UI does not calculate solo eligibility.

## Public state boundary

`src/adapters/engineAdapter.ts` imports only `GameEngine` and public types from the engine barrel. There are no generator/private-board imports, seed-derived answers or engine references exposed on window.

- Racks map public `circuits`, sorted by engine `position`. AI values appear only when `getGameState()` explicitly includes them following a clue, mistake or resolution.
- `currentParticipant` and `turnNumber` drive turn labels and disabled controls. Thinking labels are presentation during the scheduled AI pause; the UI never decides whose turn comes next.
- Public `possibilities` populate tile tooltips for deduction; they are conservative engine deductions, not a private answer board.
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
