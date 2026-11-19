# Async search AppObject

| Original async menu demo                                                                                                                                                                                                                                                                      | Declarative sketch                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oneput starts with instructions and focuses the input. The generator skips blank or whitespace-only input and ignores changes while the menu is closed.                                                                                                                                       | The shared input view keeps the placeholder. `empty` shows the instructions. A closed-menu edit discards stale work and waits for typing with the menu open to start a search.          |
| The generator waits 500 ms after typing, then calls `TestInputService` with the raw input. The service returns one row per string code unit. The first request has a 2 s success delay and later requests take 1 s. The simulated failure rate is 30%, although the old instructions say 10%. | `debouncing` uses a named XState delay. `fetching` invokes the search actor. The typed service wrapper calls the original service.                                                      |
| The input area shows **Debouncing...**, **Fetching data...**, **Ready** and a spinner while busy.                                                                                                                                                                                             | State views set the outer-right status and the input-right spinner. Typing clears the previous rows while the current query is pending.                                                 |
| The menu focuses the last result. Selecting a row shows **Selected: …**. Oneput clears the input after the action. A successful empty response gives an empty menu.                                                                                                                           | `results` uses the named result list and each row sends `ITEM_ACTIVATED`. `noResults` has an empty menu and **Ready** status.                                                           |
| An error opens an alert and shows **⚠️ Error**. The input refresh icon closes the alert and re-runs the input through the same debounce.                                                                                                                                                      | `error` shows **⚠️ Error** in the input area and puts a **Retry search** row with the refresh icon and error detail in the same menu. The row sends `RETRY_SEARCH` and keeps the query. |

Suppose you type `ap` and its fetch starts. Type `app` before the fetch
returns. That input stops the `ap` actor immediately and starts a fresh
debounce. The original service can still finish, but its stopped actor
cannot send a result or failure to the machine. The `app` fetch fails.
Activate **Retry search** to debounce and fetch `app` again.

The failure follows an action that needs the result, so the NFR allows
showing it at the search input. A modal interrupts typing and takes over the
screen. The inline status and refresh row keep the input available and let
the user retry or type a different query.

## Open questions

- Where should the host apply the outer-right status and input-right spinner in
  the same update as the menu, while keeping the input focused?
- Should a shared input-action slot eventually let Retry sit beside the status?
