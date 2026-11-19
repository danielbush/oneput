# Colour picker sketch

The form handles `PICK_COLOUR` by opening a fresh picker on the stack.
The picker handles `ITEM_ACTIVATED` for a valid colour ID and exits with
`{ colour }`. Oneput sends the same form actor `RESUMED` with the payload.
The form checks it before updating the selected colour.

Back uses the default stack pop. The form keeps its selection when
`RESUMED` has no result. The form and picker have no custom input events.
