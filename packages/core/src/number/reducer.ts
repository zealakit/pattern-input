import {
  fromNumber,
  padFraction,
  roundDecimal,
  stepDecimal,
  toNumber,
} from "../lexers/index.js";
import {
  caret,
  type BaseFieldEvent,
  MAX_INPUT_CHARS,
  moveCaret,
  selectedRange,
} from "../shared/index.js";
import type { ResolvedNumberOptions } from "./options.js";
import { deriveStatus, parseNumberText } from "./parse.js";
import { buildNumberState, type NumberState, rawValueOf } from "./state.js";

export type NumberEvent =
  | BaseFieldEvent<number | null>
  | {
      readonly type: "step";
      readonly direction: 1 | -1;
      readonly large: boolean;
    };

const CANONICAL = /^-?\d*(?:\.\d*)?$/;
const MINUS = "-";
const UNICODE_MINUS = "\u2212";

function clampOffset(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/** Guard used for typed candidates: canonical shape, precision and range. */
function acceptRawText(
  candidate: string,
  resolved: ResolvedNumberOptions,
): boolean {
  if (!CANONICAL.test(candidate)) {
    return false;
  }
  if (candidate.startsWith(MINUS) && !resolved.allowNegative) {
    return false;
  }
  if (candidate.includes(".")) {
    if (resolved.maximumFractionDigits === 0) {
      return false;
    }
    const frac = candidate.slice(candidate.indexOf(".") + 1);
    if (frac.length > resolved.maximumFractionDigits) {
      return false;
    }
  }
  if (
    candidate !== "" &&
    candidate !== MINUS &&
    candidate !== "." &&
    rawValueOf(candidate) === null
  ) {
    return false;
  }
  return true;
}

function normalizeTyped(text: string, resolved: ResolvedNumberOptions): string {
  const separator = resolved.decimalSeparator;
  if (separator !== "" && text === separator) {
    return ".";
  }
  if (separator.length === 1) {
    return text.split(separator).join(".");
  }
  return text;
}

function toggleSign(
  state: NumberState,
  resolved: ResolvedNumberOptions,
): NumberState {
  if (!resolved.allowNegative) {
    return state;
  }
  const rawText = state.rawText;
  const offset = clampOffset(
    selectedRange(state.selection).end,
    rawText.length,
  );
  const hasSign = rawText.startsWith(MINUS);
  const next = hasSign ? rawText.slice(1) : `${MINUS}${rawText}`;
  if (!acceptRawText(next, resolved)) {
    return state;
  }
  const nextOffset = clampOffset(
    hasSign ? offset - 1 : offset + 1,
    next.length,
  );
  return buildNumberState(next, resolved, caret(nextOffset, "after"), state, {
    invalidReason: null,
  });
}

function applyInsert(
  state: NumberState,
  text: string,
  resolved: ResolvedNumberOptions,
): NumberState {
  const normalized = normalizeTyped(text, resolved);
  if (normalized === "") {
    return state;
  }
  if (normalized === MINUS || normalized === UNICODE_MINUS) {
    return toggleSign(state, resolved);
  }

  const range = selectedRange(state.selection);
  const start = clampOffset(range.start, state.rawText.length);
  const end = clampOffset(range.end, state.rawText.length);
  const candidate = `${state.rawText.slice(0, start)}${normalized}${state.rawText.slice(end)}`;
  if (!acceptRawText(candidate, resolved)) {
    return state;
  }
  return buildNumberState(
    candidate,
    resolved,
    caret(start + normalized.length, "after"),
    state,
    { invalidReason: null },
  );
}

function wordStart(rawText: string, offset: number): number {
  const dot = rawText.indexOf(".");
  if (dot !== -1 && offset > dot) {
    return dot + 1;
  }
  return 0;
}

function wordEnd(rawText: string, offset: number): number {
  const dot = rawText.indexOf(".");
  if (dot !== -1 && offset < dot) {
    return dot;
  }
  return rawText.length;
}

function applyDelete(
  state: NumberState,
  event: {
    readonly direction: "backward" | "forward";
    readonly unit: "char" | "word" | "line";
  },
  resolved: ResolvedNumberOptions,
): NumberState {
  const rawText = state.rawText;
  const range = selectedRange(state.selection);
  const start = clampOffset(range.start, rawText.length);
  const end = clampOffset(range.end, rawText.length);

  if (start !== end) {
    const next = `${rawText.slice(0, start)}${rawText.slice(end)}`;
    return buildNumberState(next, resolved, caret(start, "after"), state, {
      invalidReason: null,
    });
  }

  const offset = clampOffset(state.selection.focus.offset, rawText.length);
  let from = offset;
  let to = offset;

  if (event.unit === "char") {
    if (event.direction === "backward") {
      from = Math.max(0, offset - 1);
    } else {
      to = Math.min(rawText.length, offset + 1);
    }
  } else if (event.unit === "word") {
    if (event.direction === "backward") {
      from = wordStart(rawText, offset);
    } else {
      to = wordEnd(rawText, offset);
    }
  } else if (event.direction === "backward") {
    from = 0;
  } else {
    to = rawText.length;
  }

  if (from === to) {
    return state;
  }
  const next = `${rawText.slice(0, from)}${rawText.slice(to)}`;
  return buildNumberState(next, resolved, caret(from, "after"), state, {
    invalidReason: null,
  });
}

const PASTE_CHAR = /[0-9.,+\-−\s]/;

function keepPasteChars(text: string, resolved: ResolvedNumberOptions): string {
  const kept = [...text].filter(
    (char) =>
      PASTE_CHAR.test(char) ||
      char === resolved.decimalSeparator ||
      char === resolved.groupSeparator,
  );
  return kept.join("").trim();
}

function applyPaste(
  state: NumberState,
  text: string,
  resolved: ResolvedNumberOptions,
): NumberState {
  // No valid number is this long; refuse instead of scanning hostile input.
  if (text.length > MAX_INPUT_CHARS) {
    return state;
  }
  const cleaned = keepPasteChars(text, resolved);
  const attempts = [text, cleaned].filter(
    (value, index, all) => value !== "" && all.indexOf(value) === index,
  );

  let parsed: ReturnType<typeof parseNumberText> | null = null;
  for (const candidate of attempts) {
    const result = parseNumberText(candidate, resolved);
    if (result.ok) {
      parsed = result;
      break;
    }
  }

  const decimalSeen = attempts.some((value) =>
    value.includes(resolved.decimalSeparator),
  );
  const separatorCount = (value: string): number =>
    [...value].filter(
      (char) =>
        char === resolved.decimalSeparator ||
        (resolved.groupSeparator !== "" && char === resolved.groupSeparator),
    ).length;

  if (
    !parsed &&
    !decimalSeen &&
    resolved.groupSeparator !== "" &&
    attempts.every((value) => separatorCount(value) === 1)
  ) {
    // One documented heuristic: retry with swapped separators (a single
    // opposite separator, e.g. en-US grouping pasted into a de-DE field).
    const swapped = {
      ...resolved,
      decimalSeparator: resolved.groupSeparator,
      groupSeparator: resolved.decimalSeparator,
    };
    for (const candidate of attempts) {
      const result = parseNumberText(candidate, swapped);
      if (result.ok) {
        parsed = result;
        break;
      }
    }
  }

  if (!parsed?.ok) {
    return state;
  }

  const range = selectedRange(state.selection);
  const start = clampOffset(range.start, state.rawText.length);
  const end = clampOffset(range.end, state.rawText.length);
  const candidate = `${state.rawText.slice(0, start)}${parsed.rawText}${state.rawText.slice(end)}`;
  if (!acceptRawText(candidate, resolved)) {
    return state;
  }
  return buildNumberState(
    candidate,
    resolved,
    caret(start + parsed.rawText.length, "after"),
    state,
    { invalidReason: null },
  );
}

function applyStep(
  state: NumberState,
  event: { readonly direction: 1 | -1; readonly large: boolean },
  resolved: ResolvedNumberOptions,
): NumberState {
  const stepText = event.large ? resolved.largeStep : resolved.step;
  const base = state.rawValue ?? resolved.min ?? 0;
  const stepped = stepDecimal(fromNumber(base), stepText, event.direction);
  if (stepped === "") {
    return state;
  }
  let value = toNumber(stepped);
  if (value === null) {
    return state;
  }
  if (resolved.min !== null) {
    value = Math.max(resolved.min, value);
  }
  if (resolved.max !== null) {
    value = Math.min(resolved.max, value);
  }
  const rawText = fromNumber(value);
  return buildNumberState(
    rawText,
    resolved,
    caret(rawText.length, "before"),
    state,
    {
      invalidReason: null,
    },
  );
}

function normalizeForCommit(
  rawText: string,
  resolved: ResolvedNumberOptions,
): string {
  if (
    rawText === "" ||
    rawText === MINUS ||
    rawText === "." ||
    rawText === "-."
  ) {
    return "";
  }
  const withoutDot = rawText.endsWith(".") ? rawText.slice(0, -1) : rawText;
  if (withoutDot === "") {
    return "";
  }
  const rounded = roundDecimal(
    withoutDot,
    resolved.maximumFractionDigits,
    resolved.rounding,
  );
  if (rounded === "") {
    return "";
  }
  return padFraction(rounded, resolved.minimumFractionDigits);
}

function applyCommit(
  state: NumberState,
  resolved: ResolvedNumberOptions,
  blur: boolean,
): NumberState {
  let rawText = normalizeForCommit(state.rawText, resolved);
  let invalidReason: NumberState["invalidReason"] = null;

  const value = rawValueOf(rawText);
  if (value !== null) {
    let clamped = value;
    if (resolved.min !== null) {
      clamped = Math.max(resolved.min, clamped);
    }
    if (resolved.max !== null) {
      clamped = Math.min(resolved.max, clamped);
    }
    if (clamped !== value) {
      if (resolved.clampBehavior === "blur") {
        rawText = padFraction(
          fromNumber(clamped),
          resolved.minimumFractionDigits,
        );
      } else {
        invalidReason = "range";
      }
    }
  }

  const finalValue = rawValueOf(rawText);
  if (resolved.validate) {
    const statusBefore =
      invalidReason === null ? deriveStatus(rawText) : "invalid";
    const verdict = resolved.validate(finalValue, { status: statusBefore });
    if (verdict === false || typeof verdict === "string") {
      invalidReason = "consumer";
    }
  }

  const status = invalidReason === null ? deriveStatus(rawText) : "invalid";
  return buildNumberState(
    rawText,
    resolved,
    caret(Math.min(state.selection.focus.offset, rawText.length), "before"),
    state,
    {
      status,
      invalidReason,
      focused: blur ? false : state.focused,
      composing: null,
      committedRawText: rawText,
    },
  );
}

function applySetValue(
  state: NumberState,
  value: number | null,
  resolved: ResolvedNumberOptions,
): NumberState {
  let rawText = "";
  if (value !== null && !Number.isNaN(value)) {
    const rounded = roundDecimal(
      fromNumber(value),
      resolved.maximumFractionDigits,
      resolved.rounding,
    );
    rawText = padFraction(rounded, resolved.minimumFractionDigits);
  }
  return buildNumberState(
    rawText,
    resolved,
    caret(rawText.length, "before"),
    state,
    {
      invalidReason: null,
      committedRawText: rawText,
    },
  );
}

function sameSelection(
  left: NumberState["selection"],
  right: NumberState["selection"],
): boolean {
  return (
    left.anchor.offset === right.anchor.offset &&
    left.anchor.affinity === right.anchor.affinity &&
    left.focus.offset === right.focus.offset &&
    left.focus.affinity === right.focus.affinity
  );
}

const CHANGES_TEXT = new Set(["insert", "delete", "paste", "setValue", "step"]);

/** Pure number-field reducer; a rejected event returns the same object. */
export function numberReducer(
  state: NumberState,
  event: NumberEvent,
  resolved: ResolvedNumberOptions,
): NumberState {
  if (
    state.composing &&
    CHANGES_TEXT.has(event.type) &&
    event.type !== "step"
  ) {
    return state;
  }

  switch (event.type) {
    case "insert":
      return applyInsert(state, event.text, resolved);
    case "delete":
      return applyDelete(state, event, resolved);
    case "paste":
      return applyPaste(state, event.text, resolved);
    case "composeStart":
      return state.composing
        ? state
        : buildNumberState(state.rawText, resolved, state.selection, state, {
            composing: { text: "" },
          });
    case "composeUpdate":
      return state.composing
        ? Object.freeze({ ...state, composing: { text: event.text } })
        : state;
    case "composeEnd": {
      if (!state.composing) {
        return state;
      }
      const cleared = buildNumberState(
        state.rawText,
        resolved,
        state.selection,
        state,
        { composing: null },
      );
      return event.text === ""
        ? cleared
        : applyInsert(cleared, event.text, resolved);
    }
    case "move": {
      const selection = moveCaret(
        state.selection,
        event.to,
        event.extend,
        state.rawText.length,
      );
      return selection === state.selection
        ? state
        : buildNumberState(state.rawText, resolved, selection, state);
    }
    case "select":
      return sameSelection(event.selection, state.selection)
        ? state
        : buildNumberState(state.rawText, resolved, event.selection, state);
    case "step":
      return applyStep(state, event, resolved);
    case "commit":
      return state.composing ? state : applyCommit(state, resolved, false);
    case "blur": {
      const composed = state.composing
        ? applyInsert(
            buildNumberState(state.rawText, resolved, state.selection, state, {
              composing: null,
            }),
            state.composing.text,
            resolved,
          )
        : state;
      return applyCommit(composed, resolved, true);
    }
    case "focus":
      return state.focused
        ? state
        : buildNumberState(state.rawText, resolved, state.selection, state, {
            focused: true,
            committedRawText: state.rawText,
          });
    case "reset":
      return buildNumberState(
        state.committedRawText,
        resolved,
        caret(state.committedRawText.length, "before"),
        state,
        { invalidReason: null, composing: null },
      );
    case "setValue":
      return applySetValue(state, event.value, resolved);
  }
}
