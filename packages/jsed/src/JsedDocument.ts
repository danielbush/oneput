import { DOMCursor } from './DOMCursor.js';
import type { JsedFocusRequestEvent, JsedFocusEvent } from './types.js';
import { getFirstToken, tokenizeImplicitLine } from './lib/token.js';
import { JSED_DOM_ROOT_ID } from './lib/constants.js';
import { ElementIndicator } from './ElementIndicator.js';
import { err, ok, Result } from 'neverthrow';

export type JsedDocumentError =
  | { type: 'no-token-under-focus' }
  | {
      /**
       * TODO: should we ever let this happen?
       */
      type: 'no-focus';
    };

export class JsedDocument {
  static create(root: HTMLElement): JsedDocument {
    return JsedDocument.#init(root, ElementIndicator.create());
  }

  static createNull(root: HTMLElement): JsedDocument {
    return JsedDocument.#init(root, ElementIndicator.createNull());
  }

  static #init(root: HTMLElement, elementIndicator: ElementIndicator): JsedDocument {
    const doc = new JsedDocument(root);

    // Set up event handlers

    function handleElementClick(evt: MouseEvent) {
      const app_root_node = document.getElementById(JSED_DOM_ROOT_ID);
      if (app_root_node) {
        const node = evt.target as Element;
        if (app_root_node.contains(node)) {
          return;
        }
      }
      // Prevent default actions like blurring the input in jsed-ui (assumes "mousedown").
      evt.preventDefault();
      doc.nav.REQUEST_FOCUS(evt.target);
    }

    // root.addEventListener<'click'>('click', handleElementClick);
    root.addEventListener<'mousedown'>('mousedown', handleElementClick);

    // Unload

    doc.unload = () => {
      root.removeEventListener('click', handleElementClick);
    };

    // Document stuff

    const handleElementFocus = (evt: JsedFocusEvent) => {
      const el = evt.targetType === 'F_ELEM' ? evt.element : evt.token;
      elementIndicator.updateFocus(el);
    };

    doc.listeners.FOCUS = handleElementFocus;
    doc.nav.FOCUS(doc.root);

    // Configure indicator:
    const focus = doc.nav.getFocus();
    elementIndicator.updateFocus(focus);
    elementIndicator.showIndicator(true);

    return doc;
  }

  root: HTMLElement;
  SIB_HIGHLIGHT: Set<HTMLElement> = new Set();
  nav: DOMCursor;
  listeners: {
    REQUEST_FOCUS: null | ((evt: JsedFocusRequestEvent) => boolean);
    FOCUS: null | ((evt: JsedFocusEvent) => void);
  } = {
    REQUEST_FOCUS: null,
    FOCUS: null
  };
  unload: () => void = () => {};

  private constructor(root: HTMLElement) {
    this.root = root;
    tokenizeImplicitLine(root);
    this.nav = new DOMCursor(this);
  }

  get document(): Document {
    return this.root.ownerDocument;
  }

  get window(): Window {
    if (!this.root.ownerDocument.defaultView) {
      throw new Error('defaultView not set');
    }
    return this.root.ownerDocument.defaultView;
  }

  /**
   * Set up cursor on first available token under focus.
   */
  getFirstTokenUnderFocus(): Result<HTMLElement, JsedDocumentError> {
    const focus = this.nav.getFocus();
    if (focus) {
      const firstToken = getFirstToken(focus);
      if (firstToken) {
        return ok(firstToken);
      }
      return err({ type: 'no-token-under-focus' });
    }
    return err({ type: 'no-focus' });
  }
}
