# @zealakit/pattern-input-svelte

[English](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Svelte 5 的 number、masked 与一次性验证码工厂、action 与组件。

> **Note**
> 该包不提供 CSS、class 或校验引擎。它把行为附加到你的元素上；样式与规则完全由你掌握。

## Install

```bash
npm i @zealakit/pattern-input-svelte
```

## API

三个字段共享一套契约。把 `createNumberInput` 换成 `createMaskedInput` 或 `createOtpInput`（hook/组合式函数同理）。

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

布局由你决定。`InputOTP.Group` 和 `InputOTP.Separator` 只是普通元素，因此可以任意分组、添加分隔符或包裹其他内容。每个 `InputOTP.Slot` 都需要显式的 `index`，范围为 `0` 到 `maxLength - 1`。

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

根节点渲染一个 `role="group"`（由 `label` 或 `labelledBy` 命名）和一个按 `name` 携带完整验证码的隐藏 input。分组不会增加额外的无障碍语义，分隔符对辅助技术隐藏。决定行为的 slot 属性（`type`、`inputmode`、`maxlength`、`tabindex`、`autocomplete`、`aria-label`）由字段管理；其余属性（包括 `class` 和 `id`）会透传。根节点支持 `bind:value`。

使用工厂 API 时，用 `use:otpSlotAction={{ field, index }}` 注册每个 slot input，用 `use:otpGroupAction={field}` 注册分组。各部分也可按名称导入（`InputOTPGroup`、`InputOTPSlot`、`InputOTPSeparator`）。

## Contract

每个字段都暴露 `value`、`formattedValue`、`status`，以及 `setValue`、`clear`、`focus`、`undo`、`redo`。number 与 masked 的 getter 名为 `getInputProps`，OTP 为 `getGroupProps` / `getSlotProps` / `getHiddenInputProps`。包会导出 `CONTRACT_VERSION`。

## Behavior

- 格式化、编辑与粘贴时保留光标与选区。
- 粘贴由字段自身解析；字面量与分隔符会被处理。
- IME 在 `compositionend` 后只提交一次。
- 同时支持受控与非受控模式。
- undo/redo 恢复值与光标。
- ARIA：仅在真正无效时输出 `aria-invalid`。

## Non-goals

- 不提供默认样式、主题或类名。
- 不内置 schema 校验（仅 consumer 回调）。
- 不包装或替换普通文本输入框。
- 不包含日期选择器、货币换算、电话号码元数据或网络请求。

## License

MIT © Zealakit
