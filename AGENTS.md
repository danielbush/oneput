## Project overview

This is a monorepo.

- packages/oneput
  - the main package
- packages/jsed
  - an editor that lets you edit html using oneput
- packages/oneput-native-container
  - a webview-based container that shows how to use oneput within a native context
  
There are applications which are used mostly to demo the code in packages/.

- apps/jsed-demo


## Build and test commands

There's a root `Taskfile.yml`.

- `task check`
- `task test`
  - should be fast narrow social unit tests; one way to a
  - we will add separate tasks for running slower tests
- `task build`

## Code style guidelines

- In general apply the "nullables algorithm" in order to follow the nullables pattern - see `.agents/skills/nullables` .  This is a way to write code that is highly testable with narrow sociable unit tests with no mocks.
- Use neverthrow to type check errors not just the happy path.
- If a package is using effect-ts then we use that instead of neverthrow and it will replace a lot of the create-logic in the nullables pattern.

## Testing instructions

Testing Approach

- Use vitest with AAA pattern (// arrange, // act, // assert with blank lines between)
- Test intentions, not exhaustively - focus on core behaviors
- No mocks - see the nullables skill
- Ask what the most important tests are before writing
- Keep test count small and focused


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

## Security considerations
