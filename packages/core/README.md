# @zealakit/pattern-input-core

[English](https://github.com/zealakit/pattern-input/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/packages/core/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Internal framework-independent kernel for Pattern Input. Private and never published: it is bundled into every adapter tarball as `dist/vendor/core/`. It exposes two entries — the pure `.` surface and the DOM binding at `./dom`.

> **Note**
> Core is not an install target. Do not add it to your `package.json`: every adapter already contains it. Import it only inside this repository.

## Status

- Entries: `.` (pure reducers, parsers, prop getters, controller) and `./dom` (the DOM binding) — implemented and covered by the core test suite.
- Checks: `tsconfig.pure.json` proves the pure entry stays DOM-free; the packaging script vendors both entries into each adapter.

## License

MIT © Zealakit
