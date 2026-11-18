# Gated live-edit form

On `STARTED`, the machine loads a profile from an in-memory store. If the load
fails, the retry row sends `RETRY_LOAD`. After a load, the form enters
`ready.filtering` and the shared input filters the menu.

Suppose the store loads **Grace Hopper**. Activate **Name** to send
`EDIT_FIELD` with `field: name`, then type **Ada** in
`ready.editing`. The invoked [gated field editor](../patterns/gatedFieldEdit.ts)
keeps the input text. Activate **Name** again, release the field input, move
focus away, or press Back to complete the edit. The form commits the result
to the draft and returns to filtering.
**Preview values** shows the values currently in the menu. **Save** is enabled
when the current values differ from the saved profile.

Activate **Save** to write the full draft in one operation. The menu and focus
stay in place in `ready.saving`. If the save fails, `ready.saveFailed` keeps the
full draft and shows the `CircleAlert` icon and **Could not save. Activate to
retry.** on the focused **Save** row. Activate **Save** again to retry, or activate
a field to edit it. A successful save returns to filtering and disables **Save**.

From filtering, Oneput handles Back when the draft matches the saved profile.
With unsaved changes, Back opens **Changes not saved**, including after it
completes an active field edit. Select **Discard** to restore the
saved values and return to filtering. Select **Keep editing**, or press Back
again, to return to filtering or to the save error.

The `ready` view defines the four profile rows. Its child states inherit those
rows and change the input mode or a row property. Text and enabled bindings
read from the draft, the current field edit, or the saved profile. Saving and
save failure claim the disabled input for **Save** so the last edited value
stays visible. The profile menu retains focus by row ID and restores it after
the confirmation menu closes.

For a headless actor, use
`gatedLiveEdit.provide({ actions: profileActions(store) })`.
`ProfileStore.createNull({ profile, failNextLoad, failNextSave, delayMs })`
sets the starting values, one-shot failures, and delay.
