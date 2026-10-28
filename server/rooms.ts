import { randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { GameEngine } from '../src/engine/engine';
import { MISSIONS } from '../src/engine/config';
import type { Difficulty } from '../src/engine/types';
import type { CommandRequest, GameCommand, PlayerCount, RoomAdmission, RoomCommand, RoomView } from '../src/engine/multiplayer';

const IDLE_MS = 2 * 60 * 60 * 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CONNECTED_MS = 30_000;
export class RoomError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
type Member = { id: string; name: string; tokenHash: string; ready: boolean; seenAt: number; left: boolean };
type Entry = { actor: string; action: GameCommand | { type: 'restart' }; elapsed: number };
type Room = {
  code: string; revision: number; hostId: string; count: PlayerCount;
  members: Member[]; mission: string; difficulty: Difficulty; seed: number; dealKey: string;
  started: boolean; journal: Entry[]; lastTick: number;
  createdAt: number; touchedAt: number;
  requests: { actor: string; id: string }[];
};
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const fail = (status: number, code: string, message: string): never => { throw new RoomError(status, code, message); };
const validName = (name: unknown): string => {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 32 || /[\x00-\x1f]/.test(name)) return fail(400, 'INVALID_NAME', 'Use a name between 1 and 32 characters.');
  return name.trim();
};

/** One authority process + durable SQLite volume. Every mutation is a transaction.
 * Engines are rebuilt from a server-only journal; invalid commands never persist.
 * A process restart restores exact hands; a mission restart redeals and rotates Captain.
 */
export class RoomService {
  readonly db: DatabaseSync;
  constructor(path: string = ':memory:', readonly now: () => number = Date.now) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, data TEXT NOT NULL)');
  }
  close() { this.db.close(); }
  #transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  #load(code: string): Room {
    if (typeof code !== 'string' || !/^[A-Z2-9]{6}$/.test(code)) return fail(404, 'ROOM_NOT_FOUND', 'Room not found.');
    const row = this.db.prepare('SELECT data FROM rooms WHERE code=?').get(code);
    if (!row) return fail(404, 'ROOM_NOT_FOUND', 'Room not found or expired.');
    const room = JSON.parse(row.data as string) as Room;
    if (this.#expired(room)) return fail(410, 'ROOM_EXPIRED', 'Room expired. Create a new crew.');
    return room;
  }
  #expired(room: Room) { return this.now() - room.touchedAt >= IDLE_MS || this.now() - room.createdAt >= MAX_AGE_MS; }
  #save(room: Room) { this.db.prepare('INSERT OR REPLACE INTO rooms(code,data) VALUES(?,?)').run(room.code, JSON.stringify(room)); }
  #identity(room: Room, token: string): Member {
    if (typeof token !== 'string' || token.length !== 43) return fail(401, 'UNAUTHORIZED', 'Room credentials are required.');
    const digest = Buffer.from(hash(token), 'hex');
    const member = room.members.find(p => timingSafeEqual(Buffer.from(p.tokenHash, 'hex'), digest));
    return member ?? fail(401, 'UNAUTHORIZED', 'Room credentials are invalid.');
  }
  #member(name: unknown): { member: Member; token: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, member: { id: randomBytes(8).toString('hex'), name: validName(name), tokenHash: hash(token), ready: false, seenAt: this.now(), left: false } };
  }
  create(name: unknown, count: unknown, mission: unknown = 'lights', difficulty: unknown = 'easy'): RoomAdmission {
    if (![2, 3, 4, 5].includes(count as number)) return fail(400, 'INVALID_COUNT', 'Choose 2–5 human players.');
    if (typeof mission !== 'string' || !MISSIONS.some(m => m.id === mission && m.puzzle === 'matching')) return fail(400, 'INVALID_MISSION', 'Unknown matching mission.');
    if (!['easy', 'medium', 'hard'].includes(difficulty as string)) return fail(400, 'INVALID_DIFFICULTY', 'Unknown difficulty.');
    const { member, token } = this.#member(name);
    return this.#transaction(() => {
      this.#cleanup();
      if ((this.db.prepare('SELECT count(*) AS n FROM rooms').get()!.n as number) >= 1000) return fail(503, 'CAPACITY', 'Room server is full. Try again later.');
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code: string;
      do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); }
      while (this.db.prepare('SELECT 1 FROM rooms WHERE code=?').get(code));
      const room: Room = { code, revision: 0, count: count as PlayerCount, mission, difficulty: difficulty as Difficulty, seed: randomInt(0x7fffffff), dealKey: randomBytes(32).toString('hex'), hostId: member.id, members: [member], started: false, journal: [], lastTick: this.now(), createdAt: this.now(), touchedAt: this.now(), requests: [] };
      this.#save(room);
      return { credentials: { code, playerId: member.id, token }, room: this.#view(room, member.id) };
    });
  }
  join(code: string, name: unknown): RoomAdmission {
    const { member, token } = this.#member(name);
    return this.#transaction(() => {
      const room = this.#load(code);
      if (room.started) return fail(409, 'ALREADY_STARTED', 'Use your saved credentials to reconnect.');
      if (room.members.filter(p => !p.left).length >= room.count) return fail(409, 'ROOM_FULL', 'This crew is full.');
      room.members = room.members.filter(p => !p.left);
      room.members.push(member); room.revision++; room.touchedAt = this.now(); this.#save(room);
      return { credentials: { code, playerId: member.id, token }, room: this.#view(room, member.id) };
    });
  }
  read(code: string, token: string): RoomView {
    return this.#transaction(() => {
      const room = this.#load(code), member = this.#identity(room, token);
      // A refresh is a rejoin only for the same cryptographic identity.
      if (member.left) { member.left = false; room.revision++; }
      member.seenAt = this.now(); room.touchedAt = this.now();
      const host = room.members.find(p => p.id === room.hostId);
      if (!host || host.left || this.now() - host.seenAt >= CONNECTED_MS) {
        const next = room.members.find(p => !p.left && this.now() - p.seenAt < CONNECTED_MS);
        if (next && next.id !== room.hostId) { room.hostId = next.id; room.revision++; }
      }
      const engine = this.#engine(room);
      this.#tick(room, engine); this.#save(room);
      return this.#view(room, member.id, engine);
    });
  }
  command(code: string, token: string, request: CommandRequest): RoomView {
    return this.#transaction(() => {
      const room = this.#load(code), member = this.#identity(room, token);
      if (member.left) return fail(409, 'PLAYER_LEFT', 'Reconnect before issuing commands.');
      if (!request || !Number.isSafeInteger(request.revision) || typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(request.requestId) || !request.command || typeof request.command.type !== 'string') return fail(400, 'INVALID_COMMAND', 'Invalid command envelope.');
      const engine = this.#engine(room);
      this.#tick(room, engine);
      // Retrying an accepted request returns fresh time/state without spending again.
      if (room.requests.some(r => r.actor === member.id && r.id === request.requestId)) {
        member.seenAt = this.now(); room.touchedAt = this.now(); this.#save(room);
        return this.#view(room, member.id, engine);
      }
      if (request.revision !== room.revision) return fail(409, 'STALE_REVISION', 'The room changed. Refresh and try again.');
      if (room.journal.length >= 5000) return fail(409, 'SESSION_LIMIT', 'Create a new room to continue.');
      const action = request.command;
      try {
        if (action.type === 'ready') {
          if (room.started || typeof action.ready !== 'boolean') throw new Error('Readiness can only change in the lobby.');
          member.ready = action.ready;
        } else if (action.type === 'start') {
          if (room.started || room.hostId !== member.id || room.members.length !== room.count || !room.members.every(p => p.ready && !p.left && this.now() - p.seenAt < CONNECTED_MS)) throw new Error('The host can start when the full crew is connected and ready.');
          room.started = true; room.lastTick = this.now();
        } else if (action.type === 'leave') {
          member.left = true; member.ready = false;
          if (room.hostId === member.id) room.hostId = room.members.find(p => !p.left)?.id ?? member.id;
        } else if (action.type === 'restart') {
          if (!engine || room.hostId !== member.id || engine.snapshotFor(member.id).status === 'playing') throw new Error('The host can restart a finished mission.');
          engine.restartMission(); room.journal.push({ actor: member.id, action, elapsed: 0 }); room.lastTick = this.now();
        } else {
          if (!engine) throw new Error('Start the mission first.');
          this.#apply(engine, member.id, action);
          room.journal.push({ actor: member.id, action, elapsed: 0 });
        }
      } catch (error) { return fail(400, 'ILLEGAL_ACTION', error instanceof Error ? error.message : 'Illegal action.'); }
      member.seenAt = this.now(); room.touchedAt = this.now(); room.revision++;
      room.requests.push({ actor: member.id, id: request.requestId });
      room.requests = room.requests.slice(-512);
      // All departed: delete secrets and session immediately. Never publish a board to an outsider.
      if (room.members.every(p => p.left)) {
        this.db.prepare('DELETE FROM rooms WHERE code=?').run(code);
        return this.#view(room, member.id, engine);
      }
      this.#save(room);
      return this.#view(room, member.id, action.type === 'start' ? this.#engine(room) : engine);
    });
  }
  #apply(engine: GameEngine, actor: string, action: GameCommand) {
    engine.actAs(actor, () => {
      switch (action.type) {
        case 'startingInformation': engine.chooseStartingInformation(action.circuitId); break;
        case 'connect': engine.selectCircuit(action.ownId); engine.attemptConnection(action.targetId, action.number); break;
        case 'solo': engine.resolveSolo(action.number); break;
        case 'safeRed': engine.resolveRedSafely(action.circuitId); break;
        case 'power': engine.useCharacterPower(action.ownId, action.firstId, action.secondId, action.number, action.token); break;
        case 'equipment': engine.useEquipment(action.equipmentId, action.command); break;
        case 'share': engine.shareCircuit(action.circuitId); break;
        case 'pass': engine.passTurn(); break;
        default: throw new Error('Unknown game command.');
      }
    });
  }
  #engine(room: Room): GameEngine | null {
    if (!room.started) return null;
    let counter = 0;
    const shuffle = () => createHmac('sha256', Buffer.from(room.dealKey, 'hex')).update(String(counter++)).digest().readUIntBE(0,6) / 0x1000000000000;
    const engine = new GameEngine(room.mission, room.difficulty, room.seed, {}, {}, { multiplayer: true, shuffle, random: shuffle, participants: room.members.map(p => ({ id: p.id, name: p.name, control: 'human' })) });
    for (const entry of room.journal) {
      if (entry.elapsed) engine.advanceTime(entry.elapsed);
      else if (entry.action.type === 'restart') engine.restartMission();
      else this.#apply(engine, entry.actor, entry.action);
    }
    return engine;
  }
  #tick(room: Room, engine: GameEngine | null) {
    if (!engine) return;
    const state = engine.snapshotFor(room.members[0].id), elapsed = Math.max(0, this.now() - room.lastTick);
    room.lastTick = this.now();
    if (elapsed && state.phase === 'turns' && state.status === 'playing') {
      engine.advanceTime(elapsed);
      // Coalesce clock entries between commands so polling does not grow the log.
      const last = room.journal.at(-1);
      if (last?.elapsed) last.elapsed += elapsed;
      else room.journal.push({ actor: room.members[0].id, action: { type: 'pass' }, elapsed });
      if (engine.snapshotFor(room.members[0].id).status !== state.status) room.revision++;
    }
  }
  #view(room: Room, playerId: string, engine = this.#engine(room)): RoomView {
    const game = engine?.snapshotFor(playerId) ?? null;
    return { code: room.code, revision: room.revision, playerId, hostId: room.hostId, playerCount: room.count, status: !game ? 'lobby' : game.status === 'playing' ? 'playing' : 'finished', players: room.members.map(p => ({ id: p.id, name: p.name, ready: p.ready, left: p.left, connected: !p.left && this.now() - p.seenAt < CONNECTED_MS })), game, expiresAt: Math.min(room.touchedAt + IDLE_MS, room.createdAt + MAX_AGE_MS) };
  }
  #cleanup() {
    for (const row of this.db.prepare('SELECT code,data FROM rooms').all()) {
      if (this.#expired(JSON.parse(row.data as string))) this.db.prepare('DELETE FROM rooms WHERE code=?').run(row.code as string);
    }
  }
  cleanup() { this.#transaction(() => this.#cleanup()); }
}

