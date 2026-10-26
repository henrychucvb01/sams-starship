import type { Expression } from "../types/presentation";
export function Sam({ expression = "happy" }: { expression?: Expression }) {
  return (
    <div
      className={`sam-placeholder ${expression}`}
      role="img"
      aria-label={`Sam placeholder, ${expression}`}
    >
      <span>S</span>
      <small>SAM · TEMP ART</small>
    </div>
  );
}
export function Ship({
  restored = 0,
  damaged = false,
}: {
  restored?: number;
  damaged?: boolean;
}) {
  return (
    <div
      className={`ship-scene ${damaged ? "damaged" : ""}`}
      role="img"
      aria-label={`Spaceship interior, ${restored} circuits restored`}
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="ship-body">
        <div className="ship-nose" />
        <div className={`room room-left ${restored ? "lit" : ""}`}>
          <span className="console">▥</span>
          <small>LIFE SUPPORT</small>
        </div>
        <div className="room room-center lit">
          <Sam
            expression={
              damaged ? "worried" : restored === 6 ? "celebrating" : "thinking"
            }
          />
          <small>SAM'S ROOM</small>
        </div>
        <div className={`room room-right ${restored > 1 ? "lit" : ""}`}>
          <span className="console">⌁</span>
          <small>NAVIGATION</small>
        </div>
        <div className="power-line" />
        <div className="thruster t-one" />
        <div className="thruster t-two" />
      </div>
      <div className="scene-caption">
        <i />{" "}
        {damaged
          ? "Emergency power only"
          : restored === 6
            ? "All systems online"
            : "Emergency lights active"}
      </div>
    </div>
  );
}
