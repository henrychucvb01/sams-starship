import type { ToolId, ToolView } from "../types/presentation";
export const descriptions: Record<ToolId, string> = {
  scanner: "Compare a hidden circuit against your chosen threshold.",
  "dual-scanner": "Test two hidden circuits against one of Sam’s numbers.",
  shield: "Absorb the next incorrect connection without losing hull.",
  hint: "Ask Sam for one limited deduction clue.",
};
export const icons: Record<ToolId, string> = {
  scanner: "⌁",
  "dual-scanner": "⌘",
  shield: "⬡",
  hint: "✧",
};
export const toolCatalog: ToolView[] = [
  {
    id: "scanner",
    name: "Circuit Scanner",
    remaining: 0,
    available: false,
    reason: "Locked until a later mission",
  },
  {
    id: "dual-scanner",
    name: "Dual Scanner",
    remaining: 0,
    available: false,
    reason: "Locked until a later mission",
  },
  {
    id: "shield",
    name: "Emergency Shield",
    remaining: 0,
    available: false,
    reason: "Awaiting engine configuration",
  },
  {
    id: "hint",
    name: "Sam’s Hint",
    remaining: 0,
    available: false,
    reason: "Awaiting engine configuration",
  },
];
export function Toolkit({
  tools,
  selected,
  onSelect,
  canAct,
}: {
  tools?: ToolView[];
  selected: ToolId | null;
  onSelect: (id: ToolId) => void;
  canAct: boolean;
}) {
  return (
    <details className="toolkit" open>
      <summary>
        <span>Sam’s Toolkit</span>
        <small>TOOLS & SUPPORT</small>
      </summary>
      <div className="tool-grid">
        {(tools ?? toolCatalog).map((t) => (
          <button
            key={t.id}
            className={`tool-card ${selected === t.id ? "tool-selected" : ""}`}
            aria-pressed={selected === t.id}
            disabled={!canAct || !t.available || t.remaining <= 0}
            onClick={() => onSelect(t.id)}
          >
            <span className="tool-icon" aria-hidden="true">
              {icons[t.id]}
            </span>
            <span>
              <strong>{t.name}</strong>
              <small>
                {t.remaining} {t.remaining === 1 ? "use" : "uses"} remaining ·{" "}
                {t.reason ?? (t.available ? "Ready" : "Wait for Sam’s turn")}
              </small>

              <span className="tool-description">{descriptions[t.id]}</span>
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}
