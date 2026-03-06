import type { AppObject, Controller } from '@oneput/oneput';
import { type Navigator, type JsedDocument, type ITokenCursor, EditManager } from '@oneput/jsed';

export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument; nav: Navigator }) {
    const editManager = EditManager.create({ nav: params.nav, inputManager: ctl.input });

    return new EditDocument(ctl, editManager);
  }

  private cursor?: ITokenCursor;
  private unsubscribeInputChanges: () => void;
  private unsubscribeSelectionChanges: () => void;

  constructor(
    private ctl: Controller,
    private editManager: EditManager
  ) {
    this.unsubscribeInputChanges = ctl.events.on('input-change', ({ value }) =>
      editManager.handleInputChange(value)
    );
    this.unsubscribeSelectionChanges = ctl.events.on('toggle-select', ({ selection }) =>
      editManager.handleSelectionChange(selection)
    );
  }

  onStart = () => {
    this.editManager
      .getFirstTokenUnderFocus()
      .map((cursor) => {
        this.cursor = cursor;
      })
      .mapErr((err) => {
        switch (err.type) {
          case 'no-token-under-focus':
            this.ctl.notify('No token under focus', { duration: 3000 });
            this.ctl.app.exit();
            break;
          case 'no-focus':
            this.ctl.notify('No document focus found', { duration: 3000 });
            this.ctl.app.exit();
            break;
        }
      });
  };

  onExit = () => {
    this.editManager.close();
    this.unsubscribeInputChanges();
    this.unsubscribeSelectionChanges();
  };

  actions = {
    EXIT: {
      action: () => {
        this.ctl.app.exit();
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing, return to viewer',
        when: { menuOpen: false }
      }
    },
    NEXT_TOKEN: {
      action: () => {
        this.cursor?.moveNext();
      },
      binding: {
        bindings: ['$mod+l'],
        description: 'Move to next token',
        when: { menuOpen: false }
      }
    },
    PREV_TOKEN: {
      action: () => {
        this.cursor?.movePrevious();
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
    }
  };
}
