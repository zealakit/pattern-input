import {
  caret,
  type FieldStatus,
  type StickySelection,
} from "../shared/index.js";
import {
  type OtpOptions,
  type ResolvedOtpOptions,
  resolveOtpOptions,
} from "./options.js";

export type OtpState = {
  readonly kind: "otp";
  /** `""` means empty; always exactly `options.length` entries. */
  readonly slots: readonly string[];
  /** Slot that should own DOM focus (clamped to the last slot). */
  readonly activeIndex: number;
  readonly rawValue: string;
  readonly formattedValue: string;
  readonly selection: StickySelection;
  readonly status: FieldStatus;
  readonly invalidReason: "consumer" | null;
  readonly focused: boolean;
  readonly composing: {
    readonly text: string;
    readonly index: number;
  } | null;
};

type StateOverrides = {
  status?: FieldStatus;
  invalidReason?: OtpState["invalidReason"];
  focused?: boolean;
  composing?: OtpState["composing"];
};

/** Compact raw value: filled slots in order, gaps removed (FR-5). */
export function otpRawValue(slots: readonly string[]): string {
  return slots.filter((value) => value !== "").join("");
}

export function otpStatusOf(slots: readonly string[]): FieldStatus {
  const raw = otpRawValue(slots);
  if (raw === "") {
    return "empty";
  }
  return slots.every((value) => value !== "") ? "complete" : "incomplete";
}

export function firstEmptyIndex(slots: readonly string[]): number {
  return slots.indexOf("");
}

export function emptySlots(length: number): readonly string[] {
  return Object.freeze(Array.from({ length }, () => ""));
}

/** Build an immutable OTP state. */
export function buildOtpState(
  previous: OtpState,
  slots: readonly string[],
  activeIndex: number,
  resolved: ResolvedOtpOptions,
  overrides: StateOverrides = {},
): OtpState {
  const clamped = Math.min(Math.max(activeIndex, 0), resolved.length - 1);
  const rawValue = otpRawValue(slots);
  return Object.freeze({
    kind: "otp",
    slots,
    activeIndex: clamped,
    rawValue,
    formattedValue: rawValue,
    selection: caret(clamped, "after"),
    status: overrides.status ?? otpStatusOf(slots),
    invalidReason:
      overrides.invalidReason === undefined ? null : overrides.invalidReason,
    focused:
      overrides.focused === undefined ? previous.focused : overrides.focused,
    composing:
      overrides.composing === undefined
        ? previous.composing
        : overrides.composing,
  });
}

/** Distribute characters left to right; returns the last index written. */
export function distributeSlots(
  slots: readonly string[],
  text: string,
  start: number,
  length: number,
): { readonly slots: readonly string[]; readonly lastFilled: number } {
  const next = [...slots];
  let cursor = start;
  let lastFilled = -1;
  for (const char of text) {
    if (cursor >= length) {
      break;
    }
    next[cursor] = char;
    lastFilled = cursor;
    cursor += 1;
  }
  return { slots: Object.freeze(next), lastFilled };
}

/** Create the initial OTP state from already-resolved options. */
export function createOtpStateFrom(
  resolved: ResolvedOtpOptions,
  initial = "",
): OtpState {
  const base: OtpState = {
    kind: "otp",
    slots: emptySlots(resolved.length),
    activeIndex: 0,
    rawValue: "",
    formattedValue: "",
    selection: caret(0),
    status: "empty",
    invalidReason: null,
    focused: false,
    composing: null,
  };

  if (initial === "") {
    return base;
  }

  const distributed = distributeSlots(base.slots, initial, 0, resolved.length);
  const nextEmpty = firstEmptyIndex(distributed.slots);
  const activeIndex = nextEmpty === -1 ? resolved.length - 1 : nextEmpty;
  return buildOtpState(base, distributed.slots, activeIndex, resolved);
}

/** Create the initial OTP state, distributing an optional value from slot 0. */
export function createOtpState(options: OtpOptions, initial = ""): OtpState {
  return createOtpStateFrom(resolveOtpOptions(options), initial);
}
