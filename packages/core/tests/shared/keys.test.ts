import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isComposing,
  isModified,
  isWordDelete,
  type KeyInput,
} from "../../dist/shared/index.js";

function key(overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    key: "Backspace",
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    ...overrides,
  };
}

test("keys: modified covers ctrl, meta and alt", () => {
  assert.equal(isModified(key()), false);
  assert.equal(isModified(key({ ctrlKey: true })), true);
  assert.equal(isModified(key({ metaKey: true })), true);
  assert.equal(isModified(key({ altKey: true })), true);
  assert.equal(isModified(key({ shiftKey: true })), false);
});

test("keys: word delete modifier per platform", () => {
  assert.equal(isWordDelete(key({ altKey: true }), "mac"), true);
  assert.equal(isWordDelete(key({ ctrlKey: true }), "mac"), false);
  assert.equal(isWordDelete(key({ ctrlKey: true }), "other"), true);
  assert.equal(isWordDelete(key({ altKey: true }), "other"), false);
  assert.equal(isWordDelete(key(), "other"), false);
});

test("keys: composing flag is reported", () => {
  assert.equal(isComposing(key()), false);
  assert.equal(isComposing(key({ isComposing: true })), true);
});
