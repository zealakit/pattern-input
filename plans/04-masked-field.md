# Plan 04 — Masked field (core)

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **4 of 13**. Depends on: 01, 02.
BRD: FR-2, FR-3, FR-5, FR-6, FR-7, FR-11–FR-15, FR-17, FR-18, FR-21, FR-23, FR-24, FR-31, AC-4.

## Goal

A pure, serializable Masked field with the same event/getter shape as Number, so the controller
(06) and DOM binding (07) stay generic.

## Scope

In: `packages/core/src/masked/` + public exports. Out: modes, history, DOM.

## Design

### Files

```
packages/core/src/masked/
  options.ts  MaskedOptions, resolveMaskedOptions (compiles via lexers/compileMask)
  format.ts   formatMasked(raw, alternative) → { text, map }
  parse.ts    parseMaskedText(text, resolved) → { raw, alternativeIndex, rejectedAt? }
  state.ts    MaskedState, createMaskedState
  reducer.ts  maskedReducer
  keymap.ts   maskedKeyToEvent
  prop-getters.ts getMaskedInputProps
  index.ts
```

### Options

```ts
export type MaskedOptions = {
  mask: string | readonly string[];              // alternatives, first match wins
  tokens?: Record<string, MaskTokenDefinition>;  // custom single-char tokens
  showLiterals?: "filled" | "always";            // default "filled" (see below)
  placeholderChar?: string;                      // only with showLiterals "always", default "_"
  inputMode?: "text" | "numeric";                // default: "numeric" when every slot is a digit, else "text"
  validate?: (raw: string, ctx: { status: FieldStatus; formattedValue: string }) => boolean | string | undefined;
  invalid?: boolean; describedBy?: string; required?: boolean; disabled?: boolean; readOnly?: boolean;
};
```

BRD FR-18 says "text for masked"; `inputMode` defaults to `numeric` only for all-digit masks
because that is the correct mobile keyboard for `999.999.999-99`. Document this as the
interpretation; consumers can force `"text"`.

### State

```ts
export type MaskedState = {
  readonly kind: "masked";
  readonly rawValue: string;         // editable chars only, never literals (FR-5)
  readonly alternativeIndex: number;
  readonly formattedValue: string;
  readonly selection: StickySelection; // raw units
  readonly status: FieldStatus;      // empty | incomplete | complete | invalid
  readonly invalidReason: "consumer" | null;
  readonly focused: boolean;
  readonly composing: { readonly text: string } | null;
  readonly committedRaw: string;
};
```

Status: `""` → empty; required slots unfilled → incomplete (**not** invalid, FR-7/AC-4);
all required filled → complete; consumer `validate` false/string → invalid. Token mismatches
never reach state (rejected), so `invalid` only comes from the consumer.

### Formatting rule (frozen)

`showLiterals: "filled"`: literals are emitted up to the last filled slot, plus literals that
immediately follow it while focused (so typing `123` shows `123.`). `"always"`: the full mask
with `placeholderChar` in empty slots; empty slots are **not** map units, caret clamps to the
first empty slot.

### Reducer rules

- `insert`: for each char, `acceptChar` against the slot at the caret's raw offset; literals
  typed by the user that match the next literal are skipped (typing `.` after `123` is a no-op
  advance, not a rejection). A mismatching char rejects the whole insert (same state). At
  capacity, insert overwrites only the selected units; otherwise rejected. After each change
  re-run `selectAlternative` (first match wins) and reformat.
- `delete`: backward/forward remove one raw unit, skipping literals; Backspace at 0 is a no-op;
  selection delete removes selected units and shifts later raw chars left (raw is a compact
  string, literals are re-derived, so they stay intact).
- `paste`: `extractRaw` (literals and foreign separators dropped, FR-15) then accept as many
  chars as fit; chars beyond capacity are truncated; an incompatible char stops the paste at
  that point **and** rejects the whole paste if nothing was accepted (documented). Caret after
  the last inserted unit.
- Composition: same freeze-and-commit-once rule as Number.
- `move`/`select`: caret in raw units; selecting inside a literal snaps via the map (FR-14).
- `commit`/`blur`: run `validate`, set status; no auto-clear of incomplete values.
- `setValue(raw: string)`: parse through `extractRaw` + fit; caret at end (FR-11).

### Key map

Same as Number minus step keys. Enter → `commit`, Escape → `reset`, Tab/modified/composing →
`null`.

### Getter

`getMaskedInputProps(state, resolved)` → `{ type: "text", inputmode, autocomplete: "off",
autocorrect: "off", spellcheck: "false", autocapitalize: hasLetterSlots ? "characters" if all
letter slots transform upper else "off", maxlength: longest formatted length,
"aria-invalid"?: "true" (only invalid), "aria-describedby"?, "aria-required"? }`. No `role`,
no `placeholder` (consumer-owned).

## Steps

1. Options/format/parse with tests.
2. State and reducer; key map; getter.
3. Public exports: `createMaskedState`, `maskedReducer`, `maskedKeyToEvent`,
   `getMaskedInputProps`, `formatMasked`, `parseMaskedText`, types.
4. `pnpm check`; skill § "Masked".

## Tests (`packages/core/tests/masked/*.test.ts`)

- `AC-4: paste 123.456.789-00 → raw 12345678900, "123.456.789-00", complete`
- `AC-4: paste 12345 → incomplete, no aria-invalid`
- `masked: raw never contains literals`
- `masked: typing the next literal advances instead of rejecting`
- `masked: letter into digit slot rejected, state identical`
- `masked: backspace over literal deletes previous slot char`
- `masked: select inside literal snaps to nearest slot`
- `masked: overlong paste truncated to capacity`
- `masked: alternatives — first match wins and switches as raw grows`
- `masked: optional group complete when absent`
- `masked: showLiterals always with placeholder char`
- `masked: custom upper token transforms input`
- `masked: composition commits once`
- `masked: consumer validate marks invalid`
- `masked: getter stable; numeric inputmode for all-digit mask`

## Acceptance

Tests green; AC-4 test asserts raw, formatted, status and absent `aria-invalid`.

## Risks

- Alternative switching while typing can move literals under the caret: the caret is in raw
  units, so it stays correct by construction — covered by a test.
- Greedy repeat + truncation: capacity is computed per alternative; truncation uses remaining
  capacity, not token count.

## Rollback

Delete `packages/core/src/masked/`, its tests and exports.
