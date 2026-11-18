import { assign, emit, setup, type ActionArgs } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import {
  ProfileStore,
  type Profile,
  type ProfileLoadError,
  type ProfileSaveError
} from './profileStore.js';
import { fieldFor, fieldId, fieldValue, sources, type EditContext, type Field } from './sources.js';

type Preview = { type: 'preview'; message: string };
type LiveEditEvent =
  | OneputEvent
  | { type: 'LOAD_SUCCEEDED'; profile: Profile }
  | { type: 'LOAD_FAILED'; error: ProfileLoadError }
  | { type: 'SAVE_SUCCEEDED'; profile: Profile }
  | { type: 'SAVE_FAILED'; error: ProfileSaveError };
type LiveEditView = ViewDef<keyof typeof sources.text, never, keyof typeof sources.release>;
type ProfileActionArgs = ActionArgs<EditContext, LiveEditEvent, LiveEditEvent>;

function draftFor(profile: Profile, field: Field) {
  return { field, value: profile[field], saveError: null };
}

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
    saveProfile({ context: { profile, draft }, self }: ProfileActionArgs) {
      if (profile === null || draft === null) return;
      if (profile[draft.field] === draft.value) {
        self.send({ type: 'SAVE_SUCCEEDED', profile });
        return;
      }
      void store.save(draft.field, draft.value).then((result) => {
        self.send(
          result.isOk()
            ? { type: 'SAVE_SUCCEEDED', profile: result.value }
            : { type: 'SAVE_FAILED', error: result.error }
        );
      });
    }
  };
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
      event.type === 'ITEM_ACTIVATED' && fieldId(context.draft?.field ?? null) === event.id,
    activatesOtherField: ({ context, event }) =>
      event.type === 'ITEM_ACTIVATED' &&
      fieldFor(event.id) !== null &&
      fieldId(context.draft?.field ?? null) !== event.id,
    canSwitchField: ({ context, event }) =>
      context.draft?.saveError === null &&
      event.type === 'ITEM_ACTIVATED' &&
      fieldId(context.draft.field) !== event.id &&
      fieldFor(event.id) !== null,
    activatesPreview: ({ context, event }) =>
      context.profile !== null &&
      event.type === 'ITEM_ACTIVATED' &&
      event.id === 'live-edit-mixed-preview',
    activatesLoadRetry: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-retry-load',
    userFocusLeftOwner: ({ context, event }) =>
      context.draft?.saveError === null &&
      event.type === 'ITEM_FOCUSED' &&
      event.menuId === 'live-edit-mixed-menu' &&
      (event.cause === 'keyboard' || event.cause === 'pointer') &&
      fieldId(context.draft.field) !== event.id,
    ownerReleasedForCommit: ({ context, event }) =>
      context.draft?.saveError === null &&
      event.type === 'INPUT_RELEASED' &&
      fieldId(context.draft.field) === event.id &&
      (event.reason === 'submit' || event.reason === 'back' || event.reason === 'focus-changed'),
    hasNextField: ({ context }) => context.nextField !== null,
    hasSaveError: ({ context }) => context.draft?.saveError?.type === 'save-failed'
  },
  actions: {
    ...profileActions(ProfileStore.create()),
    storeProfile: assign(({ event }) =>
      event.type === 'LOAD_SUCCEEDED' ? { profile: event.profile } : {}
    ),
    startEdit: assign(({ context, event }) => {
      if (context.profile === null || event.type !== 'ITEM_ACTIVATED') return {};
      const field = fieldFor(event.id);
      return field === null ? {} : { draft: draftFor(context.profile, field) };
    }),
    writeEdit: assign(({ context, event }) =>
      event.type === 'INPUT_CHANGED' && context.draft !== null
        ? { draft: { ...context.draft, value: event.value } }
        : {}
    ),
    submitEdit: assign({ releaseReason: 'submit' }),
    backFromEdit: assign({ releaseReason: 'back' }),
    leaveEdit: assign({ releaseReason: 'focus-changed' }),
    finishEdit: assign(({ event }) =>
      event.type === 'INPUT_RELEASED' ? { releaseReason: event.reason } : {}
    ),
    queueNextEdit: assign(({ event }) =>
      event.type === 'ITEM_ACTIVATED' ? { nextField: fieldFor(event.id) } : {}
    ),
    storeSave: assign(({ event }) =>
      event.type === 'SAVE_SUCCEEDED'
        ? { profile: event.profile, draft: null, nextField: null }
        : {}
    ),
    startQueuedEdit: assign(({ context, event }) =>
      event.type === 'SAVE_SUCCEEDED' && context.nextField !== null
        ? {
            profile: event.profile,
            draft: draftFor(event.profile, context.nextField),
            nextField: null
          }
        : {}
    ),
    storeSaveFailure: assign(({ context, event }) =>
      event.type === 'SAVE_FAILED' && context.draft !== null
        ? { draft: { ...context.draft, saveError: event.error }, nextField: null }
        : {}
    ),
    preview: emit(({ context }) => ({
      type: 'preview',
      message: `${fieldValue(context, 'name')} — ${fieldValue(context, 'role')}`
    }))
  }
});
