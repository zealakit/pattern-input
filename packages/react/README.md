# @zealakit/pattern-input-react

[English](https://github.com/zealakit/pattern-input/blob/main/packages/react/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg)

Hooks and thin components for number, masked, and one-time-code fields in React 18 and 19.

> **Note**
> This package ships no CSS, no classes and no validation engine. It attaches behavior to elements you own; you keep full control of styling and rules.

## Install

```bash
npm i @zealakit/pattern-input-react
```

## API

The same three fields share one contract. Swap `createNumberInput` for `createMaskedInput` or `createOtpInput` (and the hook/composable equivalent).

```tsx
import { useNumberInput } from "@zealakit/pattern-input-react";

const field = useNumberInput({ maximumFractionDigits: 2 });

<input {...field.getInputProps({ id: "price" })} />;

field.value; field.formattedValue; field.status;
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## OTP layout

Layout is yours. `InputOTP.Group` and `InputOTP.Separator` are plain elements, so you can group slots, add separators or wrap anything. Each `InputOTP.Slot` takes an explicit `index` from `0` to `maxLength - 1`.

```tsx
import { InputOTP } from "@zealakit/pattern-input-react";

<InputOTP maxLength={6} name="code" label="Verification code">
  <InputOTP.Group>
    <InputOTP.Slot index={0} />
    <InputOTP.Slot index={1} />
    <InputOTP.Slot index={2} />
  </InputOTP.Group>
  <InputOTP.Separator>-</InputOTP.Separator>
  <InputOTP.Group>
    <InputOTP.Slot index={3} />
    <InputOTP.Slot index={4} />
    <InputOTP.Slot index={5} />
  </InputOTP.Group>
</InputOTP>;
```

The root renders one `role="group"` (named by `label` or `labelledBy`) and a hidden input carrying the full code under `name`. Groups add no extra accessibility semantics and separators are hidden from assistive technology. Slot attributes that drive behavior (`type`, `inputMode`, `maxLength`, `tabIndex`, `autoComplete`, `aria-label`) are owned by the field; everything else, including `className`, `id` and `ref`, passes through.

The parts are also exported by name (`InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`). Use those instead of dot notation when importing across a React Server Components boundary.

## Contract

Every field exposes `value`, `formattedValue`, and `status`, plus `setValue`, `clear`, `focus`, `undo`, and `redo`. Getters are named `getInputProps` for number and masked, and `getGroupProps` / `getSlotProps` / `getHiddenInputProps` for OTP. `CONTRACT_VERSION` is exported from the package.

## Behavior

- Caret and selection survive formatting, editing, and paste.
- Paste is parsed by the field; literals and separators are handled.
- IME composition commits once, after `compositionend`.
- Controlled and uncontrolled modes are both supported.
- Undo/redo restore value and caret.
- ARIA: `aria-invalid` only for real invalid state.

## Non-goals

- No default styles, themes, or class names.
- No bundled schema validation (consumer callbacks only).
- No wrapping or replacing plain-text inputs.
- No date pickers, currency conversion, phone metadata, or network calls.

## License

MIT © Zealakit
