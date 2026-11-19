import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The pure entry must import without browser globals and must not export
 * anything until a plan implements a primitive (no speculative exports).
 */
test("core entry imports without browser globals and exports nothing", async () => {
  const globals = globalThis as Record<string, unknown>;
  assert.equal("window" in globals, false);
  assert.equal("document" in globals, false);

  const entry = new URL("../dist/index.js", import.meta.url).href;
  const module = await import(entry);

  assert.deepEqual(Object.keys(module), []);
});

test("core dom entry imports without touching the document", async () => {
  const globals = globalThis as Record<string, unknown>;
  assert.equal("window" in globals, false);

  const entry = new URL("../dist/dom/index.js", import.meta.url).href;
  const module = await import(entry);

  assert.deepEqual(Object.keys(module), []);
});
