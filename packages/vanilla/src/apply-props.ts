export type AttributeProps = Readonly<Record<string, unknown>>;

/**
 * Diff-apply plain attribute props: booleans become present/absent attributes,
 * strings/numbers become values. Only names present in `previous` or `props`
 * are touched, and unchanged values are skipped, so host-owned attributes are
 * never disturbed and steady-state updates cost no DOM writes.
 */
export function applyProps(
  el: Element,
  props: AttributeProps,
  previous: AttributeProps,
): void {
  const names = new Set([...Object.keys(previous), ...Object.keys(props)]);

  for (const name of names) {
    const value = props[name];
    if (name in previous && previous[name] === value) {
      continue;
    }
    if (value === undefined || value === null || value === false) {
      el.removeAttribute(name);
      continue;
    }
    if (value === true) {
      el.setAttribute(name, "");
      continue;
    }
    el.setAttribute(name, String(value));
  }
}
