import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { MissionAdapter, MissionView, Slot } from "../types/presentation";
import { Sam, Ship } from "./Ship";
const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
type Effect = NonNullable<MissionView["effects"]>[number];
/** Queue public engine events once. Effects never invoke a gameplay command. */
function useEffects(effects: Effect[], reset: number) {
  const seen = useRef(new Set<number>());
  const queue = useRef<Effect[]>([]);
  const busy = useRef(false);
  const [current, setCurrent] = useState<Effect | null>(null);
  useEffect(() => {
    seen.current.clear();
    queue.current = [];
    busy.current = false;
    setCurrent(null);
  }, [reset]);
  useEffect(() => {
    for (const event of effects) {
      if (!seen.current.has(event.id)) {
        seen.current.add(event.id);
        queue.current.push(event);
      }
    }
    if (!busy.current && queue.current.length) {
      busy.current = true;
      setCurrent(queue.current.shift()!);
    }
  }, [effects, current]);
  useEffect(() => {
    if (!current) return;
    const timeout = setTimeout(
      () => {
        busy.current = false;
        setCurrent(null);
      },
      current.kind === "damage" ? 1000 : 650,
    );
    return () => clearTimeout(timeout);
  }, [current]);
  return current;
}
export function CircuitBoard({
  state,
  adapter,
  onLeave,
  headingRef,
}: {
  state: MissionView;
  adapter: MissionAdapter;
  onLeave: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [own, setOwn] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [reset, setReset] = useState(0);
  const previous = useRef(state.event.id);
  useEffect(() => {
    if (state.event.id < previous.current) {
      setReset((n) => n + 1);
      setOwn("");
      setTarget("");
      setDeclaring(false);
    }
    previous.current = state.event.id;
  }, [state.event.id]);
  const effect = useEffects(state.effects ?? [], reset);
  const boardRef = useRef<HTMLDivElement>(null);
  const [arc, setArc] = useState({ path: "", width: 1, height: 1 });
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || effect?.kind !== "success" || effect.slotIds.length !== 2) {
      setArc({ path: "", width: 1, height: 1 });
      return;
    }
    const tiles = effect.slotIds.map((id) =>
      board.querySelector(`[data-slot="${CSS.escape(id)}"]`),
    );
    if (tiles.some((t) => !t)) return;
    const box = board.getBoundingClientRect();
    const [a, b] = tiles.map((t) => {
      const r = t!.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - box.left,
        y: r.top + r.height / 2 - box.top,
      };
    });
    setArc({
      path: `M${a.x} ${a.y} C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`,
      width: box.width,
      height: box.height,
    });
  }, [effect]);
  const turn = state.board?.turn;
  const canAct = state.status === "playing" && (!turn || turn === "sam");
  const ownSlot = state.ownCircuits.find((s) => s.id === own && !s.restored);
  const targetRoom = state.rooms.find((r) =>
    r.slots.some((s) => s.id === target),
  );
  const targetSlot = targetRoom?.slots.find(
    (s) => s.id === target && !s.restored,
  );
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (declaring && ownSlot && targetSlot) confirmation.current?.focus();
  }, [declaring, own, target]);
  useEffect(() => {
    if (!ownSlot || !targetSlot || !canAct) setDeclaring(false);
  }, [ownSlot?.id, targetSlot?.id, canAct]);
  function selectOwn(id: string) {
    setOwn(id);
    setDeclaring(!!targetSlot);
  }
  function selectTarget(id: string) {
    setTarget(id);
    setDeclaring(!!ownSlot);
  }
  function connect() {
    if (busy || !canAct || !ownSlot || !targetSlot) return;
    setBusy(true);
    try {
      adapter.connect(ownSlot.id, targetSlot.id);
      setDeclaring(false);
      setOwn("");
      setTarget("");
    } finally {
      setBusy(false);
    }
  }
  const hullStage =
    state.hull === 0
      ? "shutdown"
      : state.hull <= 25
        ? "critical"
        : state.hull <= 50
          ? "heavy"
          : state.hull <= 75
            ? "minor"
            : "normal";
  const turnText = turn
    ? `${turn === "sam" ? "Sam's" : turn === "nova" ? "Nova's" : "Pip's"} turn${state.board?.phase === "thinking" ? " · thinking" : state.board?.phase === "connecting" ? " · connecting" : ""}`
    : "Turn flow pending engine update";
  function tile(
    slot: Slot,
    value: number | undefined,
    owner: string,
    index: number,
  ) {
    const selected = owner === "sam" ? own === slot.id : target === slot.id;
    const exact =
      slot.clue && slot.clue.min === slot.clue.max ? slot.clue.min : undefined;
    const shown = value ?? exact;
    const affected = effect?.slotIds.includes(slot.id);
    return (
      <button
        key={slot.id}
        title={
          slot.possibilities
            ? `Public deductions: ${slot.possibilities.join(", ")}`
            : undefined
        }
        data-slot={slot.id}
        className={`wire-tile ${value !== undefined ? "known" : "secret"} ${selected ? "chosen" : ""} ${slot.restored ? "cleared" : ""} ${exact !== undefined ? "disclosed" : ""} ${affected ? `wire-${effect?.kind}` : ""}`}
        disabled={!canAct || slot.restored || busy}
        aria-pressed={selected}
        aria-label={`${owner === "sam" ? "Sam circuit" : `${owner}, slot ${index + 1}`}${value !== undefined ? ` ${value}, slot ${index + 1}` : exact !== undefined ? `, clue ${exact}` : ", hidden"}${slot.restored ? ", restored" : ""}`}
        onClick={() =>
          owner === "sam" ? selectOwn(slot.id) : selectTarget(slot.id)
        }
      >
        <span className="wire-pins" aria-hidden="true" />
        <strong>{shown ?? "?"}</strong>
        <span className="wire-index">
          {slot.restored
            ? "✓ CLEARED"
            : selected
              ? "SELECTED"
              : `SLOT ${index + 1}`}
        </span>
        {slot.excluded?.length ? (
          <span className="incorrect-mark">≠ {slot.excluded.join(", ")}</span>
        ) : null}
        {slot.clue && slot.clue.min !== slot.clue.max && (
          <small>
            {slot.clue.min}–{slot.clue.max}
          </small>
        )}
      </button>
    );
  }
  return (
    <section
      className={`deduction-screen ${effect?.kind === "damage" ? "screen-impact" : ""}`}
    >
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            RESTORE THE LIGHTS · EASY · MATCHING NUMBERS
          </span>
          <h1 ref={headingRef} tabIndex={-1}>
            One crew. Every connection counts.
          </h1>
        </div>
        <button className="secondary compact" onClick={onLeave}>
          Leave mission
        </button>
      </div>
      {state.board?.note && (
        <p className="engine-note" role="note">
          {state.board.note}
        </p>
      )}
      <div className="mission-ribbon" aria-label="Mission status">
        <span>
          Hull <strong>{state.hull}%</strong>
        </span>
        <span>
          Clock <strong>{clock(state.secondsRemaining)}</strong>
        </span>
        <span>
          Restored{" "}
          <strong>
            {state.restored} / {state.required}
          </strong>
        </span>
        <span>
          Remaining{" "}
          <strong>
            {state.remainingCircuits ?? (state.required - state.restored) * 2}
          </strong>
        </span>
        <span>
          Energy <strong>ϟ {state.energy}</strong>
        </span>
        <progress
          value={state.restored}
          max={state.required}
          aria-label="Restoration progress"
        />
      </div>
      <div className="deduction-layout">
        <div className="board-main">
          <div className="board-table" ref={boardRef}>
            <div className="board-topline">
              <span className="eyebrow">CREW CIRCUIT BOARD</span>
              <span className="turn-pill" role="status">
                {turnText}
              </span>
            </div>
            {state.rooms.map((room) => (
              <section
                className={`rack rack-${room.id} ${turn === room.id ? "active-rack" : ""} ${effect?.participant === room.id ? "crew-acted" : ""}`}
                key={room.id}
                aria-label={`${room.name} circuit rack`}
              >
                <div className="rack-label">
                  <span
                    className="portrait"
                    aria-label={`${room.name} temporary avatar`}
                  >
                    {room.name[0]}
                  </span>
                  <div>
                    <h2>
                      {room.name} <small>AI CREWMATE</small>
                    </h2>
                    <p>
                      {turn === room.id ? "● ACTIVE TURN" : room.system} ·{" "}
                      {room.slots.filter((s) => !s.restored).length} circuits
                      left
                    </p>
                  </div>
                  <span className="rack-direction">
                    {state.board?.ordered ? "LOW → HIGH" : "ENGINE ORDER"}
                  </span>
                </div>
                <div
                  className="rack-scroll"
                  tabIndex={0}
                  aria-label={`${room.name} circuit row, scroll horizontally if needed`}
                >
                  <div className="wire-row">
                    {room.slots.map((slot, i) =>
                      tile(slot, undefined, room.name, i),
                    )}
                  </div>
                </div>
                <p className="crew-whisper">
                  {turn === room.id
                    ? `${room.name} is ${state.board?.phase ?? "taking a turn"}…`
                    : "Emergency terminal standing by."}
                </p>
              </section>
            ))}
            <div className="board-bridge" aria-hidden="true">
              <span />ϟ<span />
            </div>
            <section
              className={`rack rack-sam ${turn === "sam" ? "active-rack" : ""}`}
              aria-label="Sam circuit rack"
            >
              <div className="rack-label">
                <Sam
                  expression={
                    effect?.kind === "damage"
                      ? "surprised"
                      : state.hull <= 25
                        ? "worried"
                        : effect?.kind === "success"
                          ? "happy"
                          : "thinking"
                  }
                />
                <div>
                  <h2>
                    Sam <small>YOU</small>
                  </h2>
                  <p>
                    {turn === "sam" ? "● YOUR TURN" : "Your circuits"} ·{" "}
                    {state.ownCircuits.filter((s) => !s.restored).length}{" "}
                    circuits left
                  </p>
                </div>
                <span className="rack-direction">LOW → HIGH</span>
              </div>
              <div
                className="rack-scroll"
                tabIndex={0}
                aria-label="Sam circuit row, scroll horizontally if needed"
              >
                <div className="wire-row">
                  {state.ownCircuits.map((slot, i) =>
                    tile(slot, slot.value, "sam", i),
                  )}
                </div>
              </div>
            </section>
            {effect?.kind === "success" && (
              <div
                key={effect.id}
                className="connection-arc"
                aria-hidden="true"
              >
                <svg
                  viewBox={`0 0 ${arc.width} ${arc.height}`}
                  preserveAspectRatio="none"
                >
                  <path d={arc.path} />
                </svg>
                <span>ϟ CONNECTION RESTORED</span>
              </div>
            )}
          </div>
          <div className="board-instruction" role="status">
            {state.event.text}
          </div>
          <div className="selection-tray">
            <span>
              {ownSlot
                ? `Sam: ${ownSlot.value}`
                : "① Select one of Sam’s numbers"}
            </span>
            <span>→</span>
            <span>
              {targetSlot
                ? `${targetRoom!.name} · slot ${targetRoom!.slots.findIndex((s) => s.id === target) + 1}`
                : "② Select a crew circuit"}
            </span>
            {ownSlot && targetSlot && !declaring && (
              <button
                className="secondary compact"
                onClick={() => setDeclaring(true)}
              >
                Review connection
              </button>
            )}
          </div>
          {declaring && ownSlot && targetSlot && (
            <div
              className="declaration-panel"
              ref={confirmation}
              tabIndex={-1}
              role="region"
              aria-label="Confirm connection"
              onKeyDown={(e) => {
                if (e.key === "Escape") setDeclaring(false);
              }}
            >
              <div>
                <span className="eyebrow">DECLARE YOUR CONNECTION</span>
                <p>
                  Connect Sam’s <strong>{ownSlot.value}</strong> to{" "}
                  {targetRoom!.name}, slot{" "}
                  {targetRoom!.slots.findIndex((s) => s.id === target) + 1}?
                </p>
              </div>
              <label>
                Declared number
                <input
                  aria-label="Declared number"
                  inputMode="numeric"
                  value={ownSlot.value}
                  readOnly
                />
              </label>
              <button
                className="text-button cancel-declaration"
                onClick={() => {
                  setDeclaring(false);
                  setTarget("");
                }}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={busy || !canAct}
                onClick={connect}
              >
                Connect <span>ϟ</span>
              </button>
            </div>
          )}
          <div className="turn-tools">
            <button
              className="secondary compact"
              disabled={!canAct}
              onClick={() => {
                setDeclaring(false);
                setOwn("");
                setTarget("");
                adapter.passTurn();
              }}
            >
              Pass turn
            </button>
            <button
              className="secondary compact"
              disabled={!canAct || !ownSlot}
              onClick={() => {
                setDeclaring(false);
                adapter.resolveSolo(own);
              }}
            >
              Resolve selected number alone
            </button>
            <small>
              Solo works only when Sam holds every remaining copy. The engine
              checks eligibility.
            </small>
          </div>
          <details className="deduction-log">
            <summary>
              Deduction log · {state.history?.length ?? state.messages.length}{" "}
              entries
            </summary>
            <div role="log" aria-label="Deduction history">
              {(state.history ?? state.messages).map((m) => (
                <p key={m.id}>{m.text}</p>
              ))}
            </div>
          </details>
        </div>
        <aside className="board-companion">
          <div
            className={`attack-scene hull-${hullStage} ${effect?.kind === "damage" ? "under-attack" : ""} ${effect?.kind === "success" ? "system-restoring" : ""}`}
            data-effect={effect?.id}
            aria-label={`Spaceship condition: ${hullStage}`}
          >
            <span className="panel-kicker">SS BUTTER · SHARED SHIP</span>
            <Ship restored={state.restored} damaged={state.hull <= 75} />
            {effect?.kind === "damage" && (
              <div className="attack-vfx" key={effect.id} aria-hidden="true">
                <span className="projectile" />
                <span className="impact-flash" />
                <span className="spark spark-a" />
                <span className="spark spark-b" />
                <span className="spark spark-c" />
              </div>
            )}
            <span className="ship-smoke" aria-hidden="true">
              ∿ ∿ ∿
            </span>
            <p className="damage-caption">
              {hullStage === "normal"
                ? "Ship stable"
                : hullStage === "minor"
                  ? "Minor damage · electrical sparks"
                  : hullStage === "heavy"
                    ? "Heavy damage · smoke detected"
                    : hullStage === "critical"
                      ? "Critical hull · electrical failure"
                      : "Hull lost · emergency shutdown"}
            </p>
          </div>
          <section className="mini-terminal">
            <div className="section-heading">
              <span className="eyebrow">EMERGENCY COMMS</span>
              <span className="energy-tag">ϟ {state.energy}</span>
            </div>
            <div
              className="mini-messages"
              role="log"
              aria-label="Crew transmissions"
            >
              {state.messages.map((m) => (
                <p key={m.id}>{m.text}</p>
              ))}
            </div>
            <button
              className="secondary"
              disabled={
                !targetSlot ||
                !canAct ||
                state.energy <= 0 ||
                (!!targetSlot?.clue &&
                  targetSlot.clue.min === targetSlot.clue.max)
              }
              onClick={() => adapter.requestClue(target)}
            >
              Request clue · 1 energy
            </button>
            <button
              className="text-button transmit"
              disabled={
                !ownSlot || !canAct || state.energy <= 0 || ownSlot?.shared
              }
              onClick={() => adapter.shareCircuit(own)}
            >
              Share selected Sam circuit · 1 energy
            </button>
            <small>
              Select a crew slot for a clue, or share your selected number.
            </small>
          </section>
        </aside>
      </div>
    </section>
  );
}
