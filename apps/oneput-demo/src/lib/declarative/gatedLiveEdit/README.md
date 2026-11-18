# Gated live-edit sketch

This sketch uses one XState machine and one AppObject. The active state's
`meta.view` selects the menu, title, input and actions. Each state repeats its
menu, actions and settings as literals so the viewer can read the machine. The sketch has no route.
The [shared interpreter](../interpreter.ts) resolves static rows and named
text sources here. The provider list and colour picker also use it for rows
from named list sources.

| Imperative example                     | Machine and interpreter                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `layout`, `settings` and `onStart`     | The view carries the title, flags and filter placeholder.                                                |
| `menu()` and `liveEdit.item()`         | Stable rows bind labels and hints to named sources and send events on activation.                        |
| `MenuLiveEdit` and its claim callbacks | The machine chooses filtering or editing. The interpreter gives Oneput claim options for the active row. |
| `values`, Preview and Reset callbacks  | Named actions update the context or emit the preview. The host passes the preview to `ctl.notify`.       |

Suppose you type `name`, then activate **Name**. The machine enters `editing`
and the row claims the input. Typing `Grace` sends `EDIT_CHANGED` and writes the
value immediately. Activate **Name** again to commit by ending the edit. The
claim releases with `submit` and clears the filter. Back or focus leave releases
the claim and restores the filter. Each of these paths keeps the written value.

`ApplyView` is a stub. It needs Oneput's AppObject refresh and scoped claim APIs
to apply the layout, menu and input as one update, retain a claim on refresh,
report automatic release, and ignore stale claim writes and releases. It needs
the input controller to clear and focus the filter input on start. It needs
menu invalidation and focus-by-ID to keep the edited row focused on activation,
submit and Back. The row builder sends text and registered icon names through
Oneput's checked renderer. Binding hints use the builder's safe-html path.

Open questions remain about the order of view refresh, claim release and focus
restoration, and how a future interpreter should choose a view if nested or
parallel states contribute metadata.
