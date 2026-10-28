/// <reference types="vite/client" />
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import "../styles/title-screen.css";

// Only supplied, approved exports belong in this directory. Missing art is never
// replaced with generated lookalikes or low-resolution Canva thumbnails.
const exports = import.meta.glob<string>("../assets/title/*.{webp,png}", {
  eager: true, query: "?url", import: "default",
});
function asset(name: string) {
  return exports[`../assets/title/${name}.webp`] ?? exports[`../assets/title/${name}.png`];
}
const logo = asset("starship-panic-logo");
const ship = asset("approved-ship");
const pinkPlanet = asset("planet-pink");
const purplePlanet = asset("planet-purple");
const flyButton = asset("lets-fly-button");
const chibiMuncher = asset("space-muncher-chibi");
const munchers = chibiMuncher ? Array<string>(8).fill(chibiMuncher) : [];
// Each creature owns its route, entrance, bank and hover cadence. The parent
// never moves the swarm as a single object. Art can be replaced independently.
const routes = [
  [2, 6, -650, -280, 30, 18, 195, 130, 95, -45, 1.08],
  [19, 55, -850, 240, 145, -190, -40, 35, 230, -95, .84],
  [40, 17, 580, -480, -60, 90, -160, 205, 80, 40, 1.2],
  [5, 76, -540, 360, 105, -65, 235, -210, 190, -70, .73],
  [61, 39, 700, 100, -190, -115, -50, 90, 55, -85, .95],
  [32, 84, -780, 490, -95, -180, 110, -55, 210, -230, 1.02],
  [70, 1, 500, -520, -185, 145, -65, 270, 30, 95, .69],
  [48, 63, 760, 330, -130, 30, 85, -160, 165, -125, .88],
];
function routeStyle(i: number): CSSProperties {
  const [x, y, entryX, entryY, ax, ay, bx, by, cx, cy, scale] = routes[i % routes.length];
  return { "--i": i, "--x": `${x}%`, "--y": `${y}%`, "--entry-x": `${entryX}%`, "--entry-y": `${entryY}%`,
    "--ax": `${ax}%`, "--ay": `${ay}%`, "--bx": `${bx}%`, "--by": `${by}%`, "--cx": `${cx}%`, "--cy": `${cy}%`,
    "--size": scale, "--arrival": `${i * 85}ms`, "--hover": `${.8 + i * .13}s`, "--bank": `${(i % 2 ? -1 : 1) * (12 + i * 2)}deg` } as CSSProperties;
}

export function TitleScreen({ headingRef, onFly, onHelp, onSettings, reduced }: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onFly: () => void;
  onHelp: () => void;
  onSettings: () => void;
  reduced: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return (
    <section className={`panic-title ${paused || hidden ? "flight-paused" : ""}`} aria-labelledby="panic-heading">
      <div className="flight-scene" aria-hidden="true">
        <div className="flight-stars stars-distant" />
        <div className="flight-stars stars-near" />
        <div className="hyperspeed-streaks" />
        {pinkPlanet && <img className="pastel-planet planet-peach" src={pinkPlanet} alt="" width="439" height="440" draggable="false" />}
        {purplePlanet && <img className="pastel-planet planet-lilac" src={purplePlanet} alt="" width="520" height="350" draggable="false" />}
        <div className="flight-orbit" />
        {ship && <div className="flight-ship"><div className="escape-trail" /><div className="engine-flare" /><img src={ship} alt="" width="720" height="480" draggable="false" />
          <div className="escape-sparkles">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ "--i": i } as CSSProperties}>✦</span>)}</div>
        </div>}
        {munchers.length > 0 && <div className="muncher-swarm">
          {munchers.map((url, i) => <div className="flying-muncher" key={i} style={routeStyle(i)}>
            <img src={url} alt="" width="320" height="320" draggable="false" />
          </div>)}
        </div>}
      </div>
      <div className="panic-copy">
        <h1 id="panic-heading" ref={headingRef} tabIndex={-1} className={logo ? "has-approved-logo" : ""}>
          {logo ? <><span className="title-sr-only">Starship Panic!</span><img src={logo} alt="" width="1000" height="500" fetchPriority="high" /></> : <>Starship <em>Panic!</em></>}
        </h1>
        <button className={`primary panic-fly ${flyButton ? "art-button" : ""}`} onClick={onFly}>
          {flyButton && <img src={flyButton} alt="" draggable="false" />}
          <span className="fly-label">Let's Fly!</span>
        </button>
        <nav className="panic-links" aria-label="Start screen options">
          <button className="text-button" onClick={onHelp}>How to Play</button>
          <span aria-hidden="true">✦</span>
          <button className="text-button" onClick={onSettings}>Settings</button>
        </nav>
      </div>
      <button className="flight-toggle text-button" aria-pressed={paused} disabled={reduced} onClick={() => setPaused(!paused)}>
        {reduced ? "Animations reduced" : paused ? "Resume animation" : "Pause animation"}
      </button>
    </section>
  );
}
