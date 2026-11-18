# Provider list sketch

The actor shows loading, a failure with Retry, or the providers. The Retry row
sends `RETRY_LOAD`. The data rows use `ITEM_ACTIVATED` because their IDs
already identify the selected provider. The actor checks that the ID still
exists before it emits a selection to the host.

`LOAD_SUCCEEDED`, `LOAD_FAILED` and `RENAME_PROVIDER` carry source updates.
A rename updates the label and keeps the row ID. Exit stops the actor and
cancels a pending load.
