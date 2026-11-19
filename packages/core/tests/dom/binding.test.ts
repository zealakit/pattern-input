import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createMaskedController,
  createNumberController,
  createOtpController,
} from "../../dist/index.js";
import {
  attachInput,
  attachOtpGroup,
  isBrowser,
} from "../../dist/dom/index.js";
import type { Vector } from "../support/run-vector.js";
import { runVectorInDom } from "../support/run-vector-dom.ts";

function input(): HTMLInputElement {
  const element = document.createElement("input");
  document.body.append(element);
  return element;
}

function compositionEvent(type: string, data: string): CompositionEvent {
  const event = new CompositionEvent(type, { bubbles: true });
  Object.defineProperty(event, "data", { value: data });
  return event;
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

function clipboardEvent(type: string): {
  event: Event;
  written: string[];
} {
  const written: string[] = [];
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    clipboardData: unknown;
  };
  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: () => "",
      setData: (_type: string, value: string) => written.push(value),
    },
  });
  return { event, written };
}

test("AC-6 dom: composition commits once and formats after end", () => {
  const element = input();
  element.value = "";
  const changes: unknown[] = [];
  const controller = createNumberController({
    maximumFractionDigits: 2,
    onValueChange: (change) => changes.push(change),
  });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    element.dispatchEvent(compositionEvent("compositionstart", ""));
    element.dispatchEvent(compositionEvent("compositionupdate", "12"));
    assert.equal(controller.value, null, "no commit while composing");
    element.dispatchEvent(compositionEvent("compositionend", "12.5"));

    assert.equal(controller.value, 12.5);
    assert.equal(element.value, "12.5");
    assert.equal(changes.length, 1);
  } finally {
    detach();
  }
});

test("dom: insertCompositionText is ignored while composing", () => {
  const element = input();
  const controller = createNumberController({ onValueChange: () => {} });
  const detach = attachInput(element, controller);

  try {
    element.dispatchEvent(compositionEvent("compositionstart", ""));
    const event = beforeInput(element, "insertCompositionText", "9");
    assert.equal(event.defaultPrevented, false);
    assert.equal(controller.value, null);
  } finally {
    detach();
  }
});

test("dom: beforeinput insertText is handled and prevented", () => {
  const element = input();
  const controller = createNumberController({ onValueChange: () => {} });
  const detach = attachInput(element, controller);

  try {
    const event = beforeInput(element, "insertText", "1");
    assert.equal(event.defaultPrevented, true);
    assert.equal(controller.value, 1);
    assert.equal(element.value, "1");
  } finally {
    detach();
  }
});

test("dom: input fallback derives an insert when beforeinput is absent", () => {
  const element = input();
  const controller = createNumberController({ onValueChange: () => {} });
  const detach = attachInput(element, controller);

  try {
    beforeInput(element, "insertText", "1");
    assert.equal(controller.value, 1);

    // Simulate a browser that changed the value without a cancelable
    // beforeinput (Android GBoard style): only `input` fires.
    element.value = "15";
    element.setSelectionRange(2, 2);
    element.dispatchEvent(new Event("input", { bubbles: true }));

    assert.equal(controller.value, 15);
    assert.equal(element.value, "15");
  } finally {
    detach();
  }
});

test("dom: paste of a decorated phone number parses via the mask", () => {
  const element = input();
  const controller = createMaskedController({
    mask: "(999) 999-9999",
    onValueChange: () => {},
  });
  const detach = attachInput(element, controller);

  try {
    const event = new Event("paste", {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData: unknown };
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: () => "+1 (555) 010-9999",
        setData: () => {},
      },
    });
    element.dispatchEvent(event);

    assert.equal(controller.value, "1555010999");
    assert.equal(element.value, "(155) 501-0999");
  } finally {
    detach();
  }
});

test("dom: cut writes the formatted selection and deletes it", () => {
  const element = input();
  const controller = createNumberController({
    maximumFractionDigits: 2,
    onValueChange: () => {},
  });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    beforeInput(element, "insertText", "1");
    beforeInput(element, "insertText", "2");
    beforeInput(element, "insertText", "3");
    element.setSelectionRange(1, 3);

    const { event, written } = clipboardEvent("cut");
    element.dispatchEvent(event);

    assert.deepEqual(written, ["23"]);
    assert.equal(controller.value, 1);
    assert.equal(element.value, "1");
  } finally {
    detach();
  }
});

test("dom: historyUndo restores the value and caret", () => {
  const element = input();
  const controller = createNumberController({ onValueChange: () => {} });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    beforeInput(element, "insertText", "1");
    beforeInput(element, "insertText", "2");
    assert.equal(controller.value, 12);

    const event = beforeInput(element, "historyUndo", "");
    assert.equal(event.defaultPrevented, true);
    assert.equal(controller.value, null);
    assert.equal(element.value, "");
  } finally {
    detach();
  }
});

test("dom: a click inside a literal snaps to the nearest slot", () => {
  const element = input();
  const controller = createMaskedController({
    mask: "99/99",
    onValueChange: () => {},
  });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    beforeInput(element, "insertText", "1");
    beforeInput(element, "insertText", "2");
    beforeInput(element, "insertText", "3");
    beforeInput(element, "insertText", "4");
    assert.equal(element.value, "12/34");

    element.setSelectionRange(2, 2);
    element.dispatchEvent(new Event("select", { bubbles: true }));

    const view = controller.getView();
    assert.equal(view.selection.focus.offset, 2);
  } finally {
    detach();
  }
});

test("AC-7 dom: a rejected controlled paste leaves the approved value", () => {
  const element = input();
  const changes: unknown[] = [];
  const options = {
    maximumFractionDigits: 2,
    value: 123,
    onValueChange: (change: unknown) => changes.push(change),
  };
  const controller = createNumberController(
    options as unknown as Parameters<typeof createNumberController>[0],
  );
  const detach = attachInput(element, controller);

  try {
    element.focus();
    element.setSelectionRange(0, element.value.length);
    const event = new Event("paste", {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData: unknown };
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "999999", setData: () => {} },
    });
    element.dispatchEvent(event);

    assert.equal(changes.length, 1);
    assert.equal(controller.value, 123);
    assert.equal(element.value, "123");
  } finally {
    detach();
  }
});

test("dom: unhandled keys and Tab are not prevented", () => {
  const element = input();
  const controller = createNumberController({ onValueChange: () => {} });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    const tab = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    });
    element.dispatchEvent(tab);
    assert.equal(tab.defaultPrevented, false);

    const letter = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "a",
    });
    element.dispatchEvent(letter);
    assert.equal(letter.defaultPrevented, false);

    const left = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowLeft",
    });
    element.dispatchEvent(left);
    assert.equal(left.defaultPrevented, true);
  } finally {
    detach();
  }
});

test("dom: OTP focus follows activeIndex and Tab leaves the group", () => {
  const group = document.createElement("div");
  const slots = Array.from({ length: 4 }, () => {
    const slot = document.createElement("input");
    group.append(slot);
    return slot;
  });
  document.body.append(group);

  const controller = createOtpController({
    length: 4,
    onValueChange: () => {},
  });
  const detach = attachOtpGroup(group, controller, () => slots);

  try {
    slots[0].focus();
    beforeInput(slots[0], "insertText", "1");
    assert.equal(controller.value, "1");
    assert.equal(document.activeElement, slots[1]);

    const tab = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    });
    slots[1].dispatchEvent(tab);
    assert.equal(tab.defaultPrevented, false);
  } finally {
    detach();
  }
});

test("dom: detach removes every listener", () => {
  const element = input();
  const controller = createNumberController({ onValueChange: () => {} });
  const detach = attachInput(element, controller);
  detach();

  const event = beforeInput(element, "insertText", "1");
  assert.equal(event.defaultPrevented, false);
  assert.equal(controller.value, null);
});

test("dom: import and attach are no-ops without a window (SSR)", () => {
  const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
  const script = `
    const dom = await import("./dist/dom/index.js");
    const detach = dom.attachInput(null, null);
    const otp = dom.attachOtpGroup(null, null, () => []);
    detach();
    otp();
    console.log(dom.isBrowser(), typeof detach, typeof otp.refresh);
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: packageRoot, encoding: "utf8" },
  ).trim();

  assert.equal(output, "false function function");
});

test("vectors(dom): every vector passes through DOM events", () => {
  const files = ["number", "masked", "otp", "controlled"] as const;
  for (const file of files) {
    const vectors = JSON.parse(
      readFileSync(new URL(`../vectors/${file}.json`, import.meta.url), "utf8"),
    ) as Vector[];
    for (const vector of vectors) {
      runVectorInDom(vector);
    }
  }
});

test("dom: isBrowser is true under happy-dom", () => {
  assert.equal(isBrowser(), true);
});
