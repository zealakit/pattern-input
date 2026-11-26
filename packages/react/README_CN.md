# @zealakit/pattern-input-react

[English](https://github.com/zealakit/pattern-input/blob/main/packages/react/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/react/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

React 18 与 19 的 number、masked 与一次性验证码 hook 与轻量组件。

> **Note**
> 该包不提供 CSS、class 或校验引擎。它把行为附加到你的元素上；样式与规则完全由你掌握。

## Install

```bash
npm i @zealakit/pattern-input-react
npm i @zealakit/ui-engine   # peer
```

## API

三个字段共享一套契约。把 `createNumberInput` 换成 `createMaskedInput` 或 `createOtpInput`（hook/组合式函数同理）。

```tsx
import { useNumberInput } from "@zealakit/pattern-input-react";

const field = useNumberInput({ maximumFractionDigits: 2 });

<input {...field.getInputProps({ id: "price" })} />;

field.value; field.formattedValue; field.status;
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## OTP layout

布局由你决定。`InputOTP.Group` 和 `InputOTP.Separator` 只是普通元素，因此可以任意分组、添加分隔符或包裹其他内容。每个 `InputOTP.Slot` 都需要显式的 `index`，范围为 `0` 到 `maxLength - 1`。

```tsx
import { InputOTP } from "@zealakit/pattern-input-react";

<InputOTP maxLength={6} name="code" label="Verification code">
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
</InputOTP>;
```

根节点渲染一个 `role="group"`（由 `label` 或 `labelledBy` 命名）和一个按 `name` 携带完整验证码的隐藏 input。分组不会增加额外的无障碍语义，分隔符对辅助技术隐藏。决定行为的 slot 属性（`type`、`inputMode`、`maxLength`、`tabIndex`、`autoComplete`、`aria-label`）由字段管理；其余属性（包括 `className`、`id` 和 `ref`）会透传。

各部分也可按名称导入（`InputOTPGroup`、`InputOTPSlot`、`InputOTPSeparator`）。跨 React Server Components 边界导入时请使用它们，而不是点号写法。

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
