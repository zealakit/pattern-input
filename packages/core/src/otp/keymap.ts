import type { KeyInput } from "../shared/index.js";
import type { OtpEvent } from "./reducer.js";
import type { ResolvedOtpOptions } from "./options.js";
import type { OtpState } from "./state.js";

/** Map a normalized key to an OTP event, or `null` to fall through. */
export function otpKeyToEvent(
  key: KeyInput,
  _state: OtpState,
  _resolved: ResolvedOtpOptions,
): OtpEvent | null {
  if (key.isComposing) {
    return null;
  }
  if (key.ctrlKey || key.metaKey) {
    return null;
  }

  switch (key.key) {
    case "ArrowLeft":
      return { type: "move", to: "prev", extend: false };
    case "ArrowRight":
      return { type: "move", to: "next", extend: false };
    case "Home":
      return { type: "move", to: "start", extend: false };
    case "End":
      return { type: "move", to: "end", extend: false };
    case "Backspace":
      return { type: "delete", direction: "backward", unit: "char" };
    case "Delete":
      return { type: "delete", direction: "forward", unit: "char" };
    case "Enter":
      return { type: "commit" };
    case "Escape":
      return { type: "reset" };
    default:
      return null;
  }
}
