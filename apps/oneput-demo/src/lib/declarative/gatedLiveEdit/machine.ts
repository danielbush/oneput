import { liveEdit } from './actions.js';

/** Select a literal view for each step from loading the profile to saving a draft. */
export const gatedLiveEdit = liveEdit.createMachine({
  id: 'gated-live-edit',
  description: 'Load and edit a profile in a filterable menu.',
  initial: 'waiting',
  context: {
    profile: null,
    draft: null,
    nextField: null,
    releaseReason: 'released'
  },
  on: {
    ITEM_ACTIVATED: {
      guard: 'activatesPreview',
      actions: 'preview',
      description: 'Show the values currently displayed in the menu.'
    }
  },
  states: {
    waiting: {
      description: 'Wait for Oneput to start the editor.',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: { id: 'live-edit-mixed-menu', items: [] },
          settings: { enableFilter: false }
        }
      },
      on: {
        STARTED: {
          target: 'loading',
          description: 'Load the profile from the store.'
        }
      }
    },
    loading: {
      description: 'Wait for the store to return the profile.',
      entry: 'loadProfile',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            items: [{ id: 'live-edit-loading', text: 'Loading profile…' }]
          },
          settings: { enableFilter: false }
        }
      },
      on: {
        LOAD_SUCCEEDED: {
          target: 'filtering',
          actions: 'storeProfile',
          description: 'Show the loaded profile.'
        },
        LOAD_FAILED: {
          target: 'loadFailed',
          description: 'Show a retry row while the profile is unavailable.'
        }
      }
    },
    loadFailed: {
      description: 'Wait for the user to retry the load.',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            items: [
              {
                id: 'live-edit-retry-load',
                text: 'Could not load profile',
                detail: 'Activate to retry.',
                activate: true
              }
            ]
          },
          settings: { enableFilter: false }
        }
      },
      on: {
        ITEM_ACTIVATED: {
          guard: 'activatesLoadRetry',
          target: 'loading',
          description: 'Try to load the profile again.'
        }
      }
    },
    filtering: {
      description: 'Use the shared input to filter the profile menu.',
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
              { id: 'live-edit-mixed-preview', text: 'Preview values', activate: true }
            ]
          },
          input: {
            kind: 'filter',
            placeholder: 'Filter menu, then activate a field to edit...',
            release: { from: 'editRelease' }
          },
          settings: {
            enableFilter: true,
            enableGoBack: true,
            enableInputElement: true,
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
          description: 'Make a draft and give the selected row the input claim.'
        }
      }
    },
    editing: {
      description: 'Edit the draft and show a save error on its row if a save fails.',
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
              { id: 'live-edit-mixed-preview', text: 'Preview values', activate: true }
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
            enableGoBack: true,
            enableInputElement: true,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        }
      },
      on: {
        ITEM_ACTIVATED: [
          {
            guard: 'activatesOwner',
            target: 'saving',
            actions: 'submitEdit',
            description: 'Save or retry this row and clear the filter on success.'
          },
          {
            guard: 'canSwitchField',
            target: 'saving',
            actions: ['leaveEdit', 'queueNextEdit'],
            description: 'Save this draft before opening the next field.'
          }
        ],
        INPUT_CHANGED: {
          actions: 'writeEdit',
          description: 'Write the text to the draft.'
        },
        ITEM_FOCUSED: {
          guard: 'userFocusLeftOwner',
          target: 'saving',
          actions: 'leaveEdit',
          description: 'Save when the user moves focus away from an edit that has no save error.'
        },
        BACK: [
          {
            guard: 'hasSaveError',
            target: 'editing',
            description: 'Keep the draft in the editor until the user retries its row.'
          },
          {
            target: 'saving',
            actions: 'backFromEdit',
            description: 'Save the draft and restore the filter on success.'
          }
        ],
        INPUT_RELEASED: {
          guard: 'ownerReleasedForCommit',
          target: 'saving',
          actions: 'finishEdit',
          description: 'Save when Oneput releases the active claim after a user commit.'
        }
      }
    },
    saving: {
      description: 'Keep the draft in the editor while the store saves it.',
      entry: 'saveProfile',
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
                detail: { from: 'nameSavingHint' },
                icon: 'Pencil',
                showActionBinding: true,
                activate: true
              },
              {
                id: 'live-edit-mixed-role',
                text: { from: 'roleLabel' },
                detail: { from: 'roleSavingHint' },
                icon: 'Pencil',
                showActionBinding: true,
                activate: true
              },
              { id: 'live-edit-mixed-preview', text: 'Preview values', activate: true }
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
            enableInputElement: false,
            clearInputAfterAction: false,
            clearInputAfterBack: false,
            enableGoBack: false
          }
        }
      },
      on: {
        ITEM_ACTIVATED: {
          guard: 'activatesOtherField',
          actions: 'queueNextEdit',
          description: 'Remember the field to open after the current save succeeds.'
        },
        SAVE_SUCCEEDED: [
          {
            guard: 'hasNextField',
            target: 'editing',
            actions: 'startQueuedEdit',
            description: 'Show the saved value and open the next field.'
          },
          {
            target: 'filtering',
            actions: 'storeSave',
            description: 'Show the saved profile and return to filtering.'
          }
        ],
        SAVE_FAILED: {
          target: 'editing',
          actions: 'storeSaveFailure',
          description: 'Keep the draft and show retry on its row.'
        }
      }
    }
  }
});
