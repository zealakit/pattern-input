# @zealakit/pattern-input-vue

[English](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Composable và component render-function cho field number, masked và one-time-code trong Vue 3.5+.

> **Note**
> Package không ship CSS, class hay validation engine. Nó gắn hành vi vào element của bạn; bạn giữ toàn quyền về style và luật.

## Install

```bash
npm i @zealakit/pattern-input-vue
```

## API

Ba field dùng chung một contract. Đổi `createNumberInput` thành `createMaskedInput` hoặc `createOtpInput` (tương tự với hook/composable).

```ts
import { useNumberInput } from "@zealakit/pattern-input-vue";

const field = useNumberInput(() => ({ maximumFractionDigits: 2 }));

<input v-bind="field.getInputProps()" :ref="field.inputRef" />;

field.value(); field.formattedValue(); field.status();
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## OTP layout

Bố cục do bạn quyết định. `InputOTP.Group` và `InputOTP.Separator` chỉ là element thường, nên bạn có thể gom slot, thêm dấu phân cách hoặc bọc bất cứ thứ gì. Mỗi `InputOTP.Slot` nhận một `index` rõ ràng từ `0` đến `maxLength - 1`.

```vue
<script setup lang="ts">
import { InputOTP } from "@zealakit/pattern-input-vue";
import { ref } from "vue";

const code = ref("");
</script>

<template>
  <InputOTP v-model="code" :max-length="6" name="code" label="Verification code">
    <InputOTP.Group>
      <InputOTP.Slot :index="0" />
      <InputOTP.Slot :index="1" />
      <InputOTP.Slot :index="2" />
    </InputOTP.Group>
    <InputOTP.Separator>-</InputOTP.Separator>
    <InputOTP.Group>
      <InputOTP.Slot :index="3" />
      <InputOTP.Slot :index="4" />
      <InputOTP.Slot :index="5" />
    </InputOTP.Group>
  </InputOTP>
</template>
```

Root render một `role="group"` (đặt tên bằng `label` hoặc `labelledBy`) và một hidden input chứa toàn bộ mã theo `name`. Group không thêm ngữ nghĩa accessibility nào và separator bị ẩn khỏi công nghệ hỗ trợ. Các thuộc tính quyết định hành vi của slot (`type`, `inputmode`, `maxlength`, `tabindex`, `autocomplete`, `aria-label`) do field quản lý; mọi thứ còn lại, gồm `class` và `id`, được chuyển tiếp. `v-model` dùng được trên root.

Dot notation (`<InputOTP.Group>`) cần `<script setup>`; các phần cũng được export theo tên (`InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`).

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
