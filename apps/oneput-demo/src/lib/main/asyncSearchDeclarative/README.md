# Declarative async search

The async search demo written as a declarative AppObject: an XState machine whose states describe what Oneput shows.

- `machine.ts`: the states and transitions, as data. Each state's `meta.view` names a layout, fills its slots and lists its menu rows by name.
- `actions.ts`: the implementations behind the machine's names: actions, guards, delays and the `fetchResults` actor, which calls the search service.
- `content.ts`: the named content the views refer to: `slot` for slot values, `menu` for rows that come from data, and `menuItem` builders for rows drawn in a custom way.
- `appObject.ts`: connects the machine to Oneput with `appObjectActor`, passing the content, the layouts and the default row builder.
- `__tests__/appObject.test.ts`: tests the AppObject through Oneput, with a null search service.

The search itself is a plain service in `../../service/SearchService.ts`, which knows nothing about Oneput.
