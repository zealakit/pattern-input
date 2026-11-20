# Plan 01 — Core foundations: shared types, editable map, sticky caret

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **1 of 13**. Depends on: 00. BRD: FR-1, FR-12, FR-13, FR-14, R1.

## Goal

Lock the caret model before any field exists (BRD R1). Add the DOM-free types and pure helpers
that every field reducer and the DOM binding share: field status, events, sticky selection
anchored in **raw-value units**, the editable map that links raw units to formatted-string
offsets, and normalized key input.

## Scope

In: `packages/core/src/shared/`. Exports from the core pure entry only what plan 03+ consume.

Out: field logic, lexers (02), controller (06), DOM (07).

## Design

### Files

```
packages/core/src/shared/
  types.ts        FieldStatus, Affinity, StickyAnchor, StickySelection, BaseFieldEvent, KeyInput
  editable-map.ts EditableMap + conversions
  sticky.ts       selection helpers + remap after edit
  keys.ts         KeyInput helpers (isModified, isWordModifier per platform flag)
  index.ts        barrel (internal; core src/index.ts re-exports the public subset)
```

### Types

```ts
export type FieldStatus = "empty" | "incomplete" | "complete" | "invalid";
export type Affinity = "before" | "after";

/** Position in raw-value units (0..rawLength), never a formatted-string index. */
export type StickyAnchor = { readonly offset: number; readonly affinity: Affinity };
export type StickySelection = { readonly anchor: StickyAnchor; readonly focus: StickyAnchor };

/** Events every field understands (BRD §8). Fields extend this union. */
export type BaseFieldEvent<TValue> =
  | { readonly type: "insert"; readonly text: string }
  | { readonly type: "delete"; readonly direction: "backward" | "forward"; readonly unit: "char" | "word" | "line" }
  | { readonly type: "paste"; readonly text: string }
  | { readonly type: "composeStart" }
  | { readonly type: "composeUpdate"; readonly text: string }
  | { readonly type: "composeEnd"; readonly text: string }
  | { readonly type: "move"; readonly to: "prev" | "next" | "start" | "end"; readonly extend: boolean }
  | { readonly type: "select"; readonly selection: StickySelection }
  | { readonly type: "commit" }
  | { readonly type: "focus" }
  | { readonly type: "blur" }
  | { readonly type: "reset" }
  | { readonly type: "setValue"; readonly value: TValue };

export type KeyInput = {
  readonly key: string; readonly shiftKey: boolean; readonly altKey: boolean;
  readonly ctrlKey: boolean; readonly metaKey: boolean; readonly isComposing: boolean;
};
```

### Editable map

A formatter returns `{ text, map }`. The map lists, for each raw unit `i`, its UTF-16 range in
the formatted text:

```ts
export type EditableMap = {
  readonly textLength: number;                                  // UTF-16 length of formatted text
  readonly units: readonly { readonly start: number; readonly end: number }[]; // per raw unit
};
```

Storing UTF-16 ranges (not code points) lets the DOM binding use `selectionStart` directly and
still treats a surrogate pair as one unit (`end - start === 2`).

Conversions (the **only** legal ones):

- `anchorToIndex(map, anchor)` → UTF-16 offset. `offset === 0` → start of unit 0 (or 0);
  `offset === n` → end of unit n-1; between units, `affinity: "before"` sticks to the end of
  unit `offset-1`, `"after"` to the start of unit `offset`. Literals between them are skipped
  accordingly.
- `indexToAnchor(map, index, bias: "left" | "right" | "nearest")` → anchor. An index inside a
  literal run snaps to the nearest unit boundary (FR-14); ties go right; inside a surrogate pair
  snaps to the pair's boundary.
- `selectionFromIndices(map, start, end, direction)` / `selectionToIndices(map, selection)`.

### Sticky helpers

- `caret(offset, affinity?)`, `isCollapsed`, `normalize(selection, rawLength)` (clamp; ordered
  start/end view without losing direction), `selectedRange(selection)` → `{ start, end }`.
- `remapAfterEdit(selection, edit: { at; removed; inserted })` in raw units: anchors before
  `at` stay; anchors after `at + removed` shift by `inserted - removed`; anchors inside the
  removed range collapse to `at + inserted` with `affinity: "before"`.
- `moveCaret(selection, to, extend, rawLength)` for `move` events (Home/End/arrows).

### Keys

`isModified(key)` (ctrl/meta/alt), `isWordDelete(key, platform: "mac" | "other")` (Alt on mac,
Ctrl elsewhere). Platform is passed in by the DOM binding; core never reads `navigator`.

## Steps

1. Create the five files above; no imports outside `shared/`.
2. Implement map conversions and sticky helpers as pure total functions (no throws for
   out-of-range input: clamp).
3. Re-export the public types (`FieldStatus`, `StickySelection`, `StickyAnchor`, `Affinity`)
   from `packages/core/src/index.ts`; keep helpers internal (exported from `shared/index.ts`
   for in-core use and tests via `dist/shared/index.js`).
4. Write tests (below). Run `pnpm --filter @zealakit/pattern-input-core test` and
   `pnpm typecheck` (pure tsconfig must pass).
5. Update `.agents/skills/pattern-input/SKILL.md` § "Caret model" with the rules above.

## Tests (`packages/core/tests/shared/*.test.ts`, no happy-dom)

- `caret: anchor maps across a literal run with before/after affinity`
- `caret: index inside literal run snaps to nearest unit, ties go right`
- `caret: surrogate pair is one unit`
- `caret: offset 0 and offset n map to text edges`
- `sticky: insert before anchor shifts it`
- `sticky: delete covering anchor collapses to edit point`
- `sticky: edit at anchor respects affinity`
- `sticky: normalize clamps and keeps direction`
- `sticky: move start/end/prev/next with and without extend`
- `keys: word delete modifier per platform`

## Acceptance

- Tests green; `tsconfig.pure.json` typecheck green; built `dist/` has no `any` in `.d.ts`.
- `rg "window|document|navigator" packages/core/src/shared` is empty.

## Risks

- R1: getting affinity wrong here propagates to every field. Mitigation: table tests over a
  fixed formatted sample (`"1,234.5"`, `"123.456-7"`) for every index 0..textLength.
- UTF-16 vs code points: decided here (UTF-16 ranges); never convert elsewhere.

## Rollback

Delete `packages/core/src/shared/`, its tests, and the re-exports; revert the plan commit.
