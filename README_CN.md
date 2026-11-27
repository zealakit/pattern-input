# Zealakit Pattern Input

[English](https://github.com/zealakit/pattern-input/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

面向 Vanilla TypeScript、React、Vue 和 Svelte 的 number、masked 与一次性验证码（OTP）输入框无头行为原语。

- **Core** — 内部共享内核，负责解析、格式化、光标状态和唯一的 DOM 绑定层。它被打包进每个适配器，不单独发布。
- **Adapters** — 每个框架一个包，遵循同一套 prop-getter 契约。
- **SSR 安全** — 导入包时绝不会访问浏览器全局对象。

Pattern Input 负责格式化、光标与选区、键盘导航、剪贴板粘贴、IME 合成以及 ARIA 属性。它不提供样式，也不内置校验引擎：元素、CSS 与规则都由你掌握。

> **Note**
> Pattern Input 是专注于 number、masked 和一次性验证码字段的无头原语集合。它不附带 CSS，也不渲染带样式的结构，因此视觉完全由你控制。日期选择器、货币换算、电话号码元数据和校验引擎均不在范围内。
>
> Pattern Input 不能替代完整的 UI 库或设计系统。当你需要具备无障碍行为的输入框、又不想引入庞大组件库，或现有库的输入框难以重写样式时，适合使用它。

## Which field to use

| 字段 | 适用场景 | 输出类型 | 核心特性 |
| --- | --- | --- | --- |
| Number | 价格、数量、小数、百分比 | `number \| null` | 本地化分隔符、步进快捷键、舍入、min/max 限制 |
| Masked | 税号、电话号码、银行卡号、激活码 | `string`（不含字面量的原始字符） | 多掩码切换、`selectMask`、自定义 token、`showLiterals` |
| OTP | 双重验证、短信验证码、PIN 码 | `string`（拼接后的完整代码） | 单格焦点与 roving `tabindex`、粘贴分发、表单隐藏输入 |

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/pattern-input-vanilla` | Vanilla JS / TS | [README](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_CN.md) |
| `@zealakit/pattern-input-react` | React 18 / 19 | [README](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_CN.md) |
| `@zealakit/pattern-input-vue` | Vue 3.5+ | [README](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_CN.md) |
| `@zealakit/pattern-input-svelte` | Svelte 5 | [README](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_CN.md) |

为你的框架安装一个适配器即可。应用本身已提供框架运行时，因此只需添加适配器。每个适配器都打包了 `@zealakit/pattern-input-core`，该包不会发布到 npm；你无需安装或配置 core。

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

当前为 `1.0.0-beta.1`。三类字段（number、masked、OTP）在所有适配器中均可使用，共享同一套 prop-getter 契约与一致性向量。包不提供样式、不内置校验引擎，也不包装普通文本输入框。

## Behavior

| Capability | Number | Masked | OTP |
| --- | --- | --- | --- |
| 格式化与粘贴时光标保持 | Yes | Yes | Yes |
| 粘贴由字段自身解析 | Yes | Yes | Yes |
| IME 在 compositionend 时只提交一次 | Yes | Yes | Yes |
| 移动端 inputmode 正确 | decimal / numeric | numeric 或 text | numeric |
| 受控与非受控模式 | Yes | Yes | Yes |
| 撤销 / 重做并恢复光标 | Yes | Yes | Yes |
| ARIA（`aria-invalid`、标签、隐藏输入） | Yes | Yes | Yes |

## Size

每个适配器 × 字段的 min+gzip 体积，使用 esbuild 测量（`pnpm size`）：

| Adapter | Number | Masked | OTP |
| --- | --- | --- | --- |
| vanilla | 8.5 kB | 7.6 kB | 5.6 kB |
| react | 8.7 kB | 7.8 kB | 5.8 kB |
| vue | 8.4 kB | 7.5 kB | 5.6 kB |
| svelte | 8.3 kB | 7.4 kB | 6.9 kB |

## Examples

[`examples/`](https://github.com/zealakit/pattern-input/tree/main/examples) 目录包含 Vanilla、React、Vue、Svelte 和 Next.js 的可运行集成项目，演示了以下场景：

- 支持实时切换 locale 的数字输入（`de-DE` / `en-US` / `vi-VN`）
- 按国家切换的电话号码掩码（`US`、`VN`、`UK`），避免多余数字导致区号错位
- 按长度切换的多掩码税号（CPF 11 位 / CNPJ 14 位）与按前缀 `selectMask` 切换的银行卡格式（Visa/MC 与 Amex）
- 自定义 token 配合 `showLiterals: "always"`、6 格 OTP 表单提交、受控拒绝与失焦校验

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

将对应框架的集成 skill 加入 agent 的 skills 目录：

- [Pattern Input React](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-react.md) — 组件、受控状态、样式与 Next.js 规则。
- [Pattern Input Vue](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vue.md) — 组件、v-model、组合式函数与 Nuxt 规则。
- [Pattern Input Svelte](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-svelte.md) — 组件、bind:value、action 与 SvelteKit 规则。
- [Pattern Input Vanilla](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vanilla.md) — create* 函数、宿主元素与生命周期规则。

## License

MIT © Zealakit
