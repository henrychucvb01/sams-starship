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
  character,
}: {
  index?: number;
  name?: string;
  character?: string;
}) {
  const approved = boardingCrew.find(c => c.name.toLowerCase() === character);
  if (approved) return <img className="approved-crew-avatar" src={approved.image} alt={name ?? approved.name} />;
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
  onContinue,
  initialCount = 1,
  initialCharacters = ["sam"],
  onBack,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onContinue: (count: number, characters: string[]) => void;
  initialCount?: number;
  initialCharacters?: string[];
  onBack: () => void;
}) {
  const [count, setCount] = useState(initialCount);
  const [chosen, setChosen] = useState(initialCharacters);
  return (
    <section className="crew-selection spaceport-selection page" aria-labelledby="assemble-title">
      <button className="text-button back" onClick={onBack}>
        ← Back to the ship
      </button>
      <h1 id="assemble-title" tabIndex={-1} ref={headingRef}>
        Assemble your <em>crew!</em>
      </h1>
      <p className="crew-selection-intro">
        Big adventures begin with a little crew. Who’s coming aboard?
      </p>
      <div className="crew-parade spaceport-parade" role="group" aria-label="Choose your characters">
        {boardingCrew.map((character, i) => {
          const id = character.name.toLowerCase();
          const active = chosen.includes(id);
          return (
            <button type="button" key={character.name} aria-label={`Choose ${character.name}`} aria-pressed={active}
              onClick={() => setChosen(active ? chosen.filter(c => c !== id) : count === 1 ? [id] : chosen.length < count ? [...chosen, id] : chosen)} data-character={character.name.toLowerCase()}
              className={`boarding-character ${active ? "parade-member aboard" : "standby"}`}
              style={{ "--crew-index": i } as CSSProperties}>
              <div className="character-sprite">
                <img src={character.image} alt="" width="400" height="440" draggable="false" />
              </div>
              <span className="character-nameplate">{character.name}{active ? " ✓" : ""}</span>
            </button>
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
      <p className="crew-choice-status" role="status">{chosen.length} of {count} characters selected{chosen.length !== count ? " — tap characters to fill your crew" : ""}</p>
      <button
        disabled={chosen.length !== count}
        className="primary crew-continue spaceport-continue"
        onClick={() => onContinue(count, chosen)}
      >
        <img src={continueButton} alt="" width="900" height="270" draggable="false" />
        <span className="continue-label">{count === 1 ? "Continue solo" : `Continue with ${count} players`}</span>
        <span className="continue-arrow" aria-hidden="true">→</span>
      </button>
    </section>
  );
}
