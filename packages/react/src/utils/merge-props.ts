import type { Ref } from "react";

/** Compose several refs (callback or object) into one callback ref. */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as { current: T | null }).current = node;
      }
    }
  };
}
