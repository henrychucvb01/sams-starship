import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameEngine } from '../src/engine/engine';
import { deduce } from '../src/engine/ai';
import { RoomService, RoomError } from '../server/rooms';
import { createRoomServer } from '../server/http';
import type { RoomAdmission, RoomCommand, RoomCredentials, RoomView, CommandRequest } from '../src/engine/multiplayer';

const players = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `human-${i}`, name: `Pilot ${i}`, control: 'human' as const }));
function engineFor(count: number, seed = 19, mission = 'lights') {
  return new GameEngine(mission, 'easy', seed, { hull: 10000, durationMs: 10000000 }, {}, { multiplayer: true, participants: players(count) });
}
function prepare(engine: GameEngine) {
  for (const p of engine.snapshotFor('human-0').participants) {
    const state = engine.snapshotFor(p.id);
    if (state.startingInformationChoices.length) engine.actAs(p.id, () => engine.chooseStartingInformation(state.startingInformationChoices[0]));
  }
}
function assertPrivacy(room: RoomView) {
  const state = room.game;
  if (!state) return;
  for (const c of state.circuits) {
    if (c.owner === room.playerId || state.publicReveals.some(r => r.circuitId === c.id)) continue;
    assert.deepEqual(Object.keys(c).sort(), ['id', 'owner', 'position', 'rack', 'restored']);
  }
  assert.equal(state.selected, null);
  assert.ok(state.incorrectGuesses.every(g => g.ownCircuitId === ''));
  assert.ok(state.characterCards.filter(c => c.participant !== room.playerId).every(c => !c.validTargetIds.length));
  for (const event of state.history) if (event.type === 'HINT_GENERATED' && event.participant !== room.playerId) {
    assert.deepEqual(event.possibilities, []); assert.deepEqual(event.circuitIds, []);
  }
  assert.ok(!/tokenHash|seed|journal|token"|random/.test(JSON.stringify(room)));
}
for (const count of [2, 3, 4, 5]) {
  test(`${count} humans: correct racks, private hands, setup, Captain, turn enforcement and completion`, () => {
    const engine = engineFor(count), initial = engine.snapshotFor('human-0');
    assert.ok(initial.participants.every(p => p.control === 'human'));
    assert.throws(() => engine.advanceAI(), /AI is disabled/);
    const racks = initial.participants.flatMap(p => {
      const rows = [...new Set(initial.circuits.filter(c => c.owner === p.id).map(c => c.rack))];
      assert.equal(rows.length, count === 2 || (count === 3 && p.id === initial.captain) ? 2 : 1);
      return rows.map(rack => {
        const view = engine.snapshotFor(p.id), row = view.circuits.filter(c => c.owner === p.id && c.rack === rack);
        assert.deepEqual(row.map(c => c.value), row.map(c => c.value).sort((a, b) => a! - b!));
        return row.length;
      });
    });
    assert.ok(Math.max(...racks) - Math.min(...racks) <= 1);
    prepare(engine);
    let state = engine.snapshotFor('human-0');
    assert.equal(state.phase, 'turns'); assert.equal(state.currentParticipant, state.captain);
    assert.equal(state.startingInformation.length, count);
    assert.throws(() => engine.actAs(state.participants.find(p => p.id !== state.captain)!.id, () => engine.passTurn()), /Wait/);
    // Test oracle joins separately authorized private observations, never sent to a browser.
    for (let guard = 0; guard < 200 && state.status === 'playing'; guard++) {
      const actor = state.currentParticipant, ownState = engine.snapshotFor(actor);
      const solo = ownState.selfMatches.find(m => m.eligible);
      if (solo) engine.actAs(actor, () => engine.resolveSolo(solo.number));
      else {
        const oracle = ownState.participants.flatMap(p => engine.snapshotFor(p.id).circuits.filter(c => c.owner === p.id && !c.restored));
        const own = oracle.find(c => c.owner === actor && oracle.some(t => t.owner !== actor && t.value === c.value));
        assert.ok(own, 'active player has a legal match');
        const target = oracle.find(t => t.owner !== actor && t.value === own.value)!;
        engine.actAs(actor, () => { engine.selectCircuit(own.id); engine.attemptConnection(target.id, own.value!); });
      }
      state = engine.snapshotFor(actor);
      for (const p of state.participants) assertPrivacy({ playerId: p.id, game: engine.snapshotFor(p.id) } as RoomView);
    }
    assert.equal(state.status, 'won'); assert.equal(state.remainingCircuits, 0);
    engine.restartMission();
    const next = engine.snapshotFor('human-0');
    assert.equal(next.captain, next.participants[(next.participants.findIndex(p => p.id === initial.captain) + 1) % count].id);
    assert.equal(next.phase, 'startingInformation');
  });
}

function lobby(service: RoomService, count = 3) {
  const first = service.create('Captain candidate', count);
  const admissions = [first, ...Array.from({ length: count - 1 }, (_, i) => service.join(first.credentials.code, `Pilot ${i}`))];
  let serial = 0;
  const command = (who: RoomAdmission | RoomCredentials, action: RoomCommand, revision?: number) => {
    const c = 'credentials' in who ? who.credentials : who;
    return service.command(c.code, c.token, { revision: revision ?? service.read(c.code, c.token).revision, requestId: `request_${++serial}`, command: action });
  };
  for (const p of admissions) command(p, { type: 'ready', ready: true });
  return { admissions, command };
}

test('room authorization, lobby host/readiness, duplicate commands and stale revisions', () => {
  const service = new RoomService();
  try {
    assert.throws(() => service.create('Bad', 1), /2–5/);
    assert.throws(() => service.create('', 3), /name/);
    const { admissions, command } = lobby(service);
    const [host, other] = admissions;
    assert.throws(() => service.read(host.credentials.code, 'x'.repeat(43)), /invalid/);
    assert.throws(() => service.join(host.credentials.code, 'Extra'), /full/);
    assert.throws(() => command(other, { type: 'start' }), /host/);
    command(other, { type: 'ready', ready: false });
    assert.throws(() => command(host, { type: 'start' }), /ready/);
    command(other, { type: 'ready', ready: true });
    const started = command(host, { type: 'start' });
    assert.equal(started.game!.participants.length, 3);
    assert.throws(() => service.join(host.credentials.code, 'Late'), /reconnect/);
    const choice = started.game!.startingInformationChoices[0];
    const req = { revision: started.revision, requestId: 'deduplicate_1', command: { type: 'startingInformation' as const, circuitId: choice } };
    const result = service.command(host.credentials.code, host.credentials.token, req);
    const duplicate = service.command(host.credentials.code, host.credentials.token, req);
    assert.equal(duplicate.revision, result.revision);
    assert.equal(duplicate.game!.startingInformation.length, 1);
    assert.throws(() => command(other, { type: 'pass' }, started.revision), (e: unknown) => e instanceof RoomError && e.code === 'STALE_REVISION');
    assertPrivacy(result); assertPrivacy(service.read(other.credentials.code, other.credentials.token));
  } finally { service.close(); }
});

test('private miss selection and Logic Relay deductions do not leak into another snapshot', () => {
  const engine = engineFor(3); prepare(engine);
  let state = engine.snapshotFor('human-0'), actor = state.currentParticipant;
  const ownState = engine.snapshotFor(actor), own = ownState.circuits.find(c => c.owner === actor && !c.restored)!;
  const foreign = ownState.participants.filter(p => p.id !== actor).flatMap(p => engine.snapshotFor(p.id).circuits.filter(c => c.owner === p.id));
  const miss = foreign.find(c => c.value !== own.value)!;
  engine.actAs(actor, () => { engine.selectCircuit(own.id); engine.attemptConnection(miss.id, own.value!); });
  state = engine.snapshotFor(actor);
  assert.equal(state.incorrectGuesses.at(-1)!.ownCircuitId, '');
  actor = state.currentParticipant;
  engine.actAs(actor, () => engine.generateHint(engine.snapshotFor(actor).toolToken));
  for (const p of state.participants) assertPrivacy({ playerId: p.id, game: engine.snapshotFor(p.id) } as RoomView);
});

test('durable refresh/rejoin, clock recovery, host departure and session cleanup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'starship-')); const path = join(dir, 'rooms.sqlite');
  let now = 100000, service = new RoomService(path, () => now);
  try {
    const { admissions, command } = lobby(service, 2);
    let room = command(admissions[0], { type: 'start' });
    const beforeSetup = room.game!.remainingMs;
    now += 90000;
    room = service.read(admissions[0].credentials.code, admissions[0].credentials.token);
    assert.equal(room.game!.remainingMs, beforeSetup);
    for (const admission of admissions) {
      const view = service.read(admission.credentials.code, admission.credentials.token);
      command(admission, { type: 'startingInformation', circuitId: view.game!.startingInformationChoices[0] });
    }
    room = service.read(admissions[0].credentials.code, admissions[0].credentials.token);
    const saved = JSON.parse(JSON.stringify(room));
    service.close(); service = new RoomService(path, () => now);
    room = service.read(admissions[0].credentials.code, admissions[0].credentials.token);
    assert.deepEqual(JSON.parse(JSON.stringify(room)), saved);
    now += 5000;
    const recovered = service.read(admissions[1].credentials.code, admissions[1].credentials.token);
    assert.equal(recovered.game!.remainingMs, saved.game.remainingMs - 5000);
    assertPrivacy(recovered);
    let serial = 0;
    const resumedCommand = (index: number, command: RoomCommand) => {
      const c = admissions[index].credentials;
      return service.command(c.code, c.token, {revision: service.read(c.code,c.token).revision, requestId: `resumed_${++serial}`, command});
    };
    resumedCommand(0, { type: 'leave' });
    let other = service.read(admissions[1].credentials.code, admissions[1].credentials.token);
    assert.equal(other.hostId, admissions[1].credentials.playerId);
    const rejoined = service.read(admissions[0].credentials.code, admissions[0].credentials.token);
    assert.equal(rejoined.players.find(p => p.id === rejoined.playerId)!.left, false);
    resumedCommand(0, { type: 'leave' }); resumedCommand(1, { type: 'leave' });
    assert.throws(() => service.read(admissions[0].credentials.code, admissions[0].credentials.token), /not found/);
    const expiring = service.create('Expires', 4);
    now += 2 * 60 * 60 * 1000;
    service.cleanup();
    assert.throws(() => service.read(expiring.credentials.code, expiring.credentials.token), /not found/);
  } finally { service.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('lobby leave frees seat without admitting another identity to the departed hand', () => {
  const service = new RoomService();
  try {
    const { admissions, command } = lobby(service, 2);
    command(admissions[1], { type: 'leave' });
    const replacement = service.join(admissions[0].credentials.code, 'Replacement');
    assert.notEqual(replacement.credentials.playerId, admissions[1].credentials.playerId);
    assert.throws(() => service.read(admissions[1].credentials.code, admissions[1].credentials.token), /invalid/);
  } finally { service.close(); }
});

test('disconnected host transfers after presence lease; returning host retains only its own seat', () => {
  let now = 100000;
  const service = new RoomService(':memory:', () => now);
  try {
    const host = service.create('First host', 2), other = service.join(host.credentials.code, 'Other pilot');
    now += 31000;
    const recovered = service.read(other.credentials.code, other.credentials.token);
    assert.equal(recovered.hostId, other.credentials.playerId);
    assert.equal(recovered.players.find(p => p.id === host.credentials.playerId)!.connected, false);
    const rejoined = service.read(host.credentials.code, host.credentials.token);
    assert.equal(rejoined.hostId, other.credentials.playerId);
    assert.equal(rejoined.playerId, host.credentials.playerId);
    assert.equal(rejoined.players.length, 2);
  } finally { service.close(); }
});

test('HTTP: real concurrent commands, origin protection, authentication and private responses', async () => {
  const service = new RoomService(), server = createRoomServer(service, 'https://starship.example');
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port, base = `http://127.0.0.1:${port}`;
  const post = (path: string, data: unknown, token?: string, origin?: string) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(data) });
  try {
    assert.equal((await post('/api/rooms', { name: 'Bad origin', playerCount: 2 }, undefined, 'https://evil.example')).status, 403);
    const created = await post('/api/rooms', { name: 'Pilot A', playerCount: 2 });
    assert.equal(created.status, 201); assert.equal(created.headers.get('cache-control'), 'no-store, private');
    const first = await created.json() as RoomAdmission;
    const joined = await post(`/api/rooms/${first.credentials.code}/join`, { name: 'Pilot B' });
    const second = await joined.json() as RoomAdmission;
    assert.equal((await fetch(`${base}/api/rooms/${first.credentials.code}`)).status, 401);
    const revision = second.room.revision;
    const results = await Promise.all([first, second].map((p, i) => post(`/api/rooms/${p.credentials.code}/commands`, { revision, requestId: `concurrent_${i}`, command: { type: 'ready', ready: true } }, p.credentials.token)));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const stale = results.find(r => r.status === 409)!;
    assert.equal((await stale.json() as any).error.code, 'STALE_REVISION');
    // Reconcile and submit distinct fresh readiness, then start a real network game.
    for (const p of [first, second]) {
      const view = await (await fetch(`${base}/api/rooms/${p.credentials.code}`, { headers: { Authorization: `Bearer ${p.credentials.token}` } })).json() as RoomView;
      assert.equal((await post(`/api/rooms/${p.credentials.code}/commands`, { revision: view.revision, requestId: `ready_now_${p.credentials.playerId}`, command: { type: 'ready', ready: true } }, p.credentials.token)).status, 200);
    }
    const latest = service.read(first.credentials.code, first.credentials.token);
    const started = await post(`/api/rooms/${first.credentials.code}/commands`, { revision: latest.revision, requestId: 'start_over_http', command: { type: 'start' } }, first.credentials.token);
    assert.equal(started.status, 200); assertPrivacy(await started.json() as RoomView);
    assertPrivacy(service.read(second.credentials.code, second.credentials.token));
    assert.equal((await post(`/api/rooms/${first.credentials.code}/commands`, { revision: 0, requestId: 'malformed_body', command: null }, first.credentials.token)).status, 400);
    for (const p of [first, second]) {
      const view = service.read(p.credentials.code, p.credentials.token);
      const response = await post(`/api/rooms/${p.credentials.code}/commands`, { revision: view.revision, requestId: `setup_${p.credentials.playerId}`, command: { type: 'startingInformation', circuitId: view.game!.startingInformationChoices[0] } }, p.credentials.token);
      assert.equal(response.status, 200); assertPrivacy(await response.json() as RoomView);
    }
    const current = service.read(first.credentials.code, first.credentials.token);
    const active = [first, second].find(p => p.credentials.playerId === current.game!.currentParticipant)!;
    const ownView = service.read(active.credentials.code, active.credentials.token);
    const oracle = [first, second].flatMap(p => service.read(p.credentials.code, p.credentials.token).game!.circuits.filter(c => c.owner === p.credentials.playerId && !c.restored));
    const own = oracle.find(c => c.owner === active.credentials.playerId && oracle.some(t => t.owner !== c.owner && t.value === c.value));
    const target = own && oracle.find(c => c.owner !== own.owner && c.value === own.value)!;
    const action: RoomCommand = own ? { type: 'connect', ownId: own.id, targetId: target!.id, number: own.value! } : { type: 'solo', number: ownView.game!.selfMatches.find(m => m.eligible)!.number };
    const commands: CommandRequest[] = [0, 1].map(i => ({ revision: ownView.revision, requestId: `concurrent_cut_${i}`, command: action }));
    const cuts = await Promise.all(commands.map(c => post(`/api/rooms/${active.credentials.code}/commands`, c, active.credentials.token)));
    assert.deepEqual(cuts.map(r => r.status).sort(), [200, 409]);
    const winner = cuts.findIndex(r => r.status === 200);
    const cutState = await cuts[winner].json() as RoomView;
    assert.equal(cutState.game!.turnNumber, ownView.game!.turnNumber + 1);
    const retried = await post(`/api/rooms/${active.credentials.code}/commands`, commands[winner], active.credentials.token);
    assert.equal(retried.status, 200);
    const duplicateState = await retried.json() as RoomView;
    assert.equal(duplicateState.revision, cutState.revision);
    assert.equal(duplicateState.game!.remainingCircuits, cutState.game!.remainingCircuits);
    assert.equal(duplicateState.game!.turnNumber, cutState.game!.turnNumber);
    assertPrivacy(duplicateState);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); service.close(); }
});

for (const count of [2, 3, 4, 5]) {
  test(`${count} humans: personal power is one-use, rack-scoped, turn enforced and privately projected`, () => {
    const engine = engineFor(count); prepare(engine);
    let state = engine.snapshotFor('human-0');
    const actor = state.currentParticipant;
    state = engine.snapshotFor(actor);
    const own = state.circuits.find(c => c.owner === actor && !c.restored)!;
    const targets = state.characterCards.find(c => c.participant === actor)!.validTargetIds.map(id => state.circuits.find(c => c.id === id)!);
    const a = targets[0], b = targets.find(c => c.owner === a.owner && c.rack === a.rack && c.id !== a.id)!;
    const token = state.toolToken;
    const offTurn = state.participants.find(p => p.id !== actor)!.id;
    assert.throws(() => engine.actAs(offTurn, () => engine.useCharacterPower(own.id, a.id, b.id, own.value!, token)), /Wait/);
    const cross = targets.find(c => c.owner !== a.owner || c.rack !== a.rack);
    if (cross) assert.throws(() => engine.actAs(actor, () => engine.useCharacterPower(own.id, a.id, cross.id, own.value!, token)), /two hidden/);
    assert.equal(engine.snapshotFor(actor).characterCards.find(c => c.participant === actor)!.remainingUses, 1);
    engine.actAs(actor, () => engine.useCharacterPower(own.id, a.id, b.id, own.value!, token));
    state = engine.snapshotFor(actor);
    assert.equal(state.characterCards.find(c => c.participant === actor)!.remainingUses, 0);
    assert.equal(state.tools.dualScanner.uses, 1);
    assert.ok(state.equipment.every(e => e.remainingUses === 1));
    assert.ok(state.history.some(e => e.type === 'POWER_USED' && e.participant === actor));
    assert.ok(state.circuits.filter(c => [a.id, b.id].includes(c.id) && c.value !== undefined).length <= 1);
    for (const p of state.participants) assertPrivacy({ playerId: p.id, game: engine.snapshotFor(p.id) } as RoomView);
  });

  test(`${count} humans: special categories, safe-red isolation and complete mission`, () => {
    const engine = engineFor(count, 77, 'circuit-7'); prepare(engine);
    let state = engine.snapshotFor('human-0');
    for (let guard = 0; guard < 200 && state.status === 'playing'; guard++) {
      const actor = state.currentParticipant, ownState = engine.snapshotFor(actor);
      const red = ownState.revealRedActions[0];
      const solo = ownState.selfMatches.find(m => m.eligible);
      if (red.eligible) engine.actAs(actor, () => engine.resolveRedSafely(red.circuitIds[0]));
      else if (solo) engine.actAs(actor, () => engine.resolveSolo(solo.number));
      else {
        const oracle = state.participants.flatMap(p => engine.snapshotFor(p.id).circuits.filter(c => c.owner === p.id && !c.restored));
        const matches = (a: typeof oracle[number], b: typeof oracle[number]) => a.kind === 'yellow' ? b.kind === 'yellow' : a.kind === 'blue' && b.kind === 'blue' && a.value === b.value;
        const own = oracle.find(c => c.owner === actor && oracle.some(t => t.owner !== actor && matches(c, t)));
        assert.ok(own);
        const target = oracle.find(t => t.owner !== actor && matches(own, t))!;
        engine.actAs(actor, () => { engine.selectCircuit(own.id); engine.attemptConnection(target.id, own.value!); });
      }
      state = engine.snapshotFor(actor);
      for (const p of state.participants) assertPrivacy({ playerId: p.id, game: engine.snapshotFor(p.id) } as RoomView);
    }
    assert.equal(state.status, 'won');
    assert.ok(state.history.some(e => e.type === 'RED_SAFELY_RESOLVED'));
    assert.ok(state.history.some(e => e.type === 'YELLOW_RESOLVED'));
    assert.ok(!state.history.some(e => e.type === 'CATASTROPHIC_OVERLOAD'));
  });

  test(`${count} humans: authoritative room commands finish a game, replay and rotate Captain`, () => {
    let now = 100000;
    const service = new RoomService(':memory:', () => now);
    try {
      const { admissions, command } = lobby(service, count);
      let room = command(admissions[0], { type: 'start' });
      const captain = room.game!.captain;
      const credentialFor = (id: string) => admissions.find(p => p.credentials.playerId === id)!;
      for (const p of admissions) {
        const view = service.read(p.credentials.code, p.credentials.token);
        room = command(p, { type: 'startingInformation', circuitId: view.game!.startingInformationChoices[0] });
      }
      for (let guard = 0; guard < 100 && room.game!.status === 'playing'; guard++) {
        const actor = credentialFor(room.game!.currentParticipant);
        const ownState = service.read(actor.credentials.code, actor.credentials.token).game!;
        const solo = ownState.selfMatches.find(m => m.eligible);
        if (solo) room = command(actor, { type: 'solo', number: solo.number });
        else {
          const oracle = admissions.flatMap(p => service.read(p.credentials.code, p.credentials.token).game!.circuits.filter(c => c.owner === p.credentials.playerId && !c.restored));
          const own = oracle.find(c => c.owner === actor.credentials.playerId && oracle.some(t => t.owner !== c.owner && t.value === c.value))!;
          const target = oracle.find(c => c.owner !== own.owner && c.value === own.value)!;
          room = command(actor, { type: 'connect', ownId: own.id, targetId: target.id, number: own.value! });
        }
        assertPrivacy(room); now += 1;
      }
      assert.equal(room.status, 'finished'); assert.equal(room.game!.status, 'won');
      const restarted = command(admissions[0], { type: 'restart' });
      assert.notEqual(restarted.game!.captain, captain);
      assert.equal(restarted.game!.phase, 'startingInformation');
      assert.equal(restarted.game!.startingInformation.length, 0);
      assert.ok(restarted.game!.characterCards.every(p => p.remainingUses === 1));
    } finally { service.close(); }
  });
}

test('shared equipment is unlocked from actual blue pairs, usable off turn and globally one-use', () => {
  const engine = engineFor(3); prepare(engine);
  let state = engine.snapshotFor('human-0');
  const oracle = state.participants.flatMap(p => engine.snapshotFor(p.id).circuits.filter(c => c.owner === p.id));
  const ones = oracle.filter(c => c.value === 1), actor = ones[0].owner;
  while (state.currentParticipant !== actor) { engine.actAs(state.currentParticipant, () => engine.passTurn()); state = engine.snapshotFor(actor); }
  const target = ones.find(c => c.owner !== actor);
  if (target) engine.actAs(actor, () => { engine.selectCircuit(ones[0].id); engine.attemptConnection(target.id, 1); });
  else engine.actAs(actor, () => engine.resolveSolo(1));
  state = engine.snapshotFor(actor);
  const viewer = state.participants.find(p => p.id !== state.currentParticipant)!.id;
  const before = engine.snapshotFor(viewer), item = before.equipment[0], token = before.toolToken;
  assert.equal(item.state, 'ready'); assert.equal(item.available, true);
  engine.actAs(viewer, () => engine.useEquipment(item.id, { token, targets: [item.validTargetIds[0]], threshold: 6 }));
  const after = engine.snapshotFor(viewer);
  assert.equal(after.currentParticipant, before.currentParticipant);
  assert.equal(after.equipment[0].state, 'used');
  assert.equal(after.tools.scanner.uses, 1); assert.ok(after.characterCards.every(c => c.remainingUses === 1));
  assert.throws(() => engine.actAs(viewer, () => engine.useEquipment(item.id, { token, targets: [item.validTargetIds[0]], threshold: 6 })), /stale/);
  assert.ok(after.participants.every(p => engine.snapshotFor(p.id).equipment[0].state === 'used'));
});

test('deduction respects separate rack ordering; no hidden truth is eliminated', () => {
  for (const count of [2, 3, 4, 5]) for (let seed = 0; seed < 5; seed++) {
    const engine = engineFor(count, seed), state = engine.snapshotFor('human-0');
    const oracle = state.participants.flatMap(p => engine.snapshotFor(p.id).circuits.filter(c => c.owner === p.id));
    for (const p of state.participants) {
      const view = engine.snapshotFor(p.id);
      const domains = deduce({ self: p.id, circuits: view.circuits, reveals: view.publicReveals, incorrectGuesses: [], min: 1, max: 12, copies: 4, energy: 8, deductionPasses: 48 });
      for (const tile of oracle) assert.ok(domains[tile.id].includes(tile.value!), `rack inference removed truth for ${tile.id}`);
    }
  }
});

test('direct-red hit is catastrophic for human seats even with shared shield', () => {
  const engine = engineFor(2, 31, 'circuit-7'); prepare(engine);
  const state = engine.snapshotFor('human-0'), actor = state.currentParticipant;
  const own = engine.snapshotFor(actor).circuits.find(c => c.owner === actor && c.kind === 'blue')!;
  const red = state.participants.filter(p => p.id !== actor).flatMap(p => engine.snapshotFor(p.id).circuits.filter(c => c.owner === p.id && c.kind === 'red'))[0];
  assert.ok(red);
  engine.actAs(actor, () => { engine.activateShield(engine.snapshotFor(actor).toolToken); engine.selectCircuit(own.id); engine.attemptConnection(red.id, own.value!); });
  const after = engine.snapshotFor(actor);
  assert.equal(after.status, 'lost'); assert.ok(after.history.some(e => e.type === 'CATASTROPHIC_OVERLOAD'));
  assert.ok(!after.circuits.find(c => c.id === red.id)!.restored);
});

