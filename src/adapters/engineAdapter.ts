import { GameEngine } from "../engine";
import type { GameState } from "../engine";
import type { MissionAdapter, MissionView } from "../types/presentation";
/** Only the redacted public snapshot crosses this boundary. Never import generators. */
export function createEngineAdapter(
  seed = crypto.getRandomValues(new Uint32Array(1))[0],
): MissionAdapter {
  const engine = new GameEngine("lights", "easy", seed);
  const listeners = new Set<() => void>();
  let duration = engine.getGameState().remainingMs;
  let timer: ReturnType<typeof setInterval> | undefined;
  let last = 0;
  let aiElapsed = 0;
  let feedback: string | null = null;
  const map = (s: GameState): MissionView => {
    const event = s.history.at(-1)!;
    const kind =
      s.status === "won"
        ? "victory"
        : s.status === "lost"
          ? "defeat"
          : event.type === "mistake"
            ? "damage"
            : event.type === "restored"
              ? "success"
              : event.type.startsWith("hint:") || event.type === "transmitted"
                ? "clue"
                : "ready";
    const label = (id: string) => {
      const slot = s.circuits.find((c) => c.id === id);
      const crew = s.circuits.filter((c) => c.owner === slot?.owner);
      return `${slot?.owner === "nova" ? "Nova" : "Pip"}, slot ${crew.findIndex((c) => c.id === id) + 1}`;
    };
    const messages = s.history
      .filter((e) => e.type.startsWith("hint:") || e.type === "transmitted")
      .map((e) => {
        const id = e.type.slice(5);
        const clue = s.clues.find((c) => c.slotId === id);
        return {
          id: String(e.index),
          text: clue
            ? `${label(id)}: ${clue.min === clue.max ? `my number is ${clue.min}` : `my number is between ${clue.min} and ${clue.max}`}.`
            : "Sam shared a circuit with the crew. A crewmate will acknowledge shortly.",
        };
      });
    return {
      status:
        s.status === "won"
          ? "victory"
          : s.status === "lost"
            ? "defeat"
            : "playing",
      reason: s.status === "lost" ? event.message : undefined,
      hull: s.hull,
      secondsRemaining: Math.ceil(s.remainingMs / 1000),
      elapsedSeconds: Math.floor((duration - s.remainingMs) / 1000),
      energy: s.energy,
      restored: s.restored,
      required: s.total,
      ownCircuits: s.circuits
        .filter((c) => c.owner === "sam")
        .map((c) => ({
          id: c.id,
          value: c.value!,
          restored: c.restored,
          shared: s.clues.some((clue) => clue.slotId === c.id),
        })),
      rooms: (["nova", "pip"] as const).map((id) => ({
        id,
        name: id === "nova" ? "Nova" : "Pip",
        system: id === "nova" ? "Navigation" : "Life support",
        slots: s.circuits
          .filter((c) => c.owner === id)
          .map((c) => {
            const clue = s.clues.find((clue) => clue.slotId === c.id);
            return {
              id: c.id,
              restored: c.restored,
              clue: clue ? { min: clue.min, max: clue.max } : undefined,
            };
          }),
      })),
      messages: messages.length
        ? messages
        : [
            {
              id: "intro",
              text: "Crew standing by. Ask for a clue, or share one of your circuits so we can help.",
            },
          ],
      event: {
        id: event.index,
        kind,
        text:
          feedback ??
          {
            ready: "Select a number and a hidden slot to connect.",
            success: "Connection restored. The ship feels a little brighter.",
            damage: "Connection rejected. Hull damage detected.",
            clue: "Emergency transmission received.",
            victory: "All systems online. Welcome home.",
            defeat: event.message,
          }[kind],
      },
    };
  };
  let snapshot = map(engine.getGameState());
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
  };
  const publish = () => {
    snapshot = map(engine.getGameState());
    if (snapshot.status !== "playing") stop();
    listeners.forEach((fn) => fn());
  };
  const syncClock = () => {
    const now = performance.now();
    engine.advanceTime(now - last);
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
        engine.attemptConnection(target);
      }),
    requestClue: (id) =>
      run(() => {
        engine.requestHint(id);
      }),
    shareCircuit: (id) =>
      run(() => {
        engine.shareCircuit(id);
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
      aiElapsed = 0;
      timer = setInterval(() => {
        const before = last;
        syncClock();
        aiElapsed += last - before;
        if (engine.getGameState().status === "playing" && aiElapsed >= 2000) {
          aiElapsed %= 2000;
          engine.advanceAI();
        }
        publish();
      }, 250);
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
