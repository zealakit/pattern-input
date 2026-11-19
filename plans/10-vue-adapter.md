# Plan 10 — Vue adapter

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **10 of 13**. Depends on: 07; 08 as the reference. Parallel-safe with 09 and 11.
BRD: FR-8–FR-11, FR-28, FR-30, AC-2, AC-7, NFR-6.

## Goal

`@zealakit/pattern-input-vue`: composables with the canonical getter names, plus render-function
components (Overlay's Vue style — no `.vue` SFCs in the package). Vue `^3.5`.

## Scope

In: `packages/vue/src/`, tests, READMEs, `skills/pattern-input-vue.md`, minimal `examples/vue`
page. Out: `v-model` modifiers beyond the documented `modelValue` support.

## Design

### Files

```
packages/vue/src/
  composables/use-field-controller.ts
  composables/use-number-input.ts
  composables/use-masked-input.ts
  composables/use-otp-input.ts
  components/number-input.ts   defineComponent + h('input', …)
  components/masked-input.ts
  components/otp-input.ts
  index.ts
```

### Composables

```ts
const field = useNumberInput(() => ({ value: price.value, onValueChange: (c) => (price.value = c.value), maximumFractionDigits: 2 }));
// template: <input v-bind="field.getInputProps()" :ref="field.inputRef" />
```

- Options accepted as a getter or `MaybeRefOrGetter`; a shallow `watch` (flush `"sync"`) pushes
  them to `controller.setOptions` so a controlled approval lands in the same tick.
- State exposed as `shallowRef` updated from `controller.subscribe`; `value`,
  `formattedValue`, `status` are computed refs. The controller is held in a plain variable
  (never reactive proxies).
- `inputRef` is a function ref: attach on element, detach on `null`; `onScopeDispose` detaches.
- `getInputProps()` returns core attribute names as-is (Vue accepts them) — **no `value`
  binding** (D5); initial text is written by the binding on attach.
- Components support `v-model` (`modelValue` + `update:modelValue` → controlled mode) and
  emit `change` with the full `ValueChange`. OTP component renders group + N slots + hidden
  input; slot markup overridable via a `slot` scoped slot.
- SSR: `renderToString` renders initial formatted text through the `value` **attribute** on the
  server only (component path), never as a reactive binding on the client.

## Steps

1. Shared composable + three composables.
2. Components with `v-model`.
3. Exports + core type re-exports.
4. Tests with `@vue/test-utils` + happy-dom; vectors; `@vue/server-renderer` SSR test.
5. READMEs EN/VI/CN; skill; `pnpm check && pnpm readme:check`.

## Tests (`packages/vue/tests/*.test.ts`)

- `AC-2: composables expose GETTER_NAMES and INSTANCE_API`
- `AC-7: v-model rejection (parent keeps old value) never renders the paste`
- `vue: v-model approval keeps caret`
- `vue: controlled without handler throws`
- `vue: options getter change updates resolved options without recreating controller`
- `vue: scope dispose detaches listeners`
- `vue: OtpInput paste focuses last slot`
- `vue: SSR render has no window access`
- `vectors(vue): all vectors pass`

## Acceptance

Tests green; no reactive `value` binding on client inputs (asserted); READMEs pass.

## Risks

- Watch loops between `modelValue` and `onValueChange`: `sameValue` dedupe in the controller
  stops them; tested.
- Deep reactivity wrapping the controller: forbidden by design, asserted with `isProxy`.

## Rollback

Restore `src/index.ts` to `export {};`; delete composables, components, tests, README sections.
