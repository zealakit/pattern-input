import assert from "node:assert/strict";
import {
  anchorToIndex,
  type FieldStatus,
  type KeyInput,
} from "../../dist/shared/index.js";
import type { FieldBinding } from "../../dist/controller/binding.js";
import {
  maskedBinding,
  numberBinding,
  otpBinding,
} from "../../dist/controller/binding.js";
import {
  createFieldController,
  type FieldControllerOptions,
  type ValueChange,
} from "../../dist/index.js";

export type VectorStep =
  | { readonly event: Record<string, unknown> }
  | { readonly typeText: string }
  | { readonly key: Record<string, unknown> }
  | { readonly approve: true }
  | { readonly reject: true }
  | { readonly supply: unknown }
  | { readonly setValue: unknown };

export type Vector = {
  readonly name: string;
  readonly field: "number" | "masked" | "otp";
  readonly options: Record<string, unknown>;
  readonly steps: readonly VectorStep[];
  readonly expect: {
    readonly value?: unknown;
    readonly formattedValue?: string;
    readonly status?: FieldStatus;
    readonly caret?: number;
    readonly changes?: number;
  };
};

const BASE_KEY: KeyInput = {
  key: "ArrowLeft",
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  isComposing: false,
};

function runWith<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
  TResolved,
>(
  binding: FieldBinding<TState, TEvent, TValue, TOptions, TResolved>,
  vector: Vector,
): void {
  const changes: ValueChange<TValue>[] = [];
  let lastProposal: ValueChange<TValue> | null = null;

  const base = vector.options as unknown as TOptions;
  const options = {
    ...vector.options,
    onValueChange: (change: ValueChange<TValue>) => {
      changes.push(change);
      lastProposal = change;
    },
    now: () => 0,
  } as unknown as FieldControllerOptions<TValue, TOptions>;

  const controller = createFieldController(binding, options);
  const supply = (value: unknown): void => {
    controller.setOptions({
      ...options,
      value,
    } as FieldControllerOptions<TValue, TOptions>);
  };

  for (const step of vector.steps) {
    if ("event" in step) {
      controller.dispatch(step.event as unknown as TEvent);
    } else if ("typeText" in step) {
      for (const char of step.typeText) {
        controller.dispatch({
          type: "insert",
          text: char,
        } as unknown as TEvent);
      }
    } else if ("key" in step) {
      controller.handleKey({ ...BASE_KEY, ...step.key } as KeyInput);
    } else if ("approve" in step) {
      supply(
        (lastProposal as ValueChange<TValue> | null)?.value ?? controller.value,
      );
    } else if ("reject" in step) {
      supply(controller.value);
    } else if ("supply" in step) {
      supply(step.supply);
    } else if ("setValue" in step) {
      controller.setValue(step.setValue as TValue);
    }
  }

  const state = controller.getState();
  const expect = vector.expect;

  if ("value" in expect) {
    assert.deepEqual(binding.valueOf(state), expect.value, vector.name);
  }
  if (expect.formattedValue !== undefined) {
    assert.equal(
      binding.formattedValue(state),
      expect.formattedValue,
      vector.name,
    );
  }
  if (expect.status !== undefined) {
    assert.equal(binding.statusOf(state), expect.status, vector.name);
  }
  if (expect.caret !== undefined) {
    const resolved = binding.resolve(base);
    const focus = binding.selectionOf(state).focus;
    const caret =
      vector.field === "otp"
        ? focus.offset
        : anchorToIndex(binding.format(state, resolved).map, focus);
    assert.equal(caret, expect.caret, vector.name);
  }
  if (expect.changes !== undefined) {
    assert.equal(changes.length, expect.changes, vector.name);
  }

  controller.destroy();
}

/** Replay one JSON vector against the core controller. */
export function runVector(vector: Vector): void {
  switch (vector.field) {
    case "number":
      runWith(numberBinding, vector);
      break;
    case "masked":
      runWith(maskedBinding, vector);
      break;
    case "otp":
      runWith(otpBinding, vector);
      break;
    default:
      throw new Error(`Unknown field: ${String(vector.field)}`);
  }
}
