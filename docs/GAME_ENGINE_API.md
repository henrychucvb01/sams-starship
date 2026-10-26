# Revised circuit deduction engine — Agent 2 handoff

This correction supersedes the original matching rules in PHASE1_GAME_SPEC.md. No UI, adapter, package, or Vite configuration files changed in this correction. Agent 2 must update its adapter: this API intentionally changes the old free-action gameplay.

## Status and verification

Restore the Lights is playable through a pure TypeScript engine. Default deck: 1–12, four copies each, 48 tiles / 24 pair-equivalents, 16 sorted tiles per room. Three participants: Sam (human), Nova, Pip (AI). Slot IDs and zero-based positions stay fixed even after resolution; render resolved tiles as inactive anchors/gaps rather than renumbering the row. Duplicates are adjacent.

Other matching mission definitions remain development content. Sequence missions are configuration placeholders and startMission rejects them. Their independent generator/validator is retained in puzzles.ts for future development. No simultaneous puzzle types, backend, paid AI, or multiplayer.

Run `npm ci`, `npm test`, `npm run build` (Node 22.12+). Build checks strict TypeScript and emits the engine library. React presentation remains on Agent 2's branch.

## Breaking API changes

Import `GameEngine`, `MISSIONS`, `DIFFICULTIES`, and types from `src/engine/index.ts`.

- `new GameEngine(missionId='lights', difficulty='easy', seed=1, overrides={})` / `startMission(...)`: start with Sam, turn 1. Full restart is atomic on invalid configuration. Tuning now uses `numberMin`, `numberMax`, `copies`, `hull`, `durationMs`, `damage`, `energy`, `rewardEnergy`, `deductionPasses`. Removed the old pairs/clueWidth/aiEvery/sequenceLength tuning fields. Copies must be even (2–12), range 1–99; standard defaults are four copies of 1–12. Same seed and settings replay identically.
- `getGameState()`: detached player-visible snapshot. See types.ts for documented contracts. Own tiles show value; other tiles omit it unless publicly revealed by clue, mistake or resolution. No seed/answer board is returned. `possibilities` is now empty by default; logical assistance is available only through the charged Hint tool.
- `selectCircuit(samCircuitId)`: selection only; no turn spent.
- `attemptConnection(targetCircuitId, declaredNumber)`: declaration is REQUIRED and must equal the selected active Sam tile's number. UI flow: select own tile, choose an opponent tile, type a number, submit. Declaring a different number, missing arguments, wrong ownership, inactive tiles, or off-turn actions throw without changing gameplay. Valid correct and incorrect attempts both end the turn.
- `requestHint(otherCircuitId, toolToken)`: legacy alias for the limited logical Hint tool; the target argument is ignored. Exact-answer target hints are removed. Prefer generateHint(toolToken).
- `shareCircuit(ownCircuitId)`: spend one energy to publicly transmit ONE Sam number; end turn.
- `resolveSolo(number)`: resolve all active Sam tiles of that number ONLY if they account for every remaining copy. Eligibility follows own inventory + public resolved counts; no information about hidden locations is returned on rejection. Successful solo action ends turn and emits CONNECTION_SUCCESS with all resolved IDs.
- `passTurn()`: human may pass when no desired action is available.
- `advanceAI()`: performs exactly ONE current AI turn, then returns. Throws on Sam's turn. Never run AI on every clock tick regardless of whose turn it is. Schedule the next AI only when status is playing and currentParticipant is not sam. Wait for visual effects if desired; engine contains no animation timers. Empty rooms are skipped automatically.
- `advanceTime(actualElapsedMs)`: countdown; zero loses. Terminal state is frozen. UI owns performance.now() deltas, suspension reconciliation and interval cleanup.
- `getEvents(afterIndex=-1)`: detached history strictly after cursor; index resets on restart. Reset the animation cursor on mission start/restart.
- `restartMission()`: same seed/config, clean state and Sam turn 1. For a fresh board, call startMission with a new seed.

All gameplay mutations return GameState. Catch errors to show validation feedback. Old submitSequence is unavailable until cooperative sequence gameplay is designed.

## State / layout

`participants`, `currentParticipant`, `turnNumber`, `circuits`, `publicReveals`, `incorrectGuesses`, `remainingCircuits`, `hull`, `maxHull`, `damageStage`, `energy`, `remainingMs`, `status` and `history` are authoritative. Render Nova/Pip sorted rows at top and Sam at bottom using position. Resolved tiles remain in circuits with restored=true and public value, but cannot be selected. restored/total use pair-equivalents: a four-tile solo resolution increases restored by 2. remainingCircuits counts tiles.

Example shape before a reveal (abbreviated, not a complete fixture):

```ts
{
 currentParticipant: 'sam', turnNumber: 1,
 distribution: { min: 1, max: 12, copies: 4 },
 circuits: [
   { id: 'sam-0', owner: 'sam', position: 0, restored: false, value: 1 },
   { id: 'nova-0', owner: 'nova', position: 0, restored: false }
 ],
 publicReveals: [], incorrectGuesses: [],
 hull: 100, maxHull: 100, damageStage: 'normal', status: 'playing'
}
```

## Animation contract

GameEvent is a discriminated union in types.ts; every event has index, turn and message. Correct/solo resolution emits CONNECTION_SUCCESS with participant, circuitIds and number. Wrong attempts emit CONNECTION_FAILED with participant, declaredNumber, targetCircuitId, revealedNumber and damage; then SHIP_ATTACK:

```ts
{ type: 'SHIP_ATTACK', source: 'incorrect_connection',
 damage: 15, hullBefore: 100, hullAfter: 85,
 targetCircuitId: 'nova-4', revealedNumber: 5, severity: 'light',
 index: 2, turn: 1, message: 'Enemy impact' }
```

Animate projectile → impact/shake/sparks → hull change using these values, once per index. Failure event and attack event describe the same damage; do not apply it twice. The engine already applied hull changes; visual interpolation is presentation only. Lethal attack is followed by LOST with no new turn. No unsuccessful connection is marked restored.

Damage stage uses hull percentage: >75 normal, >50 light, >25 moderate, >0 critical, zero destroyed. Attack severity is critical at <=25%, medium at <=50%, otherwise light. Damage reports actual loss clamped at zero, not an overkill penalty.

## AI reasoning and secrecy

AI input is an isolated AIObservation: own values, all sorted positions/restored flags, public reveals, public incorrect guesses, deck distribution, energy and deduction budget. Sam's own visible values are NOT automatically public to AI. No complete solution or seed enters the strategy. Public resolved values remain count/order anchors.

Constraint propagation intersects domains with known numbers, incorrect guesses, ascending-neighbor bounds and four-copy counts. If four slots are fixed to a number, exclude it elsewhere; if only four candidate slots remain, force them. This is conservative inference, not an exhaustive solver. AI connects only a singleton target matching an owned number; otherwise resolves eligible solo copies, sends a paid own-number clue, or passes. There are no arbitrary AI risks. Easy/Medium/Hard use 48/8/1 propagation passes, 8/5/3 starting clue energy and 15/20/30 damage. Correct actions restore 1 energy. Standard deck remains 1–12 on all three levels; missions may override range/copies.

A clue spends a turn; selection does not. AI can pass repeatedly when energy is exhausted and inference is uncertain. Human may choose a risky legal connection, use a clue, or pass. This prototype does not claim every random deal can be solved without risk, nor does it have an exhaustive certainty solver. Countdown still applies.

Private solution is stored in JS private fields, not state/events/debug logs. UI must not import puzzle generators, expose seeds or attach engine internals to window. Local code remains inspectable; future multiplayer requires server-authoritative hidden state.

## React coordination

Retain one engine in useRef and snapshot in React state. Replace the previous adapter's one-argument attemptConnection and timer-driven advanceAI calls. Disable actions off Sam's turn. Show declarations, public mistake history, turn labels, solo and pass actions. Consume structured events instead of interpreting log messages. Keep UI/animation state outside engine. This branch does not overwrite Agent 2's adapter or shared application configuration; bring these engine files into the UI branch and resolve those integration changes there.


# Self-Match and Support Tools update

Self-Match is a standard move. `selfMatch(firstSamTileId, secondSamTileId)` checks two distinct equal active tiles. If every unresolved copy belongs to Sam, ALL remaining copies (four or two with standard settings) resolve together. `resolveSolo(number)` remains a compatible shortcut with the same validation. No charge or energy cost. AI uses identical eligibility through its existing solo action. Invalid attempts emit SELF_MATCH_INVALID and throw a clear explanation; hull, turn and inventory do not change. `selfMatches` exposes Sam-only eligibility and explanations even on AI turns. Tile positions remain fixed.

Pass a fifth constructor/startMission argument for per-tool configuration, e.g. `{ scanner: { uses: 2, unlocked: true }, hint: { uses: 0, unlocked: false } }`. Each of scanner, dualScanner, shield and hint defaults to one unlocked use. Restart restores the configured charges. The unlocked flag is a hook for future mission progression; automatic progression unlocks are not implemented.

`state.tools[id]` exposes unlocked, remaining `uses`, `available` and `validTargetIds`. Only active hidden opponent tiles are eligible scanner/dual targets. Shield/Hint are untargeted. For Dual Scanner, UI also needs a selected active Sam tile and TWO distinct validTargetIds. Charges never regenerate. Standard restoration energy rewards do not restore tool charges.

Every tool call REQUIRES the `toolToken` from the rendered state. Capture it in the click handler; DO NOT fetch a fresh token for a queued duplicate click. Successful activations invalidate it immediately; turns and restarts also invalidate it. Reusing the same request cannot spend another charge, even when configured with multiple uses. Invalid commands do not spend charges or advance turns. Disable buttons while handling/animating a request as well.

| API | Effect | Ends turn |
| --- | --- | --- |
| `scanCircuit(hiddenId, threshold, token)` | Public below/equal/above comparison, stored in scannerResults and available to all AI deductions. Threshold must be an integer inside the mission range. No raw hidden value returned. | Yes |
| `dualScan(firstHiddenId, secondHiddenId, declaredNumber, token)` | Requires selected owned tile with that number. If either target matches, resolves own tile and first matching target only; does not disclose the unchosen target. If neither matches, records both exclusions, applies ONE incorrect-connection consequence and reveals only the first target. | Yes |
| `activateShield(token)` | Arms a team shield until the next incorrect connection, including AI/dual failures. No stacking. Correct moves do not consume the shield. It prevents exactly one damage penalty while mistake reveals still occur. | No |
| `generateHint(token)` | One limited deduction from Sam's own sorted row, public revelations, mistakes and scanner results. May give a logically certain singleton, but never consults private target values. If no narrower domain exists, gives a truthful general strategy statement. No board-wide answer reveal. | No |

SupportEvent extends the existing GameEvent union with SELF_MATCH_SUCCESS / SELF_MATCH_INVALID, SCANNER_ACTIVATED, DUAL_SCANNER_SUCCESS / DUAL_SCANNER_FAILED, SHIELD_ACTIVATED / SHIELD_PREVENTED and HINT_GENERATED. Each has participant, circuitIds, index, turn and message; number, scanner, possibilities and damagePrevented are present as applicable. Self-Match also emits the existing CONNECTION_SUCCESS for compatibility; animate it once rather than twice. Shield prevention still emits SHIP_ATTACK with actual damage 0 and unchanged hull; animate shield interception using SHIELD_PREVENTED. A failed dual scan emits one attack, never two. Invalid Self-Match changes history only.

Agent 2: add a Self-Match selection mode for two own tiles; use selfMatches explanations to explain unavailable matches. Add tool buttons/threshold input/two-target mode, and consume these events using the existing cursor. No UI/adapter files are changed by this engine update. Existing exact requestHint calls need replacement and token handling. Sequence missions still remain unavailable.
