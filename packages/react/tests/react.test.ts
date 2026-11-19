import assert from "node:assert/strict";
import { createElement as h, StrictMode } from "react";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { beforeEach, test } from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  GETTER_NAMES,
  INSTANCE_API,
  OtpInput,
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

test("react: OtpInput paste focuses the last slot", () => {
  render(h(OtpInput, { length: 6, groupProps: { "aria-label": "Code" } }));
  const slots = Array.from(
    document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
  );
  assert.equal(slots.length, 6);

  slots[0].focus();
  paste(slots[0], "123456");

  assert.equal(document.activeElement, slots[5]);
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
