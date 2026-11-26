# Routed demo

The `/routed` demo shows a `ROUTED_MODE` app driven by a single XState machine and `routeMachine`. `machine.ts` is the statechart (`flowMachine` below). `createRouter` in `router.ts` gives it a route map and uses `createActorRouter` from Oneput to run it, and returns the handle for `_init.ts`. Each routed AppObject only sends events to the machine; the machine decides which screen to show.

## Patterns demonstrated

- **`ROUTED_IMP`**: Plain imperative AppObjects mapped directly to machine states (`welcome` → `apps/Welcome.ts`, `done` → `apps/form/Done.ts`, and the `form` leaf states `apps/form/Form.ts` and `apps/form/Confirm.ts`). Each receives `send` to dispatch events (`NEXT`, `BACK`, `RESTART`, `SEARCH`) to `flowMachine`.
- **`ROUTED_GROUP`**: Nested states inside `flowMachine` (`form: { editing, confirm }`) mapped to a matching nested object in the route map. One machine owns the whole flow while `routeMachine` resolves the active leaf.
- **`ROUTED_DECL`**: The `search` state invokes `asyncSearch` as a child actor. `createAsyncSearchApp` gives its machine and its `fromChild` route entry. When the child reaches its `final` state, `onDone` returns `flowMachine` to `welcome`.
- **`STACK_MODE` child inside `ROUTED_MODE`**: `apps/form/Form.ts` pushes `apps/form/ColourPicker.ts` onto the stack with `ctl.app.run`. Routing pauses while the child is open and resumes when the child closes, without changing machine state.

Routed AppObjects should not call `ctl.app.exit()` — send an event to the machine instead. If one ever does exit the root, `ctl.app.setOnRootExit` is available to catch it.

`ROUTED_REC` (`fromChild(id, AppMap)` for a nested `ROUTED_MODE` child machine) is not demonstrated here yet.
