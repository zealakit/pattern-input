import * as adapter from "@zealakit/pattern-input-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const exported = Object.keys(adapter);

function App() {
  return (
    <main>
      <h1>@zealakit/pattern-input-react</h1>
      <p>Placeholder example. Field demos land in plan 12.</p>
      <p>
        {exported.length === 0
          ? "Adapter entry resolved (no exports yet)."
          : `Adapter exports: ${exported.join(", ")}`}
      </p>
      <input type="text" aria-label="Pattern input placeholder" />
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
