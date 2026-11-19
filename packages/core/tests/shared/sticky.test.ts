import assert from "node:assert/strict";
import { test } from "node:test";
import {
  caret,
  isCollapsed,
  moveCaret,
  normalize,
  remapAfterEdit,
  selectedRange,
} from "../../dist/shared/index.js";

test("sticky: insert before anchor shifts it", () => {
  const edited = remapAfterEdit(caret(2), { at: 1, removed: 0, inserted: 1 });
  assert.equal(edited.focus.offset, 3);
  assert.equal(edited.anchor.offset, 3);
});

test("sticky: delete covering anchor collapses to edit point", () => {
  const edited = remapAfterEdit(caret(3), { at: 1, removed: 3, inserted: 0 });
  assert.deepEqual(edited.focus, { offset: 1, affinity: "before" });
});

test("sticky: edit at anchor respects affinity", () => {
  const before = remapAfterEdit(caret(1, "before"), {
    at: 1,
    removed: 0,
    inserted: 2,
  });
  assert.deepEqual(before.focus, { offset: 1, affinity: "before" });

  const after = remapAfterEdit(caret(1, "after"), {
    at: 1,
    removed: 0,
    inserted: 2,
  });
  assert.deepEqual(after.focus, { offset: 3, affinity: "after" });
});

test("sticky: normalize clamps and keeps direction", () => {
  const selection = {
    anchor: { offset: 5, affinity: "after" as const },
    focus: { offset: 1, affinity: "before" as const },
  };
  const normalized = normalize(selection, 4);
  assert.deepEqual(normalized.start, { offset: 1, affinity: "before" });
  assert.deepEqual(normalized.end, { offset: 4, affinity: "after" });
  assert.equal(normalized.direction, "backward");
  assert.equal(normalized.collapsed, false);
});

test("sticky: move start/end/prev/next with and without extend", () => {
  const selection = caret(2);
  assert.equal(moveCaret(selection, "prev", false, 5).focus.offset, 1);
  assert.equal(moveCaret(selection, "next", false, 5).focus.offset, 3);
  assert.equal(moveCaret(selection, "start", false, 5).focus.offset, 0);
  assert.equal(moveCaret(selection, "end", false, 5).focus.offset, 5);

  const extended = moveCaret(selection, "next", true, 5);
  assert.deepEqual(extended.anchor, { offset: 2, affinity: "after" });
  assert.deepEqual(extended.focus, { offset: 3, affinity: "after" });
});

test("sticky: move clamps at both ends", () => {
  assert.equal(moveCaret(caret(0), "prev", false, 4).focus.offset, 0);
  assert.equal(moveCaret(caret(4), "next", false, 4).focus.offset, 4);
});

test("sticky: selectedRange orders offsets", () => {
  const selection = {
    anchor: { offset: 4, affinity: "after" as const },
    focus: { offset: 1, affinity: "before" as const },
  };
  assert.deepEqual(selectedRange(selection), { start: 1, end: 4 });
});

test("sticky: isCollapsed only for equal anchors", () => {
  assert.equal(isCollapsed(caret(2, "before")), true);
  assert.equal(isCollapsed(caret(2, "after")), true);
  assert.equal(
    isCollapsed({
      anchor: { offset: 2, affinity: "before" },
      focus: { offset: 2, affinity: "after" },
    }),
    false,
  );
});
