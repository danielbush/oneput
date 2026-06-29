import type { AppActions, Controller, MenuItemAny } from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { Editor } from '../editor/Editor.js';
import { icons } from './lib/icons.js';
import { PasteElementUI } from './lib/PasteElementUI.js';
import { PickListUI } from './lib/PickListUI.js';

type OneputAction = AppActions[string];

export type EditDocumentActions = AppActions & {
  DOWN: OneputAction;
  UP: OneputAction;
  ENTER: OneputAction;
  RIGHT_ARROW: OneputAction;
  LEFT_ARROW: OneputAction;
  EXTEND_RIGHT_ARROW: OneputAction;
  EXTEND_LEFT_ARROW: OneputAction;
  EXIT: OneputAction;
  DELETE: OneputAction;
  FOCUS: OneputAction;
  TOGGLE_SELECT: OneputAction;
  NEXT: OneputAction;
  PREVIOUS: OneputAction;
  UNDO: OneputAction;
  REDO: OneputAction;
  EXTEND_NEXT: OneputAction;
  EXTEND_PREVIOUS: OneputAction;
  REVEAL: OneputAction;
  CUT: OneputAction;
  COPY: OneputAction;
  COPY_EMPTY_PREVIOUS: OneputAction;
  COPY_EMPTY_NEXT: OneputAction;
};

type MenuItemList = Array<MenuItemAny | undefined | null | '' | false>;

/**
 * Owns the Oneput controls for an active Jsed editor: the (stable) keybinding
 * actions and the (live) menu items that reuse them.
 *
 * Both `getActions()` and `getMenuItems()` recompute on every call — actions are
 * handed to Oneput in its function form (`ctl.app.invalidateActions()` re-pulls
 * them), and menu items read live editor state (`isEditing()`, `canUndo()`, focus
 * capabilities) and are pulled fresh on start/resume, on open, and via
 * `ctl.menu.invalidate()`.
 */
export class EditDocumentControls {
  /**
   * @param invalidateMenu Optional override for refreshing the menu after an
   * edit. Defaults to `ctl.menu.invalidate()` (the declarative pull). Pass your
   * own only if the consumer populates its menu imperatively (no declarative
   * `menu()`), where `invalidate()` would be a no-op.
   */
  static create(
    ctl: Controller,
    editor: Editor,
    opts?: { invalidateMenu?: () => void }
  ): EditDocumentControls {
    const invalidate = opts?.invalidateMenu ?? (() => ctl.menu.invalidate());
    return new EditDocumentControls(ctl, editor, invalidate);
  }

  private constructor(
    private ctl: Controller,
    private editor: Editor,
    private invalidate: () => void
  ) {}

  /** Keybinding actions. Pass to Oneput's `actions` in function form so they can be re-pulled. */
  getActions(): EditDocumentActions {
    const { ctl, editor, invalidate } = this;
    return {
      DOWN: {
        action: () => {
          editor.moveDown();
        },
        binding: {
          bindings: ['$mod+j', 'ArrowDown'],
          description: 'Navigate to next sibling',
          when: { menuOpen: false }
        }
      },
      UP: {
        action: () => {
          editor.moveUp();
        },
        binding: {
          bindings: ['$mod+k', 'ArrowUp'],
          description: 'Navigate to previous sibling',
          when: { menuOpen: false }
        }
      },
      ENTER: {
        action: () => {
          editor.handleEnter().mapErr((err) => {
            switch (err.type) {
              case 'no-token-under-focus':
                ctl.notify('No token under focus', { duration: 3000 });
                break;
            }
          });
        },
        binding: {
          bindings: ['Enter'],
          description: 'Edit first editable token',
          when: { menuOpen: false }
        }
      },
      RIGHT_ARROW: {
        action: () => {
          editor.moveNext();
        },
        binding: {
          bindings: ['ArrowRight'],
          description: 'Move to next token or element',
          when: { menuOpen: false }
        }
      },
      LEFT_ARROW: {
        action: () => {
          editor.movePrevious();
        },
        binding: {
          bindings: ['ArrowLeft'],
          description: 'Move to previous token or element',
          when: { menuOpen: false }
        }
      },
      EXTEND_RIGHT_ARROW: {
        action: () => {
          editor.extendNext();
        },
        binding: {
          bindings: ['Shift+ArrowRight'],
          description: 'Extend selection to next LINE_SIBLING',
          when: { menuOpen: false }
        }
      },
      EXTEND_LEFT_ARROW: {
        action: () => {
          editor.extendPrevious();
        },
        binding: {
          bindings: ['Shift+ArrowLeft'],
          description: 'Extend selection to next LINE_SIBLING',
          when: { menuOpen: false }
        }
      },
      EXIT: {
        action: () => {
          if (!editor.handleExit()) {
            ctl.app.exit();
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
          editor.handleDelete(evt);
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
      FOCUS: {
        action: () => {
          ctl.input.focus();
        },
        binding: {
          bindings: ['$mod+g'],
          description: 'Focus the input'
        }
      },
      TOGGLE_SELECT: {
        action: () => {
          ctl.input.toggleSelect();
        },
        binding: {
          bindings: ['$mod+e'],
          description: 'Toggle input element cursor state'
        }
      },
      NEXT: {
        action: () => {
          editor.moveNext();
        },
        binding: {
          bindings: ['$mod+l'],
          description: 'Move to next token or element'
        }
      },
      PREVIOUS: {
        action: () => {
          editor.movePrevious();
        },
        binding: {
          bindings: ['$mod+h'],
          description: 'Move to previous token or element'
        }
      },
      UNDO: {
        action: () => {
          editor.undo();
          invalidate();
        },
        binding: {
          bindings: ['$mod+z'],
          description: 'Undo'
        }
      },
      REDO: {
        action: () => {
          editor.redo();
          invalidate();
        },
        binding: {
          bindings: ['Shift+$mod+z'],
          description: 'Redo'
        }
      },
      EXTEND_NEXT: {
        action: () => {
          editor.extendNext();
        },
        binding: {
          bindings: ['Shift+$mod+l'],
          description: 'Extend selection to next LINE_SIBLING'
        }
      },
      EXTEND_PREVIOUS: {
        action: () => {
          editor.extendPrevious();
        },
        binding: {
          bindings: ['Shift+$mod+h'],
          description: 'Extend selection to previous LINE_SIBLING'
        }
      },
      REVEAL: {
        action: () => {
          editor.scrollActiveTargetIntoView();
        },
        binding: {
          bindings: ['$mod+m'],
          description: 'Center the active token or reveal the focused element'
        }
      },
      CUT: {
        action: () => {
          if (editor.focus.cut()) {
            ctl.app.run(PasteElementUI.create(ctl, editor, { cut: true }));
          }
        },
        binding: {
          bindings: ['$mod+x'],
          description: 'Cut element at focus'
        }
      },
      COPY: {
        action: () => {
          if (editor.focus.copy()) {
            ctl.app.run(PasteElementUI.create(ctl, editor, { cut: false }));
          }
        },
        binding: {
          bindings: ['$mod+c'],
          description: 'Copy element at focus'
        }
      },
      COPY_EMPTY_PREVIOUS: {
        action: () => {
          editor.focus.copyEmptyPrevious();
        },
        binding: {
          bindings: ['Control+c b'],
          description: 'Copy to empty element before focus'
        }
      },
      COPY_EMPTY_NEXT: {
        action: () => {
          editor.focus.copyEmptyNext();
        },
        binding: {
          bindings: ['Control+c a'],
          description: 'Copy to empty element after focus'
        }
      }
    };
  }

  /** Live menu items, rebuilt from current editor state on every call. Do not memoize. */
  getMenuItems(): MenuItemList {
    const { ctl, editor, invalidate } = this;
    const actions = this.getActions();
    const cursor = editor.getCursor();
    return [
      editor.isEditing() &&
        stdMenuItem({
          id: 'STOP_EDITING',
          textContent: 'Stop editing',
          action: () => {
            editor.handleExit({ softExit: false });
          },
          left: (b) => [b.icon(icons.PencilOff)]
        }),
      !editor.isEditing() &&
        ctl.app.canGoBack() &&
        stdMenuItem({
          id: 'EXIT',
          textContent: 'Exit',
          action: () => {
            ctl.app.exit();
          },
          left: (b) => [b.icon(icons.X)]
        }),
      !editor.isEditing() &&
        stdMenuItem({
          id: 'EDIT_FIRST',
          textContent: 'Edit text',
          action: actions.ENTER.action,
          left: (b) => [b.icon(icons.Pencil)]
        }),

      editor.canUndo() &&
        stdMenuItem({
          id: 'UNDO',
          textContent: 'Undo',
          action: actions.UNDO.action,
          left: (b) => [b.icon(icons.Undo2)]
        }),

      editor.canRedo() &&
        stdMenuItem({
          id: 'REDO',
          textContent: 'Redo',
          action: actions.REDO.action,
          left: (b) => [b.icon(icons.Redo2)]
        }),

      editor.focus.canCut() &&
        stdMenuItem({
          id: 'CUT_ELEMENT',
          textContent: 'Cut...',
          action: actions.CUT.action,
          left: (b) => [b.icon(icons.Scissors)]
        }),

      editor.focus.canCopy() &&
        stdMenuItem({
          id: 'COPY_ELEMENT',
          textContent: 'Copy...',
          action: actions.COPY.action,
          left: (b) => [b.icon(icons.Copy)]
        }),

      editor.focus.canCopyEmpty() &&
        stdMenuItem({
          id: 'COPY_EMPTY_BEFORE',
          textContent: 'Copy to empty element before...',
          action: actions.COPY_EMPTY_PREVIOUS.action,
          left: (b) => [b.icon(icons.BetweenHorizonalStart)]
        }),

      editor.focus.canCopyEmpty() &&
        stdMenuItem({
          id: 'COPY_EMPTY_AFTER',
          textContent: 'Copy to empty element after...',
          action: actions.COPY_EMPTY_NEXT.action,
          left: (b) => [b.icon(icons.BetweenHorizonalStart)]
        }),

      editor.focus.canDelete() &&
        stdMenuItem({
          id: 'DELETE_FOCUSED_ELEMENT',
          textContent: 'Remove focused element...',
          action: async () => {
            const confirm = ctl.confirm({
              message: `Remove element?`
            });
            const yes = await confirm.userChooses();
            if (!yes) {
              return;
            }

            editor.focus.delete();
            ctl.menu.closeMenu();
          },
          left: (b) => [b.icon(icons.X)]
        }),

      editor.focus.canUnwrap() &&
        stdMenuItem({
          id: 'UNWRAP_FOCUS',
          textContent: 'Unwrap...',
          action: () => {
            editor.focus.unwrap();
          },
          left: (b) => [b.icon(icons.CodeXml)]
        }),

      editor.focus.canConvert() &&
        stdMenuItem({
          id: 'CONVERT_FOCUS',
          textContent: 'Convert...',
          action: () => {
            const candidates = editor.focus.getConversionCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.ArrowLeft,
                action: () => {
                  editor.focus.convert(tagName);
                }
              };
            });

            ctl.app.run(
              PickListUI.create(ctl, {
                prompt: 'Select item from menu...',
                title: 'Convert to...',
                candidates,
                manualEntry: {
                  title: 'Convert to...',
                  text: 'Type tag name...',
                  prompt: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    editor.focus.convert(item);
                  }
                }
              })
            );
          },
          left: (b) => [b.icon(icons.CodeXml)],
          closeMenuOnAction: false
        }),

      editor.focus.canInsertAfter() &&
        stdMenuItem({
          id: 'INSERT_ELEMENT_AFTER_FOCUS',
          textContent: 'Insert element after...',
          left: (b) => [b.icon(icons.Plus)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = editor.focus.getInsertAfterCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.Plus,
                action: () => {
                  editor.focus.insertNewAfter(tagName);
                }
              };
            });

            ctl.app.run(
              PickListUI.create(ctl, {
                prompt: 'Select item from menu...',
                title: 'Insert after...',
                candidates,
                manualEntry: {
                  title: 'Insert after...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    editor.focus.insertNewAfter(item);
                  }
                }
              })
            );
          }
        }),

      editor.focus.canInsertBefore() &&
        stdMenuItem({
          id: 'INSERT_ELEMENT_BEFORE_FOCUS',
          textContent: 'Insert element before...',
          left: (b) => [b.icon(icons.Plus)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = editor.focus.getInsertBeforeCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.Plus,
                action: () => {
                  editor.focus.insertNewBefore(tagName);
                }
              };
            });

            ctl.app.run(
              PickListUI.create(ctl, {
                prompt: 'Select item from menu...',
                title: 'Insert before...',
                candidates,
                manualEntry: {
                  title: 'Insert before...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    editor.focus.insertNewBefore(item);
                  }
                }
              })
            );
          }
        }),

      editor.focus.canAppend() &&
        stdMenuItem({
          id: 'APPEND_NEW_ELEMENT_IN_FOCUS',
          textContent: 'Insert new element within (append)...',
          left: (b) => [b.icon(icons.Plus)],
          closeMenuOnAction: false,
          action: () => {
            const candidates = editor.focus.getAppendCandidates().map((tagName, index) => {
              return {
                id: `${tagName}-${index}`,
                text: `<${tagName}>`,
                icon: icons.Plus,
                action: () => {
                  editor.focus.appendNew(tagName);
                }
              };
            });

            ctl.app.run(
              PickListUI.create(ctl, {
                prompt: 'Select item from menu...',
                title: 'Append new element...',
                candidates,
                manualEntry: {
                  title: 'Append new element...',
                  prompt: 'Type tag name...',
                  text: 'Type tag name...',
                  icon: icons.Pencil,
                  action: (item: string) => {
                    editor.focus.appendNew(item);
                  }
                }
              })
            );
          }
        }),

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
                    ctl.notify('Could not wrap cursor with that tag', { duration: 3000 });
                  }
                }
              };
            });

            ctl.app.run(
              PickListUI.create(ctl, {
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
                      ctl.notify('Could not wrap cursor with that tag', { duration: 3000 });
                    }
                  }
                }
              })
            );
          }
        }),

      editor.focus.space.canInsertSpaceBeforeTag() &&
        stdMenuItem({
          id: 'INSERT_SPACE_BEFORE_TAG',
          textContent: 'Insert space before tag...',
          action: () => {
            editor.focus.space.insertSpaceBeforeTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      editor.focus.space.canRemoveSpaceBeforeTag() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_BEFORE_TAG',
          textContent: 'Remove space before tag...',
          action: () => {
            editor.focus.space.removeSpaceBeforeTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      editor.focus.space.canInsertSpaceAfterTag() &&
        stdMenuItem({
          id: 'INSERT_SPACE_AFTER_TAG',
          textContent: 'Insert space after tag...',
          action: () => {
            editor.focus.space.insertSpaceAfterTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      editor.focus.space.canRemoveSpaceAfterTag() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_AFTER_TAG',
          textContent: 'Remove space after tag...',
          action: () => {
            editor.focus.space.removeSpaceAfterTag();
          },
          left: (b) => [b.icon(icons.Space)]
        }),

      editor.cursorOps.canInsertSpaceAfter() &&
        stdMenuItem({
          id: 'INSERT_SPACE_AFTER_CURSOR',
          textContent: 'Insert trailing space after cursor...',
          action: () => {
            editor.cursorOps.insertSpaceAfter();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      editor.cursorOps.canRemoveSpaceAfter() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_AFTER_CURSOR',
          textContent: 'Remove trailing space after cursor...',
          action: () => {
            editor.cursorOps.removeSpaceAfter();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      editor.cursorOps.canInsertSpaceBefore() &&
        stdMenuItem({
          id: 'INSERT_SPACE_BEFORE_CURSOR',
          textContent: 'Insert leading space before cursor...',
          action: () => {
            editor.cursorOps.insertSpaceBefore();
          },
          left: (b) => [b.icon(icons.Space)]
        }),
      editor.cursorOps.canRemoveSpaceBefore() &&
        stdMenuItem({
          id: 'REMOVE_SPACE_BEFORE_CURSOR',
          textContent: 'Remove leading space before cursor...',
          action: () => {
            editor.cursorOps.removeSpaceBefore();
          },
          left: (b) => [b.icon(icons.Space)]
        }),

      editor.anchor.canInsertInFocus() &&
        stdMenuItem({
          id: 'INSERT_ANCHOR_IN_LINE',
          textContent: 'Insert anchor in empty line...',
          action: () => {
            editor.anchor.insertInFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      editor.anchor.canInsertBeforeFocus() &&
        stdMenuItem({
          id: 'INSERT_ANCHOR_BEFORE_TAG',
          textContent: 'Insert anchor before tag...',
          action: () => {
            editor.anchor.insertBeforeFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      editor.anchor.canRemoveBeforeFocus() &&
        stdMenuItem({
          id: 'REMOVE_ANCHOR_BEFORE_TAG',
          textContent: 'Remove anchor before tag...',
          action: () => {
            editor.anchor.removeBeforeFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      editor.anchor.canInsertAfterFocus() &&
        stdMenuItem({
          id: 'INSERT_ANCHOR_AFTER_TAG',
          textContent: 'Insert anchor after tag...',
          action: () => {
            editor.anchor.insertAfterFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),
      editor.anchor.canRemoveAfterFocus() &&
        stdMenuItem({
          id: 'REMOVE_ANCHOR_AFTER_TAG',
          textContent: 'Remove anchor after tag...',
          action: () => {
            editor.anchor.removeAfterFocus();
          },
          left: (b) => [b.icon(icons.Anchor)]
        }),

      checkboxMenuItem({
        id: 'ENABLE_LEGACY_ELEMENT_INDICATOR',
        textContent: 'Use legacy element indicator',
        closeMenuOnAction: false,
        action: (_, bool) => {
          editor.enableLegacyElementIndicator(bool);
          invalidate();
        },
        checked: editor.legacyElementIndicatorEnabled
      }),
      checkboxMenuItem({
        id: 'ENABLE_ELEMENT_INDICATOR',
        textContent: 'Use modern element indicator',
        closeMenuOnAction: false,
        action: (_, bool) => {
          editor.enableElementIndicator(bool);
          invalidate();
        },
        checked: editor.elementIndicatorEnabled
      })
    ];
  }
}
