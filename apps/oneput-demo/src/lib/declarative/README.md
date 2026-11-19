# AppObject machines

The [async search demo](./asyncSearch/README.md) runs through the shared
Oneput declarative module. This folder holds sketches for other AppObjects.

The shared module defines the event vocabulary in
`@oneput/oneput/shared/declarative/oneputEvents.js`. In the sketches, the
actor handles the events it needs. When the actor changes, `appObjectActor.ts` uses
the interpreter to combine `meta.view` from the active parent and child
states. A child can change individual settings and menu fields. A child
row with the same ID changes only the specified fields and keeps its
position. Define fixed rows in the view and use sources for changing values
and lists of rows from data.

A machine owns only its screen state. Oneput owns its state and gives the machine what it needs through events.

Suppose the profile loads and you filter the gated editor for **Name** and
activate that row.
`EDIT_FIELD` enters `editing` and the view claims the input. Each
`INPUT_CHANGED` writes the field text. Activate **Name** again to update the
form draft and clear the query. Activate **Save** to save all draft values
together. If the write fails, **Save** offers a retry. See the
[gated live-edit form](./gatedLiveEdit/README.md) for the complete flow.

Click and keyboard activation send the row’s literal `send` event. Rows with
`activate: true` and no named event send `ITEM_ACTIVATED` with their row ID.
Claim writes and regular input use `INPUT_CHANGED`. Oneput can also send
`INPUT_RELEASED` with reason `submit` when it releases the claim. Host events
stay app-specific.
The adapter uses `watch` and `onRefresh` to render and `hasBackLevel` to
check Back availability. Oneput must route Back and focus to the actor in
place of imperative `setOnBack` and per-row `onFocus`.

[Gated field edit](./patterns/gatedFieldEdit.ts) is the first reusable
pattern. The form invokes it and forwards `INPUT_CHANGED`, `ITEM_FOCUSED`,
`INPUT_RELEASED` and `BACK`. The pattern buffers one field and returns the
completed value. The form keeps ownership of its menu, input claim view and
profile draft. Its view sources read the child actor's snapshot during an edit.

Machine configs use literals and implementation names for actions and
guards. The pattern's `output: editResult` is the one exception. XState v5
needs a function reference to produce output from the current context.
The form sends the starting field and value through the named `beginEdit`
action, so the invocation needs no dynamic `input` mapper.
