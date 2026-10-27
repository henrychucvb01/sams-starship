import { GameEngine, MISSIONS } from "../engine";
import type { GameState, Tuning, ToolSettings } from "../engine";
import type { MissionAdapter, MissionView } from "../types/presentation";
export const TRAINING_MISSIONS = MISSIONS.filter(
  (m) => m.id === "circuit-4" || m.id === "circuit-7",
).map(({ id, name }) => ({ id, name }));
/** The engine's redacted public state is the only source of board information. */
export function createEngineAdapter(
  seed = crypto.getRandomValues(new Uint32Array(1))[0],
  tuning: Partial<Tuning> = {},
  toolSettings: Partial<ToolSettings> = {},
  missionId = "lights",
): MissionAdapter {
  const engine = new GameEngine(missionId, "easy", seed, tuning, {
    scanner: { uses: 1, unlocked: false },
    dualScanner: { uses: 1, unlocked: false },
    ...toolSettings,
  });
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
        return s.circuits.find((c) => c.id === e.circuitIds[0])?.kind ===
          "yellow"
          ? `${e.participant}: restored ${e.circuitIds.length} yellow circuits.`
          : `${e.participant}: restored ${e.circuitIds.length} circuits with number ${e.number}.`;
      if (e.type === "SCANNER_ACTIVATED")
        return `${label(e.circuitIds[0])}: ${e.message}`;
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
      type: c.kind,
      sortLabel:
        c.kind && c.kind !== "blue" && c.value !== undefined
          ? `sort ${c.value}`
          : undefined,
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
      possibilities: undefined,
      scans: s.scannerResults
        .filter((r) => r.circuitId === c.id)
        .map(({ threshold, relation }) => ({ threshold, relation })),
    });
    const messages = s.history
      .filter(
        (e) =>
          e.type === "CLUE_SHARED" ||
          e.type === "CONNECTION_FAILED" ||
          e.type === "CONNECTION_SUCCESS" ||
          e.type === "PASSED" ||
          e.type === "HINT_GENERATED" ||
          e.type === "SCANNER_ACTIVATED" ||
          e.type === "SHIELD_PREVENTED",
      )
      .map((e) => ({ id: String(e.index), text: text(e) }));
    const failures = s.history.filter((e) => e.type === "CONNECTION_FAILED");
    const toolNames = {
      scanner: "Circuit Scanner",
      dualScanner: "Dual Scanner",
      shield: "Emergency Shield",
      hint: "Sam’s Hint",
    };
    const hint = s.history.filter((e) => e.type === "HINT_GENERATED").at(-1);
    return {
      missionName: s.mission.name,
      tracker: {
        numbers: (s.numberTracker ?? []).map((n) => ({
          number: n.number,
          resolved: n.resolvedCopies,
          total: n.totalCopies,
          complete: n.completed,
        })),
        specials: (s.specialTracker ?? [])
          .filter((p) => p.totalCopies > 0)
          .map((p) => ({
            type: p.kind,
            positions: Array.from(
              new Map<
                number,
                { sortValue: number; certainty: "possible" | "confirmed" }
              >([
                ...p.candidates.map(
                  (c) =>
                    [
                      c.sortValue,
                      {
                        sortValue: c.sortValue,
                        certainty: "possible" as const,
                      },
                    ] as const,
                ),
                ...p.confirmed.map(
                  (c) =>
                    [
                      c.sortValue,
                      {
                        sortValue: c.sortValue,
                        certainty: "confirmed" as const,
                      },
                    ] as const,
                ),
              ]).values(),
            ),
            resolved: p.resolvedCopies,
            total: p.totalCopies,
            complete: p.completed,
            positionLabel: [
              p.candidates.length
                ? `Possible sorting positions: ${p.candidates.map((c) => c.sortValue).join(", ")}`
                : "No candidate positions disclosed",
              p.confirmed.length
                ? `Known: ${p.confirmed.map((c) => `${label(c.circuitId)} at ${c.sortValue}${c.resolved ? " (cleared)" : ""}`).join("; ")}`
                : "No confirmed positions",
            ].join(" · "),
          })),
      },
      tools: (["scanner", "dualScanner", "shield", "hint"] as const).map(
        (id) => ({
          id: id === "dualScanner" ? "dual-scanner" : id,
          name: toolNames[id],
          remaining: s.tools[id].uses,
          available: s.tools[id].available,
          targetIds: s.tools[id].validTargetIds,
          reason: !s.tools[id].unlocked
            ? "Locked until a later mission"
            : s.tools[id].uses <= 0
              ? "Exhausted"
              : id === "shield" && s.shieldActive
                ? "Shield already active"
                : undefined,
        }),
      ),
      toolToken: s.toolToken,
      shieldActive: s.shieldActive,
      selfMatches: s.selfMatches,
      toolClue: hint
        ? hint.message.replace(
            /(sam|nova|pip)-(\d+)/g,
            (_m, owner, index) =>
              `${owner === "nova" ? "Nova" : owner === "pip" ? "Pip" : "Sam"}, slot ${Number(index) + 1}`,
          )
        : undefined,
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
          if (e.type === "RED_SAFELY_RESOLVED")
            return [{ id: e.index, kind: "isolate", slotIds: e.circuitIds }];
          if (e.type === "RED_TRIGGERED")
            return [{ id: e.index, kind: "critical", slotIds: e.circuitIds }];
          if (e.type === "CONNECTION_SUCCESS")
            return [
              {
                id: e.index,
                kind: "success" as const,
                slotIds: e.circuitIds,
                participant: e.participant,
              },
            ];
          if (
            e.type === "SHIELD_ACTIVATED" ||
            e.type === "SHIELD_PREVENTED" ||
            e.type === "HINT_GENERATED" ||
            e.type === "SCANNER_ACTIVATED" ||
            e.type === "DUAL_SCANNER_SUCCESS" ||
            e.type === "DUAL_SCANNER_FAILED"
          ) {
            return [
              {
                id: e.index,
                kind:
                  e.type === "SHIELD_ACTIVATED"
                    ? "shield"
                    : e.type === "SHIELD_PREVENTED"
                      ? "blocked"
                      : e.type === "HINT_GENERATED"
                        ? "hint"
                        : e.type === "SCANNER_ACTIVATED"
                          ? "scan"
                          : "dual",
                slotIds: e.circuitIds,
                participant: e.participant,
              },
            ];
          }
          if (e.type === "SHIP_ATTACK" && e.damage > 0) {
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
        throw new Error("Use Sam’s Toolkit for a limited hint.");
      }),
    shareCircuit: (id) =>
      run(() => {
        engine.shareCircuit(id);
      }),
    selfMatch: (ids) =>
      run(() => {
        engine.selfMatch(ids[0], ids[1]);
      }),
    useTool: (id, command) =>
      run(() => {
        const token = command.token;
        if (id === "shield") engine.activateShield(token);
        else if (id === "hint") engine.generateHint(token);
        else if (id === "scanner")
          engine.scanCircuit(command.targets[0], command.threshold!, token);
        else {
          if (!command.ownId) throw new Error("Select one of Sam’s numbers");
          engine.selectCircuit(command.ownId);
          const value = engine
            .getGameState()
            .circuits.find((c) => c.id === command.ownId)!.value!;
          engine.dualScan(command.targets[0], command.targets[1], value, token);
        }
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
    chooseMission: (id) => {
      stop();
      feedback = null;
      engine.startMission(id, "easy", seed, tuning, {
        scanner: { uses: 1, unlocked: false },
        dualScanner: { uses: 1, unlocked: false },
        ...toolSettings,
      });
      duration = engine.getGameState().remainingMs;
      publish();
    },
    isolateRed: (id) =>
      run(() => {
        engine.resolveRedSafely(id);
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
