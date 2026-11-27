import { extractRaw, fitRaw } from "../lexers/index.js";
import { pickAlternative, type ResolvedMaskedOptions } from "./options.js";

export type MaskedParseResult = {
  /** Editable characters only — never literals (FR-5). */
  readonly raw: string;
  readonly alternativeIndex: number;
  readonly rejectedAt?: number;
};

/**
 * Extract editable characters from arbitrary text (paste, autofill) and fit
 * them into the best-matching alternative.
 */
export function parseMaskedText(
  text: string,
  resolved: ResolvedMaskedOptions,
): MaskedParseResult {
  const extracted = extractRaw(resolved.mask, text);
  const alternativeIndex = pickAlternative(resolved, extracted);
  const alternative = resolved.mask.alternatives[alternativeIndex];
  const fit = fitRaw(alternative, extracted);

  return fit.rejectedAt === undefined
    ? { raw: fit.accepted, alternativeIndex }
    : {
        raw: fit.accepted,
        alternativeIndex,
        rejectedAt: fit.rejectedAt,
      };
}
