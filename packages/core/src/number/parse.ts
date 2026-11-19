import { lexNumber, toNumber } from "../lexers/index.js";
import type { FieldStatus } from "../shared/index.js";
import type { ResolvedNumberOptions } from "./options.js";

export type NumberParseFailureReason =
  | "char"
  | "decimal"
  | "sign"
  | "precision"
  | "range";

export type NumberParseResult =
  | {
      readonly ok: true;
      readonly rawText: string;
      readonly status: FieldStatus;
      readonly hasDecimal: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: NumberParseFailureReason;
      readonly at: number;
    };

/** Status implied by a canonical rawText (invalid only comes from commit). */
export function deriveStatus(rawText: string): FieldStatus {
  if (rawText === "") {
    return "empty";
  }
  if (rawText === "-" || rawText === "." || rawText.endsWith(".")) {
    return "incomplete";
  }
  return "complete";
}

/**
 * Parse display text under the resolved syntax into canonical `rawText`.
 * Used for paste and for validating composed input; typing uses its own guard.
 */
export function parseNumberText(
  text: string,
  resolved: ResolvedNumberOptions,
): NumberParseResult {
  const lexed = lexNumber(text, {
    decimal: resolved.decimalSeparator,
    group: resolved.groupSeparator,
    allowNegative: resolved.allowNegative,
    allowDecimal: resolved.maximumFractionDigits > 0,
  });

  if (!lexed.ok) {
    return { ok: false, reason: lexed.reason, at: lexed.at };
  }
  if (lexed.frac.length > resolved.maximumFractionDigits) {
    return { ok: false, reason: "precision", at: text.length };
  }

  const rawText = `${lexed.negative ? "-" : ""}${lexed.int}${
    lexed.hasDecimal ? `.${lexed.frac}` : ""
  }`;

  if (rawText !== "" && rawText !== "-" && toNumber(rawText) === null) {
    return { ok: false, reason: "range", at: 0 };
  }

  return {
    ok: true,
    rawText,
    status: deriveStatus(rawText),
    hasDecimal: lexed.hasDecimal,
  };
}
