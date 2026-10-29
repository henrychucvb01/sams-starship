import { CrewCommunication, CaptainArt } from "./TerminalArt";
import type { ReactNode } from "react";
import type {
  CrewActionView,
  CrewCardView,
  EquipmentView,
} from "../types/crewPresentation";
import { InfoPopover } from "./InfoPopover";
export function CommandEmblem() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="m16 3 11 6v11l-11 9L5 20V9Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m16 8 6 12-6-3-6 3Z" fill="currentColor" />
      <path d="M10 24h12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
export function SupportIcon({ kind }: { kind: "power" | "equipment" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "power" ? (
        <path
          d="m13 2-8 12h6l-1 8 9-13h-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M5 7h14v14H5zM9 7V3h6v4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9 14h6m-3-3v6" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}
export function CaptainBadge() {
  return (
    <InfoPopover
      label="Captain — Leads the crew and takes the first turn."
      className="captain-badge"
      icon={<CaptainArt />}
    >
      <strong>Captain</strong>
      <p>Leads the crew and takes the first turn.</p>
    </InfoPopover>
  );
}
function ActionExplanation({ action }: { action: CrewActionView }) {
  return (
    <>
      <strong>{action.name}</strong>
      <p>{action.description}</p>
      <p>
        <b>Requirements:</b> {action.requirements}
      </p>
      <p>
        {action.remaining} {action.remaining === 1 ? "use" : "uses"} remaining
        {action.used ? " · Used" : ""}
      </p>
      {action.reason && <p>{action.reason}</p>}
    </>
  );
}
/** Fits into the existing rack header rather than adding a second dashboard. */
export function CharacterCard({
  crew,
  captain,
  portrait,
  detail,
  onAction,
  canAct,
  self,
  controlLabel,
}: {
  self?: boolean;
  controlLabel?: string;
  crew: CrewCardView;
  captain: boolean;
  portrait: ReactNode;
  detail: ReactNode;
  onAction: (action: CrewActionView) => void;
  canAct: boolean;
}) {
  const power = crew.power;
  const isSelf = self ?? crew.id === "sam";
  return (
    <div className="rack-label character-card">
      <CrewCommunication portrait={portrait} id={crew.id} name={crew.name}/>
      <div className="character-name">
        <h2>
          {crew.name} {captain && <CaptainBadge />}
          <small>{controlLabel ?? (isSelf ? "YOU" : "AI CREWMATE")}</small>
        </h2>
        <p>{detail}</p>
      </div>
      {power && (
        <div className={`personal-power ${power.used ? "power-used" : ""}`}>
          <InfoPopover
            label={`${crew.name}: ${power.name} information`}
            icon={<SupportIcon kind="power" />}
          >
            <ActionExplanation action={power} />
          </InfoPopover>
          <span>
            <strong>{power.name}</strong>
            <small>
              {power.used ? "Used" : power.available ? "Ready" : "Unavailable"}{" "}
              · {power.remaining} left
            </small>
          </span>
          {isSelf && (
            <button
              className="secondary compact"
              disabled={!canAct || !power.available || power.used}
              onClick={() => onAction(power)}
            >
              Use power
            </button>
          )}
        </div>
      )}
      <span className="rack-direction">LOW → HIGH</span>
    </div>
  );
}
export function EquipmentCards({
  equipment,
  onAction,
  canAct,
}: {
  equipment: EquipmentView[];
  onAction: (action: CrewActionView) => void;
  canAct: boolean;
}) {
  if (!equipment.length) return null;
  return (
    <section className="shared-equipment" aria-label="Shared equipment">
      <div className="equipment-heading">
        <span className="eyebrow">SHARED EQUIPMENT</span>
        <small>FOR THE WHOLE CREW</small>
      </div>
      <div className="equipment-grid">
        {equipment.map((item) => (
          <article
            key={item.id}
            className={`equipment-card equipment-${item.status}`}
          >
            <InfoPopover
              label={`${item.name} equipment information`}
              icon={<SupportIcon kind="equipment" />}
            >
              <ActionExplanation action={item} />
              <p>
                Unlock number {item.unlockNumber}: {Math.min(item.resolved, item.total)}/{item.total}
              </p>
            </InfoPopover>
            <div>
              <h3>{item.name}</h3>
              <p>
                Number {item.unlockNumber} · {Math.min(item.resolved, item.total)}/{item.total}
              </p>
              <small>
                {item.status === "locked" ? (
                  <>
                    <svg
                      className="equipment-lock"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="4"
                        y="8"
                        width="12"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M6 8V6a4 4 0 0 1 8 0v2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>{" "}
                    Locked
                  </>
                ) : item.status === "used" ? (
                  "✓ Used"
                ) : (
                  "Ready"
                )}
              </small>
            </div>
            <button
              className="secondary compact"
              disabled={!canAct || !item.available || item.status !== "ready"}
              onClick={() => onAction(item)}
            >
              Use equipment
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
