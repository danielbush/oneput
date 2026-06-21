import type { AppObject, Controller } from '@oneput/oneput';
import type { Editor } from '../editor/Editor.js';
import { PasteElementUI } from './lib/PasteElementUI.js';

type OneputAction = NonNullable<AppObject['actions']>[string];

export type EditDocumentActions = NonNullable<AppObject['actions']> & {
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

/**
 * Builds the Oneput actions for an active Jsed editor.
 */
export function createEditDocumentActions({
  ctl,
  editor,
  invalidateMenu
}: {
  ctl: Controller;
  editor: Editor;
  invalidateMenu: () => void;
}): EditDocumentActions {
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
        invalidateMenu();
      },
      binding: {
        bindings: ['$mod+z'],
        description: 'Undo'
      }
    },
    REDO: {
      action: () => {
        editor.redo();
        invalidateMenu();
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
