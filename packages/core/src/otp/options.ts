import type { FieldStatus } from "../shared/index.js";

export type OtpOptions = {
  /** Number of slots, 1..32 (NFR-3 is exercised at 20). */
  readonly length: number;
  readonly type?: "numeric" | "alphanumeric";
  readonly transform?: "upper" | "lower";
  readonly autocomplete?: "one-time-code" | "off";
  readonly name?: string;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly slotLabel?: (index: number, length: number) => string;
  readonly validate?: (
    raw: string,
    ctx: { readonly status: FieldStatus },
  ) => boolean | string | undefined;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly required?: boolean;
};

export type OtpSlotLabel = (index: number, length: number) => string;

export type ResolvedOtpOptions = {
  readonly length: number;
  readonly type: "numeric" | "alphanumeric";
  readonly transform: "upper" | "lower" | null;
  readonly autocomplete: "one-time-code" | "off";
  readonly name: string | null;
  readonly label: string | null;
  readonly labelledBy: string | null;
  readonly describedBy: string | null;
  readonly slotLabel: OtpSlotLabel;
  readonly validate?: OtpOptions["validate"];
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
};

export class OtpOptionsError extends Error {
  readonly reason: "length";

  constructor(reason: "length") {
    super(`Invalid OTP options: ${reason}`);
    this.name = "OtpOptionsError";
    this.reason = reason;
  }
}

const MIN_LENGTH = 1;
const MAX_LENGTH = 32;
const cache = new WeakMap<OtpOptions, ResolvedOtpOptions>();

const defaultSlotLabel: OtpSlotLabel = (index, length) =>
  `Character ${index + 1} of ${length}`;

function resolve(options: OtpOptions): ResolvedOtpOptions {
  if (
    !Number.isInteger(options.length) ||
    options.length < MIN_LENGTH ||
    options.length > MAX_LENGTH
  ) {
    throw new OtpOptionsError("length");
  }

  const type = options.type ?? "numeric";
  return Object.freeze({
    length: options.length,
    type,
    transform: type === "alphanumeric" ? (options.transform ?? null) : null,
    autocomplete: options.autocomplete ?? "one-time-code",
    name: options.name ?? null,
    label: options.label ?? null,
    labelledBy: options.labelledBy ?? null,
    describedBy: options.describedBy ?? null,
    slotLabel: options.slotLabel ?? defaultSlotLabel,
    validate: options.validate,
    invalid: options.invalid ?? false,
    disabled: options.disabled ?? false,
    required: options.required ?? false,
  });
}

/** Resolve OTP options once; cached per options object identity. */
export function resolveOtpOptions(options: OtpOptions): ResolvedOtpOptions {
  const cached = cache.get(options);
  if (cached) {
    return cached;
  }
  const resolved = resolve(options);
  cache.set(options, resolved);
  return resolved;
}
