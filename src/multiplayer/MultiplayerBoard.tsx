import { CrewReactionContext, StatusShip } from "../components/TerminalArt";
import { SetupPopup } from "../components/SetupPopup";
import { useEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import type { RoomView, RoomCommand } from "./protocol";
import { useCircuitDrag } from "./useCircuitDrag";
import { projectRoom } from "./projectRoom";
import { CrewPortrait } from "./CrewSelection";
import { NumberTracker } from "../components/NumberTracker";
import { CharacterCard, EquipmentCards } from "../components/CrewCards";
import { CrewActionDialog } from "../components/CrewActionDialog";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { ConnectionOverlay } from "../components/ConnectionOverlay";
import { useEffects } from "../components/CircuitBoard";
import type { CrewActionView } from "../types/crewPresentation";
type Review =
  | { kind: "connect"; own: string; target: string }
  | { kind: "solo"; number: number }
  | { kind: "setup"; id: string }
  | { kind: "share"; id: string }
  | { kind: "restart" };
export function MultiplayerBoard({
  room,
  blocked,
  command,
  headingRef,
  onLeaveSetup,
  setupNotice,
  onForgetSetup,
}: {
  room: RoomView;
  setupNotice?: ReactNode;
  onLeaveSetup?: () => void;
  onForgetSetup?: () => void;
  blocked: boolean;
  command: (c: RoomCommand) => Promise<void>;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const g = room.game!,
    me = room.playerId;
  const { crew, tracker, effects, label, name, red } = projectRoom(room);
  const [own, setOwn] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [action, setAction] = useState<{
    action: CrewActionView;
    token: string;
  } | null>(null);
  const [reset, setReset] = useState(0);
  const previous = useRef(g.history.at(-1)?.index ?? 0);
  const eventId = g.history.at(-1)?.index ?? 0;
  useEffect(() => {
    if (eventId < previous.current) setReset((n) => n + 1);
    previous.current = eventId;
  }, [eventId]);
  const baseline = useRef(eventId);
  if (eventId < baseline.current) baseline.current = -1;
  const effect = useEffects(
    effects.filter((e) => e.id > baseline.current),
    reset,
  );
  const turn = g.currentParticipant === me,
    canAct = !blocked && turn && g.phase === "turns" && g.status === "playing";
  useEffect(() => {
    setOwn("");
    setReview(null);
    setAction(null);
  }, [g.turnNumber, g.phase, g.status, reset]);
  const drag = useCircuitDrag(canAct, (from, to) => {
    const target = g.circuits.find((c) => c.id === to);
    if (target?.owner === me) {
      const group = g.selfMatches.find(
        (s) => s.circuitIds.includes(from) && s.circuitIds.includes(to),
      );
      if (group) setReview({ kind: "solo", number: group.number });
    } else if (target) setReview({ kind: "connect", own: from, target: to });
  });
  const selected = g.circuits.find((c) => c.id === own && !c.restored);
  const close = () => setReview(null);
  const group =
    review?.kind === "solo"
      ? g.selfMatches.find((s) => s.number === review.number)
      : undefined;
  const starting =
    review?.kind === "setup"
      ? g.circuits.find((c) => c.id === review.id)
      : undefined;
  const source =
    review?.kind === "connect"
      ? g.circuits.find((c) => c.id === review.own)
      : undefined;
  const target =
    review?.kind === "connect"
      ? g.circuits.find((c) => c.id === review.target)
      : undefined;
  const publicSource = source?.sortLabel ?? source?.value;
  const openAction = (a: CrewActionView) =>
    setAction({ action: a, token: g.toolToken });
  const submitAction = async (
    id: string,
    choices: Record<string, string[]>,
    token: string,
  ) => {
    const ownId = choices.own?.[0];
    const own = g.circuits.find((c) => c.id === ownId);
    const ids = choices.targets ?? [];
    if (id === "isolate") {
      if (!red?.eligible) return;
      await command({ type: "safeRed", circuitId: red.circuitIds[0] });
    } else if (id.startsWith("power:")) {
      if (!own || own.value === undefined)
        throw new Error("Choose your circuit.");
      await command({
        type: "power",
        ownId: own.id,
        firstId: ids[0],
        secondId: ids[1],
        number: own.value,
        token,
      });
    } else
      await command({
        type: "equipment",
        equipmentId: id,
        command: {
          token,
          targets: ids,
          threshold: choices.threshold
            ? Number(choices.threshold[0])
            : undefined,
          ownId,
          number: own?.value,
        },
      });
    setAction(null);
    setOwn("");
  };
  const stage =
    g.hull === 0
      ? "shutdown"
      : g.damageStage === "critical"
        ? "critical"
        : g.damageStage === "moderate"
          ? "heavy"
          : g.damageStage === "light"
            ? "minor"
            : "normal";
  return (
    <CrewReactionContext.Provider value={{effect,captain:g.captain,status:g.status}}><div
      className={`game-terminal mp-board ${effect?.kind === "damage" || effect?.kind === "critical" ? "screen-impact" : ""}`}
    >
      <h1 ref={headingRef} tabIndex={-1}>
        Emergency Repair Terminal
      </h1>
      {g.status !== "playing" && (
        <section className="mp-result" role="status">
          <h2>{g.status === "won" ? "Mission Complete" : "Mission Failed"}</h2>
          <p>{g.history.at(-1)?.message}</p>
          {room.hostId === me && (
            <button
              className="primary"
              disabled={blocked}
              onClick={() => setReview({ kind: "restart" })}
            >
              Play again
            </button>
          )}
        </section>
      )}
      {g.phase === "startingInformation" && g.status === "playing" && g.startingInformationChoices.length > 0 && (
        <SetupPopup>
        <section className="starting-information">
          <p>
            Make one of your blue circuits public. The Captain takes the first
            turn when everyone has chosen.
          </p>
          <div className="mp-actions">
            {g.startingInformationChoices.map((id) => {
              const c = g.circuits.find((c) => c.id === id)!;
              return (
                <button
                  key={id}
                  aria-label={`Blue ${c.value} · rack ${(c.rack ?? 0)+1}, slot ${c.position+1}`}
                  className="starting-option circuit-blue"
                  disabled={blocked}
                  onClick={() => setReview({ kind: "setup", id })}
                >
                  <strong>{c.value}</strong><small>Rack {(c.rack ?? 0) + 1} · Slot {c.position + 1}</small>
                </button>
              );
            })}
          </div>
          {!g.startingInformationChoices.length && (
            <p role="status">
              Your information is public. Waiting for your crewmates…
            </p>
          )}
          <p>
            {g.startingInformation.length}/{room.playerCount} crew markers
            placed
          </p>
          {setupNotice}
          <div className="setup-exit-actions">
            {onLeaveSetup && <button className="text-button" onClick={onLeaveSetup}>Leave room</button>}
            {onForgetSetup && <button className="text-button" onClick={onForgetSetup}>Join a different crew</button>}
          </div>
        </section></SetupPopup>
      )}
      {g.phase === "startingInformation" && !g.startingInformationChoices.length && <p role="status">Your information is public. Waiting for your crewmates… {g.startingInformation.length}/{room.playerCount} crew markers placed</p>}
      <div className="deduction-layout">
        <div className="board-main">
          <NumberTracker tracker={tracker} />          <EquipmentCards
            equipment={crew.equipment}
            onAction={openAction}
            canAct={!blocked && g.status === "playing" && g.phase === "turns"}
          />

          <p className="drag-instructions">
            Tap two circuits, or drag from your grip ⠿ to a target. Review and
            confirm every connection.
          </p>
          <div className="board-table" ref={drag.board}>
            {drag.path && (
              <svg className="drag-wire" aria-hidden="true">
                <path d={drag.path} />
              </svg>
            )}
            <ConnectionOverlay
              scene={
                effect
                  ? {
                      phase: "result",
                      outcome: effect.kind,
                      eventId: effect.id,
                      circuitIds: effect.slotIds,
                    }
                  : null
              }
            />
        <aside className="board-companion" style={{gridRow:`1 / span ${Math.max(1,g.participants.length-1)}`}}>      <div className="mission-ribbon">
        <span>
          Hull{" "}
          <strong>
            {Math.round(g.hull/g.maxHull*100)}%
          </strong>
        </span>
        <span>
          Clock{" "}
          <strong>
            {Math.floor(g.remainingMs / 60000)}:
            {String(Math.ceil(g.remainingMs / 1000) % 60).padStart(2, "0")}
          </strong>
        </span>
        <span>
          Restored{" "}
          <strong>
            {g.restored}/{g.total}
          </strong>
        </span>
        <span>
          Energy <strong>{g.energy}</strong>
        </span>
        <span className="turn-pill">
          {g.phase === "startingInformation"
            ? "Choose starting information"
            : `${name(g.currentParticipant)}’s turn${turn ? " · Your turn" : ""}`}
        </span>
      </div>
<p>Remaining circuits: {g.remainingCircuits}</p>
          <div
            className={`attack-scene hull-${stage} ${effect?.kind === "damage" ? "under-attack" : effect?.kind === "critical" ? "critical-failure" : ""} ${effect?.kind === "success" ? "system-restoring" : ""}`}
          >
            <span className="panel-kicker">ONE CREW · ONE SHARED SHIP</span>
            {g.shieldActive && (
              <div className="energy-shield" aria-label="Shield active" />
            )}
            <StatusShip condition={stage} />
            {effect?.kind === "damage" && (
              <div className="attack-vfx">
                <span className="projectile" />
                <span className="impact-flash" />
                <span className="spark spark-a" />
              </div>
            )}
            {effect?.kind === "critical" && (
              <div className="critical-flash" role="status">
                ⚠ CATASTROPHIC OVERLOAD
              </div>
            )}
            <p className="damage-caption">
              {g.status === "lost" ? "Mission failed" : `Ship ${stage}`}
            </p>
          </div>
        </aside>
            {[
              ...g.participants.filter((p) => p.id !== me),
              ...g.participants.filter((p) => p.id === me),
            ].map((p, i) => {
              const card = crew.crew.find((c) => c.id === p.id)!;
              const slots = g.circuits.filter((c) => c.owner === p.id);
              const racks = [...new Set(slots.map((c) => c.rack ?? 0))].sort(
                (a, b) => a - b,
              );
              const presence = room.players.find((x) => x.id === p.id);
              return (
                <section
                  style={p.id === me ? {gridRow:g.participants.length} : undefined}
                  className={`rack ${p.id === me ? "rack-self" : ""} ${g.currentParticipant === p.id ? "active-rack" : ""}`}
                  key={p.id}
                  aria-label={`${name(p.id)} circuit racks`}
                >
                  <CharacterCard
                    crew={card}
                    captain={g.captain === p.id}
                    self={p.id === me}
                    controlLabel={p.id === me ? "YOU" : "HUMAN CREWMATE"}
                    portrait={<CrewPortrait index={i} character={presence?.character} />}
                    detail={`${presence?.left ? "Left · seat reserved" : presence?.connected ? "Connected" : "Reconnecting"} · ${slots.filter((c) => !c.restored).length} circuits left`}
                    onAction={openAction}
                    canAct={canAct}
                  />
                  {racks.map((rack) => (
                    <div
                      className="mp-rack-group"
                      key={rack}
                      data-rack-owner={p.id}
                      data-rack-index={rack}
                    >
                      <h3 className="mp-rack-heading">
                        Rack {rack + 1} · Low → High
                      </h3>
                      <div
                        className="rack-scroll"
                        tabIndex={0}
                        aria-label={`${name(p.id)} rack ${rack + 1}, scroll horizontally`}
                      >
                        <div className="wire-row">
                          {slots
                            .filter((c) => (c.rack ?? 0) === rack)
                            .sort((a, b) => a.position - b.position)
                            .map((c) => {
                              const isOwn = p.id === me,
                                chosen = own === c.id,
                                affected = effect?.slotIds.includes(c.id),
                                marker = g.startingInformation.some(
                                  (m) => m.circuitId === c.id,
                                );
                              return (
                                <button
                                  {...drag.handlers(c.id, isOwn)}
                                  key={c.id}
                                  data-slot={c.id}
                                  data-owner={p.id}
                                  data-circuit-type={c.kind ?? "hidden"}
                                  className={`wire-tile ${isOwn ? "known" : "secret"} ${c.kind ? `circuit-${c.kind}` : ""} ${c.restored ? "cleared" : ""} ${chosen ? "chosen" : ""} ${affected ? `wire-${effect!.kind}` : ""}`}
                                  disabled={!canAct || c.restored}
                                  aria-pressed={chosen}
                                  aria-label={`${label(c.id)}${c.value !== undefined ? `, ${c.sortLabel ?? c.value}` : ", hidden"}${c.restored ? ", restored" : ""}${marker ? ", starting information" : ""}`}
                                  onClick={() => {
                                    if (!drag.clickAllowed()) return;
                                    if (isOwn) {
                                      if (selected && own !== c.id) {
                                        const eligible = g.selfMatches.find(
                                          (s) =>
                                            s.circuitIds.includes(own) &&
                                            s.circuitIds.includes(c.id),
                                        );
                                        if (eligible) {
                                          setReview({
                                            kind: "solo",
                                            number: eligible.number,
                                          });
                                          return;
                                        }
                                      }
                                      setOwn(c.id);
                                    } else if (selected)
                                      setReview({
                                        kind: "connect",
                                        own: own,
                                        target: c.id,
                                      });
                                  }}
                                >
                                  {isOwn && (
                                    <span
                                      data-drag-grip
                                      className="wire-grab"
                                      aria-hidden="true"
                                    >
                                      ⠿
                                    </span>
                                  )}
                                  <span
                                    className="wire-pins"
                                    aria-hidden="true"
                                  />
                                  <strong>
                                    {c.kind === "red"
                                      ? "!"
                                      : c.kind === "yellow"
                                        ? (c.sortLabel ?? "A")
                                        : (c.value ?? "?")}
                                  </strong>
                                  <span className="wire-index">
                                    {c.restored
                                      ? "✓ CLEARED"
                                      : `SLOT ${c.position + 1}`}
                                  </span>
                                  {marker && (
                                    <span
                                      className="information-marker"
                                      title="Public starting information"
                                    >
                                      i
                                    </span>
                                  )}
                                  {g.scannerResults
                                    .filter((s) => s.circuitId === c.id)
                                    .map((s, k) => (
                                      <span className="scanner-result" key={k}>
                                        {s.relation} {s.threshold}
                                      </span>
                                    ))}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
          <p className="mp-target-summary" role="status">
            {drag.notice ||
              (selected
                ? `Selected: ${label(selected.id)} · ${selected.sortLabel ?? selected.value}. Choose a crewmate’s target.`
                : turn
                  ? "Your turn. Choose one of your circuits."
                  : `Waiting for ${name(g.currentParticipant)}. No AI plays in human rooms.`)}
          </p>
          <div className="mp-actions">
            <button
              className="secondary compact"
              disabled={!canAct}
              onClick={() => void command({ type: "pass" }).catch(() => {})}
            >
              Pass turn
            </button>
            <button
              className="secondary compact"
              disabled={
                !canAct ||
                !selected ||
                g.energy < 1 ||
                g.publicReveals.some((r) => r.circuitId === own)
              }
              onClick={() => setReview({ kind: "share", id: own })}
            >
              Share selected circuit
            </button>
            {g.selfMatches
              .filter((s) => s.eligible)
              .map((s) => (
                <button
                  className="secondary compact"
                  disabled={!canAct}
                  key={s.number}
                  onClick={() => setReview({ kind: "solo", number: s.number })}
                >
                  Self-Connection · {s.number}
                </button>
              ))}
            <button
              className="secondary compact"
              disabled={!crew.isolateOverload?.available || !canAct}
              onClick={() => openAction(crew.isolateOverload!)}
            >
              Isolate Overload
            </button>
          </div>
          <small>{red?.explanation}</small>
          <details className="deduction-log">
            <summary>Crew transmissions · {g.history.length} entries</summary>
            <div role="log" aria-label="Crew transmissions">
              {g.history.map((e) => (
                <p key={e.index}>{e.message}</p>
              ))}
            </div>
          </details>
        </div>

      </div>
      {action && (
        <CrewActionDialog
          key={action.action.id}
          action={{
            ...action.action,
            available:
              !blocked &&
              (crew.equipment.find((e) => e.id === action.action.id)
                ?.available ??
                crew.crew.find((c) => c.power?.id === action.action.id)?.power
                  ?.available ??
                crew.isolateOverload?.available ??
                false),
          }}
          token={action.token}
          onConfirm={submitAction}
          onCancel={() => setAction(null)}
          fallbackFocus={headingRef}
        />
      )}
      {review && (
        <ConfirmationDialog
          className={review.kind === "setup" ? "setup-review" : ""}
          title={
            review.kind === "setup"
              ? "Reveal starting information"
              : review.kind === "solo"
                ? "Self-Connection"
                : review.kind === "share"
                  ? "Share your circuit"
                  : review.kind === "restart"
                    ? "Start another mission?"
                    : "Confirm connection"
          }
          eyebrow="CREW COMMAND"
          description={
            review.kind === "setup"
              ? `Make blue ${starting?.value} at ${label(review.id)} public to every crewmate.`
              : review.kind === "solo"
                ? `${group?.explanation} Circuits to clear: ${group?.circuitIds.map(label).join(", ")}`
                : review.kind === "share"
                  ? `Make ${label(review.id)} public. Costs one energy and your turn.`
                  : review.kind === "restart"
                    ? "Redeal the circuits, reset equipment and powers, and rotate the Captain."
                    : `Connect your ${publicSource} at ${label(source?.id ?? "")} to ${label(target?.id ?? "")}. A match clears both circuits. A mistake damages the ship; red overload can end the mission.`
          }
          busy={false}
          confirmDisabled={
            blocked ||
            (review.kind === "solo"
              ? !group?.eligible || !canAct
              : review.kind === "connect"
                ? !canAct || source?.kind === "red"
                : review.kind === "setup"
                  ? !g.startingInformationChoices.includes(review.id)
                  : false)
          }
          confirmLabel="Confirm"
          onCancel={close}
          fallbackFocus={headingRef}
          onConfirm={async () => {
            if (review.kind === "setup")
              await command({
                type: "startingInformation",
                circuitId: review.id,
              });
            else if (review.kind === "solo")
              await command({ type: "solo", number: review.number });
            else if (review.kind === "share")
              await command({ type: "share", circuitId: review.id });
            else if (review.kind === "restart")
              await command({ type: "restart" });
            else if (source?.value !== undefined && target)
              await command({
                type: "connect",
                ownId: source.id,
                targetId: target.id,
                number: source.value,
              });
            close();
            setOwn("");
          }}
        />
      )}
    </div></CrewReactionContext.Provider>
  );
}
