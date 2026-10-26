import { GameEngine } from "../engine";
import type { GameState, Tuning } from "../engine";
import type { MissionAdapter, MissionView } from "../types/presentation";
/** The engine's redacted public state is the only source of board information. */
export function createEngineAdapter(
  seed = crypto.getRandomValues(new Uint32Array(1))[0],
  tuning: Partial<Tuning> = {},
): MissionAdapter {
  const engine = new GameEngine("lights", "easy", seed, tuning);
  const listeners = new Set<() => void>();
  let duration = engine.getGameState().remainingMs;
  let timer: ReturnType<typeof setInterval> | undefined;
  let last = 0;
  let aiDue = Infinity;
  let scheduledTurn = -1;
  let feedback: string | null = null;
  const map = (s: GameState): MissionView => {
    const label = (id: string) => {
      const c = s.circuits.find((c) => c.id === id)!;
      return `${c.owner === "nova" ? "Nova" : c.owner === "pip" ? "Pip" : "Sam"}, slot ${c.position + 1}`;
    };
    const text = (e: GameState["history"][number]): string => {
      if (e.type === "CONNECTION_FAILED")
        return `${e.participant}: declared ${e.declaredNumber} at ${label(e.targetCircuitId)}. Incorrect; publicly revealed ${e.revealedNumber}.`;
      if (e.type === "CONNECTION_SUCCESS")
        return `${e.participant}: restored ${e.circuitIds.length} circuits with number ${e.number}.`;
      if (e.type === "CLUE_SHARED")
        return `${label(e.circuitId)}: my number is ${e.value}.`;
      return e.message;
    };
    const event = s.history.at(-1)!;
    const action = [...s.history]
      .reverse()
      .find((e) => e.type !== "TURN_STARTED")!;
    const kind =
      s.status === "won"
        ? "victory"
        : s.status === "lost"
          ? "defeat"
          : action.type === "SHIP_ATTACK"
            ? "damage"
            : action.type === "CONNECTION_SUCCESS"
              ? "success"
              : action.type === "CLUE_SHARED"
                ? "clue"
                : "ready";
    const slot = (c: GameState["circuits"][number]) => ({
      id: c.id,
      restored: c.restored,
      clue:
        c.owner !== "sam" && c.value !== undefined
          ? { min: c.value, max: c.value }
          : undefined,
      excluded: [
        ...new Set(
          s.incorrectGuesses
            .filter((g) => g.targetCircuitId === c.id)
            .map((g) => g.declaredNumber),
        ),
      ],
      possibilities: s.possibilities[c.id],
    });
    const messages = s.history
      .filter(
        (e) =>
          e.type === "CLUE_SHARED" ||
          e.type === "CONNECTION_FAILED" ||
          e.type === "CONNECTION_SUCCESS" ||
          e.type === "PASSED",
      )
      .map((e) => ({ id: String(e.index), text: text(e) }));
    const failures = s.history.filter((e) => e.type === "CONNECTION_FAILED");
    return {
      status:
        s.status === "won"
          ? "victory"
          : s.status === "lost"
            ? "defeat"
            : "playing",
      reason: s.status === "lost" ? event.message : undefined,
      hull: Math.round((s.hull / s.maxHull) * 100),
      secondsRemaining: Math.ceil(s.remainingMs / 1000),
      elapsedSeconds: Math.floor((duration - s.remainingMs) / 1000),
      energy: s.energy,
      restored: s.restored,
      required: s.total,
      remainingCircuits: s.remainingCircuits,
      board: {
        ordered: true,
        turn: s.currentParticipant,
        phase: s.currentParticipant === "sam" ? "selecting" : "thinking",
        turnNumber: s.turnNumber,
      },
      ownCircuits: s.circuits
        .filter((c) => c.owner === "sam")
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          ...slot(c),
          value: c.value!,
          shared: s.publicReveals.some((r) => r.circuitId === c.id),
        })),
      rooms: (["nova", "pip"] as const).map((id) => ({
        id,
        name: id === "nova" ? "Nova" : "Pip",
        system: id === "nova" ? "Navigation" : "Life support",
        slots: s.circuits
          .filter((c) => c.owner === id)
          .sort((a, b) => a.position - b.position)
          .map(slot),
      })),
      messages: messages.length
        ? messages
        : [
            {
              id: "intro",
              text: "Sorted low to high. Four of each number, 1–12. A clue or connection uses your turn.",
            },
          ],
      history: s.history.map((e) => ({ id: e.index, text: text(e) })),
      effects: s.history
        .flatMap<NonNullable<MissionView["effects"]>[number]>((e) => {
          if (e.type === "CONNECTION_SUCCESS")
            return [
              {
                id: e.index,
                kind: "success" as const,
                slotIds: e.circuitIds,
                participant: e.participant,
              },
            ];
          if (e.type === "SHIP_ATTACK") {
            const failed = failures.find((f) => f.turn === e.turn);
            const guess = s.incorrectGuesses.find(
              (g) =>
                g.turn === e.turn && g.targetCircuitId === e.targetCircuitId,
            );
            return [
              {
                id: e.index,
                kind: "damage" as const,
                slotIds: [
                  ...(guess ? [guess.ownCircuitId] : []),
                  e.targetCircuitId,
                ],
                participant:
                  failed?.type === "CONNECTION_FAILED"
                    ? failed.participant
                    : undefined,
              },
            ];
          }
          return [];
        })
        .slice(-60),
      event: { id: event.index, kind, text: feedback ?? text(action) },
    };
  };
  let snapshot = map(engine.getGameState());
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
    aiDue = Infinity;
    scheduledTurn = -1;
  };
  const publish = () => {
    const state = engine.getGameState();
    snapshot = map(state);
    if (state.status !== "playing") stop();
    else if (timer && state.turnNumber !== scheduledTurn) {
      scheduledTurn = state.turnNumber;
      aiDue =
        state.currentParticipant === "sam"
          ? Infinity
          : performance.now() + 1300;
    }
    listeners.forEach((fn) => fn());
  };
  const syncClock = () => {
    const now = performance.now();
    if (timer) engine.advanceTime(Math.max(0, now - last));
    last = now;
  };
  const run = (action: () => void) => {
    feedback = null;
    syncClock();
    try {
      action();
    } catch (e) {
      feedback = e instanceof Error ? e.message : "Command unavailable";
    }
    publish();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    connect: (own, target) =>
      run(() => {
        engine.selectCircuit(own);
        const value = engine
          .getGameState()
          .circuits.find((c) => c.id === own)!.value!;
        engine.attemptConnection(target, value);
      }),
    requestClue: (id) =>
      run(() => {
        engine.requestHint(id);
      }),
    shareCircuit: (id) =>
      run(() => {
        engine.shareCircuit(id);
      }),
    passTurn: () =>
      run(() => {
        engine.passTurn();
      }),
    resolveSolo: (id) =>
      run(() => {
        const own = engine
          .getGameState()
          .circuits.find((c) => c.id === id && c.owner === "sam");
        if (!own || own.value === undefined)
          throw new Error("Select your circuit first");
        engine.resolveSolo(own.value);
      }),
    restart: () => {
      stop();
      feedback = null;
      engine.restartMission();
      duration = engine.getGameState().remainingMs;
      publish();
    },
    activate: () => {
      if (timer || snapshot.status !== "playing") return;
      last = performance.now();
      scheduledTurn = -1;
      timer = setInterval(() => {
        syncClock();
        if (
          engine.getGameState().status === "playing" &&
          engine.getGameState().currentParticipant !== "sam" &&
          performance.now() >= aiDue
        ) {
          feedback = null;
          try {
            engine.advanceAI();
          } catch (e) {
            feedback =
              e instanceof Error ? e.message : "Crew action unavailable";
          }
        }
        publish();
      }, 250);
      publish();
    },
    deactivate: () => {
      if (timer) {
        syncClock();
        stop();
        publish();
      }
    },
    dispose: () => {
      stop();
      listeners.clear();
    },
  };
}
