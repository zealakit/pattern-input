import { fromNumber, toNumber } from "../lexers/index.js";
import {
  caret,
  type FieldStatus,
  type StickySelection,
} from "../shared/index.js";
import { formatNumber } from "./format.js";
import {
  type NumberOptions,
  type ResolvedNumberOptions,
  resolveNumberOptions,
} from "./options.js";
import { deriveStatus } from "./parse.js";

export type NumberState = {
  readonly kind: "number";
  /** Canonical editing text: "", "-", "12.", "-1234.50"; decimal is ".". */
  readonly rawText: string;
  readonly rawValue: number | null;
  readonly formattedValue: string;
  readonly selection: StickySelection;
  readonly status: FieldStatus;
  readonly invalidReason: "range" | "consumer" | null;
  readonly focused: boolean;
  readonly composing: { readonly text: string } | null;
  readonly committedRawText: string;
};

/** Numeric value of canonical rawText; `-0` normalizes to `0`. */
export function rawValueOf(rawText: string): number | null {
  if (rawText === "" || rawText === "-" || rawText === ".") {
    return null;
  }
  const value = toNumber(rawText);
  if (value === null) {
    return null;
  }
  return Object.is(value, -0) ? 0 : value;
}

type StateOverrides = {
  status?: FieldStatus;
  invalidReason?: NumberState["invalidReason"];
  focused?: boolean;
  composing?: NumberState["composing"];
  committedRawText?: string;
};

/** Build an immutable state from canonical raw text. */
export function buildNumberState(
  rawText: string,
  resolved: ResolvedNumberOptions,
  selection: StickySelection,
  previous: NumberState,
  overrides: StateOverrides = {},
): NumberState {
  return Object.freeze({
    kind: "number",
    rawText,
    rawValue: rawValueOf(rawText),
    formattedValue: formatNumber(rawText, resolved).text,
    selection,
    status: overrides.status ?? deriveStatus(rawText),
    invalidReason: overrides.invalidReason ?? null,
    focused: overrides.focused ?? previous.focused,
    composing:
      overrides.composing === undefined
        ? previous.composing
        : overrides.composing,
    committedRawText: overrides.committedRawText ?? previous.committedRawText,
  });
}

/** Create the initial number state; `initial` is rounded like `setValue`. */
export function createNumberState(
  options: NumberOptions = {},
  initial: number | null = null,
): NumberState {
  const resolved = resolveNumberOptions(options);
  const rawText =
    initial === null || Number.isNaN(initial) ? "" : fromNumber(initial);
  const base: NumberState = {
    kind: "number",
    rawText,
    rawValue: null,
    formattedValue: "",
    selection: caret(0),
    status: "empty",
    invalidReason: null,
    focused: false,
    composing: null,
    committedRawText: rawText,
  };
  return buildNumberState(
    rawText,
    resolved,
    caret(rawText.length, "before"),
    base,
  );
}
