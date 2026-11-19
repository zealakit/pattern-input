import {
  isWordDelete,
  type KeyInput,
  type KeyPlatform,
} from "../shared/index.js";
import type { MaskedEvent } from "./reducer.js";
import type { ResolvedMaskedOptions } from "./options.js";
import type { MaskedState } from "./state.js";

/** Map a normalized key to a masked-field event, or `null` to fall through. */
export function maskedKeyToEvent(
  key: KeyInput,
  _state: MaskedState,
  _resolved: ResolvedMaskedOptions,
  platform: KeyPlatform = "other",
): MaskedEvent | null {
  if (key.isComposing) {
    return null;
  }
  const command = key.ctrlKey || key.metaKey;
  if (command && !isWordDelete(key, platform)) {
    return null;
  }

  switch (key.key) {
    case "ArrowLeft":
      return { type: "move", to: "prev", extend: key.shiftKey };
    case "ArrowRight":
      return { type: "move", to: "next", extend: key.shiftKey };
    case "Home":
      return { type: "move", to: "start", extend: key.shiftKey };
    case "End":
      return { type: "move", to: "end", extend: key.shiftKey };
    case "Backspace":
      return {
        type: "delete",
        direction: "backward",
        unit: isWordDelete(key, platform) ? "word" : "char",
      };
    case "Delete":
      return {
        type: "delete",
        direction: "forward",
        unit: isWordDelete(key, platform) ? "word" : "char",
      };
    case "Enter":
      return { type: "commit" };
    case "Escape":
      return { type: "reset" };
    default:
      return null;
  }
}
