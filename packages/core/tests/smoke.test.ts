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
    "CONTRACT_VERSION",
    "GETTER_NAMES",
    "INSTANCE_API",
    "MaskPatternError",
    "MaskedOptionsError",
    "NumberOptionsError",
    "OtpOptionsError",
    "PatternInputError",
    "REACT_PROP_NAMES",
    "createFieldController",
    "createMaskedController",
    "createMaskedState",
    "createNumberController",
    "createNumberState",
    "createOtpController",
    "createOtpState",
    "formatMasked",
    "formatNumber",
    "getClipboardText",
    "getMaskedInputProps",
    "getNumberInputProps",
    "getOtpGroupProps",
    "getOtpHiddenInputProps",
    "getOtpSlotProps",
    "maskedKeyToEvent",
    "maskedReducer",
    "numberKeyToEvent",
    "numberReducer",
    "otpKeyToEvent",
    "otpReducer",
    "parseMaskedText",
    "parseNumberText",
    "resolveMaskedOptions",
    "resolveNumberOptions",
    "resolveOtpOptions",
    "toReactProps",
  ]);
});

test("core dom entry imports without touching the document", async () => {
  const globals = globalThis as Record<string, unknown>;
  assert.equal("window" in globals, false);

  const entry = new URL("../dist/dom/index.js", import.meta.url).href;
  const module = await import(entry);

  assert.deepEqual(Object.keys(module), []);
});
