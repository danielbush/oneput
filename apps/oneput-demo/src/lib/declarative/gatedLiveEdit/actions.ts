import { assign, emit, raise, setup, type ActionArgs } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import {
  ProfileStore,
  type Profile,
  type ProfileLoadError,
  type ProfileSaveError
} from './profileStore.js';
import {
  fieldFor,
  fieldId,
  fieldValue,
  isDirty,
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
  keyof typeof sources.release,
  keyof typeof sources.enabled
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

function editReleaseReason(event: LiveEditEvent) {
  switch (event.type) {
    case 'ITEM_ACTIVATED':
      return 'submit';
    case 'ITEM_FOCUSED':
      return 'focus-changed';
    case 'BACK':
      return 'back';
    case 'INPUT_RELEASED':
      return event.reason;
    default:
      return 'released';
  }
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
      event.type === 'ITEM_ACTIVATED' && fieldId(context.editField) === event.id,
    activatesPreview: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-mixed-preview',
    activatesDirtySave: ({ context, event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === saveId && isDirty(context),
    activatesLoadRetry: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-retry-load',
    activatesDiscard: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-discard',
    activatesKeepEditing: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-keep-editing',
    userFocusLeftOwner: ({ context, event }) =>
      context.editField !== null &&
      event.type === 'ITEM_FOCUSED' &&
      event.menuId === 'live-edit-mixed-menu' &&
      (event.cause === 'keyboard' || event.cause === 'pointer') &&
      fieldId(context.editField) !== event.id,
    ownerReleasedForCommit: ({ context, event }) =>
      context.editField !== null &&
      event.type === 'INPUT_RELEASED' &&
      fieldId(context.editField) === event.id &&
      (event.reason === 'submit' ||
        event.reason === 'back' ||
        event.reason === 'focus-changed' ||
        event.reason === 'released'),
    isDirty: ({ context }) => isDirty(context)
  },
  actions: {
    ...profileActions(ProfileStore.create()),
    storeProfile: assign(({ event }) =>
      event.type === 'LOAD_SUCCEEDED' ? { profile: event.profile, draft: event.profile } : {}
    ),
    startEdit: assign(({ context, event }) => {
      if (context.draft === null || event.type !== 'ITEM_ACTIVATED') return {};
      const field = fieldFor(event.id);
      return field === null ? {} : { editField: field, editValue: context.draft[field] };
    }),
    writeEdit: assign(({ event }) =>
      event.type === 'INPUT_CHANGED' ? { editValue: event.value } : {}
    ),
    commitEdit: assign(({ context, event }) => {
      const { draft, editField, editValue } = context;
      if (draft === null || editField === null) return {};
      return {
        draft: { ...draft, [editField]: editValue },
        editField: null,
        releaseReason: editReleaseReason(event)
      };
    }),
    checkBackFromDraft: raise({ type: 'BACK' }),
    storeSave: assign(({ event }) =>
      event.type === 'SAVE_SUCCEEDED'
        ? {
            profile: event.profile,
            draft: event.profile,
            editField: null,
            editValue: '',
            releaseReason: 'submit'
          }
        : {}
    ),
    discardDraft: assign(({ context }) => ({
      draft: context.profile,
      editField: null,
      editValue: '',
      releaseReason: 'back'
    })),
    preview: emit(({ context }) => ({
      type: 'preview',
      message: `${fieldValue(context, 'name')} — ${fieldValue(context, 'role')}`
    }))
  }
});
