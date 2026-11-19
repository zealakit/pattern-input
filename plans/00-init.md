# Plan 00 — Initialize the Pattern Input monorepo

Status: **approved — not implemented** (decisions D1–D12 approved 2026-11-19). Release target: **`1.0.0-beta.1`** (branch `coding/v1.0.0-beta.1`).

Order: **0 of 13**. This file is also the **index** for every plan in `plans/` (§9) and the
requirement coverage matrix (§10).

Goal: turn the greenfield `pattern-input` repo (only `LICENSE`, `.gitignore`, `.zlak-flow/`)
into a pnpm monorepo with **the same shape, tooling, and agent conventions as
`../overlay` and `../disclosure`**, ready for the Number / Masked / OTP primitives described in
`.zlak-flow/brd/20261119-zealakit-input-primitives.md` (the BRD).

**Scope rule:** this plan only creates the workspace skeleton, tooling, packaging scripts, agent
instructions, and empty-but-buildable packages. It ships **no field behavior**: no reducer, no
prop-getter, no component. Feature work follows in plans 01–13 (§9). Per the sibling rule
"no speculative exports", every package's `src/index.ts` starts as `export {};`.

---

## 1. Sibling reference (what we copy)

| Concern | Overlay / Disclosure | Pattern Input |
| --- | --- | --- |
| Workspace | pnpm `12.18.0`, `pnpm-workspace.yaml` → `packages/*`, `examples/*` | same, plus `e2e` (§2 D7) |
| Runtime layout | Overlay: private `core` bundled into 4 published adapters. Disclosure: 4 independent packages | **Overlay model** (D1) — the BRD requires one shared kernel (§8 of the BRD) |
| Build | `rm -rf dist && tsc -p tsconfig.json`; Svelte `svelte-package -i src -o dist`. ESM only, no bundler | same |
| Base tsconfig | `NodeNext`, `strict`, `verbatimModuleSyntax`, `isolatedModules`, `noUnused*`, `types: []`, `.js` relative specifiers | same; core adds a `tsconfig.pure.json` typecheck with `lib: ["ES2022"]` (D2) |
| Tests | `node --import ./tests/setup.ts --test tests/*.test.ts` against `dist`, `node:assert/strict`, happy-dom; React via `createElement as h` | same — **not** Vitest/jsdom |
| Test libs | React `@testing-library/react`, Vue `@vue/test-utils`, Svelte/Vanilla plain DOM | same |
| Lint/format | Biome `2.6.8`, `useConsistentTypeDefinitions: type` | same — **not** ESLint |
| Peers | React `^18.0.0 \|\| ^19.0.0`, Vue `^3.5.0`, Svelte `^5.0.0` | same (D3) |
| Manifests | `type: module`, `engines.node >=20`, `sideEffects: false` (Svelte `["**/*.svelte"]`), `files: [dist, README.md, LICENSE]`, `exports {types, import, default}`, `publishConfig.access: public`, `prepack`, `clean` | same |
| Docs | Root + per-package `README.md` / `README_VI.md` / `README_CN.md`; **no `docs/` folder** | same; the prop-getter contract lives in READMEs + the agent skill (FR-4, NFR-6) |
| Agent files | `.agents/` source of truth; `AGENTS.md`, `CLAUDE.md` → `.agents/AGENTS.md`; `.cursor` → `.agents` | same |
| Scripts | `pack-packages.mjs`, `check-readmes.mjs`, `npm-publish.ts`, (Overlay) `bundle-core.mjs` | same four; plan 13 adds `check-packages.mjs` + `check-size.mjs` |
| Extras | `monitor/` (deps dashboard :4177), `skills/<name>-*.md`, `assets/images/<name>-cover.jpg`, `.vscode/settings.json`, `examples/` | same |

## 2. Decisions (resolve BRD Q1–Q6 and the `.zlak-flow` conflicts)

**Approved by the user on 2026-11-19.** All later plans assume these answers; changing one
requires updating this table and every plan that cites it.

| # | Decision | Answer | BRD |
| --- | --- | --- | --- |
| D1 | Package set | 5 packages, Overlay model: private `@zealakit/pattern-input-core` bundled into 4 published adapters `@zealakit/pattern-input-{vanilla,react,vue,svelte}` | Q1, Q2 |
| D2 | Where DOM code lives | Core has **two entry points**: `.` (pure, DOM-free reducers/getters/controller) and `./dom` (the one shared DOM binding: `beforeinput`, IME, clipboard, selection). Only adapters import `./dom`. `tsconfig.pure.json` typechecks `src/` minus `src/dom/` with `lib: ["ES2022"]`, so any DOM use in the pure entry fails `pnpm typecheck` | FR-1, §8 |
| D3 | Peer baseline | React `^18.0.0 \|\| ^19.0.0`, Vue `^3.5.0`, Svelte `^5.0.0` | Q4 |
| D4 | Adapter API shape | Primary: hook / composable / action / `create*` function returning the canonical getters. Secondary: thin components (React, Vue, Svelte) that render only the field's own element(s). Vanilla attaches to host-owned elements only | FR-30, G4 |
| D5 | Who writes `el.value` | The `./dom` binding is the **only** writer of `el.value` and selection. Framework adapters never bind `value` reactively. This avoids re-render caret jumps | FR-12, FR-9 |
| D6 | Value model | Number: `rawValue: number \| null` + an internal canonical `rawText` (`"-"`, `"12."`, `"1.50"` survive while editing; normalized on commit). Masked/OTP: `rawValue: string` of editable chars only. Status for all: `"empty" \| "incomplete" \| "complete" \| "invalid"` | FR-5, FR-7 |
| D7 | Real-browser tests | Unit/integration stay on Node test runner + happy-dom. A separate private `e2e/` workspace package runs Playwright against the built examples via `pnpm e2e`; it is **not** part of `pnpm test`/`pnpm check`. Alternative if refused: a manual checklist only (then AC-1/AC-6/AC-8 are verified by hand) | AC-1, AC-6, AC-8, NFR-4 |
| D8 | OTP structure | N real slot `<input>`s inside a `role="group"` container, plus a hidden input carrying the aggregate value for forms | Q6, FR-22, FR-25 |
| D9 | Number locale | `locale` resolves separators once via `Intl.NumberFormat(locale).formatToParts` (built-in, not a dependency); explicit `decimalSeparator` / `groupSeparator` win. READMEs recommend explicit separators for SSR so server and client agree | FR-20, R4 |
| D10 | Size budget | ≤ 6 kB min+gzip for one field imported from one adapter (vendored core included), measured by plan 13; reported for every field × adapter | Q5 |
| D11 | Core publishing | Core stays private (Overlay rule). The public type surface (FR-4) is re-exported from every adapter; `CONTRACT_VERSION` is exported too. If an installable core becomes a hard requirement, publish `pattern-input-core` as a 5th package — no other plan changes | FR-4, G1 |
| D12 | Version | All packages start at `1.0.0-beta.1` to match the branch | — |

### 2.1 Package table

| Path | Package | Published |
| --- | --- | --- |
| `packages/core/` | `@zealakit/pattern-input-core` — entries `.` (pure) and `./dom` | no (`private: true`, bundled) |
| `packages/vanilla/` | `@zealakit/pattern-input-vanilla` | yes |
| `packages/react/` | `@zealakit/pattern-input-react` | yes |
| `packages/vue/` | `@zealakit/pattern-input-vue` | yes |
| `packages/svelte/` | `@zealakit/pattern-input-svelte` | yes |
| `e2e/` | `@zealakit/pattern-input-e2e` (Playwright, D7) | no |

Each adapter exports all three fields, the way Disclosure exports `Collapsible` + `Accordion` from
one package. `sideEffects: false` keeps unused fields tree-shaken. Core is copied into each
tarball by `scripts/bundle-core.mjs` (`dist/vendor/core/`, both entries), exactly like Overlay;
any page-global state goes through a `globalThis` + `Symbol.for` key (none is expected).

**Why not the `.zlak-flow` plan's 15 packages** (`@zealakit/input-{number,masked,otp}-{core,vanilla,react,vue,svelte}`
+ 3 private): 12 published packages per release, field-first naming that breaks the
`@zealakit/<product>-<framework>` pattern of both siblings, and published `-core` packages that
Overlay deliberately avoids.

## 3. Root files

1. `package.json` — `name: "pattern-input"`, `private`, `version: "1.0.0-beta.1"`, `type: module`,
   `packageManager: pnpm@12.18.0`, author/license/repository (`github.com/zealakit/pattern-input`)
   as in siblings. Scripts copied from Overlay: `build` (core first, then adapters),
   `build:<pkg>`, `typecheck`, `test` (core → vanilla → react → vue → svelte), `lint`,
   `lint:fix`, `format`, `check` (build + typecheck + test + lint), `clean`, `pack:packages`,
   `release:check`, `readme:check`, `npm:publish:{check,vanilla,react,vue,svelte,all}`,
   `monitor`, `dev:{vanilla,react,vue,svelte,nextjs}`, `e2e` (plan 12). DevDeps:
   `@biomejs/biome 2.6.8`, `@types/node ^24.19.0`, `typescript ^6.0.3`.
2. `pnpm-workspace.yaml` — `packages/*`, `examples/*`, `e2e`, `allowBuilds.esbuild`, Biome
   `minimumReleaseAgeExclude` list (copy from Overlay).
3. `tsconfig.base.json` — copy Overlay's verbatim.
4. `biome.json` — copy Overlay's; drop the `.astro` ignore (no Astro example).
5. `.gitignore` — merge Overlay's into the existing one; **keep `.zlak-flow/`**; add
   `e2e/test-results/`, `e2e/playwright-report/`.
6. `.vscode/settings.json` — copy from Overlay.
7. `README.md`, `README_VI.md`, `README_CN.md` — H1 `Zealakit Pattern Input`, language switcher,
   cover, one-paragraph pitch, "not a full UI library" note, Packages table (4 adapters; core
   not listed as an install target), Installation, Examples, Agent Skills, License. Follow the
   readme-system skill. Feature sections are added by plans 08–13.

## 4. Agent instructions (`.agents/`)

- `.agents/AGENTS.md` — same sections as siblings: intro, Always follow, Quick map, Commands,
  Hard boundaries, Definition of done. Hard boundaries carry the BRD rules:
  - core pure entry is DOM- and framework-free; `./dom` is imported only by adapters;
  - adapters → core only, never adapter → adapter;
  - formatting/parsing are pure over `(rawValue, options)`; caret is sticky relative to the raw
    value, never stored as a formatted-string index;
  - IME commits once at `compositionend`;
  - the DOM binding is the only writer of `el.value` / selection (D5);
  - no CSS/classes/themes; no schema validation; never wrap a plain text input;
  - SSR-safe; `type` not `interface`; kebab-case files; no speculative exports;
  - commits carry no AI co-author trailer.
- `.agents/rules/pattern-input.mdc` — `alwaysApply` short list, like `disclosure.mdc`.
- `.agents/skills/pattern-input/SKILL.md` — architecture, event model, prop-getter contract.
  Start from Overlay's skill structure; fill only what plan 00 decides, mark the rest
  "filled by plan NN".
- `.agents/skills/readme-system/SKILL.md` — copy from Overlay, replace product names.
- Symlinks: `AGENTS.md` and `CLAUDE.md` → `.agents/AGENTS.md`; `.cursor` → `.agents`.

## 5. Packages (skeleton only)

For each of `core`, `vanilla`, `react`, `vue`, `svelte`:

- `package.json` in the sibling shape (§1). Version `1.0.0-beta.1`. Adapters depend on
  `@zealakit/pattern-input-core: workspace:^` and peer on their framework only. Core has **no**
  runtime dependencies (FR-27) and its `exports` map has `.` and `./dom`.
- `tsconfig.json` (build) and `tests/tsconfig.json` (typecheck tests), as in Overlay. Core also
  gets `tsconfig.pure.json` (`lib: ["ES2022"]`, `exclude: ["src/dom"]`, `noEmit`), run by its
  `typecheck` script. React adds `jsx: "react-jsx"`.
- `src/index.ts` → `export {};` (core also `src/dom/index.ts` → `export {};`).
- `tests/setup.ts` (happy-dom globals; Svelte adds the `.svelte` compile hook from Overlay),
  `tests/support/dom.ts`, and one `tests/smoke.test.ts` asserting the built entry imports
  without touching `window`. Core's pure tests run **without** happy-dom to prove DOM-freedom;
  core's `tests/dom/` tests opt into happy-dom.
- `README.md` / `README_VI.md` / `README_CN.md` stubs (H1 = package name), `LICENSE` copy.

## 6. Scripts, monitor, examples, skills

- `scripts/bundle-core.mjs`, `scripts/pack-packages.mjs`, `scripts/npm-publish.ts`,
  `scripts/check-readmes.mjs`, `scripts/tsconfig.json` — copy from Overlay, rename package ids;
  `bundle-core.mjs` also rewrites `@zealakit/pattern-input-core/dom` to the vendored `dom/`
  path.
- `monitor/` — copy from Overlay (server, index, README, tsconfig, `reports/.gitkeep`).
- `examples/{vanilla,react,vue,svelte,nextjs}` — minimal Vite / Next apps importing the
  workspace adapters and rendering a placeholder page. Next.js proves SSR import safety.
  Filled by plan 12.
- `skills/pattern-input-{react,vue,svelte,vanilla}.md` — headers + "API pending" only; filled
  by plans 08–11.
- `assets/images/pattern-input-cover.jpg` — placeholder until a real cover exists.

## 7. Steps

1. Root files (§3), then `pnpm install`.
2. `.agents/` + symlinks (§4).
3. Core package, then the four adapters (§5); `pnpm build && pnpm test`.
4. Scripts (§6); `pnpm pack:packages` and confirm each adapter tarball contains
   `dist/vendor/core/` (with `dom/`) and no `@zealakit/pattern-input-core` dependency.
5. Monitor, example placeholders, skills, assets.
6. READMEs in EN/VI/CN; `pnpm readme:check`.
7. Commit on `coding/v1.0.0-beta.1` (§11).

## 8. Reconciling the existing `.zlak-flow` plan

The BRD stays the source of requirements. The `.zlak-flow/plans/20261119-zealakit-input-primitives/`
units are **superseded** by `plans/01–13` and are not executed. `.zlak-flow/` stays untracked and
unedited.

| `.zlak-flow` decision | Replace with |
| --- | --- |
| 15 packages, `@zealakit/input-<field>-<fw>` | D1 |
| `input-internal` + `input-internal-adapter` private packages | core modules `shared/`, `lexers/`, `controller/` (pure) and `dom/` (D2) |
| `@zealakit/conformance` package + `docs/contract-v1.md` | JSON vectors in `packages/core/tests/vectors/` (plan 06); contract in READMEs + skill |
| Vitest + jsdom, `test/` folders | Node test runner + happy-dom, `tests/` |
| ESLint flat config + typescript-eslint | Biome; DOM ban for core enforced by `tsconfig.pure.json` |
| `moduleResolution: bundler`, `paths` aliases | `NodeNext`, `.js` specifiers, tests against `dist` |
| `docs/` folder (contract, a11y list, readme template) | README sections + skill; a11y checklist in `e2e/README.md` |
| React `^19` only | `^18.0.0 \|\| ^19.0.0` |
| `scripts/scaffold-package.mjs` | hand-written manifests |
| Fixed locale table, no `Intl` | D9 |
| `scale` state field for number presentation | canonical `rawText` (D6) |
| `.github/workflows/ci.yml` | not in v1 (siblings have none); `pnpm check` + `pnpm e2e` are the gates |
| "Phase 3 never commits" | one commit per plan (§11) |

Units kept in substance: sticky caret model, mask grammar, number lexer, per-field reducers, the
controlled-mode proposal model, the AC-named tests, the size gate, and the packed smoke consumer.

## 9. Plan index

| # | Plan | Depends on | Delivers |
| --- | --- | --- | --- |
| 00 | [init](00-init.md) | — | workspace, tooling, empty packages, agents, scripts |
| 01 | [core-foundations](01-core-foundations.md) | 00 | shared types, editable map, sticky caret, key normalization |
| 02 | [core-lexers](02-core-lexers.md) | 01 | mask grammar/compiler, number lexer, decimal math |
| 03 | [number-field](03-number-field.md) | 01, 02 | number options, format/parse, reducer, keymap, getters |
| 04 | [masked-field](04-masked-field.md) | 01, 02 | masked options, format/parse, reducer, keymap, getters |
| 05 | [otp-field](05-otp-field.md) | 01 | OTP slots, reducer, keymap, group/slot/hidden getters |
| 06 | [controller-contract](06-controller-contract.md) | 03, 04, 05 | field controller (modes, proposals, history), contract constants, conformance vectors |
| 07 | [dom-binding](07-dom-binding.md) | 06 | `./dom`: beforeinput, IME, clipboard, selection, focus wiring |
| 08 | [vanilla-adapter](08-vanilla-adapter.md) | 07 | `createNumberInput` / `createMaskedInput` / `createOtpInput` |
| 09 | [react-adapter](09-react-adapter.md) | 07 (08 as reference) | hooks + components |
| 10 | [vue-adapter](10-vue-adapter.md) | 07 (08 as reference) | composables + components |
| 11 | [svelte-adapter](11-svelte-adapter.md) | 07 (08 as reference) | actions/factories + `.svelte` components |
| 12 | [examples-e2e-a11y](12-examples-e2e-a11y.md) | 08–11 | examples, Playwright e2e, a11y audit |
| 13 | [release-gates](13-release-gates.md) | 08–12 | package/size/SSR gates, READMEs, skills, release dry run |

Order is strictly sequential. 09–11 are independent of each other and may run in parallel
sessions once 08 is merged; each touches only its own package, its example, and its skill.

Every plan uses the same sections: header (status, order, depends, BRD coverage), Goal, Scope,
Design, Steps, Tests, Acceptance, Risks, Rollback.

## 10. Coverage matrix (BRD → plans)

| Req | Plans | Req | Plans |
| --- | --- | --- | --- |
| FR-1 | 00, 01, 02, 13 | FR-17 | 03, 04, 05, 07, 12 |
| FR-2 | 03, 04, 05 | FR-18 | 03, 04, 05, 07, 12 |
| FR-3 | 03, 04, 05, 06 | FR-19 | 06, 07 |
| FR-4 | 06, 13 | FR-20 | 02, 03 |
| FR-5 | 03, 04, 05 | FR-21 | 02, 04 |
| FR-6 | 02, 03, 04, 06 | FR-22 | 05, 07 |
| FR-7 | 03, 04, 05 | FR-23 | 03, 04, 05, 12 |
| FR-8 | 06, 08–11 | FR-24 | 03, 04, 05, 12 |
| FR-9 | 06, 07, 08–11 | FR-25 | 05, 12 |
| FR-10 | 06, 08–11 | FR-26 | 12 |
| FR-11 | 03, 04, 05, 06, 07 | FR-27 | 00, 13 |
| FR-12 | 01, 03, 04, 07 | FR-28 | 00, 08–11, 13 |
| FR-13 | 01, 03, 04, 05, 07 | FR-29 | 00, 13 |
| FR-14 | 01, 04, 07 | FR-30 | 08–11, 12 |
| FR-15 | 03, 04, 05, 07 | FR-31 | 03, 04, 05 |
| FR-16 | 06, 07 | | |

| AC | Plans | AC | Plans |
| --- | --- | --- | --- |
| AC-1 | 08, 12 | AC-6 | 07, 12 |
| AC-2 | 06, 09, 10, 11 | AC-7 | 06, 08–11, 12 |
| AC-3 | 03, 12 | AC-8 | 12 |
| AC-4 | 04, 12 | AC-9 | 13 |
| AC-5 | 05, 12 | AC-10 | 13 (every plan runs `pnpm check`) |

NFR-1 every plan · NFR-2 named tests in every plan + 06 vectors · NFR-3 05, 06, 13 ·
NFR-4 12 · NFR-5 00, 13 · NFR-6 08–11, 13.

## 11. Working rules for every plan

- Branch: `coding/v1.0.0-beta.1`. One commit per plan after its acceptance passes, message
  `feat(<scope>): <plan title>` (`chore` for 00/13). **No `Co-Authored-By` or other AI
  attribution trailer.**
- Before committing: `pnpm check` (and `pnpm readme:check` when READMEs change).
- No skipped tests, no `any` in exported signatures, no export without an implementation.
- If behavior is unspecified by the plan or the BRD, stop and ask; do not extend the contract
  silently. Contract changes update the skill and READMEs in the same commit.

## 12. Definition of done

`pnpm install --frozen-lockfile`, `pnpm check`, `pnpm readme:check`, and `pnpm pack:packages`
pass on a fresh clone; every example placeholder builds (`examples/nextjs` included); no package
exports anything; `.zlak-flow/` remains untracked.

## 13. Rollback

Nothing is tracked except `LICENSE`. Reset the branch to `c6eb623` (or delete the plan-00
commit); `.zlak-flow/` is untouched.
