import { SetupPopup } from "./SetupPopup";
import { useRef, useState, type RefObject } from "react";
import type { MissionView, MissionAdapter } from "../types/presentation";
export function StartingInformation({
  state,
  adapter,
  headingRef,
  onLeave,
}: {
  onLeave?: () => void;
  state: MissionView;
  adapter: MissionAdapter;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setup = state.crewFeatures?.startingInformation;
  if (!setup?.pending) return null;
  async function reveal(id: string) {
    if (lock.current || !adapter.selectStartingInformation) return;
    lock.current = true; setBusy(true); setError("");
    try { await adapter.selectStartingInformation(id, state.crewFeatures!.actionToken); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to share circuit."); }
    finally { lock.current = false; setBusy(false); }
  }
  return (
    <SetupPopup><section
      className="starting-information"
      aria-label="Starting information selection"
    >
      <span className="eyebrow">BEFORE WE CONNECT</span>
      <p>{setup.description}</p>
      <div className="starting-options">
        {setup.availableIds.map((id) => {
          const slot = state.ownCircuits.find((s) => s.id === id);
          if (!slot) return null;
          return (
            <button
              key={id}
              disabled={busy || !adapter.selectStartingInformation}
              className="starting-option circuit-blue"
              onClick={() => void reveal(id)}
              aria-label={`Share starting number ${slot.value}, slot ${state.ownCircuits.indexOf(slot) + 1}`}
            >
              <strong>{slot.value}</strong>
              <small>Slot {state.ownCircuits.indexOf(slot) + 1}</small>
            </button>
          );
        })}
      </div>
      <p aria-live="polite">{busy ? "Sharing circuit…" : "Tap a blue circuit to share it with your crew and begin."}</p>
      {error && <p role="alert">{error}</p>}
      {onLeave && <button className="text-button setup-exit" disabled={busy} onClick={onLeave}>Leave mission</button>}
    </section></SetupPopup>
  );
}
