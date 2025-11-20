import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { KeyBindingMap } from './bindings.js';

/**
 * Manages key bindings.
 */
export class KeysController {
	public static create(ctl: Controller) {
		return new KeysController(ctl);
	}

	constructor(
		private ctl: Controller,
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {}

	/**
	 * Only run globals when menu is closed.
	 */
	private handleGlobalKeys(keys: KeyBindingMap) {
		this.unsubscribeGlobalKeys();
		const adjustedBindings = Object.entries(keys).reduce<{
			[key: string]: (evt: KeyboardEvent) => void;
		}>((acc, [, { action, bindings }]) => {
			bindings.forEach((binding) => {
				acc[binding] = (evt) => {
					evt.preventDefault();
					if (this.keysDisabled) {
						return;
					}
					if (!this.ctl.menu.isMenuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this.ctl));
					}
				};
			});
			return acc;
		}, {});
		const unsubscribe = tinykeys(window, adjustedBindings);
		this.unsubscribeGlobalKeys = unsubscribe;
	}

	/**
	 * Only run locals when menu is open.
	 */
	private handleLocalKeys(keys: KeyBindingMap) {
		this.unsubscribeLocalKeys();
		const adjustedBindings = Object.entries(keys).reduce<{
			[key: string]: (evt: KeyboardEvent) => void;
		}>((acc, [, { action, bindings }]) => {
			bindings.forEach((binding) => {
				acc[binding] = (evt) => {
					evt.preventDefault();
					if (this.keysDisabled) {
						return;
					}
					if (this.ctl.menu.isMenuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this.ctl));
					}
				};
			});
			return acc;
		}, {});
		const unsubscribe = tinykeys(document.body, adjustedBindings);
		this.unsubscribeLocalKeys = unsubscribe;
	}

	private keysDisabled = false;

	disableKeys() {
		this.keysDisabled = true;
	}

	enableKeys() {
		this.keysDisabled = false;
	}

	setDefaultKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.defaultLocalBindings = bindings;
			this.handleLocalKeys(bindings);
		} else {
			this.defaultGlobalBindings = bindings;
			this.handleGlobalKeys(bindings);
		}
	}

	/**
	 * Returns the default key bindings for current default ui.
	 *
	 * @param isLocal
	 */
	getDefaultKeys(isLocal: boolean = false) {
		return isLocal ? this.defaultLocalBindings : this.defaultGlobalBindings;
	}

	private defaultLocalBindings: KeyBindingMap = {};
	private defaultGlobalBindings: KeyBindingMap = {};

	setKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}

	unsetKeys(isLocal: boolean = false) {
		if (isLocal) {
			this.setDefaultKeys(this.defaultLocalBindings, true);
		} else {
			this.setDefaultKeys(this.defaultGlobalBindings, false);
		}
	}
}
