# @zealakit/pattern-input-core

[English](https://github.com/zealakit/pattern-input/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/core/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Pattern Input 的内部、与框架无关的内核。私有、不发布：它以 `dist/vendor/core/` 的形式打包进每个适配器 tarball。暴露两个入口——纯 `.` 入口与 `./dom` 的 DOM 绑定。

> **Note**
> Core 不是安装目标。不要把它加入 `package.json`：每个适配器都已内置。只在本仓库内部导入它。

## Status

- 入口：`.`（纯 reducer、解析器、prop getter）与 `./dom`（唯一的 DOM 绑定）——在 plan 01–07 实现之前为空。
- 检查：`tsconfig.pure.json` 证明纯入口不依赖 DOM；打包脚本会把两个入口都内置到每个适配器。

## License

MIT © Zealakit
