import { useState, type RefObject } from "react";
import type { MissionView, MissionAdapter } from "../types/presentation";
import { ConfirmationDialog } from "./ConfirmationDialog";
export function StartingInformation({
  state,
  adapter,
  headingRef,
}: {
  state: MissionView;
  adapter: MissionAdapter;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(false);
  const setup = state.crewFeatures?.startingInformation;
  if (!setup?.pending) return null;
  const selectedSlot = state.ownCircuits.find((s) => s.id === selected);
  return (
    <section
      className="starting-information"
      aria-label="Starting information selection"
    >
      <span className="eyebrow">BEFORE WE CONNECT</span>
      <h2>Choose your starting information</h2>
      <p>{setup.description}</p>
      <div className="starting-options">
        {setup.availableIds.map((id) => {
          const slot = state.ownCircuits.find((s) => s.id === id);
          if (!slot) return null;
          return (
            <button
              key={id}
              aria-pressed={selected === id}
              className={`starting-option ${selected === id ? "chosen" : ""}`}
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
      {confirming && selectedSlot && (
        <ConfirmationDialog
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
    </section>
  );
}
