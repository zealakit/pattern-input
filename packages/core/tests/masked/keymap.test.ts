import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMaskedState,
  maskedKeyToEvent,
  maskedReducer,
  resolveMaskedOptions,
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

const options = { mask: "999.999" } as const;
const resolved = resolveMaskedOptions(options);
const state = createMaskedState(options);

test("masked keymap: movement and deletion", () => {
  assert.deepEqual(maskedKeyToEvent(key(), state, resolved), {
    type: "move",
    to: "prev",
    extend: false,
  });
  assert.deepEqual(
    maskedKeyToEvent(key({ key: "ArrowRight" }), state, resolved),
    {
      type: "move",
      to: "next",
      extend: false,
    },
  );
  assert.deepEqual(
    maskedKeyToEvent(key({ key: "Backspace" }), state, resolved),
    { type: "delete", direction: "backward", unit: "char" },
  );
  assert.deepEqual(
    maskedKeyToEvent(key({ key: "Delete", ctrlKey: true }), state, resolved),
    { type: "delete", direction: "forward", unit: "word" },
  );
});

test("masked keymap: commit, reset, and fall-through", () => {
  assert.deepEqual(maskedKeyToEvent(key({ key: "Enter" }), state, resolved), {
    type: "commit",
  });
  assert.deepEqual(maskedKeyToEvent(key({ key: "Escape" }), state, resolved), {
    type: "reset",
  });
  assert.equal(maskedKeyToEvent(key({ key: "Tab" }), state, resolved), null);
  assert.equal(maskedKeyToEvent(key({ key: "PageUp" }), state, resolved), null);
  assert.equal(
    maskedKeyToEvent(key({ key: "a", metaKey: true }), state, resolved),
    null,
  );
});

test("masked: Escape resets to the committed raw value", () => {
  let current = maskedReducer(
    createMaskedState({ mask: "999" }, "123"),
    { type: "focus" },
    resolveMaskedOptions({ mask: "999" }),
  );
  const local = resolveMaskedOptions({ mask: "999" });
  current = maskedReducer(current, { type: "insert", text: "4" }, local);
  assert.equal(current.rawValue, "123");

  current = maskedReducer(
    current,
    { type: "delete", direction: "backward", unit: "char" },
    local,
  );
  assert.equal(current.rawValue, "12");

  current = maskedReducer(current, { type: "reset" }, local);
  assert.equal(current.rawValue, "123");
});
