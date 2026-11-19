import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampDecimal,
  compareDecimal,
  fromNumber,
  padFraction,
  roundDecimal,
  stepDecimal,
  toNumber,
} from "../../dist/lexers/index.js";

test("decimal: 1.005 truncate vs round-half-up vs half-even", () => {
  assert.equal(roundDecimal("1.005", 2, "truncate"), "1");
  assert.equal(roundDecimal("1.005", 2, "round-half-up"), "1.01");
  assert.equal(roundDecimal("1.005", 2, "round-half-even"), "1");
});

test("decimal: half-even uses the kept digit parity", () => {
  assert.equal(roundDecimal("2.5", 0, "round-half-even"), "2");
  assert.equal(roundDecimal("3.5", 0, "round-half-even"), "4");
  assert.equal(roundDecimal("2.5", 0, "round-half-up"), "3");
  assert.equal(roundDecimal("-2.5", 0, "round-half-up"), "-3");
});

test("decimal: step 0.1 ten times equals 1", () => {
  let value = "0";
  for (let step = 0; step < 10; step += 1) {
    value = stepDecimal(value, "0.1", 1);
  }
  assert.equal(value, "1");
  assert.equal(stepDecimal("1", "0.1", -1), "0.9");
});

test("decimal: fromNumber handles exponent and -0", () => {
  assert.equal(fromNumber(1e-7), "0.0000001");
  assert.equal(fromNumber(-0), "0");
  assert.equal(fromNumber(1234.5), "1234.5");
  assert.equal(fromNumber(1e21), "1000000000000000000000");
  assert.equal(fromNumber(Number.NaN), "0");
});

test("decimal: beyond MAX_SAFE_INTEGER returns null", () => {
  assert.equal(toNumber("9007199254740992"), null);
  assert.equal(toNumber("9007199254740991"), 9007199254740991);
  assert.equal(toNumber(""), null);
  assert.equal(toNumber("12.5"), 12.5);
});

test("decimal: pad, compare and clamp", () => {
  assert.equal(padFraction("1.5", 3), "1.500");
  assert.equal(padFraction("1", 2), "1.00");
  assert.equal(compareDecimal("1.10", "1.1"), 0);
  assert.equal(compareDecimal("1.2", "1.10"), 1);
  assert.equal(compareDecimal("-1", "1"), -1);
  assert.equal(clampDecimal("5", "1", "3"), "3");
  assert.equal(clampDecimal("-5", "1", "3"), "1");
  assert.equal(clampDecimal("2", "1", "3"), "2");
});
