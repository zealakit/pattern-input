import {
  isWordDelete,
  type KeyInput,
  type KeyPlatform,
} from "../shared/index.js";
import type { ResolvedNumberOptions } from "./options.js";
import type { NumberEvent } from "./reducer.js";
import type { NumberState } from "./state.js";

/** Map a normalized key to a number-field event, or `null` to fall through. */
export function numberKeyToEvent(
  key: KeyInput,
  _state: NumberState,
  _resolved: ResolvedNumberOptions,
  platform: KeyPlatform = "other",
): NumberEvent | null {
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
    case "ArrowUp":
      return { type: "step", direction: 1, large: false };
    case "ArrowDown":
      return { type: "step", direction: -1, large: false };
    case "PageUp":
      return { type: "step", direction: 1, large: true };
    case "PageDown":
      return { type: "step", direction: -1, large: true };
    case "Enter":
      return { type: "commit" };
    case "Escape":
      return { type: "reset" };
    default:
      return null;
  }
}
