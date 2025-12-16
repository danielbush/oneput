import type { Controller } from '$lib/oneput/controller.js';

export type DynamicTextParams = {
	isMenuOpen: boolean;
	menuOpenBinding?: string;
	submitBinding?: string;
	doActionBinding?: string;
	fillBinding?: string;
	backBinding?: string;
};

export class DynamicText {
	static create(ctl: Controller) {
		return new DynamicText(ctl);
	}
	constructor(private ctl: Controller) {}

	private getBinding(open: boolean) {
		const bindings = this.ctl.keys.getCurrentBindings(open);
		if (open) {
			return {
				menuOpenBinding: bindings['closeMenu']?.bindings[0],
				submitBinding: bindings['submit']?.bindings[0],
				doActionBinding: bindings['doAction']?.bindings[0],
				fillBinding: bindings['fill']?.bindings[0],
				backBinding: bindings['back']?.bindings[0]
			};
		}
		return {
			menuOpenBinding: bindings['openMenu']?.bindings[0]
		};
	}

	/**
	 * For setting text in a one-off operation.
	 */
	text(fn: (params: DynamicTextParams) => string) {
		const isMenuOpen = this.ctl.menu.isMenuOpen;
		return fn({
			isMenuOpen,
			...this.getBinding(isMenuOpen)
		});
	}
}
