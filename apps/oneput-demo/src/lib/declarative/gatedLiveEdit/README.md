# Gated live-edit sketch

On `STARTED`, the machine loads a profile from an in-memory store. If the load
fails, activate the retry row to load again. After a load, the shared input
filters the menu until you activate a field. The field claims the input and
each `INPUT_CHANGED` updates its draft. Preview shows the current row values.

Suppose the store loads **Grace Hopper** and you activate **Name**. Type
**Grace Murray Hopper**, then activate **Name** again to save. If the save
fails, the full menu stays visible and the input keeps **Grace Murray Hopper**.
The Name row shows the registered `CircleAlert` icon and the detail
**Could not save. Activate to retry.** Press Back to open **Changes not
saved**, then select **Keep editing** to return to the draft. Activate the
Name row to retry. After the save succeeds, the menu returns to filtering
with the new name.

If you want to drop the draft after a failed save, press Back and select
**Discard "Grace Murray Hopper"**. The menu returns to filtering with the
last saved name, **Grace Hopper**. Pressing Back from **Changes not saved**
returns to the draft, just like **Keep editing**.

While you edit before a save failure, moving focus or pressing Back also
saves the draft. After a successful save, these actions restore the query.
Activating the edited row clears it. After a save fails, moving focus or
releasing the input claim leaves the draft in place.

The saving and failed views use `focusBehaviour: 'none'` and keep the same
menu and row IDs. The Oneput view update stub needs to retain the focused row
by ID and restore it when the confirmation closes. A save triggered by moving
focus keeps the row the user moved to. The update must also release any held
filter while keeping the saved query and the draft claim. The renderer uses
the demo's existing icon registry to show the alert.

For a headless actor, use
`gatedLiveEdit.provide({ actions: profileActions(store) })`.
`ProfileStore.createNull({ profile, failNextLoad, failNextSave, delayMs })`
sets the starting values, one-shot failures, and delay.
