# @zealakit/pattern-input-vanilla

[English](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Attach number, masked, and one-time-code behavior to host-owned inputs in Vanilla JS / TS.

> **Note**
> This package ships no CSS, no classes and no validation engine. It attaches behavior to elements you own; you keep full control of styling and rules.

## Install

```bash
npm i @zealakit/pattern-input-vanilla
npm i @zealakit/ui-engine   # peer
```

## API

The same three fields share one contract. Swap `createNumberInput` for `createMaskedInput` or `createOtpInput` (and the hook/composable equivalent).

```ts
import { createNumberInput } from "@zealakit/pattern-input-vanilla";

const field = createNumberInput(input, { maximumFractionDigits: 2 });

field.getInputProps();      // attributes for the host input
field.value;                // 1234.56
field.formattedValue;       // "1,234.56"
field.status;               // empty | incomplete | complete | invalid
field.setValue(99); field.clear(); field.undo(); field.redo();
field.destroy();
```

## OTP layout

Slots are inputs you own, in any structure. By default every non-hidden `<input>` inside the group is a slot, in DOM order; pass `slots` to choose them by index instead and leave an index `undefined` for a slot you do not render. Inputs past `length` are ignored.

```ts
import { createOtpInput } from "@zealakit/pattern-input-vanilla";

const group = document.querySelector<HTMLElement>("#code")!;
const otp = createOtpInput(group, { length: 6, name: "code" });

otp.value;      // "123456"
otp.status;     // empty | incomplete | complete | invalid
otp.destroy();
```

The group gets `role="group"` and the slots get their behavior attributes. Render the hidden aggregate input yourself from `getHiddenInputProps()` (or pass it as `hiddenInput`) to submit the code with a form.

Call `refresh()` after you add or remove slot elements.

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
