import { Navigator } from '../lib/navigator';
import { JsedCursor } from '../lib/cursor';
import { JsedDocument } from '../types';

export function makeDocument(root: HTMLElement): JsedDocument {
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
  document = Object.assign(base, { actions: new Navigator(base) });
  return document;
}
