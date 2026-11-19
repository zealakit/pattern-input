# Pattern Input — Svelte

Status: skeleton. The Svelte API is not implemented yet; plan 11 fills this skill.

Use this skill when integrating `@zealakit/pattern-input-svelte` into a Svelte 5 app.

- Install: `npm i @zealakit/pattern-input-svelte`
- Contract: `rawValue` / `formattedValue`, controlled and uncontrolled modes, prop getters, and an
  instance API (`state`, `subscribe`, `setValue`, `setSelection`, `focus`, `blur`, `clear`).
- Styling: the package ships no CSS; style your own `<input>` or slot elements.
- SvelteKit: the package is safe to import during SSR; use actions for DOM work.

Hard rules: never bind `value` reactively (the shared DOM binding owns `el.value` and selection),
never wrap or replace a plain-text input, and never expect a validation engine — validity comes
from the field's own parsing plus your callbacks.
