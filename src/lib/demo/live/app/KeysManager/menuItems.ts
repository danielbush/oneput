import type { MenuItem } from '$lib/oneput/lib.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { KeybindingMenuItem } from './KeyBindingsUI.js';
import * as icons from '$lib/oneput/shared/icons.js';

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
		left: (b) => [b.icon({ innerHTMLUnsafe: icons.squareFunctionIcon })],
		right: (b) => [
			bindings.length > 1 &&
				b.fchild({
					innerHTMLUnsafe: `(${bindings.length})`
				}),
			b.fchild({
				htmlContentUnsafe: bindingHTML,
				classes: ['oneput__kbd']
			}),
			b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })
		]
	});
};
