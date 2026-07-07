import {
  ActionCatalog,
  type ActionCatalogEntries,
  type ActionCatalogMenuItem,
  type AppActionCatalog,
  type AppActions,
  type Controller
} from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { Editor } from '../../editor/Editor.js';
import { JsedCommand, type JsedActionId } from './JsedCommand.js';
import { icons } from './lib/icons.js';
import { PickListUI } from './lib/PickListUI.js';

type CatalogEntries = ActionCatalogEntries<JsedActionId>;

/**
 * Defines reusable Jsed actions, bindings, and hand-authored menu item rows.
 *
 * AppObjects derive a filtered catalog for their mode, expose `getActions()` to
 * Oneput, then explicitly compose menu rows with `getMenuItems([...])`.
 */
export class JsedCatalog implements AppActionCatalog<JsedActionId> {
  static create(
    ctl: Controller,
    editor: Editor,
    opts?: {
      invalidateMenu?: () => void;
      // PasteElementUI imports this module atm, so inject it here to avoid circular import.
      runPasteElement?: (cut: boolean) => void;
    }
  ) {
    const invalidateMenu = opts?.invalidateMenu ?? (() => ctl.menu.invalidate());
    return new JsedCatalog(ctl, editor, {
      invalidateMenu,
      runPasteElement: opts?.runPasteElement ?? (() => {})
    });
  }

  private constructor(
    private ctl: Controller,
    private editor: Editor,
    private opts: {
      invalidateMenu: () => void;
      runPasteElement: (cut: boolean) => void;
    },
    private activeIds?: Set<JsedActionId>
  ) {}

  filter(ids: JsedActionId[]) {
    return new JsedCatalog(this.ctl, this.editor, this.opts, new Set(ids));
  }

  getActions(): AppActions {
    return this.getCatalog().getActions();
  }

  getMenuItems(ids: JsedActionId[]): ActionCatalogMenuItem[] {
    return this.getCatalog().getMenuItems(ids);
  }

  private getCatalog() {
    const catalog = ActionCatalog.create<JsedActionId>(() => this.getEntries());
    if (!this.activeIds) return catalog;
    return catalog.filter([...this.activeIds]);
  }

  /**
   * Define every reusable editor catalog entry.
   *
   * This is the unfiltered catalog: each entry is keyed by `JsedAction` id and
   * may include an action handler, key binding, menu row preset, and menu
   * visibility predicate. AppObjects select from these entries with `filter()`.
   */
  private getEntries(): CatalogEntries {
    const { ctl, editor } = this;

    return {
      [JsedCommand.STOP_EDITING]: {
        action: () => {
          editor.handleExit({ softExit: false });
        },
        canShowMenuItem: () => editor.isEditing(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'STOP_EDITING',
            textContent: 'Stop editing',
            left: (b) => [b.icon(icons.PencilOff)],
            action
          })
      },

      [JsedCommand.SOFT_EXIT]: {
        action: () => {
          if (!editor.handleExit()) {
            ctl.app.exit();
          }
        },
        binding: {
          bindings: ['Control+[', '$mod+[', 'Escape'],
          description: 'Progressively exit',
          when: { menuOpen: false }
        }
      },

      [JsedCommand.EXIT_EDITOR]: {
        action: () => {
          ctl.app.exit();
        },
        canShowMenuItem: () => !editor.isEditing() && ctl.app.canGoBack(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'EXIT',
            textContent: 'Exit',
            left: (b) => [b.icon(icons.X)],
            action
          })
      },

      [JsedCommand.CANCEL_VIA_EXIT]: {
        action: () => {
          ctl.app.exit();
        },
        binding: {
          bindings: ['Escape'],
          description: 'Cancel operation'
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'EXIT',
            textContent: 'Cancel',
            left: (b) => [b.icon(icons.CircleX)],
            action
          })
      },

      // TODO: move to oneput catalog
      [JsedCommand.FOCUS]: {
        action: () => {
          ctl.input.focus();
        },
        binding: {
          bindings: ['$mod+g'],
          description: 'Focus the input'
        }
      },

      ...this.navigation(),
      ...this.selection(),
      ...this.editing(),
      ...this.undo(),
      ...this.copyPaste(),
      ...this.focusOps(),
      ...this.focusSpaceOps(),
      ...this.focusAnchorOps(),
      ...this.cursorOps(),
      ...this.misc()
    };
  }

  private navigation(): CatalogEntries {
    const { editor } = this;
    return {
      [JsedCommand.DOWN]: {
        action: () => {
          editor.moveDown();
        },
        binding: {
          bindings: ['$mod+j', 'ArrowDown'],
          description: 'Navigate to next sibling',
          when: { menuOpen: false }
        }
      },
      [JsedCommand.UP]: {
        action: () => {
          editor.moveUp();
        },
        binding: {
          bindings: ['$mod+k', 'ArrowUp'],
          description: 'Navigate to previous sibling',
          when: { menuOpen: false }
        }
      },
      [JsedCommand.NEXT]: {
        action: () => {
          editor.moveNext();
        },
        binding: {
          bindings: ['$mod+l'],
          description: 'Move to next token or element'
        }
      },
      [JsedCommand.PREVIOUS]: {
        action: () => {
          editor.movePrevious();
        },
        binding: {
          bindings: ['$mod+h'],
          description: 'Move to previous token or element'
        }
      },
      [JsedCommand.RIGHT_ARROW]: {
        action: () => {
          editor.moveNext();
        },
        binding: {
          bindings: ['ArrowRight'],
          description: 'Move to next token or element',
          when: { menuOpen: false }
        }
      },
      [JsedCommand.LEFT_ARROW]: {
        action: () => {
          editor.movePrevious();
        },
        binding: {
          bindings: ['ArrowLeft'],
          description: 'Move to previous token or element',
          when: { menuOpen: false }
        }
      },
      [JsedCommand.REVEAL]: {
        action: () => {
          editor.scrollActiveTargetIntoView();
        },
        binding: {
          bindings: ['$mod+m'],
          description: 'Center the active token or reveal the focused element'
        }
      }
    };
  }

  private selection(): CatalogEntries {
    const { ctl, editor } = this;
    return {
      [JsedCommand.WRAP_SELECTION]: {
        action: () => {
          const cursor = editor.getCursor();
          if (!cursor) return;

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
        },
        canShowMenuItem: () => {
          const cursor = editor.getCursor();
          return !!cursor && cursor.canWrap();
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'WRAP_SELECTION',
            textContent: 'Wrap selection...',
            left: (b) => [b.icon(icons.SquareCode)],
            closeMenuOnAction: false,
            action
          })
      },
      [JsedCommand.EXTEND_NEXT]: {
        action: () => {
          editor.extendNext();
        },
        binding: {
          bindings: ['Shift+$mod+l'],
          description: 'Extend selection to next LINE_SIBLING'
        }
      },
      [JsedCommand.EXTEND_PREVIOUS]: {
        action: () => {
          editor.extendPrevious();
        },
        binding: {
          bindings: ['Shift+$mod+h'],
          description: 'Extend selection to previous LINE_SIBLING'
        }
      },
      [JsedCommand.EXTEND_RIGHT_ARROW]: {
        action: () => {
          editor.extendNext();
        },
        binding: {
          bindings: ['Shift+ArrowRight'],
          description: 'Extend selection to next LINE_SIBLING',
          when: { menuOpen: false }
        }
      },
      [JsedCommand.EXTEND_LEFT_ARROW]: {
        action: () => {
          editor.extendPrevious();
        },
        binding: {
          bindings: ['Shift+ArrowLeft'],
          description: 'Extend selection to next LINE_SIBLING',
          when: { menuOpen: false }
        }
      }
    };
  }

  private editing(): CatalogEntries {
    const { ctl, editor } = this;
    return {
      [JsedCommand.ENTER]: {
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
        },
        canShowMenuItem: () => !editor.isEditing(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'EDIT_FIRST',
            textContent: 'Edit text',
            left: (b) => [b.icon(icons.Pencil)],
            action
          })
      },
      [JsedCommand.DELETE]: {
        action: (_ctl, context) => {
          editor.handleDelete(context?.source === 'keyboard' ? context.event : undefined);
        },
        binding: {
          bindings: ['Backspace'],
          description: 'Delete characters',
          when: { menuOpen: false },
          // If preventDefault = true here, input change events caused by the user
          // deleting text in the input will never occur. We need to set this to
          // false to allow input-based edits. The action we call here can however
          // call preventDefault if it wants to take control of the delete action.
          preventDefault: false
        }
      },
      [JsedCommand.TOGGLE_SELECT]: {
        action: () => {
          ctl.input.toggleSelect();
        },
        binding: {
          bindings: ['$mod+e'],
          description: 'Toggle input element cursor state'
        }
      }
    };
  }

  private undo(): CatalogEntries {
    const { opts, editor } = this;
    return {
      [JsedCommand.UNDO]: {
        action: () => {
          editor.undo();
          opts.invalidateMenu();
        },
        binding: {
          bindings: ['$mod+z'],
          description: 'Undo'
        },
        canShowMenuItem: () => editor.canUndo(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'UNDO',
            textContent: 'Undo',
            left: (b) => [b.icon(icons.Undo2)],
            action
          })
      },
      [JsedCommand.REDO]: {
        action: () => {
          editor.redo();
          opts.invalidateMenu();
        },
        binding: {
          bindings: ['Shift+$mod+z'],
          description: 'Redo'
        },
        canShowMenuItem: () => editor.canRedo(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REDO',
            textContent: 'Redo',
            left: (b) => [b.icon(icons.Redo2)],
            action
          })
      }
    };
  }

  private copyPaste(): CatalogEntries {
    const { ctl, opts, editor } = this;
    const pasteAndExit = (paste: () => boolean) => {
      paste();
      ctl.app.exit();
    };
    return {
      [JsedCommand.CUT]: {
        action: () => {
          if (editor.focusOps.cut()) {
            opts.runPasteElement(true);
          }
        },
        binding: {
          bindings: ['$mod+x'],
          description: 'Cut element at focus'
        },
        canShowMenuItem: () => editor.focusOps.canCut(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'CUT_ELEMENT',
            textContent: 'Cut...',
            left: (b) => [b.icon(icons.Scissors)],
            action
          })
      },
      [JsedCommand.COPY]: {
        action: () => {
          if (editor.focusOps.copy()) {
            opts.runPasteElement(false);
          }
        },
        binding: {
          bindings: ['$mod+c'],
          description: 'Copy element at focus'
        },
        canShowMenuItem: () => editor.focusOps.canCopy(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'COPY_ELEMENT',
            textContent: 'Copy...',
            left: (b) => [b.icon(icons.Copy)],
            action
          })
      },
      [JsedCommand.COPY_EMPTY_PREVIOUS]: {
        action: () => {
          editor.focusOps.copyEmptyPrevious();
        },
        binding: {
          bindings: ['Control+c b'],
          description: 'Copy to empty element before focus'
        },
        canShowMenuItem: () => editor.focusOps.canCopyEmpty(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'COPY_EMPTY_BEFORE',
            textContent: 'Copy to empty element before...',
            closeMenuOnAction: true,
            left: (b) => [b.icon(icons.BetweenHorizonalStart)],
            action
          })
      },
      [JsedCommand.COPY_EMPTY_NEXT]: {
        action: () => {
          editor.focusOps.copyEmptyNext();
        },
        binding: {
          bindings: ['Control+c a'],
          description: 'Copy to empty element after focus'
        },
        canShowMenuItem: () => editor.focusOps.canCopyEmpty(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'COPY_EMPTY_AFTER',
            textContent: 'Copy to empty element after...',
            closeMenuOnAction: true,
            left: (b) => [b.icon(icons.BetweenHorizonalStart)],
            action
          })
      },
      [JsedCommand.PASTE_BEFORE]: {
        action: () => {
          pasteAndExit(() => editor.focusOps.pasteBefore());
        },
        binding: {
          bindings: ['$mod+v b'],
          description: 'Paste element before'
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'PASTE_BEFORE',
            textContent: 'Paste before',
            left: (b) => [b.icon(icons.ArrowLeftToLine)],
            action
          })
      },
      [JsedCommand.PASTE_AFTER]: {
        action: () => {
          pasteAndExit(() => editor.focusOps.pasteAfter());
        },
        binding: {
          bindings: ['$mod+v a'],
          description: 'Paste element after'
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'PASTE_AFTER',
            textContent: 'Paste after',
            left: (b) => [b.icon(icons.ArrowRightToLine)],
            action
          })
      },
      [JsedCommand.PASTE_APPEND]: {
        action: () => {
          pasteAndExit(() => editor.focusOps.pasteAppend());
        },
        binding: {
          bindings: ['$mod+v i'],
          description: 'Paste element at end'
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'PASTE_WITHIN',
            textContent: 'Paste within',
            left: (b) => [b.icon(icons.ArrowDownToLine)],
            action
          })
      }
    };
  }

  private focusOps(): CatalogEntries {
    const { ctl, editor } = this;
    return {
      [JsedCommand.DELETE_FOCUSED_ELEMENT]: {
        action: async () => {
          const confirm = ctl.confirm({
            message: `Remove element?`
          });
          const yes = await confirm.userChooses();
          if (!yes) {
            return;
          }

          editor.focusOps.delete();
          ctl.menu.closeMenu();
        },
        canShowMenuItem: () => editor.focusOps.canDelete(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'DELETE_FOCUSED_ELEMENT',
            textContent: 'Remove focused element...',
            left: (b) => [b.icon(icons.X)],
            action
          })
      },
      [JsedCommand.UNWRAP_FOCUS]: {
        action: () => {
          editor.focusOps.unwrap();
        },
        canShowMenuItem: () => editor.focusOps.canUnwrap(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'UNWRAP_FOCUS',
            textContent: 'Unwrap...',
            closeMenuOnAction: true,
            left: (b) => [b.icon(icons.CodeXml)],
            action
          })
      },
      [JsedCommand.CONVERT_FOCUS]: {
        action: () => {
          const candidates = editor.focusOps.getConversionCandidates().map((tagName, index) => {
            return {
              id: `${tagName}-${index}`,
              text: `<${tagName}>`,
              icon: icons.ArrowLeft,
              action: () => {
                editor.focusOps.convert(tagName);
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
                  editor.focusOps.convert(item);
                }
              }
            })
          );
        },
        canShowMenuItem: () => editor.focusOps.canConvert(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'CONVERT_FOCUS',
            textContent: 'Convert...',
            left: (b) => [b.icon(icons.CodeXml)],
            closeMenuOnAction: false,
            action
          })
      },
      [JsedCommand.INSERT_ELEMENT_AFTER_FOCUS]: {
        action: () => {
          const candidates = editor.focusOps.getInsertAfterOptions().map((option, index) => {
            return {
              id: `${option.id}-${index}`,
              text: option.label,
              icon: icons.Plus,
              action: () => {
                editor.focusOps.insertNewAfter(option.spec);
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
                  editor.focusOps.insertNewAfter({ tagName: item });
                }
              }
            })
          );
        },
        canShowMenuItem: () => editor.focusOps.canInsertAfter(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_ELEMENT_AFTER_FOCUS',
            textContent: 'Insert element after...',
            left: (b) => [b.icon(icons.Plus)],
            closeMenuOnAction: false,
            action
          })
      },
      [JsedCommand.INSERT_ELEMENT_BEFORE_FOCUS]: {
        action: () => {
          const candidates = editor.focusOps.getInsertBeforeOptions().map((option, index) => {
            return {
              id: `${option.id}-${index}`,
              text: option.label,
              icon: icons.Plus,
              action: () => {
                editor.focusOps.insertNewBefore(option.spec);
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
                  editor.focusOps.insertNewBefore({ tagName: item });
                }
              }
            })
          );
        },
        canShowMenuItem: () => editor.focusOps.canInsertBefore(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_ELEMENT_BEFORE_FOCUS',
            textContent: 'Insert element before...',
            left: (b) => [b.icon(icons.Plus)],
            closeMenuOnAction: false,
            action
          })
      },
      [JsedCommand.APPEND_NEW_ELEMENT_IN_FOCUS]: {
        action: () => {
          const candidates = editor.focusOps.getAppendOptions().map((option, index) => {
            return {
              id: `${option.id}-${index}`,
              text: option.label,
              icon: icons.Plus,
              action: () => {
                editor.focusOps.appendNew(option.spec);
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
                  editor.focusOps.appendNew({ tagName: item });
                }
              }
            })
          );
        },
        canShowMenuItem: () => editor.focusOps.canAppend(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'APPEND_NEW_ELEMENT_IN_FOCUS',
            textContent: 'Insert new element within (append)...',
            left: (b) => [b.icon(icons.Plus)],
            closeMenuOnAction: false,
            action
          })
      }
    };
  }

  private focusSpaceOps(): CatalogEntries {
    const { editor } = this;
    return {
      [JsedCommand.INSERT_SPACE_BEFORE_FOCUS]: {
        action: () => {
          editor.focusOps.space.insertSpaceBeforeTag();
        },
        canShowMenuItem: () => editor.focusOps.space.canInsertSpaceBeforeTag(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_SPACE_BEFORE_TAG',
            textContent: 'Insert space before tag...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      },
      [JsedCommand.REMOVE_SPACE_BEFORE_FOCUS]: {
        action: () => {
          editor.focusOps.space.removeSpaceBeforeTag();
        },
        canShowMenuItem: () => editor.focusOps.space.canRemoveSpaceBeforeTag(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REMOVE_SPACE_BEFORE_TAG',
            textContent: 'Remove space before tag...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      },
      [JsedCommand.INSERT_SPACE_AFTER_FOCUS]: {
        action: () => {
          editor.focusOps.space.insertSpaceAfterTag();
        },
        canShowMenuItem: () => editor.focusOps.space.canInsertSpaceAfterTag(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_SPACE_AFTER_TAG',
            textContent: 'Insert space after tag...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      },
      [JsedCommand.REMOVE_SPACE_AFTER_FOCUS]: {
        action: () => {
          editor.focusOps.space.removeSpaceAfterTag();
        },
        canShowMenuItem: () => editor.focusOps.space.canRemoveSpaceAfterTag(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REMOVE_SPACE_AFTER_TAG',
            textContent: 'Remove space after tag...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      }
    };
  }

  private focusAnchorOps(): CatalogEntries {
    const { editor } = this;
    return {
      [JsedCommand.INSERT_ANCHOR_IN_FOCUS]: {
        action: () => {
          editor.focusOps.anchor.insertInFocus();
        },
        canShowMenuItem: () => editor.focusOps.anchor.canInsertInFocus(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_ANCHOR_IN_LINE',
            textContent: 'Insert anchor in empty line...',
            left: (b) => [b.icon(icons.Anchor)],
            action
          })
      },
      [JsedCommand.INSERT_ANCHOR_BEFORE_FOCUS]: {
        action: () => {
          editor.focusOps.anchor.insertBeforeFocus();
        },
        canShowMenuItem: () => editor.focusOps.anchor.canInsertBeforeFocus(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_ANCHOR_BEFORE_TAG',
            textContent: 'Insert anchor before tag...',
            left: (b) => [b.icon(icons.Anchor)],
            action
          })
      },
      [JsedCommand.REMOVE_ANCHOR_BEFORE_FOCUS]: {
        action: () => {
          editor.focusOps.anchor.removeBeforeFocus();
        },
        canShowMenuItem: () => editor.focusOps.anchor.canRemoveBeforeFocus(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REMOVE_ANCHOR_BEFORE_TAG',
            textContent: 'Remove anchor before tag...',
            left: (b) => [b.icon(icons.Anchor)],
            action
          })
      },
      [JsedCommand.INSERT_ANCHOR_AFTER_FOCUS]: {
        action: () => {
          editor.focusOps.anchor.insertAfterFocus();
        },
        canShowMenuItem: () => editor.focusOps.anchor.canInsertAfterFocus(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_ANCHOR_AFTER_TAG',
            textContent: 'Insert anchor after tag...',
            left: (b) => [b.icon(icons.Anchor)],
            action
          })
      },
      [JsedCommand.REMOVE_ANCHOR_AFTER_FOCUS]: {
        action: () => {
          editor.focusOps.anchor.removeAfterFocus();
        },
        canShowMenuItem: () => editor.focusOps.anchor.canRemoveAfterFocus(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REMOVE_ANCHOR_AFTER_TAG',
            textContent: 'Remove anchor after tag...',
            left: (b) => [b.icon(icons.Anchor)],
            action
          })
      }
    };
  }

  private cursorOps(): CatalogEntries {
    const { editor } = this;
    return {
      [JsedCommand.INSERT_SPACE_AFTER_CURSOR]: {
        action: () => {
          editor.cursorOps.insertSpaceAfter();
        },
        canShowMenuItem: () => editor.cursorOps.canInsertSpaceAfter(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_SPACE_AFTER_CURSOR',
            textContent: 'Insert trailing space after cursor...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      },
      [JsedCommand.REMOVE_SPACE_AFTER_CURSOR]: {
        action: () => {
          editor.cursorOps.removeSpaceAfter();
        },
        canShowMenuItem: () => editor.cursorOps.canRemoveSpaceAfter(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REMOVE_SPACE_AFTER_CURSOR',
            textContent: 'Remove trailing space after cursor...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      },
      [JsedCommand.INSERT_SPACE_BEFORE_CURSOR]: {
        action: () => {
          editor.cursorOps.insertSpaceBefore();
        },
        canShowMenuItem: () => editor.cursorOps.canInsertSpaceBefore(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'INSERT_SPACE_BEFORE_CURSOR',
            textContent: 'Insert leading space before cursor...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      },
      [JsedCommand.REMOVE_SPACE_BEFORE_CURSOR]: {
        action: () => {
          editor.cursorOps.removeSpaceBefore();
        },
        canShowMenuItem: () => editor.cursorOps.canRemoveSpaceBefore(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'REMOVE_SPACE_BEFORE_CURSOR',
            textContent: 'Remove leading space before cursor...',
            left: (b) => [b.icon(icons.Space)],
            action
          })
      }
    };
  }

  private misc(): CatalogEntries {
    const { editor, opts } = this;
    return {
      [JsedCommand.ENABLE_LEGACY_ELEMENT_INDICATOR]: {
        action: () => {
          editor.enableLegacyElementIndicator(!editor.legacyElementIndicatorEnabled);
          opts.invalidateMenu();
        },
        menuItem: () =>
          checkboxMenuItem({
            id: 'ENABLE_LEGACY_ELEMENT_INDICATOR',
            textContent: 'Use legacy element indicator',
            closeMenuOnAction: false,
            action: (_, bool) => {
              editor.enableLegacyElementIndicator(bool);
              opts.invalidateMenu();
            },
            checked: editor.legacyElementIndicatorEnabled
          })
      },
      [JsedCommand.ENABLE_ELEMENT_INDICATOR]: {
        action: () => {
          editor.enableElementIndicator(!editor.elementIndicatorEnabled);
          opts.invalidateMenu();
        },
        menuItem: () =>
          checkboxMenuItem({
            id: 'ENABLE_ELEMENT_INDICATOR',
            textContent: 'Use modern element indicator',
            closeMenuOnAction: false,
            action: (_, bool) => {
              editor.enableElementIndicator(bool);
              opts.invalidateMenu();
            },
            checked: editor.elementIndicatorEnabled
          })
      }
    };
  }
}
