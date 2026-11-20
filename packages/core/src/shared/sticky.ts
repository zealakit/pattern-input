import type {
  Affinity,
  SelectionDirection,
  StickyAnchor,
  StickySelection,
} from "./types.js";

/** Ordered view of a selection that keeps its direction. */
export type NormalizedSelection = {
  readonly start: StickyAnchor;
  readonly end: StickyAnchor;
  readonly direction: SelectionDirection;
  readonly collapsed: boolean;
};

/** A single edit expressed in raw units. */
export type EditRange = {
  readonly at: number;
  readonly removed: number;
  readonly inserted: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toOffset(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

/**
 * Order two anchors by text position. At the same offset `after` points to the
 * end of the previous unit and `before` to the start of the next one, so
 * `after` sorts first.
 */
function compareAnchors(left: StickyAnchor, right: StickyAnchor): number {
  if (left.offset !== right.offset) {
    return left.offset < right.offset ? -1 : 1;
  }
  if (left.affinity === right.affinity) {
    return 0;
  }
  return left.affinity === "after" ? -1 : 1;
}

/** Collapsed caret at a raw-unit boundary. */
export function caret(
  offset: number,
  affinity: Affinity = "after",
): StickySelection {
  const anchor: StickyAnchor = { offset: toOffset(offset), affinity };
  return { anchor, focus: anchor };
}

/** A selection is collapsed when both ends are the same anchor. */
export function isCollapsed(selection: StickySelection): boolean {
  return (
    selection.anchor.offset === selection.focus.offset &&
    selection.anchor.affinity === selection.focus.affinity
  );
}

/** Clamp a selection to `[0, rawLength]` without losing its direction. */
export function normalize(
  selection: StickySelection,
  rawLength: number,
): NormalizedSelection {
  const max = Math.max(0, toOffset(rawLength));
  const anchor: StickyAnchor = {
    offset: clamp(toOffset(selection.anchor.offset), 0, max),
    affinity: selection.anchor.affinity,
  };
  const focus: StickyAnchor = {
    offset: clamp(toOffset(selection.focus.offset), 0, max),
    affinity: selection.focus.affinity,
  };
  const order = compareAnchors(anchor, focus);
  const forward = order <= 0;
  return {
    start: forward ? anchor : focus,
    end: forward ? focus : anchor,
    direction: forward ? "forward" : "backward",
    collapsed: order === 0,
  };
}

/** Ordered raw-unit offsets of a selection. */
export function selectedRange(selection: StickySelection): {
  readonly start: number;
  readonly end: number;
} {
  const anchor = toOffset(selection.anchor.offset);
  const focus = toOffset(selection.focus.offset);
  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) };
}

/**
 * Re-anchor a selection after an edit expressed in raw units.
 *
 * - anchors before `at` stay;
 * - anchors after `at + removed` shift by `inserted - removed`;
 * - anchors strictly inside a removed range collapse to `at + inserted` with
 *   `before` affinity;
 * - an insertion exactly at an anchor respects its affinity: `before` stays,
 *   `after` moves past the inserted text.
 */
export function remapAfterEdit(
  selection: StickySelection,
  edit: EditRange,
): StickySelection {
  return {
    anchor: remapAnchor(selection.anchor, edit),
    focus: remapAnchor(selection.focus, edit),
  };
}

function remapAnchor(anchor: StickyAnchor, edit: EditRange): StickyAnchor {
  const at = toOffset(edit.at);
  const removed = Math.max(0, toOffset(edit.removed));
  const inserted = Math.max(0, toOffset(edit.inserted));
  const end = at + removed;
  const offset = toOffset(anchor.offset);

  if (offset < at) {
    return anchor;
  }
  if (offset > end) {
    return { offset: offset + inserted - removed, affinity: anchor.affinity };
  }
  if (offset === at) {
    if (removed === 0) {
      return anchor.affinity === "before" ? anchor : caret(at + inserted).focus;
    }
    return { offset: at, affinity: anchor.affinity };
  }
  if (offset === end) {
    return { offset: at + inserted, affinity: anchor.affinity };
  }
  return { offset: at + inserted, affinity: "before" };
}

/** Apply a `move` event (arrows, Home/End) to a selection. */
export function moveCaret(
  selection: StickySelection,
  to: "prev" | "next" | "start" | "end",
  extend: boolean,
  rawLength: number,
): StickySelection {
  const max = Math.max(0, toOffset(rawLength));
  const focusOffset = clamp(toOffset(selection.focus.offset), 0, max);
  let target = focusOffset;

  switch (to) {
    case "prev":
      target = Math.max(0, focusOffset - 1);
      break;
    case "next":
      target = Math.min(max, focusOffset + 1);
      break;
    case "start":
      target = 0;
      break;
    case "end":
      target = max;
      break;
  }

  if (target === focusOffset && !extend) {
    return selection;
  }
  const next: StickyAnchor = { offset: target, affinity: "after" };
  return extend
    ? { anchor: selection.anchor, focus: next }
    : { anchor: next, focus: next };
}
