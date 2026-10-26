import type { MissionView } from "../types/presentation";
import { CircuitBadgeIcon } from "./CircuitBadge";
/** Engine public positions only. These badges never assign identities to hidden slots. */
export function NumberTracker({
  tracker,
}: {
  tracker: MissionView["tracker"];
}) {
  if (!tracker) return null;
  return (
    <section className="number-tracker" aria-label="Circuit number tracker">
      <div className="tracker-heading">
        <span className="eyebrow">CIRCUIT TRACKER</span>
        <span>RESTORED CIRCUITS</span>
      </div>
      <div className="number-register">
        {tracker.numbers.map((n) => {
          const badges = tracker.specials.flatMap((s) => {
            const positions = (s.positions ?? []).filter(
              (p) => Math.floor(p.sortValue) === n.number,
            );
            return positions.length
              ? [
                  {
                    type: s.type,
                    certainty: positions.some(
                      (p) => p.certainty === "confirmed",
                    )
                      ? "confirmed"
                      : "possible",
                    label: s.type === "yellow" ? `${n.number}A` : `${n.number}`,
                    complete: s.complete,
                  },
                ]
              : [];
          });
          return (
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
              {badges.map((b, i) => {
                const label = `${b.certainty === "possible" ? "Possible" : "Confirmed"} ${b.type === "yellow" ? "bridge circuit" : "overload circuit"} ${b.label}${b.complete ? ", cleared" : ""}`;
                return (
                  <span
                    key={`${b.type}-${b.label}`}
                    className={`tracker-badge badge-${b.type} badge-${i % 2 === 0 ? "end" : "start"} ${b.certainty === "possible" ? "badge-possible" : "badge-confirmed"}`}
                    role="img"
                    tabIndex={0}
                    aria-label={label}
                    title={label}
                    data-certainty={b.certainty}
                    data-label={b.label}
                  >
                    <CircuitBadgeIcon kind={b.type} />
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
