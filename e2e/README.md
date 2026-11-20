# Real-browser checks

Private Playwright workspace for the pattern-input adapters. It is **not** part of `pnpm check`.

```bash
pnpm e2e                       # build packages + examples, then run every project
pnpm --filter @zealakit/pattern-input-e2e exec playwright test --project=chromium
pnpm --filter @zealakit/pattern-input-e2e exec playwright install
```

`specs/fields.spec.ts` runs the same fixture (price, de-DE price, tax id, phone, OTP code with a
form, controlled price, invalid field) against all five examples. `specs/a11y.spec.ts` runs axe
per example. `specs/ime.spec.ts` uses the Chromium CDP composition API and synthetic composition
events elsewhere.

## Manual matrix (AC-8 / FR-26, NFR-4)

Automation cannot cover real IMEs, screen readers, or mobile autofill. Fill this table on each
release; plan 13 requires every row filled before publishing.

| Area | Environment | Check | Result | Date |
| --- | --- | --- | --- | --- |
| Screen reader | VoiceOver + macOS Safari | labels, `aria-invalid` only when invalid, OTP group name | pending | — |
| Screen reader | VoiceOver + iOS Safari | OTP slot labels, focus order | pending | — |
| Screen reader | NVDA + Firefox | error association via `aria-describedby` | pending | — |
| Screen reader | TalkBack + Chrome Android | OTP entry and backspace | pending | — |
| IME | macOS Pinyin | composition commits once, no mid-composition formatting | pending | — |
| IME | Windows MS-IME (Japanese) | composition commits once | pending | — |
| IME | iOS Vietnamese Telex | composition commits once | pending | — |
| IME | Android GBoard | input fallback inserts correctly | pending | — |
| Autofill | iOS Safari | `autocomplete="one-time-code"` fills slot 0 | pending | — |
| Autofill | Chrome Android | SMS code fills slot 0 | pending | — |
