import type { AppObject, Controller } from '@oneput/oneput';
import { icons } from './_icons.js';
import { Nav, quickDescend, type JsedDocument, type JsedFocusRequestEvent } from '@oneput/jsed';
import { setDocument } from './_bindings.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { EditDocument } from './EditDocument.js';

/**
 * Oneput AppObject that manages a single JsedDocument in view mode.
 *
 * Uses a "focus twice to edit" model: first FOCUS tokenizes the target so the
 * next click/touch can resolve a TOKEN precisely, but still does not open the
 * CURSOR. A second click/touch within the already-focused FOCUSABLE enters edit
 * mode.
 *
 * Owns its Nav lifecycle: connects on start/resume, disconnects on exit.
 */
export class ViewDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    return new ViewDocument(ctl, params.document);
  }

  private nav: Nav;

  /**
   * Focus controller for view mode:
   * - first FOCUS tokenizes a FOCUSABLE but stays in view mode
   * - second interaction within the already-focused FOCUSABLE enters edit mode
   */
  private handleFocusRequest = (evt: JsedFocusRequestEvent): boolean => {
    const currentFocus = this.nav.getFocus();

    if (evt.targetType === 'FOCUSABLE') {
      if (evt.element === currentFocus) {
        this.editFirst({ element: evt.element });
        return false;
      }

      quickDescend(evt.element);
      return true;
    }

    if (evt.targetType === 'TOKEN') {
      if (currentFocus?.contains(evt.token)) {
        this.editFirst({ element: evt.token });
        return false;
      }

      return true;
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
      // Don't scrollIntoView because this can have a jarring effect on UX and
      // the CURSOR / EditManager should have already scrolled anyway.
      this.nav.FOCUS(payload.focusElement, { scrollIntoView: false });
      quickDescend(payload.focusElement);
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
        initial
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
        bindings: ['$mod+l', 'Shift+ArrowDown'],
        description: 'Navigate to next element',
        when: { menuOpen: false }
      }
    },
    REC_PREV: {
      action: () => {
        this.nav.REC_PREV();
      },
      binding: {
        bindings: ['$mod+h', 'Shift+ArrowUp'],
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
