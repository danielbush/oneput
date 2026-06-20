import type { Controller } from '@oneput/oneput';
import type { Editor } from '../editor/Editor.js';
import { PasteElementUI } from './lib/PasteElementUI.js';
import type { EditorError } from '../editor/index.js';
import { createEditDocumentMenuItems } from './createEditDocumentMenuItems.js';

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
      editor,
      onEditError,
      onRenderMenuItems
    }: {
      editor: Editor;
      onEditError: (err: EditorError) => void;
      onRenderMenuItems: () => void;
    }
  ) {
    return new OneputEditDocumentAdapter(ctl, editor, onRenderMenuItems, onEditError);
  }

  constructor(
    private ctl: Controller,
    private editor: Editor,
    private onRenderMenuItems: () => void,
    private onEditError: (err: EditorError) => void
  ) {}

  private unsubscribeEditChanges?: () => void;

  private subscribeEditChanges = () => {
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = this.editor.eventsEmitter.subscribe({
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
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = undefined;
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
        bindings: ['Enter'],
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

  getMenuItems = ({ renderMenuItems }: { renderMenuItems: () => void }) =>
    createEditDocumentMenuItems({
      ctl: this.ctl,
      editor: this.editor,
      actions: this.actions,
      renderMenuItems
    });
}
