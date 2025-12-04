import type { Controller } from '../../controller.js';
import { DynamicPlaceholder } from '../../lib/lib.js';

export class MenuPlaceholder extends DynamicPlaceholder {
	static create(ctl: Controller, msg: (menuOpen: boolean, binding: string) => string) {
		return new MenuPlaceholder(ctl, msg);
	}

	constructor(
		private ctl: Controller,
		private msg: (menuOpen: boolean, binding: string) => string
	) {
		super();
	}

	private unsubscribeMenuOpenChange?: () => void;
	private unsubscribeBindingsChange?: () => void;

	private getBinding(open: boolean) {
		const bindings = this.ctl.keys.getCurrentBindings(open);
		const binding = bindings[open ? 'closeMenu' : 'openMenu']?.bindings[0];
		return binding;
	}

	enable(setPlaceholder: (msg?: string) => void) {
		setPlaceholder(this.msg(this.ctl.menu.isMenuOpen, this.getBinding(this.ctl.menu.isMenuOpen)));
		// Update bindings when menu state changes...
		if (!this.unsubscribeMenuOpenChange) {
			this.unsubscribeMenuOpenChange = this.ctl.events.on('menu-open-change', (menuOpen) => {
				setPlaceholder(this.msg(menuOpen, this.getBinding(menuOpen)));
			});
		}
		// Update local bindings if menu open and local bindings change...
		// Similarly for global.
		if (!this.unsubscribeBindingsChange) {
			this.unsubscribeBindingsChange = this.ctl.events.on('bindings-change', ({ isLocal }) => {
				if (isLocal === this.ctl.menu.isMenuOpen) {
					setPlaceholder(this.msg(isLocal, this.getBinding(isLocal)));
				}
			});
		}
	}

	disable() {
		this.unsubscribeMenuOpenChange?.();
		this.unsubscribeMenuOpenChange = undefined;
		this.unsubscribeBindingsChange?.();
		this.unsubscribeBindingsChange = undefined;
	}
}
