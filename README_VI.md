# Zealakit Pattern Input

[English](https://github.com/zealakit/pattern-input/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Các primitive hành vi headless cho input number, masked và one-time-code bằng Vanilla TypeScript, React, Vue và Svelte.

- **Core** — kernel dùng chung nội bộ cho parse, format, trạng thái caret và lớp DOM duy nhất. Được đóng gói sẵn trong mọi adapter và không publish riêng.
- **Adapter** — mỗi framework một package, cùng một contract prop-getter.
- **An toàn SSR** — import package không bao giờ chạm vào biến toàn cục của trình duyệt.

Pattern Input xử lý format, caret và selection, điều hướng bàn phím, paste, IME và thuộc tính ARIA. Thư viện không ship style và không có validation engine: bạn sở hữu element, CSS và luật của mình.

> **Note**
> Pattern Input là bộ primitive headless tập trung cho input number, masked và one-time-code. Thư viện không ship CSS và không render markup có style, nên bạn kiểm soát hoàn toàn giao diện. Date picker, quy đổi tiền tệ, metadata số điện thoại và validation engine không nằm trong phạm vi.
>
> Pattern Input không thay thế một UI library hay design system đầy đủ. Hãy dùng khi bạn cần hành vi input có accessibility mà không phải mang theo một bộ kit lớn, hoặc khi input của thư viện hiện tại khó restyle.

## Which field to use

| Field | Phù hợp cho | Kiểu dữ liệu | Tính năng chính |
| --- | --- | --- | --- |
| Number | Giá tiền, số lượng, số thập phân, phần trăm | `number \| null` | Dấu phân cách theo locale, phím tăng/giảm, làm tròn, giới hạn min/max |
| Masked | Mã số thuế, số điện thoại, số thẻ, license key | `string` (raw không chứa ký tự literal) | Đa mẫu mask, `selectMask`, token tùy chỉnh, `showLiterals` |
| OTP | Mã 2FA, xác thực SMS, mã PIN | `string` (chuỗi mã ghép lại) | Focus từng ô / roving `tabindex`, phân phối khi paste, hidden input cho form |

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/pattern-input-vanilla` | Vanilla JS / TS | [README](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_VI.md) |
| `@zealakit/pattern-input-react` | React 18 / 19 | [README](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_VI.md) |
| `@zealakit/pattern-input-vue` | Vue 3.5+ | [README](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_VI.md) |
| `@zealakit/pattern-input-svelte` | Svelte 5 | [README](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_VI.md) |

Cài một adapter cho framework của bạn. Ứng dụng đã có framework runtime nên bạn chỉ cần thêm adapter. Mỗi adapter đóng gói sẵn `@zealakit/pattern-input-core`, package này không publish lên npm; bạn không bao giờ cài hay cấu hình core trực tiếp.

## Installation

```bash
npm i @zealakit/pattern-input-vanilla
npm i @zealakit/ui-engine   # peer
npm i @zealakit/pattern-input-react
npm i @zealakit/ui-engine   # peer
npm i @zealakit/pattern-input-vue
npm i @zealakit/ui-engine   # peer
npm i @zealakit/pattern-input-svelte
npm i @zealakit/ui-engine   # peer

# or yarn, pnpm, ...
```

## Status

Đây là `1.0.0-beta.1`. Cả ba field (number, masked, OTP) hoạt động trong mọi adapter, cùng contract prop-getter và bộ vector conformance. Package không ship style, không có validation engine và không bọc input text thường.

## Behavior

| Capability | Number | Masked | OTP |
| --- | --- | --- | --- |
| Caret sống sót khi format và paste | Yes | Yes | Yes |
| Paste được field tự parse | Yes | Yes | Yes |
| IME commit một lần tại compositionend | Yes | Yes | Yes |
| inputmode đúng trên mobile | decimal / numeric | numeric hoặc text | numeric |
| Chế độ controlled và uncontrolled | Yes | Yes | Yes |
| Undo / redo kèm caret | Yes | Yes | Yes |
| ARIA (`aria-invalid`, label, hidden input) | Yes | Yes | Yes |

## Size

Min+gzip cho từng adapter × field, đo bằng esbuild (`pnpm size`):

| Adapter | Number | Masked | OTP |
| --- | --- | --- | --- |
| vanilla | 8.5 kB | 7.6 kB | 5.6 kB |
| react | 8.7 kB | 7.8 kB | 5.8 kB |
| vue | 8.4 kB | 7.5 kB | 5.6 kB |
| svelte | 8.3 kB | 7.4 kB | 6.9 kB |

## Examples

Thư mục [`examples/`](https://github.com/zealakit/pattern-input/tree/main/examples) chứa các project tích hợp chạy được cho Vanilla, React, Vue, Svelte và Next.js. Các ví dụ minh họa:

- Nhập số với chuyển đổi locale trực tiếp (`de-DE` / `en-US` / `vi-VN`)
- Nhập số điện thoại chọn theo quốc gia (`US`, `VN`, `UK`) không bị trượt mã vùng khi dư chữ số
- Mã số thuế đa mask (CPF 11 số / CNPJ 14 số) và thẻ thanh toán dùng `selectMask` theo đầu số (Visa/MC vs Amex)
- Token tùy chỉnh với `showLiterals: "always"`, OTP 6 ô submit form, từ chối giá trị controlled và kiểm tra hợp lệ khi blur

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

Thêm skill tích hợp cho framework của bạn vào thư mục skills của agent:

- [Pattern Input React](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-react.md) — component, controlled state, styling và luật Next.js.
- [Pattern Input Vue](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vue.md) — component, v-model, composable và luật Nuxt.js.
- [Pattern Input Svelte](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-svelte.md) — component, bind:value, action và luật SvelteKit.
- [Pattern Input Vanilla](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vanilla.md) — hàm create*, host element và luật vòng đời.

## License

MIT © Zealakit
