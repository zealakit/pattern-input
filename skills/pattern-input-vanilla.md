# Pattern Input — Vanilla

Status: skeleton. The vanilla API is not implemented yet; plan 08 fills this skill.

Use this skill when integrating `@zealakit/pattern-input-vanilla` into a plain TypeScript or
JavaScript app.

- Install: `npm i @zealakit/pattern-input-vanilla`
- Contract: `rawValue` / `formattedValue`, controlled and uncontrolled modes, prop getters, and an
  instance API (`state`, `subscribe`, `setValue`, `setSelection`, `focus`, `blur`, `clear`).
- Host elements: the adapter attaches to elements you create; it never replaces them.
- Styling: the package ships no CSS; style your own elements.

Hard rules: never write `el.value` or selection yourself while a field is attached (the shared DOM
binding owns both), never wrap or replace a plain-text input, and never expect a validation engine
— validity comes from the field's own parsing plus your callbacks.
