/** Localized number syntax; separators are resolved by the field options. */
export type NumberSyntax = {
  readonly decimal: string;
  readonly group: string;
  readonly allowNegative: boolean;
  readonly allowDecimal: boolean;
};

export type LexResult =
  | {
      readonly ok: true;
      readonly negative: boolean;
      readonly int: string;
      readonly frac: string;
      readonly hasDecimal: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: "char" | "decimal" | "sign";
      readonly at: number;
    };

const SPACE_LIKE = new Set([" ", "\u00A0", "\u202F", "\u2009"]);
const MINUS = "-";
const UNICODE_MINUS = "\u2212";
const PLUS = "+";

function isSpaceLike(separator: string): boolean {
  return SPACE_LIKE.has(separator);
}

function isGroupChar(char: string, group: string): boolean {
  if (group !== "" && char === group) {
    return true;
  }
  return isSpaceLike(group) && SPACE_LIKE.has(char);
}

/**
 * Lex text under an explicit syntax. Ambiguity (`1,234` vs `1.234`) is decided
 * only by the syntax; nothing is guessed from a locale.
 */
export function lexNumber(text: string, syntax: NumberSyntax): LexResult {
  let index = 0;
  let negative = false;

  const first = text[0];
  if (first === MINUS || first === UNICODE_MINUS) {
    if (!syntax.allowNegative) {
      return { ok: false, reason: "sign", at: 0 };
    }
    negative = true;
    index = 1;
  } else if (first === PLUS) {
    index = 1;
  }

  let int = "";
  let frac = "";
  let hasDecimal = false;
  let afterDecimal = false;

  for (; index < text.length; index += 1) {
    const char = text[index];

    if (isGroupChar(char, syntax.group)) {
      continue;
    }

    if (syntax.decimal !== "" && char === syntax.decimal) {
      if (!syntax.allowDecimal || hasDecimal) {
        return { ok: false, reason: "decimal", at: index };
      }
      hasDecimal = true;
      afterDecimal = true;
      continue;
    }

    if (char >= "0" && char <= "9") {
      if (afterDecimal) {
        frac += char;
      } else {
        int += char;
      }
      continue;
    }

    if (char === MINUS || char === UNICODE_MINUS) {
      return { ok: false, reason: "sign", at: index };
    }

    return { ok: false, reason: "char", at: index };
  }

  return { ok: true, negative, int, frac, hasDecimal };
}
