import assert from "node:assert/strict";
import type {
  EditableMap,
  FieldStatus,
  KeyInput,
  StickySelection,
} from "../../dist/shared/index.js";
import { anchorToIndex } from "../../dist/shared/index.js";
import { attachInput, attachOtpGroup } from "../../dist/dom/index.js";
import {
  createMaskedController,
  createNumberController,
  createOtpController,
  type FieldController,
  type MaskedEvent,
  type MaskedOptions,
  type MaskedState,
  type NumberEvent,
  type NumberOptions,
  type NumberState,
  type ValueChange,
} from "../../dist/index.js";
import type { Vector } from "./run-vector.js";

/** Structural view of any field controller, so the runner stays field-agnostic. */
type AnyController = {
  getView(): {
    readonly text: string;
    readonly map: EditableMap;
    readonly selection: StickySelection;
  };
  dispatch(event: object): void;
  setOptions(options: object): void;
  setValue(value: unknown): void;
  handleKey(key: KeyInput): boolean;
  readonly value: unknown;
  readonly status: FieldStatus;
};

type Field = {
  readonly controller: AnyController;
  readonly target: HTMLInputElement;
  readonly detach: () => void;
};

function fireBeforeInput(
  target: HTMLElement,
  inputType: string,
  data: string,
): InputEvent {
  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType,
    data,
  });
  target.dispatchEvent(event);
  return event;
}

function firePaste(target: HTMLElement, text: string): void {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    clipboardData: unknown;
  };
  Object.defineProperty(event, "clipboardData", {
    value: { getData: () => text, setData: () => {} },
  });
  target.dispatchEvent(event);
}

function fireKey(target: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
  });
  target.dispatchEvent(event);
  return event;
}

function createField(vector: Vector, options: Record<string, unknown>): Field {
  if (vector.field === "otp") {
    const container = document.createElement("div");
    const length = Number(vector.options.length ?? 6);
    const slots = Array.from({ length }, () => {
      const slot = document.createElement("input");
      container.append(slot);
      return slot;
    });
    document.body.append(container);
    const controller = createOtpController(
      options as unknown as Parameters<typeof createOtpController>[0],
    );
    const detach = attachOtpGroup(container, controller, () => slots);
    return { controller, target: slots[0], detach };
  }

  const input = document.createElement("input");
  document.body.append(input);
  const controller =
    vector.field === "number"
      ? createNumberController(
          options as unknown as Parameters<typeof createNumberController>[0],
        )
      : createMaskedController(
          options as unknown as Parameters<typeof createMaskedController>[0],
        );
  const detach =
    vector.field === "number"
      ? attachInput(
          input,
          controller as FieldController<
            NumberState,
            NumberEvent,
            number | null,
            NumberOptions
          >,
        )
      : attachInput(
          input,
          controller as FieldController<
            MaskedState,
            MaskedEvent,
            string,
            MaskedOptions
          >,
        );
  return { controller, target: input, detach };
}

/** Replay one JSON vector through real DOM events (happy-dom). */
export function runVectorInDom(vector: Vector): void {
  const changes: ValueChange<unknown>[] = [];
  let lastProposal: ValueChange<unknown> | null = null;

  const options = {
    ...vector.options,
    onValueChange: (change: ValueChange<unknown>) => {
      changes.push(change);
      lastProposal = change;
    },
    now: () => 0,
  };

  const field = createField(vector, options);
  const supply = (value: unknown): void => {
    field.controller.setOptions({ ...options, value });
  };

  try {
    for (const step of vector.steps) {
      if ("event" in step) {
        if (
          step.event.type === "paste" &&
          typeof step.event.text === "string"
        ) {
          firePaste(field.target, step.event.text);
        } else {
          field.controller.dispatch(step.event);
        }
      } else if ("typeText" in step) {
        for (const char of step.typeText) {
          fireBeforeInput(field.target, "insertText", char);
        }
      } else if ("key" in step) {
        fireKey(field.target, String(step.key.key ?? ""));
      } else if ("approve" in step) {
        supply(
          (lastProposal as ValueChange<unknown> | null)?.value ??
            field.controller.value,
        );
      } else if ("reject" in step) {
        supply(field.controller.value);
      } else if ("supply" in step) {
        supply(step.supply);
      } else if ("setValue" in step) {
        field.controller.setValue(step.setValue);
      }
    }

    const view = field.controller.getView();
    const expect = vector.expect;

    if ("value" in expect) {
      assert.deepEqual(field.controller.value, expect.value, vector.name);
    }
    if (expect.formattedValue !== undefined) {
      assert.equal(view.text, expect.formattedValue, vector.name);
    }
    if (expect.status !== undefined) {
      assert.equal(field.controller.status, expect.status, vector.name);
    }
    if (expect.caret !== undefined) {
      const focus = view.selection.focus;
      const caret =
        vector.field === "otp" ? focus.offset : anchorToIndex(view.map, focus);
      assert.equal(caret, expect.caret, vector.name);
    }
    if (expect.changes !== undefined) {
      assert.equal(changes.length, expect.changes, vector.name);
    }
  } finally {
    field.detach();
  }
}
