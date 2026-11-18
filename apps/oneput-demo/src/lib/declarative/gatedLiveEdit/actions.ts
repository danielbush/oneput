import {
  assertEvent,
  assign,
  emit,
  enqueueActions,
  forwardTo,
  setup,
  type ActionArgs,
  type DoneActorEvent,
  type SnapshotEvent,
  type SnapshotFrom
} from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import { createGatedFieldEdit, type EditResult } from '../patterns/gatedFieldEdit.js';
import {
  ProfileStore,
  type Profile,
  type ProfileLoadError,
  type ProfileSaveError
} from './profileStore.js';
import {
  fieldId,
  fieldValue,
  isDirty,
  sources,
  type AfterEdit,
  type EditContext,
  type Field
} from './sources.js';

const gatedFieldEdit = createGatedFieldEdit<Field>();

type Preview = { type: 'preview'; message: string };
type RowEvent =
  | AfterEdit
  | { type: 'PREVIEW' }
  | { type: 'DISCARD' }
  | { type: 'KEEP_EDITING' }
  | { type: 'RETRY_LOAD' };
type LiveEditEvent =
  | OneputEvent
  | RowEvent
  | (SnapshotEvent<SnapshotFrom<typeof gatedFieldEdit>> & {
      type: 'xstate.snapshot.gatedFieldEdit';
    })
  | DoneActorEvent<EditResult<Field>, 'gatedFieldEdit'>
  | { type: 'LOAD_SUCCEEDED'; profile: Profile }
  | { type: 'LOAD_FAILED'; error: ProfileLoadError }
  | { type: 'SAVE_SUCCEEDED'; profile: Profile }
  | { type: 'SAVE_FAILED'; error: ProfileSaveError };
type LiveEditView = ViewDef<
  keyof typeof sources.text,
  keyof typeof sources.lists,
  keyof typeof sources.release,
  keyof typeof sources.enabled,
  RowEvent
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

/** XState implementations for the names in the machine document. */
export const liveEdit = setup({
  types: {
    context: {} as EditContext,
    events: {} as LiveEditEvent,
    emitted: {} as Preview,
    meta: {} as { view?: LiveEditView }
  },
  actors: { gatedFieldEdit },
  guards: {
    isDirty: ({ context }) => isDirty(context),
    isEditInputEvent: ({ event }) =>
      event.type === 'INPUT_CHANGED' ||
      event.type === 'INPUT_RELEASED' ||
      event.type === 'ITEM_FOCUSED' ||
      event.type === 'BACK'
  },
  actions: {
    ...profileActions(ProfileStore.create()),
    storeProfile: assign(({ event }) =>
      event.type === 'LOAD_SUCCEEDED' ? { profile: event.profile, draft: event.profile } : {}
    ),
    beginEdit: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'EDIT_FIELD');
      const edit = { field: event.field, value: context.draft?.[event.field] ?? '' };
      enqueue.assign({ edit });
      enqueue.sendTo('gatedFieldEdit', {
        type: 'BEGIN_EDIT',
        ...edit,
        owner: fieldId(edit.field),
        menuId: 'live-edit-mixed-menu'
      });
    }),
    showEdit: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'xstate.snapshot.gatedFieldEdit');
      const { edit } = event.snapshot.context;
      if (edit && edit.value !== context.edit?.value) {
        enqueue.assign({ edit: { field: edit.field, value: edit.value } });
      }
    }),
    forwardEditEvent: forwardTo('gatedFieldEdit'),
    submitEdit: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, ['EDIT_FIELD', 'SAVE']);
      if (event.type === 'EDIT_FIELD' && event.field === context.edit?.field) {
        enqueue.sendTo('gatedFieldEdit', event);
      } else {
        enqueue.assign({ afterEdit: event });
        enqueue.sendTo('gatedFieldEdit', { type: 'SUBMIT_EDIT' });
      }
    }),
    commitEdit: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'xstate.done.actor.gatedFieldEdit');
      const { field, value, reason, backRequested } = event.output;
      const { draft, afterEdit } = context;
      if (draft === null) return;
      enqueue.assign({
        draft: { ...draft, [field]: value },
        edit: null,
        lastEditValue: value,
        afterEdit: null,
        releaseReason: reason
      });
      if (afterEdit) enqueue.raise(afterEdit);
      else if (backRequested) enqueue.raise({ type: 'BACK' });
    }),
    storeSave: assign(({ event }) =>
      event.type === 'SAVE_SUCCEEDED'
        ? {
            profile: event.profile,
            draft: event.profile,
            lastEditValue: '',
            releaseReason: 'submit'
          }
        : {}
    ),
    discardDraft: assign(({ context }) => ({
      draft: context.profile,
      lastEditValue: '',
      releaseReason: 'back'
    })),
    preview: emit(({ context }) => ({
      type: 'preview',
      message: `${fieldValue(context, 'name')} — ${fieldValue(context, 'role')}`
    }))
  }
});
