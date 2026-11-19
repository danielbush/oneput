# Async search AppObject

Open the Oneput demo menu and select **Async menu items demo (declarative)...**.
The original demo is beside it. The runnable AppObject, machine, actions,
and sources are in [main/asyncSearch](../../main/asyncSearch).

Type text to start a 500 ms debounce. Then the search starts and the input
area shows **Fetching data...**. The demo service returns a row for each
character and simulates a 30% failure rate. On failure, the menu shows
**Retry search** with the error detail. Activate that row to retry the
current query, or type a new query.

Suppose you type `ap` and then type `app` while the first fetch is pending.
The machine stops the first request actor and debounces the new input.
The first service request can still finish, but its result cannot replace
the results for `app`. When rows appear, Oneput focuses the last result.
Activate a result to show **Selected: …** and clear the input.

When you close the menu, edits to the input do not reach the machine.
Reopening it shows the current view. The next edit searches the full
input value. The adapter checks the immediate menu state when it receives
each edit.
