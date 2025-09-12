/**
 * This is some ui that you can use.  You don't have to use it.
 */
import {
	id,
	id as randomId,
	type FlexParams,
	type MenuItem,
	type OneputProps
} from '$lib/oneput/lib.js';
import type { Controller } from './oneput/controller.js';

export const settingsIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>';
export const keyboardIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-keyboard-icon lucide-keyboard"><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>';
export const chevronRightIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>';
export const xIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
export const tickIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>';
export const squareFunctionIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-function-icon lucide-square-function"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg>';
export const arrowLeftIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
export const sigmaIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sigma-icon lucide-sigma"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>';
export const tocIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table-of-contents-icon lucide-table-of-contents"><path d="M16 5H3"/><path d="M16 12H3"/><path d="M16 19H3"/><path d="M21 5h.01"/><path d="M21 12h.01"/><path d="M21 19h.01"/></svg>';
export const chevronUp =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up-icon lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>';
export const chevronDown =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>';
export const commandIcon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-command-icon lucide-command"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>';

/**
 * Menu item with no left icon, give more room for main content.
 */
export const menuItemNoIcon: (params: {
	id: string;
	rightIcon?: string;
	text: string;
	action?: () => void;
}) => MenuItem = ({ id, rightIcon, text, action }) => {
	const attr: FlexParams['attr'] = {};
	return {
		id,
		type: 'hflex',
		tag: 'button',
		children: [
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

/**
 * This is a menu item with a left icon and a right icon.  If no left icon is
 * given, there will be a blank space.
 */
export const menuItemWithIcon: (params: {
	id: string;
	leftIcon?: string;
	rightIcon?: string;
	text: string;
	action?: () => void;
}) => MenuItem = ({ id, leftIcon, rightIcon, text, action }) => {
	const attr: FlexParams['attr'] = {};
	/*
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
	*/
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

/**
 * Standard input UI for use in most situations.
 */
export const inputUI: (c: Controller) => OneputProps['input'] = (c) => {
	return {
		outerRight: {
			id: 'root-input-right',
			type: 'hflex',
			children: [
				{
					id: id(),
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: () => {
							if (c.menuOpen) {
								c.closeMenu();
							} else {
								c.openMenu();
							}
						}
					},
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: c.menuOpen ? chevronUp : chevronDown
				}
			]
		}
	};
};

/**
 * Provides 2 types of header for open menus: one with a back button (type='back') or one with an exit button (type='exit').
 *
 * @param options.exit - The function to call when the back or exit button is clicked.
 * @param options.type - The type of header to use.
 */
export const menuHeaderUI: ({
	title,
	exit,
	type
}: {
	title: string;
	exit: () => void;
	type?: 'back' | 'exit';
}) => FlexParams = ({ title, exit, type = 'back' }) => {
	return {
		id: 'bindings-header',
		type: 'hflex',
		children: [
			{
				id: id(),
				type: 'hflex',
				style: { flex: '1' },
				children: [
					{
						id: id(),
						tag: 'button',
						attr: { type: 'button', title: 'Options', onclick: exit },
						classes: ['oneput__icon-button'],
						style: { flex: '1' },
						innerHTMLUnsafe: type === 'back' ? arrowLeftIcon : xIcon
					}
				]
			},
			{
				id: 'bindings-header-text',
				type: 'fchild',
				style: { justifyContent: 'center', flex: '3' },
				textContent: title
			},
			{
				id: 'bindings-header-close',
				type: 'fchild',
				style: { flex: '1' },
				textContent: ''
			}
		]
	};
};
