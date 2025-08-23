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
};

export class Controller {
	/**
	 * @param currentProps Should be reactive eg $state<OneputProps>({...})
	 */
	constructor(
		private currentProps: OneputProps,
		private unsubscribeGlobalKeys: () => void = () => {}
	) {}

	private handleGlobalKeys(keys?: OneputControllerParams['globalKeys']) {
		if (keys?.keys) {
			this.unsubscribeGlobalKeys();
			const unsubscribe = tinykeys(window, keys.keys);
			this.unsubscribeGlobalKeys = unsubscribe;
		}
	}

	update(options: OneputControllerParams) {
		if (options.input) {
			this.currentProps.input = options.input;
		}
		this.handleGlobalKeys(options.globalKeys);
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
