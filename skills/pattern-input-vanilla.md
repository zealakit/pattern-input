# Pattern Input — Vanilla

Use this skill when integrating `@zealakit/pattern-input-vanilla` into a plain TypeScript app.

- Install: `npm i @zealakit/pattern-input-vanilla` and `npm i @zealakit/ui-engine` (`^1.0.0-beta.1` peer)
- You own the elements and the styling; the package never creates elements, ships no CSS and no
  validation engine.

## Number and masked

```ts
const price = createNumberInput(document.querySelector("#price")!, {
  maximumFractionDigits: 2,
  onValueChange: (change) => console.log(change.value, change.status),
});
price.setValue(99);
price.destroy(); // detaches listeners, destroys controller, restores attributes
```

The element must be a text-like `<input>` (`text`, `tel`, `search`); otherwise
`PatternInputError` `UNSUPPORTED_ELEMENT`. Without a DOM it throws `NO_DOM`.
Calling `setOptions(...)` repaints immediately when `mask`, `locale`, or `showLiterals` change.

## Mask pattern syntax & recipes

- Tokens: `9` (digit `[0-9]`), `a` (letter `[A-Za-z]`), `*` (alphanumeric), `\x` (escaped literal),
  `[...]` (optional section), `{n}` / `{n,m}` / `{n,}` (repeat, capped at 64 slots), custom keys
  via `tokens: { H: { test: /[0-9A-Fa-f]/, transform: "upper" } }`.
- Template & selection: `showLiterals: "always" | "filled"`, `placeholderChar` (default `"_"`),
  `selectMask: (raw, alternatives) => number` for prefix-driven multi-mask formats (e.g. Amex vs Visa/MC).
- **Phone anti-pattern:** Never stack ambiguous lengths like `["(999) 999-9999", "+9 (999) 999-9999"]`
  on one input (an extra digit shifts the area code into the country code). Switch a single exact
  `mask` per country via `setOptions` instead.
- Exported types & errors: `MaskTokenDefinition`, `MaskSelector`, `NumberRounding`, `ChangeReason`,
  `OtpSlotLabel`, `MaskPatternError`, `PatternInputError`.

## One-time code

```ts
const group = document.querySelector<HTMLElement>("#code")!;
const otp = createOtpInput(group, { length: 6, name: "code" });
```

By default every non-hidden `<input>` inside the group is a slot, in DOM order. Pass
`slots: () => [...]` to choose them by index (leave an index `undefined` for a slot you do not
render) and call `otp.refresh()` after adding or removing slot elements. Render the hidden
aggregate input from `getHiddenInputProps()` (or pass `hiddenInput`) to submit the code.

## Controlled mode

Pass `value` and `onValueChange`; call `setOptions({ ...options, value })` to approve a change.
Not calling it rejects the change.

## Styling starter

Style `[role="group"]` with `display: flex; gap: 0.5rem;` and fixed-width OTP inputs
(`width: 2.625rem; height: 3rem; text-align: center;`), plus `input[aria-invalid="true"]` for
validation errors (`status === "invalid"`).

## Rules

Never wrap or replace a plain-text input and never write `el.value` yourself while a field is
attached.
