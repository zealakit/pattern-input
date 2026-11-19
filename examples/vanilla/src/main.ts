import * as vanilla from "@zealakit/pattern-input-vanilla";

/**
 * Plan 00 ships no field behavior: this page proves the workspace adapter
 * resolves and is importable from a Vite build. Plan 12 replaces it with the
 * real demos.
 */
const status = document.querySelector("#status");
const exported = Object.keys(vanilla);

if (status) {
  status.textContent =
    exported.length === 0
      ? "Adapter entry resolved (no exports yet)."
      : `Adapter exports: ${exported.join(", ")}`;
}
