import type { FieldController } from "../controller/controller.js";
import type { OtpEvent, OtpOptions, OtpState } from "../otp/index.js";
import { isBrowser } from "./env.js";

type Listener = {
  readonly target: EventTarget;
  readonly type: string;
  readonly handler: EventListener;
};

export type OtpDetach = (() => void) & { readonly refresh: () => void };

/**
 * Wire an OTP group: per-slot input/paste/key handling, roving tabindex, focus
 * following `activeIndex`, and an optional hidden input kept in sync.
 * SSR-safe: returns a no-op detach without a DOM.
 */
export function attachOtpGroup(
  group: HTMLElement,
  controller: FieldController<OtpState, OtpEvent, string, OtpOptions>,
  getSlots: () => readonly HTMLInputElement[],
  options: { readonly hiddenInput?: HTMLInputElement } = {},
): OtpDetach {
  if (!isBrowser()) {
    const noop = (): void => {};
    return Object.assign(noop, { refresh: noop });
  }

  const guard = { applying: false };
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

  const render = (): void => {
    const state = controller.getState();
    const slots = getSlots();

    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      if (slot.value !== state.slots[index]) {
        guard.applying = true;
        slot.value = state.slots[index];
        guard.applying = false;
      }
      slot.tabIndex = index === state.activeIndex ? 0 : -1;
      attachSlot(slot);
    }

    if (options.hiddenInput) {
      options.hiddenInput.value = state.rawValue;
    }

    const active = slots[state.activeIndex];
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
      if (guard.applying) {
        return;
      }
      const input = event as InputEvent;
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

    on(slot, "input", () => {
      if (guard.applying || slot.value === "") {
        return;
      }
      const typed = slot.value;
      dispatch({ type: "insert", text: typed });
      render();
    });

    on(slot, "paste", (event) => {
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
  render();

  const detach = (): void => {
    unsubscribe();
    for (const listener of listeners) {
      listener.target.removeEventListener(listener.type, listener.handler);
    }
    listeners.length = 0;
  };

  return Object.assign(detach, { refresh: render });
}
