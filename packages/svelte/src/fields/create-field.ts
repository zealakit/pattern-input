import { writable } from "svelte/store";
import { attachInput } from "@zealakit/pattern-input-core/dom";
import type { FieldController } from "@zealakit/pattern-input-core";

/** Shared factory: a readable store of state plus attach/sync helpers. */
export function createFieldStore<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  controller: FieldController<TState, TEvent, TValue, TOptions>,
  getOptions: () => Parameters<typeof controller.setOptions>[0],
) {
  const store = writable(controller.getState());
  controller.subscribe(() => {
    store.set(controller.getState());
  });

  return {
    subscribe: store.subscribe,
    sync(): void {
      controller.setOptions(getOptions());
    },
    attach(node: HTMLInputElement): () => void {
      return attachInput(node, controller);
    },
  };
}
