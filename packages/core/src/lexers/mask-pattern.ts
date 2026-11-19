/** Custom single-character mask token supplied through options. */
export type MaskTokenDefinition = {
  readonly test: RegExp;
  readonly transform?: "upper" | "lower";
};

export type MaskToken =
  | { readonly kind: "literal"; readonly char: string }
  | {
      readonly kind: "slot";
      readonly test: RegExp;
      readonly transform?: "upper" | "lower";
      readonly optional: boolean;
    };

export type CompiledAlternative = {
  readonly pattern: string;
  readonly tokens: readonly MaskToken[];
  readonly capacity: number;
  readonly required: number;
};

export type CompiledMask = {
  readonly alternatives: readonly CompiledAlternative[];
};

export type MaskPatternErrorReason =
  | "unbalanced-optional"
  | "bad-repeat"
  | "empty-pattern"
  | "reserved-token"
  | "bad-token";

/** Thrown once, at option resolution, for an invalid mask pattern. */
export class MaskPatternError extends Error {
  readonly patternIndex: number;
  readonly offset: number;
  readonly reason: MaskPatternErrorReason;

  constructor(
    patternIndex: number,
    offset: number,
    reason: MaskPatternErrorReason,
  ) {
    super(
      `Invalid mask pattern ${patternIndex} at offset ${offset}: ${reason}`,
    );
    this.name = "MaskPatternError";
    this.patternIndex = patternIndex;
    this.offset = offset;
    this.reason = reason;
  }
}

const MAX_SLOTS = 64;
const RESERVED = new Set(["9", "a", "*", "\\", "[", "]", "{", "}"]);

const BUILTIN_TESTS: Record<string, RegExp> = {
  "9": /^[0-9]$/,
  a: /^[A-Za-z]$/,
  "*": /^[A-Za-z0-9]$/,
};

function cloneTest(test: RegExp): RegExp {
  // `g`/`y` would make `.test` stateful across calls.
  return new RegExp(test.source, test.flags.replace(/[gy]/g, ""));
}

function validateTokens(tokens: Record<string, MaskTokenDefinition>): void {
  for (const [key, definition] of Object.entries(tokens)) {
    if (RESERVED.has(key)) {
      throw new MaskPatternError(0, 0, "reserved-token");
    }
    if ([...key].length !== 1 || !(definition.test instanceof RegExp)) {
      throw new MaskPatternError(0, 0, "bad-token");
    }
  }
}

type Repeat = {
  readonly min: number;
  readonly max: number;
  readonly next: number;
};

function parseRepeat(
  pattern: string,
  start: number,
  patternIndex: number,
  slotsUsed: number,
): Repeat {
  const close = pattern.indexOf("}", start + 1);
  if (close === -1) {
    throw new MaskPatternError(patternIndex, start, "bad-repeat");
  }
  const body = pattern.slice(start + 1, close);
  const match = /^(\d+)(?:,(\d*))?$/.exec(body);
  if (!match) {
    throw new MaskPatternError(patternIndex, start, "bad-repeat");
  }

  const min = Number(match[1]);
  if (min < 1) {
    throw new MaskPatternError(patternIndex, start, "bad-repeat");
  }

  let max = min;
  if (match[2] !== undefined) {
    max =
      match[2] === "" ? MAX_SLOTS - slotsUsed : Number.parseInt(match[2], 10);
  }
  if (max < min || slotsUsed + max > MAX_SLOTS) {
    throw new MaskPatternError(patternIndex, start, "bad-repeat");
  }
  return { min, max, next: close + 1 };
}

function compileAlternative(
  pattern: string,
  patternIndex: number,
  tokens: Record<string, MaskTokenDefinition>,
): CompiledAlternative {
  if (pattern.length === 0) {
    throw new MaskPatternError(patternIndex, 0, "empty-pattern");
  }

  const compiled: MaskToken[] = [];
  let optional = false;
  let optionalStart = 0;
  let slotsUsed = 0;
  let index = 0;

  while (index < pattern.length) {
    const char = pattern[index];

    if (char === "\\") {
      const escaped = pattern[index + 1];
      compiled.push({
        kind: "literal",
        char: escaped === undefined ? "\\" : escaped,
      });
      index += escaped === undefined ? 1 : 2;
      continue;
    }

    if (char === "[") {
      if (optional) {
        throw new MaskPatternError(patternIndex, index, "unbalanced-optional");
      }
      optional = true;
      optionalStart = index;
      index += 1;
      continue;
    }

    if (char === "]") {
      if (!optional) {
        throw new MaskPatternError(patternIndex, index, "unbalanced-optional");
      }
      optional = false;
      index += 1;
      continue;
    }

    if (char === "{") {
      // A repeat replaces the token it follows rather than adding to it.
      const last = compiled.pop();
      if (!last) {
        throw new MaskPatternError(patternIndex, index, "bad-repeat");
      }
      if (last.kind === "slot") {
        slotsUsed -= 1;
      }
      const repeat = parseRepeat(pattern, index, patternIndex, slotsUsed);
      if (last.kind === "literal") {
        if (repeat.min !== repeat.max) {
          throw new MaskPatternError(patternIndex, index, "bad-repeat");
        }
        for (let copy = 0; copy < repeat.min; copy += 1) {
          compiled.push({ kind: "literal", char: last.char });
        }
      } else {
        for (let copy = 0; copy < repeat.min; copy += 1) {
          compiled.push(last);
        }
        for (let copy = repeat.min; copy < repeat.max; copy += 1) {
          compiled.push({ ...last, optional: true });
        }
        slotsUsed += repeat.max;
      }
      index = repeat.next;
      continue;
    }

    const custom = tokens[char];
    if (custom) {
      compiled.push({
        kind: "slot",
        test: cloneTest(custom.test),
        transform: custom.transform,
        optional,
      });
      slotsUsed += 1;
      index += 1;
      continue;
    }

    const builtin = BUILTIN_TESTS[char];
    if (builtin) {
      compiled.push({
        kind: "slot",
        test: builtin,
        optional,
      });
      slotsUsed += 1;
      index += 1;
      continue;
    }

    compiled.push({ kind: "literal", char });
    index += 1;
  }

  if (optional) {
    throw new MaskPatternError(
      patternIndex,
      optionalStart,
      "unbalanced-optional",
    );
  }

  const slots = compiled.filter((token) => token.kind === "slot");
  return {
    pattern,
    tokens: compiled,
    capacity: slots.length,
    required: slots.filter((token) => !token.optional).length,
  };
}

/**
 * Compile one or more mask patterns. The only throwing entry point in this
 * plan: it runs once when options resolve, never during editing.
 */
export function compileMask(
  patterns: string | readonly string[],
  tokens: Record<string, MaskTokenDefinition> = {},
): CompiledMask {
  const list = typeof patterns === "string" ? [patterns] : patterns;
  if (list.length === 0) {
    throw new MaskPatternError(0, 0, "empty-pattern");
  }
  validateTokens(tokens);
  return {
    alternatives: list.map((pattern, index) =>
      compileAlternative(pattern, index, tokens),
    ),
  };
}
