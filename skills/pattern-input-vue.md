# Pattern Input — Vue

Use this skill when integrating `@zealakit/pattern-input-vue` into a Vue 3.5+ app.

- Install: `npm i @zealakit/pattern-input-vue` and `npm i @zealakit/ui-engine` (`^1.0.0-beta.1` peer)
- You own the element and the styling; the package ships no CSS, no classes and no validation
  engine.

## Number and masked

```vue
<script setup lang="ts">
import { useNumberInput } from "@zealakit/pattern-input-vue";
const price = useNumberInput(() => ({ maximumFractionDigits: 2 }));
</script>
<template><input v-bind="price.getInputProps()" :ref="price.inputRef" /></template>
```

Or use the `NumberInput` / `MaskedInput` components with `v-model` and direct HTML attrs (`id`,
`class`, `placeholder`). State is read through `value()`, `formattedValue()`, `status()`. Never
bind `:value`: the DOM binding owns it.

## Mask pattern syntax & recipes

- Tokens: `9` (digit `[0-9]`), `a` (letter `[A-Za-z]`), `*` (alphanumeric), `\x` (escaped literal),
  `[...]` (optional section), `{n}` / `{n,m}` / `{n,}` (repeat, capped at 64 slots), custom keys
  via `tokens: { H: { test: /[0-9A-Fa-f]/, transform: "upper" } }`.
- Template & selection: `showLiterals: "always" | "filled"`, `placeholderChar` (default `"_"`),
  `selectMask: (raw, alternatives) => number` for prefix-driven multi-mask formats (e.g. Amex vs Visa/MC).
- **Phone anti-pattern:** Never stack ambiguous lengths like `["(999) 999-9999", "+9 (999) 999-9999"]`
  on one input (an extra digit shifts the area code into the country code). Switch a single exact
  `mask` per selected country instead.
- Exported types & errors: `MaskTokenDefinition`, `MaskSelector`, `NumberRounding`, `ChangeReason`,
  `OtpSlotLabel`, `MaskPatternError`, `PatternInputError`.

## One-time code

Layout is yours; every slot takes an explicit `index` from `0` to `maxLength - 1`.

```vue
<script setup lang="ts">
import { InputOTP } from "@zealakit/pattern-input-vue";
import { ref } from "vue";
const code = ref("");
</script>
<template>
  <InputOTP v-model="code" :max-length="6" name="code" label="Verification code">
    <InputOTP.Group>
      <InputOTP.Slot :index="0" /> <InputOTP.Slot :index="1" /> <InputOTP.Slot :index="2" />
    </InputOTP.Group>
    <InputOTP.Separator>-</InputOTP.Separator>
    <InputOTP.Group>
      <InputOTP.Slot :index="3" /> <InputOTP.Slot :index="4" /> <InputOTP.Slot :index="5" />
    </InputOTP.Group>
  </InputOTP>
</template>
```

Dot notation needs `<script setup>`; otherwise import `InputOTPGroup` / `InputOTPSlot` /
`InputOTPSeparator`. The root renders one `role="group"` plus a hidden input for forms; slot
behavior attributes belong to the field while `class`, `id` and `data-*` pass through.

## Controlled mode

`v-model` is controlled: the parent decides what to accept. Not updating the model rejects the
change and the field keeps showing the approved value.

## Styling starter

Style `[role="group"]` with `display: flex; gap: 0.5rem;` and compact slot boxes
(`width: 2.625rem; height: 3rem; text-align: center;`), plus `input[aria-invalid="true"]` for
validation errors (`status === "invalid"`).

## Rules

Never wrap or replace a plain-text input, never bind `value` reactively, and touch the DOM only
in `onMounted` or through the provided refs (Nuxt).
