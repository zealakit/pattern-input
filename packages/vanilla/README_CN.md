# @zealakit/pattern-input-vanilla

[English](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

为 Vanilla JS / TS 中由你拥有的输入框附加 number、masked 与一次性验证码行为。

> **Note**
> 该包不提供 CSS、class 或校验引擎。它把行为附加到你的元素上；样式与规则完全由你掌握。

## Install

```bash
npm i @zealakit/pattern-input-vanilla
```

## API

三个字段共享一套契约。把 `createNumberInput` 换成 `createMaskedInput` 或 `createOtpInput`（hook/组合式函数同理）。

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

## Contract

每个字段都暴露 `value`、`formattedValue`、`status`，以及 `setValue`、`clear`、`focus`、`undo`、`redo`。number 与 masked 的 getter 名为 `getInputProps`，OTP 为 `getGroupProps` / `getSlotProps` / `getHiddenInputProps`。包会导出 `CONTRACT_VERSION`。

## Behavior

- 格式化、编辑与粘贴时保留光标与选区。\n- 粘贴由字段自身解析；字面量与分隔符会被处理。\n- IME 在 `compositionend` 后只提交一次。\n- 同时支持受控与非受控模式。\n- undo/redo 恢复值与光标。\n- ARIA：仅在真正无效时输出 `aria-invalid`。

## Non-goals

- 不提供默认样式、主题或类名。\n- 不内置 schema 校验（仅 consumer 回调）。\n- 不包装或替换普通文本输入框。\n- 不包含日期选择器、货币换算、电话号码元数据或网络请求。

## License

MIT © Zealakit
