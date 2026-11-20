import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anchorToIndex,
  type EditableMap,
  indexToAnchor,
  selectionFromIndices,
  selectionToIndices,
} from "../../dist/shared/index.js";

function mapOf(
  textLength: number,
  ranges: ReadonlyArray<readonly [number, number]>,
): EditableMap {
  return {
    textLength,
    units: ranges.map(([start, end]) => ({ start, end })),
  };
}

/** "1,234.5" — raw "1234.5", one literal between units 0 and 1. */
const GROUPED = mapOf(7, [
  [0, 1],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
]);

/** " (12" — two leading literals before the first editable unit. */
const LEADING = mapOf(4, [
  [2, 3],
  [3, 4],
]);

/** "12)" — one trailing literal after the last editable unit. */
const TRAILING = mapOf(3, [
  [0, 1],
  [1, 2],
]);

/** "12--34" — a two-character literal gap between units 1 and 2. */
const GAP = mapOf(6, [
  [0, 1],
  [1, 2],
  [4, 5],
  [5, 6],
]);

/** "😀x" — the emoji is a surrogate pair and still one raw unit. */
const PAIR = mapOf(3, [
  [0, 2],
  [2, 3],
]);

test("caret: offset 0 and offset n map to text edges", () => {
  assert.equal(anchorToIndex(LEADING, { offset: 0, affinity: "before" }), 2);
  assert.equal(anchorToIndex(LEADING, { offset: 0, affinity: "after" }), 0);
  assert.equal(anchorToIndex(TRAILING, { offset: 2, affinity: "before" }), 3);
  assert.equal(anchorToIndex(TRAILING, { offset: 2, affinity: "after" }), 2);
});

test("caret: anchor maps across a literal run with before/after affinity", () => {
  assert.equal(anchorToIndex(GROUPED, { offset: 1, affinity: "before" }), 2);
  assert.equal(anchorToIndex(GROUPED, { offset: 1, affinity: "after" }), 1);
});

test("caret: index inside literal run snaps to nearest unit, ties go right", () => {
  assert.deepEqual(indexToAnchor(GAP, 3), { offset: 2, affinity: "before" });
  assert.deepEqual(indexToAnchor(GAP, 3, "left"), {
    offset: 2,
    affinity: "after",
  });
  assert.deepEqual(indexToAnchor(GAP, 2), { offset: 2, affinity: "after" });
  assert.deepEqual(indexToAnchor(GAP, 4), { offset: 2, affinity: "before" });
});

test("caret: surrogate pair is one unit", () => {
  assert.equal(anchorToIndex(PAIR, { offset: 0, affinity: "after" }), 0);
  assert.equal(anchorToIndex(PAIR, { offset: 1, affinity: "before" }), 2);
  assert.equal(anchorToIndex(PAIR, { offset: 2, affinity: "before" }), 3);
  assert.deepEqual(indexToAnchor(PAIR, 1), { offset: 1, affinity: "after" });
  assert.deepEqual(indexToAnchor(PAIR, 2), { offset: 1, affinity: "after" });
});

test("caret: out-of-range anchors clamp instead of throwing", () => {
  assert.equal(anchorToIndex(GROUPED, { offset: -4, affinity: "after" }), 0);
  assert.equal(anchorToIndex(GROUPED, { offset: 99, affinity: "before" }), 7);
  assert.deepEqual(indexToAnchor(GROUPED, -2), {
    offset: 0,
    affinity: "before",
  });
  assert.deepEqual(indexToAnchor(GROUPED, 99), {
    offset: 6,
    affinity: "after",
  });
});

test("caret: selection round-trips through indices", () => {
  const forward = selectionFromIndices(GROUPED, 1, 5, "forward");
  assert.equal(anchorToIndex(GROUPED, forward.anchor), 1);
  assert.equal(anchorToIndex(GROUPED, forward.focus), 5);
  assert.deepEqual(selectionToIndices(GROUPED, forward), {
    start: 1,
    end: 5,
  });

  const backward = selectionFromIndices(GROUPED, 1, 5, "backward");
  assert.equal(anchorToIndex(GROUPED, backward.anchor), 5);
  assert.equal(anchorToIndex(GROUPED, backward.focus), 1);
  assert.deepEqual(selectionToIndices(GROUPED, backward), {
    start: 1,
    end: 5,
  });
});
