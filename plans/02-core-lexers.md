# Plan 02 — Core lexers: mask grammar, number lexer, decimal math

Status: **proposal — not implemented**. Release target: `1.0.0-beta.1`.

Order: **2 of 13**. Depends on: 01. BRD: FR-1, FR-6, FR-20, FR-21, R4, R7.

## Goal

Add the shared, pure parsing primitives so the Masked and Number fields contain no duplicated
lexing (BRD §8): a mask pattern compiler and a localized number lexer with exact decimal math.

## Scope

In: `packages/core/src/lexers/`. Internal only (not re-exported from the public entry except
the `MaskTokenDefinition` type and `MaskPatternError`, which consumers see through options).

Out: field state, caret, formatting with editable maps (03/04), locale resolution (03).

## Design

### Files

```
packages/core/src/lexers/
  mask-pattern.ts   grammar, compileMask, MaskPatternError
  mask-match.ts     acceptance and alternative selection
  number-lexer.ts   lexNumber
  decimal.ts        exact decimal string math (round/truncate/step/compare)
  index.ts
```

### Mask grammar (frozen for v1 — no other forms, R7)

| Pattern char | Meaning |
| --- | --- |
| `9` | digit `[0-9]` |
| `a` | ASCII letter `[A-Za-z]` |
| `*` | ASCII letter or digit |
| custom key | from `tokens` option: `{ [char]: { test: RegExp; transform?: "upper" \| "lower" } }` (single-char match) |
| `\x` | literal `x` (escape) |
| `[...]` | the enclosed editable tokens are optional (complete without them) |
| `{n}` / `{n,m}` after a token | repeat; `{n,}` is greedy up to remaining capacity cap `m = 64` |
| anything else | literal |

```ts
export type MaskToken =
  | { readonly kind: "literal"; readonly char: string }
  | { readonly kind: "slot"; readonly test: RegExp; readonly transform?: "upper" | "lower"; readonly optional: boolean };
export type CompiledAlternative = { readonly pattern: string; readonly tokens: readonly MaskToken[]; readonly capacity: number; readonly required: number };
export type CompiledMask = { readonly alternatives: readonly CompiledAlternative[] };
export function compileMask(patterns: string | readonly string[], tokens?: Record<string, MaskTokenDefinition>): CompiledMask;
```

`compileMask` throws `MaskPatternError { patternIndex, offset, reason }` for unbalanced `[ ]`,
bad repeat counts, empty patterns, or a custom token key that is a reserved char. It is the
**only** throwing function in this plan and runs once at option resolution.

Matching (`mask-match.ts`):

- `acceptChar(token, char)` → transformed char or `null`.
- `fitRaw(alternative, raw)` → `{ accepted: string; rejectedAt?: number }`.
- `selectAlternative(mask, raw)` → index of the **first** alternative that accepts all of `raw`
  (FR-21 "first match wins"); if none, the first one whose capacity ≥ `raw.length`, else 0.
- `extractRaw(mask, text)` → editable chars from arbitrary text (literals and unknown
  separators dropped), used for paste (FR-15).

### Number lexer

```ts
export type NumberSyntax = { readonly decimal: string; readonly group: string; readonly allowNegative: boolean; readonly allowDecimal: boolean };
export type LexResult =
  | { readonly ok: true; readonly negative: boolean; readonly int: string; readonly frac: string; readonly hasDecimal: boolean }
  | { readonly ok: false; readonly reason: "char" | "decimal" | "sign"; readonly at: number };
export function lexNumber(text: string, syntax: NumberSyntax): LexResult;
```

Rules: group separators are skipped anywhere; the configured decimal separator is accepted once;
`-` only at start (also accepts `−` minus sign and a leading `+` which is dropped); ASCII
digits only in v1 (no locale digit systems, R4); whitespace and NBSP/NNBSP treated as group
separators when `group` is any space-like char. Ambiguity (`1,234` vs `1.234`) is decided only
by `syntax`, never guessed.

### Decimal math (`decimal.ts`)

Values flow as canonical decimal strings (`"-1234.5"`), so there is no binary-float drift:

- `roundDecimal(str, maxFraction, mode: "truncate" | "round-half-up" | "round-half-even")`
- `padFraction(str, minFraction)`
- `stepDecimal(str, step, direction)`; `compareDecimal(a, b)`; `clampDecimal(str, min, max)`
- `toNumber(str)` → `number` or `null` when beyond `Number.MAX_SAFE_INTEGER` magnitude or empty.
- `fromNumber(n)` → canonical string without exponent (handles `1e-7`, `-0` → `"0"`).

## Steps

1. Implement `mask-pattern.ts` + `mask-match.ts`; table-driven tests first.
2. Implement `number-lexer.ts` + `decimal.ts`.
3. Barrel `lexers/index.ts`; re-export `MaskPatternError` and `MaskTokenDefinition` type from the
   core public entry.
4. `pnpm --filter @zealakit/pattern-input-core test && pnpm typecheck`.
5. Add the grammar table to the skill (§ "Mask grammar").

## Tests (`packages/core/tests/lexers/*.test.ts`)

- `mask: 999.999.999-99 has capacity 11 and required 11`
- `mask: escaped literal \\9 is a literal`
- `mask: optional group completes when absent`
- `mask: {2,} greedy repeat fills remaining capacity`
- `mask: alternatives first match wins`
- `mask: custom token with transform upper`
- `mask: invalid pattern throws MaskPatternError with offset`
- `mask: extractRaw drops literals and foreign separators`
- `number: group separator ignored anywhere`
- `number: second decimal separator rejected`
- `number: sign only at start; unicode minus accepted`
- `number: de-DE syntax reads 1.234,56`
- `decimal: 1.005 truncate vs round-half-up vs half-even`
- `decimal: step 0.1 ten times equals 1`
- `decimal: fromNumber handles exponent and -0`
- `decimal: beyond MAX_SAFE_INTEGER returns null`

## Acceptance

Tests green; pure typecheck green; `rg "Intl|window|document" packages/core/src/lexers` empty.

## Risks

- Grammar creep (R7): any new form needs a BRD change. Repeat syntax is the max allowed.
- `RegExp` in options is not serializable; acceptable because options are not state (state
  stays serializable, FR-2).

## Rollback

Delete `packages/core/src/lexers/` and its tests; revert re-exports.
