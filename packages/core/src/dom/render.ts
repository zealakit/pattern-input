import { selectionToIndices } from "../shared/index.js";
import type { FieldView } from "../controller/controller.js";

export type RenderGuard = { applying: boolean };

/**
 * Write the approved state to the element: value first, then selection, both
 * under a guard so the resulting `input`/`select` events are ignored.
 */
export function paintInput(
  el: HTMLInputElement,
  view: FieldView,
  guard: RenderGuard,
): { readonly valueChanged: boolean } {
  let valueChanged = false;

  if (el.value !== view.text) {
    guard.applying = true;
    el.value = view.text;
    guard.applying = false;
    valueChanged = true;
  }

  const range = selectionToIndices(view.map, view.selection);
  if (el.selectionStart !== range.start || el.selectionEnd !== range.end) {
    guard.applying = true;
    el.setSelectionRange(range.start, range.end);
    guard.applying = false;
  }

  return { valueChanged };
}
