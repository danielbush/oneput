import {
  ActionCatalog,
  type ActionCatalogEntries,
  type ActionCatalogMenuItem,
  type AppActionCatalog,
  type AppActions,
  type Controller,
  type KeyBindingMap
} from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { OneputCatalog } from '@oneput/oneput/shared/actions/OneputCatalog.js';
import type { Editor } from '../../editor/Editor.js';
import { JsedAction, type JsedActionId } from './JsedAction.js';
import { icons } from './lib/icons.js';
import { PasteElementUI } from './lib/PasteElementUI.js';
import { PickListUI } from './lib/PickListUI.js';

type CatalogEntries = ActionCatalogEntries<JsedActionId>;
type CatalogOptions = {
  invalidateMenu: () => void;
};
type JsedCatalogContext = {
  ctl: Controller;
  editor: Editor;
  opts: CatalogOptions;
};

/**
 * Defines reusable Jsed actions, bindings, and hand-authored menu item rows.
 *
 * AppObjects derive a filtered catalog for their mode, expose `getActions()` to
 * Oneput, then explicitly compose menu rows with `getMenuItems([...])`.
 *
 * The editor provides predicates so the ui can decide to hide or disable
 * something; everything else should be encapsulated within an editor action,
 * the ui shouldn't decide anything for the editor
 */
export class JsedCatalog implements AppActionCatalog<JsedActionId> {
  static create(
    ctl: Controller,
    editor: Editor,
    opts?: {
      invalidateMenu?: () => void;
    }
  ) {
    const invalidateMenu = opts?.invalidateMenu ?? (() => ctl.menu.invalidate());
    return new JsedCatalog(
      ActionCatalog.create<JsedActionId>(() =>
        getEntries({
          ctl,
          editor,
          opts: { invalidateMenu }
        })
      )
    );
  }

  private constructor(private catalog: AppActionCatalog<JsedActionId>) {}

  filter(ids: JsedActionId[]) {
    return new JsedCatalog(this.catalog.filter(ids));
  }

  getBindings(): KeyBindingMap {
    return this.catalog.getBindings();
  }

  getActions(): AppActions {
    return this.catalog.getActions();
  }

  getMenuItems(ids: JsedActionId[]): ActionCatalogMenuItem[] {
    return this.catalog.getMenuItems(ids);
  }
}

/**
 * Define every reusable editor catalog entry.
 *
 * This is the unfiltered catalog: each entry is keyed by `JsedAction` id and
 * may include an action handler, key binding, menu row preset, and menu
 * visibility predicate. AppObjects select from these entries with `filter()`.
 */
function getEntries(ctx: JsedCatalogContext): CatalogEntries {
  const { ctl, editor } = ctx;

  return {
    [JsedAction.STOP_EDITING]: {
      description: 'Stop editing',
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

    [JsedAction.SOFT_EXIT]: {
      description: 'Progressively exit',
      action: () => {
        if (!editor.handleExit()) {
          ctl.app.exit();
        }
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        when: { menuOpen: false }
      }
    },

    [JsedAction.EXIT_EDITOR]: {
      description: 'Exit',
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

    [JsedAction.CANCEL_VIA_EXIT]: {
      description: 'Cancel operation',
      action: () => {
        ctl.app.exit();
      },
      binding: {
        bindings: ['Escape']
      },
      menuItem: ({ action }) =>
        stdMenuItem({
          id: 'EXIT',
          textContent: 'Cancel',
          left: (b) => [b.icon(icons.CircleX)],
          action
        })
    },

    ...navigation(ctx),
    ...selection(ctx),
    ...editing(ctx),
    ...undo(ctx),
    ...copyPaste(ctx),
    ...focusOps(ctx),
    ...focusSpaceOps(ctx),
    ...focusAnchorOps(ctx),
    ...cursorOps(ctx),
    ...misc(ctx)
  };
}

function navigation(ctx: JsedCatalogContext): CatalogEntries {
  const { editor } = ctx;
  return {
    [JsedAction.DOWN]: {
      description: 'Navigate to next sibling',
      action: () => {
        editor.moveDown();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        when: { menuOpen: false }
      }
    },
    [JsedAction.UP]: {
      description: 'Navigate to previous sibling',
      action: () => {
        editor.moveUp();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        when: { menuOpen: false }
      }
    },
    [JsedAction.NEXT]: {
      description: 'Move to next token or element',
      action: () => {
        editor.moveNext();
      },
      binding: {
        bindings: ['$mod+l']
      }
    },
    [JsedAction.PREVIOUS]: {
      description: 'Move to previous token or element',
      action: () => {
        editor.movePrevious();
      },
      binding: {
        bindings: ['$mod+h']
      }
    },
    [JsedAction.RIGHT_ARROW]: {
      description: 'Move to next token or element',
      action: () => {
        editor.moveNext();
      },
      binding: {
        bindings: ['ArrowRight'],
        when: { menuOpen: false }
      }
    },
    [JsedAction.LEFT_ARROW]: {
      description: 'Move to previous token or element',
      action: () => {
        editor.movePrevious();
      },
      binding: {
        bindings: ['ArrowLeft'],
        when: { menuOpen: false }
      }
    },
    [JsedAction.REVEAL]: {
      description: 'Center the active token or reveal the focused element',
      action: () => {
        editor.scrollActiveTargetIntoView();
      },
      binding: {
        bindings: ['$mod+m']
      }
    }
  };
}

function selection(ctx: JsedCatalogContext): CatalogEntries {
  const { ctl, editor } = ctx;
  return {
    [JsedAction.WRAP_SELECTION]: {
      description: 'Wrap selection...',
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
    [JsedAction.EXTEND_NEXT]: {
      description: 'Extend selection to next LINE_SIBLING',
      action: () => {
        editor.extendNext();
      },
      binding: {
        bindings: ['Shift+$mod+l']
      }
    },
    [JsedAction.EXTEND_PREVIOUS]: {
      description: 'Extend selection to previous LINE_SIBLING',
      action: () => {
        editor.extendPrevious();
      },
      binding: {
        bindings: ['Shift+$mod+h']
      }
    },
    [JsedAction.EXTEND_RIGHT_ARROW]: {
      description: 'Extend selection to next LINE_SIBLING',
      action: () => {
        editor.extendNext();
      },
      binding: {
        bindings: ['Shift+ArrowRight'],
        when: { menuOpen: false }
      }
    },
    [JsedAction.EXTEND_LEFT_ARROW]: {
      description: 'Extend selection to next LINE_SIBLING',
      action: () => {
        editor.extendPrevious();
      },
      binding: {
        bindings: ['Shift+ArrowLeft'],
        when: { menuOpen: false }
      }
    }
  };
}

function editing(ctx: JsedCatalogContext): CatalogEntries {
  const { ctl, editor } = ctx;
  return {
    [JsedAction.ENTER]: {
      description: 'Edit first editable token',
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
    [JsedAction.DELETE]: {
      description: 'Delete characters',
      action: (_ctl, context) => {
        editor.handleDelete(context?.source === 'keyboard' ? context.event : undefined);
      },
      binding: {
        bindings: ['Backspace'],
        when: { menuOpen: false },
        // If preventDefault = true here, input change events caused by the user
        // deleting text in the input will never occur. We need to set this to
        // false to allow input-based edits. The action we call here can however
        // call preventDefault if it wants to take control of the delete action.
        preventDefault: false
      }
    },
    [JsedAction.TOGGLE_SELECT]: {
      description: 'Toggle input element cursor state',
      action: () => {
        ctl.input.toggleSelect();
      },
      binding: {
        bindings: ['$mod+e']
      }
    }
  };
}

function undo(ctx: JsedCatalogContext): CatalogEntries {
  const { opts, editor } = ctx;
  return {
    [JsedAction.UNDO]: {
      description: 'Undo',
      action: () => {
        editor.undo();
        opts.invalidateMenu();
      },
      binding: {
        bindings: ['$mod+z']
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
    [JsedAction.REDO]: {
      description: 'Redo',
      action: () => {
        editor.redo();
        opts.invalidateMenu();
      },
      binding: {
        bindings: ['Shift+$mod+z']
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

function copyPaste(ctx: JsedCatalogContext): CatalogEntries {
  const { ctl, editor } = ctx;
  const pasteAndExit = (paste: () => boolean) => {
    paste();
    ctl.app.exit();
  };
  const runPasteElement = (cut: boolean) => {
    ctl.app.run(
      PasteElementUI.create(ctl, editor, {
        catalog: JsedCatalog.create(ctl, editor).filter([
          JsedAction.DOWN,
          JsedAction.UP,
          JsedAction.NEXT,
          JsedAction.PREVIOUS,
          JsedAction.PASTE_BEFORE,
          JsedAction.PASTE_AFTER,
          JsedAction.PASTE_APPEND,
          JsedAction.CANCEL_VIA_EXIT
        ]),
        cut,
        oneputCatalog: OneputCatalog.create(ctl).filter([OneputAction.FOCUS_INPUT])
      })
    );
  };
  return {
    [JsedAction.CUT]: {
      description: 'Cut element at focus',
      action: () => {
        if (editor.focusOps.cut()) {
          runPasteElement(true);
        }
      },
      binding: {
        bindings: ['$mod+x']
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
    [JsedAction.COPY]: {
      description: 'Copy element at focus',
      action: () => {
        if (editor.focusOps.copy()) {
          runPasteElement(false);
        }
      },
      binding: {
        bindings: ['$mod+c']
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
    [JsedAction.COPY_EMPTY_PREVIOUS]: {
      description: 'Copy to empty element before focus',
      action: () => {
        editor.focusOps.copyEmptyPrevious();
      },
      binding: {
        bindings: ['Control+c b']
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
    [JsedAction.COPY_EMPTY_NEXT]: {
      description: 'Copy to empty element after focus',
      action: () => {
        editor.focusOps.copyEmptyNext();
      },
      binding: {
        bindings: ['Control+c a']
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
    [JsedAction.PASTE_BEFORE]: {
      description: 'Paste element before',
      action: () => {
        pasteAndExit(() => editor.focusOps.pasteBefore());
      },
      binding: {
        bindings: ['$mod+v b']
      },
      menuItem: ({ action }) =>
        stdMenuItem({
          id: 'PASTE_BEFORE',
          textContent: 'Paste before',
          left: (b) => [b.icon(icons.ArrowLeftToLine)],
          action
        })
    },
    [JsedAction.PASTE_AFTER]: {
      description: 'Paste element after',
      action: () => {
        pasteAndExit(() => editor.focusOps.pasteAfter());
      },
      binding: {
        bindings: ['$mod+v a']
      },
      menuItem: ({ action }) =>
        stdMenuItem({
          id: 'PASTE_AFTER',
          textContent: 'Paste after',
          left: (b) => [b.icon(icons.ArrowRightToLine)],
          action
        })
    },
    [JsedAction.PASTE_APPEND]: {
      description: 'Paste element at end',
      action: () => {
        pasteAndExit(() => editor.focusOps.pasteAppend());
      },
      binding: {
        bindings: ['$mod+v i']
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

function focusOps(ctx: JsedCatalogContext): CatalogEntries {
  const { ctl, editor } = ctx;
  return {
    [JsedAction.DELETE_FOCUSED_ELEMENT]: {
      description: 'Remove focused element...',
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
    [JsedAction.UNWRAP_FOCUS]: {
      description: 'Unwrap...',
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
    [JsedAction.CONVERT_FOCUS]: {
      description: 'Convert...',
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
    [JsedAction.INSERT_ELEMENT_AFTER_FOCUS]: {
      description: 'Insert element after...',
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
    [JsedAction.INSERT_ELEMENT_BEFORE_FOCUS]: {
      description: 'Insert element before...',
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
    [JsedAction.APPEND_NEW_ELEMENT_IN_FOCUS]: {
      description: 'Insert new element within (append)...',
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

function focusSpaceOps(ctx: JsedCatalogContext): CatalogEntries {
  const { editor } = ctx;
  return {
    [JsedAction.INSERT_SPACE_BEFORE_FOCUS]: {
      description: 'Insert space before tag...',
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
    [JsedAction.REMOVE_SPACE_BEFORE_FOCUS]: {
      description: 'Remove space before tag...',
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
    [JsedAction.INSERT_SPACE_AFTER_FOCUS]: {
      description: 'Insert space after tag...',
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
    [JsedAction.REMOVE_SPACE_AFTER_FOCUS]: {
      description: 'Remove space after tag...',
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

function focusAnchorOps(ctx: JsedCatalogContext): CatalogEntries {
  const { editor } = ctx;
  return {
    [JsedAction.INSERT_ANCHOR_IN_FOCUS]: {
      description: 'Insert anchor in empty line...',
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
    [JsedAction.INSERT_ANCHOR_BEFORE_FOCUS]: {
      description: 'Insert anchor before tag...',
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
    [JsedAction.REMOVE_ANCHOR_BEFORE_FOCUS]: {
      description: 'Remove anchor before tag...',
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
    [JsedAction.INSERT_ANCHOR_AFTER_FOCUS]: {
      description: 'Insert anchor after tag...',
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
    [JsedAction.REMOVE_ANCHOR_AFTER_FOCUS]: {
      description: 'Remove anchor after tag...',
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

function cursorOps(ctx: JsedCatalogContext): CatalogEntries {
  const { editor } = ctx;
  return {
    [JsedAction.INSERT_SPACE_AFTER_CURSOR]: {
      description: 'Insert trailing space after cursor...',
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
    [JsedAction.REMOVE_SPACE_AFTER_CURSOR]: {
      description: 'Remove trailing space after cursor...',
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
    [JsedAction.INSERT_SPACE_BEFORE_CURSOR]: {
      description: 'Insert leading space before cursor...',
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
    [JsedAction.REMOVE_SPACE_BEFORE_CURSOR]: {
      description: 'Remove leading space before cursor...',
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

function misc(ctx: JsedCatalogContext): CatalogEntries {
  const { editor, opts } = ctx;
  return {
    [JsedAction.ENABLE_LEGACY_ELEMENT_INDICATOR]: {
      description: 'Use legacy element indicator',
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
    [JsedAction.ENABLE_ELEMENT_INDICATOR]: {
      description: 'Use modern element indicator',
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
