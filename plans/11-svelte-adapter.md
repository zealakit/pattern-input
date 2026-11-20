# Plan 11 — Svelte adapter

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **11 of 13**. Depends on: 07; 08 as the reference. Parallel-safe with 09 and 10.
BRD: FR-8–FR-11, FR-28, FR-30, AC-2, AC-7, NFR-6.

## Goal

`@zealakit/pattern-input-svelte`: factories + actions with the canonical getter names, plus
`.svelte` components (Overlay's Svelte style, built with `svelte-package`). Svelte `^5`.

## Scope

In: `packages/svelte/src/`, tests (incl. `.svelte` compile hook from Overlay's setup), READMEs,
`skills/pattern-input-svelte.md`, minimal `examples/svelte` page.
Out: Svelte 4 store-only API.

## Design

### Files

```
packages/svelte/src/
  fields/create-field.svelte.ts    shared: controller + $state snapshot via subscribe
  fields/number-input.svelte.ts    createNumberInput(getOptions)
  fields/masked-input.svelte.ts
  fields/otp-input.svelte.ts
  actions/field.ts                 use:field action → attachInput / detach
  actions/otp-group.ts             use:otpGroup action
  components/NumberInput.svelte    <input use:… {...getInputProps()} />
  components/MaskedInput.svelte
  components/OtpInput.svelte
  index.ts
```

(Component file names follow Svelte convention; everything else is kebab-case — note the
exception in AGENTS.md as Overlay does.)

### API

```svelte
<script lang="ts">
  import { createNumberInput } from "@zealakit/pattern-input-svelte";
  let price = $state<number | null>(null);
  const field = createNumberInput(() => ({ value: price, onValueChange: (c) => (price = c.value), maximumFractionDigits: 2 }));
</script>
<input {...field.getInputProps()} use:field.action />
```

- `create*Input(getOptions)` returns an object whose `value`/`formattedValue`/`status` are
  reactive getters backed by `$state`; options re-read in an `$effect.pre` → `setOptions`
  (approval lands before DOM update).
- `field.action` (and standalone `fieldAction(node, field)`) attaches/detaches; `update`
  forwards nothing (options already flow through the getter).
- Components support `bind:value` (controlled under the hood) and an `onchange` callback prop
  with the full `ValueChange`. `OtpInput` accepts a `slot` snippet for custom slot markup.
- `getInputProps()` never includes `value` (D5). SSR: initial formatted text is rendered as the
  `value` attribute by components on the server only.
- `package.json` `sideEffects: ["**/*.svelte"]`, `exports` with `svelte` condition (Overlay
  shape).

## Steps

1. Shared factory, three factories, actions.
2. Components.
3. Exports + core type re-exports.
4. Tests (Overlay's Svelte test setup: compile `.svelte` on import, happy-dom, `mount`/`flushSync`);
   vectors; SSR via `svelte/server` `render`.
5. READMEs EN/VI/CN; skill; `pnpm check && pnpm readme:check`.

## Tests (`packages/svelte/tests/*.test.ts`)

- `AC-2: factories expose GETTER_NAMES and INSTANCE_API`
- `AC-7: bind:value rejection never renders the paste`
- `svelte: approved change keeps caret`
- `svelte: controlled without handler throws`
- `svelte: action destroy detaches listeners`
- `svelte: OtpInput paste focuses last slot`
- `svelte: SSR render has no window access`
- `vectors(svelte): all vectors pass`

## Acceptance

Tests green; `svelte-package` output contains `.svelte` + `.d.ts`; READMEs pass.

## Risks

- `$effect.pre` ordering vs the binding's end-of-event render: covered by the AC-7 and caret
  tests.
- Runes in `.svelte.ts` files require Svelte 5 tooling in tests: reuse Overlay's compile hook.

## Rollback

Restore `src/index.ts` to `export {};`; delete fields, actions, components, tests, README sections.
