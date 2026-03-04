import type { AppObject, Controller } from '@oneput/oneput';
import { icons } from './_icons.js';
import { type JsedDocument } from '@oneput/jsed';
import { setDocument } from './_bindings.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { EditDocument } from './EditDocument.js';

/**
 * Oneput AppObject that manages a single JsedDocument.
 */
export class ViewDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    return new ViewDocument(ctl, params.document);
  }

  constructor(
    private ctl: Controller,
    private document: JsedDocument
  ) {}

  onStart = () => {
    setDocument(this.document);
  };

  onExit = () => {
    //
  };

  actions = {
    EDIT_FIRST: {
      action: () => {
        this.ctl.app.run(EditDocument.create(this.ctl, { document: this.document }));
      },
      binding: {
        bindings: ['enter'],
        description: 'Edit first editable token',
        when: { menuOpen: false }
      }
    },
    REC_NEXT: {
      action: () => {
        this.document.nav.REC_NEXT();
      },
      binding: {
        bindings: ['$mod+Shift+j', 'Shift+ArrowDown'],
        description: 'Navigate to next element',
        when: { menuOpen: false }
      }
    },
    REC_PREV: {
      action: () => {
        this.document.nav.REC_PREV();
      },
      binding: {
        bindings: ['$mod+Shift+k', 'Shift+ArrowUp'],
        description: 'Navigate to previous element',
        when: { menuOpen: false }
      }
    },
    SIB_NEXT: {
      action: () => {
        this.document.nav.SIB_NEXT();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    SIB_PREV: {
      action: () => {
        this.document.nav.SIB_PREV();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.document.nav.UP();
      },
      binding: {
        bindings: ['$mod+u', '$mod+ArrowUp'],
        description: 'Find next parent',
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

  menu = () => ({
    id: 'root',
    items: [
      stdMenuItem({
        id: 'EDIT_FIRST',
        textContent: 'Edit...',
        action: this.actions.EDIT_FIRST.action,
        left: (b) => [b.icon(icons.Pencil)]
      })
    ]
  });
}
