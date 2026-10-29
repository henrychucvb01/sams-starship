import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { RoomError, RoomService } from './rooms';
import type { CommandRequest } from '../src/engine/multiplayer';

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
};
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new RoomError(415, 'CONTENT_TYPE', 'Send application/json.');
  const chunks: Buffer[] = []; let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 8192) throw new RoomError(413, 'BODY_TOO_LARGE', 'Request exceeds 8 KiB.');
    chunks.push(chunk);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new RoomError(400, 'INVALID_JSON', 'Send a JSON object.'); }
}

/** HTTP transport is the only browser entry. RoomService owns authorization/rules. */
export function createRoomServer(service: RoomService, allowedOrigin = 'http://localhost:5173') {
  const rates = new Map<string, { count: number; until: number }>();
  const server = createServer(async (request, response) => {
    response.setHeader('Vary', 'Origin');
    const origin = request.headers.origin;
    if (origin && origin !== allowedOrigin) return json(response, 403, { error: { code: 'ORIGIN', message: 'Origin is not allowed.' } });
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    // Never trust arbitrary forwarded IP headers. Configure per-IP limits at the TLS proxy too.
    const ip = request.socket.remoteAddress ?? 'unknown', now = Date.now();
    // Authenticated players have separate budgets, including behind one reverse proxy.
    const authorization = request.headers.authorization;
    const rateKey = authorization ? createHash('sha256').update(authorization).digest('hex') : `public:${ip}`;
    if (rates.size >= 10000) for (const [key, rate] of rates) if (rate.until <= now) rates.delete(key);
    const rate = rates.get(rateKey);
    if (rate && rate.until > now && ++rate.count > 600) {
      response.setHeader('Retry-After', Math.ceil((rate.until - now) / 1000));
      return json(response, 429, { error: { code: 'RATE_LIMIT', message: 'Too many requests. Try again shortly.' } });
    }
    if (!rate || rate.until <= now) {
      if (rates.size >= 10000) return json(response, 429, { error: { code: 'RATE_LIMIT', message: 'Try again shortly.' } });
      rates.set(rateKey, { count: 1, until: now + 60000 });
    }
    try {
      const path = new URL(request.url ?? '/', 'http://server').pathname;
      if (request.method === 'GET' && path === '/health') return json(response, 200, { ok: true });
      if (request.method === 'POST' && path === '/api/rooms') {
        const data = await body(request);
        return json(response, 201, service.create(data.name, data.playerCount, data.missionId, data.difficulty, data.characters));
      }
      const match = /^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|commands))?$/.exec(path);
      if (!match) throw new RoomError(404, 'NOT_FOUND', 'Endpoint not found.');
      const [, code, operation] = match;
      if (request.method === 'POST' && operation === 'join') {
        const data = await body(request);
        return json(response, 201, service.join(code, data.name));
      }
      const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '')?.[1] ?? '';
      if (request.method === 'GET' && !operation) return json(response, 200, service.read(code, token));
      if (request.method === 'POST' && operation === 'commands') return json(response, 200, service.command(code, token, await body(request) as unknown as CommandRequest));
      throw new RoomError(405, 'METHOD', 'Method not allowed.');
    } catch (error) {
      if (error instanceof RoomError) json(response, error.status, { error: { code: error.code, message: error.message } });
      else json(response, 500, { error: { code: 'INTERNAL', message: 'Room service error.' } });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  const cleanup = setInterval(() => service.cleanup(), 60000).unref();
  server.on('close', () => clearInterval(cleanup));
  return server;
}

