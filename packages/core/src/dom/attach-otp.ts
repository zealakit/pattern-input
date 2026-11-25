import type { FieldController } from "../controller/controller.js";
import type { OtpEvent, OtpOptions, OtpState } from "../otp/index.js";
import { createCompositionGuard } from "@zealakit/ui-engine/keyboard";
import type { CompositionGuard } from "@zealakit/ui-engine/keyboard";
import { isBrowser } from "./env.js";
import type { OtpSlotList, OtpSlotRegistry } from "./slot-registry.js";

type Listener = {
  readonly target: EventTarget;
  readonly type: string;
  readonly handler: EventListener;
};

export type OtpDetach = (() => void) & { readonly refresh: () => void };

/** Where the group finds its slot inputs: a registry or a plain getter. */
export type OtpSlotSource = OtpSlotRegistry | (() => OtpSlotList);

/**
 * Wire an OTP group: per-slot input/paste/key handling, roving tabindex, focus
 * following `activeIndex`, and an optional hidden input kept in sync.
 * SSR-safe: returns a no-op detach without a DOM.
 */
export function attachOtpGroup(
  group: HTMLElement,
  controller: FieldController<OtpState, OtpEvent, string, OtpOptions>,
  source: OtpSlotSource,
  options: { readonly hiddenInput?: HTMLInputElement } = {},
): OtpDetach {
  if (!isBrowser()) {
    const noop = (): void => {};
    return Object.assign(noop, { refresh: noop });
  }

  const getSlots = typeof source === "function" ? source : source.getSlots;
  const guard = { applying: false };
  /**
   * E30/E31: the engine's guard owns composition state per slot: the boolean,
   * the marked data and the just-ended window Safari needs before the committing
   * Enter. `composing` here means "any slot is composing".
   */
  const compositions = new Map<HTMLInputElement, CompositionGuard>();
  const detachCompositions: (() => void)[] = [];
  const composing = (): boolean =>
    [...compositions.values()].some((guard) => guard.composing);
  const attached = new WeakSet<HTMLInputElement>();
  const listeners: Listener[] = [];

  const on = (
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
  ): void => {
    const listener = handler as EventListener;
    target.addEventListener(type, listener);
    listeners.push({ target, type, handler: listener });
  };

  const dispatch = (event: Record<string, unknown>): void => {
    controller.dispatch(event as unknown as OtpEvent);
  };

  /** Active slot, or the nearest mounted one when the active index has no element. */
  const resolveTarget = (slots: OtpSlotList, active: number): number => {
    if (slots[active] !== undefined) {
      return active;
    }
    for (let index = active + 1; index < slots.length; index += 1) {
      if (slots[index] !== undefined) {
        return index;
      }
    }
    for (
      let index = Math.min(active, slots.length) - 1;
      index >= 0;
      index -= 1
    ) {
      if (slots[index] !== undefined) {
        return index;
      }
    }
    return -1;
  };

  const render = (): void => {
    // While composing, the browser owns the slot text: repainting would destroy it.
    if (composing()) {
      return;
    }
    const state = controller.getState();
    const slots = getSlots();
    const target = resolveTarget(slots, state.activeIndex);

    // Inputs past the field length are host-owned extras: leave them alone.
    const count = Math.min(slots.length, state.slots.length);
    for (let index = 0; index < count; index += 1) {
      const slot = slots[index];
      if (slot === undefined) {
        continue;
      }
      const expected = state.slots[index];
      if (slot.value !== expected) {
        guard.applying = true;
        slot.value = expected;
        guard.applying = false;
      }
      slot.tabIndex = index === target ? 0 : -1;
      attachSlot(slot);
    }

    if (options.hiddenInput) {
      options.hiddenInput.value = state.rawValue;
    }

    const active = slots[target];
    if (
      active &&
      group.contains(document.activeElement) &&
      document.activeElement !== active
    ) {
      active.focus({ preventScroll: true });
      active.setSelectionRange(0, active.value.length);
    }
  };

  function attachSlot(slot: HTMLInputElement): void {
    if (attached.has(slot)) {
      return;
    }
    attached.add(slot);

    const indexOf = (): number => getSlots().indexOf(slot);

    on(slot, "beforeinput", (event) => {
      const input = event as InputEvent;
      if (guard.applying || composing() || input.isComposing) {
        return;
      }
      const inputType = input.inputType ?? "";
      if (inputType === "insertCompositionText") {
        return;
      }
      const data =
        input.data ?? input.dataTransfer?.getData("text/plain") ?? "";
      if (inputType.startsWith("insert")) {
        if (data === "") {
          return;
        }
        event.preventDefault();
        dispatch({ type: "insert", text: data });
        render();
        return;
      }
      if (inputType.startsWith("delete")) {
        event.preventDefault();
        dispatch({
          type: "delete",
          direction: inputType.includes("Forward") ? "forward" : "backward",
          unit: "char",
        });
        render();
      }
    });

    on(slot, "input", (event) => {
      if (
        guard.applying ||
        composing() ||
        (event as InputEvent).isComposing ||
        slot.value === ""
      ) {
        return;
      }
      const typed = slot.value;
      dispatch({ type: "insert", text: typed });
      render();
    });

    const composition = createCompositionGuard(slot, {
      onStart: () => dispatch({ type: "composeStart" }),
      onUpdate: (text) => dispatch({ type: "composeUpdate", text }),
      onEnd: (text) => {
        dispatch({ type: "composeEnd", text });
        render();
      },
    });
    compositions.set(slot, composition);
    detachCompositions.push(() => composition.destroy());

    on(slot, "paste", (event) => {
      if (composing()) {
        return;
      }
      const text =
        (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
      if (text === "") {
        return;
      }
      event.preventDefault();
      dispatch({ type: "paste", text });
      render();
    });

    on(slot, "keydown", (event) => {
      const key = event as KeyboardEvent;
      if (key.isComposing || key.keyCode === 229) {
        return;
      }
      const handled = controller.handleKey({
        key: key.key,
        shiftKey: key.shiftKey,
        altKey: key.altKey,
        ctrlKey: key.ctrlKey,
        metaKey: key.metaKey,
        isComposing: key.isComposing,
      });
      if (handled) {
        event.preventDefault();
        render();
      }
    });

    on(slot, "focus", () => {
      dispatch({ type: "focusSlot", index: indexOf() });
      dispatch({ type: "focus" });
      slot.setSelectionRange(0, slot.value.length);
      render();
    });
  }

  on(group, "focusout", (event) => {
    const next = (event as FocusEvent).relatedTarget as Node | null;
    if (next && group.contains(next)) {
      return;
    }
    dispatch({ type: "blur" });
    render();
  });

  const unsubscribe = controller.subscribe(render);
  const unsubscribeSlots =
    typeof source === "function" ? null : source.subscribe(render);
  render();

  const detach = (): void => {
    unsubscribe();
    unsubscribeSlots?.();
    for (const listener of listeners) {
      listener.target.removeEventListener(listener.type, listener.handler);
    }
    listeners.length = 0;
    for (const stop of detachCompositions.splice(0)) {
      stop();
    }
    compositions.clear();
  };

  return Object.assign(detach, { refresh: render });
}
