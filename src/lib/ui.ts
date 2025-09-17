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
import { chevronDown, arrowLeftIcon, xIcon } from './oneput/shared/icons.js';

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
				type: 'fchild',
				classes: ['oneput__menu-item-body'],
				textContent: text
			},
			{
				id: randomId(),
				type: 'fchild',
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
				type: 'fchild',
				classes: ['oneput__icon'],
				innerHTMLUnsafe: leftIcon
			},
			{
				id: randomId(),
				type: 'fchild',
				classes: ['oneput__menu-item-body'],
				textContent: text
			},
			{
				id: randomId(),
				type: 'fchild',
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
export const inputUI: (c: Controller) => OneputProps['inputUI'] = (c) => {
	return {
		outerRight: {
			id: 'root-input-right',
			type: 'hflex',
			children: [
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: () => {
							if (c.menu.menuOpen) {
								c.menu.closeMenu();
							} else {
								c.menu.openMenu();
							}
						}
					},
					classes: ['oneput__icon-button', 'oneput__menu-button'],
					// innerHTMLUnsafe: c.menuOpen ? chevronUp : chevronDown
					innerHTMLUnsafe: chevronDown
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
				type: 'fchild',
				tag: 'button',
				attr: { type: 'button', title: 'Options', onclick: exit },
				classes: ['oneput__icon-button'],
				innerHTMLUnsafe: type === 'back' ? arrowLeftIcon : xIcon
			},
			{
				id: id(),
				type: 'fchild',
				classes: ['oneput__menu-item-header'],
				textContent: title
			},
			{
				id: id(),
				type: 'fchild',
				classes: ['oneput__icon-button'],
				textContent: ''
			}
		]
	};
};
