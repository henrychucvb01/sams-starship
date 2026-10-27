/** PRESENTATION CONTRACT FIXTURE ONLY. No implemented powers, captain rules or unlock logic.
 * Real engine supplies the board. Unsupported new fields/commands are explicit UI test inputs.
 * This entry is excluded from the production SPA.
 */
import { createRoot } from "react-dom/client";
import { App } from "../../src/screens/App";
import { createEngineAdapter } from "../../src/adapters/engineAdapter";
import type {
  CrewFeaturesView,
  CrewActionView,
} from "../../src/types/crewPresentation";
import type { MissionAdapter, MissionView } from "../../src/types/presentation";
import "../../src/styles/theme.css";
const base = createEngineAdapter(2);
const testAction: CrewActionView = {
  id: "test-power",
  name: "Presentation Test Power",
  description:
    "TEST INPUT: select a public slot label. This fixture does not implement a character ability.",
  requirements: "TEST INPUT: choose one target.",
  remaining: 1,
  used: false,
  available: true,
  targets: [
    {
      id: "targets",
      label: "Crew target",
      count: 1,
      options: [
        { id: "nova-0", label: "Nova · slot 1" },
        { id: "pip-0", label: "Pip · slot 1" },
      ],
    },
  ],
};
const initial = (): CrewFeaturesView => ({
  captainId: "pip",
  actionToken: "fixture-token",
  crew: ["sam", "nova", "pip"].map((id) => ({
    id,
    name: id === "sam" ? "Sam" : id === "nova" ? "Nova" : "Pip",
    power: { ...testAction, id: id + "-power" },
  })),
  equipment: [
    {
      ...testAction,
      id: "test-equipment",
      name: "Presentation Test Equipment",
      unlockNumber: 2,
      resolved: 0,
      total: 2,
      status: "locked",
      available: false,
    },
  ],
});
let features = initial();
let current: MissionView;
let count = 0;
const listeners = new Set<() => void>();
const publish = () => {
  current = { ...base.getSnapshot(), crewFeatures: structuredClone(features) };
  listeners.forEach((fn) => fn());
};
base.subscribe(publish);
publish();
const controls = document.getElementById("fixture-controls")!;
controls.style.cssText =
  "display:flex;flex-wrap:wrap;gap:8px;padding:10px;background:#202c43;color:white";
function fixtureButton(text: string, action: () => void) {
  const button = document.createElement("button");
  button.textContent = text;
  button.onclick = () => {
    action();
    publish();
  };
  controls.append(button);
}
fixtureButton("Test: Captain Nova", () => {
  features.captainId = "nova";
});
fixtureButton("Test: unlock equipment", () => {
  features.equipment[0] = {
    ...features.equipment[0],
    status: "ready",
    available: true,
    resolved: 2,
  };
});
fixtureButton("Test: setup", () => {
  features.startingInformation = {
    pending: true,
    description: "TEST INPUT: choose a blue starting circuit.",
    availableIds: ["sam-0", "sam-2"],
    markers: [{ circuitId: "nova-0", label: "Nova starting information: 1" }],
  };
});
const output = document.createElement("output");
output.setAttribute("aria-label", "Fixture action count");
output.textContent = "0";
controls.append(output);
const adapter: MissionAdapter = {
  ...base,
  getSnapshot: () => current,
  subscribe: (fn) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  restart: () => {
    features = initial();
    base.restart();
    publish();
  },
  performCrewAction: async (id, _choices, token) => {
    if (token !== "fixture-token") throw new Error("Stale fixture token");
    count++;
    output.textContent = String(count);
    if (id === "test-equipment")
      features.equipment[0] = {
        ...features.equipment[0],
        available: false,
        used: true,
        remaining: 0,
        status: "used",
      };
    else
      features.crew = features.crew.map((c) =>
        c.power?.id === id
          ? {
              ...c,
              power: { ...c.power, available: false, used: true, remaining: 0 },
            }
          : c,
      );
    publish();
  },
  selectStartingInformation: (id) => {
    count++;
    output.textContent = String(count);
    features.startingInformation = {
      ...features.startingInformation!,
      pending: false,
      markers: [
        ...features.startingInformation!.markers,
        { circuitId: id, label: "Sam starting information" },
      ],
    };
    publish();
  },
};
createRoot(document.getElementById("root")!).render(<App adapter={adapter} />);
