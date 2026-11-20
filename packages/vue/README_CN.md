# @zealakit/pattern-input-vue

[English](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Vue 3.5+ 的 number、masked 与一次性验证码组合式函数与渲染函数组件。

> **Note**
> 该包不提供 CSS、class 或校验引擎。它把行为附加到你的元素上；样式与规则完全由你掌握。

## Install

```bash
npm i @zealakit/pattern-input-vue
```

## API

三个字段共享一套契约。把 `createNumberInput` 换成 `createMaskedInput` 或 `createOtpInput`（hook/组合式函数同理）。

```ts
import { useNumberInput } from "@zealakit/pattern-input-vue";

const field = useNumberInput(() => ({ maximumFractionDigits: 2 }));

<input v-bind="field.getInputProps()" :ref="field.inputRef" />;

field.value(); field.formattedValue(); field.status();
field.setValue(99); field.clear(); field.undo(); field.redo();
```

## Contract

每个字段都暴露 `value`、`formattedValue`、`status`，以及 `setValue`、`clear`、`focus`、`undo`、`redo`。number 与 masked 的 getter 名为 `getInputProps`，OTP 为 `getGroupProps` / `getSlotProps` / `getHiddenInputProps`。包会导出 `CONTRACT_VERSION`。

## Behavior

- 格式化、编辑与粘贴时保留光标与选区。\n- 粘贴由字段自身解析；字面量与分隔符会被处理。\n- IME 在 `compositionend` 后只提交一次。\n- 同时支持受控与非受控模式。\n- undo/redo 恢复值与光标。\n- ARIA：仅在真正无效时输出 `aria-invalid`。

## Non-goals

- 不提供默认样式、主题或类名。\n- 不内置 schema 校验（仅 consumer 回调）。\n- 不包装或替换普通文本输入框。\n- 不包含日期选择器、货币换算、电话号码元数据或网络请求。

## License

MIT © Zealakit
