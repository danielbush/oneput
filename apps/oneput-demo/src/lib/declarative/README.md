# Declarative demo

The `/declarative` demo is a `ROUTED_MODE` app built only from declarative AppObjects and XState machines (`appMachine.ts` + `routeMachine`). It has zero imperative `AppObject` classes and no `STACK_MODE` children.

## How it differs from `/routed`

- **Declarative root menu**: `root` renders directly from `appMachine`'s own `meta.view` via `attachAppObjectActor`. By contrast, `/routed` uses `ROUTED_IMP` classes (`Welcome`, `Form`, `Confirm`, `Done`) and a `ROUTED_GROUP` (`form`).
- **All sub-screens are `ROUTED_DECL`**: `search` and `katex` invoke child actors (`asyncSearch` and `katexStub`) wired through `fromChild(..., (_, child) => attach...)`. When a child reaches its `final` state, `onDone` returns `appMachine` to `root`.
- **No root-exit recovery**: `_init.ts` registers no `setOnRootExit` handler and `appMachine` has no `EXITED` transition (unlike `/routed`'s `Done` "Exit anyway" demo). Attached declarative AppObjects never call `ctl.app.exit()`, so Back stays hidden on `root` and appears only inside children that handle `BACK`.
