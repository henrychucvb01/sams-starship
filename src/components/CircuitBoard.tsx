import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  MissionAdapter,
  MissionView,
  Slot,
  ToolId,
} from "../types/presentation";
import { NumberTracker } from "./NumberTracker";
import { ConnectionOverlay } from "./ConnectionOverlay";
import { Toolkit } from "./Toolkit";
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
  const [drag, setDrag] = useState<{
    from: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    over: string | null;
  } | null>(null);
  const pointer = useRef<{
    id: number;
    source: string;
    x: number;
    y: number;
    active: boolean;
    cx: number;
    cy: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragNotice, setDragNotice] = useState("");
  const [own, setOwn] = useState("");
  const [target, setTarget] = useState("");
  const [secondOwn, setSecondOwn] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [toolTargets, setToolTargets] = useState<string[]>([]);
  const [threshold, setThreshold] = useState("6");
  const secondOwnSlot = state.ownCircuits.find(
    (s) => s.id === secondOwn && !s.restored,
  );
  const clearSelection = () => {
    setDrag(null);
    pointer.current = null;
    setOwn("");
    setTarget("");
    setSecondOwn("");
    setDeclaring(false);
    setSelectedTool(null);
    setToolTargets([]);
  };
  const selectTool = (id: ToolId) => {
    setSelectedTool((t) => (t === id ? null : id));
    setToolTargets([]);
    setSecondOwn("");
    setTarget("");
    setDeclaring(false);
  };
  useEffect(() => {
    clearSelection();
  }, [state.board?.turnNumber]);
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
    if (!board || effect?.kind !== "success" || effect.slotIds.length < 2) {
      setArc({ path: "", width: 1, height: 1 });
      return;
    }
    const tiles = effect.slotIds.map((id) =>
      board.querySelector(`[data-slot="${CSS.escape(id)}"]`),
    );
    if (tiles.some((t) => !t)) return;
    const box = board.getBoundingClientRect();
    const points = tiles.map((t) => {
      const r = t!.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - box.left,
        y: r.top + r.height / 2 - box.top,
      };
    });
    const path = points
      .slice(1)
      .map((b, i) => {
        const a = points[i];
        return `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 35} ${b.x} ${b.y}`;
      })
      .join(" ");
    setArc({
      path,
      width: box.width,
      height: box.height,
    });
  }, [effect]);
  const turn = state.board?.turn;
  const canAct = state.status === "playing" && (!turn || turn === "sam");
  function beginDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    slot: Slot,
    owner: string,
  ) {
    if (
      !event.isPrimary ||
      !!pointer.current ||
      !canAct ||
      busy ||
      selectedTool ||
      owner !== "sam" ||
      slot.restored ||
      event.button !== 0
    )
      return;
    if (
      event.pointerType === "touch" &&
      !(event.target as Element).closest("[data-drag-grip]")
    )
      return;
    pointer.current = {
      id: event.pointerId,
      source: slot.id,
      x: event.clientX,
      y: event.clientY,
      active: false,
      cx: event.clientX,
      cy: event.clientY,
    };
    suppressClick.current = false;
    setDragNotice("");
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  const dragFrame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (dragFrame.current) cancelAnimationFrame(dragFrame.current);
    },
    [],
  );
  function trackPointer() {
    dragFrame.current = undefined;
    const p = pointer.current,
      board = boardRef.current;
    if (!p?.active || !board) return;
    if (p.cy < 55) window.scrollBy(0, -12);
    else if (p.cy > window.innerHeight - 55) window.scrollBy(0, 12);
    const under = document.elementFromPoint(p.cx, p.cy);
    const row = under?.closest<HTMLElement>(".rack-scroll");
    if (row) {
      const r = row.getBoundingClientRect();
      if (p.cx < r.left + 25) row.scrollLeft -= 8;
      else if (p.cx > r.right - 25) row.scrollLeft += 8;
    }
    const source = board.querySelector(`[data-slot="${CSS.escape(p.source)}"]`);
    const box = board.getBoundingClientRect();
    const start = source?.getBoundingClientRect();
    const target = under?.closest<HTMLButtonElement>("button[data-slot]");
    setDrag({
      from: p.source,
      x1: start ? start.left + start.width / 2 - box.left : p.x - box.left,
      y1: start ? start.top + start.height / 2 - box.top : p.y - box.top,
      x2: p.cx - box.left,
      y2: p.cy - box.top,
      over:
        target && board.contains(target) && !target.disabled
          ? (target.dataset.slot ?? null)
          : null,
    });
    dragFrame.current = requestAnimationFrame(trackPointer);
  }
  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const p = pointer.current;
    const board = boardRef.current;
    if (!p || p.id !== event.pointerId || !board) return;
    if (!p.active && Math.hypot(event.clientX - p.x, event.clientY - p.y) < 8)
      return;
    p.active = true;
    p.cx = event.clientX;
    p.cy = event.clientY;
    if (!dragFrame.current)
      dragFrame.current = requestAnimationFrame(trackPointer);
    event.preventDefault();
  }
  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    pointer.current = null;
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!p.active) return;
    suppressClick.current = true;
    const el = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("button[data-slot]");
    const id = el?.dataset.slot;
    if (
      !el ||
      !id ||
      el.disabled ||
      !boardRef.current?.contains(el) ||
      id === p.source
    ) {
      setDragNotice("Connection canceled. Nothing was submitted.");
      return;
    }
    const source = state.ownCircuits.find(
      (s) => s.id === p.source && !s.restored,
    );
    if (!source || !canAct) return;
    const same = state.ownCircuits.find((s) => s.id === id && !s.restored);
    if (
      same &&
      same.value !== source.value &&
      !(same.type === "yellow" && source.type === "yellow")
    ) {
      setDragNotice("Choose a matching Sam circuit, or a crew circuit.");
      return;
    }
    setSelectedTool(null);
    setOwn(p.source);
    setSecondOwn(same ? id : "");
    setTarget(same ? "" : id);
    setDeclaring(true);
  }
  function cancelDrag() {
    pointer.current = null;
    setDrag(null);
    setDragNotice("Connection canceled. Nothing was submitted.");
  }
  const ownSlot = state.ownCircuits.find((s) => s.id === own && !s.restored);
  const targetRoom = state.rooms.find((r) =>
    r.slots.some((s) => s.id === target),
  );
  const targetSlot = targetRoom?.slots.find(
    (s) => s.id === target && !s.restored,
  );
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (declaring && ownSlot && (targetSlot || secondOwnSlot))
      confirmation.current?.focus();
  }, [declaring, own, target]);
  useEffect(() => {
    if (!ownSlot || (!targetSlot && !secondOwnSlot) || !canAct)
      setDeclaring(false);
  }, [ownSlot?.id, targetSlot?.id, secondOwnSlot?.id, canAct]);
  function selectOwn(id: string) {
    setDragNotice("");
    const clicked = state.ownCircuits.find((s) => s.id === id);
    if (
      !selectedTool &&
      ownSlot &&
      id !== own &&
      (clicked?.value === ownSlot.value ||
        (clicked?.type === "yellow" && ownSlot.type === "yellow"))
    ) {
      setSecondOwn(id);
      setTarget("");
      setDeclaring(true);
      return;
    }
    setOwn(id);
    setSecondOwn("");
    setDeclaring(!!targetSlot && !selectedTool);
  }
  function selectTarget(id: string) {
    setDragNotice("");
    if (selectedTool) {
      setToolTargets((ids) =>
        ids.includes(id)
          ? ids.filter((t) => t !== id)
          : selectedTool === "dual-scanner"
            ? [...ids.slice(-1), id]
            : [id],
      );
      return;
    }
    setTarget(id);
    setSecondOwn("");
    setDeclaring(!!ownSlot);
  }
  function connect() {
    if (busy || !canAct || !ownSlot || (!targetSlot && !secondOwnSlot)) return;
    setBusy(true);
    setDragNotice("");
    try {
      if (secondOwnSlot) adapter.selfMatch?.([ownSlot.id, secondOwnSlot.id]);
      else if (targetSlot) adapter.connect(ownSlot.id, targetSlot.id);
      setSecondOwn("");
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
    const validToolTarget =
      selectedTool &&
      state.tools
        ?.find((t) => t.id === selectedTool)
        ?.targetIds?.includes(slot.id);
    const selected =
      owner === "sam"
        ? own === slot.id || secondOwn === slot.id
        : selectedTool
          ? toolTargets.includes(slot.id)
          : target === slot.id;
    const exact =
      slot.clue && slot.clue.min === slot.clue.max ? slot.clue.min : undefined;
    const shown = value ?? exact;
    const affected = effect?.slotIds.includes(slot.id);
    return (
      <button
        key={slot.id}
        data-slot={slot.id}
        data-circuit-type={slot.type ?? "hidden"}
        onPointerDown={(e) => beginDrag(e, slot, owner)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={() => {
          if (pointer.current) cancelDrag();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            cancelDrag();
            setDeclaring(false);
          }
        }}
        className={`wire-tile ${slot.type ? `circuit-${slot.type}` : ""} ${drag?.over === slot.id ? "drop-ready" : ""} ${value !== undefined ? "known" : "secret"} ${selected ? "chosen" : ""} ${validToolTarget && owner !== "sam" && !slot.restored ? "tool-target" : ""} ${slot.restored ? "cleared" : ""} ${exact !== undefined ? "disclosed" : ""} ${affected ? `wire-${effect?.kind}` : ""}`}
        disabled={
          !canAct ||
          slot.restored ||
          busy ||
          (!!selectedTool &&
            (owner === "sam"
              ? selectedTool !== "dual-scanner"
              : !validToolTarget))
        }
        aria-pressed={selected}
        aria-label={`${owner === "sam" ? "Sam circuit" : `${owner}, slot ${index + 1}`}${value !== undefined ? ` ${value}, slot ${index + 1}` : exact !== undefined ? `, clue ${exact}` : ", hidden"}${slot.restored ? ", restored" : ""}${slot.type === "yellow" ? ", yellow special circuit" : slot.type === "red" ? ", red dangerous circuit" : ""}`}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          owner === "sam" ? selectOwn(slot.id) : selectTarget(slot.id);
        }}
      >
        {affected && (effect?.kind === "scan" || effect?.kind === "dual") && (
          <span className="scanner-beam" aria-hidden="true" />
        )}
        {owner === "sam" && (
          <span
            data-drag-grip
            className="wire-grab"
            title="Drag grip"
            aria-hidden="true"
          >
            ⠿
          </span>
        )}
        {slot.type && (
          <span className="circuit-type-mark" aria-hidden="true">
            {slot.type === "red" ? "⚠" : slot.type === "yellow" ? "◆" : "●"}
          </span>
        )}
        <span className="wire-pins" aria-hidden="true" />
        <strong>
          {slot.type === "yellow"
            ? "Y"
            : slot.type === "red"
              ? "!"
              : (shown ?? "?")}
        </strong>
        {slot.sortLabel && (
          <span className="sort-position">{slot.sortLabel}</span>
        )}
        <span className="wire-index">
          {slot.restored
            ? "✓ CLEARED"
            : selected
              ? "SELECTED"
              : `SLOT ${index + 1}`}
        </span>
        {slot.scans?.length ? (
          <span className="scanner-result">
            {slot.scans.map((s) => `${s.relation} ${s.threshold}`).join(" · ")}
          </span>
        ) : null}
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
      className={`deduction-screen ${effect?.kind === "damage" || effect?.kind === "critical" ? "screen-impact" : ""}`}
    >
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            {state.missionName ?? "Restore the Lights"} · EASY · MATCHING
            NUMBERS
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
          <NumberTracker tracker={state.tracker} />
          <p className="drag-instructions">
            Tap two circuits, or drag from Sam’s grip ⠿ to a target. Every
            connection needs confirmation.
          </p>
          <div className="board-table" ref={boardRef}>
            {drag && (
              <svg className="drag-wire" aria-hidden="true">
                <path
                  d={`M${drag.x1} ${drag.y1} Q${(drag.x1 + drag.x2) / 2} ${Math.min(drag.y1, drag.y2) - 30} ${drag.x2} ${drag.y2}`}
                />
              </svg>
            )}
            <ConnectionOverlay
              scene={
                effect
                  ? {
                      phase: "result",
                      outcome: effect.kind,
                      eventId: effect.id,
                      circuitIds:effect.slotIds,
                    }
                  : declaring
                    ? {
                        phase: "confirming",
                        ownId: own,
                        targetId: target || secondOwn,
                      }
                    : null
              }
            />

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
                    effect?.kind === "hint"
                      ? "thinking"
                      : effect?.kind === "damage" || effect?.kind === "critical"
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
            {dragNotice || state.event.text}
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
            {ownSlot && (targetSlot || secondOwnSlot) && !declaring && (
              <button
                className="secondary compact"
                onClick={() => setDeclaring(true)}
              >
                Review connection
              </button>
            )}
          </div>
          {declaring && ownSlot && (targetSlot || secondOwnSlot) && (
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
                <span className="eyebrow">ARE YOU SURE?</span>
                <p>
                  Connect Sam’s <strong>{ownSlot.value}</strong> to{" "}
                  {secondOwnSlot
                    ? "Sam’s second matching circuit"
                    : `${targetRoom!.name}, slot ${targetRoom!.slots.findIndex((s) => s.id === target) + 1}`}
                  ?
                  {secondOwnSlot && (
                    <small className="self-explainer">
                      {state.selfMatches?.find(
                        (m) => m.number === ownSlot.value,
                      )?.explanation ??
                        "The engine checks whether Sam holds every remaining copy."}
                    </small>
                  )}
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
                  setSecondOwn("");
                }}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={busy || !canAct}
                onClick={connect}
                aria-label={secondOwnSlot ? "Connect Pair" : "Connect circuits"}
              >
                {secondOwnSlot ? "Connect Pair" : "Connect"} <span>ϟ</span>
              </button>
            </div>
          )}
          {selectedTool && (
            <div
              className="tool-confirmation"
              role="region"
              aria-label="Confirm tool"
            >
              <span className="eyebrow">
                {state.tools?.find((t) => t.id === selectedTool)?.name ??
                  "Tool"}
              </span>
              <p>
                {selectedTool === "shield"
                  ? "Activate a shield around the shared ship."
                  : selectedTool === "hint"
                    ? "Receive one engine-generated deduction clue."
                    : selectedTool === "dual-scanner"
                      ? `Choose two crew circuits and one Sam number. ${toolTargets.length}/2 targets selected.`
                      : "Choose a crew circuit and enter a threshold."}
              </p>
              {selectedTool === "scanner" && (
                <label>
                  Threshold
                  <input
                    aria-label="Scanner threshold"
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </label>
              )}
              <button
                className="text-button"
                onClick={() => {
                  setSelectedTool(null);
                  setToolTargets([]);
                }}
              >
                Cancel tool
              </button>
              <button
                className="primary"
                disabled={
                  !canAct ||
                  busy ||
                  !adapter.useTool ||
                  (selectedTool === "scanner" &&
                    (toolTargets.length !== 1 ||
                      !Number.isSafeInteger(Number(threshold)))) ||
                  (selectedTool === "dual-scanner" &&
                    (toolTargets.length !== 2 || !ownSlot))
                }
                onClick={() => {
                  if (!canAct || busy) return;
                  setBusy(true);
                  try {
                    adapter.useTool?.(selectedTool, {
                      targets: toolTargets,
                      token: state.toolToken ?? "",
                      ownId: own,
                      threshold: Number(threshold),
                    });
                    clearSelection();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirm tool
              </button>
            </div>
          )}
          {state.toolClue && (
            <p className="sam-clue" role="status">
              ✧ {state.toolClue}
            </p>
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
            {ownSlot?.type === "red" && (
              <button
                className="secondary compact"
                disabled={!canAct}
                onClick={() => {
                  adapter.isolateRed?.(ownSlot.id);
                  clearSelection();
                }}
              >
                Isolate selected red
              </button>
            )}
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
            className={`attack-scene hull-${hullStage} ${effect?.kind === "damage" ? "under-attack" : effect?.kind === "critical" ? "critical-failure" : ""} ${effect?.kind === "success" ? "system-restoring" : ""}`}
            data-effect={effect?.id}
            aria-label={`Spaceship condition: ${hullStage}`}
          >
            <span className="panel-kicker">SS BUTTER · SHARED SHIP</span>
            {(state.shieldActive ||
              effect?.kind === "shield" ||
              effect?.kind === "blocked") && (
              <div
                className={`energy-shield ${effect?.kind === "blocked" ? "shield-impact" : ""}`}
                aria-label={
                  effect?.kind === "blocked"
                    ? "Shield absorbed the attack"
                    : "Emergency Shield active"
                }
              />
            )}
            {effect?.kind === "blocked" && (
              <div
                className="blocked-projectile"
                key={effect.id}
                aria-hidden="true"
              />
            )}
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
            {effect?.kind === "critical" && (
              <div className="critical-flash" role="status">
                ⚠ RED CIRCUIT · CRITICAL FAILURE
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
          <Toolkit
            tools={state.tools}
            selected={selectedTool}
            onSelect={selectTool}
            canAct={canAct && !effect}
          />
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
              className="text-button transmit"
              disabled={
                !ownSlot || !canAct || state.energy <= 0 || ownSlot?.shared
              }
              onClick={() => adapter.shareCircuit(own)}
            >
              Share selected Sam circuit · 1 energy
            </button>
            <small>
              Share a selected Sam number for one energy and a turn. Use Sam’s
              Toolkit for limited deduction help.
            </small>
          </section>
        </aside>
      </div>
    </section>
  );
}
