import { assign, emit, setup } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import { fieldFor, fieldId, initialValues, sources, type EditContext } from './sources.js';

type Preview = { type: 'preview'; message: string };
type LiveEditView = ViewDef<keyof typeof sources.text, never, keyof typeof sources.release>;

/** XState implementations for the names in the machine document. */
export const liveEdit = setup({
  types: {
    context: {} as EditContext,
    events: {} as OneputEvent,
    emitted: {} as Preview,
    meta: {} as { view?: LiveEditView }
  },
  guards: {
    activatesField: ({ event }) => event.type === 'ITEM_ACTIVATED' && fieldFor(event.id) !== null,
    activatesOwner: ({ context, event }) =>
      event.type === 'ITEM_ACTIVATED' && fieldId(context.editing) === event.id,
    activatesPreview: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-mixed-preview',
    activatesReset: ({ event }) =>
      event.type === 'ITEM_ACTIVATED' && event.id === 'live-edit-mixed-reset',
    focusLeftOwner: ({ context, event }) =>
      event.type === 'ITEM_FOCUSED' && fieldId(context.editing) !== event.id,
    releasedOwner: ({ context, event }) =>
      event.type === 'INPUT_RELEASED' && fieldId(context.editing) === event.id
  },
  actions: {
    startEdit: assign(({ event }) =>
      event.type === 'ITEM_ACTIVATED' ? { editing: fieldFor(event.id) } : {}
    ),
    writeEdit: assign(({ context, event }) =>
      event.type === 'INPUT_CHANGED' && context.editing !== null
        ? { values: { ...context.values, [context.editing]: event.value } }
        : {}
    ),
    submitEdit: assign({ editing: null, releaseReason: 'submit' }),
    backFromEdit: assign({ editing: null, releaseReason: 'back' }),
    leaveEdit: assign({ editing: null, releaseReason: 'focus-changed' }),
    finishEdit: assign(({ event }) =>
      event.type === 'INPUT_RELEASED' ? { editing: null, releaseReason: event.reason } : {}
    ),
    preview: emit(({ context }) => ({
      type: 'preview',
      message: `${context.values.name} — ${context.values.role}`
    })),
    reset: assign({ values: initialValues })
  }
});
