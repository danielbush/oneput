# Colour picker sketch

This sketch uses a child AppObject in `STACK_MODE`. The parent opens a fresh
picker with `ctl.app.run`. In the picker, `meta.view` names the always-ready
`colours` list. The list supplies stable IDs, labels and selection events.
The picker uses Oneput's default input behavior.

| Routed example                            | Machine and stack                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ColourPicker.onStart` builds three rows. | The shared interpreter reads the named list and builds the rows.                                              |
| A row shows a notification and goes back. | A row sends `PICK_COLOUR`. A guard checks the ID, then an action returns `{ colour }` through `ctl.app.exit`. |
| `Form.onResume` restores the form.        | The parent checks the payload in `onResume` and sends `COLOUR_CHOSEN` to the form.                            |

Suppose you open **Pick a colour…** and select **Green**. The picker checks
`green` and exits with `{ colour: 'green' }`. Oneput resumes the same form.
The `colourResult` handler in `onResume` checks the payload and sends
`COLOUR_CHOSEN` with `colour: 'green'`. If you press Back instead, Oneput
pops the child without a payload and the parent sends no event. A malformed
payload shows an error.

The host supplies the parent event receiver and the shared `ApplyView` stub
for the picker menu, layout and settings. The sketch has no route.
