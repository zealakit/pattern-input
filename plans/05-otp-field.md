# Plan 05 — OTP field (core)

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **5 of 13**. Depends on: 01.
BRD: FR-2, FR-3, FR-5, FR-7, FR-11, FR-13, FR-15, FR-17, FR-18, FR-22–FR-25, AC-5, NFR-3.

## Goal

A pure OTP field with N slots (D8): per-slot entry, auto-advance/retreat, paste distribution,
autofill, an aggregate value with a completeness flag, and group/slot/hidden-input getters that
expose one accessible control.

## Scope

In: `packages/core/src/otp/` + public exports. Out: DOM focus moves (07 performs them from
`state.activeIndex`), modes/history (06).

## Design

### Files

```
packages/core/src/otp/
  options.ts  OtpOptions, resolveOtpOptions
  state.ts    OtpState, createOtpState
  reducer.ts  otpReducer
  keymap.ts   otpKeyToEvent
  prop-getters.ts getOtpGroupProps, getOtpSlotProps, getOtpHiddenInputProps
  index.ts
```

### Options

```ts
export type OtpOptions = {
  length: number;                         // 1..32 (NFR-3 tested at 20)
  type?: "numeric" | "alphanumeric";      // default "numeric"
  transform?: "upper" | "lower";          // alphanumeric only
  autocomplete?: "one-time-code" | "off"; // default "one-time-code"
  name?: string;                          // hidden input name
  label?: string;                         // group accessible name when no labelledBy
  labelledBy?: string; describedBy?: string;
  slotLabel?: (index: number, length: number) => string; // default "Character {i} of {n}"
  validate?: (raw: string, ctx: { status: FieldStatus }) => boolean | string | undefined;
  invalid?: boolean; disabled?: boolean; required?: boolean;
};
```

### State

```ts
export type OtpState = {
  readonly kind: "otp";
  readonly slots: readonly string[];   // "" for empty; length === options.length
  readonly activeIndex: number;        // slot that should own DOM focus
  readonly rawValue: string;           // slots joined; gaps removed (FR-5)
  readonly formattedValue: string;     // === rawValue (no literals)
  readonly selection: StickySelection; // offset = activeIndex, kept for contract uniformity
  readonly status: FieldStatus;        // empty | incomplete | complete | invalid
  readonly invalidReason: "consumer" | null;
  readonly focused: boolean;
  readonly composing: { readonly text: string; readonly index: number } | null;
};
```

### Events

Base events plus `{ type: "focusSlot"; index: number }`. Insert/delete apply to `activeIndex`.

### Reducer rules (frozen semantics, documented in README)

- `insert` with one char: accept per `type`, write to `activeIndex`, advance by one (clamp at
  last). Invalid char → same state. Insert with >1 char (autofill or mobile keyboards that
  send the whole code into one slot) → treated as `paste` starting at `activeIndex`.
- `paste`: filter to accepted chars, distribute from slot 0 when the paste length ≥ `length`,
  otherwise from `activeIndex`; overflow truncated; `activeIndex` = last filled slot (AC-5).
- `delete backward`: if active slot filled → clear it and stay; if empty → clear previous slot
  and move to it (AC-5 "backspace from the last slot clears and retreats": the last slot is
  filled after a paste, so the first Backspace clears it; the next retreats). `delete forward`
  clears active slot, no move. `unit: "line"` clears all and moves to 0.
- `move prev/next/start/end` → change `activeIndex` only (ArrowLeft/Right/Home/End).
- `focusSlot(i)`: moves to `min(i, firstEmptyIndex)` so focus order survives deletion
  (FR-22) — clicking an empty slot past a gap lands on the first gap.
- Composition: commit once at `composeEnd`; a multi-char result is handled as `paste`.
- `commit`/`blur`: run `validate`. `reset` clears all. `setValue(string)` distributes from 0,
  `activeIndex` = first empty or last.
- Focus-only events return the same reference when nothing changes, so the controller never
  emits a value change for focus moves (AC-5 "emitted once per change").

### Getters

- `getOtpGroupProps(state, resolved)` → `{ role: "group", "aria-label"?: label,
  "aria-labelledby"?, "aria-describedby"?, "aria-invalid"?: "true", "aria-disabled"? }`
  (FR-25: one accessible control).
- `getOtpSlotProps(state, resolved, index)` → `{ type: "text", inputmode: numeric ? "numeric"
  : "text", pattern: numeric ? "[0-9]*" : undefined, autocomplete: index === 0 ?
  resolved.autocomplete : "off", maxlength: index === 0 ? length : 1, "aria-label":
  slotLabel(index), tabindex: index === state.activeIndex ? 0 : -1, autocorrect: "off",
  spellcheck: "false", autocapitalize: "off" }`. Slot 0 allows `maxlength = length` so iOS/Android
  autofill can drop the whole code into it (handled as paste). Roving tabindex: Tab enters the
  group once and Tab leaves it (FR-13).
- `getOtpHiddenInputProps(state, resolved)` → `{ type: "hidden", name, value: rawValue,
  required? }` for form submission.

## Steps

1. Options/state/reducer with tests (AC-5 first).
2. Key map: Backspace/Delete, arrows, Home/End, Enter → commit; Tab/composing → `null`.
3. Getters.
4. Public exports: `createOtpState`, `otpReducer`, `otpKeyToEvent`, the three getters, types.
5. `pnpm check`; skill § "OTP".

## Tests (`packages/core/tests/otp/*.test.ts`)

- `AC-5: paste 6 digits fills all slots, activeIndex 5`
- `AC-5: backspace on filled last slot clears it, next backspace retreats`
- `AC-5: paste produces exactly one state change`
- `otp: insert advances; at last slot stays`
- `otp: non-digit rejected in numeric mode`
- `otp: multi-char insert into slot 0 is treated as paste (autofill)`
- `otp: focusSlot past a gap lands on first empty`
- `otp: rawValue compacts gaps; status incomplete, not invalid`
- `otp: group has role group and accessible name; slots have roving tabindex`
- `otp: only slot 0 has autocomplete one-time-code`
- `otp: hidden input carries rawValue and name`
- `otp: focus-only event returns identical reference`
- `NFR-3: 1000 reduces on a 20-slot OTP average under 0.1 ms each` (sanity bound, not a benchmark)

## Acceptance

Tests green; the AC-5 trace yields one new state for the paste; getters deterministic.

## Risks

- Backspace semantics differ between OTP libraries: the rule above is frozen and documented.
- Slot 0 `maxlength = length` is a deliberate autofill trade-off; plan 12 verifies it on iOS
  Safari and Chrome Android manually.

## Rollback

Delete `packages/core/src/otp/`, its tests and exports.
