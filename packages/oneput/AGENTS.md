# Oneput

## Key systems (packages/oneput)

For human-readable architecture docs, see `packages/oneput/docs/architecture.md` and `packages/jsed/docs/architecture.md`.

Below are pointers for agents — read the source files for full detail via JSDoc.

### Bindings

Key bindings map keyboard shortcuts to actions. Each binding declares `when` conditions (e.g. `menuOpen: true`) controlling when it fires.

- Types: `packages/oneput/src/lib/oneput/lib/bindings.ts` — `KeyBinding`, `ActionBinding`, `KeyBindingMap`
- Controller: `packages/oneput/src/lib/oneput/controllers/KeysController.ts`
- Defaults: `packages/oneput/src/lib/oneput/shared/bindings/defaultBindings.ts`
- Persistence: `packages/oneput/src/lib/oneput/shared/bindings/BindingsIDB.ts`

### AppObject

AppObjects represent screens/states in the app stack with actions, menu, and lifecycle hooks.

- Type: `packages/oneput/src/lib/oneput/types.ts` — `AppObject`
- Controller: `packages/oneput/src/lib/oneput/controllers/AppController.ts`

### Controller

The central API consumers use to control Oneput. Composes sub-controllers for keys, menu, input, ui, app.

- Entry: `packages/oneput/src/lib/oneput/controllers/controller.ts`

### Events

Decoupled pub-sub communication between controllers.

- Types and emitter: `packages/oneput/src/lib/oneput/controllers/InternalEventEmitter.ts`

## Oneput skill (`packages/oneput-skill/SKILL.md`)

There is also an agent skill at `.agents/skills/oneput` (symlinked from `packages/oneput-skill/`). This is a fourth layer that sits alongside the others but serves a different purpose:

- **This file** tells agents where things are in this repo (navigational, project-specific)
- **Architecture docs** explain how systems work and why (descriptive, for humans)
- **The skill** teaches how to build with Oneput — patterns, recipes, API usage (prescriptive, portable)

The skill is portable — it works in any project that uses Oneput as a dependency, not just this monorepo. It should not duplicate project-specific file paths (that's this file's job) or internal implementation details (that's JSDoc's job). Instead it covers the patterns: how to create AppObjects, declare bindings with `when` conditions, build menus with `stdMenuItem`, use the Controller, etc.

When to update the skill: when the public API or recommended patterns change (e.g. new builder methods, new AppObject lifecycle hooks, changes to the bindings system). When changing internal implementation details, update JSDoc and architecture docs instead.
