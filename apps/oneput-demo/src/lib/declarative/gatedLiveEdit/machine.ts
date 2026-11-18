import { liveEdit } from './actions.js';

/** Edit a profile draft independently of its last saved values. */
export const gatedLiveEdit = liveEdit.createMachine({
  id: 'gated-live-edit',
  description: 'Edit a profile draft and save it in one operation.',
  initial: 'waiting',
  context: {
    profile: null,
    draft: null,
    editField: null,
    editValue: '',
    releaseReason: 'released'
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
          target: 'ready',
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
    ready: {
      description: 'Show the profile draft and its actions.',
      initial: 'filtering',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            focusBehaviour: 'none',
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
              {
                id: 'live-edit-save',
                text: 'Save',
                activate: true,
                enabled: { from: 'saveEnabled' },
                canFilter: false
              }
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
        ITEM_ACTIVATED: [
          {
            guard: 'activatesField',
            target: '.editing',
            actions: ['commitEdit', 'startEdit'],
            description: 'Open the selected field after keeping any current edit.'
          },
          {
            guard: 'activatesDirtySave',
            target: '.saving',
            actions: 'commitEdit',
            description: 'Save the complete draft when it has changed.'
          },
          {
            guard: 'activatesPreview',
            actions: 'preview',
            description: 'Show the values currently displayed in the menu.'
          }
        ],
        BACK: {
          guard: 'isDirty',
          target: '#gated-live-edit.confirmDiscard',
          description: 'Ask whether to discard the unsaved draft.'
        }
      },
      states: {
        filtering: {
          description: 'Use the shared input to filter the menu.'
        },
        editing: {
          description: 'Edit one field in the shared input before updating the draft.',
          meta: {
            view: {
              input: {
                kind: 'claim',
                owner: { from: 'editOwner' },
                value: { from: 'editValue' },
                placeholder: { from: 'editPlaceholder' }
              },
              settings: { enableFilter: false }
            }
          },
          on: {
            INPUT_CHANGED: {
              actions: 'writeEdit',
              description: 'Keep the current field text in the edit buffer.'
            },
            ITEM_ACTIVATED: {
              guard: 'activatesOwner',
              target: 'filtering',
              actions: 'commitEdit',
              description: 'Keep the edit in the draft and clear the filter query.'
            },
            ITEM_FOCUSED: {
              guard: 'userFocusLeftOwner',
              target: 'filtering',
              actions: 'commitEdit',
              description: 'Keep the edit when the user focuses another row.'
            },
            INPUT_RELEASED: {
              guard: 'ownerReleasedForCommit',
              target: 'filtering',
              actions: 'commitEdit',
              description: 'Keep the edit when Oneput releases the field input.'
            },
            BACK: {
              guard: 'isDirty',
              target: 'filtering',
              actions: ['commitEdit', 'checkBackFromDraft'],
              description: 'Keep the edit and handle Back from the draft menu.'
            }
          }
        },
        saving: {
          description: 'Keep the menu, focus and draft visible while the store saves.',
          entry: 'saveProfile',
          meta: {
            view: {
              menu: { items: [{ id: 'live-edit-save', enabled: false }] },
              input: {
                kind: 'claim',
                owner: 'live-edit-save',
                value: { from: 'editValue' },
                placeholder: ''
              },
              settings: { enableFilter: false, enableInputElement: false, enableGoBack: false }
            }
          },
          on: {
            ITEM_ACTIVATED: {
              description: 'Ignore row activations until the save finishes.'
            },
            BACK: {
              description: 'Keep the form open until the save finishes.'
            },
            SAVE_SUCCEEDED: {
              target: 'filtering',
              actions: 'storeSave',
              description: 'Accept the saved draft and disable Save.'
            },
            SAVE_FAILED: {
              target: 'saveFailed',
              description: 'Keep the draft and show retry on Save.'
            }
          }
        },
        saveFailed: {
          description: 'Keep the full menu and draft visible with a retry on Save.',
          meta: {
            view: {
              menu: {
                items: [
                  {
                    id: 'live-edit-save',
                    detail: 'Could not save. Activate to retry.',
                    icon: 'CircleAlert'
                  }
                ]
              },
              input: {
                kind: 'claim',
                owner: 'live-edit-save',
                value: { from: 'editValue' },
                placeholder: ''
              },
              settings: { enableFilter: false, enableInputElement: false }
            }
          }
        },
        history: {
          type: 'history',
          description: 'Return to the menu that opened the discard confirmation.'
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
              { id: 'live-edit-discard', text: 'Discard', activate: true },
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
            target: 'ready',
            actions: 'discardDraft',
            description: 'Restore the last saved profile and disable Save.'
          },
          {
            guard: 'activatesKeepEditing',
            target: 'ready.history',
            description: 'Close the confirmation and keep the draft.'
          }
        ],
        BACK: {
          target: 'ready.history',
          description: 'Close the confirmation and keep the draft.'
        }
      }
    }
  }
});
