# @zealakit/pattern-input-svelte

[English](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Factories, actions, and components for number, masked, and one-time-code fields in Svelte 5.

> **Note**
> This package ships no CSS, no classes and no validation engine. It attaches behavior to elements you own; you keep full control of styling and rules.

## Install

```bash
npm i @zealakit/pattern-input-svelte
```

## API

The same three fields share one contract. Swap `createNumberInput` for `createMaskedInput` or `createOtpInput` (and the hook/composable equivalent).

```ts
import { createNumberInput } from "@zealakit/pattern-input-svelte";

const field = createNumberInput(() => ({ maximumFractionDigits: 2 }));

<input {...field.getInputProps()} use:fieldAction={field} />;

field.value(); field.formattedValue(); field.status();
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## Contract

Every field exposes `value`, `formattedValue`, and `status`, plus `setValue`, `clear`, `focus`, `undo`, and `redo`. Getters are named `getInputProps` for number and masked, and `getGroupProps` / `getSlotProps` / `getHiddenInputProps` for OTP. `CONTRACT_VERSION` is exported from the package.

## Behavior

- Caret and selection survive formatting, editing, and paste.\n- Paste is parsed by the field; literals and separators are handled.\n- IME composition commits once, after `compositionend`.\n- Controlled and uncontrolled modes are both supported.\n- Undo/redo restore value and caret.\n- ARIA: `aria-invalid` only for real invalid state.

## Non-goals

- No default styles, themes, or class names.\n- No bundled schema validation (consumer callbacks only).\n- No wrapping or replacing plain-text inputs.\n- No date pickers, currency conversion, phone metadata, or network calls.

## License

MIT © Zealakit
