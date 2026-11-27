import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMaskedController,
  createNumberController,
} from "../../dist/index.js";

test("uncontrolled setOptions reformats on mask change and notifies", () => {
  const controller = createMaskedController({ mask: "(999) 999-9999" });
  controller.setValue("4155550199");
  assert.equal(controller.formattedValue, "(415) 555-0199");
  let notified = 0;
  controller.subscribe(() => {
    notified += 1;
  });
  controller.setOptions({ mask: "9999 999 999" });
  assert.equal(notified, 1);
  assert.equal(controller.formattedValue, "4155 550 199");
});

test("uncontrolled showLiterals toggle repaints", () => {
  const controller = createMaskedController({ mask: "(999) 999-9999" });
  let notified = 0;
  controller.subscribe(() => {
    notified += 1;
  });
  controller.setOptions({ mask: "(999) 999-9999", showLiterals: "always" });
  assert.equal(notified, 1);
  assert.equal(controller.getView().text, "(___) ___-____");
});

test("controlled setOptions reformats when only locale changes", () => {
  const onValueChange = () => {};
  const controller = createNumberController({
    value: 1234.56,
    locale: "en-US",
    onValueChange,
  });
  assert.equal(controller.formattedValue, "1,234.56");
  let notified = 0;
  controller.subscribe(() => {
    notified += 1;
  });
  controller.setOptions({ value: 1234.56, locale: "de-DE", onValueChange });
  assert.equal(notified, 1);
  assert.equal(controller.formattedValue, "1.234,56");
});

test("mask shrink truncates the raw value", () => {
  const controller = createMaskedController({ mask: "999-999-99999" });
  controller.setValue("12345678901");
  controller.setOptions({ mask: "999-999" });
  assert.equal(controller.value, "123456");
  assert.equal(controller.formattedValue, "123-456");
});

test("equivalent option literals do not notify", () => {
  const controller = createMaskedController({ mask: "999-999" });
  controller.setValue("123456");
  let notified = 0;
  controller.subscribe(() => {
    notified += 1;
  });
  controller.setOptions({ mask: "999-999" });
  controller.setOptions({ mask: "999-999" });
  assert.equal(notified, 0);
});
