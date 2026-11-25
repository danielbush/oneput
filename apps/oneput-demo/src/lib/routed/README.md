# Routed demo

The `/routed` demo shows a `ROUTED_MODE` app driven by a single XState machine (`flowMachine`) and `routeMachine`. Each routed AppObject only sends events to the machine; the machine decides which screen to show.

## Patterns demonstrated

- **`ROUTED_IMP`**: Plain imperative AppObjects mapped directly to machine states (`welcome` → `Welcome.ts`, `done` → `form/Done.ts`, and the `form` leaf states `Form.ts` and `Confirm.ts`). Each receives `send` to dispatch events (`NEXT`, `BACK`, `RESTART`, `SEARCH`) to `flowMachine`.
- **`ROUTED_GROUP`**: Nested states inside `flowMachine` (`form: { editing, confirm }`) mapped to a matching nested object in `routeFlow`. One machine owns the whole flow while `routeMachine` resolves the active leaf.
- **`ROUTED_DECL`**: The `search` state invokes `asyncSearch` (`createAsyncSearchMachine()`) as a child actor and wires it through `fromChild('search', ...)` with `attachAsyncSearchAppObject`. When the child reaches its `final` state, `onDone` returns `flowMachine` to `welcome`.
- **`STACK_MODE` child inside `ROUTED_MODE`**: `Form.ts` pushes `form/ColourPicker.ts` onto the stack with `ctl.app.run`. Routing pauses while the child is open and resumes when the child closes, without changing machine state.
- **Root-exit recovery**: Routed AppObjects should not exit the root. `form/Done.ts` calls `ctl.app.exit()` to demonstrate recovery: `routeMachine` stops, `ctl.app.setOnRootExit` in `_init.ts` sends `EXITED` to `flowMachine` (which transitions to `welcome`), and `routeFlow` starts again.

`ROUTED_REC` (`fromChild(id, AppMap)` for a nested `ROUTED_MODE` child machine) is not demonstrated here yet.

## Files

- `_init.ts`: Keeps all Oneput and XState setup in plain TypeScript outside `+page.svelte` (actor lifecycle, `routeFlow`, `setOnRootExit`, placeholder, and teardown).
- `flowMachine.ts`: Defines `flowMachine` and `routeFlow`, which maps machine states to AppObjects with `routeMachine`.
- `Welcome.ts`: Start screen (`welcome`) that routes to the form or declarative async search.
- `form/Form.ts`: First form step (`form.editing`) that opens `ColourPicker` as a stack child or moves to `confirm`.
- `form/ColourPicker.ts`: `STACK_MODE` child AppObject pushed from `Form.ts`.
- `form/Confirm.ts`: Second form step (`form.confirm`) that returns to `editing` or finishes in `done`.
- `form/Done.ts`: Final form screen (`done`) that can restart, go back, or trigger a root exit with `ctl.app.exit()`.
- `__tests__/flowMachine.test.ts`: Tests `ROUTED_DECL` search transitions, parent-driven exit, and `reenter: true` through Oneput with null dependencies.
