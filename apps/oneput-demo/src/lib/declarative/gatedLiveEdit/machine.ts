import { liveEdit } from './actions.js';

/** The active state selects the view. Each view repeats its menu as literals so the Stately viewer can read the machine. */
export const gatedLiveEdit = liveEdit.createMachine({
  id: 'gated-live-edit',
  description: 'Edit values in a filterable menu.',
  initial: 'filtering',
  context: {
    values: { name: 'Grace Hopper', role: 'Computer scientist' },
    editing: null,
    releaseReason: 'released'
  },
  on: {
    ITEM_ACTIVATED: [
      {
        guard: 'activatesPreview',
        actions: 'preview',
        description: 'Show the current values.'
      },
      {
        guard: 'activatesReset',
        actions: 'reset',
        description: 'Restore the example values.'
      }
    ]
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
                activate: true
              },
              {
                id: 'live-edit-mixed-role',
                text: { from: 'roleLabel' },
                detail: { from: 'roleHint' },
                icon: 'Pencil',
                showActionBinding: true,
                activate: true
              },
              { id: 'live-edit-mixed-preview', text: 'Preview values', activate: true },
              { id: 'live-edit-mixed-reset', text: 'Reset example', activate: true }
            ]
          },
          input: {
            kind: 'filter',
            placeholder: 'Filter menu, then activate a field to edit...',
            release: { from: 'editRelease' }
          },
          settings: {
            enableFilter: true,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        }
      },
      on: {
        ITEM_ACTIVATED: {
          guard: 'activatesField',
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
                activate: true
              },
              {
                id: 'live-edit-mixed-role',
                text: { from: 'roleLabel' },
                detail: { from: 'roleHint' },
                icon: 'Pencil',
                showActionBinding: true,
                activate: true
              },
              { id: 'live-edit-mixed-preview', text: 'Preview values', activate: true },
              { id: 'live-edit-mixed-reset', text: 'Reset example', activate: true }
            ]
          },
          input: {
            kind: 'claim',
            owner: { from: 'editOwner' },
            value: { from: 'editValue' },
            placeholder: { from: 'editPlaceholder' }
          },
          settings: {
            enableFilter: true,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        }
      },
      on: {
        ITEM_ACTIVATED: [
          {
            guard: 'activatesOwner',
            target: 'filtering',
            actions: 'submitEdit',
            description: 'Submit the edit on repeat activation and clear the filter.'
          },
          {
            guard: 'activatesField',
            actions: 'startEdit',
            description: 'Transfer the claim if activation selects another row directly.'
          }
        ],
        INPUT_CHANGED: {
          actions: 'writeEdit',
          description: 'Write the text to the selected field.'
        },
        ITEM_FOCUSED: {
          guard: 'focusLeftOwner',
          target: 'filtering',
          actions: 'leaveEdit',
          description: 'Restore the filter when focus leaves the edited row.'
        },
        BACK: {
          target: 'filtering',
          actions: 'backFromEdit',
          description: 'Restore the filter and keep the values written so far.'
        },
        INPUT_RELEASED: {
          guard: 'releasedOwner',
          target: 'filtering',
          actions: 'finishEdit',
          description: 'Return to filtering if Oneput has already released the active claim.'
        }
      }
    }
  }
});
