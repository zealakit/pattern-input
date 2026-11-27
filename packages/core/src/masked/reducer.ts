import {
  acceptChar,
  type CompiledAlternative,
  extractRaw,
  fitRaw,
  type MaskToken,
} from "../lexers/index.js";
import {
  caret,
  type BaseFieldEvent,
  MAX_INPUT_CHARS,
  moveCaret,
  selectedRange,
} from "../shared/index.js";
import { formatMasked } from "./format.js";
import { pickAlternative, type ResolvedMaskedOptions } from "./options.js";
import { buildMaskedState, type MaskedState, maskedStatusOf } from "./state.js";

export type MaskedEvent = BaseFieldEvent<string>;

function clampOffset(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

function slotAt(
  alternative: CompiledAlternative,
  ordinal: number,
): MaskToken | null {
  let slots = 0;
  for (const token of alternative.tokens) {
    if (token.kind !== "slot") {
      continue;
    }
    if (slots === ordinal) {
      return token;
    }
    slots += 1;
  }
  return null;
}

/** Literal run immediately before the slot at `ordinal` (typing it advances). */
function literalsBefore(
  alternative: CompiledAlternative,
  ordinal: number,
): string {
  let slots = 0;
  let run = "";
  for (const token of alternative.tokens) {
    if (token.kind === "literal") {
      run += token.char;
      continue;
    }
    if (slots === ordinal) {
      return run;
    }
    slots += 1;
    run = "";
  }
  return run;
}

function rebuild(
  state: MaskedState,
  raw: string,
  caretOffset: number,
  resolved: ResolvedMaskedOptions,
  overrides: { invalidReason?: MaskedState["invalidReason"] } = {},
): MaskedState {
  const alternativeIndex = pickAlternative(resolved, raw);
  return buildMaskedState(
    raw,
    alternativeIndex,
    resolved,
    caret(clampOffset(caretOffset, raw.length), "after"),
    state,
    { invalidReason: overrides.invalidReason ?? null },
  );
}

function currentAlternative(
  state: MaskedState,
  resolved: ResolvedMaskedOptions,
): CompiledAlternative {
  return (
    resolved.mask.alternatives[state.alternativeIndex] ??
    resolved.mask.alternatives[0]
  );
}

function applyInsert(
  state: MaskedState,
  text: string,
  resolved: ResolvedMaskedOptions,
): MaskedState {
  const alternative = currentAlternative(state, resolved);
  const range = selectedRange(state.selection);
  const start = clampOffset(range.start, state.rawValue.length);
  const end = clampOffset(range.end, state.rawValue.length);
  let raw = `${state.rawValue.slice(0, start)}${state.rawValue.slice(end)}`;
  let cursor = start;

  for (const char of text) {
    const literalRun = literalsBefore(alternative, cursor);
    if (literalRun !== "" && literalRun.includes(char)) {
      continue;
    }
    const slot = slotAt(alternative, cursor);
    if (!slot) {
      // The current alternative is full. A longer alternative may still take
      // the character, which is how "first match wins" switches as raw grows.
      if (cursor === raw.length) {
        const candidate = `${raw}${char}`;
        const index = pickAlternative(resolved, candidate);
        const fit = fitRaw(resolved.mask.alternatives[index], candidate);
        if (fit.rejectedAt === undefined && fit.accepted === candidate) {
          raw = candidate;
          cursor += 1;
          continue;
        }
      }
      return state;
    }
    const accepted = acceptChar(slot, char);
    if (accepted === null) {
      return state;
    }
    raw = `${raw.slice(0, cursor)}${accepted}${raw.slice(cursor)}`;
    cursor += 1;
  }

  if (raw === state.rawValue) {
    return state;
  }
  return rebuild(state, raw, cursor, resolved, { invalidReason: null });
}

function applyDelete(
  state: MaskedState,
  event: {
    readonly direction: "backward" | "forward";
    readonly unit: "char" | "word" | "line";
  },
  resolved: ResolvedMaskedOptions,
): MaskedState {
  const raw = state.rawValue;
  const range = selectedRange(state.selection);
  const start = clampOffset(range.start, raw.length);
  const end = clampOffset(range.end, raw.length);

  if (start !== end) {
    return rebuild(
      state,
      `${raw.slice(0, start)}${raw.slice(end)}`,
      start,
      resolved,
      { invalidReason: null },
    );
  }

  const offset = clampOffset(state.selection.focus.offset, raw.length);
  let from = offset;
  let to = offset;

  if (event.unit === "char") {
    if (event.direction === "backward") {
      from = Math.max(0, offset - 1);
    } else {
      to = Math.min(raw.length, offset + 1);
    }
  } else if (event.direction === "backward") {
    from = 0;
  } else {
    to = raw.length;
  }

  if (from === to) {
    return state;
  }
  return rebuild(
    state,
    `${raw.slice(0, from)}${raw.slice(to)}`,
    from,
    resolved,
    { invalidReason: null },
  );
}

function applyPaste(
  state: MaskedState,
  text: string,
  resolved: ResolvedMaskedOptions,
): MaskedState {
  const extracted = extractRaw(resolved.mask, text.slice(0, MAX_INPUT_CHARS));
  if (extracted === "") {
    return state;
  }

  const range = selectedRange(state.selection);
  const start = clampOffset(range.start, state.rawValue.length);
  const end = clampOffset(range.end, state.rawValue.length);
  let raw = `${state.rawValue.slice(0, start)}${state.rawValue.slice(end)}`;
  let cursor = start;
  let accepted = 0;

  for (const char of extracted) {
    const candidate = `${raw.slice(0, cursor)}${char}${raw.slice(cursor)}`;
    const fit = fitRaw(
      resolved.mask.alternatives[pickAlternative(resolved, candidate)],
      candidate,
    );
    if (
      fit.rejectedAt !== undefined ||
      fit.accepted.length !== candidate.length
    ) {
      break;
    }
    raw = fit.accepted;
    cursor += 1;
    accepted += 1;
  }

  if (accepted === 0) {
    return state;
  }
  return rebuild(state, raw, cursor, resolved, { invalidReason: null });
}

function applySetValue(
  state: MaskedState,
  value: string,
  resolved: ResolvedMaskedOptions,
): MaskedState {
  const extracted = extractRaw(resolved.mask, value.slice(0, MAX_INPUT_CHARS));
  const fit = fitRaw(
    resolved.mask.alternatives[pickAlternative(resolved, extracted)],
    extracted,
  );
  const raw = fit.accepted;
  return buildMaskedState(
    raw,
    pickAlternative(resolved, raw),
    resolved,
    caret(raw.length, "before"),
    state,
    { invalidReason: null, committedRaw: raw, composing: null },
  );
}

function applyCommit(
  state: MaskedState,
  resolved: ResolvedMaskedOptions,
  blur: boolean,
): MaskedState {
  const alternative = currentAlternative(state, resolved);
  const raw = state.rawValue;
  const status = maskedStatusOf(raw, alternative);
  const formattedValue = formatMasked(raw, alternative, resolved, {
    trailingLiterals: blur ? false : state.focused,
  }).text;

  let invalidReason: MaskedState["invalidReason"] = null;
  if (resolved.validate) {
    const verdict = resolved.validate(raw, { status, formattedValue });
    if (verdict === false || typeof verdict === "string") {
      invalidReason = "consumer";
    }
  }

  return buildMaskedState(
    raw,
    state.alternativeIndex,
    resolved,
    state.selection,
    state,
    {
      status: invalidReason ? "invalid" : status,
      invalidReason,
      focused: blur ? false : state.focused,
      composing: null,
      committedRaw: raw,
    },
  );
}

function sameSelection(
  left: MaskedState["selection"],
  right: MaskedState["selection"],
): boolean {
  return (
    left.anchor.offset === right.anchor.offset &&
    left.anchor.affinity === right.anchor.affinity &&
    left.focus.offset === right.focus.offset &&
    left.focus.affinity === right.focus.affinity
  );
}

const CHANGES_TEXT = new Set(["insert", "delete", "paste", "setValue"]);

/** Pure masked-field reducer; rejected events return the same object. */
export function maskedReducer(
  state: MaskedState,
  event: MaskedEvent,
  resolved: ResolvedMaskedOptions,
): MaskedState {
  if (state.composing && CHANGES_TEXT.has(event.type)) {
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
        : buildMaskedState(
            state.rawValue,
            state.alternativeIndex,
            resolved,
            state.selection,
            state,
            { composing: { text: "" } },
          );
    case "composeUpdate":
      return state.composing
        ? Object.freeze({ ...state, composing: { text: event.text } })
        : state;
    case "composeEnd": {
      if (!state.composing) {
        return state;
      }
      const cleared = buildMaskedState(
        state.rawValue,
        state.alternativeIndex,
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
        state.rawValue.length,
      );
      return selection === state.selection
        ? state
        : buildMaskedState(
            state.rawValue,
            state.alternativeIndex,
            resolved,
            selection,
            state,
          );
    }
    case "select":
      return sameSelection(event.selection, state.selection)
        ? state
        : buildMaskedState(
            state.rawValue,
            state.alternativeIndex,
            resolved,
            event.selection,
            state,
          );
    case "commit":
      return state.composing ? state : applyCommit(state, resolved, false);
    case "blur": {
      const composed = state.composing
        ? applyInsert(
            buildMaskedState(
              state.rawValue,
              state.alternativeIndex,
              resolved,
              state.selection,
              state,
              { composing: null },
            ),
            state.composing.text,
            resolved,
          )
        : state;
      return applyCommit(composed, resolved, true);
    }
    case "focus":
      return state.focused
        ? state
        : buildMaskedState(
            state.rawValue,
            state.alternativeIndex,
            resolved,
            state.selection,
            state,
            { focused: true, committedRaw: state.rawValue },
          );
    case "reset": {
      const raw = state.committedRaw;
      return buildMaskedState(
        raw,
        pickAlternative(resolved, raw),
        resolved,
        caret(raw.length, "before"),
        state,
        { invalidReason: null, composing: null },
      );
    }
    case "setValue":
      return applySetValue(state, event.value, resolved);
  }
}
