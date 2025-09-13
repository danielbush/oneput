import { tinykeys } from 'tinykeys';
import type { FlexParams, OneputControllerProps, OneputProps } from './lib.js';

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
	inputValue?: OneputProps['inputValue'];
	onInputChange?: OneputProps['onInputChange'];
	onMenuOpenChange?: OneputProps['onMenuOpenChange'];
	placeholder?: OneputProps['placeholder'];
	menu?: OneputProps['menu'];
	menuOpen?: boolean;
};

/**
 * Key things you want to manage when Oneput goes from one mode to another...
 *
 * UI
 *
 * - setMenu - controls menu and menu header / footer
 * - setInputUI - set the ui around the input and placeholder
 * - setInnerUI - controls the ui between input and menu
 * - setOuterUI - controls ui on the open side of the input
 *
 * Key bindings
 *
 * - setBackBinding - controls the back action that you can set a keybinding for
 * - setKeys - controls global and local keybindings
 *
 * Events
 *
 * - onInputChange
 * - onMenuOpenChange
 *
 * Input Control
 */
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

	// #region menu

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}

	get menuItemFocus() {
		return this.currentProps.menuItemFocus ?? 0;
	}

	get menuItemCount() {
		return this.currentProps.menu?.items?.length ?? 0;
	}

	get currentMenuItem() {
		return this.currentProps.menu?.items?.[this.menuItemFocus];
	}

	openMenu = () => {
		this.currentProps.menuOpen = true;
	};

	closeMenu = () => {
		this.currentProps.menuOpen = false;
	};

	private nextMenuItemIndex(index: number) {
		return (index + 1 + this.menuItemCount) % Math.max(1, this.menuItemCount);
	}

	private previousMenuItemIndex(index: number) {
		return (index - 1 + this.menuItemCount) % Math.max(1, this.menuItemCount);
	}

	focusNextMenuItem() {
		this.currentProps.menuItemFocusOrigin = 'keyboard';
		for (
			let i = this.nextMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.nextMenuItemIndex(i)
		) {
			if (!this.currentProps.menu?.items?.[i].ignored) {
				this.currentProps.menuItemFocus = i;
				break;
			}
		}
	}

	focusPreviousMenuItem() {
		this.currentProps.menuItemFocusOrigin = 'keyboard';
		for (
			let i = this.previousMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.previousMenuItemIndex(i)
		) {
			if (!this.currentProps.menu?.items?.[i].ignored) {
				this.currentProps.menuItemFocus = i;
				break;
			}
		}
	}

	doAction() {
		if (this.currentMenuItem) {
			if (this.currentMenuItem.action) {
				this.currentMenuItem.action(this);
			}
		}
	}

	// #endregion

	// #region input

	private inputElement: HTMLInputElement | undefined;

	/**
	 * Used by Oneput to tell the controller what the input element is.
	 */
	setInputElement(inputElement: HTMLInputElement | undefined) {
		this.inputElement = inputElement;
	}

	focusInput() {
		this.inputElement?.focus();
	}

	setInputUI(input?: {
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	}) {
		this.currentProps.input = input;
	}

	// #endregion

	// #region keys

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

	setKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	goBack: () => void = () => {};

	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}

	// #endregion

	// #region ui

	setOuterUI(outer: FlexParams) {
		this.currentProps.outer = outer;
	}

	setInnerUI(inner: FlexParams) {
		this.currentProps.inner = inner;
	}

	// #endregion

	update(options: OneputControllerParams) {
		if ('placeholder' in options) {
			this.currentProps.placeholder = options.placeholder || this.defaultPlaceholder;
		}
		if ('onInputChange' in options) {
			this.currentProps.onInputChange = options.onInputChange;
		}
		if ('onMenuOpenChange' in options) {
			this.currentProps.onMenuOpenChange = options.onMenuOpenChange;
		}
		if ('inputValue' in options) {
			this.currentProps.inputValue = options.inputValue || '';
		}
		if (options.menu) {
			this.currentProps.menu = options.menu;
			this.currentProps.menuItemFocus = 0;
		}
	}
}
