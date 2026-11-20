import assert from "node:assert/strict";
import { test } from "node:test";
import { lexNumber, type NumberSyntax } from "../../dist/lexers/index.js";

const EN: NumberSyntax = {
  decimal: ".",
  group: ",",
  allowNegative: true,
  allowDecimal: true,
};

const DE: NumberSyntax = {
  decimal: ",",
  group: ".",
  allowNegative: true,
  allowDecimal: true,
};

test("number: group separator ignored anywhere", () => {
  const result = lexNumber("1,234,567", EN);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.int, "1234567");
    assert.equal(result.frac, "");
    assert.equal(result.hasDecimal, false);
  }
});

test("number: second decimal separator rejected", () => {
  const result = lexNumber("1.2.3", EN);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "decimal");
    assert.equal(result.at, 3);
  }
});

test("number: sign only at start; unicode minus accepted", () => {
  const negative = lexNumber("-12", EN);
  assert.equal(negative.ok, true);
  if (negative.ok) {
    assert.equal(negative.negative, true);
    assert.equal(negative.int, "12");
  }

  const unicode = lexNumber("\u221212", EN);
  assert.equal(unicode.ok, true);
  if (unicode.ok) {
    assert.equal(unicode.negative, true);
  }

  const plus = lexNumber("+12", EN);
  assert.equal(plus.ok, true);
  if (plus.ok) {
    assert.equal(plus.negative, false);
  }

  const middle = lexNumber("12-3", EN);
  assert.equal(middle.ok, false);
  if (!middle.ok) {
    assert.equal(middle.reason, "sign");
    assert.equal(middle.at, 2);
  }
});

test("number: de-DE syntax reads 1.234,56", () => {
  const result = lexNumber("1.234,56", DE);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.int, "1234");
    assert.equal(result.frac, "56");
    assert.equal(result.hasDecimal, true);
  }
});

test("number: letters and wrong separators are rejected with a position", () => {
  const letter = lexNumber("12a", EN);
  assert.equal(letter.ok, false);
  if (!letter.ok) {
    assert.equal(letter.reason, "char");
    assert.equal(letter.at, 2);
  }

  const wrongSeparator = lexNumber("1/2", DE);
  assert.equal(wrongSeparator.ok, false);
  if (!wrongSeparator.ok) {
    assert.equal(wrongSeparator.reason, "char");
    assert.equal(wrongSeparator.at, 1);
  }
});
