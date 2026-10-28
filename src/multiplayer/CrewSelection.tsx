import { useState, type CSSProperties, type RefObject } from "react";
import "../styles/multiplayer.css";
import "../styles/crew-selection.css";
import sam from "../assets/crew/sam.webp";
import fox from "../assets/crew/fox.webp";
import bunny from "../assets/crew/bunny.webp";
import cat from "../assets/crew/cat.webp";
import bear from "../assets/crew/bear.webp";
import idleButton from "../assets/crew/selection-blue.webp";
import selectedButton from "../assets/crew/selection-gold.webp";
import continueButton from "../assets/crew/continue-gold.webp";
const boardingCrew = [
  { name: "Sam", image: sam },
  { name: "Fox", image: fox },
  { name: "Bunny", image: bunny },
  { name: "Cat", image: cat },
  { name: "Bear", image: bear },
];
export function CrewPortrait({
  index = 0,
  name,
}: {
  index?: number;
  name?: string;
}) {
  const colors = ["#cdb9ef", "#a9decf", "#f2c3aa", "#a9cbed", "#edb8d5"];
  return (
    <svg
      className="crew-portrait"
      viewBox="0 0 96 112"
      role={name ? "img" : undefined}
      aria-label={name}
      aria-hidden={name ? undefined : true}
      style={{ "--suit": colors[index % colors.length] } as CSSProperties}
    >
      <ellipse cx="48" cy="103" rx="29" ry="5" fill="#15233d" opacity=".35" />
      <path
        d="M32 73 24 95q-2 8 7 8h34q9 0 7-8L64 73"
        fill="var(--suit)"
        stroke="#283957"
        strokeWidth="3"
      />
      <path
        d="m27 80-8 9m50-9 8 9"
        stroke="var(--suit)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="m37 100-2 6m24-6 2 6"
        stroke="#283957"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle
        cx="48"
        cy="43"
        r="32"
        fill="var(--suit)"
        stroke="#283957"
        strokeWidth="3"
      />
      <rect
        x="21"
        y="25"
        width="54"
        height="40"
        rx="20"
        fill="#fff0d6"
        stroke="#283957"
        strokeWidth="3"
      />
      <path
        d="M28 32q12-7 20-4"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="37" cy="44" rx="3" ry="4" fill="#283957" />
      <ellipse cx="59" cy="44" rx="3" ry="4" fill="#283957" />
      <ellipse cx="30" cy="51" rx="5" ry="3" fill="#f3aeb0" />
      <ellipse cx="66" cy="51" rx="5" ry="3" fill="#f3aeb0" />
      <path
        d="M43 53q5 5 10 0"
        fill="none"
        stroke="#283957"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="39" y="77" width="18" height="12" rx="4" fill="#fff0d6" />
      <path d="M48 78v10m-5-5h10" stroke="#637293" strokeWidth="2" />
      <path d="M48 10V4" stroke="#283957" strokeWidth="3" />
      <circle cx="48" cy="4" r="4" fill="#fff0ad" />
    </svg>
  );
}
export function CrewSelection({
  headingRef,
  onSolo,
  onMultiplayer,
  onBack,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSolo: () => void;
  onMultiplayer: (count: number) => void;
  onBack: () => void;
}) {
  const [count, setCount] = useState(1);
  return (
    <section className="crew-selection spaceport-selection page" aria-labelledby="assemble-title">
      <button className="text-button back" onClick={onBack}>
        ← Back to the ship
      </button>
      <div className="boarding-pass-tag"><span aria-hidden="true">✦</span> SPACEPORT TERMINAL <span className="boarding-gate">GATE 01</span></div>
      <h1 id="assemble-title" tabIndex={-1} ref={headingRef}>
        Assemble your <em>crew!</em>
      </h1>
      <p className="crew-selection-intro">
        Big adventures begin with a little crew. Who’s coming aboard?
      </p>
      <div className="crew-parade spaceport-parade" aria-hidden="true">
        {boardingCrew.map((character, i) => {
          const active = i < (count === 1 ? 3 : count);
          return (
            <div key={character.name} data-character={character.name.toLowerCase()}
              className={`boarding-character ${active ? "parade-member aboard" : "standby"}`}
              style={{ "--crew-index": i } as CSSProperties}>
              <div className="character-sprite">
                <img src={character.image} alt="" width="400" height="440" draggable="false" />
              </div>
              <span className="character-nameplate">{character.name}</span>
            </div>
          );
        })}
      </div>
      <fieldset className="crew-size-picker">
        <legend>Choose your crew size</legend>
        <div className="crew-size-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              className={`crew-size-option ${count === n ? "selected" : ""}`}
              key={n}
            >
              <img className="crew-option-art" src={count === n ? selectedButton : idleButton}
                width="320" height="320" alt="" draggable="false" />
              <input
                type="radio"
                aria-label={n === 1 ? "1 — Solo + AI" : `${n} — Players`}
                name="crew-size"
                value={n}
                checked={count === n}
                onChange={() => setCount(n)}
              />
              <strong>{n}</strong>
              <span>{n === 1 ? "Solo + AI" : "Players"}</span>

            </label>
          ))}
        </div>
      </fieldset>
      <div className="crew-mode-note" role="status">
        <strong>
          {count === 1
            ? "A cozy solo adventure"
            : "Everyone gets their own screen"}
        </strong>
        <p>
          {count === 1
            ? "Fly with Sam, Nova and Pip. Your AI crewmates take their own turns."
            : "Create a room, share its code, and reconnect the ship together. Each phone keeps its owner’s circuit numbers private."}
        </p>
        <small>
          {count === 2
            ? "Two separate racks per player."
            : count === 3
              ? "The Captain has two separate racks; everyone else has one."
              : count > 3
                ? "One separate rack per player."
                : "Three crewmates · one shared ship"}
        </small>
      </div>
      <button
        className="primary crew-continue spaceport-continue"
        onClick={() => (count === 1 ? onSolo() : onMultiplayer(count))}
      >
        <img src={continueButton} alt="" width="900" height="270" draggable="false" />
        <span className="continue-label">{count === 1 ? "Continue solo" : `Continue with ${count} players`}</span>
        <span className="continue-arrow" aria-hidden="true">→</span>
      </button>
    </section>
  );
}
