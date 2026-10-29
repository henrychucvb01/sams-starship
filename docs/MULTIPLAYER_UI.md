# Multiplayer UI integration

Human rooms use the authenticated room service described in `MULTIPLAYER_API.md`. `App` routes the approved animated title through **Assemble your crew!**. One human continues to the unchanged solo mission/AI adapter; 2–5 select room entry. No online game state is synthesized locally.

`src/multiplayer/roomClient.ts` owns admission, authenticated one-second polling, immutable external-store snapshots, durable browser credentials, and idempotent command retries. Tokens stay in browser storage and Authorization headers, never room codes/URLs or debug props. A pending request retains its revision and request ID until the user deliberately retries. A rejected stale revision refreshes the snapshot and requires a fresh action. Poll responses cannot roll back newer revisions. Refresh restores the saved seat. Leaving stops and aborts polling before the leave command. An explicit confirmation lets a player forget a reserved seat and enter a different crew. Expired sessions stop polling and offer fresh room entry.

`MultiplayerBoard` receives only that authenticated viewer's redacted `RoomView`. It renders separate server-provided rack indices, opaque participant IDs, human names/presence, Captain, persistent public markers, own values and public foreign disclosures. Own-only Solo and red isolation use server eligibility. Personal powers and shared equipment use the server's target IDs, availability, charges and tool token. Double Detector targets share both owner and rack; own circuits may come from either own rack. Connections, starting information, powers, equipment, sharing, Solo, isolation and replay all use the reusable accessible centered confirmation dialog. Tap, keyboard and drag select commands for review; drag never submits. Hidden values are never used in React eligibility or exposed in markup.

The original number tracker, embedded special badges, circuit effects, ship damage/shield/critical visuals, tooltip controls and reduced-motion behavior are reused. The selection screen uses the approved pastel spaceport, separate Sam/Fox/Bunny/Cat/Bear transparent sprites and reusable blue/gold button artwork. Counts, labels and navigation remain functional HTML. The room/board portrait component and approved title artwork are unchanged. See src/assets/crew/README.md for provenance.

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

## Spaceport artwork integration (2026-10-28)

Approved spaceport/character/button exports replace only the crew-selection presentation. Selection still routes through the existing onSolo/onMultiplayer callbacks; room, session, private circuit, Captain, equipment, power and matching logic is unchanged. Five native radio options use the same two image assets, with HTML numbers/labels and an HTML Continue action. The five character sprites remain separate for lightweight CSS animation.

Validation: 76 engine/server/adapter tests and 74 desktop/mobile browser checks passed using the real local durable room service, including 2–5 human lobbies, private hands, refresh recovery, solo victory/retry and full multiplayer completion/replay. Approved asset checks, production build and strict server TypeScript checks passed. Artwork loading, selected/unselected state, equal 44px-or-larger targets, all five counts, native keyboard focus, reduced motion, no overlap and no horizontal overflow were checked at widths 320/390/768/1280. Desktop/mobile screenshots were inspected.

Two additional desktop/mobile smoke checks against the compiled production build passed.

## Game Modes card styling (2026-10-28)

The former mission-selection presentation is labeled Game Modes, with MODE numbering and a Play mode action. ModeArtwork reuses approved transparent crew sprites with decorative system icons; scoped navy/gold panels and the approved terminal background match the boarding screen. Existing engine IDs, difficulty validation, launch callbacks, training links and multiplayer behavior are unchanged. Future modes/difficulties remain visibly locked. No artwork was generated.

Production release build and approved title-asset checks passed. 58 desktop/mobile browser checks passed, covering mode artwork, 320/390/768/1280 layouts, disabled states, keyboard launch, reduced motion, training navigation, existing solo victory/retry, tools, powers, safe red, trackers and title/crew flows. Two additional compiled-production smoke checks passed. Screenshots of both layouts were inspected.

## Approved adventure menu

The Game Mode screen now uses the owner-approved Control Center, compact title, complete four-panel illustration and straight blank white/gold illustrated button. Source mapping is in `src/assets/game-modes/README.md`. Desktop preserves the combined composition; tablet/phone layouts show proportional portions of the same artwork. Native buttons select each panel (including future modes), with pressed state, keyboard focus and touch support. Only Easy Restore the Lights can launch; the other three modes and unsupported difficulties stay disabled.

Navigation is now title → Game Mode → Crew Selection → separate solo intro/game or existing multiplayer lobby. Crew Back returns to Game Mode. The Game Mode page omits the shared header/footer; other pages retain their existing chrome behavior. Training remains available. No server, engine, authority, private-state, Captain, equipment or character-power implementation changed.

Validation: release build and server type check pass; 76 engine/server/adapter tests, 78 desktop/mobile browser tests against a real local room service, and 2 compiled-production browser smoke tests pass. Layout checks cover 320, 390, 768, 1024 and 1440 pixels; all four selections, keyboard focus, reduced motion, difficulty locks, solo completion, 2–5 humans, privacy, powers/equipment, refresh/rejoin and replay Captain rotation are covered.

### Panel background correction

Removed the rectangular room scene surrounding the combined panels using SVG silhouette clips on the approved illustration. Desktop shows the four clipped panels over the Control Center; tablet/phone selections use individual clips from that same source. The image itself, engine and navigation remain unchanged. Release build and 8 focused desktop/mobile artwork/navigation checks pass.
