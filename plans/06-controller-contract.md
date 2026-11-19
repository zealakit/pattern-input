# Plan 06 — Field controller, contract constants, conformance vectors

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **6 of 13**. Depends on: 03, 04, 05.
BRD: FR-3, FR-4, FR-6, FR-8–FR-11, FR-16, FR-19, AC-2, AC-7, NFR-2, NFR-3.

## Goal

One DOM-free controller that every adapter uses to run a field: uncontrolled vs controlled
mode, change proposals, undo/redo history, and a subscribe API. Freeze the contract (getter
names, instance API, proposal shape) and ship framework-neutral JSON vectors that every adapter
replays (BRD R3).

## Scope

In: `packages/core/src/controller/`, `packages/core/src/contract.ts`,
`packages/core/tests/vectors/*.json`. Out: DOM (07).

## Design

### Field binding (internal)

```ts
type FieldBinding<TState, TEvent, TValue, TOptions, TResolved> = {
  kind: "number" | "masked" | "otp";
  resolve(options: TOptions): TResolved;
  create(resolved: TResolved, value: TValue | undefined): TState;
  reduce(state: TState, event: TEvent, resolved: TResolved): TState;
  keyToEvent(key: KeyInput, state: TState, resolved: TResolved): TEvent | null;
  valueOf(state: TState): TValue;      // number | null, or string
  sameValue(a: TValue, b: TValue): boolean;
};
export const numberBinding, maskedBinding, otpBinding;
```

### Controller

```ts
export type ValueChange<TValue> = {
  readonly value: TValue;              // rawValue
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly reason: "input" | "paste" | "delete" | "step" | "commit" | "reset" | "undo" | "redo" | "programmatic";
};
export type FieldControllerOptions<TValue, TOptions> = TOptions & {
  value?: TValue;                      // !== undefined ⇒ controlled (number uses null for empty)
  defaultValue?: TValue;
  onValueChange?: (change: ValueChange<TValue>) => void;
  onStatusChange?: (status: FieldStatus) => void;
};
export type FieldController<TState, TEvent, TValue, TOptions> = {
  getState(): TState;                  // stable reference between changes (useSyncExternalStore)
  subscribe(listener: () => void): () => void;
  dispatch(event: TEvent): void;
  handleKey(key: KeyInput): boolean;   // true when handled (binding then preventDefaults)
  setOptions(options: FieldControllerOptions<TValue, TOptions>): void; // per render
  setValue(value: TValue): void;       // programmatic (FR-11)
  clear(): void; undo(): boolean; redo(): boolean;
  destroy(): void;
};
export function createNumberController(...), createMaskedController(...), createOtpController(...);
```

### Modes (FR-8–FR-10, AC-7)

- **Uncontrolled** (`value` absent): reduce → commit state → notify → `onValueChange` once when
  `valueOf` changed (dedupe by `sameValue` + status).
- **Controlled** (`"value" in options && options.value !== undefined`): reduce to a *proposal*
  state; keep the approved state as `getState()`; call `onValueChange(proposal)`; the pending
  proposal is remembered. When the next `setOptions` arrives with `value` equal to the
  proposal's value, the controller adopts the proposal state **including its caret**. If the
  value differs (consumer transformed it), it creates state from the new value with caret at
  end. If no matching value arrives, the approved state stays — the DOM binding re-renders the
  approved text at the end of the event (07), so a rejected paste is never shown (AC-7).
- Controlled without `onValueChange` (and not `readOnly`) → throws `PatternInputError` code
  `CONTROLLED_WITHOUT_HANDLER` at create/`setOptions` (FR-10).
- Mode switch: uncontrolled → controlled adopts `value`; controlled → uncontrolled keeps the
  last approved state and warns once in dev (`process.env.NODE_ENV` is **not** used; a
  `devWarnings` option defaults to `false` — core has no globals). Documented in README.
- Optimistic echo: only composition text (`state.composing.text`) is shown before approval;
  it reconciles at `composeEnd`.

### History (FR-19)

Controller-owned bounded stack (100 entries) of `{ state snapshot }`. Consecutive inserts merge
into one entry until a caret jump, delete, paste, blur or 1 s idle — idle is measured by a
`now()` injected through options (default `Date.now`) so reducers stay pure and tests are
deterministic. `undo`/`redo` restore value **and** caret and go through the same mode rules
(controlled undo is a proposal). Native browser undo is not relied on (documented per adapter).

### Copy/cut text (FR-16)

`getClipboardText(state, binding)` returns the **formatted substring** of the selection (what
the user sees). It always parses back into the same field (paste tolerates literals and group
separators), so copy never yields a value the field cannot accept. Cut = copy + `delete`
selection.

### Contract (`contract.ts`, public)

```ts
export const CONTRACT_VERSION = "1.0.0";
export const GETTER_NAMES = { number: ["getInputProps"], masked: ["getInputProps"],
  otp: ["getGroupProps", "getSlotProps", "getHiddenInputProps"] } as const;
export const INSTANCE_API = ["value", "formattedValue", "status", "setValue", "clear",
  "focus", "undo", "redo"] as const;
```

Every adapter's returned object must expose `GETTER_NAMES[kind]` + `INSTANCE_API` (AC-2).
Adapter-side props are mapped per framework (React camelCase via a shared `toReactProps` table
kept in core: `inputmode→inputMode`, `maxlength→maxLength`, `autocomplete→autoComplete`,
`autocorrect→autoCorrect`, `autocapitalize→autoCapitalize`, `spellcheck→spellCheck`,
`enterkeyhint→enterKeyHint`, `tabindex→tabIndex`, `readonly→readOnly`).

### Conformance vectors

`packages/core/tests/vectors/{number,masked,otp,controlled}.json` — JSON only, no functions:

```json
{ "name": "AC-3 typing over precision", "field": "number",
  "options": { "maximumFractionDigits": 2 },
  "steps": [ { "event": { "type": "focus" } }, { "type": "typeText", "text": "1234.567" } ],
  "expect": { "value": 1234.56, "formattedValue": "1,234.56", "status": "complete", "caret": 8, "changes": 7 } }
```

Step kinds: `event` (dispatch), `typeText` (one insert per char), `key` (`handleKey`),
`approve`/`reject` (controlled: echo or drop the last proposal). Expectations use formatted
UTF-16 caret indices so DOM adapters can assert `selectionStart`. Core runs every vector against
the controller; adapters (08–11) replay them through real DOM events.

## Steps

1. Bindings for the three fields.
2. Controller with modes, dedupe, subscribe; then history.
3. Clipboard helper; `contract.ts`; `toReactProps` table.
4. Vectors: ≥ 8 number, ≥ 8 masked, ≥ 8 OTP, ≥ 5 controlled (incl. AC-7). A vector runner in
   `packages/core/tests/support/run-vector.ts`; adapters copy the pattern, not the file.
5. Public exports: controller factories, `ValueChange`, `FieldController`, `PatternInputError`,
   `CONTRACT_VERSION`, `GETTER_NAMES`.
6. `pnpm check`; skill § "Controller & modes" and § "Contract".

## Tests (`packages/core/tests/controller/*.test.ts` + `vectors.test.ts`)

- `AC-7: controlled paste rejected → state stays approved, caret unchanged`
- `controlled: approved proposal adopts caret`
- `controlled: consumer-transformed value resets caret to end`
- `controlled: missing onValueChange throws CONTROLLED_WITHOUT_HANDLER`
- `uncontrolled: emits once per value change, not on focus/caret moves`
- `mode switch: uncontrolled → controlled adopts value`
- `history: typed run undoes as one step; undo restores caret`
- `history: controlled undo is a proposal`
- `clipboard: copied formatted text pastes back to same value`
- `contract: getter and instance names frozen`
- `vectors: every vector passes against the controller`
- `vectors: files are plain JSON (no functions, structured-clonable)`
- `NFR-3: getState reference stable without changes`

## Acceptance

Tests green; vectors cover AC-3, AC-4, AC-5, AC-7; contract constants exported; no DOM types in
`controller/`.

## Risks

- Controlled adoption across async framework updates (Vue `nextTick`, Svelte effects): the
  pending proposal survives until the next `setOptions`; covered in each adapter plan.
- History merging by time can flake: time is injected.

## Rollback

Delete `controller/`, `contract.ts`, vectors and tests; revert exports.
