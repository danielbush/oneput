import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { InternalEventEmitter, MenuOpenChangeEvent } from './InternalEventEmitter.js';
import type { KeyBindingMap } from './KeyBinding.js';

/**
 * Manages key bindings.
 *
 * - Set default global/local keys using setDefaultKeys(bindings, isLocal).
 * - c.keys.setKeys(bindings, isLocal) replaces all bindings;
 * - c.keys.addKeys(bindings, isLocal) adds to existing bindings
 * - c.keys.clear() will restore the defaults
 *
 */
export class KeysController {
	public static create(events: InternalEventEmitter, actionArg: Controller, menuOpen: boolean) {
		return new KeysController(events, actionArg, menuOpen);
	}

	constructor(
		private events: InternalEventEmitter,
		private actionArg: Controller,
		private menuOpen: boolean,
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {
		this.events.on<MenuOpenChangeEvent>('menu-open-change', (menuOpen: boolean) => {
			this.menuOpen = menuOpen;
		});
		this.menuOpen = menuOpen;
	}
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
					if (!this.menuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this.actionArg));
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
					if (this.menuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this.actionArg));
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

	private defaultGlobalKeys: KeyBindingMap = {};
	private defaultLocalKeys: KeyBindingMap = {};

	setDefaultKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.defaultLocalKeys = bindings;
			this.handleLocalKeys(bindings);
		} else {
			this.defaultGlobalKeys = bindings;
			this.handleGlobalKeys(bindings);
		}
	}

	get localDefaultKeys(): KeyBindingMap {
		return this.defaultLocalKeys;
	}

	get globalDefaultKeys(): KeyBindingMap {
		return this.defaultGlobalKeys;
	}

	clear() {
		this.handleGlobalKeys(this.defaultGlobalKeys);
		this.handleLocalKeys(this.defaultLocalKeys);
	}

	setKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}

	addKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys({ ...this.defaultLocalKeys, ...bindings });
		} else {
			this.handleGlobalKeys({ ...this.defaultGlobalKeys, ...bindings });
		}
	}
}
