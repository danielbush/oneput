import { assign, emit, setup, type ActionArgs } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import {
  ProfileStore,
  type Profile,
  type ProfileLoadError,
  type ProfileSaveError
} from './profileStore.js';
import {
  draftIsDirty,
  fieldFor,
  fieldId,
  fieldValue,
  saveId,
  sources,
  type EditContext
} from './sources.js';

type Preview = { type: 'preview'; message: string };
type LiveEditEvent =
  | OneputEvent
  | { type: 'LOAD_SUCCEEDED'; profile: Profile }
  | { type: 'LOAD_FAILED'; error: ProfileLoadError }
  | { type: 'SAVE_SUCCEEDED'; profile: Profile }
  | { type: 'SAVE_FAILED'; error: ProfileSaveError };
type LiveEditView = ViewDef<
  keyof typeof sources.text,
  keyof typeof sources.lists,
  keyof typeof sources.release
>;
type ProfileActionArgs = ActionArgs<EditContext, LiveEditEvent, LiveEditEvent>;

/** Link the named load and save actions to a store for the demo or a headless actor. */
export function profileActions(store: ProfileStore) {
  return {
    loadProfile({ self }: ProfileActionArgs) {
      void store.load().then((result) => {
        self.send(
          result.isOk()
            ? { type: 'LOAD_SUCCEEDED', profile: result.value }
            : { type: 'LOAD_FAILED', error: result.error }
        );
      });
    },
    saveProfile({ context: { draft }, self }: ProfileActionArgs) {
      if (draft === null) return;
      void store.save(draft).then((result) => {
        self.send(
          result.isOk()
            ? { type: 'SAVE_SUCCEEDED', profile: result.value }
            : { type: 'SAVE_FAILED', error: result.error }
        );
      });
    }
  };
}

function activatesSave(event: LiveEditEvent) {
  return event.type === 'ITEM_ACTIVATED' && event.id === saveId;
}

/** XState implementations for the names in the machine document. */
export const liveEdit = setup({
  types: {
    context: {} as EditContext,
    events: {} as LiveEditEvent,
    emitted: {} as Preview,
    meta: {} as { view?: LiveEditView }
  },
  guards: {
    activatesField: ({ event }) => event.type === 'ITEM_ACTIVATED' && fieldFor(event.id) !== null,
    activatesOwner: ({ context, event }) =>
      event.type === 'ITEM_ACTIVATED' && fieldId(context.edit?.field ?? null) === event.id,
    activatesPreview: ({ context, event }) =>
      context.profile !== null &&
      event.type === 'ITEM_ACTIVATED' &&
      event.id === 'live-edit-mixed-preview',
    activatesSave: ({ event }) => activatesSave(event),
    activatesLoadRetry: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-retry-load',
    activatesDiscard: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-discard',
    activatesKeepEditing: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-keep-editing',
    userFocusLeftOwner: ({ context, event }) =>
      context.edit !== null &&
      event.type === 'ITEM_FOCUSED' &&
      event.menuId === 'live-edit-mixed-menu' &&
      (event.cause === 'keyboard' || event.cause === 'pointer') &&
      fieldId(context.edit.field) !== event.id,
    ownerReleasedForCommit: ({ context, event }) =>
      context.edit !== null &&
      event.type === 'INPUT_RELEASED' &&
      fieldId(context.edit.field) === event.id &&
      (event.reason === 'submit' || event.reason === 'back' || event.reason === 'focus-changed'),
    draftIsDirty: ({ context }) => draftIsDirty(context),
    saveWasActivatedWithChanges: ({ context, event }) =>
      activatesSave(event) && draftIsDirty(context),
    leftFieldWithBack: ({ context }) => context.releaseReason === 'back'
  },
  actions: {
    ...profileActions(ProfileStore.create()),
    storeProfile: assign(({ event }) =>
      event.type === 'LOAD_SUCCEEDED' ? { profile: event.profile, draft: event.profile } : {}
    ),
    startEdit: assign(({ context, event }) => {
      if (context.draft === null || event.type !== 'ITEM_ACTIVATED') return {};
      const field = fieldFor(event.id);
      return field === null ? {} : { edit: { field, value: context.draft[field] } };
    }),
    writeEdit: assign(({ context, event }) =>
      event.type === 'INPUT_CHANGED' && context.edit !== null
        ? { edit: { ...context.edit, value: event.value } }
        : {}
    ),
    commitEdit: assign(({ context }) =>
      context.draft !== null && context.edit !== null
        ? { draft: { ...context.draft, [context.edit.field]: context.edit.value } }
        : {}
    ),
    submitEdit: assign({ releaseReason: 'submit' }),
    backFromEdit: assign({ releaseReason: 'back' }),
    leaveEdit: assign({ releaseReason: 'focus-changed' }),
    finishEdit: assign(({ event }) =>
      event.type === 'INPUT_RELEASED' ? { releaseReason: event.reason } : {}
    ),
    restoreQuery: assign({ releaseReason: 'released' }),
    storeSave: assign(({ event }) =>
      event.type === 'SAVE_SUCCEEDED'
        ? { profile: event.profile, draft: event.profile, edit: null, releaseReason: 'submit' }
        : {}
    ),
    discardDraft: assign(({ context }) => ({
      draft: context.profile,
      edit: null,
      releaseReason: 'back'
    })),
    preview: emit(({ context }) => ({
      type: 'preview',
      message: `${fieldValue(context, 'name')} — ${fieldValue(context, 'role')}`
    }))
  }
});
