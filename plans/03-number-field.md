# Plan 03 — Number field (core)

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **3 of 13**. Depends on: 01, 02.
BRD: FR-2, FR-3, FR-5, FR-6, FR-7, FR-11, FR-12, FR-13, FR-15, FR-17, FR-18, FR-20, FR-23,
FR-24, FR-31, AC-3, AC-6 (core part).

## Goal

A pure, serializable Number field: options, format/parse, reducer, key map, and the
`getInputProps` getter. No DOM, no controller (06).

## Scope

In: `packages/core/src/number/`, public exports from the core entry.
Out: controlled/uncontrolled handling, undo history (06), DOM events (07).

## Design

### Files

```
packages/core/src/number/
  options.ts      NumberOptions, resolveNumberOptions
  format.ts       formatNumber(rawText, resolved) → { text, map }
  parse.ts        parseNumberText(text, resolved) → ParseResult
  state.ts        NumberState, createNumberState
  reducer.ts      numberReducer
  keymap.ts       numberKeyToEvent
  prop-getters.ts getNumberInputProps
  index.ts
```

### Options

```ts
export type NumberOptions = {
  locale?: string;                 // separators via Intl.formatToParts (D9)
  decimalSeparator?: string;       // overrides locale
  groupSeparator?: string;         // "" disables grouping
  minimumFractionDigits?: number;  // default 0; applied on commit
  maximumFractionDigits?: number;  // default 20; 0 → integer field
  rounding?: "truncate" | "round-half-up" | "round-half-even"; // programmatic setValue + commit; default "round-half-up"
  min?: number; max?: number;
  step?: number;                   // default 1
  largeStep?: number;              // PageUp/PageDown, default step * 10
  allowNegative?: boolean;         // default min === undefined || min < 0
  clampBehavior?: "blur" | "none"; // default "blur": clamp on commit/blur; "none": keep + status invalid(range)
  validate?: (value: number | null, ctx: { status: FieldStatus }) => boolean | string | undefined;
  invalid?: boolean;               // consumer-forced aria-invalid
  describedBy?: string; required?: boolean; disabled?: boolean; readOnly?: boolean;
};
```

`resolveNumberOptions` throws `NumberOptionsError` for identical separators, a separator that is
a digit or `-`, `min > max`, or negative fraction digits. Result is frozen and cached per options
object identity.

### State (serializable, FR-2)

```ts
export type NumberState = {
  readonly kind: "number";
  readonly rawText: string;          // canonical: "", "-", "12.", "-1234.50"  (decimal is ".")
  readonly rawValue: number | null;  // derived from rawText
  readonly formattedValue: string;   // derived
  readonly selection: StickySelection; // offsets in rawText units
  readonly status: FieldStatus;      // empty | incomplete ("-", "12.") | complete | invalid
  readonly invalidReason: "range" | "consumer" | null;
  readonly focused: boolean;
  readonly composing: { readonly text: string } | null;
  readonly committedRawText: string; // value at focus time, for Escape revert
};
```

`rawText` makes "12." and "1.50" representable while typing (D6); on commit it normalizes to
`padFraction(roundDecimal(...), minimumFractionDigits)` so after commit
`formattedValue === formatNumber(fromNumber(rawValue))` (FR-5).

### Formatting (`format.ts`)

Insert group separators every 3 integer digits; decimal `.` → `decimalSeparator`; sign `-`
prefix. Each rawText char is one map unit; group separators are literals (not units). Never uses
`Intl.NumberFormat#format` (only `formatToParts` at option resolution).

### Reducer rules

- Pure `numberReducer(state, event, resolved): NumberState`. No-op returns the **same object**
  (NFR-3); otherwise a new frozen object.
- `insert`: lex the candidate `rawText` (selection replaced by text). Reject (same state) when:
  non-digit, second decimal, decimal while `maximumFractionDigits === 0`, sign not at offset 0
  or `allowNegative` false, fraction digits > `maximumFractionDigits` (AC-3: the `7` in
  `1234.567` is rejected, never rounded while typing), magnitude > MAX_SAFE_INTEGER. Typing
  the locale decimal **or** `.` inserts the decimal (mobile keypads). Typing `-` anywhere
  toggles the sign and keeps the caret.
- `delete`: removes raw units; caret on a group separator deletes the adjacent digit in the
  direction of travel; `unit: "word"` deletes to the integer/fraction boundary; `"line"` to the
  edge.
- `paste`: lex the pasted text with the field syntax; on failure retry once with swapped
  separators only when the paste contains exactly one separator and it is the opposite one
  (documented heuristic); reject if still invalid or over-precision. Accepted paste replaces the
  selection; caret lands after the inserted units (FR-15).
- `composeStart` sets `composing`; `composeUpdate` updates `composing.text` only;
  `composeEnd` clears `composing` and applies the result as one `insert` (FR-17). No other
  event changes `rawText` while composing except `blur` (which ends composition first).
- `move`/`select`: caret only. `step` (`{ type: "step"; direction: 1 | -1; large: boolean }`):
  `stepDecimal` from current value (empty → `min ?? 0`), clamped to min/max, caret to end.
- `commit` / `blur`: normalize rawText; `"-"` / `"12."` → `""` / `"12"`; apply clamp per
  `clampBehavior`; run `validate`; set `status`/`invalidReason`. `blur` also sets
  `focused: false`. `focus` stores `committedRawText`.
- `reset`: restore `committedRawText`. `setValue(number | null)`: round per `rounding`, format,
  caret at end with `affinity: "before"` (FR-11, documented).

### Key map

`numberKeyToEvent(key: KeyInput, state, resolved): NumberEvent | null` — ArrowLeft/Right `move`
(Shift extends), Home/End, Backspace/Delete (+ word modifier), ArrowUp/Down `step`,
PageUp/PageDown large step, Enter → `commit`, Escape → `reset`. Tab, other modified keys and
anything while `isComposing` return `null` (fall through, FR-13).

### Getter

`getNumberInputProps(state, resolved)` returns DOM-attribute-shaped props:

```ts
{ type: "text", inputmode: maxFrac > 0 ? "decimal" : "numeric", autocomplete: "off",
  autocorrect: "off", spellcheck: "false", "aria-invalid"?: "true", "aria-describedby"?: string,
  "aria-required"?: "true", "aria-valuemin"? ... }
```

- No `role` (native input already is a textbox; no `role="spinbutton"` in v1 — documented,
  FR-24).
- `aria-invalid` only when `status === "invalid"` or `invalid: true`; never for incomplete.
- `enterkeyhint: "done"`; `disabled`/`readonly` passed through.
- Deterministic: same `(state, resolved)` → deep-equal object; memoize on identity.

## Steps

1. Options + format + parse, with tests.
2. State + reducer (insert/delete/paste/compose), then commit/blur/step/reset/setValue.
3. Key map and getter.
4. Export public surface from `packages/core/src/index.ts`: `createNumberState`,
   `numberReducer`, `numberKeyToEvent`, `getNumberInputProps`, `formatNumber`,
   `parseNumberText`, types `NumberOptions`, `NumberState`, `NumberEvent`.
5. `pnpm check`; update skill § "Number".

## Tests (`packages/core/tests/number/*.test.ts`)

- `AC-3: typing 1234.567 with maximumFractionDigits 2 → rawValue 1234.56, "1,234.56", caret after 6`
- `number: grouping insert keeps caret after typed digit`
- `number: backspace on group separator deletes previous digit`
- `number: de-DE formats 1.234,56; explicit separators override locale`
- `number: "." inserts locale decimal on de-DE`
- `number: empty is not zero; "-" and "12." are incomplete`
- `number: over-precision paste rejected, state identical`
- `number: paste "1.234,56 €" into de-DE field → 1234.56`
- `number: composition commits once at composeEnd` (AC-6 core)
- `number: commit clamps to max; clampBehavior none → invalid(range)`
- `number: minimumFractionDigits pads on commit only`
- `number: step uses decimal math and clamps`
- `number: setValue rounds per mode and puts caret at end`
- `number: Escape resets to focus-time value`
- `number: no-op returns identical state reference`
- `number: getter stable, no role, aria-invalid only when invalid`
- `number: format(parse(x)) round-trip over the documented matrix` (FR-6)

## Acceptance

All tests green; pure typecheck green; the AC-3 test asserts value, formatted string and
`anchorToIndex` caret = 8.

## Risks

- "Stuck" feeling when over-precision keys are rejected: documented; consumers can raise
  `maximumFractionDigits` and round on commit.
- `Intl` separator differences between Node and browsers (NNBSP vs NBSP): treat all space-like
  group separators as equivalent when lexing (02); READMEs recommend explicit separators for SSR.

## Rollback

Delete `packages/core/src/number/`, its tests and exports.
