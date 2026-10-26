import type { MissionView } from "../types/presentation";
/** Read-only projection of engine tracking data. No counts or completions are derived here. */
export function NumberTracker({
  tracker,
}: {
  tracker: MissionView["tracker"];
}) {
  if (!tracker) return null;
  return (
    <section className="number-tracker" aria-label="Circuit number tracker">
      <div className="tracker-heading">
        <span className="eyebrow">CIRCUIT REGISTER</span>
        <span>BLUE · STANDARD / YELLOW · SPECIAL / RED · DANGER</span>
      </div>
      <div className="number-register">
        {tracker.numbers.map((n) => (
          <div
            key={n.number}
            className={`number-marker ${n.complete ? "number-complete" : ""}`}
            aria-label={`Number ${n.number}: ${n.resolved} of ${n.total} resolved${n.complete ? ", completed" : ""}`}
          >
            <strong>
              {n.number}
              <span>{n.complete ? "✓" : ""}</span>
            </strong>
            <div className="copy-pips" aria-hidden="true">
              {Array.from({ length: n.total }, (_, i) => (
                <i key={i} className={i < n.resolved ? "pip-cleared" : ""} />
              ))}
            </div>
            <small>
              {n.resolved}/{n.total}
            </small>
          </div>
        ))}
      </div>
      {tracker.specials.length > 0 && (
        <div className="special-register">
          {tracker.specials.map((s, i) => (
            <div
              className={`special-marker special-${s.type}`}
              key={`${s.type}-${i}`}
            >
              <strong>
                {s.type === "red" ? "⚠ RED · DANGER" : "◆ YELLOW · SPECIAL"}
              </strong>
              <span>{s.positionLabel}</span>
              <small>
                {s.resolved}/{s.total} resolved{" "}
                {s.complete ? "✓ COMPLETED" : ""}
              </small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
