# Zealakit Pattern Input

[English](https://github.com/zealakit/pattern-input/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/pattern-input/blob/main/README_VI.md) | [中文](https://github.com/zealakit/pattern-input/blob/main/README_CN.md)

![Zealakit Pattern Input cover](https://github.com/zealakit/pattern-input/blob/main/assets/images/pattern-input-cover.jpg?raw=true)

Headless behavioral primitives for number, masked, and one-time-code input fields in Vanilla TypeScript, React, Vue, and Svelte.

- **Core** — an internal shared kernel for parsing, formatting, caret state, and the one DOM binding. It is bundled inside every adapter and never published on its own.
- **Adapters** — one package per framework, exposing the same prop-getter contract.
- **SSR-safe** — importing a package never touches browser globals.

Pattern Input handles formatting, caret and selection, keyboard navigation, clipboard paste, IME composition, and ARIA attributes. It ships no styles and no validation engine: you own the element, the CSS, and the rules.

> **Note**
> Pattern Input is a focused, headless set of primitives for number, masked, and one-time-code fields. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Date pickers, currency conversion, phone-number metadata, and a validation engine are not implemented.
>
> Pattern Input is not a replacement for a full UI library or design system. Use it when you need accessible input behavior without adopting a large kit, or when your current library's fields are hard to restyle.

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/pattern-input-vanilla` | Vanilla JS / TS | [README](https://github.com/zealakit/pattern-input/blob/main/packages/vanilla/README.md) |
| `@zealakit/pattern-input-react` | React 18 / 19 | [README](https://github.com/zealakit/pattern-input/blob/main/packages/react/README.md) |
| `@zealakit/pattern-input-vue` | Vue 3.5+ | [README](https://github.com/zealakit/pattern-input/blob/main/packages/vue/README.md) |
| `@zealakit/pattern-input-svelte` | Svelte 5 | [README](https://github.com/zealakit/pattern-input/blob/main/packages/svelte/README.md) |

Install one adapter for your framework. Your app already provides the framework runtime, so you only add the adapter. Each adapter bundles `@zealakit/pattern-input-core`, which is not published to npm; you never install or configure core directly.

## Installation

```bash
npm i @zealakit/pattern-input-vanilla
npm i @zealakit/pattern-input-react
npm i @zealakit/pattern-input-vue
npm i @zealakit/pattern-input-svelte

# or yarn, pnpm, ...
```

## Status

This is `1.0.0-beta.1`. All three fields (number, masked, OTP) work in every adapter, with the same prop-getter contract and conformance vectors. The packages ship no styles, no validation engine, and never wrap a plain-text input.

## Behavior

| Capability | Number | Masked | OTP |
| --- | --- | --- | --- |
| Caret survives formatting and paste | Yes | Yes | Yes |
| Paste parsed by the field | Yes | Yes | Yes |
| IME commits once at compositionend | Yes | Yes | Yes |
| Correct mobile inputmode | decimal / numeric | numeric or text | numeric |
| Controlled and uncontrolled modes | Yes | Yes | Yes |
| Undo / redo with caret | Yes | Yes | Yes |
| ARIA (`aria-invalid`, labels, hidden input) | Yes | Yes | Yes |

## Size

Min+gzip per adapter × field, measured with esbuild (`pnpm size`):

| Adapter | Number | Masked | OTP |
| --- | --- | --- | --- |
| vanilla | 8.3 kB | 7.4 kB | 4.9 kB |
| react | 8.4 kB | 7.5 kB | 5.0 kB |
| vue | 8.2 kB | 7.3 kB | 4.8 kB |
| svelte | 8.1 kB | 7.2 kB | 6.2 kB |

## Examples

The [`examples/`](https://github.com/zealakit/pattern-input/tree/main/examples) folder holds runnable integration projects for Vanilla, React, Vue, Svelte, and Next.js. They import the compiled workspace packages, so build first.

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

Add the integration skill for your framework to your agent's skills directory:

- [Pattern Input React](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-react.md) — components, controlled state, styling, and Next.js rules.
- [Pattern Input Vue](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vue.md) — components, v-model state, composables, and Nuxt rules.
- [Pattern Input Svelte](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-svelte.md) — components, bind:value state, actions, and SvelteKit rules.
- [Pattern Input Vanilla](https://github.com/zealakit/pattern-input/blob/main/skills/pattern-input-vanilla.md) — create* functions, host elements, and lifecycle rules.

## License

MIT © Zealakit
