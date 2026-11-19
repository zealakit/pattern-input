import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compileMask,
  extractRaw,
  fitRaw,
  MaskPatternError,
  selectAlternative,
} from "../../dist/lexers/index.js";

function alternative(pattern: string, index = 0) {
  const mask = compileMask(pattern);
  return mask.alternatives[index];
}

test("mask: 999.999.999-99 has capacity 11 and required 11", () => {
  const alt = alternative("999.999.999-99");
  assert.equal(alt.capacity, 11);
  assert.equal(alt.required, 11);
});

test("mask: escaped literal \\9 is a literal", () => {
  const alt = alternative("\\9");
  assert.equal(alt.capacity, 0);
  assert.deepEqual(alt.tokens, [{ kind: "literal", char: "9" }]);
});

test("mask: optional group completes when absent", () => {
  const alt = alternative("999[.999]");
  assert.equal(alt.capacity, 6);
  assert.equal(alt.required, 3);

  const absent = fitRaw(alt, "123");
  assert.equal(absent.rejectedAt, undefined);
  assert.equal(absent.accepted, "123");

  const present = fitRaw(alt, "123456");
  assert.equal(present.accepted, "123456");
});

test("mask: {2,} greedy repeat fills remaining capacity", () => {
  const alt = alternative("9{2,}");
  assert.equal(alt.capacity, 64);
  assert.equal(alt.required, 2);

  const full = fitRaw(alt, "7".repeat(64));
  assert.equal(full.rejectedAt, undefined);
  assert.equal(full.accepted, "7".repeat(64));

  const overflow = fitRaw(alt, "7".repeat(70));
  assert.equal(overflow.rejectedAt, 64);
  assert.equal(overflow.accepted, "7".repeat(64));
});

test("mask: alternatives first match wins", () => {
  const mask = compileMask(["999", "aa"]);
  assert.equal(selectAlternative(mask, "12"), 0);
  assert.equal(selectAlternative(mask, "ab"), 1);
  assert.equal(selectAlternative(mask, "1234567"), 0);
});

test("mask: custom token with transform upper", () => {
  const mask = compileMask("AAA", {
    A: { test: /^[a-z]$/i, transform: "upper" },
  });
  const fit = fitRaw(mask.alternatives[0], "abc");
  assert.equal(fit.accepted, "ABC");
  assert.equal(fit.rejectedAt, undefined);
});

test("mask: invalid pattern throws MaskPatternError with offset", () => {
  assert.throws(
    () => compileMask("99[9"),
    (error: unknown) =>
      error instanceof MaskPatternError &&
      error.patternIndex === 0 &&
      error.offset === 2 &&
      error.reason === "unbalanced-optional",
  );

  assert.throws(
    () => compileMask("9{0}"),
    (error: unknown) =>
      error instanceof MaskPatternError &&
      error.reason === "bad-repeat" &&
      error.offset === 1,
  );

  assert.throws(
    () => compileMask("9", { "9": { test: /^[0-9]$/ } }),
    (error: unknown) =>
      error instanceof MaskPatternError && error.reason === "reserved-token",
  );
});

test("mask: extractRaw drops literals and foreign separators", () => {
  const mask = compileMask("999.999.999-99");
  assert.equal(extractRaw(mask, "123.456.789-00"), "12345678900");
  assert.equal(extractRaw(mask, "abc 12"), "12");
  assert.equal(extractRaw(mask, "(11) 98765-4321"), "11987654321");
});
