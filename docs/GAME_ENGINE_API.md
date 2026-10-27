# Sam's Starship gameplay API — Agent 1 handoff

The engine continues the existing cooperative deduction game. This update changes setup and adds shared equipment and character cards. Agent 2 owns presentation and adapter integration; this branch does not edit those files. Do not merge or deploy without review.

## Setup and Captain

```ts
new GameEngine(missionId, difficulty, seed, tuningOverrides, legacyToolSettings, options)
```

All arguments are optional. Import types and `GameEngine` from `src/engine`.

`options: EngineOptions` accepts an injectable `random` function, an optional three-item shared `equipment` loadout, and per-character `powers` configuration. The only approved `powerId` is `doubleDetector`; unknown powers reject setup. An enabled/disabled override configures each character independently. Default: all three have Twin Signal. The shared loadout accepts implemented `ToolId`s with an integer `unlockNumber` in the blue range. Options are constructor configuration retained across subsequent missions.

First Captain is selected using a pseudorandom draw from the mission seed (or injected random source). Production already generates the seed using crypto randomness. Every subsequent `startMission` or `restartMission` rotates to the next eligible crew member in Sam → Nova → Pip order. `Mission.captainEligible` may restrict the eligible set. Captain identity is `state.captain`, independent of `currentParticipant`. Captain starts turn 1 after setup and has no additional ability or access to hidden information.

New missions begin with `phase: 'startingInformation'`. Normal actions reject during setup. `startingInformationChoices` contains only Sam's own blue circuit IDs. Call `chooseStartingInformation(id)` with the player's explicit choice. It spends neither energy nor a turn, cannot select yellow/red or teammates' circuits, and cannot be repeated. `startingInformation` retains `{participant,circuitId,value}` markers throughout the mission, including after resolution. Markers also appear in `publicReveals` with reason `startingInformation`.

Each `advanceAI()` during setup places one pending AI marker, selecting the highest blue circuit from that AI's own observation. Setup AI calls work even when `currentParticipant` is Sam. After Sam chooses, run pending AI setup calls until `phase === 'turns'`. A participant with no blue circuit is exempt; do not invent a blue marker. Once all eligible participants have chosen, the Captain starts. Setup calls do not change turn number. Do not schedule ordinary AI turns until setup completes.

## Redacted authoritative state

`getGameState()` and all mutations return detached, player-visible snapshots. Hidden teammate circuits contain only ID, owner, position and restored flag. Own or publicly revealed circuits also have kind, numeric `value`, `sortLabel`, and `matchingIdentity`. No seed or answer board is exposed. Captain never changes visibility. AI receives its own `AIObservation`, not Sam's view or the private board.

- `captain`, `phase`, `currentParticipant`, `turnNumber` identify setup and turn state.
- `startingInformation`, `startingInformationChoices` drive setup controls.
- `equipment` reports shared unlock progress, usage and availability.
- `characterCards` reports each personal ability and usage separately.
- `selfMatches` and `revealRedActions` report Sam's rule eligibility, including explanations. These are inventory eligibility; additionally gate actions by phase, mission status and active participant.
- `numberTracker`, `specialTracker`, `remainingCircuits`, `status`, hull and clock are engine-owned. Never update counters in presentation code.
- `tools`, `toolToken`, `shieldActive` and `scannerResults` retain legacy support contracts.

All circuit IDs and positions remain fixed when resolved. Four-copy Solo Cut adds two to legacy pair-equivalent `restored`; each safely isolated red adds one half. Prefer trackers and remaining circuit counts for progress.

## Normal actions

`selectCircuit(ownId)` selects an unresolved Sam circuit without spending a turn. `attemptConnection(targetId, number)` validates that number equals the selected circuit's value, resolves a blue numeric match or yellow category match, or applies one ordinary mistake. Invalid declarations, ownership, restored targets and off-turn actions reject. Correct and incorrect attempts consume a turn. A direct red target always fails the mission immediately, regardless of shield or the legacy `redInstantFailure` flag.

`selfMatch(firstOwnId, secondOwnId)` and `resolveSolo(number)` resolve all remaining copies of a matching identity only if exactly two or four remain and all belong to Sam. They explicitly verify that no teammate holds an unresolved matching circuit. Yellow copies match as a category despite different sort keys. Red cannot Solo Cut. Success consumes one turn, updates trackers and equipment, and emits the existing success aliases. Invalid Self-Match emits `SELF_MATCH_INVALID` without spending a turn or hull.

`resolveRedSafely(ownRedId)` checks that every unresolved circuit in the active player's own hand is red, then reveals and resolves ALL those red circuits together and consumes one turn. Teammates may still hold blue/yellow circuits. `revealRedActions[0]` lists Sam's red IDs and eligibility. The existing mission safe-rule enable/disable setting is respected. AI uses the same own-hand condition.

`shareCircuit(ownId)` remains the separate paid disclosure action: one energy and one turn. `passTurn()` spends a turn. `advanceAI()` performs one conservative AI turn after setup, skipping empty hands. `advanceTime(elapsedMs)` applies actual elapsed time; zero ends the mission. `restartMission()` resets equipment, powers, markers and resources with the same board seed, and rotates Captain. Sequence missions remain unavailable.

## Shared equipment

Exactly three items are assigned for three participants. They are shared, not owned by the participant whose index provided a slot. Each begins locked, unlocks when TWO blue copies of its associated number resolve (including four-copy Solo Cut), and exhausts after one use. Yellow resolution never unlocks blue-number equipment. Unlock progress comes from the engine board; equipment does not regenerate.

Default original abilities:

| ID | Ability | Unlock | Timing and effect |
| --- | --- | --- | --- |
| equipment-0 | Pulse Probe (`scanner`) | Blue 1 | Any turn: public below/equal/above comparison of one hidden teammate circuit to an integer threshold. Does not reveal identity or spend a turn. |
| equipment-1 | Hull Buffer (`shield`) | Blue 2 | Any turn: block the next ordinary mistake's damage. No stacking; does not prevent catastrophic overload. Does not spend a turn. |
| equipment-2 | Logic Relay (`hint`) | Blue 3 | Any turn: deduction from Sam's visible information and public facts only. May report no narrower deduction. Does not spend a turn. |
| Configurable loadout | Twin Probe (`dualScanner`) | Configured blue number | Active Sam turn: same two-target resolution rules as Twin Signal, spending one turn and the shared item, independently of Sam's personal power. |

Custom ranges shift default unlocks to the first three configured blue numbers, wrapping for ranges shorter than three.

Each `EquipmentAvailability` contains `id`, `toolId`, `unlockNumber`, `resolvedCopies`, `state: locked|ready|used`, `available`, `remainingUses`, `validTargetIds`, `description`, and `timing`. Display engine availability and send:

```ts
engine.useEquipment(id, {
  token: renderedState.toolToken,
  targets: [hiddenCircuitId], // scanner; two IDs for Twin Probe
  threshold: 6,             // scanner only
  ownId, number,            // Twin Probe only
});
```

A valid use immediately exhausts the item and invalidates the request token. Invalid commands leave state unchanged. Any-turn equipment works while an AI is active, using Sam's redacted observation. The default loadout is original Sam's Starship content, not a claim to reproduce proprietary Equipment cards.

## Personal character cards

Every crewmate has one independent Twin Signal card (`powerId: doubleDetector`) with one use per mission. Additional powers are not invented or enabled. `characterCards` exposes participant, name, description, state (`locked|ready|active|used`), remainingUses, requirements and validTargetIds. Sam's target IDs contain hidden circuits in teammate hands with at least two hidden targets. AI target lists are omitted to avoid exposing its private observation. Locked can mean setup, off-turn, disabled configuration or no legal Sam action. Synchronous activation emits events; there is no persistent animation phase or second activation callback.

```ts
engine.useCharacterPower(ownId, firstHiddenId, secondHiddenId, number, renderedToken);
```

Requires Sam's active turn, an unresolved own non-red circuit with the declared number, and two distinct hidden circuits in ONE teammate's hand. The engine spends the card once, then resolves one matching target if present; the other target stays hidden. On failure, exactly one non-red target is revealed and one mistake consequence applies. One red among the targets is safe; two red targets cause catastrophic overload. Both matching targets still resolve only one. No API result reveals whether the unchosen target also matched.

`advanceAI(true)` explicitly asks an active AI to use its personal card. It chooses its own first non-red circuit and two hidden circuits in one teammate hand from its isolated observation, then runs the same validation and resolution. This can be a risk. Ordinary `advanceAI()` remains conservative and does not silently spend the card. AI failed declarations expose the declared number but not the private own slot (`ownCircuitId` is an empty string in that public failure record).

## Legacy support tools

`tools` is a compatibility system, separate from the three shared equipment cards and all personal cards. Fifth constructor/startMission argument remains per-tool `{uses,unlocked}`. Legacy support charges and static unlock flags do not represent shared equipment progress. Agent 2 should use `equipment` for the new shared display and `characterCards` for personal powers.

Legacy `scanCircuit(hiddenId,threshold,token)` spends one charge and turn. `activateShield(token)` arms without spending a turn. `generateHint(token)` provides limited visible-information deduction without spending a turn; `requestHint` is a legacy alias and never an exact-target reveal. Legacy `dualScan(firstId,secondId,number,token)` requires selection and spends one charge/turn; it retains its previous red-risk behavior and is not the personal Double Detector implementation. Keep these available to existing integrations where needed, but do not label their static flags as the new equipment system.

Capture `toolToken` from the rendered snapshot for all equipment, personal-power and support requests. Never refresh it inside a queued duplicate click. Valid activations, setup choices, turns and mission resets invalidate it. Disable submission during handling as an additional UI guard.

## Yellow and red representation

All yellow circuits have `matchingIdentity: 'yellow'`. The numeric `value` remains an internal ordering/compatibility key; `sortLabel` displays e.g. `5A` for an inserted special sorting position. There are no B circuits. The declaration API still takes the selected yellow's numeric key for compatibility, but matching ignores differences between yellow keys. Do not display decimals as yellow labels or require 5A to match only 5A.

`numberTracker` contains one blue-number row with total/resolved/remaining/completed counts, retained after completion. `specialTracker` includes category totals, resolved count, candidate sort positions and confirmed own/public special circuit IDs. Candidate positions do not map to hidden slots; render them as possibilities. Hidden circuits omit labels and identity as well as value and kind. Existing missions remain blue-only below training stage 4, add yellow at stage 4, and red at stage 7.

## Events and presentation

Every event has `index`, `turn`, `message`. `getEvents(afterIndex)` returns detached history after a cursor. Reset cursors on restart.

New `RulesEvent` types: `STARTING_INFORMATION`, `POWER_ACTIVATED`, `POWER_USED`, `EQUIPMENT_UNLOCKED`, `EQUIPMENT_USED`, `CATASTROPHIC_OVERLOAD`. Relevant records contain participant, circuitIds, powerId/equipmentId and number. Catastrophic overload is followed by `RED_TRIGGERED`, `LOST`, `MISSION_FAILED` with reason red. Hull may remain positive and shields cannot intercept it; use terminal status and overload events.

Existing success signals remain: `CONNECTION_SUCCESS`, `CIRCUIT_PAIR_RESOLVED`, `SELF_MATCH_COMPLETED`, `SELF_MATCH_SUCCESS`, `NUMBER_COMPLETED`, `YELLOW_RESOLVED`, `RED_SAFELY_RESOLVED`. Ordinary failures emit `CONNECTION_FAILED`, `SHIP_ATTACK`, `SHIP_DAMAGED`; shield prevention adds `SHIELD_PREVENTED` with zero actual hull damage. Equipment scan/hint/shield emits the existing ability event. `MISSION_COMPLETED` / `MISSION_FAILED` and `WON` / `LOST` are terminal aliases.

Several event names describe the same outcome. Animate once per resolution/turn, do not double-apply damage or increment counters. Render engine state; events drive effects only. No final artwork, robot-mouse animation, adapter or UI source is changed in this engine update.

## Verification and integration

Engine tests explicitly complete free setup before legacy action regressions. New rules tests cover Captain rotation/eligibility, setup validation, AI, redacted snapshots, equipment unlocks at two/four copies, off-turn use, exhaustion, duplicate/stale requests, both-match power secrecy, single-/double-red exceptions, failure information, own-only Reveal Red, resets and labels. Production TypeScript/Vite build is required.

Reference: project owner's supplied eight-page rules, cross-checked against the [publisher's eight-page English rulebook](https://www.cocktailgames.com/wp-content/uploads/2023/10/BombBusters_rules_EN.pdf), pages 4, 6 and 7. Original SLButter names and ability text are used throughout.
