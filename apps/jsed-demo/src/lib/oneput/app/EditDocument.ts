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
      onError: (err) => instance.handleEditError(err)
    });
    instance = new EditDocument(ctl, params.document, editManager);
    return instance;
  }

  private unsubscribeInputChanges: () => void;
  private unsubscribeSelectionChanges: () => void;

  constructor(
    private ctl: Controller,
    private document: JsedDocument,
    private editManager: EditManager
  ) {
    this.unsubscribeInputChanges = ctl.events.on('input-change', ({ value }) =>
      editManager.handleInputChange(value)
    );
    this.unsubscribeSelectionChanges = ctl.events.on('selection-change', ({ selection }) =>
      editManager.handleSelectionChange(selection)
    );
  }

  onStart = () => {
    setDocument(this.document);
    this.editManager.connect();
  };

  onResume = () => {
    this.editManager.connect();
  };

  onExit = () => {
    this.editManager.destroy();
    this.unsubscribeInputChanges();
    this.unsubscribeSelectionChanges();
  };

  handleEditError = (err: EditManagerError) => {
    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };

  actions = {
    EXIT: {
      action: () => {
        if (this.editManager.getMode() === 'editing') {
          this.editManager.exitEditing();
        }
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing',
        when: { menuOpen: false }
      }
    },
    ENTER: {
      action: () => {
        this.editManager.enterEditing().mapErr((err) => {
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
    TOGGLE_SELECT: {
      action: () => {
        this.ctl.input.toggleSelect();
      },
      binding: {
        bindings: ['$mod+e'],
        description: 'Toggle input element cursor state',
        when: { menuOpen: false }
      }
    },
    RIGHT: {
      action: () => {
        if (this.editManager.getMode() === 'editing') {
          this.editManager.cursor?.moveNext();
          return;
        }
        this.editManager.nav.REC_NEXT();
      },
      binding: {
        bindings: ['$mod+l', 'ArrowRight'],
        description: 'Move to next token or element',
        when: { menuOpen: false }
      }
    },
    LEFT: {
      action: () => {
        if (this.editManager.getMode() === 'editing') {
          this.editManager.cursor?.movePrevious();
          return;
        }
        this.editManager.nav.REC_PREV();
      },
      binding: {
        bindings: ['$mod+h', 'ArrowLeft'],
        description: 'Move to previous token or element',
        when: { menuOpen: false }
      }
    },
    DOWN: {
      action: () => {
        this.editManager.nav.SIB_NEXT();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.editManager.nav.SIB_PREV();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    PARENT: {
      action: () => {
        this.editManager.nav.UP();
      },
      binding: {
        bindings: ['$mod+u', '$mod+ArrowUp'],
        description: 'Find next parent',
        when: { menuOpen: false }
      }
    }
  };

  menu = () => ({
    id: 'root',
    items: [
      stdMenuItem({
        id: 'EDIT_FIRST',
        textContent: 'Edit...',
        action: this.actions.ENTER.action,
        left: (b) => [b.icon(icons.Pencil)]
      })
    ]
  });
}
