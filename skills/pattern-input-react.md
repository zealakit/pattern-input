# Pattern Input — React

Use this skill when integrating `@zealakit/pattern-input-react` into a React 18 or 19 app.

- Install: `npm i @zealakit/pattern-input-react`
- You own the element and the styling; the package ships no CSS, no classes and no validation
  engine. Spread the prop getters onto your own elements.

## Number and masked

```tsx
const price = useNumberInput({ maximumFractionDigits: 2 });
<input {...price.getInputProps({ id: "price" })} />;

const tax = useMaskedInput({ mask: "999.999.999-99" });
<input {...tax.getInputProps()} />;
```

`value`, `formattedValue`, `status` (`empty | incomplete | complete | invalid`), `setValue`,
`clear`, `focus`, `undo`, `redo`. Never pass `value` to the input: the DOM binding owns it.

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

## Rules

Never wrap or replace a plain-text input, never bind `value` reactively, and keep field work in
client components (Next.js).
