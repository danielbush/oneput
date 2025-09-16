import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { InternalEventEmitter, MenuOpenChangeEvent } from './InternalEventEmitter.js';

export type KeyBinding = {
	action: (c: Controller) => void;
	description: string;
	/**
	 * Bindings in tinykeys format eg "Control+D" .
	 * Each item in the array is a complete binding.
	 */
	bindings: string[];
};
export type KeyBindingMap = {
	[actionId: string]: KeyBinding;
};

export class KeysController {
	public static create(events: InternalEventEmitter, actionArg: Controller) {
		return new KeysController(events, actionArg);
	}
	private menuOpen = false;

	constructor(
		private events: InternalEventEmitter,
		private actionArg: Controller,
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {
		//
		this.events.on<MenuOpenChangeEvent>('menu-open-change', (menuOpen: boolean) => {
			this.menuOpen = menuOpen;
		});
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
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}
}
