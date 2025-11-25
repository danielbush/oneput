import { type UILayout, type OneputProps, mountSvelte } from '$lib/oneput/lib.js';
import type { Controller } from '$lib/oneput/controller.js';
import { hflex } from '$lib/oneput/builder.js';
import { arrowLeftIcon, chevronDown, xIcon } from '$lib/oneput/shared/icons.js';
import { DateDisplay } from '$lib/oneput/shared/widgets/DateDisplay.js';
import MenuStatus from '$lib/oneput/shared/widgets/MenuStatus.svelte';
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

export type LayoutSettings = {
	exitAction?: boolean | (() => void);
	backAction?: boolean | (() => void);
	menuHeader?: string;
	placeholder?: string;
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
			menuHeader: 'Menu',
			placeholder: 'Type here...',
			...values
		};
		// Make our life easier, if we don't specify back or exit, we'll show
		// them with sane defaults.
		if (this.values.exitAction === undefined) {
			this.values.exitAction = this.ctl.menu.closeMenu;
		}
		if (this.values.backAction === undefined) {
			this.values.backAction = this.ctl.goBack;
		}
	}

	private get exitAction() {
		if (this.values.exitAction === true) {
			return this.ctl.goBack;
		}
		if (typeof this.values.exitAction === 'function') {
			return this.values.exitAction;
		}
		return;
	}

	private get backAction() {
		if (this.values.backAction === true) {
			return this.ctl.goBack;
		}
		if (typeof this.values.backAction === 'function') {
			return this.values.backAction;
		}
		return;
	}

	private get menuTitle() {
		return this.values.menuHeader || 'Menu';
	}

	get placeholder() {
		return this.values.placeholder;
	}

	get inputUI() {
		return inputUI(this.ctl);
	}
	get menuUI() {
		console.log(hflex({ children: (b) => [b.hspacer({ style: { minHeight: '100px' } })] }));
		return {
			header: hflex({
				id: 'menu-header',
				children: (b) => [
					this.backAction
						? b.fchild({
								tag: 'button',
								attr: { type: 'button', title: 'Back', onclick: this.backAction },
								classes: ['oneput__icon-button'],
								innerHTMLUnsafe: arrowLeftIcon
							})
						: b.hspacer({ style: { minHeight: 'var(--oneput-std-width)' } }),
					b.fchild({
						classes: ['oneput__menu-item-header'],
						textContent: this.menuTitle
					}),
					this.exitAction
						? b.fchild({
								tag: 'button',
								classes: ['oneput__icon-button'],
								attr: { type: 'button', title: 'Exit', onclick: this.exitAction },
								innerHTMLUnsafe: xIcon
							})
						: b.hspacer({ style: { minHeight: 'var(--oneput-std-width)' } })
				]
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
					onMount: (node) =>
						mountSvelte(MenuStatus, { target: node, props: { controller: this.ctl } })
				}),
				b.fchild({
					style: { flex: '1', justifyContent: 'flex-end' },
					onMount: DateDisplay.onMount
				})
			]
		});
	}
}
