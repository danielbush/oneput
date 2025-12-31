import {
	DynamicPlaceholderBase,
	type FChildParams,
	type UILayout,
	type UILayoutSettings,
	mountSvelte,
	randomId
} from '$lib/oneput/lib/lib.js';
import type { Controller } from '$lib/oneput/controller.js';
import { FlexChildBuilder, hflex } from '$lib/oneput/lib/builder.js';
import { arrowLeftIcon, chevronDown, xIcon } from '$lib/oneput/shared/icons.js';
import { DateDisplay } from '$lib/oneput/shared/components/DateDisplay.js';
import MenuStatus from '$lib/oneput/shared/components/MenuStatus.svelte';
import { TimeDisplay } from '$lib/oneput/shared/components/TimeDisplay.js';
import { LocalBindingsService } from '$lib/oneput/shared/bindings/LocalBindingsService.js';
import { WordFilter } from '$lib/oneput/shared/filters/WordFilter.js';
import { DynamicPlaceholder } from '$lib/oneput/shared/ui/DynamicPlaceholder.js';

export type LayoutSettings = {
	/**
	 * Expose the bottom right corner of the layout.
	 */
	outerRight?: (b: FlexChildBuilder) => FChildParams;
};

/**
 * Defines a standard layout.
 */
export class Layout implements UILayout {
	static create(ctl: Controller, settings: UILayoutSettings = {}) {
		const bindingService = LocalBindingsService.create(ctl);
		const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
			params.menuOpenBinding
				? params.isMenuOpen
					? `Close menu with ${params.menuOpenBinding}...`
					: `Open menu with ${params.menuOpenBinding}...`
				: 'Type here...'
		);
		return new Layout(ctl, settings, {}, dynamicPlaceholder, bindingService);
	}

	defaultPlaceholder?: DynamicPlaceholderBase;

	constructor(
		private ctl: Controller,
		private settings: UILayoutSettings = {},
		private additional: LayoutSettings = {},
		private dynamicPlaceholder: DynamicPlaceholder,
		private bindingService: LocalBindingsService
	) {
		ctl.menu.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
		ctl.menu.setDefaultFocusBehaviour('last-action,first');
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
				ctl.input.setDefaultPlaceholder(this.dynamicPlaceholder, true);
			});
	}

	configure(values: UILayoutSettings, additional: LayoutSettings) {
		this.settings = {
			menuTitle: this.settings.menuTitle || 'Menu',
			...values
		};
		this.additional = {
			...additional
		};
	}

	private get exitAction() {
		if (this.settings.enableMenuOpenClose === true) {
			return this.ctl.menu.closeMenu;
		}
		return;
	}

	private get backAction() {
		if (this.settings.enableGoBack === true) {
			return this.ctl.app.goBack;
		}
		return;
	}

	private get menuTitle() {
		return this.settings.menuTitle || 'Menu';
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
				this.additional.outerRight
					? {
							style: { flex: '1', justifyContent: 'flex-end' },
							...this.additional.outerRight(b)
						}
					: b.fchild({
							// TODO: if outerRight is invoked above but has the same id
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
