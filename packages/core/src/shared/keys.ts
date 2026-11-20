import type { KeyInput } from "./types.js";

/** Platform the adapter reports; core never reads the platform API. */
export type KeyPlatform = "mac" | "other";

/** Any command/control/alt modifier is held. */
export function isModified(key: KeyInput): boolean {
  return key.ctrlKey || key.metaKey || key.altKey;
}

/** Word-delete modifier: Alt on macOS, Ctrl elsewhere. */
export function isWordDelete(key: KeyInput, platform: KeyPlatform): boolean {
  return platform === "mac" ? key.altKey : key.ctrlKey;
}

/** True while an IME composition is active; reducers must not commit then. */
export function isComposing(key: KeyInput): boolean {
  return key.isComposing;
}
