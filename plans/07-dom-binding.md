# Plan 07 — DOM binding (`@zealakit/pattern-input-core/dom`)

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **7 of 13**. Depends on: 06.
BRD: FR-9, FR-11–FR-19, FR-22, FR-28, AC-6 (happy-dom level), R2.

## Goal

The single place where DOM events become controller events (D2). Every adapter attaches through
it, so `beforeinput`, IME, clipboard, selection, and focus behave identically everywhere.

## Scope

In: `packages/core/src/dom/` (second entry `./dom`, DOM lib). Out: any framework code; any
field-specific logic (fields are reached only via the controller + binding).

## Design

### Files

```
packages/core/src/dom/
  attach-input.ts      attachInput(el, controller, opts) → Detach
  attach-otp.ts        attachOtpGroup(groupEl, controller, getSlots, opts) → Detach
  input-events.ts      beforeinput inputType → field event mapping
  selection.ts         read/write selection via EditableMap (anchorToIndex/indexToAnchor)
  composition.ts       composition tracker
  render.ts            writeValue(el, text, caret) with re-entrancy guard
  env.ts               isBrowser(), platform() (called lazily, never at import)
  index.ts
```

### Event wiring (`attachInput`)

| DOM event | Action |
| --- | --- |
| `beforeinput` | Map `inputType` → event, `preventDefault()` when the controller handled it: `insertText`/`insertReplacementText` → `insert`; `insertFromPaste`/`insertFromDrop` → `paste` (data from `dataTransfer`); `deleteContentBackward/Forward` → `delete char`; `deleteWordBackward/Forward` → `delete word`; `deleteSoftLineBackward`/`deleteHardLine*` → `delete line`; `deleteByCut` → handled by `cut`; `historyUndo/Redo` → `undo`/`redo`; `insertCompositionText` → **ignored** (IME owns the DOM); unknown types fall through |
| `input` | Fallback only when `beforeinput` was not cancelable (Android Chrome GBoard, some IMEs): diff `el.value` against the last rendered text, derive an `insert`/`delete`, then re-render |
| `compositionstart/update/end` | `composeStart` / `composeUpdate` / exactly one `composeEnd(data)`; nothing is formatted or rejected in between (FR-17). Safari's `compositionend`-before-`input` ordering is handled by deferring the commit to a microtask and de-duplicating |
| `keydown` | `controller.handleKey(normalize(e))`; `preventDefault` when handled; skip when `e.isComposing` or `keyCode === 229` |
| `paste` / `copy` / `cut` | `clipboardData` text/plain; copy/cut write `getClipboardText`; paste goes through `beforeinput` when available, else here (once per gesture) |
| `select` / `selectionchange` (document, while focused) / `pointerup` | read selection → `select` event (snap to editable, FR-14) |
| `focus` / `blur` | `focus` / `blur` (blur ends an open composition first) |

After any handled event, `render.ts` writes `el.value = state.formattedValue` (only if
different) and `setSelectionRange` from the sticky selection, under an `applying` flag so the
resulting `select`/`input` events are ignored. In controlled mode the binding renders the
**approved** state at the end of the event; when the adapter later calls
`controller.setOptions` with the approved proposal, the controller notifies and the binding
renders again (no flash in practice: discrete-event updates flush before paint in React 18+,
Vue, and Svelte — verified in 09–11 and 12).

Mobile (FR-18): no `keypress`; inputmode comes from getters; Android `input`-fallback path;
`enterkeyhint` from getters. `autocomplete="one-time-code"` autofill arrives as
`insertReplacementText`/`insertText` with the whole code → OTP paste path.

### OTP group (`attachOtpGroup`)

- Listeners on each slot from `getSlots()`; re-queried on `refresh()` (adapters call it when
  slots render).
- After each state change: write each slot's `value`, update roving `tabindex`, and
  `slots[activeIndex].focus({ preventScroll: true })` when the group has focus. Selection in a
  slot is always "select all" so overwrite works on every platform.
- Slot `focus` → `focusSlot(i)`; group `focusout` to outside → `blur`.
- Hidden input is consumer-rendered from `getHiddenInputProps`; the binding updates its
  `value` if passed via `opts.hiddenInput`.

### SSR

Importing `./dom` never touches globals; `attach*` returns a no-op detach when `isBrowser()` is
false. All listeners are removed by `Detach`.

## Steps

1. `env`, `render`, `selection`, `composition` helpers with unit tests.
2. `attachInput` with the table above; `attachOtpGroup`.
3. `exports["./dom"]` already exists from plan 00; fill `src/dom/index.ts`.
4. Tests under `packages/core/tests/dom/` with happy-dom (setup loaded only for that folder via
   a separate test script `test:dom`, chained in `test`).
5. Replay all vectors from plan 06 through real DOM events (`typeText` → `beforeinput` +
   `input` pairs).
6. `pnpm check`; skill § "DOM binding" incl. the inputType table and known browser quirks.

## Tests (`packages/core/tests/dom/*.test.ts`, happy-dom)

- `AC-6 dom: compositionstart/update/end commits once and formats after end`
- `dom: insertCompositionText ignored while composing`
- `dom: beforeinput insertText handled and prevented`
- `dom: input fallback when beforeinput is not cancelable`
- `dom: paste of "+1 (555) 010-9999" into masked parses via core`
- `dom: cut writes formatted selection and deletes it`
- `dom: historyUndo restores value and caret`
- `dom: click inside literal snaps caret`
- `dom: controlled rejected paste leaves DOM value approved (AC-7)`
- `dom: unhandled keys and Tab are not prevented`
- `dom: OTP focus follows activeIndex; Tab leaves the group`
- `dom: detach removes every listener`
- `dom: import and attach are no-ops without window (SSR)`
- `vectors(dom): every vector passes through DOM events`

## Acceptance

Tests green; `rg "keypress" packages/core/src` empty; pure typecheck still excludes `dom/`;
built `dist/dom/index.js` imports only `../` core modules.

## Risks

- R2 IME variance: happy-dom cannot reproduce real IMEs. This plan fixes the protocol; plan 12
  runs CDP IME in Chromium and a manual matrix (macOS Pinyin, Windows MS-IME, iOS Vietnamese
  Telex, Android GBoard).
- `selectionchange` noise: listen on `document` only while focused, ignore while `applying`.

## Rollback

Empty `src/dom/` back to `export {};`; delete its tests.
