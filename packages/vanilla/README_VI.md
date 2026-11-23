# @zealakit/pattern-input-vanilla

[English](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Gắn hành vi number, masked và one-time-code vào input do bạn sở hữu với Vanilla JS / TS.

> **Note**
> Package không ship CSS, class hay validation engine. Nó gắn hành vi vào element của bạn; bạn giữ toàn quyền về style và luật.

## Install

```bash
npm i @zealakit/pattern-input-vanilla
```

## API

Ba field dùng chung một contract. Đổi `createNumberInput` thành `createMaskedInput` hoặc `createOtpInput` (tương tự với hook/composable).

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

Slot là các input do bạn sở hữu, trong bất kỳ cấu trúc nào. Mặc định mỗi `<input>` không ẩn bên trong group là một slot, theo thứ tự DOM; truyền `slots` để chọn theo index và để một index là `undefined` cho slot bạn không render. Input vượt quá `length` bị bỏ qua.

```ts
import { createOtpInput } from "@zealakit/pattern-input-vanilla";

const group = document.querySelector<HTMLElement>("#code")!;
const otp = createOtpInput(group, { length: 6, name: "code" });

otp.value;      // "123456"
otp.status;     // empty | incomplete | complete | invalid
otp.destroy();
```

Group nhận `role="group"` và các slot nhận thuộc tính hành vi. Tự render hidden input tổng hợp từ `getHiddenInputProps()` (hoặc truyền qua `hiddenInput`) để gửi mã cùng form.

Gọi `refresh()` sau khi thêm hoặc bớt element slot.

## Contract

Mọi field expose `value`, `formattedValue`, `status`, cùng `setValue`, `clear`, `focus`, `undo`, `redo`. Getter tên `getInputProps` cho number và masked, `getGroupProps` / `getSlotProps` / `getHiddenInputProps` cho OTP. `CONTRACT_VERSION` được export từ package.

## Behavior

- Caret và selection được giữ khi format, sửa và paste.
- Paste được parse bởi field; literal và separator được xử lý.
- IME commit một lần sau `compositionend`.
- Hỗ trợ cả controlled và uncontrolled.
- Undo/redo khôi phục value và caret.
- ARIA: `aria-invalid` chỉ khi thật sự invalid.

## Non-goals

- Không có style, theme hay class mặc định.
- Không có schema validation (chỉ callback của consumer).
- Không bọc hay thay thế input text thường.
- Không date picker, quy đổi tiền tệ, metadata điện thoại hay gọi mạng.

## License

MIT © Zealakit
