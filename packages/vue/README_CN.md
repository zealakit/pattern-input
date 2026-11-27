# @zealakit/pattern-input-vue

[English](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

适用于 Vue 3.5+ 的数字、掩码与一次性验证码（OTP）组合式函数与组件。

> **Note**
> 本包不提供 CSS、不提供类名，也不内置校验引擎。它只为你自己的元素附加行为；样式与规则完全由你掌控。

## Install

```bash
npm i @zealakit/pattern-input-vue
npm i @zealakit/ui-engine   # peer
```

`@zealakit/ui-engine`（`^1.0.0-beta.1`）为必需的对等依赖（peer dependency）。

## Number input

### Quick start

```vue
<script setup lang="ts">
import { ref } from "vue";
import { NumberInput, useNumberInput } from "@zealakit/pattern-input-vue";

const amount = ref<number | null>(null);
const field = useNumberInput(() => ({ maximumFractionDigits: 2 }));
</script>

<template>
  <NumberInput v-model="amount" id="price" placeholder="1,234.56" :options="{ min: 0 }" />
  <input v-bind="field.getInputProps({ id: 'price-hook' })" :ref="field.inputRef" />
</template>
```

### NumberOptions

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `locale` | `string` | `"en-US"` (`.`, `,`) | 通过 `Intl.NumberFormat` 解析小数点与千分位分隔符的 locale。 |
| `decimalSeparator` | `string` | 取自 `locale` | 显式指定小数点字符（覆盖 `locale`）。 |
| `groupSeparator` | `string` | 取自 `locale` | 分组分隔符；传 `""` 可关闭分组。 |
| `minimumFractionDigits` | `number` | `0` | 提交时最少补齐的小数位数。 |
| `maximumFractionDigits` | `number` | `20` | 输入允许的最大小数位数或提交时舍入的位数。 |
| `rounding` | `"truncate" \| "round-half-up" \| "round-half-even"` | `"round-half-up"` | 提交时小数位数超出 `maximumFractionDigits` 所用的舍入模式。 |
| `min` | `number` | `—` | 允许的最小数值。 |
| `max` | `number` | `—` | 允许的最大数值。 |
| `step` | `number` | `1` | `ArrowUp` / `ArrowDown` 的步长。 |
| `largeStep` | `number` | `step * 10` | `PageUp` / `PageDown` 的大步长。 |
| `allowNegative` | `boolean` | `min === undefined \| min < 0` | 是否允许负数及 `-` 键。 |
| `clampBehavior` | `"blur" \| "none"` | `"blur"` | `"blur"` 在提交时钳制到 `[min, max]`；`"none"` 保留原值并标记 `invalid`。 |
| `validate` | `(value, ctx) => boolean \| string \| undefined` | `—` | 提交时触发的自定义校验回调（返回 `false` 或字符串标记为 `invalid`）。 |
| `invalid` | `boolean` | `false` | 外部强制设置 `aria-invalid="true"`。 |
| `describedBy` | `string` | `—` | 透传给 `aria-describedby`。 |
| `required` | `boolean` | `false` | 透传给 `aria-required` / `required`。 |
| `disabled` | `boolean` | `false` | 禁用输入交互。 |
| `readOnly` | `boolean` | `false` | 禁止编辑但允许聚焦与选区。 |
| `value` | `number \| null` | `—` | 受控模式值（即使为 `null` 也启用受控模式）。 |
| `defaultValue` | `number \| null` | `null` | 非受控模式的初始值。 |
| `onValueChange` | `(change: ValueChange<number \| null>) => void` | `—` | 变更回调，参数为 `{ value, formattedValue, status, reason }`。 |
| `onStatusChange` | `(status: FieldStatus) => void` | `—` | `status` 变化时调用。 |

## Masked input

### Quick start

```vue
<script setup lang="ts">
import { ref } from "vue";
import { MaskedInput, useMaskedInput } from "@zealakit/pattern-input-vue";

const tax = ref("");
const card = useMaskedInput(() => ({
  mask: ["9999 9999 9999 9999", "9999 999999 99999"],
  selectMask: (raw) => (/^3[47]/.test(raw) ? 1 : 0),
}));
</script>

<template>
  <MaskedInput v-model="tax" id="tax" :options="{ mask: '999.999.999-99' }" />
  <input v-bind="card.getInputProps({ id: 'card' })" :ref="card.inputRef" />
</template>
```

### Mask pattern syntax

| 符号 | 匹配内容 | 示例 |
| --- | --- | --- |
| `9` | 单个 ASCII 数字 `[0-9]` | `"999-999"` |
| `a` | 单个 ASCII 字母 `[A-Za-z]` | `"aaa-999"` |
| `*` | 单个字母或数字 `[A-Za-z0-9]` | `"****"` |
| `\x` | 转义字面量字符（`\9`、`\a`、`\*`、`\[`、`\{`、`\\`） | `"\9-999"` |
| `[...]` | 可选片段；留空不影响 `complete` 状态 | `"(999) 999-9999[ x999]"` |
| `{n}`, `{n,m}`, `{n,}` | 重复前一个 token（`{n,}` 上限 64 个槽位） | `"9{4}-9{2,4}"` |
| 自定义键 | 在 `tokens` 中通过 `{ test, transform? }` 定义的单字符 token | `"AA-9999-HH"` |

### MaskedOptions

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mask` | `string \| readonly string[]` | **required** | 掩码字符串或按顺序排列的多掩码数组。 |
| `tokens` | `Record<string, MaskTokenDefinition>` | `{}` | 自定义单字符 token（`{ test: RegExp, transform?: "upper" \| "lower" }`）。 |
| `selectMask` | `(raw: string, alternatives: readonly string[]) => number` | `—` | 针对数组 `mask` 的自定义 0 起始索引选择器，越界时自动回退默认匹配。 |
| `showLiterals` | `"filled" \| "always"` | `"filled"` | `"always"` 使用 `placeholderChar` 显示完整掩码模板。 |
| `placeholderChar` | `string` | `"_"` | 启用 `showLiterals: "always"` 时未填槽位的单字符占位符。 |
| `inputMode` | `"text" \| "numeric"` | 自动 | 当所有槽位仅接受数字时默认为 `"numeric"`。 |
| `validate` | `(raw, ctx) => boolean \| string \| undefined` | `—` | 提交时触发的校验回调（`ctx` 包含 `status` 与 `formattedValue`）。 |
| `invalid` | `boolean` | `false` | 外部强制设置 `aria-invalid="true"`。 |
| `describedBy` | `string` | `—` | 透传给 `aria-describedby`。 |
| `required` | `boolean` | `false` | 透传给 `aria-required` / `required`。 |
| `disabled` | `boolean` | `false` | 禁用输入交互。 |
| `readOnly` | `boolean` | `false` | 禁止编辑但允许聚焦与选区。 |
| `value` | `string` | `—` | 受控模式下的原始值（不含字面量）。 |
| `defaultValue` | `string` | `""` | 非受控模式下的初始原始值。 |
| `onValueChange` | `(change: ValueChange<string>) => void` | `—` | 变更回调，参数为 `{ value, formattedValue, status, reason }`。 |
| `onStatusChange` | `(status: FieldStatus) => void` | `—` | `status` 变化时调用。 |

### Phone, multi-mask, and custom token recipes

针对不同业务格式选择合适的掩码策略。切勿把容易混淆的同位数字电话掩码（如 `["(999) 999-9999", "+9 (999) 999-9999"]`）混放在同一个输入框中：多输入第 11 位数字会导致区号被误移成国家码。请改用按所选国家切换单个精确 `mask` 的方式。

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

```vue
<script setup lang="ts">
import { ref } from "vue";
import { InputOTP } from "@zealakit/pattern-input-vue";

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

### OtpOptions

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `length` / `maxLength` | `number` | **required** | OTP 槽位数量（`1..32`）。组件使用 `maxLength`，工厂函数使用 `length`。 |
| `type` | `"numeric" \| "alphanumeric"` | `"numeric"` | 每个槽位允许的字符类型。 |
| `transform` | `"upper" \| "lower"` | `—` | 当 `type: "alphanumeric"` 时的大小写转换。 |
| `autocomplete` | `"one-time-code" \| "off"` | `"one-time-code"` | 应用于第 0 格以支持短信/系统自动填充。 |
| `name` | `string` | `—` | 隐藏汇总 `<input>` 的表单字段名。 |
| `label` | `string` | `—` | 分组的 `aria-label`。 |
| `labelledBy` | `string` | `—` | 分组的 `aria-labelledby`。 |
| `describedBy` | `string` | `—` | 透传给分组的 `aria-describedby`。 |
| `slotLabel` | `(index: number, length: number) => string` | `Character i of n` | 为每个槽位生成无障碍标签的函数。 |
| `validate` | `(raw, ctx) => boolean \| string \| undefined` | `—` | 提交时运行的校验回调。 |
| `invalid` | `boolean` | `false` | 在分组与槽位上设置 `aria-invalid="true"`。 |
| `disabled` | `boolean` | `false` | 禁用所有槽位输入框。 |
| `required` | `boolean` | `false` | 将槽位标记为必填。 |
| `value` | `string` | `—` | 受控模式 OTP 字符串。 |
| `defaultValue` | `string` | `""` | 非受控模式初始 OTP 字符串。 |
| `onValueChange` | `(change: ValueChange<string>) => void` | `—` | 变更回调，参数为 `{ value, formattedValue, status, reason }`。 |
| `onStatusChange` | `(status: FieldStatus) => void` | `—` | `status` 变化时调用。 |

## Controlled mode and validation

传入 `value` 与 `onValueChange` 即可启用受控模式。`onValueChange` 接收 `{ value, formattedValue, status, reason }`，其中 `reason` 为 `"input" | "paste" | "delete" | "step" | "commit" | "reset" | "undo" | "redo" | "programmatic"`。若不更新 `value`，本次变更会被拒绝并保持已批准文本与光标位置。

`status` 为 `"empty" | "incomplete" | "complete" | "invalid"`。未填满的输入框绝不会被标记为 invalid；`validate` 仅在提交（`Enter` 或失焦）时运行，返回 `false` 或字符串时会设置 `status = "invalid"` 与 `aria-invalid="true"`。将 `describedBy` 指向错误提示元素 id 即可配合屏幕阅读器播报。

## Contract and lifecycle

每个组合式函数返回响应式 `state`、`value()`、`formattedValue()`、`status()`、`inputRef`、`getInputProps(extra?)`（或 `getGroupProps()`、`getSlotProps(i)`、`getHiddenInputProps()`）、`setValue`、`clear`、`focus`、`undo` 与 `redo`。`<NumberInput>`、`<MaskedInput>` 与 `<InputOTP>` 支持 `v-model` 与直接透传 HTML 属性。包内导出 `CONTRACT_VERSION`、`GETTER_NAMES`、`INSTANCE_API`、`PatternInputError`、`MaskPatternError` 与工具类型。

## Nuxt

所有导入均为 SSR 安全（模块顶层不访问浏览器全局对象）。使用 `<script setup>` 可正常编译模板中的点语法（`InputOTP.Slot`）。

## Styling hooks

| 选择器 / 属性 | 作用位置 | 用途 |
| --- | --- | --- |
| `input[aria-invalid="true"]` | Number、Masked、OTP 槽位 | 仅在 `status === "invalid"` 或 `invalid: true` 时出现（incomplete 不会触发）。 |
| `input:disabled` | Number、Masked、OTP 槽位 | 当 `disabled: true` 时生效。 |
| `input[readonly]` | Number、Masked | 当 `readOnly: true` 时生效。 |
| `[role="group"]` | OTP 根容器 | 用于横向 flex/grid 布局的无障碍容器。 |
| `:focus-visible` | 所有输入框 | 用于绘制无障碍聚焦轮廓。 |

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

为 AI 编程助手添加对应集成 skill：[Pattern Input Vue](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vue.md)。

## License

MIT © Zealakit
