/** Real engine only. Fixed seed/config for repeatable browser QA, excluded from production. */
import { createRoot } from "react-dom/client";
import { App } from "../../src/screens/App";
import { createEngineAdapter } from "../../src/adapters/engineAdapter";
import "../../src/styles/theme.css";
const query = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(
  <App
    adapter={createEngineAdapter(
      query.has("self") ? 2 : 42,
      query.has("fatal") ? { damage: 100 } : {},
      query.has("tools")
        ? {
            scanner: { uses: 1, unlocked: true },
            dualScanner: { uses: 1, unlocked: true },
          }
        : {},
    )}
  />,
);
