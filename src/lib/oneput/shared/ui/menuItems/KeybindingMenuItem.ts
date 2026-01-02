import type { MenuItem } from '../../../types.js';
import { stdMenuItem } from './stdMenuItem.js';

export type KeybindingMenuItem = {
	id: string;
	text: string;
	/**
	 * To display to the user.
	 */
	bindings: string[];
	action: () => void;
};

export const keybindingMenuItem: (params: KeybindingMenuItem) => MenuItem = ({
	id,
	text,
	action,
	bindings
}) => {
	let bindingHTML = '<code><kbd>-</kbd></code>';
	if (bindings.length > 0) {
		bindingHTML = '<code><kbd>' + bindings[0] + '</kbd></code>';
	}
	return stdMenuItem({
		id,
		// htmlContentUnsafe: bindingHTML,
		textContent: text,
		action,
		left: (b) => [b.icon({ icon: 'squareFunction' })],
		right: (b) => [
			bindings.length > 1 &&
				b.fchild({
					innerHTMLUnsafe: `(${bindings.length})`
				}),
			b.fchild({
				htmlContentUnsafe: bindingHTML,
				classes: ['oneput__kbd']
			}),
			b.icon({ icon: 'chevronRight' })
		]
	});
};
