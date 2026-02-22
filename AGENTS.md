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

- We try to use the nullables pattern - see .agents/skills/nullables .  This is way to write code that is highly testable with narrow sociable unit tests and no mocks.
- Use neverthrow to type check errors not just the happy path.
- If a package is using effect-ts then we use that instead of neverthrow and it will replace a lot of the create-logic in the nullables pattern.

## Testing instructions

Testing Approach

- Use vitest with AAA pattern (// arrange, // act, // assert with blank lines between)
- Test intentions, not exhaustively - focus on core behaviors
- Use helper functions to reduce boilerplate (e.g., `keyEvent()`, `createBindingMap()`)
- No mocks - test pure logic directly with state-based assertions
- Ask what the most important tests are before writing
- Keep test count small and focused


## Security considerations
