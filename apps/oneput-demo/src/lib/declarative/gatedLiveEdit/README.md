# Gated live-edit form

On `STARTED`, the machine loads a profile from an in-memory store. If the load
fails, activate the retry row to load again. After a load, the form is `clean`
and the shared input filters the menu.

Suppose the store loads **Grace Hopper**. Activate **Name**, type **Ada**, then
activate **Name** again to keep the edit in the draft. The form is now `dirty`
and **Save** is enabled. You can edit more fields before you save. **Preview
values** shows the values currently in the menu. Editing all fields back to
their saved values returns the form to `clean`.

Activate **Save** to write the full draft in one operation. While the form is
`saving`, the menu and focus stay in place. If the save fails, the form enters
`dirty.saveFailed`. The **Save** row keeps focus and shows the `CircleAlert`
icon with **Could not save. Activate to retry.** The shared input still shows
the last edited field value, and the draft keeps all changes. Activate **Save**
again to retry. A successful save returns to `clean` and disables **Save**.

If you press Back while the draft is dirty, the form shows **Changes not saved**.
Select **Discard** to restore the last saved values and return to `clean`. Select
**Keep editing**, or press Back again, to return to the draft.

The profile views use the same menu and row IDs and `focusBehaviour: 'none'`.
The Oneput view update stub retains the focused row by ID and restores it when
the confirmation closes. Saving and save failure use a disabled input claim
owned by the **Save** row so the last edited text stays visible. The renderer
uses the demo's existing icon registry to show the alert.

For a headless actor, use
`gatedLiveEdit.provide({ actions: profileActions(store) })`.
`ProfileStore.createNull({ profile, failNextLoad, failNextSave, delayMs })`
sets the starting values, one-shot failures, and delay.
