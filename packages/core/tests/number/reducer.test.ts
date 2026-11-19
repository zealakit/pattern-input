import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createNumberState,
  formatNumber,
  type NumberEvent,
  type NumberOptions,
  numberReducer,
  resolveNumberOptions,
} from "../../dist/index.js";
import { anchorToIndex, indexToAnchor } from "../../dist/shared/index.js";

function field(options: NumberOptions = {}, initial: number | null = null) {
  const resolved = createResolved(options);
  let state = createNumberState(options, initial);
  return {
    resolved,
    get state() {
      return state;
    },
    type(text: string) {
      return this.send({ type: "insert", text });
    },
    send(event: NumberEvent) {
      state = numberReducer(state, event, resolved);
      return this;
    },
  };
}

function createResolved(options: NumberOptions) {
  return resolveNumberOptions(options);
}

test("AC-3: typing 1234.567 with maximumFractionDigits 2 keeps 1234.56", () => {
  const number = field({ maximumFractionDigits: 2 });
  for (const char of "1234.567") {
    number.type(char);
  }

  const state = number.state;
  assert.equal(state.rawValue, 1234.56);
  assert.equal(state.rawText, "1234.56");
  assert.equal(state.formattedValue, "1,234.56");

  const map = formatNumber(state.rawText, number.resolved).map;
  assert.equal(anchorToIndex(map, state.selection.focus), 8);
});

test("number: grouping insert keeps caret after typed digit", () => {
  const number = field({ maximumFractionDigits: 2 });
  for (const char of "1234") {
    number.type(char);
  }
  assert.equal(number.state.formattedValue, "1,234");

  const map = formatNumber(number.state.rawText, number.resolved).map;
  assert.equal(anchorToIndex(map, number.state.selection.focus), 5);
});

test("number: backspace on group separator deletes previous digit", () => {
  let state = createNumberState({}, 1234);
  const resolved = resolveNumberOptions({});
  const map = formatNumber(state.rawText, resolved).map;
  const anchor = indexToAnchor(map, 1);
  state = numberReducer(
    state,
    { type: "select", selection: { anchor, focus: anchor } },
    resolved,
  );
  state = numberReducer(
    state,
    { type: "delete", direction: "backward", unit: "char" },
    resolved,
  );
  assert.equal(state.rawText, "234");
});

test("number: empty is not zero; '-' and '12.' are incomplete", () => {
  const number = field({});
  assert.equal(number.state.rawValue, null);
  assert.equal(number.state.status, "empty");

  number.type("-");
  assert.equal(number.state.rawText, "-");
  assert.equal(number.state.status, "incomplete");
  assert.equal(number.state.rawValue, null);

  number.type("1");
  number.type("2");
  assert.equal(number.state.status, "complete");
  assert.equal(number.state.rawValue, -12);

  number.type(".");
  assert.equal(number.state.rawText, "-12.");
  assert.equal(number.state.status, "incomplete");
  assert.equal(number.state.rawValue, -12);
});

test("number: over-precision paste rejected, state identical", () => {
  const number = field({ maximumFractionDigits: 2 });
  number.type("1");
  const before = number.state;
  number.send({ type: "paste", text: "1234.567" });
  assert.equal(number.state, before);
});

test("number: paste '1.234,56 €' into de-DE field becomes 1234.56", () => {
  const number = field({ locale: "de-DE" });
  number.send({ type: "paste", text: "1.234,56 €" });
  assert.equal(number.state.rawValue, 1234.56);
  assert.equal(number.state.formattedValue, "1.234,56");
});

test("number: composition commits once at composeEnd", () => {
  const number = field({ maximumFractionDigits: 2 });
  number.send({ type: "composeStart" });
  number.send({ type: "composeUpdate", text: "1234" });
  assert.equal(number.state.rawText, "");

  number.type("9");
  assert.equal(number.state.rawText, "", "no commit while composing");

  number.send({ type: "composeEnd", text: "1234" });
  assert.equal(number.state.rawText, "1234");
  assert.equal(number.state.composing, null);
});

test("number: commit clamps to max; clampBehavior none marks invalid(range)", () => {
  const clamp = field({ max: 100 });
  for (const char of "150") {
    clamp.type(char);
  }
  clamp.send({ type: "commit" });
  assert.equal(clamp.state.rawText, "100");
  assert.equal(clamp.state.status, "complete");

  const keep = field({ max: 100, clampBehavior: "none" });
  for (const char of "150") {
    keep.type(char);
  }
  keep.send({ type: "commit" });
  assert.equal(keep.state.rawText, "150");
  assert.equal(keep.state.status, "invalid");
  assert.equal(keep.state.invalidReason, "range");
});

test("number: minimumFractionDigits pads on commit only", () => {
  const number = field({ minimumFractionDigits: 2 });
  for (const char of "12.5") {
    number.type(char);
  }
  assert.equal(number.state.rawText, "12.5");

  number.send({ type: "commit" });
  assert.equal(number.state.rawText, "12.50");
  assert.equal(number.state.formattedValue, "12.50");
});

test("number: step uses decimal math and clamps", () => {
  const number = field({ step: 0.1, maximumFractionDigits: 2 });
  number.type("0");
  number.send({ type: "step", direction: 1, large: false });
  assert.equal(number.state.rawValue, 0.1);

  const capped = field({ step: 1, max: 2 });
  capped.type("2");
  capped.send({ type: "step", direction: 1, large: false });
  assert.equal(capped.state.rawValue, 2);
});

test("number: setValue rounds per mode and puts caret at end", () => {
  const number = field({ maximumFractionDigits: 2, rounding: "round-half-up" });
  number.send({ type: "setValue", value: 1.005 });
  assert.equal(number.state.rawText, "1.01");

  const map = formatNumber(number.state.rawText, number.resolved).map;
  assert.equal(anchorToIndex(map, number.state.selection.focus), 4);
});

test("number: Escape resets to focus-time value", () => {
  const number = field({});
  number.send({ type: "focus" });
  number.type("1");
  number.type("2");
  number.send({ type: "reset" });
  assert.equal(number.state.rawText, "");
});

test("number: no-op returns identical state reference", () => {
  const number = field({});
  const before = number.state;
  number.send({ type: "delete", direction: "backward", unit: "char" });
  assert.equal(number.state, before);
});
