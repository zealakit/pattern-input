import { test } from "node:test";

/**
 * The adapter ships no behavior yet (plan 08 adds the field functions), so the
 * built entry must stay empty and must import cleanly with a DOM present.
 */
test("vanilla entry imports under happy-dom and exports nothing", async () => {
  const entry = new URL("../dist/index.js", import.meta.url).href;
  const module = await import(entry);

  const keys = Object.keys(module);
  if (keys.length !== 0) {
    throw new Error(`Unexpected exports: ${keys.join(", ")}`);
  }
});
