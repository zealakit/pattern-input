# @zealakit/pattern-input-svelte

[English](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Factory, action và component cho field number, masked và one-time-code trong Svelte 5.

> **Note**
> Package không ship CSS, class hay validation engine. Nó gắn hành vi vào element của bạn; bạn giữ toàn quyền về style và luật.

## Install

```bash
npm i @zealakit/pattern-input-svelte
```

## API

Ba field dùng chung một contract. Đổi `createNumberInput` thành `createMaskedInput` hoặc `createOtpInput` (tương tự với hook/composable).

```ts
import { createNumberInput } from "@zealakit/pattern-input-svelte";

const field = createNumberInput(() => ({ maximumFractionDigits: 2 }));

<input {...field.getInputProps()} use:fieldAction={field} />;

field.value(); field.formattedValue(); field.status();
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## Contract

Mọi field expose `value`, `formattedValue`, `status`, cùng `setValue`, `clear`, `focus`, `undo`, `redo`. Getter tên `getInputProps` cho number và masked, `getGroupProps` / `getSlotProps` / `getHiddenInputProps` cho OTP. `CONTRACT_VERSION` được export từ package.

## Behavior

- Caret và selection được giữ khi format, sửa và paste.\n- Paste được parse bởi field; literal và separator được xử lý.\n- IME commit một lần sau `compositionend`.\n- Hỗ trợ cả controlled và uncontrolled.\n- Undo/redo khôi phục value và caret.\n- ARIA: `aria-invalid` chỉ khi thật sự invalid.

## Non-goals

- Không có style, theme hay class mặc định.\n- Không có schema validation (chỉ callback của consumer).\n- Không bọc hay thay thế input text thường.\n- Không date picker, quy đổi tiền tệ, metadata điện thoại hay gọi mạng.

## License

MIT © Zealakit
