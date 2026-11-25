# Declarative async search

The async search demo written as a declarative AppObject: an XState machine whose states describe what Oneput shows.

- `machine.ts`: the states and transitions, as data. Each state's `meta.view` gives the shared layout params (`params`: the title and `busy`) and the input `placeholder`, names a layout, fills its `status` slot and lists its menu rows by name. Each result row sends `RESULT_ACTIVATED` with its ID.
- `actions.ts`: the implementations behind the machine's names: actions, guards, delays and the `fetchResults` actor, which calls the search service. Its view type is `ViewFor<SearchContent, typeof viewLayouts, RowEvent>`.
- `content.ts`: the named content the views refer to: `slot` for layout params, slot values and row params, `menu` for rows that come from data, and the `menuItem` row builders (`default` for rows that name no builder, `info`, and a custom `result` builder).
- `appObject.ts`: connects the machine to Oneput with `appObjectActor`, passing the content and the layouts.
- `__tests__/appObject.test.ts`: tests the AppObject through Oneput, with a null search service.

The search itself is a plain service in `../../service/SearchService.ts`, which knows nothing about Oneput.
