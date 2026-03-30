import type { AppObject, Controller } from '@oneput/oneput';
import { icons } from './_icons.js';
import { Nav, type JsedDocument, type JsedFocusRequestEvent } from '@oneput/jsed';
import { setDocument } from './_bindings.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { EditDocument } from './EditDocument.js';

/**
 * Oneput AppObject that manages a single JsedDocument in view mode.
 *
 * Uses a "focus twice to edit" model: the first click/touch on a FOCUSABLE
 * sets FOCUS (view mode). A second click/touch on the *same* FOCUSABLE
 * triggers quick-descend and enters edit mode.
 *
 * Owns its Nav lifecycle: connects on start/resume, disconnects on exit.
 */
export class ViewDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    return new ViewDocument(ctl, params.document);
  }

  private nav: Nav;

  /**
   * Focus controller for view mode: detects when REQUEST_FOCUS targets the
   * already-focused element ("focus twice") and enters edit mode.
   */
  private handleFocusRequest = (evt: JsedFocusRequestEvent): boolean => {
    if (evt.targetType === 'FOCUSABLE' && evt.element === this.nav.getFocus()) {
      this.editFirst({ element: evt.element });
      return false;
    }
    if (evt.targetType === 'TOKEN') {
      this.editFirst({ element: evt.token });
      return false;
    }
    return true;
  };

  constructor(
    private ctl: Controller,
    private document: JsedDocument
  ) {
    this.nav = Nav.create(this.document, this.handleFocusRequest);
  }

  onStart = () => {
    setDocument(this.document);
    this.nav.connect();
  };

  onResume = (result?: { payload?: unknown }) => {
    this.nav.connect();
    const payload = result?.payload as { focusElement?: HTMLElement } | undefined;
    if (payload?.focusElement) {
      this.nav.FOCUS(payload.focusElement);
    }
  };

  onExit = () => {
    this.nav.destroy();
  };

  editFirst = (opts?: { element: HTMLElement }) => {
    const initial = opts?.element || this.nav.getFocus();
    if (!initial) return;
    this.ctl.app.run(
      EditDocument.create(this.ctl, {
        document: this.document,
        initial,
      })
    );
  };

  actions = {
    EDIT_FIRST: {
      action: () => {
        this.editFirst();
      },
      binding: {
        bindings: ['enter'],
        description: 'Edit first editable token',
        when: { menuOpen: false }
      }
    },
    REC_NEXT: {
      action: () => {
        this.nav.REC_NEXT();
      },
      binding: {
        bindings: ['$mod+Shift+j', 'Shift+ArrowDown'],
        description: 'Navigate to next element',
        when: { menuOpen: false }
      }
    },
    REC_PREV: {
      action: () => {
        this.nav.REC_PREV();
      },
      binding: {
        bindings: ['$mod+Shift+k', 'Shift+ArrowUp'],
        description: 'Navigate to previous element',
        when: { menuOpen: false }
      }
    },
    SIB_NEXT: {
      action: () => {
        this.nav.SIB_NEXT();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    SIB_PREV: {
      action: () => {
        this.nav.SIB_PREV();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.nav.UP();
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
        action: this.actions.EDIT_FIRST.action,
        left: (b) => [b.icon(icons.Pencil)]
      })
    ]
  });
}
