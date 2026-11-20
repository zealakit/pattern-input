import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMaskedState,
  formatMasked,
  getMaskedInputProps,
  type MaskedEvent,
  type MaskedOptions,
  maskedReducer,
  resolveMaskedOptions,
} from "../../dist/index.js";
import { anchorToIndex, indexToAnchor } from "../../dist/shared/index.js";

function masked(options: MaskedOptions, initialRaw = "") {
  const resolved = resolveMaskedOptions(options);
  let state = createMaskedState(options, initialRaw);
  return {
    resolved,
    get state() {
      return state;
    },
    type(text: string) {
      return this.send({ type: "insert", text });
    },
    send(event: MaskedEvent) {
      state = maskedReducer(state, event, resolved);
      return this;
    },
  };
}

test("AC-4: paste 123.456.789-00 fills the mask and completes", () => {
  const field = masked({ mask: "999.999.999-99" });
  field.send({ type: "paste", text: "123.456.789-00" });

  assert.equal(field.state.rawValue, "12345678900");
  assert.equal(field.state.formattedValue, "123.456.789-00");
  assert.equal(field.state.status, "complete");
  assert.equal(
    "aria-invalid" in getMaskedInputProps(field.state, field.resolved),
    false,
  );
});

test("AC-4: partial paste is incomplete and never invalid", () => {
  const field = masked({ mask: "999.999.999-99" });
  field.send({ type: "paste", text: "12345" });

  assert.equal(field.state.rawValue, "12345");
  assert.equal(field.state.formattedValue, "123.45");
  assert.equal(field.state.status, "incomplete");
  assert.equal(
    "aria-invalid" in getMaskedInputProps(field.state, field.resolved),
    false,
  );
});

test("masked: raw never contains literals", () => {
  const field = masked({ mask: "999.999.999-99" });
  field.send({ type: "paste", text: "(123) 456.789-00" });
  assert.equal(field.state.rawValue, "12345678900");
  assert.equal(field.state.rawValue.includes("."), false);
  assert.equal(field.state.rawValue.includes("-"), false);
});

test("masked: typing the next literal advances instead of rejecting", () => {
  const field = masked({ mask: "999.999" });
  for (const char of "123") {
    field.type(char);
  }
  const before = field.state;
  field.type(".");
  assert.equal(field.state, before, "literal keystroke is a no-op advance");

  field.type("4");
  assert.equal(field.state.rawValue, "1234");
});

test("masked: letter into digit slot rejected, state identical", () => {
  const field = masked({ mask: "999" });
  field.type("1");
  const before = field.state;
  field.type("a");
  assert.equal(field.state, before);
});

test("masked: backspace over literal deletes previous slot char", () => {
  const field = masked({ mask: "999.999" }, "123456");
  const alternative =
    field.resolved.mask.alternatives[field.state.alternativeIndex];
  const map = formatMasked(
    field.state.rawValue,
    alternative,
    field.resolved,
  ).map;
  const anchor = indexToAnchor(map, 4);

  field.send({ type: "select", selection: { anchor, focus: anchor } });
  field.send({ type: "delete", direction: "backward", unit: "char" });
  assert.equal(field.state.rawValue, "12456");
});

test("masked: select inside literal snaps to nearest slot", () => {
  const field = masked({ mask: "99/99" }, "1234");
  const alternative = field.resolved.mask.alternatives[0];
  const map = formatMasked(
    field.state.rawValue,
    alternative,
    field.resolved,
  ).map;

  const anchor = indexToAnchor(map, 2);
  assert.equal(anchorToIndex(map, anchor), 2);
  assert.equal(anchor.offset, 2);
});

test("masked: overlong paste truncated to capacity", () => {
  const field = masked({ mask: "999.999" });
  field.send({ type: "paste", text: "1234567890" });
  assert.equal(field.state.rawValue, "123456");
  assert.equal(field.state.formattedValue, "123.456");
});

test("masked: alternatives — first match wins and switches as raw grows", () => {
  const field = masked({ mask: ["99", "999"] });
  field.type("1");
  field.type("2");
  assert.equal(field.state.alternativeIndex, 0);
  assert.equal(field.state.status, "complete");

  field.type("3");
  assert.equal(field.state.rawValue, "123");
  assert.equal(field.state.alternativeIndex, 1);
  assert.equal(field.state.formattedValue, "123");
});

test("masked: optional group complete when absent", () => {
  const field = masked({ mask: "999[.999]" });
  for (const char of "123") {
    field.type(char);
  }
  assert.equal(field.state.status, "complete");
  assert.equal(field.state.formattedValue, "123");
});

test("masked: showLiterals always renders placeholders without units", () => {
  const field = masked({
    mask: "999-999",
    showLiterals: "always",
    placeholderChar: "_",
  });
  assert.equal(field.state.formattedValue, "___-___");
  assert.equal(field.state.rawValue, "");

  field.type("1");
  field.type("2");
  assert.equal(field.state.formattedValue, "12_-___");

  const alternative = field.resolved.mask.alternatives[0];
  const map = formatMasked(
    field.state.rawValue,
    alternative,
    field.resolved,
  ).map;
  assert.equal(map.units.length, 2);
});

test("masked: custom upper token transforms input", () => {
  const field = masked({
    mask: "AAA",
    tokens: { A: { test: /^[a-z]$/i, transform: "upper" } },
  });
  field.type("a");
  field.type("b");
  assert.equal(field.state.rawValue, "AB");
});

test("masked: composition commits once", () => {
  const field = masked({ mask: "999.999" });
  field.send({ type: "composeStart" });
  field.send({ type: "composeUpdate", text: "123" });
  assert.equal(field.state.rawValue, "");

  field.type("9");
  assert.equal(field.state.rawValue, "");

  field.send({ type: "composeEnd", text: "123" });
  assert.equal(field.state.rawValue, "123");
  assert.equal(field.state.composing, null);
});

test("masked: consumer validate marks invalid on commit", () => {
  const field = masked({
    mask: "999",
    validate: (raw) => raw === "999",
  });
  for (const char of "123") {
    field.type(char);
  }
  assert.equal(field.state.status, "complete");

  field.send({ type: "commit" });
  assert.equal(field.state.status, "invalid");
  assert.equal(field.state.invalidReason, "consumer");
  assert.equal(
    getMaskedInputProps(field.state, field.resolved)["aria-invalid"],
    "true",
  );
});

test("masked: getter is stable; numeric inputmode for all-digit masks", () => {
  const digits = masked({ mask: "999.999.999-99" });
  const props = getMaskedInputProps(digits.state, digits.resolved);
  assert.equal(props.inputmode, "numeric");
  assert.equal(props.maxlength, 14);
  assert.equal("role" in props, false);
  assert.equal("placeholder" in props, false);
  assert.equal(getMaskedInputProps(digits.state, digits.resolved), props);

  const letters = masked({ mask: "aaa" });
  assert.equal(
    getMaskedInputProps(letters.state, letters.resolved).inputmode,
    "text",
  );

  const upper = masked({
    mask: "AAA",
    tokens: { A: { test: /^[a-z]$/i, transform: "upper" } },
  });
  assert.equal(
    getMaskedInputProps(upper.state, upper.resolved).autocapitalize,
    "characters",
  );
});

test("masked: an oversized paste is bounded and still fills the mask", () => {
  const field = masked({ mask: "999-99" });
  field.send({ type: "paste", text: `12345${"x".repeat(100_000)}` });

  assert.equal(field.state.rawValue, "12345");
  assert.equal(field.state.formattedValue, "123-45");
});
