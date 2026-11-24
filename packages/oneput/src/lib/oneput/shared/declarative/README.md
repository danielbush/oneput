# Declarative AppObjects

Write an AppObject as an XState machine whose states describe what Oneput shows. Each state's `meta.view` gives the layout params that every layout takes (`params`, such as `menuTitle`, `busy` and `input`) and the input `placeholder`, names a layout, fills the slots that layout adds and lists its menu rows; each row names the row builder that draws it, gives that builder's params in `params`, and is clickable when it has `send`, the event it sends. The machine is usually in several states at once (a parent and its active child), so the views of all the states it is in are merged, parent first, with the child's values winning. That merged view is the _active view_, and the code here turns it into Oneput calls.

- `appObjectActor.ts`: the adapter. It wraps a running actor as an AppObject: Oneput's events go into the actor, and it redraws the active view when the machine or a readable source changes (Oneput merges redraws asked for in the same turn).
- `interpreter.ts`: turns the active view into a Oneput menu, layout and input (`renderActiveView`), and defines the types a machine and its content use (`ViewDef`, `ViewSources`, `viewLayout`, `rowBuilder`, `readable`). `ViewFor<Content, Layouts, RowEvent>` gives a machine's `ViewDef` from its content and layouts.
- `oneputEvents.ts`: the standard events Oneput sends into a machine, such as `STARTED`, `BACK` and `INPUT_CHANGED`. A row sends its own event.
- `standardLayout.ts`: a ready-made layout built on Oneput's standard layout, with a `status` slot; `StandardLayout` itself draws the `menuTitle` and `busy` params. An app can register its own layouts instead.
- `standardRow.ts`: ready-made row builders: `standardRow` for a Oneput standard menu item and `infoRow` for an information message. An app registers them, often `standardRow` as `default` (the builder for rows that name no builder), or registers its own instead.
- `signalSource.ts`: adapts a TC39 signal into a readable source, for data the machine doesn't own. Needs the optional `signal-polyfill` peer.

Tests sit in `__tests__/` as `*.test.ts`; `__tests__/*.test.types.ts` hold the compile-time checks.
