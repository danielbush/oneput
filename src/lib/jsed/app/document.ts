import { Navigator } from '../lib/navigator.js';
import { JsedCursor } from '../lib/cursor.js';
import type { JsedDocument } from '../types.js';
import { tokenizeImplicitLine } from '../lib/token.js';

export function makeDocument(root: HTMLElement): JsedDocument {
	let document: JsedDocument | null = null;
	const base: Omit<JsedDocument, 'nav'> = {
		root,
		get document(): Document {
			return root.ownerDocument;
		},
		get window(): Window {
			if (!root.ownerDocument.defaultView) {
				throw new Error('defaultView not set');
			}
			return root.ownerDocument.defaultView;
		},
		SIB_HIGHLIGHT: new Set(),
		listeners: {
			REQUEST_FOCUS: null,
			FOCUS: null
		},
		unload: () => {
			// Placeholder, see below.
			return;
		},
		requestCursor: ({ token }) => {
			return new JsedCursor({ document: document!, token });
		}
	};
	document = Object.assign(base, { nav: new Navigator(base) });
	tokenizeImplicitLine(root);
	return document;
}
