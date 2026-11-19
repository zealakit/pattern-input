import {
  type EditableMap,
  selectionFromIndices,
  type SelectionDirection,
  selectionToIndices,
  type StickySelection,
} from "../shared/index.js";

/** Read the DOM selection as sticky anchors in the formatted text. */
export function selectionFromDom(
  el: HTMLInputElement,
  map: EditableMap,
): StickySelection {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  const direction: SelectionDirection =
    el.selectionDirection === "backward" ? "backward" : "forward";
  return selectionFromIndices(map, start, end, direction);
}

/** UTF-16 range of a sticky selection inside the formatted text. */
export function domRangeOf(
  map: EditableMap,
  selection: StickySelection,
): { readonly start: number; readonly end: number } {
  return selectionToIndices(map, selection);
}

/** Plain-text substring currently selected (what copy/cut put on the clipboard). */
export function selectedText(
  text: string,
  map: EditableMap,
  selection: StickySelection,
): string {
  const range = domRangeOf(map, selection);
  return text.slice(range.start, range.end);
}
