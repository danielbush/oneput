# Provider list sketch

The actor shows loading, a failure with Retry, or the providers. Retry and
provider selection both use `ITEM_ACTIVATED`. The actor checks the row ID
before it retries or emits a selection to the host.

`LOAD_SUCCEEDED`, `LOAD_FAILED` and `RENAME_PROVIDER` carry source updates.
A rename updates the label and keeps the row ID. Exit stops the actor and
cancels a pending load.
