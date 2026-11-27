import {
  compileMask,
  selectAlternative,
  type CompiledMask,
  type MaskToken,
  type MaskTokenDefinition,
} from "../lexers/index.js";
import type { FieldStatus } from "../shared/index.js";

/** Returns a 0-based index into the alternatives for the given raw value. */
export type MaskSelector = (
  raw: string,
  alternatives: readonly string[],
) => number;

export type MaskedOptions = {
  /** One or more alternatives; first match wins (FR-21). */
  readonly mask: string | readonly string[];
  readonly tokens?: Record<string, MaskTokenDefinition>;
  /**
   * Optional custom selector when `mask` is an array. Out-of-range results
   * fall back to the default first-match-wins selection.
   */
  readonly selectMask?: MaskSelector;
  readonly showLiterals?: "filled" | "always";
  readonly placeholderChar?: string;
  readonly inputMode?: "text" | "numeric";
  readonly validate?: (
    raw: string,
    ctx: { readonly status: FieldStatus; readonly formattedValue: string },
  ) => boolean | string | undefined;
  readonly invalid?: boolean;
  readonly describedBy?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
};

export type ResolvedMaskedOptions = {
  readonly mask: CompiledMask;
  readonly patterns: readonly string[];
  readonly selectMask?: MaskSelector;
  readonly showLiterals: "filled" | "always";
  readonly placeholderChar: string;
  readonly inputMode: "text" | "numeric";
  readonly validate?: MaskedOptions["validate"];
  readonly invalid: boolean;
  readonly describedBy?: string;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly allDigitSlots: boolean;
  readonly hasLetterSlots: boolean;
  readonly allLetterSlotsUpper: boolean;
  readonly maxFormattedLength: number;
};

export class MaskedOptionsError extends Error {
  readonly reason: "placeholder";

  constructor(reason: "placeholder") {
    super(`Invalid masked options: ${reason}`);
    this.name = "MaskedOptionsError";
    this.reason = reason;
  }
}

const cache = new WeakMap<MaskedOptions, ResolvedMaskedOptions>();

function slotAccepts(token: MaskToken, char: string): boolean {
  return token.kind === "slot" && token.test.test(char);
}

function slotTraits(mask: CompiledMask): {
  allDigitSlots: boolean;
  hasLetterSlots: boolean;
  allLetterSlotsUpper: boolean;
} {
  let allDigitSlots = true;
  let hasLetterSlots = false;
  let allLetterSlotsUpper = true;

  for (const alternative of mask.alternatives) {
    for (const token of alternative.tokens) {
      if (token.kind !== "slot") {
        continue;
      }
      const digit = slotAccepts(token, "5") && !slotAccepts(token, "a");
      const letter = slotAccepts(token, "a") || slotAccepts(token, "A");
      if (!digit) {
        allDigitSlots = false;
      }
      if (letter) {
        hasLetterSlots = true;
        if (token.transform !== "upper") {
          allLetterSlotsUpper = false;
        }
      }
    }
  }

  return {
    allDigitSlots,
    hasLetterSlots,
    allLetterSlotsUpper: hasLetterSlots && allLetterSlotsUpper,
  };
}

function longestFormattedLength(mask: CompiledMask): number {
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

function resolve(options: MaskedOptions): ResolvedMaskedOptions {
  const mask = compileMask(options.mask, options.tokens ?? {});
  const showLiterals = options.showLiterals ?? "filled";
  const placeholderChar = options.placeholderChar ?? "_";

  if ([...placeholderChar].length !== 1) {
    throw new MaskedOptionsError("placeholder");
  }

  const traits = slotTraits(mask);
  return Object.freeze({
    mask,
    patterns: Object.freeze(mask.alternatives.map((alt) => alt.pattern)),
    ...(options.selectMask === undefined
      ? {}
      : { selectMask: options.selectMask }),
    showLiterals,
    placeholderChar,
    inputMode: options.inputMode ?? (traits.allDigitSlots ? "numeric" : "text"),
    ...(options.validate === undefined ? {} : { validate: options.validate }),
    invalid: options.invalid ?? false,
    ...(options.describedBy === undefined
      ? {}
      : { describedBy: options.describedBy }),
    required: options.required ?? false,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    allDigitSlots: traits.allDigitSlots,
    hasLetterSlots: traits.hasLetterSlots,
    allLetterSlotsUpper: traits.allLetterSlotsUpper,
    maxFormattedLength: longestFormattedLength(mask),
  });
}

/** Compile the mask and resolve options once; cached per options identity. */
export function resolveMaskedOptions(
  options: MaskedOptions,
): ResolvedMaskedOptions {
  const cached = cache.get(options);
  if (cached) {
    return cached;
  }
  const resolved = resolve(options);
  cache.set(options, resolved);
  return resolved;
}

/** Alternative index for `raw`: custom `selectMask`, else first match wins. */
export function pickAlternative(
  resolved: ResolvedMaskedOptions,
  raw: string,
): number {
  if (resolved.selectMask !== undefined && resolved.patterns.length > 1) {
    const index = resolved.selectMask(raw, resolved.patterns);
    if (
      typeof index === "number" &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < resolved.patterns.length
    ) {
      return index;
    }
  }
  return selectAlternative(resolved.mask, raw);
}
