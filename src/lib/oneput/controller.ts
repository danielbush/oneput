import { tinykeys } from 'tinykeys';
import type { OneputControllerProps, OneputProps } from './lib.js';

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

export type OneputControllerParams = {
	menuItemFocus?: OneputProps['menuItemFocus'];
	globalKeys?: KeyBindingMap;
	input?: OneputProps['input'];
	inputValue?: OneputProps['inputValue'];
	handleInputChange?: OneputProps['handleInputChange'];
	placeholder?: OneputProps['placeholder'];
	menu?: OneputProps['menu'];
	menuOpen?: boolean;
	localKeys?: KeyBindingMap;
};

export class Controller {
	/**
	 * @param currentProps Should be reactive eg $state<OneputControllerProps>({...})
	 */
	constructor(
		private currentProps: OneputControllerProps,
		private defaultPlaceholder: string = 'Type here...',
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {}

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}

	get menuItemFocus() {
		return this.currentProps.menuItemFocus ?? 0;
	}

	get menuItemCount() {
		return this.currentProps.menu?.items?.length ?? 1;
	}

	get currentMenuItem() {
		return this.currentProps.menu?.items?.[this.menuItemFocus];
	}

	openMenu() {
		this.currentProps.menuOpen = true;
	}

	closeMenu() {
		this.currentProps.menuOpen = false;
	}

	focusNextMenuItem() {
		this.currentProps.menuItemFocusOrigin = 'keyboard';
		this.currentProps.menuItemFocus =
			(this.menuItemFocus + 1 + this.menuItemCount) % this.menuItemCount;
	}

	focusPreviousMenuItem() {
		this.currentProps.menuItemFocusOrigin = 'keyboard';
		this.currentProps.menuItemFocus =
			(this.menuItemFocus - 1 + this.menuItemCount) % this.menuItemCount;
	}

	doAction() {
		if (this.currentMenuItem) {
			if (this.currentMenuItem.action) {
				this.currentMenuItem.action(this);
			}
		}
	}

	private inputElement: HTMLInputElement | undefined;

	setInputElement(inputElement: HTMLInputElement | undefined) {
		this.inputElement = inputElement;
	}

	focusInput() {
		this.inputElement?.focus();
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
						setTimeout(() => action(this));
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
						setTimeout(() => action(this));
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

	update(options: OneputControllerParams) {
		if ('placeholder' in options) {
			this.currentProps.placeholder = options.placeholder || this.defaultPlaceholder;
		}
		if (options.input) {
			this.currentProps.input = options.input;
		}
		if (options.handleInputChange) {
			this.currentProps.handleInputChange = options.handleInputChange;
		}
		if ('inputValue' in options) {
			this.currentProps.inputValue = options.inputValue || '';
		}
		if (options.globalKeys) {
			this.handleGlobalKeys(options.globalKeys);
		}
		if (options.localKeys) {
			this.handleLocalKeys(options.localKeys);
		}
		if (options.menu) {
			this.currentProps.menu = options.menu;
			this.currentProps.menuItemFocus = 0;
		}
	}

	goBack: () => void = () => {};

	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}
}

/**
 * For demoing visual state, possibly also tests.
 */
export class NullController extends Controller {
	constructor() {
		super({
			menuOpen: false,
			menuItemFocus: 0,
			menu: { items: [] },
			input: {},
			placeholder: 'Type here...',
			inputValue: '',
			handleInputChange: () => {}
		});
	}
}
