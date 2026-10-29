/** VISUAL FIXTURES ONLY. No matching rules or AI strategy; not included in production. */
import { createRoot } from "react-dom/client";
import { App } from "../../src/screens/App";
import type { MissionAdapter, MissionView } from "../../src/types/presentation";
import "../../src/styles/theme.css";
const initial = (): MissionView => ({
  status: "playing",
  hull: 100,
  secondsRemaining: 300,
  elapsedSeconds: 0,
  energy: 3,
  restored: 0,
  required: 3,
  ownCircuits: [2, 5, 8].map((value, i) => ({
    id: `s${i}`,
    value,
    restored: false,
  })),
  rooms: [
    {
      id: "nova",
      name: "Nova",
      system: "Navigation",
      slots: [0, 1, 2].map((i) => ({ id: `n${i}`, restored: false })),
    },
    {
      id: "pip",
      name: "Pip",
      system: "Life support",
      slots: [0, 1, 2].map((i) => ({ id: `p${i}`, restored: false })),
    },
  ],
  messages: [
    {
      id: "hello",
      text: "Visual fixture. These scenes do not simulate gameplay.",
    },
  ],
  board: {
    ordered: true,
    turn: "sam",
    phase: "selecting",
    note: "TEST FIXTURE ONLY · revised-engine presentation checks",
  },
  event: { id: 0, kind: "ready", text: "Select a circuit." },
  effects: [],
  history: [],
});
let state = initial();
let count = 0;
const listeners = new Set<() => void>();
const publish = (next: MissionView) => {
  state = next;
  listeners.forEach((f) => f());
};
const adapter: MissionAdapter = {
  getSnapshot: () => state,
  subscribe: (f) => {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
  activate: () => {},
  deactivate: () => {},
  dispose: () => {},
  restart: () => {
    count = 0;
    publish(initial());
  },
  connect: () => {
    count++;
    document.querySelector("#command-count")!.textContent = String(count);
  },
  passTurn: () => {},
  resolveSolo: () => {},
  requestClue: () => {},
  shareCircuit: () => {},
};
function scenario(kind: "nova" | "damage" | "success" | "sam") {
  const id = state.event.id + 1;
  publish({
    ...state,
    board: {
      ...state.board!,
      turn: kind === "nova" ? "nova" : "sam",
      phase: kind === "nova" ? "thinking" : "selecting",
    },
    hull: kind === "damage" ? 40 : state.hull,
    restored: kind === "success" ? 1 : state.restored,
    ownCircuits: state.ownCircuits.map((s, i) => ({
      ...s,
      restored: kind === "success" && i === 0,
    })),
    rooms: state.rooms.map((r, i) => ({
      ...r,
      slots: r.slots.map((s, j) => ({
        ...s,
        restored: kind === "success" && i === 0 && j === 0,
        clue:
          kind === "damage" && i === 0 && j === 0 ? { min: 4, max: 4 } : s.clue,
      })),
    })),
    event: {
      id,
      kind:
        kind === "damage" ? "damage" : kind === "success" ? "success" : "ready",
      text:
        kind === "damage"
          ? "Engine fixture: incorrect guess. Nova slot 1 is 4."
          : kind === "success"
            ? "Connection restored."
            : "Turn updated.",
    },
    effects:
      kind === "damage" || kind === "success"
        ? [...(state.effects ?? []), { id, kind, slotIds: ["s0", "n0"] }]
        : state.effects,
  });
}
createRoot(document.getElementById("root")!).render(
  <>
    <div style={{ padding: 12, background: "#442d48", color: "#fff" }}>
      TEST FIXTURES ONLY · Commands: <span id="command-count">0</span>
      <label>Hull preview <select aria-label="Hull preview" defaultValue={100} onChange={e=>publish({...state,hull:Number(e.target.value)})}>
        {[100,90,80,79,75,60,59,50,40,39,25,20,19,10,1,0].map(n=><option key={n} value={n}>{n}%</option>)}
      </select></label>
      <button onClick={()=>publish({...state})}>Rerender unchanged hull</button>
      {(["nova", "sam", "damage", "success"] as const).map((k) => (
        <button key={k} onClick={() => scenario(k)}>
          Fixture {k}
        </button>
      ))}
    </div>
    <App adapter={adapter} />
  </>,
);
