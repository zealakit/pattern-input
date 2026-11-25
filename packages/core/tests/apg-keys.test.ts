import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMaskedController,
  createNumberController,
  createOtpController,
} from "../dist/index.js";
import type { KeyInput } from "../dist/shared/index.js";

function key(name: string): KeyInput {
  return {
    key: name,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
  };
}

test("[APG-spinbutton] Up/Down step by step, PageUp/PageDown by the larger step", () => {
  const field = createNumberController({
    defaultValue: 50,
    step: 1,
    largeStep: 10,
  });
  field.dispatch({ type: "focus" });
  const press = (name: string) => {
    assert.equal(field.handleKey(key(name)), true, `${name} is handled`);
    return field.value;
  };

  assert.equal(press("ArrowUp"), 51);
  assert.equal(press("ArrowDown"), 50);
  assert.equal(press("PageUp"), 60);
  assert.equal(press("PageDown"), 50);
});

test("[APG-masked-1] typing the separator does not duplicate it", () => {
  const field = createMaskedController({ mask: "99/99/9999" });
  field.dispatch({ type: "focus" });
  for (const text of ["1", "2", "/", "3"]) {
    field.dispatch({ type: "insert", text });
  }

  assert.equal(field.value, "123");
  assert.ok(field.formattedValue.startsWith("12/3"), field.formattedValue);
});

test("[APG-otp-1] ArrowLeft/ArrowRight move between slots and Backspace steps back", () => {
  const field = createOtpController({ length: 4 });
  field.dispatch({ type: "focus" });
  field.dispatch({ type: "insert", text: "1" });
  field.dispatch({ type: "insert", text: "2" });
  const active = () => field.getState().activeIndex;
  assert.equal(active(), 2);

  assert.equal(field.handleKey(key("ArrowLeft")), true);
  assert.equal(active(), 1);
  assert.equal(field.handleKey(key("ArrowRight")), true);
  assert.equal(active(), 2);
  assert.equal(field.handleKey(key("Backspace")), true);
  assert.equal(active(), 1);
  assert.equal(field.value, "1");
});
