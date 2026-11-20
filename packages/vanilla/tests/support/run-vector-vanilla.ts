import assert from "node:assert/strict";
import type { Vector } from "./vector-types.ts";
import {
  createMaskedInput,
  createNumberInput,
  createOtpInput,
} from "../../dist/index.js";

type AnyInstance = {
  readonly value: unknown;
  readonly formattedValue: string;
  readonly status: string;
  setValue(value: unknown): void;
  setOptions(options: object): void;
};

type Field = {
  readonly instance: AnyInstance;
  readonly target: HTMLInputElement;
  readonly slots: readonly HTMLInputElement[];
  readonly element: HTMLElement;
};

function fireBeforeInput(
  target: HTMLElement,
  inputType: string,
  data: string,
): void {
  target.dispatchEvent(
    new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType,
      data,
    }),
  );
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

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }),
  );
}

function createField(vector: Vector, options: Record<string, unknown>): Field {
  if (vector.field === "otp") {
    const group = document.createElement("div");
    const length = Number(vector.options.length ?? 6);
    const slots = Array.from({ length }, () => {
      const slot = document.createElement("input");
      group.append(slot);
      return slot;
    });
    document.body.append(group);
    const instance = createOtpInput(group, {
      ...options,
      slots: () => slots,
    } as never);
    return {
      instance: instance as never,
      target: slots[0],
      slots,
      element: group,
    };
  }

  const element = document.createElement("input");
  document.body.append(element);
  const instance =
    vector.field === "number"
      ? createNumberInput(element, options as never)
      : createMaskedInput(element, options as never);
  return {
    instance: instance as never,
    target: element,
    slots: [],
    element,
  };
}

const DELETE_TYPES: Record<string, string> = {
  "backward:char": "deleteContentBackward",
  "forward:char": "deleteContentForward",
  "backward:word": "deleteWordBackward",
  "forward:word": "deleteWordForward",
  "backward:line": "deleteContentBackward",
  "forward:line": "deleteContentForward",
};

/** Replay one JSON vector through the vanilla instances. */
export function runVectorWithInstances(vector: Vector): void {
  const changes: { value?: unknown; reason?: string }[] = [];
  let lastProposal: { value?: unknown } | null = null;

  const options = {
    ...vector.options,
    onValueChange: (change: { value?: unknown }) => {
      changes.push(change);
      lastProposal = change;
    },
    now: () => 0,
  };

  const field = createField(vector, options);
  const supply = (value: unknown): void => {
    (field.instance as AnyInstance).setOptions({ ...options, value });
  };

  for (const step of vector.steps) {
    if ("event" in step) {
      const event = step.event as Record<string, unknown>;
      if (event.type === "paste" && typeof event.text === "string") {
        firePaste(field.target, event.text);
      } else if (event.type === "focus") {
        (field.target ?? field.element).focus();
      } else if (event.type === "focusSlot") {
        field.slots[Number(event.index ?? 0)]?.focus();
      } else if (event.type === "delete") {
        const direction = String(event.direction ?? "backward");
        const unit = String(event.unit ?? "char");
        fireBeforeInput(
          field.target,
          DELETE_TYPES[`${direction}:${unit}`] ?? "deleteContentBackward",
          "",
        );
      } else if (event.type === "step") {
        const up = Number(event.direction ?? 1) === 1;
        const large = Boolean(event.large);
        fireKey(
          field.target,
          large ? (up ? "PageUp" : "PageDown") : up ? "ArrowUp" : "ArrowDown",
        );
      } else if (event.type === "commit") {
        fireKey(field.target, "Enter");
      } else if (event.type === "reset") {
        fireKey(field.target, "Escape");
      } else if (event.type === "insert" && typeof event.text === "string") {
        fireBeforeInput(field.target, "insertText", event.text);
      }
    } else if ("typeText" in step) {
      for (const char of step.typeText) {
        fireBeforeInput(field.target, "insertText", char);
      }
    } else if ("key" in step) {
      fireKey(field.target, String(step.key.key ?? ""));
    } else if ("approve" in step) {
      supply(
        (lastProposal as { value?: unknown } | null)?.value ??
          field.instance.value,
      );
    } else if ("reject" in step) {
      supply(field.instance.value);
    } else if ("supply" in step) {
      supply(step.supply);
    } else if ("setValue" in step) {
      field.instance.setValue(step.setValue);
    }
  }

  const expect = vector.expect;
  if ("value" in expect) {
    assert.deepEqual(field.instance.value, expect.value, vector.name);
  }
  if (expect.formattedValue !== undefined) {
    assert.equal(
      field.instance.formattedValue,
      expect.formattedValue,
      vector.name,
    );
  }
  if (expect.status !== undefined) {
    assert.equal(field.instance.status, expect.status, vector.name);
  }
  if (expect.caret !== undefined) {
    const caret =
      vector.field === "otp"
        ? field.slots.findIndex((slot) => slot.tabIndex === 0)
        : (field.target.selectionStart ?? 0);
    assert.equal(caret, expect.caret, vector.name);
  }
  if (expect.changes !== undefined) {
    assert.equal(changes.length, expect.changes, vector.name);
  }
}
