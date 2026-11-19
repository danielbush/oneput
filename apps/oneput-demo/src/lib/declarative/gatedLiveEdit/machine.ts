import { liveEdit } from './actions.js';

/** Edit a profile draft with a child actor that buffers the active field. */
export const gatedLiveEdit = liveEdit.createMachine({
  id: 'gated-live-edit',
  description: 'Edit a profile draft and save it in one operation.',
  initial: 'waiting',
  context: {
    profile: null,
    draft: null,
    lastEditedField: null,
    afterEdit: null,
    openEdit: null,
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
                send: { type: 'RETRY_LOAD' }
              }
            ]
          },
          settings: { enableFilter: false }
        }
      },
      on: {
        RETRY_LOAD: {
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
                send: { type: 'EDIT_FIELD', field: 'name' }
              },
              {
                id: 'live-edit-mixed-role',
                text: { from: 'roleLabel' },
                detail: { from: 'roleHint' },
                icon: 'Pencil',
                showActionBinding: true,
                send: { type: 'EDIT_FIELD', field: 'role' }
              },
              { id: 'live-edit-mixed-preview', text: 'Preview values', send: { type: 'PREVIEW' } },
              {
                id: 'live-edit-save',
                text: 'Save',
                send: { type: 'SAVE' },
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
        EDIT_FIELD: {
          target: '.editing',
          description: 'Open the selected field.'
        },
        SAVE: {
          guard: 'isDirty',
          target: '.saving',
          description: 'Save the complete draft when it has changed.'
        },
        PREVIEW: {
          actions: 'preview',
          description: 'Show the values currently displayed in the menu.'
        },
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
          entry: 'beginEdit',
          invoke: {
            src: 'gatedFieldEdit',
            id: 'gatedFieldEdit',
            onSnapshot: {
              actions: 'trackOpenEdit',
              description:
                'Copy the open edit to the context and notify the view when the field editor updates.'
            },
            onDone: {
              target: 'filtering',
              actions: 'commitEdit',
              description: 'Keep the completed field value in the draft.'
            }
          },
          on: {
            EDIT_FIELD: {
              actions: 'submitEdit',
              description: 'Finish the edit and open the selected field if it differs.'
            },
            SAVE: {
              guard: 'isDirtyWithEdit',
              actions: 'submitEdit',
              description:
                'Finish the edit before saving when the draft or the open edit has changed.'
            },
            INPUT_CHANGED: {
              actions: 'forwardEditEvent',
              description: 'Send the current input text to the field editor.'
            },
            ITEM_FOCUSED: {
              actions: 'forwardEditEvent',
              description: 'Let the field editor check whether focus left its input owner.'
            },
            INPUT_RELEASED: {
              actions: 'forwardEditEvent',
              description: 'Let the field editor handle the input release.'
            },
            BACK: {
              actions: 'forwardEditEvent',
              description: 'Let the field editor complete the edit before handling Back.'
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
                value: { from: 'lastEditValue' },
                placeholder: ''
              },
              settings: { enableFilter: false, enableInputElement: false, enableGoBack: false }
            }
          },
          on: {
            '*': {
              description: 'Keep the form open and ignore other events until the save finishes.'
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
                value: { from: 'lastEditValue' },
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
              { id: 'live-edit-discard', text: 'Discard', send: { type: 'DISCARD' } },
              { id: 'live-edit-keep-editing', text: 'Keep editing', send: { type: 'KEEP_EDITING' } }
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
        DISCARD: {
          target: 'ready',
          actions: 'discardDraft',
          description: 'Restore the last saved profile and disable Save.'
        },
        KEEP_EDITING: {
          target: 'ready.history',
          description: 'Close the confirmation and keep the draft.'
        },
        BACK: {
          target: 'ready.history',
          description: 'Close the confirmation and keep the draft.'
        }
      }
    }
  }
});
