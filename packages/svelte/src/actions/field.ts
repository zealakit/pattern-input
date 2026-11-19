import type { ActionReturn } from "svelte/action";

type Attachable = { attach(node: HTMLElement): () => void };

/** Svelte action: attaches the DOM binding and detaches on destroy. */
export function fieldAction(
  node: HTMLInputElement,
  field: Attachable,
): ActionReturn {
  const detach = field.attach(node);
  return { destroy: detach };
}

/** Svelte action for the OTP group container. */
export function otpGroupAction(
  node: HTMLElement,
  field: Attachable,
): ActionReturn {
  const detach = field.attach(node);
  return { destroy: detach };
}
