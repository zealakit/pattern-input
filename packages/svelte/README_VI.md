# @zealakit/pattern-input-svelte

[English](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Factory, action và component cho field number, masked và one-time-code trong Svelte 5.

> **Note**
> Package không ship CSS, class hay validation engine. Nó gắn hành vi vào element của bạn; bạn giữ toàn quyền về style và luật.

## Install

```bash
npm i @zealakit/pattern-input-svelte
npm i @zealakit/ui-engine   # peer
```

## API

Ba field dùng chung một contract. Đổi `createNumberInput` thành `createMaskedInput` hoặc `createOtpInput` (tương tự với hook/composable).

```svelte
<script lang="ts">
  import { createNumberInput, fieldAction } from "@zealakit/pattern-input-svelte";

  const field = createNumberInput(() => ({ maximumFractionDigits: 2 }));
  // Read the store so Svelte re-runs the getter when the state changes.
  const props = $derived.by(() => {
    void $field;
    return field.getInputProps();
  });
</script>

<input {...props} use:fieldAction={field} />
```

```ts
field.value(); field.formattedValue(); field.status();
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## OTP layout

Bố cục do bạn quyết định. `InputOTP.Group` và `InputOTP.Separator` chỉ là element thường, nên bạn có thể gom slot, thêm dấu phân cách hoặc bọc bất cứ thứ gì. Mỗi `InputOTP.Slot` nhận một `index` rõ ràng từ `0` đến `maxLength - 1`.

```svelte
<script lang="ts">
  import { InputOTP } from "@zealakit/pattern-input-svelte";

  let code = $state("");
</script>

<InputOTP maxLength={6} bind:value={code} name="code" label="Verification code">
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
</InputOTP>
```

Root render một `role="group"` (đặt tên bằng `label` hoặc `labelledBy`) và một hidden input chứa toàn bộ mã theo `name`. Group không thêm ngữ nghĩa accessibility nào và separator bị ẩn khỏi công nghệ hỗ trợ. Các thuộc tính quyết định hành vi của slot (`type`, `inputmode`, `maxlength`, `tabindex`, `autocomplete`, `aria-label`) do field quản lý; mọi thứ còn lại, gồm `class` và `id`, được chuyển tiếp. `bind:value` dùng được trên root.

Với factory API, đăng ký từng input slot bằng `use:otpSlotAction={{ field, index }}` và group bằng `use:otpGroupAction={field}`. Các phần cũng được export theo tên (`InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`).

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
