# Gated live-edit sketch

On `STARTED`, the machine loads a profile from an in-memory store. If the load
fails, activate the retry row to load again. After a load, the shared input
filters the menu until you activate a field. The field claims the input and
each `INPUT_CHANGED` updates its draft. Preview shows the current row values.

Suppose the store loads **Grace Hopper** and you activate **Name**. Type
**Grace Murray Hopper**, then activate **Name** again to save. If the save
fails, the Name row still shows **Grace Murray Hopper** and offers a retry.
Activate that row again. The store saves the draft and the menu returns to
filtering with the new name.

Moving focus to another row or pressing Back also saves a draft. After a
successful save, these actions restore the query. Activating the edited row
clears it. After a save fails, Back, focus changes, and claim release all
leave the draft in place until you activate its row to retry.

For a headless actor, use
`gatedLiveEdit.provide({ actions: profileActions(store) })`.
`ProfileStore.createNull({ profile, failNextLoad, failNextSave, delayMs })`
sets the starting values, one-shot failures, and delay.
