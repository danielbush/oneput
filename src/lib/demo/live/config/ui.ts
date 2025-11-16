import type { Controller } from '$lib/oneput/controller.js';
import {
	randomId,
	type DefaultUI,
	type FlexParams,
	type MenuItem,
	type OneputProps
} from '$lib/oneput/lib.js';
import { arrowLeftIcon, chevronDown, xIcon } from '$lib/oneput/shared/icons.js';
import { DateDisplay } from '../../../oneput/shared/DateDisplay.js';
import { MenuStatus } from '../../../oneput/shared/widgets/MenuStatus/MenuStatus.js';
import { TimeDisplay } from '../../../oneput/shared/TimeDisplay.js';
import { WordFilter } from '$lib/oneput/filters/WordFilter.js';

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
	attr?: FlexParams['attr'];
}) => MenuItem = ({ id, leftIcon, rightIcon, text, action, attr }) => {
	return {
		id,
		type: 'hflex',
		tag: 'button',
		attr: {
			...attr
			// Hovering...
			// onpointerenter: () => {
			// 	console.log('client onpointerenter', id);
			// },
			// Custom pointer down / click - generally however you should us action
			// onpointerdown: () => {
			// 	console.log('client onpointerdown', id);
			// }
		},
		children: [
			{
				// Fixed id's are re-rendered more efficiently in svelte.
				id: id + '-1',
				type: 'fchild',
				classes: ['oneput__icon'],
				innerHTMLUnsafe: leftIcon
			},
			{
				id: id + '-2',
				type: 'fchild',
				textContent: text
			},
			{
				id: id + '-3',
				type: 'fchild',
				classes: ['oneput__icon'],
				innerHTMLUnsafe: rightIcon
			}
		],
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

export class MyDefaultUI<V extends MyDefaultUIValues = MyDefaultUIValues> implements DefaultUI<V> {
	static create<V extends MyDefaultUIValues = MyDefaultUIValues>(
		ctl: Controller,
		values: V = {} as V
	) {
		return new MyDefaultUI(ctl, values);
	}

	constructor(
		private ctl: Controller,
		private values: V = {} as V
	) {}

	configureUI(values: V) {
		this.values = {
			exitAction: () => {
				this.ctl.menu.closeMenu();
			},
			menuHeader: 'Menu',
			exitType: 'back',
			placeholder: 'Type here...',
			...values
		};
	}

	async afterUpdate() {
		// Clear the input.
		// You can set `clearInput: false` to disable this behaviour.
		if (this.values.clearInput || !('clearInput' in this.values)) {
			this.ctl.input.setInputValue();
		}
		// We set exitAction to the backBinding so that the back key (whatever
		// it is set to) will trigger this action.
		this.ctl.setBackBinding(this.values.exitAction);
		// Enable various standard things by default.
		// You can then override if you need to.
		this.ctl.menu.enableMenuActions();
		this.ctl.menu.enableMenuOpenClose();
		this.ctl.menu.enableMenuItemsFn();
		this.ctl.keys.unsetKeys();
		this.ctl.keys.unsetKeys(true);
		this.ctl.menu.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
		this.ctl.menu.setFocusBehaviour('first');
	}

	get placeholder() {
		return this.values.placeholder;
	}

	get inputUI() {
		return inputUI(this.ctl);
	}
	get menuUI() {
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

	get innerUI() {
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

	get outerUI() {
		return {
			id: 'root-outer',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-outer-left',
					type: 'fchild' as const,
					style: { flex: '1', position: 'relative' },
					// Example of a svelte-based ui widget:
					onMount: (node) => MenuStatus.onMount(node, this.ctl)
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
