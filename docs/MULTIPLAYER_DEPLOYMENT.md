# Room service deployment

Hosting is deferred by the owner. The tested multiplayer service and client can run locally. Production solo remains independent. Until `VITE_MULTIPLAYER_URL` is configured in the frontend build, online room controls explain that the service is not connected.

## Local verification

Use Node 24 (includes `node:sqlite`):

```sh
npm ci
STARSHIP_ORIGIN=http://localhost:5173 npm run server
VITE_MULTIPLAYER_URL=http://localhost:8787 npm run dev
```

On PowerShell set each variable with `$env:NAME='value'` before running its process. Keep frontend host spelling consistent: `localhost` and `127.0.0.1` are different origins. Open separate browser profiles/devices for each player. Each profile owns one private identity. Never copy saved identity credentials to another player. Share only the six-character room code.

Run `npm test`, `npm run check:server`, `npm run build`, and the multiplayer UI tests with the real backend. Service tests use isolated in-memory or temporary SQLite databases and ephemeral loopback HTTP ports.

## Production host

Requirements: Node 24, an HTTPS reverse proxy, and a durable writable volume. This server is a long-lived process; do not deploy it as an ephemeral Vercel function. The frontend stays on Vercel. No credentials or database contents belong in `VITE_*` variables.

1. Set `STARSHIP_ORIGIN=https://starship.slbutter.com` (or the exact frontend origin) on the server host.
2. Run `docker compose -f compose.rooms.yaml up -d --build`. The named `rooms-data` volume persists sessions across container restarts. The backend binds only host loopback port 8787.
3. Route an HTTPS backend domain, for example `rooms.example.com`, to `127.0.0.1:8787` using the host's reverse proxy. Configure edge limits for create/join abuse and request sizes; preserve a single shared service/database.
4. Verify HTTPS `/health` returns `{"ok":true}`. Check that a browser from the configured frontend origin can create/join/read/command and that a different origin gets 403.
5. Set frontend build variable `VITE_MULTIPLAYER_URL=https://rooms.example.com` in Vercel, then rebuild/redeploy. Test two independent devices through a complete game, refresh/rejoin, explicit leave and host restart before announcing online availability.

Without Docker: `npm ci`, set `STARSHIP_HOST=0.0.0.0`, `PORT`, `STARSHIP_ORIGIN`, and `STARSHIP_DB=/persistent/path/rooms.sqlite`, then run `npm run server` under a service manager behind HTTPS. The default local database is `data/rooms.sqlite`, ignored by Git.

## Operational behavior

- SQLite transactions serialize changes and revision checks reject concurrent stale submissions. Request IDs deduplicate accepted retries. Polling reads authenticate and refresh presence.
- Room data includes hashed identity tokens and a server-only cryptographic deal key/journal. Protect and back up the volume as private game state. Browser responses contain neither the journal/key nor other players' hidden faces. HTTPS protects bearer credentials in transit. Tokens are generated from 256-bit randomness.
- Replaying the journal restores exact hands, powers, equipment, Captain and clock after process restart. The running clock includes downtime. Setup does not spend time. Expired sessions are removed on a cleanup interval; all explicit departures delete a session immediately. The idle limit is 2 hours and absolute lifetime 24 hours.
- One instance/volume is the supported deployment. Independent replicas with separate disks cannot share rooms. Scale-out or serverless hosting requires replacing the store with shared transactional storage, not process memory. Active journals depend on compatible engine rules; drain or expire sessions before an incompatible rules upgrade.
- Creation is capped at 1,000 live rooms, command history at 5,000 entries per room, and the latest 512 accepted request IDs are retained. HTTP bodies are limited to 8 KiB. The proxy should also apply public endpoint abuse controls.

Docker files are prepared but have not been run in this Windows environment unless explicitly reported in the change's validation notes. Hosting/domain setup remains a deployment task.
