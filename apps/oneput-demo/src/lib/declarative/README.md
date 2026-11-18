# AppObject machines

Oneput sends each AppObject actor the events in `oneputEvents.ts`. The actor
handles the events it needs. When the actor changes, `appObjectActor.ts` uses
the interpreter to combine `meta.view` from the active parent and child
states. A child can change individual settings and menu fields. A child
row with the same ID changes only the specified fields and keeps its
position. Define fixed rows in the view and use sources for changing values
and lists of rows from data.

Suppose the profile loads and you filter the gated editor for **Name** and
activate that row.
`ITEM_ACTIVATED` enters `editing` and the view claims the input. Each
`INPUT_CHANGED` writes the field text. Activate **Name** again to update the
form draft and clear the query. Activate **Save** to save all draft values
together. If the write fails, **Save** offers a retry. See the
[gated live-edit form](./gatedLiveEdit/README.md) for the complete flow.

Click and keyboard action use `ITEM_ACTIVATED`. Claim writes and regular
input use `INPUT_CHANGED`. A submit by row activation uses that activation
and `INPUT_RELEASED` with reason `submit`. Host events stay app-specific.
The adapter uses `watch` and `onRefresh` to render and `hasBackLevel` to
check Back availability. Oneput must route Back and focus to the actor in
place of imperative `setOnBack` and per-row `onFocus`.
