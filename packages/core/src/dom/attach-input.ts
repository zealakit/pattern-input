import type { FieldController } from "../controller/controller.js";
import type { KeyPlatform } from "../shared/index.js";
import { createCompositionTracker } from "./composition.js";
import { isBrowser, platform } from "./env.js";
import { mapInputType } from "./input-events.js";
import { paintInput, type RenderGuard } from "./render.js";
import { selectedText, selectionFromDom } from "./selection.js";

export type Detach = () => void;

type Listener = {
  readonly target: EventTarget;
  readonly type: string;
  readonly handler: EventListener;
};

function diffText(
  previous: string,
  next: string,
): { readonly inserted: string; readonly removed: number } {
  let start = 0;
  while (
    start < previous.length &&
    start < next.length &&
    previous[start] === next[start]
  ) {
    start += 1;
  }
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previous[previousEnd - 1] === next[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  return {
    inserted: next.slice(start, nextEnd),
    removed: previousEnd - start,
  };
}

/**
 * The single DOM entry for text-like fields: maps `beforeinput`, IME,
 * clipboard, selection and focus onto controller events, then paints the
 * approved state back. SSR-safe: returns a no-op detach without a DOM.
 */
export function attachInput<
  TState,
  TEvent extends { readonly type: string },
  TValue,
  TOptions,
>(
  el: HTMLInputElement,
  controller: FieldController<TState, TEvent, TValue, TOptions>,
  options: { readonly platform?: KeyPlatform } = {},
): Detach {
  if (!isBrowser()) {
    return () => {};
  }

  const guard: RenderGuard = { applying: false };
  const composition = createCompositionTracker();
  const keyPlatform = options.platform ?? platform();
  const listeners: Listener[] = [];
  let lastText = el.value;

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
    controller.dispatch(event as unknown as TEvent);
  };

  const render = (): void => {
    // While composing, the browser owns the text: repainting would destroy it.
    if (composition.active) {
      return;
    }
    const view = controller.getView();
    paintInput(el, view, guard);
    lastText = view.text;
  };

  const syncSelection = (): void => {
    if (guard.applying) {
      return;
    }
    const view = controller.getView();
    dispatch({ type: "select", selection: selectionFromDom(el, view.map) });
  };

  const onBeforeInput = (event: Event): void => {
    const input = event as InputEvent;
    if (guard.applying || composition.active || input.isComposing) {
      return;
    }
    const inputType = input.inputType ?? "";

    if (inputType === "historyUndo") {
      event.preventDefault();
      controller.undo();
      render();
      return;
    }
    if (inputType === "historyRedo") {
      event.preventDefault();
      controller.redo();
      render();
      return;
    }
    if (inputType === "insertCompositionText") {
      return;
    }

    const data =
      input.data ?? input.dataTransfer?.getData("text/plain") ?? null;
    const mapped = mapInputType(inputType, data);
    if (mapped === null) {
      return;
    }
    event.preventDefault();
    dispatch(mapped.event);
    render();
  };

  const onInput = (event: Event): void => {
    if (
      guard.applying ||
      composition.active ||
      (event as InputEvent).isComposing
    ) {
      return;
    }
    const next = el.value;
    if (next === lastText) {
      return;
    }
    const diff = diffText(lastText, next);
    if (diff.inserted !== "") {
      dispatch({ type: "insert", text: diff.inserted });
    } else if (diff.removed > 0) {
      for (let index = 0; index < diff.removed; index += 1) {
        dispatch({ type: "delete", direction: "backward", unit: "char" });
      }
    }
    render();
  };

  const onCompositionStart = (): void => {
    composition.start();
    dispatch({ type: "composeStart" });
  };

  const onCompositionUpdate = (event: Event): void => {
    const data = (event as CompositionEvent).data ?? "";
    composition.update(data);
    dispatch({ type: "composeUpdate", text: data });
  };

  const onCompositionEnd = (event: Event): void => {
    const data = (event as CompositionEvent).data ?? "";
    composition.end();
    dispatch({ type: "composeEnd", text: data });
    render();
  };

  const onKeyDown = (event: Event): void => {
    const key = event as KeyboardEvent;
    if (key.isComposing || key.keyCode === 229) {
      return;
    }
    const handled = controller.handleKey(
      {
        key: key.key,
        shiftKey: key.shiftKey,
        altKey: key.altKey,
        ctrlKey: key.ctrlKey,
        metaKey: key.metaKey,
        isComposing: key.isComposing,
      },
      keyPlatform,
    );
    if (handled) {
      event.preventDefault();
      render();
    }
  };

  const onPaste = (event: Event): void => {
    const text =
      (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
    if (text === "") {
      return;
    }
    event.preventDefault();
    dispatch({ type: "paste", text });
    render();
  };

  const onCopy = (event: Event): void => {
    const view = controller.getView();
    const text = selectedText(view.text, view.map, view.selection);
    if (text === "") {
      return;
    }
    event.preventDefault();
    (event as ClipboardEvent).clipboardData?.setData("text/plain", text);
  };

  const onCut = (event: Event): void => {
    syncSelection();
    const selected = controller.getView();
    const text = selectedText(selected.text, selected.map, selected.selection);
    if (text === "") {
      return;
    }
    event.preventDefault();
    (event as ClipboardEvent).clipboardData?.setData("text/plain", text);
    dispatch({ type: "delete", direction: "backward", unit: "char" });
    render();
  };

  const onSelectionChange = (): void => {
    if (guard.applying) {
      return;
    }
    if (document.activeElement !== el) {
      return;
    }
    syncSelection();
  };

  const onFocus = (): void => {
    dispatch({ type: "focus" });
  };

  const onBlur = (): void => {
    // A blur ends any open composition; the controller commits it on `blur`.
    composition.end();
    dispatch({ type: "blur" });
    render();
  };

  on(el, "beforeinput", onBeforeInput);
  on(el, "input", onInput);
  on(el, "compositionstart", onCompositionStart);
  on(el, "compositionupdate", onCompositionUpdate);
  on(el, "compositionend", onCompositionEnd);
  on(el, "keydown", onKeyDown);
  on(el, "paste", onPaste);
  on(el, "copy", onCopy);
  on(el, "cut", onCut);
  on(el, "select", onSelectionChange);
  on(el, "pointerup", onSelectionChange);
  on(el, "focus", onFocus);
  on(el, "blur", onBlur);
  on(document, "selectionchange", onSelectionChange);

  // Repaint whenever the controller changes outside this handler too — most
  // importantly when a controlled consumer approves a proposal via setOptions.
  const unsubscribe = controller.subscribe(render);

  render();

  return () => {
    unsubscribe();
    for (const listener of listeners) {
      listener.target.removeEventListener(listener.type, listener.handler);
    }
    listeners.length = 0;
  };
}
