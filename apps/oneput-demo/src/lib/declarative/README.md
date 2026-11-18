# Three AppObject sketches

Each sketch shows a view with a title, stable row IDs and named events. The
shared interpreter reads one active `meta.view` and builds the Oneput view
from the actor snapshot. The differences show where a pattern needs settings.

| Concern                      | Gated live edit                                                                        | Provider list                                                                         | Colour picker                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Start, suspend, resume, exit | Starts in filtering. Claim lifetime needs Oneput wiring.                               | Loads and refreshes on actor updates. Exit stops the actor and any pending load.      | Opens as a fresh stack child. The form suspends and resumes. The child stops on exit. |
| Input                        | Filters, then a row claims the input for editing.                                      | Inherits the input.                                                                   | Inherits the input.                                                                   |
| Load states                  | Values are ready in context.                                                           | Loading, failed with retry, ready with rows or empty. Rename updates the same row ID. | Choices are always ready.                                                             |
| Result to parent             | Preview emits a message for the host.                                                  | Selection sends a provider ID event.                                                  | Selection exits with a checked value. The parent maps it to an event in `onResume`.   |
| Back and exit                | Back first releases the claim and restores the filter. Later Back follows stack rules. | This root view disables Back.                                                         | Stack Back exits with no payload.                                                     |

## Candidate patterns

```js
// Filter a menu, then let an activated row claim input. Keep edits as typed.
gatedLiveEdit({ fields, readValue, writeValue, release, restoreFilter });

// Load rows, show pending, failed and empty views, and select by stable ID.
loadList({ from, retry, loading, failed, empty, select });

// Open an always-ready list as a child. The parent supplies the resume mapping.
stackPicker({ from, select, checkResult, onResume });
```

Suppose the provider list refreshes after a rename. It needs the same
refresh path as a live-edit value change. Suppose a form opens the picker.
It also needs the current view to refresh when it resumes, with the result
applied before that refresh.

Oneput's lifecycle machine would own start → active → suspend while a child
runs → resume → active → exit. It would own when to subscribe, refresh,
detach and clean up, restore menu and input focus, and deliver a child's
payload once. It would follow stack Back rules when the current claim or
view does not handle Back.

A pattern would own its view states, source and input policy, selection and
retry events, and claim or result rules. The host would supply named domain
code and decide which event a child result means.

Open questions include whether load states belong in the source or the view
machine, whether suspension cancels a load or lets it finish, and the order
of claim release, refresh and focus restoration. The sketches each resolve
one active view. Nested or parallel states still need a rule for selecting it.
