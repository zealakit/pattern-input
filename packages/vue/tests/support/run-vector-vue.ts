import assert from "node:assert/strict";
import { effectScope, shallowRef, type EffectScope } from "vue";
import type { FieldControllerOptions } from "@zealakit/pattern-input-core";
import {
  useMaskedInput,
  useNumberInput,
  useOtpInput,
  type MaskedOptions,
  type NumberOptions,
  type OtpOptions,
} from "../../dist/index.js";
import type { Vector } from "./vector-types.ts";

type AnyField = {
  value(): unknown;
  formattedValue(): string;
  status(): string;
  setValue(value: unknown): void;
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

const DELETE_TYPES: Record<string, string> = {
  "backward:char": "deleteContentBackward",
  "forward:char": "deleteContentForward",
  "backward:word": "deleteWordBackward",
  "forward:word": "deleteWordForward",
  "backward:line": "deleteContentBackward",
  "forward:line": "deleteContentForward",
};

/** Replay one JSON vector through the Vue composables. */
export function runVectorWithVue(vector: Vector): void {
  const changes: { value?: unknown }[] = [];
  let lastProposal: { value?: unknown } | null = null;

  const options = shallowRef<Record<string, unknown>>({
    ...vector.options,
    onValueChange: (change: { value?: unknown }) => {
      changes.push(change);
      lastProposal = change;
    },
    now: () => 0,
  });

  const scope: EffectScope = effectScope();
  let field!: AnyField;
  scope.run(() => {
    if (vector.field === "otp") {
      field = useOtpInput(
        () =>
          options.value as unknown as FieldControllerOptions<
            string,
            OtpOptions
          >,
      ) as unknown as AnyField;
    } else if (vector.field === "number") {
      field = useNumberInput(
        () =>
          options.value as unknown as FieldControllerOptions<
            number | null,
            NumberOptions
          >,
      ) as unknown as AnyField;
    } else {
      field = useMaskedInput(
        () =>
          options.value as unknown as FieldControllerOptions<
            string,
            MaskedOptions
          >,
      ) as unknown as AnyField;
    }
  });

  const slots: HTMLInputElement[] = [];
  let element: HTMLInputElement | null = null;

  if (vector.field === "otp") {
    const otp = field as unknown as {
      slotRef(index: number): (node: HTMLInputElement | null) => void;
      groupRef(node: HTMLElement | null): void;
    };
    const group = document.createElement("div");
    const length = Number(vector.options.length ?? 6);
    for (let index = 0; index < length; index += 1) {
      const slot = document.createElement("input");
      group.append(slot);
      slots.push(slot);
    }
    document.body.append(group);
    for (let index = 0; index < slots.length; index += 1) {
      otp.slotRef(index)(slots[index]);
    }
    otp.groupRef(group);
  } else {
    element = document.createElement("input");
    document.body.append(element);
    (
      field as unknown as { inputRef(node: HTMLInputElement | null): void }
    ).inputRef(element);
  }

  const target = (): HTMLElement => {
    if (vector.field === "otp") {
      const active = slots.findIndex((slot) => slot.tabIndex === 0);
      return slots[active === -1 ? 0 : active];
    }
    return element as HTMLInputElement;
  };

  const supply = (value: unknown): void => {
    options.value = { ...options.value, value };
  };

  try {
    for (const step of vector.steps) {
      if ("event" in step) {
        const event = step.event as Record<string, unknown>;
        if (event.type === "paste" && typeof event.text === "string") {
          firePaste(target(), event.text);
        } else if (event.type === "focus") {
          target().focus();
        } else if (event.type === "focusSlot") {
          slots[Number(event.index ?? 0)]?.focus();
        } else if (event.type === "delete") {
          const direction = String(event.direction ?? "backward");
          const unit = String(event.unit ?? "char");
          fireBeforeInput(
            target(),
            DELETE_TYPES[`${direction}:${unit}`] ?? "deleteContentBackward",
            "",
          );
        } else if (event.type === "step") {
          const up = Number(event.direction ?? 1) === 1;
          const large = Boolean(event.large);
          fireKey(
            target(),
            large ? (up ? "PageUp" : "PageDown") : up ? "ArrowUp" : "ArrowDown",
          );
        } else if (event.type === "commit") {
          fireKey(target(), "Enter");
        } else if (event.type === "reset") {
          fireKey(target(), "Escape");
        } else if (event.type === "insert" && typeof event.text === "string") {
          fireBeforeInput(target(), "insertText", event.text);
        }
      } else if ("typeText" in step) {
        for (const char of step.typeText) {
          fireBeforeInput(target(), "insertText", char);
        }
      } else if ("key" in step) {
        fireKey(target(), String(step.key.key ?? ""));
      } else if ("approve" in step) {
        supply(
          (lastProposal as { value?: unknown } | null)?.value ?? field.value(),
        );
      } else if ("reject" in step) {
        supply(field.value());
      } else if ("supply" in step) {
        supply(step.supply);
      } else if ("setValue" in step) {
        field.setValue(step.setValue);
      }
    }

    const expect = vector.expect;
    if ("value" in expect) {
      assert.deepEqual(field.value(), expect.value, vector.name);
    }
    if (expect.formattedValue !== undefined) {
      assert.equal(field.formattedValue(), expect.formattedValue, vector.name);
    }
    if (expect.status !== undefined) {
      assert.equal(field.status(), expect.status, vector.name);
    }
    if (expect.caret !== undefined) {
      const caret =
        vector.field === "otp"
          ? slots.findIndex((slot) => slot.tabIndex === 0)
          : ((element as HTMLInputElement).selectionStart ?? 0);
      assert.equal(caret, expect.caret, vector.name);
    }
    if (expect.changes !== undefined) {
      assert.equal(changes.length, expect.changes, vector.name);
    }
  } finally {
    scope.stop();
  }
}
