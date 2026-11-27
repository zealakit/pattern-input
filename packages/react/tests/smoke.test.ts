import { test } from "node:test";

/** The built entry exports exactly the documented surface and imports cleanly. */
test("react entry imports under happy-dom and exports the documented surface", async () => {
  const entry = new URL("../dist/index.js", import.meta.url).href;
  const module = await import(entry);

  const keys = Object.keys(module).sort();
  const expected = [
    "CONTRACT_VERSION",
    "GETTER_NAMES",
    "INSTANCE_API",
    "InputOTP",
    "InputOTPGroup",
    "InputOTPSeparator",
    "InputOTPSlot",
    "MaskPatternError",
    "MaskedInput",
    "NumberInput",
    "PatternInputError",
    "useMaskedInput",
    "useNumberInput",
    "useOtpInput",
  ];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected exports: ${keys.join(", ")}`);
  }
});
