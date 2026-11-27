import { fitRaw, type CompiledAlternative } from "../lexers/index.js";
import {
  caret,
  type FieldStatus,
  type StickySelection,
} from "../shared/index.js";
import { formatMasked } from "./format.js";
import {
  type MaskedOptions,
  pickAlternative,
  type ResolvedMaskedOptions,
  resolveMaskedOptions,
} from "./options.js";

export type MaskedState = {
  readonly kind: "masked";
  /** Editable characters only; literals are always re-derived on format. */
  readonly rawValue: string;
  readonly alternativeIndex: number;
  readonly formattedValue: string;
  readonly selection: StickySelection;
  readonly status: FieldStatus;
  readonly invalidReason: "consumer" | null;
  readonly focused: boolean;
  readonly composing: { readonly text: string } | null;
  readonly committedRaw: string;
};

type StateOverrides = {
  status?: FieldStatus;
  invalidReason?: MaskedState["invalidReason"];
  focused?: boolean;
  composing?: MaskedState["composing"];
  committedRaw?: string;
};

/** All required slots filled? (Optional slots may legitimately be absent.) */
export function isMaskedComplete(
  raw: string,
  alternative: CompiledAlternative,
): boolean {
  let cursor = 0;
  for (const token of alternative.tokens) {
    if (token.kind !== "slot") {
      continue;
    }
    if (cursor < raw.length) {
      cursor += 1;
      continue;
    }
    if (!token.optional) {
      return false;
    }
  }
  return true;
}

export function maskedStatusOf(
  raw: string,
  alternative: CompiledAlternative,
): FieldStatus {
  if (raw === "") {
    return "empty";
  }
  return isMaskedComplete(raw, alternative) ? "complete" : "incomplete";
}

/** Build an immutable masked state from raw editable characters. */
export function buildMaskedState(
  raw: string,
  alternativeIndex: number,
  resolved: ResolvedMaskedOptions,
  selection: StickySelection,
  previous: MaskedState,
  overrides: StateOverrides = {},
): MaskedState {
  const alternative =
    resolved.mask.alternatives[alternativeIndex] ??
    resolved.mask.alternatives[0];
  const focused = overrides.focused ?? previous.focused;
  const formatted = formatMasked(raw, alternative, resolved, {
    trailingLiterals: focused,
  });

  return Object.freeze({
    kind: "masked",
    rawValue: raw,
    alternativeIndex,
    formattedValue: formatted.text,
    selection,
    status: overrides.status ?? maskedStatusOf(raw, alternative),
    invalidReason:
      overrides.invalidReason === undefined ? null : overrides.invalidReason,
    focused,
    composing:
      overrides.composing === undefined
        ? previous.composing
        : overrides.composing,
    committedRaw:
      overrides.committedRaw === undefined
        ? previous.committedRaw
        : overrides.committedRaw,
  });
}

/** Create the initial masked state from already-resolved options. */
export function createMaskedStateFrom(
  resolved: ResolvedMaskedOptions,
  requestedRaw = "",
): MaskedState {
  const fitted = fitRaw(
    resolved.mask.alternatives[pickAlternative(resolved, requestedRaw)],
    requestedRaw,
  ).accepted;
  const initialRaw = fitted;
  const alternativeIndex = pickAlternative(resolved, initialRaw);
  const base: MaskedState = {
    kind: "masked",
    rawValue: "",
    alternativeIndex,
    formattedValue: "",
    selection: caret(0),
    status: "empty",
    invalidReason: null,
    focused: false,
    composing: null,
    committedRaw: "",
  };
  return buildMaskedState(
    initialRaw,
    alternativeIndex,
    resolved,
    caret(initialRaw.length, "before"),
    base,
    { committedRaw: initialRaw },
  );
}

/** Create the initial masked state from an optional raw value. */
export function createMaskedState(
  options: MaskedOptions,
  initialRaw = "",
): MaskedState {
  return createMaskedStateFrom(resolveMaskedOptions(options), initialRaw);
}
