# @zealakit/pattern-input-react

[English](https://github.com/zealakit/pattern-input/blob/main/packages/react/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Hook và component mỏng cho field number, masked và one-time-code trong React 18 và 19.

> **Note**
> Package không ship CSS, class hay validation engine. Nó gắn hành vi vào element của bạn; bạn giữ toàn quyền về style và luật.

## Install

```bash
npm i @zealakit/pattern-input-react
```

## API

Ba field dùng chung một contract. Đổi `createNumberInput` thành `createMaskedInput` hoặc `createOtpInput` (tương tự với hook/composable).

```tsx
import { useNumberInput } from "@zealakit/pattern-input-react";

const field = useNumberInput({ maximumFractionDigits: 2 });

<input {...field.getInputProps({ id: "price" })} />;

field.value; field.formattedValue; field.status;
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
