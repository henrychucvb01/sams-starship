# Circuit-board-first UI and revised engine integration

Branch `agent/game-ui` → `main`. Main merge and production deployment are authorized for completed, tested work. This update incorporates Agent 1's tracker/special engine commit `0f43bcd`; all engine modules are unchanged from that commit.

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

## Number register and special circuit presentation

This update consumes Agent 1's authoritative tracker/special API from `0f43bcd`. Engine modules remain unchanged. `numberTracker` maps directly to the read-only `NumberTracker` component: number, total/resolved copies, and completed flag. React does not count matching tiles, hold a separate completion state, or modify progress. Completed values remain visible with four pips and a checkmark. `NUMBER_COMPLETED` and alias resolution events never add a second increment in the UI.

`specialTracker` provides yellow/red totals, resolved counts and completion, mission-permitted possible sorting keys, and confirmed own/public IDs/keys. The adapter formats those as explicitly possible versus known positions. Zero-copy special categories are hidden. Per-tile `Circuit.kind` alone determines blue/yellow/red styling; hidden slots retain a neutral identity even if their position or candidates suggest a category. Fractional yellow/red sort keys appear only when supplied on an own/public tile. Yellow category matching is never inferred by equating sort keys. All moves still use the engine validation API.

Restore the Lights remains blue-only. Mission selection adds clearly labeled playtest entries for engine-defined Circuit Training 4 (yellow) and 7 (yellow/red); these do not imply automatic stage progression. Other missions/difficulties keep their prior availability. The special briefing explains category matching and red failure. `resolveRedSafely` is exposed for a selected own red tile; the engine alone checks whether other circuits have been cleared.

Legacy CONNECTION_SUCCESS/SHIP_ATTACK continue to drive ordinary feedback; duplicate aliases CIRCUIT_PAIR_RESOLVED, SELF_MATCH_COMPLETED and SHIP_DAMAGED are not animated twice. RED_TRIGGERED drives one distinct critical flash/cross-wire overlay, independent of hull. A red failure can occur at 100% hull and bypass a shield; status and final engine failure message control the results screen. RED_SAFELY_RESOLVED drives one success pulse.

## Pointer connections and future animation assets

Pointer Events support desktop dragging from a Sam tile and touch dragging from its labeled grip. Ordinary tile taps and keyboard selections remain available. Individual rack bodies scroll horizontally; the grip reserves touch gestures for connecting. While dragging, viewport edge scrolling and rack edge scrolling keep distant crew targets reachable. The glowing SVG follows actual tile coordinates and the current pointer. Pointer cancellation, invalid drops, turn changes and unmount clean up the drag/animation frame.

A drop only selects a source/target and opens **Are You Sure?**. It never calls an engine action. Confirm invokes the existing connection or Self-Match command; Cancel/Escape do not spend a turn, tool or hull. An own-to-own drop selects matching own tiles for engine-validated Self-Match. Pointer capture and a suppressed post-drag click prevent an extra tap from changing/submitting the drop. Multi-pointer initiation is rejected. No private values are read to identify targets.

`ConnectionOverlay.tsx` is a presentation-only extension point for confirming, confirmed, wire-grab, plugging and result phases. Current output is a lightweight terminal-result badge, SVG electricity and existing ship effects. A future robot-mouse renderer can use the scene/event ID/outcome and selected endpoints for grab/plug/celebration/shock sequences; it must never decide outcomes, increment counters or reissue engine commands. No robot, mouse, or alien character artwork was finalized. Reduced motion leaves static feedback and the directly controlled drag line usable.

New verification includes real-engine tracker completion, yellow matching across different sorting keys, hidden special secrecy, safe-red rejection, critical red failure under a shield, and mouse/touch drag/cancel with mobile edge scrolling. The standard mission is still completed to victory using rendered public information in browser QA.

## Tracker badge and confirmation review update

The number register now embeds small SVG bridge/overload badges in existing number tiles. The adapter projects only public specialTracker candidates/confirmed keys into structured positions; confirmed entries override the same candidate key. No hidden tile IDs or identities are assigned by this projection. The tracker groups positions by their associated integer tile and circuit kind; multiple candidates remain marked possible (dashed) unless that position is explicitly confirmed. Bridge labels use the display convention `5A` for an associated key such as 5.5; there are no B labels. This is tracker/modal presentation only; engine sorting keys, source rack labels, validation and rules are unchanged. Standard numbers, pips, resolved counts and dimensions are preserved. The separate special summaries and legend are no longer rendered. Tooltips and accessible SVG badge labels explain type and certainty.

ConnectionDialog replaces the inline confirmation bar with a native showModal() dialog in the browser top layer. It uses a translucent backdrop, source/hidden-target preview, target identity/slot and prominent Cancel/Connect controls. Cancel receives initial focus; Tab/Shift+Tab stay in the modal; Escape cancels; closing restores focus to the initiating tile or gameplay heading. Scroll locking preserves the board width. A submission ref lock and disabled controls prevent repeat calls; confirmation invokes the unchanged adapter commands, closes the modal, and leaves result effects to the existing engine-driven queue. Self-Match and drag drops use the same modal. Tool confirmations are unchanged.

The review update is committed on agent/game-ui only; it must not be merged into main without review. Browser checks cover modal centering, native top-layer semantics, focus, Escape, free cancellation, no board push, one failure consequence per double click, badge containment and no overlap at 390/740/820/1280px. The full mission driver now selects an unshared circuit from rendered transmission history rather than probing other tiles behind a modal.

### Unified tool confirmations and tracker colors

`ConfirmationDialog` now owns the native top-layer modal lifecycle for connections and all tool confirmations: backdrop, scroll lock, initial Cancel focus, focus trapping/restoration, Escape cancellation and synchronous submission lock. `CircuitBoard` supplies tool descriptions, remaining uses and public target selectors inside that modal. Selecting or canceling a tool never invokes an engine command; only Confirm Tool calls the existing adapter with its rendered token. Scanner choices expose crewmate names and slot indices only. Tool results continue through existing engine events and animations.

Number tiles use navy until the adapter's `complete` value is true, then green with dark contrasting number, checkmark, pips and count. Embedded special badges retain their public positions and certainty styles. No engine modules or gameplay rules changed.

### Crew support UI — pending Agent 1 API (review blocker)

The published agent/game-engine head at implementation time remains 0f43bcd. Its GameState and GAME_ENGINE_API.md have no Captain, character powers, shared equipment, starting-information phase/commands, or public safe-red eligibility. This UI change does **not** invent those rules, select a Captain, generate starting markers, calculate unlock progress, or pretend those features are integrated. The existing adapter does not populate the new feature fields. Integration and real-engine verification of those features remain blocked until Agent 1 publishes the update. Do not merge this preparation as a completed rules integration.

src/types/crewPresentation.ts is a **proposed presentation contract**, not a competing engine API:
- crewFeatures.captainId is rendered beside the matching row name. The UI never defaults to Sam.
- crew[] describes existing participants and their optional engine-supported power. Descriptions, requirements, availability, used flags and remaining uses must be mapped from Agent 1, not authored in React.
- equipment[] supplies unlock number, resolved/total progress, locked/ready/used status and the same public action description. No UI progress counter is stored.
- Every action supplies public labeled target options and required selection counts. CrewActionDialog renders those options and sends opaque IDs, choices and the rendered actionToken through performCrewAction. Agent 1's actual command names still need binding in the adapter.
- startingInformation supplies pending, legal blue availableIds, description and public marker IDs/labels. StartingInformation lets Sam explicitly choose, review, cancel or confirm through selectStartingInformation(id, token). No random default. Normal board controls are disabled while setup is pending. Agent 1 must own timer/setup/AI progression.
- isolateOverload must provide authoritative availability, reason, targets and consequences. The action stays disabled until supplied. The old engine's different after-other-circuits rule must not be silently presented as the owner's newly requested active-player rule.
- The existing public selfMatches contract is integrated now: both pair review and Self-Connection use engine eligibility and list all affected own slots. Invalid eligibility disables confirmation. Cancel calls no engine method. The legacy resolveSolo and selfMatch commands remain the source of validation.

Components:
- CharacterCard replaces only the existing rack header content; portraits remain approved placeholders. CaptainBadge uses an original SVG command emblem.
- InfoPopover exposes identical explanations via hover, focus and tap, with Escape/outside dismissal and viewport-constrained portal placement.
- EquipmentCards is a compact shared area separate from personal powers.
- All actions reuse ConfirmationDialog: native top-layer positioning, backdrop, focus trap/return, Escape, duplicate lock and explicit confirmation.
- Existing RED_SAFELY_RESOLVED maps to a safe-powerdown isolate visual; catastrophic red and normal success/damage events remain unchanged. New engine power/unlock/setup events still require adapter mapping once published.
- NumberTracker and its navy/green states and embedded badges are unchanged.

Testing: existing engine/adapter tests and real-engine board flows remain in use. tests/fixtures/crewHarness.tsx explicitly provides synthetic **presentation contract inputs only**, over a real-engine board, for UI testing of currently unpublished fields. Its test power/equipment names are deliberately labeled as test inputs; commands only record fixture interactions. It is not imported into production, contains no matching/damage/AI rules, and is not a substitute for real-engine integration testing. Remove or align these fixtures once the actual API is published.
