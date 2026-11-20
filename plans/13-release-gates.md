# Plan 13 — Release gates, documentation, release dry run

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **13 of 13**. Depends on: 08–12.
BRD: AC-9, AC-10, FR-1, FR-4, FR-27–FR-29, NFR-3, NFR-5, NFR-6, Q5, R6.

## Goal

Make the BRD's packaging promises mechanical checks, finish the docs, and dry-run the release.
This plan changes no field behavior; a failing gate is fixed in the owning package (with a
test there), never by weakening the gate.

## Scope

In: `scripts/check-packages.mjs`, `scripts/check-size.mjs`, root scripts, READMEs, skills,
`.agents/` updates, version bump policy. Out: CI workflows (siblings have none; add only on
request), actual `npm publish` (needs the user's go-ahead).

## Design

### `scripts/check-packages.mjs` (`pnpm release:check` runs it)

For each published adapter, on the **packed tarball** (after `bundle-core.mjs`):

1. Manifest: `sideEffects` (`false`, Svelte `["**/*.svelte"]`), `type: module`, `exports` has
   `types` + `import` + `default`, `files` = `dist, README.md, LICENSE`, `engines.node >=20`,
   `dependencies` empty (FR-27, R6), `peerDependencies` = its framework only.
2. Contents: `dist/vendor/core/` present (incl. `dom/`); no `.css/.scss/.less`; no
   `@zealakit/pattern-input-core` specifier left; no `class=`/`className`/`style` writes in
   core or adapter `dist` (FR-29; string-match heuristic, documented).
3. Import: in a temp dir with no DOM globals, `node -e "await import('<pkg>')"` for each
   adapter entry — must not throw or touch `window` (FR-28). Svelte is checked via
   `svelte/server` render of each component.
4. Smoke consumer (AC-9): temp project installs the four tarballs (`pnpm add ./x.tgz
   --offline`), imports each in a `.ts` file, and passes `tsc --noEmit` with `moduleResolution`
   `bundler` **and** `nodenext`.
5. Pure core: `tsconfig.pure.json` typecheck re-run (FR-1).

### `scripts/check-size.mjs` (`pnpm size`)

esbuild (devDependency already allowed via `allowBuilds.esbuild`) bundles, per adapter × field,
an entry that imports one field from the packed adapter; framework externals; minify; gzip -9.
Prints a table; fails above 6144 bytes (D10, Q5). Results recorded in each adapter README.

### Root scripts

`size`, `release:check` = `pnpm check && pnpm pack:packages && node scripts/check-packages.mjs
&& node scripts/check-size.mjs`. `npm:publish:*` from plan 00 call `release:check` first.

### Documentation (NFR-6, FR-4)

- Root README (EN/VI/CN): pitch, packages, quick start per framework, behavior matrix
  (field × capability: caret, paste, IME, mobile keyboard, undo, controlled, a11y), contract
  version, size table, browser support (NFR-4), "What this library will not do" (BRD §3).
- Each adapter README (EN/VI/CN): full API per field, options tables, prop-getter contract with
  the getter names and `CONTRACT_VERSION`, controlled mode and mode-switch rules, caret and
  programmatic-set behavior, copy/undo policy, known IME/browser limits, size numbers.
- `.agents/skills/pattern-input/SKILL.md`: remove every "filled by plan NN"; final architecture,
  event model, contract, test map.
- `skills/pattern-input-*.md`: complete integration recipes.
- `.agents/AGENTS.md`: final Quick map + Commands (`size`, `e2e`).

### Release dry run

1. `pnpm install --frozen-lockfile` on a fresh clone.
2. `pnpm release:check`, `pnpm readme:check`, `pnpm e2e`.
3. Manual matrix in `e2e/README.md` complete.
4. `pnpm npm:publish:check` (no publish). Actual `npm:publish:all` only after the user approves.

## Steps

1. `check-packages.mjs`, `check-size.mjs`, root scripts.
2. Run gates; fix defects in owning packages.
3. Docs and skills.
4. Release dry run (above). Commit `chore(release): 1.0.0-beta.1 gates and docs` without any AI
   co-author trailer.

## Tests / gates

- `AC-9: adapters have zero runtime dependencies`
- `AC-9: sideEffects, exports, files correct`
- `AC-9: no CSS and no style/class writes in dist`
- `AC-9: import without DOM succeeds for every adapter`
- `AC-9: smoke consumer typechecks (bundler + nodenext)`
- `FR-1: core pure entry typechecks without DOM lib`
- `Q5: every adapter × field ≤ 6 kB min+gzip`
- `NFR-6: readme:check passes and every adapter README has contract, matrix, non-goals`
- `AC-10: pnpm check passes with zero skipped tests` (`rg "\.skip\(|test\.todo|it\.only" packages e2e` empty)

## Acceptance

All gates green on a fresh clone; `pnpm npm:publish:check` green; docs complete in EN/VI/CN;
manual matrix filled.

## Risks

- Size budget may not hold for OTP + React with the vendored controller: measure in plan 09 as
  an early warning; if the budget fails, raise it with numbers rather than strip features
  (needs the user's decision).
- Heuristic style/class detection false positives: allow-list documented in the script.

## Rollback

Delete the two scripts and root script entries; revert README/skill edits.
