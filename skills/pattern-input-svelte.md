# Pattern Input — Svelte

Use this skill when integrating `@zealakit/pattern-input-svelte` into a Svelte 5 app.

- Install: `npm i @zealakit/pattern-input-svelte`
- You own the element and the styling; the package ships no CSS, no classes and no validation
  engine.

## Number and masked

```svelte
<script lang="ts">
  import { createNumberInput, fieldAction } from "@zealakit/pattern-input-svelte";
  const field = createNumberInput(() => ({ maximumFractionDigits: 2 }));
  // Read the store so Svelte re-runs the getter when the state changes.
  const props = $derived.by(() => { void $field; return field.getInputProps(); });
</script>
<input {...props} use:fieldAction={field} />
```

Or use the `NumberInput` / `MaskedInput` components with `bind:value`. Never bind `value` on the
input yourself: the DOM binding owns it.

## One-time code

Layout is yours; every slot takes an explicit `index` from `0` to `maxLength - 1`.

```svelte
<script lang="ts">
  import { InputOTP } from "@zealakit/pattern-input-svelte";
  let code = $state("");
</script>
<InputOTP maxLength={6} bind:value={code} name="code" label="Verification code">
  <InputOTP.Group>
    <InputOTP.Slot index={0} /> <InputOTP.Slot index={1} /> <InputOTP.Slot index={2} />
  </InputOTP.Group>
  <InputOTP.Separator>-</InputOTP.Separator>
  <InputOTP.Group>
    <InputOTP.Slot index={3} /> <InputOTP.Slot index={4} /> <InputOTP.Slot index={5} />
  </InputOTP.Group>
</InputOTP>
```

With the factory API, register the group with `use:otpGroupAction={field}` and each slot input
with `use:otpSlotAction={{ field, index }}`.

## Controlled mode

Use the factory (`createNumberInput` etc.) when a parent must be able to reject a change: pass
`value` and `onValueChange` and call `field.setOptions` / update the value to approve.

## Rules

Never wrap or replace a plain-text input, never bind `value` reactively, and keep DOM work in
actions or lifecycle effects (SvelteKit SSR).
