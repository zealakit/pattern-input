import { test } from "node:test";

/**
 * The adapter is built by svelte-package; importing the entry in Node needs the
 * `.svelte` compile hook, so the smoke check targets the factory entry only.
 */
test("svelte factories import under happy-dom and export the contract", async () => {
  const module = await import("../dist/fields/number-input.js");
  const field = module.createNumberInput(() => ({}));
  if (typeof field.getInputProps !== "function") {
    throw new Error("missing getInputProps");
  }
});
