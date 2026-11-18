import { liveEdit, type LiveEditView } from './actions.js';
import { initialValues } from './sources.js';

/** The active state selects the view. Each view repeats its menu as literals so the Stately viewer can read the machine. */
export const gatedLiveEdit = liveEdit.createMachine({
  id: 'gated-live-edit',
  description: 'Edit values in a filterable menu.',
  initial: 'filtering',
  context: { values: initialValues, editing: null },
  on: {
    PREVIEW: { actions: 'preview', description: 'Show the current values.' },
    RESET: { actions: 'reset', description: 'Restore the example values.' }
  },
  states: {
    filtering: {
      description: 'Start here: the shared input filters the menu.',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            focusBehaviour: 'last-action,first',
            items: [
              {
                id: 'live-edit-mixed-name',
                text: { from: 'nameLabel' },
                detail: { from: 'nameHint' },
                icon: 'Pencil',
                showActionBinding: true,
                action: 'editName'
              },
              {
                id: 'live-edit-mixed-role',
                text: { from: 'roleLabel' },
                detail: { from: 'roleHint' },
                icon: 'Pencil',
                showActionBinding: true,
                action: 'editRole'
              },
              { id: 'live-edit-mixed-preview', text: 'Preview values', action: 'preview' },
              { id: 'live-edit-mixed-reset', text: 'Reset example', action: 'reset' }
            ]
          },
          input: { kind: 'filter', placeholder: 'Filter menu, then activate a field to edit...' },
          actions: {
            editName: { type: 'ACTIVATE_FIELD', field: 'name' },
            editRole: { type: 'ACTIVATE_FIELD', field: 'role' },
            preview: { type: 'PREVIEW' },
            reset: { type: 'RESET' }
          },
          settings: {
            enableFilter: true,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        } satisfies LiveEditView
      },
      on: {
        ACTIVATE_FIELD: {
          target: 'editing',
          actions: 'startEdit',
          description: 'Give the selected row the input claim.'
        }
      }
    },
    editing: {
      description: 'The selected row owns the shared input.',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            focusBehaviour: 'last-action,first',
            items: [
              {
                id: 'live-edit-mixed-name',
                text: { from: 'nameLabel' },
                detail: { from: 'nameHint' },
                icon: 'Pencil',
                showActionBinding: true,
                action: 'editName'
              },
              {
                id: 'live-edit-mixed-role',
                text: { from: 'roleLabel' },
                detail: { from: 'roleHint' },
                icon: 'Pencil',
                showActionBinding: true,
                action: 'editRole'
              },
              { id: 'live-edit-mixed-preview', text: 'Preview values', action: 'preview' },
              { id: 'live-edit-mixed-reset', text: 'Reset example', action: 'reset' }
            ]
          },
          input: {
            kind: 'claim',
            owner: { from: 'editOwner' },
            value: { from: 'editValue' },
            placeholder: { from: 'editPlaceholder' },
            change: 'EDIT_CHANGED',
            release: 'CLAIM_RELEASED'
          },
          actions: {
            editName: { type: 'ACTIVATE_FIELD', field: 'name' },
            editRole: { type: 'ACTIVATE_FIELD', field: 'role' },
            preview: { type: 'PREVIEW' },
            reset: { type: 'RESET' }
          },
          settings: {
            enableFilter: true,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        } satisfies LiveEditView
      },
      on: {
        ACTIVATE_FIELD: [
          {
            guard: 'activatesOwner',
            target: 'filtering',
            actions: 'finishEdit',
            description: 'Submit the edit on repeat activation and clear the filter.'
          },
          {
            actions: 'startEdit',
            description: 'Transfer the claim if activation selects another row directly.'
          }
        ],
        EDIT_CHANGED: {
          actions: 'writeEdit',
          description: 'Write the text to the selected field.'
        },
        CLAIM_RELEASED: {
          target: 'filtering',
          actions: 'finishEdit',
          description: 'Return to filtering after Oneput releases the claim.'
        }
      }
    }
  }
});
