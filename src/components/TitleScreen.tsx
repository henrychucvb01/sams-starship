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
const munchers = Array.from({ length: 8 }, (_, i) => asset(`space-muncher-${i + 1}`)).filter((url): url is string => !!url);

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
        <div className="pastel-planet planet-peach"><i /><i /></div>
        <div className="pastel-planet planet-lilac"><i /></div>
        <div className="pastel-planet planet-mint" />
        <div className="flight-orbit" />
        {ship && <div className="flight-ship"><div className="escape-trail" /><img src={ship} alt="" width="720" height="480" draggable="false" /></div>}
        {munchers.length > 0 && <div className="muncher-swarm">
          {munchers.map((url, i) => <div className="flying-muncher" key={url} style={{ "--i": i } as CSSProperties}>
            <img src={url} alt="" width="320" height="320" draggable="false" />
          </div>)}
        </div>}
        {ship && <div className="escape-sparkles">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ "--i": i } as CSSProperties}>✦</span>)}</div>}
      </div>
      <div className="panic-copy">
        <h1 id="panic-heading" ref={headingRef} tabIndex={-1} className={logo ? "has-approved-logo" : ""}>
          {logo ? <><span className="title-sr-only">Starship Panic!</span><img src={logo} alt="" width="1000" height="500" fetchPriority="high" /></> : <>Starship <em>Panic!</em></>}
        </h1>
        <button className="primary panic-fly" onClick={onFly}>Let's Fly! <span aria-hidden="true">↗</span></button>
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
