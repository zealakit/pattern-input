# Pattern Input — architecture and contract skill

Compact pre-read for code, test, docs, and release work in this repository. Plan 00 creates the
skeleton and records the decisions below; every section marked **filled by plan NN** is still
empty on purpose (no speculative code, no placeholder APIs).

## What this is

Headless behavioral primitives for three specialized fields — number, masked, and one-time-code
(OTP) — for Vanilla TypeScript, React, Vue, and Svelte. The library owns formatting, caret/selection,
keyboard handling, paste, IME, and ARIA. It owns no styles, no themes, and no validation engine, and
it never wraps a plain-text `<input>`.

## Package graph

```
packages/core  (private, bundled — never published)
   ├── "."      pure: state machines, parsers, prop getters, controller
   └── "./dom"  the one shared DOM binding: beforeinput, IME, clipboard, selection
        ▲
        │  workspace:^ (bundled into each tarball as dist/vendor/core/)
        ├── packages/vanilla   @zealakit/pattern-input-vanilla
        ├── packages/react     @zealakit/pattern-input-react
        ├── packages/vue       @zealakit/pattern-input-vue
        └── packages/svelte    @zealakit/pattern-input-svelte
```

Adapters → core only. Core imports no framework and no adapter. The pure entry imports nothing
from `./dom`; only adapters import `./dom`. `packages/core/tsconfig.pure.json` typechecks `src/`
minus `src/dom/` with `lib: ["ES2022"]`, so a DOM global in the pure entry fails `pnpm typecheck`.

## Value model (D6)

Every field exposes two values and one status:

- `rawValue` — machine-readable: `number | null` (number field), or the string of editable
  characters only, no literals/separators (masked, OTP).
- `formattedValue` — exactly the string the user sees.
- `status` — `"empty" | "incomplete" | "complete" | "invalid"`. An incomplete value is **never**
  reported as invalid.

The number field additionally keeps a canonical `rawText` while editing so inputs such as `"-"`,
`"12."`, and `"1.50"` survive until commit, when they are normalized.

## Event model (D6, D2)

Core logic is a pure reducer over explicit events — never ad-hoc DOM handlers:

| Event | Meaning |
| --- | --- |
| `insert` | text insertion at the current selection |
| `delete` | backward/forward deletion by character, word, or selection |
| `paste` | pasted text, parsed by the field's own parser |
| `composeStart` / `composeUpdate` / `composeEnd` | IME composition window; commits once at end |
| `commit` | finalize the editing value (clamp/normalize/validate) |
| `focus` / `blur` | focus lifecycle (blur commits) |
| `reset` | return to the initial value |
| `setValue` | programmatic value assignment |
| `setSelection` | programmatic sticky-caret assignment |
| `step` | number field only; arrow/step navigation |

Formatting and parsing are pure functions over `(rawValue, options)`. The caret is a sticky
position counted in editable units relative to the raw value — never an index into the formatted
string.

## Controller and modes (filled by plan 06)

- `createNumberController`, `createMaskedController`, `createOtpController` (or
  `createFieldController(binding, options)`) run a field without touching the DOM: `getState()`,
  `subscribe()`, `dispatch()`, `handleKey()`, `setOptions()`, `setValue()`, `clear()`, `focus()`,
  `undo()`, `redo()`, `destroy()`, plus `value` / `formattedValue` / `status` / `controlled`.
- Controlled when a `value` key is present (for number even `null`). Controlled without
  `onValueChange` (and not `readOnly`) throws `PatternInputError`
  code `CONTROLLED_WITHOUT_HANDLER`.
- Controlled edits reduce to a proposal; `getState()` keeps the approved state until `setOptions`
  supplies the matching value, which adopts the proposal **including its caret**. Re-supplying
  the approved value drops the proposal, so a rejected paste is never shown (AC-7). A transformed
  value creates fresh state with the caret at the end.
- Focus, caret and selection changes are local UI state in both modes: adopted immediately,
  never emitted as value changes (FR-8).
- Uncontrolled changes emit `onValueChange` once per value/status change, deduped by value.
- History is a bounded 100-entry stack: consecutive inserts merge while within 1 s and without a
  caret jump (`now` is injectable for deterministic tests); undo/redo restore value **and** caret.
  In controlled mode undo/redo are proposals too.
- `getClipboardText(state, binding, resolved)` returns the formatted substring of the selection,
  which always parses back into the same field (FR-16).

## Contract (filled by plan 06)

- `CONTRACT_VERSION = "1.0.0"`.
- `GETTER_NAMES`: number/masked expose `getInputProps`; OTP exposes `getGroupProps`,
  `getSlotProps`, `getHiddenInputProps`.
- `INSTANCE_API`: `value`, `formattedValue`, `status`, `setValue`, `clear`, `focus`, `undo`,
  `redo` — every adapter returns these.
- `REACT_PROP_NAMES` + `toReactProps` map DOM-shaped getter output to React props.
- Framework-neutral conformance vectors live in `packages/core/tests/vectors/*.json`
  (number, masked, otp, controlled) and every adapter replays them through its own renderer.

## OTP field (filled by plan 05)

- N single-character slots (1..32). `slots` keeps position with `""` for empty and is exactly
  `length` long; `rawValue` compacts the gaps and `formattedValue === rawValue`. Status is
  empty / incomplete / complete, and `invalid` only comes from the consumer `validate` on commit.
- Insert writes the active slot and advances, clamped at the last slot. A multi-character insert
  (autofill, mobile keyboards dumping the whole code into one field) is treated as paste.
  Paste distributes from slot 0 when the code is at least `length` long, otherwise from the
  active slot, truncates overflow, and leaves `activeIndex` on the last filled slot.
- Backspace clears a filled active slot and stays; when the active slot is already empty it
  clears the previous slot and retreats. `unit: "line"` clears everything.
- `focusSlot` clamps to the first empty slot, so focus order survives deletion; the getters
  expose roving `tabindex` so Tab enters and leaves the group once (FR-13).
- Getters: `getOtpGroupProps` (`role="group"` + label/labelledBy/describedBy/`aria-invalid`),
  `getOtpSlotProps` (inputmode, pattern, slot label, slot 0 only carries
  `autocomplete="one-time-code"` and `maxlength = length` for autofill), and
  `getOtpHiddenInputProps` (`type="hidden"`, `name`, `value = rawValue`) for form submission.

## Masked field (filled by plan 04)

- `MaskedState.rawValue` holds editable characters only; literals are always re-derived by
  `formatMasked(raw, alternative, resolved, { trailingLiterals })` against the selected
  alternative.
- Literal visibility: `"filled"` (default) shows literals up to the last filled slot plus the
  literal run immediately after it while focused (`123` → `123.`); `"always"` renders the whole
  mask with `placeholderChar`, and placeholders are not map units.
- Status: `""` → empty, any required slot unfilled → incomplete (never invalid), all required
  filled → complete; `invalid` comes only from the consumer `validate` on commit.
- Insert: typing the next literal is a no-op advance, a mismatching character rejects the whole
  insert, and at capacity a longer alternative may take the character (first match wins, so the
  field switches patterns as the raw value grows). Paste extracts editable characters, truncates
  at capacity, and rejects only when nothing was accepted.
- `inputMode` defaults to `numeric` for all-digit masks (the documented reading of FR-18) and
  `text` otherwise; the getter also emits `autocapitalize` for upper-only letter masks and
  `maxlength` from the longest alternative. No `role`, no `placeholder`.

## Number field (filled by plan 03)

- `NumberState.rawText` is canonical editing text with `.` as the decimal: `""`, `"-"`, `"12."`,
  `"1.50"` survive while typing. `rawValue` and `formattedValue` are derived from it, and
  `formatNumber` returns `{ text, map }` where every rawText character is exactly one map unit.
- `resolveNumberOptions` is cached per options identity; it resolves separators from `locale`
  once via `Intl.NumberFormat(...).formatToParts`, and explicit `decimalSeparator` /
  `groupSeparator` (`""` disables grouping) win. Reducers and getters take the resolved object.
- Reducer rules: over-precision keystrokes are rejected with the identical state (never rounded
  while typing), typing the locale decimal or `.` inserts the decimal, `-` toggles the sign,
  paste is lexed then validated with one documented separator-swap retry, and composition
  defers every text change to `composeEnd`.
- Commit (Enter/blur) normalizes (`"-"`/`"12."` → `""`/`"12"`), rounds per `rounding`, pads to
  `minimumFractionDigits`, clamps per `clampBehavior` (`"none"` keeps the value and marks
  `invalid` with reason `"range"`), then runs the consumer `validate`. A rejected event returns
  the same state object (NFR-3).
- `getNumberInputProps` emits `type`, `inputmode`, `autocomplete`, `autocorrect`, `spellcheck`,
  `enterkeyhint`, and optional `aria-invalid` / `aria-describedby` / `aria-required` /
  `disabled` / `readonly`. It never emits `role`, and `aria-invalid` only appears for a real
  invalid state (never for incomplete).

## Mask grammar (filled by plan 02)

Frozen for v1 — adding a form requires a BRD change:

| Pattern char | Meaning |
| --- | --- |
| `9` | digit `[0-9]` |
| `a` | ASCII letter `[A-Za-z]` |
| `*` | ASCII letter or digit |
| custom key | from the `tokens` option: `{ test: RegExp; transform?: "upper" \| "lower" }`, single-character match |
| `\x` | literal `x` |
| `[...]` | enclosed slots are optional (the field is complete without them) |
| `{n}` / `{n,m}` after a token | repeat; `{n,}` is greedy up to the 64-slot cap |
| anything else | literal |

`compileMask` is the only throwing entry point (`MaskPatternError` with `patternIndex`,
`offset`, `reason`); it runs once at option resolution. `fitRaw` ignores literals in the raw
input, rejects at the first character no slot accepts, and reports `rejectedAt` when the raw
input is longer than the capacity. `selectAlternative` takes the first fully matching pattern
(FR-21), else the first that still has capacity. `extractRaw` keeps only editable characters,
which is what makes paste work (FR-15).

The number lexer (`lexNumber`) is explicit-syntax only: group separators are skipped anywhere,
the decimal separator is accepted once, a sign only at the start (`-`, `−`, or a dropped `+`),
and ASCII digits only in v1. Ambiguity such as `1,234` vs `1.234` is decided by `syntax`, never
guessed. All number math runs on canonical decimal strings (`decimal.ts`) so there is no
binary-float drift; `toNumber` returns `null` beyond `Number.MAX_SAFE_INTEGER`.

## Caret model (filled by plan 01)

- A selection is `{ anchor, focus }`, each a `StickyAnchor { offset, affinity }` counted in
  **raw units** (`0..rawLength`) — never in formatted-string indices.
- `affinity: "before"` sits immediately before raw unit `offset` (skipping literals to its left);
  `"after"` sits immediately after raw unit `offset - 1`. At offset `0`, `"after"` is the start of
  the text; at offset `n`, `"before"` is its end.
- A formatter returns `{ text, map }`; `units[i]` is the UTF-16 `[start, end)` range of raw unit
  `i` inside the formatted text. UTF-16 is used everywhere so the DOM binding can feed
  `selectionStart` directly and a surrogate pair still counts as one unit.
- `indexToAnchor` snaps an index inside a literal run to the nearest unit boundary; on a tie the
  right-hand boundary wins (FR-14). `anchorToIndex` and `indexToAnchor` are the only legal
  conversions between the two coordinate systems.
- `remapAfterEdit(selection, { at, removed, inserted })`: anchors before the edit stay, anchors
  after it shift by `inserted - removed`, anchors inside a removed range collapse to
  `at + inserted` with `before` affinity, and an insertion exactly at an anchor respects its
  affinity.
- `moveCaret` maps `prev` / `next` / `start` / `end`, with optional `extend`.

## Prop-getter contract (filled by plan 06)

Getters return plain, deterministic objects that an adapter spreads onto an element or component
props. Same state + same options → same object; callers may call them every render.

- Number / masked: `getInputProps(state, options)` — includes `inputmode`, `autocomplete`, `name`,
  `aria-invalid` (only when invalid), `aria-describedby` (consumer-supplied ids), `spellcheck`,
  `autocapitalize`.
- OTP: `getGroupProps(state, options)`, `getSlotProps(state, index)`,
  `getAggregateProps(state, options)` (a hidden input carrying the aggregate value for forms).
- Instance API: `state`, `subscribe`, `setValue`, `setSelection`, `focus`, `blur`, `clear`,
  `destroy`. Plans 06–11 fill the exact surface; plans 03–05 fill each field's getters.

Rules: never emit `role` on a native input; `aria-invalid` reflects real invalidity only; nothing
is announced that is not visible; the OTP group is one accessible control while its slots remain
individually focusable.

## Modes (filled by plan 06)

- Uncontrolled: the field owns state and emits change proposals.
- Controlled: the consumer supplies `value` and receives proposals; the field never renders a value
  the consumer did not approve (the only exception is a documented optimistic echo during composition).
- Controlled without a change handler is an error, never a silent uncontrolled fallback.

## DOM binding (filled by plan 07)

One implementation for every adapter: `beforeinput` (primary) with `input` fallback,
`compositionstart/update/end`, `keydown` mapping, `paste`/`cut`/`copy`, `selectionchange`/
`pointerup`, focus/blur, and an adapter-owned undo stack. It is the only writer of `el.value` and
selection; framework adapters never bind `value` reactively.

## Plan map

| Plan | Area | Status |
| --- | --- | --- |
| 00 | workspace, tooling, empty packages, scripts, agents | done |
| 01 | core foundations: types, editable map, sticky caret, key normalization | done |
| 02 | core lexers: mask grammar, number lexer, decimal math | done |
| 03 | number field: options, format/parse, reducer, keymap, getters | done |
| 04 | masked field | done |
| 05 | OTP field | done |
| 06 | controller, contract constants, conformance vectors | done |
| 07 | `./dom` binding | filled by plan 07 |
| 08–11 | vanilla / React / Vue / Svelte adapters | filled by plans 08–11 |
| 12 | examples, Playwright e2e, a11y audit | filled by plan 12 |
| 13 | release gates: package/size/SSR checks, READMEs, skills | filled by plan 13 |

## Hard boundaries (short list)

No CSS/classes/themes; no validation engine; never wrap a plain-text input; no speculative
exports; SSR-safe imports; IME commits once; core pure entry stays DOM-free; adapters never import
other adapters; `type` aliases and `.js` specifiers; one commit per plan, no AI co-author trailer.
