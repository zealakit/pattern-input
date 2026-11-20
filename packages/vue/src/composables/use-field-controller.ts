import type {
  FieldController,
  FieldControllerOptions,
} from "@zealakit/pattern-input-core";
import { attachInput } from "@zealakit/pattern-input-core/dom";
import {
  computed,
  type ComputedRef,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";

/** Create a controller once, push options synchronously, expose shallow state. */
export function useFieldController<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  create: () => FieldController<TState, TEvent, TValue, TOptions>,
  options: MaybeRefOrGetter<FieldControllerOptions<TValue, TOptions>>,
): {
  readonly controller: FieldController<TState, TEvent, TValue, TOptions>;
  readonly state: ComputedRef<TState>;
} {
  const controller = create();
  const current = shallowRef(controller.getState());
  const unsubscribe = controller.subscribe(() => {
    current.value = controller.getState();
  });

  watch(
    () => toValue(options),
    (next) => controller.setOptions(next),
    {
      flush: "sync",
      immediate: true,
    },
  );

  onScopeDispose(() => {
    unsubscribe();
  });

  return { controller, state: computed(() => current.value) };
}

/** Function-ref binding for the host input; disposes with the effect scope. */
export function useInputElement<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  controller: FieldController<TState, TEvent, TValue, TOptions>,
): {
  readonly inputRef: (node: HTMLInputElement | null) => void;
  readonly getElement: () => HTMLInputElement | null;
} {
  let detach: (() => void) | null = null;
  let element: HTMLInputElement | null = null;

  const inputRef = (node: HTMLInputElement | null): void => {
    detach?.();
    detach = null;
    element = node;
    if (node) {
      detach = attachInput(node, controller);
    }
  };

  onScopeDispose(() => {
    detach?.();
    detach = null;
  });

  return { inputRef, getElement: () => element };
}
