# Declarative AppObjects

Write an AppObject as an XState machine whose states describe what Oneput shows. Each state's `meta.view` names a layout, fills its slots and lists its menu rows. The machine is usually in several states at once (a parent and its active child), so the views of all the states it is in are merged, parent first, with the child's values winning. That merged view is the _active view_, and the code here turns it into Oneput calls.

- `appObjectActor.ts`: the adapter. It wraps a running actor as an AppObject: Oneput's events go into the actor, and it redraws the active view when the machine or a readable source changes (Oneput merges redraws asked for in the same turn).
- `interpreter.ts`: turns the active view into a Oneput menu, layout and input (`renderActiveView`), and defines the types a machine and its content use (`ViewDef`, `ViewSources`, `viewLayout`, `readable`).
- `oneputEvents.ts`: the standard events Oneput sends into a machine, such as `STARTED`, `BACK`, `ITEM_ACTIVATED` and `INPUT_CHANGED`.
- `standardLayout.ts`: a ready-made layout built on Oneput's standard layout. An app can register its own layouts instead.
- `standardRow.ts`: a ready-made builder for rows that name no builder. An app can pass its own instead.
- `signalSource.ts`: adapts a TC39 signal into a readable source, for data the machine doesn't own. Needs the optional `signal-polyfill` peer.

Tests sit in `__tests__/` as `*.test.ts`; `__tests__/interpreter.test.types.ts` holds the compile-time checks.
