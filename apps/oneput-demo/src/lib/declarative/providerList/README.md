# Provider list sketch

The list uses one XState actor and one AppObject. The active state's
`meta.view` shows loading, a failure with Retry, or the ready list. The
ready view names the `providers` source and includes the empty message.
This sketch puts load states in the machine so they are visible in Stately.
The provider flow in the plan puts those branches in the source-backed menu.

| AppObject work                     | Machine and interpreter                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Start a load and show its result   | A named actor starts the source. It runs again on Retry.                                                                             |
| Build rows and refresh on a rename | The interpreter reads the named projection from the current snapshot. Oneput's `watch` calls for a refresh when the actor changes.   |
| Handle row activation              | The row sends `SELECT_PROVIDER` with its ID. A guard checks that the ID still exists before the machine emits the event to the host. |

Suppose the host opens the list with `simulateProviderLoad({ failFirst: true })`.
It shows **Loading providers…**, then **Providers unavailable** with the detail
**Try again**. Select **Retry**. The list shows loading again, then **OpenAI**
and **Anthropic**. Call `rename('openai', 'OpenAI demo')` while the list is open.
The label changes and the row keeps ID `openai`. Selecting it sends
`SELECT_PROVIDER { providerId: 'openai' }` while the list stays open.
With `simulateProviderLoad({ empty: true })`, a successful load shows
**No providers**.

The host supplies `ApplyView` to apply the resolved menu, layout and flags.
The sketch has no route. It uses a cancellable timer for the source. Exit stops
the actor and cancels a pending load. Back is disabled because the list is the
root of the proposed provider flow.
