import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { RoomService } from './rooms';
import { createRoomServer } from './http';

const database = resolve(process.env.STARSHIP_DB ?? 'data/rooms.sqlite');
mkdirSync(dirname(database), { recursive: true });
const service = new RoomService(database);
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.STARSHIP_ORIGIN ?? 'http://localhost:5173';
const server = createRoomServer(service, origin);
server.listen(port, process.env.STARSHIP_HOST ?? '127.0.0.1', () => {
  console.log(`Starship room service listening on ${port}; allowed frontend ${origin}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  server.close(() => { service.close(); process.exit(0); });
});
