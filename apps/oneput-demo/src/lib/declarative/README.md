# Declarative demo

The `/declarative` demo is a `ROUTED_MODE` app built only from declarative AppObjects and XState machines. `machine.ts` is the statechart; `router.ts` connects it to Oneput with `common/router.ts` and `routeMachine`. It has zero imperative `AppObject` classes and no `STACK_MODE` children.

## How it differs from `/routed`

- **Pure router**: the machine in `machine.ts` has zero `meta.view`; it only invokes screens and chooses the next one. By contrast, `/routed` uses `ROUTED_IMP` classes (`Welcome`, `Form`, `Confirm`, `Done`) and a `ROUTED_GROUP` (`form`).
- **Every screen is `ROUTED_DECL`**: `root`, `search` and `katex` invoke child machines (`rootMenu`, `asyncSearch`, `katexStub`). Each route entry is a `fromChild` from `common/declarative.ts`; `createAsyncSearchApp` takes the host's `search` and `online`. The root menu's output (`search` or `katex`) selects the next screen; when a demo reaches its `final` state, `onDone` returns to `root`.
- **No root-exit recovery**: `_init.ts` registers no `setOnRootExit` handler and `machine.ts` has no `EXITED` transition (unlike `/routed`'s `Done` "Exit anyway" demo). Attached declarative AppObjects never call `ctl.app.exit()`, so Back stays hidden on `root` and appears only inside children that handle `BACK`.
