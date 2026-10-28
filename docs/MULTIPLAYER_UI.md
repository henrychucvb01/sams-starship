# Multiplayer UI integration

Human rooms use the authenticated room service described in `MULTIPLAYER_API.md`. `App` routes the approved animated title through **Assemble your crew!**. One human continues to the unchanged solo mission/AI adapter; 2–5 select room entry. No online game state is synthesized locally.

`src/multiplayer/roomClient.ts` owns admission, authenticated one-second polling, immutable external-store snapshots, durable browser credentials, and idempotent command retries. Tokens stay in browser storage and Authorization headers, never room codes/URLs or debug props. A pending request retains its revision and request ID until the user deliberately retries. A rejected stale revision refreshes the snapshot and requires a fresh action. Poll responses cannot roll back newer revisions. Refresh restores the saved seat. Leaving stops and aborts polling before the leave command. An explicit confirmation lets a player forget a reserved seat and enter a different crew. Expired sessions stop polling and offer fresh room entry.

`MultiplayerBoard` receives only that authenticated viewer's redacted `RoomView`. It renders separate server-provided rack indices, opaque participant IDs, human names/presence, Captain, persistent public markers, own values and public foreign disclosures. Own-only Solo and red isolation use server eligibility. Personal powers and shared equipment use the server's target IDs, availability, charges and tool token. Double Detector targets share both owner and rack; own circuits may come from either own rack. Connections, starting information, powers, equipment, sharing, Solo, isolation and replay all use the reusable accessible centered confirmation dialog. Tap, keyboard and drag select commands for review; drag never submits. Hidden values are never used in React eligibility or exposed in markup.

The original number tracker, embedded special badges, circuit effects, ship damage/shield/critical visuals, tooltip controls and reduced-motion behavior are reused. Crew portraits on the selection screen are original code-native SVG astronauts; approved title artwork is unchanged.

## Local browser testing

Start the service with `PORT=8788`, `STARSHIP_ORIGIN=http://127.0.0.1:5183`, and a local `STARSHIP_DB`. Start Vite with `VITE_MULTIPLAYER_URL=http://127.0.0.1:8788` on port 5183. Run Playwright with `STARSHIP_DEV_PORT=5183` and `STARSHIP_MULTIPLAYER_TEST=1`. The online tests use separate browser contexts and the real HTTP service. Without `STARSHIP_MULTIPLAYER_TEST`, online service checks are explicitly skipped; crew selection and the existing solo/title suites still run.

Production currently has no room backend configured. The owner requested deployment files with hosting later. A build with no `VITE_MULTIPLAYER_URL` clearly explains that online rooms are unavailable and keeps Solo + AI playable. Set the build-time HTTPS service origin only once the durable service is deployed; see `MULTIPLAYER_DEPLOYMENT.md`. No fake lobby or client-authoritative online fallback is enabled.

PowerShell commands used (run service and Vite in separate terminals):

```powershell
$env:PORT='8788'
$env:STARSHIP_ORIGIN='http://127.0.0.1:5183'
$env:STARSHIP_DB='../mp-ui-test.sqlite'
node --import tsx server/start.ts
```

```powershell
$env:VITE_MULTIPLAYER_URL='http://127.0.0.1:8788'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort
```

```powershell
$env:STARSHIP_MULTIPLAYER_TEST='1'
$env:STARSHIP_DEV_PORT='5183'
node node_modules/@playwright/test/cli.js test --workers=2 --reporter=line
npm test
npm run build
npm run check:server
```

The full-game multiplayer browser driver uses only the active viewer's own circuits and already-public foreign circuits. If it has no public match, it deliberately shares an own clue through the real command and confirmation dialog; it never joins other players' hidden numbers into a test solution. It completes the mission and verifies replay/Captain rotation on desktop and mobile.

## Validation result

- 76 engine, adapter, multiplayer authority, persistence and HTTP tests passed.
- 70 distinct desktop/mobile browser checks passed across the full suite and focused follow-up: 2–5 authenticated human rooms, private fields and separate rack counts, ready/start, setup/Captain, refresh, one-use powers/equipment, off-turn shared use, failed-network pending retry, mouse/touch drag cancellation, full public-information victory/replay, forget-seat entry, plus all original solo/title/accessibility/reduced-motion checks. One initial solo navigation check was interrupted by a Vite source reload during the leave fix; its frozen-source desktop/mobile rerun passed.
- TypeScript/Vite production build, strict server type check and Git whitespace check passed.
- Desktop/mobile selection and 2–5-player board screenshots were inspected. Mobile equipment follows the circuit board so the main play area stays first.
- Live online play remains intentionally unavailable until the separately deployable durable room service is hosted and its origin is configured.

## Final compiled-production verification

Agent 1 merged the tested UI with the engine without changing game behavior and verified the compiled Vite output, served through `vite preview` on port 5185:

- Four desktop/mobile checks passed with no online origin: real solo gameplay/tools/turns and the unavailable-online screen's path back to Solo.
- Four desktop/mobile checks passed with the real local durable room service on port 8789: a complete two-human public-clue mission, Captain rotation on replay, leaving/forgetting a seat and creating a different crew.
- The forget-seat test now waits for both the rendered new room code and its asynchronous response observer before comparing codes. This removes a test timing race without changing production behavior.
- The default build was restored after testing the configured-online build. Approved title assets, strict frontend/server type checks, UTF-8 source validation and Git whitespace checks passed. Docker deployment files are prepared; Docker execution and production backend hosting are deferred.
