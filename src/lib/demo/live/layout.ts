import {
	DynamicPlaceholder,
	type FChildParams,
	type UILayout,
	mountSvelte,
	randomId
} from '$lib/oneput/lib/lib.js';
import type { Controller } from '$lib/oneput/controller.js';
import { FlexChildBuilder, hflex } from '$lib/oneput/lib/builder.js';
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
	/**
	 * Expose the bottom right corner of the layout.
	 */
	outerRight?: (b: FlexChildBuilder) => FChildParams;
};

/**
 * Defines a standard layout.
 */
export class Layout<V extends LayoutSettings = LayoutSettings> implements UILayout<V> {
	static create<V extends LayoutSettings = LayoutSettings>(ctl: Controller, values: V = {} as V) {
		const bindingService = LocalBindingsService.create(ctl);
		return new Layout(ctl, values, bindingService);
	}

	defaultPlaceholder?: DynamicPlaceholder;

	constructor(
		private ctl: Controller,
		private values: V = {} as V,
		private bindingService: LocalBindingsService
	) {
		ctl.menu.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
		ctl.menu.setDefaultFocusBehaviour('first');
		this.bindingService
			.getBindings()
			.andTee((bindings) => {
				ctl.keys.setDefaultBindings(bindings.globalBindings, false, true);
				ctl.keys.setDefaultBindings(bindings.localBindings, true, true);
			})
			.orTee((err) => {
				ctl.alert({ message: 'Could not set default bindings!', additional: err.message });
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
			outerRight: undefined,
			...values
		};
		// Make our life easier, if we don't specify back or exit, we'll show
		// them with sane defaults.
		if (this.values.exitAction === undefined) {
			this.values.exitAction = this.ctl.menu.closeMenu;
		}
		if (this.values.backAction === undefined) {
			this.values.backAction = this.ctl.app.goBack;
		}
	}

	private get exitAction() {
		if (this.values.exitAction === true) {
			return this.ctl.app.goBack;
		}
		if (typeof this.values.exitAction === 'function') {
			return this.values.exitAction;
		}
		return;
	}

	private get backAction() {
		if (this.values.backAction === true) {
			return this.ctl.app.goBack;
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
				this.values.outerRight
					? {
							style: { flex: '1', justifyContent: 'flex-end' },
							...this.values.outerRight(b)
						}
					: b.fchild({
							// GOTCHA: if outerRight is invoked above but has the same id
							// then any onMount destructor callback will not get called!
							// If we use a random id here, there is practically
							// no way for outerRight to re-use the same it.
							// id: 'root-outer-default-right',
							id: randomId(),
							style: { flex: '1', justifyContent: 'flex-end' },
							onMount: DateDisplay.onMount
						})
			]
		});
	}
}
