import { tinykeys } from 'tinykeys';
import type { OneputProps } from './lib.js';

export type OneputControllerParams = {
	menuItemFocus?: number;
	globalKeys?: {
		keys?: {
			[key: string]: () => void;
		};
	};
	input?: OneputProps['input'];
	menu?: OneputProps['menu'];
	menuOpen?: boolean;
	localKeys?: {
		keys?: {
			[key: string]: () => void;
		};
	};
};

export class Controller {
	/**
	 * @param currentProps Should be reactive eg $state<OneputProps>({...})
	 */
	constructor(
		private currentProps: OneputProps,
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {}

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}

	get menuItemFocus() {
		return this.currentProps.menuItemFocus ?? 0;
	}

	get menuItemsCount() {
		return this.currentProps.menu?.items?.length ?? 1;
	}

	focusNextMenuItem() {
		this.currentProps.menuItemFocus =
			(this.menuItemFocus + 1 + this.menuItemsCount) % this.menuItemsCount;
	}

	focusPreviousMenuItem() {
		this.currentProps.menuItemFocus =
			(this.menuItemFocus - 1 + this.menuItemsCount) % this.menuItemsCount;
	}

	/**
	 * Only run globals when menu is closed.
	 */
	private handleGlobalKeys(keys: { [key: string]: () => void }) {
		this.unsubscribeGlobalKeys();
		const adjustedBindings = Object.fromEntries(
			Object.entries(keys).map(([key, thunk]) => [
				key,
				() => {
					if (!this.menuOpen) {
						thunk();
					}
				}
			])
		);
		const unsubscribe = tinykeys(window, adjustedBindings);
		this.unsubscribeGlobalKeys = unsubscribe;
	}

	/**
	 * Only run locals when menu is open.
	 */
	private handleLocalKeys(keys: { [key: string]: () => void }) {
		this.unsubscribeLocalKeys();
		const adjustedBindings = Object.fromEntries(
			Object.entries(keys).map(([key, thunk]) => [
				key,
				() => {
					if (this.menuOpen) {
						thunk();
					}
				}
			])
		);
		const unsubscribe = tinykeys(document.body, adjustedBindings);
		this.unsubscribeLocalKeys = unsubscribe;
	}

	update(options: OneputControllerParams) {
		if (options.input) {
			this.currentProps.input = options.input;
		}
		if (options.globalKeys?.keys) {
			this.handleGlobalKeys(options.globalKeys.keys);
		}
		if (options.localKeys?.keys) {
			this.handleLocalKeys(options.localKeys.keys);
		}
		if (options.menuOpen !== undefined) {
			this.currentProps.menuOpen = options.menuOpen;
		}
		if (options.menu) {
			this.currentProps.menu = options.menu;
		}
	}
}
