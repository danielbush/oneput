import { type UILayout, type FlexParams, type OneputProps } from '$lib/oneput/lib.js';
import type { Controller } from '$lib/oneput/controller.js';
import { hflex } from '$lib/oneput/builder.js';
import { arrowLeftIcon, chevronDown, xIcon } from '$lib/oneput/shared/icons.js';
import { DateDisplay } from '$lib/oneput/shared/widgets/DateDisplay.js';
import { MenuStatus } from '$lib/oneput/shared/widgets/MenuStatus/MenuStatus.js';
import { TimeDisplay } from '$lib/oneput/shared/widgets/TimeDisplay.js';

/**
 * Standard input UI for use in most situations.
 */
export const inputUI: (c: Controller) => OneputProps['inputUI'] = (c) => {
	return {
		outerRight: hflex({
			id: 'root-input-right',
			children: (b) => [
				b.fchild({
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: () => {
							if (c.menu.isMenuOpen) {
								c.menu.closeMenu();
							} else {
								c.menu.openMenu();
							}
						}
					},
					classes: ['oneput__icon-button', 'oneput__menu-button'],
					// innerHTMLUnsafe: c.menuOpen ? chevronUp : chevronDown
					innerHTMLUnsafe: chevronDown
				})
			]
		})
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
}) => FlexParams = ({ title, exitAction, type = 'back' }) => {
	return hflex({
		id: 'bindings-header',
		children: (b) => [
			b.fchild({
				tag: 'button',
				attr: { type: 'button', title: 'Back', onclick: exitAction },
				classes: ['oneput__icon-button'],
				innerHTMLUnsafe: type === 'back' ? arrowLeftIcon : xIcon
			}),
			b.fchild({
				classes: ['oneput__menu-item-header'],
				textContent: title
			}),
			b.fchild({
				classes: ['oneput__icon-button'],
				textContent: ''
			})
		]
	});
};

export type LayoutSettings = {
	exitAction?: () => void;
	menuHeader?: string;
	exitType?: Parameters<typeof menuHeaderUI>[0]['type'];
	placeholder?: string;
	clearInput?: boolean;
};

/**
 * Defines a standard layout.
 */
export class Layout<V extends LayoutSettings = LayoutSettings> implements UILayout<V> {
	static create<V extends LayoutSettings = LayoutSettings>(ctl: Controller, values: V = {} as V) {
		return new Layout(ctl, values);
	}

	constructor(
		private ctl: Controller,
		private values: V = {} as V
	) {}

	configure(values: V) {
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
		return hflex({
			id: 'root-inner',
			children: (b) => [
				b.fchild({
					style: { flex: '1' }
				}),
				b.fchild({
					style: { justifyContent: 'center' },
					onMount: TimeDisplay.onMount
				}),
				b.fchild({
					style: { flex: '1' }
				})
			]
		});
	}

	get outerUI() {
		return hflex({
			id: 'root-outer',
			children: (b) => [
				b.fchild({
					style: { flex: '1', position: 'relative' },
					// Example of a svelte-based ui widget:
					onMount: (node) => MenuStatus.onMount(node, this.ctl)
				}),
				b.fchild({
					style: { flex: '1', justifyContent: 'flex-end' },
					onMount: DateDisplay.onMount
				})
			]
		});
	}
}
