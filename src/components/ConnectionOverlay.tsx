import type { MissionView } from "../types/presentation";
export type ConnectionScene = {
  phase: "confirming" | "confirmed" | "wire-grab" | "plugging" | "result";
  circuitIds?: string[];
  ownId?: string;
  targetId?: string;
  outcome?: NonNullable<MissionView["effects"]>[number]["kind"];
  eventId?: number;
};
/** Presentation extension point for future robot/wire/terminal assets. No engine access. */
export function ConnectionOverlay({
  scene,
}: {
  scene: ConnectionScene | null;
}) {
  if (!scene || scene.phase !== "result") return null;
  return (
    <div
      className={`maintenance-overlay maintenance-${scene.outcome}`}
      data-scene={scene.phase}
      data-result={scene.outcome}
      data-event={scene.eventId}
      data-circuit-ids={scene.circuitIds?.join(",")}
      aria-hidden="true"
    >
      <span className="maintenance-terminal">
        {scene.outcome === "success"
          ? "ϟ"
          : scene.outcome === "critical"
            ? "⚠"
            : "⌁"}
      </span>
      <span>
        {scene.outcome === "isolate"
          ? "OVERLOAD SAFELY ISOLATED"
          : scene.outcome === "success"
            ? "TERMINAL CONNECTED"
            : scene.outcome === "critical"
              ? "CRITICAL CROSS-WIRE"
              : "TERMINAL RESPONSE"}
      </span>
    </div>
  );
}
