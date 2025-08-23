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

	private handleGlobalKeys(keys?: OneputControllerParams['globalKeys']) {
		if (keys?.keys) {
			this.unsubscribeGlobalKeys();
			const adjustedBindings = Object.fromEntries(
				Object.entries(keys.keys).map(([key, thunk]) => [
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
	}

	private handleLocalKeys(keys?: OneputControllerParams['localKeys']) {
		if (keys?.keys) {
			this.unsubscribeLocalKeys();
			const adjustedBindings = Object.fromEntries(
				Object.entries(keys.keys).map(([key, thunk]) => [
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
	}

	update(options: OneputControllerParams) {
		if (options.input) {
			this.currentProps.input = options.input;
		}
		this.handleGlobalKeys(options.globalKeys);
		this.handleLocalKeys(options.localKeys);
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
