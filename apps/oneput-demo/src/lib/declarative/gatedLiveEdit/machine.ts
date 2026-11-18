import { liveEdit } from './actions.js';

/** Show each step in the profile editor, including save failure and discard confirmation. */
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
      description: 'Keep a draft while the user edits or retries a save.',
      initial: 'typing',
      on: {
        INPUT_CHANGED: {
          actions: 'writeEdit',
          description: 'Write the text to the draft.'
        }
      },
      states: {
        typing: {
          description: 'Edit a field in the shared input.',
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
                target: '#gated-live-edit.saving',
                actions: 'submitEdit',
                description: 'Save this row and clear the filter on success.'
              },
              {
                guard: 'activatesOtherField',
                target: '#gated-live-edit.saving',
                actions: ['leaveEdit', 'queueNextEdit'],
                description: 'Save this draft before opening the next field.'
              }
            ],
            ITEM_FOCUSED: {
              guard: 'userFocusLeftOwner',
              target: '#gated-live-edit.saving',
              actions: 'leaveEdit',
              description: 'Save when the user moves focus away from the edited row.'
            },
            BACK: {
              target: '#gated-live-edit.saving',
              actions: 'backFromEdit',
              description: 'Save the draft and restore the filter on success.'
            },
            INPUT_RELEASED: {
              guard: 'ownerReleasedForCommit',
              target: '#gated-live-edit.saving',
              actions: 'finishEdit',
              description: 'Save when Oneput releases the active claim after a user commit.'
            }
          }
        },
        saveFailed: {
          description: 'Show the failed save and wait for the user to retry or go back.',
          meta: {
            view: {
              title: 'Live edit — mixed menu',
              menu: {
                id: 'live-edit-mixed-menu',
                focusBehaviour: 'last-action,first',
                items: [
                  {
                    id: 'live-edit-retry-save',
                    text: { from: 'editLabel' },
                    detail: 'Could not save. Activate to retry.',
                    icon: 'Pencil',
                    showActionBinding: true,
                    activate: true
                  }
                ]
              },
              input: {
                kind: 'claim',
                owner: 'live-edit-retry-save',
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
            ITEM_ACTIVATED: {
              guard: 'activatesSaveRetry',
              target: '#gated-live-edit.saving',
              actions: 'submitEdit',
              description: 'Retry the save and clear the filter on success.'
            },
            BACK: {
              target: '#gated-live-edit.confirmDiscard',
              description: 'Ask whether to discard the unsaved draft.'
            }
          }
        }
      }
    },
    confirmDiscard: {
      description: 'Ask whether to discard the draft or keep editing it.',
      meta: {
        view: {
          title: 'Changes not saved',
          menu: {
            id: 'live-edit-confirm-discard',
            items: [
              { id: 'live-edit-discard', text: { from: 'discardLabel' }, activate: true },
              { id: 'live-edit-keep-editing', text: 'Keep editing', activate: true }
            ]
          },
          settings: {
            enableFilter: false,
            enableGoBack: true,
            enableInputElement: false,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        }
      },
      on: {
        ITEM_ACTIVATED: [
          {
            guard: 'activatesDiscard',
            target: 'filtering',
            actions: 'discardEdit',
            description: 'Drop the draft and show the last saved value.'
          },
          {
            guard: 'activatesKeepEditing',
            target: 'editing.saveFailed',
            description: 'Return to the failed save and keep the draft.'
          }
        ],
        BACK: {
          target: 'editing.saveFailed',
          description: 'Close the confirmation and keep the draft.'
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
          target: 'editing.saveFailed',
          actions: 'clearNextField',
          description: 'Keep the draft and show retry on its row.'
        }
      }
    }
  }
});
