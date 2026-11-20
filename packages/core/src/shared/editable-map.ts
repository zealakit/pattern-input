import type {
  SelectionDirection,
  StickyAnchor,
  StickySelection,
} from "./types.js";

/** UTF-16 range of one raw unit inside the formatted text. */
export type EditableUnit = {
  readonly start: number;
  readonly end: number;
};

/**
 * A formatter returns `{ text, map }`. `units[i]` is the UTF-16 range of raw
 * unit `i`; ranges are half-open (`end` is exclusive). Using UTF-16 (not code
 * points) lets the DOM binding feed `selectionStart` directly and still treats
 * a surrogate pair as one unit (`end - start === 2`).
 */
export type EditableMap = {
  readonly textLength: number;
  readonly units: readonly EditableUnit[];
};

/** Which boundary to prefer when an index cannot be represented exactly. */
export type IndexBias = "left" | "right" | "nearest";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toOffset(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

/**
 * Map a sticky anchor to a UTF-16 index in the formatted text.
 * This function and `indexToAnchor` are the only legal conversions.
 */
export function anchorToIndex(map: EditableMap, anchor: StickyAnchor): number {
  const count = map.units.length;
  if (count === 0) {
    return 0;
  }

  const offset = clamp(toOffset(anchor.offset), 0, count);
  if (offset === 0) {
    return anchor.affinity === "before" ? map.units[0].start : 0;
  }
  if (offset === count) {
    return anchor.affinity === "before"
      ? map.textLength
      : map.units[count - 1].end;
  }
  return anchor.affinity === "before"
    ? map.units[offset].start
    : map.units[offset - 1].end;
}

/**
 * Map a UTF-16 index back to the nearest sticky anchor (FR-14).
 * An index inside a literal run snaps to the closest unit boundary; on a tie
 * the right-hand boundary wins unless `bias` says otherwise.
 */
export function indexToAnchor(
  map: EditableMap,
  index: number,
  bias: IndexBias = "nearest",
): StickyAnchor {
  const count = map.units.length;
  if (count === 0) {
    return { offset: 0, affinity: "before" };
  }

  const index_ = clamp(toOffset(index), 0, map.textLength);
  const first = map.units[0];
  const last = map.units[count - 1];

  if (index_ < first.start) {
    return bias === "left"
      ? { offset: 0, affinity: "after" }
      : { offset: 0, affinity: "before" };
  }
  if (index_ > last.end) {
    return bias === "left"
      ? { offset: count, affinity: "after" }
      : { offset: count, affinity: "before" };
  }

  for (let unitIndex = 0; unitIndex < count; unitIndex += 1) {
    const unit = map.units[unitIndex];
    if (index_ < unit.start || index_ > unit.end) {
      continue;
    }
    if (index_ === unit.start) {
      return { offset: unitIndex, affinity: "before" };
    }
    if (index_ === unit.end) {
      return { offset: unitIndex + 1, affinity: "after" };
    }
    const toStart = index_ - unit.start;
    const toEnd = unit.end - index_;
    return toStart < toEnd
      ? { offset: unitIndex, affinity: "before" }
      : { offset: unitIndex + 1, affinity: "after" };
  }

  for (let unitIndex = 1; unitIndex < count; unitIndex += 1) {
    const left = map.units[unitIndex - 1].end;
    const right = map.units[unitIndex].start;
    if (index_ <= left || index_ >= right) {
      continue;
    }
    const toLeft = index_ - left;
    const toRight = right - index_;
    if (toLeft < toRight) {
      return { offset: unitIndex, affinity: "after" };
    }
    if (toRight < toLeft) {
      return { offset: unitIndex, affinity: "before" };
    }
    return bias === "left"
      ? { offset: unitIndex, affinity: "after" }
      : { offset: unitIndex, affinity: "before" };
  }

  return { offset: count, affinity: "after" };
}

/** Build a selection from DOM-like indices; `direction` decides anchor/focus. */
export function selectionFromIndices(
  map: EditableMap,
  start: number,
  end: number,
  direction: SelectionDirection,
): StickySelection {
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const startAnchor = indexToAnchor(map, low);
  const endAnchor = indexToAnchor(map, high);
  return direction === "forward"
    ? { anchor: startAnchor, focus: endAnchor }
    : { anchor: endAnchor, focus: startAnchor };
}

/** Ordered UTF-16 range of a selection, in the formatted text. */
export function selectionToIndices(
  map: EditableMap,
  selection: StickySelection,
): { readonly start: number; readonly end: number } {
  const anchorIndex = anchorToIndex(map, selection.anchor);
  const focusIndex = anchorToIndex(map, selection.focus);
  return {
    start: Math.min(anchorIndex, focusIndex),
    end: Math.max(anchorIndex, focusIndex),
  };
}
