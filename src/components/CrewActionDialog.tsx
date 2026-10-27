import { useState, type RefObject } from "react";
import type { CrewActionView } from "../types/crewPresentation";
import { ConfirmationDialog } from "./ConfirmationDialog";
/** Targets are redacted, labeled options supplied by the adapter, never inferred here. */
export function CrewActionDialog({
  action,
  token,
  onConfirm,
  onCancel,
  fallbackFocus,
}: {
  action: CrewActionView;
  token: string;
  onConfirm: (
    id: string,
    choices: Record<string, string[]>,
    token: string,
  ) => void | Promise<void>;
  onCancel: () => void;
  fallbackFocus: RefObject<HTMLHeadingElement | null>;
}) {
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const ready = action.targets.every(
    (t) =>
      (choices[t.id] ?? []).filter(Boolean).length === t.count &&
      new Set(choices[t.id]).size === t.count,
  );
  return (
    <ConfirmationDialog
      title={action.name}
      eyebrow="CREW SUPPORT"
      description={action.description}
      busy={false}
      confirmDisabled={!action.available || !ready}
      confirmLabel="Confirm"
      onCancel={onCancel}
      fallbackFocus={fallbackFocus}
      onConfirm={() => onConfirm(action.id, choices, token)}
    >
      <p className="dialog-match-note">{action.requirements}</p>
      {action.targets.map((target) => (
        <fieldset className="tool-modal-targets" key={target.id}>
          <legend>{target.label}</legend>
          {Array.from({ length: target.count }, (_, i) => (
            <label key={i}>
              {target.label} {target.count > 1 ? i + 1 : ""}
              <select
                aria-label={`${target.label}${target.count > 1 ? ` ${i + 1}` : ""}`}
                value={choices[target.id]?.[i] ?? ""}
                onChange={(e) =>
                  setChoices((previous) => {
                    const next = [
                      ...(previous[target.id] ?? Array(target.count).fill("")),
                    ];
                    next[i] = e.target.value;
                    return { ...previous, [target.id]: next };
                  })
                }
              >
                <option value="">Choose…</option>
                {target.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      ))}
      {action.reason && <p>{action.reason}</p>}
    </ConfirmationDialog>
  );
}
