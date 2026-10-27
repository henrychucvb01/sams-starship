import type { RefObject } from "react";
import type { Slot } from "../types/presentation";
import { ConfirmationDialog } from "./ConfirmationDialog";
type Source = Slot & { value: number };
export function ConnectionDialog({
  source,
  target,
  targetName,
  targetPosition,
  selfMatch,
  explanation,
  busy,
  onConfirm,
  onCancel,
  fallbackFocus,
}: {
  source: Source;
  target: Slot & { value?: number };
  targetName: string;
  targetPosition: number;
  selfMatch: boolean;
  explanation?: string;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  fallbackFocus: RefObject<HTMLHeadingElement | null>;
}) {
  const display =
    source.type === "yellow"
      ? `${Math.floor(source.value)}A`
      : String(source.value);
  return (
    <ConfirmationDialog
      title="Are you sure?"
      eyebrow="CIRCUIT CONNECTION"
      description={
        <>
          Connect Sam’s <strong>{display}</strong> to{" "}
          <strong>{targetName}</strong>, slot <strong>{targetPosition}</strong>?
        </>
      }
      busy={busy}
      confirmLabel="Connect"
      confirmAriaLabel={selfMatch ? "Connect Pair" : "Connect circuits"}
      onConfirm={onConfirm}
      onCancel={onCancel}
      fallbackFocus={fallbackFocus}
    >
      <div className="connection-preview">
        <div className="preview-endpoint">
          <span>Sam</span>
          <div className={`preview-circuit preview-${source.type ?? "blue"}`}>
            <input
              aria-label="Declared number"
              readOnly
              tabIndex={-1}
              value={display}
            />
            <small>YOUR CIRCUIT</small>
          </div>
        </div>
        <svg
          className="preview-arrow"
          viewBox="0 0 48 24"
          fill="none"
          aria-label="Connects to"
          role="img"
        >
          <path
            d="M4 12h37M32 4l9 8-9 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="preview-endpoint">
          <span>
            {targetName} · slot {targetPosition}
          </span>
          <div
            className={`preview-circuit preview-${selfMatch ? (target.type ?? "blue") : "hidden"}`}
          >
            <strong>
              {selfMatch
                ? target.type === "yellow"
                  ? `${Math.floor(target.value!)}A`
                  : target.value
                : "?"}
            </strong>
            <small>{selfMatch ? "YOUR CIRCUIT" : "CREW CIRCUIT"}</small>
          </div>
        </div>
      </div>
      {selfMatch && explanation && (
        <p className="dialog-match-note">{explanation}</p>
      )}
      {target.type === "red" && (
        <p className="dialog-match-note">
          Known overload circuit. This connection is dangerous.
        </p>
      )}
    </ConfirmationDialog>
  );
}
