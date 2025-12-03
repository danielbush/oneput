import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { KeyBindingMap } from './lib/bindings.js';

/**
 * Manages key bindings.
 *
 * local bindings = keys that are only active when the menu is open
 * global bindings = keys that are active when the menu is closed
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

	enableKeys(on: boolean = true) {
		this.keysDisabled = !on;
	}

	setDefaultBindings(bindings: KeyBindingMap, isLocal: boolean = false, apply = false) {
		if (isLocal) {
			this.defaultLocalBindings = bindings;
			if (apply) {
				this.setBindings(bindings, true);
			}
		} else {
			this.defaultGlobalBindings = bindings;
			if (apply) {
				this.setBindings(bindings, false);
			}
		}
	}

	/**
	 * Returns the default key bindings.
	 *
	 * @param isLocal
	 */
	getDefaultBindings(isLocal: boolean = false) {
		return isLocal ? this.defaultLocalBindings : this.defaultGlobalBindings;
	}

	getCurrentBindings(isLocal: boolean = false) {
		return isLocal ? this.currentLocalBindings : this.currentGlobalBindings;
	}

	private defaultLocalBindings: KeyBindingMap = {};
	private defaultGlobalBindings: KeyBindingMap = {};
	private currentLocalBindings: KeyBindingMap = {};
	private currentGlobalBindings: KeyBindingMap = {};

	setBindings(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.currentLocalBindings = bindings;
			this.handleLocalKeys(bindings);
		} else {
			this.currentGlobalBindings = bindings;
			this.handleGlobalKeys(bindings);
		}
		this.ctl.events.emit({ type: 'bindings-change', payload: { bindings, isLocal } });
	}

	/**
	 * Reset bindings to default values or nothing if no default values are set.
	 */
	resetBindings(isLocal: boolean = false) {
		if (isLocal) {
			this.setBindings(this.defaultLocalBindings, true);
		} else {
			this.setBindings(this.defaultGlobalBindings, false);
		}
	}
}
