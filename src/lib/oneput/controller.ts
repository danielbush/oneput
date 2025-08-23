import { tinykeys } from 'tinykeys';
import type { OneputProps } from './lib.js';

export type OneputControllerParams = {
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

	private handleGlobalKeys(keys: { [key: string]: () => void }) {
		this.unsubscribeGlobalKeys();
		const adjustedBindings = Object.fromEntries(
			Object.entries(keys).map(([key, thunk]) => [
				key,
				() => {
					if (!this.currentProps.menuOpen) {
						thunk();
					}
				}
			])
		);
		const unsubscribe = tinykeys(window, adjustedBindings);
		this.unsubscribeGlobalKeys = unsubscribe;
	}

	private handleLocalKeys(keys: { [key: string]: () => void }) {
		this.unsubscribeLocalKeys();
		const adjustedBindings = Object.fromEntries(
			Object.entries(keys).map(([key, thunk]) => [
				key,
				() => {
					if (this.currentProps.menuOpen) {
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

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}
}
