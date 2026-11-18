import type { InputClaimReleaseReason } from '@oneput/oneput';
import { assign, emit, setup } from 'xstate';
import type { ViewDef } from './interpreter.js';
import { initialValues, sources, type EditContext, type Field } from './sources.js';

export type MenuEvent =
  | { type: 'ACTIVATE_FIELD'; field: Field }
  | { type: 'PREVIEW' }
  | { type: 'RESET' };
type EditEvent =
  | MenuEvent
  | { type: 'EDIT_CHANGED'; value: string }
  | { type: 'CLAIM_RELEASED'; reason: InputClaimReleaseReason };
type Preview = { type: 'preview'; message: string };

export type LiveEditView = ViewDef<
  keyof typeof sources,
  'editName' | 'editRole' | 'preview' | 'reset',
  MenuEvent,
  'EDIT_CHANGED',
  'CLAIM_RELEASED'
>;

/** XState implementations for the names in the machine document. */
export const liveEdit = setup({
  types: {
    context: {} as EditContext,
    events: {} as EditEvent,
    emitted: {} as Preview,
    meta: {} as { view?: LiveEditView }
  },
  guards: {
    activatesOwner: ({ context, event }) =>
      event.type === 'ACTIVATE_FIELD' && event.field === context.editing
  },
  actions: {
    startEdit: assign(({ event }) =>
      event.type === 'ACTIVATE_FIELD' ? { editing: event.field } : {}
    ),
    writeEdit: assign(({ context, event }) =>
      event.type === 'EDIT_CHANGED' && context.editing !== null
        ? { values: { ...context.values, [context.editing]: event.value } }
        : {}
    ),
    finishEdit: assign({ editing: null }),
    preview: emit(({ context }) => ({
      type: 'preview',
      message: `${context.values.name} — ${context.values.role}`
    })),
    reset: assign({ values: initialValues })
  }
});
