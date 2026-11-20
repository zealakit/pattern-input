import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createNumberState,
  getNumberInputProps,
  numberKeyToEvent,
  numberReducer,
  resolveNumberOptions,
} from "../../dist/index.js";
import type { KeyInput } from "../../dist/shared/index.js";

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

const resolved = resolveNumberOptions({ maximumFractionDigits: 2 });
const state = createNumberState({ maximumFractionDigits: 2 });

test("keymap: arrows move, shift extends", () => {
  assert.deepEqual(numberKeyToEvent(key(), state, resolved), {
    type: "move",
    to: "prev",
    extend: false,
  });
  assert.deepEqual(
    numberKeyToEvent(
      key({ key: "ArrowRight", shiftKey: true }),
      state,
      resolved,
    ),
    { type: "move", to: "next", extend: true },
  );
  assert.deepEqual(numberKeyToEvent(key({ key: "Home" }), state, resolved), {
    type: "move",
    to: "start",
    extend: false,
  });
  assert.deepEqual(numberKeyToEvent(key({ key: "End" }), state, resolved), {
    type: "move",
    to: "end",
    extend: false,
  });
});

test("keymap: word delete modifier per platform", () => {
  assert.deepEqual(
    numberKeyToEvent(
      key({ key: "Backspace", altKey: true }),
      state,
      resolved,
      "mac",
    ),
    { type: "delete", direction: "backward", unit: "word" },
  );
  assert.deepEqual(
    numberKeyToEvent(
      key({ key: "Backspace", ctrlKey: true }),
      state,
      resolved,
      "other",
    ),
    { type: "delete", direction: "backward", unit: "word" },
  );
  assert.deepEqual(numberKeyToEvent(key({ key: "Delete" }), state, resolved), {
    type: "delete",
    direction: "forward",
    unit: "char",
  });
});

test("keymap: step, commit, reset and fall-through", () => {
  assert.deepEqual(numberKeyToEvent(key({ key: "ArrowUp" }), state, resolved), {
    type: "step",
    direction: 1,
    large: false,
  });
  assert.deepEqual(
    numberKeyToEvent(key({ key: "PageDown" }), state, resolved),
    {
      type: "step",
      direction: -1,
      large: true,
    },
  );
  assert.deepEqual(numberKeyToEvent(key({ key: "Enter" }), state, resolved), {
    type: "commit",
  });
  assert.deepEqual(numberKeyToEvent(key({ key: "Escape" }), state, resolved), {
    type: "reset",
  });
  assert.equal(numberKeyToEvent(key({ key: "Tab" }), state, resolved), null);
  assert.equal(
    numberKeyToEvent(key({ key: "a", metaKey: true }), state, resolved),
    null,
  );
  assert.equal(
    numberKeyToEvent(key({ key: "a", isComposing: true }), state, resolved),
    null,
  );
});

test("number: getter is stable, has no role, and flags invalid only", () => {
  const props = getNumberInputProps(state, resolved);
  assert.equal(props.inputmode, "decimal");
  assert.equal(props.type, "text");
  assert.equal("aria-invalid" in props, false);
  assert.equal("role" in props, false);
  assert.equal(getNumberInputProps(state, resolved), props);

  const integer = resolveNumberOptions({ maximumFractionDigits: 0 });
  assert.equal(
    getNumberInputProps(
      createNumberState({ maximumFractionDigits: 0 }),
      integer,
    ).inputmode,
    "numeric",
  );

  const invalidOptions = { max: 10, clampBehavior: "none" as const };
  const invalidResolved = resolveNumberOptions(invalidOptions);
  let invalid = createNumberState(invalidOptions);
  for (const char of "150") {
    invalid = numberReducer(
      invalid,
      { type: "insert", text: char },
      invalidResolved,
    );
  }
  invalid = numberReducer(invalid, { type: "commit" }, invalidResolved);
  const invalidProps = getNumberInputProps(invalid, invalidResolved);
  assert.equal(invalidProps["aria-invalid"], "true");
});
