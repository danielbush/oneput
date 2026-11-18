# Gated live-edit sketch

The machine filters the menu until `ITEM_ACTIVATED` names an editable row.
The editing view claims the input and `INPUT_CHANGED` updates the value.
Focus leaving the row and Back restore the filter. Repeat activation clears
it. If Oneput releases the current claim on its own, `INPUT_RELEASED` returns
the machine to filtering.

Preview and Reset also use `ITEM_ACTIVATED`. Preview emits a message for the
host. Reset restores the example values. The machine has no custom input
events.
