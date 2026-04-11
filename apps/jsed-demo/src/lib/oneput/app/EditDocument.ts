import type { AppObject, Controller } from '@oneput/oneput';
import { type JsedDocument, EditManager, type EditManagerError } from '@oneput/jsed';
import { setDocument } from './_bindings.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';

export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    let instance: EditDocument;
    const editManager = EditManager.create({
      document: params.document,
      userInput: ctl.input,
      onError: (err) => instance.handleEditError(err),
      onModeChange: () => {
        instance?.renderMenuItems();
      },
      onFocusChange: () => {
        instance?.renderMenuItems();
      },
      onCursorChange: () => {
        instance?.renderMenuItems();
      },
      onTextChange: (evt) => {
        switch (evt.type) {
          case 'anchor-change':
          case 'whitespace-change':
            instance?.renderMenuItems();
        }
      },
      onElementChange: () => {
        instance?.renderMenuItems();
      }
    });
    instance = new EditDocument(ctl, params.document, editManager);
    return instance;
  }

  constructor(
    private ctl: Controller,
    private document: JsedDocument,
    private editManager: EditManager
  ) {}

  onStart = () => {
    setDocument(this.document);
    this.editManager.nav.connect();
    this.renderMenuItems();
  };

  onResume = () => {
    this.editManager.nav.connect();
  };

  onExit = () => {
    this.editManager.destroy();
  };

  handleEditError = (err: EditManagerError) => {
    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };

  actions = {
    // Disable these when menu is open so we can use the menu:

    EXIT: {
      action: () => {
        this.editManager.handleExit();
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing',
        when: { menuOpen: false }
      }
    },
    DOWN: {
      action: () => {
        this.editManager.handleDown();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.editManager.handleUp();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    ENTER: {
      action: () => {
        this.editManager.handleEnter().mapErr((err) => {
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

    // Keep these ambient (menu open / close)

    TOGGLE_SELECT: {
      action: () => {
        this.ctl.input.toggleSelect();
      },
      binding: {
        bindings: ['$mod+e'],
        description: 'Toggle input element cursor state'
        // when: { menuOpen: false }
      }
    },
    RIGHT: {
      action: () => {
        this.editManager.handleRight();
      },
      binding: {
        bindings: ['$mod+l', 'ArrowRight'],
        description: 'Move to next token or element'
        // when: { menuOpen: false }
      }
    },
    LEFT: {
      action: () => {
        this.editManager.handleLeft();
      },
      binding: {
        bindings: ['$mod+h', 'ArrowLeft'],
        description: 'Move to previous token or element'
        // when: { menuOpen: false }
      }
    },
    PARENT: {
      action: () => {
        this.editManager.handleParent();
      },
      binding: {
        bindings: ['$mod+u', '$mod+ArrowUp'],
        description: 'Find next parent'
        // when: { menuOpen: false }
      }
    },
    REVEAL: {
      action: () => {
        this.editManager.revealActiveTarget();
      },
      binding: {
        bindings: ['$mod+m'],
        description: 'Center the active token or reveal the focused element'
      }
    }
  };

  renderMenuItems = () => {
    this.ctl.menu.setMenu({
      id: 'root',
      items: [
        !this.editManager.isEditing() &&
          stdMenuItem({
            id: 'EDIT_FIRST',
            textContent: 'Edit...',
            action: this.actions.ENTER.action,
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertAnchorInLine() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_IN_LINE',
            textContent: 'Insert anchor in empty line...',
            action: () => {
              this.editManager.insertAnchorInLine();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertSpaceBeforeTag() &&
          stdMenuItem({
            id: 'INSERT_SPACE_BEFORE_TAG',
            textContent: 'Insert space before tag...',
            action: () => {
              this.editManager.insertSpaceBeforeTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertSpaceBeforeCursor() &&
          stdMenuItem({
            id: 'INSERT_SPACE_BEFORE_CURSOR',
            textContent: 'Insert leading space before cursor...',
            action: () => {
              this.editManager.insertSpaceBeforeCursor();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canRemoveSpaceBeforeTag() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_BEFORE_TAG',
            textContent: 'Remove space before tag...',
            action: () => {
              this.editManager.removeSpaceBeforeTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canRemoveSpaceBeforeCursor() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_BEFORE_CURSOR',
            textContent: 'Remove leading space before cursor...',
            action: () => {
              this.editManager.removeSpaceBeforeCursor();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertAnchorBeforeTag() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_BEFORE_TAG',
            textContent: 'Insert anchor before tag...',
            action: () => {
              this.editManager.insertAnchorBeforeTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canRemoveAnchorBeforeTag() &&
          stdMenuItem({
            id: 'REMOVE_ANCHOR_BEFORE_TAG',
            textContent: 'Remove anchor before tag...',
            action: () => {
              this.editManager.removeAnchorBeforeTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertSpaceAfterTag() &&
          stdMenuItem({
            id: 'INSERT_SPACE_AFTER_TAG',
            textContent: 'Insert space after tag...',
            action: () => {
              this.editManager.insertSpaceAfterTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertSpaceAfterCursor() &&
          stdMenuItem({
            id: 'INSERT_SPACE_AFTER_CURSOR',
            textContent: 'Insert trailing space after cursor...',
            action: () => {
              this.editManager.insertSpaceAfterCursor();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canRemoveSpaceAfterTag() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_AFTER_TAG',
            textContent: 'Remove space after tag...',
            action: () => {
              this.editManager.removeSpaceAfterTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canRemoveSpaceAfterCursor() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_AFTER_CURSOR',
            textContent: 'Remove trailing space after cursor...',
            action: () => {
              this.editManager.removeSpaceAfterCursor();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canInsertAnchorAfterTag() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_AFTER_TAG',
            textContent: 'Insert anchor after tag...',
            action: () => {
              this.editManager.insertAnchorAfterTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.canRemoveAnchorAfterTag() &&
          stdMenuItem({
            id: 'REMOVE_ANCHOR_AFTER_TAG',
            textContent: 'Remove anchor after tag...',
            action: () => {
              this.editManager.removeAnchorAfterTag();
            },
            left: (b) => [b.icon(icons.Pencil)]
          })
      ]
    });
  };
}
