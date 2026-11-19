import type {
  EditableMap,
  FieldStatus,
  KeyInput,
  KeyPlatform,
  StickySelection,
} from "../shared/index.js";
import type { FieldBinding } from "./binding.js";

export type ChangeReason =
  | "input"
  | "paste"
  | "delete"
  | "step"
  | "commit"
  | "reset"
  | "undo"
  | "redo"
  | "programmatic";

export type ValueChange<TValue> = {
  readonly value: TValue;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly reason: ChangeReason;
};

/** What a DOM binding needs to paint the element. */
export type FieldView = {
  readonly text: string;
  readonly map: EditableMap;
  readonly selection: StickySelection;
};

export type FieldControllerOptions<TValue, TOptions> = TOptions & {
  /** Present (even as `null` for number) ⇒ controlled mode. */
  readonly value?: TValue;
  readonly defaultValue?: TValue;
  readonly onValueChange?: (change: ValueChange<TValue>) => void;
  readonly onStatusChange?: (status: FieldStatus) => void;
  /** Log once when switching from controlled to uncontrolled. */
  readonly devWarnings?: boolean;
  /** Injected clock so history merging stays deterministic in tests. */
  readonly now?: () => number;
};

export type FieldController<TState, TEvent, TValue, TOptions> = {
  getState(): TState;
  getView(): FieldView;
  subscribe(listener: () => void): () => void;
  dispatch(event: TEvent): void;
  handleKey(key: KeyInput, platform?: KeyPlatform): boolean;
  setOptions(options: FieldControllerOptions<TValue, TOptions>): void;
  setValue(value: TValue): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
  destroy(): void;
  readonly value: TValue;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly controlled: boolean;
};

export type PatternInputErrorCode = "CONTROLLED_WITHOUT_HANDLER";

export class PatternInputError extends Error {
  readonly code: PatternInputErrorCode;

  constructor(code: PatternInputErrorCode) {
    super(`Pattern input error: ${code}`);
    this.name = "PatternInputError";
    this.code = code;
  }
}

const HISTORY_LIMIT = 100;
const MERGE_WINDOW_MS = 1000;

function isControlled<TValue, TOptions>(
  options: FieldControllerOptions<TValue, TOptions>,
): boolean {
  return "value" in options && options.value !== undefined;
}

function hasHandler<TValue, TOptions>(
  options: FieldControllerOptions<TValue, TOptions>,
): boolean {
  return (
    typeof options.onValueChange === "function" ||
    (options as { readonly readOnly?: boolean }).readOnly === true
  );
}

function reasonFor(event: { readonly type: string }): ChangeReason {
  switch (event.type) {
    case "paste":
      return "paste";
    case "delete":
      return "delete";
    case "step":
      return "step";
    case "commit":
      return "commit";
    case "reset":
      return "reset";
    case "setValue":
      return "programmatic";
    default:
      return "input";
  }
}

/**
 * One DOM-free controller for every field kind: modes, change proposals,
 * bounded history, and a stable `getState()` for `useSyncExternalStore`.
 */
export function createFieldController<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
  TResolved,
>(
  binding: FieldBinding<TState, TEvent, TValue, TOptions, TResolved>,
  initialOptions: FieldControllerOptions<TValue, TOptions>,
): FieldController<TState, TEvent, TValue, TOptions> {
  if (isControlled(initialOptions) && !hasHandler(initialOptions)) {
    throw new PatternInputError("CONTROLLED_WITHOUT_HANDLER");
  }

  let options = initialOptions;
  let resolved = binding.resolve(options);
  let controlled = isControlled(options);
  const initialValue = controlled
    ? (options.value as TValue)
    : options.defaultValue;
  let approved = binding.create(resolved, initialValue);
  let pending: { state: TState; reason: ChangeReason } | null = null;
  let lastEmittedValue = binding.valueOf(approved);
  let lastEmittedStatus = binding.statusOf(approved);
  let destroyed = false;
  let warned = false;
  let mergeAnchor: { offset: number; time: number } | null = null;

  const listeners = new Set<() => void>();
  const past: TState[] = [];
  const future: TState[] = [];

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function emit(reason: ChangeReason): void {
    const value = binding.valueOf(approved);
    const status = binding.statusOf(approved);
    if (
      binding.sameValue(value, lastEmittedValue) &&
      status === lastEmittedStatus
    ) {
      return;
    }
    lastEmittedValue = value;
    lastEmittedStatus = status;
    options.onValueChange?.({
      value,
      formattedValue: binding.formattedValue(approved),
      status,
      reason,
    });
    options.onStatusChange?.(status);
  }

  function emitProposal(state: TState, reason: ChangeReason): void {
    const value = binding.valueOf(state);
    const status = binding.statusOf(state);
    if (
      binding.sameValue(value, lastEmittedValue) &&
      status === lastEmittedStatus
    ) {
      return;
    }
    lastEmittedValue = value;
    lastEmittedStatus = status;
    options.onValueChange?.({
      value,
      formattedValue: binding.formattedValue(state),
      status,
      reason,
    });
    options.onStatusChange?.(status);
  }

  function pushHistory(previous: TState): void {
    past.push(previous);
    if (past.length > HISTORY_LIMIT) {
      past.shift();
    }
    future.length = 0;
  }

  function dispatch(event: TEvent): void {
    if (destroyed) {
      return;
    }
    const reason = reasonFor(event);
    const next = binding.reduce(approved, event, resolved);
    if (next === approved) {
      return;
    }

    const valueChanged =
      !binding.sameValue(binding.valueOf(next), binding.valueOf(approved)) ||
      binding.statusOf(next) !== binding.statusOf(approved);

    // Focus, caret and selection changes are local UI state: adopt them
    // immediately in both modes and never emit a value change (FR-8).
    if (!valueChanged) {
      approved = next;
      notify();
      return;
    }

    const now = options.now?.() ?? Date.now();
    const isInsert = event.type === "insert";
    const offset = binding.selectionOf(approved).focus.offset;
    const merges =
      isInsert &&
      mergeAnchor !== null &&
      now - mergeAnchor.time <= MERGE_WINDOW_MS &&
      mergeAnchor.offset === offset;

    if (!merges) {
      pushHistory(approved);
    }
    mergeAnchor = isInsert
      ? { offset: binding.selectionOf(next).focus.offset, time: now }
      : null;

    if (controlled) {
      pending = { state: next, reason };
      emitProposal(next, reason);
      return;
    }

    approved = next;
    emit(reason);
    notify();
  }

  function setOptions(
    nextOptions: FieldControllerOptions<TValue, TOptions>,
  ): void {
    if (isControlled(nextOptions) && !hasHandler(nextOptions)) {
      throw new PatternInputError("CONTROLLED_WITHOUT_HANDLER");
    }

    const nextControlled = isControlled(nextOptions);
    const nextResolved = binding.resolve(nextOptions);
    const wasControlled = controlled;

    options = nextOptions;
    resolved = nextResolved;

    if (!nextControlled) {
      if (wasControlled && nextOptions.devWarnings && !warned) {
        warned = true;
        const globalConsole = (
          globalThis as {
            console?: { warn?: (message: string) => void };
          }
        ).console;
        globalConsole?.warn?.(
          "[pattern-input] switching to uncontrolled keeps the last approved value",
        );
      }
      controlled = false;
      pending = null;
      return;
    }

    controlled = true;

    if (!wasControlled) {
      const value = nextOptions.value as TValue;
      pending = null;
      approved = binding.create(resolved, value);
      mergeAnchor = null;
      notify();
      return;
    }

    const nextValue = nextOptions.value as TValue;

    if (pending) {
      if (binding.sameValue(nextValue, binding.valueOf(pending.state))) {
        const previousApproved = approved;
        if (pending.reason === "undo") {
          past.pop();
          future.push(previousApproved);
        } else if (pending.reason === "redo") {
          future.pop();
          past.push(previousApproved);
        }
        approved = pending.state;
        pending = null;
        mergeAnchor = null;
        notify();
        return;
      }
      if (binding.sameValue(nextValue, binding.valueOf(approved))) {
        // Rejected proposal: keep the approved state (and its caret).
        pending = null;
        return;
      }
    }

    if (!binding.sameValue(nextValue, binding.valueOf(approved))) {
      approved = binding.create(resolved, nextValue);
      pending = null;
      mergeAnchor = null;
      notify();
    }
  }

  function setValue(value: TValue): void {
    const next = binding.create(resolved, value);
    if (controlled) {
      pending = { state: next, reason: "programmatic" };
      emitProposal(next, "programmatic");
      return;
    }
    pushHistory(approved);
    mergeAnchor = null;
    approved = next;
    emit("programmatic");
    notify();
  }

  function clear(): void {
    setValue(binding.emptyValue);
  }

  function focus(): void {
    dispatch({ type: "focus" } as unknown as TEvent);
  }

  function undo(): boolean {
    if (past.length === 0) {
      return false;
    }
    const target = past[past.length - 1];
    if (controlled) {
      pending = { state: target, reason: "undo" };
      emitProposal(target, "undo");
      return true;
    }
    past.pop();
    future.push(approved);
    mergeAnchor = null;
    approved = target;
    emit("undo");
    notify();
    return true;
  }

  function redo(): boolean {
    if (future.length === 0) {
      return false;
    }
    const target = future[future.length - 1];
    if (controlled) {
      pending = { state: target, reason: "redo" };
      emitProposal(target, "redo");
      return true;
    }
    future.pop();
    past.push(approved);
    mergeAnchor = null;
    approved = target;
    emit("redo");
    notify();
    return true;
  }

  function handleKey(key: KeyInput, platform?: KeyPlatform): boolean {
    const event = binding.keyToEvent(key, approved, resolved, platform);
    if (event === null) {
      return false;
    }
    dispatch(event);
    return true;
  }

  return {
    getState: () => approved,
    getView() {
      const formatted = binding.format(approved, resolved);
      return {
        text: formatted.text,
        map: formatted.map,
        selection: binding.selectionOf(approved),
      };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch,
    handleKey,
    setOptions,
    setValue,
    clear,
    focus,
    undo,
    redo,
    destroy() {
      destroyed = true;
      listeners.clear();
      past.length = 0;
      future.length = 0;
      pending = null;
    },
    get value() {
      return binding.valueOf(approved);
    },
    get formattedValue() {
      return binding.formattedValue(approved);
    },
    get status() {
      return binding.statusOf(approved);
    },
    get controlled() {
      return controlled;
    },
  };
}
