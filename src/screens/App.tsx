import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CrewSelection } from "../multiplayer/CrewSelection";
import { RoomScreen, multiplayerOrigin } from "../multiplayer/RoomScreen";
import { hasSavedRoom } from "../multiplayer/roomClient";
import { ModeArtwork, ModeLock } from "../components/ModeArtwork";
import { TitleScreen } from "../components/TitleScreen";
import { CircuitBoard } from "../components/CircuitBoard";
import { Ship, Sam } from "../components/Ship";
import {
  createEngineAdapter,
  TRAINING_MISSIONS,
} from "../adapters/engineAdapter";
import type { MissionAdapter } from "../types/presentation";
const gameModes = [
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
  const [screen, setScreen] = useState<"menu" | "crew" | "multiplayer" | "missions" | "intro" | "game">(
    () => multiplayerOrigin() && hasSavedRoom(multiplayerOrigin()) ? "multiplayer" : "menu",
  );
  const [humanCount, setHumanCount] = useState(2);
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
  function start(replay = false) {
    if (replay) adapter.restart();
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
      {screen !== "menu" && screen !== "crew" && <header className="topbar">
        <button
          className="brand text-button"
          onClick={menu}
          aria-label="Starship Panic! home"
        >
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>
            STARSHIP PANIC!
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
      </header>}
      <main>
        {screen === "menu" && (
          <TitleScreen
            headingRef={heading}
            onFly={() => setScreen("crew")}
            onHelp={() => setOverlay("help")}
            onSettings={() => setOverlay("settings")}
            reduced={reduced}
          />
        )}
        {screen === "crew" && <CrewSelection headingRef={heading} onBack={menu} onSolo={() => setScreen("missions")} onMultiplayer={count => {setHumanCount(count);setScreen("multiplayer");}}/>}
        {screen === "multiplayer" && <RoomScreen playerCount={humanCount} headingRef={heading} onBack={() => setScreen("crew")}/>}
        {screen === "missions" && (
          <section className="page mission-page game-modes-page">
            <button className="text-button back" onClick={menu}>
              ← Back to the ship
            </button>
            <div className="eyebrow">CIRCUIT RESCUE · GAME MODES</div>
            <h1 ref={heading} tabIndex={-1}>
              Choose your <em>game mode.</em>
            </h1>
            <p className="muted">
              A little crew. A big adventure. Choose how you’ll rescue the ship.
            </p>
            <div className="mission-grid">
              {gameModes.map(([name, type, description, number], i) => (
                <article
                  className={`mission-card ${i ? "unavailable" : "available"}`}
                  key={name}
                >
                  <div className="mission-top">
                    <span className="mode-number">MODE {number}</span>
                    <span className={`mode-status ${i === 0 && difficulty === "Easy" ? "mode-ready" : "mode-locked"}`}>
                      {i === 0 && difficulty === "Easy" ? <><span className="mode-ready-dot" /> Ready</> : <><ModeLock /> Coming Soon</>}
                    </span>
                  </div>
                  <ModeArtwork index={i} />
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
                    onClick={() => {
                      adapter.chooseMission?.("lights");
                      setScreen("intro");
                    }}
                  >
                    {i === 0 && difficulty === "Easy"
                      ? "Play mode"
                      : "Coming Soon"}{" "}
                    <span aria-hidden="true">{i === 0 && difficulty === "Easy" ? "→" : <ModeLock />}</span>
                  </button>
                </article>
              ))}
            </div>
            {!!adapter.chooseMission && (
              <section
                className="training-labs"
                aria-label="Special circuit training"
              >
                <div>
                  <span className="eyebrow">CIRCUIT TRAINING · PLAYTEST</span>
                  <p>
                    Practice with special circuits. Yellow tiles share one
                    matching category; red targets can cause immediate mission
                    failure.
                  </p>
                </div>
                {TRAINING_MISSIONS.map((m) => (
                  <button
                    className="secondary"
                    key={m.id}
                    onClick={() => {
                      adapter.chooseMission!(m.id);
                      setScreen("intro");
                    }}
                  >
                    {m.name} ·{" "}
                    {m.id === "circuit-4" ? "Yellow" : "Yellow + Red"}{" "}
                    <span>→</span>
                  </button>
                ))}
              </section>
            )}
          </section>
        )}
        {screen === "intro" && (
          <section className="intro-screen page">
            <div className="eyebrow">
              {state.missionName ?? "Restore the Lights"} · EASY
            </div>
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
            {!!state.tracker?.specials.length && (
              <p className="special-brief">
                Yellow circuits match other yellows, even at different sorting
                positions. Red circuits are dangerous: targeting red causes
                immediate failure. Only isolate your own red circuits after
                every other circuit has been cleared.
              </p>
            )}
            <button className="primary" onClick={() => start()}>
              Begin Mission <span>→</span>
            </button>
            <button className="text-button help-link" onClick={() => start()}>
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
            <button className="primary" onClick={() => start(true)}>
              {state.status === "victory" ? "Play Again" : "Try Again"}{" "}
              <span>↻</span>
            </button>
            <button className="text-button help-link" onClick={menu}>
              Return to Menu
            </button>
          </section>
        )}
      </main>
      {screen !== "menu" && screen !== "crew" && <footer>
        <span>SLBUTTER ORIGINAL</span>
        <span>Made for a little everyday adventure. ✦</span>
      </footer>}
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
                  each has its own finite charge. Shared equipment is separate:
                  resolve two blue copies of its unlock number to make a card
                  ready, then confirm its one use. Pulse Probe, Hull Buffer and
                  Logic Relay can be used on any turn.
                </li>
                <li>
                  For Self-Match, select two equal tiles in Sam’s row and press
                  Connect Pair. The engine allows this only when Sam holds every
                  remaining copy; if four remain, all four clear together.
                  Twin Signal is a separate once-per-mission character power:
                  choose one of Sam’s non-red circuits and two hidden circuits
                  in the same crewmate’s row. If either matches, one pair clears.
                  One red target is safe with this power; two cause overload.
                  Review mistakes and clues in the deduction log, or pass your turn.
                </li>
                <li>
                  Restore the mission’s circuits before time or hull runs out.
                  Correct connections replenish communication energy.
                </li>
              </ol>
              <p className="muted">
                The number register tracks blue copies automatically. In special
                training, yellow circuits match each other regardless of sorting
                key. Red circuits carry a danger symbol and can end the mission
                immediately. Isolate Overload is safe only when all of Sam’s
                remaining circuits are red; the engine enables that action.
                Hidden colors stay concealed until revealed.
              </p>
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
