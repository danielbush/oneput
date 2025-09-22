import { makeDocument } from './document.js';
import { JSED_DOM_ROOT_ID } from '../lib/constants.js';
import type { JsedDocument } from '../types.js';

/**
 * Initialize a subtree of the DOM in a browser window for editing.
 *
 * This is where we define global state and side-effects and related things like
 * event handlers so that the rest of the codebase can remain as stateless as
 * possible.
 */
export function start(root: HTMLElement): JsedDocument {
	const doc = makeDocument(root);

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
	return doc;
}
