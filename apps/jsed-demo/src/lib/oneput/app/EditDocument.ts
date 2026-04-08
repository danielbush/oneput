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
    EXIT: {
      action: () => {
        this.editManager.handleExit();
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing'
        // when: { menuOpen: false }
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
        description: 'Edit first editable token'
        // when: { menuOpen: false }
      }
    },
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
    DOWN: {
      action: () => {
        this.editManager.handleDown();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling'
        // when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.editManager.handleUp();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling'
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
        this.editManager.canInsertAnchorAfterTag() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_AFTER_TAG',
            textContent: 'Insert anchor after tag...',
            action: () => {
              console.log('intent: insert anchor after focused tag boundary');
            },
            left: (b) => [b.icon(icons.Pencil)]
          })
      ]
    });
  };
}
