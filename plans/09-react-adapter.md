# Plan 09 — React adapter

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **9 of 13**. Depends on: 07; 08 as the reference. Parallel-safe with 10 and 11.
BRD: FR-8–FR-11, FR-28, FR-30, AC-2, AC-7, NFR-6.

## Goal

`@zealakit/pattern-input-react`: hooks with the canonical getter names, plus thin components
that render only the field's own elements (D4). React `^18 || ^19`.

## Scope

In: `packages/react/src/`, tests, READMEs, `skills/pattern-input-react.md`,
`examples/react` + `examples/nextjs` pages (wired in plan 12; a minimal page here).
Out: form-library integrations, styling.

## Design

### Files

```
packages/react/src/
  hooks/use-field-controller.ts  shared: create once, useSyncExternalStore, setOptions in layout effect
  hooks/use-number-input.ts
  hooks/use-masked-input.ts
  hooks/use-otp-input.ts
  components/number-input.tsx    <NumberInput> = <input {...getInputProps(props)} />
  components/masked-input.tsx
  components/otp-input.tsx       <OtpInput> = group div + N slot inputs + hidden input
  utils/merge-props.ts           merge consumer props (refs, handlers) with getter props
  index.ts
```

### Hooks

```ts
const field = useNumberInput({ value, onValueChange, maximumFractionDigits: 2, ... });
<input {...field.getInputProps({ id: "price", onBlur: track })} />
field.value; field.formattedValue; field.status; field.setValue(…); field.clear(); field.focus(); field.undo(); field.redo();
```

- Controller created once per hook instance (`useState(() => create…())`); options pushed via
  `controller.setOptions` in `useLayoutEffect` (isomorphic: `useEffect` on server) so a
  controlled approval lands before paint.
- State read with `useSyncExternalStore(controller.subscribe, controller.getState,
  controller.getState)`; the server snapshot is the initial state (SSR, FR-28).
- `getInputProps(userProps?)` returns `toReactProps(coreProps)` + `defaultValue` (initial
  formatted text only — **never** `value`, D5) + a merged callback `ref` that calls
  `attachInput` on mount and detach on unmount. User handlers are composed, user `ref`s merged.
- OTP: `getGroupProps()`, `getSlotProps(index)` (each with its own ref; slots registered
  in an index map; `refresh()` after mount), `getHiddenInputProps()`.
- Controlled without `onValueChange` throws during render (contract).
- StrictMode: double mount must attach once — the ref callback detaches on null.

### Components

`NumberInput`, `MaskedInput` (forwardRef to the `<input>`, accept field options + any input
props) and `OtpInput` (`length`, `renderSlot?` for custom slot markup, `slotProps?`, group
props passthrough). No class names, no styles, no wrappers beyond the field's own elements.

## Steps

1. `use-field-controller` + three hooks.
2. Components.
3. Exports: hooks, components, public core types re-exported.
4. Tests with `@testing-library/react` + happy-dom (`createElement as h`); replay vectors
   through `user-event`-style dispatched `beforeinput`/`input`; SSR test with
   `react-dom/server` `renderToString`.
5. React 18 support: runtime tests run on React 19 (devDependency). React 18 compatibility is
   checked by typechecking against `@types/react@18` in `tests/tsconfig.react18.json`, and by
   avoiding React 19-only APIs (`use`, ref-as-prop, `useActionState`). Plan 12's Next.js example
   is the runtime SSR check.
6. READMEs EN/VI/CN; `skills/pattern-input-react.md`; `pnpm check && pnpm readme:check`.

## Tests (`packages/react/tests/*.test.ts`)

- `AC-2: hook results expose GETTER_NAMES and INSTANCE_API`
- `AC-7: controlled paste rejected by onValueChange never renders`
- `react: approved controlled update keeps caret (single render)`
- `react: controlled without onValueChange throws`
- `react: StrictMode attaches once, detaches on unmount`
- `react: user ref and onBlur are merged, not replaced`
- `react: OtpInput paste focuses last slot`
- `react: renderToString has no window access and renders initial formatted text`
- `react: getter props are camelCase (inputMode, maxLength, autoComplete)`
- `vectors(react): all vectors pass`

## Acceptance

Tests green; no `value=` prop ever passed to the input (asserted); typecheck passes with React
18 types; READMEs pass.

## Risks

- `useSyncExternalStore` with unstable `getState` loops: controller guarantees reference
  stability (plan 06 test).
- React re-render resetting `defaultValue`: React ignores `defaultValue` changes after mount;
  verified by test.

## Rollback

Restore `src/index.ts` to `export {};`; delete hooks, components, tests, README sections.
