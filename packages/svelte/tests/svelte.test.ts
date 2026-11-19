import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { flushSync, mount, unmount } from "svelte";
import {
  createNumberInput,
  GETTER_NAMES,
  INSTANCE_API,
  OtpInput,
  PatternInputError,
} from "../dist/index.js";
import type { Vector } from "./support/vector-types.ts";
import { runVectorWithSvelte } from "./support/run-vector-svelte.ts";

function input(): HTMLInputElement {
  const element = document.createElement("input");
  document.body.append(element);
  return element;
}

function beforeInput(
  element: HTMLElement,
  inputType: string,
  data: string,
): InputEvent {
  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType,
    data,
  });
  element.dispatchEvent(event);
  return event;
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

test("AC-2: factories expose GETTER_NAMES and INSTANCE_API", () => {
  const field = createNumberInput(() => ({})) as unknown as Record<
    string,
    unknown
  >;

  assert.equal(typeof field.getInputProps, "function");
  for (const name of GETTER_NAMES.number) {
    assert.equal(typeof field[name], "function", name);
  }
  for (const name of INSTANCE_API) {
    assert.ok(name in field, `missing ${name}`);
  }
});

test("AC-7: a rejected controlled paste never renders", () => {
  const element = input();
  const changes: unknown[] = [];
  const field = createNumberInput(() => ({
    maximumFractionDigits: 2,
    value: 123,
    onValueChange: (change) => changes.push(change),
  }));

  const detach = field.attach(element);
  element.focus();
  element.setSelectionRange(0, element.value.length);
  paste(element, "999999");

  assert.equal(changes.length, 1);
  assert.equal(field.value(), 123);
  assert.equal(element.value, "123");
  detach();
});

test("svelte: an approved controlled change keeps the caret", () => {
  const element = input();
  const options = {
    value: 12,
    onValueChange: (change: { value: number | null }) => {
      field.setOptions({ ...options, value: change.value });
    },
  };
  const field = createNumberInput(() => options);
  const detach = field.attach(element);

  element.focus();
  beforeInput(element, "insertText", "3");

  assert.equal(field.value(), 123);
  assert.equal(element.value, "123");
  assert.equal(element.selectionStart, 3);
  detach();
});

test("svelte: controlled without onValueChange throws", () => {
  assert.throws(
    () => createNumberInput(() => ({ value: 1 })),
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "CONTROLLED_WITHOUT_HANDLER",
  );
});

test("svelte: action destroy detaches listeners", () => {
  const element = input();
  const field = createNumberInput(() => ({}));
  const detach = field.attach(element);

  const first = beforeInput(element, "insertText", "1");
  assert.equal(first.defaultPrevented, true);

  detach();
  const second = beforeInput(element, "insertText", "2");
  assert.equal(second.defaultPrevented, false);
});

test("svelte: OtpInput paste focuses the last slot", () => {
  const target = document.createElement("div");
  document.body.append(target);
  const component = mount(OtpInput, {
    target,
    props: { length: 6, options: {} },
  });
  flushSync();

  const slots = Array.from(
    target.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
  );
  assert.equal(slots.length, 6);

  slots[0].focus();
  paste(slots[0], "123456");
  assert.equal(document.activeElement, slots[5]);

  unmount(component);
});

test("svelte: SSR import has no window access", () => {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  const script = `
    const mod = await import("./dist/fields/number-input.js");
    const field = mod.createNumberInput(() => ({}));
    console.log(typeof window, field.getInputProps().inputmode);
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: packageRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();

  assert.equal(output, "undefined decimal");
});

test("vectors(svelte): all vectors pass through the factories", () => {
  for (const file of ["number", "masked", "otp", "controlled"] as const) {
    const vectors = JSON.parse(
      readFileSync(
        new URL(`../../core/tests/vectors/${file}.json`, import.meta.url),
        "utf8",
      ),
    ) as Vector[];
    for (const vector of vectors) {
      runVectorWithSvelte(vector);
    }
  }
});
