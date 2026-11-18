import type { InputClaimReleaseReason } from '@oneput/oneput';
import { assign, setup } from 'xstate';
import type { OneputEvent } from '../oneputEvents.js';

type Edit<Field extends string> = {
  field: Field;
  value: string;
  owner: string;
  menuId: string;
};

type EditContext<Field extends string> = {
  edit: Edit<Field> | null;
  reason: InputClaimReleaseReason;
  backRequested: boolean;
};

export type EditResult<Field extends string> = Pick<Edit<Field>, 'field' | 'value'> & {
  reason: InputClaimReleaseReason;
  backRequested: boolean;
};

type EditEvent<Field extends string> =
  | ({ type: 'BEGIN_EDIT' } & Edit<Field>)
  | { type: 'EDIT_FIELD'; field: Field }
  | { type: 'SUBMIT_EDIT' }
  | Extract<OneputEvent, { type: 'INPUT_CHANGED' | 'INPUT_RELEASED' | 'ITEM_FOCUSED' | 'BACK' }>;

function releaseReason<Field extends string>(event: EditEvent<Field>): InputClaimReleaseReason {
  switch (event.type) {
    case 'EDIT_FIELD':
    case 'SUBMIT_EDIT':
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

function editResult<Field extends string>({
  context
}: {
  context: EditContext<Field>;
}): EditResult<Field> {
  if (context.edit === null) throw new Error('Expected an active field edit.');
  const { field, value } = context.edit;
  return { field, value, reason: context.reason, backRequested: context.backRequested };
}

/** Buffer a single field until the user completes the edit or its claim is released. */
export function createGatedFieldEdit<Field extends string>() {
  const pattern = setup({
    types: {
      context: {} as EditContext<Field>,
      events: {} as EditEvent<Field>,
      output: {} as EditResult<Field>
    },
    guards: {
      isCurrentField: ({ context, event }) =>
        event.type === 'EDIT_FIELD' && event.field === context.edit?.field,
      userFocusLeftOwner: ({ context: { edit }, event }) =>
        edit !== null &&
        event.type === 'ITEM_FOCUSED' &&
        event.menuId === edit.menuId &&
        (event.cause === 'keyboard' || event.cause === 'pointer') &&
        event.id !== edit.owner,
      ownerReleasedForCommit: ({ context: { edit }, event }) =>
        edit !== null &&
        event.type === 'INPUT_RELEASED' &&
        event.id === edit.owner &&
        (event.reason === 'submit' ||
          event.reason === 'back' ||
          event.reason === 'focus-changed' ||
          event.reason === 'released')
    },
    actions: {
      openEdit: assign(({ event }) =>
        event.type === 'BEGIN_EDIT'
          ? {
              edit: {
                field: event.field,
                value: event.value,
                owner: event.owner,
                menuId: event.menuId
              }
            }
          : {}
      ),
      writeEdit: assign(({ context: { edit }, event }) =>
        edit !== null && event.type === 'INPUT_CHANGED'
          ? { edit: { ...edit, value: event.value } }
          : {}
      ),
      recordCompletion: assign(({ event }) => ({
        reason: releaseReason(event),
        backRequested: event.type === 'BACK'
      }))
    }
  });

  return pattern.createMachine({
    id: 'gated-field-edit',
    description: 'Edit one field in the shared input and return its value.',
    initial: 'waiting',
    context: { edit: null, reason: 'released', backRequested: false },
    output: editResult,
    states: {
      waiting: {
        description: 'Wait for the caller to identify the field and its input owner.',
        on: {
          BEGIN_EDIT: {
            target: 'editing',
            actions: 'openEdit',
            description: 'Open the field with its current value.'
          }
        }
      },
      editing: {
        description: 'Keep the field text until the edit completes.',
        on: {
          INPUT_CHANGED: {
            actions: 'writeEdit',
            description: 'Keep the current text in the field buffer.'
          },
          EDIT_FIELD: {
            guard: 'isCurrentField',
            target: 'done',
            actions: 'recordCompletion',
            description: 'Submit the edit when the same field is activated again.'
          },
          ITEM_FOCUSED: {
            guard: 'userFocusLeftOwner',
            target: 'done',
            actions: 'recordCompletion',
            description: 'Keep the edit when the user moves focus away from the field.'
          },
          INPUT_RELEASED: {
            guard: 'ownerReleasedForCommit',
            target: 'done',
            actions: 'recordCompletion',
            description: 'Keep the edit when Oneput releases this field input.'
          },
          BACK: {
            target: 'done',
            actions: 'recordCompletion',
            description: 'Keep the edit and return control to the caller.'
          },
          SUBMIT_EDIT: {
            target: 'done',
            actions: 'recordCompletion',
            description: 'Submit the edit at the caller’s request.'
          }
        }
      },
      done: {
        type: 'final',
        description: 'Return the field, text and reason for completing the edit.'
      }
    }
  });
}
