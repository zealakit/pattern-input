# @zealakit/pattern-input-svelte

[English](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Factory store-shaped, Svelte actions và component cho trường nhập số, mask và OTP trong Svelte 5.

> **Note**
> Package này không ship CSS, không class và không có validation engine. Nó gắn hành vi vào các element do bạn sở hữu; bạn giữ toàn quyền kiểm soát style và luật kiểm tra.

## Install

```bash
npm i @zealakit/pattern-input-svelte
npm i @zealakit/ui-engine   # peer
```

`@zealakit/ui-engine` (`^1.0.0-beta.1`) là peer dependency bắt buộc.

## Number input

### Quick start

```svelte
<script lang="ts">
  import { NumberInput, createNumberInput, fieldAction } from "@zealakit/pattern-input-svelte";

  let amount = $state<number | null>(null);
  const field = createNumberInput(() => ({ maximumFractionDigits: 2 }));
  $effect.pre(() => { field.sync(); });
  const props = $derived.by(() => { void $field; return field.getInputProps({ id: "price" }); });
</script>

<NumberInput bind:value={amount} id="price-comp" options={{ maximumFractionDigits: 2 }} />
<input {...props} use:fieldAction={field} />
```

### NumberOptions

| Tùy chọn | Kiểu | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `locale` | `string` | `"en-US"` (`.`, `,`) | Locale dùng một lần để lấy dấu thập phân và phân cách hàng nghìn qua `Intl.NumberFormat`. |
| `decimalSeparator` | `string` | Theo `locale` | Ký tự dấu thập phân tường minh (ghi đè `locale`). |
| `groupSeparator` | `string` | Theo `locale` | Ký tự phân cách nhóm số. Truyền `""` để tắt phân cách. |
| `minimumFractionDigits` | `number` | `0` | Số chữ số thập phân tối thiểu được đệm thêm khi commit. |
| `maximumFractionDigits` | `number` | `20` | Số chữ số thập phân tối đa khi nhập hoặc làm tròn khi commit. |
| `rounding` | `"truncate" \| "round-half-up" \| "round-half-even"` | `"round-half-up"` | Chế độ làm tròn khi commit nếu `value` vượt quá `maximumFractionDigits`. |
| `min` | `number` | `—` | Giá trị số nhỏ nhất hợp lệ. |
| `max` | `number` | `—` | Giá trị số lớn nhất hợp lệ. |
| `step` | `number` | `1` | Bước tăng/giảm cho phím `ArrowUp` / `ArrowDown`. |
| `largeStep` | `number` | `step * 10` | Bước lớn cho phím `PageUp` / `PageDown`. |
| `allowNegative` | `boolean` | `min === undefined \| min < 0` | Cho phép nhập số âm và phím `-`. |
| `clampBehavior` | `"blur" \| "none"` | `"blur"` | `"blur"` kẹp giá trị vào `[min, max]` khi commit; `"none"` giữ nguyên và đánh dấu `invalid`. |
| `validate` | `(value, ctx) => boolean \| string \| undefined` | `—` | Hàm kiểm tra của bạn chạy khi commit (`false` hoặc chuỗi sẽ đánh dấu `invalid`). |
| `invalid` | `boolean` | `false` | Ép `aria-invalid="true"` từ bên ngoài. |
| `describedBy` | `string` | `—` | Truyền sang `aria-describedby`. |
| `required` | `boolean` | `false` | Truyền sang `aria-required` / `required`. |
| `disabled` | `boolean` | `false` | Vô hiệu hóa tương tác trên input. |
| `readOnly` | `boolean` | `false` | Chặn chỉnh sửa nhưng vẫn cho focus và bôi đen. |
| `value` | `number \| null` | `—` | Giá trị ở chế độ controlled (kể cả `null` cũng bật controlled). |
| `defaultValue` | `number \| null` | `null` | Giá trị ban đầu ở chế độ uncontrolled. |
| `onValueChange` | `(change: ValueChange<number \| null>) => void` | `—` | Nhận `{ value, formattedValue, status, reason }`. |
| `onStatusChange` | `(status: FieldStatus) => void` | `—` | Gọi khi `status` thay đổi. |

## Masked input

### Quick start

```svelte
<script lang="ts">
  import { MaskedInput, createMaskedInput, fieldAction } from "@zealakit/pattern-input-svelte";

  let tax = $state("");
  const card = createMaskedInput(() => ({
    mask: ["9999 9999 9999 9999", "9999 999999 99999"],
    selectMask: (raw) => (/^3[47]/.test(raw) ? 1 : 0),
  }));
  $effect.pre(() => { card.sync(); });
  const cardProps = $derived.by(() => { void $card; return card.getInputProps({ id: "card" }); });
</script>

<MaskedInput bind:value={tax} id="tax" options={{ mask: "999.999.999-99" }} />
<input {...cardProps} use:fieldAction={card} />
```

### Mask pattern syntax

| Ký hiệu | Khớp với | Ví dụ |
| --- | --- | --- |
| `9` | Một chữ số ASCII `[0-9]` | `"999-999"` |
| `a` | Một chữ cái ASCII `[A-Za-z]` | `"aaa-999"` |
| `*` | Một ký tự chữ hoặc số `[A-Za-z0-9]` | `"****"` |
| `\x` | Ký tự literal được escape (`\9`, `\a`, `\*`, `\[`, `\{`, `\\`) | `"\9-999"` |
| `[...]` | Đoạn tùy chọn; bỏ trống vẫn đạt `status === "complete"` | `"(999) 999-9999[ x999]"` |
| `{n}`, `{n,m}`, `{n,}` | Lặp token đứng trước (`{n,}` tối đa 64 slot) | `"9{4}-9{2,4}"` |
| Key tùy chỉnh | Một ký tự khai báo trong `tokens` với `{ test, transform? }` | `"AA-9999-HH"` |

### MaskedOptions

| Tùy chọn | Kiểu | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `mask` | `string \| readonly string[]` | **required** | Chuỗi pattern hoặc mảng các pattern thay thế theo thứ tự. |
| `tokens` | `Record<string, MaskTokenDefinition>` | `{}` | Định nghĩa token tùy chỉnh một ký tự (`{ test: RegExp, transform?: "upper" \| "lower" }`). |
| `selectMask` | `(raw: string, alternatives: readonly string[]) => number` | `—` | Hàm chọn index bắt đầu từ 0 cho mảng `mask`. Giá trị ngoài phạm vi tự fallback. |
| `showLiterals` | `"filled" \| "always"` | `"filled"` | `"always"` hiển thị sẵn toàn bộ khung mask cùng `placeholderChar`. |
| `placeholderChar` | `string` | `"_"` | Một ký tự giữ chỗ cho slot trống khi bật `showLiterals: "always"`. |
| `inputMode` | `"text" \| "numeric"` | Tự động | Mặc định `"numeric"` khi mọi slot chỉ nhận chữ số. |
| `validate` | `(raw, ctx) => boolean \| string \| undefined` | `—` | Hàm kiểm tra chạy khi commit (`ctx` gồm `status` và `formattedValue`). |
| `invalid` | `boolean` | `false` | Ép `aria-invalid="true"` từ bên ngoài. |
| `describedBy` | `string` | `—` | Truyền sang `aria-describedby`. |
| `required` | `boolean` | `false` | Truyền sang `aria-required` / `required`. |
| `disabled` | `boolean` | `false` | Vô hiệu hóa tương tác trên input. |
| `readOnly` | `boolean` | `false` | Chặn chỉnh sửa nhưng vẫn cho focus và bôi đen. |
| `value` | `string` | `—` | Giá trị raw ở chế độ controlled (không gồm ký tự literal). |
| `defaultValue` | `string` | `""` | Giá trị raw ban đầu ở chế độ uncontrolled. |
| `onValueChange` | `(change: ValueChange<string>) => void` | `—` | Nhận `{ value, formattedValue, status, reason }`. |
| `onStatusChange` | `(status: FieldStatus) => void` | `—` | Gọi khi `status` thay đổi. |

### Phone, multi-mask, and custom token recipes

Chọn đúng chiến lược mask cho từng định dạng thực tế. Tránh gộp hai mẫu số điện thoại dễ nhập nhằng như `["(999) 999-9999", "+9 (999) 999-9999"]` trên cùng một input: khi gõ chữ số thứ 11, mã vùng sẽ bị đẩy thành mã quốc gia. Thay vào đó hãy đổi một `mask` chính xác theo quốc gia đang chọn.

```ts
// 1. Phone (single mask per selected country — never stack ambiguous lengths)
const PHONE_MASKS = { US: "(999) 999-9999", VN: "9999 999 999" };

// 2. Multi-mask by length (CPF 11 digits / CNPJ 14 digits)
const taxMask = ["999.999.999-99", "99.999.999/9999-99"];

// 3. Prefix-driven selectMask (Amex 4-6-5 vs Standard 4-4-4-4)
const cardOptions = {
  mask: ["9999 9999 9999 9999", "9999 999999 99999"],
  selectMask: (raw: string) => (/^3[47]/.test(raw) ? 1 : 0),
};

// 4. Always-visible template + custom uppercase tokens
const licenseOptions = {
  mask: "AA-9999-HH",
  tokens: {
    A: { test: /[A-Za-z]/, transform: "upper" as const },
    H: { test: /[0-9A-Fa-f]/, transform: "upper" as const },
  },
  showLiterals: "always" as const,
  placeholderChar: "_",
};
```

## One-time code (OTP)

### Quick start

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

### OtpOptions

| Tùy chọn | Kiểu | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `length` / `maxLength` | `number` | **required** | Số lượng ô OTP (`1..32`). Component dùng `maxLength`; factory dùng `length`. |
| `type` | `"numeric" \| "alphanumeric"` | `"numeric"` | Loại ký tự hợp lệ cho mỗi ô. |
| `transform` | `"upper" \| "lower"` | `—` | Đổi kiểu chữ khi `type: "alphanumeric"`. |
| `autocomplete` | `"one-time-code" \| "off"` | `"one-time-code"` | Gắn lên ô đầu tiên để hỗ trợ tự điền SMS/OS. |
| `name` | `string` | `—` | Tên trường form cho thẻ `<input>` ẩn tổng hợp mã. |
| `label` | `string` | `—` | `aria-label` cho nhóm OTP. |
| `labelledBy` | `string` | `—` | `aria-labelledby` cho nhóm OTP. |
| `describedBy` | `string` | `—` | Truyền sang `aria-describedby` của nhóm. |
| `slotLabel` | `(index: number, length: number) => string` | `Character i of n` | Hàm tạo nhãn accessibility cho từng ô. |
| `validate` | `(raw, ctx) => boolean \| string \| undefined` | `—` | Hàm kiểm tra chạy khi commit. |
| `invalid` | `boolean` | `false` | Đánh dấu `aria-invalid="true"` trên nhóm và các ô. |
| `disabled` | `boolean` | `false` | Vô hiệu hóa tất cả ô nhập. |
| `required` | `boolean` | `false` | Đánh dấu các ô là bắt buộc. |
| `value` | `string` | `—` | Chuỗi OTP ở chế độ controlled. |
| `defaultValue` | `string` | `""` | Chuỗi OTP ban đầu ở chế độ uncontrolled. |
| `onValueChange` | `(change: ValueChange<string>) => void` | `—` | Nhận `{ value, formattedValue, status, reason }`. |
| `onStatusChange` | `(status: FieldStatus) => void` | `—` | Gọi khi `status` thay đổi. |

## Controlled mode and validation

Truyền `value` và `onValueChange` để dùng chế độ controlled. `onValueChange` nhận `{ value, formattedValue, status, reason }`, trong đó `reason` là `"input" | "paste" | "delete" | "step" | "commit" | "reset" | "undo" | "redo" | "programmatic"`. Nếu không cập nhật `value`, thay đổi bị từ chối và giữ nguyên text cùng vị trí con trỏ đã duyệt.

`status` là `"empty" | "incomplete" | "complete" | "invalid"`. Input nhập dở không bao giờ bị báo invalid; `validate` chỉ chạy khi commit (`Enter` hoặc blur), và trả về `false` hoặc một chuỗi sẽ đặt `status = "invalid"` cùng `aria-invalid="true"`. Kết hợp `describedBy` với id của thẻ báo lỗi.

## Contract and lifecycle

Mỗi factory trả về một Svelte store cùng `value()`, `formattedValue()`, `status()`, `getInputProps(extra?)` (hoặc `getGroupProps()`, `getSlotProps(i)`, `getHiddenInputProps()`), `setValue`, `clear`, `focus`, `undo`, `redo`, `setOptions`, `sync()` và `attach(node)`. `<NumberInput>`, `<MaskedInput>` và `<InputOTP>` hỗ trợ `bind:value` và truyền thẳng thuộc tính HTML. Package export đầy đủ `CONTRACT_VERSION`, `GETTER_NAMES`, `INSTANCE_API`, `PatternInputError`, `MaskPatternError` và các type tiện ích.

## SvelteKit

Mọi import đều an toàn với SSR. Gọi `field.sync()` trong `$effect.pre` khi dùng factory, và bọc `getInputProps()` trong `$derived.by(() => { void $field; return field.getInputProps(); })` để `aria-invalid` cập nhật ra DOM.

## Styling hooks

| Selector / Thuộc tính | Vị trí | Mục đích |
| --- | --- | --- |
| `input[aria-invalid="true"]` | Number, Masked, các ô OTP | Chỉ xuất hiện khi `status === "invalid"` hoặc `invalid: true` (không bao giờ bật khi chỉ mới incomplete). |
| `input:disabled` | Number, Masked, các ô OTP | Áp dụng khi `disabled: true`. |
| `input[readonly]` | Number, Masked | Áp dụng khi `readOnly: true`. |
| `[role="group"]` | Container OTP | Container chuẩn accessibility để xếp các ô OTP theo hàng ngang. |
| `:focus-visible` | Mọi input | Dùng để vẽ vòng focus đạt chuẩn accessibility. |

```css
input {
  font: inherit;
  font-variant-numeric: tabular-nums;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid #94a3b8;
  border-radius: 8px;
}

input:focus-visible {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
  outline: none;
}

input[aria-invalid="true"] {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

[role="group"] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

[role="group"] input {
  width: 2.625rem;
  height: 3rem;
  padding: 0;
  text-align: center;
  font-weight: 600;
}
```

## Agent Skill

Thêm skill tích hợp cho AI agent: [Pattern Input Svelte](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-svelte.md).

## License

MIT © Zealakit
