import { fromNumber } from "../lexers/index.js";
import type { FieldStatus } from "../shared/index.js";

export type NumberRounding = "truncate" | "round-half-up" | "round-half-even";

export type NumberOptions = {
  /** Locale used once to resolve separators (D9). Never used for formatting. */
  readonly locale?: string;
  readonly decimalSeparator?: string;
  /** `""` disables grouping. */
  readonly groupSeparator?: string;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly rounding?: NumberRounding;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly largeStep?: number;
  readonly allowNegative?: boolean;
  readonly clampBehavior?: "blur" | "none";
  readonly validate?: (
    value: number | null,
    ctx: { readonly status: FieldStatus },
  ) => boolean | string | undefined;
  readonly invalid?: boolean;
  readonly describedBy?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
};

export type ResolvedNumberOptions = {
  readonly decimalSeparator: string;
  readonly groupSeparator: string;
  readonly minimumFractionDigits: number;
  readonly maximumFractionDigits: number;
  readonly rounding: NumberRounding;
  readonly min: number | null;
  readonly max: number | null;
  readonly step: string;
  readonly largeStep: string;
  readonly allowNegative: boolean;
  readonly clampBehavior: "blur" | "none";
  readonly validate?: NumberOptions["validate"];
  readonly invalid: boolean;
  readonly describedBy?: string;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
};

export type NumberOptionsErrorReason =
  | "separators"
  | "separator-char"
  | "range"
  | "fraction"
  | "fraction-range"
  | "step";

export class NumberOptionsError extends Error {
  readonly reason: NumberOptionsErrorReason;

  constructor(reason: NumberOptionsErrorReason) {
    super(`Invalid number options: ${reason}`);
    this.name = "NumberOptionsError";
    this.reason = reason;
  }
}

const DEFAULT_SEPARATORS = { decimal: ".", group: "," } as const;
const cache = new WeakMap<NumberOptions, ResolvedNumberOptions>();

type Separators = { readonly decimal: string; readonly group: string };

const MAX_LOCALE_CACHE = 64;
const localeCache = new Map<string, Separators>();

/** Resolve (and memoize) a locale's separators; `Intl` is slow to construct. */
function separatorsFromLocale(locale: string): Separators {
  const cached = localeCache.get(locale);
  if (cached) {
    return cached;
  }
  const separators = readSeparators(locale);
  if (localeCache.size >= MAX_LOCALE_CACHE) {
    localeCache.clear();
  }
  localeCache.set(locale, separators);
  return separators;
}

function readSeparators(locale: string): Separators {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
    let decimal: string = DEFAULT_SEPARATORS.decimal;
    let group: string = DEFAULT_SEPARATORS.group;
    for (const part of parts) {
      if (part.type === "decimal") {
        decimal = part.value;
      } else if (part.type === "group") {
        group = part.value;
      }
    }
    return { decimal, group };
  } catch {
    return DEFAULT_SEPARATORS;
  }
}

function timesTen(value: string): string {
  const negative = value.startsWith("-");
  const abs = negative ? value.slice(1) : value;
  const dot = abs.indexOf(".");
  if (dot === -1) {
    return `${negative ? "-" : ""}${abs}0`;
  }
  const int = abs.slice(0, dot);
  const frac = abs.slice(dot + 1);
  const digits = `${int}${frac}`;
  const point = int.length + 1;
  const shifted =
    point >= digits.length
      ? `${digits}${"0".repeat(point - digits.length)}`
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const trimmed = shifted.includes(".")
    ? shifted.replace(/0+$/, "").replace(/\.$/, "")
    : shifted;
  return `${negative ? "-" : ""}${trimmed || "0"}`;
}

function fractionDigits(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new NumberOptionsError("fraction");
  }
  return value;
}

function resolve(options: NumberOptions): ResolvedNumberOptions {
  const localeSeparators = options.locale
    ? separatorsFromLocale(options.locale)
    : DEFAULT_SEPARATORS;

  const decimalSeparator = options.decimalSeparator ?? localeSeparators.decimal;
  const groupSeparator = options.groupSeparator ?? localeSeparators.group;

  if (decimalSeparator === "") {
    throw new NumberOptionsError("separator-char");
  }
  if (
    groupSeparator !== "" &&
    (decimalSeparator === groupSeparator ||
      /[0-9-]/.test(decimalSeparator) ||
      /[0-9-]/.test(groupSeparator))
  ) {
    throw new NumberOptionsError(
      decimalSeparator === groupSeparator ? "separators" : "separator-char",
    );
  }

  const minimumFractionDigits = fractionDigits(
    options.minimumFractionDigits,
    0,
  );
  const maximumFractionDigits = fractionDigits(
    options.maximumFractionDigits,
    20,
  );
  if (minimumFractionDigits > maximumFractionDigits) {
    throw new NumberOptionsError("fraction-range");
  }

  if (
    options.min !== undefined &&
    options.max !== undefined &&
    options.min > options.max
  ) {
    throw new NumberOptionsError("range");
  }

  const stepValue = options.step ?? 1;
  if (!Number.isFinite(stepValue) || stepValue <= 0) {
    throw new NumberOptionsError("step");
  }
  const step = fromNumber(stepValue);
  const largeStep =
    options.largeStep === undefined
      ? timesTen(step)
      : fromNumber(options.largeStep);

  const min = options.min ?? null;
  const max = options.max ?? null;
  const allowNegative = options.allowNegative ?? (min === null || min < 0);

  return Object.freeze({
    decimalSeparator,
    groupSeparator,
    minimumFractionDigits,
    maximumFractionDigits,
    rounding: options.rounding ?? "round-half-up",
    min,
    max,
    step,
    largeStep,
    allowNegative,
    clampBehavior: options.clampBehavior ?? "blur",
    ...(options.validate === undefined ? {} : { validate: options.validate }),
    invalid: options.invalid ?? false,
    ...(options.describedBy === undefined
      ? {}
      : { describedBy: options.describedBy }),
    required: options.required ?? false,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
  });
}

/** Resolve options once and cache per options object identity. */
export function resolveNumberOptions(
  options: NumberOptions = {},
): ResolvedNumberOptions {
  const cached = cache.get(options);
  if (cached) {
    return cached;
  }
  const resolved = resolve(options);
  cache.set(options, resolved);
  return resolved;
}
