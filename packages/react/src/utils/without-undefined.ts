/**
 * Drop keys whose value is undefined, so optional component props can fill an
 * options object under `exactOptionalPropertyTypes`.
 *
 * Safe here because the core controller replaces its options as a whole on every
 * update: a missing key resolves to the default, it never keeps an old value.
 */
export function withoutUndefined<T>(options: {
  [K in keyof T]: T[K] | undefined;
}): T {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as T;
}
