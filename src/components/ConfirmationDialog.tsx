import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
export function ConfirmationDialog({
  title,
  description,
  eyebrow,
  children,
  busy,
  confirmDisabled = false,
  confirmLabel,
  confirmAriaLabel,
  onConfirm,
  onCancel,
  fallbackFocus,
}: {
  title: string;
  description: ReactNode;
  eyebrow: ReactNode;
  children?: ReactNode;
  busy: boolean;
  confirmDisabled?: boolean;
  confirmLabel: string;
  confirmAriaLabel?: string;
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
    if (lock.current || disabled || confirmDisabled) return;
    lock.current = true;
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit action.");
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
        const buttons = Array.from(
          dialog.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled):not([tabindex="-1"]), select:not(:disabled)',
          ),
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
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-description`}>{description}</p>
        {children}
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
            disabled={disabled || confirmDisabled}
            onClick={confirm}
            aria-label={confirmAriaLabel}
          >
            {disabled ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
