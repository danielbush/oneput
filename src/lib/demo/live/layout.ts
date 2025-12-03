import { Placeholder, type UILayout, mountSvelte } from '$lib/oneput/lib/lib.js';
import type { Controller } from '$lib/oneput/controller.js';
import { hflex } from '$lib/oneput/lib/builder.js';
import { arrowLeftIcon, chevronDown, xIcon } from '$lib/oneput/shared/icons.js';
import { DateDisplay } from '$lib/oneput/shared/components/DateDisplay.js';
import MenuStatus from '$lib/oneput/shared/components/MenuStatus.svelte';
import { TimeDisplay } from '$lib/oneput/shared/components/TimeDisplay.js';
import { MenuPlaceholder } from '$lib/oneput/shared/placeholders/MenuPlaceholder.js';
import { LocalBindingsService } from '$lib/oneput/shared/bindings/LocalBindingsService.js';
import { WordFilter } from '$lib/oneput/shared/filters/WordFilter.js';

export type LayoutSettings = {
	exitAction?: boolean | (() => void);
	backAction?: boolean | (() => void);
	menuHeader?: string;
};

/**
 * Defines a standard layout.
 */
export class Layout<V extends LayoutSettings = LayoutSettings> implements UILayout<V> {
	static create<V extends LayoutSettings = LayoutSettings>(ctl: Controller, values: V = {} as V) {
		return new Layout(ctl, values);
	}

	defaultPlaceholder?: Placeholder;

	constructor(
		private ctl: Controller,
		private values: V = {} as V
	) {
		ctl.menu.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
		ctl.menu.setDefaultFocusBehaviour('first');
		LocalBindingsService.create(ctl)
			.getBindings()
			.andTee((bindings) => {
				ctl.keys.setDefaultBindings(bindings.globalBindings, false, true);
				ctl.keys.setDefaultBindings(bindings.localBindings, true, true);
			})
			.orTee((err) => {
				ctl.alert({ message: 'Error getting bindings', additional: err.message });
			})
			.map(() => {
				// Wait till default bindings have been set above.
				ctl.input.setDefaultPlaceholder(
					MenuPlaceholder.create(ctl, (menuOpen, binding) =>
						binding
							? menuOpen
								? `Close menu with ${binding}...`
								: `Open menu with ${binding}...`
							: 'Type here...'
					),
					true
				);
			});
	}

	configure(values: V) {
		this.values = {
			menuHeader: 'Menu',
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

	get inputUI() {
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
								if (this.ctl.menu.isMenuOpen) {
									this.ctl.menu.closeMenu();
								} else {
									this.ctl.menu.openMenu();
								}
							}
						},
						classes: ['oneput__icon-button', 'oneput__menu-button'],
						// We use css to rotate the chevron which relies on
						// Oneput to set a class depending on the menu state.
						innerHTMLUnsafe: chevronDown
					})
				]
			})
		};
	}

	get menuUI() {
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
						: b.spacer(),
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
						: b.spacer()
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
