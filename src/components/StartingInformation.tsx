import { SetupPopup } from "./SetupPopup";
import { useEffect, useState, type RefObject } from "react";
import type { MissionView, MissionAdapter } from "../types/presentation";
import { ConfirmationDialog } from "./ConfirmationDialog";
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
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(false);
  const setup = state.crewFeatures?.startingInformation;
  useEffect(()=>{if(setup?.pending){setSelected("");setConfirming(false);}},[setup?.pending]);
  if (!setup?.pending) return null;
  const selectedSlot = state.ownCircuits.find((s) => s.id === selected);
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
              aria-pressed={selected === id}
              className={`starting-option circuit-blue ${selected === id ? "chosen" : ""}`}
              onClick={() => setSelected(id)}
              aria-label={`Share starting number ${slot.value}, slot ${state.ownCircuits.indexOf(slot) + 1}`}
            >
              <strong>{slot.value}</strong>
              <small>Slot {state.ownCircuits.indexOf(slot) + 1}</small>
            </button>
          );
        })}
      </div>
      <p aria-live="polite">
        {selectedSlot
          ? `Number ${selectedSlot.value} will become visible to the whole crew.`
          : "Choose one of your blue circuits. Nothing is revealed until you confirm."}
      </p>
      <button
        className="primary"
        disabled={!selectedSlot || !adapter.selectStartingInformation}
        onClick={() => setConfirming(true)}
      >
        Review starting information
      </button>
      {onLeave && <button className="text-button setup-exit" onClick={onLeave}>Leave mission</button>}
      {confirming && selectedSlot && (
        <ConfirmationDialog
          className="setup-review"
          title="Reveal starting information?"
          eyebrow="PUBLIC INFORMATION"
          description={`Reveal Sam’s number ${selectedSlot.value}, slot ${state.ownCircuits.indexOf(selectedSlot) + 1}, to the whole crew. This information remains public.`}
          busy={false}
          confirmLabel="Confirm"
          onCancel={() => setConfirming(false)}
          fallbackFocus={headingRef}
          onConfirm={async () => {
            await adapter.selectStartingInformation?.(
              selected,
              state.crewFeatures!.actionToken,
            );
            setConfirming(false);
          }}
        />
      )}
    </section></SetupPopup>
  );
}
