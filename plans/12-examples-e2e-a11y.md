# Plan 12 — Examples, real-browser e2e, accessibility audit

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **12 of 13**. Depends on: 08–11.
BRD: AC-1, AC-3–AC-8, FR-17, FR-18, FR-23–FR-26, FR-30, NFR-4, R2.

## Goal

Prove the behavior in real browsers: examples for every adapter, Playwright e2e against them
(D7), and an accessibility audit with a documented manual matrix for what automation cannot
reach (real IMEs, screen readers, mobile autofill).

## Scope

In: `examples/{vanilla,react,vue,svelte,nextjs}`, `e2e/` (private workspace package), root
`e2e` script, a11y checklist in `e2e/README.md`.
Out: a docs site, Storybook, visual regression.

## Design

### Examples

Each example renders the **same page** (one fixture spec, mirrored per framework):

| Section | Field | Options |
| --- | --- | --- |
| Price | Number | `maximumFractionDigits: 2`, `min: 0`, `max: 100000`, en-US |
| Price (de-DE) | Number | `locale: "de-DE"` |
| Tax id | Masked | `999.999.999-99` |
| Phone | Masked | `["(999) 999-9999", "+9 (999) 999-9999"]` |
| Code | OTP | `length: 6`, numeric, `name: "code"` inside a `<form>` |
| Controlled | Number | `onValueChange` rejects values > 1000 (AC-7) |
| Invalid | Masked | `validate` returns an error string, wired to visible error text via `aria-describedby` |

Every field has a visible `<label>` and helper text. Example CSS is inline in the example only
(nothing shipped, FR-29). Elements carry `data-testid` so one e2e spec runs against all five
examples. `examples/nextjs` uses the React adapter in the App Router with server rendering
(SSR proof, FR-28).

### e2e package

```
e2e/
  package.json            @zealakit/pattern-input-e2e (private), devDeps @playwright/test, @axe-core/playwright
  playwright.config.ts    projects: chromium, firefox, webkit, mobile-chrome (Pixel), mobile-safari (iPhone)
                          webServer: builds packages, then `vite preview` per example on fixed ports
  specs/fields.spec.ts    parameterized over examples
  specs/ime.spec.ts       Chromium only (CDP)
  specs/a11y.spec.ts
  README.md               how to run + manual a11y/IME matrix
```

Root script: `"e2e": "pnpm build && pnpm --filter @zealakit/pattern-input-e2e test"`. Not part
of `pnpm check` (D7). Browsers are installed with `pnpm --filter … exec playwright install`;
if browsers cannot be downloaded in an environment, report it as a blocker — never skip.

### Specs

`fields.spec.ts` (× each example × each desktop engine):

- AC-3: type `1234.567` → `1,234.56`, caret after `6`.
- AC-4: paste `123.456.789-00` → literals intact; paste `12345` → no `aria-invalid`.
- AC-5: paste 6 digits → all slots filled, last slot focused; Backspace clears then retreats;
  hidden input value submitted with the form.
- AC-7: paste `5000` into the controlled field → DOM value unchanged.
- Caret: click inside a literal lands on the nearest slot; Backspace over a group separator.
- Clipboard: copy then paste round-trips; cut removes.
- Undo: Ctrl/Cmd+Z restores value and caret.
- Keyboard: ArrowUp/Down step; Home/End; Tab enters/leaves the OTP group once.

`ime.spec.ts` (AC-6): Chromium CDP `Input.imeSetComposition` + `Input.insertText` for a
Pinyin-like and a Vietnamese Telex-like sequence; assert no value change during composition and
exactly one change + format after commit. Firefox/WebKit: synthetic composition events (protocol
check only, labelled as such).

`a11y.spec.ts` (AC-8): axe on each example (no serious/critical); `aria-invalid` only for
invalid; `aria-describedby` targets exist; OTP group has an accessible name and slots have
`Character N of 6` labels; no `role` on native inputs; keyboard-only traversal order.

Mobile projects (emulation): `inputmode` values per field; OTP slot 0 `autocomplete`.

### Manual matrix (`e2e/README.md`, AC-8/FR-26, NFR-4)

Table with pass/fail/date per row: VoiceOver (macOS Safari, iOS Safari), NVDA + Firefox,
TalkBack + Chrome Android; real IMEs: macOS Pinyin, Windows MS-IME Japanese, iOS Vietnamese
Telex, Android GBoard; OTP SMS autofill on iOS Safari and Chrome Android. Release (plan 13)
requires every row filled.

## Steps

1. Fill the five examples (shared fixture spec + `data-testid`s).
2. Create `e2e/` package, config, specs.
3. Run `pnpm e2e`; fix defects **in the owning plan's package**, with a regression test there.
4. Write the manual matrix and run it once.
5. Update root README Examples section; `pnpm check && pnpm readme:check && pnpm e2e`.

## Tests

The specs above, named after the ACs (`AC-3 e2e: …`, `AC-6 e2e: …`, `AC-8: axe …`).

## Acceptance

`pnpm e2e` green on chromium, firefox, webkit and both mobile projects with zero skips; every
example builds (`pnpm -r --filter './examples/*' build`); manual matrix filled.

## Risks

- Real IME automation ceiling (R2): CDP + manual matrix is the documented limit.
- WebKit focus timing on slots: assert after explicit `expect.poll`, not timeouts.
- Example drift between frameworks: one fixture spec + shared testids.

## Rollback

Delete `e2e/`, remove the `e2e` script and workspace entry; restore example placeholders.
