import type {
  CompiledAlternative,
  CompiledMask,
  MaskToken,
} from "./mask-pattern.js";

function slotOf(token: MaskToken): MaskToken | null {
  return token.kind === "slot" ? token : null;
}

function transformChar(char: string, transform?: "upper" | "lower"): string {
  if (transform === "upper") {
    return char.toUpperCase();
  }
  if (transform === "lower") {
    return char.toLowerCase();
  }
  return char;
}

/** Returns the accepted (possibly transformed) character, or `null`. */
export function acceptChar(token: MaskToken, char: string): string | null {
  if (token.kind !== "slot") {
    return null;
  }
  if (!token.test.test(char)) {
    return null;
  }
  return transformChar(char, token.transform);
}

/**
 * Fit `raw` (editable characters only) into one alternative.
 * Literals in `raw` are ignored; a character that no slot accepts rejects at
 * its raw index unless the slot is optional, in which case the slot is skipped.
 */
export function fitRaw(
  alternative: CompiledAlternative,
  raw: string,
): { readonly accepted: string; readonly rejectedAt?: number } {
  const chars = [...raw];
  let accepted = "";
  let consumed = 0;

  for (const token of alternative.tokens) {
    if (consumed >= chars.length) {
      break;
    }
    if (token.kind !== "slot") {
      continue;
    }
    const char = chars[consumed];
    const transformed = acceptChar(token, char);
    if (transformed === null) {
      if (token.optional) {
        continue;
      }
      return { accepted, rejectedAt: consumed };
    }
    accepted += transformed;
    consumed += 1;
  }

  if (consumed < chars.length) {
    return { accepted, rejectedAt: consumed };
  }
  return { accepted };
}

/**
 * Pick the pattern for a raw value: the first alternative that accepts all of
 * it (FR-21 "first match wins"), else the first whose capacity still fits, else 0.
 */
export function selectAlternative(mask: CompiledMask, raw: string): number {
  const length = [...raw].length;
  const alternatives = mask.alternatives;

  for (let index = 0; index < alternatives.length; index += 1) {
    const fit = fitRaw(alternatives[index], raw);
    if (fit.rejectedAt === undefined && [...fit.accepted].length === length) {
      return index;
    }
  }
  for (let index = 0; index < alternatives.length; index += 1) {
    if (alternatives[index].capacity >= length) {
      return index;
    }
  }
  return 0;
}

/**
 * Pull the editable characters out of arbitrary text (paste, autofill):
 * literals, foreign separators and unsupported characters are dropped.
 */
export function extractRaw(mask: CompiledMask, text: string): string {
  const slots = mask.alternatives
    .flatMap((alternative) => alternative.tokens)
    .map(slotOf)
    .filter((token): token is MaskToken => token !== null);

  let raw = "";
  for (const char of text) {
    for (const slot of slots) {
      const accepted = acceptChar(slot, char);
      if (accepted !== null) {
        raw += accepted;
        break;
      }
    }
  }
  return raw;
}
