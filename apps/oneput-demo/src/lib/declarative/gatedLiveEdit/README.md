# Gated live-edit form

On `STARTED`, the machine loads a profile from an in-memory store. If the load
fails, activate the retry row to load again. After a load, the form enters
`ready.filtering` and the shared input filters the menu.

Suppose the store loads **Grace Hopper**. Activate **Name** and type **Ada** in
`ready.editing`. Activate **Name** again, release the field input, or move focus
to another row to keep the change in the draft and return to filtering.
**Preview values** shows the values currently in the menu. **Save** is enabled
when the current values differ from the saved profile.

Activate **Save** to write the full draft in one operation. The menu and focus
stay in place in `ready.saving`. If the save fails, `ready.saveFailed` keeps the
full draft and shows the `CircleAlert` icon and **Could not save. Activate to
retry.** on the focused **Save** row. Activate **Save** again to retry, or activate
a field to edit it. A successful save returns to filtering and disables **Save**.

Oneput handles Back when the draft matches the saved profile. With unsaved
changes, Back opens **Changes not saved**. Select **Discard** to restore the
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
