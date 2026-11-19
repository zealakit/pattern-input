import type {
  EditableMap,
  FieldStatus,
  KeyInput,
  KeyPlatform,
  StickySelection,
} from "../shared/index.js";
import {
  createMaskedStateFrom,
  type MaskedEvent,
  type MaskedOptions,
  type MaskedState,
  maskedKeyToEvent,
  maskedReducer,
  resolveMaskedOptions,
  type ResolvedMaskedOptions,
  formatMasked,
} from "../masked/index.js";
import {
  createNumberStateFrom,
  formatNumber,
  type NumberEvent,
  type NumberOptions,
  type NumberState,
  numberKeyToEvent,
  numberReducer,
  resolveNumberOptions,
  type ResolvedNumberOptions,
} from "../number/index.js";
import {
  createOtpStateFrom,
  type OtpEvent,
  type OtpOptions,
  type OtpState,
  otpKeyToEvent,
  otpReducer,
  resolveOtpOptions,
  type ResolvedOtpOptions,
} from "../otp/index.js";

export type FormattedField = {
  readonly text: string;
  readonly map: EditableMap;
};

/** Everything the controller needs to run one field kind. */
export type FieldBinding<TState, TEvent, TValue, TOptions, TResolved> = {
  readonly kind: "number" | "masked" | "otp";
  readonly emptyValue: TValue;
  resolve(options: TOptions): TResolved;
  create(resolved: TResolved, value: TValue | undefined): TState;
  reduce(state: TState, event: TEvent, resolved: TResolved): TState;
  keyToEvent(
    key: KeyInput,
    state: TState,
    resolved: TResolved,
    platform?: KeyPlatform,
  ): TEvent | null;
  valueOf(state: TState): TValue;
  statusOf(state: TState): FieldStatus;
  formattedValue(state: TState): string;
  format(state: TState, resolved: TResolved): FormattedField;
  selectionOf(state: TState): StickySelection;
  sameValue(left: TValue, right: TValue): boolean;
};

function otpFormat(state: OtpState): FormattedField {
  const text = state.rawValue;
  const units = [...text].map((_, index) => ({
    start: index,
    end: index + 1,
  }));
  return { text, map: { textLength: text.length, units } };
}

export const numberBinding: FieldBinding<
  NumberState,
  NumberEvent,
  number | null,
  NumberOptions,
  ResolvedNumberOptions
> = {
  kind: "number",
  emptyValue: null,
  resolve: (options) => resolveNumberOptions(options),
  create: (resolved, value) => createNumberStateFrom(resolved, value ?? null),
  reduce: numberReducer,
  keyToEvent: (key, state, resolved, platform) =>
    numberKeyToEvent(key, state, resolved, platform),
  valueOf: (state) => state.rawValue,
  statusOf: (state) => state.status,
  formattedValue: (state) => state.formattedValue,
  format: (state, resolved) => formatNumber(state.rawText, resolved),
  selectionOf: (state) => state.selection,
  sameValue: (left, right) => Object.is(left, right),
};

export const maskedBinding: FieldBinding<
  MaskedState,
  MaskedEvent,
  string,
  MaskedOptions,
  ResolvedMaskedOptions
> = {
  kind: "masked",
  emptyValue: "",
  resolve: (options) => resolveMaskedOptions(options),
  create: (resolved, value) => createMaskedStateFrom(resolved, value ?? ""),
  reduce: maskedReducer,
  keyToEvent: (key, state, resolved, platform) =>
    maskedKeyToEvent(key, state, resolved, platform),
  valueOf: (state) => state.rawValue,
  statusOf: (state) => state.status,
  formattedValue: (state) => state.formattedValue,
  format: (state, resolved) =>
    formatMasked(
      state.rawValue,
      resolved.mask.alternatives[state.alternativeIndex] ??
        resolved.mask.alternatives[0],
      resolved,
      { trailingLiterals: state.focused },
    ),
  selectionOf: (state) => state.selection,
  sameValue: (left, right) => left === right,
};

export const otpBinding: FieldBinding<
  OtpState,
  OtpEvent,
  string,
  OtpOptions,
  ResolvedOtpOptions
> = {
  kind: "otp",
  emptyValue: "",
  resolve: (options) => resolveOtpOptions(options),
  create: (resolved, value) => createOtpStateFrom(resolved, value ?? ""),
  reduce: otpReducer,
  keyToEvent: (key, state, resolved) => otpKeyToEvent(key, state, resolved),
  valueOf: (state) => state.rawValue,
  statusOf: (state) => state.status,
  formattedValue: (state) => state.formattedValue,
  format: (state) => otpFormat(state),
  selectionOf: (state) => state.selection,
  sameValue: (left, right) => left === right,
};
