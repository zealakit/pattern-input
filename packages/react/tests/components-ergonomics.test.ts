import assert from "node:assert/strict";
import { createElement as h } from "react";
import { cleanup, render } from "@testing-library/react";
import { beforeEach, test } from "node:test";
import { MaskedInput, MaskPatternError, NumberInput } from "../dist/index.js";

beforeEach(() => {
  cleanup();
  document.body.replaceChildren();
});

test("MaskedInput accepts direct HTML props without leaking options", () => {
  const { container } = render(
    h(MaskedInput, {
      mask: "999-999",
      showLiterals: "always",
      placeholderChar: "_",
      id: "direct-mask",
      className: "my-input",
      placeholder: "123-456",
      "data-testid": "direct-mask",
    } as never),
  );
  const input = container.querySelector("input");
  assert.ok(input);
  assert.equal(input.id, "direct-mask");
  assert.equal(input.className, "my-input");
  assert.equal(input.getAttribute("placeholder"), "123-456");
  assert.equal(input.getAttribute("data-testid"), "direct-mask");
  for (const leaked of ["mask", "showliterals", "placeholderchar"]) {
    assert.equal(input.hasAttribute(leaked), false, leaked);
  }
});

test("NumberInput accepts direct HTML props without leaking options", () => {
  const { container } = render(
    h(NumberInput, {
      maximumFractionDigits: 2,
      allowNegative: false,
      id: "direct-num",
      placeholder: "0.00",
      className: "price",
    } as never),
  );
  const input = container.querySelector("input");
  assert.ok(input);
  assert.equal(input.id, "direct-num");
  assert.equal(input.className, "price");
  assert.equal(input.getAttribute("placeholder"), "0.00");
  for (const leaked of [
    "maximumfractiondigits",
    "allownegative",
    "clampbehavior",
  ]) {
    assert.equal(input.hasAttribute(leaked), false, leaked);
  }
});

test("legacy inputProps still works", () => {
  const { container } = render(
    h(MaskedInput, {
      mask: "999-999",
      inputProps: { id: "legacy", className: "legacy-cls" },
    }),
  );
  const input = container.querySelector("input");
  assert.ok(input);
  assert.equal(input.id, "legacy");
  assert.equal(input.className, "legacy-cls");
});

test("MaskPatternError is a runtime export", () => {
  assert.equal(typeof MaskPatternError, "function");
});
