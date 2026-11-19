# Plan 08 — Vanilla adapter (reference)

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **8 of 13**. Depends on: 07. BRD: FR-8–FR-11, FR-28, FR-30, AC-1 (DOM level), AC-2, AC-7, NFR-6.

## Goal

`@zealakit/pattern-input-vanilla`: attach Number / Masked / OTP behavior to **host-owned**
elements. It is the reference every other adapter mirrors, so it stays the thinnest possible
layer over the controller + DOM binding.

## Scope

In: `packages/vanilla/src/`, tests, READMEs (EN/VI/CN), `skills/pattern-input-vanilla.md`.
Out: declarative `data-*` auto-init (Overlay has `initOverlays`; not in v1 — no speculative
export), element creation of any kind.

## Design

### Files

```
packages/vanilla/src/
  number-input.ts   createNumberInput(el, options)
  masked-input.ts   createMaskedInput(el, options)
  otp-input.ts      createOtpInput(group, options)
  apply-props.ts    applyProps(el, props, previous)  (attribute diffing; no class/style)
  index.ts
```

### API

```ts
export type NumberInputInstance = {
  readonly value: number | null; readonly formattedValue: string; readonly status: FieldStatus;
  getInputProps(): NumberInputProps;           // plain attribute object (contract name)
  setValue(value: number | null): void; clear(): void; focus(): void;
  undo(): boolean; redo(): boolean;
  setOptions(options: NumberInputOptions): void; // for controlled updates / option changes
  subscribe(listener: (instance: NumberInputInstance) => void): () => void;
  destroy(): void;
};
export function createNumberInput(el: HTMLInputElement, options?: NumberInputOptions): NumberInputInstance;
```

`createMaskedInput` is identical with `string` values. `createOtpInput(group: HTMLElement,
options: OtpInputOptions & { slots?: () => readonly HTMLInputElement[]; hiddenInput?:
HTMLInputElement })` defaults `slots` to `group.querySelectorAll("input:not([type=hidden])")`
and exposes `getGroupProps`, `getSlotProps(index)`, `getHiddenInputProps`, `refresh()`.

Behavior:

- On create: validate `el` is an `<input>` of type `text`/`tel`/`search` (throws
  `PatternInputError` `UNSUPPORTED_ELEMENT` otherwise); `applyProps` writes getter attributes;
  `attachInput` wires events. Attributes the host already set and the getter does not own are
  left alone; getter-owned attributes are re-applied on each change (diffed).
- Controlled mode = `value` in options; the host calls `setOptions({ ...opts, value })` from
  `onValueChange` to approve. Not calling it = rejected (AC-7).
- `destroy()` detaches listeners and removes only attributes the adapter added.
- SSR: importing is safe; `create*` throws a clear error if called without a DOM.

## Steps

1. Implement the three factories + `applyProps`.
2. Export factories and re-export public core types (`FieldStatus`, `ValueChange`, option and
   state types, `CONTRACT_VERSION`, `PatternInputError`, `MaskPatternError`).
3. Tests with happy-dom; replay all plan-06 vectors through the vanilla instances.
4. READMEs EN/VI/CN per readme-system skill: install, quick start per field, options tables,
   instance API, controlled mode, prop-getter contract, behavior matrix, "What this library
   will not do", browser support, known IME/undo limits.
5. `skills/pattern-input-vanilla.md`: integration recipe for agents.
6. `pnpm check && pnpm readme:check`.

## Tests (`packages/vanilla/tests/*.test.ts`)

- `AC-1: number typing formats and keeps caret on host input`
- `AC-1: masked paste fills literals on host input`
- `AC-1: OTP paste fills host slots and focuses last`
- `AC-2: instances expose GETTER_NAMES and INSTANCE_API`
- `AC-7: controlled paste not approved never renders`
- `vanilla: approved controlled change adopts caret`
- `vanilla: aria-invalid only when invalid; aria-describedby from options`
- `vanilla: destroy removes listeners and adapter-added attributes only`
- `vanilla: rejects non-text input elements`
- `vanilla: SSR import has no window access`
- `vectors(vanilla): all vectors pass`

## Acceptance

Tests green; `rg "addEventListener" packages/vanilla/src` is empty (all wiring in core `./dom`);
READMEs pass `readme:check`.

## Risks

- Host frameworks that also write `el.value` (e.g. a template binding) fight the binding:
  documented as unsupported; use the framework adapters instead.

## Rollback

Restore `packages/vanilla/src/index.ts` to `export {};`; delete tests and README sections.
