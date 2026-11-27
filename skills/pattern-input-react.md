# Pattern Input — React

Use this skill when integrating `@zealakit/pattern-input-react` into a React 18 or 19 app.

- Install: `npm i @zealakit/pattern-input-react` and `npm i @zealakit/ui-engine` (`^1.0.0-beta.1` peer)
- You own the element and the styling; the package ships no CSS, no classes and no validation
  engine. Spread the prop getters onto your own elements, or use `<NumberInput>` / `<MaskedInput>`
  with direct `<input>` HTML attributes (`id`, `className`, `placeholder`, `data-*`, `aria-*`) or
  legacy `inputProps`.

## Number and masked

```tsx
<NumberInput id="price" placeholder="1,234.56" maximumFractionDigits={2} />
<MaskedInput id="tax" placeholder="123.456.789-00" mask="999.999.999-99" />

// Or use the hooks directly:
const price = useNumberInput({ maximumFractionDigits: 2 });
<input {...price.getInputProps({ id: "price" })} />;
```

`value`, `formattedValue`, `status` (`empty | incomplete | complete | invalid`), `setValue`,
`clear`, `focus`, `undo`, `redo`. Never pass `value` to the input: the DOM binding owns it.

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

```tsx
<InputOTP maxLength={6} name="code" label="Verification code">
  <InputOTP.Group>
    <InputOTP.Slot index={0} /> <InputOTP.Slot index={1} /> <InputOTP.Slot index={2} />
  </InputOTP.Group>
  <InputOTP.Separator>-</InputOTP.Separator>
  <InputOTP.Group>
    <InputOTP.Slot index={3} /> <InputOTP.Slot index={4} /> <InputOTP.Slot index={5} />
  </InputOTP.Group>
</InputOTP>
```

The root renders one `role="group"` plus a hidden input (`name`) for forms. Slot behavior
attributes belong to the field; `className`, `id`, `ref` and `data-*` pass through. Import
`InputOTPGroup` / `InputOTPSlot` / `InputOTPSeparator` by name across a Server Components boundary.

## Controlled mode

Pass `value` and `onValueChange`; update `value` to approve a change. Not updating it rejects the
change (the field keeps showing the approved value). `value` without `onValueChange` throws.

## Styling starter

Style `[role="group"]` with `display: flex; gap: 0.5rem;` and compact slot boxes
(`width: 2.625rem; height: 3rem; text-align: center;`), plus `input[aria-invalid="true"]` for
validation errors (`status === "invalid"`).

## Rules

Never wrap or replace a plain-text input, never bind `value` reactively, and keep field work in
client components (Next.js).
