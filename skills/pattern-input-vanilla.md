# Pattern Input — Vanilla

Use this skill when integrating `@zealakit/pattern-input-vanilla` into a plain TypeScript app.

- Install: `npm i @zealakit/pattern-input-vanilla`
- You own the elements and the styling; the package never creates elements, ships no CSS and no
  validation engine.

## Number and masked

```ts
const price = createNumberInput(document.querySelector("#price")!, {
  maximumFractionDigits: 2,
  onValueChange: (change) => console.log(change.value, change.status),
});
price.setValue(99);
price.destroy(); // detaches listeners and restores the attributes it added
```

The element must be a text-like `<input>` (`text`, `tel`, `search`); otherwise
`PatternInputError` `UNSUPPORTED_ELEMENT`. Without a DOM it throws `NO_DOM`.

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

## Rules

Never wrap or replace a plain-text input and never write `el.value` yourself while a field is
attached.
