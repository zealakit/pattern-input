import { test } from "node:test";

/**
 * The adapter ships no behavior yet (plan 11 adds actions/factories and
 * components), so the built entry must stay empty and import cleanly.
 */
test("svelte entry imports under happy-dom and exports nothing", async () => {
  const entry = new URL("../dist/index.js", import.meta.url).href;
  const module = await import(entry);

  const keys = Object.keys(module);
  if (keys.length !== 0) {
    throw new Error(`Unexpected exports: ${keys.join(", ")}`);
  }
});
