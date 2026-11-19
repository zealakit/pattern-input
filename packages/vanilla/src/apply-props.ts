export type AttributeProps = Readonly<Record<string, unknown>>;

/**
 * Diff-apply plain attribute props: booleans become present/absent attributes,
 * strings/numbers become values. Only names present in `previous` or `props`
 * are touched, so host-owned attributes are never disturbed.
 */
export function applyProps(
  el: Element,
  props: AttributeProps,
  previous: AttributeProps,
): void {
  const names = new Set([...Object.keys(previous), ...Object.keys(props)]);

  for (const name of names) {
    const value = props[name];
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
