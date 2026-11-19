import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_VERSION,
  createMaskedInput,
  createNumberInput,
  createOtpInput,
  GETTER_NAMES,
  INSTANCE_API,
  PatternInputError,
} from "../dist/index.js";
import type { Vector } from "./support/vector-types.ts";
import { runVectorWithInstances } from "./support/run-vector-vanilla.ts";

function makeInput(attributes: Record<string, string> = {}): HTMLInputElement {
  const element = document.createElement("input");
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  document.body.append(element);
  return element;
}

function beforeInput(
  element: HTMLElement,
  inputType: string,
  data: string,
): void {
  element.dispatchEvent(
    new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType,
      data,
    }),
  );
}

function paste(element: HTMLElement, text: string): void {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    clipboardData: unknown;
  };
  Object.defineProperty(event, "clipboardData", {
    value: { getData: () => text, setData: () => {} },
  });
  element.dispatchEvent(event);
}

test("AC-1: number typing formats and keeps the caret on the host input", () => {
  const element = makeInput();
  const input = createNumberInput(element, { maximumFractionDigits: 2 });
  element.focus();

  for (const char of "1234") {
    beforeInput(element, "insertText", char);
  }

  assert.equal(input.value, 1234);
  assert.equal(input.formattedValue, "1,234");
  assert.equal(element.value, "1,234");
  assert.equal(element.selectionStart, 5);
  input.destroy();
});

test("AC-1: masked paste fills literals on the host input", () => {
  const element = makeInput();
  const input = createMaskedInput(element, { mask: "999.999.999-99" });
  paste(element, "123.456.789-00");

  assert.equal(input.value, "12345678900");
  assert.equal(element.value, "123.456.789-00");
  assert.equal(input.status, "complete");
  input.destroy();
});

test("AC-1: OTP paste fills host slots and focuses the last", () => {
  const group = document.createElement("div");
  const slots = Array.from({ length: 6 }, () => {
    const slot = document.createElement("input");
    group.append(slot);
    return slot;
  });
  document.body.append(group);

  const input = createOtpInput(group, { length: 6, slots: () => slots });
  slots[0].focus();
  paste(slots[0], "123456");

  assert.equal(input.value, "123456");
  assert.deepEqual(
    slots.map((slot) => slot.value),
    ["1", "2", "3", "4", "5", "6"],
  );
  assert.equal(document.activeElement, slots[5]);
  input.destroy();
});

test("AC-2: instances expose GETTER_NAMES and INSTANCE_API", () => {
  const element = makeInput();
  const input = createNumberInput(element);

  for (const name of GETTER_NAMES.number) {
    assert.equal(
      typeof (input as unknown as Record<string, unknown>)[name],
      "function",
    );
  }
  for (const name of INSTANCE_API) {
    assert.ok(name in input, `missing ${name}`);
  }
  assert.equal(CONTRACT_VERSION, "1.0.0");
  input.destroy();
});

test("AC-7: a rejected controlled paste never renders", () => {
  const element = makeInput();
  const changes: unknown[] = [];
  const input = createNumberInput(element, {
    maximumFractionDigits: 2,
    value: 123,
    onValueChange: (change) => changes.push(change),
  });

  element.focus();
  element.setSelectionRange(0, element.value.length);
  paste(element, "999999");

  assert.equal(changes.length, 1);
  assert.equal(input.value, 123);
  assert.equal(element.value, "123");
  input.destroy();
});

test("vanilla: an approved controlled change adopts its caret", () => {
  const element = makeInput();
  let input: ReturnType<typeof createNumberInput> | null = null;
  const handler = (change: { value: number | null }) => {
    input?.setOptions({ value: change.value, onValueChange: handler });
  };
  input = createNumberInput(element, { value: 12, onValueChange: handler });

  element.focus();
  beforeInput(element, "insertText", "3");

  assert.equal(input.value, 123);
  assert.equal(element.value, "123");
  assert.equal(element.selectionStart, 3);
  input.destroy();
});

test("vanilla: aria-invalid only when invalid; aria-describedby from options", () => {
  const element = makeInput();
  const input = createNumberInput(element, {
    max: 100,
    clampBehavior: "none",
    describedBy: "hint",
  });

  assert.equal(element.getAttribute("aria-describedby"), "hint");
  assert.equal(element.hasAttribute("aria-invalid"), false);

  element.focus();
  for (const char of "150") {
    beforeInput(element, "insertText", char);
  }
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    }),
  );

  assert.equal(input.status, "invalid");
  assert.equal(element.getAttribute("aria-invalid"), "true");
  input.destroy();
});

test("vanilla: destroy removes listeners and only adapter-added attributes", () => {
  const element = makeInput({ "data-host": "1", class: "keep" });
  const input = createNumberInput(element, { maximumFractionDigits: 2 });

  element.focus();
  beforeInput(element, "insertText", "1");
  assert.equal(element.value, "1");

  input.destroy();
  assert.equal(element.getAttribute("data-host"), "1");
  assert.equal(element.getAttribute("class"), "keep");
  assert.equal(element.hasAttribute("type"), false, "type was adapter-added");

  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: "2",
  });
  element.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(element.value, "1");
});

test("vanilla: rejects non-text input elements", () => {
  assert.throws(
    () => createNumberInput(makeInput({ type: "number" })),
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "UNSUPPORTED_ELEMENT",
  );

  const div = document.createElement("div");
  document.body.append(div);
  assert.throws(
    () => createNumberInput(div as unknown as HTMLInputElement),
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "UNSUPPORTED_ELEMENT",
  );
});

test("vanilla: SSR import has no window access and create fails clearly", () => {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  const script = `
    const mod = await import("./dist/index.js");
    let code = "";
    try { mod.createNumberInput(null, {}); } catch (error) { code = error.code; }
    console.log(typeof window, code);
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: packageRoot, encoding: "utf8" },
  ).trim();

  assert.equal(output, "undefined NO_DOM");
});

test("vectors(vanilla): all vectors pass through the vanilla instances", () => {
  for (const file of ["number", "masked", "otp", "controlled"] as const) {
    const vectors = JSON.parse(
      readFileSync(
        new URL(`../../core/tests/vectors/${file}.json`, import.meta.url),
        "utf8",
      ),
    ) as Vector[];
    for (const vector of vectors) {
      runVectorWithInstances(vector);
    }
  }
});
