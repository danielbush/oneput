# Gated live-edit sketch

On `STARTED`, the machine loads a profile from an in-memory store. If the load
fails, activate the retry row to load again. After a load, the shared input
filters the menu until you activate a field. The field claims the input and
each `INPUT_CHANGED` updates its draft. Preview shows the current row values.

Suppose the store loads **Grace Hopper** and you activate **Name**. Type
**Grace Murray Hopper**, then activate **Name** again to save. If the save
fails, the Name row still shows **Grace Murray Hopper** and says
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

For a headless actor, use
`gatedLiveEdit.provide({ actions: profileActions(store) })`.
`ProfileStore.createNull({ profile, failNextLoad, failNextSave, delayMs })`
sets the starting values, one-shot failures, and delay.
