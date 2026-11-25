import assert from "node:assert/strict";
import { createElement as h, StrictMode, useState } from "react";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { beforeEach, test } from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  GETTER_NAMES,
  INSTANCE_API,
  InputOTP,
  PatternInputError,
  useNumberInput,
} from "../dist/index.js";
import type { Vector } from "./support/vector-types.ts";
import { runVectorWithReact } from "./support/run-vector-react.ts";

beforeEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function makeInput(): HTMLInputElement {
  const element = document.createElement("input");
  document.body.append(element);
  return element;
}

function attach(ref: unknown, element: HTMLInputElement): void {
  (ref as (node: HTMLInputElement | null) => void)(element);
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

test("AC-2: hook results expose GETTER_NAMES and INSTANCE_API", () => {
  const { result } = renderHook(() => useNumberInput({}));
  const field = result.current as unknown as Record<string, unknown>;

  for (const name of GETTER_NAMES.number) {
    assert.equal(typeof field[name], "function", name);
  }
  for (const name of INSTANCE_API) {
    assert.ok(name in field, `missing ${name}`);
  }
});

test("AC-7: a rejected controlled paste never renders", () => {
  const element = makeInput();
  const changes: unknown[] = [];
  const { result } = renderHook(() =>
    useNumberInput({
      maximumFractionDigits: 2,
      value: 123,
      onValueChange: (change) => changes.push(change),
    }),
  );

  act(() => {
    attach(result.current.getInputProps().ref, element);
  });
  element.focus();
  element.setSelectionRange(0, element.value.length);

  act(() => {
    paste(element, "999999");
  });

  assert.equal(changes.length, 1);
  assert.equal(result.current.value, 123);
  assert.equal(element.value, "123");
});

test("react: an approved controlled update keeps the caret", () => {
  const element = makeInput();
  let approved = 12;
  const onValueChange = (change: { value: number | null }) => {
    approved = change.value ?? 0;
  };
  const { result, rerender } = renderHook(
    (props: { value: number }) =>
      useNumberInput({ value: props.value, onValueChange }),
    { initialProps: { value: 12 } },
  );

  act(() => {
    attach(result.current.getInputProps().ref, element);
  });
  element.focus();

  act(() => {
    beforeInput(element, "insertText", "3");
  });
  assert.equal(approved, 123);

  act(() => {
    rerender({ value: approved });
  });

  assert.equal(result.current.value, 123);
  assert.equal(element.value, "123");
  assert.equal(element.selectionStart, 3);
});

test("react: controlled without onValueChange throws", () => {
  assert.throws(
    () => renderHook(() => useNumberInput({ value: 1 })),
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "CONTROLLED_WITHOUT_HANDLER",
  );
});

test("react: StrictMode attaches once and detaches on unmount", () => {
  function Field() {
    const field = useNumberInput({});
    return h("input", field.getInputProps());
  }

  const rendered = render(h(StrictMode, null, h(Field)));
  const element = document.querySelector("input");
  assert.ok(element);

  beforeInput(element, "insertText", "1");
  assert.equal(element.value, "1");

  rendered.unmount();
  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: "2",
  });
  element.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
});

test("react: user ref and onBlur are merged, not replaced", () => {
  const userRef = { current: null as HTMLInputElement | null };
  let blurred = 0;
  const onBlur = () => {
    blurred += 1;
  };
  const { result } = renderHook(() => useNumberInput({}));

  let props: Record<string, unknown> = {};
  act(() => {
    props = result.current.getInputProps({ ref: userRef, onBlur });
  });

  const element = makeInput();
  act(() => {
    attach(props.ref, element);
  });

  assert.equal(userRef.current, element);
  assert.equal(props.onBlur, onBlur);
  (props.onBlur as () => void)();
  assert.equal(blurred, 1);
});

function otpSlots(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
  );
}

const GROUP_A = { className: "group-a" };
const GROUP_B = { className: "group-b" };
const SEPARATOR = { id: "sep" };

/** `<InputOTP maxLength={6}>` with a 3 + 3 grouping and a separator between. */
function groupedOtp(props: Record<string, unknown> = {}) {
  const slot = (index: number) => h(InputOTP.Slot, { index, key: index });
  return h(
    InputOTP,
    { maxLength: 6, label: "Code", ...props },
    h(InputOTP.Group, GROUP_A, [0, 1, 2].map(slot)),
    h(InputOTP.Separator, SEPARATOR, "-"),
    h(InputOTP.Group, GROUP_B, [3, 4, 5].map(slot)),
  );
}

test("react: InputOTP paste fills grouped slots and focuses the last", () => {
  render(groupedOtp());
  const slots = otpSlots();
  assert.equal(slots.length, 6);

  slots[0].focus();
  paste(slots[0], "123456");

  assert.equal(document.activeElement, slots[5]);
  assert.deepEqual(
    slots.map((slot) => slot.value),
    ["1", "2", "3", "4", "5", "6"],
  );
});

test("react: InputOTP exposes one accessible group and a decorative separator", () => {
  render(groupedOtp({ name: "code" }));

  const group = document.querySelector('[role="group"]');
  assert.ok(group);
  assert.equal(group.getAttribute("aria-label"), "Code");
  assert.equal(
    document.querySelectorAll('[role="group"]').length,
    1,
    "InputOTP.Group adds no second group",
  );

  const separator = document.querySelector("#sep");
  assert.equal(separator?.getAttribute("aria-hidden"), "true");
  assert.equal(separator?.getAttribute("role"), null);

  const hidden = document.querySelector<HTMLInputElement>(
    'input[type="hidden"]',
  );
  assert.equal(hidden?.name, "code");
});

test("react: InputOTP keeps the hidden input and onValueChange in sync", () => {
  const changes: string[] = [];
  render(
    groupedOtp({
      name: "code",
      onValueChange: (change: { value: string }) => changes.push(change.value),
    }),
  );
  const slots = otpSlots();

  slots[0].focus();
  act(() => paste(slots[0], "123456"));

  assert.deepEqual(changes, ["123456"], "one change for the whole paste");
  assert.equal(
    document.querySelector<HTMLInputElement>('input[type="hidden"]')?.value,
    "123456",
  );
});

test("react: InputOTP tolerates a missing slot index (sparse layout)", () => {
  render(
    h(
      InputOTP,
      { maxLength: 4 },
      h(InputOTP.Slot, { index: 0 }),
      h(InputOTP.Slot, { index: 1 }),
      h(InputOTP.Slot, { index: 3 }),
    ),
  );
  const slots = otpSlots();
  assert.equal(slots.length, 3);
  slots[0].focus();
  paste(slots[0], "1234");
  assert.equal(slots[2].value, "4");
});

test("react: InputOTP.Slot outside InputOTP throws a helpful error", () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () => render(h(InputOTP.Slot, { index: 0 })),
      /must be rendered inside <InputOTP>/,
    );
  } finally {
    console.error = originalError;
  }
});

test("react: InputOTP.Slot with an out-of-range index throws", () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () =>
        render(h(InputOTP, { maxLength: 2 }, h(InputOTP.Slot, { index: 2 }))),
      /slot index/,
    );
  } finally {
    console.error = originalError;
  }
});

test("react: InputOTP forwards refs to the root and to slots", () => {
  const rootRef = { current: null as HTMLDivElement | null };
  const slotRef = { current: null as HTMLInputElement | null };
  render(
    h(
      InputOTP,
      { maxLength: 2, ref: rootRef },
      h(InputOTP.Slot, { index: 0, ref: slotRef }),
      h(InputOTP.Slot, { index: 1 }),
    ),
  );
  assert.equal(rootRef.current?.getAttribute("role"), "group");
  assert.equal(slotRef.current, otpSlots()[0]);
});

test("react: InputOTP controlled rejection never renders the paste", () => {
  function Controlled() {
    const [value, setValue] = useState("");
    return groupedOtp({
      value,
      onValueChange: (change: { value: string }) => {
        if (change.value !== "999999") {
          setValue(change.value);
        }
      },
    });
  }
  render(h(Controlled));
  const slots = otpSlots();
  slots[0].focus();

  act(() => paste(slots[0], "999999"));
  assert.deepEqual(
    slots.map((slot) => slot.value),
    ["", "", "", "", "", ""],
  );

  act(() => paste(slots[0], "123456"));
  assert.equal(slots[5].value, "6");
});

test("react: the field ref callback keeps its identity across renders", () => {
  const { result, rerender } = renderHook(() => useNumberInput({}));
  const first = result.current.getInputProps().ref;
  rerender();
  const second = result.current.getInputProps().ref;
  assert.equal(
    second,
    first,
    "a new ref callback would re-attach every render",
  );

  const userRef = { current: null as HTMLInputElement | null };
  const composedFirst = result.current.getInputProps({ ref: userRef }).ref;
  rerender();
  const composedSecond = result.current.getInputProps({ ref: userRef }).ref;
  assert.equal(composedSecond, composedFirst);
});

test("react: renderToString has no window access and renders initial text", () => {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  const script = `
    const { createElement } = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { NumberInput } = await import("./dist/index.js");
    const html = renderToString(
      createElement(NumberInput, { maximumFractionDigits: 2, defaultValue: 5 }),
    );
    console.log(typeof window, html.includes('value="5"'));
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: packageRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();

  assert.equal(output, "undefined true");
});

test("react: getter props are camelCase", () => {
  const { result } = renderHook(() =>
    useNumberInput({ maximumFractionDigits: 2, required: true }),
  );
  const props = result.current.getInputProps();

  assert.equal(props.inputMode, "decimal");
  assert.equal(props.autoComplete, "off");
  assert.equal(props.spellCheck, "false");
  assert.equal(props.enterKeyHint, "done");
  assert.equal(props["aria-required"], "true");
  assert.equal("value" in props, false, "never passes a controlled value");
});

test("vectors(react): all vectors pass through the hooks", () => {
  for (const file of ["number", "masked", "otp", "controlled"] as const) {
    const vectors = JSON.parse(
      readFileSync(
        new URL(`../../core/tests/vectors/${file}.json`, import.meta.url),
        "utf8",
      ),
    ) as Vector[];
    for (const vector of vectors) {
      runVectorWithReact(vector);
    }
  }
});

test("InputOTP options reset to their defaults when a prop goes back to undefined", () => {
  const view = (disabled: boolean | undefined, label: string | undefined) =>
    h(
      InputOTP,
      { maxLength: 2, disabled, label },
      h(InputOTP.Slot, { index: 0 }),
      h(InputOTP.Slot, { index: 1 }),
    );
  const { container, rerender } = render(view(true, "Code"));
  const slot = () => container.querySelector("input") as HTMLInputElement;
  const group = () => container.firstElementChild as HTMLElement;
  assert.equal(slot().disabled, true);
  assert.equal(group().getAttribute("aria-label"), "Code");

  rerender(view(undefined, undefined));

  assert.equal(slot().disabled, false);
  assert.equal(group().getAttribute("aria-label"), null);
});
