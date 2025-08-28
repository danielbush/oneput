/**
 * This is some ui that you can use.  You don't have to use it.
 */
import { id as randomId, type FlexParams, type MenuItem } from '$lib/oneput/lib.js';

export const piIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pi-icon lucide-pi"><line x1="9" x2="9" y1="4" y2="20"/><path d="M4 7c0-1.7 1.3-3 3-3h13"/><path d="M18 20c-1.7 0-3-1.3-3-3V4"/></svg>';
export const keyboardIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-keyboard-icon lucide-keyboard"><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>';
export const chevronRightIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';
export const xIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
export const tickIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>';

export const menuItemWithIcon: (params: {
	id: string;
	leftIcon?: string;
	rightIcon?: string;
	text: string;
	action?: () => void;
}) => MenuItem = ({ id, leftIcon, rightIcon, text, action }) => {
	const attr: FlexParams['attr'] = {
		// Demo hover handling.  Oneput injects a pointer event to handle
		// menu item focus in addition to this.
		onpointerenter: () => {
			console.log('client onpointerenter', id);
		},
		// Similarly here, oneput will both run `action` with pointerdown
		// and run this additional event handler here:
		onpointerdown: () => {
			console.log('client onpointerdown', id);
		}
	};
	return {
		id,
		type: 'hflex',
		tag: 'button',
		children: [
			{
				id: randomId(),
				classes: ['oneput__icon'],
				innerHTMLUnsafe: leftIcon
			},
			{
				id: randomId(),
				classes: ['oneput__menu-item-body'],
				textContent: text
			},
			{
				id: randomId(),
				classes: ['oneput__icon'],
				innerHTMLUnsafe: rightIcon
			}
		],
		attr,
		action
	};
};

export const keybindingMenuItem: (params: {
	id: string;
	text: string;
	/**
	 * To display to the user.
	 */
	bindings: string[];
	action: () => void;
}) => MenuItem = ({ id, text, action, bindings }) => {
	let bindingHTML = '<code><kbd>-</kbd></code>';
	if (bindings.length > 0) {
		bindingHTML = '<code><kbd>' + bindings[0] + '</kbd></code>';
	}
	return {
		id,
		type: 'hflex',
		tag: 'button',
		children: [
			{
				id: randomId(),
				classes: ['oneput__icon'],
				innerHTMLUnsafe: keyboardIcon
			},
			{
				id: randomId(),
				classes: ['oneput__menu-item-body'],
				textContent: text
			},
			{
				id: randomId(),
				type: 'hflex',
				children: [
					bindings.length > 1 && {
						id: randomId(),
						innerHTMLUnsafe: `(${bindings.length})`
					},
					{
						id: randomId(),
						innerHTMLUnsafe: bindingHTML,
						classes: ['myapp__kbd']
					},
					{
						id: randomId(),
						classes: ['oneput__icon'],
						innerHTMLUnsafe: chevronRightIcon
					}
				].filter(Boolean) as FlexParams['children']
			}
		],
		attr: {},
		action
	};
};
