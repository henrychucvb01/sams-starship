# Multiplayer API — Agent 1 / Agent 2 contract

Solo continues to use `GameEngine` locally, Sam + Nova/Pip AI. Human mode uses only server responses. No client engine, seed, authority journal, token hashes, or other player's hidden values may enter client props/storage. Authoritative service: one Node 24 process with durable SQLite volume. Vercel continues hosting the frontend; configure `VITE_MULTIPLAYER_URL` to the HTTPS service origin. No service origin means the UI should explain that online rooms are not configured, while solo remains playable.

Types: `src/engine/multiplayer.ts` (`RoomView`, `RoomAdmission`, `RoomCredentials`, `CommandRequest`, `RoomCommand`). All responses JSON, cache disabled. Errors: `{error:{code,message}}`, HTTP 400 illegal action/validation, 401 identity, 404 unknown room, 409 stale/conflict, 410 expired, 429 rate limit.

## HTTP

- `POST /api/rooms` body `{name,playerCount,missionId?:'lights',difficulty?:'easy'}` -> 201 `RoomAdmission`.
- `POST /api/rooms/:CODE/join` body `{name}` -> 201 `RoomAdmission`.
- `GET /api/rooms/:CODE` with `Authorization: Bearer TOKEN` -> 200 `RoomView`. Poll ~1s; GET refreshes presence and reclaims the same seat after explicit leave if still reserved.
- `POST /api/rooms/:CODE/commands` with bearer token and `{revision,requestId,command}` -> 200 `RoomView`.
- `GET /health` -> 200 `{ok:true}`.

`CODE` is six uppercase letters/digits. Normalize entered codes uppercase. Admission returns `{credentials:{code,playerId,token},room}`. Persist credentials per room in localStorage for refresh/reconnect. The 256-bit token is the identity: never send playerId as authority, put tokens in URLs, or share them with the join code. Save a pending command/requestId through network retries. After a 409 refresh, show that state changed and ask for a new deliberate action; never silently reapply a stale cut. Successful duplicate requestIds do not spend actions twice. Starting the game requires the exact selected number of human players, all ready/connected, and the host's start command.

Commands:

```ts
{type:'ready',ready:boolean}
{type:'start'} // host; all ready
{type:'startingInformation',circuitId}
{type:'connect',ownId,targetId,number}
{type:'solo',number}
{type:'safeRed',circuitId}
{type:'power',ownId,firstId,secondId,number,token:game.toolToken}
{type:'equipment',equipmentId,command:{token:game.toolToken,targets?:string[],threshold?:number,ownId?:string,number?:number}}
{type:'share',circuitId}
{type:'pass'}
{type:'restart'} // host; finished game, rotates Captain
{type:'leave'}
```

`RoomView` has `code,revision,playerId,hostId,playerCount,status,players,game,expiresAt`. `players` contain `id,name,ready,connected,left`. `game` is null in lobby, otherwise existing `GameState` redacted for the authenticated player. Own circuit `value/kind/sortLabel/matchingIdentity` are visible. Foreign hidden circuits omit these fields completely, exposing only `id,owner,rack,position,restored`. Public starting markers/resolved/mistake circuits are visible to everyone. `circuits[].rack` is zero-based and position is relative to that rack. Use separate racks in rendering. Participant IDs are opaque strings, names from `players`/`game.participants`, all `control:'human'`. No AI scheduler or fake remote action.

GameState `startingInformationChoices,selfMatches,revealRedActions,equipment[].validTargetIds,characterCards[].validTargetIds` belong to the viewer. `currentParticipant` and `captain` identify real seats. A participant may choose one own blue starting marker during setup; turns start after everyone's choice. Clock stays paused during setup. Use the server's actual Captain first. Turn-changing actions require the active player. Equipment retains documented anytime/activeTurn rules, shared use and stale toolToken prevention. Personal power stays independent. Use engine snapshots for eligibility, do not infer unlocks client-side. Twin Signal selects two hidden targets in the SAME teammate rack (group by owner plus rack), as the rulebook specifies one teammate stand; the own selected circuit may be in either own rack.

Room expiry: 2h idle, 24h maximum; all explicit leaves remove the session. Lobby leaves free a slot, active-game seats stay reserved for credentialed rejoin. Host transfers on explicit departure or after 30s disconnected when another player polls. A returning prior host keeps their seat but does not reclaim host automatically. Disconnection does not leak or replace a player's seat; it never makes an AI take over. Refresh resumes your own private snapshot. Running mission clock continues through disconnection and server restart. Completed missions may be restarted by host; Captain rotates and racks are redealt by count.

## Original-game rack rules

Verified from publisher [English rulebook](https://www.cocktailgames.com/wp-content/uploads/2023/10/BombBusters_rules_EN.pdf), pp 2–4: 2 players = two racks each; 3 players = Captain two, others one; 4–5 players = one each. Deal equally per rack, sort each independently, combine racks as one hand for tools/powers/Solo Cuts/red isolation and one starting marker per participant. Captain rotates between missions. Starship's existing original equipment, clock, mission inventory and hull tuning remain the game adaptation.

## Deployment

The room service is not a Vercel function: process-local memory or ephemeral files are not a durable multiplayer backend. Run `npm run server` on a Node 24 host with `STARSHIP_DB` pointing at persistent storage and `STARSHIP_ORIGIN` set to the exact frontend HTTPS origin. `PORT` defaults to 8787; bind loopback locally, configure `STARSHIP_HOST=0.0.0.0` behind the host's HTTPS proxy. Do not scale multiple independent database copies. Backend provisioning/production origin is a deployment dependency, not something the frontend can emulate. See server tests for full local HTTP flows.
