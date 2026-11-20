import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatNumber,
  parseNumberText,
  resolveNumberOptions,
} from "../../dist/index.js";

test("number: de-DE formats 1.234,56; explicit separators override locale", () => {
  const de = resolveNumberOptions({ locale: "de-DE" });
  const formatted = formatNumber("1234.56", de);
  assert.equal(formatted.text, "1.234,56");
  assert.equal(formatted.map.units.length, 7);

  const explicit = resolveNumberOptions({
    locale: "de-DE",
    decimalSeparator: ".",
    groupSeparator: ",",
  });
  assert.equal(formatNumber("1234.56", explicit).text, "1,234.56");
});

test("number: format(parse(x)) round-trip over the documented matrix", () => {
  const resolved = resolveNumberOptions({});
  for (const raw of ["", "0", "12", "12.5", "-1234.5", "0.0001", "9999999"]) {
    const { text } = formatNumber(raw, resolved);
    const parsed = parseNumberText(text, resolved);
    assert.equal(parsed.ok, true, `parse failed for ${text}`);
    if (parsed.ok) {
      assert.equal(parsed.rawText, raw);
    }
  }
});

test("number: parse rejects over-precision and reports statuses", () => {
  const resolved = resolveNumberOptions({ maximumFractionDigits: 2 });

  const overPrecision = parseNumberText("1.234", resolved);
  assert.equal(overPrecision.ok, false);
  if (!overPrecision.ok) {
    assert.equal(overPrecision.reason, "precision");
  }

  const empty = parseNumberText("", resolved);
  assert.equal(empty.ok, true);
  if (empty.ok) {
    assert.equal(empty.status, "empty");
    assert.equal(empty.rawText, "");
  }

  const incomplete = parseNumberText("12.", resolved);
  assert.equal(incomplete.ok, true);
  if (incomplete.ok) {
    assert.equal(incomplete.status, "incomplete");
    assert.equal(incomplete.rawText, "12.");
  }
});

test("number: integer field rejects a decimal separator", () => {
  const resolved = resolveNumberOptions({ maximumFractionDigits: 0 });
  const parsed = parseNumberText("12.5", resolved);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.reason, "decimal");
  }
});
