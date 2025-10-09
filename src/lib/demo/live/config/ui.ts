import type { Controller } from '$lib/oneput/controller.js';
import { randomId, type FlexParams, type MenuItem, type OneputProps } from '$lib/oneput/lib.js';
import { arrowLeftIcon, chevronDown, xIcon } from '$lib/oneput/shared/icons.js';
import type { DefaultUI } from '$lib/oneput/UIController.js';
import { DateDisplay } from '../plugins/ui/DateDisplay.js';
import { SvelteExample } from '../plugins/ui/SvelteDisplay/SvelteExample.js';
import { TimeDisplay } from '../plugins/ui/TimeDisplay.js';
import * as keys from './keys.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';

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
					id: randomId(),
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
 * @param options.exitAction - The function to call when the back or exit button is clicked.
 * @param options.type - The type of header to use.
 */
export const menuHeaderUI: ({
	title,
	exitAction,
	type
}: {
	title: string;
	exitAction: () => void;
	type?: 'back' | 'exit';
}) => FlexParams = ({ title, exitAction: exit, type = 'back' }) => {
	return {
		id: 'bindings-header',
		type: 'hflex',
		children: [
			{
				id: randomId(),
				type: 'fchild',
				tag: 'button',
				attr: { type: 'button', title: 'Options', onclick: exit },
				classes: ['oneput__icon-button'],
				innerHTMLUnsafe: type === 'back' ? arrowLeftIcon : xIcon
			},
			{
				id: randomId(),
				type: 'fchild',
				classes: ['oneput__menu-item-header'],
				textContent: title
			},
			{
				id: randomId(),
				type: 'fchild',
				classes: ['oneput__icon-button'],
				textContent: ''
			}
		]
	};
};

export type MyDefaultUIValues = {
	exitAction?: () => void;
	menuHeader?: string;
	exitType?: Parameters<typeof menuHeaderUI>[0]['type'];
	placeholder?: string;
	backBinding?: () => void;
	clearInput?: boolean;
};

/**
 * This is just how we want to manage keys in the demo.  It's convenient to add
 * them to the DefaultUI mechanism.  You don't have to do it this way or have a
 * concept of default keys.
 */
class MyKeys {
	public defaultGlobalKeys: KeyBindingMap = keys.globalKeys;
	public defaultLocalKeys: KeyBindingMap = keys.localKeys;

	public setDefaultKeys(keys: KeyBindingMap, isLocal: boolean) {
		if (isLocal) {
			this.defaultLocalKeys = keys;
		} else {
			this.defaultGlobalKeys = keys;
		}
	}
}

export class MyDefaultUI implements DefaultUI<MyDefaultUIValues> {
	constructor(
		private ctl: Controller,
		private values: MyDefaultUIValues = {},
		public keys: MyKeys = new MyKeys()
	) {}

	setValues(values: MyDefaultUIValues) {
		this.values = {
			exitAction: () => {
				this.ctl.menu.closeMenu();
			},
			menuHeader: 'Menu',
			exitType: 'back',
			placeholder: 'Type here...',
			...values
		};
		// Clear the input.
		// You can set `clearInput: false` to disable this behaviour.
		if (this.values.clearInput || !('clearInput' in this.values)) {
			this.ctl.input.setInputValue();
		}
		// We set exitAction to the backBinding so that the back key (whatever
		// it is set to) will trigger this action.
		this.ctl.setBackBinding(this.values.exitAction);
	}

	get placeholder() {
		return this.values.placeholder;
	}

	get input() {
		return inputUI(this.ctl);
	}
	get menu() {
		return {
			header: menuHeaderUI({
				title: this.values.menuHeader || 'Menu',
				exitAction:
					this.values.exitAction ||
					(() => {
						this.ctl.menu.closeMenu();
					}),
				type: this.values.exitType
			})
		};
	}

	get inner() {
		return {
			id: 'root-inner',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-inner-left',
					type: 'fchild' as const,
					style: { flex: '1' }
				},
				{
					id: 'root-inner-middle',
					type: 'fchild' as const,
					style: { justifyContent: 'center' },
					onMount: TimeDisplay.onMount
				},
				{
					id: 'root-inner-right',
					type: 'fchild' as const,
					style: { flex: '1' }
				}
			]
		};
	}

	get outer() {
		return {
			id: 'root-outer',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-outer-left',
					type: 'fchild' as const,
					style: { flex: '1', position: 'relative' },
					onMount: (node) => SvelteExample.onMount(node, this.ctl)
				},
				{
					id: 'root-outer-right',
					type: 'fchild' as const,
					style: { flex: '1', justifyContent: 'flex-end' },
					onMount: DateDisplay.onMount
				}
			]
		} as FlexParams;
	}
}
