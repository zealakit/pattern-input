import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { FieldController } from "@zealakit/pattern-input-core";
import type { Ref } from "react";
import { composeRefs } from "../utils/merge-props.js";

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

/**
 * Attach a DOM binding through a ref callback. React calls `ref(null)` on
 * unmount (and, in React 19 StrictMode, re-invokes it), so the ref alone owns
 * the attach/detach lifecycle; an extra effect would detach the binding under
 * React 18 StrictMode, which re-runs effects but not refs.
 */
export function useElementBinding<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  controller: FieldController<TState, TEvent, TValue, TOptions>,
  attach: (element: HTMLInputElement, controller: never) => () => void,
): {
  /** Ref callback for the field's own element, stable across renders. */
  readonly refWith: (
    userRef?: Ref<HTMLInputElement> | null,
  ) => (element: HTMLInputElement | null) => void;
  readonly elementRef: { current: HTMLInputElement | null };
} {
  const detachRef = useRef<(() => void) | null>(null);
  const elementRef = useRef<HTMLInputElement | null>(null);
  const composedRef = useRef<{
    readonly userRef: Ref<HTMLInputElement> | null | undefined;
    readonly composed: (element: HTMLInputElement | null) => void;
  } | null>(null);

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

  /**
   * Compose with a consumer ref. The composed callback keeps its identity while
   * the consumer's ref does, because a new callback would make React detach and
   * re-attach the DOM binding on every render.
   */
  const refWith = useCallback(
    (userRef?: Ref<HTMLInputElement> | null) => {
      const cached = composedRef.current;
      if (cached !== null && cached.userRef === userRef) {
        return cached.composed;
      }
      const composed = userRef ? composeRefs(ref, userRef) : ref;
      composedRef.current = { userRef, composed };
      return composed;
    },
    [ref],
  );

  return { refWith, elementRef };
}
