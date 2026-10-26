import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  const [own, setOwn] = useState("");
  const [target, setTarget] = useState("");
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
    setOwn("");
    setTarget("");
    adapter.restart();
    adapter.activate();
    setScreen("game");
  }
  function menu() {
    setScreen("menu");
  }
  useEffect(() => {
    if (own && state.ownCircuits.find((c) => c.id === own)?.restored)
      setOwn("");
    if (
      target &&
      state.rooms.flatMap((r) => r.slots).find((c) => c.id === target)?.restored
    )
      setTarget("");
  }, [state, own, target]);
  const targetSlot = state.rooms
    .flatMap((r) => r.slots)
    .find((s) => s.id === target);
  const ended = screen === "game" && state.status !== "playing";
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
          <section
            className={`page game-page event-${state.event.kind}`}
            key="game"
          >
            <div className="game-heading">
              <div>
                <div className="eyebrow">
                  MISSION 01 · EASY · MATCHING NUMBERS
                </div>
                <h1 ref={heading} tabIndex={-1}>
                  Restore the Lights <span>✧</span>
                </h1>
                <p className="muted">
                  Reconnect the circuits. Bring everyone home.
                </p>
              </div>
              <button
                className="secondary compact"
                onClick={() => setScreen("missions")}
              >
                Leave mission
              </button>
            </div>

            <div className="status-strip">
              <div>
                <span>HULL INTEGRITY</span>
                <strong className={state.hull <= 20 ? "danger" : ""}>
                  {state.hull}% {state.hull <= 20 ? "⚠" : ""}
                </strong>
                <meter
                  min="0"
                  max="100"
                  value={state.hull}
                  aria-label="Hull integrity"
                />
              </div>
              <div>
                <span>MISSION CLOCK</span>
                <strong>{time(state.secondsRemaining)}</strong>
                <small>time remaining</small>
              </div>
              <div>
                <span>RESTORED</span>
                <strong>
                  {state.restored}
                  <small> / {state.required}</small>
                </strong>
                <small>circuit pairs</small>
              </div>
              <div>
                <span>HINT ENERGY</span>
                <strong>
                  {state.energy} <small>units</small>
                </strong>
                <small>emergency reserve</small>
              </div>
            </div>
            <div className="game-grid">
              <div className="game-left">
                <div className="ship-panel">
                  <span className="panel-kicker">
                    SS BUTTER · SYSTEM OVERVIEW
                  </span>
                  <Ship restored={state.restored} damaged={state.hull < 100} />
                  <div className="system-pills">
                    <span>✓ Sam's terminal</span>
                    <span>
                      {state.restored === state.required
                        ? "✓ Online"
                        : "! Circuits offline"}
                    </span>
                  </div>
                </div>
                <section className="terminal">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">EMERGENCY CHANNEL</span>
                      <h2>A little help from the crew</h2>
                    </div>
                    <span className="energy-tag">ϟ {state.energy}</span>
                  </div>
                  <div
                    className="message-list"
                    role="log"
                    aria-label="Crew transmissions"
                  >
                    {state.messages.map((m) => (
                      <p key={m.id}>
                        <span>CREW TRANSMISSION</span>
                        {m.text}
                      </p>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    disabled={
                      !target ||
                      state.energy <= 0 ||
                      targetSlot?.restored ||
                      (targetSlot?.clue?.min === targetSlot?.clue?.max &&
                        !!targetSlot?.clue)
                    }
                    onClick={() => adapter.requestClue(target)}
                  >
                    Request clue{" "}
                    {state.energy <= 0 ? "· No energy" : "· 1 energy"}
                  </button>
                  <button
                    className="secondary share-button"
                    disabled={
                      !own ||
                      state.energy <= 0 ||
                      state.ownCircuits.find((c) => c.id === own)?.shared
                    }
                    onClick={() => adapter.shareCircuit(own)}
                  >
                    Share selected Sam circuit · 1 energy
                  </button>
                  <small className="muted">
                    {target
                      ? "A bounded clue about your selected hidden slot."
                      : "Select a hidden circuit to request a clue."}
                  </small>
                </section>
              </div>
              <section className="circuit-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">CIRCUIT WORKBENCH</span>
                    <h2>Make a connection</h2>
                  </div>
                  <span className="number-badge">01</span>
                </div>
                <p className="muted">
                  Select one of your numbers, then a hidden crew circuit.
                </p>
                <div className="circuit-label">
                  <span>1</span>
                  <h3>Sam's circuits</h3>
                  <small>YOUR NUMBERS</small>
                </div>
                <div className="circuit-row own-row">
                  {state.ownCircuits.map((s) => (
                    <button
                      key={s.id}
                      className={`circuit ${own === s.id ? "selected" : ""} ${s.restored ? "restored" : ""}`}
                      disabled={s.restored}
                      aria-pressed={own === s.id}
                      aria-label={`Sam circuit ${s.value}${s.restored ? ", restored" : ""}`}
                      onClick={() => setOwn(s.id)}
                    >
                      <strong>{s.value}</strong>
                      <small>
                        {s.restored
                          ? "✓ DONE"
                          : own === s.id
                            ? "SELECTED"
                            : "SELECT"}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="connection-divider">
                  <span />⌁<span />
                </div>
                <div className="circuit-label">
                  <span>2</span>
                  <h3>Crew circuits</h3>
                  <small>HIDDEN SIGNALS</small>
                </div>
                {state.rooms.map((room) => (
                  <div className="crew-row" key={room.id}>
                    <div className="crew-label">
                      <span className="crew-avatar">⌘</span>
                      <strong>
                        {room.name}
                        <small>{room.system}</small>
                      </strong>
                    </div>
                    <div className="circuit-row">
                      {room.slots.map((s, i) => (
                        <button
                          key={s.id}
                          className={`circuit hidden ${target === s.id ? "selected" : ""} ${s.restored ? "restored" : ""}`}
                          aria-label={`${room.name}, slot ${i + 1}${s.restored ? ", restored" : s.clue ? `, clue ${s.clue.min === s.clue.max ? s.clue.min : `${s.clue.min} to ${s.clue.max}`}` : ", hidden"}`}
                          aria-pressed={target === s.id}
                          disabled={s.restored}
                          onClick={() => setTarget(s.id)}
                        >
                          <strong>
                            {s.restored
                              ? "✓"
                              : s.clue?.min === s.clue?.max && s.clue
                                ? s.clue.min
                                : "?"}
                          </strong>
                          <small>
                            {target === s.id ? "SELECTED" : `SLOT ${i + 1}`}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="connection-action">
                  <p>
                    {own && target
                      ? "Two circuits selected. Ready to connect."
                      : "Choose a number + a hidden slot."}
                  </p>
                  <button
                    className="primary"
                    disabled={!own || !target}
                    onClick={() => {
                      adapter.connect(own, target);
                      setOwn("");
                      setTarget("");
                    }}
                  >
                    Connect circuits <span>ϟ</span>
                  </button>
                </div>
                <div
                  className="event-message"
                  key={state.event.id}
                  role="status"
                >
                  {state.event.kind === "damage" ? "⚠" : "✧"} {state.event.text}
                </div>
              </section>
            </div>
          </section>
        )}
        {ended && (
          <section className={`page result-screen event-${state.status}`}>
            <div className="eyebrow">
              {state.status === "victory"
                ? "TRANSMISSION RECEIVED · ALL CLEAR"
                : "EMERGENCY TRANSMISSION · SIGNAL LOST"}
            </div>
            <Sam
              expression={
                state.status === "victory" ? "celebrating" : "worried"
              }
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
                <li>Examine Sam's numbered circuits.</li>
                <li>
                  Select a hidden crew slot. Spend limited hint energy to narrow
                  down its number.
                </li>
                <li>
                  Select one of Sam's circuits, then connect matching numbers.
                </li>
                <li>
                  Wrong connections damage the ship. Hidden numbers stay hidden.
                </li>
                <li>
                  Share a selected Sam circuit with the crew to let an AI
                  crewmate make a safe connection. This also costs one energy.
                </li>
                <li>
                  Restore all required pairs before the clock or hull runs out.
                  Correct connections replenish energy.
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
