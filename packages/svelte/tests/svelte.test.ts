import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { flushSync, mount, unmount } from "svelte";
import {
  createNumberInput,
  createOtpInput,
  GETTER_NAMES,
  INSTANCE_API,
  InputOTP,
  InputOTPSlot,
  NumberInput,
  PatternInputError,
} from "../dist/index.js";
import GroupedOtp from "./support/GroupedOtp.svelte";
import SparseOtp from "./support/SparseOtp.svelte";
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

function mountInto(component: Parameters<typeof mount>[0], props = {}) {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(component as never, { target, props });
  flushSync();
  return {
    target,
    stop: () => unmount(instance),
    slots: () =>
      Array.from(
        target.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
      ),
  };
}

test("svelte: InputOTP paste fills grouped slots and focuses the last", () => {
  const otp = mountInto(GroupedOtp);
  const slots = otp.slots();
  assert.equal(slots.length, 6);

  slots[0].focus();
  paste(slots[0], "123456");
  flushSync();

  assert.equal(document.activeElement, slots[5]);
  assert.deepEqual(
    slots.map((slot) => slot.value),
    ["1", "2", "3", "4", "5", "6"],
  );
  otp.stop();
});

test("svelte: InputOTP exposes one accessible group and a decorative separator", () => {
  const otp = mountInto(GroupedOtp, { name: "code" });
  const root = otp.target.firstElementChild as HTMLElement;

  assert.equal(root.getAttribute("role"), "group");
  assert.equal(root.getAttribute("aria-label"), "Code");
  assert.equal(
    root.querySelectorAll('[role="group"]').length,
    0,
    "InputOTP.Group adds no second group",
  );

  const separator = root.querySelector('[data-testid="sep"]');
  assert.equal(separator?.getAttribute("aria-hidden"), "true");
  assert.equal(separator?.getAttribute("role"), null);
  assert.equal(
    root.querySelector<HTMLInputElement>('input[type="hidden"]')?.name,
    "code",
  );
  otp.stop();
});

test("svelte: InputOTP keeps tabindex and the hidden input in sync with state", () => {
  const otp = mountInto(GroupedOtp, { name: "code" });
  const slots = otp.slots();

  slots[0].focus();
  beforeInput(slots[0], "insertText", "4");
  beforeInput(slots[1], "insertText", "2");
  flushSync();

  assert.equal(slots[2].tabIndex, 0, "roving tabindex follows the state");
  assert.equal(slots[0].tabIndex, -1);
  assert.equal(
    otp.target.querySelector<HTMLInputElement>('input[type="hidden"]')?.value,
    "42",
  );
  otp.stop();
});

test("svelte: InputOTP tolerates a missing slot index (sparse layout)", () => {
  const otp = mountInto(SparseOtp);
  const slots = otp.slots();
  assert.equal(slots.length, 3);

  slots[0].focus();
  paste(slots[0], "1234");
  assert.equal(slots[2].value, "4");
  otp.stop();
});

test("svelte: InputOTP.Slot outside InputOTP throws a helpful error", () => {
  const target = document.createElement("div");
  assert.throws(
    () => mount(InputOTPSlot as never, { target, props: { index: 0 } }),
    /must be rendered inside <InputOTP>/,
  );
});

test("svelte: InputOTP.Group, Slot and Separator are available on the root", () => {
  assert.equal(typeof InputOTP.Group, "function");
  assert.equal(InputOTP.Slot, InputOTPSlot);
  assert.equal(typeof InputOTP.Separator, "function");
});

test("svelte: createOtpInput.focus focuses its own slot, not the first input on the page", () => {
  const stray = input();
  const group = document.createElement("div");
  const slot = document.createElement("input");
  group.append(slot);
  document.body.append(group);

  const field = createOtpInput(() => ({ length: 1 }));
  field.registry.refFor(0)(slot);
  const detach = field.attach(group);

  field.focus();
  assert.equal(document.activeElement, slot);
  assert.notEqual(document.activeElement, stray);
  detach();
});

test("svelte: NumberInput re-renders aria-invalid when the status changes", () => {
  const number = mountInto(NumberInput, {
    options: { validate: () => false },
  });
  const element = number.target.querySelector("input") as HTMLInputElement;
  assert.equal(element.getAttribute("aria-invalid"), null);

  element.focus();
  beforeInput(element, "insertText", "1");
  element.dispatchEvent(new Event("blur"));
  flushSync();

  assert.equal(element.getAttribute("aria-invalid"), "true");
  number.stop();
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

test("factory options reset to their defaults when set back to undefined", () => {
  let disabled: boolean | undefined = true;
  const field = createNumberInput(() =>
    disabled === undefined ? {} : { disabled },
  );
  assert.equal(field.getInputProps().disabled, true);

  disabled = undefined;
  field.sync();

  assert.ok(!field.getInputProps().disabled);
});
