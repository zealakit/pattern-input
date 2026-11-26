# Changelog

All notable changes to this project are documented here. Every package shares one version;
`@zealakit/pattern-input-core` stays private and is bundled into each adapter.

## Unreleased (engine)

No version is set and nothing here is published (D23).

### Breaking

- **`@zealakit/ui-engine` (`^1.0.0-beta.1`) is a required peer for every adapter.** Install it next
  to the package: `npm i @zealakit/ui-engine @zealakit/pattern-input-react`.
- The controllers use the engine's composition guard and IME gate (E2/E30/E31) instead of their own
  copies. Behaviour is unchanged.

### Fixed

- The Svelte invalid-field example updates `aria-invalid` after blur (it used to spread a one-time
  props snapshot).

### Known issue

- Firefox delivers a full OTP code inserted with `insertText` as `beforeinput` with
  `inputType: "insertCompositionText"`; the controller's IME gate skips it and the last cell is
  filled from the wrong character. Repro: `_plans-2/evidence/03-examples/REPORT-2.md`.
