import type { Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import type { JsedDocument } from '../../../JsedDocument.js';
import { Editor } from '../../editor/Editor.js';
import { icons } from './icons.js';
import { PickListUI } from './PickListUI.js';
import { PasteElementUI } from './PasteElementUI.js';
import type { EditorError } from '../../editor/EditorState.js';

/**
 * Provides functionality needed to manage the Jsed editor in Oneput when
 * editing a document root.
 *
 * Use this within your own Oneput AppObject.
 */
export class OneputEditDocumentAdapter {
  static create(
    ctl: Controller,
    {
      document,
      onEditError,
      onRenderMenuItems
    }: {
      document: JsedDocument;
      onEditError: (err: EditorError) => void;
      onRenderMenuItems: () => void;
    }
  ) {
    const editor = Editor.create({
      document,
      userInput: ctl.input
    });
    return new OneputEditDocumentAdapter(ctl, editor, onRenderMenuItems, onEditError);
  }

  static createNull(
    ctl: Controller,
    {
      document,
      onEditError,
      onRenderMenuItems
    }: {
      document: JsedDocument;
      onEditError: (err: EditorError) => void;
      onRenderMenuItems: () => void;
    }
  ) {
    const editor = Editor.createNull({
      document,
      userInput: ctl.input
    });
    return new OneputEditDocumentAdapter(ctl, editor, onRenderMenuItems, onEditError);
  }

  constructor(
    private ctl: Controller,
    /**
     * Expose editor to the consumer.
     */
    public editor: Editor,
    private onRenderMenuItems: () => void,
    private onEditError: (err: EditorError) => void
  ) {}

  private subscribeEditChanges = () => {
    this.editor.eventsEmitter.subscribe({
      onError: (err) => this.onEditError(err),
      onFocusChange: () => {
        this.onRenderMenuItems();
      },
      onCursorChange: () => {
        this.onRenderMenuItems();
      },
      onTextChange: (evt) => {
        switch (evt.type) {
          case 'token-text-change':
          case 'anchor-change':
          case 'whitespace-change':
            this.onRenderMenuItems();
        }
      },
      onElementChange: () => {
        this.onRenderMenuItems();
      }
    });
  };

  private removeSuspendHandler?: () => void;

  start = () => {
    this.editor.start();
    this.onRenderMenuItems();
    this.removeSuspendHandler = this.ctl.events.on('menu-open-change', (isOpen) => {
      this.editor.suspend(isOpen);
    });
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  resume = () => {
    this.editor.suspend(false); // just in case
    this.onRenderMenuItems();
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  suspend = () => {
    // TODO: hack: call subscribe to remove any unwanted callbacks.
    this.editor.eventsEmitter.subscribe();
  };

  exit = () => {
    this.editor.destroy();
    this.removeSuspendHandler?.();
  };

  actions = {
    // #region menu closed

    // Some of these override default bindings...
    // When menuOpen true, the default bindings will take over.
    // TOOD: not sure about this.

    DOWN: {
      action: () => {
        this.editor.moveDown();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.editor.moveUp();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    ENTER: {
      action: () => {
        this.editor.handleEnter().mapErr((err) => {
          switch (err.type) {
            case 'no-token-under-focus':
              this.ctl.notify('No token under focus', { duration: 3000 });
              break;
          }
        });
      },
      binding: {
        bindings: ['enter'],
        description: 'Edit first editable token',
        when: { menuOpen: false }
      }
    },
    // Make arrow keys work in input when menu is open...
    RIGHT_ARROW: {
      action: () => {
        this.editor.moveNext();
      },
      binding: {
        bindings: ['ArrowRight'],
        description: 'Move to next token or element',
        when: { menuOpen: false }
      }
    },
    LEFT_ARROW: {
      action: () => {
        this.editor.movePrevious();
      },
      binding: {
        bindings: ['ArrowLeft'],
        description: 'Move to previous token or element',
        when: { menuOpen: false }
      }
    },
    EXTEND_RIGHT_ARROW: {
      action: () => {
        this.editor.extendNext();
      },
      binding: {
        bindings: ['Shift+ArrowRight'],
        description: 'Extend selection to next LINE_SIBLING',
        when: { menuOpen: false }
      }
    },
    EXTEND_LEFT_ARROW: {
      action: () => {
        this.editor.extendPrevious();
      },
      binding: {
        bindings: ['Shift+ArrowLeft'],
        description: 'Extend selection to previous LINE_SIBLING',
        when: { menuOpen: false }
      }
    },
    EXIT: {
      action: () => {
        if (!this.editor.handleExit()) {
          this.ctl.app.exit();
        }
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing',
        when: { menuOpen: false }
      }
    },
    DELETE: {
      action: (_ctl: Controller, evt?: KeyboardEvent) => {
        this.editor.handleDelete(evt);
      },
      binding: {
        bindings: ['Backspace'],
        description: 'Delete characters',
        when: { menuOpen: false },
        // If preventDefault = true here, input change events caused by the user
        // deleting text in the input will never occur.  We need to set this to
        // false to allow input-based edits.  The action we call here can
        // however call preventDefault if it wants to take control of the delete
        // action and prevent input-based edits.
        preventDefault: false
      }
    },

    // #endregion

    // #region menu open or closed

    // Always handled by the editor, see section above.

    FOCUS: {
      action: () => {
        this.ctl.input.focus();
      },
      binding: {
        bindings: ['$mod+g'],
        description: 'Focus the input'
      }
    },
    TOGGLE_SELECT: {
      action: () => {
        this.ctl.input.toggleSelect();
      },
      binding: {
        bindings: ['$mod+e'],
        description: 'Toggle input element cursor state'
      }
    },
    NEXT: {
      action: () => {
        this.editor.moveNext();
      },
      binding: {
        bindings: ['$mod+l'],
        description: 'Move to next token or element'
      }
    },
    PREVIOUS: {
      action: () => {
        this.editor.movePrevious();
      },
      binding: {
        bindings: ['$mod+h'],
        description: 'Move to previous token or element'
      }
    },
    UNDO: {
      action: () => {
        this.editor.undo();
        this.onRenderMenuItems();
      },
      binding: {
        bindings: ['$mod+z'],
        description: 'Undo'
      }
    },
    REDO: {
      action: () => {
        this.editor.redo();
        this.onRenderMenuItems();
      },
      binding: {
        bindings: ['Shift+$mod+z'],
        description: 'Redo'
      }
    },
    EXTEND_NEXT: {
      action: () => {
        this.editor.extendNext();
      },
      binding: {
        bindings: ['Shift+$mod+l'],
        description: 'Extend selection to next LINE_SIBLING'
      }
    },
    EXTEND_PREVIOUS: {
      action: () => {
        this.editor.extendPrevious();
      },
      binding: {
        bindings: ['Shift+$mod+h'],
        description: 'Extend selection to previous LINE_SIBLING'
      }
    },
    REVEAL: {
      action: () => {
        this.editor.scrollActiveTargetIntoView();
      },
      binding: {
        bindings: ['$mod+m'],
        description: 'Center the active token or reveal the focused element'
      }
    },
    CUT: {
      action: () => {
        if (this.editor.focus.cut()) {
          this.ctl.app.run(PasteElementUI.create(this.ctl, this.editor, { cut: true }));
        }
      },
      binding: {
        bindings: ['$mod+x'],
        description: 'Cut element at focus'
      }
    },
    COPY: {
      action: () => {
        if (this.editor.focus.copy()) {
          this.ctl.app.run(PasteElementUI.create(this.ctl, this.editor, { cut: false }));
        }
      },
      binding: {
        bindings: ['$mod+c'],
        description: 'Copy element at focus'
      }
    },
    COPY_EMPTY_PREVIOUS: {
      action: () => {
        this.editor.focus.copyEmptyPrevious();
      },
      binding: {
        bindings: ['Control+c b'],
        description: 'Copy to empty element before focus'
      }
    },
    COPY_EMPTY_NEXT: {
      action: () => {
        this.editor.focus.copyEmptyNext();
      },
      binding: {
        bindings: ['Control+c a'],
        description: 'Copy to empty element after focus'
      }
    }
    // #endregion
  };

  getMenuItems = ({ renderMenuItems }: { renderMenuItems: () => void }) => {
    const cursor = this.editor.getCursor();
    return [
      this.editor.isEditing() &&
        stdMenuItem({
          id: 'STOP_EDITING',
          textContent: 'Stop editing',
          action: () => {
            this.editor.handleExit({ softExit: false });
          },
          left: (b) => [b.icon(icons.PencilOff)]
        }),
      !this.editor.isEditing() &&
        stdMenuItem({
          id: 'EXIT',
          textContent: 'Exit',
          action: () => {
            this.ctl.app.exit();
          },
          left: (b) => [b.icon(icons.X)]
        }),
      !this.editor.isEditing() &&
        stdMenuItem({
          id: 'EDIT_FIRST',
          textContent: 'Edit content',
          action: this.actions.ENTER.action,
          left: (b) => [b.icon(icons.Pencil)]
        }),

      this.editor.canUndo() &&
        stdMenuItem({
          id: 'UNDO',
          textContent: 'Undo',
          action: this.actions.UNDO.action,
          left: (b) => [b.icon(icons.Undo2)]
        }),

      this.editor.canRedo() &&
        stdMenuItem({
          id: 'REDO',
          textContent: 'Redo',
          action: this.actions.REDO.action,
          left: (b) => [b.icon(icons.Redo2)]
        }),

      // #region focus ops

      this.editor.focus.canCut() &&
        stdMenuItem({
          id: 'CUT_ELEMENT',
          textContent: 'Cut...',
          action: this.actions.CUT.action,
          left: (b) => [b.icon(icons.Scissors)]
        }),

      this.editor.focus.canCopy() &&
        stdMenuItem({
          id: 'COPY_ELEMENT',
          textContent: 'Copy...',
          action: this.actions.COPY.action,
          left: (b) => [b.icon(icons.Copy)]
        }),

      this.editor.focus.canCopyEmpty() &&
        stdMenuItem({
          id: 'COPY_EMPTY_BEFORE',
          textContent: 'Copy to empty element before...',
          action: this.actions.COPY_EMPTY_PREVIOUS.action,
          left: (b) => [b.icon(icons.BetweenHorizonalStart)]
        }),

      this.editor.focus.canCopyEmpty() &&
        stdMenuItem({
          id: 'COPY_EMPTY_AFTER',
          textContent: 'Copy to empty element after...',
          action: this.actions.COPY_EMPTY_NEXT.action,
          left: (b) => [b.icon(icons.BetweenHorizonalStart)]
        }),

      this.editor.focus.canDelete() &&
        stdMenuItem({
          id: 'DELETE_FOCUSED_ELEMENT',
          textContent: 'Delete focused element...',
          action: async () => {
            const confirm = this.ctl.confirm({
              message: `Delete element?`
            });
            const yes = await confirm.userChooses();
            if (!yes) {
              return;
            }

            this.editor.focus.delete();
            this.ctl.menu.closeMenu();
          },
          left: (b) => [b.icon(icons.X)]
        }),

      this.editor.focus.canUnwrap() &&
        stdMenuItem({
          id: 'UNWRAP_FOCUS',
          textContent: 'Unwrap...',
          action: () => {
            this.editor.focus.unwrap();
          },
          left: (b) => [b.icon(icons.CodeXml)]
        }),

      this.editor.focus.canConvert() &&
        stdMenuItem({
          id: 'CONVERT_FOCUS',
          textContent: 'Convert...',
          action: () => {
            const candidates = this.editor.focus.getConversionCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.ArrowLeft,
                action: () => {
                  this.editor.focus.convert(tagName);
                }
              };
            });

            this.ctl.app.run(
              PickListUI.create(this.ctl, {
                prompt: 'Select item from menu...',
                title: 'Convert to...',
                candidates,
                manualEntry: {
                  title: 'Convert to...',
                  text: 'Type tag name...',
                  prompt: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    this.editor.focus.convert(item);
                  }
                }
              })
            );
          },
          left: (b) => [b.icon(icons.CodeXml)],
          closeMenuOnAction: false
        }),

      this.editor.focus.canInsertAfter() &&
        stdMenuItem({
          id: 'INSERT_ELEMENT_AFTER_FOCUS',
          textContent: 'Insert element after...',
          left: (b) => [b.icon(icons.Plus)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = this.editor.focus
              .getInsertAfterCandidates()
              .map((tagName, index) => {
                return {
                  id: `${tagName}-${index}`,
                  text: `<${tagName}>`,
                  icon: icons.Plus,
                  action: () => {
                    this.editor.focus.insertNewAfter(tagName);
                  }
                };
              });

            this.ctl.app.run(
              PickListUI.create(this.ctl, {
                prompt: 'Select item from menu...',
                title: 'Insert after...',
                candidates,
                manualEntry: {
                  title: 'Insert after...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    this.editor.focus.insertNewAfter(item);
                  }
                }
              })
            );
          }
        }),

      this.editor.focus.canInsertBefore() &&
        stdMenuItem({
          id: 'INSERT_ELEMENT_BEFORE_FOCUS',
          textContent: 'Insert element before...',
          left: (b) => [b.icon(icons.Plus)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = this.editor.focus
              .getInsertBeforeCandidates()
              .map((tagName, index) => {
                return {
                  id: `${tagName}-${index}`,
                  text: `<${tagName}>`,
                  icon: icons.Plus,
                  action: () => {
                    this.editor.focus.insertNewBefore(tagName);
                  }
                };
              });

            this.ctl.app.run(
              PickListUI.create(this.ctl, {
                prompt: 'Select item from menu...',
                title: 'Insert before...',
                candidates,
                manualEntry: {
                  title: 'Insert before...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    this.editor.focus.insertNewBefore(item);
                  }
                }
              })
            );
          }
        }),

      this.editor.focus.canAppend() &&
        stdMenuItem({
          id: 'APPEND_NEW_ELEMENT_IN_FOCUS',
          textContent: 'Insert new element within (append)...',
          left: (b) => [b.icon(icons.Plus)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = this.editor.focus.getAppendCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.Plus,
                action: () => {
                  this.editor.focus.appendNew(tagName);
                }
              };
            });

            this.ctl.app.run(
              PickListUI.create(this.ctl, {
                prompt: 'Select item from menu...',
                title: 'Append new element...',
                candidates,
                manualEntry: {
                  title: 'Append new element...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    this.editor.focus.appendNew(item);
                  }
                }
              })
            );
          }
        }),

      // #endregion

      // #region cursor ops

      cursor &&
        cursor.canWrap() &&
        stdMenuItem({
          id: 'WRAP_SELECTION',
          textContent: 'Wrap selection...',
          left: (b) => [b.icon(icons.SquareCode)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = cursor.getWrapCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.Plus,
                action: () => {
                  const wrapped = cursor.wrap(tagName);
                  if (!wrapped) {
                    this.ctl.notify('Could not wrap cursor with that tag', { duration: 3000 });
                  }
                }
              };
            });

            this.ctl.app.run(
              PickListUI.create(this.ctl, {
                prompt: 'Select wrapping element from menu...',
                title: 'Wrap selection...',
                candidates,
                manualEntry: {
                  title: 'Wrap selection...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    const wrapped = cursor.wrap(item);
                    if (!wrapped) {
                      this.ctl.notify('Could not wrap cursor with that tag', { duration: 3000 });
                    }
                  }
                }
              })
            );
          }
        }),

      // #endregion

      // #region leading/trailing spaces

      this.editor.focus.space.canInsertSpaceBeforeTag() &&
        stdMenuItem({
          id: 'INSERT_SPACE_BEFORE_TAG',
          textContent: 'Insert space before tag...',
          action: () => {
            this.editor.focus.space.insertSpaceBeforeTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      this.editor.focus.space.canRemoveSpaceBeforeTag() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_BEFORE_TAG',
          textContent: 'Remove space before tag...',
          action: () => {
            this.editor.focus.space.removeSpaceBeforeTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      this.editor.focus.space.canInsertSpaceAfterTag() &&
        stdMenuItem({
          id: 'INSERT_SPACE_AFTER_TAG',
          textContent: 'Insert space after tag...',
          action: () => {
            this.editor.focus.space.insertSpaceAfterTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      this.editor.focus.space.canRemoveSpaceAfterTag() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_AFTER_TAG',
          textContent: 'Remove space after tag...',
          action: () => {
            this.editor.focus.space.removeSpaceAfterTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),

      this.editor.cursorOps.canInsertSpaceAfter() &&
        stdMenuItem({
          id: 'INSERT_SPACE_AFTER_CURSOR',
          textContent: 'Insert trailing space after cursor...',
          action: () => {
            this.editor.cursorOps.insertSpaceAfter();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      this.editor.cursorOps.canRemoveSpaceAfter() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_AFTER_CURSOR',
          textContent: 'Remove trailing space after cursor...',
          action: () => {
            this.editor.cursorOps.removeSpaceAfter();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      this.editor.cursorOps.canInsertSpaceBefore() &&
        stdMenuItem({
          id: 'INSERT_SPACE_BEFORE_CURSOR',
          textContent: 'Insert leading space before cursor...',
          action: () => {
            this.editor.cursorOps.insertSpaceBefore();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      this.editor.cursorOps.canRemoveSpaceBefore() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_BEFORE_CURSOR',
          textContent: 'Remove leading space before cursor...',
          action: () => {
            this.editor.cursorOps.removeSpaceBefore();
          },
          left: (b) => [b.icon(icons.Space)]
        }),

      // #endregion

      // #region anchor ops

      this.editor.anchor.canInsertInFocus() &&
        stdMenuItem({
          id: 'INSERT_ANCHOR_IN_LINE',
          textContent: 'Insert anchor in empty line...',
          action: () => {
            this.editor.anchor.insertInFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      this.editor.anchor.canInsertBeforeFocus() &&
        stdMenuItem({
          id: 'INSERT_ANCHOR_BEFORE_TAG',
          textContent: 'Insert anchor before tag...',
          action: () => {
            this.editor.anchor.insertBeforeFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      this.editor.anchor.canRemoveBeforeFocus() &&
        stdMenuItem({
          id: 'REMOVE_ANCHOR_BEFORE_TAG',
          textContent: 'Remove anchor before tag...',
          action: () => {
            this.editor.anchor.removeBeforeFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      this.editor.anchor.canInsertAfterFocus() &&
        stdMenuItem({
          id: 'INSERT_ANCHOR_AFTER_TAG',
          textContent: 'Insert anchor after tag...',
          action: () => {
            this.editor.anchor.insertAfterFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      this.editor.anchor.canRemoveAfterFocus() &&
        stdMenuItem({
          id: 'REMOVE_ANCHOR_AFTER_TAG',
          textContent: 'Remove anchor after tag...',
          action: () => {
            this.editor.anchor.removeAfterFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),

      // #endregion

      checkboxMenuItem({
        id: 'ENABLE_LEGACY_ELEMENT_INDICATOR',
        textContent: 'Use legacy element indicator',
        closeMenuOnAction: false,
        action: (_, bool) => {
          this.editor.enableLegacyElementIndicator(bool);
          renderMenuItems();
        },
        checked: this.editor.legacyElementIndicatorEnabled
      }),
      checkboxMenuItem({
        id: 'ENABLE_ELEMENT_INDICATOR',
        textContent: 'Use modern element indicator',
        closeMenuOnAction: false,
        action: (_, bool) => {
          this.editor.enableElementIndicator(bool);
          renderMenuItems();
        },
        checked: this.editor.elementIndicatorEnabled
      })
    ];
  };
}
