import type { AppObject, Controller } from '@oneput/oneput';
import { type JsedDocument, EditManager, type EditManagerError } from '@oneput/jsed';

export type EditDocumentResult = {
  focusElement?: HTMLElement;
};

export class EditDocument implements AppObject {
  static create(
    ctl: Controller,
    params: { document: JsedDocument; initialFocus: HTMLElement }
  ) {
    const instance = new EditDocument(
      ctl,
      params.initialFocus,
      EditManager.create({
        document: params.document,
        userInput: ctl.input,
        onError: (err) => instance.handleEditError(err),
        onExit: (result?: { focusElement?: HTMLElement }) =>
          ctl.app.exit({ payload: { focusElement: result?.focusElement } })
      })
    );
    return instance;
  }

  private unsubscribeInputChanges: () => void;
  private unsubscribeSelectionChanges: () => void;

  constructor(
    private ctl: Controller,
    private initialFocus: HTMLElement,
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
    this.editManager.edit(this.initialFocus).mapErr((err) => {
      switch (err.type) {
        case 'no-token-under-focus':
          this.ctl.notify('No token under focus', { duration: 3000 });
          this.ctl.app.exit();
          break;
      }
    });
  };

  onExit = () => {
    this.editManager.destroy();
    this.unsubscribeInputChanges();
    this.unsubscribeSelectionChanges();
  };

  handleEditError = (err: EditManagerError) => {
    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };

  private exitWith(result: EditDocumentResult) {
    this.ctl.app.exit({ payload: result });
  }

  actions = {
    EXIT: {
      action: () => {
        this.exitWith({ focusElement: this.editManager.nav?.getFocus() ?? undefined });
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing, return to viewer',
        when: { menuOpen: false }
      }
    },
    NEXT_TOKEN: {
      action: () => {
        this.editManager.cursor?.moveNext();
      },
      binding: {
        bindings: ['$mod+l'],
        description: 'Move to next token',
        when: { menuOpen: false }
      }
    },
    PREV_TOKEN: {
      action: () => {
        this.editManager.cursor?.movePrevious();
      },
      binding: {
        bindings: ['$mod+h'],
        description: 'Move to previous token',
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
    REC_NEXT: {
      action: () => {
        if (!this.editManager.nav) return;
        this.editManager.nav.REC_NEXT();
        this.exitWith({ focusElement: this.editManager.nav.getFocus() ?? undefined });
      },
      binding: {
        bindings: ['$mod+Shift+j', 'Shift+ArrowDown'],
        description: 'Close editor and navigate to next element',
        when: { menuOpen: false }
      }
    },
    REC_PREV: {
      action: () => {
        if (!this.editManager.nav) return;
        this.editManager.nav.REC_PREV();
        this.exitWith({ focusElement: this.editManager.nav.getFocus() ?? undefined });
      },
      binding: {
        bindings: ['$mod+Shift+k', 'Shift+ArrowUp'],
        description: 'Close editor and navigate to previous element',
        when: { menuOpen: false }
      }
    },
    SIB_NEXT: {
      action: () => {
        if (!this.editManager.nav) return;
        this.editManager.nav.SIB_NEXT();
        this.exitWith({ focusElement: this.editManager.nav.getFocus() ?? undefined });
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Close editor and navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    SIB_PREV: {
      action: () => {
        if (!this.editManager.nav) return;
        this.editManager.nav.SIB_PREV();
        this.exitWith({ focusElement: this.editManager.nav.getFocus() ?? undefined });
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Close editor and navigate to previous sibling',
        when: { menuOpen: false }
      }
    }
  };
}
