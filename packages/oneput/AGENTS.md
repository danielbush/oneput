# Oneput

## Changes

This codebase is new. Avoid preserving old apis or features, do not keep legacy code. Always prefer replacing with better implementations and apis. It's paramount that we get the foundations right so that future changes can be added easily and in a modular fashion.

## Testing

See `TESTING.md` for a high-level testing policy.
Offer to flesh this out with the user. Look for obvious things to tackle.

## Architecture and concepts / design choices and philosophy

- `packages/oneput/docs/architecture.md`.
- `packages/oneput/docs/CONCEPTS.md`
  - shared concepts and vocabulary
  - design choices and justifications

## Key systems (packages/oneput)

Below are pointers for agents — read the source files for full detail via JSDoc.

### Bindings

Key bindings map keyboard shortcuts to actions. Each binding declares `when` conditions (`menuOpen`, `multiline`) controlling when it fires. Dispatch also leaves unmodified Enter/Space alone when the browser already activates the focused control (`lib/nativeActivation.ts`) - see ENTER_SEMANTICS.

- Types: `packages/oneput/src/lib/oneput/lib/bindings.ts` — `KeyBinding`, `ActionBinding`, `KeyBindingMap`
- Controller: `packages/oneput/src/lib/oneput/controllers/KeysController.ts`
- Defaults: `packages/oneput/src/lib/oneput/shared/actions/OneputCatalog.ts`
- Persistence: `packages/oneput/src/lib/oneput/shared/bindings/BindingsIDB.ts`

### AppObject

AppObjects represent screens/states in the app stack with actions, menu, and lifecycle hooks.

- Type: `packages/oneput/src/lib/oneput/types.ts` — `AppObject`
- Controller: `packages/oneput/src/lib/oneput/controllers/AppController.ts`

### Input claims

Exclusive semantic ownership of typed input for live-edit and similar flows.
`InputScope` is AppObject-scoped; closing it on suspend/exit releases claims.
Claims declare their own termination via `release` (Back, focus leave, owner
removed). `AppController` routes those events to `InputController`.

- Helper: `packages/oneput/src/lib/oneput/controllers/helpers/InputClaims.ts`
- API: `InputController.openScope()` / `claim()` / `handleBack()` /
  `handleMenuItemFocus()` / `notifyBaseMenuChanged()`
- Coordinator: `packages/oneput/src/lib/oneput/shared/behaviors/MixedMenuLiveEdit.ts`

### Controller

The central API consumers use to control Oneput. Composes sub-controllers for keys, menu, input, ui, app.

- Entry: `packages/oneput/src/lib/oneput/controllers/controller.ts`

### Events

Decoupled pub-sub communication between controllers.

- Types and emitter: `packages/oneput/src/lib/oneput/controllers/InternalEventEmitter.ts`

### Pull rows (menu rows that paint themselves)

Rows that must change without a menu rebuild mount a widget that reads a live
`Pull<T>` source. See PULL_ROWS in `docs/CONCEPTS.md`.

- Type + helpers: `packages/oneput/src/lib/oneput/lib/pull.ts` — `Pull`, `cell`, `notifier`
- Rows: `shared/ui/menuItems/checkboxMenuItem.ts`, `shared/ui/menuItems/pullToggleMenuItem.ts`
- Widgets: `shared/ui/menuItems/pull/`
- Snapshot alternative: `shared/ui/menuItems/toggleMenuItem.ts` (caller rebuilds)

### Standard host layout

Reusable menu/input chrome that maps `AppLayoutParams` (`inputAccept` /
`inputReject` / `inputSend`) onto `inputUI.right`. Hosts close over registered
icon names in the install factory.

- `packages/oneput/src/lib/oneput/shared/ui/layout/StandardLayout.ts`
- Buttons: `packages/oneput/src/lib/oneput/shared/ui/buttons.ts`

## Oneput skill (`packages/oneput-skill/SKILL.md`)

There is also an agent skill at `.agents/skills/oneput` (symlinked from `packages/oneput-skill/`). This is a fourth layer that sits alongside the others but serves a different purpose:

- **This file** tells agents where things are in this repo (navigational, project-specific)
- **Architecture docs** explain how systems work and why (descriptive, for humans)
- **The skill** teaches how to build with Oneput — patterns, recipes, API usage (prescriptive, portable)

The skill is portable — it works in any project that uses Oneput as a dependency, not just this monorepo. It should not duplicate project-specific file paths (that's this file's job) or internal implementation details (that's JSDoc's job). Instead it covers the patterns: how to create AppObjects, declare bindings with `when` conditions, build menus with `stdMenuItem`, use the Controller, etc.

When to update the skill: when the public API or recommended patterns change (e.g. new builder methods, new AppObject lifecycle hooks, changes to the bindings system). When changing internal implementation details, update JSDoc and architecture docs instead.
