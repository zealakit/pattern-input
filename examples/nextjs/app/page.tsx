import * as adapter from "@zealakit/pattern-input-react";

const exported = Object.keys(adapter);

/**
 * Rendered on the server: importing the adapter here proves the package is
 * SSR-safe before any browser global exists.
 */
export default function Home() {
  return (
    <main>
      <h1>@zealakit/pattern-input-react</h1>
      <p>Placeholder example. Field demos land in plan 12.</p>
      <p>
        {exported.length === 0
          ? "Adapter entry resolved during SSR (no exports yet)."
          : `Adapter exports: ${exported.join(", ")}`}
      </p>
      <input type="text" aria-label="Pattern input placeholder" />
    </main>
  );
}
