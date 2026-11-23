# Agent instructions (Zealakit Pattern Input)

Zealakit Pattern Input is a **pnpm monorepo** of headless, framework-agnostic behavioral
primitives for specialized input fields — number, masked, and one-time-code (OTP) — for Vanilla
TypeScript, React, Vue, and Svelte. There is one shared kernel (`@zealakit/pattern-input-core`);
adapters are thin and idiomatic to their framework.

This file is the root agent guidance. `.agents/` is the single source of truth for
repository-specific AI instructions: `AGENTS.md`, `CLAUDE.md`, and `.cursor/` are symlinks
into it — never duplicate instruction content outside `.agents/`.

## Always follow

- **Skill:** [.agents/skills/pattern-input/SKILL.md](skills/pattern-input/SKILL.md)
- **README skill:** [.agents/skills/readme-system/SKILL.md](skills/readme-system/SKILL.md)
  (load it before touching any README)
- **Rules:** [.agents/rules/](rules/)

Load the pattern-input skill before code, test, docs, or release work. Copy and adapt it only
when adding support for another source tree; keep hard rules here.

## Quick map

| Area | Path | Package |
| --- | --- | --- |
| Internal framework-agnostic kernel (`.`, `./dom`) | `packages/core/` | `@zealakit/pattern-input-core` |
| Imperative DOM adapter | `packages/vanilla/` | `@zealakit/pattern-input-vanilla` |
| React adapter | `packages/react/` | `@zealakit/pattern-input-react` |
| Vue adapter | `packages/vue/` | `@zealakit/pattern-input-vue` |
| Svelte adapter | `packages/svelte/` | `@zealakit/pattern-input-svelte` |
| Integration examples | `examples/{vanilla,react,vue,svelte,nextjs}/` | private |
| Real-browser checks (Playwright) | `e2e/` | private |
| Product documentation | root `README*.md` + `packages/*/README*.md` (EN, VI, CN) | — |
| User-facing integration skills | `skills/pattern-input-*.md` | — |
| Dependency monitor | `monitor/` | local dashboard |
| Release packaging helper | `scripts/pack-packages.mjs` | — |
| README structure check | `scripts/check-readmes.mjs` | — |
| Agent skills | `.agents/skills/{pattern-input,readme-system}/SKILL.md` | — |
| README cover image | `assets/images/pattern-input-cover.jpg` | — |

## Commands

```bash
pnpm install
pnpm build        # builds packages in topological order (build core first)
pnpm typecheck    # requires a successful build (adapters resolve core from dist)
pnpm test         # core + vanilla + react + vue + svelte tests (Node test runner + happy-dom)
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm format       # oxfmt
pnpm format:check # oxfmt --check
pnpm check        # build + typecheck + test + lint + format check
pnpm clean        # remove package/example build output and local tarballs
pnpm pack:packages # pack the four adapter tarballs, core bundled in, into artifacts/ (no publish)
pnpm size         # esbuild gzip budget per adapter × field
pnpm release:check # full checks + package gates + size (no publish)
pnpm npm:publish:check # build + test all five, pack/bundle/inspect the four adapters (no publish)
pnpm npm:publish:all   # same preflight, then publish the four adapters (core is never published)
pnpm readme:check # README structure: EN/VI/CN parity, absolute links, H1 = package name
pnpm e2e          # Playwright: builds fixtures, runs every example on all projects

pnpm dev:vanilla
pnpm dev:react
pnpm dev:vue
pnpm dev:svelte
pnpm dev:nextjs

pnpm monitor      # dependency dashboard at http://127.0.0.1:4177
```

## Hard boundaries

- **Dependency direction:** adapters → core. Core never imports React, Vue, Svelte, or any
  adapter. No adapter imports another adapter. No circular dependencies.
- **Core has two entry points:** `.` is pure — no DOM globals, no framework runtime, no CSS.
  `./dom` holds the one shared DOM binding (`beforeinput`, IME, clipboard, selection, focus).
  Only adapters import `./dom`. `tsconfig.pure.json` typechecks `src/` without
  `src/dom/` and with `lib: ["ES2022"]`, so any DOM use in the pure entry fails `pnpm typecheck`.
- **Value model:** every field exposes `rawValue` (machine-readable) and `formattedValue`
  (exactly what the user sees); they are never conflated. Status is
  `"empty" | "incomplete" | "complete" | "invalid"` — an incomplete value is never reported as
  invalid.
- **Editing model:** formatting/parsing are pure functions over `(rawValue, options)`; the caret
  is a sticky position relative to the raw value, never stored as a formatted-string index.
- **IME:** composition commits once at `compositionend`; no formatting, rejection, or state commit
  happens between `compositionstart` and `compositionend`.
- **DOM writing:** the `./dom` binding is the only writer of `el.value` and selection. Framework
  adapters never bind `value` reactively, which is what keeps re-renders from moving the caret.
- **Public packaging:** only the four adapters are published to npm. Core is `"private": true`
  and never published: `scripts/bundle-core.mjs` copies the built core into each adapter tarball
  (`dist/vendor/core/`, both entries), rewrites `@zealakit/pattern-input-core` and
  `@zealakit/pattern-input-core/dom` imports to relative paths, and replaces the core dependency
  with core's own runtime dependencies. Page-global core state must go through a
  `globalThis` + `Symbol.for` key, never a bare module-level variable, so adapters bundling
  separate copies still share it. Never document core as an install or configuration entry point.
- **No styles, no validation engine:** no CSS, class names, themes, or design tokens; no bundled
  schema validator (consumer callbacks only). Never wrap or replace a plain-text `<input>`.
- **Lint suppressions:** use `// oxlint-disable-next-line <rule> -- reason` (or a block
  `oxlint-disable`/`oxlint-enable` pair) and always state why. A suppression without a reason is
  a review blocker; fix the finding instead when it is genuinely ours.
- **Tests:** new primitives need focused tests in the owning package (`packages/*/tests/`); run
  `pnpm test`. Do not add a second test framework or DOM library.
- **SSR safety:** never touch `window`, `document`, `navigator`, or `matchMedia` during module
  initialization or during React/Vue/Svelte render. Guard DOM work behind lifecycle
  effects/actions.
- **TypeScript:** `type` aliases, not `interface` (except ambient declaration merging);
  `import type` for type-only imports; ESM with explicit `.js` relative specifiers; `kebab-case`
  file names; no `any` in exported signatures.
- **Package surface:** do not export speculative or unimplemented APIs. No placeholder
  components, no fake implementations. Every package starts as `export {};` and grows only when a
  plan implements a primitive.
- **Documentation:** there is intentionally no `docs/` folder and no separate docs app. Product
  documentation lives only in the root README and package READMEs, in EN, VI, and CN, following
  the [readme-system skill](skills/readme-system/SKILL.md). The prop-getter contract lives in the
  READMEs and the [pattern-input skill](skills/pattern-input/SKILL.md).
- **Commits:** one commit per plan, message `feat(<scope>): <plan title>` (`chore` for plan 00 and
  13). No `Co-Authored-By` or other AI attribution trailer.

## Definition of done

`pnpm check` (build + typecheck + test + lint + format check), `pnpm readme:check`, and `pnpm pack:packages`
pass. Examples still build (and the Next.js example builds for SSR) against the local workspace
packages. Update this file and the [skill](skills/pattern-input/SKILL.md) when boundaries,
commands, or workflows change.
