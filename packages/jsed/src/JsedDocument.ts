import type { JsedFocusRequestEvent } from './types.js';
import { tokenizeImplicitLine } from './lib/token.js';

export class JsedDocument {
  static create(root: HTMLElement): JsedDocument {
    return new JsedDocument(root);
  }

  static createNull(root: HTMLElement): JsedDocument {
    return new JsedDocument(root);
  }

  root: HTMLElement;
  SIB_HIGHLIGHT: Set<HTMLElement> = new Set();
  listeners: {
    REQUEST_FOCUS: null | ((evt: JsedFocusRequestEvent) => boolean);
  } = {
    REQUEST_FOCUS: null,
  };

  private constructor(root: HTMLElement) {
    this.root = root;
    tokenizeImplicitLine(root);
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
}
