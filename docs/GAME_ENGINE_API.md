# Agent 2 integration

## Status and ownership

React and React DOM are installed; Vite currently builds an engine library, not a rendered game. No UI files were created. Agent 2 owns the React entry point, HTML, styling, animation and mission/result screens. Change Vite from library mode to SPA mode when adding that entry point. Do not deploy this branch as a finished game.

`lights` / Easy is playable through this API. Other mission IDs (`navigation`, `engines`, `communications`) remain `availability: development`; hide or disable them in normal mission selection. Matching works across all difficulties. Sequence generation, submissions and hints work for development testing, but cooperative sequence interactions/story are not finished. No multiplayer, persistence, external APIs, assets or backend.

## Run

Node 22.12+ (validated on Node 24). `npm ci`, `npm test`, `npm run build`. Build runs strict TypeScript checking then emits `dist/engine.js`. `npm run dev` starts Vite; no UI entry point exists yet. Tests use Node's test runner through the tsx loader.

## Public API

Import `GameEngine`, `MISSIONS`, `DIFFICULTIES` and type contracts from `src/engine/index.ts`. Never import puzzle generators in UI: they are internal test/development utilities containing answers.

- `new GameEngine(missionId = 'lights', difficulty = 'easy', seed = 1, tuningOverrides = {})` starts immediately. Supply a fresh integer seed for a new puzzle; retain it outside rendered state for reproducible bug reports.
- `startMission(id, difficulty, seed, overrides)` starts a fresh mission.
- `getGameState()` returns a detached snapshot. AI slots contain IDs, owners and restored flags, never hidden values; seed and sequence answers are omitted. Sam's values are visible. Never derive guesses from generator imports or a seed.
- `selectCircuit(samSlotId)` selects one unresolved Sam circuit.
- `attemptConnection(aiSlotId)` compares it to an unresolved AI slot. Wrong guesses damage hull without disclosing the target. Selection clears after either result.
- `requestHint(aiSlotId)` spends one energy for a truthful numerical interval. Easy sends one exact number; Medium/Hard start wider and repeated requests narrow it. Only the requested slot is disclosed. For sequences, pass a sequence ID to request its pattern clue once.
- `shareCircuit(samSlotId)` spends one energy to transmit a single Sam value. Then `advanceAI()` lets a crewmate match its own circuit against that legitimate disclosure. This is how solo AI participates; it never reads Sam's private values automatically.
- `advanceAI()` performs at most one safe connection per eligible turn (every 1/2/3 calls on Easy/Medium/Hard). Use a modest UI interval, e.g. once per 2 seconds. No energy is spent on this acknowledgement/action. Repeated unresolved guesses are never made by AI.
- `advanceTime(elapsedMs)` advances the mission clock; pass actual elapsed time, not assumed interval duration. Use `performance.now()` deltas and reconcile after tab suspension. Terminal missions remain frozen.
- `submitSequence(sequenceId, integer)` validates a missing term in development sequence missions.
- `restartMission()` restores the same seeded puzzle and tuning with fresh hull, energy, timer, log and AI state.

Mutations return a fresh `GameState`. Invalid selections, exhausted energy, duplicate exact hints, invalid tuning and actions after mission end throw `Error`; catch and display these as feedback. Invalid actions do not charge energy or damage hull. Countdown expiry and zero hull lose; restoring all pairs wins. Stop UI timers on terminal state/unmount. No engine timer runs in the background.

## Minimal React wiring (Agent 2 owns implementation)

Keep a single engine in `useRef`; hold `engine.getGameState()` in React state. In each handler call `setState(engine.selectCircuit(id))`, `setState(engine.requestHint(id))`, etc. Clock/AI intervals call the same engine and refresh state. Clear intervals in effect cleanup. Avoid recreating the engine on each render. Refresh after errors if needed. All display data comes from `GameState`; history has stable increasing indexes for log keys. IDs are opaque slot identifiers, not numbers encoded in disguise.

## Difficulty and information model

All values live in `config.ts`; overrides are validated positive/ranged integers where required. Easy: 6 pairs, 100 hull, 5 minutes, 15 damage, 6 initial energy, exact single-slot clues. Medium: 8 pairs, 20 damage, 4 energy, +/-2 clues. Hard: 10 pairs, 30 damage, 3 energy, +/-4 clues. Correct restoration returns 1 energy. Easy is solvable entirely through truthful clues without blind guesses; starting energy covers every pair. Values are provisional.

Each pair spans Sam and one of two AI rooms; AI slot ordering is shuffled independently. Each AI strategy receives only its own private slots, redacted public slots, and paid numerical disclosures. It cannot access other private values or the seed. The engine owns the validation board in JavaScript private fields. Local browser code is inspectable by its owner: this is an information boundary for gameplay/UI, not anti-cheat security.

Sequence patterns are arithmetic on Easy, arithmetic/geometric on Medium, and add quadratic progressions on Hard. More terms, internal missing values and fewer initial hint units increase difficulty. No mission combines puzzle types.
