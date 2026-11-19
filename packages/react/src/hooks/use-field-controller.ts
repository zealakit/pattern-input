import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { FieldController } from "@zealakit/pattern-input-core";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type OptionsOf<TController> = TController extends {
  setOptions(options: infer TOptions): void;
}
  ? TOptions
  : never;

/**
 * Create a controller once per hook instance, push options after every render
 * (layout effect, so controlled approvals land before paint), and subscribe
 * with `useSyncExternalStore` (server snapshot = the initial state).
 */
export function useFieldController<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  create: () => FieldController<TState, TEvent, TValue, TOptions>,
  options: OptionsOf<FieldController<TState, TEvent, TValue, TOptions>>,
): {
  controller: FieldController<TState, TEvent, TValue, TOptions>;
  state: TState;
} {
  const controllerRef = useRef<FieldController<
    TState,
    TEvent,
    TValue,
    TOptions
  > | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = create();
  }
  const controller = controllerRef.current;

  useIsomorphicLayoutEffect(() => {
    controller.setOptions(options);
  });

  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  return { controller, state };
}

/** Attach a DOM binding through a ref callback; StrictMode-safe. */
export function useElementBinding<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  controller: FieldController<TState, TEvent, TValue, TOptions>,
  attach: (element: HTMLInputElement, controller: never) => () => void,
): {
  readonly ref: (element: HTMLInputElement | null) => void;
  readonly elementRef: { current: HTMLInputElement | null };
} {
  const detachRef = useRef<(() => void) | null>(null);
  const elementRef = useRef<HTMLInputElement | null>(null);

  const ref = useCallback(
    (element: HTMLInputElement | null) => {
      detachRef.current?.();
      detachRef.current = null;
      elementRef.current = element;
      if (element) {
        detachRef.current = attach(element, controller as never);
      }
    },
    [attach, controller],
  );

  useIsomorphicLayoutEffect(
    () => () => {
      detachRef.current?.();
      detachRef.current = null;
    },
    [],
  );

  return { ref, elementRef };
}
