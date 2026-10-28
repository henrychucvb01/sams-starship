# Starship Panic! Circuit Rescue

A cooperative circuit-matching game with a separate Solo + AI mode and authoritative rooms for 2–5 human players.

```sh
npm ci
npm run dev
npm test
npm run check:server
npm run build
```

Solo runs locally with Sam, Nova and Pip. Human games use individual devices, authenticated private hands and a shared server-authoritative mission. Two players each have two separately sorted racks; at three players only the Captain has two; four and five players each have one. Both racks count as one hand.

For local multiplayer, start `npm run server` and build/run the frontend with `VITE_MULTIPLAYER_URL=http://localhost:8787`. Set the server's `STARSHIP_ORIGIN` to the exact frontend origin. See [API contract](docs/MULTIPLAYER_API.md) for room commands, identity/reconnect behavior, privacy and concurrency rules.

Production backend hosting is deferred. The frontend explains when online rooms are not configured, and Solo stays playable. [Deployment instructions](docs/MULTIPLAYER_DEPLOYMENT.md), `Dockerfile.rooms` and `compose.rooms.yaml` prepare a Node 24 service with a persistent SQLite volume behind HTTPS. No in-memory or browser-only substitute is used for multiplayer.
