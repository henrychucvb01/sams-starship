/** Real engine only. Fixed seed/config for repeatable browser QA, excluded from production. */
import { createRoot } from "react-dom/client";
import { App } from "../../src/screens/App";
import { MISSIONS } from "../../src/engine";
import { createEngineAdapter } from "../../src/adapters/engineAdapter";
import "../../src/styles/theme.css";
const query = new URLSearchParams(location.search);
if (query.has("safe")) MISSIONS.push({id: "isolation-qa", name: "Safe Isolation QA", puzzle: "matching", availability: "development", specials: {yellowPositions: [], redPositions: [1.25, 1.75], redInstantFailure: true, redSafeRule: "after-other-circuits", showCandidates: true}});
const adapter = createEngineAdapter(
  query.has("safe") ? 1 : query.has("self") || query.has("equipment") ? 2 : 42,
  query.has("fatal") ? {damage: 100} : query.has("safe") ? {numberMax: 2} : {},
  query.has("tools") ? {scanner:{uses:1,unlocked:true},dualScanner:{uses:1,unlocked:true}} : {},
  query.has("safe") ? "isolation-qa" : "lights",
  { random: () => query.has("captain") ? 0.4 : 0,
    ...(query.has("equipment") ? {equipment: [{toolId: "scanner" as const, unlockNumber: 2},{toolId: "shield" as const, unlockNumber: 2},{toolId: "hint" as const, unlockNumber: 2}]} : {}) }
);
if (query.has("safe")) {const choose = adapter.chooseMission!; adapter.chooseMission = () => choose("isolation-qa");}
createRoot(document.getElementById("root")!).render(
  <App
    adapter={adapter}
  />,
);
