# Pattern Input — Vue

Status: skeleton. The Vue API is not implemented yet; plan 10 fills this skill.

Use this skill when integrating `@zealakit/pattern-input-vue` into a Vue 3.5+ app.

- Install: `npm i @zealakit/pattern-input-vue`
- Contract: `rawValue` / `formattedValue`, controlled and uncontrolled modes, prop getters, and an
  instance API (`state`, `subscribe`, `setValue`, `setSelection`, `focus`, `blur`, `clear`).
- Styling: the package ships no CSS; style your own `<input>` or slot elements.
- Nuxt: the package is safe to import during SSR; touch the DOM only in `onMounted` or an action.

Hard rules: never bind `value` reactively (the shared DOM binding owns `el.value` and selection),
never wrap or replace a plain-text input, and never expect a validation engine — validity comes
from the field's own parsing plus your callbacks.
