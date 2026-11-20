import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONTRACT_VERSION,
  createNumberController,
  getClipboardText,
  GETTER_NAMES,
  INSTANCE_API,
  PatternInputError,
  resolveNumberOptions,
  formatNumber,
  type ValueChange,
} from "../../dist/index.js";
import { numberBinding } from "../../dist/controller/binding.js";
import type { KeyInput } from "../../dist/shared/index.js";
import { indexToAnchor } from "../../dist/shared/index.js";

function key(overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    key: "ArrowLeft",
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    ...overrides,
  };
}

test("AC-7: controlled paste rejected keeps the approved state and caret", () => {
  const changes: ValueChange<number | null>[] = [];
  const options = {
    maximumFractionDigits: 2,
    value: 123,
    onValueChange: (change: ValueChange<number | null>) => changes.push(change),
    now: () => 0,
  };
  const controller = createNumberController(options);

  controller.dispatch({ type: "focus" });
  const approved = controller.getState();

  // Select everything first, like a user replacing the value.
  const resolved = resolveNumberOptions(options);
  const formatted = formatNumber(approved.rawText, resolved);
  controller.dispatch({
    type: "select",
    selection: {
      anchor: indexToAnchor(formatted.map, 0),
      focus: indexToAnchor(formatted.map, formatted.text.length),
    },
  });
  const selected = controller.getState();
  controller.dispatch({ type: "paste", text: "999999" });

  assert.equal(controller.getState(), selected, "proposal not adopted");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].value, 999999);

  controller.setOptions({ ...options, value: 123 });
  assert.equal(controller.getState(), selected);
  assert.equal(controller.value, 123);
  assert.equal(controller.getState().selection.focus.offset, 3);
});

test("controlled: a rejected proposal can be proposed again", () => {
  const proposals: (number | null)[] = [];
  const controller = createNumberController({
    value: 1,
    onValueChange: (change: ValueChange<number | null>) =>
      proposals.push(change.value),
    now: () => 0,
  });

  controller.dispatch({ type: "paste", text: "5000" });
  controller.dispatch({ type: "paste", text: "5000" });

  // The consumer never approved either, so both must reach it.
  assert.equal(proposals.length, 2);
  assert.equal(controller.value, 1, "approved value is unchanged");
});

test("controlled: an approved proposal is adopted with its caret", () => {
  const options = {
    value: 12,
    onValueChange: () => {},
    now: () => 0,
  };
  const controller = createNumberController(options);
  controller.dispatch({ type: "insert", text: "3" });
  controller.setOptions({ ...options, value: 123 });

  assert.equal(controller.value, 123);
  assert.equal(controller.getState().selection.focus.offset, 3);
});

test("controlled: a transformed value resets the caret to the end", () => {
  const options = {
    value: 12,
    onValueChange: () => {},
    now: () => 0,
  };
  const controller = createNumberController(options);
  controller.dispatch({ type: "insert", text: "3" });
  controller.setOptions({ ...options, value: 999 });

  assert.equal(controller.value, 999);
  assert.equal(controller.getState().selection.focus.offset, 3);
});

test("controlled: missing onValueChange throws CONTROLLED_WITHOUT_HANDLER", () => {
  assert.throws(
    () => createNumberController({ value: 1 }),
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "CONTROLLED_WITHOUT_HANDLER",
  );

  const controller = createNumberController({ onValueChange: () => {} });
  assert.throws(
    () => controller.setOptions({ value: 1 }),
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "CONTROLLED_WITHOUT_HANDLER",
  );

  const readOnly = createNumberController({ value: 1, readOnly: true });
  assert.equal(readOnly.value, 1);
});

test("uncontrolled: emits once per value change, never for focus or caret moves", () => {
  const changes: ValueChange<number | null>[] = [];
  const controller = createNumberController({
    maximumFractionDigits: 2,
    onValueChange: (change) => changes.push(change),
    now: () => 0,
  });

  controller.dispatch({ type: "focus" });
  controller.dispatch({ type: "insert", text: "1" });
  assert.equal(changes.length, 1);

  controller.dispatch({ type: "move", to: "next", extend: false });
  controller.dispatch({ type: "focus" });
  assert.equal(changes.length, 1);

  controller.dispatch({ type: "insert", text: "2" });
  assert.equal(changes.length, 2);
});

test("mode switch: uncontrolled → controlled adopts the value", () => {
  const controller = createNumberController({
    onValueChange: () => {},
    now: () => 0,
  });
  controller.dispatch({ type: "insert", text: "5" });
  assert.equal(controller.value, 5);
  assert.equal(controller.controlled, false);

  controller.setOptions({ value: 42, onValueChange: () => {}, now: () => 0 });
  assert.equal(controller.value, 42);
  assert.equal(controller.controlled, true);
});

test("history: a typed run undoes as one step and restores the caret", () => {
  const controller = createNumberController({
    onValueChange: () => {},
    now: () => 0,
  });

  for (const char of "123") {
    controller.dispatch({ type: "insert", text: char });
  }
  assert.equal(controller.value, 123);

  assert.equal(controller.undo(), true);
  assert.equal(controller.value, null);
  assert.equal(controller.getState().selection.focus.offset, 0);

  assert.equal(controller.redo(), true);
  assert.equal(controller.value, 123);
});

test("history: undo restores the caret from before the edit", () => {
  const controller = createNumberController({
    onValueChange: () => {},
    now: () => 0,
  });
  for (const char of "123") {
    controller.dispatch({ type: "insert", text: char });
  }
  controller.dispatch({ type: "move", to: "start", extend: false });
  controller.dispatch({ type: "insert", text: "9" });
  assert.equal(controller.value, 9123);

  controller.undo();
  assert.equal(controller.value, 123);
  assert.equal(controller.getState().selection.focus.offset, 0);
});

test("history: controlled undo is a proposal", () => {
  const changes: ValueChange<number | null>[] = [];
  const handler = (change: ValueChange<number | null>) => changes.push(change);
  const options = { value: 12, onValueChange: handler, now: () => 0 };
  const controller = createNumberController(options);

  controller.dispatch({ type: "insert", text: "3" });
  controller.setOptions({ ...options, value: 123 });
  assert.equal(controller.value, 123);

  assert.equal(controller.undo(), true);
  assert.equal(changes.at(-1)?.reason, "undo");
  assert.equal(controller.value, 123, "undo waits for approval");

  controller.setOptions({ ...options, value: 12 });
  assert.equal(controller.value, 12);
});

test("clipboard: copied formatted text pastes back to the same value", () => {
  const options = {
    maximumFractionDigits: 2,
    onValueChange: () => {},
    now: () => 0,
  };
  const controller = createNumberController(options);
  controller.dispatch({ type: "paste", text: "1234.56" });

  const resolved = resolveNumberOptions(options);
  const state = controller.getState();
  const formatted = formatNumber(state.rawText, resolved);
  const selection = {
    anchor: indexToAnchor(formatted.map, 0),
    focus: indexToAnchor(formatted.map, formatted.text.length),
  };
  controller.dispatch({ type: "select", selection });

  const copied = getClipboardText(
    controller.getState(),
    numberBinding,
    resolved,
  );
  assert.equal(copied, "1,234.56");

  const other = createNumberController(options);
  other.dispatch({ type: "paste", text: copied });
  assert.equal(other.value, 1234.56);
});

test("contract: getter and instance names are frozen", () => {
  assert.equal(CONTRACT_VERSION, "1.0.0");
  assert.deepEqual(GETTER_NAMES.number, ["getInputProps"]);
  assert.deepEqual(GETTER_NAMES.masked, ["getInputProps"]);
  assert.deepEqual(GETTER_NAMES.otp, [
    "getGroupProps",
    "getSlotProps",
    "getHiddenInputProps",
  ]);
  assert.deepEqual([...INSTANCE_API].sort(), [
    "clear",
    "focus",
    "formattedValue",
    "redo",
    "setValue",
    "status",
    "undo",
    "value",
  ]);
});

test("NFR-3: getState keeps its reference when nothing changes", () => {
  const controller = createNumberController({
    onValueChange: () => {},
    now: () => 0,
  });
  const first = controller.getState();
  assert.equal(controller.getState(), first);

  controller.dispatch({ type: "move", to: "prev", extend: false });
  assert.equal(controller.getState(), first);

  controller.handleKey(key({ key: "Home" }));
  assert.equal(controller.getState(), first);
});
