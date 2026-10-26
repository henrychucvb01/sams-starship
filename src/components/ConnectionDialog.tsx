import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { Slot } from "../types/presentation";
type Source = Slot & { value: number };
/** Native top-layer modal. Only the explicit Connect button invokes onConfirm. */
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
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    connectButton = useRef<HTMLButtonElement>(null),
    lock = useRef(false);
  const [submitting, setSubmitting] = useState(false),
    [error, setError] = useState("");
  const id = useId();
  const disabled = busy || submitting;
  const display =
    source.type === "yellow"
      ? `${Math.floor(source.value)}A`
      : String(source.value);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current!;
    const priorOverflow = document.body.style.overflow;
    const priorPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    lock.current = false;
    node.showModal();
    document.body.style.overflow = "hidden";
    if (gap > 0)
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
    cancel.current?.focus();
    return () => {
      node.close();
      document.body.style.overflow = priorOverflow;
      document.body.style.paddingRight = priorPadding;
      if (previous?.isConnected && !previous.matches(":disabled"))
        previous.focus();
      else fallbackFocus.current?.focus();
    };
  }, []);
  async function confirm() {
    if (lock.current || disabled) return;
    lock.current = true;
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit connection.");
      lock.current = false;
      setSubmitting(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="connection-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={disabled}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const buttons = [cancel.current, connectButton.current].filter(
          (b): b is HTMLButtonElement => !!b && !b.disabled,
        );
        if (!buttons.length) {
          e.preventDefault();
          return;
        }
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!disabled) onCancel();
      }}
    >
      <div className="connection-dialog-content">
        <span className="eyebrow">CIRCUIT CONNECTION</span>
        <h2 id={`${id}-title`}>Are you sure?</h2>
        <p id={`${id}-description`}>
          Connect Sam’s <strong>{display}</strong> to{" "}
          <strong>{targetName}</strong>, slot <strong>{targetPosition}</strong>?
        </p>
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
        {error && <p role="alert">{error}</p>}
        <div className="connection-dialog-actions">
          <button
            ref={cancel}
            className="secondary"
            disabled={disabled}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            ref={connectButton}
            className="primary"
            disabled={disabled}
            onClick={confirm}
            aria-label={selfMatch ? "Connect Pair" : "Connect circuits"}
          >
            {disabled ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
