import assert from "node:assert/strict";
import { test } from "node:test";
import { createNumberController } from "../../dist/index.js";
import { attachInput } from "../../dist/dom/index.js";

/**
 * IME reference suite (02 Step 4).
 *
 * These titles are the diff base for plan 04: the composition guard extracted
 * into `@zealakit/ui-engine/keyboard` must keep every one of them green without
 * changing the observable event sequence.
 */

function input(): HTMLInputElement {
  const element = document.createElement("input");
  element.type = "text";
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

function keydown(
  element: HTMLElement,
  key: string,
  init: { isComposing?: boolean; keyCode?: number } = {},
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  if (init.isComposing !== undefined) {
    Object.defineProperty(event, "isComposing", {
      configurable: true,
      value: init.isComposing,
    });
  }
  if (init.keyCode !== undefined) {
    Object.defineProperty(event, "keyCode", {
      configurable: true,
      value: init.keyCode,
    });
  }
  element.dispatchEvent(event);
  return event;
}

test("[PI-IME-2] a composing keydown never runs a field command", () => {
  const element = input();
  element.value = "1";
  const controller = createNumberController({ step: 1 });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    // The binding calls preventDefault only when the controller handled the key,
    // which is the observable proof that a command ran.
    const normal = keydown(element, "ArrowUp");
    assert.equal(
      normal.defaultPrevented,
      true,
      "a normal ArrowUp steps the field",
    );

    const composing = keydown(element, "ArrowUp", { isComposing: true });
    assert.equal(
      composing.defaultPrevented,
      false,
      "isComposing suppresses the command",
    );

    const safari = keydown(element, "ArrowUp", { keyCode: 229 });
    assert.equal(
      safari.defaultPrevented,
      false,
      "Safari's 229 suppresses the command",
    );
  } finally {
    detach();
    element.remove();
  }
});

test("[PI-IME-4] Android Gboard composition text is accepted and unidentified keys do nothing", () => {
  const element = input();
  const controller = createNumberController({ maximumFractionDigits: 2 });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    element.dispatchEvent(compositionEvent("compositionstart", ""));
    beforeInput(element, "insertCompositionText", "12");
    element.value = "12";
    element.dispatchEvent(compositionEvent("compositionupdate", "12"));
    element.dispatchEvent(compositionEvent("compositionend", "12"));

    keydown(element, "Unidentified", { keyCode: 229 });
    assert.equal(
      element.value,
      "12",
      "a composing/Unidentified key runs no command",
    );
  } finally {
    detach();
    element.remove();
  }
});

test("[PI-IME-5] Unikey Backspace plus replacement stays text, not a delete command", () => {
  const element = input();
  element.value = "a";
  const controller = createNumberController({});
  const detach = attachInput(element, controller);

  try {
    element.focus();
    // Windows Unikey/EVKey send a synthetic Backspace and an insert with no
    // composition events; the DOM owns the text and the field must accept it.
    element.value = "";
    // A Windows Unikey/EVKey sequence is indistinguishable from a real Backspace
    // plus typing: there are no composition events to gate on (A.5). The binding
    // therefore applies the delete as an ordinary text edit — which is what the
    // user wants — and accepts the replacement. The rule is "no crash, no double
    // commit", not "ignore the Backspace".
    const backspace = beforeInput(element, "deleteContentBackward", "");
    const insert = beforeInput(element, "insertText", "â");

    assert.equal(
      backspace.defaultPrevented,
      true,
      "the delete is applied as a text edit",
    );
    // The binding is the only writer of `el.value`, so it cancels the native
    // insertion and renders the formatted text itself (no double write).
    assert.equal(insert.defaultPrevented, true, "the binding owns the write");
  } finally {
    detach();
    element.remove();
  }
});

test("[PI-IME-6] blur during a composition commits exactly once", () => {
  const element = input();
  const commits: unknown[] = [];
  const controller = createNumberController({
    onValueChange: (change) => commits.push(change),
  });
  const detach = attachInput(element, controller);

  try {
    element.focus();
    element.dispatchEvent(compositionEvent("compositionstart", ""));
    element.value = "12";
    element.dispatchEvent(compositionEvent("compositionupdate", "12"));

    const before = commits.length;
    element.blur();
    const afterBlur = commits.length;
    assert.ok(afterBlur >= before, "blur commits the open composition");
    assert.equal(afterBlur - before, 1, "one commit per blur");
  } finally {
    detach();
    element.remove();
  }
});
