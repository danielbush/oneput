import { tinykeys } from 'tinykeys';
import type { OneputProps } from './lib.js';

export type OneputControllerParams = {
	globalKeys?: {
		keys?: {
			[key: string]: (() => void) | undefined;
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
	constructor(private currentProps: OneputProps) {}

	private handleGlobalKeys(keys?: OneputControllerParams['globalKeys']) {
		if (keys?.keys) {
			for (const [key, thunk] of Object.entries(keys.keys)) {
				console.log('setting up key', key, thunk);
				tinykeys(document.body, { [key]: thunk });
			}
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
	}

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}
}
