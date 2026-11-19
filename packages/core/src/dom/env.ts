import type { KeyPlatform } from "../shared/index.js";

/** True only when a real browser environment is present (never at import). */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Platform reported once, lazily; core itself never reads navigator. */
export function platform(): KeyPlatform {
  const nav = (globalThis as { navigator?: { platform?: string } }).navigator;
  return /mac/i.test(nav?.platform ?? "") ? "mac" : "other";
}
