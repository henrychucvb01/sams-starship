import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircuitBoard } from "../components/CircuitBoard";
import { Ship, Sam } from "../components/Ship";
import { createEngineAdapter } from "../adapters/engineAdapter";
import type { MissionAdapter } from "../types/presentation";
const missions = [
  [
    "Restore the Lights",
    "Matching numbers",
    "A little spark goes a long way. Reconnect the circuits and light up the ship.",
    "01",
    "✧",
  ],
  [
    "Repair Navigation",
    "Number sequences",
    "Find your way through the stars by putting the signals in order.",
    "02",
    "⌁",
  ],
  [
    "Restart the Engines",
    "Matching numbers",
    "Bring the engines back online. There is a whole galaxy waiting.",
    "03",
    "↟",
  ],
  [
    "Restore Communications",
    "Number sequences",
    "Follow the signals. Bring the crew back together.",
    "04",
    "⌘",
  ],
];
const time = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function usePreference(key: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });
  return [
    value,
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, String(v));
      } catch {
        /* Session preference remains usable. */
      }
    },
  ] as const;
}
export function App({
  adapter: providedAdapter,
}: {
  adapter?: MissionAdapter;
}) {
  const [adapter] = useState(() => providedAdapter ?? createEngineAdapter());
  const engine = useSyncExternalStore(adapter.subscribe, adapter.getSnapshot);
  const state = engine;
  const [screen, setScreen] = useState<"menu" | "missions" | "intro" | "game">(
    "menu",
  );
  const [overlay, setOverlay] = useState<"settings" | "help" | null>(null);
  const [reduced, setReduced] = usePreference("starship-reduced-motion");
  const [difficulty, setDifficulty] = useState("Easy");
  const heading = useRef<HTMLHeadingElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (screen === "game") {
      adapter.activate();
    } else {
      adapter.deactivate();
    }
    return () => adapter.deactivate();
  }, [screen, adapter]);
  useEffect(() => {
    heading.current?.focus();
  }, [screen, state.status]);
  useEffect(() => {
    if (overlay) {
      returnFocus.current = document.activeElement as HTMLElement;
      modal.current?.showModal();
    } else {
      modal.current?.close();
      returnFocus.current?.focus();
    }
  }, [overlay]);
  function start() {
    adapter.restart();
    adapter.activate();
    setScreen("game");
  }
  function menu() {
    setScreen("menu");
  }
  const [resultVisible, setResultVisible] = useState(false);
  useEffect(() => {
    setResultVisible(false);
    if (state.status === "playing") return;
    const timer = setTimeout(() => setResultVisible(true), 1100);
    return () => clearTimeout(timer);
  }, [state.status]);
  const ended =
    screen === "game" && state.status !== "playing" && resultVisible;
  return (
    <div className={`app ${reduced ? "reduce-motion" : ""}`}>
      <div className="stars" aria-hidden="true" />
      <header className="topbar">
        <button
          className="brand text-button"
          onClick={menu}
          aria-label="SLButter home"
        >
          <span className="brand-mark">slb.</span>
          <span>
            SMOOTH LIKE BUTTER
            <span className="brand-sub">A SMALL SHIP. A BIG ADVENTURE.</span>
          </span>
        </button>
        <div className="top-actions">
          <button
            className="icon-button"
            onClick={() => setOverlay("help")}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            className="icon-button"
            onClick={() => setOverlay("settings")}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>
      <main>
        {screen === "menu" && (
          <section className="title-screen">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> EMERGENCY TRANSMISSION 001
              </div>
              <h1 ref={heading} tabIndex={-1}>
                SAM'S
                <br />
                <em>STARSHIP</em>
                <span className="title-spark">✦</span>
              </h1>
              <p className="subtitle">A Smooth Like Butter Adventure</p>
              <p className="intro-copy">
                Lost power. Scattered crew.
                <br />
                One little ship counting on you.
              </p>
              <button
                className="primary play"
                onClick={() => setScreen("missions")}
              >
                Play Solo <span>↗</span>
              </button>
              <div className="future-modes">
                <button disabled>
                  Private Room <small>COMING SOON</small>
                </button>
                <button disabled>
                  Public Multiplayer <small>COMING SOON</small>
                </button>
              </div>
              <button
                className="text-button help-link"
                onClick={() => setOverlay("help")}
              >
                First time aboard? How to play <span>→</span>
              </button>
            </div>
            <div className="hero-art">
              <div className="planet" />
              <span className="floating-label">YOUR CREW NEEDS YOU</span>
              <Ship />
              <span className="art-note">
                Environment concept · Sam artwork pending
              </span>
            </div>
            <div className="hero-foot">
              <span>COZY SPACE. CLEVER CONNECTIONS.</span>
              <span>
                SOLO PROTOTYPE <i>✧</i> SLBUTTER
              </span>
            </div>
          </section>
        )}
        {screen === "missions" && (
          <section className="page mission-page">
            <button className="text-button back" onClick={menu}>
              ← Back to the ship
            </button>
            <div className="eyebrow">MISSION CONTROL</div>
            <h1 ref={heading} tabIndex={-1}>
              Every connection
              <br />
              <em>brings us closer.</em>
            </h1>
            <p className="muted">
              Choose a system to restore. Your crew is standing by.
            </p>
            <div className="mission-grid">
              {missions.map(([name, type, description, number, icon], i) => (
                <article
                  className={`mission-card ${i ? "unavailable" : "available"}`}
                  key={name}
                >
                  <div className="mission-top">
                    <span className="mission-icon">{icon}</span>
                    <span>MISSION {number}</span>
                  </div>
                  <h2>{name}</h2>
                  <span className="tag">{type}</span>
                  <p>{description}</p>
                  <label>
                    Difficulty
                    <select
                      value={i ? "Easy" : difficulty}
                      disabled={i !== 0}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </label>
                  <small className="availability">
                    {i === 0 && difficulty === "Easy"
                      ? "Ready for launch"
                      : "Coming Soon"}
                  </small>
                  <button
                    className={i ? "secondary" : "primary"}
                    disabled={i !== 0 || difficulty !== "Easy"}
                    onClick={() => setScreen("intro")}
                  >
                    {i === 0 && difficulty === "Easy"
                      ? "Start mission"
                      : "Coming Soon"}{" "}
                    <span>{i === 0 ? "→" : "⌑"}</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        {screen === "intro" && (
          <section className="intro-screen page">
            <div className="eyebrow">RESTORE THE LIGHTS · EASY</div>
            <Ship damaged />
            <h1 ref={heading} tabIndex={-1}>
              A small ship.
              <br />
              <em>A very big problem.</em>
            </h1>
            <p>
              The ship has been attacked. The lights are out, and the crew is
              sealed in separate rooms.
            </p>
            <p>
              Emergency terminals have just enough power for a few clues.
              Reconnect the damaged circuits before time or hull integrity runs
              out.
            </p>
            <button className="primary" onClick={start}>
              Begin Mission <span>→</span>
            </button>
            <button className="text-button help-link" onClick={start}>
              Skip introduction
            </button>
          </section>
        )}
        {screen === "game" && !ended && (
          <CircuitBoard
            state={state}
            adapter={adapter}
            onLeave={() => setScreen("missions")}
            headingRef={heading}
          />
        )}
        {ended && (
          <section className={`page result-screen event-${state.status}`}>
            <div className="eyebrow">
              {state.status === "victory"
                ? "TRANSMISSION RECEIVED · ALL CLEAR"
                : "EMERGENCY TRANSMISSION · SIGNAL LOST"}
            </div>
            <Sam
              expression={state.status === "victory" ? "celebrating" : "sad"}
            />
            <h1 ref={heading} tabIndex={-1}>
              {state.status === "victory"
                ? "Mission Complete"
                : "Mission Failed"}
              <br />
              <em>
                {state.status === "victory"
                  ? "Smooth flying, captain."
                  : "We go again, together."}
              </em>
            </h1>
            <p>
              {state.status === "victory"
                ? "The lights are back. The crew is safe. The stars are waiting."
                : (state.reason ??
                  (state.hull === 0
                    ? "Hull integrity reached zero."
                    : state.secondsRemaining === 0
                      ? "The mission clock ran out."
                      : "The mission ended before all circuits were restored."))}
            </p>
            <div className="result-stats">
              <div>
                <strong>
                  {state.restored}/{state.required}
                </strong>
                <span>Circuits restored</span>
              </div>
              <div>
                <strong>{state.hull}%</strong>
                <span>Hull remaining</span>
              </div>
              <div>
                <strong>{time(state.elapsedSeconds)}</strong>
                <span>Mission time</span>
              </div>
            </div>
            <button className="primary" onClick={start}>
              {state.status === "victory" ? "Play Again" : "Try Again"}{" "}
              <span>↻</span>
            </button>
            <button className="text-button help-link" onClick={menu}>
              Return to Menu
            </button>
          </section>
        )}
      </main>
      <footer>
        <span>SLBUTTER ORIGINAL</span>
        <span>Made for a little everyday adventure. ✦</span>
      </footer>
      <dialog
        ref={modal}
        onCancel={() => setOverlay(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOverlay(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          <button
            className="icon-button close"
            aria-label="Close panel"
            onClick={() => setOverlay(null)}
          >
            ×
          </button>
          <div className="eyebrow">WELCOME ABOARD</div>
          <h2 id="dialog-title">
            {overlay === "settings"
              ? "Make yourself at home."
              : "Small clues. Big connections."}
          </h2>
          {overlay === "settings" ? (
            <>
              <label className="setting-row">
                <span>
                  Reduce animations<small>Keep the stars and ship still.</small>
                </span>
                <input
                  type="checkbox"
                  checked={reduced}
                  onChange={(e) => setReduced(e.target.checked)}
                />
              </label>
              <div className="setting-row">
                <span>
                  Sound effects<small>Unavailable in this prototype</small>
                </span>
                <button disabled className="secondary compact">
                  Coming Soon
                </button>
              </div>
              <button className="secondary" onClick={() => setOverlay("help")}>
                How to Play →
              </button>
            </>
          ) : (
            <>
              <ol className="instructions">
                <li>
                  There are four copies of each number, 1–12. Every rack runs
                  from low to high, and cleared slots stay in position.
                </li>
                <li>
                  On Sam’s turn, select one of his numbers and a crew tile.
                  Review the prefilled declaration, then press Connect. You can
                  cancel or change your selection first.
                </li>
                <li>
                  A correct connection clears both tiles. A wrong declaration
                  reveals the target and triggers an enemy attack that damages
                  the shared ship.
                </li>
                <li>
                  Share one of Sam’s numbers for one energy and a turn. Sam’s
                  Toolkit offers a limited Hint and a one-hit Emergency Shield;
                  each has its own finite charge. Scanners unlock in later
                  missions.
                </li>
                <li>
                  For Self-Match, select two equal tiles in Sam’s row and press
                  Connect Pair. The engine allows this only when Sam holds every
                  remaining copy; if four remain, all four clear together.
                  Review mistakes and tool clues in the deduction log, or pass
                  your turn.
                </li>
                <li>
                  Restore all 48 circuits before time or hull runs out. Correct
                  connections replenish communication energy.
                </li>
              </ol>
              <p className="muted">
                Number sequence missions are coming later. Each mission uses one
                puzzle type.
              </p>
              <button className="primary" onClick={() => setOverlay(null)}>
                Got it, captain <span>✓</span>
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
