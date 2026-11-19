/**
 * Exact decimal math on canonical strings. Values never pass through a binary
 * float, so `0.1 * 10` style drift cannot appear.
 */

/** Rounding modes supported by the number field. */
export type RoundingMode = "truncate" | "round-half-up" | "round-half-even";

type Parts = {
  readonly negative: boolean;
  readonly int: string;
  readonly frac: string;
};

function parseParts(value: string): Parts | null {
  if (typeof value !== "string") {
    return null;
  }
  let text = value.trim();
  if (text === "") {
    return null;
  }

  let negative = false;
  const first = text[0];
  if (first === "-" || first === "\u2212") {
    negative = true;
    text = text.slice(1);
  } else if (first === "+") {
    text = text.slice(1);
  }
  if (text === "" || !/^\d*(?:\.\d*)?$/.test(text) || text === ".") {
    return null;
  }

  const dot = text.indexOf(".");
  const int = dot === -1 ? text : text.slice(0, dot);
  const frac = dot === -1 ? "" : text.slice(dot + 1);
  return { negative, int, frac };
}

function canonicalFromParts(
  negative: boolean,
  int: string,
  frac: string,
): string {
  const whole = int.replace(/^0+/, "") || "0";
  const fraction = frac.replace(/0+$/, "");
  if (whole === "0" && fraction === "") {
    return "0";
  }
  return `${negative ? "-" : ""}${whole}${fraction === "" ? "" : `.${fraction}`}`;
}

function scaleOf(a: Parts, b: Parts): number {
  return Math.max(a.frac.length, b.frac.length);
}

function scaledValue(parts: Parts, scale: number): bigint {
  const digits = `${parts.int}${parts.frac.padEnd(scale, "0")}` || "0";
  const magnitude = BigInt(digits);
  return parts.negative ? -magnitude : magnitude;
}

function fromScaled(value: bigint, scale: number): string {
  const negative = value < 0n;
  let digits = (negative ? -value : value).toString();
  if (scale === 0) {
    return canonicalFromParts(negative, digits, "");
  }
  digits = digits.padStart(scale + 1, "0");
  const int = digits.slice(0, digits.length - scale);
  const frac = digits.slice(digits.length - scale);
  return canonicalFromParts(negative, int, frac);
}

function increment(int: string, frac: string, scale: number): Parts {
  const digits = `${int}${frac}`.replace(/^0+(?=\d)/, "") || "0";
  const next = (BigInt(digits) + 1n).toString().padStart(scale + 1, "0");
  if (scale === 0) {
    return { negative: false, int: next, frac: "" };
  }
  return {
    negative: false,
    int: next.slice(0, next.length - scale),
    frac: next.slice(next.length - scale),
  };
}

function roundUp(
  rest: string,
  kept: string,
  int: string,
  mode: RoundingMode,
): boolean {
  const first = rest[0];
  if (first > "5") {
    return true;
  }
  if (first < "5") {
    return false;
  }
  if (rest.slice(1).replace(/0/g, "") !== "") {
    return true;
  }
  if (mode === "round-half-up") {
    return true;
  }
  const parityDigit =
    kept === "" ? (int[int.length - 1] ?? "0") : kept[kept.length - 1];
  return Number(parityDigit) % 2 === 1;
}

/** Round or truncate to at most `maxFraction` digits. */
export function roundDecimal(
  value: string,
  maxFraction: number,
  mode: RoundingMode,
): string {
  const parts = parseParts(value);
  if (!parts) {
    return "";
  }
  const max = Math.max(0, Math.trunc(maxFraction));
  if (parts.frac.length <= max) {
    return canonicalFromParts(parts.negative, parts.int, parts.frac);
  }

  const kept = parts.frac.slice(0, max);
  const rest = parts.frac.slice(max);
  if (mode === "truncate" || !roundUp(rest, kept, parts.int, mode)) {
    return canonicalFromParts(parts.negative, parts.int, kept);
  }

  const bumped = increment(parts.int, kept, max);
  return canonicalFromParts(parts.negative, bumped.int, bumped.frac);
}

/** Pad the fraction with zeros to at least `minFraction` digits. */
export function padFraction(value: string, minFraction: number): string {
  const parts = parseParts(value);
  if (!parts) {
    return "";
  }
  const min = Math.max(0, Math.trunc(minFraction));
  const frac = parts.frac.padEnd(min, "0");
  const int = parts.int.replace(/^0+/, "") || "0";
  if (int === "0" && frac === "") {
    return "0";
  }
  return `${parts.negative ? "-" : ""}${int}${frac === "" ? "" : `.${frac}`}`;
}

/** Add or subtract an exact step. */
export function stepDecimal(
  value: string,
  step: string,
  direction: 1 | -1,
): string {
  const a = parseParts(value);
  const b = parseParts(step);
  if (!a || !b) {
    return "";
  }
  const scale = scaleOf(a, b);
  const result =
    scaledValue(a, scale) +
    (direction === 1 ? 1n : -1n) * scaledValue(b, scale);
  return fromScaled(result, scale);
}

/** Numeric comparison: -1, 0 or 1. Invalid input compares as equal. */
export function compareDecimal(left: string, right: string): number {
  const a = parseParts(left);
  const b = parseParts(right);
  if (!a || !b) {
    return 0;
  }
  const scale = scaleOf(a, b);
  const av = scaledValue(a, scale);
  const bv = scaledValue(b, scale);
  if (av === bv) {
    return 0;
  }
  return av < bv ? -1 : 1;
}

/** Clamp to optional bounds, returning a canonical string. */
export function clampDecimal(
  value: string,
  min: string | null,
  max: string | null,
): string {
  const parts = parseParts(value);
  if (!parts) {
    return "";
  }
  const canonical = canonicalFromParts(parts.negative, parts.int, parts.frac);
  if (min !== null && compareDecimal(canonical, min) < 0) {
    return clampCanonical(min);
  }
  if (max !== null && compareDecimal(canonical, max) > 0) {
    return clampCanonical(max);
  }
  return canonical;
}

function clampCanonical(bound: string): string {
  const parts = parseParts(bound);
  return parts ? canonicalFromParts(parts.negative, parts.int, parts.frac) : "";
}

/** Parse to a JS number, or `null` when empty or beyond safe integer range. */
export function toNumber(value: string): number | null {
  const parts = parseParts(value);
  if (!parts) {
    return null;
  }
  const canonical = canonicalFromParts(parts.negative, parts.int, parts.frac);
  const number = Number(canonical);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
    return null;
  }
  return number;
}

function expandExponential(text: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(text);
  if (!match) {
    return text;
  }
  const sign = match[1];
  const int = match[2];
  const frac = match[3] ?? "";
  const exponent = Number.parseInt(match[4], 10);
  const digits = `${int}${frac}`;
  const point = int.length + exponent;

  if (point <= 0) {
    return `${sign}0.${"0".repeat(-point)}${digits}`;
  }
  if (point >= digits.length) {
    return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  }
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** Canonical string for a JS number, never exponential; `-0` becomes `"0"`. */
export function fromNumber(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }
  const parts = parseParts(expandExponential(value.toString()));
  return parts
    ? canonicalFromParts(parts.negative, parts.int, parts.frac)
    : "0";
}
