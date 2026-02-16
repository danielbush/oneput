import { Navigator } from '../lib/navigator.js';
import { JsedCursor } from '../lib/cursor.js';
import type { IJsedCursor, JsedFocusRequestEvent, JsedFocusEvent } from '../types.js';
import { tokenizeImplicitLine } from '../lib/token.js';

export class JsedDocument {
  static create(root: HTMLElement): JsedDocument {
    const doc = new JsedDocument(root);
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
