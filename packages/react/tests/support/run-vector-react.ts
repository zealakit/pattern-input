import assert from "node:assert/strict";
import { act, renderHook } from "@testing-library/react";
import {
  useMaskedInput,
  useNumberInput,
  useOtpInput,
} from "../../dist/index.js";
import type { Vector } from "./vector-types.ts";

type AnyField = {
  readonly value: unknown;
  readonly formattedValue: string;
  readonly status: string;
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

/** Replay one JSON vector through the React hooks. */
export function runVectorWithReact(vector: Vector): void {
  const changes: { value?: unknown }[] = [];
  let lastProposal: { value?: unknown } | null = null;

  const baseOptions = {
    ...vector.options,
    onValueChange: (change: { value?: unknown }) => {
      changes.push(change);
      lastProposal = change;
    },
    now: () => 0,
  };

  const renderField = (props: Record<string, unknown>): AnyField => {
    if (vector.field === "otp") {
      return useOtpInput(props as never) as unknown as AnyField;
    }
    if (vector.field === "number") {
      return useNumberInput(props as never) as unknown as AnyField;
    }
    return useMaskedInput(props as never) as unknown as AnyField;
  };

  const { result, rerender, unmount } = renderHook<
    AnyField,
    Record<string, unknown>
  >(renderField, {
    initialProps: baseOptions as unknown as Record<string, unknown>,
  });

  let element: HTMLInputElement | null = null;
  const slots: HTMLInputElement[] = [];
  const slotRefs: Array<(node: HTMLInputElement | null) => void> = [];

  if (vector.field === "otp") {
    const group = document.createElement("div");
    const length = Number(vector.options.length ?? 6);
    for (let index = 0; index < length; index += 1) {
      const slot = document.createElement("input");
      group.append(slot);
      slots.push(slot);
      const slotProps = (
        result.current as unknown as {
          getSlotProps(index: number): {
            ref?: (node: HTMLInputElement | null) => void;
          };
        }
      ).getSlotProps(index);
      slotRefs.push(slotProps.ref as (node: HTMLInputElement | null) => void);
    }
    document.body.append(group);
    act(() => {
      for (const ref of slotRefs) {
        ref(null);
      }
      for (let index = 0; index < slotRefs.length; index += 1) {
        slotRefs[index](slots[index]);
      }
      const groupProps = (
        result.current as unknown as {
          getGroupProps(): { ref?: (node: HTMLElement | null) => void };
        }
      ).getGroupProps();
      groupProps.ref?.(group);
    });
  } else {
    element = document.createElement("input");
    document.body.append(element);
    act(() => {
      const props = (
        result.current as unknown as {
          getInputProps(): { ref?: (node: HTMLInputElement | null) => void };
        }
      ).getInputProps();
      props.ref?.(element);
    });
  }

  const target = (): HTMLElement => {
    if (vector.field === "otp") {
      const active = slots.findIndex((slot) => slot.tabIndex === 0);
      return slots[active === -1 ? 0 : active];
    }
    return element as HTMLInputElement;
  };

  const supply = (value: unknown): void => {
    act(() => {
      rerender({ ...baseOptions, value });
    });
  };

  try {
    for (const step of vector.steps) {
      if ("event" in step) {
        const event = step.event as Record<string, unknown>;
        act(() => {
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
              large
                ? up
                  ? "PageUp"
                  : "PageDown"
                : up
                  ? "ArrowUp"
                  : "ArrowDown",
            );
          } else if (event.type === "commit") {
            fireKey(target(), "Enter");
          } else if (event.type === "reset") {
            fireKey(target(), "Escape");
          } else if (
            event.type === "insert" &&
            typeof event.text === "string"
          ) {
            fireBeforeInput(target(), "insertText", event.text);
          }
        });
      } else if ("typeText" in step) {
        for (const char of step.typeText) {
          act(() => {
            fireBeforeInput(target(), "insertText", char);
          });
        }
      } else if ("key" in step) {
        act(() => {
          fireKey(target(), String(step.key.key ?? ""));
        });
      } else if ("approve" in step) {
        supply(
          (lastProposal as { value?: unknown } | null)?.value ??
            result.current.value,
        );
      } else if ("reject" in step) {
        supply(result.current.value);
      } else if ("supply" in step) {
        supply(step.supply);
      } else if ("setValue" in step) {
        act(() => {
          result.current.setValue(step.setValue);
        });
      }
    }

    const field = result.current;
    const expect = vector.expect;

    if ("value" in expect) {
      assert.deepEqual(field.value, expect.value, vector.name);
    }
    if (expect.formattedValue !== undefined) {
      assert.equal(field.formattedValue, expect.formattedValue, vector.name);
    }
    if (expect.status !== undefined) {
      assert.equal(field.status, expect.status, vector.name);
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
    unmount();
  }
}
