# @zealakit/pattern-input-core

[English](https://github.com/zealakit/pattern-input/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/core/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg)

Kernel nội bộ, độc lập framework của Pattern Input. Private và không publish: được đóng gói vào mọi tarball adapter dưới `dist/vendor/core/`. Expose hai entry — bề mặt `.` thuần và DOM binding tại `./dom`.

> **Note**
> Core không phải là package để cài. Đừng thêm vào `package.json`: mọi adapter đã chứa sẵn. Chỉ import trong repository này.

## Status

- Entry: `.` (reducer thuần, parser, prop getter) và `./dom` (DOM binding duy nhất) — đều rỗng cho đến khi plan 01–07 implement.
- Kiểm tra: `tsconfig.pure.json` chứng minh entry thuần không dùng DOM; script đóng gói vendor cả hai entry vào mỗi adapter.

## License

MIT © Zealakit
