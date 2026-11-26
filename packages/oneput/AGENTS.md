# Oneput

## Element IDs

Any ID that Oneput core gives an element must contain `oneput`, for example `oneput-layout-input-busy`. Then an ID that a host or AppObject gives cannot collide with one of Oneput's in the same keyed list.

## Demo app

`apps/oneput-demo` shows Oneput. It is not meant to be consumed. Track its issues here, in this package: security findings in `THREAT_MODEL.md`, and other issues in this package's docs and backlog. Do not create separate docs for the demo.

## Docs

- `docs/CONCEPTS.md` — shared concepts, vocabulary, and design rationale (owned by the human; propose new terms before adding them).
- `THREAT_MODEL.md` and `docs/safe-content.md` — security boundaries, sanitisation policy, and safe UI content rules.
- `TESTING.md` — high-level testing policy.
- `packages/oneput-skill/SKILL.md` — portable consumer guide for building with Oneput. Update it when the public API or recommended consumer patterns change; keep repo-specific paths and internal implementation details out of it.

## System map

Read the entry file's JSDoc for contracts and edge cases, and `docs/CONCEPTS.md` for design rationale. Paths in the **Entry point** column are under `packages/oneput/src/lib/oneput/`; paths in **Concepts / Docs** are relative to `packages/oneput/`.

| System                   | Entry point                                                                                                                                               | Concepts / Docs                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Controller & events      | `controllers/controller.ts`, `controllers/InternalEventEmitter.ts`                                                                                        | —                                            |
| App stack & routing      | `controllers/AppController.ts`, `types.ts`, `shared/routing/routeApp.ts`, `shared/routing/xstate/routeMachine.ts`, `shared/routing/xstate/actorRouter.ts` | `STACK_MODE`, `ROUTED_MODE`, `BACK_HANDLING` |
| Declarative AppObject    | `shared/declarative/appObjectActor.ts`, `shared/declarative/interpreter.ts`, `shared/declarative/standardLayout.ts`                                       | —                                            |
| Bindings                 | `controllers/KeysController.ts`, `lib/bindings.ts`, `shared/actions/OneputActionProvider.ts`, `shared/bindings/BindingsIDB.ts`                            | `ENTER_SEMANTICS`, `PROVIDER_PATTERN`        |
| Input claims & live edit | `controllers/helpers/InputClaims.ts`, `shared/behaviors/liveEdit/`                                                                                        | `INPUT_CLAIM`, `LIVE_EDIT`                   |
| Pull rows                | `lib/pull.ts`, `shared/components/mountContext.ts`, `shared/ui/menuItems/pull/`                                                                           | `PULL_OBJECT`, `CONTROLLED_PATTERN`          |
| Standard layout          | `shared/ui/layout/StandardLayout.ts`, `shared/ui/buttons.ts`                                                                                              | Layout params vs direct UI                   |
| Safe UI content & icons  | `lib/domSafety.ts`, `lib/icons.ts`                                                                                                                        | `docs/safe-content.md`, `THREAT_MODEL.md`    |
