import type { ActionReturn } from "svelte/action";
import type { OtpField } from "../components/otp-context.js";

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

type OtpSlotParams = { readonly field: OtpField; readonly index: number };

/** Svelte action for one OTP slot input: registers it by explicit index. */
export function otpSlotAction(
  node: HTMLInputElement,
  params: OtpSlotParams,
): ActionReturn<OtpSlotParams> {
  let current = params;
  current.field.registry.refFor(current.index)(node);

  return {
    update(next) {
      if (next.field === current.field && next.index === current.index) {
        return;
      }
      // Register at the new index first, so a re-index never exposes a gap.
      next.field.registry.refFor(next.index)(node);
      current.field.registry.refFor(current.index)(null);
      current = next;
    },
    destroy() {
      current.field.registry.refFor(current.index)(null);
    },
  };
}
