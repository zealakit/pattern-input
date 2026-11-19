# Pattern Input — React

Status: skeleton. The React API is not implemented yet; plan 09 fills this skill.

Use this skill when integrating `@zealakit/pattern-input-react` into a React 18 or 19 app.

- Install: `npm i @zealakit/pattern-input-react`
- Contract: `rawValue` / `formattedValue`, controlled and uncontrolled modes, prop getters, and an
  instance API (`state`, `subscribe`, `setValue`, `setSelection`, `focus`, `blur`, `clear`).
- Styling: the package ships no CSS; style your own `<input>` or slot elements.
- Next.js: the package is safe to import during SSR; do field work in an effect or a client
  component, never during render.

Hard rules: never bind `value` reactively (the shared DOM binding owns `el.value` and selection),
never wrap or replace a plain-text input, and never expect a validation engine — validity comes
from the field's own parsing plus your callbacks.
