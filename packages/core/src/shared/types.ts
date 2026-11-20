/** Status shared by every field (BRD: empty ≠ zero, incomplete ≠ invalid). */
export type FieldStatus = "empty" | "incomplete" | "complete" | "invalid";

/** Which side of a raw-unit boundary a caret sticks to. */
export type Affinity = "before" | "after";

/** Direction of a non-collapsed selection, independent of anchor/focus order. */
export type SelectionDirection = "forward" | "backward";

/**
 * Position in raw-value units (0..rawLength), never a formatted-string index.
 *
 * `before` sits immediately before raw unit `offset` (skipping literals to
 * its left); `after` sits immediately after raw unit `offset - 1`. At offset 0
 * `after` is the start of the text, and at offset n `before` is its end.
 */
export type StickyAnchor = {
  readonly offset: number;
  readonly affinity: Affinity;
};

export type StickySelection = {
  readonly anchor: StickyAnchor;
  readonly focus: StickyAnchor;
};

/** Events every field understands; each field extends this union. */
export type BaseFieldEvent<TValue> =
  | { readonly type: "insert"; readonly text: string }
  | {
      readonly type: "delete";
      readonly direction: "backward" | "forward";
      readonly unit: "char" | "word" | "line";
    }
  | { readonly type: "paste"; readonly text: string }
  | { readonly type: "composeStart" }
  | { readonly type: "composeUpdate"; readonly text: string }
  | { readonly type: "composeEnd"; readonly text: string }
  | {
      readonly type: "move";
      readonly to: "prev" | "next" | "start" | "end";
      readonly extend: boolean;
    }
  | { readonly type: "select"; readonly selection: StickySelection }
  | { readonly type: "commit" }
  | { readonly type: "focus" }
  | { readonly type: "blur" }
  | { readonly type: "reset" }
  | { readonly type: "setValue"; readonly value: TValue };

/** Keyboard input, normalized by the adapter before it reaches core. */
export type KeyInput = {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly isComposing: boolean;
};
