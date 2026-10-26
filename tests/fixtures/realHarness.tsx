/** Real engine, fixed seed for repeatable browser QA. Not included in production. */
import { createRoot } from "react-dom/client";
import { App } from "../../src/screens/App";
import { createEngineAdapter } from "../../src/adapters/engineAdapter";
import "../../src/styles/theme.css";
createRoot(document.getElementById("root")!).render(
  <App
    adapter={createEngineAdapter(
      42,
      location.search.includes("fatal") ? { damage: 100 } : {},
    )}
  />,
);
