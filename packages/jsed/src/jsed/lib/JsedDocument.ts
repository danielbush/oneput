import { Navigator } from './navigator.js';
import { JsedCursor } from './cursor.js';
import type { IJsedCursor, JsedFocusRequestEvent, JsedFocusEvent } from '../types.js';
import { tokenizeImplicitLine } from './token.js';
import { JSED_DOM_ROOT_ID } from './constants.js';
import { ElementIndicator } from '../../oneput/ElementIndicator.js';

export class JsedDocument {
  static create(root: HTMLElement): JsedDocument {
    const doc = new JsedDocument(root);

    const elementIndicator = ElementIndicator.create();

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
  nav: Navigator;
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
    this.nav = new Navigator(this);
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

  requestCursor(params: {
    token: HTMLElement;
    onTokenChange: (token: HTMLElement) => void;
  }): IJsedCursor {
    return JsedCursor.create({
      document: this,
      token: params.token,
      onTokenChange: params.onTokenChange
    });
  }
}
