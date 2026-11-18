# AppObject machines

Oneput sends each AppObject actor the events in `oneputEvents.ts`. The actor
handles the events it needs. `appObjectActor.ts` refreshes the active state's
`meta.view` through the interpreter when the actor changes.

Suppose you filter the gated editor for **Name** and activate that row.
`ITEM_ACTIVATED` enters `editing` and the view claims the input. Each
`INPUT_CHANGED` writes the value. `ITEM_FOCUSED` on a different row or `BACK`
returns to filtering and restores the query. Repeat activation ends the edit
and clears the query.

Click and keyboard action use `ITEM_ACTIVATED`. Claim writes and regular
input use `INPUT_CHANGED`. A submit by row activation uses that activation
and `INPUT_RELEASED` with reason `submit`. Host events stay app-specific.
The adapter uses `watch` and `onRefresh` to render and `hasBackLevel` to
check Back availability. Oneput must route Back and focus to the actor in
place of imperative `setOnBack` and per-row `onFocus`.
