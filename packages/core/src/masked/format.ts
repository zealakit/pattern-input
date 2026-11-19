import type { CompiledAlternative, CompiledMask } from "../lexers/index.js";
import type { EditableMap, EditableUnit } from "../shared/index.js";
import type { ResolvedMaskedOptions } from "./options.js";

export type FormattedMask = {
  readonly text: string;
  readonly map: EditableMap;
};

export type MaskedFormatOptions = {
  /** Show literals that immediately follow the last filled slot (focused). */
  readonly trailingLiterals?: boolean;
};

/**
 * Format editable characters against one compiled alternative.
 *
 * `"filled"`: literals are emitted up to the last filled slot, plus the literal
 * run that immediately follows it when `trailingLiterals` is set (typing `123`
 * shows `123.`). `"always"`: the whole mask, with `placeholderChar` in empty
 * slots; placeholders and literals are not map units.
 */
export function formatMasked(
  raw: string,
  alternative: CompiledAlternative,
  resolved: ResolvedMaskedOptions,
  options: MaskedFormatOptions = {},
): FormattedMask {
  const units: EditableUnit[] = [];
  let text = "";
  let cursor = 0;
  const trailing = options.trailingLiterals ?? false;

  for (const token of alternative.tokens) {
    if (token.kind === "literal") {
      if (resolved.showLiterals === "always") {
        text += token.char;
        continue;
      }
      if (cursor === 0) {
        break;
      }
      if (cursor < raw.length || trailing) {
        text += token.char;
        continue;
      }
      break;
    }

    if (cursor < raw.length) {
      const start = text.length;
      text += raw[cursor];
      units.push({ start, end: text.length });
      cursor += 1;
      continue;
    }

    if (resolved.showLiterals === "always") {
      text += resolved.placeholderChar;
      continue;
    }
    break;
  }

  return { text, map: { textLength: text.length, units } };
}

/** Longest possible formatted text for a compiled mask (for `maxlength`). */
export function maxMaskedLength(mask: CompiledMask): number {
  let longest = 0;
  for (const alternative of mask.alternatives) {
    let length = 0;
    for (const token of alternative.tokens) {
      length += token.kind === "literal" ? token.char.length : 1;
    }
    longest = Math.max(longest, length);
  }
  return longest;
}
