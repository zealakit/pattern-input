import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The pure entry must import without browser globals and expose only the
 * public contract surface plans have implemented so far.
 */
test("core entry imports without browser globals and exports the public surface", async () => {
  const globals = globalThis as Record<string, unknown>;
  assert.equal("window" in globals, false);
  assert.equal("document" in globals, false);

  const entry = new URL("../dist/index.js", import.meta.url).href;
  const module = await import(entry);

  assert.deepEqual(Object.keys(module).sort(), [
    "MaskPatternError",
    "MaskedOptionsError",
    "NumberOptionsError",
    "createMaskedState",
    "createNumberState",
    "formatMasked",
    "formatNumber",
    "getMaskedInputProps",
    "getNumberInputProps",
    "maskedKeyToEvent",
    "maskedReducer",
    "numberKeyToEvent",
    "numberReducer",
    "parseMaskedText",
    "parseNumberText",
    "resolveMaskedOptions",
    "resolveNumberOptions",
  ]);
});

test("core dom entry imports without touching the document", async () => {
  const globals = globalThis as Record<string, unknown>;
  assert.equal("window" in globals, false);

  const entry = new URL("../dist/dom/index.js", import.meta.url).href;
  const module = await import(entry);

  assert.deepEqual(Object.keys(module), []);
});
