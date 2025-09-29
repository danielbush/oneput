import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { InternalEventEmitter, MenuOpenChangeEvent } from './InternalEventEmitter.js';
import type { KeyBindingMap } from './KeyBinding.js';

/**
 * Manages key bindings.
 *
 * - setKeys(bindings, isLocal) : sets a set of key bindings; these will be replaced by the next call
 * - setKeys({], isLocal} : clears bindings
 * - setTempKeys(...) : lets you temporarily set bindings in place of the previous call to setKeys
 * - restoreKeys(...) : use this to restore remove setTempKeys and restore the previous setKeys call
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

	setKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.restoreLocalBindings = bindings;
			this.handleLocalKeys(bindings);
		} else {
			this.restoreGlobalBindings = bindings;
			this.handleGlobalKeys(bindings);
		}
	}

	private restoreLocalBindings: KeyBindingMap = {};
	private restoreGlobalBindings: KeyBindingMap = {};

	setTempKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}

	restoreKeys(isLocal: boolean = false) {
		if (isLocal) {
			this.setKeys(this.restoreLocalBindings, true);
		} else {
			this.setKeys(this.restoreGlobalBindings, false);
		}
	}
}
