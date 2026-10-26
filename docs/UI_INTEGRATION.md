# Playable UI integration

`agent/game-ui` incorporates Agent 1's `agent/game-engine` commit history. Engine source files are unchanged. Target the UI PR at `feature/first-playable-prototype`, not main. The former engine-library Vite build is now a normal static React SPA for Vercel preview builds.

## Run and validate

- `npm ci`
- `npm run dev`
- `npm run build`
- `npm test` — engine and real-adapter tests
- `npx playwright install chromium` then `npm run test:ui` — desktop and mobile browser flows

## Boundaries

`src/adapters/engineAdapter.ts` imports only the engine's public barrel. It maps `getGameState()` to the redacted `MissionView` contract, catches command errors for visible feedback, and owns scheduling. The engine owns every match, damage amount, clue, reward, AI decision, victory and defeat.

`App` subscribes with `useSyncExternalStore`. Its circuit workbench consumes Sam's public numbers and AI slot IDs/restored flags. A hidden number appears only after an exact clue explicitly supplied by the engine. Clue intervals remain intervals. No UI or adapter imports puzzle generators, seed-derived answers, or private boards.

Connect invokes `selectCircuit` then `attemptConnection`. Request clue invokes `requestHint`. Share selected Sam circuit invokes `shareCircuit`. A 250ms scheduler advances the clock using actual `performance.now()` elapsed time; AI advances at most once per two seconds. The scheduler reconciles tab suspension and stops at terminal state, leaving gameplay, and unmount. Restart resets the same seeded puzzle and reactivates scheduling. Settings/help do not pause an active mission.

The status strip, ship overview, communication log, circuit panel and results consume adapter snapshots. Engine `restored`, `mistake`, `hint:*`, `transmitted`, `won`, and `lost` events map to presentation feedback. Ship lights derive only from restored progress. CSS provides motion with OS and user reduced-motion support.

## Assets and limitations

No mock adapter or scripted outcome controls remain. Only Restore the Lights / Easy is offered for play; other missions and difficulty selections show Coming Soon. Sound is explicitly unavailable. The CSS spaceship is original temporary environment artwork. Sam's dashed `S` marker is labeled TEMP ART, with five expression hooks ready for approved mascot art. No replacement mascot has been invented.

The provisional UI-only contract is in `src/types/presentation.ts`. Agent 1's public engine contracts remain authoritative; future engine changes should be handled in the adapter, not component gameplay rules.
