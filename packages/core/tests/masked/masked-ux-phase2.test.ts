import assert from "node:assert/strict";
import { test } from "node:test";
import { createMaskedController } from "../../dist/index.js";
import { caret } from "../../dist/shared/index.js";

const TAX = ["999.999.999-99", "99.999.999/9999-99"];

test("multi-mask paste switches to the longer alternative", () => {
  const controller = createMaskedController({ mask: TAX });
  controller.dispatch({ type: "paste", text: "12.345.678/0001-90" });
  assert.equal(controller.value, "12345678000190");
  assert.equal(controller.formattedValue, "12.345.678/0001-90");
  assert.equal(controller.status, "complete");
});

test("multi-mask setValue is not truncated to the first alternative", () => {
  const controller = createMaskedController({ mask: TAX });
  controller.setValue("12345678000190");
  assert.equal(controller.formattedValue, "12.345.678/0001-90");
  assert.equal(controller.status, "complete");
});

test("mid-string insert switches to the longer alternative", () => {
  const controller = createMaskedController({
    mask: TAX,
    defaultValue: "12345678901",
  });
  controller.dispatch({ type: "select", selection: caret(2) });
  controller.dispatch({ type: "insert", text: "9" });
  assert.equal(controller.value, "129345678901");
  assert.equal(controller.getState().selection.focus.offset, 3);
});

test("selectMask picks the alternative by prefix", () => {
  const options = {
    mask: ["9999 9999 9999 9999", "9999 999999 99999"],
    selectMask: (raw: string) => (/^3[47]/.test(raw) ? 1 : 0),
  };
  const amex = createMaskedController(options);
  for (const char of "3412345678901239") {
    amex.dispatch({ type: "insert", text: char });
  }
  assert.equal(amex.formattedValue, "3412 345678 90123");
  assert.equal(amex.status, "complete");

  const visa = createMaskedController(options);
  for (const char of "4111111111111111") {
    visa.dispatch({ type: "insert", text: char });
  }
  assert.equal(visa.formattedValue, "4111 1111 1111 1111");
  assert.equal(visa.status, "complete");
});

test("selectMask out-of-range index falls back safely", () => {
  for (const bad of [-1, 99, Number.NaN]) {
    const controller = createMaskedController({
      mask: ["999", "9999"],
      selectMask: () => bad,
    });
    controller.dispatch({ type: "paste", text: "1234" });
    assert.equal(controller.value, "1234");
  }
});
