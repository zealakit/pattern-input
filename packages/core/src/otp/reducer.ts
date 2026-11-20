import { type BaseFieldEvent, MAX_INPUT_CHARS } from "../shared/index.js";
import type { ResolvedOtpOptions } from "./options.js";
import {
  buildOtpState,
  distributeSlots,
  emptySlots,
  firstEmptyIndex,
  type OtpState,
  otpStatusOf,
} from "./state.js";

export type OtpEvent =
  | BaseFieldEvent<string>
  | { readonly type: "focusSlot"; readonly index: number };

/** Normalize one typed character, or `null` when the slot type rejects it. */
export function normalizeOtpChar(
  char: string,
  resolved: ResolvedOtpOptions,
): string | null {
  const valid =
    resolved.type === "numeric"
      ? /^[0-9]$/.test(char)
      : /^[A-Za-z0-9]$/.test(char);
  if (!valid) {
    return null;
  }
  if (resolved.transform === "upper") {
    return char.toUpperCase();
  }
  if (resolved.transform === "lower") {
    return char.toLowerCase();
  }
  return char;
}

function sameSlots(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((v, i) => v === right[i]);
}

function writeSlot(
  state: OtpState,
  index: number,
  char: string,
  resolved: ResolvedOtpOptions,
): OtpState {
  const slots = [...state.slots];
  if (slots[index] === char) {
    const activeIndex = Math.min(index + 1, resolved.length - 1);
    return activeIndex === state.activeIndex
      ? state
      : buildOtpState(state, state.slots, activeIndex, resolved);
  }
  slots[index] = char;
  const activeIndex = Math.min(index + 1, resolved.length - 1);
  return buildOtpState(state, Object.freeze(slots), activeIndex, resolved);
}

function applyPaste(
  state: OtpState,
  text: string,
  startIndex: number,
  resolved: ResolvedOtpOptions,
): OtpState {
  const chars = [...text.slice(0, MAX_INPUT_CHARS)]
    .map((char) => normalizeOtpChar(char, resolved))
    .filter((char): char is string => char !== null);
  if (chars.length === 0) {
    return state;
  }

  const start = chars.length >= resolved.length ? 0 : startIndex;
  const distributed = distributeSlots(
    state.slots,
    chars.join(""),
    start,
    resolved.length,
  );
  if (distributed.lastFilled === -1) {
    return state;
  }
  if (
    sameSlots(distributed.slots, state.slots) &&
    distributed.lastFilled === state.activeIndex
  ) {
    return state;
  }
  return buildOtpState(
    state,
    distributed.slots,
    distributed.lastFilled,
    resolved,
  );
}

function applyCommit(
  state: OtpState,
  resolved: ResolvedOtpOptions,
  blur: boolean,
): OtpState {
  const status = otpStatusOf(state.slots);
  let invalidReason: OtpState["invalidReason"] = null;

  if (resolved.validate) {
    const verdict = resolved.validate(state.rawValue, { status });
    if (verdict === false || typeof verdict === "string") {
      invalidReason = "consumer";
    }
  }

  return buildOtpState(state, state.slots, state.activeIndex, resolved, {
    status: invalidReason ? "invalid" : status,
    invalidReason,
    composing: null,
    focused: blur ? false : state.focused,
  });
}

/** Pure OTP reducer; focus-only changes return the same reference. */
export function otpReducer(
  state: OtpState,
  event: OtpEvent,
  resolved: ResolvedOtpOptions,
): OtpState {
  if (
    state.composing &&
    (event.type === "insert" ||
      event.type === "delete" ||
      event.type === "paste" ||
      event.type === "setValue")
  ) {
    return state;
  }

  switch (event.type) {
    case "insert": {
      if ([...event.text.slice(0, MAX_INPUT_CHARS)].length > 1) {
        return applyPaste(state, event.text, state.activeIndex, resolved);
      }
      const char = normalizeOtpChar(event.text, resolved);
      if (char === null) {
        return state;
      }
      return writeSlot(state, state.activeIndex, char, resolved);
    }
    case "paste":
      return applyPaste(state, event.text, state.activeIndex, resolved);
    case "delete": {
      if (event.unit === "line") {
        return buildOtpState(state, emptySlots(resolved.length), 0, resolved);
      }
      if (event.direction === "forward") {
        if (state.slots[state.activeIndex] === "") {
          return state;
        }
        const slots = [...state.slots];
        slots[state.activeIndex] = "";
        return buildOtpState(
          state,
          Object.freeze(slots),
          state.activeIndex,
          resolved,
        );
      }
      if (state.slots[state.activeIndex] !== "") {
        const slots = [...state.slots];
        slots[state.activeIndex] = "";
        return buildOtpState(
          state,
          Object.freeze(slots),
          state.activeIndex,
          resolved,
        );
      }
      if (state.activeIndex === 0) {
        return state;
      }
      const previous = state.activeIndex - 1;
      const slots = [...state.slots];
      slots[previous] = "";
      return buildOtpState(state, Object.freeze(slots), previous, resolved);
    }
    case "move": {
      const last = resolved.length - 1;
      let target = state.activeIndex;
      if (event.to === "prev") {
        target = Math.max(0, state.activeIndex - 1);
      } else if (event.to === "next") {
        target = Math.min(last, state.activeIndex + 1);
      } else if (event.to === "start") {
        target = 0;
      } else {
        target = last;
      }
      return target === state.activeIndex
        ? state
        : buildOtpState(state, state.slots, target, resolved);
    }
    case "focusSlot": {
      const firstEmpty = firstEmptyIndex(state.slots);
      const limit = firstEmpty === -1 ? resolved.length - 1 : firstEmpty;
      const target = Math.min(Math.max(event.index, 0), limit);
      return target === state.activeIndex
        ? state
        : buildOtpState(state, state.slots, target, resolved);
    }
    case "select":
      // OTP selection is synthetic (activeIndex); nothing to store.
      return state;
    case "commit":
      return state.composing ? state : applyCommit(state, resolved, false);
    case "blur": {
      const composed = state.composing
        ? applyPaste(
            state,
            state.composing.text,
            state.composing.index,
            resolved,
          )
        : state;
      return applyCommit(composed, resolved, true);
    }
    case "focus":
      return state.focused
        ? state
        : buildOtpState(state, state.slots, state.activeIndex, resolved, {
            focused: true,
          });
    case "reset":
      return buildOtpState(state, emptySlots(resolved.length), 0, resolved, {
        composing: null,
      });
    case "setValue": {
      const distributed = distributeSlots(
        emptySlots(resolved.length),
        [...event.value.slice(0, MAX_INPUT_CHARS)]
          .map((char) => normalizeOtpChar(char, resolved))
          .filter((char): char is string => char !== null)
          .join(""),
        0,
        resolved.length,
      );
      const nextEmpty = firstEmptyIndex(distributed.slots);
      const activeIndex = nextEmpty === -1 ? resolved.length - 1 : nextEmpty;
      return buildOtpState(state, distributed.slots, activeIndex, resolved, {
        composing: null,
      });
    }
    case "composeStart":
      return state.composing
        ? state
        : buildOtpState(state, state.slots, state.activeIndex, resolved, {
            composing: { text: "", index: state.activeIndex },
          });
    case "composeUpdate":
      return state.composing
        ? Object.freeze({
            ...state,
            composing: { text: event.text, index: state.composing.index },
          })
        : state;
    case "composeEnd": {
      if (!state.composing) {
        return state;
      }
      const { index } = state.composing;
      const cleared = buildOtpState(
        state,
        state.slots,
        state.activeIndex,
        resolved,
        { composing: null },
      );
      if (event.text === "") {
        return cleared;
      }
      if ([...event.text.slice(0, MAX_INPUT_CHARS)].length > 1) {
        return applyPaste(cleared, event.text, index, resolved);
      }
      const char = normalizeOtpChar(event.text, resolved);
      return char === null
        ? cleared
        : writeSlot(cleared, index, char, resolved);
    }
  }
}
