import { useEffect, useRef, useState, type CSSProperties } from "react";
import healthy from "../assets/gameplay/ship-healthy.webp";
import damaged from "../assets/gameplay/ship-damaged.webp";
import "../styles/ship-monitor.css";

const zones = [
  { id: "cockpit", threshold: 100, mask: "ellipse 25% 38% at 25% 50%" },
  { id: "upper-engine", threshold: 80, mask: "ellipse 28% 24% at 58% 17%" },
  { id: "central-hull", threshold: 60, mask: "ellipse 25% 39% at 50% 50%" },
  { id: "lower-engine", threshold: 40, mask: "ellipse 28% 24% at 58% 83%" },
  { id: "rear-systems", threshold: 20, mask: "ellipse 27% 43% at 82% 49%" },
] as const;

/** Display-only projection of the supplied authoritative hull. Never writes state. */
export function shipDamageView(hull: number, maxHull = 100, defeated = false) {
  const percent = Number.isFinite(hull) && maxHull > 0
    ? Math.max(0, Math.min(100, hull / maxHull * 100)) : 0;
  const visibleHull = defeated ? 0 : percent;
  const condition = visibleHull === 0 ? "destroyed"
    : visibleHull < 20 ? "critical" : visibleHull < 40 ? "heavy"
    : visibleHull < 60 ? "moderate" : visibleHull < 80 ? "light"
    : visibleHull < 100 ? "minor" : "healthy";
  const label = defeated && percent > 0 ? "Systems offline"
    : ({healthy:"Ship healthy",minor:"Minor damage",light:"Light damage",
      moderate:"Moderate damage",heavy:"Heavy damage · smoke detected",
      critical:"Critical hull",destroyed:"Hull lost · systems offline"})[condition];
  return { percent, visibleHull, condition, label,
    zones: zones.map(z => ({...z, strength: Math.max(0, Math.min(1, (z.threshold-visibleHull)/20))})) };
}
export type ShipHullProps = { hull: number; maxHull?: number; defeated?: boolean };

export function ShipStatusHeading(props: ShipHullProps) {
  const {percent} = shipDamageView(props.hull, props.maxHull, props.defeated);
  return <header className="ship-monitor-heading"><span>SHIP STATUS</span><strong>{Math.round(percent)}%</strong><small>HULL INTEGRITY</small></header>;
}
export function HullHealthBar(props: ShipHullProps) {
  const {percent} = shipDamageView(props.hull, props.maxHull, props.defeated);
  return <progress className="hull-health-bar" value={percent} max={100} aria-label="Hull integrity" />;
}
export function ShipCondition(props: ShipHullProps) {
  const {label, condition} = shipDamageView(props.hull, props.maxHull, props.defeated);
  return <p className={`ship-condition condition-${condition}`} aria-live="polite">{label}</p>;
}

export function StatusShip(props: ShipHullProps) {
  const view = shipDamageView(props.hull, props.maxHull, props.defeated);
  const previous = useRef(view.percent);
  const [change, setChange] = useState<"damage"|"repair"|"idle">("idle");
  useEffect(() => {
    const before = previous.current; previous.current = view.percent;
    if (before === view.percent) return;
    setChange(view.percent < before ? "damage" : "repair");
    const timer = setTimeout(() => setChange("idle"), 850);
    return () => clearTimeout(timer);
  }, [view.percent]);
  return <div className={`ship-damage-visual condition-${view.condition}`} role="img"
    aria-label={`Spaceship: ${view.label}; ${Math.round(view.percent)}% hull`}
    data-hull={view.percent} data-condition={view.condition} data-change={change}>
    <img className="ship-damage-base" src={healthy} width={960} height={560} alt="" decoding="async" draggable={false}/>
    {view.zones.map(zone => <img key={zone.id} className="ship-damage-zone" src={damaged}
      width={960} height={560} alt="" decoding="async" draggable={false}
      data-zone={zone.id} data-strength={zone.strength}
      style={{opacity:zone.strength, "--damage-mask":`radial-gradient(${zone.mask}, #000 48%, transparent 100%)`} as CSSProperties}/>)}
    <img className="ship-damage-full" src={damaged} width={960} height={560} alt="" decoding="async" draggable={false}
      style={{opacity:view.visibleHull === 0 ? 1 : 0}}/>
    <span key={view.percent} className={`ship-change-glow change-${change}`} aria-hidden="true"/>
    <span className="ship-critical-glow" aria-hidden="true"/>
    {(view.condition === "moderate" || view.condition === "heavy" || view.condition === "critical") &&
      <span className="monitor-sparks" aria-hidden="true"><i/><i/></span>}
  </div>;
}
