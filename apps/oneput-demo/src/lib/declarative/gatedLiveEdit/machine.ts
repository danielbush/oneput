import { liveEdit } from './actions.js';

/** Edit a profile draft independently of its last saved values. */
export const gatedLiveEdit = liveEdit.createMachine({
  id: 'gated-live-edit',
  description: 'Edit a profile draft and save it in one operation.',
  initial: 'waiting',
  context: {
    profile: null,
    draft: null,
    edit: null,
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
          target: 'clean',
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
    clean: {
      description: 'Filter the menu while the draft matches the saved profile.',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            focusBehaviour: 'none',
            from: 'cleanRows'
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
          description: 'Open the selected field in the shared input.'
        }
      }
    },
    editing: {
      description: 'Edit one field in the shared input before updating the profile draft.',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            focusBehaviour: 'none',
            from: 'editRows'
          },
          input: {
            kind: 'claim',
            owner: { from: 'editOwner' },
            value: { from: 'editValue' },
            placeholder: { from: 'editPlaceholder' }
          },
          settings: {
            enableFilter: false,
            enableGoBack: true,
            enableInputElement: true,
            clearInputAfterAction: false,
            clearInputAfterBack: false
          }
        }
      },
      on: {
        INPUT_CHANGED: {
          actions: 'writeEdit',
          description: 'Keep the current field text in the edit buffer.'
        },
        ITEM_ACTIVATED: [
          {
            guard: 'activatesOwner',
            target: 'classifyDraft',
            actions: ['commitEdit', 'submitEdit'],
            description: 'Keep the edit in the draft and clear the filter query.'
          },
          {
            guard: 'activatesField',
            actions: ['commitEdit', 'startEdit'],
            description: 'Keep the edit in the draft and open the selected field.'
          },
          {
            guard: 'activatesSave',
            target: 'classifyDraft',
            actions: ['commitEdit', 'submitEdit'],
            description: 'Keep the edit in the draft before checking whether to save.'
          }
        ],
        ITEM_FOCUSED: {
          guard: 'userFocusLeftOwner',
          target: 'classifyDraft',
          actions: ['commitEdit', 'leaveEdit'],
          description: 'Keep the edit in the draft when the user moves to another row.'
        },
        BACK: {
          target: 'classifyDraft',
          actions: ['commitEdit', 'backFromEdit'],
          description: 'Keep the edit in the draft and check for unsaved changes.'
        },
        INPUT_RELEASED: {
          guard: 'ownerReleasedForCommit',
          target: 'classifyDraft',
          actions: ['commitEdit', 'finishEdit'],
          description: 'Keep the edit in the draft when Oneput releases its input claim.'
        }
      }
    },
    classifyDraft: {
      description: 'Compare the committed draft with the saved profile.',
      always: [
        {
          guard: 'saveWasActivatedWithChanges',
          target: 'saving',
          description: 'Save the updated draft when the user activated Save.'
        },
        {
          guard: 'draftIsDirty',
          target: 'dirty.filtering',
          description: 'Enable Save when any field differs from its saved value.'
        },
        {
          target: 'clean',
          description: 'Disable Save when all values match the saved profile.'
        }
      ]
    },
    dirty: {
      description: 'Keep the unsaved draft available for editing, saving or discarding.',
      initial: 'filtering',
      on: {
        ITEM_ACTIVATED: [
          {
            guard: 'activatesField',
            target: '#gated-live-edit.editing',
            actions: 'startEdit',
            description: 'Open the selected field with its current draft value.'
          },
          {
            guard: 'activatesSave',
            target: '#gated-live-edit.saving',
            description: 'Save the complete draft.'
          }
        ],
        BACK: {
          target: '#gated-live-edit.confirmDiscard',
          description: 'Ask whether to discard the unsaved draft.'
        }
      },
      states: {
        previous: {
          type: 'history',
          description: 'Remember whether the draft was filtering or showing a failed save.'
        },
        filtering: {
          description: 'Filter the menu and offer to save the draft.',
          always: {
            guard: 'leftFieldWithBack',
            target: '#gated-live-edit.confirmDiscard',
            actions: 'restoreQuery',
            description: 'Ask whether to discard after Back finishes an edit.'
          },
          meta: {
            view: {
              title: 'Live edit — mixed menu',
              menu: {
                id: 'live-edit-mixed-menu',
                focusBehaviour: 'none',
                from: 'dirtyRows'
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
          }
        },
        saveFailed: {
          description: 'Keep the full menu and draft visible with a retry on Save.',
          meta: {
            view: {
              title: 'Live edit — mixed menu',
              menu: {
                id: 'live-edit-mixed-menu',
                focusBehaviour: 'none',
                from: 'dirtyRows',
                rowOverride: {
                  id: 'live-edit-save',
                  detail: 'Could not save. Activate to retry.',
                  icon: 'CircleAlert'
                }
              },
              input: {
                kind: 'claim',
                owner: 'live-edit-save',
                value: { from: 'editValue' },
                placeholder: ''
              },
              settings: {
                enableFilter: false,
                enableGoBack: true,
                enableInputElement: false,
                clearInputAfterAction: false,
                clearInputAfterBack: false
              }
            }
          }
        }
      }
    },
    saving: {
      description: 'Keep the menu, focus and draft visible while the store saves.',
      entry: 'saveProfile',
      meta: {
        view: {
          title: 'Live edit — mixed menu',
          menu: {
            id: 'live-edit-mixed-menu',
            focusBehaviour: 'none',
            from: 'cleanRows'
          },
          input: {
            kind: 'claim',
            owner: 'live-edit-save',
            value: { from: 'editValue' },
            placeholder: ''
          },
          settings: {
            enableFilter: false,
            enableInputElement: false,
            clearInputAfterAction: false,
            clearInputAfterBack: false,
            enableGoBack: false
          }
        }
      },
      on: {
        SAVE_SUCCEEDED: {
          target: 'clean',
          actions: 'storeSave',
          description: 'Accept the saved draft and disable Save.'
        },
        SAVE_FAILED: {
          target: 'dirty.saveFailed',
          description: 'Keep the draft and show retry on Save.'
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
            target: 'clean',
            actions: 'discardDraft',
            description: 'Restore the last saved profile and disable Save.'
          },
          {
            guard: 'activatesKeepEditing',
            target: 'dirty.previous',
            description: 'Close the confirmation and keep the draft.'
          }
        ],
        BACK: {
          target: 'dirty.previous',
          description: 'Close the confirmation and keep the draft.'
        }
      }
    }
  }
});
