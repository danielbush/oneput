import { DocumentAction } from '../lib/document-action';
import { JsedCursor } from '../lib/cursor';
import { JsedDocument } from '../types';

export function makeDocument(root: HTMLElement): JsedDocument {
  let ACTIVE: HTMLElement | null = null;
  let document: JsedDocument | null = null;
  const base: Omit<JsedDocument, 'actions'> = {
    root,
    get document(): Document {
      return root.ownerDocument;
    },
    get window(): Window {
      if (!root.ownerDocument.defaultView) {
        throw new Error('defaultView not set');
      }
      return root.ownerDocument.defaultView!;
    },
    get active(): HTMLElement | null {
      return ACTIVE;
    },
    set active(el: HTMLElement | null) {
      ACTIVE = el;
    },
    // activeToken: null,
    SIB_HIGHLIGHT: new Set(),
    tokenized: new WeakMap(),
    listeners: {
      FOCUS: null,
      // TOKEN_FOCUS: null,
    },
    unload: () => {
      // Placeholder, see below.
      return;
    },
    requestCursor: ({ token, ceiling }) => {
      return new JsedCursor({ document: document!, token, ceiling });
    },
  };
  document = Object.assign(base, { actions: new DocumentAction(base) });
  return document;
}
