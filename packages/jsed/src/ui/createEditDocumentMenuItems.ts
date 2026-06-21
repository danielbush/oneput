import type { Controller, MenuItemAny } from '@oneput/oneput';
import { checkboxMenuItem } from '@oneput/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { Editor } from '../editor/Editor.js';
import { icons } from './lib/icons.js';
import { PickListUI } from './lib/PickListUI.js';

export type EditDocumentMenuActions = {
  ENTER: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
  UNDO: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
  REDO: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
  CUT: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
  COPY: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
  COPY_EMPTY_PREVIOUS: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
  COPY_EMPTY_NEXT: { action: (ctl: Controller, evt?: KeyboardEvent) => void };
};

/**
 * Builds the Oneput menu items for an active Jsed editor.
 */
export function createEditDocumentMenuItems({
  ctl,
  editor,
  actions,
  invalidateMenu
}: {
  ctl: Controller;
  editor: Editor;
  actions: EditDocumentMenuActions;
  invalidateMenu: () => void;
}): Array<MenuItemAny | undefined | null | '' | false> {
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
        textContent: 'Delete focused element...',
        action: async () => {
          const confirm = ctl.confirm({
            message: `Delete element?`
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
        invalidateMenu();
      },
      checked: editor.legacyElementIndicatorEnabled
    }),
    checkboxMenuItem({
      id: 'ENABLE_ELEMENT_INDICATOR',
      textContent: 'Use modern element indicator',
      closeMenuOnAction: false,
      action: (_, bool) => {
        editor.enableElementIndicator(bool);
        invalidateMenu();
      },
      checked: editor.elementIndicatorEnabled
    })
  ];
}
